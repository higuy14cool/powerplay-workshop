/* BALLISTIC! — Dodgeball Mayhem
   A self-contained arcade dodgeball survival game. */
(() => {
  'use strict';

  const CW = 1280;
  const CH = 720;
  const ARENA = { x: 64, y: 166, w: 1152, h: 488 };
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const norm = (x, y) => {
    const m = Math.hypot(x, y) || 1;
    return { x: x / m, y: y / m };
  };

  const MODES = {
    classic: {
      key: 'classic', name: 'Classic', lives: 3, timeLimit: 0,
      waveGap: 2.2, heartDrops: true, scoreMul: 1
    },
    blitz: {
      key: 'blitz', name: 'Blitz', lives: 1, timeLimit: 60,
      waveGap: 1.1, heartDrops: false, scoreMul: 1.35
    },
    ironman: {
      key: 'ironman', name: 'Ironman', lives: 1, timeLimit: 0,
      waveGap: 1.9, heartDrops: false, scoreMul: 1.5
    }
  };

  const DIFFS = {
    rookie:  { key: 'rookie',  name: 'Rookie',  speed: 0.82, cd: 1.24, scoreMul: 0.85 },
    pro:     { key: 'pro',     name: 'Pro',     speed: 1,    cd: 1,    scoreMul: 1 },
    allstar: { key: 'allstar', name: 'All-Star', speed: 1.18, cd: 0.76, scoreMul: 1.45 }
  };

  const canvas = document.getElementById('game');
  const stage = document.getElementById('stage');

  const $ = (id) => document.getElementById(id);
  const ui = {
    hud: $('hud'), score: $('score'), combo: $('combo'), wave: $('wave'),
    hearts: $('hearts'), ammo: $('ammo'), menu: $('menu'), pause: $('pauseScreen'),
    gameover: $('gameover'), finalScore: $('finalScore'), finalWave: $('finalWave'),
    finalBest: $('finalBest'), best: $('bestScore'), toast: $('toast'),
    pauseBtn: $('pauseBtn'), muteBtn: $('muteBtn'), touch: $('touchControls'),
    selftest: $('selftest'), timer: $('timer'), timerPill: $('timerPill'),
    endTitle: $('endTitle'), flash: $('flash'), modeSelect: $('modeSelect'),
    diffSelect: $('diffSelect')
  };

  let selectedMode = 'classic';
  let selectedDiff = 'pro';
  const bestKey = () => `ballistic_best_${selectedMode}_${selectedDiff}`;
  const readBest = () => Number(localStorage.getItem(bestKey()) || 0);

  // ---------------------------------------------------------------- sound
  const Sound = {
    ctx: null,
    muted: false,
    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    },
    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.value = m ? 0 : 0.5;
    },
    tone(freq, dur, type = 'square', vol = 0.15, slide = 0, delay = 0) {
      if (!this.ctx || this.muted) return;
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    },
    noise(dur = 0.12, vol = 0.15, freq = 1200, delay = 0) {
      if (!this.ctx || this.muted) return;
      const rate = this.ctx.sampleRate;
      const len = Math.floor(rate * dur);
      const buf = this.ctx.createBuffer(1, len, rate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = freq;
      filt.Q.value = 0.9;
      const g = this.ctx.createGain();
      g.gain.value = vol;
      src.connect(filt).connect(g).connect(this.master);
      src.start(this.ctx.currentTime + delay);
    },
    throw() { this.noise(0.09, 0.1, 1700); this.tone(220, 0.08, 'sine', 0.05, -80); },
    enemyThrow() { this.noise(0.07, 0.055, 900); },
    bounce() { this.tone(160, 0.06, 'sine', 0.055, -50); },
    hit() { this.tone(340, 0.09, 'square', 0.11, -180); this.noise(0.06, 0.11, 2400); },
    hurt() { this.tone(130, 0.22, 'sawtooth', 0.12, -80); this.noise(0.16, 0.15, 420); },
    catch() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.13, 0, i * 0.055)); },
    ko() { this.noise(0.22, 0.16, 300); this.tone(180, 0.2, 'square', 0.1, -120); },
    pickup() { [700, 1050].forEach((f, i) => this.tone(f, 0.08, 'sine', 0.09, 0, i * 0.05)); },
    dash() { this.noise(0.14, 0.08, 2600); this.tone(420, 0.12, 'sine', 0.05, 380); },
    wave() { [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.11, 0, i * 0.1)); },
    gameover() { [330, 277, 220, 165].forEach((f, i) => this.tone(f, 0.3, 'sawtooth', 0.09, -30, i * 0.16)); }
  };

  // ---------------------------------------------------------------- state
  const game = {
    mode: 'menu',
    modeKey: 'classic',
    diffKey: 'pro',
    diff: DIFFS.pro,
    scoreMul: 1,
    timeLeft: 0,
    time: 0,
    score: 0,
    best: 0,
    wave: 1,
    combo: 1,
    comboTimer: 0,
    enemies: [],
    balls: [],
    particles: [],
    floaters: [],
    pickups: [],
    shake: 0,
    flash: 0,
    hitstop: 0,
    waveTimer: 0,
    wavePending: false,
    toastTimer: 0,
    banner: null,
    slowmo: 0,
    shots: 0,
    catches: 0
  };

  const player = {
    x: 300, y: 410, r: 21, speed: 258,
    hp: 3, maxHp: 3, ammo: 3, maxAmmo: 5,
    aim: 0, walk: 0, invuln: 0,
    throwCd: 0, catchCd: 0, catchTimer: 0,
    dashCd: 0, dashTime: 0, dashVX: 0, dashVY: 0,
    hitFlash: 0
  };

  const ENEMY_TYPES = {
    rookie: {
      name: 'Rookie', r: 23, hp: 1, speed: 108, range: 560, preferred: 300,
      cd: [1.5, 2.5], windup: 0.55, ballSpeed: 480, color: '#ff5d6c', dark: '#9e2332',
      score: 100, ballR: 13
    },
    sniper: {
      name: 'Sniper', r: 21, hp: 1, speed: 86, range: 720, preferred: 420,
      cd: [2.1, 3.1], windup: 0.95, ballSpeed: 840, color: '#b78bff', dark: '#5c3694',
      score: 150, ballR: 12
    },
    brute: {
      name: 'Brute', r: 33, hp: 3, speed: 58, range: 480, preferred: 250,
      cd: [2.3, 3.3], windup: 0.8, ballSpeed: 560, color: '#ff9f43', dark: '#a85413',
      score: 250, ballR: 17
    },
    coach: {
      name: 'The Coach', r: 47, hp: 12, speed: 48, range: 640, preferred: 360,
      cd: [1.7, 2.5], windup: 0.85, ballSpeed: 620, color: '#4ade80', dark: '#166534',
      score: 1200, ballR: 18, boss: true
    }
  };

  // ---------------------------------------------------------------- helpers
  function resizeStage() {
    const scale = Math.min(window.innerWidth / CW, window.innerHeight / CH);
    stage.style.width = Math.round(CW * scale) + 'px';
    stage.style.height = Math.round(CH * scale) + 'px';
  }

  function toGameCoords(clientX, clientY) {
    if (window.Ballistic3D && Ballistic3D.screenToCourt) {
      return Ballistic3D.screenToCourt(clientX, clientY);
    }
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width * CW,
      y: (clientY - rect.top) / rect.height * CH
    };
  }

  function burst(x, y, color, count = 12, power = 220) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const s = rand(0.3, 1) * power;
      game.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        r: rand(2, 5.5), life: rand(0.3, 0.65), max: 0.65,
        color, grav: 320, drag: 3
      });
    }
  }

  function floatText(x, y, text, color = '#fff6dc', size = 22) {
    game.floaters.push({ x, y, text, color, size, life: 0.9, max: 0.9 });
  }

  function showToast(text, small = false) {
    ui.toast.textContent = text;
    ui.toast.classList.toggle('small', small);
    ui.toast.classList.add('show');
    game.toastTimer = small ? 1.2 : 1.55;
  }

  function hideToast() {
    ui.toast.classList.remove('show');
  }

  function addScore(n) {
    game.score += Math.round(n * game.scoreMul);
    ui.score.textContent = game.score.toLocaleString('en-US');
  }

  function bumpCombo() {
    game.combo = Math.min(9, game.combo + 1);
    game.comboTimer = 2.6;
    ui.combo.textContent = '×' + game.combo;
    ui.combo.classList.add('on');
  }

  function resetCombo() {
    game.combo = 1;
    game.comboTimer = 0;
    ui.combo.classList.remove('on');
  }

  // ---------------------------------------------------------------- input
  const keys = new Set();
  const isTouch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  const mouse = { x: CW * 0.65, y: CH * 0.5, moved: false };
  const stickInput = { x: 0, y: 0, active: false, id: null };

  if (isTouch) document.body.classList.add('touch');

  function nearestEnemy() {
    let best = null;
    let bd = Infinity;
    for (const e of game.enemies) {
      if (e.dead) continue;
      const d = dist(player.x, player.y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function toggleMute() {
    Sound.setMuted(!Sound.muted);
    ui.muteBtn.classList.toggle('off', Sound.muted);
    ui.muteBtn.textContent = Sound.muted ? '×' : '♪';
    localStorage.setItem('ballistic_muted', Sound.muted ? '1' : '0');
  }

  function togglePause() {
    if (game.mode === 'playing') {
      game.mode = 'paused';
      ui.pause.classList.remove('is-hidden');
      hideToast();
    } else if (game.mode === 'paused') {
      game.mode = 'playing';
      ui.pause.classList.add('is-hidden');
      lastTime = performance.now();
    }
  }

  function doDash() {
    if (game.mode !== 'playing' || player.dashCd > 0) return;
    let dx = 0;
    let dy = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;
    dx += stickInput.x;
    dy += stickInput.y;
    if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
      dx = Math.cos(player.aim);
      dy = Math.sin(player.aim);
    }
    const n = norm(dx, dy);
    player.dashVX = n.x * 900;
    player.dashVY = n.y * 900;
    player.dashTime = 0.16;
    player.dashCd = 1.25;
    player.invuln = Math.max(player.invuln, 0.26);
    Sound.dash();
    burst(player.x, player.y, '#7dd3fc', 9, 130);
  }

  window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.repeat) return;
    if (e.code === 'Space') {
      if (game.mode === 'playing') attemptCatch();
      else if (game.mode === 'menu') startGame();
    } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      doDash();
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      togglePause();
    } else if (e.code === 'KeyM') {
      toggleMute();
    } else if (e.code === 'Enter') {
      if (game.mode === 'menu' || game.mode === 'gameover') startGame();
      else if (game.mode === 'paused') togglePause();
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => {
    keys.clear();
    if (game.mode === 'playing') togglePause();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const p = toGameCoords(e.clientX, e.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.moved = true;
  });
  canvas.addEventListener('pointerdown', (e) => {
    Sound.init();
    const p = toGameCoords(e.clientX, e.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
    if (game.mode === 'playing' && e.button === 0) throwBall();
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Virtual joystick
  const joystick = $('joystick');
  const stick = $('stick');
  function updateStick(e) {
    const rect = joystick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const max = rect.width * 0.33;
    const m = Math.hypot(dx, dy);
    if (m > max) { dx = dx / m * max; dy = dy / m * max; }
    stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    stickInput.x = dx / max;
    stickInput.y = dy / max;
  }
  joystick.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    Sound.init();
    stickInput.active = true;
    stickInput.id = e.pointerId;
    joystick.setPointerCapture(e.pointerId);
    updateStick(e);
  });
  joystick.addEventListener('pointermove', (e) => {
    if (stickInput.active && e.pointerId === stickInput.id) updateStick(e);
  });
  const endStick = (e) => {
    if (e.pointerId !== stickInput.id) return;
    stickInput.active = false;
    stickInput.x = 0;
    stickInput.y = 0;
    stickInput.id = null;
    stick.style.transform = 'translate(-50%, -50%)';
  };
  joystick.addEventListener('pointerup', endStick);
  joystick.addEventListener('pointercancel', endStick);

  function bindAction(id, fn) {
    const el = $(id);
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      Sound.init();
      fn();
    });
  }
  bindAction('throwTouch', throwBall);
  bindAction('catchTouch', attemptCatch);
  bindAction('dashTouch', doDash);

  // ---------------------------------------------------------------- player
  function resetPlayer() {
    player.x = 300;
    player.y = ARENA.y + ARENA.h * 0.52;
    player.hp = player.maxHp;
    player.ammo = 3;
    player.aim = 0;
    player.invuln = 0;
    player.throwCd = 0;
    player.catchCd = 0;
    player.catchTimer = 0;
    player.dashCd = 0;
    player.dashTime = 0;
    player.hitFlash = 0;
    player.walk = 0;
  }

  function throwBall() {
    if (game.mode !== 'playing') return;
    if (player.throwCd > 0) return;
    if (player.ammo <= 0) {
      floatText(player.x, player.y - 42, 'NO BALLS!', '#ff8a8a', 18);
      player.throwCd = 0.28;
      Sound.tone(120, 0.08, 'square', 0.05, -40);
      return;
    }
    let target = null;
    if (isTouch) target = nearestEnemy();
    const ang = target
      ? Math.atan2(target.y - player.y, target.x - player.x)
      : (mouse.moved ? Math.atan2(mouse.y - player.y, mouse.x - player.x) : player.aim);
    player.aim = ang;
    player.ammo--;
    player.throwCd = 0.24;
    game.shots++;
    const hx = player.x + Math.cos(ang) * 26;
    const hy = player.y + Math.sin(ang) * 26;
    game.balls.push(makeBall(hx, hy, Math.cos(ang) * 1010, Math.sin(ang) * 1010, 'player', {
      color: '#ffd23f', r: 13.5, from: player
    }));
    burst(hx, hy, '#ffe9a3', 4, 70);
    Sound.throw();
    updateUI();
  }

  function attemptCatch() {
    if (game.mode !== 'playing' || player.catchCd > 0) return;
    player.catchTimer = 0.24;
    player.catchCd = 0.95;
    Sound.tone(520, 0.08, 'sine', 0.05, 180);
  }

  function playerHit() {
    if (player.invuln > 0 || player.dashTime > 0) return;
    player.hp--;
    player.invuln = 1.35;
    player.hitFlash = 0.4;
    game.shake = 20;
    game.flash = 0.65;
    resetCombo();
    burst(player.x, player.y, '#ff5d6c', 18, 260);
    Sound.hurt();
    floatText(player.x, player.y - 46, '-1', '#ff5d6c', 24);
    updateUI();
    if (player.hp <= 0) endGame();
  }

  // ---------------------------------------------------------------- balls
  function makeBall(x, y, vx, vy, owner, opts = {}) {
    return {
      x, y, vx, vy, owner,
      r: opts.r || 13,
      color: opts.color || '#ff5d6c',
      from: opts.from || null,
      damage: opts.damage || 1,
      ground: false, spin: rand(0, TAU), spinV: rand(-8, 8),
      trail: [], life: 0, bounces: 0, bob: rand(0, TAU)
    };
  }

  function ballToGround(ball, bounce = 0.4) {
    ball.ground = true;
    ball.vx *= -bounce;
    ball.vy *= -bounce;
    ball.vx += rand(-30, 30);
    ball.vy += rand(-30, 30);
  }

  function performCatch(ball) {
    game.catches++;
    player.ammo = Math.min(player.maxAmmo, player.ammo + 1);
    const thrower = ball.from;
    burst(ball.x, ball.y, '#38bdf8', 16, 240);
    floatText(player.x, player.y - 52, 'CAUGHT!', '#7dd3fc', 26);
    Sound.catch();
    game.shake = 9;
    if (thrower && !thrower.dead && game.enemies.includes(thrower)) {
      thrower.hp -= thrower.def.boss ? 3 : 99;
      thrower.hitFlash = 0.25;
      if (thrower.hp <= 0) koEnemy(thrower, true);
      else {
        addScore(150 * game.combo);
        bumpCombo();
      }
    }
    updateUI();
    return true;
  }

  function damageEnemy(e, dmg, ball) {
    e.hp -= dmg;
    e.hitFlash = 0.16;
    if (ball) {
      const n = norm(ball.vx, ball.vy);
      e.kbx = n.x * 90;
      e.kby = n.y * 90;
    }
    burst(e.x, e.y, e.def.color, 9, 190);
    floatText(e.x, e.y - e.r - 16, '-' + dmg, '#fff6dc', 18);
    addScore(25 * game.combo);
    bumpCombo();
    Sound.hit();
    if (e.hp <= 0) koEnemy(e);
  }

  function koEnemy(e, byCatch = false) {
    if (e.dead) return;
    e.dead = true;
    const idx = game.enemies.indexOf(e);
    if (idx >= 0) game.enemies.splice(idx, 1);
    const gain = Math.round(e.def.score * game.combo * (byCatch ? 1.5 : 1));
    addScore(gain);
    floatText(e.x, e.y - 24, '+' + gain, '#ffd23f', 22);
    burst(e.x, e.y, e.def.color, e.def.boss ? 40 : 22, e.def.boss ? 380 : 280);
    game.shake = e.def.boss ? 28 : 11;
    Sound.ko();
    if (Math.random() < 0.42) {
      game.balls.push(makeBall(e.x, e.y, rand(-60, 60), rand(-60, 60), 'enemy', {
        color: '#ff5d6c', r: 13, ground: false
      }));
      const b = game.balls[game.balls.length - 1];
      ballToGround(b, 0.2);
    }
    if (e.def.boss) {
      showToast('COACH DOWN!', true);
      game.slowmo = 0.55;
      game.pickups.push({ x: e.x, y: e.y, type: 'heart', t: 0, life: 20 });
    }
    updateUI();
  }

  // ---------------------------------------------------------------- enemies
  function makeEnemy(type, x, y) {
    const def = ENEMY_TYPES[type];
    return {
      type, def, x, y,
      r: def.r,
      hp: def.boss ? def.hp + Math.floor(game.wave * 0.8) : def.hp,
      maxHp: def.boss ? def.hp + Math.floor(game.wave * 0.8) : def.hp,
      aim: Math.PI,
      windup: 0,
      cooldown: rand(0.9, 1.9),
      spawnT: 0.55,
      hitFlash: 0,
      kbx: 0, kby: 0,
      strafe: Math.random() < 0.5 ? -1 : 1,
      strafeT: rand(1, 2.4),
      walk: rand(0, TAU),
      wobble: rand(0, TAU),
      dead: false
    };
  }

  function spawnWave() {
    game.wave++;
    ui.wave.textContent = game.wave;
    const isBoss = game.wave % 4 === 0;
    let count = Math.min(2 + Math.ceil(game.wave * 0.8), 9);
    if (isBoss) count = Math.min(4 + Math.floor(game.wave * 0.35), 8);

    const pool = ['rookie'];
    if (game.wave >= 2) pool.push('sniper');
    if (game.wave >= 3) pool.push('brute');
    if (game.wave >= 4 && !isBoss) pool.push('brute', 'sniper');

    for (let i = 0; i < count; i++) {
      const type = pool[randInt(0, pool.length - 1)];
      const x = rand(ARENA.x + ARENA.w * 0.56, ARENA.x + ARENA.w - 54);
      const y = rand(ARENA.y + 58, ARENA.y + ARENA.h - 58);
      game.enemies.push(makeEnemy(type, x, y));
    }
    if (isBoss) {
      game.enemies.push(makeEnemy('coach', ARENA.x + ARENA.w - 110, ARENA.y + ARENA.h * 0.5));
    }

    // Clear hostile stragglers so each wave starts fair.
    game.balls = game.balls.filter((b) => b.owner !== 'enemy');
    player.ammo = Math.max(player.ammo, 3);
    showToast(isBoss ? 'WAVE ' + game.wave + ' · COACH' : 'WAVE ' + game.wave);
    Sound.wave();
    updateUI();
  }

  function enemyThrow(e) {
    if (e.dead) return;
    const base = Math.atan2(player.y - e.y, player.x - e.x) + rand(-0.045, 0.045);
    const count = e.def.boss ? 3 : 1;
    for (let i = 0; i < count; i++) {
      const spread = count > 1 ? (i - 1) * 0.2 : 0;
      const a = base + spread;
      game.balls.push(makeBall(
        e.x + Math.cos(a) * (e.r + 8),
        e.y + Math.sin(a) * (e.r + 8),
        Math.cos(a) * e.def.ballSpeed,
        Math.sin(a) * e.def.ballSpeed,
        'enemy',
        { color: e.def.color, r: e.def.ballR, from: e, damage: 1 }
      ));
    }
    burst(e.x + Math.cos(base) * e.r, e.y + Math.sin(base) * e.r, e.def.color, 5, 100);
    Sound.enemyThrow();
  }

  function updateEnemy(e, dt) {
    if (e.spawnT > 0) {
      e.spawnT -= dt;
      return;
    }
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    e.wobble += dt * 5;
    if (e.kbx || e.kby) {
      e.x += e.kbx * dt;
      e.y += e.kby * dt;
      e.kbx *= 0.84;
      e.kby *= 0.84;
      if (Math.abs(e.kbx) < 2) e.kbx = 0;
      if (Math.abs(e.kby) < 2) e.kby = 0;
    }

    const d = dist(e.x, e.y, player.x, player.y);
    e.aim = Math.atan2(player.y - e.y, player.x - e.x);

    if (e.windup > 0) {
      e.windup -= dt;
      if (e.windup <= 0) {
        e.windup = 0;
        e.cooldown = rand(e.def.cd[0], e.def.cd[1]) * game.diff.cd;
        enemyThrow(e);
      }
    } else {
      e.cooldown -= dt;
      if (e.cooldown <= 0 && d < e.def.range) {
        e.windup = e.def.windup + (e.def.boss ? 0.08 : 0);
        e.cooldown = 99;
        Sound.tone(e.def.boss ? 120 : 190, 0.09, 'triangle', 0.035, -40);
      }
      // Keep spacing and strafe around the player.
      let mx = 0;
      let my = 0;
      if (d > e.def.preferred + 55) {
        mx = (player.x - e.x) / d;
        my = (player.y - e.y) / d;
      } else if (d < e.def.preferred - 80) {
        mx = (e.x - player.x) / d;
        my = (e.y - player.y) / d;
      } else {
        mx = -(player.y - e.y) / d * e.strafe * 0.9;
        my = (player.x - e.x) / d * e.strafe * 0.9;
        e.strafeT -= dt;
        if (e.strafeT <= 0) {
          e.strafe *= -1;
          e.strafeT = rand(1.2, 2.6);
        }
      }
      const sp = e.def.speed * game.diff.speed * (e.windup > 0 ? 0.15 : 1);
      e.x += mx * sp * dt;
      e.y += my * sp * dt;
      e.walk += dt * sp * 0.045;
    }

    // Separate enemies so the court stays readable.
    for (const o of game.enemies) {
      if (o === e || o.dead) continue;
      const dd = dist(e.x, e.y, o.x, o.y);
      const minD = e.r + o.r + 6;
      if (dd > 0 && dd < minD) {
        const n = { x: (e.x - o.x) / dd, y: (e.y - o.y) / dd };
        const push = (minD - dd) * 0.5;
        e.x += n.x * push;
        e.y += n.y * push;
        o.x -= n.x * push;
        o.y -= n.y * push;
      }
    }

    // The center line is a hard wall: opponents stay on their half.
    const half = ARENA.x + ARENA.w / 2;
    e.x = clamp(e.x, half + e.r + 8, ARENA.x + ARENA.w - e.r - 8);
    e.y = clamp(e.y, ARENA.y + e.r + 8, ARENA.y + ARENA.h - e.r - 8);
  }

  // ---------------------------------------------------------------- player update
  function updatePlayer(dt) {
    player.invuln = Math.max(0, player.invuln - dt);
    player.hitFlash = Math.max(0, player.hitFlash - dt);
    player.throwCd = Math.max(0, player.throwCd - dt);
    player.catchCd = Math.max(0, player.catchCd - dt);
    player.catchTimer = Math.max(0, player.catchTimer - dt);
    player.dashCd = Math.max(0, player.dashCd - dt);

    let mx = 0;
    let my = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
    mx += stickInput.x;
    my += stickInput.y;
    const mag = Math.hypot(mx, my);
    if (mag > 1) { mx /= mag; my /= mag; }

    if (player.dashTime > 0) {
      player.dashTime -= dt;
      player.x += player.dashVX * dt;
      player.y += player.dashVY * dt;
      if (Math.random() < 0.8) {
        game.particles.push({
          x: player.x + rand(-10, 10), y: player.y + rand(-10, 10),
          vx: rand(-30, 30), vy: rand(-30, 30), r: rand(3, 6),
          life: 0.3, max: 0.3, color: '#7dd3fc', grav: 0, drag: 2
        });
      }
    } else {
      player.x += mx * player.speed * dt;
      player.y += my * player.speed * dt;
      if (mag > 0.1) player.walk += dt * 10;
    }

    const half = ARENA.x + ARENA.w / 2;
    player.x = clamp(player.x, ARENA.x + player.r + 6, half - player.r - 8);
    player.y = clamp(player.y, ARENA.y + player.r + 6, ARENA.y + ARENA.h - player.r - 6);

    if (isTouch) {
      const target = nearestEnemy();
      if (target) player.aim = Math.atan2(target.y - player.y, target.x - player.x);
    } else if (mouse.moved) {
      player.aim = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    }
  }

  // ---------------------------------------------------------------- ball update
  function updateBalls(dt) {
    for (let i = game.balls.length - 1; i >= 0; i--) {
      const b = game.balls[i];
      b.life += dt;
      b.bob += dt * 4;
      b.spin += b.spinV * dt;
      if (b.ground) {
        b.vx *= Math.exp(-3.2 * dt);
        b.vy *= Math.exp(-3.2 * dt);
        if (Math.abs(b.vx) < 4) b.vx = 0;
        if (Math.abs(b.vy) < 4) b.vy = 0;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.x = clamp(b.x, ARENA.x + b.r, ARENA.x + ARENA.w - b.r);
        b.y = clamp(b.y, ARENA.y + b.r, ARENA.y + ARENA.h - b.r);

        if (dist(player.x, player.y, b.x, b.y) < player.r + b.r + 15) {
          if (player.ammo < player.maxAmmo) {
            player.ammo++;
            burst(b.x, b.y, b.color, 7, 100);
            floatText(b.x, b.y - 22, '+BALL', '#ffd23f', 14);
            Sound.pickup();
            updateUI();
            game.balls.splice(i, 1);
            continue;
          }
        }
        if (b.life > 24) game.balls.splice(i, 1);
        continue;
      }

      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 9) b.trail.shift();
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      let bounced = false;
      if (b.x < ARENA.x + b.r) { b.x = ARENA.x + b.r; b.vx = Math.abs(b.vx) * 0.55; bounced = true; }
      if (b.x > ARENA.x + ARENA.w - b.r) { b.x = ARENA.x + ARENA.w - b.r; b.vx = -Math.abs(b.vx) * 0.55; bounced = true; }
      if (b.y < ARENA.y + b.r) { b.y = ARENA.y + b.r; b.vy = Math.abs(b.vy) * 0.55; bounced = true; }
      if (b.y > ARENA.y + ARENA.h - b.r) { b.y = ARENA.y + ARENA.h - b.r; b.vy = -Math.abs(b.vy) * 0.55; bounced = true; }
      if (bounced) {
        b.bounces++;
        Sound.bounce();
        if (b.bounces >= 2 || Math.hypot(b.vx, b.vy) < 260) ballToGround(b, 0.5);
      }

      if (b.owner === 'enemy' && player.catchTimer > 0 && dist(player.x, player.y, b.x, b.y) < 92) {
        performCatch(b);
        game.balls.splice(i, 1);
        continue;
      }

      if (b.owner === 'enemy' && dist(player.x, player.y, b.x, b.y) < player.r + b.r) {
        if (player.invuln <= 0 && player.dashTime <= 0) {
          playerHit();
          ballToGround(b, 0.25);
          b.x += rand(-8, 8);
          b.y += rand(-8, 8);
        }
      }

      if (b.owner === 'player') {
        let hit = false;
        for (const e of game.enemies) {
          if (e.dead || e.spawnT > 0) continue;
          if (dist(e.x, e.y, b.x, b.y) < e.r + b.r) {
            damageEnemy(e, b.damage, b);
            ballToGround(b, 0.35);
            b.x += rand(-10, 10);
            b.y += rand(-10, 10);
            hit = true;
            break;
          }
        }
        if (hit) continue;
      }

      if (b.life > 6) ballToGround(b, 0.2);
    }
  }

  // ---------------------------------------------------------------- pickups & particles
  function updatePickups(dt) {
    for (let i = game.pickups.length - 1; i >= 0; i--) {
      const p = game.pickups[i];
      p.t += dt;
      p.life -= dt;
      if (dist(player.x, player.y, p.x, p.y) < player.r + 26) {
        if (p.type === 'heart') {
          if (player.hp < player.maxHp) {
            player.hp++;
            floatText(p.x, p.y - 24, '+1 ENERGY', '#4ade80', 18);
          } else {
            addScore(300);
            floatText(p.x, p.y - 24, '+300', '#ffd23f', 18);
          }
          Sound.pickup();
          burst(p.x, p.y, '#4ade80', 14, 160);
          updateUI();
        }
        game.pickups.splice(i, 1);
      } else if (p.life <= 0) {
        game.pickups.splice(i, 1);
      }
    }
  }

  function updateEffects(dt) {
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const p = game.particles[i];
      p.life -= dt;
      if (p.life <= 0) { game.particles.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      p.vx *= Math.exp(-p.drag * dt);
      p.vy *= Math.exp(-p.drag * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = game.floaters.length - 1; i >= 0; i--) {
      const f = game.floaters[i];
      f.life -= dt;
      f.y -= 40 * dt;
      if (f.life <= 0) game.floaters.splice(i, 1);
    }
    game.shake *= Math.exp(-7 * dt);
    if (game.shake < 0.3) game.shake = 0;
    game.flash = Math.max(0, game.flash - dt * 2.4);
    if (game.comboTimer > 0) {
      game.comboTimer -= dt;
      if (game.comboTimer <= 0) resetCombo();
    }
  }

  // ---------------------------------------------------------------- game flow
  function setBestLine() {
    game.best = readBest();
    ui.best.textContent = game.best.toLocaleString('en-US');
  }

  function selectMode(key) {
    if (!MODES[key]) return;
    selectedMode = key;
    for (const b of ui.modeSelect.querySelectorAll('[data-mode]')) {
      b.classList.toggle('is-selected', b.dataset.mode === key);
    }
    setBestLine();
  }

  function selectDiff(key) {
    if (!DIFFS[key]) return;
    selectedDiff = key;
    for (const b of ui.diffSelect.querySelectorAll('[data-diff]')) {
      b.classList.toggle('is-selected', b.dataset.diff === key);
    }
    setBestLine();
  }

  function startGame() {
    Sound.init();
    const mode = MODES[selectedMode];
    const diff = DIFFS[selectedDiff];
    game.mode = 'playing';
    game.modeKey = mode.key;
    game.diffKey = diff.key;
    game.diff = diff;
    game.scoreMul = mode.scoreMul * diff.scoreMul;
    game.timeLeft = mode.timeLimit;
    game.best = readBest();
    player.maxHp = mode.lives;
    game.score = 0;
    game.wave = 0;
    game.combo = 1;
    game.comboTimer = 0;
    game.enemies = [];
    game.balls = [];
    game.particles = [];
    game.floaters = [];
    game.pickups = [];
    game.shake = 0;
    game.flash = 0;
    game.waveTimer = 0;
    game.wavePending = false;
    game.slowmo = 0;
    game.shots = 0;
    game.catches = 0;
    resetPlayer();
    ui.menu.classList.add('is-hidden');
    ui.pause.classList.add('is-hidden');
    ui.gameover.classList.add('is-hidden');
    ui.hud.classList.remove('is-hidden');
    ui.combo.classList.remove('on');
    ui.timerPill.classList.toggle('is-hidden', !mode.timeLimit);
    ui.timerPill.classList.remove('hurry');
    ui.timer.textContent = String(mode.timeLimit || 0);
    ui.score.textContent = '0';
    hideToast();
    updateUI();
    spawnWave();
    lastTime = performance.now();
  }

  function endGame(reason = 'KNOCKED OUT') {
    if (game.mode === 'gameover') return;
    game.mode = 'gameover';
    ui.timerPill.classList.add('is-hidden');
    game.best = Math.max(readBest(), game.score);
    localStorage.setItem(bestKey(), String(game.best));
    ui.finalScore.textContent = game.score.toLocaleString('en-US');
    ui.finalWave.textContent = game.wave;
    ui.finalBest.textContent = game.best.toLocaleString('en-US');
    ui.best.textContent = game.best.toLocaleString('en-US');
    ui.endTitle.textContent = reason;
    ui.endTitle.classList.toggle('time-title', reason === "TIME'S UP");
    ui.gameover.classList.remove('is-hidden');
    hideToast();
    Sound.gameover();
  }

  function goToMenu() {
    game.mode = 'menu';
    game.enemies = [];
    game.balls = [];
    game.pickups = [];
    game.particles = [];
    game.floaters = [];
    game.modeKey = selectedMode;
    game.diff = DIFFS[selectedDiff];
    game.scoreMul = MODES[selectedMode].scoreMul * DIFFS[selectedDiff].scoreMul;
    setBestLine();
    ui.gameover.classList.add('is-hidden');
    ui.pause.classList.add('is-hidden');
    ui.hud.classList.add('is-hidden');
    ui.timerPill.classList.add('is-hidden');
    ui.menu.classList.remove('is-hidden');
    hideToast();
  }

  function updateUI() {
    ui.score.textContent = game.score.toLocaleString('en-US');
    ui.wave.textContent = game.wave;
    if (MODES[game.modeKey].timeLimit) {
      ui.timer.textContent = String(Math.max(0, Math.ceil(game.timeLeft)));
    }
    let hearts = '';
    for (let i = 0; i < player.maxHp; i++) {
      hearts += `<span class="heart${i < player.hp ? '' : ' empty'}">♥</span>`;
    }
    if (ui.hearts.dataset.hp !== String(player.hp)) {
      ui.hearts.innerHTML = hearts;
      ui.hearts.dataset.hp = String(player.hp);
    }
    let ammo = '';
    for (let i = 0; i < player.maxAmmo; i++) {
      ammo += `<span class="ball-pip${i < player.ammo ? '' : ' spent'}"></span>`;
    }
    if (ui.ammo.dataset.ammo !== String(player.ammo)) {
      ui.ammo.innerHTML = ammo;
      ui.ammo.dataset.ammo = String(player.ammo);
    }
  }

  function updateGame(dt) {
    game.time += dt;
    const mode = MODES[game.modeKey];
    if (mode.timeLimit) {
      game.timeLeft = Math.max(0, game.timeLeft - dt);
      ui.timer.textContent = String(Math.ceil(game.timeLeft));
      ui.timerPill.classList.toggle('hurry', game.timeLeft <= 10);
      if (game.timeLeft <= 0) {
        endGame("TIME'S UP");
        return;
      }
    }
    if (game.slowmo > 0) game.slowmo = Math.max(0, game.slowmo - dt);
    updatePlayer(dt);
    for (const e of game.enemies) updateEnemy(e, dt);
    updateBalls(dt);
    updatePickups(dt);
    updateEffects(dt);

    if (game.toastTimer > 0) {
      game.toastTimer -= dt;
      if (game.toastTimer <= 0) hideToast();
    }

    if (game.wavePending) {
      game.waveTimer -= dt;
      if (game.waveTimer <= 0) {
        game.wavePending = false;
        spawnWave();
      }
    } else if (game.enemies.length === 0 && game.mode === 'playing') {
      game.wavePending = true;
      game.waveTimer = mode.waveGap;
      const bonus = 400 + game.wave * 150;
      addScore(bonus);
      floatText(ARENA.x + ARENA.w / 2, ARENA.y + ARENA.h / 2, '+' + bonus, '#ffd23f', 30);
      showToast('WAVE CLEAR', true);
      if (mode.heartDrops && game.wave % 2 === 0 && player.hp < player.maxHp) {
        game.pickups.push({
          x: ARENA.x + ARENA.w * 0.38, y: ARENA.y + ARENA.h / 2,
          type: 'heart', t: 0, life: 14
        });
      }
    }
  }

  // ---------------------------------------------------------------- loop & wiring
  let lastTime = performance.now();
  let rafId = 0;
  let render3dReady = false;
  const SELFTEST = /(?:^|[?&])selftest(?:[=&]|$)/.test(location.search);

  function frame(now) {
    const real = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    if (game.mode === 'playing') {
      const scale = game.slowmo > 0 ? 0.34 : 1;
      updateGame(real * scale);
    } else if (game.mode === 'menu' || game.mode === 'gameover') {
      game.time += real;
      updateEffects(real);
    }
    if (render3dReady) {
      Ballistic3D.render(game, player, { isTouch, mouse });
    }
    ui.flash.style.opacity = String(Math.min(0.9, game.flash * 0.9));
    rafId = requestAnimationFrame(frame);
  }

  $('playBtn').addEventListener('click', () => { Sound.init(); startGame(); });
  $('retryBtn').addEventListener('click', () => { Sound.init(); startGame(); });
  $('menuBtn').addEventListener('click', goToMenu);
  $('resumeBtn').addEventListener('click', togglePause);
  $('quitBtn').addEventListener('click', goToMenu);
  ui.pauseBtn.addEventListener('click', togglePause);
  ui.muteBtn.addEventListener('click', () => { Sound.init(); toggleMute(); });

  ui.modeSelect.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mode]');
    if (btn) { Sound.init(); selectMode(btn.dataset.mode); }
  });
  ui.diffSelect.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-diff]');
    if (btn) { Sound.init(); selectDiff(btn.dataset.diff); }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.mode === 'playing') togglePause();
  });
  window.addEventListener('resize', resizeStage);
  resizeStage();

  // Restore settings and the saved best for the current selection.
  const savedMute = localStorage.getItem('ballistic_muted') === '1';
  Sound.setMuted(savedMute);
  ui.muteBtn.classList.toggle('off', savedMute);
  ui.muteBtn.textContent = savedMute ? '×' : '♪';
  selectMode(selectedMode);
  selectDiff(selectedDiff);

  // Start the 3D scene.
  if (window.Ballistic3D && typeof THREE !== 'undefined') {
    try {
      render3dReady = Ballistic3D.init(canvas);
    } catch (err) {
      window.__3DERR__ = err && (err.stack || err.message || String(err));
      console.error('3D init failed', window.__3DERR__);
    }
  }
  if (!render3dReady) {
    const warn = document.createElement('div');
    warn.className = 'panel';
    warn.style.cssText = 'position:absolute;z-index:50;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center';
    warn.innerHTML = '<p class="eyebrow">3D UNAVAILABLE</p><h2>WEBGL NEEDED</h2><p style="opacity:.65;font-size:13px">Enable hardware acceleration or try another browser.</p>';
    stage.appendChild(warn);
  }

  requestAnimationFrame(frame);

  // ---------------------------------------------------------------- self test
  function runSelfTest() {
    const lines = [];
    let pass = 0;
    let fail = 0;
    function check(name, fn) {
      try {
        const result = fn();
        if (result === false) throw new Error('returned false');
        pass++;
        lines.push('PASS ' + name);
      } catch (err) {
        fail++;
        lines.push('FAIL ' + name + ' — ' + err.message);
      }
    }
    function expect(cond, msg) {
      if (!cond) throw new Error(msg || 'assertion failed');
    }
    function reset(mode = 'classic', diff = 'pro') {
      selectedMode = mode;
      selectedDiff = diff;
      startGame();
    }
    function stepBalls(steps = 30) {
      for (let i = 0; i < steps; i++) updateBalls(0.016);
    }

    reset('classic', 'pro');
    check('Classic starts with three lives', () => {
      expect(player.maxHp === 3 && player.hp === 3);
    });
    check('new game spawns wave 1 enemies', () => {
      expect(game.wave === 1);
      expect(game.enemies.length >= 3);
    });
    check('player cannot cross the center line', () => {
      const half = ARENA.x + ARENA.w / 2;
      player.x = half + 300;
      updatePlayer(0.016);
      expect(player.x <= half - player.r - 7);
    });
    check('opponents cannot cross the center line', () => {
      const half = ARENA.x + ARENA.w / 2;
      const e = makeEnemy('rookie', half - 200, ARENA.y + 240);
      e.spawnT = 0;
      updateEnemy(e, 0.016);
      expect(e.x >= half + e.r + 7);
    });
    check('thrown ball knocks out a rookie', () => {
      reset('classic', 'pro');
      const target = game.enemies[0];
      target.spawnT = 0;
      target.x = ARENA.x + ARENA.w * 0.63;
      target.y = player.y;
      game.enemies = [target];
      player.ammo = 3;
      player.throwCd = 0;
      throwBall();
      stepBalls(45);
      expect(target.hp <= 0 || !game.enemies.includes(target), 'target untouched');
    });
    check('ground ball reloads the player', () => {
      reset('classic', 'pro');
      player.ammo = 1;
      const b = makeBall(player.x + 4, player.y, 0, 0, 'enemy', { color: '#ffd23f' });
      b.ground = true;
      game.balls = [b];
      updateBalls(0.016);
      expect(player.ammo === 2);
    });
    check('timed catch eliminates the thrower', () => {
      reset('classic', 'pro');
      const thrower = game.enemies[0];
      thrower.spawnT = 0;
      thrower.x = ARENA.x + ARENA.w * 0.64;
      thrower.y = player.y;
      game.enemies = [thrower];
      game.balls = [makeBall(player.x + 18, player.y, 0, 0, 'enemy', { from: thrower })];
      player.catchTimer = 0.3;
      updateBalls(0.016);
      expect(!game.enemies.includes(thrower), 'thrower still on court');
    });
    check('dash grants brief invulnerability', () => {
      player.hp = 3;
      player.invuln = 0;
      player.dashTime = 0.1;
      playerHit();
      expect(player.hp === 3);
    });
    check('clearing the court queues the next wave', () => {
      reset('classic', 'pro');
      game.enemies = [];
      updateGame(0.016);
      expect(game.wavePending === true);
    });
    check('Blitz is a 60 second one-life rush', () => {
      reset('blitz', 'pro');
      expect(player.maxHp === 1 && player.hp === 1);
      expect(game.timeLeft === 60);
      updateGame(61);
      expect(game.mode === 'gameover');
    });
    check('Ironman is one life with no heart drops', () => {
      reset('ironman', 'allstar');
      expect(player.maxHp === 1);
      expect(MODES[game.modeKey].heartDrops === false);
      expect(game.scoreMul > 1);
    });

    goToMenu();
    lines.unshift(`BALLISTIC 3D SELF-TEST — ${pass} passed, ${fail} failed`);
    ui.selftest.textContent = lines.join('\n');
    return { pass, fail, lines };
  }

  window.__BALLISTIC__ = {
    game, player, MODES, DIFFS, ARENA, ENEMY_TYPES,
    startGame, endGame, goToMenu, spawnWave, makeEnemy, makeBall, throwBall,
    updateGame, updatePlayer, updateEnemy, updateBalls, updateEffects, attemptCatch, doDash,
    playerHit, selectMode, selectDiff, runSelfTest
  };

  if (SELFTEST) {
    ui.menu.classList.add('is-hidden');
    ui.hud.classList.add('is-hidden');
    ui.selftest.classList.remove('is-hidden');
    setTimeout(runSelfTest, 80);
  }
})();
