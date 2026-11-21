/* Experimental multi-file drag/drop widget for Decap CMS. */
(function () {
  'use strict';
  const React = window.React;
  if (!React || !window.CMS) return;
  const h = React.createElement;
  const asArray = value => {
    const v = value && typeof value.toJS === 'function' ? value.toJS() : value;
    return (Array.isArray(v) ? v : v ? [v] : []).filter(x => typeof x === 'string' && x);
  };
  class TrailerDrop extends React.Component {
    constructor(props) {
      super(props);
      this.state = { dragging:false, error:'', previews:{} };
      this.input = React.createRef();
      this.objectURLs = [];
    }
    componentWillUnmount() { this.objectURLs.forEach(u => URL.revokeObjectURL(u)); }
    addFiles(files) {
      const images = Array.from(files || []).filter(f => /^image\/(jpeg|png|webp|gif)$/.test(f.type));
      if (!images.length) { this.setState({error:'JPEG・PNG・WebP・GIF画像を選択してください。'}); return; }
      if (typeof this.props.onAddAsset !== 'function') {
        this.setState({error:'このCMSでは画像の一括保存連携を利用できません。従来の画像欄を使ってください。'});
        return;
      }
      const current = asArray(this.props.value);
      const next = [...current];
      const previews = {...this.state.previews};
      images.forEach(file => {
        const filename = Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9)+'-'+file.name.replace(/[^\w.\-\u3040-\u30ff\u3400-\u9fff]/g,'_');
        const path = 'assets/images/' + filename;
        const publicPath = '/assets/images/' + filename;
        const url = URL.createObjectURL(file);
        this.objectURLs.push(url);
        const asset = { path, file, url, toString(){return url;}, toJSON(){return path;}, valueOf(){return url;} };
        this.props.onAddAsset(asset);
        next.push(publicPath);
        previews[publicPath] = url;
      });
      this.props.onChange(next);
      this.setState({error:'',previews});
    }
    move(i,delta) {const a=asArray(this.props.value);const j=i+delta;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];this.props.onChange(a);}
    remove(i) {const a=asArray(this.props.value);this.props.onChange(a.filter((_,j)=>j!==i));}
    render() {
      const items=asArray(this.props.value);
      return h('div',{className:'vanilla-trailer-drop-widget'},
        h('div',{className:'vanilla-trailer-drop-zone'+(this.state.dragging?' dragging':''),role:'button',tabIndex:0,
          onDragOver:e=>{e.preventDefault();this.setState({dragging:true});},
          onDragLeave:e=>{e.preventDefault();this.setState({dragging:false});},
          onDrop:e=>{e.preventDefault();this.setState({dragging:false});this.addFiles(e.dataTransfer.files);},
          onClick:()=>this.input.current && this.input.current.click(),
          onKeyDown:e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.input.current.click();}}},
          h('strong',null,'📁 ここに画像をまとめてドロップ'),
          h('p',null,'またはクリックして複数枚を選択'),
          h('input',{ref:this.input,type:'file',accept:'image/jpeg,image/png,image/webp,image/gif',multiple:true,style:{display:'none'},onChange:e=>{this.addFiles(e.target.files);e.target.value='';}})),
        this.state.error?h('p',{className:'vanilla-trailer-error'},this.state.error):null,
        h('p',{className:'vanilla-trailer-hint'},'追加後はCMSの「保存」を押してください。1枚目が表紙です。'),
        h('div',{className:'vanilla-trailer-grid'},...items.map((src,i)=>{
          let preview=this.state.previews[src] || src;
          if (!this.state.previews[src] && this.props.getAsset) {try {const a=this.props.getAsset(src);if(a)preview=String(a);}catch(_){}}
          return h('div',{className:'vanilla-trailer-item',key:src+i},
            h('img',{src:preview,alt:'トレーラー '+(i+1)}),
            h('div',null,h('span',null,i===0?'表紙':'画像 '+(i+1)),
              h('button',{type:'button',disabled:i===0,onClick:()=>this.move(i,-1)},'↑'),
              h('button',{type:'button',disabled:i===items.length-1,onClick:()=>this.move(i,1)},'↓'),
              h('button',{type:'button',onClick:()=>this.remove(i)},'削除')));
        })));
    }
  }
  window.CMS.registerWidget('vanilla_trailer_drop',TrailerDrop);
})();
