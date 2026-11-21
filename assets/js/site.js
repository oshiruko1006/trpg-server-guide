'use strict';
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const el = document.getElementById('content');
const page = document.body.dataset.page;
const urls = {home:'/data/home.json',character:'/data/character.json',request:'/data/request.json',scenario:'/data/scenarios.json',detail:'/data/scenarios.json'};

// Render a limited, HTML-escaped Markdown subset without allowing raw HTML or script URLs.
function inlineMd(value) {
  let s = esc(value);
  const links = [];
  s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => {
    const key = `@@LINK${links.length}@@`;
    links.push(`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`);
    return key;
  });
  s = s.replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>')
       .replace(/__([^_\n]+)__/g,'<strong>$1</strong>')
       .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g,'<em>$1</em>')
       .replace(/~~([^~\n]+)~~/g,'<del>$1</del>')
       .replace(/`([^`\n]+)`/g,'<code>$1</code>');
  links.forEach((link,i) => { s = s.replace(`@@LINK${i}@@`,link); });
  return s;
}
function markdown(value) {
  const lines = String(value ?? '').replace(/\r\n?/g,'\n').split('\n');
  let result = '', paragraph = [], list = [], listType = '';
  let boxTone = '', boxLines = [];
  const flushP = () => { if(paragraph.length){result += `<p>${paragraph.map(inlineMd).join('<br>')}</p>`; paragraph=[];} };
  const flushL = () => {if(list.length){result += `<${listType}>${list.map(x=>`<li>${inlineMd(x)}</li>`).join('')}</${listType}>`;list=[];listType='';}};
  for(const line of lines){
    if(boxTone){
      if(line.trim()===':::'){result += `<div class="text-callout text-callout-${boxTone}">${markdown(boxLines.join('\n'))}</div>`;boxTone='';boxLines=[];}
      else boxLines.push(line);
      continue;
    }
    const boxStart=line.trim().match(/^:::(mint|sand|rose)$/);
    if(boxStart){flushP();flushL();boxTone=boxStart[1];continue;}
    if(!line.trim()){flushP();flushL();result += '<div class="markdown-blank-line" style="height:1em" aria-hidden="true"></div>';continue;}
    const heading = line.match(/^\s{0,3}(#{1,4})\s+(.+)$/);
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    const number = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if(heading){flushP();flushL();const level = Math.min(heading[1].length+2,6);result+=`<h${level}>${inlineMd(heading[2])}</h${level}>`;}
    else if(bullet||number){flushP();const type=bullet?'ul':'ol';if(listType&&listType!==type)flushL();listType=type;list.push((bullet||number)[1]);}
    else {flushL();paragraph.push(line);}
  }
  if(boxTone){result += `<div class="text-callout text-callout-${boxTone}">${markdown(boxLines.join('\n'))}</div>`;}
  flushP();flushL();return result;
}
const textBlock = value => `<p class="preserve-lines">${esc(value)}</p>`;
const accordionEnglish = {'ダイスルール':'DICE RULES','成長ルール':'GROWTH RULES','KP依頼について':'KP REQUEST','注意事項':'IMPORTANT NOTES','依頼テンプレート':'REQUEST TEMPLATE','CS作成について':'CHARACTER CREATION','キャラクターシート作成':'CHARACTER CREATION'};
const accordionHeading = (title, english) => { const en = String(english || '').trim() || accordionEnglish[String(title || '').trim()] || ''; return `<span class="accordion-title-group">${en ? `<span class="accordion-title-en">${esc(en)}</span>` : ''}<span class="accordion-title-ja">${esc(title)}</span></span>`; };
const accordion = (title, body, extra='', english='') => `<section class="rule-card site-accordion ${extra}"><h2><button type="button" class="accordion-trigger" aria-expanded="false"><span class="accordion-mark" aria-hidden="true"></span>${accordionHeading(title, english)}<span class="accordion-chevron" aria-hidden="true">⌄</span></button></h2><div class="accordion-panel"><div class="accordion-panel-inner"><div class="rich-text">${markdown(body)}</div></div></div></section>`;
const sectionCard = section => {
  if (section.always_open === true || (section.always_open == null && section.display_mode === 'always')) {
    return `<section class="rule-card site-accordion rule-card-always"><h2 class="rule-static-heading"><span class="accordion-mark" aria-hidden="true"></span>${accordionHeading(section.heading, section.heading_en)}</h2><div class="rule-static-body"><div class="rich-text">${markdown(section.body)}</div></div></section>`;
  }
  return accordion(section.heading, section.body, '', section.heading_en);
};
document.addEventListener('click', event => {
  const button = event.target.closest('.accordion-trigger');
  if(!button) return;
  const card=button.closest('.site-accordion');
  const open=button.getAttribute('aria-expanded')!=='true';
  button.setAttribute('aria-expanded', String(open));
  card.classList.toggle('is-open',open);
});
const tagAliases = {'戦闘あり':'戦闘有','謎解き':'謎解き有','PvP可能':'PvP'};
const lossTagMap = {'低':['低ロス'],'低〜中':['低ロス','中ロス'],'中':['中ロス'],'中〜高':['中ロス','高ロス'],'高':['高ロス']};
const derivedTags = s => [
  ...(lossTagMap[s.loss_rate] || []),
  ...(['クローズド','シティ','半クローズド'].includes(s.scenario_type) ? [s.scenario_type] : []),
  ...(s.character_policy==='新規限定' ? ['新規限定'] : ['継続限定','どちらも可'].includes(s.character_policy) ? ['継続可'] : []),
  ...(['あり','一部あり'].includes(s.secret_ho) ? ['秘匿'] : []),
  ...(['あり','可能性あり'].includes(s.pvp) ? ['PvP'] : [])
];
const managedTags = new Set(['低ロス','中ロス','高ロス','クローズド','シティ','半クローズド','新規限定','継続可','秘匿','PvP','PvP有','PvP可能']);
const allTags = s => {
  const manual=[...(Array.isArray(s.tags)?s.tags:[]),...(Array.isArray(s.custom_tags)?s.custom_tags:[])]
    .map(t=>typeof t==='string'?t:t?.tag).filter(Boolean).map(t=>tagAliases[t]||t);
  // Legacy tags are retained only if the corresponding structured field is absent.
  const filtered=manual.filter(t=>{
    if(['低ロス','中ロス','高ロス'].includes(t)) return !s.loss_rate;
    if(['クローズド','シティ','半クローズド'].includes(t)) return !s.scenario_type;
    if(['新規限定','継続可'].includes(t)) return !s.character_policy;
    if(t==='秘匿') return !s.secret_ho;
    if(['PvP','PvP有'].includes(t)) return !s.pvp;
    return true;
  });
  return [...new Set([...filtered,...derivedTags(s)])];
};
const tagsHtml = tags => (Array.isArray(tags)?tags:[]).map(t=>`<span class="tag">${esc(typeof t==='string'?t:t?.tag)}</span>`).join(' ');
const info = s => [s.system,s.players_display||s.players,s.duration_display||s.duration,s.age_rating].filter(Boolean).map(esc).join(' ・ ');
const lossMatches = (s, selected) => { if(!selected)return true; const value=s.loss_rate||({'低ロス':'低','中ロス':'中','高ロス':'高'}[allTags(s).find(t=>['低ロス','中ロス','高ロス'].includes(t))]||''); return value===selected || (value==='低〜中'&&['低','中'].includes(selected)) || (value==='中〜高'&&['中','高'].includes(selected)); };
const displayLoss = s => s.loss_rate==='その他' ? (s.loss_rate_custom||'その他') : (s.loss_rate||'');
const scenarioTags = s => allTags(s);
// Only accept local image paths or secure remote URLs; never interpolate arbitrary schemes.
const imageUrl = value => {
  const v = String(value ?? '').trim();
  if (/^\/(?!\/)[^<>"'\s]*$/u.test(v) || /^https:\/\/[^<>"'\s]+$/iu.test(v)) return v;
  return '';
};
const trailerUrls = s => {
  const raw = Array.isArray(s.trailers) ? s.trailers : (s.trailer ? [s.trailer] : []);
  return raw.map(x => imageUrl(typeof x === 'string' ? x : x?.image)).filter(Boolean);
};
const trailerThumb = (s, cls='') => {
  const src = trailerUrls(s)[0];
  return src ? `<div class="scenario-cover ${cls}"><img src="${esc(src)}" alt="${esc(s.title)}のトレーラー" loading="lazy"></div>`
    : `<div class="scenario-cover scenario-cover-empty ${cls}" aria-hidden="true"><span>NO TRAILER</span></div>`;
};
const externalLinks = s => (Array.isArray(s.external_links)?s.external_links:[]).filter(x=>x && /^https:\/\/[^\s<>"\']+$/i.test(String(x.url||''))).map(x=>({label:String(x.label||'配布ページ'),url:String(x.url)}));
const externalLinksHtml = (s, cls='') => {const links=externalLinks(s);return links.length?`<div class="external-links ${cls}">${links.map(x=>`<a class="external-link" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.label)} <span aria-hidden="true">↗</span></a>`).join('')}</div>`:'';};
const validStatuses = ['所持・未読','読了済','準備完了'];
const statusBadge = s => validStatuses.includes(s.preparation_status) ? `<span class="preparation-badge" data-status="${esc(s.preparation_status)}">${esc(s.preparation_status)}</span>` : '';
const scenarioCard = (s, view) => `<article class="scenario scenario-entry scenario-${view}"><a class="scenario-entry-link" href="/scenario/${encodeURIComponent(s.slug)}/"><div class="scenario-cover-wrap">${trailerThumb(s)}${s.kp_experienced===true?'<span class="kp-experience-badge">✓ KP経験有</span>':''}</div><div class="scenario-entry-body"><div class="scenario-title-row"><h2>${esc(s.title)}</h2>${statusBadge(s)}</div><p class="muted">${info(s)}</p><div class="scenario-tags">${tagsHtml(scenarioTags(s))}</div>${view==='list'?`<p class="scenario-excerpt">${esc(String(s.summary||'').replace(/[#*_`~\[\]]/g,'').slice(0,115))}</p>`:''}</div></a>${externalLinksHtml(s,'scenario-card-links')}</article>`;

fetch(urls[page]).then(r=>{if(!r.ok)throw Error('load');return r.json();}).then(d=>{
  if(page==='home'){
    const sections = d.sections || (d.rules?[{heading:'ルール',body:d.rules}]:[]);
    el.innerHTML = `<div class="rule-list">${sections.map(sectionCard).join('')}</div>`;
  }
  if(page==='character'){
    const systems = d.systems || [];
    const systemTabLabel = name => ({'CoC6':'CoC6版','CoC7':'CoC7版'}[String(name || '').trim()] || String(name || ''));
    el.innerHTML = `<h1>${esc(d.title)}</h1><div class="switcher" role="group" aria-label="システム切り替え">${systems.map((s,i)=>`<button type="button" class="system-tab" data-index="${i}" aria-pressed="${i===0}">${esc(systemTabLabel(s.name))}</button>`).join('')}</div><div id="system-content"></div>`;
    const display = i => {
      const s=systems[i];if(!s)return;
      const sections=s.sections || (s.rules?[{heading:'基本ルール',body:s.rules}]:[]);
      document.getElementById('system-content').innerHTML = `<div class="rule-list">${sections.map(sectionCard).join('')}</div>`;
      document.querySelectorAll('.system-tab').forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));
    };
    document.querySelectorAll('.system-tab').forEach(b=>b.addEventListener('click',()=>display(Number(b.dataset.index))));
    display(0);
  }
  if(page==='request'){
    const statuses={open:'受付中',consult:'要相談',closed:'受付停止'};
    const about=d.kp_about??[String(d.rules||'').split(/^### 注意事項\s*$/m)[0].trim(),d.steps?'### 依頼手順\n'+d.steps:''].filter(Boolean).join('\n\n');
    const notices=d.notices??(String(d.rules||'').split(/^### 注意事項\s*$/m)[1]||'').trim();
    const requestBlock=(title,body)=>String(body||'').trim()?accordion(title,body,'request-accordion'):'';
    const extras=Array.isArray(d.extra_sections)?d.extra_sections:[];
    const attachmentUrl = value => {const v=String(value||'').trim();return (/^\/(?!\/)[^<>"'\s]*$/u.test(v)||/^https:\/\/[^<>"'\s]+$/i.test(v))?v:'';};
    const extraBlock = x => {const files=Array.isArray(x.attachments)?x.attachments:[];const media=files.map(f=>{const url=attachmentUrl(typeof f==='string'?f:f?.file);if(!url)return '';const label=String((typeof f==='object'&&f?.label)||decodeURIComponent(url.split('/').pop()||'添付ファイル'));const image=/\.(?:png|jpe?g|gif|webp|avif)(?:\?.*)?$/i.test(url);return image?`<figure class="request-attachment-image"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer"><img src="${esc(url)}" alt="${esc(label)}" loading="lazy"></a><figcaption>${esc(label)}</figcaption></figure>`:`<a class="request-attachment-file" href="${esc(url)}" target="_blank" rel="noopener noreferrer">📎 ${esc(label)} ↗</a>`;}).filter(Boolean).join('');return (String(x.body||'').trim()||media)?`<section class="rule-card site-accordion request-accordion"><h2><button type="button" class="accordion-trigger" aria-expanded="false"><span class="accordion-mark" aria-hidden="true"></span>${accordionHeading(x.heading||'補足資料', x.heading_en)}<span class="accordion-chevron" aria-hidden="true">⌄</span></button></h2><div class="accordion-panel"><div class="accordion-panel-inner"><div class="rich-text">${markdown(x.body||'')}</div>${media?`<div class="request-attachments">${media}</div>`:''}</div></div></section>`:'';};
    el.innerHTML=`<h1>${esc(d.title)}</h1><section><h2>KP受付状況</h2><span class="tag">${esc(statuses[d.status]||'未設定')}</span>${textBlock(d.status_message)}</section>${requestBlock('KP依頼について',about)}${requestBlock('注意事項',notices)}<section class="rule-card site-accordion request-accordion"><h2><button type="button" class="accordion-trigger" aria-expanded="false"><span class="accordion-mark" aria-hidden="true"></span>${accordionHeading('依頼テンプレート')}<span class="accordion-chevron" aria-hidden="true">⌄</span></button></h2><div class="accordion-panel"><div class="accordion-panel-inner"><pre id="template">${esc(d.template)}</pre><button id="copy" type="button">コピーする</button></div></div></section>${extras.map(extraBlock).join('')}${/^https?:\/\//.test(d.discord_url||'')&&d.status!=='closed'?`<section><a href="${esc(d.discord_url)}" target="_blank" rel="noopener noreferrer">Discordで連絡する</a></section>`:''}`;
    document.getElementById('copy').addEventListener('click',()=>navigator.clipboard.writeText(d.template||'').then(()=>alert('コピーしました')).catch(()=>alert('コピーできませんでした')));
  }
  if(page==='detail'){
    const s=d.find(x=>x.slug===document.body.dataset.slug);
    if(!s){el.textContent='シナリオが見つかりません。';return;}
    const extras=Array.isArray(s.extra_sections)?s.extra_sections:[];
    const images = trailerUrls(s);
    const gallery = images.length ? `<div class="scenario-gallery-viewer"><button class="trailer-open scenario-main-trailer" type="button" data-index="0" aria-label="トレーラーを拡大"><img src="${esc(images[0])}" alt="${esc(s.title)}のトレーラー"></button>${images.length>1?`<div class="scenario-gallery-controls"><button type="button" class="gallery-prev" aria-label="前のトレーラー">‹</button><span class="gallery-count">1 / ${images.length}</span><button type="button" class="gallery-next" aria-label="次のトレーラー">›</button></div><div class="scenario-gallery-thumbs">${images.map((src,i)=>`<button type="button" data-gallery-index="${i}" aria-label="トレーラー${i+1}を表示" aria-pressed="${i===0}"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join('')}</div>`:''}</div>` : '';
    const headingEn={
      'シナリオ概要':'SCENARIO INFORMATION','推奨技能':'RECOMMENDED SKILLS',
      '準推奨技能':'OPTIONAL SKILLS','あらすじ':'STORY','ハンドアウト':'HANDOUTS',
      '概要・補足':'OVERVIEW','注意事項':'IMPORTANT NOTES'
    };
    const detailHeading=(heading)=>`<h2 class="scenario-section-heading"><span class="scenario-heading-mark" aria-hidden="true"></span><span class="scenario-heading-copy"><small>${esc(headingEn[heading]||'SCENARIO NOTES')}</small><span>${esc(heading)}</span></span></h2>`;
    const block = (heading,body) => String(body||'').trim()?`<section class="scenario-detail-block">${detailHeading(heading)}<div class="rich-text">${markdown(body)}</div></section>`:'';
    const compactInfo=[['SYSTEM',s.system],['人数',s.players_display||s.players],['時間',s.duration_display||s.duration],['対象年齢',s.age_rating]].filter(([,v])=>String(v||'').trim());
    const infoBar=`<dl class="scenario-summary-bar">${compactInfo.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
    const aftereffectValue=s.aftereffects==='その他' ? (s.aftereffects_custom||'その他') : (s.aftereffects||'');
    const aftereffectDisplay=aftereffectValue ? aftereffectValue+(s.aftereffects_note ? `（${s.aftereffects_note}）` : '') : '';
    const entries=[['舞台',s.setting],['シナリオ形式',[s.scenario_type,s.scenario_type_note].filter(Boolean).join('：')],['ロスト率',[displayLoss(s),s.loss_rate_note].filter(Boolean).join('（')+(s.loss_rate_note?'）':'')],['後遺症',aftereffectDisplay],['新規・継続',s.character_policy],['秘匿HO',s.secret_ho],['PvP',s.pvp]];
    const overview=entries.some(([,value])=>String(value||'').trim())?`<section class="scenario-detail-block">${detailHeading('シナリオ概要')}<dl class="scenario-facts">${entries.filter(([,v])=>String(v||'').trim()).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>`:'';
    const handouts=Array.isArray(s.handouts)?s.handouts:[];
    const hoHtml=handouts.some(h=>h.title||h.body)?`<section class="scenario-detail-block">${detailHeading('ハンドアウト')}<div class="scenario-handouts">${handouts.filter(h=>h.title||h.body).map(h=>`<article class="scenario-ho"><h3>${esc(h.title||'HO')}</h3><div class="rich-text">${markdown(h.body||'')}</div></article>`).join('')}</div></section>`:'';
    el.innerHTML=`<a href="/scenario/">← SCENARIO一覧へ</a><div class="scenario-detail-head"><div class="scenario-eyebrow-row"><span class="scenario-eyebrow">SCENARIO</span><div class="scenario-detail-status">${statusBadge(s)}${s.kp_experienced===true?'<span class="kp-detail-badge">✓ KP経験有</span>':''}</div></div><h1>${esc(s.title)}</h1>${infoBar}<div class="scenario-tags">${tagsHtml(scenarioTags(s))}</div></div>${gallery}${externalLinksHtml(s,'scenario-detail-links')}${overview}${block('推奨技能',s.recommended_skills)}${block('準推奨技能',s.optional_skills)}${block('あらすじ',s.summary)}${hoHtml}${block('概要・補足',s.overview)}${block('注意事項',s.cautions)}${extras.map(x=>block(x.heading||'',x.body)).join('')}`;
    if(images.length>1){let current=0;const main=el.querySelector('.scenario-main-trailer'),count=el.querySelector('.gallery-count'),thumbs=[...el.querySelectorAll('[data-gallery-index]')];const change=i=>{current=(i+images.length)%images.length;main.querySelector('img').src=images[current];main.dataset.index=String(current);count.textContent=`${current+1} / ${images.length}`;thumbs.forEach((b,j)=>b.setAttribute('aria-pressed',String(j===current)));};el.querySelector('.gallery-prev').addEventListener('click',()=>change(current-1));el.querySelector('.gallery-next').addEventListener('click',()=>change(current+1));thumbs.forEach(b=>b.addEventListener('click',()=>change(Number(b.dataset.galleryIndex))));}
    if(images.length){
      const overlay=document.createElement('div');overlay.className='trailer-lightbox';overlay.hidden=true;
      overlay.innerHTML='<div class="lightbox-top"><span class="lightbox-counter"></span><button type="button" class="lightbox-close" aria-label="閉じる">×</button></div><button type="button" class="lightbox-prev" aria-label="前の画像">‹</button><img class="lightbox-image" alt="拡大トレーラー"><button type="button" class="lightbox-next" aria-label="次の画像">›</button>';
      document.body.appendChild(overlay);
      let active=0,previousFocus=null;
      const show=i=>{active=(i+images.length)%images.length;overlay.querySelector('.lightbox-image').src=images[active];overlay.querySelector('.lightbox-image').alt=`${s.title}のトレーラー ${active+1}`;overlay.querySelector('.lightbox-counter').textContent=`${active+1} / ${images.length}`;};
      const close=()=>{overlay.hidden=true;document.body.classList.remove('lightbox-active');document.removeEventListener('keydown',onKey);previousFocus?.focus();};
      const onKey=e=>{if(e.key==='Escape')close();if(e.key==='ArrowLeft')show(active-1);if(e.key==='ArrowRight')show(active+1);if(e.key==='Tab'){e.preventDefault();overlay.querySelector('.lightbox-close').focus();}};
      el.querySelectorAll('.trailer-open').forEach(b=>b.addEventListener('click',()=>{previousFocus=b;show(Number(b.dataset.index));overlay.hidden=false;document.body.classList.add('lightbox-active');overlay.querySelector('.lightbox-close').focus();document.addEventListener('keydown',onKey);}));
      overlay.querySelector('.lightbox-close').addEventListener('click',close);
      overlay.querySelector('.lightbox-prev').addEventListener('click',()=>show(active-1));
      overlay.querySelector('.lightbox-next').addEventListener('click',()=>show(active+1));
      overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    }
  }
  if(page==='scenario'){
    const options=(key)=>[...new Set(d.map(s=>s[key]).filter(Boolean))];
    const select=(id,label,values)=>`<label class="filter-label">${label}<select id="${id}"><option value="">すべて</option>${values.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></label>`;
    const availableTags=[...new Set(d.flatMap(s=>allTags(s)))].sort((a,b)=>a.localeCompare(b,'ja'));
    el.innerHTML=`<h1>回せるシナリオ</h1><div class="scenario-filters"><div class="scenario-keyword-wrap"><label class="filter-label" for="query">キーワード<input id="query" placeholder="タイトル・読み仮名・タグで検索" aria-label="シナリオ検索" autocomplete="off"></label><div id="tag-panel" class="tag-panel" hidden><div class="tag-panel-heading"><strong>タグを選択（AND検索）</strong><button type="button" id="clear-tags">選択解除</button></div><div class="tag-choices">${availableTags.map((tag,i)=>`<button type="button" class="tag-choice" data-tag-index="${i}" aria-pressed="false">${esc(tag)}</button>`).join('')||'<span>登録済みタグはありません</span>'}</div></div></div><button type="button" id="mobile-filter-toggle" class="mobile-filter-toggle" aria-expanded="false" aria-controls="advanced-filters">絞り込み条件を表示 ▾</button><div id="advanced-filters" class="advanced-filters">${select('players','プレイ人数',['フリー','タイマン','1PL','2PL','3PL','4PL','5PL以上'])}${select('duration','プレイ時間',['短編','中編','長編','超長編'])}${select('loss_rate','ロスト率',['低','中','高','不明','特殊','その他'])}${select('system','システム',['CoC6版','CoC7版'])}${select('age_rating','対象年齢',['全年齢','R-15','R-18'])}${select('preparation_status','準備状況',validStatuses)}${select('kp_experienced','KP経験',['KP経験有'])}</div></div><div class="scenario-toolbar"><span id="result-count" aria-live="polite"></span><div class="scenario-view-toggle" role="group" aria-label="表示形式"><button type="button" data-view="card" aria-pressed="true">▦ カード</button><button type="button" data-view="list" aria-pressed="false">☷ リスト</button></div></div><div id="results" class="scenario-results view-card"></div>`;
    const selectedTags=new Set();
    const panel=document.getElementById('tag-panel'),query=document.getElementById('query');
    query.addEventListener('focus',()=>{panel.hidden=false;});
    document.querySelectorAll('.tag-choice').forEach(b=>b.addEventListener('click',()=>{const tag=availableTags[Number(b.dataset.tagIndex)];if(selectedTags.has(tag))selectedTags.delete(tag);else selectedTags.add(tag);b.setAttribute('aria-pressed',String(selectedTags.has(tag)));render();}));
    document.getElementById('clear-tags').addEventListener('click',()=>{selectedTags.clear();document.querySelectorAll('.tag-choice').forEach(b=>b.setAttribute('aria-pressed','false'));render();});
    document.addEventListener('pointerdown',e=>{if(!e.target.closest('.scenario-keyword-wrap'))panel.hidden=true;});
    let view = 'card';
    try { if(localStorage.getItem('vanilla-scenario-view')==='list') view='list'; } catch (_) {}
    const render=()=>{
      const q=document.getElementById('query').value.trim().toLocaleLowerCase();
      const players=document.getElementById('players').value,duration=document.getElementById('duration').value,lossRate=document.getElementById('loss_rate').value,system=document.getElementById('system').value,ageRating=document.getElementById('age_rating').value,preparationStatus=document.getElementById('preparation_status').value,kpExperienced=document.getElementById('kp_experienced').value;
      const items=d.filter(s=>{const tags=allTags(s);return [s.title,s.reading,s.system,s.summary,s.overview,s.cautions,s.players_display,s.duration_display,s.setting,s.recommended_skills,s.optional_skills,displayLoss(s),...tags].join(' ').toLocaleLowerCase().includes(q)&&[...selectedTags].every(t=>tags.includes(t))&&(!players||s.players===players)&&(!duration||s.duration===duration)&&lossMatches(s,lossRate)&&(!system||s.system===system)&&(!ageRating||(s.age_rating||'全年齢')===ageRating)&&(!preparationStatus||s.preparation_status===preparationStatus)&&(!kpExperienced||s.kp_experienced===true);});
      items.sort((a,b)=>(a.reading||a.title).localeCompare(b.reading||b.title,'ja'));
      const results=document.getElementById('results');
      results.className=`scenario-results view-${view}`;
      results.innerHTML=items.length?items.map(s=>scenarioCard(s,view)).join(''):'<p class="scenario-empty">該当するシナリオはありません。</p>';
      document.getElementById('result-count').textContent=`${items.length} 件`;
      document.querySelectorAll('.scenario-view-toggle button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
    };
    const filterToggle=document.getElementById('mobile-filter-toggle');
    filterToggle.textContent='詳細検索を開く ▾';
    filterToggle.addEventListener('click',()=>{
      const open=filterToggle.getAttribute('aria-expanded')!=='true';
      filterToggle.setAttribute('aria-expanded',String(open));
      filterToggle.textContent=open?'詳細検索を閉じる ▴':'詳細検索を開く ▾';
    });
    document.querySelectorAll('.scenario-filters input,.scenario-filters select').forEach(x=>x.addEventListener('input',render));
    document.querySelectorAll('.scenario-view-toggle button').forEach(b=>b.addEventListener('click',()=>{
      view=b.dataset.view;
      try { localStorage.setItem('vanilla-scenario-view',view); } catch (_) {}
      render();
    }));
    render();
  }
}).catch(err=>{console.error(err);el.textContent='データを読み込めませんでした。';});