/* One install control for every game page — loaded as ../_install/app-install.js.
   Registers the game's service worker, reuses the browser's install prompt, and
   opens an install card when a play link asks for ?install=1. */
(function () {
  "use strict";

  const standalone =
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    window.navigator.standalone === true;
  const wantsInstall = new URLSearchParams(location.search).has("install");
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const title = (document.title || "This game").split(/[—|]/)[0].trim();

  let prompt = null;
  let host = null;
  let button = null;
  let sheet = null;

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  // Each game already ships its own install button (Dunkin', Hockey). Keep one control.
  function hideNativeButtons() {
    const css = document.createElement("style");
    css.textContent = "#installBtn,#btnInstall,.install-btn{display:none !important}";
    document.head.appendChild(css);
  }

  function style(el, css) {
    Object.assign(el.style, css);
    return el;
  }

  function build() {
    if (host || standalone) return;
    host = document.createElement("div");
    host.id = "ppInstallHost";
    style(host, { position: "fixed", right: "12px", bottom: "12px", zIndex: "2147483000", fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif" });

    button = document.createElement("button");
    button.type = "button";
    button.textContent = "⤓ Install app";
    button.setAttribute("aria-label", "Install " + title + " as an app");
    style(button, {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      minHeight: "44px",
      padding: "0 16px",
      border: "1px solid rgba(255,255,255,.28)",
      borderRadius: "999px",
      background: "rgba(10,11,16,.82)",
      color: "#f4f7ef",
      font: "800 13px/1 system-ui, -apple-system, Segoe UI, sans-serif",
      letterSpacing: ".2px",
      textTransform: "none",
      cursor: "pointer",
      boxShadow: "0 10px 24px rgba(0,0,0,.45)",
      backdropFilter: "blur(6px)",
    });
    button.addEventListener("click", () => (prompt ? install() : showSheet()));
    host.appendChild(button);
    document.body.appendChild(host);
    hideNativeButtons();
  }

  function closeSheet() {
    if (sheet) sheet.remove();
    sheet = null;
  }

  function showSheet() {
    closeSheet();
    sheet = style(document.createElement("div"), {
      position: "fixed",
      inset: "0",
      zIndex: "2147483001",
      display: "grid",
      placeItems: "center",
      padding: "18px",
      background: "rgba(4,6,10,.62)",
      fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
    });

    const card = style(document.createElement("div"), {
      maxWidth: "420px",
      width: "100%",
      background: "#0d1017",
      color: "#e9eef6",
      border: "1px solid rgba(255,255,255,.14)",
      borderRadius: "16px",
      padding: "20px",
      boxShadow: "0 24px 60px rgba(0,0,0,.6)",
    });

    const h = document.createElement("h2");
    h.textContent = "Install " + title;
    style(h, { margin: "0 0 8px", font: "800 17px/1.25 system-ui, sans-serif", textTransform: "none" });

    const p = document.createElement("p");
    p.textContent = prompt
      ? "Your browser will ask you to confirm. It then opens from your home screen or desktop like any other app."
      : isIOS
        ? "Safari installs from its Share menu — tap Share, then “Add to Home Screen”."
        : "This browser has not offered its install prompt yet. Tap the install icon in the address bar, or the ⋮ menu → Install app / Add to Home screen.";
    style(p, { margin: "0 0 12px", font: "400 13px/1.55 system-ui, sans-serif", color: "#b9c2d0" });

    card.appendChild(h);
    card.appendChild(p);

    if (prompt) {
      const go = document.createElement("button");
      go.type = "button";
      go.textContent = "Install now";
      style(go, {
        minHeight: "44px",
        width: "100%",
        border: "0",
        borderRadius: "10px",
        background: "#b8ff3d",
        color: "#0a0b10",
        font: "800 14px/1 system-ui, sans-serif",
        textTransform: "none",
        cursor: "pointer",
        marginBottom: "10px",
      });
      go.addEventListener("click", install);
      card.appendChild(go);
    }

    const list = document.createElement("ul");
    style(list, { margin: "0 0 14px", padding: "0 0 0 18px", font: "400 13px/1.6 system-ui, sans-serif", color: "#dce3ee" });
    [
      "Chrome / Edge (computer): install icon at the right of the address bar, or ⋮ → Cast, save and share → Install page as app.",
      "Android Chrome: ⋮ menu → Add to Home screen.",
      "iPhone / iPad Safari: Share → Add to Home Screen.",
      "Installation needs https or localhost — a file opened straight from disk cannot install.",
    ].forEach((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      list.appendChild(li);
    });
    card.appendChild(list);

    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Got it";
    style(close, {
      minHeight: "44px",
      width: "100%",
      border: "1px solid rgba(255,255,255,.2)",
      borderRadius: "10px",
      background: "transparent",
      color: "#e9eef6",
      font: "800 14px/1 system-ui, sans-serif",
      textTransform: "none",
      cursor: "pointer",
    });
    close.addEventListener("click", closeSheet);
    card.appendChild(close);

    sheet.addEventListener("click", (e) => { if (e.target === sheet) closeSheet(); });
    sheet.appendChild(card);
    document.body.appendChild(sheet);
    return sheet;
  }

  async function install() {
    if (!prompt) {
      showSheet();
      return;
    }
    const evt = prompt;
    prompt = null;
    try {
      evt.prompt();
      const choice = await evt.userChoice;
      if (choice && choice.outcome === "accepted") {
        closeSheet();
        if (button) button.textContent = "✓ Installed";
      }
    } catch (e) {
      showSheet();
    }
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    prompt = e;
    build();
    if (wantsInstall) showSheet();
  });

  window.addEventListener("appinstalled", () => {
    prompt = null;
    closeSheet();
    if (button) button.textContent = "✓ Installed";
  });

  function start() {
    build();
    if (wantsInstall && button) {
      button.textContent = "⤓ Install " + title;
      button.style.background = "#b8ff3d";
      button.style.color = "#0a0b10";
      button.style.border = "1px solid #b8ff3d";
      // A play-link install lands here: offer it right away instead of making them hunt.
      showSheet();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
