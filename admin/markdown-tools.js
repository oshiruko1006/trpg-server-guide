/* Markdown toolbar for Decap CMS. Plain textarea preserves line breaks. */
(function () {
  'use strict';
  if (!window.CMS || !window.React) return;
  const React = window.React;
  const h = React.createElement;
  class MarkdownTools extends React.Component {
    constructor(props) {
      super(props);
      this.area = React.createRef();
      this.selection = null;
    }
    rememberSelection() {
      const el = this.area.current;
      if (el) this.selection = [el.selectionStart, el.selectionEnd];
    }
    format(kind) {
      const el = this.area.current;
      if (!el) return;
      const value = typeof this.props.value === 'string' ? this.props.value : String(this.props.value || '');
      const range = this.selection || [el.selectionStart, el.selectionEnd];
      let [start, end] = range;
      start = Math.max(0, Math.min(value.length, start));
      end = Math.max(start, Math.min(value.length, end));
      const selected = value.slice(start, end);
      let replacement, from = start, to = end;
      if (kind === 'bold' || kind === 'italic' || kind === 'link' || kind === 'underline') {
        const wrappers = {
          bold: ['**', '**', '太字'],
          italic: ['*', '*', '斜体'],
          underline: ['++', '++', '下線'],
          link: ['[', '](https://example.com)', 'リンク文字']
        };
        const [left, right, placeholder] = wrappers[kind];
        replacement = left + (selected || placeholder) + right;
      } else if (kind === 'smallMuted') {
        // Keep each line separate so the public Markdown renderer preserves line breaks.
        replacement = (selected || '補足テキスト').split('\n').map(line => line.trim() ? `{{small:${line}}}` : line).join('\n');
      } else if (['mint','sand','rose'].includes(kind)) {
        from = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
        to = value.indexOf('\n', end);
        if (to < 0) to = value.length;
        replacement = `:::${kind}\n${value.slice(from,to) || '囲みたい文章'}\n:::`;
      } else {
        const prefix = { h2: '## ', h3: '### ', ul: '- ', ol: '1. ' }[kind];
        if (!prefix) return;
        from = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
        to = value.indexOf('\n', end);
        if (to < 0) to = value.length;
        const block = value.slice(from, to);
        replacement = (block || '項目').split('\n').map(line => prefix + line).join('\n');
      }
      const result = value.slice(0, from) + replacement + value.slice(to);
      this.props.onChange(result);
      const caret = from + replacement.length;
      this.selection = [caret, caret];
      // Wait until React updates the controlled textarea.
      requestAnimationFrame(() => {
        const input = this.area.current;
        if (input) { input.focus(); input.setSelectionRange(caret, caret); }
      });
    }
    render() {
      const value = typeof this.props.value === 'string' ? this.props.value : String(this.props.value || '');
      const actions = [['bold', '太字'], ['italic', '斜体'], ['h2', '見出し'], ['h3', '小見出し'], ['ul', '箇条書き'], ['ol', '番号'], ['link', 'リンク'], ['mint','囲み・ミント'], ['sand','囲み・ベージュ'], ['underline','下線'], ['smallMuted','小文字＋薄文字']];
      return h('div', { className: 'vanilla-md-editor' },
        h('div', { className: 'vanilla-md-toolbar', role: 'toolbar', 'aria-label': 'Markdown装飾' },
          ...actions.map(([kind, label]) => h('button', {
            key: kind, type: 'button',
            onPointerDown: () => this.rememberSelection(),
            onMouseDown: e => e.preventDefault(),
            onClick: () => this.format(kind)
          }, label))),
        h('textarea', {
          ref: this.area, value, rows: 9, spellCheck: false,
          onSelect: () => this.rememberSelection(),
          onClick: () => this.rememberSelection(),
          onKeyUp: () => this.rememberSelection(),
          onChange: e => { this.selection = [e.target.selectionStart, e.target.selectionEnd]; this.props.onChange(e.target.value); },
          'aria-label': (this.props.field && this.props.field.get && this.props.field.get('label')) || '本文'
        }),
        h('p', { className: 'vanilla-md-help' }, '選択した文字に装飾を付けられます。改行はそのまま保存します。')
      );
    }
  }
  window.CMS.registerWidget('vanilla_markdown', MarkdownTools);
})();
