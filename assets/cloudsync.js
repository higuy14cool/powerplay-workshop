/* Carries the work between devices of the same workshop: a chat typed on the
   computer shows on the iPad a few seconds later, and the other way round.
   The channel is a public relay (no account, no key), so everything sent here
   is as public as the published people file: pictures and text only, and the
   signed-in account decides what each device actually keeps and shows. */
(function () {
  const TOPIC = "powerplay-higuy14cool-workshop-sync-v1";
  /* A test or a second workshop can point at its own channel without touching
     anybody's real data: localStorage["powerplay.sync.topic"] = "another-topic". */
  function base() {
    let name = TOPIC;
    try {
      const custom = localStorage.getItem("powerplay.sync.topic");
      if (custom && custom.trim()) name = custom.trim();
    } catch (err) {}
    /* A copy opened on this computer is a test copy: it keeps its own channel so
       a trial can never land in the workshop's real one. */
    try {
      const host = String(location.hostname || "");
      if (!host || host === "localhost" || host === "127.0.0.1" || location.protocol === "file:") {
        name += "-dev";
      }
    } catch (err) {}
    return "https://ntfy.sh/" + name;
  }
  const STORE = "powerplay.cloud.v1";
  const PREFIX = "powerplay.";
  const LIMIT = 2600; // a relay message holds 4 KB; stay well under it
  const POLL = 10000;

  /* Accounts travels as chats only: the people and their passcodes stay in the
     backup file, never on this channel. */
  const KEYS = {
    "powerplay.games.v3": "games",
    "powerplay.playedits.v2": "edits",
    "powerplay.architect.chats.v1": "architect",
    "powerplay.accounts.v1": "chats",
  };

  let quiet = 0;
  let applying = false;
  let pollTimer = 0;
  let pushTimers = {};
  let started = false;

  function read() {
    try {
      return JSON.parse(localStorage.getItem(STORE) || "{}") || {};
    } catch (err) {
      return {};
    }
  }
  function write(patch) {
    const next = Object.assign(read(), patch || {});
    try {
      localStorage.setItem(STORE, JSON.stringify(next));
    } catch (err) {
      /* storage full: the marker is an optimisation, not the data */
    }
    return next;
  }

  function device() {
    const db = read();
    if (db.device) return db.device;
    const id = "d" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    write({ device: id });
    return id;
  }

  /* A received event must not be pushed back out as if it were new work. */
  const waiting = {};

  function silently(work) {
    applying = true;
    quiet++;
    try {
      return work();
    } finally {
      quiet--;
      setTimeout(() => {
        applying = quiet > 0;
        /* a change made while a merge was running is sent now, not lost */
        Object.keys(waiting).forEach((key) => {
          if (!waiting[key]) return;
          waiting[key] = false;
          schedulePush(key);
        });
      }, 400);
    }
  }

  function touch(key, at) {
    const db = read();
    db.rev = db.rev || {};
    db.rev[key] = Math.max(Number(db.rev[key] || 0), Number(at || 0));
    write({ rev: db.rev });
  }

  function accountsChats() {
    const A = window.PowerplayAccounts;
    if (!A || !A.chatBundle) return null;
    return A.chatBundle();
  }

  const HARD_MAX = 150000; // past this the relay is the wrong tool
  const CHAT_MAX = 80000;

  /* A picture is up to 900 KB — far more than a relay message holds — so the
     biggest pictures step aside and the words still arrive. The device that
     took the picture keeps it and its next backup carries it. */
  function fitChats(bundle) {
    let text = JSON.stringify(bundle);
    if (text.length <= CHAT_MAX) return text;
    const copy = JSON.parse(text);
    const heavy = copy.messages
      .filter((m) => m && m.image && m.image.src)
      .sort((x, y) => (y.image.src.length || 0) - (x.image.src.length || 0));
    for (const m of heavy) {
      if (text.length <= CHAT_MAX) break;
      const target = copy.messages.find((x) => x.id === m.id);
      if (target) target.image = { omitted: true, name: m.image.name || "picture" };
      text = JSON.stringify(copy);
    }
    return text;
  }

  function bodyOf(key) {
    if (key === "powerplay.accounts.v1") {
      const bundle = accountsChats();
      return bundle ? fitChats(bundle) : null;
    }
    const text = localStorage.getItem(key);
    if (text && text.length > HARD_MAX) return null;
    return text;
  }

  /* ---------- sending ---------- */
  function pieces(text) {
    const out = [];
    for (let i = 0; i < text.length; i += LIMIT) out.push(text.slice(i, i + LIMIT));
    return out;
  }

  const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

  async function post(message, title, tries = 2) {
    for (let attempt = 0; attempt < tries; attempt++) {
      try {
        const res = await fetch(base(), {
          method: "POST",
          headers: { "Content-Type": "text/plain", Title: title || "POWERPLAY sync" },
          body: message,
        });
        if (res.ok) return true;
        /* the relay is busy: wait and try once more instead of losing the change */
        if (res.status !== 429 && res.status < 500) return false;
      } catch (err) {
        /* offline: fall through to the retry */
      }
      await sleep(3000);
    }
    return false;
  }

  const sent = {};

  async function pushKey(key) {
    const kind = KEYS[key];
    if (!kind || !signedIn()) return false;
    const body = bodyOf(key);
    if (body == null) return false;
    if (sent[key] === body) return false; // nothing new to carry
    const at = Date.now();
    const parts = pieces(body);
    const id = "e" + at.toString(36) + Math.random().toString(36).slice(2, 6);
    const head = { k: "pp", id, key, kind, at, from: device(), n: parts.length };
    const ok = await post(JSON.stringify(Object.assign({ part: 0, body: parts[0] }, head)));
    if (!ok) return false;
    for (let i = 1; i < parts.length; i++) {
      const more = await post(JSON.stringify({ k: "pp", id, part: i, n: parts.length, body: parts[i] }));
      if (!more) return false;
    }
    touch(key, at);
    sent[key] = body;
    return true;
  }

  /* ---------- applying ---------- */
  function applyChats(ev) {
    const A = window.PowerplayAccounts;
    if (!A || !A.receiveChats) return false;
    let bundle = null;
    try {
      bundle = JSON.parse(ev.body);
    } catch (err) {
      return false;
    }
    return A.receiveChats(bundle, ev.at);
  }

  /* Pieces added on two devices must both survive: an edit book is merged page by
     page and piece by piece, never swapped wholesale. Deleting a piece is the one
     thing that does not travel this way — the other device's copy puts it back. */
  function mergeEdits(mine, theirs) {
    let a = {};
    let b = {};
    try {
      a = JSON.parse(mine || "{}") || {};
      b = JSON.parse(theirs || "{}") || {};
    } catch (err) {
      return null;
    }
    const out = JSON.parse(JSON.stringify(a));
    Object.keys(b).forEach((gameId) => {
      const remote = b[gameId];
      if (!remote || !Array.isArray(remote.pages)) return;
      if (!out[gameId] || !Array.isArray(out[gameId].pages)) {
        out[gameId] = JSON.parse(JSON.stringify(remote));
        return;
      }
      const book = out[gameId];
      remote.pages.forEach((page) => {
        if (!page || !page.id) return;
        const here = book.pages.find((x) => x.id === page.id);
        if (!here) {
          book.pages.push(JSON.parse(JSON.stringify(page)));
          return;
        }
        if (!here.name && page.name) here.name = page.name;
        /* an explicit removal list travels, so a piece taken away on one device
           stays away; anything simply missing is kept, never guessed at */
        if (Array.isArray(page.gone) && page.gone.length && Array.isArray(here.parts)) {
          const drop = new Set(page.gone);
          here.parts = here.parts.filter((x) => !x || !drop.has(x.id));
        }
        const known = new Set((here.parts || []).map((x) => x && x.id));
        (page.parts || []).forEach((part) => {
          if (part && part.id && !known.has(part.id)) {
            here.parts = here.parts || [];
            here.parts.push(JSON.parse(JSON.stringify(part)));
          }
        });
      });
    });
    return JSON.stringify(out);
  }

  /* The game library is joined the same way, by game id: a game added on the
     iPad shows on the computer and nothing is dropped. */
  function mergeGames(mine, theirs) {
    let a = [];
    let b = [];
    try {
      a = JSON.parse(mine || "[]");
      b = JSON.parse(theirs || "[]");
    } catch (err) {
      return null;
    }
    if (!Array.isArray(a) || !Array.isArray(b)) return null;
    const out = a.slice();
    const known = new Set(a.map((g) => g && g.id));
    b.forEach((g) => {
      if (g && g.id && !known.has(g.id)) {
        out.push(g);
        known.add(g.id);
      }
    });
    return JSON.stringify(out);
  }

  /* The Architect's saved chats are joined the same way: a chat kept on one
     device is not dropped because another device has not got it, and the copy
     with the newer update wins inside a chat. */
  function mergeArchitect(mine, theirs) {
    let a = null;
    let b = null;
    try {
      a = JSON.parse(mine || "null");
      b = JSON.parse(theirs || "null");
    } catch (err) {
      return null;
    }
    if (!b || !b.chats) return null;
    const out = a && a.chats ? a : { v: 1, current: {}, chats: {} };
    out.v = out.v || 1;
    out.current = out.current || {};
    out.chats = out.chats || {};
    Object.keys(b.chats).forEach((userId) => {
      const list = b.chats[userId];
      if (!Array.isArray(list)) return;
      if (!Array.isArray(out.chats[userId])) out.chats[userId] = [];
      list.forEach((chat) => {
        if (!chat || !chat.id) return;
        const here = out.chats[userId].find((c) => c && c.id === chat.id);
        if (!here) out.chats[userId].push(chat);
        else if ((chat.updatedAt || 0) > (here.updatedAt || 0)) Object.assign(here, chat);
      });
    });
    Object.keys(b.current || {}).forEach((userId) => {
      if (!out.current[userId] && b.current[userId]) out.current[userId] = b.current[userId];
    });
    return JSON.stringify(out);
  }

  function merged(key, mine, theirs) {
    if (key === "powerplay.playedits.v2") return mergeEdits(mine, theirs);
    if (key === "powerplay.games.v3") return mergeGames(mine, theirs);
    if (key === "powerplay.architect.chats.v1") return mergeArchitect(mine, theirs);
    return null;
  }

  function applyRaw(ev) {
    const key = ev.key;
    const mine = localStorage.getItem(key);
    /* An unreadable incoming copy never replaces what is here: the worst case
       must be "nothing changed", never "my work is gone". */
    const next = merged(key, mine, ev.body);
    if (next == null) return false;
    if (next === mine) {
      touch(key, ev.at);
      return false;
    }
    localStorage.setItem(key, next);
    touch(key, ev.at);
    if (window.PowerplaySync && window.PowerplaySync.refresh) window.PowerplaySync.refresh(key);
    return true;
  }

  function apply(ev) {
    if (!ev || ev.from === device()) return false;
    if (!KEYS[ev.key]) return false;
    return silently(() => (ev.kind === "chats" ? applyChats(ev) : applyRaw(ev)));
  }

  /* ---------- receiving ---------- */
  const partial = {};

  function collect(row) {
    if (!row || row.k !== "pp") return null;
    if (row.n > 1) {
      const slot = partial[row.id] || (partial[row.id] = { got: 0, parts: [] });
      slot.parts[row.part] = row.body || "";
      slot.got++;
      if (row.key) slot.meta = row; // the part carrying the event's own fields
      if (slot.got < row.n) return null;
      delete partial[row.id];
      const full = slot.parts.join("");
      return Object.assign({}, slot.meta || row, { body: full });
    }
    return row;
  }

  let pausedUntil = 0;
  let backoff = 0;

  async function pull() {
    if (!signedIn()) return 0;
    if (Date.now() < pausedUntil) return 0;
    const db = read();
    const since = db.since || "all";
    let rows = [];
    try {
      const res = await fetch(base() + "/json?poll=1&since=" + encodeURIComponent(since), { cache: "no-store" });
      if (res.status === 429) {
        /* the free relay asks you to slow down now and then: wait, then catch up */
        backoff = Math.min(backoff ? backoff * 2 : 30000, 120000);
        pausedUntil = Date.now() + backoff;
        return 0;
      }
      if (!res.ok) return 0;
      backoff = 0;
      pausedUntil = 0;
      const text = await res.text();
      rows = text
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch (err) {
            return null;
          }
        })
        .filter(Boolean)
        .filter((r) => r.event === "message");
    } catch (err) {
      return 0;
    }
    let applied = 0;
    let lastId = db.since && db.since !== "all" ? db.since : null;
    rows.forEach((row) => {
      if (row.id) lastId = row.id;
      let payload = null;
      try {
        payload = JSON.parse(String(row.message || ""));
      } catch (err) {
        return;
      }
      const whole = collect(payload);
      if (!whole) return;
      if (apply(whole)) applied++;
    });
    if (rows.length && lastId) write({ since: lastId });
    else if (rows.length) write({ since: "all" });
    if (applied && window.PowerplaySync && window.PowerplaySync.flash) {
      window.PowerplaySync.flash("Brought over from your other device");
    }
    return applied;
  }

  function signedIn() {
    const A = window.PowerplayAccounts;
    return !!(A && A.current && A.current());
  }

  /* ---------- wiring ---------- */
  function schedulePush(key) {
    if (!signedIn()) return;
    if (applying || quiet) {
      waiting[key] = true;
      return;
    }
    if (pushTimers[key]) clearTimeout(pushTimers[key]);
    pushTimers[key] = setTimeout(() => {
      pushTimers[key] = null;
      pushKey(key);
    }, 2500);
  }

  function start() {
    if (started) return;
    started = true;
    device();
    window.addEventListener("powerplay:saved", (e) => {
      const key = e && e.detail && e.detail.key;
      if (!key || key.indexOf(PREFIX) !== 0) return;
      if (key === "powerplay.cloud.v1") return;
      if (KEYS[key]) schedulePush(key);
    });
    const tick = () => {
      if (!document.hidden) pull();
    };
    pollTimer = setInterval(tick, POLL);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) pull();
    });
    setTimeout(tick, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.PowerplayCloud = {
    TOPIC,
    start,
    pull,
    silently,
    pushKey,
    lastAt: () => Math.max(0, ...Object.values(read().rev || {})),
  };
})();
