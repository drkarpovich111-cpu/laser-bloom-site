const $=(s,r=document)=>r.querySelector(s);const $$=(s,r=document)=>[...r.querySelectorAll(s)];

// Shared premium motion layer for every JUST DENT page.
(()=>{const script=document.currentScript;const href=new URL('effects.css',script?.src||location.href).href;if(!document.querySelector(`link[href="${href}"]`)){const link=document.createElement('link');link.rel='stylesheet';link.href=href;document.head.appendChild(link)}})();

// Dark transition screen + dimensional tooth + particle disintegration.
const transition=document.createElement('div');
transition.className='jd-page-transition is-arriving';
transition.setAttribute('aria-hidden','true');
transition.innerHTML=`
  <div class="jd-fog jd-fog-a"></div><div class="jd-fog jd-fog-b"></div>
  <div class="jd-tooth-stage">
    <div class="jd-tooth-aura"></div>
    <div class="jd-tooth-3d">
      <svg class="jd-tooth-layer jd-tooth-back" viewBox="0 0 120 140"><path d="M37 14c13.5 0 18 8 23 8 5.2 0 9.6-8 23-8 19 0 31.4 15.3 27.7 35.6-2.6 14.7-11.7 24-16 39.5-5.8 20.1-12.4 32.4-22.6 32.4-8.2 0-9.4-22.4-15.2-22.4s-6.9 22.4-15.2 22.4c-10.3 0-16.8-12.3-22.6-32.4C14.1 73.6 5 64.3 2.3 49.6-1.3 29.3 11 14 37 14Z"/></svg>
      <svg class="jd-tooth-layer jd-tooth-mid" viewBox="0 0 120 140"><path d="M37 14c13.5 0 18 8 23 8 5.2 0 9.6-8 23-8 19 0 31.4 15.3 27.7 35.6-2.6 14.7-11.7 24-16 39.5-5.8 20.1-12.4 32.4-22.6 32.4-8.2 0-9.4-22.4-15.2-22.4s-6.9 22.4-15.2 22.4c-10.3 0-16.8-12.3-22.6-32.4C14.1 73.6 5 64.3 2.3 49.6-1.3 29.3 11 14 37 14Z"/></svg>
      <svg class="jd-tooth-layer jd-tooth-front" viewBox="0 0 120 140"><defs><linearGradient id="jdToothGold" x1="22" y1="18" x2="94" y2="121" gradientUnits="userSpaceOnUse"><stop stop-color="#fffefb"/><stop offset=".22" stop-color="#f6ead4"/><stop offset=".48" stop-color="#d2a85f"/><stop offset=".66" stop-color="#fff1cf"/><stop offset=".84" stop-color="#b57d32"/><stop offset="1" stop-color="#7d5225"/></linearGradient><linearGradient id="jdToothShine" x1="30" y1="20" x2="76" y2="112" gradientUnits="userSpaceOnUse"><stop stop-color="white" stop-opacity="1"/><stop offset=".35" stop-color="white" stop-opacity=".24"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient></defs><path class="jd-tooth-main" d="M37 14c13.5 0 18 8 23 8 5.2 0 9.6-8 23-8 19 0 31.4 15.3 27.7 35.6-2.6 14.7-11.7 24-16 39.5-5.8 20.1-12.4 32.4-22.6 32.4-8.2 0-9.4-22.4-15.2-22.4s-6.9 22.4-15.2 22.4c-10.3 0-16.8-12.3-22.6-32.4C14.1 73.6 5 64.3 2.3 49.6-1.3 29.3 11 14 37 14Z" fill="url(#jdToothGold)"/><path class="jd-tooth-highlight" d="M31 26c8-5 15-1 22 2 6 3 13-5 24-4 14 2 21 13 18 28-2 11-8 18-11 27" fill="none" stroke="url(#jdToothShine)" stroke-width="6" stroke-linecap="round"/></svg>
    </div>
    <div class="jd-particles"></div>
    <span class="jd-spark jd-spark-1"></span><span class="jd-spark jd-spark-2"></span><span class="jd-spark jd-spark-3"></span>
  </div>`;
document.body.appendChild(transition);

const particles=$('.jd-particles',transition);
for(let i=0;i<58;i++){
  const p=document.createElement('i');p.className='jd-particle';
  const a=(i/58)*Math.PI*2+(i%5)*.11;const ring=20+(i%7)*5.3;
  const sx=Math.cos(a)*ring*.72,sy=Math.sin(a)*ring*.95;
  const distance=78+(i%9)*12;
  const tx=Math.cos(a)*distance+(i%3-1)*18,ty=Math.sin(a)*distance+(i%4-1.5)*14;
  p.style.setProperty('--sx',`${sx.toFixed(1)}px`);p.style.setProperty('--sy',`${sy.toFixed(1)}px`);
  p.style.setProperty('--tx',`${tx.toFixed(1)}px`);p.style.setProperty('--ty',`${ty.toFixed(1)}px`);
  p.style.setProperty('--rot',`${(i%2?1:-1)*(90+(i%8)*47)}deg`);p.style.setProperty('--delay',`${(i%8)*14}ms`);
  p.style.setProperty('--size',`${4+(i%5)*1.5}px`);particles.appendChild(p);
}

const progress=document.createElement('div');progress.className='jd-scroll-progress';progress.innerHTML='<span></span>';document.body.appendChild(progress);const progressBar=$('span',progress);

requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(()=>transition.classList.remove('is-arriving'),620)));
window.addEventListener('pageshow',()=>{transition.classList.remove('is-active','is-shattering');setTimeout(()=>transition.classList.remove('is-arriving'),220)});

function isInternalNavigation(a,e){if(!a||a.target==='_blank'||a.hasAttribute('download')||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return false;const raw=a.getAttribute('href');if(!raw||raw.startsWith('#')||raw.startsWith('mailto:')||raw.startsWith('tel:')||raw.startsWith('javascript:'))return false;let url;try{url=new URL(a.href,location.href)}catch{return false}if(url.origin!==location.origin)return false;if(url.pathname===location.pathname&&url.search===location.search&&url.hash)return false;return true}

document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!isInternalNavigation(a,e))return;e.preventDefault();transition.classList.remove('is-arriving','is-shattering');void transition.offsetWidth;transition.classList.add('is-active');setTimeout(()=>transition.classList.add('is-shattering'),250);setTimeout(()=>{location.href=a.href},910)});

// Mobile menu.
const menuBtn=$('.menu-btn');const nav=$('.main-nav');
menuBtn?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menuBtn.setAttribute('aria-expanded',open?'true':'false')});
$$('.main-nav a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menuBtn?.setAttribute('aria-expanded','false')}));

// Scroll reveals.
const revealObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');revealObserver.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -5% 0px'});
$$('.reveal').forEach(el=>revealObserver.observe(el));

const fxSelectors=['.section-head','.page-hero > .container','.service-card','.doctor-card','.review-card','.stat-card','.before-after','.price-inner','.appointment-card','.footer-grid > *','.page-card','.contact-card','.price-card','.case-card'];
const fxCandidates=$$(fxSelectors.join(',')).filter(el=>!el.classList.contains('reveal'));
fxCandidates.forEach((el,i)=>{el.classList.add('fx-auto');const box=el.getBoundingClientRect();const center=box.left+box.width/2;const viewport=innerWidth/2;let fx='up';if(innerWidth>760){if(center<viewport*.72)fx='left';else if(center>viewport*1.28)fx='right';else if(i%4===0)fx='zoom'}el.dataset.fx=fx;el.style.setProperty('--fx-delay',`${(i%4)*70}ms`)});
const fxObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('fx-visible');fxObserver.unobserve(e.target)}})},{threshold:.1,rootMargin:'0px 0px -4% 0px'});
$$('.fx-auto').forEach(el=>fxObserver.observe(el));
['.stats-grid','.services-grid','.doctors-grid','.reviews-grid','.footer-grid'].forEach(sel=>{$(sel)?.querySelectorAll(':scope > *').forEach((el,i)=>{if(!el.style.transitionDelay)el.style.transitionDelay=`${Math.min(i,5)*65}ms`})});

// Hero/page title disintegration while scrolling away.
function splitTitle(el){if(!el||el.dataset.jdSplit)return;el.dataset.jdSplit='1';el.setAttribute('aria-label',el.textContent.trim());const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);let idx=0;nodes.forEach(node=>{const frag=document.createDocumentFragment();[...node.textContent].forEach(ch=>{if(/\s/.test(ch)){frag.appendChild(document.createTextNode(ch));return}const s=document.createElement('span');s.className='jd-letter';s.textContent=ch;const seed=idx++;const side=seed%2?1:-1;s.dataset.dx=String(side*(16+(seed%7)*7));s.dataset.dy=String(-8+(seed%9)*8);s.dataset.rot=String(side*(4+(seed%6)*5));frag.appendChild(s)});node.replaceWith(frag)});el.dataset.jdLetters=idx}
const scatterTitles=$$('.hero h1,.page-hero h1');scatterTitles.forEach(splitTitle);
function paintTitleScatter(){scatterTitles.forEach(title=>{const host=title.closest('.hero,.page-hero')||title.parentElement;const r=host.getBoundingClientRect();const start=Math.max(30,innerHeight*.04);const travel=Math.max(170,Math.min(r.height*.52,360));const p=Math.max(0,Math.min(1,(start-r.top)/travel));title.style.setProperty('--jd-scatter',p.toFixed(3));$$('.jd-letter',title).forEach((l,i)=>{const local=Math.max(0,Math.min(1,(p-(i%7)*.012)/.92));const ease=local*local*(3-2*local);const dx=Number(l.dataset.dx)*ease,dy=Number(l.dataset.dy)*ease,rot=Number(l.dataset.rot)*ease;l.style.transform=`translate3d(${dx}px,${dy}px,0) rotate(${rot}deg) scale(${1-ease*.08})`;l.style.filter=`blur(${(ease*7).toFixed(2)}px)`;l.style.opacity=String(Math.max(.03,1-ease*.97))})})}

// Counters that always fit their cards.
function formatNumber(n){return new Intl.NumberFormat('uk-UA').format(n)}
function fitNumber(el){el.style.fontSize='';let size=parseFloat(getComputedStyle(el).fontSize);const min=22;while(el.scrollWidth>el.clientWidth&&size>min){size-=1;el.style.fontSize=size+'px'}}
function animateCounter(el){if(el.dataset.done)return;el.dataset.done='1';const target=Number(el.dataset.target||0),suffix=el.dataset.suffix||'',start=performance.now(),dur=1300;function frame(now){const p=Math.min(1,(now-start)/dur),eased=1-Math.pow(1-p,3);el.textContent=formatNumber(Math.round(target*eased))+suffix;fitNumber(el);if(p<1)requestAnimationFrame(frame)}requestAnimationFrame(frame)}
const counterObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){animateCounter(e.target);counterObserver.unobserve(e.target)}})},{threshold:.45});
$$('.stat-number').forEach(el=>counterObserver.observe(el));window.addEventListener('resize',()=>$$('.fit-number').forEach(fitNumber));

// Before / after sliders.
$$('[data-slider]').forEach(slider=>{const input=$('input',slider),after=$('.ba-after',slider),divider=$('.ba-divider',slider);if(!input||!after||!divider)return;const update=()=>{const v=input.value;after.style.clipPath=`inset(0 0 0 ${v}%)`;divider.style.left=v+'%'};input.addEventListener('input',update,{passive:true});update()});

// Header, progress, parallax and title scatter in one RAF.
const header=$('.site-header'),hero=$('.hero-visual'),orbA=$('.hero-orb-a'),orbB=$('.hero-orb-b'),heroNote=$('.hero-note');let ticking=false;
function paintScroll(){const y=scrollY;header?.classList.toggle('jd-scrolled',y>18);const doc=document.documentElement,max=Math.max(1,doc.scrollHeight-innerHeight);progressBar.style.transform=`scaleX(${Math.min(1,y/max)})`;paintTitleScatter();if(hero&&y<innerHeight*1.3&&matchMedia('(min-width:701px)').matches){if(orbA)orbA.style.transform=`translate3d(0,${y*.045}px,0)`;if(orbB)orbB.style.transform=`translate3d(0,${y*-.035}px,0)`;if(heroNote)heroNote.style.transform=`translate3d(0,${y*.028}px,0) rotate(-5deg)`}ticking=false}
window.addEventListener('scroll',()=>{if(!ticking){requestAnimationFrame(paintScroll);ticking=true}},{passive:true});window.addEventListener('resize',paintScroll,{passive:true});paintScroll();

if(hero&&matchMedia('(hover:hover) and (min-width:901px)').matches){hero.addEventListener('pointermove',e=>{const r=hero.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;hero.style.setProperty('--jd-rx',`${(-y*2.2).toFixed(2)}deg`);hero.style.setProperty('--jd-ry',`${(x*2.8).toFixed(2)}deg`);hero.classList.add('jd-tilt')});hero.addEventListener('pointerleave',()=>{hero.style.setProperty('--jd-rx','0deg');hero.style.setProperty('--jd-ry','0deg');setTimeout(()=>hero.classList.remove('jd-tilt'),220)})}

document.addEventListener('pointerdown',e=>{const btn=e.target.closest('.btn');if(!btn)return;const r=btn.getBoundingClientRect(),ripple=document.createElement('span');ripple.className='jd-ripple';ripple.style.left=`${e.clientX-r.left}px`;ripple.style.top=`${e.clientY-r.top}px`;btn.appendChild(ripple);setTimeout(()=>ripple.remove(),760)});
$('[data-form-submit]')?.addEventListener('click',()=>{const status=$('.form-status');if(status)status.textContent='Демо-форма: підключимо Telegram, Viber або Cliniccards після додавання контактів.'});
