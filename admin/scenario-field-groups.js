/* Presentation-only field groups. Never move, unmount or edit Decap's native controls. */
(function(){
  'use strict';
  const groups=[
    {title:'プレイ人数',fields:['players','players_display','kpc_allowed'],switchLabel:'KPC可'},
    {title:'所要時間',fields:['duration','duration_display']},
    {title:'準備状況',fields:['preparation_status','kp_experienced'],switchLabel:'KP経験有'},
    {title:'シナリオ形式',fields:['scenario_type','scenario_type_note']},
    {title:'ロスト率',fields:['loss_rate','loss_rate_custom','loss_rate_note']},
    {title:'後遺症',fields:['aftereffects','aftereffects_custom','aftereffects_note']}
  ];
  const state=new WeakMap();
  let queued=false,lastRoute='';
  const active=new Set();
  const setText=(el,value)=>{if(el.textContent!==value)el.textContent=value;};
  function fieldName(label){return (label.htmlFor||'').replace(/-field-\d+$/,'');}
  function getControl(label){
    const bar=label.parentElement,control=bar?.parentElement;
    return control?.hasAttribute('aria-label')&&control.firstElementChild===bar?control:null;
  }
  function currentValue(control){
    const select=control.querySelector('select');
    if(select)return select.selectedOptions[0]?.textContent?.trim()||'';
    const selected=control.querySelector('[class*="-singleValue"]');
    return selected?.textContent?.trim()||'';
  }
  function hasError(control){
    const top=control.firstElementChild;
    return !!(top?.querySelector('ul li')||control.querySelector('[aria-invalid="true"]'));
  }
  function clear(group){
    group.button.remove();
    group.controls.forEach(c=>c.classList.remove('vanilla-field-group-lead','vanilla-field-group-folded','vanilla-field-group-member','vanilla-field-group-last'));
    state.delete(group.controls[0]);active.delete(group);
  }
  function update(group){
    const [lead,...rest]=group.controls;
    // A native validation error is always visible; opening doesn't affect stored values.
    if(group.controls.some(hasError))group.open=true;
    lead.classList.toggle('vanilla-field-group-folded',!group.open);
    rest.forEach(c=>c.classList.toggle('vanilla-field-group-folded',!group.open));
    group.button.setAttribute('aria-expanded',String(group.open));
    const value=currentValue(lead);
    const filled=rest.filter(c=>Array.from(c.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]),textarea')).some(i=>String(i.value||'').trim())).length;
    const enabled=group.switchLabel&&rest.some(c=>c.querySelector('[role="switch"][aria-checked="true"]'));
    const detail=[value,enabled?group.switchLabel:'',filled?'補足等 '+filled+'件':''].filter(Boolean).join(' ・ ');
    setText(group.summary,detail||'未設定');
    setText(group.arrow,group.open?'▴':'▾');
  }
  function attach(def,controls){
    const lead=controls[0],bar=lead.firstElementChild;
    let group=state.get(lead);
    if(group&&(group.controls.some((c,i)=>c!==controls[i])||!group.button.isConnected||group.button.parentElement!==bar)){
      const wasOpen=group.open;clear(group);group=null;
      // If Decap rerenders the topbar, preserve the user's current fold choice.
      return create(def,controls,wasOpen);
    }
    if(!group)return create(def,controls,false);
    update(group);
  }
  function create(def,controls,open){
    const lead=controls[0],bar=lead.firstElementChild;
    const button=document.createElement('button');
    button.type='button';button.className='vanilla-field-group-toggle';
    const title=document.createElement('span');title.className='vanilla-field-group-title';title.textContent=def.title;
    const summary=document.createElement('span');summary.className='vanilla-field-group-summary';
    const arrow=document.createElement('span');arrow.className='vanilla-field-group-arrow';arrow.setAttribute('aria-hidden','true');
    button.append(title,summary,arrow);
    const group={controls,button,summary,arrow,open,switchLabel:def.switchLabel};
    button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();group.open=!group.open;update(group);});
    bar.appendChild(button);
    lead.classList.add('vanilla-field-group-lead');
    controls.slice(1).forEach(c=>c.classList.add('vanilla-field-group-member'));
    controls[controls.length-1].classList.add('vanilla-field-group-last');
    state.set(lead,group);active.add(group);update(group);
  }
  function apply(){
    queued=false;
    const route=location.hash;
    if(route!==lastRoute){for(const group of [...active])clear(group);lastRoute=route;}
    // Only the scenario collection editor; never affect PL GUIDE or other collections.
    if(!/^#\/?collections\/scenarios(?:\/|$)/.test(route)){return;}
    const root=document.getElementById('nc-root');if(!root)return;
    const byParent=new Map();
    const wanted=new Set(groups.flatMap(g=>g.fields));
    for(const label of root.querySelectorAll('label[for]')){
      const name=fieldName(label);if(!wanted.has(name))continue;
      const control=getControl(label);if(!control)continue;
      const parent=control.parentElement;
      if(!byParent.has(parent))byParent.set(parent,new Map());
      byParent.get(parent).set(name,control);
    }
    const valid=new Set();
    for(const fields of byParent.values())for(const def of groups){
      const controls=def.fields.map(name=>fields.get(name));
      if(controls.some(c=>!c))continue;
      // Only group consecutive sibling controls in the scenario form.
      if(controls.some((c,i)=>i>0&&controls[i-1].nextElementSibling!==c))continue;
      valid.add(controls[0]);attach(def,controls);
    }
    for(const group of [...active])if(!valid.has(group.controls[0]))clear(group);
  }
  function schedule(){if(!queued){queued=true;requestAnimationFrame(apply);}}
  new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-invalid','aria-checked']});
  document.addEventListener('input',schedule,true);
  document.addEventListener('change',schedule,true);
  window.addEventListener('hashchange',schedule);
  schedule();
})();
