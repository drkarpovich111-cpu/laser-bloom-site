'use strict';
(() => {
  const OWNER='drkarpovich111-cpu', REPO='laser-bloom-site', ROOT='just-dent-site/', BRANCH='main';
  const API=`https://api.github.com/repos/${OWNER}/${REPO}`;
  const pages=[['prices','Прайс'],['doctors','Лікарі'],['contacts','Контакти'],['index','Головна'],['about','Про клініку'],['services','Послуги'],['cases','До / Після']];
  const $=s=>document.querySelector(s);
  let token='', active='prices', dirty=false, busy=false, baseline=new Map(), docs=new Map(), prices=[], uploads=new Map();
  const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
  const message=(text,error=false)=>{ $('#status').textContent=text;$('#status').classList.toggle('error',error); };
  const mark=()=>{dirty=true;$('#save').disabled=busy;};
  function setBusy(value){busy=value;$('#editor').disabled=value;$('#save').disabled=value||!dirty;for(const s of ['#discard','#preview','#logout','#connect'])$(s).disabled=value;$('#tabs').querySelectorAll('button').forEach(b=>b.disabled=value);}
  async function api(path,options={}){
    const response=await fetch(API+path,{...options,headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',Authorization:`Bearer ${token}`,...(options.body?{'Content-Type':'application/json'}:{}),...options.headers},cache:'no-store',signal:AbortSignal.timeout(30000)});
    if(!response.ok){if(response.status===401)throw Error('Ключ недійсний або прострочений. Вийдіть і введіть новий ключ.');if(response.status===403)throw Error('GitHub відхилив запит. Перевірте Contents: Read and write та строк дії ключа.');if([409,422].includes(response.status))throw Error('Сайт змінився або GitHub не дозволив збереження. Ваші правки залишились у формі. Оновіть дані перед повторною спробою.');throw Error(`Не вдалося виконати запит GitHub (${response.status}). Зміни у формі збережені.`);}
    return response.json();
  }
  const post=(path,body)=>api(path,{method:'POST',body:JSON.stringify(body)});
  const decode=b64=>new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g,'')),c=>c.charCodeAt(0)));
  async function readFile(path,ref){const f=await api(`/contents/${ROOT+path}?ref=${encodeURIComponent(ref)}`);return {sha:f.sha,text:decode(f.content)};}
  async function load(){
    const head=await api(`/git/ref/heads/${BRANCH}`);
    const paths=[...pages.map(([id])=>id+'.html'),'prices-data.js'];
    const next=await Promise.all(paths.map(async p=>[p,await readFile(p,head.object.sha)]));
    const map=new Map(next);const raw=map.get('prices-data.js').text.trim();
    if(!raw.startsWith('window.JD_PRICES='))throw Error('Формат прайсу змінився. Потрібне оновлення панелі.');
    const parsed=JSON.parse(raw.slice('window.JD_PRICES='.length).replace(/;\s*$/,''));
    if(!Array.isArray(parsed)||parsed.some(g=>!Array.isArray(g.items)))throw Error('Невідомий формат прайсу.');
    baseline=map;prices=parsed;docs=new Map(pages.map(([id])=>[id,new DOMParser().parseFromString(map.get(id+'.html').text,'text/html')]));uploads.clear();dirty=false;render();
  }
  $('#loginForm').addEventListener('submit',async e=>{e.preventDefault();token=$('#token').value.trim();$('#token').value='';setBusy(true);message('Підключення до вашого сайту…');try{const repo=await api('');if(!repo.permissions?.push)throw Error('Цей ключ не має доступу до редагування сайту.');await load();$('#login').hidden=true;$('#workspace').hidden=false;$('#logout').hidden=false;message('Сайт завантажено. Оберіть розділ і внесіть зміни.');}catch(error){token='';message(error.message,true);}finally{setBusy(false);}});
  $('#logout').onclick=()=>{if(dirty&&!confirm('Вийти без збереження змін?'))return;token='';prices=[];docs.clear();baseline.clear();uploads.clear();dirty=false;$('#editor').replaceChildren();$('#workspace').hidden=true;$('#logout').hidden=true;$('#login').hidden=false;message('Ви вийшли.');};
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  window.addEventListener('pagehide',()=>{token='';});
  window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
  for(const [id,title] of pages){const b=el('button',title);b.onclick=()=>{active=id;render();};b.dataset.page=id;$('#tabs').append(b);}
  function field(parent,title,value,onChange,{multiline=false,type='text'}={}){const label=el('label',title);const input=el(multiline?'textarea':'input');input.value=value??'';if(!multiline)input.type=type;input.addEventListener('input',()=>{onChange(input.value,input);mark();});label.append(input);parent.append(label);return input;}
  function render(){
    $('#tabs').querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',String(b.dataset.page===active)));
    $('#editor').replaceChildren();$('#hint').textContent=active==='prices'?'Український прайс · ціни в гривнях':'Зміни стосуються обраної сторінки. Фото й тексти на інших сторінках редагуються окремо.';
    if(active==='prices')renderPrices();else renderPage();$('#save').disabled=busy||!dirty;
  }
  function renderPrices(){
    prices.forEach((group,gi)=>{const card=el('section',undefined,'card');field(card,'Назва розділу',group.title,v=>group.title=v);
      group.items.forEach((item,ii)=>{const row=el('div',undefined,'price-row');field(row,'Послуга',item.name,v=>item.name=v);const p=field(row,'Ціна, грн',item.price,(v,input)=>{item.price=v;input.setCustomValidity(validPrice(v)?'':'Введіть невід’ємну суму числом');});p.inputMode='decimal';const del=el('button','Видалити','danger');del.onclick=()=>{if(confirm(`Видалити «${item.name}»?`)){group.items.splice(ii,1);mark();render();}};row.append(del);card.append(row);});
      const add=el('button','+ Додати послугу','add');add.onclick=()=>{group.items.push({name:'Нова послуга',price:'0.00'});mark();render();};card.append(add);
      const remove=el('button','Видалити розділ','danger add');remove.onclick=()=>{if(confirm(`Видалити розділ «${group.title}» і його послуги?`)){prices.splice(gi,1);mark();render();}};card.append(remove);$('#editor').append(card);
    });
    const add=el('button','+ Додати розділ');add.onclick=()=>{prices.push({title:'Новий розділ',items:[]});mark();render();};$('#editor').append(add);
  }
  const validPrice=v=>/^\d+(?:[.,]\d{1,2})?$/.test(String(v).trim());
  function safeLink(v){return /^(https?:\/\/|mailto:|tel:|#)/i.test(v)||(/^[\w./-]+(?:#[\w-]+)?$/.test(v)&&!v.startsWith('//'));}
  function renderPage(){
    const doc=docs.get(active);let texts=[];
    const walker=doc.createTreeWalker(doc.body,NodeFilter.SHOW_TEXT,{acceptNode(node){const p=node.parentElement;return node.textContent.trim()&&p?.closest('main,footer')&&!p.closest('script,style,svg,select,button,.photo-placeholder,.doctor-photo')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}});
    while(walker.nextNode())texts.push(walker.currentNode);
    const card=el('section',undefined,'card');card.append(el('h2','Тексти'));texts.forEach(node=>{const tag=node.parentElement.tagName;field(card,/^H[1-6]$/.test(tag)?'Заголовок':'Текст',node.textContent.trim(),v=>node.textContent=v,{multiline:node.textContent.length>85});});$('#editor').append(card);
    const links=el('section',undefined,'card');links.append(el('h2','Посилання, телефон та email'));doc.querySelectorAll('main a[href],footer a[href]').forEach(a=>{field(links,a.textContent.trim()||a.getAttribute('aria-label')||'Посилання',a.getAttribute('href'),(v,input)=>{input.setCustomValidity(safeLink(v)?'':'Введіть коректне посилання, tel: або mailto:');a.setAttribute('href',v);});});$('#editor').append(links);
    const photos=el('section',undefined,'card');photos.append(el('h2','Фотографії'));photos.append(el('p','Виберіть фото з телефону або комп’ютера. Воно буде зменшене для швидкого завантаження.','small'));
    const nodes=[...doc.querySelectorAll('main img:not(.brand-logo-img),main .doctor-photo:not(:has(img)),main .photo-placeholder:not(:has(img))')];
    nodes.forEach((node,i)=>{const title=node.closest('article')?.querySelector('h3')?.textContent||node.getAttribute('alt')||'Фото клініки';const row=el('div',undefined,'photo-row');let src=node.getAttribute('src')||node.dataset.adminPhoto||'';if(!src&&node.matches('.photo-placeholder'))src='clinic-exterior.webp';if(!src&&node.matches('.doctor-photo')){const idx=[...doc.querySelectorAll('.doctors-grid .doctor-photo')].indexOf(node);const ids=['rostyslav','slava','vlad','andriy'];if(ids[idx])src=`images/doctors/${ids[idx]}-hq.avif`;}
      const img=el('img');img.alt=title;img.src=uploads.get(src)?.preview||new URL('../'+src,location.href).href;row.append(img);const wrap=el('div');const label=el('label',title);const input=el('input');input.type='file';input.accept='image/jpeg,image/png,image/webp,image/avif';input.onchange=async()=>{const file=input.files[0];if(!file)return;setBusy(true);try{const data=await compress(file);const path=`images/uploads/${crypto.randomUUID()}.webp`;uploads.set(path,data);img.src=data.preview;if(node.tagName==='IMG'){node.setAttribute('src',path);node.removeAttribute('srcset');node.removeAttribute('sizes');node.closest('picture')?.querySelectorAll('source').forEach(s=>s.remove());}else{node.style.setProperty('background-image',`url("${path}")`,'important');node.style.setProperty('background-size','cover');node.dataset.adminPhoto=path;}mark();message('Фото підготовлено. Натисніть «Зберегти зміни».');}catch(e){message(e.message,true);}finally{setBusy(false);}};label.append(input);wrap.append(label);if(node.tagName==='IMG')field(wrap,'Опис фото',node.getAttribute('alt')||'',v=>node.setAttribute('alt',v));row.append(wrap);photos.append(row);});
    if(nodes.length)$('#editor').append(photos);
  }
  async function compress(file){if(file.size>12*1024*1024)throw Error('Оберіть фото до 12 МБ.');if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type))throw Error('Оберіть JPG, PNG, WebP або AVIF.');const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>60000000){bitmap.close();throw Error('Фото завелике. Зменште його роздільність.');}const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const preview=canvas.toDataURL('image/webp',.86);if(!preview.startsWith('data:image/webp;'))throw Error('Цей браузер не підтримує обробку фото. Спробуйте Chrome.');return {preview,base64:preview.split(',')[1]};}
  function serialize(doc){return '<!doctype html>\n'+doc.documentElement.outerHTML;}
  function changes(){
    if(!prices.length||prices.some(g=>!g.title.trim()||g.items.some(i=>!i.name.trim()||!validPrice(i.price))))throw Error('Перевірте прайс: назви не можуть бути порожніми, ціни — невід’ємні числа з максимум двома знаками після коми.');
    const normalized=prices.map(g=>({...g,title:g.title.trim(),items:g.items.map(i=>({...i,name:i.name.trim(),price:String(i.price).trim().replace(',','.')}))}));
    const originalPrices=JSON.parse(baseline.get('prices-data.js').text.trim().slice('window.JD_PRICES='.length).replace(/;\s*$/,''));
    const changed=new Map();
    if(JSON.stringify(normalized)!==JSON.stringify(originalPrices)){
      changed.set('prices-data.js','window.JD_PRICES='+JSON.stringify(normalized)+';\n');

    }
    for(const [id,doc]of docs){for(const a of doc.querySelectorAll('main a[href],footer a[href]'))if(!safeLink(a.getAttribute('href')))throw Error(`Перевірте посилання на сторінці «${pages.find(p=>p[0]===id)[1]}».`);const original=new DOMParser().parseFromString(baseline.get(id+'.html').text,'text/html');if(serialize(doc)!==serialize(original))changed.set(id+'.html',serialize(doc));}
    return changed;
  }
  $('#discard').onclick=async()=>{if(dirty&&!confirm('Скасувати всі незбережені зміни й завантажити актуальний сайт?'))return;setBusy(true);try{await load();message('Завантажено актуальний сайт.');}catch(e){message(e.message,true);}finally{setBusy(false);}};
  $('#save').onclick=async()=>{
    let changed;try{changed=changes();}catch(e){message(e.message,true);return;}if(!changed.size){message('Змін немає.');dirty=false;$('#save').disabled=true;return;}
    setBusy(true);message('Зберігаю зміни…');
    try{
      const head=await api(`/git/ref/heads/${BRANCH}`),parent=head.object.sha;
      const current=await Promise.all([...changed.keys()].map(async p=>[p,await readFile(p,parent)]));
      if(current.some(([p,f])=>f.sha!==baseline.get(p).sha))throw Error('Ці сторінки вже змінились в іншій сесії. Ваші правки не перезаписали чужі. Скопіюйте потрібні тексти й натисніть «Скасувати зміни», щоб завантажити нову версію.');
      const commit=await api(`/git/commits/${parent}`);const tree=[...changed].map(([p,content])=>({path:ROOT+p,mode:'100644',type:'blob',content}));
      for(const [path,image]of uploads){if(![...changed.values()].some(text=>text.includes(path)))continue;const blob=await post('/git/blobs',{content:image.base64,encoding:'base64'});tree.push({path:ROOT+path,mode:'100644',type:'blob',sha:blob.sha});}
      const t=await post('/git/trees',{base_tree:commit.tree.sha,tree});const c=await post('/git/commits',{message:'Update JUST DENT content from owner panel',tree:t.sha,parents:[parent]});
      try{await api(`/git/refs/heads/${BRANCH}`,{method:'PATCH',body:JSON.stringify({sha:c.sha,force:false})});}catch(error){const check=await api(`/git/ref/heads/${BRANCH}`);if(check.object.sha!==c.sha)throw error;}
      // Keep confirmed saved state even if a subsequent read fails.
      dirty=false;uploads.clear();
      try{await load();message('Зміни збережені в GitHub. Для публікації відкрийте Render → Manual Deploy → Deploy latest commit. Посилання — у підказці над редактором.');}catch{message('Зміни збережені в GitHub. Не вдалося повторно завантажити редактор — перезайдіть перед наступним редагуванням.');$('#workspace').hidden=true;$('#login').hidden=false;token='';}
    }catch(e){message(e.message,true);}finally{setBusy(false);}
  };
  $('#preview').onclick=()=>{
    const doc=docs.get(active).cloneNode(true);doc.querySelectorAll('script,iframe,object,embed,meta[http-equiv]').forEach(n=>n.remove());doc.querySelectorAll('*').forEach(n=>{[...n.attributes].forEach(a=>{if(a.name.startsWith('on'))n.removeAttribute(a.name);});});
    const base=doc.createElement('base');base.href=new URL('../',location.href).href;doc.head.prepend(base);const effects=doc.createElement('link');effects.rel='stylesheet';effects.href='effects.css';doc.head.append(effects);
    const style=doc.createElement('style');style.textContent='.reveal,.fx-auto{opacity:1!important;transform:none!important;visibility:visible!important}';doc.head.append(style);
    for(const [path,img]of uploads){doc.querySelectorAll('img').forEach(n=>{if(n.getAttribute('src')===path)n.src=img.preview;});doc.querySelectorAll('[data-admin-photo]').forEach(n=>{if(n.dataset.adminPhoto===path)n.style.setProperty('background-image',`url("${img.preview}")`,'important');});}
    if(active==='prices'){const host=doc.querySelector('#priceGroups');host.replaceChildren();for(const group of prices){const card=doc.createElement('section');card.className='price-card';const h=doc.createElement('h3');h.textContent=group.title;card.append(h);for(const item of group.items){const row=doc.createElement('p');row.textContent=`${item.name} — ${item.price} ₴`;card.append(row);}host.append(card);}}
    $('#previewDialog iframe').srcdoc=serialize(doc);$('#previewDialog').showModal();
  };
  $('#closePreview').onclick=()=>$('#previewDialog').close();
})();

