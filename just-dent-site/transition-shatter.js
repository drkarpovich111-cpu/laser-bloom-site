(()=>{
  const loader=document.querySelector('.jd-smart-loader');
  if(!loader)return;
  const shell=loader.querySelector('.jd-loader-shell');
  const icon=loader.querySelector('.jd-loader-icon-wrap');
  const aura=loader.querySelector('.jd-loader-aura');
  if(!shell||!icon)return;

  const style=document.createElement('style');
  style.textContent=`
  .jd-shatter-field{position:absolute;inset:0;pointer-events:none;z-index:7;overflow:visible}
  .jd-shatter-particle{position:absolute;left:50%;top:50%;width:var(--s);height:calc(var(--s)*.72);margin-left:calc(var(--s)*-.5);margin-top:calc(var(--s)*-.36);opacity:0;clip-path:polygon(12% 0,100% 17%,76% 100%,0 78%);background:linear-gradient(145deg,#fffef9 0%,#f5ead7 34%,#d8b36d 67%,#9d6d31 100%);box-shadow:0 0 10px rgba(235,207,155,.24);transform:translate3d(var(--sx),var(--sy),0) rotate(0) scale(.24);will-change:transform,opacity,filter}
  .jd-smart-loader.jd-shatter .jd-shatter-particle{animation:jdPremiumBurst .66s cubic-bezier(.22,.76,.24,1) var(--d) forwards}
  .jd-smart-loader.jd-shatter .jd-loader-icon-wrap{animation:jdPremiumIconBurst .50s cubic-bezier(.5,0,.3,1) forwards!important}
  .jd-smart-loader.jd-shatter .jd-loader-aura{animation:jdPremiumAuraBurst .54s ease forwards!important}
  .jd-smart-loader.jd-shatter .jd-loader-orbit{opacity:0;transition:opacity .22s ease}
  .jd-smart-loader.jd-shatter .jd-loader-label,.jd-smart-loader.jd-shatter .jd-loader-dots{opacity:0;transform:translateX(-50%) translateY(7px);transition:opacity .2s ease,transform .3s ease}
  .jd-burst-flash{position:absolute;left:50%;top:50%;width:26px;height:26px;border-radius:50%;transform:translate(-50%,-50%) scale(.2);opacity:0;background:radial-gradient(circle,#fffdf7 0,#f6ddb0 22%,rgba(214,178,110,.35) 46%,transparent 72%);filter:blur(.5px);pointer-events:none;z-index:8}
  .jd-smart-loader.jd-shatter .jd-burst-flash{animation:jdPremiumFlash .48s ease-out forwards}
  @keyframes jdPremiumBurst{0%{opacity:0;transform:translate3d(var(--sx),var(--sy),0) rotate(0) scale(.25);filter:blur(0)}9%{opacity:1}68%{opacity:.92}100%{opacity:0;transform:translate3d(var(--tx),var(--ty),var(--tz)) rotate(var(--r)) scale(var(--end));filter:blur(1.4px)}}
  @keyframes jdPremiumIconBurst{0%{opacity:1;transform:rotateX(-3deg) rotateY(0) scale(1);filter:drop-shadow(0 24px 28px rgba(0,0,0,.34)) brightness(1)}22%{opacity:1;transform:rotateX(2deg) rotateY(30deg) scale(1.055);filter:drop-shadow(0 24px 28px rgba(0,0,0,.30)) brightness(1.34)}100%{opacity:0;transform:rotateX(12deg) rotateY(112deg) scale(.68);filter:blur(10px) brightness(1.6)}}
  @keyframes jdPremiumAuraBurst{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(1.9)}}
  @keyframes jdPremiumFlash{0%{opacity:0;transform:translate(-50%,-50%) scale(.15)}18%{opacity:.95}100%{opacity:0;transform:translate(-50%,-50%) scale(7)}}
  @media(max-width:700px){.jd-smart-loader.jd-shatter .jd-shatter-particle:nth-child(n+39){display:none}}
  @media(prefers-reduced-motion:reduce){.jd-smart-loader.jd-shatter .jd-shatter-particle{display:none}.jd-smart-loader.jd-shatter .jd-loader-icon-wrap{animation:none!important;opacity:0;transition:opacity .08s linear}.jd-burst-flash{display:none}}
  `;
  document.head.appendChild(style);

  const field=document.createElement('div');field.className='jd-shatter-field';
  const flash=document.createElement('div');flash.className='jd-burst-flash';
  shell.append(field,flash);

  const count=72;
  for(let i=0;i<count;i++){
    const p=document.createElement('i');p.className='jd-shatter-particle';
    const angle=(i/count)*Math.PI*2+(i%7)*.07;
    const start=12+(i%9)*3.4;
    const dist=74+(i%13)*8.2;
    const sx=Math.cos(angle)*start*.78;
    const sy=Math.sin(angle)*start*.92;
    const tx=Math.cos(angle)*dist+(i%5-2)*6;
    const ty=Math.sin(angle)*dist+(i%4-1.5)*7;
    p.style.setProperty('--sx',sx.toFixed(1)+'px');
    p.style.setProperty('--sy',sy.toFixed(1)+'px');
    p.style.setProperty('--tx',tx.toFixed(1)+'px');
    p.style.setProperty('--ty',ty.toFixed(1)+'px');
    p.style.setProperty('--tz',(28+(i%7)*11)+'px');
    p.style.setProperty('--r',((i%2?1:-1)*(80+(i%11)*31))+'deg');
    p.style.setProperty('--s',(3.3+(i%6)*1.1)+'px');
    p.style.setProperty('--end',(0.45+(i%4)*.12).toFixed(2));
    p.style.setProperty('--d',((i%10)*10)+'ms');
    field.appendChild(p);
  }

  function internalLink(a,e){
    if(!a||a.target==='_blank'||a.hasAttribute('download')||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return false;
    const raw=a.getAttribute('href');
    if(!raw||raw.startsWith('mailto:')||raw.startsWith('tel:')||raw.startsWith('javascript:'))return false;
    let u;try{u=new URL(a.href,location.href)}catch{return false}
    if(u.origin!==location.origin)return false;
    if(u.pathname===location.pathname&&u.search===location.search&&u.hash){return false}
    if(raw.startsWith('#'))return false;
    return true;
  }

  let navigating=false;
  window.addEventListener('click',e=>{
    const a=e.target.closest('a[href]');
    if(!internalLink(a,e)||navigating)return;
    e.preventDefault();e.stopImmediatePropagation();navigating=true;
    const href=a.href;
    const info=typeof targetInfo==='function'?targetInfo(href):['tooth','JUST DENT'];
    loader.classList.remove('jd-shatter','is-leaving');
    if(typeof showLoader==='function')showLoader(info[0],info[1]);
    else loader.classList.add('is-visible');
    void loader.offsetWidth;
    setTimeout(()=>{loader.classList.add('jd-shatter')},430);
    setTimeout(()=>{location.href=href},1010);
  },true);

  window.addEventListener('pageshow',()=>{navigating=false;loader.classList.remove('jd-shatter')});
})();
