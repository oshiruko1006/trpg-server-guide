/* Markdown toolbar for Decap CMS. Plain textarea preserves line breaks. */
(function () {
  'use strict';
  if (!window.CMS || !window.React) return;
  const React = window.React;
  const h = React.createElement;
  // Compact, accessible icons; the original Markdown actions stay unchanged.
  function toolbarIcon(kind) {
    const svg = (...children) => h('svg', {width:18,height:18,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true,focusable:'false'}, ...children);
    const path = d => h('path',{d});
    const glyph = (text,extra='') => h('span',{className:'vanilla-md-glyph '+extra,'aria-hidden':true},text);
    switch(kind) {
      case 'bold': return glyph('B','is-bold');
      case 'italic': return glyph('I','is-italic');
      case 'underline': return glyph('U','is-underline');
      case 'h2': return glyph('H1','is-heading');
      case 'h3': return glyph('H2','is-heading');
      case 'smallMuted': return glyph('Aa','is-small-muted');
      case 'ul': return svg(path('M9 6h11M9 12h11M9 18h11'),h('circle',{cx:4,cy:6,r:1,fill:'currentColor'}),h('circle',{cx:4,cy:12,r:1,fill:'currentColor'}),h('circle',{cx:4,cy:18,r:1,fill:'currentColor'}));
      case 'ol': return svg(path('M10 6h10M10 12h10M10 18h10M3 4l2-1v6M3 9h4M3 13c0-3 5-3 4 0l-4 4h4'));
      case 'link': return svg(path('M10 13a4 4 0 0 0 6 .4l4-4a4 4 0 0 0-5.7-5.7l-2 2M14 11a4 4 0 0 0-6-.4l-4 4a4 4 0 0 0 5.7 5.7l2-2'));
      case 'mint': case 'sand': return h('span',{className:'vanilla-md-swatch is-'+kind,'aria-hidden':true});
      default: return glyph('?');
    }
  }
  // One floating toolbar for the active mobile field. Mount it outside Decap's
  // clipped editor pane, but leave all editing and saving to the original widget.
  const mobile = window.matchMedia('(max-width: 767px), (pointer: coarse) and (max-width: 900px)');
  let activeEditor = null, floatingToolbar = null, frame = 0;
  function viewport() {
    const v = window.visualViewport;
    return {left:v?.offsetLeft || 0, top:v?.offsetTop || 0,
      width:v?.width || document.documentElement.clientWidth,
      height:v?.height || window.innerHeight};
  }
  function editorTop(area, v) {
    // The Decap control pane scrolls beneath its own editor header.
    for (let n = area.parentElement; n && n !== document.body; n = n.parentElement) {
      const style = window.getComputedStyle(n), rect = n.getBoundingClientRect();
      if (/(auto|scroll|overlay)/.test(style.overflowY) && rect.height > 100 &&
          rect.top <= v.top + 140 && rect.bottom > v.top) {
        return Math.max(v.top, rect.top);
      }
    }
    // The editor toolbar is positioned at the top of Decap's editor container.
    const header = document.querySelector('[class*="ToolbarContainer"]');
    const rect = header?.getBoundingClientRect();
    return rect && rect.top <= v.top + 10 && rect.bottom > v.top && rect.bottom < v.top + 150
      ? rect.bottom : v.top;
  }
  function deactivate(editor) {
    if (editor && editor !== activeEditor) return;
    activeEditor?.root.current?.classList.remove('vanilla-md-active');
    activeEditor = null;
    floatingToolbar?.remove();
    floatingToolbar = null;
  }
  function positionToolbar() {
    frame = 0;
    if (!activeEditor || !floatingToolbar) return;
    const area = activeEditor.area.current;
    if (!mobile.matches || !area?.isConnected) { deactivate(); return; }
    const v = viewport(), top = editorTop(area, v);
    // Keep the bar within the visible viewport even when the keyboard pans it.
    floatingToolbar.style.left = (v.left + 8) + 'px';
    floatingToolbar.style.top = (top + 4) + 'px';
    floatingToolbar.style.width = Math.max(0, v.width - 16) + 'px';
    floatingToolbar.hidden = v.height - (top - v.top) < 100;
    const root = activeEditor.root.current;
    if (root) {
      const rect = root.getBoundingClientRect();
      root.style.setProperty('--vanilla-md-visible-width',
        Math.max(100, v.left + v.width - Math.max(v.left, rect.left) - 12) + 'px');
    }
  }
  function scheduleToolbar() {
    if (activeEditor && !frame) frame = window.requestAnimationFrame(positionToolbar);
  }
  function activate(editor) {
    if (!mobile.matches) return;
    if (activeEditor === editor && floatingToolbar) { scheduleToolbar(); return; }
    deactivate();
    const original = editor.toolbar.current;
    if (!original) return;
    activeEditor = editor;
    editor.root.current?.classList.add('vanilla-md-active');
    const clone = original.cloneNode(true);
    clone.classList.add('vanilla-md-floating-toolbar');
    clone.setAttribute('aria-label', '編集中の文章の装飾');
    const originalButtons = [...original.querySelectorAll('button')];
    [...clone.querySelectorAll('button')].forEach((button, i) => {
      // Preserve the textarea selection before a toolbar tap can move focus.
      button.addEventListener('pointerdown', e => {
        if (activeEditor === editor) editor.rememberSelection();
        e.preventDefault();
      });
      button.addEventListener('mousedown', e => e.preventDefault());
      button.addEventListener('click', () => {
        if (activeEditor === editor && editor.area.current?.isConnected) originalButtons[i]?.click();
      });
    });
    floatingToolbar = clone;
    document.body.appendChild(clone);
    positionToolbar();
  }
  window.addEventListener('scroll', scheduleToolbar, true);
  window.addEventListener('resize', scheduleToolbar);
  window.visualViewport?.addEventListener('resize', scheduleToolbar);
  window.visualViewport?.addEventListener('scroll', scheduleToolbar);
  mobile.addEventListener?.('change', () => {
    if (!mobile.matches) deactivate();
    else scheduleToolbar();
  });
  document.addEventListener('focusin', e => {
    if (!activeEditor) return;
    if (!activeEditor.root.current?.contains(e.target) && !floatingToolbar?.contains(e.target)) deactivate();
  });
  document.addEventListener('pointerdown', e => {
    if (!activeEditor || activeEditor.root.current?.contains(e.target) || floatingToolbar?.contains(e.target)) return;
    // Scrolling the form must not dismiss the active toolbar; another control does.
    if (e.target.closest?.('button,a,input,select,textarea,[role="button"],[role="dialog"]')) deactivate();
  });
  class MarkdownTools extends React.Component {
    constructor(props) {
      super(props);
      this.area = React.createRef();
      this.root = React.createRef();
      this.toolbar = React.createRef();
      this.selection = null;
    }
    componentWillUnmount() { deactivate(this); }
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
        if (input) { input.focus({preventScroll: mobile.matches}); input.setSelectionRange(caret, caret); }
      });
    }
    render() {
      const value = typeof this.props.value === 'string' ? this.props.value : String(this.props.value || '');
      const actions = [['bold', '太字'], ['italic', '斜体'], ['h2', '見出し'], ['h3', '小見出し'], ['ul', '箇条書き'], ['ol', '番号'], ['link', 'リンク'], ['mint','囲み・ミント'], ['sand','囲み・ベージュ'], ['underline','下線'], ['smallMuted','小文字＋薄文字']];
      return h('div', { className: 'vanilla-md-editor', ref:this.root },
        h('div', { className: 'vanilla-md-toolbar', ref:this.toolbar, role: 'toolbar', 'aria-label': 'Markdown装飾' },
          ...actions.map(([kind, label]) => h('button', {
            key: kind, type: 'button', title: label, 'aria-label': label,
            onPointerDown: () => this.rememberSelection(),
            onMouseDown: e => e.preventDefault(),
            onClick: () => this.format(kind)
          }, toolbarIcon(kind)))),
        h('textarea', {
          ref: this.area, value, rows: 9, spellCheck: false,
          onFocus: () => { this.rememberSelection(); activate(this); },
          onSelect: () => this.rememberSelection(),
          onClick: () => { this.rememberSelection(); activate(this); },
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
