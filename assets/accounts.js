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

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return seed();
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.users) || !data.users.length) return seed();
      data.messages = Array.isArray(data.messages) ? data.messages : [];
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
    const pass = String(passcode || "");
    const user = state.users.find((u) => u.username.toLowerCase() === name && u.passcode === pass);
    if (!user) return { ok: false, error: "That username and passcode don't match." };
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
    const pass = String(passcode || "");
    if (!isAdmin()) return { ok: false, error: "Only admins can add people." };
    if (name.length < 2) return { ok: false, error: "Username needs at least 2 characters." };
    if (pass.length < 4) return { ok: false, error: "Passcode needs at least 4 characters." };
    if (state.users.some((u) => u.username.toLowerCase() === name.toLowerCase())) {
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

  function sendMessage(scopeId, text) {
    const user = current();
    const body = String(text || "").trim();
    if (!user || !body) return { ok: false };
    if (!canSeeScope(scopeId, user)) return { ok: false, error: "You can't post in that chat." };
    const msg = { id: uid("m"), scope: scopeId, from: user.id, text: body.slice(0, 400), at: Date.now() };
    state.messages.push(msg);
    save();
    return { ok: true, message: msg };
  }

  /* ---------- profile ---------- */
  function updateProfile({ username, passcode }) {
    const user = current();
    if (!user) return { ok: false, error: "Sign in first." };
    const name = String(username || "").trim();
    const pass = String(passcode || "");
    if (name.length < 2) return { ok: false, error: "Username needs at least 2 characters." };
    if (pass.length < 4) return { ok: false, error: "Passcode needs at least 4 characters." };
    if (state.users.some((u) => u.id !== user.id && u.username.toLowerCase() === name.toLowerCase())) {
      return { ok: false, error: "That username is taken." };
    }
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
    updateProfile,
    setAvatar,
    setTheme,
    themeFor,
    save,
  };
})();
