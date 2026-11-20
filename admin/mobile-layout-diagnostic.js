/* Read-only Decap CMS mobile layout diagnostic. No CMS styling or data changes. */
(function () {
  'use strict';
  if (!window.matchMedia || !window.matchMedia('(max-width: 767px)').matches) return;
  function start() {
    if (document.getElementById('vanilla-layout-diagnostic')) return;
    var btn = document.createElement('button');
    btn.id = 'vanilla-layout-diagnostic';
    btn.type = 'button';
    btn.textContent = '幅を診断';
    btn.setAttribute('aria-label', 'CMSの横幅を診断する');
    btn.style.cssText = 'position:fixed;left:12px;bottom:82px;z-index:2147483647;background:#285b50;color:white;border:2px solid white;border-radius:24px;padding:10px 15px;font:600 14px system-ui;box-shadow:0 2px 10px #0004;';
    btn.addEventListener('click', function () {
      var vw = Math.round(document.documentElement.clientWidth);
      var dw = Math.round(document.documentElement.scrollWidth);
      var items = [];
      document.querySelectorAll('body *').forEach(function (el) {
        if (el.closest('#vanilla-layout-diagnostic-panel')) return;
        var r = el.getBoundingClientRect();
        var cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || r.width < 2 || r.height < 2) return;
        if (r.width > vw + 25 || (r.right > vw + 25 && r.left < vw)) {
          var cls = typeof el.className === 'string' ? el.className : '';
          items.push({tag: el.tagName.toLowerCase(), cls: cls.slice(0, 100), width: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right), display: cs.display, minWidth: cs.minWidth});
        }
      });
      items.sort(function (a, b) { return b.width - a.width; });
      var lines = ['画面幅: ' + vw + 'px / 文書幅: ' + dw + 'px', 'はみ出し要素（幅の大きい順、最大12件）:'];
      items.slice(0, 12).forEach(function (x, i) { lines.push((i + 1) + '. ' + x.tag + ' .' + x.cls + ' / 幅' + x.width + ' 左' + x.left + ' 右' + x.right + ' / display=' + x.display + ' min-width=' + x.minWidth); });
      if (!items.length) lines.push('検出なし（画面の右側にある要素は別途確認が必要）');
      var old = document.getElementById('vanilla-layout-diagnostic-panel');
      if (old) old.remove();
      var panel = document.createElement('section');
      panel.id = 'vanilla-layout-diagnostic-panel';
      panel.style.cssText = 'position:fixed;inset:10% 5% 12%;z-index:2147483647;overflow:auto;background:white;color:#222;border:2px solid #285b50;border-radius:12px;padding:15px;box-shadow:0 0 0 100vmax #0008;font:13px/1.5 system-ui;';
      var heading = document.createElement('h2'); heading.textContent = 'CMS 横幅診断'; heading.style.cssText = 'font-size:18px;margin:0 0 8px;';
      var info = document.createElement('p'); info.textContent = '表示されるのは要素の幅とCSS名だけです。入力内容は取得しません。';
      var pre = document.createElement('pre'); pre.textContent = lines.join('\n'); pre.style.cssText = 'white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.6 monospace;';
      var copy = document.createElement('button'); copy.type = 'button'; copy.textContent = '診断結果をコピー'; copy.style.cssText = 'padding:9px;border-radius:8px;margin-right:8px;';
      copy.addEventListener('click', function () {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(lines.join('\n')).then(function () { copy.textContent = 'コピー済み'; }, function () { copy.textContent = 'コピー不可・スクショを送ってね'; });
        else copy.textContent = 'コピー不可・スクショを送ってね';
      });
      var close = document.createElement('button'); close.type = 'button'; close.textContent = '閉じる'; close.style.cssText = 'padding:9px;border-radius:8px;';
      close.addEventListener('click', function () { panel.remove(); });
      panel.append(heading, info, copy, close, pre); document.body.appendChild(panel);
    });
    document.body.appendChild(btn);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
