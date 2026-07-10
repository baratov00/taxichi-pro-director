const $=s=>document.querySelector(s);
const load=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const OWNER_EMAIL='baratov329@mail.ru';
const OWNER_DEFAULT_PASSWORD='razoqiy123';
const ADMIN_SITE_URL='https://admin.taxichi.pro/';
const SUPABASE_URL='https://qquvbedufztponyxneqa.supabase.co',SUPABASE_KEY='sb_publishable_8lZ9AfMvjZOx1Xz6JTlNFg_uKK0qjr8',API_BASE=SUPABASE_URL+'/rest/v1',API_HEADERS={apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Accept-Profile':'public','Content-Profile':'public'};
const RESET_FUNCTION_URL=`${SUPABASE_URL}/functions/v1/director-password-reset`;
const DISPATCHERS_TABLE='taxichi_pro_dispatchers';
const DIRECTORS_TABLE='taxichi_pro_directors';
const DEFAULT_DISPATCHERS=[{id:'demo',name:'Иванова Мария',phone:'+7 999 999-77-42',login:'admin',password:'1234',active:true}];
const DEFAULT_DIRECTORS=[{id:'main',name:'Асадбек Баратов',email:OWNER_EMAIL,password:OWNER_DEFAULT_PASSWORD,active:true,can_manage_directors:true}];
const PAYMENT_MODES={
  free_park:'Для таксопарков',
  subscription:'Платеж по подписке',
  admin_balance:'Пополнить через админку'
};
const PAYMENT_PROVIDERS={none:'Без платежного провайдера',robokassa:'Robokassa',yookassa:'ЮKassa'};
const paymentMode=value=>['free_park','subscription','admin_balance'].includes(value)?value:'subscription';
const subscriptionSettings=value=>({price15:Number(value?.price15||0),price30:Number(value?.price30||0),epPrice:Number(value?.epPrice||0),account:value?.account||'',shopId:value?.shopId||'',secretKey:value?.secretKey||'',successUrl:value?.successUrl||'',failUrl:value?.failUrl||''});
const directorIsMain=()=>currentDirector?.can_manage_directors===true;
const boolValue=value=>value===true||value==='true'||value===1||value==='1';
const normalizePaymentSettings=value=>{
  if(!value)return {};
  if(typeof value==='string'){try{return JSON.parse(value)}catch{return {}}}
  return value||{};
};
const normalizeDispatcher=(d,i)=>({id:d.id||`disp-${i+1}`,name:d.name||'Админ',email:d.email||'',phone:d.phone||'',login:d.login||'',password:d.password||'',active:d.active!==false,hidden_from_directors:boolValue(d.hidden_from_directors),payment_mode:paymentMode(d.payment_mode||'subscription'),payment_provider:d.payment_provider||'none',payment_settings:subscriptionSettings(normalizePaymentSettings(d.payment_settings))});
const normalizeDirector=(d,i)=>({id:d.id||`director-${i+1}`,name:d.name||'Директор',email:String(d.email||'').trim().toLowerCase(),password:d.password||'',active:d.active!==false,can_manage_directors:boolValue(d.can_manage_directors)});
let dispatchers=(load('taxichiProDispatchers',[])||[]).map(normalizeDispatcher);
if(!dispatchers.length){dispatchers=[...DEFAULT_DISPATCHERS];saveDispatchers()}
let directors=(load('taxichiProDirectors',DEFAULT_DIRECTORS)||DEFAULT_DIRECTORS).map(normalizeDirector);
let currentDirector=null;
const adminStorageKey=(id,key)=>`taxichiProAdmin:${id}:${key}`;
const adminDrivers=id=>load(adminStorageKey(id,'taxichiProDrivers'),id==='demo'?load('taxichiProDrivers',[]):[]);
const adminWaybills=id=>load(adminStorageKey(id,'taxichiProWaybills'),id==='demo'?load('taxichiProWaybills',[]):[]);
let driverCounts={};
let paymentDriverProfiles=[];
let editingDispatcherId='',editingDirectorId='',ownerPage='admins';

function saveDispatchersLocal(){localStorage.setItem('taxichiProDispatchers',JSON.stringify(dispatchers))}
function dispatcherPayload(d){return {id:d.id,name:d.name||'Админ',email:d.email||'',phone:d.phone||'',login:d.login||'',password:d.password||'',active:d.active!==false,hidden_from_directors:boolValue(d.hidden_from_directors),payment_mode:paymentMode(d.payment_mode||'subscription'),payment_provider:d.payment_provider||'none',payment_settings:subscriptionSettings(d.payment_settings||{}),updated_at:new Date().toISOString()}}
function saveDirectorsLocal(){localStorage.setItem('taxichiProDirectors',JSON.stringify(directors))}
function directorPayload(d){return {id:d.id,name:d.name||'Директор',email:String(d.email||'').trim().toLowerCase(),password:d.password||'',active:d.active!==false,can_manage_directors:d.can_manage_directors===true,updated_at:new Date().toISOString()}}
async function remoteDispatchers(){
  const response=await fetch(`${API_BASE}/${DISPATCHERS_TABLE}?select=*&order=created_at.asc`,{headers:API_HEADERS,cache:'no-store'});
  if(!response.ok)throw new Error(await response.text());
  return (await response.json()).map(normalizeDispatcher);
}
async function saveDispatcherRemote(d){
  const response=await fetch(`${API_BASE}/${DISPATCHERS_TABLE}?on_conflict=id`,{method:'POST',headers:{...API_HEADERS,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(dispatcherPayload(d))});
  if(!response.ok)throw new Error(await response.text());
}
async function deleteDispatcherRemote(id){
  const response=await fetch(`${API_BASE}/${DISPATCHERS_TABLE}?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:{...API_HEADERS,'Prefer':'return=minimal'}});
  if(!response.ok)throw new Error(await response.text());
}
async function loadDispatchersRemote(){
  try{
    const remote=await remoteDispatchers();
    if(remote.length){dispatchers=remote;saveDispatchersLocal();render()}
  }catch(error){console.warn('Не удалось загрузить админов из Supabase',error)}
}
async function saveDispatchers(){saveDispatchersLocal();try{await Promise.all(dispatchers.map(saveDispatcherRemote))}catch(error){console.warn('Не удалось сохранить админов в Supabase',error)}}
function visibleDispatchers(){return directorIsMain()?dispatchers:dispatchers.filter(d=>!boolValue(d.hidden_from_directors))}
function readPayload(value){if(!value)return {};if(typeof value==='string'){try{return JSON.parse(value)}catch{return {}}}return value||{}}
function payloadAdminId(value){const payload=readPayload(value);return String(payload.adminId||payload.admin_id||payload.dispatcherId||payload.dispatcher_id||'').trim()}
function normalizeIsoDate(value){
  const raw=String(value||'').trim();
  if(!raw)return '';
  const direct=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(direct)return `${direct[1]}-${direct[2]}-${direct[3]}`;
  const ru=raw.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if(ru)return `${ru[3]}-${ru[2]}-${ru[1]}`;
  const parsed=new Date(raw);
  return Number.isNaN(parsed.getTime())?'':parsed.toISOString().slice(0,10);
}
function waybillDate(w){return normalizeIsoDate(w.date||w.created_at||w.updated_at||w.opened_at)}
async function loadDriverCountsRemote(){
  try{
    const response=await fetch(`${API_BASE}/driver_profiles?select=id,payload,updated_at`,{headers:API_HEADERS,cache:'no-store'});
    if(!response.ok)throw new Error(await response.text());
    const counts={};
    (await response.json()).forEach(row=>{
      const adminId=payloadAdminId(row.payload)||'demo';
      counts[adminId]=(counts[adminId]||0)+1;
    });
    driverCounts=counts;
    render();
  }catch(error){console.warn('Не удалось загрузить счетчик водителей',error)}
}
function profilePayload(row){return readPayload(row.payload)}
function profileName(row){const p=profilePayload(row),d=p.driver||{};return d.fullName||`${d.lastName||''} ${d.firstName||''} ${d.middleName||''}`.trim()||row.phone||'Водитель'}
function profilePhone(row){const p=profilePayload(row),d=p.driver||{};return row.phone||d.phone||'—'}
function profileBalance(row){return Number(profilePayload(row).subscription?.balance||0)}
function profileHistory(row){const history=profilePayload(row).subscription?.history;return Array.isArray(history)?history:[]}
function money(value){return `${Number(value||0).toLocaleString('ru-RU')} ₽`}
async function loadPaymentDriverProfiles(){
  const response=await fetch(`${API_BASE}/driver_profiles?select=id,phone,payload,updated_at&order=updated_at.desc`,{headers:API_HEADERS,cache:'no-store'});
  if(!response.ok)throw new Error(await response.text());
  paymentDriverProfiles=await response.json();
  return paymentDriverProfiles;
}
async function adjustProfileBalance(profileId,direction){
  const row=paymentDriverProfiles.find(x=>String(x.id)===String(profileId));if(!row)return;
  const amount=Number(prompt(direction==='plus'?'Сумма пополнения':'Сумма списания','500'));
  if(!Number.isFinite(amount)||amount<=0)return alert('Введите сумму больше 0');
  const payload=profilePayload(row),subscription={...(payload.subscription||{})},delta=direction==='plus'?amount:-amount,next=Number(subscription.balance||0)+delta;
  if(next<0&&!confirm('Баланс станет отрицательным. Продолжить?'))return;
  subscription.balance=next;
  subscription.history=[{date:new Date().toISOString(),amount:delta,reason:direction==='plus'?'Пополнение через директорский кабинет':'Списание директором',balance:next},...((Array.isArray(subscription.history)?subscription.history:[]))].slice(0,50);
  payload.subscription=subscription;
  const response=await fetch(`${API_BASE}/driver_profiles?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',headers:{...API_HEADERS,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({payload})});
  if(!response.ok){alert('Не удалось обновить баланс водителя');throw new Error(await response.text())}
  row.payload=payload;
  renderOwnerPayments();
}
async function remoteDirectors(){const response=await fetch(`${API_BASE}/${DIRECTORS_TABLE}?select=*&order=created_at.asc`,{headers:API_HEADERS,cache:'no-store'});if(!response.ok)throw new Error(await response.text());return (await response.json()).map(normalizeDirector)}
async function saveDirectorRemote(d){const response=await fetch(`${API_BASE}/${DIRECTORS_TABLE}?on_conflict=id`,{method:'POST',headers:{...API_HEADERS,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(directorPayload(d))});if(!response.ok)throw new Error(await response.text())}
async function deleteDirectorRemote(id){const response=await fetch(`${API_BASE}/${DIRECTORS_TABLE}?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:{...API_HEADERS,'Prefer':'return=minimal'}});if(!response.ok)throw new Error(await response.text())}
async function loadDirectorsRemote(){try{const remote=await remoteDirectors();if(remote.length){directors=remote;saveDirectorsLocal()}}catch(error){console.warn('Не удалось загрузить директоров из Supabase',error)}}
async function ensureMainDirector(){let main=directors.find(d=>d.email===OWNER_EMAIL)||DEFAULT_DIRECTORS[0];main={...main,id:main.id||'main',name:main.name||'Асадбек Баратов',email:OWNER_EMAIL,password:main.password||OWNER_DEFAULT_PASSWORD,active:true,can_manage_directors:true};directors=[main,...directors.filter(d=>d.email!==OWNER_EMAIL&&d.id!==main.id)];saveDirectorsLocal();await saveDirectorRemote(main).catch(error=>console.warn('Не удалось сохранить главного директора',error))}
function ownerAccount(){const saved=load('taxichiProOwnerAccount',null);return {email:OWNER_EMAIL,password:saved?.password||OWNER_DEFAULT_PASSWORD}}
function saveOwnerPassword(password){localStorage.setItem('taxichiProOwnerAccount',JSON.stringify({email:OWNER_EMAIL,password}))}
function formatRuPhone(raw){const rawDigits=String(raw||'').replace(/\D/g,''),digits=(rawDigits.startsWith('8')?'7'+rawDigits.slice(1):rawDigits.startsWith('7')?rawDigits:'7'+rawDigits).slice(0,11),n=digits.slice(1),a=n.slice(0,3),b=n.slice(3,6),c=n.slice(6,8),d=n.slice(8,10);return '+7'+(a?' '+a:'')+(b?' '+b:'')+(c?'-'+c:'')+(d?'-'+d:'')}
function enter(director){currentDirector=director||directors[0]||DEFAULT_DIRECTORS[0];sessionStorage.setItem('taxichiOwnerSession',currentDirector.email);$('#ownerLogin').classList.add('hidden');$('#ownerApp').classList.remove('hidden');document.querySelector('.account b').textContent=currentDirector.name||'Директор';document.querySelector('.account span').textContent=currentDirector.can_manage_directors?'Главный директор':'Директор';if(!directorIsMain()&&ownerPage==='cabinet')ownerPage='admins';render();loadDriverCountsRemote()}

$('#ownerLoginForm').onsubmit=async e=>{
  e.preventDefault();
  await loadDirectorsRemote();await ensureMainDirector();
  const d=Object.fromEntries(new FormData(e.target)),email=String(d.email||'').trim().toLowerCase();
  const director=directors.find(x=>x.email===email&&x.password===d.password&&x.active!==false);
  if(director){
    $('#ownerError').textContent='';
    enter(director);
  }else $('#ownerError').textContent='Неверный логин или пароль';
};
const savedOwnerSession=sessionStorage.getItem('taxichiOwnerSession');if(savedOwnerSession){currentDirector=directors.find(d=>d.email===savedOwnerSession)||directors[0];enter(currentDirector)}
$('#ownerLogout').onclick=()=>{sessionStorage.removeItem('taxichiOwnerSession');$('#ownerApp').classList.add('hidden');$('#ownerLogin').classList.remove('hidden')};
document.querySelectorAll('[data-owner-page]').forEach(b=>b.onclick=()=>{ownerPage=b.dataset.ownerPage;render()});

const resetDialog=$('#ownerResetDialog'),resetForm=$('#ownerResetForm');
let resetStage='request';
function setResetStage(stage){
  resetStage=stage;
  const verify=stage==='verify';
  document.querySelectorAll('.reset-code-field,.reset-password-field').forEach(el=>el.classList.toggle('hidden',!verify));
  resetForm.elements.code.required=verify;
  resetForm.elements.password.required=verify;
  resetForm.elements.passwordConfirm.required=verify;
  $('#ownerResetSubmit').textContent=verify?'Сменить пароль':'Отправить код';
}
async function resetPasswordRequest(body){
  const response=await fetch(RESET_FUNCTION_URL,{method:'POST',headers:{...API_HEADERS,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok){
    const message=result.error==='email_not_found'?'Почта не найдена':result.error==='mail_not_configured'||(!result.error&&response.status===404)?'Отправка писем пока не настроена':result.error==='bad_code'?'Неверный или просроченный код':result.error==='short_password'?'Пароль должен быть не короче 6 символов':'Не удалось отправить код. Попробуйте ещё раз.';
    throw new Error(message);
  }
  return result;
}
$('#forgotOwnerPassword').onclick=()=>{resetForm.reset();setResetStage('request');$('#ownerResetError').textContent='';resetDialog.showModal()};
$('.reset-close').onclick=$('.reset-cancel').onclick=()=>resetDialog.close();
resetForm.onsubmit=async e=>{
  e.preventDefault();
  const submit=$('#ownerResetSubmit');
  submit.disabled=true;
  $('#ownerResetError').textContent='';
  try{
  const d=Object.fromEntries(new FormData(e.target));
  const email=String(d.email||'').trim().toLowerCase();
    if(resetStage==='request'){
      await resetPasswordRequest({action:'request',email});
      setResetStage('verify');
      $('#ownerResetError').textContent='Код отправлен на почту. Введите код и новый пароль.';
      return;
    }
    if(d.password!==d.passwordConfirm)throw new Error('Пароли не совпадают');
    await resetPasswordRequest({action:'verify',email,code:String(d.code||'').trim(),password:d.password});
    await loadDirectorsRemote();
    resetDialog.close();
    $('#ownerError').textContent='Пароль обновлен. Войдите с новым паролем.';
  }catch(error){
    $('#ownerResetError').textContent=error.message;
  }finally{
    submit.disabled=false;
  }
};
const resetParams=new URLSearchParams(location.search);
if(resetParams.has('resetEmail')||resetParams.has('resetCode')){
  $('#forgotOwnerPassword').click();
  resetForm.elements.email.value=resetParams.get('resetEmail')||'';
  resetForm.elements.code.value=resetParams.get('resetCode')||'';
  setResetStage('verify');
}

function render(){
  const main=directorIsMain();
  document.querySelector('[data-owner-page="cabinet"]').classList.toggle('hidden',!main);
  if(!main&&ownerPage==='cabinet')ownerPage='admins';
  document.querySelectorAll('[data-owner-page]').forEach(b=>b.classList.toggle('active',b.dataset.ownerPage===ownerPage));
  $('#ownerTitle').textContent=ownerPage==='analytics'?'Аналитика':ownerPage==='payments'?'Платежи':ownerPage==='cabinet'?'Кабинет':'Админы';
  $('#ownerSubtitle').textContent=ownerPage==='analytics'?'Сводка по всем админским кабинетам':ownerPage==='payments'?'Цены подписки и прием платежей для каждого админа':ownerPage==='cabinet'?'Доступы директорского кабинета':'Доступы для админского кабинета';
  $('#addDispatcher').style.display=ownerPage==='admins'?'inline-flex':'none';
  $('#dispatcherGrid').classList.toggle('hidden',ownerPage!=='admins');
  $('#ownerAnalytics').classList.toggle('hidden',ownerPage!=='analytics');
  $('#ownerPayments').classList.toggle('hidden',ownerPage!=='payments');
  $('#ownerCabinet').classList.toggle('hidden',ownerPage!=='cabinet');
  if(ownerPage==='analytics'){renderOwnerAnalytics();return}
  if(ownerPage==='payments'){renderOwnerPayments();return}
  if(ownerPage==='cabinet'){renderOwnerCabinet();return}
  const shown=visibleDispatchers();
  $('#dispatcherGrid').innerHTML=shown.length?shown.map(dispatcherCard).join(''):'<article class="card empty-card">Админы ещё не добавлены. Нажмите «Добавить админа», чтобы выдать первый доступ.</article>';
  document.querySelectorAll('.dispatcher-open').forEach(b=>b.onclick=()=>openAdminCabinet(b.dataset.id));
  document.querySelectorAll('.dispatcher-edit').forEach(b=>b.onclick=()=>openDispatcher(b.dataset.id));
  document.querySelectorAll('.dispatcher-details').forEach(b=>b.onclick=()=>showAdminDetails(b.dataset.id));
}

function renderOwnerCabinet(){
  const canManage=currentDirector?.can_manage_directors===true;
  $('#ownerCabinet').innerHTML=`<div class="cabinet-head"><div><h2>Директора</h2><p>${canManage?'Главный директор может выдавать и закрывать доступ.':'У вас есть доступ к кабинету без права выдавать доступ другим директорам.'}</p></div>${canManage?'<button class="primary" id="addDirectorAccess">+ Добавить директора</button>':''}</div><div class="director-grid">${directors.map(d=>`<article class="director-card ${d.active?'':'disabled'}"><div class="director-card-main"><span class="avatar">${(d.name||'?').trim()[0]||'?'}</span><div><small>${d.can_manage_directors?'Главный директор':'Директор'}</small><h3>${d.name||'Директор'}</h3><p>${d.email}</p>${canManage?`<em>Пароль: ${d.password||'—'}</em>`:''}</div></div><span class="count ${d.active?'ok':'off'}">${d.active?'доступ открыт':'доступ закрыт'}</span>${canManage&&!d.can_manage_directors?`<button class="secondary director-edit" data-id="${d.id}">Изменить</button>`:''}</article>`).join('')}</div>`;
  const addBtn=$('#addDirectorAccess');if(addBtn)addBtn.onclick=()=>openDirectorDialog('');
  document.querySelectorAll('.director-edit').forEach(b=>b.onclick=()=>openDirectorDialog(b.dataset.id));
}

async function renderOwnerPayments(){
  const shown=visibleDispatchers();
  $('#ownerPayments').innerHTML=`<div class="payment-mode-grid">${shown.map(d=>{const s=subscriptionSettings(d.payment_settings),mode=paymentMode(d.payment_mode),free=mode==='free_park',adminBalance=mode==='admin_balance';return `<article class="payment-admin-card"><div><small>Админ</small><h3>${d.name||'Админ'}</h3><p>${d.login||'—'} · ${d.phone||'—'}</p></div><div><small>Тип оплаты</small><b>${PAYMENT_MODES[mode]}</b><span>${free?'Оплата не требуется':adminBalance?'Баланс ведет админ':PAYMENT_PROVIDERS[d.payment_provider]||PAYMENT_PROVIDERS.none}</span></div><div><small>Условия</small>${free?'<strong>Бесплатно для водителей</strong>':adminBalance?`<strong>ЭПЛ: ${s.epPrice.toLocaleString('ru-RU')} ₽</strong>`:`<strong>15 дней: ${s.price15.toLocaleString('ru-RU')} ₽</strong><strong>30 дней: ${s.price30.toLocaleString('ru-RU')} ₽</strong>`}</div><button class="secondary dispatcher-edit" data-id="${d.id}">Настроить платежи</button></article>`}).join('')||'<article class="card empty-card">Админов пока нет</article>'}</div><div class="balance-director-panel"><h2>Балансы водителей</h2><p>Здесь пополняются водители у админов, где выбран тип оплаты «Пополнить через админку».</p><div class="balance-director-list">Загружаем водителей...</div></div>`;
  document.querySelectorAll('#ownerPayments .dispatcher-edit').forEach(b=>b.onclick=()=>openDispatcher(b.dataset.id));
  try{await loadPaymentDriverProfiles()}catch(error){console.warn('Не удалось загрузить водителей для балансов',error);$('.balance-director-list').innerHTML='<div class="empty-card">Не удалось загрузить водителей из Supabase</div>';return}
  const admins=shown.filter(d=>paymentMode(d.payment_mode)==='admin_balance');
  $('.balance-director-list').innerHTML=admins.length?admins.map(admin=>{const s=subscriptionSettings(admin.payment_settings),rows=paymentDriverProfiles.filter(row=>(payloadAdminId(row.payload)||'demo')===admin.id);return `<section class="balance-admin-group"><div class="balance-admin-title"><div><small>Админ</small><b>${admin.name||admin.login}</b></div><span>Цена ЭПЛ: ${money(s.epPrice)}</span></div>${rows.length?rows.map(row=>{const h=profileHistory(row)[0];return `<article class="balance-driver-row"><div><b>${profileName(row)}</b><span>${profilePhone(row)}</span></div><strong>${money(profileBalance(row))}</strong><div class="balance-mini-history">${h?`${h.reason||'Операция'} · ${money(h.amount)}`:'Истории пока нет'}</div><div class="balance-row-actions"><button class="balance-plus director-balance-change" data-profile="${row.id}" data-dir="plus">+</button><button class="balance-minus director-balance-change" data-profile="${row.id}" data-dir="minus">−</button></div></article>`}).join(''):'<div class="empty-card">У этого админа пока нет водителей в общей базе</div>'}</section>`}).join(''):'<div class="empty-card">Включите тип оплаты «Пополнить через админку» у нужного админа.</div>';
  document.querySelectorAll('.director-balance-change').forEach(b=>b.onclick=()=>adjustProfileBalance(b.dataset.profile,b.dataset.dir));
}

function dispatcherCard(d){
  const count=driverCounts[d.id]??adminDrivers(d.id).length;
  const mode=PAYMENT_MODES[paymentMode(d.payment_mode)];
  const provider=PAYMENT_PROVIDERS[d.payment_provider]||PAYMENT_PROVIDERS.none;
  const s=subscriptionSettings(d.payment_settings);
  const free=paymentMode(d.payment_mode)==='free_park';
  const privateAdmin=boolValue(d.hidden_from_directors);
  return `<article class="card dispatcher-card ${d.active?'':'disabled'} ${privateAdmin?'private-admin':''}">
    <div class="dispatcher-main">
      <div class="identity"><span class="avatar">${(d.name||'?').trim()[0]||'?'}</span><button class="admin-name dispatcher-details" data-id="${d.id}" type="button"><b>${d.name}</b><small>${d.phone||'телефон не указан'}</small></button></div>
      <div class="access"><div><small>Почта</small><b>${d.email||d.login||'—'}</b><span>${d.login||''}</span></div><div><small>Водителей</small><b>${count}</b></div><div><small>Подписка</small><b>${mode}</b><span>${free?'без оплаты':paymentMode(d.payment_mode)==='admin_balance'?`ЭПЛ ${s.epPrice} ₽ через баланс`:`${provider} · 15д ${s.price15} ₽ / 30д ${s.price30} ₽`}</span></div></div>
      <span class="count ${d.active?'ok':'off'}">${d.active?'доступ открыт':'доступ закрыт'}</span>
      ${privateAdmin?'<span class="private-badge">Скрыт от директоров</span>':''}
    </div>
    <div class="dispatcher-actions">
      <button class="secondary dispatcher-open" data-id="${d.id}" ${d.active?'':'disabled'}>Открыть кабинет</button>
      <button class="secondary dispatcher-edit" data-id="${d.id}">Изменить</button>
    </div>
  </article>`;
}

function showAdminDetails(id){
  const d=dispatchers.find(x=>x.id===id);if(!d)return;
  let details=document.querySelector('#adminDetailsDialog');
  if(!details){details=document.createElement('dialog');details.id='adminDetailsDialog';details.className='admin-details-dialog';document.body.append(details)}
  const s=subscriptionSettings(d.payment_settings);
  const free=paymentMode(d.payment_mode)==='free_park';
  details.innerHTML=`<button class="close" type="button">×</button><h2>${d.name||'Админ'}</h2><p class="muted">Данные админского доступа</p><div class="admin-details-grid"><div><small>Почта</small><b>${d.email||d.login||'—'}</b></div><div><small>Телефон</small><b>${d.phone||'—'}</b></div><div><small>Логин</small><b>${d.login||'—'}</b></div><div><small>Оплата</small><b>${PAYMENT_MODES[paymentMode(d.payment_mode)]}</b></div><div><small>Провайдер</small><b>${free||paymentMode(d.payment_mode)==='admin_balance'?'—':PAYMENT_PROVIDERS[d.payment_provider]||'—'}</b></div><div><small>Цена</small><b>${free?'Бесплатно':paymentMode(d.payment_mode)==='admin_balance'?`ЭПЛ: ${s.epPrice} ₽`:`15 дней: ${s.price15} ₽ / 30 дней: ${s.price30} ₽`}</b></div></div>`;
  details.querySelector('.close').onclick=()=>details.close();
  details.showModal();
}
function waybillAdminId(w){const opened=String(w.openedBy||w.opened_by||''),direct=(opened.match(/(?:^|;)admin=([^;]+)/)||[])[1];if(direct)return decodeURIComponent(direct);const encoded=(opened.match(/(?:^|;)data=([^;]+)/)||[])[1];if(encoded){try{return JSON.parse(decodeURIComponent(encoded)).adminId||''}catch{}}return ''}
async function remoteWaybillsForAnalytics(){try{const response=await fetch(`${API_BASE}/waybills?select=*&order=date.desc`,{headers:API_HEADERS,cache:'no-store'});if(!response.ok)throw new Error(await response.text());return await response.json()}catch(error){console.warn('Не удалось загрузить отчеты из Supabase',error);return []}}
async function renderOwnerAnalytics(selectedFrom='',selectedTo=''){
  const today=new Date().toISOString().slice(0,10),first=today.slice(0,8)+'01';
  const initialFrom=selectedFrom||sessionStorage.getItem('ownerReportFrom')||first,initialTo=selectedTo||sessionStorage.getItem('ownerReportTo')||today;
  $('#ownerAnalytics').innerHTML=`<div class="analytics-filter"><label>С даты<input id="ownerReportFrom" type="date" value="${initialFrom}"></label><label>До даты<input id="ownerReportTo" type="date" value="${initialTo}"></label><button class="secondary" id="ownerReportApply">Показать</button></div><div class="analytics-loading">Загружаем отчеты из Supabase...</div>`;
  const all=await remoteWaybillsForAnalytics(),from=initialFrom,to=initialTo;
  sessionStorage.setItem('ownerReportFrom',from);sessionStorage.setItem('ownerReportTo',to);
  const filtered=all.filter(w=>{const d=waybillDate(w);return (!from||d>=from)&&(!to||d<=to)});
  const rows=visibleDispatchers().map(d=>{const drivers=driverCounts[d.id]??adminDrivers(d.id).length,wb=filtered.filter(w=>waybillAdminId(w)===d.id||(d.id==='demo'&&!waybillAdminId(w))),open=wb.filter(w=>w.status==='Открыто').length,closed=wb.filter(w=>w.status==='Закрыто').length;return {d,drivers,waybills:wb.length,open,closed}});
  const totals=rows.reduce((a,r)=>({drivers:a.drivers+r.drivers,waybills:a.waybills+r.waybills,open:a.open+r.open,closed:a.closed+r.closed}),{drivers:0,waybills:0,open:0,closed:0});
  $('#ownerAnalytics').innerHTML=`<div class="analytics-filter"><label>С даты<input id="ownerReportFrom" type="date" value="${from}"></label><label>До даты<input id="ownerReportTo" type="date" value="${to}"></label><button class="secondary" id="ownerReportApply">Показать</button></div><div class="analytics-grid"><article><small>Админов</small><b>${rows.length}</b></article><article><small>Водителей</small><b>${totals.drivers}</b></article><article><small>Открытые ЭПЛ</small><b>${totals.open}</b></article><article><small>Завершённые</small><b>${totals.closed}</b></article></div><table class="analytics-table"><thead><tr><th>Админ</th><th>Водители</th><th>Открытые</th><th>Завершённые</th><th>Всего ЭПЛ</th><th>Оплата</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${r.d.name}</b><span>${r.d.login}</span></td><td>${r.drivers}</td><td>${r.open}</td><td>${r.closed}</td><td>${r.waybills}</td><td>${PAYMENT_MODES[paymentMode(r.d.payment_mode)]||'—'}</td></tr>`).join('')||'<tr><td colspan="6">Данных пока нет</td></tr>'}</tbody></table>`;
  $('#ownerReportApply').onclick=()=>renderOwnerAnalytics($('#ownerReportFrom').value,$('#ownerReportTo').value);
  $('#ownerReportFrom').onchange=$('#ownerReportTo').onchange=()=>renderOwnerAnalytics($('#ownerReportFrom').value,$('#ownerReportTo').value);
}

function openAdminCabinet(id){
  const d=dispatchers.find(x=>x.id===id);
  if(!d)return;
  if(!d.active){alert('Сначала откройте доступ этому админу');return}
  sessionStorage.setItem('taxichiDispatcherSession',d.id);
  window.open(`${ADMIN_SITE_URL}?admin=${encodeURIComponent(d.id)}`,'_blank');
}

const dialog=$('#dispatcherDialog'),form=$('#dispatcherForm');
$('#addDispatcher').onclick=()=>openDispatcher('');
$('.close').onclick=$('.cancel').onclick=()=>dialog.close();
form.phone.oninput=()=>{form.phone.value=formatRuPhone(form.phone.value)};
$('.dispatcher-dialog-delete').onclick=async()=>{if(editingDispatcherId&&await deleteDispatcher(editingDispatcherId))dialog.close()};
$('.dispatcher-dialog-toggle').onclick=async()=>{if(editingDispatcherId){await toggleDispatcher(editingDispatcherId);const d=dispatchers.find(x=>x.id===editingDispatcherId);if(d)fillDispatcherForm(d)}};

const directorDialog=$('#directorDialog'),directorForm=$('#directorForm');
$('.director-close').onclick=$('.director-cancel').onclick=()=>directorDialog.close();
$('.director-dialog-delete').onclick=async()=>{if(editingDirectorId&&await deleteDirector(editingDirectorId))directorDialog.close()};

function canManageDirectors(){
  return currentDirector?.can_manage_directors===true;
}

function openDirectorDialog(id=''){
  if(!canManageDirectors()){alert('Только главный директор может выдавать доступ другим директорам');return}
  editingDirectorId=id;
  directorForm.reset();
  directorForm.elements.active.value='true';
  $('#directorDialogTitle').textContent=id?'Изменить директора':'Новый директор';
  const d=directors.find(x=>x.id===id);
  if(d){
    directorForm.elements.id.value=d.id;
    directorForm.elements.name.value=d.name||'';
    directorForm.elements.email.value=d.email||'';
    directorForm.elements.password.value=d.password||'';
    directorForm.elements.active.value=String(d.active!==false);
  }
  $('.director-dialog-delete').style.display=id?'inline-flex':'none';
  directorDialog.showModal();
}

directorForm.onsubmit=async e=>{
  e.preventDefault();
  if(!canManageDirectors()){alert('Нет права изменять директоров');return}
  const d=Object.fromEntries(new FormData(e.target));
  d.email=String(d.email||'').trim().toLowerCase();
  d.active=d.active==='true';
  d.can_manage_directors=false;
  if(d.email===OWNER_EMAIL){alert('Главного директора нельзя изменить здесь');return}
  if(directors.some(x=>x.email===d.email&&x.id!==editingDirectorId)){alert('Такой директор уже добавлен');return}
  if(editingDirectorId){
    d.id=editingDirectorId;
    directors=directors.map(x=>x.id===editingDirectorId?normalizeDirector(d,0):x);
  }else{
    d.id='director-'+Date.now();
    directors.push(normalizeDirector(d,0));
  }
  saveDirectorsLocal();
  await saveDirectorRemote(d).catch(error=>console.warn('Не удалось сохранить директора в Supabase',error));
  directorDialog.close();
  renderOwnerCabinet();
};

async function deleteDirector(id){
  if(!canManageDirectors()){alert('Нет права удалять директоров');return false}
  const d=directors.find(x=>x.id===id);
  if(!d)return false;
  if(d.can_manage_directors||d.email===OWNER_EMAIL){alert('Главного директора нельзя удалить');return false}
  if(!confirm(`Удалить доступ директора ${d.name}?\n\nОн больше не сможет войти в директорский кабинет.`))return false;
  directors=directors.filter(x=>x.id!==id);
  saveDirectorsLocal();
  await deleteDirectorRemote(id).catch(error=>console.warn('Не удалось удалить директора из Supabase',error));
  renderOwnerCabinet();
  return true;
}

function openDispatcher(id=''){
  editingDispatcherId=id;
  form.reset();
  form.elements.active.value='true';
  if(form.elements.hidden_from_directors)form.elements.hidden_from_directors.checked=false;
  const hiddenField=form.elements.hidden_from_directors?.closest('label');
  if(hiddenField)hiddenField.classList.toggle('hidden',!directorIsMain());
  form.elements.payment_mode.value='free_park';
  form.elements.payment_provider.value='none';
  form.elements.price15.value='0';
  form.elements.price30.value='0';
  form.elements.epPrice.value='0';
  const dataSection=form.querySelector('.admin-data-box'),paymentSection=form.querySelector('.payment-settings-box');
  if(dataSection&&paymentSection)form.insertBefore(ownerPage==='payments'?paymentSection:dataSection,ownerPage==='payments'?dataSection:paymentSection);
  $('#dispatcherDialogTitle').textContent=id?'Изменить админа':'Новый админ';
  const d=dispatchers.find(x=>x.id===id);
  if(d)fillDispatcherForm(d);
  const editOnly=!!id;
  $('.dispatcher-dialog-delete').style.display=editOnly?'inline-flex':'none';
  $('.dispatcher-dialog-toggle').style.display=editOnly?'inline-flex':'none';
  dialog.showModal();
  updatePaymentFields();
}

function fillDispatcherForm(d){
  Object.entries(d).forEach(([k,v])=>{if(form.elements[k]&&k!=='hidden_from_directors')form.elements[k].value=String(v)});
  if(form.elements.hidden_from_directors)form.elements.hidden_from_directors.checked=boolValue(d.hidden_from_directors);
  const settings=subscriptionSettings(d.payment_settings||{});
  if(form.elements.payment_mode)form.elements.payment_mode.value=paymentMode(d.payment_mode);
  ['shopId','secretKey','account','successUrl','failUrl','price15','price30','epPrice'].forEach(k=>{if(form.elements[k])form.elements[k].value=settings[k]||''});
  $('.dispatcher-dialog-toggle').textContent=d.active?'Закрыть доступ':'Открыть доступ';
  updatePaymentFields();
}

function updatePaymentFields(){
  const mode=form.elements.payment_mode?.value;
  const paid=mode==='subscription';
  const adminBalance=mode==='admin_balance';
  form.querySelectorAll('.paid-only').forEach(el=>el.classList.toggle('hidden',!paid));
  form.querySelectorAll('.admin-balance-only').forEach(el=>el.classList.toggle('hidden',!adminBalance));
  if((!paid)&&form.elements.payment_provider)form.elements.payment_provider.value='none';
}
form.elements.payment_mode.onchange=updatePaymentFields;

form.onsubmit=async e=>{
  e.preventDefault();
  const d=Object.fromEntries(new FormData(e.target));
  d.phone=formatRuPhone(d.phone);
  d.active=d.active==='true';
  d.hidden_from_directors=directorIsMain()&&!!form.elements.hidden_from_directors?.checked;
  d.payment_mode=paymentMode(d.payment_mode);
  d.payment_settings=subscriptionSettings({shopId:d.shopId||'',secretKey:d.secretKey||'',account:d.account||'',successUrl:d.successUrl||'',failUrl:d.failUrl||'',price15:d.price15,price30:d.price30,epPrice:d.epPrice});
  ['shopId','secretKey','account','successUrl','failUrl','price15','price30','epPrice'].forEach(k=>delete d[k]);
  if(d.payment_mode==='free_park'||d.payment_mode==='admin_balance')d.payment_provider='none';
  if(dispatchers.some(x=>x.login===d.login&&x.id!==editingDispatcherId)){alert('Такой логин уже используется');return}
  if(editingDispatcherId){
    d.id=editingDispatcherId;
    dispatchers=dispatchers.map(x=>x.id===editingDispatcherId?d:x);
  }else{
    d.id='disp-'+Date.now();
    dispatchers.push(d);
  }
  try{
    await saveDispatcherRemote(d);
  }catch(error){
    console.warn('Не удалось сохранить админа в Supabase',error);
    alert('Не удалось сохранить админа в общей базе. Проверьте интернет и попробуйте ещё раз.');
    return;
  }
  saveDispatchersLocal();
  dialog.close();
  render();
};

async function toggleDispatcher(id){
  const d=dispatchers.find(x=>x.id===id);
  if(!d)return;
  d.active=!d.active;
  saveDispatchersLocal();
  await saveDispatcherRemote(d).catch(error=>console.warn('Не удалось обновить доступ в Supabase',error));
  render();
}

async function deleteDispatcher(id){
  const d=dispatchers.find(x=>x.id===id);
  if(!d)return false;
  if(!confirm(`Удалить доступ админа ${d.name}?\n\nВодители не удалятся, удалится только вход в админский кабинет.`))return false;
  dispatchers=dispatchers.filter(x=>x.id!==id);
  saveDispatchersLocal();
  await deleteDispatcherRemote(id).catch(error=>console.warn('Не удалось удалить админа из Supabase',error));
  render();
  return true;
}
loadDispatchersRemote();
loadDirectorsRemote().then(ensureMainDirector).then(()=>{
  if(currentDirector){
    const fresh=directors.find(d=>d.email===currentDirector.email);
    if(fresh)currentDirector=fresh;
    render();
  }
});
