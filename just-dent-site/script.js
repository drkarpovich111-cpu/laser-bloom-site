const $=(s,r=document)=>r.querySelector(s);const $$=(s,r=document)=>[...r.querySelectorAll(s)];

// Load the shared motion layer on every JUST DENT page.
(()=>{const script=document.currentScript;const href=new URL('effects.css',script?.src||location.href).href;if(!document.querySelector(`link[href="${href}"]`)){const link=document.createElement('link');link.rel='stylesheet';link.href=href;document.head.appendChild(link)}})();

// Premium 3D tooth page transition. Created from JS so every page gets it automatically.
const transition=document.createElement('div');
transition.className='jd-page-transition is-arriving';
transition.setAttribute('aria-hidden','true');
transition.innerHTML=`
  <div class="jd-fog jd-fog-a"></div>
  <div class="jd-fog jd-fog-b"></div>
  <div class="jd-tooth-stage">
    <div class="jd-tooth-aura"></div>
    <div class="jd-tooth-3d">
      <svg class="jd-tooth-layer jd-tooth-back" viewBox="0 0 120 140" aria-hidden="true"><path d="M37 14c13.5 0 18 8 23 8 5.2 0 9.6-8 23-8 19 0 31.4 15.3 27.7 35.6-2.6 14.7-11.7 24-16 39.5-5.8 20.1-12.4 32.4-22.6 32.4-8.2 0-9.4-22.4-15.2-22.4s-6.9 22.4-15.2 22.4c-10.3 0-16.8-12.3-22.6-32.4C14.1 73.6 5 64.3 2.3 49.6-1.3 29.3 11 14 37 14Z"/></svg>
      <svg class="jd-tooth-layer jd-tooth-mid" viewBox="0 0 120 140" aria-hidden="true"><path d="M37 14c13.5 0 18 8 23 8 5.2 0 9.6-8 23-8 19 0 31.4 15.3 27.7 35.6-2.6 14.7-11.7 24-16 39.5-5.8 20.1-12.4 32.4-22.6 32.4-8.2 0-9.4-22.4-15.2-22.4s-6.9 22.4-15.2 22.4c-10.3 0-16.8-12.3-22.6-32.4C14.1 73.6 5 64.3 2.3 49.6-1.3 29.3 11 14 37 14Z"/></svg>
      <svg class="jd-tooth-layer jd-tooth-front" viewBox="0 0 120 140" aria-hidden="true"><defs><linearGradient id="jdToothGold" x1="22" y1="18" x2="94" y2="121" gradientUnits="userSpaceOnUse"><stop stop-color="#fffdf8"/><stop offset=".28" stop-color="#f3e6cc"/><stop offset=".55" stop-color="#c99a4d"/><stop offset=".73" stop-color="#fff4d8"/><stop offset="1" stop-color="#9d6b2d"/></linearGradient><linearGradient id="jdToothShine" x1="30" y1="20" x2="76" y2="112" gradientUnits="userSpaceOnUse"><stop stop-color="white" stop-opacity=".95"/><stop offset=".34" stop-color="white" stop-opacity=".15"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient></defs><path class="jd-tooth-main" d="M37 14c13.5 0 18 8 23 8 5.2 0 9.6-8 23-8 19 0 31.4 15.3 27.7 35.6-2.6 14.7-11.7 24-16 39.5-5.8 20.1-12.4 32.4-22.6 32.4-8.2 0-9.4-22.4-15.2-22.4s-6.9 22.4-15.2 22.4c-10.3 0-16.8-12.3-22.6-32.4C14.1 73.6 5 64.3 2.3 49.6-1.3 29.3 11 14 37 14Z" fill="url(#jdToothGold)"/><path class="jd-tooth-highlight" d="M31 26c8-5 15-1 22 2 6 3 13-5 24-4 14 2 21 13 18 28-2 11-8 18-11 27" fill="none" stroke="url(#jdToothShine)" stroke-width="6" stroke-linecap="round"/></svg>
    </div>
    <span class="jd-spark jd-spark-1"></span><span class="jd-spark jd-spark-2"></span><span class="jd-spark jd-spark-3"></span>
  </div>`;
document.body.appendChild(transition);

const progress=document.createElement('div');progress.className='jd-scroll-progress';progress.innerHTML='<span></span>';document.body.appendChild(progress);const progressBar=$('span',progress);

requestAnimationFrame(()=>requestAnimationFrame(()=>{setTimeout(()=>transition.classList.remove('is-arriving'),520)}));
window.addEventListener('pageshow',()=>{transition.classList.remove('is-active');setTimeout(()=>transition.classList.remove('is-arriving'),200)});

function isInternalNavigation(a,e){if(!a||a.target==='_blank'||a.hasAttribute('download')||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return false;const raw=a.getAttribute('href');if(!raw||raw.startsWith('#')||raw.startsWith('mailto:')||raw.startsWith('tel:')||raw.startsWith('javascript:'))return false;let url;try{url=new URL(a.href,location.href)}catch{return false}if(url.origin!==location.origin)return false;if(url.pathname===location.pathname&&url.search===location.search&&url.hash)return false;return true}

document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!isInternalNavigation(a,e))return;e.preventDefault();transition.classList.remove('is-arriving');transition.classList.add('is-active');setTimeout(()=>{location.href=a.href},430)});

// Mobile menu.
const menuBtn=$('.menu-btn');const nav=$('.main-nav');
menuBtn?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menuBtn.setAttribute('aria-expanded',open?'true':'false')});
$$('.main-nav a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menuBtn?.setAttribute('aria-expanded','false')}));

// Original reveals plus richer automatic staggered motion for blocks that did not have reveal classes.
const revealObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');revealObserver.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -5% 0px'});
$$('.reveal').forEach(el=>revealObserver.observe(el));

const fxSelectors=['.section-head','.page-hero > .container','.service-card','.doctor-card','.review-card','.stat-card','.before-after','.price-inner','.appointment-card','.footer-grid > *','.page-card','.contact-card','.price-card','.case-card'];
const fxCandidates=$$(fxSelectors.join(',')).filter(el=>!el.classList.contains('reveal'));
fxCandidates.forEach((el,i)=>{el.classList.add('fx-auto');const box=el.getBoundingClientRect();const center=box.left+box.width/2;const viewport=innerWidth/2;let fx='up';if(innerWidth>760){if(center<viewport*.72)fx='left';else if(center>viewport*1.28)fx='right';else if(i%4===0)fx='zoom'}el.dataset.fx=fx;el.style.setProperty('--fx-delay',`${(i%4)*70}ms`)});
const fxObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('fx-visible');fxObserver.unobserve(e.target)}})},{threshold:.1,rootMargin:'0px 0px -4% 0px'});
$$('.fx-auto').forEach(el=>fxObserver.observe(el));

// Stagger children within common grids, including existing reveal blocks.
['.stats-grid','.services-grid','.doctors-grid','.reviews-grid','.footer-grid'].forEach(sel=>{$(sel)?.querySelectorAll(':scope > *').forEach((el,i)=>{if(!el.style.transitionDelay)el.style.transitionDelay=`${Math.min(i,5)*65}ms`})});

// Animated counters, always fitting inside their cards.
function formatNumber(n){return new Intl.NumberFormat('uk-UA').format(n)}
function fitNumber(el){el.style.fontSize='';let size=parseFloat(getComputedStyle(el).fontSize);const min=22;while(el.scrollWidth>el.clientWidth&&size>min){size-=1;el.style.fontSize=size+'px'}}
function animateCounter(el){if(el.dataset.done)return;el.dataset.done='1';const target=Number(el.dataset.target||0);const suffix=el.dataset.suffix||'';const start=performance.now();const dur=1300;function frame(now){const p=Math.min(1,(now-start)/dur);const eased=1-Math.pow(1-p,3);el.textContent=formatNumber(Math.round(target*eased))+suffix;fitNumber(el);if(p<1)requestAnimationFrame(frame)}requestAnimationFrame(frame)}
const counterObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){animateCounter(e.target);counterObserver.unobserve(e.target)}})},{threshold:.45});
$$('.stat-number').forEach(el=>counterObserver.observe(el));window.addEventListener('resize',()=>$$('.fit-number').forEach(fitNumber));

// Before / after sliders.
$$('[data-slider]').forEach(slider=>{const input=$('input',slider),after=$('.ba-after',slider),divider=$('.ba-divider',slider);if(!input||!after||!divider)return;const update=()=>{const v=input.value;after.style.clipPath=`inset(0 0 0 ${v}%)`;divider.style.left=v+'%'};input.addEventListener('input',update,{passive:true});update()});

// Header, scroll progress and light parallax.
const header=$('.site-header');const hero=$('.hero-visual');const orbA=$('.hero-orb-a');const orbB=$('.hero-orb-b');const heroNote=$('.hero-note');let ticking=false;
function paintScroll(){const y=scrollY;header?.classList.toggle('jd-scrolled',y>18);const doc=document.documentElement;const max=Math.max(1,doc.scrollHeight-innerHeight);progressBar.style.transform=`scaleX(${Math.min(1,y/max)})`;if(hero&&y<innerHeight*1.3&&matchMedia('(min-width:701px)').matches){if(orbA)orbA.style.transform=`translate3d(0,${y*.045}px,0)`;if(orbB)orbB.style.transform=`translate3d(0,${y*-.035}px,0)`;if(heroNote)heroNote.style.transform=`translate3d(0,${y*.028}px,0) rotate(-5deg)`}ticking=false}
window.addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(paintScroll);ticking=true}},{passive:true});paintScroll();

// Very subtle hero perspective on desktop pointer movement.
if(hero&&matchMedia('(hover:hover) and (min-width:901px)').matches){hero.addEventListener('pointermove',e=>{const r=hero.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5;const y=(e.clientY-r.top)/r.height-.5;hero.style.setProperty('--jd-rx',`${(-y*2.2).toFixed(2)}deg`);hero.style.setProperty('--jd-ry',`${(x*2.8).toFixed(2)}deg`);hero.classList.add('jd-tilt')});hero.addEventListener('pointerleave',()=>{hero.style.setProperty('--jd-rx','0deg');hero.style.setProperty('--jd-ry','0deg');setTimeout(()=>hero.classList.remove('jd-tilt'),220)})}

// Button tap ripple.
document.addEventListener('pointerdown',e=>{const btn=e.target.closest('.btn');if(!btn)return;const r=btn.getBoundingClientRect();const ripple=document.createElement('span');ripple.className='jd-ripple';ripple.style.left=`${e.clientX-r.left}px`;ripple.style.top=`${e.clientY-r.top}px`;btn.appendChild(ripple);setTimeout(()=>ripple.remove(),760)});

$('[data-form-submit]')?.addEventListener('click',()=>{const status=$('.form-status');if(status)status.textContent='Демо-форма: підключимо Telegram, Viber або Cliniccards після додавання контактів.'});
