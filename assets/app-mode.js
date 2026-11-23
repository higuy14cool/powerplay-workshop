/* ============================================================
   POWERPLAY app layer — sign-in gate and team tools on top of
   the website page (same markup, same styles).
   ============================================================ */
(function () {
  "use strict";

  const A = window.PowerplayAccounts;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const state = { scope: "group", avatarDraft: undefined, editingId: null, forwardId: null };
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
    // the Architect's saved chats belong to this account, whichever way we got here
    if (window.PowerplayChats) window.PowerplayChats.syncToAccount();
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

  let checking = false;

  async function onLogin(event) {
    event.preventDefault();
    if (checking) return;
    const user = $("#loginUser").value.trim();
    const pass = $("#loginPass").value;
    const error = $("#loginError");
    let result = A.login(user, pass);
    if (!result.ok) {
      /* Not here yet: look for a freshly published account before refusing. */
      checking = true;
      const button = $("#loginBtn");
      const label = button.textContent;
      button.disabled = true;
      button.textContent = "Checking…";
      try {
        const found = await A.refreshShared();
        if (found) result = A.login(user, pass);
      } finally {
        checking = false;
        button.disabled = false;
        button.textContent = label;
      }
    }
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
      btn.textContent = scope.kind === "dm" ? `@ ${scope.label}` : scope.kind === "chat" ? `# ${scope.label}` : scope.label;
      btn.addEventListener("click", () => {
        state.scope = scope.id;
        state.editingId = null;
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
    const admin = me.role === "admin";
    msgs.forEach((m) => {
      const who = byId[m.from];
      const mine = m.from === me.id;
      const bubble = document.createElement("div");
      bubble.className = "msg" + (mine ? " is-me" : "");
      bubble.dataset.msg = m.id;

      const label = document.createElement("small");
      const when = new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      label.textContent = `${who ? who.username : "Someone"} · ${when}`;
      bubble.append(label);

      if (state.editingId === m.id) {
        const form = document.createElement("form");
        form.className = "msg-edit";
        const field = document.createElement("input");
        field.value = m.text || "";
        field.maxLength = 400;
        field.placeholder = "Edit your message…";
        const save = document.createElement("button");
        save.className = "btn btn-lime";
        save.type = "submit";
        save.textContent = "Save";
        const cancel = document.createElement("button");
        cancel.className = "btn btn-ghost";
        cancel.type = "button";
        cancel.textContent = "Cancel";
        form.append(field, save, cancel);
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const res = A.editMessage(m.id, field.value);
          if (!res.ok) return toast(res.error, "err");
          state.editingId = null;
          renderChat();
          toast("Message edited", "ok");
        });
        cancel.addEventListener("click", () => {
          state.editingId = null;
          renderChat();
        });
        bubble.appendChild(form);
        log.appendChild(bubble);
        setTimeout(() => field.focus(), 0);
        return;
      }

      if (m.forwardedFrom) {
        const fwd = document.createElement("span");
        fwd.className = "msg-fwd";
        const src = byId[m.forwardedFrom];
        fwd.textContent = `↪ forwarded from ${src ? src.username : "someone"}`;
        bubble.appendChild(fwd);
      }
      if (m.text) {
        const body = document.createElement("div");
        body.className = "msg-text";
        body.textContent = m.text;
        bubble.appendChild(body);
      }
      if (m.image) {
        const link = document.createElement("a");
        link.className = "msg-pic";
        link.href = m.image.src;
        link.target = "_blank";
        link.rel = "noopener";
        const img = document.createElement("img");
        img.src = m.image.src;
        img.alt = m.image.name || "picture";
        img.loading = "lazy";
        link.appendChild(img);
        bubble.appendChild(link);
      }
      if (m.editedAt) {
        const mark = document.createElement("span");
        mark.className = "msg-edited";
        mark.textContent = "edited";
        bubble.appendChild(mark);
      }

      const actions = document.createElement("div");
      actions.className = "msg-actions";
      if (mine || admin) {
        const edit = document.createElement("button");
        edit.type = "button";
        edit.textContent = "Edit";
        edit.dataset.act = "edit";
        edit.addEventListener("click", () => {
          state.editingId = m.id;
          renderChat();
        });
        actions.appendChild(edit);
        const del = document.createElement("button");
        del.type = "button";
        del.textContent = "Delete";
        del.dataset.act = "delete";
        del.addEventListener("click", () => {
          if (!window.confirm("Delete this message?")) return;
          const res = A.deleteMessage(m.id);
          if (!res.ok) return toast(res.error, "err");
          renderChat();
          toast("Message deleted", "ok");
        });
        actions.appendChild(del);
      }
      const fwdBtn = document.createElement("button");
      fwdBtn.type = "button";
      fwdBtn.textContent = "Forward";
      fwdBtn.dataset.act = "forward";
      fwdBtn.addEventListener("click", () => openForward(m.id));
      actions.appendChild(fwdBtn);
      bubble.appendChild(actions);

      log.appendChild(bubble);
    });
    log.scrollTop = log.scrollHeight;
  }

  /* ---------- forward a message to another chat ---------- */
  function openForward(id) {
    const msg = A.findMessage(id);
    const me = A.current();
    if (!msg || !me) return;
    state.forwardId = id;
    const list = $("#forwardList");
    if (!list) return;
    list.innerHTML = "";
    A.visibleScopes()
      .filter((scope) => scope.id !== msg.scope)
      .forEach((scope) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "format-opt";
        btn.textContent = scope.kind === "dm" ? `@ ${scope.label}` : scope.kind === "chat" ? `# ${scope.label}` : scope.label;
        btn.addEventListener("click", () => {
          const res = A.forwardMessage(id, scope.id);
          closeModal("forward");
          if (!res.ok) return toast(res.error, "err");
          if (state.scope === scope.id) renderChat();
          toast(`Forwarded to ${scope.kind === "dm" ? scope.label : scope.kind === "chat" ? "#" + scope.label : scope.label}`, "ok");
        });
        list.appendChild(btn);
      });
    if (!list.children.length) {
      list.innerHTML = '<p class="empty-note">There is nowhere else to forward it yet.</p>';
    }
    openModal("forward");
  }

  /* ---------- a new chat, with as many people as you like ---------- */
  function openNewChat() {
    const me = A.current();
    if (!me) return;
    const box = $("#newChatPeople");
    const error = $("#newChatError");
    if (error) error.hidden = true;
    if ($("#newChatName")) $("#newChatName").value = "";
    if (box) {
      box.innerHTML = "";
      const others = A.users().filter((u) => u.id !== me.id);
      if (!others.length) {
        box.innerHTML = '<p class="empty-note">Add a person first — then you can put them in a chat.</p>';
      }
      others.forEach((u) => {
        const label = document.createElement("label");
        label.className = "new-chat-person";
        const tick = document.createElement("input");
        tick.type = "checkbox";
        tick.value = u.id;
        const name = document.createElement("span");
        name.textContent = u.username;
        const role = document.createElement("em");
        role.textContent = A.ROLE_LABEL[u.role] || u.role;
        label.append(tick, name, role);
        box.appendChild(label);
      });
    }
    openModal("newchat");
  }

  function onCreateChat(event) {
    event.preventDefault();
    const box = $("#newChatPeople");
    const error = $("#newChatError");
    const checked = box ? Array.from(box.querySelectorAll("input:checked")).map((i) => i.value) : [];
    const res = A.createChat({ name: $("#newChatName") ? $("#newChatName").value : "", members: checked });
    if (!res.ok) {
      if (error) { error.textContent = res.error; error.hidden = false; }
      return;
    }
    closeModal("newchat");
    state.scope = res.scope;
    state.editingId = null;
    renderChat();
    toast(`Chat “${res.chat.name}” started`, "ok");
  }

  /* ---------- pictures ---------- */
  function shrinkPhoto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("decode"));
        img.onload = () => {
          const draw = (max, quality) => {
            const scale = Math.min(1, max / Math.max(img.width, img.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL("image/jpeg", quality);
          };
          let src = draw(1100, 0.78);
          if (src.length > 700 * 1024) src = draw(820, 0.62);
          if (src.length > 700 * 1024) src = draw(620, 0.5);
          resolve({ src, name: file.name || "picture" });
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  async function sendPhoto(file) {
    const input = $("#chatInput");
    try {
      const pic = await shrinkPhoto(file);
      const res = A.sendMessage(state.scope, input ? input.value : "", pic);
      if (!res.ok) return toast(res.error || "Picture not sent.", "err");
      if (input) input.value = "";
      renderChat();
      toast("Picture sent", "ok");
    } catch (err) {
      toast("That picture could not be read.", "err");
    }
  }

  function onSend(event) {
    event.preventDefault();
    const input = $("#chatInput");
    const text = input.value.trim();
    if (!text) return;
    const res = A.sendMessage(state.scope, text);
    if (!res.ok) return toast(res.error || "Message not sent.", "err");
    input.value = "";
    state.editingId = null;
    renderChat();
  }

  /* Another window changed the workshop: read it again and repaint what is on screen. */
  function refreshLive() {
    A.reload();
    const me = A.current();
    if (!me) return;
    paintMe();
    applyTheme(me);
    refreshScope();
    if (!$("#workersModal").hidden) {
      renderTeam();
      renderScopes();
    }
    if (!$("#profileModal").hidden) renderProfile();
  }

  function renderTeam() {
    const me = A.current();
    if (!me) return;
    const admin = me.role === "admin";
    $("#assignForm").hidden = !admin;
    $("#accountsFile").hidden = !admin;
    $("#accountsRestore").hidden = !admin;
    renderAccountsState();
    fillAssignForm();
    renderBoard();
    renderChat();
  }

  /* The published list of accounts (assets/accounts-data.js). Downloading it lets the
     owner republish, so people added in this browser can sign in everywhere. */
  function downloadAccountFile() {
    if (!A.isAdmin()) return toast("Only admins can export accounts.", "err");
    const users = A.users();
    const body = A.fileText();
    const url = URL.createObjectURL(new Blob([body], { type: "text/javascript" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "accounts-data.js";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(
      `Account file with ${users.length} ${users.length === 1 ? "person" : "people"} downloaded — send it to your worker.`, "ok"
    );
  }

  /* Which people would disappear if this browser's data went away. */
  function renderAccountsState() {
    const line = $("#accountsState");
    if (!line) return;
    const shared = new Set(
      ((window.PowerplaySharedAccounts && window.PowerplaySharedAccounts.users) || [])
        .map((u) => String(u.username || "").trim().toLowerCase())
    );
    // people this browser has already pushed since the page loaded
    (window.PowerplayPublishedUsers || []).forEach((name) =>
      shared.add(String(name || "").trim().toLowerCase())
    );
    const users = A.users();
    const local = users.filter((u) => !shared.has(String(u.username || "").trim().toLowerCase()));
    if (!local.length) {
      line.textContent = `All ${users.length} ${users.length === 1 ? "person is" : "people are"} published with the site, so an uninstall changes nothing.`;
      return;
    }
    const names = local.map((u) => u.username).join(", ");
    const sync = (window.PowerplayAutoSave && window.PowerplayAutoSave.status && window.PowerplayAutoSave.status()) || {};
    if (sync.token && sync.repo) {
      line.textContent = `${names} ${local.length === 1 ? "is" : "are"} being published to GitHub now — a few seconds and ${local.length === 1 ? "this person" : "these people"} can sign in on any computer.`;
      return;
    }
    line.textContent =
      `Saved in this browser only — ${names} ${local.length === 1 ? "is" : "are"} not published, so signing in on another computer fails. ` +
      "Press the GitHub chip at the top and turn on backup to publish them.";
  }

  /* Read a saved account file back in, whatever wrapper it came in. */
  function readAccountFile(text) {
    const trimmed = String(text || "").trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      const data = JSON.parse(trimmed.slice(start, end + 1));
      if (Array.isArray(data)) return data;
      return Array.isArray(data.users) ? data.users : null;
    } catch (err) {
      return null;
    }
  }

  function restoreAccountFile(file) {
    if (!A.isAdmin()) return toast("Only admins can restore accounts.", "err");
    const reader = new FileReader();
    reader.onload = () => {
      const rows = readAccountFile(reader.result);
      if (!rows) return toast("That file does not look like an account file.", "err");
      const { added, updated } = A.importAccounts(rows);
      renderBoard();
      fillAssignForm();
      renderChat();
      renderAccountsState();
      const bits = [];
      if (added) bits.push(`${added} restored`);
      if (updated) bits.push(`${updated} updated`);
      toast(bits.length ? `Account file loaded — ${bits.join(", ")}.` : "Everyone in that file is already here.", "ok");
    };
    reader.onerror = () => toast("That file could not be read.", "err");
    reader.readAsText(file);
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
    const photoBtn = $("#chatPhotoBtn");
    const photoInput = $("#chatPhotoInput");
    if (photoBtn && photoInput) {
      photoBtn.addEventListener("click", () => photoInput.click());
      photoInput.addEventListener("change", () => {
        const file = photoInput.files && photoInput.files[0];
        photoInput.value = "";
        if (file) sendPhoto(file);
      });
    }
    $$("[data-close-forward]").forEach((el) => el.addEventListener("click", () => closeModal("forward")));
    $("#newChatBtn").addEventListener("click", openNewChat);
    $("#newChatForm").addEventListener("submit", onCreateChat);
    $$("[data-close-newchat]").forEach((el) => el.addEventListener("click", () => closeModal("newchat")));
    $("#personForm").addEventListener("submit", onPersonSubmit);
    $("#accountsFile").addEventListener("click", downloadAccountFile);
    $("#accountsRestore").addEventListener("click", () => $("#accountsRestoreInput").click());
    $("#accountsRestoreInput").addEventListener("change", (event) => {
      const file = event.target.files && event.target.files[0];
      event.target.value = "";
      if (file) restoreAccountFile(file);
    });
    // the website's own "New game" button stays as-is for admins
    $("#openAddGame").addEventListener("click", (event) => {
      if (A.isAdmin()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      toast("Only admins can create games.", "err");
    }, true);
  }

  /* A worker on their own computer can take the admin's account file in straight from
     the login card, so signing in never has to wait for a publish. */
  function bindLoginImport() {
    const btn = $("#loginImport");
    const input = $("#loginImportInput");
    if (!btn || !input) return;
    const state = $("#loginImportState");
    btn.addEventListener("click", () => input.click());
    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      input.value = "";
      if (!file) return;
      let users = null;
      try {
        users = readAccountFile(await file.text());
      } catch (err) {
        users = null;
      }
      if (!users || !users.length) {
        if (state) {
          state.hidden = false;
          state.textContent = "That file has no accounts in it. Ask your admin to press Save account file again.";
        }
        return;
      }
      const res = A.importAccounts(users) || {};
      if (state) {
        state.hidden = false;
        state.textContent =
          "Account file imported — " + (res.added || 0) + " new and " + (res.updated || 0) +
          " updated. Sign in with your own username and passcode.";
      }
      toast("Account file imported.", "ok");
    });
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    const hostLine = $("#loginHost");
    if (hostLine) hostLine.textContent = "Running on " + location.host;
    $("#loginForm").addEventListener("submit", onLogin);
    bindLoginImport();
    $("#navLogout").addEventListener("click", onLogout);
    const user = A.current();
    if (user) showApp(user);
    else showLogin();
  });

  window.PowerplayAppMode = { openModal, closeModal, toast, paintMe, applyTheme, refreshScope, renderTeam, refreshLive };
})();
