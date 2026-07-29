(function(){
  const clearMainEmail=()=>{
    const input=document.querySelector('#ownerLoginForm input[name="email"]');
    if(input&&String(input.value||'').trim().toLowerCase()==='baratov329@mail.ru')input.value='';
  };
  clearMainEmail();
  [200,700,1500].forEach(ms=>setTimeout(clearMainEmail,ms));
})();
