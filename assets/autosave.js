/* Automatic saving for the whole workshop.
   Every "powerplay.*" value the app writes is copied into IndexedDB straight away, so a
   quota error, a half-written blob or a cleared localStorage never loses work: if the
   browser's storage comes back empty, the newest copy is put back and the page reloads.
   With a GitHub token saved (Workers -> Automatic backup) the people you add are also
   published to assets/accounts-data.js and the whole workshop to powerplay-backup.json,
   so uninstalling the app loses nothing. */
(function () {
  "use strict";

  const PREFIX = "powerplay.";
  const DB_NAME = "powerplay-autosave";
  const STORE = "kv";
  const META_KEY = "powerplay.autosave.meta";
  const SYNC_KEY = "powerplay.sync.v1";
  const SKIP_KEYS = [META_KEY, SYNC_KEY];
  const FLAG = "powerplay.autosave.restored";
  const BACKUP_URL = "powerplay-backup.json";
  const ACCOUNTS_FILE = "assets/accounts-data.js";
  const DEFAULT_SYNC = {
    repo: "higuy14cool/powerplay-workshop",
    branch: "main",
    token: "",
    auto: true,
    at: 0,
    ok: null,
    error: "",
  };

  const nativeSet = Storage.prototype.setItem;
  const nativeGet = Storage.prototype.getItem;
  const localSet = (key, value) => nativeSet.call(window.localStorage, key, value);

  function setting(key) {
    try {
      return nativeGet.call(window.localStorage, key);
    } catch (err) {
      return null;
    }
  }

  /* ---------- the IndexedDB copy ---------- */
  let dbPromise = null;

  function db() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      let req = null;
      try {
        req = window.indexedDB.open(DB_NAME, 1);
      } catch (err) {
        resolve(null);
        return;
      }
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    });
    return dbPromise;
  }

  function put(key, value) {
    return db().then((d) => {
      if (!d) return;
      return new Promise((resolve) => {
        try {
          const tx = d.transaction(STORE, "readwrite");
          tx.objectStore(STORE).put(value, key);
          tx.oncomplete = resolve;
          tx.onerror = resolve;
          tx.onabort = resolve;
        } catch (err) {
          resolve();
        }
      });
    });
  }

  function readAll() {
    return db().then((d) => {
      if (!d) return {};
      return new Promise((resolve) => {
        const out = {};
        try {
          const tx = d.transaction(STORE, "readonly");
          const req = tx.objectStore(STORE).openCursor();
          req.onsuccess = () => {
            const cursor = req.result;
            if (!cursor) {
              resolve(out);
              return;
            }
            out[cursor.key] = cursor.value;
            cursor.continue();
          };
          req.onerror = () => resolve(out);
        } catch (err) {
          resolve(out);
        }
      });
    });
  }

  /* Writes are batched for a quarter second: a chat send touches several keys. */
  const pending = new Map();
  let timer = 0;
  let followUp = null;

  function queue(key, value) {
    if (SKIP_KEYS.indexOf(key) >= 0) return;
    pending.set(key, value);
    if (timer) return;
    timer = setTimeout(flush, 250);
  }

  function flush() {
    timer = 0;
    const rows = Array.from(pending.entries());
    pending.clear();
    if (!rows.length) return Promise.resolve();
    return rows
      .reduce((chain, [key, value]) => chain.then(() => put(key, value)), Promise.resolve())
      .then(() => put(META_KEY, String(Date.now())))
      .then(() => {
        if (followUp) followUp();
      });
  }

  /* Every save in the app goes through here, whichever module made it. */
  try {
    Storage.prototype.setItem = function (key, value) {
      const result = nativeSet.call(this, key, value);
      try {
        if (this === window.localStorage && String(key).indexOf(PREFIX) === 0) {
          queue(String(key), String(value));
        }
      } catch (err) {
        /* a browser that refuses to compare storage objects still saves normally */
      }
      return result;
    };
  } catch (err) {
    /* no mirroring on this browser: the app still works on plain localStorage */
  }

  /* Copy what is already there, so the first reload after this update is covered too. */
  (function seed() {
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.indexOf(PREFIX) === 0 && SKIP_KEYS.indexOf(key) < 0) {
          queue(key, nativeGet.call(window.localStorage, key));
        }
      }
    } catch (err) {
      /* private mode */
    }
  })();

  /* ---------- put everything back after a wipe ---------- */
  function restoreFromMirror() {
    return readAll().then((all) => {
      let restored = 0;
      Object.keys(all).forEach((key) => {
        if (SKIP_KEYS.indexOf(key) >= 0) return;
        if (setting(key) != null) return;
        try {
          localSet(key, all[key]);
          restored++;
        } catch (err) {
          /* full storage: nothing more we can do */
        }
      });
      return restored;
    });
  }

  restoreFromMirror().then((restored) => {
    if (!restored) {
      try {
        window.sessionStorage.removeItem(FLAG);
      } catch (err) {}
      return;
    }
    let already = false;
    try {
      already = window.sessionStorage.getItem(FLAG) === "1";
      window.sessionStorage.setItem(FLAG, "1");
    } catch (err) {}
    if (already) return;
    /* the modules read storage when they load, so reload once with the data back */
    window.location.reload();
  });

  /* ---------- the snapshot that goes to GitHub ---------- */
  function snapshot() {
    const keys = {};
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (!key || key.indexOf(PREFIX) !== 0 || SKIP_KEYS.indexOf(key) >= 0) continue;
        keys[key] = nativeGet.call(window.localStorage, key);
      }
    } catch (err) {}
    return { v: 1, app: "POWERPLAY Workshop", at: new Date().toISOString(), keys };
  }

  function readSync() {
    let data = null;
    try {
      const raw = setting(SYNC_KEY);
      data = raw ? JSON.parse(raw) : null;
    } catch (err) {
      data = null;
    }
    const merged = Object.assign({}, DEFAULT_SYNC, data || {});
    if (typeof merged.auto !== "boolean") merged.auto = true;
    return merged;
  }

  function writeSync(patch) {
    const next = Object.assign(readSync(), patch || {});
    localSet(SYNC_KEY, JSON.stringify(next));
    renderStatus();
    return next;
  }

  /* ---------- GitHub ---------- */
  function b64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function headers(cfg) {
    return {
      Authorization: "Bearer " + cfg.token,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    };
  }

  /* What the repository holds now, so a backup adds to it instead of replacing it. */
  async function getFile(cfg, path) {
    const url = "https://api.github.com/repos/" + cfg.repo + "/contents/" + path;
    const res = await fetch(url + "?ref=" + encodeURIComponent(cfg.branch || "main"), {
      headers: headers(cfg),
      cache: "no-store",
    });
    if (res.status === 404) return { sha: null, text: "" };
    if (!res.ok) {
      const why = await res.json().catch(() => ({}));
      throw new Error(why.message || "GitHub said " + res.status);
    }
    const data = await res.json();
    let text = "";
    if (data && data.content) {
      const binary = atob(String(data.content).replace(/\s+/g, ""));
      text = new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
    }
    return { sha: (data && data.sha) || null, text };
  }

  function parseAccounts(text) {
    if (!text) return [];
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return [];
    try {
      const data = JSON.parse(text.slice(start, end + 1));
      return data && Array.isArray(data.users) ? data.users : [];
    } catch (err) {
      return [];
    }
  }

  async function putFile(cfg, path, text, message, sha) {
    const url = "https://api.github.com/repos/" + cfg.repo + "/contents/" + path;
    const body = { message, branch: cfg.branch || "main", content: b64(text) };
    if (sha) body.sha = sha;
    const res = await fetch(url, { method: "PUT", headers: headers(cfg), body: JSON.stringify(body) });
    if (!res.ok) {
      const why = await res.json().catch(() => ({}));
      throw new Error(why.message || "GitHub said " + res.status);
    }
    return true;
  }

  function accountsFileText() {
    const A = window.PowerplayAccounts;
    if (!A || !A.fileText) return null;
    return A.fileText();
  }

  let syncing = false;
  let syncTimer = 0;

  async function syncNow(options) {
    const cfg = readSync();
    const manual = !!(options && options.manual);
    if (!cfg.token || !cfg.repo) {
      if (manual) writeSync({ ok: false, error: "Add a GitHub token first." });
      return { ok: false, error: "Add a GitHub token first." };
    }
    const A = window.PowerplayAccounts;
    if (A && A.current && !A.isAdmin()) {
      if (manual) writeSync({ ok: false, error: "Only admins can back up." });
      return { ok: false, error: "Only admins can back up." };
    }
    if (syncing) return { ok: false, error: "A backup is already running." };
    syncing = true;
    notify();
    try {
      const snap = snapshot();
      const backup = await getFile(cfg, BACKUP_URL);
      await putFile(
        cfg,
        BACKUP_URL,
        JSON.stringify(snap, null, 2) + "\n",
        "Automatic backup of the workshop",
        backup.sha
      );
      const text = accountsFileText();
      if (text) {
        const published = await getFile(cfg, ACCOUNTS_FILE);
        const A = window.PowerplayAccounts;
        const merged = A && A.fileText ? A.fileText(parseAccounts(published.text)) : text;
        await putFile(cfg, ACCOUNTS_FILE, merged, "Automatic backup of the people in the workshop", published.sha);
      }
      writeSync({ at: Date.now(), ok: true, error: "" });
      return { ok: true };
    } catch (err) {
      const error = String((err && err.message) || err);
      writeSync({ at: Date.now(), ok: false, error });
      return { ok: false, error };
    } finally {
      syncing = false;
      notify();
    }
  }

  function scheduleSync() {
    const cfg = readSync();
    if (!cfg.auto || !cfg.token) return;
    const A = window.PowerplayAccounts;
    if (A && A.current && !A.isAdmin()) return;
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      syncTimer = 0;
      syncNow();
    }, 2500);
  }

  /* A change landed: mirror it (already queued) and, if allowed, back it up. */
  followUp = () => {
    renderStatus();
    scheduleSync();
  };

  /* ---------- reading a backup back ---------- */
  async function fetchBackup() {
    try {
      const res = await fetch(BACKUP_URL + "?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      return data && data.keys ? data : null;
    } catch (err) {
      return null;
    }
  }

  /* Bring a published backup into this browser. People come back first, then chats. */
  function applyBackup(data) {
    if (!data || !data.keys) return { added: 0, chats: 0 };
    const out = { added: 0, chats: 0 };
    const A = window.PowerplayAccounts;
    const raw = data.keys["powerplay.accounts.v1"];
    if (A && raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.users)) {
          const res = A.importAccounts(parsed.users);
          out.added = (res && (res.added + res.updated)) || 0;
          if (A.mergeBackup) {
            const merged = A.mergeBackup(parsed);
            out.chats += merged || 0;
          }
        }
      } catch (err) {}
    }
    const Chats = window.PowerplayChats;
    const arch = data.keys["powerplay.architect.chats.v1"];
    if (Chats && arch && Chats.importAll) {
      try {
        const res = Chats.importAll(arch);
        out.chats += (res && res.added) || 0;
      } catch (err) {}
    }
    return out;
  }

  /* A fresh install, or a browser whose data went away, puts itself back together from
     the published backup: people first, then chats and messages. */
  async function pullIfFresh() {
    const fresh = setting("powerplay.accounts.v1") == null && setting("powerplay.architect.chats.v1") == null;
    if (!fresh) return null;
    const data = await fetchBackup();
    if (!data) return null;
    const res = applyBackup(data);
    if (res.added || res.chats) {
      if (window.PowerplayApp && window.PowerplayApp.toast) {
        window.PowerplayApp.toast("Brought your workshop back from the automatic backup.", "ok");
      }
      setTimeout(() => window.location.reload(), 900);
    }
    return res;
  }

  /* ---------- the panel ---------- */
  function fmt(ms) {
    if (!ms) return "never";
    const diff = Math.max(0, Date.now() - ms);
    if (diff < 60000) return "just now";
    const min = Math.round(diff / 60000);
    if (min < 60) return min + " min ago";
    const hrs = Math.round(min / 60);
    if (hrs < 24) return hrs + " h ago";
    return Math.round(hrs / 24) + " d ago";
  }

  function statusLine() {
    const cfg = readSync();
    if (syncing) return "Backing up to GitHub…";
    if (!cfg.token) return "Saved automatically in this browser. Add a GitHub token below and an uninstall changes nothing.";
    if (cfg.ok === false) return "Backup failed: " + (cfg.error || "unknown reason");
    if (cfg.at) return "Backed up to GitHub " + fmt(cfg.at) + " — everything is safe.";
    return "Ready to back up to GitHub.";
  }

  function renderStatus() {
    const line = document.getElementById("backupState");
    if (!line) return;
    line.textContent = statusLine();
    const cfg = readSync();
    line.dataset.state = cfg.token ? (cfg.ok === false ? "bad" : "good") : "local";
    const token = document.getElementById("backupToken");
    const repo = document.getElementById("backupRepo");
    const branch = document.getElementById("backupBranch");
    const auto = document.getElementById("backupAuto");
    const now = document.getElementById("backupNow");
    if (token && document.activeElement !== token) token.value = cfg.token || "";
    if (repo && document.activeElement !== repo) repo.value = cfg.repo || "";
    if (branch && document.activeElement !== branch) branch.value = cfg.branch || "main";
    if (auto) auto.checked = cfg.auto !== false;
    if (now) now.disabled = syncing || !cfg.token;
  }

  function notify() {
    renderStatus();
  }

  function bindPanel() {
    const form = document.getElementById("backupForm");
    if (!form) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const token = (document.getElementById("backupToken").value || "").trim();
      const repo = (document.getElementById("backupRepo").value || "").trim() || DEFAULT_SYNC.repo;
      const branch = (document.getElementById("backupBranch").value || "").trim() || "main";
      const auto = !!document.getElementById("backupAuto").checked;
      writeSync({ token, repo, branch, auto });
      syncNow({ manual: true }).then((res) => {
        if (!window.PowerplayApp) return;
        window.PowerplayApp.toast(
          res.ok ? "Backed up — this workshop is safe now." : "Backup problem: " + res.error,
          res.ok ? "ok" : "err"
        );
      });
    });
    const now = document.getElementById("backupNow");
    if (now) {
      now.addEventListener("click", () => {
        syncNow({ manual: true }).then((res) => {
          if (!window.PowerplayApp) return;
          window.PowerplayApp.toast(
            res.ok ? "Backed up — this workshop is safe now." : "Backup problem: " + res.error,
            res.ok ? "ok" : "err"
          );
        });
      });
    }
    const pull = document.getElementById("backupPull");
    if (pull) {
      pull.addEventListener("click", async () => {
        if (!window.confirm("Bring everything from the GitHub backup into this browser?")) return;
        const data = await fetchBackup();
        if (!data) {
          if (window.PowerplayApp) window.PowerplayApp.toast("No backup found on GitHub yet.", "err");
          return;
        }
        const res = applyBackup(data);
        if (window.PowerplayApp) {
          const people = res.added + (res.added === 1 ? " person" : " people");
          const chats = res.chats + (res.chats === 1 ? " chat" : " chats");
          window.PowerplayApp.toast("Restored " + people + " and " + chats + ".", "ok");
        }
        setTimeout(() => window.location.reload(), 800);
      });
    }
    const auto = document.getElementById("backupAuto");
    if (auto) {
      auto.addEventListener("change", () => {
        writeSync({ auto: !!auto.checked });
        if (auto.checked) scheduleSync();
      });
    }
    renderStatus();
    setInterval(renderStatus, 30000);
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindPanel();
    pullIfFresh();
  });

  /* Closing the tab mid-batch should not lose the last message. */
  window.addEventListener("pagehide", () => {
    if (timer) clearTimeout(timer);
    flush();
  });

  window.PowerplayAutoSave = {
    snapshot,
    syncNow,
    status: readSync,
    render: renderStatus,
    fetchBackup,
    applyBackup,
    pullIfFresh,
    flush,
  };
})();
