/* Decap CMS custom tags widget. Stores an array of strings; reads legacy {tag: ...} entries too. */
(function () {
  'use strict';
  // 専用の概要項目から自動生成するタグはここには表示しない。
  const categories = [
    ['描写・雰囲気', ['描写多め','RP中心','クラシック','シリアス','日常','青春','可愛い','かっこいい','熱い']],
    ['プレイ傾向', ['探索中心','戦闘有','謎解き有','選択重視','ダイス勝負有','協力型','NPC交流多め']],
    ['世界観', ['和風','ファンタジー','SF']],
    ['バトル・演出', ['王道バトル','スタイリッシュ','異能バトル','ヒロイック']],
    ['ジャンル', ['ホラー','エモ','エロ','エログロ','グロ','インモラル','近親相姦','バディ','うちよそ','NTR','SAN値回復','ロスト救済','恋愛','サスペンス','ミステリー','サイコホラー','因習村','コメディ']]
  ];
  const managedTags = new Set([
    '低ロス','中ロス','高ロス','クローズド','シティ','半クローズド',
    'KPC可','秘匿HO','公開HO','HOなし','新規限定','継続可','PvP有','PvP可能','PvP','秘匿'
  ]);
  const ReactAPI = window.React;
  if (!window.CMS || !ReactAPI) { console.error('Decap CMS tags widget: React/CMS unavailable'); return; }
  const h = ReactAPI.createElement;
  const aliases = {'戦闘あり':'戦闘有','謎解き':'謎解き有','PvP可能':'PvP有'};
  const normalize = value => {
    const input = value && typeof value.toJS === 'function' ? value.toJS() : value;
    return [...new Set((Array.isArray(input) ? input : []).map(x =>
      aliases[(typeof x === 'string' ? x : x && x.tag || '').trim()] || (typeof x === 'string' ? x : x && x.tag || '').trim()).filter(tag => tag && !managedTags.has(tag)))];
  };
  class Widget extends ReactAPI.Component {
    constructor(props) { super(props); this.state = {custom:''}; this.add = this.add.bind(this); }
    update(tags) { this.props.onChange(tags); }
    toggle(tag) { const tags=normalize(this.props.value); this.update(tags.includes(tag) ? tags.filter(t=>t!==tag) : [...tags,tag]); }
    add() { const tag=this.state.custom.trim(); if(!tag)return; const tags=normalize(this.props.value); if(!tags.includes(tag))this.update([...tags,tag]); this.setState({custom:''}); }
    render() {
      const selected=normalize(this.props.value);
      return h('div',{className:'vanilla-tags-widget'},
        ...categories.map(([label,tags])=>h('div',{className:'vanilla-tags-group',key:label},
          h('div',{className:'vanilla-tags-label'},label),
          h('div',{className:'vanilla-tags-buttons'},...tags.map(tag=>h('button',{
            key:tag,type:'button',className:'vanilla-tag-button'+(selected.includes(tag)?' is-selected':''),
            'aria-pressed':selected.includes(tag),onClick:()=>this.toggle(tag)
          },selected.includes(tag)?'✓ '+tag:tag))))),
        h('div',{className:'vanilla-tags-custom'},
          h('input',{type:'text',value:this.state.custom,placeholder:'その他のタグを入力',
            'aria-label':'その他のタグ',onChange:e=>this.setState({custom:e.target.value}),
            onKeyDown:e=>{if(e.key==='Enter'){e.preventDefault();this.add();}}}),
          h('button',{type:'button',onClick:this.add,disabled:!this.state.custom.trim()},'＋ 追加')),
        h('div',{className:'vanilla-tags-label'},'選択中のタグ（クリックで解除）'),
        h('div',{className:'vanilla-tags-buttons'},
          ...(selected.length?selected.map(tag=>h('button',{key:tag,type:'button',className:'vanilla-tag-button is-selected',onClick:()=>this.toggle(tag),'aria-label':tag+'を解除'},tag+' ×')):[h('span',{key:'empty',className:'vanilla-tags-empty'},'未選択')]))
      );
    }
  }
  window.CMS.registerWidget('vanilla_tags', Widget);
})();
