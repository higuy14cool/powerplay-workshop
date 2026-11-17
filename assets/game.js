/* ============================================================
   POWERPLAY Workshop — Pulse Grid (playable arcade game)
   ============================================================ */
(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const BEST_KEY = "powerplay.pulseGrid.best";
  const ROUND_SECONDS = 30;

  const canvas = $("#gameCanvas");
  const ctx = canvas.getContext("2d");
  const overlay = $("#playOverlay");
  const scoreEl = $("#gameScore");
  const bestEl = $("#gameBest");
  const timeEl = $("#gameTime");
  const timePill = $("#gameTimePill");

  let W = 720;
  let H = 440;
  let dpr = 1;
  let nodes = [];
  let particles = [];
  let score = 0;
  let best = Number(localStorage.getItem(BEST_KEY) || 0);
  let chain = 0;
  let chainUntil = 0;
  let remaining = ROUND_SECONDS;
  // wall-clock deadline keeps the countdown honest even when rAF is throttled
  let endsAt = 0;
  let running = false;
  let lastTs = 0;
  let rafId = 0;
  let clockId = 0;
  let spawnTimer = 0;
  let activeGameId = "pulse-grid";
  let reported = false;

  const COLORS = ["#b8ff3d", "#2dd4ef", "#8b5cf6", "#ff5f9e"];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(rect.width, 240);
    H = Math.max(rect.height, 160);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function spawnNode() {
    const radius = 16 + Math.random() * 10;
    const margin = radius + 14;
    nodes.push({
      x: margin + Math.random() * (W - margin * 2),
      y: margin + Math.random() * (H - margin * 2),
      r: radius,
      born: performance.now(),
      life: 1500 + Math.random() * 1100 - Math.min(score * 6, 600),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      dead: false,
    });
  }

  function burst(x, y, color) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 170;
      particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1,
        color,
        size: 1.5 + Math.random() * 2.8,
      });
    }
  }

  function draw(now) {
    now = now || performance.now();
    ctx.clearRect(0, 0, W, H);

    // backdrop grid
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.045)";
    ctx.lineWidth = 1;
    const step = 44;
    for (let x = 0; x <= W; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.restore();

    // particles
    particles = particles.filter((p) => p.life > 0);
    particles.forEach((p) => {
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= 0.022;
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // nodes
    nodes.forEach((n) => {
      if (n.dead) return;
      const age = now - n.born;
      const t = Math.min(age / n.life, 1);
      const fade = t < 0.12 ? t / 0.12 : 1 - Math.max(0, (t - 0.75) / 0.25);
      const pulse = 1 + Math.sin(now * 0.006 + n.x) * 0.06;

      ctx.save();
      ctx.globalAlpha = Math.max(fade, 0);

      const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 3.2);
      halo.addColorStop(0, hexA(n.color, 0.5));
      halo.addColorStop(0.4, hexA(n.color, 0.14));
      halo.addColorStop(1, "transparent");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * 3.2, 0, Math.PI * 2);
      ctx.fill();

      // shrinking ring shows remaining life
      ctx.strokeStyle = hexA(n.color, 0.85);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * (0.4 + (1 - t) * 1.6), 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = n.color;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,.92)";
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // chain indicator
    if (chain > 1 && now < chainUntil) {
      ctx.save();
      ctx.font = "600 12px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#b8ff3d";
      ctx.textAlign = "center";
      ctx.fillText(`CHAIN x${chain}`, W / 2, 26);
      ctx.restore();
    }
  }

  function hexA(hex, a) {
    const h = hex.replace("#", "");
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function updateHud() {
    scoreEl.textContent = score;
    bestEl.textContent = best;
    timeEl.textContent = Math.max(0, Math.ceil(remaining));
    timePill.style.borderColor = remaining <= 6 ? "rgba(255,95,158,.55)" : "";
  }

  function loop(ts) {
    if (!running) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    remaining = (endsAt - performance.now()) / 1000;
    if (remaining <= 0) {
      remaining = 0;
      updateHud();
      endRound();
      return;
    }

    spawnTimer -= dt;
    const interval = Math.max(0.3, 0.78 - score * 0.006);
    if (spawnTimer <= 0) {
      spawnNode();
      if (score > 8 && Math.random() < 0.3) spawnNode();
      spawnTimer = interval;
    }

    const now = performance.now();
    nodes.forEach((n) => {
      if (!n.dead && now - n.born > n.life) {
        n.dead = true;
        chain = 0;
        remaining = Math.max(0, remaining - 0.8);
        endsAt -= 800;
        flashMiss(n);
      }
    });
    nodes = nodes.filter((n) => !n.dead || now - n.born < n.life + 300);

    updateHud();
    draw(now);
    rafId = requestAnimationFrame(loop);
  }

  function flashMiss(node) {
    burst(node.x, node.y, "rgba(255,95,158,.8)");
    canvas.animate(
      [{ boxShadow: "inset 0 0 0 0 rgba(255,95,158,0)" }, { boxShadow: "inset 0 0 80px 0 rgba(255,95,158,.45)" }, { boxShadow: "inset 0 0 0 0 rgba(255,95,158,0)" }],
      { duration: 380, easing: "ease-out" }
    );
  }

  function hitAt(x, y) {
    if (!running) return;
    const now = performance.now();
    let hit = null;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (n.dead) continue;
      if (Math.hypot(n.x - x, n.y - y) <= n.r + 14) {
        hit = n;
        break;
      }
    }
    if (!hit) {
      chain = 0;
      return;
    }
    hit.dead = true;
    if (now < chainUntil) chain += 1;
    else chain = 1;
    chainUntil = now + 1500;
    const gain = 10 * Math.max(1, Math.min(chain, 8));
    score += gain;
    remaining = Math.min(ROUND_SECONDS, remaining + 0.25);
    endsAt += 250;
    burst(hit.x, hit.y, hit.color);
    updateHud();
    draw(now);
  }

  function pointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  }

  // independent clock so the HUD stays truthful when rAF is throttled
  function tickClock() {
    if (!running) return;
    remaining = (endsAt - performance.now()) / 1000;
    if (remaining <= 0) {
      remaining = 0;
      updateHud();
      endRound();
      return;
    }
    updateHud();
  }

  function beginRound() {
    cancelAnimationFrame(rafId);
    clearInterval(clockId);
    nodes = [];
    particles = [];
    score = 0;
    chain = 0;
    chainUntil = 0;
    remaining = ROUND_SECONDS;
    endsAt = performance.now() + ROUND_SECONDS * 1000;
    running = true;
    lastTs = 0;
    spawnTimer = 0;
    reported = false;
    overlay.hidden = true;
    timePill.style.display = "";
    updateHud();
    resize();
    rafId = requestAnimationFrame(loop);
    clockId = setInterval(tickClock, 200);
  }

  function endRound() {
    running = false;
    cancelAnimationFrame(rafId);
    clearInterval(clockId);
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
    }
    bestEl.textContent = best;
    if (!reported && activeGameId && window.PowerplayApp) {
      window.PowerplayApp.addPlay(activeGameId);
      reported = true;
    }
    overlay.hidden = false;
    overlay.innerHTML = `
      <p class="eyebrow">run complete</p>
      <h4>${score} points</h4>
      <p class="muted">${score >= best && score > 0 ? "New personal best. The grid respects you." : `Best so far: ${best}. One more run?`}</p>
      <button class="btn btn-lime btn-lg" id="startGameBtn" type="button">Play again</button>`;
    const btn = $("#startGameBtn");
    if (btn) btn.addEventListener("click", beginRound);
    updateHud();
    draw();
  }

  function resetOverlay() {
    overlay.hidden = false;
    overlay.innerHTML = `
      <p class="eyebrow">Ready?</p>
      <h4>Tap the glowing nodes</h4>
      <p class="muted">Hit as many as you can in ${ROUND_SECONDS} seconds. Missing a node costs time.</p>
      <button class="btn btn-lime btn-lg" id="startGameBtn" type="button">Start run</button>`;
    const btn = $("#startGameBtn");
    if (btn) btn.addEventListener("click", beginRound);
    timePill.style.display = "none";
  }

  function stopRound() {
    running = false;
    cancelAnimationFrame(rafId);
    clearInterval(clockId);
    nodes = [];
    particles = [];
  }

  function start(game) {
    activeGameId = (game && game.id) || "pulse-grid";
    $("#playModalTitle").textContent = (game && game.title) || "Pulse Grid";
    $("#playModal").hidden = false;
    document.body.classList.add("locked");
    bestEl.textContent = best;
    scoreEl.textContent = "0";
    requestAnimationFrame(() => {
      resize();
      resetOverlay();
      draw();
    });
  }

  canvas.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const p = pointerPos(e);
    hitAt(p.x, p.y);
  });

  window.addEventListener("resize", () => {
    if (!$("#playModal").hidden) resize();
  });

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !$("#playModal").hidden && !running && !$("#startGameBtn")) {
      e.preventDefault();
      beginRound();
    }
  });

  // stop the loop when the play modal closes
  document.addEventListener("click", (e) => {
    if (e.target.closest('[data-close="play"]')) stopRound();
  });

  window.PowerplayGame = { start, stop: stopRound };
})();
