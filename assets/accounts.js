/* ============================================================
   POWERPLAY app — accounts, roles, assignments, chats, themes
   Data lives in localStorage on this device.
   ============================================================ */
(function () {
  "use strict";

  const KEY = "powerplay.accounts.v1";

  const THEMES = {
    lime: { accent: "#b6ff3d", ink: "#0a0b10" },
    violet: { accent: "#a78bfa", ink: "#0a0b10" },
    cyan: { accent: "#38e1ff", ink: "#04141a" },
    orange: { accent: "#ff9f45", ink: "#180d02" },
    rose: { accent: "#ff6b9d", ink: "#1a0410" },
    blue: { accent: "#5b9dff", ink: "#030a18" },
  };

  const ROLE_LABEL = { admin: "Admin", worker: "Worker" };
  const AVATAR_COLORS = ["#b6ff3d", "#a78bfa", "#38e1ff", "#ff9f45", "#ff6b9d", "#5b9dff", "#4ade80", "#f87171"];

  function uid(prefix) {
    return prefix + "-" + Math.random().toString(36).slice(2, 9);
  }

  function seed() {
    return {
      users: [
        {
          id: "u-admin",
          username: "higuy14/cool",
          passcode: "favgame1",
          role: "admin",
          avatar: null,
          color: "#b6ff3d",
          assigned: [],
          theme: "lime",
          customAccent: null,
        },
      ],
      messages: [
        {
          id: uid("m"),
          scope: "group",
          from: "u-admin",
          text: "Welcome to the workshop. Assign a game to a worker and it lands on their home screen.",
          at: Date.now() - 1000 * 60 * 30,
        },
      ],
      currentUserId: null,
    };
  }

  const IMAGE_LIMIT = 900 * 1024; // a picture has to fit next to the rest of the chat in localStorage

  function cleanImage(image) {
    if (!image || typeof image !== "object") return null;
    const src = String(image.src || "");
    if (!/^data:image\/(png|jpeg|webp|gif);base64,/i.test(src)) return null;
    if (src.length > IMAGE_LIMIT) return null;
    return { src, name: String(image.name || "picture").slice(0, 60) };
  }

  let state = load();

  /* Accounts published with the site (assets/accounts-data.js) exist on every device,
     so a username and passcode created in one browser is not lost in another.
     Accounts added in a browser stay in that browser until its account file is published
     (Workers -> "Account file"). */
  function mergeSharedAccounts() {
    const shared = window.PowerplaySharedAccounts && window.PowerplaySharedAccounts.users;
    if (!Array.isArray(shared) || !shared.length) return;
    let changed = false;
    shared.forEach((entry) => {
      if (!entry || !String(entry.username || "").trim() || !String(entry.passcode || "").trim()) return;
      const name = String(entry.username).trim();
      const key = name.toLowerCase();
      const role = entry.role === "admin" ? "admin" : "worker";
      const pass = String(entry.passcode).trim();
      const found = state.users.find((u) => String(u.username || "").trim().toLowerCase() === key);
      if (!found) {
        state.users.push({
          id: entry.id || uid("u"),
          username: name,
          passcode: pass,
          role,
          avatar: null,
          color: AVATAR_COLORS[state.users.length % AVATAR_COLORS.length],
          assigned: Array.isArray(entry.assigned) ? entry.assigned.slice() : [],
          theme: "lime",
          customAccent: null,
        });
        changed = true;
        return;
      }
      // The published list is the source of truth for what a login depends on.
      const wantedPass = found.passcodeOverridden ? String(found.passcode || "").trim() : pass;
      if (found.username !== name || String(found.passcode || "").trim() !== wantedPass || found.role !== role) {
        found.username = name;
        found.passcode = wantedPass;
        found.role = role;
        changed = true;
      }
      // Only fill in work when the published list says something and this browser knows nothing.
      if (Array.isArray(entry.assigned) && entry.assigned.length && !(found.assigned || []).length) {
        found.assigned = entry.assigned.slice();
        changed = true;
      }
    });
    if (changed) save();
  }

  /* Bring accounts back from a saved account file — after an uninstall, or from a
     different browser. Matching is by username, so running it twice is harmless. */
  function importAccounts(list) {
    const rows = Array.isArray(list) ? list : [];
    let added = 0, updated = 0;
    rows.forEach((entry) => {
      if (!entry || !String(entry.username || "").trim() || !String(entry.passcode || "").trim()) return;
      const name = String(entry.username).trim();
      const pass = String(entry.passcode).trim();
      const role = entry.role === "admin" ? "admin" : "worker";
      const found = state.users.find((u) => String(u.username || "").trim().toLowerCase() === name.toLowerCase());
      if (!found) {
        state.users.push({
          id: entry.id || uid("u"),
          username: name,
          passcode: pass,
          role,
          avatar: null,
          color: AVATAR_COLORS[state.users.length % AVATAR_COLORS.length],
          assigned: Array.isArray(entry.assigned) ? entry.assigned.slice() : [],
          theme: "lime",
          customAccent: null,
        });
        added++;
        return;
      }
      if (found.username !== name || found.passcode !== pass || found.role !== role) {
        found.username = name;
        found.passcode = pass;
        found.role = role;
        updated++;
      }
      if (Array.isArray(entry.assigned) && entry.assigned.length) found.assigned = entry.assigned.slice();
    });
    if (added || updated) save();
    return { added, updated };
  }

  mergeSharedAccounts();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return seed();
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.users) || !data.users.length) return seed();
      data.messages = (Array.isArray(data.messages) ? data.messages : [])
        .filter((m) => m && m.id && m.scope)
        .map((m) => {
          m.text = String(m.text || "").slice(0, 400);
          if (m.image) {
            const pic = cleanImage(m.image);
            if (pic) m.image = pic;
            else delete m.image;
          }
          return m;
        });
      data.users = data.users.map((u) => ({
        assigned: Array.isArray(u.assigned) ? u.assigned : [],
        theme: u.theme || "lime",
        customAccent: u.customAccent || null,
        color: u.color || "#b6ff3d",
        avatar: u.avatar || null,
        ...u,
      }));
      return data;
    } catch (err) {
      // Keep the unreadable copy instead of throwing it away with the next save.
      console.warn("POWERPLAY could not read saved workshop data", err);
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) localStorage.setItem(KEY + ".recovered", raw);
      } catch (ignored) {}
      return seed();
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      /* storage full (large avatar) — keep the session alive in memory */
      console.warn("Could not persist workshop data", err);
    }
  }

  function games() {
    return window.PowerplayGames ? window.PowerplayGames.GAMES : [];
  }

  /* ---------- session ---------- */
  function current() {
    return state.users.find((u) => u.id === state.currentUserId) || null;
  }

  function isAdmin() {
    const u = current();
    return !!u && u.role === "admin";
  }

  function login(username, passcode) {
    const name = String(username || "").trim().toLowerCase();
    const pass = String(passcode || "").trim();
    const user = state.users.find(
      (u) => String(u.username || "").trim().toLowerCase() === name && String(u.passcode || "").trim() === pass
    );
    if (!user) {
      // The commonest cause is an account made in a different browser, so say it.
      return {
        ok: false,
        error: "That username and passcode don't match here. Accounts added in another browser only work once the admin's account file is published.",
      };
    }
    state.currentUserId = user.id;
    save();
    return { ok: true, user };
  }

  function logout() {
    state.currentUserId = null;
    save();
  }

  /* ---------- people (admin) ---------- */
  function addPerson({ username, passcode, role }) {
    const name = String(username || "").trim();
    const pass = String(passcode || "").trim();
    if (!isAdmin()) return { ok: false, error: "Only admins can add people." };
    if (name.length < 2) return { ok: false, error: "Username needs at least 2 characters." };
    if (pass.length < 4) return { ok: false, error: "Passcode needs at least 4 characters." };
    if (state.users.some((u) => String(u.username || "").trim().toLowerCase() === name.toLowerCase())) {
      return { ok: false, error: "That username is taken." };
    }
    const user = {
      id: uid("u"),
      username: name,
      passcode: pass,
      role: role === "admin" ? "admin" : "worker",
      avatar: null,
      color: AVATAR_COLORS[state.users.length % AVATAR_COLORS.length],
      assigned: [],
      theme: "lime",
      customAccent: null,
    };
    state.users.push(user);
    save();
    return { ok: true, user };
  }

  function removePerson(id) {
    if (!isAdmin()) return { ok: false, error: "Only admins can remove people." };
    const target = state.users.find((u) => u.id === id);
    if (!target) return { ok: false, error: "No such person." };
    if (target.id === state.currentUserId) return { ok: false, error: "You can't remove yourself." };
    state.users = state.users.filter((u) => u.id !== id);
    state.messages = state.messages.filter((m) => m.from !== id && !(m.scope || "").includes(id));
    gamesForStorage().forEach((g) => {
      if (g.assignedTo) g.assignedTo = g.assignedTo.filter((uid2) => uid2 !== id);
    });
    save();
    return { ok: true };
  }

  function users() {
    return state.users.slice();
  }

  /* ---------- games ---------- */
  /* custom games live next to the built-in catalogue */
  let custom = [];
  try {
    custom = JSON.parse(localStorage.getItem(KEY + ".games") || "[]");
    if (!Array.isArray(custom)) custom = [];
  } catch (err) {
    custom = [];
  }

  function gamesForStorage() {
    return custom;
  }

  function allGames() {
    // the workshop library is the single source of truth, so anything the
    // website saved is also assignable in the app
    const live = window.PowerplayApp && window.PowerplayApp.getGames ? window.PowerplayApp.getGames() : null;
    if (live && live.length) return live.map((g) => ({ ...g, builtIn: true }));
    return games()
      .map((g) => ({ ...g, builtIn: true }))
      .concat(custom.map((g) => ({ ...g, builtIn: false })));
  }

  function addGame({ title, genre, pitch }) {
    if (!isAdmin()) return { ok: false, error: "Only admins can create games." };
    const name = String(title || "").trim();
    if (name.length < 2) return { ok: false, error: "Give the game a title." };
    if (allGames().some((g) => g.title.toLowerCase() === name.toLowerCase())) {
      return { ok: false, error: "A game with that title already exists." };
    }
    const game = {
      id: "custom-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      title: name,
      genre: genre || "Prototype",
      status: "In progress",
      pitch: String(pitch || "").trim() || "No pitch yet.",
      cover: null,
      url: "",
      createdBy: state.currentUserId,
    };
    custom.unshift(game);
    persistGames();
    save();
    return { ok: true, game };
  }

  function persistGames() {
    try {
      localStorage.setItem(KEY + ".games", JSON.stringify(custom));
    } catch (err) {
      console.warn("Could not save games", err);
    }
  }

  function assignedTo(gameId) {
    return state.users.filter((u) => (u.assigned || []).includes(gameId));
  }

  function assign(gameId, userId) {
    if (!isAdmin()) return { ok: false, error: "Only admins can assign work." };
    const game = allGames().find((g) => g.id === gameId);
    const user = state.users.find((u) => u.id === userId);
    if (!game || !user) return { ok: false, error: "Pick a game and a worker." };
    if (user.role === "admin") return { ok: false, error: "Assign work to workers, not admins." };
    if ((user.assigned || []).includes(gameId)) {
      return { ok: false, error: `${user.username} already has ${game.title}.` };
    }
    user.assigned = (user.assigned || []).concat(gameId);
    save();
    return { ok: true, user, game };
  }

  function unassign(gameId, userId) {
    if (!isAdmin()) return { ok: false, error: "Only admins can assign work." };
    const user = state.users.find((u) => u.id === userId);
    if (!user) return { ok: false, error: "No such person." };
    user.assigned = (user.assigned || []).filter((g) => g !== gameId);
    save();
    return { ok: true };
  }

  /* ---------- chats ---------- */
  /* a DM belongs to a pair, so both people open the same thread */
  function dmScope(a, b) {
    return "dm:" + [a, b].sort().join("|");
  }

  function visibleScopes(user = current()) {
    if (!user) return [];
    if (user.role === "admin") {
      return [{ id: "group", label: "Group chat", kind: "group" }].concat(
        state.users
          .filter((u) => u.role === "worker")
          .map((u) => ({ id: dmScope(user.id, u.id), label: u.username, kind: "dm", user: u }))
      );
    }
    const admins = state.users.filter((u) => u.role === "admin");
    return [{ id: "group", label: "Group chat", kind: "group" }].concat(
      admins.map((u) => ({ id: dmScope(user.id, u.id), label: u.username, kind: "dm", user: u }))
    );
  }

  function canSeeScope(scopeId, user = current()) {
    return visibleScopes(user).some((s) => s.id === scopeId);
  }

  function messages(scopeId) {
    return state.messages
      .filter((m) => m.scope === scopeId)
      .sort((a, b) => a.at - b.at);
  }

  function sendMessage(scopeId, text, image) {
    const user = current();
    const body = String(text || "").trim().slice(0, 400);
    if (!user) return { ok: false };
    if (!body && !image) return { ok: false, error: "Write something or pick a picture." };
    const pic = image ? cleanImage(image) : null;
    if (image && !pic) {
      const tooBig = String(image.src || "").length > IMAGE_LIMIT;
      return { ok: false, error: tooBig ? "That picture is too big — try a smaller one." : "That picture can't be sent." };
    }
    if (!canSeeScope(scopeId, user)) return { ok: false, error: "You can't post in that chat." };
    const msg = { id: uid("m"), scope: scopeId, from: user.id, text: body, at: Date.now() };
    if (pic) msg.image = pic;
    state.messages.push(msg);
    save();
    return { ok: true, message: msg };
  }

  function findMessage(id) {
    return state.messages.find((m) => m.id === id) || null;
  }

  function canTouchMessage(msg) {
    const user = current();
    if (!user || !msg) return false;
    if (!canSeeScope(msg.scope, user)) return false;
    return msg.from === user.id || user.role === "admin";
  }

  /* Editing keeps the picture and marks the message so people know it changed. */
  function editMessage(id, text) {
    const msg = findMessage(id);
    if (!canTouchMessage(msg)) return { ok: false, error: "You can't edit that message." };
    const body = String(text || "").trim().slice(0, 400);
    if (!body && !msg.image) return { ok: false, error: "A message can't be empty." };
    msg.text = body;
    msg.editedAt = Date.now();
    save();
    return { ok: true, message: msg };
  }

  function deleteMessage(id) {
    const msg = findMessage(id);
    if (!canTouchMessage(msg)) return { ok: false, error: "You can't delete that message." };
    state.messages = state.messages.filter((m) => m.id !== id);
    save();
    return { ok: true };
  }

  function forwardMessage(id, scopeId) {
    const msg = findMessage(id);
    const user = current();
    if (!msg || !canTouchMessage(msg)) return { ok: false, error: "You can't forward that message." };
    if (!canSeeScope(scopeId, user)) return { ok: false, error: "You can't post in that chat." };
    const copy = {
      id: uid("m"),
      scope: scopeId,
      from: user.id,
      text: msg.text,
      at: Date.now(),
      forwardedFrom: msg.from,
    };
    if (msg.image) copy.image = { ...msg.image };
    state.messages.push(copy);
    save();
    return { ok: true, message: copy };
  }

  /* ---------- profile ---------- */
  function updateProfile({ username, passcode }) {
    const user = current();
    if (!user) return { ok: false, error: "Sign in first." };
    const name = String(username || "").trim();
    const pass = String(passcode || "").trim();
    if (name.length < 2) return { ok: false, error: "Username needs at least 2 characters." };
    if (pass.length < 4) return { ok: false, error: "Passcode needs at least 4 characters." };
    if (state.users.some((u) => u.id !== user.id && String(u.username || "").trim().toLowerCase() === name.toLowerCase())) {
      return { ok: false, error: "That username is taken." };
    }
    // A passcode changed here must survive the next load of the published account list.
    if (pass !== user.passcode) user.passcodeOverridden = true;
    user.username = name;
    user.passcode = pass;
    save();
    return { ok: true, user };
  }

  function setAvatar(dataUrl) {
    const user = current();
    if (!user) return { ok: false };
    user.avatar = dataUrl || null;
    save();
    return { ok: true, user };
  }

  function setTheme(themeId, customAccent) {
    const user = current();
    if (!user) return { ok: false };
    if (customAccent) {
      user.customAccent = customAccent;
      user.theme = "custom";
    } else {
      user.theme = THEMES[themeId] ? themeId : "lime";
      user.customAccent = null;
    }
    save();
    return { ok: true, user };
  }

  function themeFor(user) {
    if (!user) return THEMES.lime;
    if (user.theme === "custom" && user.customAccent) {
      return { accent: user.customAccent, ink: "#0a0b10" };
    }
    return THEMES[user.theme] || THEMES.lime;
  }

  window.PowerplayAccounts = {
    THEMES,
    AVATAR_COLORS,
    ROLE_LABEL,
    current,
    isAdmin,
    users,
    allGames,
    addPerson,
    importAccounts,
    removePerson,
    addGame,
    assign,
    unassign,
    assignedTo,
    login,
    logout,
    visibleScopes,
    canSeeScope,
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    forwardMessage,
    findMessage,
    updateProfile,
    setAvatar,
    setTheme,
    themeFor,
    save,
  };
})();
