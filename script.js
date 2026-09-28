document.documentElement.classList.add('js');

const nav=document.querySelector('.nav');
const menuBtn=document.querySelector('.menu-btn');
if(menuBtn&&nav){menuBtn.addEventListener('click',()=>nav.classList.toggle('open'));document.querySelectorAll('.links a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')))}

const revealObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');revealObserver.unobserve(entry.target)}})},{threshold:.12,rootMargin:'0px 0px -5% 0px'});
document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));

const tabs=[...document.querySelectorAll('.tab[data-tab]')];
const panels=[...document.querySelectorAll('.price-panel')];
function activateTab(id){if(!id)return;const tab=tabs.find(t=>t.dataset.tab===id);const panel=document.getElementById(id);if(!tab||!panel)return;tabs.forEach(t=>t.classList.remove('active'));panels.forEach(p=>p.classList.remove('active'));tab.classList.add('active');panel.classList.add('active')}
tabs.forEach(tab=>tab.addEventListener('click',()=>{activateTab(tab.dataset.tab);history.replaceState(null,'','#'+tab.dataset.tab)}));
if(location.hash)activateTab(location.hash.slice(1));
window.addEventListener('hashchange',()=>activateTab(location.hash.slice(1)));

const heroCard=document.querySelector('.hero-card');
if(heroCard&&matchMedia('(pointer:fine)').matches){heroCard.addEventListener('mousemove',e=>{const r=heroCard.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5;const y=(e.clientY-r.top)/r.height-.5;heroCard.style.transform=`perspective(900px) rotateY(${x*7}deg) rotateX(${-y*7}deg)`});heroCard.addEventListener('mouseleave',()=>heroCard.style.transform='')}

const path=location.pathname.split('/').pop()||'index.html';
const serviceDetailPages=['laser.html','elos.html','endosphere.html'];
document.querySelectorAll('.links a').forEach(a=>{const href=(a.getAttribute('href')||'').split('#')[0];if((path===''||path==='index.html')&&href==='index.html')a.classList.add('active');else if(href===path)a.classList.add('active');else if(serviceDetailPages.includes(path)&&href==='services.html')a.classList.add('active')});
