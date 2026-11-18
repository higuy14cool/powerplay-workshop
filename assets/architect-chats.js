/* Saved Architect conversations.
   Every conversation belongs to the signed-in account, so it is the same chat whether
   you are on the website, in the installed app, or back after a restart. Conversations
   made before signing in are adopted by the account that signs in next. */
(function () {
  const KEY = "powerplay.architect.chats.v1";
  const GUEST = "guest";
  let db = null;
  let onOpen = null;
  let shownId = null;

  function blank() {
    return { v: 1, current: {}, chats: {} };
  }

  function read() {
    if (db) return db;
    try {
      const raw = localStorage.getItem(KEY);
      const data = raw ? JSON.parse(raw) : null;
      db = data && data.chats ? data : blank();
    } catch (err) {
      db = blank();
    }
    return db;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (err) {
      /* full storage: the chat still works for this session */
    }
  }

  function ownerId() {
    const accounts = window.PowerplayAccounts;
    const me = accounts && accounts.current && accounts.current();
    return (me && me.id) || GUEST;
  }

  function bucket(owner) {
    const d = read();
    if (!Array.isArray(d.chats[owner])) d.chats[owner] = [];
    return d.chats[owner];
  }

  /* Conversations started before anyone signed in belong to whoever signs in now. */
  function adopt() {
    const owner = ownerId();
    const d = read();
    const guest = d.chats[GUEST];
    if (owner === GUEST || !Array.isArray(guest) || !guest.length) return 0;
    const mine = bucket(owner);
    let moved = 0;
    guest.forEach((chat) => {
      if (mine.some((c) => c.id === chat.id)) return;
      mine.push(chat);
      moved++;
    });
    delete d.chats[GUEST];
    if (d.current[GUEST] && mine.some((c) => c.id === d.current[GUEST])) d.current[owner] = d.current[GUEST];
    delete d.current[GUEST];
    save();
    if (moved) render();
    return moved;
  }

  function list() {
    // reading must never invent a bucket for whoever is not signed in
    const chats = read().chats[ownerId()] || [];
    return chats.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  function find(id) {
    return bucket(ownerId()).find((c) => c.id === id) || null;
  }

  function currentSession() {
    const id = read().current[ownerId()];
    return id ? find(id) : null;
  }

  function newId() {
    return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function titleFor(text) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    if (!clean) return "New chat";
    return clean.length > 48 ? clean.slice(0, 47).trimEnd() + "…" : clean;
  }

  function create(owner) {
    const d = read();
    const chat = { id: newId(), title: "New chat", updatedAt: Date.now(), messages: [], plan: null };
    bucket(owner).push(chat);
    d.current[owner] = chat.id;
    return chat;
  }

  /* Called for every bubble; the greeting is not recorded because it has no session yet. */
  function record(role, text) {
    adopt();
    const owner = ownerId();
    let chat = currentSession();
    if (!chat) {
      if (role !== "me") return;
      chat = create(owner);
    }
    chat.messages.push({ role, text: String(text || "") });
    if (role === "me" && (chat.title === "New chat" || !chat.title)) chat.title = titleFor(text);
    chat.updatedAt = Date.now();
    save();
    render();
  }

  function setPlan(plan) {
    const chat = currentSession();
    if (!chat || !plan) return;
    chat.plan = plan;
    chat.updatedAt = Date.now();
    save();
  }

  function startNew() {
    read().current[ownerId()] = null;
    save();
    render();
  }

  function selectChat(id) {
    const chat = find(id);
    if (!chat) return null;
    read().current[ownerId()] = id;
    shownId = id;
    save();
    render();
    if (onOpen) onOpen(chat);
    return chat;
  }

  function remove(id) {
    const owner = ownerId();
    const d = read();
    d.chats[owner] = bucket(owner).filter((c) => c.id !== id);
    if (d.current[owner] === id) d.current[owner] = null;
    save();
    render();
  }

  function exportAll() {
    const chats = list();
    const body = JSON.stringify({ v: 1, exportedAt: new Date().toISOString(), chats }, null, 2);
    const url = URL.createObjectURL(new Blob([body], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "powerplay-chats.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return chats.length;
  }

  function importAll(text) {
    const trimmed = String(text || "").trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    let rows = null;
    if (start >= 0 && end > start) {
      try {
        const data = JSON.parse(trimmed.slice(start, end + 1));
        rows = Array.isArray(data) ? data : Array.isArray(data.chats) ? data.chats : null;
      } catch (err) {
        rows = null;
      }
    }
    if (!rows) return null;
    adopt();
    const owner = ownerId();
    const mine = bucket(owner);
    let added = 0;
    rows.forEach((row) => {
      if (!row || !Array.isArray(row.messages) || !row.messages.length) return;
      if (mine.some((c) => c.id === row.id)) return;
      mine.push({
        id: row.id || newId(),
        title: String(row.title || titleFor((row.messages.find((m) => m.role === "me") || {}).text)),
        updatedAt: Number(row.updatedAt) || Date.now(),
        messages: row.messages
          .filter((m) => m && (m.role === "me" || m.role === "ai") && typeof m.text === "string")
          .map((m) => ({ role: m.role, text: m.text })),
        plan: row.plan || null,
      });
      added++;
    });
    save();
    render();
    return { added };
  }

  function when(ms) {
    const diff = Math.max(0, Date.now() - (ms || 0));
    const min = Math.round(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return min + "m ago";
    const hrs = Math.round(min / 60);
    if (hrs < 24) return hrs + "h ago";
    const days = Math.round(hrs / 24);
    return days === 1 ? "yesterday" : days + "d ago";
  }

  function render() {
    const row = document.getElementById("savedChatsRow");
    const wrap = document.getElementById("savedChats");
    if (!row || !wrap) return;
    adopt();
    const chats = list();
    const activeId = read().current[ownerId()];
    wrap.hidden = false;
    row.innerHTML = "";
    if (!chats.length) {
      const empty = document.createElement("p");
      empty.className = "saved-chats-empty";
      empty.textContent = "Nothing saved yet — your first message saves this chat here, side by side with the next one.";
      row.appendChild(empty);
      return;
    }
    chats.forEach((chat) => {
      const card = document.createElement("div");
      card.className = "saved-chat" + (chat.id === activeId ? " is-active" : "");
      const open = document.createElement("button");
      open.type = "button";
      open.className = "saved-chat-open";
      const count = chat.messages.length;
      open.innerHTML =
        `<strong>${escapeHtml(chat.title)}</strong>` +
        `<span>${count} ${count === 1 ? "message" : "messages"} · ${when(chat.updatedAt)}</span>` +
        (chat.plan ? `<em>${escapeHtml(chat.plan.name || "Blueprint")}</em>` : "");
      open.addEventListener("click", () => selectChat(chat.id));
      const del = document.createElement("button");
      del.type = "button";
      del.className = "saved-chat-del";
      del.title = "Delete this chat";
      del.setAttribute("aria-label", "Delete " + chat.title);
      del.innerHTML = "&times;";
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        if (window.confirm(`Delete “${chat.title}”?`)) remove(chat.id);
      });
      card.appendChild(open);
      card.appendChild(del);
      row.appendChild(card);
    });
  }

  function escapeHtml(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function restoreCurrent() {
    adopt();
    const chat = currentSession();
    if (!chat || !chat.messages.length) return null;
    shownId = chat.id;
    return chat;
  }

  /* The account is only known once someone signs in: open the chat that belongs to it. */
  function syncToAccount() {
    adopt();
    render();
    const chat = currentSession();
    if (chat && chat.messages.length && chat.id !== shownId) {
      shownId = chat.id;
      if (onOpen) onOpen(chat);
    }
  }

  function bind() {
    const saveBtn = document.getElementById("chatsSave");
    const loadBtn = document.getElementById("chatsLoad");
    const input = document.getElementById("chatsLoadInput");
    if (saveBtn) saveBtn.addEventListener("click", () => {
      const n = exportAll();
      if (window.PowerplayApp) window.PowerplayApp.toast(`Saved ${n} ${n === 1 ? "chat" : "chats"} to a file.`);
    });
    if (loadBtn && input) {
      loadBtn.addEventListener("click", () => input.click());
      input.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = "";
        if (file) importFile(file);
      });
    }
  }

  function importFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const res = importAll(reader.result);
      if (!res) {
        if (window.PowerplayApp) window.PowerplayApp.toast("That file does not look like a chat file.", "err");
        return;
      }
      if (window.PowerplayApp) {
        window.PowerplayApp.toast(
          res.added ? `Loaded ${res.added} ${res.added === 1 ? "chat" : "chats"}.` : "Those chats are already here.",
          "ok"
        );
      }
    };
    reader.readAsText(file);
  }

  window.PowerplayChats = {
    record,
    setPlan,
    startNew,
    open: selectChat,
    remove,
    list,
    restoreCurrent,
    syncToAccount,
    exportAll,
    importAll,
    adopt,
    render,
    when,
    onOpen: (fn) => { onOpen = fn; },
  };

  document.addEventListener("DOMContentLoaded", () => {
    bind();
    render();
  });
})();
