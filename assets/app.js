/* ============================================================
   POWERPLAY Workshop — library, covers, modals, persistence
   ============================================================ */
(function () {
  "use strict";

  const STORAGE_KEY = "powerplay.games.v3";
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- seed library ---------- */
  const SEED_GAMES = (window.PowerplayGames ? window.PowerplayGames.GAMES : []).map((g) => ({
    ...g, plays: 0, hours: 0, updated: "just added",
  }));

  const state = {
    games: [],
    filter: "all",
    search: "",
    activeGame: null,
  };

  /* ---------- storage ---------- */
  function loadGames() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (err) {
      console.warn("Library could not be read, using seed data.", err);
    }
    return null;
  }

  function saveGames() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.games));
    } catch (err) {
      console.warn("Could not save library.", err);
    }
  }

  /* ---------- procedural cover art ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function paintCover(canvas, game) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(rect.width, 120);
    const h = Math.max(rect.height, 80);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const rand = mulberry32(hashString(game.id || game.title));
    const [c1, c2] = (game.cover && game.cover.colors) || ["#b8ff3d", "#2dd4ef"];
    const type = (game.cover && game.cover.type) || "grid";

    // base wash
    const base = ctx.createLinearGradient(0, 0, w, h);
    base.addColorStop(0, "#0a0c14");
    base.addColorStop(1, "#0d1020");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    const glow = ctx.createRadialGradient(w * 0.72, h * 0.28, 0, w * 0.72, h * 0.28, Math.max(w, h) * 0.8);
    glow.addColorStop(0, hexA(c1, 0.35));
    glow.addColorStop(0.55, hexA(c2, 0.12));
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.lineCap = "round";
    switch (type) {
      case "grid": {
        const step = Math.max(16, w / 12);
        ctx.strokeStyle = hexA(c1, 0.22);
        ctx.lineWidth = 1;
        for (let x = -h; x < w + h; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + h * 0.55, h);
          ctx.stroke();
        }
        for (let y = 0; y < h; y += step) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        for (let i = 0; i < 5; i++) {
          const x = rand() * w * 0.9 + w * 0.05;
          const y = rand() * h * 0.8 + h * 0.1;
          const r = 4 + rand() * 10;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
          g.addColorStop(0, hexA(c1, 0.95));
          g.addColorStop(0.35, hexA(c1, 0.35));
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, r * 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#f6ffe0";
          ctx.beginPath();
          ctx.arc(x, y, r * 0.42, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case "speed": {
        ctx.globalAlpha = 0.55;
        for (let i = 0; i < 26; i++) {
          const y = rand() * h;
          const len = w * (0.25 + rand() * 0.7);
          const grad = ctx.createLinearGradient(w - len, y, w, y);
          grad.addColorStop(0, "transparent");
          grad.addColorStop(1, hexA(i % 3 ? c1 : c2, 0.9));
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1 + rand() * 2.4;
          ctx.beginPath();
          ctx.moveTo(w - len, y);
          ctx.lineTo(w, y + (rand() - 0.5) * 14);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = hexA(c2, 0.9);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.68);
        ctx.lineTo(w * 0.4, h * 0.55);
        ctx.lineTo(w, h * 0.62);
        ctx.stroke();
        break;
      }
      case "blocks": {
        const cols = 7;
        const size = w / (cols + 1.5);
        for (let i = 0; i < cols; i++) {
          const bh = (0.2 + rand() * 0.55) * h;
          ctx.fillStyle = i % 2 ? hexA(c1, 0.75) : hexA(c2, 0.7);
          ctx.fillRect(size * 0.7 + i * size, h - bh, size * 0.78, bh);
        }
        ctx.strokeStyle = hexA("#ffffff", 0.25);
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(0, h - (h / 4) * i);
          ctx.lineTo(w, h - (h / 4) * i);
          ctx.stroke();
        }
        break;
      }
      case "orbits": {
        const cx = w * 0.5;
        const cy = h * 0.52;
        for (let i = 0; i < 4; i++) {
          ctx.strokeStyle = hexA(i % 2 ? c1 : c2, 0.4);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, w * (0.12 + i * 0.1), h * (0.09 + i * 0.08), -0.35, 0, Math.PI * 2);
          ctx.stroke();
          const t = rand() * Math.PI * 2;
          const px = cx + Math.cos(t) * w * (0.12 + i * 0.1);
          const py = cy + Math.sin(t) * h * (0.09 + i * 0.08) - Math.sin(t) * 10;
          ctx.fillStyle = i % 2 ? c1 : c2;
          ctx.beginPath();
          ctx.arc(px, py, 3 + rand() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.1);
        core.addColorStop(0, "#ffffff");
        core.addColorStop(0.4, hexA(c1, 0.95));
        core.addColorStop(1, "transparent");
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(cx, cy, w * 0.1, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "waves": {
        for (let i = 0; i < 18; i++) {
          ctx.strokeStyle = hexA(i % 2 ? c1 : c2, 0.45);
          ctx.lineWidth = 1;
          ctx.beginPath();
          const amp = 4 + rand() * 12;
          for (let x = 0; x <= w; x += 4) {
            const y = h * 0.5 + Math.sin(x * 0.035 + i * 0.7) * amp * Math.exp(-Math.pow((x - w * 0.55) / (w * 0.5), 2));
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.strokeStyle = hexA(c1, 0.75);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(w * 0.55, h * 0.5, Math.min(w, h) * 0.18, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      default: {
        // tiles
        const s = w / 9;
        for (let y = 0; y < h; y += s) {
          for (let x = 0; x < w; x += s) {
            const v = rand();
            if (v > 0.55) {
              ctx.fillStyle = hexA(v > 0.82 ? c1 : c2, 0.18 + v * 0.35);
              const pad = s * 0.14;
              ctx.beginPath();
              const rr = s * 0.16;
              roundRect(ctx, x + pad, y + pad, s - pad * 2, s - pad * 2, rr);
              ctx.fill();
            }
          }
        }
        ctx.fillStyle = hexA(c1, 0.9);
        for (let i = 0; i < 3; i++) {
          const gx = Math.floor(rand() * 8) * s;
          const gy = Math.floor(rand() * 5) * s;
          ctx.beginPath();
          ctx.arc(gx + s / 2, gy + s / 2, s * 0.18, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function hexA(hex, alpha) {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  }

  /* ---------- rendering ---------- */
  function visibleGames() {
    const q = state.search.trim().toLowerCase();
    return state.games.filter((g) => {
      const inFilter = state.filter === "all" || g.genre === state.filter;
      const inSearch = !q || (g.title + " " + g.genre + " " + g.pitch).toLowerCase().includes(q);
      return inFilter && inSearch;
    });
  }

  function statusClass(status) {
    if (status === "In progress") return "status-progress";
    if (status === "Prototype") return "status-prototype";
    return "status-released";
  }

  function coverMarkup(game) {
    if (game.cover && game.cover.image) {
      return `<img class="cover-art" src="${escapeHtml(game.cover.image)}" alt="" loading="lazy" decoding="async">`;
    }
    return '<canvas aria-hidden="true"></canvas>';
  }

  function renderLibrary() {
    const grid = $("#gameGrid");
    const list = visibleGames();
    grid.innerHTML = "";
    $("#emptyState").hidden = list.length > 0;

    list.forEach((game) => {
      const card = document.createElement("article");
      card.className = "game-card";
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `${game.title}, ${game.genre}. Open details`);
      card.dataset.id = game.id;
      card.innerHTML = `
        <div class="game-cover">
          <span class="badge ${statusClass(game.status)}"><i></i>${escapeHtml(game.status)}</span>
          ${coverMarkup(game)}
          <span class="play-float" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7V5z" fill="currentColor"/></svg>
          </span>
        </div>
        <div class="game-body">
          <div class="game-title-row">
            <h3 class="game-title">${escapeHtml(game.title)}</h3>
            <span class="game-genre">${escapeHtml(game.genre)}</span>
          </div>
          <p class="game-pitch">${escapeHtml(game.pitch || "No pitch yet — still cooking.")}</p>
          <div class="game-stats">
            <span><b>${formatNum(game.plays || 0)}</b> plays</span>
            <span><b>${(game.hours || 0).toFixed(1)}h</b> played</span>
            <span>${escapeHtml(game.updated || "just now")}</span>
          </div>
        </div>`;
      grid.appendChild(card);
      requestAnimationFrame(() => {
        const canvas = card.querySelector("canvas");
        if (canvas) paintCover(canvas, game);
      });
      card.addEventListener("click", () => openGame(game.id));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openGame(game.id);
        }
      });
    });

    renderStats();
  }

  function renderStats() {
    const games = state.games;
    const plays = games.reduce((sum, g) => sum + (g.plays || 0), 0);
    const hours = games.reduce((sum, g) => sum + (g.hours || 0), 0);
    animateNumber($("#statGames"), games.length);
    animateNumber($("#statPlays"), plays);
    animateNumber($("#statHours"), Math.round(hours));
    const building = games.find((g) => g.status === "In progress");
    if (building) $("#statBuilding").textContent = building.title;
  }

  function animateNumber(el, target) {
    if (!el) return;
    const from = Number(el.textContent.replace(/[^\d]/g, "")) || 0;
    if (from === target) return;
    const start = performance.now();
    const duration = 480;
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (target - from) * eased).toLocaleString("en-US");
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function formatNum(n) {
    return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  /* ---------- game detail ---------- */
  function openGame(id) {
    const game = state.games.find((g) => g.id === id);
    if (!game) return;
    state.activeGame = game;
    $("#gameModalTitle").textContent = game.title;
    $("#gameModalTag").textContent = `// ${game.genre.toLowerCase()} · ${game.status.toLowerCase()}`;
    $("#gameModalDesc").textContent = game.pitch || "No pitch yet.";
    $("#gameModalMeta").innerHTML = `
      <div class="meta-cell"><span>plays</span><b>${(game.plays || 0).toLocaleString("en-US")}</b></div>
      <div class="meta-cell"><span>hours</span><b>${(game.hours || 0).toFixed(1)}</b></div>
      <div class="meta-cell"><span>engine</span><b>${game.url ? "HTML5" : "Prototype"}</b></div>
      <div class="meta-cell"><span>updated</span><b>${escapeHtml(game.updated || "just now")}</b></div>`;

    const art = $("#gameModalArt");
    art.innerHTML = coverMarkup(game);
    requestAnimationFrame(() => {
      const canvas = art.querySelector("canvas");
      if (canvas) paintCover(canvas, game);
    });

    const playBtn = $("#playGameBtn");
    playBtn.hidden = !game.url;
    $("#editGameBtn").hidden = false;
    $("#deleteGameBtn").hidden = false;

    openModal("game");
  }

  /* ---------- modals ---------- */
  const FOCUSABLE = 'button:not([hidden]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function openModal(name) {
    const modal = $("#" + name + "Modal");
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add("locked");
    const first = modal.querySelector(FOCUSABLE);
    if (first) requestAnimationFrame(() => first.focus({ preventScroll: true }));
  }

  function closeModal(name) {
    const modal = $("#" + name + "Modal");
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("locked");
  }

  function closeAllModals() {
    $$(".modal").forEach((m) => (m.hidden = true));
    document.body.classList.remove("locked");
  }

  /* ---------- toast ---------- */
  let toastTimer = null;
  function toast(message, kind) {
    const el = $("#toast");
    el.textContent = message;
    el.className = "toast" + (kind === "err" ? " err" : "");
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 2600);
  }

  /* ---------- add game ---------- */
  function openAdd() {
    const form = $("#addGameForm");
    form.reset();
    openModal("add");
    const title = form.elements.title;
    if (title) requestAnimationFrame(() => title.focus());
  }

  function handleAddSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const title = String(data.get("title") || "").trim();
    if (!title) return;
    if (state.games.some((g) => g.title.toLowerCase() === title.toLowerCase())) {
      toast("A game with that title is already in your library.", "err");
      return;
    }
    const palettes = [["#b8ff3d", "#2dd4ef"], ["#8b5cf6", "#ff5f9e"], ["#ffb020", "#ff5f9e"], ["#2dd4ef", "#8b5cf6"], ["#b8ff3d", "#ffb020"]];
    const types = ["grid", "speed", "blocks", "orbits", "waves", "tiles"];
    const game = {
      id: "game-" + Date.now().toString(36),
      title,
      genre: String(data.get("genre") || "Prototype"),
      status: String(data.get("status") || "Prototype"),
      pitch: String(data.get("desc") || "").trim() || "Fresh from the workshop floor.",
      plays: 0,
      hours: 0,
      updated: "just now",
      cover: {
        type: types[Math.floor(Math.random() * types.length)],
        colors: palettes[Math.floor(Math.random() * palettes.length)],
      },
    };
    state.games.unshift(game);
    saveGames();
    renderLibrary();
    closeModal("add");
    toast(`“${game.title}” added to your library.`);
  }

  function handleDelete() {
    const game = state.activeGame;
    if (!game) return;
    state.games = state.games.filter((g) => g.id !== game.id);
    saveGames();
    renderLibrary();
    closeModal("game");
    toast(`“${game.title}” removed.`);
  }

  /* ---------- nav ---------- */
  function initNav() {
    const sections = ["library", "architect", "about"].map((id) => document.getElementById(id)).filter(Boolean);
    const links = $$("[data-nav]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((l) => l.classList.toggle("is-active", l.dataset.nav === entry.target.id));
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => observer.observe(s));

    $$("[data-scroll]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = document.getElementById(btn.dataset.scroll);
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  /* ---------- init ---------- */
  function init() {
    const saved = loadGames();
    state.games = saved || SEED_GAMES.map((g) => ({ ...g }));
    if (!saved) saveGames();
    renderLibrary();
    initNav();

    $("#year").textContent = new Date().getFullYear();

    $("#searchGames").addEventListener("input", (e) => {
      state.search = e.target.value;
      renderLibrary();
    });

    $("#filters").addEventListener("click", (e) => {
      const chip = e.target.closest("[data-filter]");
      if (!chip) return;
      state.filter = chip.dataset.filter;
      $$("#filters .chip").forEach((c) => {
        const on = c === chip;
        c.classList.toggle("is-active", on);
        c.setAttribute("aria-selected", String(on));
      });
      renderLibrary();
    });

    $("#openAddGame").addEventListener("click", openAdd);
    $("#addGameForm").addEventListener("submit", handleAddSubmit);
    $("#deleteGameBtn").addEventListener("click", handleDelete);
    $("#editGameBtn").addEventListener("click", () => {
      const game = state.activeGame;
      closeModal("game");
      if (!game) return;
      if (window.PowerplayArchitect && window.PowerplayArchitect.editGame) {
        window.PowerplayArchitect.editGame(game);
      } else {
        document.getElementById("architect").scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    $("#playGameBtn").addEventListener("click", () => {
      const game = state.activeGame;
      closeModal("game");
      if (!game) return;
      if (game.url) window.open(game.url, "_blank", "noopener");
    });

    $$("[data-close]").forEach((el) => {
      el.addEventListener("click", () => closeModal(el.dataset.close));
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAllModals();
    });

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        $$("#gameGrid .game-card").forEach((card) => {
          const game = state.games.find((g) => g.id === card.dataset.id);
          const canvas = card.querySelector("canvas");
          if (game && canvas) paintCover(canvas, game);
        });
      }, 180);
    });

    // public hooks used by the game + architect modules
    window.PowerplayApp = {
      toast,
      openGame,
      escapeHtml,
      formatNum,
      getGames: () => state.games.slice(),
      addPlay(id) {
        const game = state.games.find((g) => g.id === id);
        if (!game) return;
        game.plays = (game.plays || 0) + 1;
        game.hours = Number(((game.hours || 0) + 1 / 60).toFixed(3));
        game.updated = "just now";
        saveGames();
        renderLibrary();
      },
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
