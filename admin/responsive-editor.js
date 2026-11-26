/* Decap 3.18 mobile editor layout experiment; no entry data or actions changed. */
(function () {
  'use strict';
  const media = window.matchMedia('(max-width: 767px), (pointer: coarse) and (max-width: 799px)');
  let shell = null, toolbar = null, observer = null, frame = 0;
  const position = el => window.getComputedStyle(el).position;
  function findShell(root) {
    // Discover the editor through its actual back-link / action / settings header.
    // The fallback does not depend on Emotion's generated class names.
    for (const a of root.querySelectorAll('a')) {
      const bar = a.parentElement, parent = bar?.parentElement;
      if (!parent || bar.firstElementChild !== a || bar.children.length !== 3 ||
          parent.firstElementChild !== bar || parent.children.length < 2) continue;
      const s = window.getComputedStyle(parent), b = window.getComputedStyle(bar);
      if (parent.classList.contains('vanilla-responsive-shell') ||
          (s.position === 'absolute' && s.overflowY === 'hidden' &&
           parseFloat(s.minWidth) >= 800 && b.position === 'absolute' &&
           b.display === 'flex' && parseFloat(b.minWidth) >= 800)) return [parent, bar];
    }
    return [null, null];
  }
  function measure() {
    if (!shell || !toolbar || !media.matches) return;
    const height = Math.ceil(toolbar.getBoundingClientRect().height);
    if (height > 0 && height < 350) shell.style.setProperty('--vanilla-responsive-header-height', height+'px');
  }
  function clear() {
    observer?.disconnect();
    observer = null;
    shell?.classList.remove('vanilla-responsive-shell');
    shell?.style.removeProperty('--vanilla-responsive-header-height');
    toolbar?.classList.remove('vanilla-responsive-header');
    shell = null; toolbar = null;
  }
  function apply() {
    frame = 0;
    if (!media.matches) { clear(); return; }
    const root = document.getElementById('nc-root');
    if (!root) { clear(); return; }
    const [next, bar] = findShell(root);
    if (next !== shell || bar !== toolbar) {
      clear();
      if (!next) return;
      shell = next; toolbar = bar;
      shell.classList.add('vanilla-responsive-shell', 'vanilla-cms-mobile-shell');
      toolbar.classList.add('vanilla-responsive-header');
      if (window.ResizeObserver) {
        observer = new window.ResizeObserver(measure);
        observer.observe(toolbar);
      }
    }
    measure();
  }
  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(apply);
  }
  new MutationObserver(schedule).observe(document.body, {childList:true, subtree:true});
  window.addEventListener('resize', schedule);
  media.addEventListener?.('change', schedule);
  schedule();
})();
