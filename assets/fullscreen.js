/* Full screen: the Architect chat, or the blueprint (plan / code / preview), can fill the window. */
(function () {
  "use strict";

  var TARGETS = {
    chat: function () { return document.querySelector(".chat-panel"); },
    blueprint: function () { return document.getElementById("blueprintPanel"); },
    split: function () { return document.querySelector(".architect-grid"); }
  };

  // Narrower arrow corners when expanded, wider when collapsed.
  var ICON_OUT =
    '<path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" ' +
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
  var ICON_IN =
    '<path d="M9 4v4a1 1 0 0 1-1 1H4M20 9h-4a1 1 0 0 1-1-1V4M15 20v-4a1 1 0 0 1 1-1h4M4 15h4a1 1 0 0 1 1 1v4" ' +
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';

  let open = null; // { targetName, target, button }

  function buttons() {
    return Array.prototype.slice.call(document.querySelectorAll('.js-fullscreen'));
  }

  function paint() {
    buttons().forEach(function (btn) {
      const active = !!open && open.targetName === btn.dataset.fs;
      btn.setAttribute('aria-pressed', String(active));
      const label = btn.dataset.fs === 'chat' ? 'chat'
        : btn.dataset.fs === 'split' ? 'chat and blueprint'
        : 'code, preview and plan';
      btn.title = active ? 'Exit full screen (Esc)' : 'Full screen ' + label;
      btn.setAttribute('aria-label', btn.title);
      const svg = btn.querySelector('svg');
      if (svg) svg.innerHTML = active ? ICON_IN : ICON_OUT;
    });
  }

  function close() {
    if (!open) return;
    open.target.classList.remove('pp-fullscreen', 'pp-split');
    document.body.classList.remove('pp-fs');
    const previous = open.button;
    open = null;
    paint();
    if (previous && previous.focus) previous.focus();
  }

  function openTo(btn) {
    const target = (TARGETS[btn.dataset.fs] || function () { return null; })();
    if (!target) return;
    if (open && open.target === target) { close(); return; }
    close();
    target.classList.add(btn.dataset.fs === 'split' ? 'pp-split' : 'pp-fullscreen');
    document.body.classList.add('pp-fs');
    open = { targetName: btn.dataset.fs, target: target, button: btn };
    paint();
    target.querySelectorAll('.chat-log, .bp-body').forEach(function (scroller) {
      scroller.scrollTo({ top: scroller.scrollHeight });
    });
  }

  document.addEventListener('click', function (event) {
    const btn = event.target.closest('.js-fullscreen');
    if (!btn) return;
    event.preventDefault();
    openTo(btn);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open) { e.preventDefault(); close(); }
  });

  paint();
  window.PowerplayFullscreen = { open: openTo, close: close, isOpen: function () { return !!open; } };
})();
