(()=>{
  const loader=document.querySelector('.jd-smart-loader');
  if(!loader)return;
  const shell=loader.querySelector('.jd-loader-shell');
  const icon=loader.querySelector('.jd-loader-icon-wrap');
  if(!shell||!icon)return;

  const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const style=document.createElement('style');
  style.textContent=`
  :root{--jd-future-ease:cubic-bezier(.16,1,.3,1);--jd-tech:#79d8ff;--jd-tech2:#9bf0ff;--jd-tech-gold:#d7ad61}
  .jd-smart-loader{background:radial-gradient(circle at 50% 44%,rgba(22,36,48,.88),rgba(6,8,12,.96) 36%,#050609 76%)!important;backdrop-filter:blur(18px) saturate(1.12)!important;-webkit-backdrop-filter:blur(18px) saturate(1.12)!important;transition:opacity .24s var(--jd-future-ease),visibility .24s linear!important}
  .jd-smart-loader::before{inset:-20%!important;background:radial-gradient(circle at 50% 48%,rgba(105,211,255,.13),transparent 18%),radial-gradient(circle at 48% 50%,rgba(216,171,93,.09),transparent 30%),linear-gradient(115deg,transparent 34%,rgba(107,214,255,.035) 50%,transparent 66%)!important;filter:blur(26px)!important;animation:jdFutureFog 3.8s ease-in-out infinite!important}
  .jd-smart-loader::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.18;background-image:linear-gradient(rgba(114,213,255,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(114,213,255,.055) 1px,transparent 1px);background-size:46px 46px;mask-image:radial-gradient(circle at 50% 50%,#000 0 23%,transparent 72%);-webkit-mask-image:radial-gradient(circle at 50% 50%,#000 0 23%,transparent 72%);animation:jdGridDrift 7s linear infinite}
  .jd-loader-shell{width:min(340px,88vw)!important;height:330px!important;perspective:1400px!important;transform-style:preserve-3d}
  .jd-loader-aura{width:210px!important;height:210px!important;background:radial-gradient(circle,rgba(134,226,255,.18),rgba(209,164,87,.11) 34%,rgba(68,167,204,.035) 56%,transparent 73%)!important;filter:blur(7px)!important;animation:jdFutureAura 1.7s ease-in-out infinite!important}
  .jd-loader-orbit{width:224px!important;height:224px!important;border:1px solid rgba(122,218,255,.25)!important;box-shadow:0 0 26px rgba(94,202,248,.08),inset 0 0 18px rgba(215,174,99,.04)!important;animation:jdFutureOrbit 3.8s linear infinite!important}
  .jd-loader-icon-wrap{width:126px!important;height:148px!important;animation:jdFutureIcon 2.65s cubic-bezier(.45,.03,.22,.96) infinite!important;filter:drop-shadow(0 26px 30px rgba(0,0,0,.52)) drop-shadow(0 0 17px rgba(106,219,255,.22)) drop-shadow(0 0 26px rgba(212,171,96,.13))!important;z-index:9}
  .jd-loader-icon{width:120px!important;height:140px!important}
  .jd-loader-icon .pearl{filter:drop-shadow(0 0 5px rgba(125,224,255,.28))}
  .jd-loader-label{top:258px!important;color:#eefbff!important;font-size:10px!important;letter-spacing:.34em!important;text-shadow:0 0 14px rgba(119,222,255,.28);opacity:.94!important}
  .jd-loader-dots{top:282px!important}.jd-loader-dots i{width:18px!important;height:1px!important;border-radius:0!important;background:linear-gradient(90deg,transparent,var(--jd-tech),transparent)!important;box-shadow:0 0 10px rgba(121,216,255,.34);animation:jdFutureDot 1.15s ease-in-out infinite!important}
  .jd-loader-spark{background:#c8f4ff!important;box-shadow:0 0 9px rgba(166,237,255,.95),0 0 22px rgba(91,205,255,.72)!important}

  .jd-future-hud{position:absolute;inset:0;pointer-events:none;display:grid;place-items:center;transform-style:preserve-3d;z-index:6}
  .jd-tech-ring{position:absolute;border-radius:50%;will-change:transform,opacity}
  .jd-tech-ring.r1{width:254px;height:254px;border:1px solid rgba(117,220,255,.24);border-left-color:rgba(224,184,110,.7);border-right-color:rgba(117,220,255,.62);box-shadow:0 0 22px rgba(88,199,245,.06);animation:jdRingA 5.6s linear infinite}
  .jd-tech-ring.r2{width:282px;height:282px;border:1px dashed rgba(126,226,255,.18);border-top-color:rgba(224,184,110,.52);animation:jdRingB 7.8s linear infinite reverse}
  .jd-tech-ring.r3{width:312px;height:312px;border:1px solid rgba(255,255,255,.055);clip-path:polygon(0 0,46% 0,46% 100%,0 100%);animation:jdRingC 4.7s ease-in-out infinite}
  .jd-ring-node{position:absolute;width:5px;height:5px;border-radius:50%;background:#b9efff;box-shadow:0 0 9px #78dfff,0 0 22px rgba(107,219,255,.52)}
  .jd-ring-node.n1{transform:translate(0,-127px)}.jd-ring-node.n2{transform:translate(121px,38px);background:#e6c888;box-shadow:0 0 11px rgba(226,188,111,.75)}.jd-ring-node.n3{transform:translate(-105px,72px)}
  .jd-axis{position:absolute;background:linear-gradient(90deg,transparent,rgba(119,219,255,.16),transparent)}
  .jd-axis.x{width:318px;height:1px}.jd-axis.y{height:318px;width:1px;background:linear-gradient(transparent,rgba(119,219,255,.12),transparent)}
  .jd-scan{position:absolute;width:178px;height:2px;background:linear-gradient(90deg,transparent,rgba(150,237,255,.18),#d4f7ff 48%,rgba(150,237,255,.22),transparent);box-shadow:0 0 12px rgba(113,220,255,.52);transform:translateY(-78px);opacity:.86;animation:jdScan 1.9s cubic-bezier(.55,0,.45,1) infinite}
  .jd-scan::before{content:"";position:absolute;left:50%;top:-68px;width:1px;height:136px;background:linear-gradient(transparent,rgba(123,223,255,.16),transparent)}
  .jd-data{position:absolute;font:600 7px/1.25 Manrope,system-ui,sans-serif;letter-spacing:.16em;color:rgba(173,231,249,.58);text-transform:uppercase;text-shadow:0 0 10px rgba(105,216,255,.18)}
  .jd-data.d1{left:12px;top:92px;text-align:left}.jd-data.d2{right:12px;bottom:88px;text-align:right}.jd-data strong{display:block;color:rgba(232,202,145,.78);font-size:8px;letter-spacing:.18em;margin-bottom:4px}
  .jd-core-pulse{position:absolute;width:152px;height:152px;border-radius:50%;border:1px solid rgba(112,221,255,.10);box-shadow:inset 0 0 22px rgba(90,202,245,.08),0 0 28px rgba(83,197,240,.05);animation:jdCorePulse 1.8s ease-in-out infinite}
  .jd-future-brand{position:absolute;top:22px;left:50%;transform:translateX(-50%);font:600 7px/1 Manrope,system-ui,sans-serif;letter-spacing:.42em;padding-left:.42em;color:rgba(228,243,248,.42);text-transform:uppercase;white-space:nowrap}

  .jd-future-field{position:absolute;inset:0;pointer-events:none;z-index:14;overflow:visible}
  .jd-fragment{position:absolute;left:50%;top:50%;width:var(--s);height:var(--s);margin:calc(var(--s)*-.5);opacity:0;clip-path:polygon(12% 0,100% 23%,79% 100%,0 73%);background:linear-gradient(145deg,#f8ffff 0%,#bdefff 28%,#d5b370 66%,#6e8e9c 100%);box-shadow:0 0 9px rgba(118,224,255,.35);transform:translate3d(var(--sx),var(--sy),0) rotate(0) scale(.2);will-change:transform,opacity,filter}
  .jd-microdot{position:absolute;left:50%;top:50%;width:2px;height:2px;border-radius:50%;background:#b9f1ff;box-shadow:0 0 7px rgba(120,224,255,.8);opacity:0;transform:translate(var(--sx),var(--sy))}
  .jd-energy-wave{position:absolute;left:50%;top:50%;width:54px;height:54px;border-radius:50%;border:1px solid rgba(157,235,255,.72);transform:translate(-50%,-50%) scale(.4);opacity:0;box-shadow:0 0 25px rgba(103,218,255,.22),inset 0 0 22px rgba(207,174,108,.08);z-index:13}
  .jd-crossflash{position:absolute;left:50%;top:50%;width:190px;height:190px;transform:translate(-50%,-50%) scale(.2);opacity:0;background:conic-gradient(from 0deg,transparent 0 24%,rgba(144,231,255,.14) 25%,transparent 26% 49%,rgba(225,189,119,.14) 50%,transparent 51% 74%,rgba(144,231,255,.14) 75%,transparent 76%);filter:blur(.2px);z-index:12}

  .jd-smart-loader.jd-phase .jd-loader-icon-wrap{animation:jdIconPhase .52s cubic-bezier(.55,0,.25,1) forwards!important}
  .jd-smart-loader.jd-phase .jd-loader-aura{animation:jdAuraPhase .58s ease forwards!important}
  .jd-smart-loader.jd-phase .jd-tech-ring.r1{animation:jdRingPhaseA .62s cubic-bezier(.2,.7,.2,1) forwards!important}
  .jd-smart-loader.jd-phase .jd-tech-ring.r2{animation:jdRingPhaseB .66s cubic-bezier(.2,.7,.2,1) forwards!important}
  .jd-smart-loader.jd-phase .jd-scan{animation:jdScanPhase .38s ease forwards!important}
  .jd-smart-loader.jd-phase .jd-fragment{animation:jdFragmentBurst .68s var(--jd-future-ease) var(--d) forwards}
  .jd-smart-loader.jd-phase .jd-microdot{animation:jdMicroBurst .58s var(--jd-future-ease) var(--d) forwards}
  .jd-smart-loader.jd-phase .jd-energy-wave{animation:jdWave .55s ease-out forwards}
  .jd-smart-loader.jd-phase .jd-crossflash{animation:jdCross .46s ease-out forwards}
  .jd-smart-loader.jd-phase .jd-loader-label,.jd-smart-loader.jd-phase .jd-loader-dots,.jd-smart-loader.jd-phase .jd-data{opacity:0!important;transition:opacity .18s ease!important}

  @keyframes jdFutureFog{0%,100%{transform:scale(.98) translate3d(-1%,0,0)}50%{transform:scale(1.05) translate3d(1.2%,-1%,0)}}
  @keyframes jdGridDrift{to{background-position:46px 46px,46px 46px}}
  @keyframes jdFutureAura{0%,100%{transform:scale(.88);opacity:.5}50%{transform:scale(1.12);opacity:1}}
  @keyframes jdFutureOrbit{to{transform:rotateX(68deg) rotateZ(360deg)}}
  @keyframes jdFutureIcon{0%{transform:rotateX(-4deg) rotateY(-12deg) translateY(0) scale(1)}24%{transform:rotateX(4deg) rotateY(18deg) translateY(-4px) scale(1.025)}50%{transform:rotateX(1deg) rotateY(48deg) translateY(-2px) scale(1)}76%{transform:rotateX(-4deg) rotateY(15deg) translateY(-6px) scale(1.018)}100%{transform:rotateX(-4deg) rotateY(-12deg) translateY(0) scale(1)}}
  @keyframes jdFutureDot{0%,100%{opacity:.2;transform:scaleX(.35)}50%{opacity:1;transform:scaleX(1)}}
  @keyframes jdRingA{to{transform:rotate(360deg)}}@keyframes jdRingB{to{transform:rotate(-360deg)}}@keyframes jdRingC{0%,100%{transform:rotate(-8deg) scale(.98);opacity:.45}50%{transform:rotate(8deg) scale(1.03);opacity:.9}}
  @keyframes jdScan{0%{transform:translateY(-80px) scaleX(.76);opacity:0}12%{opacity:.8}50%{opacity:1}88%{opacity:.7}100%{transform:translateY(80px) scaleX(1.04);opacity:0}}
  @keyframes jdCorePulse{0%,100%{transform:scale(.92);opacity:.35}50%{transform:scale(1.08);opacity:.9}}
  @keyframes jdIconPhase{0%{opacity:1;transform:rotateX(-3deg) rotateY(14deg) scale(1);filter:drop-shadow(0 26px 30px rgba(0,0,0,.52)) brightness(1)}26%{opacity:1;transform:rotateX(4deg) rotateY(44deg) scale(1.08);filter:drop-shadow(0 24px 26px rgba(0,0,0,.4)) brightness(1.55)}100%{opacity:0;transform:rotateX(12deg) rotateY(118deg) scale(.56);filter:blur(11px) brightness(1.9)}}
  @keyframes jdAuraPhase{to{opacity:0;transform:scale(1.85)}}
  @keyframes jdRingPhaseA{to{opacity:0;transform:rotate(170deg) scale(1.42)}}@keyframes jdRingPhaseB{to{opacity:0;transform:rotate(-150deg) scale(.66)}}
  @keyframes jdScanPhase{to{opacity:0;transform:translateY(0) scaleX(1.9)}}
  @keyframes jdFragmentBurst{0%{opacity:0;transform:translate3d(var(--sx),var(--sy),0) rotate(0) scale(.2);filter:blur(0)}10%{opacity:1}72%{opacity:.9}100%{opacity:0;transform:translate3d(var(--tx),var(--ty),var(--tz)) rotate(var(--r)) scale(var(--end));filter:blur(1.5px)}}
  @keyframes jdMicroBurst{0%{opacity:0;transform:translate(var(--sx),var(--sy)) scale(.5)}14%{opacity:1}100%{opacity:0;transform:translate(var(--tx),var(--ty)) scale(1.4)}}
  @keyframes jdWave{0%{opacity:0;transform:translate(-50%,-50%) scale(.3)}18%{opacity:.9}100%{opacity:0;transform:translate(-50%,-50%) scale(5.8)}}
  @keyframes jdCross{0%{opacity:0;transform:translate(-50%,-50%) scale(.2) rotate(0)}25%{opacity:.75}100%{opacity:0;transform:translate(-50%,-50%) scale(1.9) rotate(38deg)}}

  @media(max-width:700px){
    .jd-loader-shell{width:260px!important;height:270px!important}.jd-loader-aura{width:170px!important;height:170px!important}.jd-loader-orbit{width:186px!important;height:186px!important}.jd-loader-icon-wrap{width:102px!important;height:122px!important}.jd-loader-icon{width:98px!important;height:114px!important}.jd-loader-label{top:216px!important}.jd-loader-dots{top:238px!important}
    .jd-tech-ring.r1{width:204px;height:204px}.jd-tech-ring.r2{width:230px;height:230px}.jd-tech-ring.r3{width:252px;height:252px}.jd-ring-node.n1{transform:translate(0,-102px)}.jd-ring-node.n2{transform:translate(97px,30px)}.jd-ring-node.n3{transform:translate(-84px,58px)}.jd-axis.x{width:258px}.jd-axis.y{height:258px}.jd-data{display:none}.jd-future-brand{top:16px}.jd-scan{width:146px}.jd-smart-loader.jd-phase .jd-fragment:nth-child(n+37),.jd-smart-loader.jd-phase .jd-microdot:nth-child(n+25){display:none}
  }
  @media(prefers-reduced-motion:reduce){
    .jd-tech-ring,.jd-scan,.jd-core-pulse,.jd-loader-icon-wrap,.jd-loader-aura,.jd-loader-orbit,.jd-smart-loader::before,.jd-smart-loader::after{animation:none!important}.jd-fragment,.jd-microdot,.jd-energy-wave,.jd-crossflash{display:none!important}.jd-smart-loader.jd-phase .jd-loader-icon-wrap{opacity:0!important;transition:opacity .08s linear!important}
  }
  `;
  document.head.appendChild(style);

  const hud=document.createElement('div');
  hud.className='jd-future-hud';
  hud.innerHTML=`
    <div class="jd-tech-ring r3"></div>
    <div class="jd-tech-ring r2"></div>
    <div class="jd-tech-ring r1"></div>
    <span class="jd-ring-node n1"></span><span class="jd-ring-node n2"></span><span class="jd-ring-node n3"></span>
    <div class="jd-axis x"></div><div class="jd-axis y"></div>
    <div class="jd-core-pulse"></div><div class="jd-scan"></div>
    <div class="jd-future-brand">JUST DENT // DIGITAL DENTISTRY</div>
    <div class="jd-data d1"><strong>JD SYSTEM</strong>ENAMEL CORE<br>SYNC 98.7%</div>
    <div class="jd-data d2"><strong>ROUTE ACTIVE</strong>UX / TRANSIT<br>MODE 03</div>`;
  shell.prepend(hud);

  const field=document.createElement('div');field.className='jd-future-field';
  const wave=document.createElement('div');wave.className='jd-energy-wave';
  const cross=document.createElement('div');cross.className='jd-crossflash';
  shell.append(field,wave,cross);

  const fragmentCount=60;
  for(let i=0;i<fragmentCount;i++){
    const p=document.createElement('i');p.className='jd-fragment';
    const angle=(i/fragmentCount)*Math.PI*2+(i%9)*.045;
    const start=18+(i%8)*3.6,dist=86+(i%12)*8.8;
    p.style.setProperty('--sx',(Math.cos(angle)*start*.72).toFixed(1)+'px');
    p.style.setProperty('--sy',(Math.sin(angle)*start*.88).toFixed(1)+'px');
    p.style.setProperty('--tx',(Math.cos(angle)*dist+(i%5-2)*6).toFixed(1)+'px');
    p.style.setProperty('--ty',(Math.sin(angle)*dist+(i%4-1.5)*7).toFixed(1)+'px');
    p.style.setProperty('--tz',(35+(i%8)*13)+'px');
    p.style.setProperty('--r',((i%2?1:-1)*(90+(i%10)*37))+'deg');
    p.style.setProperty('--s',(3.2+(i%6)*1.25)+'px');
    p.style.setProperty('--end',(0.42+(i%5)*.1).toFixed(2));
    p.style.setProperty('--d',((i%10)*8)+'ms');
    field.appendChild(p);
  }
  const microCount=34;
  for(let i=0;i<microCount;i++){
    const p=document.createElement('b');p.className='jd-microdot';
    const angle=(i/microCount)*Math.PI*2+(i%6)*.08;
    const start=34+(i%5)*4,dist=116+(i%9)*9;
    p.style.setProperty('--sx',(Math.cos(angle)*start).toFixed(1)+'px');
    p.style.setProperty('--sy',(Math.sin(angle)*start).toFixed(1)+'px');
    p.style.setProperty('--tx',(Math.cos(angle)*dist).toFixed(1)+'px');
    p.style.setProperty('--ty',(Math.sin(angle)*dist).toFixed(1)+'px');
    p.style.setProperty('--d',((i%8)*11)+'ms');
    field.appendChild(p);
  }

  function internalLink(a,e){
    if(!a||a.target==='_blank'||a.hasAttribute('download')||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return false;
    const raw=a.getAttribute('href');
    if(!raw||raw.startsWith('mailto:')||raw.startsWith('tel:')||raw.startsWith('javascript:'))return false;
    let u;try{u=new URL(a.href,location.href)}catch{return false}
    if(u.origin!==location.origin)return false;
    if(u.pathname===location.pathname&&u.search===location.search&&u.hash)return false;
    if(raw.startsWith('#'))return false;
    return true;
  }

  function decorate(){loader.classList.remove('jd-phase','is-leaving');loader.classList.add('jd-future')}
  decorate();

  let navigating=false;
  window.addEventListener('click',e=>{
    const a=e.target.closest('a[href]');
    if(!internalLink(a,e)||navigating)return;
    e.preventDefault();e.stopImmediatePropagation();navigating=true;
    const href=a.href;
    const info=typeof targetInfo==='function'?targetInfo(href):['tooth','JUST DENT'];
    try{sessionStorage.setItem('jd-future-nav','1')}catch{}
    loader.classList.remove('jd-phase','is-leaving');
    if(typeof showLoader==='function')showLoader(info[0],info[1]);else loader.classList.add('is-visible');
    decorate();void loader.offsetWidth;
    setTimeout(()=>loader.classList.add('jd-phase'),reduceMotion?90:410);
    setTimeout(()=>{location.href=href},reduceMotion?170:920);
  },true);

  let arrived=false;try{arrived=sessionStorage.getItem('jd-future-nav')==='1';sessionStorage.removeItem('jd-future-nav')}catch{}
  if(arrived){
    decorate();
    const info=typeof targetInfo==='function'?targetInfo(location.href):['tooth','JUST DENT'];
    if(typeof showLoader==='function')showLoader(info[0],info[1]);
    loader.classList.add('jd-arrival');
    setTimeout(()=>{if(typeof hideLoader==='function')hideLoader();else loader.classList.remove('is-visible')},reduceMotion?180:520);
  }

  window.addEventListener('pageshow',()=>{navigating=false;loader.classList.remove('jd-phase','is-leaving');decorate()});
})();
