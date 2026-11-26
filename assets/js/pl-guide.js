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
  if(type){
    a.target='_blank';
    a.rel='noopener noreferrer';
  }else{
    a.download=String(file.name||'資料').replace(/[\/\\]/g,'_');
  }
  try{document.body.appendChild(a);a.click();}
  finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),300000);}
}

window.VanillaPLGuideRender=async function(envelope,{el,esc,markdown,sectionCard,trailerUrls,scenarioGalleryHtml,bindScenarioGallery}){
  const C=window.VanillaPLCrypto;
  try{
    const e=C.envelope(envelope),key=location.hash.slice(1),id=location.pathname.match(/^\/pl-guide\/([A-Za-z0-9_-]{22})\/?$/)?.[1];
    if(id!==e.id||!C.validKey(key))throw Error();
    const d=await C.open(e,key);let s=null;
    if(d.scenario){try{const res=await fetch('/data/scenarios.json');if(res.ok)s=(await res.json()).find(x=>x.slug===d.scenario)||null;}catch(_){}}
    const title=d.title||s?.title||'PL向け案内',q=d.quote||{};
    document.title=title+'｜PL GUIDE';
    const block=(heading,body,always_open=false,heading_en='')=>String(body||'').trim()?sectionCard({heading,body,always_open,heading_en}):'';
    const trailers=s&&q.trailer?trailerUrls(s):[];
    const imageHtml=scenarioGalleryHtml(trailers,s?.title||title);
    const facts=s&&q.info?[['システム',s.system],['人数',s.players_display||s.players],['時間',s.duration_display||s.duration],['対象年齢',s.age_rating],['舞台',s.setting],['シナリオ形式',s.scenario_type],['ロスト率',s.loss_rate==='その他'?s.loss_rate_custom:s.loss_rate],['新規・継続',s.character_policy],['秘匿HO',s.secret_ho],['PvP',s.pvp]]:[];
    const skills=s&&q.skills?[['必須技能',s.required_skills],['推奨技能',s.recommended_skills],['準推奨技能',s.optional_skills]]:[];
    const infoHtml=[...facts,...skills].some(([,v])=>String(v||'').trim())?'<section class="rule-card pl-guide-info"><h2 class="pl-guide-heading"><small>SCENARIO INFORMATION</small>シナリオ情報</h2><dl class="scenario-facts">'+facts.filter(([,v])=>String(v||'').trim()).map(([k,v])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd></div>').join('')+skills.filter(([,v])=>String(v||'').trim()).map(([k,v])=>'<div class="pl-guide-skill"><dt>'+esc(k)+'</dt><dd class="rich-text">'+markdown(v)+'</dd></div>').join('')+'</dl></section>':'';
    const ho=s&&q.ho&&Array.isArray(s.handouts)?s.handouts.map(x=>block(x.title||'HO',x.body,false)).join(''):'';
    const files=Array.isArray(d.files)?d.files:[];
    const attachments=files.map(f=>{try{return plGuideAttachment(f,C);}catch(_){return null;}});
    el.innerHTML='<div class="pl-guide-title"><small>PLAYER’S GUIDE</small><h1>'+esc(title)+'</h1><p>'+esc(d.subtitle||'')+'</p></div>'+imageHtml+infoHtml+block('概要',s&&q.overview?s.overview:'',false,'OVERVIEW')+block('あらすじ',s&&q.story?s.summary:'',false,'STORY')+block('参加にあたって',d.notice,false,'NOTICE')+block('キャラクター作成',d.character,false,'CHARACTER CREATION')+ho+block('公開HO・事前情報',d.handout,false,'HANDOUT')+(Array.isArray(d.sections)?d.sections.map(x=>block(x.heading||'補足',x.body,!!x.always_open,x.heading_en||'')).join(''):'')+(files.length?'<section class="rule-card pl-guide-info"><h2 class="pl-guide-heading"><small>FILES</small>配布資料</h2><div class="pl-guide-files">'+files.map((f,i)=>'<button type="button" data-pl-file="'+i+'">'+esc(f.name||'資料')+(attachments[i]?.type?'　↗':'　↓')+'</button>').join('')+'</div></section>':'');
    bindScenarioGallery(el,trailers,s?.title||title);
    el.querySelectorAll('[data-pl-file]').forEach(btn=>btn.addEventListener('click',()=>{try{const i=Number(btn.dataset.plFile);if(!attachments[i])throw Error();plGuideOpenAttachment(files[i],attachments[i]);}catch(_){alert('ファイルを開けませんでした。');}}));
  }catch(_){el.textContent='限定ページを表示できません。共有URLの末尾まで正しくコピーされているか、公開状況を確認してください。';}
};
