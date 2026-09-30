(()=>{
  const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Retire the old spinner/shatter loader. The transition is now a restrained
  // cinematic veil: quicker, quieter and more premium.
  const oldLoader=document.querySelector('.jd-smart-loader');
  if(oldLoader){
    oldLoader.classList.remove('is-visible','is-leaving','jd-shatter');
    oldLoader.style.opacity='0';
    oldLoader.style.visibility='hidden';
    oldLoader.style.pointerEvents='none';
    requestAnimationFrame(()=>oldLoader.remove());
  }

  const style=document.createElement('style');
  style.textContent=`
  :root{--jd-film-ease:cubic-bezier(.77,0,.18,1);--jd-film-enter:cubic-bezier(.16,1,.3,1)}
  .jd-cinema{position:fixed;inset:0;z-index:30000;pointer-events:none;transform:translate3d(0,102%,0);will-change:transform;overflow:hidden;background:linear-gradient(118deg,#0d0e11 0%,#151519 38%,#211c17 67%,#0d0e11 100%);box-shadow:0 -30px 90px rgba(0,0,0,.34)}
  .jd-cinema::before{content:"";position:absolute;inset:-24%;background:radial-gradient(circle at 51% 46%,rgba(255,247,232,.095),transparent 18%),radial-gradient(circle at 68% 54%,rgba(205,163,93,.075),transparent 23%),radial-gradient(circle at 24% 28%,rgba(255,255,255,.035),transparent 27%);filter:blur(28px);opacity:.95;transform:scale(1.02)}
  .jd-cinema::after{content:"";position:absolute;top:-25%;bottom:-25%;left:-28%;width:18%;background:linear-gradient(90deg,transparent,rgba(242,216,166,.14),rgba(255,255,255,.08),transparent);transform:skewX(-12deg);filter:blur(9px);opacity:0}
  .jd-cinema.is-covering{pointer-events:all;transform:translate3d(0,0,0);transition:transform .54s var(--jd-film-ease)}
  .jd-cinema.is-covering::after{animation:jdCinemaSheen .78s .08s var(--jd-film-enter) forwards}
  .jd-cinema.is-covered{pointer-events:all;transform:translate3d(0,0,0);transition:none}
  .jd-cinema.is-revealing{pointer-events:all;transform:translate3d(0,-102%,0);transition:transform .72s var(--jd-film-enter)}
  .jd-cinema.is-revealing::after{animation:jdCinemaSheenOut .68s var(--jd-film-enter) forwards}
  .jd-cinema-inner{position:absolute;inset:0;display:grid;place-items:center;padding:24px;text-align:center}
  .jd-cinema-brand{position:relative;display:flex;flex-direction:column;align-items:center;gap:15px;transform:translateY(10px);opacity:0;transition:opacity .26s ease .13s,transform .52s var(--jd-film-enter) .08s}
  .jd-cinema.is-covering .jd-cinema-brand,.jd-cinema.is-covered .jd-cinema-brand{opacity:1;transform:none}
  .jd-cinema.is-revealing .jd-cinema-brand{opacity:0;transform:translateY(-9px);transition:opacity .22s ease,transform .34s ease}
  .jd-cinema-wordmark{font-family:'Playfair Display',serif;font-size:clamp(24px,3.2vw,38px);font-weight:500;letter-spacing:.19em;padding-left:.19em;color:#f4eee5;text-shadow:0 12px 32px rgba(0,0,0,.34)}
  .jd-cinema-label{font:600 9px/1.2 Manrope,system-ui,sans-serif;letter-spacing:.30em;text-transform:uppercase;color:#cdb382;padding-left:.30em;opacity:.82}
  .jd-cinema-line{position:relative;width:106px;height:1px;overflow:hidden;background:rgba(255,255,255,.065)}
  .jd-cinema-line::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,#b98a3b 22%,#f0d79f 50%,#b98a3b 78%,transparent);transform:translateX(-110%)}
  .jd-cinema.is-covering .jd-cinema-line::after{animation:jdCinemaLine .62s .12s var(--jd-film-enter) forwards}
  .jd-cinema.is-covered .jd-cinema-line::after{transform:translateX(0)}
  .jd-cinema-grain{position:absolute;inset:0;opacity:.028;pointer-events:none;background-image:radial-gradient(rgba(255,255,255,.75) .45px,transparent .45px);background-size:6px 6px;mix-blend-mode:soft-light}
  .jd-cinema-edge{position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(231,197,130,.5),transparent);box-shadow:0 0 18px rgba(205,159,76,.16)}

  html.jd-nav-leaving body{overflow:hidden}
  html.jd-nav-leaving main,html.jd-nav-leaving .site-footer{transform:translate3d(0,-7px,0) scale(.992);filter:blur(1.8px) saturate(.9);opacity:.66;transition:transform .5s var(--jd-film-ease),filter .42s ease,opacity .38s ease;transform-origin:50% 38%;will-change:transform,filter,opacity}
  html.jd-nav-leaving .site-header{transform:translateY(-2px);opacity:.84;transition:transform .42s var(--jd-film-ease),opacity .35s ease}
  html.jd-nav-arriving main{animation:jdPageArrival .82s var(--jd-film-enter) both}
  html.jd-nav-arriving .site-footer{animation:jdPageArrival .9s var(--jd-film-enter) .04s both}
  html.jd-nav-arriving .site-header{animation:jdHeaderArrival .62s var(--jd-film-enter) both}
  html.jd-first-paint main{animation:jdFirstPaint .72s var(--jd-film-enter) both}

  .service-card,.doctor-card,.doctor-profile,.stat-card,.page-card,.case-card,.price-card,.contact-card{transition-timing-function:var(--jd-film-enter)!important}
  .doctor-photo img,.doctor-card .doctor-photo{transition-duration:.58s!important;transition-timing-function:var(--jd-film-enter)!important}
  .btn{transition-timing-function:var(--jd-film-enter)!important}

  @keyframes jdCinemaSheen{0%{left:-28%;opacity:0}20%{opacity:.38}100%{left:118%;opacity:0}}
  @keyframes jdCinemaSheenOut{0%{left:-20%;opacity:0}28%{opacity:.22}100%{left:112%;opacity:0}}
  @keyframes jdCinemaLine{0%{transform:translateX(-110%)}100%{transform:translateX(0)}}
  @keyframes jdPageArrival{0%{opacity:.58;filter:blur(2.5px) saturate(.9);transform:translate3d(0,14px,0) scale(.994)}45%{opacity:.96}100%{opacity:1;filter:none;transform:none}}
  @keyframes jdHeaderArrival{0%{opacity:0;transform:translateY(-8px)}100%{opacity:1;transform:none}}
  @keyframes jdFirstPaint{0%{opacity:.72;transform:translateY(8px)}100%{opacity:1;transform:none}}

  @media(max-width:700px){
    .jd-cinema-wordmark{font-size:27px}.jd-cinema-brand{gap:13px}
    html.jd-nav-leaving main,html.jd-nav-leaving .site-footer{filter:blur(1px);transform:translate3d(0,-4px,0) scale(.995)}
  }
  @media(prefers-reduced-motion:reduce){
    .jd-cinema{transition:opacity .12s linear!important;transform:none!important;opacity:0;visibility:hidden}
    .jd-cinema.is-covering,.jd-cinema.is-covered{opacity:1;visibility:visible}.jd-cinema.is-revealing{opacity:0;visibility:hidden}
    .jd-cinema::after,.jd-cinema-line::after{animation:none!important}
    html.jd-nav-leaving main,html.jd-nav-leaving .site-footer,html.jd-nav-leaving .site-header{transition:none!important;transform:none!important;filter:none!important;opacity:1!important}
    html.jd-nav-arriving main,html.jd-nav-arriving .site-footer,html.jd-nav-arriving .site-header,html.jd-first-paint main{animation:none!important}
  }
  `;
  document.head.appendChild(style);

  const curtain=document.createElement('div');
  curtain.className='jd-cinema';
  curtain.setAttribute('aria-hidden','true');
  curtain.innerHTML=`
    <div class="jd-cinema-grain"></div>
    <div class="jd-cinema-edge"></div>
    <div class="jd-cinema-inner">
      <div class="jd-cinema-brand">
        <div class="jd-cinema-wordmark">JUST DENT</div>
        <div class="jd-cinema-line"></div>
        <div class="jd-cinema-label">Сучасна стоматологія</div>
      </div>
    </div>`;
  document.body.appendChild(curtain);
  const label=curtain.querySelector('.jd-cinema-label');

  function transitionInfo(href){
    if(typeof targetInfo==='function'){
      const info=targetInfo(href);
      return info?.[1]||'JUST DENT';
    }
    try{
      const file=(new URL(href,location.href)).pathname.split('/').pop()||'index.html';
      const names={'index.html':'JUST DENT','about.html':'Про клініку','services.html':'Послуги','cases.html':'Наші роботи','doctors.html':'Наші лікарі','prices.html':'Прайс','contacts.html':'Контакти'};
      return names[file]||'JUST DENT';
    }catch{return 'JUST DENT'}
  }

  function internalAnchor(a,e){
    if(!a||a.target==='_blank'||a.hasAttribute('download')||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return null;
    const raw=a.getAttribute('href');
    if(!raw||raw.startsWith('mailto:')||raw.startsWith('tel:')||raw.startsWith('javascript:'))return null;
    let u;try{u=new URL(a.href,location.href)}catch{return null}
    if(u.origin!==location.origin)return null;
    return u;
  }

  function smoothSamePage(u){
    const target=u.hash&&document.querySelector(u.hash);
    if(!target)return false;
    target.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'start'});
    history.pushState(null,'',u.hash);
    return true;
  }

  let navigating=false;
  window.addEventListener('click',e=>{
    const a=e.target.closest('a[href]');
    const u=internalAnchor(a,e);
    if(!u||navigating)return;

    const samePage=u.pathname===location.pathname&&u.search===location.search;
    if(samePage&&u.hash){
      e.preventDefault();
      e.stopImmediatePropagation();
      smoothSamePage(u);
      return;
    }
    if(samePage&&!u.hash)return;

    e.preventDefault();
    e.stopImmediatePropagation();
    navigating=true;
    label.textContent=transitionInfo(a.href);
    try{sessionStorage.setItem('jd-premium-nav','1')}catch{}
    document.documentElement.classList.add('jd-nav-leaving');
    curtain.classList.remove('is-covered','is-revealing');
    void curtain.offsetWidth;
    curtain.classList.add('is-covering');

    const leaveDelay=reduceMotion?135:555;
    setTimeout(()=>{location.href=a.href},leaveDelay);
  },true);

  // A navigation started by this system arrives already covered, then opens the
  // new page like a physical curtain. Direct visits get only a subtle first paint.
  let arrived=false;
  try{arrived=sessionStorage.getItem('jd-premium-nav')==='1';sessionStorage.removeItem('jd-premium-nav')}catch{}
  if(arrived){
    label.textContent=transitionInfo(location.href);
    curtain.classList.add('is-covered');
    document.documentElement.classList.add('jd-nav-arriving');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      curtain.classList.remove('is-covered');
      curtain.classList.add('is-revealing');
    }));
    setTimeout(()=>{
      curtain.classList.remove('is-revealing');
      document.documentElement.classList.remove('jd-nav-arriving');
      navigating=false;
    },reduceMotion?180:830);
  }else{
    document.documentElement.classList.add('jd-first-paint');
    setTimeout(()=>document.documentElement.classList.remove('jd-first-paint'),760);
  }

  window.addEventListener('pageshow',e=>{
    if(e.persisted){
      navigating=false;
      curtain.classList.remove('is-covering','is-covered','is-revealing');
      document.documentElement.classList.remove('jd-nav-leaving','jd-nav-arriving');
    }
  });
})();
