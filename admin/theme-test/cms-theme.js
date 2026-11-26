/* Adapt Decap 3's generated UI colors using CSSOM, without replacing CMS
   components, touching field data, changing the original styles, or filtering images. */
(function(){
  'use strict';
  const root=document.documentElement;
  const state=new WeakMap(), frames=new Set();
  const probe=document.createElement('span');
  const props=['color','background-color','border-top-color','border-right-color','border-bottom-color','border-left-color','outline-color','fill','stroke','caret-color','text-decoration-color'];
  const preserved=/^(transparent|currentcolor|inherit|initial|unset|revert|none|var\()/i;
  const toRGB=value=>{
    const v=value.trim();if(!v||preserved.test(v))return null;
    probe.style.color='';probe.style.color=v;if(!probe.style.color)return null;
    const m=probe.style.color.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/i);
    if(!m)return null;
    return [Number(m[1]),Number(m[2]),Number(m[3]),m[4]===undefined?1:Number(m[4])];
  };
  function adapt(value,prop){
    const c=toRGB(value);if(!c)return value;
    const [r,g,b,a]=c;if(a===0)return value;
    const light=(r*0.2126+g*0.7152+b*0.0722), max=Math.max(r,g,b), min=Math.min(r,g,b), sat=max-min;
    const red=r>g+25&&r>b+18, amber=r>b+30&&g>b+12&&!red, blue=b>r+20&&b>g+8, green=g>r+10&&g>b-5;
    const bg=prop==='background-color';
    const line=prop.includes('border')||prop==='outline-color';
    let color;
    if(bg){
      if(light<70)return value;
      if(red&&sat>35)color=light<145?'#774342':'#49343c';
      else if(amber&&sat>35)color='#493d24';
      else if((green||blue)&&sat>20)color=light<160?'#405448':'#35443a';
      else color=light>235?'#2e2c28':light>185?'#35342e':'#383630';
    }else if(line){
      color=red?'#b96e71':amber?'#887548':(green||blue)&&sat>28?'#648572':'#47483f';
    }else{
      if(light>210&&sat<25)return '#e5dfd4';
      color=red&&sat>35?'#f1a2ae':amber&&sat>35?'#efd49b':blue&&sat>35?'#a3cef2':green&&sat>35?'#b3dfca':light>145?'#bcb9aa':'#e5dfd4';
    }
    if(a>=.999)return color;
    const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
    return 'rgba('+rgb.join(',')+','+a+')';
  }
  // Preserve the CSS cascade by mirroring all relevant color declarations in
  // their original order, keeping media rules and !important flags intact.
  function scope(selector){
    const prefix='html[data-theme="dark"]';
    return selector.split(/,(?![^()]*\))/).map(part=>{
      const s=part.trim();
      if(!s)return '';
      if(/^:root\b/.test(s))return s.replace(/^:root/,prefix);
      if(/^html(?=[\s.#:\[>+~]|$)/i.test(s))return s.replace(/^html/i,prefix);
      return prefix+' '+s;
    }).filter(Boolean).join(',');
  }
  function mirror(rules){
    let result='';
    for(const rule of rules){
      if(rule.type===1&&rule.selectorText&&rule.style){
        if(rule.selectorText.includes('data-theme')||rule.selectorText.includes('theme-control')||rule.selectorText.includes('theme-toggle')||rule.selectorText.includes('theme-option')||rule.selectorText.includes('theme-menu')||rule.selectorText.includes('cms-theme-host'))continue;
        let decl='';
        for(const prop of props){
          const value=rule.style.getPropertyValue(prop);if(!value)continue;
          const priority=rule.style.getPropertyPriority(prop);
          decl+=prop+':'+adapt(value,prop)+(priority?' !important':'')+';';
        }
        if(decl)result+=scope(rule.selectorText)+'{'+decl+'}\n';
      }else if(rule.cssRules&&(rule.type===4||rule.type===12)){
        const nested=mirror(rule.cssRules);if(nested)result+=rule.cssText.slice(0,rule.cssText.indexOf('{'))+'{'+nested+'}\n';
      }
    }
    return result;
  }
  function update(doc){
    if(!doc||!doc.head)return;
    let s=state.get(doc);
    if(!s){
      const layer=doc.createElement('style');layer.id='cms-generated-dark-colors';doc.head.appendChild(layer);
      s={layer,last:''};state.set(doc,s);
    }
    if(doc!==document)doc.documentElement.dataset.theme=root.dataset.theme||'light';
    if(root.dataset.theme!=='dark')return;
    let css='';
    for(const sheet of doc.styleSheets){
      if(sheet.ownerNode===s.layer||sheet.ownerNode?.getAttribute('href')?.includes('/theme.css')||sheet.ownerNode?.getAttribute('href')?.includes('/cms-theme.css'))continue;
      try{css+=mirror(sheet.cssRules||[]);}catch(_){/* External stylesheets may be inaccessible. */}
    }
    if(css!==s.last){s.layer.textContent=css;s.last=css;}
    // Ensure custom widget CSS follows dynamically emitted rules.
    if(s.layer.nextSibling)doc.head.appendChild(s.layer);
  }
  let pending=false;
  function schedule(){
    if(pending)return;pending=true;
    requestAnimationFrame(()=>{pending=false;refresh();});
  }
  function refresh(){
    update(document);
    for(const frame of document.querySelectorAll('iframe')){
      if(!frames.has(frame)){frames.add(frame);frame.addEventListener('load',schedule);}
      try{
        const doc=frame.contentDocument;if(!doc||!doc.head)continue;
        if(!doc.getElementById('cms-preview-theme')){
          const link=doc.createElement('link');link.id='cms-preview-theme';link.rel='stylesheet';link.href='/admin/theme-test/cms-theme.css?v=1';doc.head.appendChild(link);
        }
        update(doc);
      }catch(_){/* Cross-origin preview is left unchanged. */}
    }
    for(const frame of frames)if(!frame.isConnected)frames.delete(frame);
  }
  new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['data-theme'],childList:true,subtree:true});
  // Emotion can add rules using insertRule without a DOM mutation.
  // Poll only while visible, and keep generated styles unchanged when identical.
  setInterval(()=>{if(!document.hidden&&root.dataset.theme==='dark')schedule();},900);
  document.addEventListener('visibilitychange',schedule);
  schedule();
})();
