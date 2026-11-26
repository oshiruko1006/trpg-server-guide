/* Shared guide layout normalization; old encrypted payloads remain readable. */
(function(g){
  'use strict';
  const arr=v=>Array.isArray(v)?v:[];
  const quoteDefaults={trailer:true,info:true,skills:true,overview:false,story:false,ho:false};
  const quoteKeys=['info','skills','overview','story','ho'];
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
  const imageMarker=line=>String(line||'').trim().match(/^!\[([^\]\r\n]*)\]\(pl-image:(img-[A-Za-z0-9_-]{16})\)$/);
  function normalize(data){
    const d={...data,quote:{...quoteDefaults,...data.quote}};
    if(!Array.isArray(d.tabs)){
      const legacy=[['参加にあたって','notice','NOTICE'],['キャラクター作成','character','CHARACTER CREATION'],['公開HO・事前情報','handout','HANDOUT']]
        .filter(([,key])=>String(d[key]||'').trim())
        .map(([heading,key,heading_en])=>({heading,body:d[key],heading_en,always_open:false}));
      const blocks=[...legacy,...arr(d.sections)].map((b,i)=>({...b,id:'legacy-block-'+i}));
      const hasQuotes=quoteKeys.some(k=>d.quote[k]);
      const tabs=[];
      if(hasQuotes||!blocks.length)tabs.push({id:'legacy-info',title:'シナリオ情報',blocks:[]});
      if(blocks.length)tabs.push({id:'legacy-guide',title:'ご案内',blocks});
      d.tabs=tabs;
      d.quote_tabs=Object.fromEntries(quoteKeys.map(k=>[k,tabs[0].id]));
      d.files=arr(d.files).map(f=>({...f,tab_id:tabs[tabs.length-1].id,block_id:''}));
    }
    d.tabs=arr(d.tabs).map((t,i)=>({...t,id:t.id||'tab-'+i,title:String(t.title||''),blocks:arr(t.blocks).map((b,j)=>({...b,id:b.id||'block-'+i+'-'+j}))}));
    if(!d.tabs.length)d.tabs=[{id:'default-tab',title:'ご案内',blocks:[]}];
    const first=d.tabs[0].id;
    const exists=id=>d.tabs.some(t=>t.id===id);
    d.quote_tabs=Object.fromEntries(quoteKeys.map(k=>[k,exists(d.quote_tabs?.[k])?d.quote_tabs[k]:first]));
    const referenced=new Map();
    for(const t of d.tabs)for(const b of t.blocks)for(const line of String(b.body||'').split(/\r?\n/)){
      const m=imageMarker(line);if(m&&!referenced.has(m[2]))referenced.set(m[2],{tab_id:t.id,block_id:b.id});
    }
    d.files=arr(d.files).map(f=>{
      if(f.id&&referenced.has(f.id))return {...f,...referenced.get(f.id),inline:true};
      if(f.inline)f={...f,inline:false};
      const blockTab=d.tabs.find(t=>t.blocks.some(b=>b.id===f.block_id));
      return {...f,tab_id:blockTab?.id||(exists(f.tab_id)?f.tab_id:first),block_id:blockTab?f.block_id:''};
    });
    delete d.sections;delete d.notice;delete d.character;delete d.handout;
    return d;
  }
  g.VanillaPLLayout={normalize,quoteKeys,imageMarker,imageType:plGuideImageType};
})(window);
