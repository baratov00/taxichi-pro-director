const $=s=>document.querySelector(s);
const load=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const OWNER_EMAIL='baratov329@mail.ru';
const OWNER_DEFAULT_PASSWORD='razoqiy123';
const ADMIN_SITE_URL='https://admin.taxichi.pro/';
const SUPABASE_URL='https://qquvbedufztponyxneqa.supabase.co',SUPABASE_KEY='sb_publishable_8lZ9AfMvjZOx1Xz6JTlNFg_uKK0qjr8',API_BASE=SUPABASE_URL+'/rest/v1',API_HEADERS={apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Accept-Profile':'public','Content-Profile':'public'};
const DISPATCHERS_TABLE='taxichi_pro_dispatchers';
const DEFAULT_DISPATCHERS=[{id:'demo',name:'Иванова Мария',phone:'+7 999 999-77-42',login:'admin',password:'1234',active:true}];
const PAYMENT_MODES={
  own_account:'Прием платежа на нашу лицевой счет',
  admin_account:'Прием платежа к себе на лицевой счет',
  free_park:'Таксопарк бесплатно для водителей'
};
const PAYMENT_PROVIDERS={none:'Без платежного провайдера',robokassa:'Robokassa',yookassa:'ЮKassa'};
const normalizePaymentSettings=value=>{
  if(!value)return {};
  if(typeof value==='string'){try{return JSON.parse(value)}catch{return {}}}
  return value||{};
};
const normalizeDispatcher=(d,i)=>({id:d.id||`disp-${i+1}`,name:d.name||'Админ',email:d.email||'',phone:d.phone||'',login:d.login||'',password:d.password||'',active:d.active!==false,payment_mode:d.payment_mode||'own_account',payment_provider:d.payment_provider||'none',payment_settings:normalizePaymentSettings(d.payment_settings),balance:Number(d.balance||0),payment_history:Array.isArray(d.payment_history)?d.payment_history:normalizePaymentSettings(d.payment_history)?.items||[]});
let dispatchers=(load('taxichiProDispatchers',[])||[]).map(normalizeDispatcher);
if(!dispatchers.length){dispatchers=[...DEFAULT_DISPATCHERS];saveDispatchers()}
const adminStorageKey=(id,key)=>`taxichiProAdmin:${id}:${key}`;
const adminDrivers=id=>load(adminStorageKey(id,'taxichiProDrivers'),id==='demo'?load('taxichiProDrivers',[]):[]);
const adminWaybills=id=>load(adminStorageKey(id,'taxichiProWaybills'),id==='demo'?load('taxichiProWaybills',[]):[]);
let editingDispatcherId='',ownerPage='admins';

function saveDispatchersLocal(){localStorage.setItem('taxichiProDispatchers',JSON.stringify(dispatchers))}
function dispatcherPayload(d){return {id:d.id,name:d.name||'Админ',email:d.email||'',phone:d.phone||'',login:d.login||'',password:d.password||'',active:d.active!==false,payment_mode:d.payment_mode||'own_account',payment_provider:d.payment_provider||'none',payment_settings:d.payment_settings||{},balance:Number(d.balance||0),payment_history:d.payment_history||[],updated_at:new Date().toISOString()}}
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
function ownerAccount(){const saved=load('taxichiProOwnerAccount',null);return {email:OWNER_EMAIL,password:saved?.password||OWNER_DEFAULT_PASSWORD}}
function saveOwnerPassword(password){localStorage.setItem('taxichiProOwnerAccount',JSON.stringify({email:OWNER_EMAIL,password}))}
function formatRuPhone(raw){const rawDigits=String(raw||'').replace(/\D/g,''),digits=(rawDigits.startsWith('8')?'7'+rawDigits.slice(1):rawDigits.startsWith('7')?rawDigits:'7'+rawDigits).slice(0,11),n=digits.slice(1),a=n.slice(0,3),b=n.slice(3,6),c=n.slice(6,8),d=n.slice(8,10);return '+7'+(a?' '+a:'')+(b?' '+b:'')+(c?'-'+c:'')+(d?'-'+d:'')}
function enter(){sessionStorage.setItem('taxichiOwnerSession','yes');$('#ownerLogin').classList.add('hidden');$('#ownerApp').classList.remove('hidden');render()}

$('#ownerLoginForm').onsubmit=e=>{
  e.preventDefault();
  const d=Object.fromEntries(new FormData(e.target)),account=ownerAccount();
  if(String(d.email||'').trim().toLowerCase()===account.email&&d.password===account.password){
    $('#ownerError').textContent='';
    enter();
  }else $('#ownerError').textContent='Неверный логин или пароль';
};
if(sessionStorage.getItem('taxichiOwnerSession')==='yes')enter();
$('#ownerLogout').onclick=()=>{sessionStorage.removeItem('taxichiOwnerSession');$('#ownerApp').classList.add('hidden');$('#ownerLogin').classList.remove('hidden')};
document.querySelectorAll('[data-owner-page]').forEach(b=>b.onclick=()=>{ownerPage=b.dataset.ownerPage;render()});

const resetDialog=$('#ownerResetDialog'),resetForm=$('#ownerResetForm');
$('#forgotOwnerPassword').onclick=()=>{resetForm.reset();resetForm.elements.email.value=OWNER_EMAIL;$('#ownerResetError').textContent='';resetDialog.showModal()};
$('.reset-close').onclick=$('.reset-cancel').onclick=()=>resetDialog.close();
resetForm.onsubmit=e=>{
  e.preventDefault();
  const d=Object.fromEntries(new FormData(e.target));
  if(String(d.email||'').trim().toLowerCase()!==OWNER_EMAIL){$('#ownerResetError').textContent='Эта почта не привязана к директорскому кабинету';return}
  saveOwnerPassword(d.password);
  resetDialog.close();
  $('#ownerError').textContent='Пароль обновлен. Войдите с новым паролем.';
};

function render(){
  document.querySelectorAll('[data-owner-page]').forEach(b=>b.classList.toggle('active',b.dataset.ownerPage===ownerPage));
  $('#ownerTitle').textContent=ownerPage==='analytics'?'Аналитика':ownerPage==='payments'?'Платежи':'Админы';
  $('#ownerSubtitle').textContent=ownerPage==='analytics'?'Сводка по всем админским кабинетам':ownerPage==='payments'?'Типы приема платежей и баланс админов':'Доступы для админского кабинета';
  $('#addDispatcher').style.display=ownerPage==='admins'?'inline-flex':'none';
  $('#dispatcherGrid').classList.toggle('hidden',ownerPage!=='admins');
  $('#ownerAnalytics').classList.toggle('hidden',ownerPage!=='analytics');
  $('#ownerPayments').classList.toggle('hidden',ownerPage!=='payments');
  if(ownerPage==='analytics'){renderOwnerAnalytics();return}
  if(ownerPage==='payments'){renderOwnerPayments();return}
  $('#dispatcherGrid').innerHTML=dispatchers.length?dispatchers.map(dispatcherCard).join(''):'<article class="card empty-card">Админы ещё не добавлены. Нажмите «Добавить админа», чтобы выдать первый доступ.</article>';
  document.querySelectorAll('.dispatcher-open').forEach(b=>b.onclick=()=>openAdminCabinet(b.dataset.id));
  document.querySelectorAll('.dispatcher-edit').forEach(b=>b.onclick=()=>openDispatcher(b.dataset.id));
  document.querySelectorAll('.dispatcher-details').forEach(b=>b.onclick=()=>showAdminDetails(b.dataset.id));
}

function renderOwnerPayments(){
  $('#ownerPayments').innerHTML=`<div class="payment-mode-grid">${dispatchers.map(d=>`<article class="payment-admin-card"><div><small>Админ</small><h3>${d.name||'Админ'}</h3><p>${d.login||'—'} · ${d.phone||'—'}</p></div><div><small>Тип оплаты</small><b>${PAYMENT_MODES[d.payment_mode]||PAYMENT_MODES.own_account}</b><span>${PAYMENT_PROVIDERS[d.payment_provider]||PAYMENT_PROVIDERS.none}</span></div><div><small>Баланс</small><strong>${Number(d.balance||0).toLocaleString('ru-RU')} ₽</strong></div><button class="secondary dispatcher-edit" data-id="${d.id}">Настроить платежи</button></article>`).join('')||'<article class="card empty-card">Админов пока нет</article>'}</div>`;
  document.querySelectorAll('#ownerPayments .dispatcher-edit').forEach(b=>b.onclick=()=>openDispatcher(b.dataset.id));
}

function dispatcherCard(d){
  const count=adminDrivers(d.id).length;
  const mode=PAYMENT_MODES[d.payment_mode]||PAYMENT_MODES.own_account;
  const provider=PAYMENT_PROVIDERS[d.payment_provider]||PAYMENT_PROVIDERS.none;
  return `<article class="card dispatcher-card ${d.active?'':'disabled'}">
    <div class="dispatcher-main">
      <div class="identity"><span class="avatar">${(d.name||'?').trim()[0]||'?'}</span><button class="admin-name dispatcher-details" data-id="${d.id}" type="button"><b>${d.name}</b><small>${d.phone||'телефон не указан'}</small></button></div>
      <div class="access"><div><small>Логин</small><b>${d.login}</b></div><div><small>Водителей</small><b>${count}</b></div><div><small>Оплата</small><b>${mode}</b><span>${provider}</span></div></div>
      <span class="count ${d.active?'ok':'off'}">${d.active?'доступ открыт':'доступ закрыт'}</span>
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
  details.innerHTML=`<button class="close" type="button">×</button><h2>${d.name||'Админ'}</h2><p class="muted">Данные админского доступа</p><div class="admin-details-grid"><div><small>Почта</small><b>${d.email||d.login||'—'}</b></div><div><small>Телефон</small><b>${d.phone||'—'}</b></div><div><small>Логин</small><b>${d.login||'—'}</b></div><div><small>Оплата</small><b>${PAYMENT_MODES[d.payment_mode]||'—'}</b></div><div><small>Провайдер</small><b>${PAYMENT_PROVIDERS[d.payment_provider]||'—'}</b></div><div><small>Баланс</small><b>${Number(d.balance||0).toLocaleString('ru-RU')} ₽</b></div></div>`;
  details.querySelector('.close').onclick=()=>details.close();
  details.showModal();
}
function waybillAdminId(w){const opened=String(w.openedBy||w.opened_by||''),direct=(opened.match(/(?:^|;)admin=([^;]+)/)||[])[1];if(direct)return decodeURIComponent(direct);const encoded=(opened.match(/(?:^|;)data=([^;]+)/)||[])[1];if(encoded){try{return JSON.parse(decodeURIComponent(encoded)).adminId||''}catch{}}return ''}
async function remoteWaybillsForAnalytics(){try{const response=await fetch(`${API_BASE}/waybills?select=*&order=date.desc`,{headers:API_HEADERS,cache:'no-store'});if(!response.ok)throw new Error(await response.text());return await response.json()}catch(error){console.warn('Не удалось загрузить отчеты из Supabase',error);return []}}
async function renderOwnerAnalytics(){
  const today=new Date().toISOString().slice(0,10),first=today.slice(0,8)+'01';
  $('#ownerAnalytics').innerHTML=`<div class="analytics-filter"><label>С даты<input id="ownerReportFrom" type="date" value="${sessionStorage.getItem('ownerReportFrom')||first}"></label><label>До даты<input id="ownerReportTo" type="date" value="${sessionStorage.getItem('ownerReportTo')||today}"></label><button class="secondary" id="ownerReportApply">Показать</button></div><div class="analytics-loading">Загружаем отчеты из Supabase...</div>`;
  const all=await remoteWaybillsForAnalytics(),from=$('#ownerReportFrom')?.value||first,to=$('#ownerReportTo')?.value||today;
  sessionStorage.setItem('ownerReportFrom',from);sessionStorage.setItem('ownerReportTo',to);
  const filtered=all.filter(w=>(!from||String(w.date||'').slice(0,10)>=from)&&(!to||String(w.date||'').slice(0,10)<=to));
  const rows=dispatchers.map(d=>{const ds=adminDrivers(d.id),wb=filtered.filter(w=>waybillAdminId(w)===d.id||(d.id==='demo'&&!waybillAdminId(w))),open=wb.filter(w=>w.status==='Открыто').length,closed=wb.filter(w=>w.status==='Закрыто').length;return {d,drivers:ds.length,waybills:wb.length,open,closed}});
  const totals=rows.reduce((a,r)=>({drivers:a.drivers+r.drivers,waybills:a.waybills+r.waybills,open:a.open+r.open,closed:a.closed+r.closed}),{drivers:0,waybills:0,open:0,closed:0});
  $('#ownerAnalytics').innerHTML=`<div class="analytics-filter"><label>С даты<input id="ownerReportFrom" type="date" value="${from}"></label><label>До даты<input id="ownerReportTo" type="date" value="${to}"></label><button class="secondary" id="ownerReportApply">Показать</button></div><div class="analytics-grid"><article><small>Админов</small><b>${dispatchers.length}</b></article><article><small>Водителей</small><b>${totals.drivers}</b></article><article><small>Открытые ЭПЛ</small><b>${totals.open}</b></article><article><small>Завершённые</small><b>${totals.closed}</b></article></div><table class="analytics-table"><thead><tr><th>Админ</th><th>Водители</th><th>Открытые</th><th>Завершённые</th><th>Всего ЭПЛ</th><th>Оплата</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${r.d.name}</b><span>${r.d.login}</span></td><td>${r.drivers}</td><td>${r.open}</td><td>${r.closed}</td><td>${r.waybills}</td><td>${PAYMENT_MODES[r.d.payment_mode]||'—'}</td></tr>`).join('')||'<tr><td colspan="6">Данных пока нет</td></tr>'}</tbody></table>`;
  $('#ownerReportApply').onclick=()=>renderOwnerAnalytics();
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

function openDispatcher(id=''){
  editingDispatcherId=id;
  form.reset();
  form.elements.active.value='true';
  form.elements.payment_mode.value='own_account';
  form.elements.payment_provider.value='none';
  form.elements.balance.value='0';
  $('#dispatcherDialogTitle').textContent=id?'Изменить админа':'Новый админ';
  const d=dispatchers.find(x=>x.id===id);
  if(d)fillDispatcherForm(d);
  const editOnly=!!id;
  $('.dispatcher-dialog-delete').style.display=editOnly?'inline-flex':'none';
  $('.dispatcher-dialog-toggle').style.display=editOnly?'inline-flex':'none';
  dialog.showModal();
}

function fillDispatcherForm(d){
  Object.entries(d).forEach(([k,v])=>{if(form.elements[k])form.elements[k].value=String(v)});
  const settings=d.payment_settings||{};
  ['shopId','secretKey','account','successUrl','failUrl'].forEach(k=>{if(form.elements[k])form.elements[k].value=settings[k]||''});
  $('.dispatcher-dialog-toggle').textContent=d.active?'Закрыть доступ':'Открыть доступ';
}

form.onsubmit=async e=>{
  e.preventDefault();
  const d=Object.fromEntries(new FormData(e.target));
  d.phone=formatRuPhone(d.phone);
  d.active=d.active==='true';
  d.balance=Number(d.balance||0);
  d.payment_settings={shopId:d.shopId||'',secretKey:d.secretKey||'',account:d.account||'',successUrl:d.successUrl||'',failUrl:d.failUrl||''};
  ['shopId','secretKey','account','successUrl','failUrl'].forEach(k=>delete d[k]);
  if(d.payment_mode==='free_park'){d.payment_provider='none';d.balance=0}
  if(dispatchers.some(x=>x.login===d.login&&x.id!==editingDispatcherId)){alert('Такой логин уже используется');return}
  if(editingDispatcherId){
    d.id=editingDispatcherId;
    dispatchers=dispatchers.map(x=>x.id===editingDispatcherId?d:x);
  }else{
    d.id='disp-'+Date.now();
    dispatchers.push(d);
  }
  await saveDispatcherRemote(d).catch(error=>console.warn('Не удалось сохранить админа в Supabase',error));
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
