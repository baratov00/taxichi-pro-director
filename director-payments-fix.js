(function(){
  function renderPaymentCard(d){
    const s=subscriptionSettings(d.payment_settings);
    const mode=paymentMode(d.payment_mode);
    const free=mode==='free_park';
    const paid=mode==='subscription';
    const hasCheckout=Boolean(s.paymentUrl15||s.paymentUrl30||s.checkoutUrl||s.paymentUrl);
    const status=free?'Оплата не требуется':paid?(hasCheckout?'Оплата по ссылке подключена':'Ссылка оплаты не указана'):'Баланс пополняет админ';
    const terms=free?'<strong>Бесплатно для водителей</strong>':paid?`<strong>${Number(s.price15||0).toLocaleString('ru-RU')} ₽ / 15 дн · ${Number(s.price30||0).toLocaleString('ru-RU')} ₽ / 30 дн</strong>`:`<strong>ЭПЛ: ${s.epPrice.toLocaleString('ru-RU')} ₽</strong>`;
    return `<article class="payment-admin-card"><div><small>Админ</small><h3>${d.name||'Админ'}</h3><p>${d.login||'—'} · ${d.phone||'—'}</p></div><div><small>Тип оплаты</small><b>${PAYMENT_MODES[mode]}</b><span>${status}</span></div><div><small>Условия</small>${terms}</div><button class="secondary dispatcher-edit" data-id="${d.id}">Настроить платежи</button></article>`;
  }

  window.renderOwnerPayments=async function(){
    const shown=visibleDispatchers();
    $('#ownerPayments').innerHTML=`<div class="payment-mode-grid">${shown.map(renderPaymentCard).join('')||'<article class="card empty-card">Админов пока нет</article>'}</div>`;
    document.querySelectorAll('#ownerPayments .dispatcher-edit').forEach(b=>b.onclick=()=>openDispatcher(b.dataset.id));
  };

  if(typeof ownerPage!=='undefined'&&ownerPage==='payments'){
    window.renderOwnerPayments();
  }
})();
