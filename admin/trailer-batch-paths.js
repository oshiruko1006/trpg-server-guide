/* Register already-uploaded GitHub images in bulk. No file upload is performed here. */
(function () {
  'use strict';
  const React = window.React, CMS = window.CMS;
  if (!React || !CMS) return;
  const h = React.createElement;
  const folder = '/assets/images/';
  const asArray = v => {
    const a = v && typeof v.toJS === 'function' ? v.toJS() : v;
    return (Array.isArray(a) ? a : a ? [a] : []).filter(x => typeof x === 'string' && x.trim());
  };
  function parse(text) {
    const good = [], bad = [];
    String(text || '').split(/[\r\n]+/).forEach(line => {
      let value = line.trim().replace(/^['"]|['"]$/g, '');
      if (!value) return;
      // GitHub's upload screen preserves file names. Accept file names, site paths and HTTPS URLs.
      if (!/^https:\/\//i.test(value)) {
        value = value.replace(/^\.?\/?assets\/images\//, '').replace(/^\/+/, '');
        if (value.includes('/') || value === '.' || value === '..') { bad.push(line); return; }
        value = folder + encodeURIComponent(value).replace(/%[()]/g, c => c);
      }
      if (!/\.(png|jpe?g|gif|webp|avif)(?:[?#].*)?$/i.test(value) || !(/^(\/assets\/images\/|https:\/\/)/i.test(value))) {
        bad.push(line); return;
      }
      good.push(value);
    });
    return { good, bad };
  }
  class TrailerPaths extends React.Component {
    constructor(props) {
      super(props);
      this.state = { input:'', message:'', error:'' };
    }
    append(text) {
      const {good,bad} = parse(text);
      const current = asArray(this.props.value);
      const unique = [...new Set([...current,...good])];
      if (good.length) this.props.onChange(unique);
      this.setState({input:'',message:good.length ? `${unique.length-current.length}枚を登録欄に追加しました。CMSの「保存」で反映されます。` : '',error:bad.length ? `${bad.length}件の名前を読み取れませんでした。画像のファイル名（拡張子付き）を確認してください。` : ''});
    }
    move(i,delta) {
      const a = asArray(this.props.value), j=i+delta;
      if (j<0 || j>=a.length) return;
      [a[i],a[j]]=[a[j],a[i]];
      this.props.onChange(a);
    }
    render() {
      const items = asArray(this.props.value);
      return h('section',{className:'vanilla-batch-paths'},
        h('p',null,'① GitHub の assets/images に画像をまとめてアップロード・コミット → ② その画像のファイル名を下にまとめて入力します。'),
        h('p',null,h('a',{href:'https://github.com/oshiruko1006/trpg-server-guide/tree/main/assets/images',target:'_blank',rel:'noopener noreferrer'},'GitHub の画像フォルダを開く ↗')),
        h('label',null,'アップロード済み画像のファイル名（1行に1枚）',
          h('textarea',{value:this.state.input,rows:4,placeholder:'trailer-01.webp\ntrailer-02.webp',onChange:e=>this.setState({input:e.target.value}),style:{width:'100%',boxSizing:'border-box',marginTop:6}})),
        h('div',{className:'vanilla-batch-actions'},
          h('button',{type:'button',onClick:()=>this.append(this.state.input),disabled:!this.state.input.trim()},'まとめて登録'),
          h('label',{className:'vanilla-batch-file'},'または画像ファイルを選んで名前を取り込む',
            h('input',{type:'file',accept:'image/png,image/jpeg,image/webp,image/gif,image/avif',multiple:true,onChange:e=>{const names=[...e.target.files].map(f=>f.name).join('\n');this.append(names);e.target.value='';}}))),
        h('p',{className:'vanilla-batch-warning'},'※ この欄は画像をアップロードしません。先にGitHubへ同名ファイルを保存してください。ファイル選択は名前の取り込み専用です。'),
        this.state.error ? h('p',{role:'alert',className:'vanilla-batch-error'},this.state.error) : null,
        this.state.message ? h('p',{role:'status',className:'vanilla-batch-success'},this.state.message) : null,
        h('div',{className:'vanilla-batch-grid'},...items.map((src,i)=>h('div',{className:'vanilla-batch-item',key:src+'-'+i},
          h('img',{src,alt:'トレーラー '+(i+1),loading:'lazy',onError:e=>{e.currentTarget.style.opacity='.25';e.currentTarget.title='画像を読み込めません。GitHub保存・Cloudflare反映後に再確認してください。';}}),
          h('div',null,h('span',null,(i===0?'一括登録の先頭':'画像 '+(i+1))+'：'+decodeURIComponent(src.split('/').pop()||'')),
            h('button',{type:'button',disabled:i===0,onClick:()=>this.move(i,-1)},'↑'),
            h('button',{type:'button',disabled:i===items.length-1,onClick:()=>this.move(i,1)},'↓'),
            h('button',{type:'button',onClick:()=>this.props.onChange(items.filter((_,j)=>i!==j))},'削除'))))),
        h('p',{className:'vanilla-batch-warning'},'※ 従来の「個別追加・既存画像」に画像がある場合、その画像が表紙として優先されます。')
      );
    }
  }
  CMS.registerWidget('vanilla_trailer_paths', TrailerPaths);
})();
