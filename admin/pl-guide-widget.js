/* Never pass unencrypted guide contents to Decap. */
(function(){
  'use strict';
  const C=window.VanillaPLCrypto,R=window.React,M=window.VanillaMarkdownControl;
  if(!C||!R||!M||!window.CMS)return;
  const h=R.createElement, origin='https://trpg-server-guide.pages.dev';
  const blank=()=>({v:1,scenario:'',title:'',subtitle:'参加PL向け事前案内',quote:{trailer:true,info:true,skills:true,overview:false,story:false,ho:false},sections:[],files:[]});
  // Convert the previous three fixed inputs to editable sections without changing their text.
  const normalizeDraft=d=>{
    const merged={...blank(),...d,quote:{...blank().quote,...d.quote}};
    const old=[['参加にあたって','notice','NOTICE'],['キャラクター作成','character','CHARACTER CREATION'],['公開HO・事前情報','handout','HANDOUT']]
      .filter(([,key])=>String(merged[key]||'').trim())
      .map(([heading,key,heading_en])=>({heading,body:merged[key],heading_en,always_open:false}));
    merged.sections=[...old,...(Array.isArray(merged.sections)?merged.sections:[])];
    delete merged.notice;delete merged.character;delete merged.handout;
    return merged;
  };
  const searchText=v=>String(v||'').normalize('NFKC').toLocaleLowerCase('ja').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)).replace(/\s+/g,'');
  const store=(id,key)=>{try{localStorage.setItem('vanilla.pl.key.'+id,key);return true;}catch(_){return false;}};
  const recall=id=>{try{return localStorage.getItem('vanilla.pl.key.'+id)||'';}catch(_){return '';}};
  const button=(label,onClick,disabled=false)=>h('button',{type:'button',onClick,disabled},label);
  const field=(label,value,onChange)=>h('label',{className:'pl-admin-field'},h('strong',null,label),h('input',{type:'text',value,onChange:e=>onChange(e.target.value)}));
  const markdown=(label,value,onChange)=>h('div',{className:'pl-admin-field'},h('strong',null,label),h(M,{value,onChange,field:{get:k=>k==='label'?label:undefined}}));
  const check=(label,checked,onChange)=>h('label',{className:'pl-admin-check',key:label},h('input',{type:'checkbox',checked,onChange:e=>onChange(e.target.checked)}),label);
  class Guide extends R.Component{
    constructor(p){super(p);this.state={draft:null,url:'',scenarios:[],scenarioQuery:'',scenarioPicker:false,message:'',busy:false,dirty:false,paste:''};this.id='';this.key='';this.draft=null;this.seq=0;this.dead=false;this.dirty=false;this.busy=false;this.reading=false;}
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
    change=(field,value)=>{if(!this.draft)return;this.draft={...this.draft,[field]:value};this.update({draft:this.draft});this.encrypt();};
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
      try{const added=await Promise.all(files.map(async f=>({name:f.name,size:f.size,data:C.b64(new Uint8Array(await f.arrayBuffer()))})));if(this.dead)return;this.change('files',[...(this.draft.files||[]),...added]);}
      catch(_){this.status('添付ファイルを読み込めませんでした。');}
      finally{this.reading=false;this.update({busy:this.busy});}
    };
    editSection=(i,patch)=>this.change('sections',this.draft.sections.map((x,j)=>j===i?{...x,...patch}:x));
    moveSection=(i,j)=>{const a=[...this.draft.sections];[a[i],a[j]]=[a[j],a[i]];this.change('sections',a);};
    renderSection(x,i,n){
      return h('div',{key:i,className:'pl-admin-block'},
        field('題目',x.heading,v=>this.editSection(i,{heading:v,heading_en:''})),
        markdown('本文',x.body,v=>this.editSection(i,{body:v})),
        check('常に表示',!!x.always_open,v=>this.editSection(i,{always_open:v})),
        h('div',{className:'pl-admin-actions'},
          button('上へ',()=>this.moveSection(i,i-1),i===0),
          button('下へ',()=>this.moveSection(i,i+1),i===n-1),
          button('削除',()=>this.change('sections',this.draft.sections.filter((_,j)=>j!==i)))
        )
      );
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
      const quotes=h('div',{className:'pl-admin-field'},h('strong',null,'既存シナリオから表示する項目'),...Object.entries(quoteLabels).map(([k,label])=>check(label,!!d.quote[k],v=>this.change('quote',{...this.draft.quote,[k]:v}))));
      const sections=h('div',{className:'pl-admin-field'},h('strong',null,'自由追加ブロック'),...d.sections.map((x,i)=>this.renderSection(x,i,d.sections.length)),button('＋ ブロック追加',()=>this.change('sections',[...this.draft.sections,{heading:'',body:'',always_open:false}])));
      const files=h('div',{className:'pl-admin-field'},h('strong',null,'添付ファイル（暗号化・1件1MB / 合計2MB）'),h('input',{type:'file',multiple:true,onChange:this.addFiles,disabled:s.busy||this.reading}),...d.files.map((f,i)=>h('div',{key:i,className:'pl-admin-actions'},h('span',null,f.name),button('削除',()=>this.change('files',this.draft.files.filter((_,j)=>j!==i))))));
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
