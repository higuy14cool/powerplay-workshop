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

  /* A person keeps the same id on every device: the id the published list gives
     them, or one derived from the username. Chats and direct messages point at
     ids, so a chat typed on the computer finds its author on the iPad. */
  function stableId(name) {
    const text = String(name || "").trim().toLowerCase();
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return "u-" + (h >>> 0).toString(36);
  }

  /* An id from a file or the board wins over a made-up one made here; every
     reference moves with it. */
  function remapUser(oldId, newId) {
    if (!oldId || !newId || oldId === newId) return false;
    if (state.users.some((u) => u.id === newId)) return false;
    const user = state.users.find((u) => u.id === oldId);
    if (!user) return false;
    user.id = newId;
    if (state.currentUserId === oldId) state.currentUserId = newId;
    (state.messages || []).forEach((m) => {
      if (m.from === oldId) m.from = newId;
      if (m.scope && m.scope.indexOf(oldId) >= 0) m.scope = m.scope.split(oldId).join(newId);
    });
    (state.chats || []).forEach((c) => {
      c.members = (c.members || []).map((id) => (id === oldId ? newId : id));
    });
    try {
      gamesForStorage().forEach((g) => {
        if (Array.isArray(g.assignedTo)) g.assignedTo = g.assignedTo.map((id) => (id === oldId ? newId : id));
      });
    } catch (err) {}
    return true;
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
      chats: [],   // named chats that several people share, made with "+ New chat"
      deleted: [], // ids of messages someone removed, so a removal travels too
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
      if (found && entry.id && found.id !== entry.id && remapUser(found.id, entry.id)) changed = true;
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

  /* The people as a file the site can ship, so a login works on any device. */
  function fileText(extra) {
    const users = state.users.map((u) => ({
      id: u.id,
      username: u.username,
      passcode: u.passcode,
      role: u.role,
      assigned: (u.assigned || []).slice(),
    }));
    /* People the published file knows and this browser does not are kept, never
       dropped: another device's workers must survive this device's backup. */
    (Array.isArray(extra) ? extra : []).forEach((entry) => {
      if (!entry || !String(entry.username || "").trim()) return;
      /* A half-written entry is not a person: it could never sign in. */
      if (String(entry.passcode || "").trim().length < 4) return;
      const key = String(entry.username).trim().toLowerCase();
      if (users.some((u) => String(u.username).trim().toLowerCase() === key)) return;
      users.push({
        id: entry.id || null,
        username: String(entry.username).trim(),
        passcode: String(entry.passcode || "").trim(),
        role: entry.role === "admin" ? "admin" : "worker",
        assigned: Array.isArray(entry.assigned) ? entry.assigned.slice() : [],
      });
    });
    return (
      "/* Accounts that ship with the site.\n" +
      "   Anything listed here can sign in on any device, in any browser.\n" +
      "   The app keeps this file up to date when automatic backup is on. */\n" +
      "window.PowerplaySharedAccounts = " +
      JSON.stringify({ users }, null, 2) +
      ";\n"
    );
  }

  /* Take the chats and messages out of a backup without losing what is already here.
     Only adds, never overwrites, so pulling a backup twice is harmless. */
  function mergeBackup(parsed) {
    if (!parsed || typeof parsed !== "object") return 0;
    let added = 0;
    const known = new Set(state.messages.map((m) => m.id));
    (Array.isArray(parsed.messages) ? parsed.messages : []).forEach((m) => {
      if (!m || !m.id || !m.scope || known.has(m.id)) return;
      const row = {
        id: String(m.id),
        scope: String(m.scope),
        from: String(m.from || ""),
        text: String(m.text || "").slice(0, 400),
        at: Number(m.at) || Date.now(),
      };
      if (m.image) {
        const pic = cleanImage(m.image);
        if (pic) row.image = pic;
      }
      if (m.forwardedFrom) row.forwardedFrom = String(m.forwardedFrom);
      if (m.editedAt) row.editedAt = Number(m.editedAt) || Date.now();
      state.messages.push(row);
      known.add(row.id);
      added++;
    });
    if (!Array.isArray(state.chats)) state.chats = [];
    const knownChats = new Set(state.chats.map((c) => c.id));
    (Array.isArray(parsed.chats) ? parsed.chats : []).forEach((c) => {
      if (!c || !c.id || knownChats.has(c.id) || !Array.isArray(c.members)) return;
      const members = c.members.filter((id) => state.users.some((u) => u.id === id));
      if (!members.length) return;
      state.chats.push({
        id: String(c.id),
        name: String(c.name || "Chat").slice(0, 40),
        members,
        createdBy: c.createdBy || null,
        at: Number(c.at) || Date.now(),
      });
      knownChats.add(c.id);
      added++;
    });
    if (added) save();
    return added;
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
      const known = new Set(data.users.map((u) => u.id));
      data.chats = (Array.isArray(data.chats) ? data.chats : [])
        .filter((c) => c && c.id && Array.isArray(c.members))
        .map((c) => ({
          id: String(c.id),
          name: String(c.name || "Chat").slice(0, 40),
          members: c.members.filter((id) => known.has(id)),
          createdBy: c.createdBy || null,
          at: Number(c.at) || Date.now(),
        }))
        .filter((c) => c.members.length);
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

  /* Someone in another window changed the workshop: read it again. */
  function reload() {
    state = load();
    if (state.currentUserId && !state.users.some((u) => u.id === state.currentUserId)) {
      state.currentUserId = null;
    }
    return state;
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

  /* A worker signs in the moment the admin publishes: ask GitHub Pages for the
     published people (bypassing the ten-minute asset cache) and merge them in. */
  async function refreshShared(creds) {
    let added = false;
    try {
      const res = await fetch("assets/accounts-data.js?t=" + Date.now(), { cache: "no-store" });
      if (res.ok) {
        const text = await res.text();
        const data = new Function("window", text + "\nreturn window.PowerplaySharedAccounts;")(
          { PowerplaySharedAccounts: null }
        );
        if (data && Array.isArray(data.users) && data.users.length) {
          const before = state.users.length;
          window.PowerplaySharedAccounts = data;
          mergeSharedAccounts();
          reload();
          added = state.users.length > before;
        }
      }
    } catch (err) {
      /* no published file: the board may still know him */
    }
    if (await fromBoard(creds)) added = true;
    return added;
  }

  /* The admin's workshop leaves the people on a public board (see board.js).
     Only a SHA-256 of username:passcode travels, so the typed passcode is what
     proves the account, and it is kept locally exactly as it was typed. */
  async function fromBoard(creds) {
    const board = window.PowerplayBoard;
    if (!board || !creds) return false;
    const name = String(creds.username || "").trim();
    const pass = String(creds.passcode || "").trim();
    if (!name || !pass) return false;
    const data = await board.people();
    if (!data) return false;
    const digest = await board.hash(name, pass);
    if (!digest) return false;
    const hit = data.people.find(
      (p) => String(p.username).trim().toLowerCase() === name.toLowerCase() && p.hash === digest
    );
    if (!hit) return false;
    const found = state.users.find((u) => String(u.username || "").trim().toLowerCase() === name.toLowerCase());
    if (found) {
      found.passcode = pass;
      found.passcodeOverridden = true;
    } else {
      state.users.push({
        id: hit.id || stableId(name),
        username: String(hit.username).trim(),
        passcode: pass,
        role: hit.role === "admin" ? "admin" : "worker",
        avatar: null,
        color: AVATAR_COLORS[state.users.length % AVATAR_COLORS.length],
        assigned: Array.isArray(hit.assigned) ? hit.assigned.slice() : [],
        theme: "lime",
        customAccent: null,
      });
    }
    save();
    reload();
    return true;
  }

  /* Keep the board current: an admin publishes on every change and whenever the
     workshop opens, so a worker's sign in never waits for a file. */
  let boardTimer = null;

  function publishBoard() {
    const board = window.PowerplayBoard;
    if (!board) return;
    const me = current();
    if (!me || me.role !== "admin") return;
    if (boardTimer) clearTimeout(boardTimer);
    boardTimer = setTimeout(() => {
      boardTimer = null;
      board.publish(state.users);
    }, 1200);
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
        error:
          "That username and passcode don't match anywhere yet. If the admin made this account a moment ago, " +
          "ask them to open the workshop once so it is shared; if it still fails, have them save an account file " +
          "and press “Import the account file” below.",
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
      id: stableId(name),
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
    publishBoard();
    return { ok: true, user };
  }

  function removePerson(id) {
    if (!isAdmin()) return { ok: false, error: "Only admins can remove people." };
    const target = state.users.find((u) => u.id === id);
    if (!target) return { ok: false, error: "No such person." };
    if (target.id === state.currentUserId) return { ok: false, error: "You can't remove yourself." };
    state.users = state.users.filter((u) => u.id !== id);
    state.messages = state.messages.filter((m) => m.from !== id && !(m.scope || "").includes(id));
    state.chats = (state.chats || [])
      .map((c) => ({ ...c, members: c.members.filter((m) => m !== id) }))
      .filter((c) => c.members.length);
    gamesForStorage().forEach((g) => {
      if (g.assignedTo) g.assignedTo = g.assignedTo.filter((uid2) => uid2 !== id);
    });
    save();
    publishBoard();
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
    publishBoard();
    return { ok: true, user, game };
  }

  function unassign(gameId, userId) {
    if (!isAdmin()) return { ok: false, error: "Only admins can assign work." };
    const user = state.users.find((u) => u.id === userId);
    if (!user) return { ok: false, error: "No such person." };
    user.assigned = (user.assigned || []).filter((g) => g !== gameId);
    save();
    publishBoard();
    return { ok: true };
  }

  /* ---------- chats ---------- */
  /* a DM belongs to a pair, so both people open the same thread */
  function dmScope(a, b) {
    return "dm:" + [a, b].sort().join("|");
  }

  /* A chat made with "+ New chat": a name and the people in it. Admins see every
     one of them so they can keep an eye on the team; everyone else sees the chats
     they were put in. */
  function chatScopes(user) {
    return (state.chats || [])
      .filter((c) => c.members.includes(user.id) || user.role === "admin")
      .sort((a, b) => (a.at || 0) - (b.at || 0))
      .map((c) => ({ id: "chat:" + c.id, label: c.name, kind: "chat", chat: c }));
  }

  function visibleScopes(user = current()) {
    if (!user) return [];
    const head = [{ id: "group", label: "Group chat", kind: "group" }].concat(chatScopes(user));
    if (user.role === "admin") {
      return head.concat(
        state.users
          .filter((u) => u.role === "worker")
          .map((u) => ({ id: dmScope(user.id, u.id), label: u.username, kind: "dm", user: u }))
      );
    }
    const admins = state.users.filter((u) => u.role === "admin");
    return head.concat(
      admins.map((u) => ({ id: dmScope(user.id, u.id), label: u.username, kind: "dm", user: u }))
    );
  }

  /* Start a chat with a name and a set of people; you are always in it. */
  function createChat({ name, members } = {}) {
    const user = current();
    if (!user) return { ok: false, error: "Sign in first." };
    const ids = [];
    (Array.isArray(members) ? members : []).forEach((id) => {
      if (state.users.some((u) => u.id === id) && !ids.includes(id)) ids.push(id);
    });
    if (!ids.includes(user.id)) ids.push(user.id);
    if (ids.length < 2) return { ok: false, error: "Pick at least one person to chat with." };
    const names = ids
      .map((id) => (state.users.find((u) => u.id === id) || {}).username)
      .filter(Boolean);
    const chat = {
      id: uid("c"),
      name: String(name || "").trim().slice(0, 40) || names.slice(0, 3).join(", "),
      members: ids,
      createdBy: user.id,
      at: Date.now(),
    };
    if (!Array.isArray(state.chats)) state.chats = [];
    state.chats.push(chat);
    save();
    return { ok: true, chat, scope: "chat:" + chat.id };
  }

  function chatFor(scopeId) {
    const id = String(scopeId || "").replace(/^chat:/, "");
    return (state.chats || []).find((c) => c.id === id) || null;
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

  /* ---------- carrying chats to the other devices ---------- */
  /* Only chats travel: the people and their passcodes stay in the published file. */
  function chatBundle() {
    return {
      v: 1,
      chats: state.chats || [],
      messages: state.messages || [],
      deleted: (state.deleted || []).slice(-300),
    };
  }

  /* Messages are merged, never replaced, and nothing is ever removed just
     because the other device has not seen it: a device that only carries a few
     messages must not be able to empty the others. Only an explicit removal
     (state.deleted) takes a message away, and an edit wins by its time. */
  function receiveChats(bundle, at) {
    if (!bundle || !Array.isArray(bundle.messages)) return false;
    const me = current();
    const incoming = new Map();
    bundle.messages.forEach((m) => {
      /* a worker's device keeps only the chats that worker may open */
      if (!m || !m.id || !me || !canSeeScope(m.scope, me)) return;
      incoming.set(m.id, m);
    });
    const gone = new Set((Array.isArray(bundle.deleted) ? bundle.deleted : []).map((d) => d && d.id).filter(Boolean));
    let changed = false;
    if (gone.size) {
      if (!Array.isArray(state.deleted)) state.deleted = [];
      const known = new Set(state.deleted.map((d) => d && d.id));
      gone.forEach((id) => {
        if (!known.has(id)) {
          state.deleted.push({ id, at: Number(at || Date.now()) });
          changed = true;
        }
      });
    }
    const next = [];
    state.messages.forEach((m) => {
      if (gone.has(m.id)) {
        changed = true;
        return;
      }
      const remote = incoming.get(m.id);
      if (remote) {
        incoming.delete(m.id);
        const pick = (remote.editedAt || 0) > (m.editedAt || 0) ? remote : m;
        if (pick !== m) changed = true;
        next.push(pick);
      } else {
        next.push(m);
      }
    });
    incoming.forEach((m) => {
      if (gone.has(m.id)) return;
      next.push(m);
      changed = true;
    });
    (Array.isArray(bundle.chats) ? bundle.chats : []).forEach((c) => {
      if (!c || !c.id) return;
      if (!(state.chats || []).some((x) => x.id === c.id)) {
        if (!Array.isArray(state.chats)) state.chats = [];
        state.chats.push(c);
        changed = true;
      }
    });
    if (!changed) return false;
    next.sort((a, b) => (a.at || 0) - (b.at || 0));
    state.messages = next;
    save();
    if (window.PowerplaySync && window.PowerplaySync.refresh) window.PowerplaySync.refresh(KEY);
    return true;
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
    if (!Array.isArray(state.deleted)) state.deleted = [];
    state.deleted.push({ id, at: Date.now() });
    state.deleted = state.deleted.slice(-300);
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
    publishBoard();
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
    refreshShared,
    publishBoard,
    chatBundle,
    receiveChats,
    logout,
    visibleScopes,
    createChat,
    chatFor,
    fileText,
    mergeBackup,
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
    reload,
    save,
  };
})();
