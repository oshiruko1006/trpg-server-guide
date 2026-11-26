/* Synchronous theme resolution avoids the light flash on initial load. */
(function(){
  'use strict';
  const root=document.documentElement,key='vanilla-site-theme',system=window.matchMedia('(prefers-color-scheme: dark)');
  const valid=v=>['system','light','dark'].includes(v)?v:'system';
  let choice='system';
  try{choice=valid(localStorage.getItem(key));}catch(_){}
  let toggle,menu,options=[];
  const paths={
    system:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    light:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
    dark:'<path d="M20.9 13.4A9 9 0 0 1 10.6 3.1 9 9 0 1 0 20.9 13.4Z"/>'
  };
  const names={system:'端末に合わせる',light:'ライト',dark:'ダーク'};
  const svg=mode=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+paths[mode]+'</svg>';
  function apply(){
    const effective=choice==='system'?(system.matches?'dark':'light'):choice;
    root.dataset.theme=effective;
    if(toggle){
      toggle.innerHTML=svg(effective);
      toggle.setAttribute('aria-label','表示モード：'+names[choice]+'（'+names[effective]+'表示）');
      toggle.title='表示モードを変更';
      options.forEach(b=>{const active=b.dataset.mode===choice;b.setAttribute('aria-pressed',String(active));b.querySelector('.theme-check').textContent=active?'✓':'';});
    }
  }
  function choose(value){choice=valid(value);try{if(choice==='system')localStorage.removeItem(key);else localStorage.setItem(key,choice);}catch(_){}apply();}
  apply();
  if(system.addEventListener)system.addEventListener('change',()=>{if(choice==='system')apply();});else system.addListener?.(()=>{if(choice==='system')apply();});
  window.addEventListener('storage',e=>{if(e.key===key||e.key===null){try{choice=valid(localStorage.getItem(key));}catch(_){choice='system';}apply();}});
  function mount(){
    const header=document.querySelector('body > header');
    let host=header;
    if(!host&&document.body.dataset.page==='pl-guide'){
      host=document.createElement('div');host.className='pl-theme-bar';
      document.body.insertBefore(host,document.body.firstChild);
    }
    if(!host)return;
    const wrap=document.createElement('div');wrap.className='theme-control';
    toggle=document.createElement('button');toggle.type='button';toggle.className='theme-toggle';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','site-theme-menu');
    menu=document.createElement('div');menu.id='site-theme-menu';menu.className='theme-menu';menu.hidden=true;menu.setAttribute('role','group');menu.setAttribute('aria-label','表示モード');
    options=Object.keys(names).map(mode=>{const b=document.createElement('button');b.type='button';b.className='theme-option';b.dataset.mode=mode;b.innerHTML=svg(mode)+'<span>'+names[mode]+'</span><span class="theme-check" aria-hidden="true"></span>';b.addEventListener('click',()=>{choose(mode);close(true);});menu.appendChild(b);return b;});
    const close=focus=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false');if(focus)toggle.focus({preventScroll:true});};
    toggle.addEventListener('click',()=>{if(!menu.hidden){close(false);return;}menu.hidden=false;toggle.setAttribute('aria-expanded','true');});
    document.addEventListener('click',e=>{if(!menu.hidden&&!wrap.contains(e.target))close(false);});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){e.preventDefault();close(true);}});
    wrap.appendChild(toggle);wrap.appendChild(menu);host.appendChild(wrap);apply();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
