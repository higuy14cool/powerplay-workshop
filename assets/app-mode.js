/* ============================================================
   POWERPLAY app layer — sign-in gate and team tools on top of
   the website page (same markup, same styles).
   ============================================================ */
(function () {
  "use strict";

  const A = window.PowerplayAccounts;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const state = { scope: "group", avatarDraft: undefined };
  let booted = false;

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  function initials(name) {
    const parts = String(name || "?").replace(/[^a-zA-Z0-9 /]/g, " ").split(/[\s/]+/).filter(Boolean);
    return (parts[0] || "?").slice(0, 1).concat(parts[1] ? parts[1].slice(0, 1) : "").toUpperCase();
  }

  function hexToRgba(hex, alpha) {
    const h = String(hex || "#b6ff3d").replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
    const n = parseInt(full.slice(0, 6), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  }

  function paintAvatar(el, user) {
    if (!el) return;
    el.innerHTML = "";
    el.style.background = (user && user.color) || "";
    if (user && user.avatar) {
      const img = new Image();
      img.src = user.avatar;
      img.alt = "";
      el.appendChild(img);
    } else {
      el.textContent = initials(user ? user.username : "");
    }
  }

  function toast(msg, kind) {
    if (window.PowerplayApp && window.PowerplayApp.toast) window.PowerplayApp.toast(msg, kind);
  }

  function openModal(name) {
    const modal = $("#" + name + "Modal");
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add("locked");
    const first = modal.querySelector("input, select, textarea, button");
    if (first) requestAnimationFrame(() => first.focus({ preventScroll: true }));
  }

  function closeModal(name) {
    const modal = $("#" + name + "Modal");
    if (modal) modal.hidden = true;
    document.body.classList.remove("locked");
  }

  /* ---------- theme ---------- */
  function applyTheme(user) {
    const theme = A.themeFor(user);
    const root = document.documentElement.style;
    root.setProperty("--lime", theme.accent);
    root.setProperty("--lime-soft", hexToRgba(theme.accent, 0.14));
    root.setProperty("--accent", theme.accent);
  }

  /* ---------- sign in ---------- */
  function showLogin() {
    document.body.classList.add("is-locked");
    const shell = $("#appShell");
    if (shell) shell.setAttribute("inert", "");
    const screen = $("#loginScreen");
    if (screen) screen.hidden = false;
    const input = $("#loginUser");
    if (input) setTimeout(() => input.focus({ preventScroll: true }), 60);
  }

  function showApp(user) {
    document.body.classList.remove("is-locked");
    const shell = $("#appShell");
    if (shell) shell.removeAttribute("inert");
    if ($("#loginScreen")) $("#loginScreen").hidden = true;
    applyTheme(user);
    paintMe();
    applyRole(user);
    // Workers only see the games assigned to them where the library sits.
    if (window.PowerplayApp && window.PowerplayApp.setGameScope) {
      window.PowerplayApp.setGameScope(
        user.role === "worker"
          ? (game) => {
              const me = A.current();
              return !!me && (me.assigned || []).includes(game.id);
            }
          : null
      );
    }
    if (!booted) {
      booted = true;
      bindTeam();
      bindProfile();
    }
  }

  function paintMe() {
    const user = A.current();
    paintAvatar($("#meAvatar"), user);
    $("#meName").textContent = user ? user.username : "";
    const who = $("#statusWho");
    if (who) who.textContent = "Workshop online";
  }

  function applyRole(user) {
    const admin = !!user && user.role === "admin";
    $("#navAddPerson").hidden = !admin;
    $("#openAddGame").hidden = !admin;
  }

  function onLogin(event) {
    event.preventDefault();
    const user = $("#loginUser").value.trim();
    const pass = $("#loginPass").value;
    const result = A.login(user, pass);
    const error = $("#loginError");
    if (!result.ok) {
      error.textContent = result.error;
      error.hidden = false;
      $("#loginPass").value = "";
      $("#loginPass").focus();
      return;
    }
    error.hidden = true;
    $("#loginPass").value = "";
    showApp(result.user);
    toast(`Signed in as ${result.user.username}`, "ok");
  }

  function onLogout() {
    A.logout();
    window.location.reload();
  }

  /* ---------- profile ---------- */
  function renderProfile() {
    const user = A.current();
    if (!user) return;
    state.avatarDraft = user.avatar || null;
    paintAvatar($("#profileAvatar"), user);
    $("#profileUser").value = user.username;
    $("#profilePass").value = user.passcode;
    $("#profileError").hidden = true;
    renderSwatches(user);
    const custom = $("#customAccent");
    if (custom) custom.value = user.customAccent || A.themeFor(user).accent;
  }

  function renderSwatches(user) {
    const wrap = $("#swatches");
    if (!wrap) return;
    wrap.innerHTML = "";
    const active = user.theme === "custom" ? "custom" : user.theme;
    Object.keys(A.THEMES).forEach((id) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "swatch" + (id === active ? " is-active" : "");
      btn.style.background = A.THEMES[id].accent;
      btn.title = id[0].toUpperCase() + id.slice(1);
      btn.dataset.theme = id;
      wrap.appendChild(btn);
    });
  }

  function saveAvatarFile(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\//.test(file.type)) return toast("Pick an image file.", "err");
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 192;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const side = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        const data = canvas.toDataURL("image/jpeg", 0.82);
        const res = A.setAvatar(data);
        if (!res.ok) return toast("That picture is too big — try a smaller one.", "err");
        state.avatarDraft = data;
        paintAvatar($("#profileAvatar"), A.current());
        paintMe();
        toast("Picture updated", "ok");
      };
      img.onerror = () => toast("That image could not be read.", "err");
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function onProfileSubmit(event) {
    event.preventDefault();
    const res = A.updateProfile({ username: $("#profileUser").value, passcode: $("#profilePass").value });
    const error = $("#profileError");
    if (!res.ok) {
      error.textContent = res.error;
      error.hidden = false;
      return;
    }
    error.hidden = true;
    paintMe();
    toast("Profile saved", "ok");
  }

  function onThemePick(event) {
    const btn = event.target.closest("[data-theme]");
    if (!btn) return;
    const res = A.setTheme(btn.dataset.theme);
    if (!res.ok) return;
    applyTheme(A.current());
    renderSwatches(A.current());
    paintMe();
  }

  function onCustomAccent() {
    const value = $("#customAccent").value;
    const res = A.setTheme("custom", value);
    if (!res.ok) return;
    applyTheme(A.current());
    renderSwatches(A.current());
  }

  function onResetTheme() {
    A.setTheme("lime");
    applyTheme(A.current());
    renderSwatches(A.current());
    $("#customAccent").value = A.THEMES.lime.accent;
    paintMe();
  }

  function bindProfile() {
    $("#meBtn").addEventListener("click", () => {
      renderProfile();
      openModal("profile");
    });
    $("#profileForm").addEventListener("submit", onProfileSubmit);
    $("#avatarFile").addEventListener("change", saveAvatarFile);
    $("#avatarRemove").addEventListener("click", () => {
      A.setAvatar(null);
      state.avatarDraft = null;
      paintAvatar($("#profileAvatar"), A.current());
      paintMe();
      toast("Picture removed", "ok");
    });
    $("#swatches").addEventListener("click", onThemePick);
    $("#customAccent").addEventListener("input", onCustomAccent);
    $("#resetTheme").addEventListener("click", onResetTheme);
  }


  /* ---------- shared game lookup ---------- */
  function liveGames() {
    const fromLibrary = window.PowerplayApp && window.PowerplayApp.getGames ? window.PowerplayApp.getGames() : null;
    return (fromLibrary && fromLibrary.length ? fromLibrary : A.allGames()).slice();
  }

  function gameTitle(id) {
    const game = liveGames().find((g) => g.id === id);
    return game ? game.title : "Removed game";
  }

  function refreshScope() {
    // Re-apply the worker's scope after an admin changes assignments.
    if (window.PowerplayApp && window.PowerplayApp.setGameScope && A.current() && A.current().role === "worker") {
      window.PowerplayApp.setGameScope((game) => {
        const me = A.current();
        return !!me && (me.assigned || []).includes(game.id);
      });
    }
  }

  /* ---------- team: work board ---------- */
  function fillAssignForm() {
    const userSel = $("#assignUser");
    const gameSel = $("#assignGame");
    if (!userSel || !gameSel) return;
    const workers = A.users().filter((u) => u.role === "worker");
    userSel.innerHTML = workers.length
      ? workers.map((u) => `<option value="${esc(u.id)}">${esc(u.username)}</option>`).join("")
      : '<option value="">No workers yet</option>';
    gameSel.innerHTML = liveGames()
      .map((g) => `<option value="${esc(g.id)}">${esc(g.title)}</option>`)
      .join("");
  }

  function renderBoard() {
    const list = $("#boardList");
    const me = A.current();
    if (!list || !me) return;
    const admin = me.role === "admin";
    const people = A.users()
      .slice()
      .sort((a, b) => (a.role === b.role ? a.username.localeCompare(b.username) : a.role === "worker" ? -1 : 1))
      .filter((p) => admin || p.id === me.id);

    list.innerHTML = "";
    if (!people.length) {
      list.innerHTML = '<p class="empty-note">No people yet.</p>';
      return;
    }

    people.forEach((person) => {
      const row = document.createElement("div");
      row.className = "board-row";

      const av = document.createElement("span");
      av.className = "avatar";
      paintAvatar(av, person);

      const main = document.createElement("div");
      main.className = "board-row-main";
      main.innerHTML = `<b>${esc(person.username)}</b><span>${A.ROLE_LABEL[person.role] || "Member"}</span>`;

      const chips = document.createElement("div");
      chips.className = "chips";
      chips.style.display = "flex";
      chips.style.flexWrap = "wrap";
      chips.style.gap = "6px";
      if (!person.assigned || !person.assigned.length) {
        chips.innerHTML = '<span class="chip chip-muted">' + (person.role === "admin" ? "Not assignable" : "No game yet") + "</span>";
      } else {
        person.assigned.forEach((gameId) => {
          const chip = document.createElement("span");
          chip.className = "chip";
          chip.textContent = gameTitle(gameId);
          if (admin) {
            const x = document.createElement("button");
            x.type = "button";
            x.textContent = "×";
            x.title = "Unassign";
            x.addEventListener("click", () => {
              const res = A.unassign(gameId, person.id);
              if (!res.ok) return toast(res.error, "err");
              renderBoard();
              refreshScope();
              paintMe();
              toast(`${gameTitle(gameId)} unassigned`, "ok");
            });
            chip.appendChild(x);
          }
          chips.appendChild(chip);
        });
      }

      row.append(av, main, chips);

      if (admin && person.id !== me.id) {
        const del = document.createElement("button");
        del.className = "icon-btn";
        del.type = "button";
        del.title = `Remove ${person.username}`;
        del.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
        del.addEventListener("click", () => {
          if (!window.confirm(`Remove ${person.username}?`)) return;
          const res = A.removePerson(person.id);
          if (!res.ok) return toast(res.error, "err");
          renderBoard();
          fillAssignForm();
          renderChat();
          toast("Person removed", "ok");
        });
        row.appendChild(del);
      }

      list.appendChild(row);
    });
  }

  function onAssign(event) {
    event.preventDefault();
    const userId = $("#assignUser").value;
    const gameId = $("#assignGame").value;
    const error = $("#assignError");
    if (!userId || !gameId) {
      error.textContent = "Pick a person and a game first.";
      error.hidden = false;
      return;
    }
    const res = A.assign(gameId, userId);
    if (!res.ok) {
      error.textContent = res.error;
      error.hidden = false;
      return;
    }
    error.hidden = true;
    renderBoard();
    refreshScope();
    toast(`${gameTitle(gameId)} → ${res.user.username}`, "ok");
  }

  /* ---------- team: chats ---------- */
  function renderScopes() {
    const wrap = $("#chatScopes");
    const me = A.current();
    if (!wrap || !me) return;
    const scopes = A.visibleScopes();
    if (!scopes.some((s) => s.id === state.scope)) state.scope = scopes.length ? scopes[0].id : "group";
    wrap.innerHTML = "";
    scopes.forEach((scope) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "scope-chip" + (scope.id === state.scope ? " is-active" : "");
      btn.textContent = scope.kind === "dm" ? `@ ${scope.label}` : scope.label;
      btn.addEventListener("click", () => {
        state.scope = scope.id;
        renderChat();
      });
      wrap.appendChild(btn);
    });
  }

  function chatTitle() {
    const scope = A.visibleScopes().find((s) => s.id === state.scope);
    return scope ? (scope.kind === "dm" ? `Chat with ${scope.label}` : scope.label) : "Team chat";
  }

  function renderChat() {
    renderScopes();
    const title = $("#chatTitle");
    if (title) title.textContent = chatTitle();
    const log = $("#chatThread");
    const me = A.current();
    if (!log || !me) return;
    const msgs = A.messages(state.scope);
    log.innerHTML = "";
    if (!msgs.length) {
      log.innerHTML = '<p class="empty-note">No messages yet — say hello.</p>';
      return;
    }
    const byId = {};
    A.users().forEach((u) => (byId[u.id] = u));
    msgs.forEach((m) => {
      const who = byId[m.from];
      const bubble = document.createElement("div");
      bubble.className = "msg" + (m.from === me.id ? " is-me" : "");
      const label = document.createElement("small");
      const when = new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      label.textContent = `${who ? who.username : "Someone"} · ${when}`;
      bubble.append(label, document.createTextNode(m.text));
      log.appendChild(bubble);
    });
    log.scrollTop = log.scrollHeight;
  }

  function onSend(event) {
    event.preventDefault();
    const input = $("#chatInput");
    const text = input.value.trim();
    if (!text) return;
    const res = A.sendMessage(state.scope, text);
    if (!res.ok) return toast(res.error || "Message not sent.", "err");
    input.value = "";
    renderChat();
  }

  function renderTeam() {
    const me = A.current();
    if (!me) return;
    const admin = me.role === "admin";
    $("#assignForm").hidden = !admin;
    $("#accountsFile").hidden = !admin;
    fillAssignForm();
    renderBoard();
    renderChat();
  }

  /* The published list of accounts (assets/accounts-data.js). Downloading it lets the
     owner republish, so people added in this browser can sign in everywhere. */
  function downloadAccountFile() {
    if (!A.isAdmin()) return toast("Only admins can export accounts.", "err");
    const users = A.users().map((u) => ({
      id: u.id,
      username: u.username,
      passcode: u.passcode,
      role: u.role,
      assigned: (u.assigned || []).slice(),
    }));
    const body =
      "/* Accounts that ship with the site.\n" +
      "   Anything listed here can sign in on any device, in any browser.\n" +
      "   Replace this file with an exported copy to publish more people. */\n" +
      "window.PowerplaySharedAccounts = " +
      JSON.stringify({ users }, null, 2) +
      ";\n";
    const url = URL.createObjectURL(new Blob([body], { type: "text/javascript" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "accounts-data.js";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Account file with ${users.length} ${users.length === 1 ? "person" : "people"} downloaded.`, "ok");
  }

  /* ---------- add a person ---------- */
  function openPerson() {
    if (!A.isAdmin()) return toast("Only admins can add people.", "err");
    $("#personForm").reset();
    $("#personError").hidden = true;
    openModal("person");
  }

  function onPersonSubmit(event) {
    event.preventDefault();
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
    error.hidden = true;
    $("#personForm").reset();
    closeModal("person");
    renderBoard();
    fillAssignForm();
    renderChat();
    toast(`${res.user.username} added as ${A.ROLE_LABEL[res.user.role]}`, "ok");
  }

  function bindTeam() {
    $("#navWorkers").addEventListener("click", () => {
      renderTeam();
      openModal("workers");
    });
    $("#navAddPerson").addEventListener("click", openPerson);
    $("#assignForm").addEventListener("submit", onAssign);
    $("#chatForm").addEventListener("submit", onSend);
    $("#personForm").addEventListener("submit", onPersonSubmit);
    $("#accountsFile").addEventListener("click", downloadAccountFile);
    // the website's own "New game" button stays as-is for admins
    $("#openAddGame").addEventListener("click", (event) => {
      if (A.isAdmin()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      toast("Only admins can create games.", "err");
    }, true);
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    const hostLine = $("#loginHost");
    if (hostLine) hostLine.textContent = "Running on " + location.host;
    $("#loginForm").addEventListener("submit", onLogin);
    $("#navLogout").addEventListener("click", onLogout);
    const user = A.current();
    if (user) showApp(user);
    else showLogin();
  });

  window.PowerplayAppMode = { openModal, closeModal, toast, paintMe, applyTheme, refreshScope, renderTeam };
})();
