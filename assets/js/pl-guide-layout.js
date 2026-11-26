/* Shared guide layout normalization; old encrypted payloads remain readable. */
(function(g){
  'use strict';
  const arr=v=>Array.isArray(v)?v:[];
  const quoteDefaults={trailer:true,info:true,skills:true,overview:false,story:false,ho:false};
  const quoteKeys=['info','skills','overview','story','ho'];
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
    d.files=arr(d.files).map(f=>{
      const blockTab=d.tabs.find(t=>t.blocks.some(b=>b.id===f.block_id));
      return {...f,tab_id:blockTab?.id||(exists(f.tab_id)?f.tab_id:first),block_id:blockTab?f.block_id:''};
    });
    delete d.sections;delete d.notice;delete d.character;delete d.handout;
    return d;
  }
  g.VanillaPLLayout={normalize,quoteKeys};
})(window);
