(()=>{
 const form=document.querySelector('[data-website-booking]');if(!form)return;
 const status=form.querySelector('.form-status'),button=form.querySelector('[type=submit]'),date=form.elements.date;
 const api='https://just-dent-telegram.onrender.com/website-booking';
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());date.min=today;
 let busy=false,requestId=null,previous=null;
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy||!form.reportValidity())return;
  const fields=Object.fromEntries(new FormData(form));
  if(fields.time&&!fields.date){status.textContent='Оберіть бажану дату або залиште час порожнім.';date.focus();return;}
  const digits=fields.phone.replace(/\D/g,'');if(digits.length<10||digits.length>15){status.textContent='Вкажіть повний номер телефону.';form.elements.phone.focus();return;}
  const signature=JSON.stringify(fields);if(signature!==previous){requestId=crypto.randomUUID();previous=signature;}
  busy=true;button.disabled=true;button.textContent='Надсилаємо…';status.textContent='Надсилаємо заявку. Перше з’єднання може тривати до хвилини.';
  try{
   const response=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...fields,request_id:requestId}),signal:AbortSignal.timeout(90000)});
   const body=await response.json();
   if(!response.ok||body.ok!==true)throw Error(typeof body.detail==='string'?body.detail:'Не вдалося надіслати заявку. Напишіть нам у Telegram.');
   status.textContent='Дякуємо! Заявку отримано. Адміністратор зв’яжеться з вами для підтвердження часу.';form.reset();requestId=null;previous=null;
  }catch(error){status.textContent=error.name==='TimeoutError'||error.name==='TypeError'?'Не вдалося перевірити доставку. Напишіть нам у Telegram, щоб уточнити статус заявки.':error.message;}
  finally{busy=false;button.disabled=false;button.textContent='Надіслати заявку →';}
 });
})();
