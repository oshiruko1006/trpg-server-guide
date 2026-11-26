/* Read only one encrypted guide; existing public scenario data is quoted on request. */
// Old encrypted attachments have no MIME metadata. Inspect bytes, not filenames.
function plGuideImageType(bytes){
  const has=(offset,values)=>values.every((v,i)=>bytes[offset+i]===v);
  const ascii=(offset,s)=>has(offset,Array.from(s,c=>c.charCodeAt(0)));
  if(has(0,[137,80,78,71,13,10,26,10]))return 'image/png';
  if(has(0,[255,216,255]))return 'image/jpeg';
  if(ascii(0,'GIF87a')||ascii(0,'GIF89a'))return 'image/gif';
  if(ascii(0,'RIFF')&&ascii(8,'WEBP'))return 'image/webp';
  if(ascii(4,'ftyp')&&(ascii(8,'avif')||ascii(8,'avis')))return 'image/avif';
  if(ascii(0,'BM')&&bytes.length>=14)return 'image/bmp';
  if(has(0,[0,0,1,0])&&bytes.length>=6)return 'image/x-icon';
  // Never navigate to active formats (SVG, HTML, etc.) under the site's origin.
  return '';
}
function plGuideAttachment(file,C){
  const bytes=file.data?C.un64(file.data):new Uint8Array(0);
  return {bytes,type:plGuideImageType(bytes)};
}
function plGuideOpenAttachment(file,attachment){
  const {bytes,type}=attachment;
  const url=URL.createObjectURL(new Blob([bytes],{type:type||'application/octet-stream'}));
  const a=document.createElement('a');
  a.href=url;
  a.download=String(file.name||'資料').replace(/[\/\\]/g,'_');
  try{document.body.appendChild(a);a.click();}
  finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),300000);}
}

window.VanillaPLGuideRender=async function(envelope,{el,esc,markdown,sectionCard,trailerUrls,scenarioGalleryHtml,bindScenarioGallery}){
  const C=window.VanillaPLCrypto;
  try{
    const e=C.envelope(envelope),key=location.hash.slice(1),id=location.pathname.match(/^\/pl-guide\/([A-Za-z0-9_-]{22})\/?$/)?.[1];
    if(id!==e.id||!C.validKey(key))throw Error();
    const d=window.VanillaPLLayout.normalize(await C.open(e,key));let s=null;
    if(d.scenario){try{const res=await fetch('/data/scenarios.json');if(res.ok)s=(await res.json()).find(x=>x.slug===d.scenario)||null;}catch(_){}}
    const title=d.title||s?.title||'PL向け案内',q=d.quote||{};
    document.title=title+'｜PL GUIDE';
    const block=(heading,body,always_open=false,heading_en='')=>String(body||'').trim()?sectionCard({heading,body,always_open,heading_en}):'';
    const trailers=s&&q.trailer?trailerUrls(s):[];
    const imageHtml=scenarioGalleryHtml(trailers,s?.title||title);
    const facts=s&&q.info?[['システム',s.system],['人数',s.players_display||s.players],['時間',s.duration_display||s.duration],['対象年齢',s.age_rating],['舞台',s.setting],['シナリオ形式',s.scenario_type],['ロスト率',s.loss_rate==='その他'?s.loss_rate_custom:s.loss_rate],['新規・継続',s.character_policy],['秘匿HO',s.secret_ho],['PvP',s.pvp]]:[];
    const skills=s&&q.skills?[['必須技能',s.required_skills],['推奨技能',s.recommended_skills],['準推奨技能',s.optional_skills]]:[];
    const files=d.files;
    const attachments=files.map(f=>{try{return plGuideAttachment(f,C);}catch(_){return null;}});
    // Preview URLs exist only in this browser after successful decryption.
    const imageUrls=attachments.map(a=>a?.type?URL.createObjectURL(new Blob([a.bytes],{type:a.type})):'');
    window.addEventListener('pagehide',event=>{if(!event.persisted)imageUrls.filter(Boolean).forEach(url=>URL.revokeObjectURL(url));});
    const fileHtml=(tabId,blockId='')=>{
      const list=files.map((f,i)=>({f,i})).filter(({f})=>f.tab_id===tabId&&f.block_id===blockId);
      return list.length?'<div class="pl-guide-files">'+list.map(({f,i})=>{
        const name=esc(f.name||'資料');
        return imageUrls[i]?'<figure class="pl-guide-attachment-image"><button type="button" data-pl-image="'+i+'" aria-label="'+name+'を拡大"><img src="'+esc(imageUrls[i])+'" alt="'+name+'" loading="lazy" decoding="async"><span class="pl-guide-image-zoom" aria-hidden="true">＋</span></button><figcaption>'+name+'</figcaption></figure>':'<button type="button" data-pl-file="'+i+'">'+name+'　↓</button>';
      }).join('')+'</div>':'';
    };
    const blockWithFiles=(b,tabId)=>{
      const media=fileHtml(tabId,b.id),body=String(b.body||'');
      if(!body.trim()&&!media)return '';
      if(!media)return block(b.heading||'補足',body,!!b.always_open,b.heading_en||'');
      const heading='<span class="accordion-title-group">'+(b.heading_en?'<span class="accordion-title-en">'+esc(b.heading_en)+'</span>':'')+'<span class="accordion-title-ja">'+esc(b.heading||'補足資料')+'</span></span>';
      const inner='<div class="rich-text">'+markdown(body)+'</div>'+media;
      if(b.always_open)return '<section class="rule-card site-accordion rule-card-always"><h2 class="rule-static-heading"><span class="accordion-mark" aria-hidden="true"></span>'+heading+'</h2><div class="rule-static-body">'+inner+'</div></section>';
      return '<section class="rule-card site-accordion"><h2><button type="button" class="accordion-trigger" aria-expanded="false"><span class="accordion-mark" aria-hidden="true"></span>'+heading+'<span class="accordion-chevron" aria-hidden="true">⌄</span></button></h2><div class="accordion-panel"><div class="accordion-panel-inner">'+inner+'</div></div></section>';
    };
    const infoHtml=(tabId)=>{
      const rows=d.quote_tabs.info===tabId?facts:[];
      const skillRows=d.quote_tabs.skills===tabId?skills:[];
      if(![...rows,...skillRows].some(([,v])=>String(v||'').trim()))return '';
      return '<section class="rule-card pl-guide-info"><h2 class="pl-guide-heading"><small>SCENARIO INFORMATION</small>'+(rows.length?'シナリオ情報':'技能情報')+'</h2><dl class="scenario-facts">'+rows.filter(([,v])=>String(v||'').trim()).map(([k,v])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd></div>').join('')+skillRows.filter(([,v])=>String(v||'').trim()).map(([k,v])=>'<div class="pl-guide-skill"><dt>'+esc(k)+'</dt><dd class="rich-text">'+markdown(v)+'</dd></div>').join('')+'</dl></section>';
    };
    const ho=s&&q.ho&&Array.isArray(s.handouts)?s.handouts.map(x=>block(x.title||'HO',x.body,false)).join(''):'';
    const tabContent=t=>{
      const media=fileHtml(t.id);
      const content=infoHtml(t.id)
        +(d.quote_tabs.overview===t.id?block('概要',s&&q.overview?s.overview:'',false,'OVERVIEW'):'')
        +(d.quote_tabs.story===t.id?block('あらすじ',s&&q.story?s.summary:'',false,'STORY'):'')
        +(d.quote_tabs.ho===t.id?ho:'')
        +t.blocks.map(b=>blockWithFiles(b,t.id)).join('')
        +(media?'<section class="rule-card pl-guide-info"><h2 class="pl-guide-heading"><small>FILES</small>配布資料</h2>'+media+'</section>':'');
      return content||'<p class="pl-guide-empty">掲載情報はありません。</p>';
    };
    const tabs=d.tabs;
    const nav=tabs.length>1?'<div class="pl-guide-tablist" role="tablist" aria-label="案内メニュー">'+tabs.map((t,i)=>'<button type="button" role="tab" id="pl-tab-'+i+'" aria-controls="pl-panel-'+i+'" aria-selected="'+(i===0)+'" tabindex="'+(i===0?0:-1)+'" data-pl-tab="'+i+'">'+esc(t.title||'ご案内')+'</button>').join('')+'</div>':'';
    const panels=tabs.map((t,i)=>'<div class="pl-guide-tabpanel" id="pl-panel-'+i+'" '+(tabs.length>1?'role="tabpanel" aria-labelledby="pl-tab-'+i+'" ':'')+'data-pl-panel="'+i+'"'+(i?' hidden':'')+'>'+tabContent(t)+'</div>').join('');
    el.innerHTML='<div class="pl-guide-title"><small>PLAYER’S GUIDE</small><h1>'+esc(title)+'</h1><p>'+esc(d.subtitle||'')+'</p></div>'+imageHtml+nav+panels;
    const buttons=[...el.querySelectorAll('[data-pl-tab]')],panelEls=[...el.querySelectorAll('[data-pl-panel]')];
    let active=0;
    const activate=(i,focus=false)=>{
      if(i<0||i>=buttons.length)return;
      const changed=i!==active;active=i;
      buttons.forEach((b,j)=>{b.setAttribute('aria-selected',String(i===j));b.tabIndex=i===j?0:-1;});
      panelEls.forEach((p,j)=>{p.hidden=i!==j;if(i===j&&changed){p.classList.remove('pl-guide-tab-enter');void p.offsetWidth;p.classList.add('pl-guide-tab-enter');}});
      if(focus)buttons[i].focus({preventScroll:true});
      if(changed)buttons[i].scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'});
    };
    buttons.forEach((b,i)=>{
      b.addEventListener('click',()=>activate(i));
      b.addEventListener('keydown',event=>{let next;if(event.key==='ArrowRight')next=(i+1)%buttons.length;else if(event.key==='ArrowLeft')next=(i+buttons.length-1)%buttons.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=buttons.length-1;else return;event.preventDefault();activate(next,true);});
    });
    bindScenarioGallery(el,trailers,s?.title||title);
    if(imageUrls.some(Boolean)){
      const dialog=document.createElement('dialog');
      dialog.className='pl-guide-image-dialog';
      dialog.setAttribute('aria-label','添付画像の拡大表示');
      dialog.innerHTML='<div class="pl-guide-image-dialog-bar"><span class="pl-guide-image-dialog-name"></span><button type="button" class="pl-guide-image-close" aria-label="閉じる">×</button></div><div class="pl-guide-image-dialog-body"><img alt=""></div>';
      document.body.appendChild(dialog);
      const large=dialog.querySelector('img'),caption=dialog.querySelector('.pl-guide-image-dialog-name'),closeButton=dialog.querySelector('.pl-guide-image-close');
      let opener=null;
      const close=()=>{if(dialog.open)dialog.close();};
      closeButton.addEventListener('click',close);
      dialog.addEventListener('click',event=>{if(event.target===dialog||event.target===dialog.querySelector('.pl-guide-image-dialog-body'))close();});
      dialog.addEventListener('close',()=>{document.body.classList.remove('pl-guide-image-open');large.removeAttribute('src');opener?.focus({preventScroll:true});opener=null;});
      el.querySelectorAll('[data-pl-image]').forEach(btn=>btn.addEventListener('click',()=>{
        const i=Number(btn.dataset.plImage),url=imageUrls[i];if(!url||dialog.open)return;
        opener=btn;large.src=url;large.alt=files[i].name||'添付画像';caption.textContent=large.alt;
        dialog.showModal();document.body.classList.add('pl-guide-image-open');closeButton.focus({preventScroll:true});
      }));
    }
    el.querySelectorAll('[data-pl-file]').forEach(btn=>btn.addEventListener('click',()=>{try{const i=Number(btn.dataset.plFile);if(!attachments[i])throw Error();plGuideOpenAttachment(files[i],attachments[i]);}catch(_){alert('ファイルを開けませんでした。');}}));
  }catch(_){el.textContent='限定ページを表示できません。共有URLの末尾まで正しくコピーされているか、公開状況を確認してください。';}
};
