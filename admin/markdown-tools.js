/* Plain-text Markdown editor: keeps every newline and provides formatting controls. */
(function(){
 'use strict';
 if(!window.CMS||!window.React)return;
 const h=window.React.createElement;
 class MarkdownTools extends window.React.Component {
  constructor(p){super(p);this.area=window.React.createRef();this.state={};}
  format(kind){
   const area=this.area.current;if(!area)return;
   const text=String(this.props.value||'');const start=area.selectionStart,end=area.selectionEnd;
   const selected=text.slice(start,end);
   const specs={bold:['**','**','太字'],italic:['*','*','斜体'],link:['[','](https://example.com)','リンク文字'],h2:['## ','','見出し'],h3:['### ','','小見出し'],ul:['- ','','項目'],ol:['1. ','','項目']};
   const [before,after,placeholder]=specs[kind];
   const lineBased=['h2','h3','ul','ol'].includes(kind);
   let a=start,b=end,insert='';
   if(lineBased){a=text.lastIndexOf('\n',start-1)+1;insert=text.slice(a,start)+before+(selected||placeholder)+after;}
   else insert=before+(selected||placeholder)+after;
   const result=text.slice(0,a)+insert+text.slice(b);
   this.props.onChange(result);
   const caret=a+insert.length-after.length;
   requestAnimationFrame(()=>{if(this.area.current){this.area.current.focus();this.area.current.setSelectionRange(caret,caret);}});
  }
  render(){const value=typeof this.props.value==='string'?this.props.value:String(this.props.value||'');const actions=[['bold','太字'],['italic','斜体'],['h2','見出し'],['h3','小見出し'],['ul','箇条書き'],['ol','番号'],['link','リンク']];return h('div',{className:'vanilla-md-editor'},
   h('div',{className:'vanilla-md-toolbar',role:'toolbar','aria-label':'Markdown装飾'},...actions.map(([id,label])=>h('button',{type:'button',key:id,onMouseDown:e=>e.preventDefault(),onClick:()=>this.format(id)},label))),
   h('textarea',{ref:this.area,value,onChange:e=>this.props.onChange(e.target.value),rows:9,spellCheck:false,'aria-label':this.props.field?.get?.('label')||'本文'}),
   h('p',{className:'vanilla-md-help'},'改行はそのまま保存されます。装飾は公開ページに反映されます。')
  );}
 }
 window.CMS.registerWidget('vanilla_markdown',MarkdownTools);
})();
