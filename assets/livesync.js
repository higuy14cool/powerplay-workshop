/* Keeps every open POWERPLAY window in step and says, quietly, that the work is saved.
   Every module already writes through localStorage, so one listener covers games,
   manual edits, accounts, assigned games, chats and profile colours. */
(function () {
  const PREFIX = "powerplay.";

  const chip = () => document.getElementById("saveChip");
  let chipTimer = 0;
  let confirmTimer = 0;

  function time() {
    try {
      return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (err) {
      return "";
    }
  }

  function flash(text, state) {
    const el = chip();
    if (!el) return;
    el.textContent = text;
    el.dataset.state = state || "ok";
    el.hidden = false;
    el.classList.add("is-on");
    clearTimeout(chipTimer);
    chipTimer = setTimeout(() => el.classList.remove("is-on"), 2600);
  }

  /* A repaint must not swallow the half-typed message in the box someone is using. */
  function keepFocus(work) {
    const el = document.activeElement;
    const snap =
      el && el.tagName && /^(INPUT|TEXTAREA)$/.test(el.tagName) && el.id
        ? { id: el.id, start: el.selectionStart, end: el.selectionEnd, value: el.value }
        : null;
    work();
    if (!snap) return;
    const again = document.getElementById(snap.id);
    if (!again || typeof again.value !== "string") return;
    if (again.value !== snap.value) again.value = snap.value;
    again.focus({ preventScroll: true });
    try {
      again.setSelectionRange(snap.start, snap.end);
    } catch (err) {
      /* an input type that has no selection */
    }
  }

  function refresh(key) {
    const k = String(key || "");
    keepFocus(() => {
      try {
        if (!k || k === "powerplay.games.v3") {
          if (window.PowerplayApp && window.PowerplayApp.refresh) window.PowerplayApp.refresh();
        } else if (k.indexOf("powerplay.accounts") === 0) {
          if (window.PowerplayAppMode && window.PowerplayAppMode.refreshLive) window.PowerplayAppMode.refreshLive();
          else if (window.PowerplayAccounts && window.PowerplayAccounts.reload) window.PowerplayAccounts.reload();
        } else if (k.indexOf("powerplay.playedits") === 0) {
          if (window.PowerplayStage && window.PowerplayStage.refresh) window.PowerplayStage.refresh();
        } else if (k === "powerplay.architect.chats.v1") {
          if (window.PowerplayChats && window.PowerplayChats.render) window.PowerplayChats.render();
        }
      } catch (err) {
        console.warn("POWERPLAY could not apply a change to this window", err);
      }
    });
  }

  /* Opening the app writes its own seed data back; that is not something to announce. */
  const startedAt = Date.now();
  let touched = false;
  ["pointerdown", "keydown", "touchstart"].forEach((type) =>
    window.addEventListener(type, () => (touched = true), { once: true, passive: true })
  );

  /* Our own write: confirm it on screen and tell the other windows. */
  window.addEventListener("powerplay:saved", () => {
    if (!touched && Date.now() - startedAt < 1500) return;
    flash("Saving…", "saving");
    clearTimeout(confirmTimer);
    confirmTimer = setTimeout(() => flash("Saved " + time(), "ok"), 320);
  });

  /* The other windows' writes: realtime, no reload, no button. */
  window.addEventListener("storage", (e) => {
    if (!e.key || e.key.indexOf(PREFIX) !== 0) return;
    refresh(e.key);
    flash("Updated from your other window", "remote");
  });

  /* A quarter-second batch can still be in flight when the app is closed. */
  function flushNow() {
    if (window.PowerplayAutoSave && window.PowerplayAutoSave.flush) window.PowerplayAutoSave.flush();
  }
  window.addEventListener("pagehide", flushNow);
  window.addEventListener("beforeunload", flushNow);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) flushNow();
  });

  window.PowerplaySync = { refresh, flash, flushNow };
})();
