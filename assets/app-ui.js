/* ============================================================
   POWERPLAY app — views, workers, chats, profile
   ============================================================ */
(function () {
  "use strict";

  const A = window.PowerplayAccounts;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = { view: "home", chatScope: "group", avatarDraft: null };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function initials(name) {
    return String(name || "?").replace(/[^a-z0-9]/gi, " ").trim().split(/\s+/).slice(0, 2)
      .map((w) => w[0]).join("").toUpperCase() || "?";
  }

  function avatarMarkup(user, cls) {
    const label = initials(user.username);
    const bg = user.avatar ? "" : ` style="background:${esc(user.color || "#b6ff3d")}"`;
    const inner = user.avatar
      ? `<img src="${esc(user.avatar)}" alt="">`
      : esc(label);
    return `<span class="avatar ${cls || ""}"${bg} data-uid="${esc(user.id)}">${inner}</span>`;
  }

  /* paint an existing .avatar element in place (keeps its listeners and id) */
  function paintAvatar(el, user) {
    if (!el || !user) return;
    el.style.background = user.avatar ? "transparent" : (user.color || "#b6ff3d");
    el.innerHTML = user.avatar ? `<img src="${esc(user.avatar)}" alt="">` : esc(initials(user.username));
  }

  function timeAgo(ts) {
    const secs = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (secs < 60) return "just now";
    const mins = Math.round(secs / 60);
    if (mins < 60) return mins + "m ago";
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function toast(text) {
    const el = $("#toast");
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 2600);
  }

  /* ---------- theme ---------- */
  function applyTheme() {
    const user = A.current();
    const theme = A.themeFor(user);
    const root = document.documentElement;
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--ink", theme.ink);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme.accent);
  }

  /* ---------- auth ---------- */
  function showApp() {
    const user = A.current();
    if (!user) {
      $("#loginScreen").hidden = false;
      $("#appShell").hidden = true;
      return;
    }
    $("#loginScreen").hidden = true;
    $("#appShell").hidden = false;
    applyTheme();
    paintMe();
    $$(".admin-only").forEach((el) => { el.hidden = user.role !== "admin"; });
    $("#assignForm").hidden = user.role !== "admin";
    setView("home");
  }

  function paintMe() {
    paintAvatar($("#meAvatar"), A.current());
  }

  /* ---------- navigation ---------- */
  function setView(view) {
    state.view = view;
    ["home", "workers", "profile"].forEach((v) => {
      const el = $("#view-" + v);
      if (el) el.hidden = v !== view;
    });
    if (view === "home") renderHome();
    if (view === "workers") renderWorkers();
    if (view === "profile") renderProfile();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- home ---------- */
  function renderHome() {
    const user = A.current();
    const admin = user.role === "admin";
    const all = A.allGames();
    const mine = admin ? all : all.filter((g) => (user.assigned || []).includes(g.id));

    $("#homeEyebrow").textContent = admin ? "// your workshop" : "// assigned to you";
    $("#homeTitle").textContent = admin ? "Your games" : "Your work";
    $("#homeNote").textContent = admin
      ? `${all.length} games in the workshop · assign work from the Workers tab.`
      : mine.length
        ? "Games your admin assigned to you."
        : "Nothing assigned yet. Your admin will send work here.";

    const grid = $("#appGameGrid");
    grid.innerHTML = mine.map((game) => {
      const owners = A.assignedTo(game.id).filter((u) => u.role === "worker");
      const who = owners.length
        ? owners.map((u) => esc(u.username)).join(", ")
        : admin ? "unassigned" : "";
      return `
        <article class="game-card" data-game="${esc(game.id)}">
          <div class="game-art">
            ${game.cover && game.cover.image
              ? `<img src="${esc(game.cover.image)}" alt="${esc(game.title)} cover" loading="lazy">`
              : `<span class="fallback">${esc(game.genre)}</span>`}
          </div>
          <div class="game-body">
            <div class="game-top">
              <h3>${esc(game.title)}</h3>
              <span class="tag">${esc(game.genre)}</span>
            </div>
            <p>${esc(game.pitch)}</p>
            <div class="game-foot">
              <span class="who">${who ? "on it: " + who : esc(game.status)}</span>
              ${game.url ? `<a class="btn btn-ghost btn-small" href="${esc(game.url)}" target="_blank" rel="noopener">Play</a>` : ""}
              ${admin ? `<button class="btn btn-ghost btn-small" data-assign="${esc(game.id)}" type="button">Assign</button>` : ""}
            </div>
          </div>
        </article>`;
    }).join("");

    $("#appGameEmpty").hidden = mine.length > 0;
    $("#appGameEmpty").textContent = admin
      ? "No games yet — use New game to add one."
      : "No assigned games yet.";
  }

  /* ---------- workers ---------- */
  function renderWorkers() {
    const user = A.current();
    const admin = user.role === "admin";
    const people = A.users();
    const workers = people.filter((u) => u.role === "worker");
    const games = A.allGames();

    $("#workersNote").textContent = admin
      ? "Assign games, then talk it through in the group or a private chat."
      : "Chat with your admin and see what you're working on.";
    $("#assignCount").textContent = String(games.filter((g) => A.assignedTo(g.id).length).length);
    $("#teamCount").textContent = String(people.length);

    /* assignment list */
    const rows = [];
    games.forEach((game) => {
      A.assignedTo(game.id).forEach((person) => {
        rows.push(`
          <li>
            <span class="tag accent">${esc(game.genre)}</span>
            <span class="grow"><strong>${esc(game.title)}</strong><small>${esc(person.username)} · ${esc(A.ROLE_LABEL[person.role])}</small></span>
            ${admin ? `<button class="mini-btn" data-unassign="${esc(game.id)}" data-uid="${esc(person.id)}" type="button">Remove</button>` : ""}
          </li>`);
      });
    });
    $("#assignList").innerHTML = rows.join("");
    $("#assignEmpty").hidden = rows.length > 0;

    /* assign form */
    const gameSelect = $("#assignGame");
    const workerSelect = $("#assignWorker");
    gameSelect.innerHTML = games.map((g) => `<option value="${esc(g.id)}">${esc(g.title)}</option>`).join("");
    workerSelect.innerHTML = workers.length
      ? workers.map((w) => `<option value="${esc(w.id)}">${esc(w.username)}</option>`).join("")
      : `<option value="">No workers yet</option>`;
    $("#assignForm").querySelector("button").disabled = !workers.length;

    /* team */
    $("#teamList").innerHTML = people.map((person) => `
      <li>
        ${avatarMarkup(person)}
        <span class="grow">
          <strong>${esc(person.username)}${person.id === user.id ? " (you)" : ""}</strong>
          <small>${esc(A.ROLE_LABEL[person.role])} · ${(person.assigned || []).length} assigned</small>
        </span>
        ${admin && person.id !== user.id && person.role === "worker"
          ? `<button class="btn btn-ghost btn-small" data-dm="${esc(person.id)}" type="button">Chat</button>
             <button class="mini-btn" data-remove="${esc(person.id)}" type="button">Remove</button>`
          : ""}
      </li>`).join("");

    renderChatTabs();
    renderChatLog();
  }

  function renderChatTabs() {
    const user = A.current();
    const scopes = A.visibleScopes(user);
    if (!scopes.some((s) => s.id === state.chatScope)) state.chatScope = "group";
    $("#chatTabs").innerHTML = scopes.map((s) => `
      <button class="chat-tab ${s.id === state.chatScope ? "is-active" : ""}" data-scope="${esc(s.id)}" type="button">
        ${s.kind === "group" ? "Group" : esc(s.label)}
      </button>`).join("");
  }

  function renderChatLog() {
    const user = A.current();
    const scope = state.chatScope;
    const log = $("#chatLog");
    const msgs = A.messages(scope);
    if (!msgs.length) {
      log.innerHTML = `<p class="empty-note">No messages yet. Say hello.</p>`;
      return;
    }
    log.innerHTML = msgs.map((m) => {
      const author = A.users().find((u) => u.id === m.from) || { username: "Removed", color: "#8e93a8" };
      const mine = m.from === user.id;
      return `
        <div class="msg ${mine ? "mine" : ""}">
          ${avatarMarkup(author)}
          <div class="bubble">
            <span class="meta">${esc(mine ? "You" : author.username)} · ${timeAgo(m.at)}</span>
            ${esc(m.text)}
          </div>
        </div>`;
    }).join("");
    log.scrollTop = log.scrollHeight;
  }

  /* ---------- profile ---------- */
  function renderProfile() {
    const user = A.current();
    state.avatarDraft = user.avatar || null;
    paintAvatar($("#avatarPreview"), { ...user, avatar: state.avatarDraft });

    $("#profileUser").value = user.username;
    $("#profilePass").value = user.passcode;
    $("#profileRole").textContent = `${A.ROLE_LABEL[user.role]} account`;
    $("#profileError").hidden = true;

    $("#swatches").innerHTML = Object.entries(A.THEMES).map(([id, theme]) => `
      <button class="swatch ${user.theme === id ? "is-active" : ""}" data-theme="${id}"
        style="background:${theme.accent}" type="button" aria-label="${id} theme"></button>`).join("");
    $("#customAccent").value = user.customAccent || A.themeFor(user).accent;
  }

  /* ---------- modals ---------- */
  function openModal(name) {
    const el = $("#" + name + "Modal");
    if (!el) return;
    el.hidden = false;
    const first = el.querySelector("input, select, textarea, button");
    if (first) setTimeout(() => first.focus(), 40);
  }

  function closeModal(name) {
    const el = $("#" + name + "Modal");
    if (el) el.hidden = true;
  }

  function closeAll() {
    $$(".modal").forEach((m) => { m.hidden = true; });
  }

  /* ---------- image resize ---------- */
  function readAvatar(file, done) {
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast("Pick an image file."); return; }
    if (file.size > 8 * 1024 * 1024) { toast("That image is too large (max 8 MB)."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 160;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const side = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        done(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => toast("That image could not be read.");
      img.src = reader.result;
    };
    reader.onerror = () => toast("That image could not be read.");
    reader.readAsDataURL(file);
  }

  /* ---------- events ---------- */
  function bind() {
    $("#loginForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const result = A.login($("#loginUser").value, $("#loginPass").value);
      const error = $("#loginError");
      if (!result.ok) {
        error.textContent = result.error;
        error.hidden = false;
        return;
      }
      error.hidden = true;
      $("#loginForm").reset();
      showApp();
      toast(`Welcome back, ${result.user.username}`);
    });

    $("#navLogout").addEventListener("click", () => {
      A.logout();
      closeAll();
      showApp();
      $("#loginScreen").hidden = false;
    });

    $("#navWorkers").addEventListener("click", () => setView("workers"));
    $("#navAddPerson").addEventListener("click", () => {
      $("#personForm").reset();
      $("#personError").hidden = true;
      openModal("person");
    });
    $("#navAddGame").addEventListener("click", () => {
      $("#gameForm").reset();
      $("#gameError").hidden = true;
      openModal("game");
    });
    $("#meBtn").addEventListener("click", () => setView("profile"));
    $$("[data-view]").forEach((el) => el.addEventListener("click", (e) => {
      e.preventDefault();
      setView(el.dataset.view || "home");
    }));

    $$("[data-close]").forEach((el) => el.addEventListener("click", () => closeModal(el.dataset.close)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });

    /* add person */
    $("#personForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const res = A.addPerson({
        username: $("#personUser").value,
        passcode: $("#personPass").value,
        role: $("#personRole").value,
      });
      const error = $("#personError");
      if (!res.ok) {
        error.textContent = res.error;
        error.hidden = false;
        return;
      }
      closeModal("person");
      renderWorkers();
      renderHome();
      toast(`${res.user.username} added as ${A.ROLE_LABEL[res.user.role].toLowerCase()}.`);
    });

    /* new game */
    $("#gameForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const res = A.addGame({
        title: $("#gameTitleInput").value,
        genre: $("#gameGenre").value,
        pitch: $("#gamePitch").value,
      });
      const error = $("#gameError");
      if (!res.ok) {
        error.textContent = res.error;
        error.hidden = false;
        return;
      }
      closeModal("game");
      renderHome();
      renderWorkers();
      toast(`“${res.game.title}” added.`);
    });

    /* assign form */
    $("#assignForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const res = A.assign($("#assignGame").value, $("#assignWorker").value);
      if (!res.ok) { toast(res.error); return; }
      renderWorkers();
      renderHome();
      toast(`${res.game.title} → ${res.user.username}`);
    });

    /* delegated worker-page actions */
    $("#view-workers").addEventListener("click", (e) => {
      const tab = e.target.closest("[data-scope]");
      if (tab) {
        state.chatScope = tab.dataset.scope;
        renderChatTabs();
        renderChatLog();
        return;
      }
      const dm = e.target.closest("[data-dm]");
      if (dm) {
        state.chatScope = dm.dataset.dm;
        renderChatTabs();
        renderChatLog();
        return;
      }
      const un = e.target.closest("[data-unassign]");
      if (un) {
        A.unassign(un.dataset.unassign, un.dataset.uid);
        renderWorkers();
        renderHome();
        toast("Assignment removed.");
        return;
      }
      const rm = e.target.closest("[data-remove]");
      if (rm) {
        const person = A.users().find((u) => u.id === rm.dataset.remove);
        if (!person) return;
        if (!window.confirm(`Remove ${person.username}? Their assignments and chats go too.`)) return;
        const res = A.removePerson(person.id);
        if (!res.ok) { toast(res.error); return; }
        renderWorkers();
        renderHome();
        toast(`${person.username} removed.`);
      }
    });

    /* home: assign shortcut */
    $("#view-home").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-assign]");
      if (!btn) return;
      setView("workers");
      const select = $("#assignGame");
      if (select) {
        select.value = btn.dataset.assign;
        select.focus();
      }
      toast("Pick a worker, then press Assign.");
    });

    /* chat */
    $("#chatForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = $("#chatInput");
      const res = A.sendMessage(state.chatScope, input.value);
      if (!res.ok) { if (res.error) toast(res.error); return; }
      input.value = "";
      renderChatLog();
    });

    /* profile */
    $("#profileForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const res = A.updateProfile({ username: $("#profileUser").value, passcode: $("#profilePass").value });
      const error = $("#profileError");
      if (!res.ok) {
        error.textContent = res.error;
        error.hidden = false;
        return;
      }
      error.hidden = true;
      paintMe();
      renderHome();
      toast("Profile saved.");
    });

    $("#avatarFile").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      readAvatar(file, (dataUrl) => {
        A.setAvatar(dataUrl);
        state.avatarDraft = dataUrl;
        renderProfile();
        paintMe();
        toast("Picture updated.");
      });
      e.target.value = "";
    });

    $("#avatarClear").addEventListener("click", () => {
      A.setAvatar(null);
      state.avatarDraft = null;
      renderProfile();
      paintMe();
      toast("Picture removed.");
    });

    $("#swatches").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-theme]");
      if (!btn) return;
      A.setTheme(btn.dataset.theme, null);
      applyTheme();
      renderProfile();
    });

    $("#customAccent").addEventListener("input", (e) => {
      A.setTheme(null, e.target.value);
      applyTheme();
      $$("#swatches .swatch").forEach((s) => s.classList.remove("is-active"));
    });

    $("#resetTheme").addEventListener("click", () => {
      A.setTheme("lime", null);
      applyTheme();
      renderProfile();
      toast("Back to lime.");
    });
  }

  bind();
  showApp();
})();
