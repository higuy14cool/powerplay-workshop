/* POWERPLAY Workshop — the game stage: play a game in place, then edit it by hand. */
(function () {
  const KEY = "powerplay.playedits.v1";

  /* Each game has its own vocabulary: the pieces you add should read like the
     game's own teams, modes and match types, and wear its colours. */
  /* Every game draws its teams, modes and chips its own way, so each theme
     carries both a vocabulary and a look: shapes, colours and weights taken
     from the game itself (round club badges, square emblems, grey chips...). */
  const DEFAULT_LOOK = {
    selection: {
      layout: "row",
      badge: "dot",
      bg: "#1b2430",
      border: "#38424f",
      radius: "10px",
      text: "#e8eef7",
      muted: "#93a5bb",
      selected: "#84cc16",
      pad: "8px 10px",
    },
    mode: {
      bg: "#16233a",
      border: "#465a76",
      radius: "12px",
      pad: "12px",
      text: "#e8eef7",
      muted: "#93a5bb",
      selected: "#84cc16",
      emoji: "20px",
    },
  };

  const EMOJI = ["⭐", "🏆", "👥", "🌐", "🏟️", "⚡", "🥅", "📅", "🏀", "🏒", "🏈", "🎯", "🔥", "👑", "💎", "🚀", "🎮", "🛡️", "🎲", "📣", "🥇", "🎉"];

  const GENERIC = {
    tool: { selection: "Add selection", mode: "Add mode", game: "Add game", box: "Add box" },
    label: { selection: "Selection", mode: "Mode", game: "Game", box: "Box" },
    modeTitle: "Modes",
    options: [{ name: "Option A" }, { name: "Option B" }, { name: "Option C" }],
    modes: [{ emoji: "⭐", name: "Mode 1", sub: "" }, { emoji: "🏆", name: "Mode 2", sub: "" }],
    formats: ["Mode 1", "Mode 2", "Mode 3"],
    box: "Say something here",
    look: DEFAULT_LOOK,
  };

  const THEMES = {
    prokick: {
      tool: { selection: "Add selection", mode: "Add mode", game: "Add match", box: "Add note" },
      label: { selection: "Teams", mode: "Game modes", game: "Match", box: "Note" },
      modeTitle: "Game modes",
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
      modes: [
        { emoji: "⭐", name: "Bazel League", sub: "Bazel League teams" },
        { emoji: "🏆", name: "The Apex Cup Tournament", sub: "12 teams · group stage → knockouts → final" },
        { emoji: "👥", name: "2v2 Super League", sub: "Two players a side" },
        { emoji: "🌐", name: "Other", sub: "Friendly match · all clubs" },
        { emoji: "🏟️", name: "Classic Match", sub: "Play a full soccer match" },
        { emoji: "⚡", name: "Futsal", sub: "Fast indoor soccer" },
        { emoji: "🥅", name: "Penalties", sub: "Test your penalty skills" },
      ],
      formats: ["Futsal", "Classic match", "Classic match tournament", "2v2 match tournament"],
      box: "Match note",
      look: {
        /* ProKick's club tiles: dark green card, round club badge in club colours */
        selection: {
          layout: "tile",
          badge: "initials",
          bg: "#0e2418",
          border: "#2c5039",
          radius: "14px",
          text: "#f0fdf4",
          muted: "#7f9f8a",
          selected: "#d9ff54",
          pad: "12px 8px 10px",
        },
        /* ProKick's home mode cards */
        mode: {
          bg: "linear-gradient(145deg,#153522,#0d2116)",
          border: "#315840",
          radius: "18px",
          pad: "14px 12px",
          text: "#f0fdf4",
          muted: "#b5d4bf",
          selected: "#4ade80",
          emoji: "24px",
        },
      },
    },
    "dunkin-hoops": {
      tool: { selection: "Add selection", mode: "Add mode", game: "Add match", box: "Add note" },
      label: { selection: "Teams", mode: "Game modes", game: "Match", box: "Note" },
      modeTitle: "Game modes",
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
      modes: [
        { emoji: "🏀", name: "FRIENDLY MATCH", sub: "Pick any two teams and play a single game." },
        { emoji: "🏆", name: "TOURNAMENT", sub: "Pools of four, semis and a best-of-3 final." },
      ],
      formats: ["1v1", "3v3", "5v5", "Three-point contest", "Tournament"],
      box: "Court note",
      look: {
        /* Dunkin' picks: navy row with a round team-colour dot */
        selection: {
          layout: "row",
          badge: "dot",
          bg: "#16233a",
          border: "#3d506b",
          radius: "12px",
          text: "#e8eef7",
          muted: "#93a5bb",
          selected: "#ff974d",
          pad: "10px 12px",
        },
        mode: {
          bg: "#16233a",
          border: "#465a76",
          radius: "12px",
          pad: "12px",
          text: "#e8eef7",
          muted: "#93a5bb",
          selected: "#ffb057",
          emoji: "22px",
        },
      },
    },
    "hockey-showdown": {
      tool: { selection: "Add selection", mode: "Add mode", game: "Add match", box: "Add note" },
      label: { selection: "Teams", mode: "Game modes", game: "Match", box: "Note" },
      modeTitle: "Game modes",
      options: [
        { name: "Ice Wolves", color: "#2679bd" },
        { name: "Frostbite", color: "#76d9ef" },
        { name: "Detroit Icehawks", color: "#d6424b" },
        { name: "Arctic Predators", color: "#8a65bd" },
      ],
      modes: [
        { emoji: "🏒", name: "Quick Match", sub: "Drop the puck" },
        { emoji: "🏆", name: "Tournament", sub: "Four clubs, one trophy" },
        { emoji: "🥅", name: "Shootout", sub: "Best of five penalties" },
      ],
      formats: ["Quick match", "1v1", "3v3", "Shootout", "Tournament"],
      box: "Ice note",
      look: {
        /* Hockey's team cards: dark ice-blue card with a rounded-square emblem */
        selection: {
          layout: "tile",
          badge: "square",
          bg: "#0b2032",
          border: "#294c66",
          radius: "16px",
          text: "#eaf4fb",
          muted: "#a6c1d2",
          selected: "#29a8d8",
          pad: "14px 10px",
        },
        mode: {
          bg: "#0b2032",
          border: "#294c66",
          radius: "16px",
          pad: "14px",
          text: "#eaf4fb",
          muted: "#a6c1d2",
          selected: "#29a8d8",
          emoji: "22px",
        },
      },
    },
    touchdown: {
      tool: { selection: "Add selection", mode: "Add mode", game: "Add match", box: "Add note" },
      label: { selection: "Teams", mode: "Game modes", game: "Match", box: "Note" },
      modeTitle: "Game modes",
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
      modes: [
        { emoji: "🏈", name: "Franchise Challenge", sub: "Pick a club and chase the playoffs" },
        { emoji: "📅", name: "Season Schedule", sub: "17 games, one division" },
        { emoji: "🏆", name: "Playoffs", sub: "Win out or go home" },
      ],
      formats: ["Quick match", "Franchise game", "Division round", "Conference championship"],
      box: "Play call note",
      look: {
        /* Touchdown's team rows: navy row with a round logo chip, orange when picked */
        selection: {
          layout: "row",
          badge: "initials",
          bg: "#0b1b2e",
          border: "#29435e",
          radius: "10px",
          text: "#ffffff",
          muted: "#9fb1c7",
          selected: "#f05a31",
          pad: "8px 10px",
        },
        mode: {
          bg: "#0b1b2e",
          border: "#29435e",
          radius: "10px",
          pad: "12px",
          text: "#ffffff",
          muted: "#9fb1c7",
          selected: "#f05a31",
          emoji: "20px",
        },
      },
    },
    ballistic: {
      tool: { selection: "Add selection", mode: "Add mode", game: "Add match", box: "Add note" },
      label: { selection: "Teams", mode: "Game modes", game: "Match", box: "Note" },
      modeTitle: "Game modes",
      options: [
        { name: "All-Star", color: "#ffd23f" },
        { name: "Pro", color: "#e63946" },
        { name: "Rookie", color: "#4ade80" },
        { name: "Brute", color: "#a855f7" },
        { name: "Sniper", color: "#38bdf8" },
      ],
      modes: [
        { emoji: "🎯", name: "Classic", sub: "Last team standing" },
        { emoji: "⚡", name: "Blitz", sub: "Faster throws, shorter rounds" },
        { emoji: "🛡️", name: "Ironman", sub: "No respawns" },
      ],
      formats: ["Classic", "Blitz", "Ironman", "3v3 elimination"],
      box: "Court note",
      look: {
        /* Ballistic's compact translucent tiles with a yellow pick */
        selection: {
          layout: "tile",
          badge: "dot",
          bg: "rgba(10,16,30,.55)",
          border: "rgba(255,255,255,.12)",
          radius: "11px",
          text: "#fff6dc",
          muted: "rgba(255,246,220,.5)",
          selected: "#ffd23f",
          pad: "10px 8px",
        },
        mode: {
          bg: "rgba(10,16,30,.55)",
          border: "rgba(255,255,255,.12)",
          radius: "11px",
          pad: "12px 10px",
          text: "#fff6dc",
          muted: "rgba(255,246,220,.5)",
          selected: "#ffd23f",
          emoji: "20px",
        },
      },
    },
    quiz: {
      tool: { selection: "Add selection", mode: "Add mode", game: "Add round", box: "Add question" },
      label: { selection: "Answers", mode: "Settings", game: "Round", box: "Question" },
      modeTitle: "Settings",
      options: [{ name: "Answer A" }, { name: "Answer B" }, { name: "Answer C" }, { name: "Answer D" }],
      modes: [
        { emoji: "⏱️", name: "Timer on", sub: "30 seconds a question" },
        { emoji: "💡", name: "Show hints", sub: "One hint per round" },
        { emoji: "🔥", name: "Hard mode", sub: "No second chances" },
      ],
      formats: ["Quick quiz", "Timed quiz", "Tournament", "Practice"],
      box: "Type the question here",
      look: {
        /* plain grey chips, no club badges */
        selection: {
          layout: "row",
          badge: "none",
          bg: "#20242c",
          border: "#3a4150",
          radius: "999px",
          text: "#e8eef7",
          muted: "#93a5bb",
          selected: "#84cc16",
          pad: "6px 10px",
        },
        mode: {
          bg: "#20242c",
          border: "#3a4150",
          radius: "12px",
          pad: "12px",
          text: "#e8eef7",
          muted: "#93a5bb",
          selected: "#84cc16",
          emoji: "18px",
        },
      },
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
  let emojiTarget = null; // { id, index } while an emoji palette is open

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
  function lookOf(kind) {
    const base = DEFAULT_LOOK[kind] || {};
    return Object.assign({}, base, (theme.look && theme.look[kind]) || {});
  }

  const initials = (name) =>
    String(name || "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();

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
      /* the whole mode list of the game, names and emoji included */
      part.modes = theme.modes.map((m) => ({ emoji: m.emoji || "⭐", name: m.name, sub: m.sub || "" }));
      part.picked = 0;
      part.label = theme.modeTitle || theme.label.mode;
    }
    if (kind === "box") part.body = theme.box;
    return part;
  }

  /* saved mode pieces from before the mode cards only had a label and a switch */
  function normalize(part) {
    if (part.kind === "mode" && !Array.isArray(part.modes)) {
      part.modes = theme.modes.map((m) => ({ emoji: m.emoji || "⭐", name: m.name, sub: m.sub || "" }));
      part.picked = part.on === false ? -1 : 0;
      part.label = theme.modeTitle || part.label || theme.label.mode;
      delete part.on;
    }
    return part;
  }

  const tags = () => ({ selection: theme.label.selection, mode: theme.label.mode, game: theme.label.game, box: theme.label.box });

  function nextOption(part) {
    const used = new Set(part.options || []);
    const next = theme.options.find((o) => !used.has(o.name));
    if (next) return next;
    return { name: theme === GENERIC ? `Option ${used.size + 1}` : `Team ${used.size + 1}` };
  }

  function renderBadge(text, color) {
    const l = lookOf("selection");
    if (l.badge === "none") return "";
    const shape = l.badge === "square" ? "is-square" : l.badge === "dot" ? "is-dot" : "is-circle";
    const label = l.badge === "dot" ? "" : esc(initials(text) || "•");
    const style = color ? ` style="--opt-color:${esc(color)}"` : "";
    return `<i class="pick-badge ${shape}"${style}>${label}</i>`;
  }

  function renderOption(text, index, active, color) {
    return `<span class="part-opt" role="button" tabindex="0" data-opt="${index}" aria-pressed="${!!active}">${renderBadge(text, color)}<b class="pick-name" data-optname="${index}" contenteditable="false" spellcheck="false">${esc(text)}</b></span>`;
  }

  function renderModeItem(part) {
    return (part.modes || [])
      .map(
        (m, i) => `<div class="pp-mode-item" role="button" tabindex="0" data-modeitem="${i}" aria-pressed="${part.picked === i}">
          <button class="mode-emoji" type="button" data-emoji="${i}" title="Change the emoji">${esc(m.emoji || "⭐")}</button>
          <span class="mode-text"><b class="mode-name" data-modename="${i}" contenteditable="false" spellcheck="false">${esc(m.name)}</b><small class="mode-sub" data-modesub="${i}" contenteditable="false" spellcheck="false">${esc(m.sub || "")}</small></span>
          <button class="mode-del" type="button" data-delmode="${i}" title="Remove this mode">×</button>
        </div>`
      )
      .join("");
  }

  function renderPart(part) {
    const tag = `<span class="part-tag" title="Drag to move">⠿ ${esc(tags()[part.kind])}</span>`;
    const label = `<strong class="part-title" contenteditable="false" spellcheck="false">${esc(part.label)}</strong>`;
    if (part.kind === "selection") {
      const list = (part.options || [])
        .map((o, i) => renderOption(o, i, part.picked === i, (part.colors || [])[i]))
        .join("");
      return `${tag}${label}<div class="part-opts">${list}<span class="part-opt part-add" role="button" tabindex="0" data-addopt="1" title="Another one">+</span></div>`;
    }
    if (part.kind === "mode") {
      const open = emojiTarget && emojiTarget.id === part.id;
      const palette = open
        ? `<div class="emoji-palette">${EMOJI.map((e) => `<button type="button" data-setemoji="${esc(e)}">${esc(e)}</button>`).join("")}</div>`
        : "";
      return `${tag}<div class="mode-card"><strong class="part-title mode-head" contenteditable="false" spellcheck="false">${esc(part.label)}</strong><div class="mode-items">${renderModeItem(part)}</div><button class="mode-add" type="button" data-addmode="1">+ Add mode</button></div>${palette}`;
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
      paintLook(el, part);
      el.innerHTML = `<button class="part-del" type="button" data-del="1" aria-label="Remove this piece" title="Remove">×</button>${renderPart(part)}`;
      layer.appendChild(el);
    });
    layer.classList.toggle("is-empty", parts.length === 0);
  }

  /* a piece wears the colours and shape its game uses for that kind of thing */
  function paintLook(el, part) {
    if (part.kind === "selection") {
      const l = lookOf("selection");
      el.dataset.layout = l.layout || "row";
      el.style.setProperty("--pick-bg", l.bg);
      el.style.setProperty("--pick-border", l.border);
      el.style.setProperty("--pick-radius", l.radius);
      el.style.setProperty("--pick-text", l.text);
      el.style.setProperty("--pick-muted", l.muted);
      el.style.setProperty("--pick-selected", l.selected);
      el.style.setProperty("--pick-pad", l.pad);
    }
    if (part.kind === "mode") {
      const l = lookOf("mode");
      el.style.setProperty("--mode-bg", l.bg);
      el.style.setProperty("--mode-border", l.border);
      el.style.setProperty("--mode-radius", l.radius);
      el.style.setProperty("--mode-pad", l.pad);
      el.style.setProperty("--mode-text", l.text);
      el.style.setProperty("--mode-muted", l.muted);
      el.style.setProperty("--mode-selected", l.selected);
      el.style.setProperty("--mode-emoji", l.emoji);
    }
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
    layer
      .querySelectorAll(".part-title, .part-body, .pick-name, .mode-name, .mode-sub")
      .forEach((n) => (n.contentEditable = editing ? "true" : "false"));
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
    parts = load(game.id).map(normalize);
    emojiTarget = null;
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
    // the mode card: its name, its emoji and extra modes are edits
    if (part.kind === "mode") {
      const delBtn = e.target.closest("[data-delmode]");
      if (delBtn) {
        if (!editing) return;
        part.modes.splice(Number(delBtn.dataset.delmode), 1);
        if (part.picked >= part.modes.length) part.picked = part.modes.length - 1;
        emojiTarget = null;
        store();
        draw();
        applyEditable();
        return;
      }
      if (e.target.closest("[data-addmode]")) {
        if (!editing) return;
        part.modes.push({ emoji: "⭐", name: "New mode", sub: "Your own mode" });
        store();
        draw();
        applyEditable();
        return;
      }
      const emojiBtn = e.target.closest("[data-emoji]");
      if (emojiBtn) {
        if (!editing) return;
        const i = Number(emojiBtn.dataset.emoji);
        const same = emojiTarget && emojiTarget.id === part.id && emojiTarget.index === i;
        emojiTarget = same ? null : { id: part.id, index: i };
        draw();
        applyEditable();
        return;
      }
      const picked = e.target.closest("[data-setemoji]");
      if (picked && emojiTarget && emojiTarget.id === part.id) {
        if (part.modes[emojiTarget.index]) part.modes[emojiTarget.index].emoji = picked.dataset.setemoji;
        emojiTarget = null;
        store();
        draw();
        applyEditable();
        return;
      }
      if (editing) return;
      const item = e.target.closest("[data-modeitem]");
      if (item) {
        const i = Number(item.dataset.modeitem);
        part.picked = part.picked === i ? -1 : i;
        store();
        draw();
      }
      return;
    }

    if (editing) return;

    if (part.kind === "selection" && e.target.closest("[data-opt]")) {
      part.picked = Number(e.target.closest("[data-opt]").dataset.opt);
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
    const node = e.target.closest(".part-title, .part-body, .pick-name, .mode-name, .mode-sub");
    if (!editing || !node) return;
    const el = node.closest(".pp-part");
    const part = el && partById(el.dataset.id);
    if (!part) return;
    const text = node.textContent.trim();
    if (node.classList.contains("pick-name")) {
      const i = Number(node.dataset.optname);
      if (part.options && part.options[i] != null) part.options[i] = text.slice(0, 40) || `Option ${i + 1}`;
    } else if (node.classList.contains("mode-name")) {
      const i = Number(node.dataset.modename);
      if (part.modes && part.modes[i]) part.modes[i].name = text.slice(0, 48) || "Mode";
    } else if (node.classList.contains("mode-sub")) {
      const i = Number(node.dataset.modesub);
      if (part.modes && part.modes[i]) part.modes[i].sub = text.slice(0, 120);
    } else if (node.classList.contains("part-title")) {
      part.label = text.slice(0, 60) || tags()[part.kind];
    } else {
      part.body = text.slice(0, 200);
    }
    store();
  }

  /* a renamed pick needs its initials redrawn once the caret leaves */
  function onEditBlur(e) {
    if (!editing) return;
    if (!e.target.closest(".pick-name")) return;
    draw();
    applyEditable();
  }

  /* dragging a piece while editing */
  function onPointerDown(e) {
    if (!editing) return;
    const el = e.target.closest(".pp-part");
    if (!el) return;
    // buttons, options and the text fields keep their own taps; the tag row is the grip
    if (e.target.closest("[data-del], button, .part-opt, .part-title, .part-body, .pp-mode-item, .mode-text")) return;
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
    layer.addEventListener("blur", onEditBlur, true);
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
