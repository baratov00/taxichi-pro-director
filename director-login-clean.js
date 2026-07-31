(function(){
  const form=document.getElementById('ownerLoginForm');
  if(form){
    form.setAttribute('autocomplete','off');
    form.querySelectorAll('input').forEach(input=>{
      input.setAttribute('autocomplete','new-password');
      input.setAttribute('autocorrect','off');
      input.setAttribute('autocapitalize','none');
      input.setAttribute('spellcheck','false');
      input.setAttribute('data-lpignore','true');
      input.setAttribute('data-1p-ignore','true');
    });
  }
  const clearMainEmail=()=>{
    const input=document.querySelector('#ownerLoginForm input[name="email"]');
    const password=document.querySelector('#ownerLoginForm input[name="password"]');
    const value=String(input?.value||'').trim().toLowerCase();
    if(input&&(value==='baratov329@mail.ru'||value.includes('@mail.ru'))){
      input.value='';
      if(password)password.value='';
    }
  };
  clearMainEmail();
  [200,700,1500].forEach(ms=>setTimeout(clearMainEmail,ms));
})();
