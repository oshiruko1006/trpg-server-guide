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
  const flushP = () => { if(paragraph.length){result += `<p>${paragraph.map(inlineMd).join('<br>')}</p>`; paragraph=[];} };
  const flushL = () => {if(list.length){result += `<${listType}>${list.map(x=>`<li>${inlineMd(x)}</li>`).join('')}</${listType}>`;list=[];listType='';}};
  for(const line of lines){
    if(!line.trim()){flushP();flushL();continue;}
    const heading = line.match(/^\s{0,3}(#{1,4})\s+(.+)$/);
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    const number = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if(heading){flushP();flushL();const level = Math.min(heading[1].length+2,6);result+=`<h${level}>${inlineMd(heading[2])}</h${level}>`;}
    else if(bullet||number){flushP();const type=bullet?'ul':'ol';if(listType&&listType!==type)flushL();listType=type;list.push((bullet||number)[1]);}
    else {flushL();paragraph.push(line);}
  }
  flushP();flushL();return result;
}
const textBlock = value => `<p class="preserve-lines">${esc(value)}</p>`;
const sectionCard = (section,i) => `<section class="rule-card"><div class="rule-number">RULE ${String(i+1).padStart(2,'0')}</div><h2>${esc(section.heading)}</h2><div class="rich-text">${markdown(section.body)}</div></section>`;
const tagsHtml = tags => (Array.isArray(tags)?tags:[]).map(t=>`<span class="tag">${esc(typeof t==='string'?t:t?.tag)}</span>`).join(' ');
const info = s => [s.system,s.players,s.duration,s.age_rating].filter(Boolean).map(esc).join(' ・ ');
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
const scenarioCard = (s, view) => `<article class="scenario scenario-entry scenario-${view}"><a class="scenario-entry-link" href="/scenario/${encodeURIComponent(s.slug)}/">${trailerThumb(s)}<div class="scenario-entry-body"><h2>${esc(s.title)}</h2><p class="muted">${info(s)}</p><div class="scenario-tags">${tagsHtml(s.tags)}</div>${view==='list'?`<p class="scenario-excerpt">${esc(String(s.summary||'').replace(/[#*_`~\[\]]/g,'').slice(0,115))}</p>`:''}</div></a></article>`;

fetch(urls[page]).then(r=>{if(!r.ok)throw Error('load');return r.json();}).then(d=>{
  if(page==='home'){
    const sections = d.sections || (d.rules?[{heading:'ルール',body:d.rules}]:[]);
    el.innerHTML = `<h1>${esc(d.title)}</h1>${d.intro?`<section class="intro-card">${textBlock(d.intro)}</section>`:''}<div class="rule-list">${sections.map(sectionCard).join('')}</div>`;
  }
  if(page==='character'){
    const systems = d.systems || [];
    el.innerHTML = `<h1>${esc(d.title)}</h1>${d.intro?`<p class="preserve-lines">${esc(d.intro)}</p>`:''}<div class="switcher" role="group" aria-label="システム切り替え">${systems.map((s,i)=>`<button type="button" class="system-tab" data-index="${i}" aria-pressed="${i===0}">${esc(s.name)}</button>`).join('')}</div><div id="system-content"></div>`;
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
    el.innerHTML=`<h1>${esc(d.title)}</h1><section><h2>KP受付状況</h2><span class="tag">${esc(statuses[d.status]||'未設定')}</span>${textBlock(d.status_message)}</section><section><h2>依頼ルール</h2><div class="rich-text">${markdown(d.rules)}</div></section><section><h2>依頼手順</h2>${textBlock(d.steps)}</section><section><h2>依頼テンプレート</h2><pre id="template">${esc(d.template)}</pre><button id="copy" type="button">コピーする</button></section>${/^https?:\/\//.test(d.discord_url||'')&&d.status!=='closed'?`<section><a href="${esc(d.discord_url)}" target="_blank" rel="noopener noreferrer">Discordで連絡する</a></section>`:''}`;
    document.getElementById('copy').addEventListener('click',()=>navigator.clipboard.writeText(d.template||'').then(()=>alert('コピーしました')).catch(()=>alert('コピーできませんでした')));
  }
  if(page==='detail'){
    const s=d.find(x=>x.slug===document.body.dataset.slug);
    if(!s){el.textContent='シナリオが見つかりません。';return;}
    const images = trailerUrls(s);
    const gallery = images.length ? `<div class="scenario-gallery">${images.map((src,i)=>`<button class="trailer-open" type="button" data-index="${i}" aria-label="トレーラー画像${i+1}を拡大"><img src="${esc(src)}" alt="${esc(s.title)}のトレーラー ${i+1}" loading="lazy"></button>`).join('')}</div>` : '';
    const block = (heading,body) => String(body||'').trim()?`<section class="scenario-detail-block"><h2>${esc(heading)}</h2><div class="rich-text">${markdown(body)}</div></section>`:'';
    const extras = Array.isArray(s.extra_sections)?s.extra_sections:[];
    el.innerHTML=`<a href="/scenario/">← SCENARIO一覧へ</a><div class="scenario-detail-head"><span class="scenario-eyebrow">SCENARIO</span><h1>${esc(s.title)}</h1><p class="scenario-detail-info">${info(s)}</p><div class="scenario-tags">${tagsHtml(s.tags)}</div></div>${gallery}${block('あらすじ',s.summary)}${block('概要',s.overview)}${block('注意事項',s.cautions)}${extras.map(x=>block(x.heading||'',x.body)).join('')}`;
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
    const allTags=[...new Set(d.flatMap(s=>(Array.isArray(s.tags)?s.tags:[]).map(t=>typeof t==='string'?t:t?.tag).filter(Boolean)))].sort((a,b)=>a.localeCompare(b,'ja'));
    el.innerHTML=`<h1>回せるシナリオ</h1><div class="scenario-filters"><div class="scenario-keyword-wrap"><label class="filter-label" for="query">キーワード<input id="query" placeholder="タイトル・読み仮名・タグで検索" aria-label="シナリオ検索" autocomplete="off"></label><div id="tag-panel" class="tag-panel" hidden><div class="tag-panel-heading"><strong>タグを選択（AND検索）</strong><button type="button" id="clear-tags">選択解除</button></div><div class="tag-choices">${allTags.map((tag,i)=>`<button type="button" class="tag-choice" data-tag-index="${i}" aria-pressed="false">${esc(tag)}</button>`).join('')||'<span>登録済みタグはありません</span>'}</div></div></div>${select('players','プレイ人数',['フリー','タイマン','1PL','2PL','3PL','4PL','5PL以上'])}${select('duration','プレイ時間',['1～4時間','5～8時間','9～15時間','16～20時間','21時間～'])}${select('system','システム',['CoC6版','CoC7版'])}${select('age_rating','対象年齢',['全年齢','R-15','R-18'])}</div><div class="scenario-toolbar"><span id="result-count" aria-live="polite"></span><div class="scenario-view-toggle" role="group" aria-label="表示形式"><button type="button" data-view="card" aria-pressed="true">▦ カード</button><button type="button" data-view="list" aria-pressed="false">☷ リスト</button></div></div><div id="results" class="scenario-results view-card"></div>`;
    const selectedTags=new Set();
    const panel=document.getElementById('tag-panel'),query=document.getElementById('query');
    query.addEventListener('focus',()=>{panel.hidden=false;});
    document.querySelectorAll('.tag-choice').forEach(b=>b.addEventListener('click',()=>{const tag=allTags[Number(b.dataset.tagIndex)];if(selectedTags.has(tag))selectedTags.delete(tag);else selectedTags.add(tag);b.setAttribute('aria-pressed',String(selectedTags.has(tag)));render();}));
    document.getElementById('clear-tags').addEventListener('click',()=>{selectedTags.clear();document.querySelectorAll('.tag-choice').forEach(b=>b.setAttribute('aria-pressed','false'));render();});
    document.addEventListener('pointerdown',e=>{if(!e.target.closest('.scenario-keyword-wrap'))panel.hidden=true;});
    let view = 'card';
    try { if(localStorage.getItem('vanilla-scenario-view')==='list') view='list'; } catch (_) {}
    const render=()=>{
      const q=document.getElementById('query').value.trim().toLocaleLowerCase();
      const players=document.getElementById('players').value,duration=document.getElementById('duration').value,system=document.getElementById('system').value,ageRating=document.getElementById('age_rating').value;
      const items=d.filter(s=>{const tags=(Array.isArray(s.tags)?s.tags:[]).map(t=>typeof t==='string'?t:t?.tag).filter(Boolean);return [s.title,s.reading,s.system,s.summary,s.overview,s.cautions,...tags].join(' ').toLocaleLowerCase().includes(q)&&[...selectedTags].every(t=>tags.includes(t))&&(!players||s.players===players)&&(!duration||s.duration===duration)&&(!system||s.system===system)&&(!ageRating||(s.age_rating||'全年齢')===ageRating);});
      items.sort((a,b)=>(a.reading||a.title).localeCompare(b.reading||b.title,'ja'));
      const results=document.getElementById('results');
      results.className=`scenario-results view-${view}`;
      results.innerHTML=items.length?items.map(s=>scenarioCard(s,view)).join(''):'<p class="scenario-empty">該当するシナリオはありません。</p>';
      document.getElementById('result-count').textContent=`${items.length} 件`;
      document.querySelectorAll('.scenario-view-toggle button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
    };
    document.querySelectorAll('.scenario-filters input,.scenario-filters select').forEach(x=>x.addEventListener('input',render));
    document.querySelectorAll('.scenario-view-toggle button').forEach(b=>b.addEventListener('click',()=>{
      view=b.dataset.view;
      try { localStorage.setItem('vanilla-scenario-view',view); } catch (_) {}
      render();
    }));
    render();
  }
}).catch(err=>{console.error(err);el.textContent='データを読み込めませんでした。';});
