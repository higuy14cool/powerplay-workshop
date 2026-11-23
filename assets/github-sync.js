/* Keeps the workshop's games safe on GitHub.

   A static page cannot write to a repository by itself, so the owner pastes a
   fine-grained token once (Contents: read and write, on one repository). The token
   stays in this browser's localStorage, is sent only to api.github.com and is never
   displayed again. Every save of the game library or of the manual game edits is
   committed a few seconds later; an unchanged library is not committed twice. */
(function () {
  const KEY = "powerplay.github.v1";
  const GAMES = "powerplay.games.v3";
  const EDITS = "powerplay.playedits.v2";
  const API = "https://api.github.com";
  const MAX_CHARS = 900000;
  const DEFAULTS = { branch: "main", path: "data/games.json" };

  function config() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
    } catch (err) {
      saved = {};
    }
    return Object.assign({ owner: "", repo: "", token: "", lastHash: "", lastAt: "", lastError: "" }, DEFAULTS, saved);
  }

  function writeConfig(next) {
    const cfg = Object.assign(config(), next);
    localStorage.setItem(KEY, JSON.stringify(cfg));
    paint();
    return cfg;
  }

  const ready = () => {
    const c = config();
    return !!(c.owner && c.repo && c.token);
  };

  function hash(text) {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16) + "-" + text.length;
  }

  function b64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  }

  function fromB64(text) {
    const binary = atob(String(text || "").replace(/\s+/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function snapshot() {
    let games = [];
    let edits = {};
    try {
      games = JSON.parse(localStorage.getItem(GAMES) || "[]");
    } catch (err) {
      games = [];
    }
    try {
      edits = JSON.parse(localStorage.getItem(EDITS) || "{}");
    } catch (err) {
      edits = {};
    }
    return { app: "POWERPLAY Workshop", savedAt: new Date().toISOString(), games, edits };
  }

  function message(res) {
    if (res.status === 401) return "GitHub refused the token. Make a new one with Contents: read and write, then paste it here.";
    if (res.status === 403) return "That token may read but not write this repository. Give it Contents: read and write.";
    if (res.status === 404) return "GitHub cannot find that repository or its branch. Check the owner, repository and branch.";
    if (res.status === 409 || res.status === 422) return "GitHub had a newer copy of the file. Try again.";
    if (res.status === 429) return "GitHub asked for a short pause. It will try again.";
    const detail = res.body && res.body.message ? " (" + res.body.message + ")" : "";
    return "GitHub answered " + res.status + detail;
  }

  async function request(path, init) {
    const cfg = config();
    const options = Object.assign({}, init || {});
    options.headers = Object.assign(
      {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + cfg.token,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      options.headers || {}
    );
    const res = await fetch(API + path, options);
    let body = null;
    try {
      body = res.status === 204 ? null : await res.json();
    } catch (err) {
      body = null;
    }
    return { ok: res.ok, status: res.status, body };
  }

  const contentsPath = (cfg) =>
    "/repos/" + encodeURIComponent(cfg.owner) + "/" + encodeURIComponent(cfg.repo) +
    "/contents/" + String(cfg.path).split("/").map(encodeURIComponent).join("/");

  function tell(text, state) {
    if (window.PowerplayApp && window.PowerplayApp.toast) window.PowerplayApp.toast(text, state);
    console.info("POWERPLAY GitHub:", text);
  }

  let busy = false;
  let queued = false;
  let timer = 0;

  async function push(reason) {
    if (!ready()) {
      paint();
      return false;
    }
    if (busy) {
      queued = true;
      return false;
    }
    busy = true;
    paint("saving");
    try {
      const cfg = config();
      const data = snapshot();
      const text = JSON.stringify(data, null, 2);
      const print = hash(JSON.stringify({ games: data.games, edits: data.edits }));
      if (text.length > MAX_CHARS) {
        throw new Error("The games are too big for one GitHub file (" + Math.round(text.length / 1024) + " KB); split the largest game first.");
      }
      if (reason === "auto" && print === cfg.lastHash) return true;
      const url = contentsPath(cfg);
      const head = await request(url + "?ref=" + encodeURIComponent(cfg.branch), { method: "GET" });
      let sha = null;
      if (head.ok && head.body && head.body.sha) sha = head.body.sha;
      else if (head.status !== 404) throw new Error(message(head));

      const commit = {
        message: "POWERPLAY: save games " + new Date().toISOString().slice(0, 16).replace("T", " "),
        content: b64(text),
        branch: cfg.branch,
      };
      if (sha) commit.sha = sha;
      const send = () =>
        request(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(commit),
        });

      let res = await send();
      if (res.status === 409 || res.status === 422) {
        const again = await request(url + "?ref=" + encodeURIComponent(cfg.branch), { method: "GET" });
        if (again.ok && again.body && again.body.sha) {
          commit.sha = again.body.sha;
          res = await send();
        }
      }
      if (!res.ok) throw new Error(message(res));
      writeConfig({ lastHash: print, lastAt: new Date().toISOString(), lastError: "" });
      tell("Games saved to GitHub", "ok");
      return true;
    } catch (err) {
      const text = String((err && err.message) || err);
      writeConfig({ lastError: text });
      tell("GitHub save failed — " + text, "error");
      return false;
    } finally {
      busy = false;
      paint();
      if (queued) {
        queued = false;
        schedule();
      }
    }
  }

  async function pull() {
    if (!ready()) {
      paint();
      return false;
    }
    paint("saving");
    try {
      const cfg = config();
      const url = contentsPath(cfg);
      const res = await request(url + "?ref=" + encodeURIComponent(cfg.branch), { method: "GET" });
      if (!res.ok) throw new Error(message(res));
      const data = JSON.parse(fromB64(res.body.content));
      if (!data || !Array.isArray(data.games)) throw new Error("That file is not a POWERPLAY game file.");
      localStorage.setItem(GAMES, JSON.stringify(data.games));
      if (data.edits && typeof data.edits === "object") {
        localStorage.setItem(EDITS, JSON.stringify(data.edits));
      }
      writeConfig({
        lastHash: hash(JSON.stringify({ games: data.games, edits: data.edits || {} })),
        lastAt: new Date().toISOString(),
        lastError: "",
      });
      tell("Restored " + data.games.length + " game(s) from GitHub", "ok");
      return true;
    } catch (err) {
      const text = String((err && err.message) || err);
      writeConfig({ lastError: text });
      tell("GitHub restore failed — " + text, "error");
      return false;
    } finally {
      paint();
    }
  }

  function schedule() {
    if (!ready()) return;
    clearTimeout(timer);
    timer = setTimeout(() => push("auto"), 4000);
  }

  function when(iso) {
    if (!iso) return "never";
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "a moment ago";
    if (mins < 60) return mins + " min ago";
    return new Date(iso).toLocaleString();
  }

  function paint(state) {
    const chip = document.getElementById("ghChip");
    const label = document.getElementById("ghChipLabel");
    const line = document.getElementById("ghState");
    const cfg = config();
    const on = !!(cfg.owner && cfg.repo && cfg.token);
    if (label) label.textContent = state === "saving" ? "GitHub · saving…" : on ? "GitHub · on" : "GitHub · off";
    if (chip) chip.dataset.state = state || (on ? "on" : "off");
    if (!line) return;
    if (state === "saving") {
      line.textContent = "Talking to GitHub…";
      return;
    }
    if (!on) {
      line.textContent = "No token yet, so your games live only in this browser. Add one below and they back up to GitHub on every save.";
      return;
    }
    let games = 0;
    try {
      games = (JSON.parse(localStorage.getItem(GAMES) || "[]") || []).length;
    } catch (err) {
      games = 0;
    }
    line.textContent = cfg.lastError
      ? "Last try: " + cfg.lastError
      : "Backing up to " + cfg.owner + "/" + cfg.repo + " (" + cfg.path + ", " + cfg.branch + ") · " + games + " game(s) · last save " + when(cfg.lastAt) + ".";
  }

  function bind() {
    const chip = document.getElementById("ghChip");
    const modal = document.getElementById("ghModal");
    if (!chip || !modal) return;
    const field = (id) => document.getElementById(id);
    const owner = field("ghOwner");
    const repo = field("ghRepo");
    const branch = field("ghBranch");
    const file = field("ghPath");
    const token = field("ghToken");

    function fill() {
      const cfg = config();
      if (owner) owner.value = cfg.owner || "higuy14cool";
      if (repo) repo.value = cfg.repo || "powerplay-workshop";
      if (branch) branch.value = cfg.branch || "main";
      if (file) file.value = cfg.path || DEFAULTS.path;
      if (token) token.value = "";
      paint();
    }

    function collect() {
      return {
        owner: (owner && owner.value.trim()) || "",
        repo: (repo && repo.value.trim()) || "",
        branch: (branch && branch.value.trim()) || "main",
        path: (file && file.value.trim()) || DEFAULTS.path,
        token: (token && token.value.trim()) || config().token,
      };
    }

    function open() {
      fill();
      if (window.PowerplayApp && window.PowerplayApp.openModal) window.PowerplayApp.openModal("gh");
      else modal.hidden = false;
    }

    chip.addEventListener("click", open);
    const close = field("ghClose");
    if (close) close.addEventListener("click", () => {
      if (window.PowerplayApp && window.PowerplayApp.closeModal) window.PowerplayApp.closeModal();
      else modal.hidden = true;
    });

    const save = field("ghSave");
    if (save) {
      save.addEventListener("click", async () => {
        const next = collect();
        const missing = [];
        if (!next.owner) missing.push("owner");
        if (!next.repo) missing.push("repository");
        if (!next.token) missing.push("token");
        if (missing.length) {
          tell("Add the " + missing.join(", ") + " first", "error");
          return;
        }
        writeConfig(next);
        if (token) token.value = "";
        tell("GitHub backup is on", "ok");
        await push("manual");
      });
    }

    const now = field("ghPush");
    if (now) now.addEventListener("click", () => push("manual"));
    const restore = field("ghPull");
    if (restore) {
      restore.addEventListener("click", async () => {
        const ok = window.confirm(
          "Replace the games in this browser with the copy saved on GitHub? Anything only in this browser is replaced."
        );
        if (ok) await pull();
      });
    }
  }

  window.addEventListener("powerplay:saved", (ev) => {
    const key = ev && ev.detail && ev.detail.key;
    if (key === GAMES || key === EDITS) schedule();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden || !ready()) return;
    clearTimeout(timer);
    push("auto");
  });

  window.PowerplayGithub = { config, push, pull, ready, paint };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
