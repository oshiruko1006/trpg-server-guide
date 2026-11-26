/* Never pass unencrypted guide contents to Decap. */
(function(){
  'use strict';
  const C=window.VanillaPLCrypto,R=window.React,M=window.VanillaMarkdownControl,L=window.VanillaPLLayout;
  if(!C||!R||!M||!L||!window.CMS)return;
  const h=R.createElement, origin='https://trpg-server-guide.pages.dev';
  const blank=()=>L.normalize({v:1,scenario:'',title:'',subtitle:'参加PL向け事前案内',quote:{trailer:true,info:true,skills:true,overview:false,story:false,ho:false},tabs:[{id:'tab-'+C.random(12),title:'シナリオ情報',blocks:[]}],files:[]});
  const normalizeDraft=d=>L.normalize(d);
  const searchText=v=>String(v||'').normalize('NFKC').toLocaleLowerCase('ja').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)).replace(/\s+/g,'');
  const store=(id,key)=>{try{localStorage.setItem('vanilla.pl.key.'+id,key);return true;}catch(_){return false;}};
  const recall=id=>{try{return localStorage.getItem('vanilla.pl.key.'+id)||'';}catch(_){return '';}};
  const button=(label,onClick,disabled=false)=>h('button',{type:'button',onClick,disabled},label);
  const field=(label,value,onChange)=>h('label',{className:'pl-admin-field'},h('strong',null,label),h('input',{type:'text',value,onChange:e=>onChange(e.target.value)}));
  const markdown=(label,value,onChange,onInsertPrivateImage)=>h('div',{className:'pl-admin-field'},h('strong',null,label),h(M,{value,onChange,onInsertPrivateImage,field:{get:k=>k==='label'?label:undefined}}));
  const check=(label,checked,onChange)=>h('label',{className:'pl-admin-check',key:label},h('input',{type:'checkbox',checked,onChange:e=>onChange(e.target.checked)}),label);
  class Guide extends R.Component{
    constructor(p){super(p);this.state={draft:null,url:'',scenarios:[],scenarioQuery:'',scenarioPicker:false,activeTab:'',collapsedBlocks:{},message:'',busy:false,dirty:false,paste:''};this.id='';this.key='';this.draft=null;this.seq=0;this.dead=false;this.dirty=false;this.busy=false;this.reading=false;}
    componentDidMount(){
      this.dead=false;
      fetch('/data/scenarios.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(a=>{if(!this.dead)this.setState({scenarios:a.filter(x=>x.slug&&x.title).sort((a,b)=>(a.reading||a.title).localeCompare(b.reading||b.title,'ja'))});}).catch(()=>{this.status('シナリオ一覧を読み込めません。');});
      if(this.props.value){try{const e=C.envelope(this.props.value);this.id=e.id;const k=recall(e.id);if(k)this.unlock(k);}catch(_){this.status('暗号化データを読み込めません。');}}
    }
    componentWillUnmount(){this.dead=true;this.seq++;}
    isValid=()=> {if(this.busy||this.reading||this.dirty||!this.props.value)return false;try{C.envelope(this.props.value);}catch(_){return false;}return !this.draft||!!(this.draft.title.trim()||this.draft.scenario);};
    url=()=>origin+'/pl-guide/'+this.id+'/#'+this.key;
    update=(patch)=>{if(!this.dead)this.setState(patch);};
    status=(message)=>this.update({message});
    async unlock(key){
      this.busy=true;this.update({busy:true,message:''});
      try{const e=C.envelope(this.props.value),d=await C.open(e,key);if(this.dead)return;this.id=e.id;this.key=key;this.draft=normalizeDraft(d);store(this.id,key);this.update({draft:this.draft,url:this.url(),paste:''});}
      catch(_){this.status('共有URLが違うか、内容を復号できません。');}
      finally{this.busy=false;this.update({busy:false});}
    }
    restore=()=>{const s=this.state.paste.trim();try{const u=new URL(s);const m=u.pathname.match(/^\/pl-guide\/([A-Za-z0-9_-]{22})\/?$/);if(u.origin!==origin||!m||m[1]!==this.id||!C.validKey(u.hash.slice(1)))throw Error();this.unlock(u.hash.slice(1));}catch(_){this.status('このページの共有URLを末尾まで貼り付けてください。');}};
    create=()=>{if(this.props.value||this.draft)return;this.id=C.random(16);this.key=C.random(32);this.draft=blank();const saved=store(this.id,this.key);this.update({url:this.url(),draft:this.draft,message:saved?'':'鍵を端末に保存できません。共有URLを必ず控えてください。'});this.encrypt();};
    change=(field,value)=>{if(!this.draft)return;this.draft=L.normalize({...this.draft,[field]:value});this.update({draft:this.draft});this.encrypt();};
    async encrypt(){
      const seq=++this.seq,id=this.id,key=this.key,data=this.draft;
      this.dirty=true;this.busy=true;this.update({busy:true,dirty:true});
      try{const e=await C.seal(id,key,data);if(this.dead||seq!==this.seq)return;this.dirty=false;this.busy=false;this.props.onChange(JSON.stringify(e));this.update({busy:false,dirty:false});}
      catch(_){if(this.dead||seq!==this.seq)return;this.busy=false;this.update({busy:false,dirty:true,message:'暗号化できませんでした。容量を確認して再試行してください。'});}
    }
    rotate=()=>{if(!this.draft||this.busy||this.reading||!window.confirm('共有URLを再発行します。保存・デプロイ後、旧URLで現在のページは開けません。新しいURLを控えてください。'))return;this.id=C.random(16);this.key=C.random(32);store(this.id,this.key);this.update({url:this.url(),message:''});this.encrypt();};
    copy=async()=>{try{await navigator.clipboard.writeText(this.url());this.status('共有URLをコピーしました。保存・デプロイ後に使えます。');}catch(_){this.status('URLを選択してコピーしてください。');}};
    addFiles=async(e)=>{
      const files=Array.from(e.target.files||[]);e.target.value='';if(!this.draft||!files.length||this.reading)return;
      const old=this.draft.files||[],total=old.reduce((n,f)=>n+f.size,0)+files.reduce((n,f)=>n+f.size,0);
      if(files.some(f=>f.size>1048576)||total>2097152){this.status('添付は1ファイル1MB、合計2MBまでです。');return;}
      this.reading=true;this.update({busy:true});
      try{const added=await Promise.all(files.map(async f=>({name:f.name,size:f.size,tab_id:this.activeTab().id,block_id:'',data:C.b64(new Uint8Array(await f.arrayBuffer()))})));if(this.dead)return;this.change('files',[...(this.draft.files||[]),...added]);}
      catch(_){this.status('添付ファイルを読み込めませんでした。');}
      finally{this.reading=false;this.update({busy:this.busy});}
    };
    insertPrivateImages=async(blockId,files,selection)=>{
      if(this.dead||!this.draft||this.reading||!files.length)return;
      const total=this.draft.files.reduce((n,f)=>n+Number(f.size||0),0)+files.reduce((n,f)=>n+f.size,0);
      const fail=message=>{this.status(message);window.alert(message);};
      if(files.some(f=>f.size>1048576)||total>2097152){fail('添付は1ファイル1MB、合計2MBまでです。');return;}
      this.reading=true;this.update({busy:true});
      try{
        const added=await Promise.all(files.map(async f=>{
          const bytes=new Uint8Array(await f.arrayBuffer());
          if(!L.imageType(bytes))throw Error('image-type');
          return {id:'img-'+C.random(12),name:f.name,size:f.size,data:C.b64(bytes),inline:true};
        }));
        if(this.dead)return;
        const tab=this.draft.tabs.find(t=>t.blocks.some(b=>b.id===blockId));
        const block=tab?.blocks.find(b=>b.id===blockId);
        if(!block){fail('挿入先のブロックが見つかりません。');return;}
        const value=String(block.body||'');
        const pos=selection?.value===value?Math.max(0,Math.min(value.length,Number(selection.end)||0)):value.length;
        const before=value.slice(0,pos),after=value.slice(pos);
        const markers=added.map(f=>'!['+String(f.name||'画像').replace(/[\[\]\r\n]/g,' ')+'](pl-image:'+f.id+')').join('\n');
        const body=before+(before&&!before.endsWith('\n')?'\n':'')+markers+(after&&!after.startsWith('\n')?'\n':'')+after;
        const tabs=this.draft.tabs.map(t=>t.id===tab.id?{...t,blocks:t.blocks.map(b=>b.id===blockId?{...b,body}:b)}:t);
        // Commit text and encrypted attachment data as one draft update.
        this.draft=L.normalize({...this.draft,tabs,files:[...this.draft.files,...added.map(f=>({...f,tab_id:tab.id,block_id:blockId}))]});
        this.update({draft:this.draft,message:'画像を本文に挿入しました。'});this.encrypt();
      }catch(error){if(!this.dead)fail(error.message==='image-type'?'対応する画像形式を選択してください。':'画像を読み込めませんでした。');}
      finally{this.reading=false;this.update({busy:this.busy});}
    };
    removeFile=i=>{
      const f=this.draft.files[i];if(!f)return;
      if(f.inline&&!window.confirm('本文中の画像も削除しますか？'))return;
      const tabs=f.id?this.draft.tabs.map(t=>({...t,blocks:t.blocks.map(b=>({...b,body:String(b.body||'').split('\n').filter(line=>L.imageMarker(line)?.[2]!==f.id).join('\n')}))})):this.draft.tabs;
      this.draft=L.normalize({...this.draft,tabs,files:this.draft.files.filter((_,j)=>j!==i)});
      this.update({draft:this.draft});this.encrypt();
    };
    activeTab=()=>this.draft.tabs.find(t=>t.id===this.state.activeTab)||this.draft.tabs[0];
    updateTab=(id,patch)=>this.change('tabs',this.draft.tabs.map(t=>t.id===id?{...t,...patch}:t));
    addTab=()=>{const t={id:'tab-'+C.random(12),title:'新しいタブ',blocks:[]};this.change('tabs',[...this.draft.tabs,t]);this.update({activeTab:t.id});};
    moveTab=(id,delta)=>{const a=[...this.draft.tabs],i=a.findIndex(t=>t.id===id),j=i+delta;if(i<0||j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];this.change('tabs',a);};
    removeTab=id=>{if(this.draft.tabs.length<=1)return;const t=this.draft.tabs.find(t=>t.id===id);if(!window.confirm('「'+(t.title||'名称未設定')+'」を削除しますか？ タブ内の本文は削除され、引用情報・添付ファイルは残るタブへ移動します。'))return;const tabs=this.draft.tabs.filter(t=>t.id!==id);this.change('tabs',tabs);this.update({activeTab:tabs[0].id});};
    editBlock=(tab,id,patch)=>this.updateTab(tab.id,{blocks:tab.blocks.map(b=>b.id===id?{...b,...patch}:b)});
    moveBlock=(tab,i,delta)=>{const a=[...tab.blocks],j=i+delta;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];this.updateTab(tab.id,{blocks:a});};
    removeBlock=(tab,b)=>{if(!window.confirm('この情報ブロックを削除しますか？ 添付ファイルはタブ内の配布資料へ移動します。'))return;this.updateTab(tab.id,{blocks:tab.blocks.filter(x=>x.id!==b.id)});};
    addBlock=tab=>{const b={id:'block-'+C.random(12),heading:'',body:'',always_open:false};this.updateTab(tab.id,{blocks:[...tab.blocks,b]});this.update({collapsedBlocks:{...this.state.collapsedBlocks,[b.id]:false}});};
    tabSelect=(value,onChange,label)=>h('select',{value,onChange:e=>onChange(e.target.value),'aria-label':label},...this.draft.tabs.map(t=>h('option',{key:t.id,value:t.id},t.title||'名称未設定')));
    renderBlock(tab,b,i){
      const closed=!!this.state.collapsedBlocks[b.id];
      return h('div',{key:b.id,className:'pl-admin-block'},
        h('div',{className:'pl-admin-block-head'},button((closed?'▸ ':'▾ ')+(b.heading||'新しいブロック'),()=>this.update({collapsedBlocks:{...this.state.collapsedBlocks,[b.id]:!closed}})),
          h('div',{className:'pl-admin-actions'},button('↑',()=>this.moveBlock(tab,i,-1),i===0),button('↓',()=>this.moveBlock(tab,i,1),i===tab.blocks.length-1),button('削除',()=>this.removeBlock(tab,b)))),
        closed?null:h('div',null,
          field('題目',b.heading||'',v=>this.editBlock(tab,b.id,{heading:v,heading_en:''})),
          markdown('本文',b.body||'',v=>{const current=this.draft.tabs.find(t=>t.blocks.some(x=>x.id===b.id));if(current)this.editBlock(current,b.id,{body:v});},(files,selection)=>this.insertPrivateImages(b.id,files,selection)),
          check('常に表示',!!b.always_open,v=>this.editBlock(tab,b.id,{always_open:v})),
          h('label',{className:'pl-admin-field'},h('span',null,'別のタブに移動'),this.tabSelect(tab.id,to=>{
            if(to===tab.id)return;
            const tabs=this.draft.tabs.map(t=>t.id===tab.id?{...t,blocks:t.blocks.filter(x=>x.id!==b.id)}:t.id===to?{...t,blocks:[...t.blocks,b]}:t);
            this.change('tabs',tabs);this.update({activeTab:to});
          },'ブロックの移動先'))
        ));
    }
    renderTabs(){
      const d=this.draft,tab=this.activeTab(),index=d.tabs.findIndex(t=>t.id===tab.id);
      return h('div',{className:'pl-admin-field'},h('strong',null,'タブ・情報ブロック管理'),
        h('div',{className:'pl-admin-tab-nav'},...d.tabs.map(t=>h('button',{key:t.id,type:'button','aria-pressed':t.id===tab.id,onClick:()=>this.update({activeTab:t.id})},t.title||'名称未設定')),button('＋ タブ追加',this.addTab)),
        h('div',{className:'pl-admin-tab-editor',key:tab.id},
          field('タブ名',tab.title,v=>this.updateTab(tab.id,{title:v})),
          h('div',{className:'pl-admin-actions'},button('← 前へ',()=>this.moveTab(tab.id,-1),index===0),button('後ろへ →',()=>this.moveTab(tab.id,1),index===d.tabs.length-1),button('タブ削除',()=>this.removeTab(tab.id),d.tabs.length===1)),
          ...tab.blocks.map((b,i)=>this.renderBlock(tab,b,i)),
          button('＋ 情報ブロック追加',()=>this.addBlock(tab))));
    }
    renderFiles(){
      const d=this.draft;
      const locations=d.tabs.flatMap(t=>[{value:t.id+'|',label:(t.title||'名称未設定')+' ／ 配布資料'},...t.blocks.map(b=>({value:t.id+'|'+b.id,label:(t.title||'名称未設定')+' ／ '+(b.heading||'新しいブロック')}))]);
      return h('div',{className:'pl-admin-field'},h('strong',null,'添付ファイル（暗号化・1件1MB / 合計2MB）'),
        h('p',null,'追加後、表示するタブや情報ブロックを選べます。本文に挿入した画像もここで管理できます。挿入記号を消すと末尾の添付画像になります。'),
        h('input',{type:'file',multiple:true,onChange:this.addFiles,disabled:this.state.busy||this.reading}),
        ...d.files.map((f,i)=>h('div',{key:i,className:'pl-admin-block'},
          h('div',{className:'pl-admin-actions'},h('span',null,f.name),button('削除',()=>this.removeFile(i))),
          f.inline?h('p',null,'本文中に挿入済み：'+(locations.find(x=>x.value===f.tab_id+'|'+f.block_id)?.label||'')):h('label',{className:'pl-admin-field'},h('span',null,'表示先'),h('select',{value:f.tab_id+'|'+f.block_id,onChange:e=>{const [tab_id,block_id]=e.target.value.split('|');this.change('files',this.draft.files.map((x,j)=>j===i?{...x,tab_id,block_id}:x));}},...locations.map(x=>h('option',{key:x.value,value:x.value},x.label))))
        )));
    }
    renderScenarioPicker(d,s){
      const query=searchText(s.scenarioQuery);
      const matches=s.scenarios.filter(x=>!query||[x.title,x.reading,x.author].some(v=>searchText(v).includes(query)));
      const chosen=s.scenarios.find(x=>x.slug===d.scenario);
      const select=x=>{this.change('scenario',x);this.update({scenarioQuery:'',scenarioPicker:false});};
      return h('div',{className:'pl-admin-field'},
        h('strong',null,'対象シナリオ'),
        h('div',{className:'pl-admin-scenario-selected'},h('span',null,chosen?.title||(d.scenario?'登録済みシナリオ（一覧にありません）':'選択なし')),d.scenario?button('解除',()=>select('')):null),
        h('input',{type:'search',value:s.scenarioQuery,placeholder:'シナリオ名・読み・作者で検索',onFocus:()=>this.update({scenarioPicker:true}),onChange:e=>this.update({scenarioQuery:e.target.value,scenarioPicker:true}),'aria-label':'対象シナリオを検索','aria-expanded':s.scenarioPicker}),
        s.scenarioPicker?h('div',{className:'pl-admin-scenario-picker'},
          h('div',{className:'pl-admin-scenario-results-head'},h('span',null,matches.length+'件'),button('閉じる',()=>this.update({scenarioPicker:false}))),
          h('div',{className:'pl-admin-scenario-results'},...matches.map(x=>h('button',{type:'button',key:x.slug,onClick:()=>select(x.slug),'aria-pressed':x.slug===d.scenario},x.title)),matches.length?null:h('p',null,'該当するシナリオがありません。'))
        ):null
      );
    }
    render(){
      const s=this.state,d=s.draft,status=s.message?h('p',{role:'status',className:'pl-admin-status'},s.message):null;
      if(!d){
        const content=this.props.value?h('div',null,h('p',null,'この端末に鍵がない場合、控えてある共有URLを貼り付けてください。'),h('input',{type:'text',value:s.paste,onChange:e=>this.setState({paste:e.target.value}),placeholder:'https://…/pl-guide/…/#…'}),button('編集を開く',this.restore,s.busy)):h('div',null,h('p',null,'ページの内容は暗号化されます。共有URLを失うと編集・閲覧できません。'),button('限定ページを作成',this.create,s.busy));
        return h('div',{className:'pl-admin'},status,content);
      }
      const quoteLabels={trailer:'トレーラー',info:'シナリオ基本情報',skills:'必須・推奨・準推奨技能',overview:'概要',story:'あらすじ',ho:'公開サイトに載っているHO'};
      const link=h('div',{className:'pl-admin-link'},h('strong',null,'共有URL（必ず控える）'),h('input',{readOnly:true,value:s.url,onFocus:e=>e.target.select(),'aria-label':'共有URL'}),h('div',{className:'pl-admin-actions'},button('URLをコピー',this.copy),button('URL再発行',this.rotate,s.busy||this.reading)),h('p',null,'URLを知る人は閲覧できます。保存・デプロイ後に有効になります。'));
      const select=this.renderScenarioPicker(d,s);
      const quotes=h('div',{className:'pl-admin-field'},h('strong',null,'既存シナリオから表示する項目'),
        ...Object.entries(quoteLabels).map(([k,label])=>h('div',{key:k,className:'pl-admin-quote-row'},
          check(label,!!d.quote[k],v=>this.change('quote',{...this.draft.quote,[k]:v})),
          k!=='trailer'&&d.quote[k]?this.tabSelect(d.quote_tabs[k],v=>this.change('quote_tabs',{...this.draft.quote_tabs,[k]:v}),label+'の表示先'):null)));
      const sections=this.renderTabs(),files=this.renderFiles();
      return h('div',{className:'pl-admin'},status,link,select,
        field('ページタイトル（空欄ならシナリオ名）',d.title,v=>this.change('title',v)),
        field('サブタイトル',d.subtitle,v=>this.change('subtitle',v)),quotes,
        sections,files,
        h('p',{role:'status',className:'pl-admin-status'},s.busy||this.reading?'暗号化・読み込み中…':s.dirty?'未反映：再試行してください':'暗号化済み。CMS上部の公開／保存で反映してください。'),
        s.dirty&&!s.busy?button('暗号化を再試行',()=>this.encrypt()):null);
    }
  }
  window.CMS.registerWidget('vanilla_pl_guide',Guide);
})();
