const $=(s,r=document)=>r.querySelector(s);const $$=(s,r=document)=>[...r.querySelectorAll(s)];

const menuBtn=$('.menu-btn');const nav=$('.main-nav');
menuBtn?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menuBtn.setAttribute('aria-expanded',open?'true':'false')});
$$('.main-nav a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menuBtn?.setAttribute('aria-expanded','false')}));

const io=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')})},{threshold:.14});
$$('.reveal').forEach(el=>io.observe(el));

function formatNumber(n){return new Intl.NumberFormat('uk-UA').format(n)}
function fitNumber(el){let size=parseFloat(getComputedStyle(el).fontSize);const min=24;el.style.fontSize='';size=parseFloat(getComputedStyle(el).fontSize);while(el.scrollWidth>el.clientWidth&&size>min){size-=1;el.style.fontSize=size+'px'}}
function animateCounter(el){if(el.dataset.done)return;el.dataset.done='1';const target=Number(el.dataset.target||0);const suffix=el.dataset.suffix||'';const start=performance.now();const dur=1200;function frame(now){const p=Math.min(1,(now-start)/dur);const eased=1-Math.pow(1-p,3);const value=Math.round(target*eased);el.textContent=formatNumber(value)+suffix;fitNumber(el);if(p<1)requestAnimationFrame(frame)}requestAnimationFrame(frame)}
const counterObserver=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)animateCounter(e.target)})},{threshold:.5});
$$('.stat-number').forEach(el=>counterObserver.observe(el));
window.addEventListener('resize',()=>$$('.fit-number').forEach(fitNumber));

$$('[data-slider]').forEach(slider=>{const input=$('input',slider),after=$('.ba-after',slider),divider=$('.ba-divider',slider);const update=()=>{const v=input.value;after.style.clipPath=`inset(0 0 0 ${v}%)`;divider.style.left=v+'%'};input.addEventListener('input',update);update()});

$('[data-form-submit]')?.addEventListener('click',()=>{const status=$('.form-status');if(status)status.textContent='Демо-форма: підключимо Telegram, Viber або Cliniccards після додавання контактів.'});
