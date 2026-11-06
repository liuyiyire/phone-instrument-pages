class StutterProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()

    const processorOptions = options.processorOptions ?? {}
    this.bufferFrames = Math.max(
      1,
      Math.ceil((processorOptions.bufferSeconds ?? 2.5) * sampleRate),
    )
    this.history = [
      new Float32Array(this.bufferFrames),
      new Float32Array(this.bufferFrames),
    ]
    this.held = [
      new Float32Array(this.bufferFrames),
      new Float32Array(this.bufferFrames),
    ]
    this.transitionFrames = Math.max(
      0,
      Math.round((processorOptions.transitionMs ?? 8) * sampleRate / 1000),
    )
    this.loopCrossfadeFrames = Math.max(
      0,
      Math.round((processorOptions.loopCrossfadeMs ?? 4) * sampleRate / 1000),
    )
    this.sliceFrames = Math.max(1, processorOptions.sliceFrames ?? 1)
    this.writeIndex = 0
    this.historyFramesAvailable = 0
    this.heldFramesAvailable = 0
    this.readPhase = 0
    this.enabled = false
    this.holding = false
    this.releaseRequested = false
    this.wet = 1
    this.mix = 0
    this.targetMix = 0
    this.pendingTriggerFrame = null
    this.pendingAmount = null
    this.holdWhenReady = false

    this.port.onmessage = (event) => this.handleMessage(event.data)
  }

  handleMessage(message) {
    switch (message.type) {
      case 'enabled':
        this.enabled = Boolean(message.value)
        if (!this.enabled) this.beginRelease()
        break
      case 'wet':
        this.wet = Math.min(1, Math.max(0, message.value))
        if (this.holding && !this.releaseRequested) this.targetMix = this.wet
        break
      case 'sliceFrames':
        this.setSliceFrames(message.value)
        break
      case 'trigger':
        if (this.enabled) {
          this.pendingTriggerFrame = message.atFrame ?? currentFrame
        }
        break
      case 'amount':
        if (this.enabled) this.pendingAmount = message
        break
      case 'reset':
        this.beginRelease()
        this.historyFramesAvailable = 0
        break
      case 'release':
        this.beginRelease()
        break
    }
  }

  setSliceFrames(value) {
    const oldLength = this.activeSliceFrames()
    const relativePhase = oldLength > 0 ? this.readPhase / oldLength : 0
    this.sliceFrames = Math.max(1, Math.round(value))
    const newLength = this.activeSliceFrames()
    if (this.holding && newLength > 0) {
      this.readPhase = relativePhase * newLength
    }
  }

  activeSliceFrames() {
    return Math.min(this.sliceFrames, this.heldFramesAvailable)
  }

  beginHold() {
    const frameCount = this.historyFramesAvailable
    if (frameCount === 0) return

    const firstFrame = (
      this.writeIndex - frameCount + this.bufferFrames
    ) % this.bufferFrames
    for (let channel = 0; channel < this.held.length; channel += 1) {
      for (let index = 0; index < frameCount; index += 1) {
        this.held[channel][index] = this.history[channel][
          (firstFrame + index) % this.bufferFrames
        ]
      }
    }

    this.heldFramesAvailable = frameCount
    this.readPhase = 0
    this.holding = true
    this.releaseRequested = false
    this.targetMix = this.wet
  }

  beginRelease() {
    this.pendingTriggerFrame = null
    this.pendingAmount = null
    this.holdWhenReady = false
    this.releaseRequested = true
    this.targetMix = 0
  }

  advanceMix() {
    if (this.transitionFrames === 0) {
      this.mix = this.targetMix
    } else if (this.mix < this.targetMix) {
      this.mix = Math.min(this.targetMix, this.mix + 1 / this.transitionFrames)
    } else if (this.mix > this.targetMix) {
      this.mix = Math.max(this.targetMix, this.mix - 1 / this.transitionFrames)
    }

    if (this.releaseRequested && this.mix === 0) {
      this.holding = false
      this.releaseRequested = false
    }
  }

  heldSample(channel) {
    const length = this.activeSliceFrames()
    if (length === 0) return 0

    const start = this.heldFramesAvailable - length
    const position = Math.floor(this.readPhase) % length
    const sample = this.held[channel][start + position]
    const crossfadeFrames = Math.min(
      this.loopCrossfadeFrames,
      Math.floor(length * 0.15),
    )
    const crossfadeStart = length - crossfadeFrames
    if (crossfadeFrames === 0 || position < crossfadeStart) return sample

    const beginningSample = this.held[channel][start + position - crossfadeStart]
    const amount = (position - crossfadeStart) / crossfadeFrames
    return sample * (1 - amount) + beginningSample * amount
  }

  process(inputs, outputs) {
    const input = inputs[0] ?? []
    const output = outputs[0] ?? []
    const frameCount = output[0]?.length ?? 0

    for (let index = 0; index < frameCount; index += 1) {
      if (
        this.pendingAmount !== null
        && currentFrame + index >= this.pendingAmount.atFrame
      ) {
        const amount = this.pendingAmount.value
        this.pendingAmount = null
        if (amount <= 0) {
          this.beginRelease()
        } else {
          this.wet = amount
          this.releaseRequested = false
          this.holdWhenReady = true
          if (this.holding) this.targetMix = amount
        }
      }
      if (
        this.holdWhenReady && !this.holding
        && this.historyFramesAvailable >= Math.min(this.sliceFrames, this.bufferFrames)
      ) this.beginHold()
      if (
        this.pendingTriggerFrame !== null
        && currentFrame + index >= this.pendingTriggerFrame
      ) {
        this.pendingTriggerFrame = null
        this.beginHold()
      }

      this.advanceMix()
      for (let channel = 0; channel < output.length; channel += 1) {
        const inputChannel = input[channel] ?? input[0]
        const liveSample = inputChannel?.[index] ?? 0
        const historyChannel = Math.min(channel, this.history.length - 1)
        this.history[historyChannel][this.writeIndex] = liveSample

        const repeatedSample = this.holding
          ? this.heldSample(historyChannel)
          : liveSample
        output[channel][index] = liveSample * (1 - this.mix)
          + repeatedSample * this.mix
      }

      this.writeIndex = (this.writeIndex + 1) % this.bufferFrames
      this.historyFramesAvailable = Math.min(
        this.bufferFrames,
        this.historyFramesAvailable + 1,
      )
      const activeSliceFrames = this.activeSliceFrames()
      if (this.holding && activeSliceFrames > 0) {
        this.readPhase = (this.readPhase + 1) % activeSliceFrames
      }
    }

    return true
  }
}

registerProcessor('stutter-processor', StutterProcessor)
