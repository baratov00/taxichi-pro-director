(function(){
  function renderPaymentCard(d){
    const s=subscriptionSettings(d.payment_settings);
    const mode=paymentMode(d.payment_mode);
    const free=mode==='free_park';
    return `<article class="payment-admin-card"><div><small>Админ</small><h3>${d.name||'Админ'}</h3><p>${d.login||'—'} · ${d.phone||'—'}</p></div><div><small>Тип оплаты</small><b>${PAYMENT_MODES[mode]}</b><span>${free?'Оплата не требуется':'Баланс пополняет админ'}</span></div><div><small>Условия</small>${free?'<strong>Бесплатно для водителей</strong>':`<strong>ЭПЛ: ${s.epPrice.toLocaleString('ru-RU')} ₽</strong>`}</div><button class="secondary dispatcher-edit" data-id="${d.id}">Настроить платежи</button></article>`;
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
