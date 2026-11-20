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
const info = s => [s.system,s.players,s.duration].filter(Boolean).map(esc).join(' ・ ');

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
    el.innerHTML=`<a href="/scenario/">← SCENARIO一覧へ</a><h1>${esc(s.title)}</h1><section><p class="muted">${info(s)}</p><div class="scenario-tags">${tagsHtml(s.tags)}</div><h2>あらすじ</h2><div class="rich-text">${markdown(s.summary)}</div></section>`;
  }
  if(page==='scenario'){
    const options=(key)=>[...new Set(d.map(s=>s[key]).filter(Boolean))];
    const select=(id,label,values)=>`<label class="filter-label">${label}<select id="${id}"><option value="">すべて</option>${values.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')}</select></label>`;
    el.innerHTML=`<h1>回せるシナリオ</h1><div class="scenario-filters"><label class="filter-label">キーワード<input id="query" placeholder="タイトル・読み仮名・タグで検索" aria-label="シナリオ検索"></label>${select('players','プレイ人数',['フリー','タイマン','1PL','2PL','3PL','4PL','5PL以上'])}${select('duration','プレイ時間',['1～4時間','5～8時間','9～15時間','16～20時間','21時間～'])}${select('system','システム',options('system'))}</div><div id="results"></div>`;
    const render=()=>{
      const q=document.getElementById('query').value.trim().toLocaleLowerCase();
      const players=document.getElementById('players').value,duration=document.getElementById('duration').value,system=document.getElementById('system').value;
      const items=d.filter(s=>[s.title,s.reading,s.system,s.summary,...(s.tags||[]).map(t=>typeof t==='string'?t:t?.tag)].join(' ').toLocaleLowerCase().includes(q)&&(!players||s.players===players)&&(!duration||s.duration===duration)&&(!system||s.system===system));
      items.sort((a,b)=>(a.reading||a.title).localeCompare(b.reading||b.title,'ja'));
      document.getElementById('results').innerHTML=items.length?items.map(s=>`<article class="scenario"><h2><a href="/scenario/${encodeURIComponent(s.slug)}/">${esc(s.title)}</a></h2><p class="muted">${info(s)}</p><div class="scenario-tags">${tagsHtml(s.tags)}</div><div class="rich-text">${markdown(s.summary)}</div></article>`).join(''):'<p>該当するシナリオはありません。</p>';
    };
    document.querySelectorAll('.scenario-filters input,.scenario-filters select').forEach(x=>x.addEventListener('input',render));render();
  }
}).catch(err=>{console.error(err);el.textContent='データを読み込めませんでした。';});
