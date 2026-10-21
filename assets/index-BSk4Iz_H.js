import"./modulepreload-polyfill-B5Qt9EMX.js";const p=document.querySelector("#app");p.innerHTML=`
  <main class="home-scene">
    <div class="home-background" aria-hidden="true"></div>
    <div class="home-gate">
      <button class="alien" type="button" aria-label="开启体感">
        <img src="./image/gray-alien_160_0y4o.png" alt="" draggable="false">
      </button>
    </div>
    <img class="home-brand" src="./image/Text_image/dsyiyi.png" alt="" hidden>
    <nav class="instrument-grid" aria-label="乐器" hidden>
      <a class="instrument-icon" href="./pad.html" aria-label="PAD"><img src="./image/gray-pipe-bundle_32_0whc.png" alt="" draggable="false"></a>
      <a class="instrument-icon" href="./drums.html" aria-label="Drums"><img src="./image/gray-cartridge_32_25nf-2.png" alt="" draggable="false"></a>
      <a class="instrument-icon" href="./rainstick.html" aria-label="Rainstick"><img src="./image/white-rain_160_ld80.png" alt="" draggable="false"></a>
      <a class="instrument-icon" href="./camera-sampler.html" aria-label="Camera-sampler"><img src="./image/gray-camera_32_xtei-2.png" alt="" draggable="false"></a>
      <a class="instrument-icon" href="./HeadEmojiCamShake.html" aria-label="HeadEmojiCamShake"><img src="./image/gray-cd_32_yk21.png" alt="" draggable="false"></a>
      <a class="instrument-icon" href="./sound-toy.html" aria-label="SoundToy"><img src="./image/pistol_1f52b.png" alt="" draggable="false"></a>
    </nav>
  </main>
`;const i=document.querySelector(".home-scene"),y=document.querySelector(".home-gate"),n=document.querySelector(".alien"),f=document.querySelector(".home-brand"),c=document.querySelector(".instrument-grid");let l=null,g=0,u=0,s=0,o=0,h=0;function d(e,a){g=Math.max(-1,Math.min(1,e)),u=Math.max(-1,Math.min(1,a))}function b(e){if(e.beta===null||e.gamma===null)return;l??={beta:e.beta,gamma:e.gamma};const a=(e.gamma-l.gamma)/25,t=(e.beta-l.beta)/25,r=(screen.orientation?.angle??window.orientation??0)*Math.PI/180;d(a*Math.cos(r)+t*Math.sin(r),t*Math.cos(r)-a*Math.sin(r))}function m(){s+=(g-s)*.09,o+=(u-o)*.09,i.style.setProperty("--icon-x",`${s*16}px`),i.style.setProperty("--icon-y",`${o*16}px`),i.style.setProperty("--background-x",`${-s*22}px`),i.style.setProperty("--background-y",`${-o*22}px`),h=requestAnimationFrame(m)}n.addEventListener("click",async()=>{n.disabled=!0,n.classList.remove("permission-error");try{const e=[window.DeviceOrientationEvent,window.DeviceMotionEvent].filter(t=>t!==void 0).map(t=>t.requestPermission?.()??Promise.resolve("granted"));if((await Promise.all(e)).includes("denied"))throw new Error("Motion permission denied");window.addEventListener("deviceorientation",b),y.hidden=!0,f.hidden=!1,c.hidden=!1,m()}catch(e){n.classList.add("permission-error"),n.setAttribute("aria-label","体感权限未开启，请检查浏览器权限后重试"),console.error(e)}finally{n.disabled=!1}});i.addEventListener("pointermove",e=>{if(e.pointerType!=="mouse"||c.hidden)return;const a=i.getBoundingClientRect();d((e.clientX-a.left)/a.width*2-1,(e.clientY-a.top)/a.height*2-1)});for(const e of document.querySelectorAll(".instrument-icon"))e.addEventListener("click",a=>{const t=a;t.metaKey||t.ctrlKey||t.shiftKey||t.altKey||(a.preventDefault(),!e.classList.contains("pop")&&(e.classList.add("pop"),window.setTimeout(()=>{e.classList.remove("pop"),e instanceof HTMLAnchorElement&&window.location.assign(e.href)},180)))});window.addEventListener("orientationchange",()=>{l=null,d(0,0)});window.addEventListener("pagehide",()=>cancelAnimationFrame(h));window.addEventListener("pageshow",e=>{e.persisted&&!c.hidden&&m()});
