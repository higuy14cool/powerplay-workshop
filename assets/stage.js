/* POWERPLAY Workshop — the game stage: play a game in place, then edit it by hand. */
(function () {
  const KEY = "powerplay.playedits.v1";

  /* Each game has its own vocabulary: the pieces you add should read like the
     game's own teams, modes and match types, and wear its colours. */
  const GENERIC = {
    tool: { selection: "Add selection", mode: "Add mode", game: "Add game", box: "Add box" },
    label: { selection: "Selection", mode: "Mode", game: "Game", box: "Box" },
    options: [{ name: "Option A" }, { name: "Option B" }, { name: "Option C" }],
    modes: ["Mode"],
    formats: ["Mode 1", "Mode 2", "Mode 3"],
    box: "Say something here",
  };

  const THEMES = {
    prokick: {
      tool: { selection: "Add team", mode: "Add rule", game: "Add match", box: "Add note" },
      label: { selection: "Teams", mode: "Match rules", game: "Match", box: "Note" },
      options: [
        { name: "FC Chicken Wings", color: "#ff941f" },
        { name: "Dragonwolves FC", color: "#2878ff" },
        { name: "Bears FC", color: "#8b4a2b" },
        { name: "Argens", color: "#e5e7eb" },
        { name: "Apex United", color: "#ef4444" },
        { name: "Ironclad FC", color: "#94a3b8" },
        { name: "Vanguard Strikers", color: "#7dd3fc" },
        { name: "Crimson Athletic", color: "#3a3a3a" },
        { name: "Velocity Rovers", color: "#8b5cf6" },
        { name: "Titan Sporting", color: "#a855f7" },
        { name: "Real Sovereign", color: "#16a34a" },
        { name: "Phantom XI", color: "#800000" },
        { name: "Cookers FC", color: "#d62839" },
      ],
      modes: ["Futsal rules", "Golden goal", "Extra time", "Offside on", "Penalty shootout"],
      formats: ["Futsal", "Classic match", "Classic match tournament", "2v2 match tournament"],
      box: "Match note",
    },
    "dunkin-hoops": {
      tool: { selection: "Add team", mode: "Add rule", game: "Add match", box: "Add note" },
      label: { selection: "Teams", mode: "Court rules", game: "Match", box: "Note" },
      options: [
        { name: "Predators", color: "#f47721" },
        { name: "Tigers", color: "#efb52c" },
        { name: "Raptors", color: "#d7263d" },
        { name: "Bulls", color: "#ce1141" },
        { name: "Sixers", color: "#2879e8" },
        { name: "Warriors", color: "#1d428a" },
        { name: "Lakers", color: "#fdb927" },
        { name: "Celtics", color: "#007a33" },
      ],
      modes: ["Shot clock 24s", "Three-point contest", "Sudden death", "Streetball rules"],
      formats: ["1v1", "3v3", "5v5", "Three-point contest", "Tournament"],
      box: "Court note",
    },
    "hockey-showdown": {
      tool: { selection: "Add team", mode: "Add rule", game: "Add match", box: "Add note" },
      label: { selection: "Teams", mode: "Ice rules", game: "Match", box: "Note" },
      options: [
        { name: "Ice Wolves", color: "#2679bd" },
        { name: "Frostbite", color: "#76d9ef" },
        { name: "Detroit Icehawks", color: "#d6424b" },
        { name: "Arctic Predators", color: "#8a65bd" },
      ],
      modes: ["3 minute periods", "Sudden-death overtime", "Penalty shots", "No icing"],
      formats: ["Quick match", "1v1", "3v3", "Shootout", "Tournament"],
      box: "Ice note",
    },
    touchdown: {
      tool: { selection: "Add team", mode: "Add rule", game: "Add match", box: "Add note" },
      label: { selection: "Teams", mode: "Game rules", game: "Match", box: "Note" },
      options: [
        { name: "Dallas Cowboys", color: "#003594" },
        { name: "Arizona Cardinals", color: "#97233f" },
        { name: "Atlanta Falcons", color: "#a71930" },
        { name: "Baltimore Ravens", color: "#241773" },
        { name: "Buffalo Bills", color: "#00338d" },
        { name: "Chicago Bears", color: "#0b162a" },
        { name: "Green Bay Packers", color: "#203731" },
        { name: "Kansas City Chiefs", color: "#e31837" },
      ],
      modes: ["Franchise season", "Quick match", "Two-minute drill", "Playoffs"],
      formats: ["Quick match", "Franchise game", "Division round", "Conference championship"],
      box: "Play call note",
    },
    ballistic: {
      tool: { selection: "Add team", mode: "Add rule", game: "Add match", box: "Add note" },
      label: { selection: "Teams", mode: "Rules", game: "Match", box: "Note" },
      options: [
        { name: "All-Star", color: "#ffd23f" },
        { name: "Pro", color: "#e63946" },
        { name: "Rookie", color: "#4ade80" },
        { name: "Brute", color: "#a855f7" },
        { name: "Sniper", color: "#38bdf8" },
      ],
      modes: ["Classic", "Blitz", "Ironman"],
      formats: ["Classic", "Blitz", "Ironman", "3v3 elimination"],
      box: "Court note",
    },
    quiz: {
      tool: { selection: "Add answer", mode: "Add setting", game: "Add round", box: "Add question" },
      label: { selection: "Answers", mode: "Settings", game: "Round", box: "Question" },
      options: [{ name: "Answer A" }, { name: "Answer B" }, { name: "Answer C" }, { name: "Answer D" }],
      modes: ["Timer on", "Show hints", "Hard mode"],
      formats: ["Quick quiz", "Timed quiz", "Tournament", "Practice"],
      box: "Type the question here",
    },
  };

  const ALIASES = { hockey: "hockey-showdown", dunkin: "dunkin-hoops" };

  function themeFor(g) {
    if (!g) return GENERIC;
    const id = String(g.id || "").toLowerCase();
    if (THEMES[id]) return THEMES[id];
    if (ALIASES[id] && THEMES[ALIASES[id]]) return THEMES[ALIASES[id]];
    const text = `${g.title || ""} ${g.pitch || ""} ${g.genre || ""}`.toLowerCase();
    if (/basket|hoops|dunk/.test(text)) return THEMES["dunkin-hoops"];
    if (/hockey|puck|ice rink/.test(text)) return THEMES["hockey-showdown"];
    if (/dodgeball|ballistic/.test(text)) return THEMES.ballistic;
    if (/nfl|touchdown|franchise/.test(text)) return THEMES.touchdown;
    if (/football|soccer|kick|futsal|pitch/.test(text)) return THEMES.prokick;
    if (/quiz|trivia|question/.test(text)) return THEMES.quiz;
    return GENERIC;
  }

  const $ = (sel) => document.querySelector(sel);
  let stage, frame, layer, tools, tip, chooser, titleEl, statusEl, openTab, fullBtn;
  let theme = GENERIC;
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
      label: label || theme.label[kind] || "",
    };
    if (kind === "selection") {
      const first = theme.options.slice(0, 2);
      part.options = first.map((o) => o.name);
      part.colors = first.map((o) => o.color || "");
    }
    if (kind === "mode") {
      part.on = true;
      const used = new Set((parts || []).filter((p) => p.kind === "mode").map((p) => p.label));
      const next = theme.modes.find((m) => !used.has(m));
      part.label = next || theme.label.mode;
    }
    if (kind === "box") part.body = theme.box;
    return part;
  }

  const tags = () => ({ selection: theme.label.selection, mode: theme.label.mode, game: theme.label.game, box: theme.label.box });

  function nextOption(part) {
    const used = new Set(part.options || []);
    const next = theme.options.find((o) => !used.has(o.name));
    if (next) return next;
    return { name: theme === GENERIC ? `Option ${used.size + 1}` : `Team ${used.size + 1}` };
  }

  function renderOption(text, index, active, color) {
    const style = color ? ` style="--opt-color:${color}"` : "";
    const dot = color ? `<i class="part-dot"></i>` : "";
    return `<button class="part-opt" type="button" data-opt="${index}" aria-pressed="${active}"${style}>${dot}${esc(text)}</button>`;
  }

  function renderPart(part) {
    const tag = `<span class="part-tag" title="Drag to move">⠿ ${esc(tags()[part.kind])}</span>`;
    const label = `<strong class="part-title" contenteditable="false" spellcheck="false">${esc(part.label)}</strong>`;
    if (part.kind === "selection") {
      const list = (part.options || [])
        .map((o, i) => renderOption(o, i, part.picked === i, (part.colors || [])[i]))
        .join("");
      return `${tag}${label}<div class="part-opts">${list}<button class="part-opt part-add" type="button" data-addopt="1" title="Another option">+</button></div>`;
    }
    if (part.kind === "mode") {
      const on = part.on !== false;
      return `${tag}${label}<button class="part-toggle" type="button" aria-pressed="${on}">${on ? "On" : "Off"}</button>`;
    }
    if (part.kind === "game") {
      return `${tag}${label}<span class="part-state">${part.picked ? "Chosen" : "Tap to choose"}</span>`;
    }
    return `${tag}${label}<p class="part-body" contenteditable="false" spellcheck="false">${esc(part.body)}</p>`;
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
      el.innerHTML = `<button class="part-del" type="button" data-del="1" aria-label="Remove this piece" title="Remove">×</button>${renderPart(part)}`;
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

  function place(kind, x, y, label) {
    parts.push(newPart(kind, x, y, label));
    store();
    draw();
    applyEditable();
  }

  /* the toolbar and the match picker speak the game's language */
  function paintTheme() {
    tools.querySelectorAll(".edit-tool[data-tool]").forEach((btn) => {
      const k = btn.dataset.tool;
      if (theme.tool[k]) btn.textContent = theme.tool[k];
    });
    const list = chooser && chooser.querySelector(".format-list");
    if (list) {
      list.innerHTML = theme.formats
        .map((f) => `<button class="format-opt" type="button" data-format="${esc(f)}">${esc(f)}</button>`)
        .join("");
      list.querySelectorAll("[data-format]").forEach((btn) =>
        btn.addEventListener("click", () => addGamePart(btn.dataset.format))
      );
    }
    const colors = (game && game.cover && game.cover.colors) || [];
    if (stage && colors[0]) stage.style.setProperty("--pp-accent", colors[0]);
    if (stage && colors[1]) stage.style.setProperty("--pp-accent-2", colors[1]);
    const head = chooser && chooser.querySelector("#formatTitle");
    if (head) head.textContent = theme === GENERIC ? "Which game?" : `Which ${theme.label.game.toLowerCase()}?`;
    const sub = chooser && chooser.querySelector(".format-card .muted");
    if (sub) sub.textContent = theme === GENERIC ? "Pick the match you want on this stage." : `${game ? game.title : "This game"} — pick what goes on the stage.`;
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
    theme = themeFor(game);
    paintTheme();
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
      const what = { selection: theme.label.selection.toLowerCase(), mode: "rule", box: "note" }[kind] || kind;
      tip.textContent = `Tap where the ${what} should go.`;
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
    if (tool === "selection") place("selection", x, y);
    else if (tool === "mode") place("mode", x, y);
    else if (tool === "box") place("box", x, y);
    else if (tool === "game") place("game", x, y, pendingFormat || theme.formats[0]);
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
    // another option is an edit, so it works in both modes
    if (part.kind === "selection" && e.target.closest("[data-addopt]")) {
      const next = nextOption(part);
      part.options.push(next.name);
      part.colors = (part.colors || []).slice(0, part.options.length - 1).concat(next.color || "");
      store();
      draw();
      applyEditable();
      return;
    }
    if (editing) return;

    if (part.kind === "selection" && e.target.closest("[data-opt]")) {
      part.picked = Number(e.target.closest("[data-opt]").dataset.opt);
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
    if (node.classList.contains("part-title")) part.label = node.textContent.trim().slice(0, 60) || tags()[part.kind];
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
      chooser.querySelectorAll("[data-close-format]").forEach((el) => el.addEventListener("click", closeModal));
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

  window.PowerplayStage = { open, close, bind, partCount, KEY, get FORMATS() { return theme.formats.slice(); }, themeFor };
})();
