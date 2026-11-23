/* The GitHub front door: one panel that drives the workshop's existing automatic backup
   (assets/autosave.js) so games, edits, people and chats are all saved in the repository,
   and a reinstall puts them back. The token is stored in this browser only. */
(function () {
  "use strict";

  const SYNC_KEY = "powerplay.sync.v1";
  const DEFAULTS = { repo: "higuy14cool/powerplay-workshop", branch: "main", token: "", auto: true, at: 0, ok: null, error: "" };

  const $ = (id) => document.getElementById(id);

  function config() {
    let saved = null;
    try {
      const raw = localStorage.getItem(SYNC_KEY);
      saved = raw ? JSON.parse(raw) : null;
    } catch (err) {
      saved = null;
    }
    const cfg = Object.assign({}, DEFAULTS, saved || {});
    if (typeof cfg.auto !== "boolean") cfg.auto = true;
    return cfg;
  }

  function writeConfig(patch) {
    const next = Object.assign(config(), patch || {});
    try {
      localStorage.setItem(SYNC_KEY, JSON.stringify(next));
    } catch (err) {}
    paint();
    return next;
  }

  const ready = () => {
    const cfg = config();
    return !!(cfg.token && cfg.repo);
  };

  function splitRepo(repo) {
    const parts = String(repo || "").split("/").filter(Boolean);
    return { owner: parts[0] || "", name: parts[1] || "" };
  }

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

  function stateText() {
    const cfg = config();
    if (!cfg.token) return "Backup is off. Saved in this browser only — add a token and an uninstall changes nothing.";
    if (cfg.ok === false) return "Backup failed: " + (cfg.error || "unknown reason") + " — your work is still in this browser.";
    if (cfg.at) return "Saved to " + cfg.repo + " " + fmt(cfg.at) + " — games, edits, people and chats are safe.";
    return "Ready to save to " + cfg.repo + ".";
  }

  function paint() {
    const cfg = config();
    const chip = $("ghChip");
    const label = $("ghChipLabel");
    const on = ready();
    if (chip) chip.dataset.state = !on ? "off" : cfg.ok === false ? "bad" : "on";
    if (label) label.textContent = "GitHub · " + (!on ? "off" : cfg.ok === false ? "failed" : "on");
    const line = $("ghState");
    if (line) line.textContent = stateText();

    const parts = splitRepo(cfg.repo);
    const set = (id, value) => {
      const el = $(id);
      if (el && document.activeElement !== el) el.value = value;
    };
    set("ghOwner", parts.owner);
    set("ghRepo", parts.name);
    set("ghBranch", cfg.branch || "main");
    const save = $("ghSave");
    if (save) save.textContent = on ? "Update backup" : "Turn on backup";
    const push = $("ghPush");
    if (push) push.disabled = !on;
  }

  function toast(text, kind) {
    if (window.PowerplayApp && window.PowerplayApp.toast) window.PowerplayApp.toast(text, kind || "ok");
  }

  async function run(options) {
    const A = window.PowerplayAutoSave;
    if (!A || !A.syncNow) return { ok: false, error: "Backup is not available on this page." };
    paint();
    const res = await A.syncNow(options || { manual: true });
    paint();
    return res;
  }

  function save() {
    const owner = ($("ghOwner").value || "").trim();
    const name = ($("ghRepo").value || "").trim();
    const branch = ($("ghBranch").value || "").trim() || "main";
    const token = ($("ghToken").value || "").trim();

    if (!owner || !name) {
      toast("Add the GitHub owner and repository.", "err");
      return;
    }
    if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(name)) {
      toast("That repository name has characters GitHub does not allow.", "err");
      return;
    }
    if (!token && !config().token) {
      toast("Paste a fine-grained GitHub token with Contents: read and write.", "err");
      return;
    }
    writeConfig({ repo: owner + "/" + name, branch: branch, token: token || config().token, auto: true });
    const field = $("ghToken");
    if (field) field.value = "";
    run({ manual: true }).then((res) => {
      toast(res.ok ? "Backup is on — an uninstall changes nothing now." : "Backup problem: " + res.error, res.ok ? "ok" : "err");
    });
  }

  async function restore() {
    if (!window.confirm("Bring the games, people and chats from the GitHub backup into this browser? What is only in this browser is kept, and nothing is ever removed.")) return;
    const A = window.PowerplayAutoSave;
    if (!A || !A.fetchBackup || !A.applyBackup) {
      toast("Restore is not available on this page.", "err");
      return;
    }
    const data = await A.fetchBackup();
    if (!data) {
      toast("No backup found on GitHub yet — turn backup on and save once.", "err");
      return;
    }
    const res = A.applyBackup(data);
    toast("Restored " + res.added + (res.added === 1 ? " person" : " people") + ", " + res.chats + (res.chats === 1 ? " chat" : " chats") + " and " + (res.games || 0) + " games or edits.", "ok");
    setTimeout(() => window.location.reload(), 900);
  }

  function bind() {
    const chip = $("ghChip");
    if (chip) chip.addEventListener("click", () => {
      paint();
      if (window.PowerplayApp && window.PowerplayApp.openModal) window.PowerplayApp.openModal("gh");
    });
    const saveBtn = $("ghSave");
    if (saveBtn) saveBtn.addEventListener("click", save);
    const pushBtn = $("ghPush");
    if (pushBtn) pushBtn.addEventListener("click", () => {
      run({ manual: true }).then((res) => {
        toast(res.ok ? "Saved to GitHub just now." : "Backup problem: " + res.error, res.ok ? "ok" : "err");
      });
    });
    const pullBtn = $("ghPull");
    if (pullBtn) pullBtn.addEventListener("click", restore);
    const modal = $("ghModal");
    if (modal) modal.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && event.target && event.target.tagName === "INPUT") {
        event.preventDefault();
        save();
      }
    });
    paint();
    setInterval(paint, 4000);
    window.addEventListener("focus", paint);
    document.addEventListener("visibilitychange", paint);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();

  window.PowerplayGithub = { config: config, writeConfig: writeConfig, ready: ready, paint: paint, save: save, run: run, restore: restore };
})();
