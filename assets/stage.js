/* POWERPLAY Workshop — the game stage: play a game in place, then edit it by hand. */
(function () {
  const KEY = "powerplay.playedits.v1";
  const FORMATS = ["Futsal", "Classic match", "Classic match tournament", "2v2 match tournament"];

  const $ = (sel) => document.querySelector(sel);
  let stage, frame, layer, tools, tip, chooser, titleEl, statusEl, openTab, fullBtn;
  let game = null;
  let parts = [];
  let editing = false;
  let tool = "";        // which piece the next tap places
  let dragging = null;  // { el, part, rect }

  const esc = (v) =>
    String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- storage ---------- */
  function readAll() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch (err) {
      return {};
    }
  }

  function load(gameId) {
    const list = readAll()[gameId];
    return Array.isArray(list) ? list : [];
  }

  function store() {
    if (!game) return;
    const all = readAll();
    all[game.id] = parts;
    localStorage.setItem(KEY, JSON.stringify(all));
  }

  /* ---------- pieces ---------- */
  function newPart(kind, x, y, label) {
    const part = {
      id: `${kind}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      kind,
      x: Math.max(8, Math.min(92, x)),
      y: Math.max(8, Math.min(92, y)),
      label: label || "",
    };
    if (kind === "selection") part.options = ["Team A", "Team B"];
    if (kind === "mode") part.on = true;
    if (kind === "box") part.body = "Say something here";
    return part;
  }

  const TAGS = { selection: "Selection", mode: "Mode", game: "Game", box: "Box" };

  function inner(part) {
    const tag = `<span class="part-tag" title="Drag to move">⠿ ${TAGS[part.kind]}</span>`;
    if (part.kind === "selection") {
      const opts = (part.options || []).map(
        (o, i) => `<button class="part-opt" type="button" data-opt="${i}" aria-pressed="${part.picked === i}">${esc(o)}</button>`
      );
      return `${tag}<strong class="part-title" contenteditable="false" spellcheck="false">${esc(part.label)}</strong>
        <div class="part-opts">${opts}<button class="part-opt part-add" type="button" data-addopt="1" title="Another option">+</button></div>`;
    }
    if (part.kind === "mode") {
      return `${tag}<strong class="part-title" contenteditable="false" spellcheck="false">${esc(part.label)}</strong>
        <button class="part-toggle" type="button" aria-pressed="${part.on !== false}">${part.on === false ? "Off" : "On"}</button>`;
    }
    if (part.kind === "game") {
      return `${tag}<strong class="part-title" contenteditable="false" spellcheck="false">${esc(part.label)}</strong>
        <span class="part-state">${part.picked ? "Chosen" : "Tap to choose"}</span>`;
    }
    return `${tag}<strong class="part-title" contenteditable="false" spellcheck="false">${esc(part.label)}</strong>
      <p class="part-body" contenteditable="false" spellcheck="false">${esc(part.body)}</p>`;
  }

  function draw() {
    if (!layer) return;
    layer.innerHTML = "";
    parts.forEach((part) => {
      const el = document.createElement("div");
      el.className = `pp-part pp-${part.kind}`;
      el.dataset.id = part.id;
      el.style.left = part.x + "%";
      el.style.top = part.y + "%";
      el.innerHTML = `<button class="part-del" type="button" data-del="1" aria-label="Remove this piece" title="Remove">×</button>${inner(part)}`;
      layer.appendChild(el);
    });
    layer.classList.toggle("is-empty", parts.length === 0);
  }

  function partById(id) {
    return parts.find((p) => p.id === id);
  }

  /* ---------- full screen ---------- */
  const FS_OUT =
    '<path d="M4 9V4h5M20 15v5h-5M20 9V4h-5M4 15v5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  const FS_IN =
    '<path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';

  const fsElement = () =>
    document.fullscreenElement || document.webkitFullscreenElement || null;

  function canFullScreen() {
    return !!(stage && (stage.requestFullscreen || stage.webkitRequestFullscreen));
  }

  function isFullScreen() {
    return !!stage && fsElement() === stage;
  }

  function requestFull() {
    if (!stage) return;
    const el = stage;
    const run = el.requestFullscreen || el.webkitRequestFullscreen;
    try {
      const done = run.call(el, { navigationUI: "hide" });
      if (done && done.catch) done.catch(() => {});
    } catch (err) {
      /* the browser refused (no user gesture, or unsupported): stay windowed */
    }
  }

  function exitFull() {
    if (!fsElement()) return;
    const run = document.exitFullscreen || document.webkitExitFullscreen;
    if (!run) return;
    try {
      const done = run.call(document);
      if (done && done.catch) done.catch(() => {});
    } catch (err) {
      /* nothing to undo */
    }
  }

  function paintFull() {
    if (!fullBtn) return;
    fullBtn.hidden = !canFullScreen();
    const on = isFullScreen();
    fullBtn.setAttribute("aria-pressed", String(on));
    fullBtn.title = on ? "Exit full screen (Esc)" : "Full screen";
    fullBtn.setAttribute("aria-label", fullBtn.title);
    const svg = fullBtn.querySelector("svg");
    if (svg) svg.innerHTML = on ? FS_IN : FS_OUT;
  }

  function toggleFull() {
    if (isFullScreen()) exitFull();
    else requestFull();
  }

  /* ---------- stage ---------- */
  function paintHeader() {
    titleEl.textContent = game ? game.title : "Game";
    statusEl.textContent = editing ? "Editing" : "Playing";
    stage.classList.toggle("is-editing", editing);
    tools.hidden = !editing;
    tip.hidden = true;
    if (openTab) {
      const href = game && game.build ? "" : game && game.url ? game.url : "";
      openTab.hidden = !href;
      if (href) openTab.href = href;
    }
    paintFull();
  }

  function applyEditable() {
    layer.querySelectorAll(".part-title, .part-body").forEach((n) => (n.contentEditable = editing ? "true" : "false"));
  }

  function exitEdit() {
    editing = false;
    tool = "";
    tools.querySelectorAll(".edit-tool[data-tool]").forEach((btn) => btn.classList.remove("is-active"));
    applyEditable();
    paintHeader();
  }

  function enterEdit() {
    editing = true;
    paintHeader();
    applyEditable();
    toast("Edit mode: add a piece, then tap where it goes.");
  }

  function place(kind, label, x, y) {
    parts.push(newPart(kind, x, y, label));
    store();
    draw();
    applyEditable();
  }

  function openModal() {
    if (!chooser) return;
    chooser.hidden = false;
    const first = chooser.querySelector("button[data-format]");
    if (first) requestAnimationFrame(() => first.focus({ preventScroll: true }));
  }

  function closeModal() {
    if (chooser) chooser.hidden = true;
  }

  function toast(msg, kind) {
    if (window.PowerplayApp && window.PowerplayApp.toast) window.PowerplayApp.toast(msg, kind);
  }

  function open(nextGame) {
    if (!stage || !nextGame) return;
    game = nextGame;
    parts = load(game.id);
    editing = false;
    tool = "";
    if (game.build) {
      frame.removeAttribute("src");
      frame.srcdoc = game.build;
    } else {
      frame.removeAttribute("srcdoc");
      frame.src = game.url || "about:blank";
    }
    stage.hidden = false;
    document.body.classList.add("locked");
    draw();
    paintHeader();
    if (!parts.length) toast("This stage is empty — press Edit to add pieces.");
    $("#stageClose").focus({ preventScroll: true });
  }

  function close() {
    if (!stage) return;
    exitFull();
    stage.hidden = true;
    document.body.classList.remove("locked");
    closeModal();
    if (frame) {
      frame.removeAttribute("srcdoc");
      frame.src = "about:blank";
    }
    game = null;
  }

  /* ---------- wiring ---------- */
  function onTool(kind) {
    tool = kind;
    tools.querySelectorAll(".edit-tool[data-tool]").forEach((btn) => btn.classList.toggle("is-active", btn.dataset.tool === kind));
    if (kind === "game") {
      openModal();
      tip.hidden = true;
    } else {
      tip.hidden = false;
      tip.textContent = `Tap where the ${kind} should go.`;
    }
  }

  function addGamePart(format) {
    closeModal();
    tool = "game";
    tools.querySelectorAll(".edit-tool[data-tool]").forEach((btn) => btn.classList.toggle("is-active", btn.dataset.tool === "game"));
    tip.hidden = false;
    tip.textContent = `Tap where the ${format} card should go.`;
    pendingFormat = format;
  }

  let pendingFormat = "";

  function onLayerClick(e) {
    if (!editing || !tool) return;
    const el = e.target.closest(".pp-part");
    if (el) return; // a piece was hit, not empty space
    const rect = layer.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (tool === "selection") place("selection", "Selection", x, y);
    else if (tool === "mode") place("mode", "Mode", x, y);
    else if (tool === "box") place("box", "Box", x, y);
    else if (tool === "game") place("game", pendingFormat || FORMATS[0], x, y);
    pendingFormat = "";
    tool = "";
    tools.querySelectorAll(".edit-tool[data-tool]").forEach((btn) => btn.classList.remove("is-active"));
    tip.hidden = true;
  }

  function onPartClick(e) {
    const el = e.target.closest(".pp-part");
    if (!el) return;
    const part = partById(el.dataset.id);
    if (!part) return;

    if (e.target.closest("[data-del]")) {
      parts = parts.filter((p) => p.id !== part.id);
      store();
      draw();
      applyEditable();
      toast("Piece removed.");
      return;
    }
    if (editing) return;

    if (part.kind === "selection" && e.target.closest("[data-opt]")) {
      part.picked = Number(e.target.closest("[data-opt]").dataset.opt);
      store();
      draw();
      return;
    }
    if (part.kind === "selection" && e.target.closest("[data-addopt]")) {
      part.options.push(`Option ${part.options.length + 1}`);
      store();
      draw();
      return;
    }
    if (part.kind === "mode" && e.target.closest(".part-toggle")) {
      part.on = part.on === false;
      store();
      draw();
      return;
    }
    if (part.kind === "game") {
      part.picked = !part.picked;
      store();
      draw();
    }
  }

  function onEdit(e) {
    const node = e.target.closest(".part-title, .part-body");
    if (!editing || !node) return;
    const el = node.closest(".pp-part");
    const part = el && partById(el.dataset.id);
    if (!part) return;
    if (node.classList.contains("part-title")) part.label = node.textContent.trim().slice(0, 60) || TAGS[part.kind];
    else part.body = node.textContent.trim().slice(0, 200);
    store();
  }

  /* dragging a piece while editing */
  function onPointerDown(e) {
    if (!editing) return;
    const el = e.target.closest(".pp-part");
    if (!el) return;
    // buttons, options and the text fields keep their own taps; the tag row is the grip
    if (e.target.closest("[data-del], button, .part-opt, .part-title, .part-body")) return;
    const part = partById(el.dataset.id);
    if (!part) return;
    const rect = layer.getBoundingClientRect();
    dragging = { el, part, rect, id: e.pointerId };
    el.classList.add("is-dragging");
    el.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const x = ((e.clientX - dragging.rect.left) / dragging.rect.width) * 100;
    const y = ((e.clientY - dragging.rect.top) / dragging.rect.height) * 100;
    dragging.part.x = Math.max(6, Math.min(94, x));
    dragging.part.y = Math.max(6, Math.min(94, y));
    dragging.el.style.left = dragging.part.x + "%";
    dragging.el.style.top = dragging.part.y + "%";
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging.el.classList.remove("is-dragging");
    dragging = null;
    store();
  }

  function bind() {
    stage = $("#playStage");
    if (!stage) return;
    frame = $("#playFrame");
    layer = $("#editLayer");
    tools = $("#editTools");
    tip = $("#editTip");
    chooser = $("#formatModal");
    titleEl = $("#stageTitle");
    statusEl = $("#stageStatus");
    openTab = $("#stageOpenTab");
    fullBtn = $("#stageFull");

    $("#stageEdit").addEventListener("click", () => (editing ? exitEdit() : enterEdit()));
    $("#stageClose").addEventListener("click", close);
    if (fullBtn) fullBtn.addEventListener("click", toggleFull);
    document.addEventListener("fullscreenchange", paintFull);
    document.addEventListener("webkitfullscreenchange", paintFull);
    $("#editDone").addEventListener("click", exitEdit);
    tools.querySelectorAll(".edit-tool[data-tool]").forEach((btn) => btn.addEventListener("click", () => onTool(btn.dataset.tool)));
    layer.addEventListener("click", onLayerClick);
    layer.addEventListener("click", onPartClick);
    layer.addEventListener("input", onEdit);
    layer.addEventListener("blur", onEdit, true);
    layer.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    if (chooser) {
      chooser.querySelectorAll("[data-format]").forEach((btn) => btn.addEventListener("click", () => addGamePart(btn.dataset.format)));
      const closer = chooser.querySelector("[data-close-format]");
      if (closer) closer.addEventListener("click", closeModal);
      chooser.querySelector(".modal-backdrop")?.addEventListener("click", closeModal);
    }
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !stage || stage.hidden) return;
      // In full screen the first Esc only leaves full screen; the next one closes the game.
      if (isFullScreen()) { e.preventDefault(); exitFull(); return; }
      if (chooser && !chooser.hidden) closeModal();
      else if (editing) exitEdit();
      else close();
    });
  }

  function partCount(gameId) {
    return load(gameId).length;
  }

  window.PowerplayStage = { open, close, bind, partCount, FORMATS, KEY };
})();
