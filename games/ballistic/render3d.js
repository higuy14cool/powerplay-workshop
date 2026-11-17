/* BALLISTIC! 3D — Three.js renderer.
   The simulation lives on a 2D plane; this module gives it a physical court. */
(() => {
  'use strict';
  const B3 = window.Ballistic3D = {};
  const TAU = Math.PI * 2;
  const CENTER_X = 640;
  const CENTER_Y = 410;
  const S = 100; // game pixels per world unit

  let renderer = null;
  let scene = null;
  let camera = null;
  let canvas = null;
  let ready = false;
  let courtGroup = null;
  let centerLineMat = null;
  let logoMat = null;
  let crowdGroup = null;
  let playerModel = null;
  let menuEnemy = null;
  let ballGroup = null;
  let actorGroup = null;
  let effectGroup = null;
  let aimGroup = null;
  let aimLine = null;
  let aimDot = null;
  let aimReticle = null;
  let catchRing = null;
  let particlePoints = null;
  let particlePos = null;
  let particleCol = null;
  let trailPoints = null;
  let trailPos = null;
  let trailCol = null;
  const enemyModels = new Map();
  const ballModels = new Map();
  const pickupModels = new Map();
  const floaterSprites = new Map();
  const heartTexture = makeHeartTexture();
  const raycaster = new THREE.Raycaster();
  const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.72);
  const tmpVec = new THREE.Vector3();
  const tmpObj = new THREE.Object3D();
  const camBase = new THREE.Vector3(0, 8.2, 7.4);
  const camTarget = new THREE.Vector3(0, 0.2, 0.35);

  const wx = (x) => (x - CENTER_X) / S;
  const wz = (y) => (y - CENTER_Y) / S;

  // ---------------------------------------------------------------- textures
  function makeCourtTexture() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 432;
    const g = c.getContext('2d');
    const base = g.createLinearGradient(0, 0, 0, c.height);
    base.addColorStop(0, '#c9935a');
    base.addColorStop(.5, '#d9a66b');
    base.addColorStop(1, '#b97d46');
    g.fillStyle = base;
    g.fillRect(0, 0, c.width, c.height);
    // Planks
    for (let y = 0; y < c.height; y += 27) {
      g.fillStyle = `rgba(${70 + Math.random() * 30}, ${35 + Math.random() * 20}, 12, ${0.04 + Math.random() * 0.05})`;
      g.fillRect(0, y, c.width, 24);
      g.strokeStyle = 'rgba(74, 42, 18, .22)';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, y); g.lineTo(c.width, y); g.stroke();
    }
    for (let i = 0; i < 60; i++) {
      g.strokeStyle = `rgba(80, 45, 18, ${0.03 + Math.random() * 0.06})`;
      g.lineWidth = 1 + Math.random() * 2;
      const x = Math.random() * c.width;
      g.beginPath();
      g.moveTo(x, 0);
      g.bezierCurveTo(x + 20, 140, x - 18, 290, x + 10, c.height);
      g.stroke();
    }
    // Team halves: blue (player) left, red (opponents) right.
    g.fillStyle = 'rgba(56, 189, 248, .075)';
    g.fillRect(0, 0, c.width / 2, c.height);
    g.fillStyle = 'rgba(255, 59, 78, .075)';
    g.fillRect(c.width / 2, 0, c.width / 2, c.height);
    // Soft center glow.
    const glow = g.createRadialGradient(c.width / 2, c.height / 2, 10, c.width / 2, c.height / 2, 150);
    glow.addColorStop(0, 'rgba(255, 210, 63, .16)');
    glow.addColorStop(1, 'rgba(255, 210, 63, 0)');
    g.fillStyle = glow;
    g.fillRect(0, 0, c.width, c.height);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 4;
    return tex;
  }

  function makeBannerTexture() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 256;
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(8, 12, 24, .82)';
    g.fillRect(0, 40, c.width, 176);
    g.strokeStyle = 'rgba(255, 210, 63, .7)';
    g.lineWidth = 8;
    g.strokeRect(4, 44, c.width - 8, 168);
    g.font = '900 108px "Arial Black", Impact, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#ffd23f';
    g.fillText('BALLISTIC!', c.width / 2, 132);
    g.font = '900 26px "Trebuchet MS", sans-serif';
    g.fillStyle = 'rgba(255, 246, 220, .65)';
    g.fillText('D O D G E B A L L   M A Y H E M', c.width / 2, 198);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function makeHeartTexture() {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 128, 128);
    g.shadowColor = 'rgba(74, 222, 128, .9)';
    g.shadowBlur = 18;
    g.fillStyle = '#4ade80';
    g.beginPath();
    g.moveTo(64, 108);
    g.bezierCurveTo(6, 72, 18, 22, 52, 26);
    g.bezierCurveTo(62, 27, 64, 36, 64, 42);
    g.bezierCurveTo(64, 36, 66, 27, 76, 26);
    g.bezierCurveTo(110, 22, 122, 72, 64, 108);
    g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = '#d9ffe6';
    g.lineWidth = 4;
    g.stroke();
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function makeTextSprite(text, color) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.font = '900 68px "Arial Black", Impact, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 12;
    g.strokeStyle = 'rgba(8, 6, 2, .85)';
    g.strokeText(text, c.width / 2, c.height / 2);
    g.fillStyle = color;
    g.fillText(text, c.width / 2, c.height / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.5, 0.375, 1);
    sprite.renderOrder = 20;
    return sprite;
  }

  // ---------------------------------------------------------------- setup
  B3.init = function init(canvasEl) {
    canvas = canvasEl;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(1280, 720, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setClearColor(0x070b14, 1);

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x070b14, 16, 34);
    camera = new THREE.PerspectiveCamera(43, 1280 / 720, 0.1, 80);
    camera.position.copy(camBase);
    camera.lookAt(camTarget);

    courtGroup = new THREE.Group();
    actorGroup = new THREE.Group();
    ballGroup = new THREE.Group();
    effectGroup = new THREE.Group();
    aimGroup = new THREE.Group();
    courtGroup.position.y = 0;
    scene.add(courtGroup, actorGroup, ballGroup, effectGroup, aimGroup);

    buildLights();
    buildCourt();
    buildStands();
    buildAim();
    buildParticles();

    playerModel = makeCharacter('player');
    playerModel.visible = false;
    actorGroup.add(playerModel);
    menuEnemy = makeCharacter('rookie', '#ff5d6c', '#9e2332', 26);
    menuEnemy.visible = false;
    actorGroup.add(menuEnemy);

    ready = true;
    renderer.render(scene, camera);
    return true;
  };

  function buildLights() {
    scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x3d2612, 0.85));
    const sun = new THREE.DirectionalLight(0xfff0d2, 1.45);
    sun.position.set(2.5, 12, 5.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 7;
    sun.shadow.camera.bottom = -7;
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 26;
    sun.shadow.bias = -0.0007;
    scene.add(sun);
    const blue = new THREE.PointLight(0x38bdf8, 0.75, 12, 2);
    blue.position.set(-4.8, 5.4, 1.8);
    scene.add(blue);
    const red = new THREE.PointLight(0xff3b4e, 0.8, 12, 2);
    red.position.set(4.8, 5.4, 1.8);
    scene.add(red);
    const top = new THREE.PointLight(0xfff6dc, 0.5, 13, 2);
    top.position.set(0, 9, 0);
    scene.add(top);
  }

  function buildCourt() {
    const floorMat = new THREE.MeshStandardMaterial({
      map: makeCourtTexture(), roughness: 0.72, metalness: 0.04
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(11.52, 4.88), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    courtGroup.add(floor);

    const railMat = new THREE.MeshStandardMaterial({ color: 0x17223a, roughness: 0.55, metalness: 0.25 });
    const railDark = new THREE.MeshStandardMaterial({ color: 0x0c1322, roughness: 0.65, metalness: 0.2 });
    const addBox = (w, h, d, x, y, z, mat) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      courtGroup.add(m);
      return m;
    };
    addBox(11.9, 0.24, 0.22, 0, 0.02, -2.55, railMat);
    addBox(11.9, 0.24, 0.22, 0, 0.02, 2.55, railMat);
    addBox(0.22, 0.24, 5.3, -5.87, 0.02, 0, railMat);
    addBox(0.22, 0.24, 5.3, 5.87, 0.02, 0, railMat);

    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfff6dc, transparent: true, opacity: 0.82 });
    const addFloorLine = (w, d, x, z, mat = lineMat) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.014, z);
      courtGroup.add(m);
      return m;
    };
    addFloorLine(11.5, 0.035, 0, -2.42);
    addFloorLine(11.5, 0.035, 0, 2.42);
    addFloorLine(0.035, 4.86, -5.74, 0);
    addFloorLine(0.035, 4.86, 5.74, 0);

    centerLineMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.95 });
    addFloorLine(0.065, 4.88, 0, 0, centerLineMat);

    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.83, 64), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.016, 0);
    courtGroup.add(ring);

    // Painted service arcs.
    for (const side of [-1, 1]) {
      const arc = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.64, 48, 1, 0, Math.PI), new THREE.MeshBasicMaterial({
        color: side < 0 ? 0x38bdf8 : 0xff3b4e, transparent: true, opacity: 0.28, side: THREE.DoubleSide
      }));
      arc.rotation.x = -Math.PI / 2;
      arc.rotation.z = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      arc.position.set(side * 2.6, 0.015, 0);
      courtGroup.add(arc);
    }

    // Center banner.
    logoMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
    for (const side of [-1, 1]) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.09), logoMat);
      bar.rotation.x = -Math.PI / 2;
      bar.position.set(side * 0.85, 0.016, 0);
      courtGroup.add(bar);
    }
  }

  function buildStands() {
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x121a2d, roughness: 0.8, metalness: 0.1 });
    const stepMat2 = new THREE.MeshStandardMaterial({ color: 0x18233b, roughness: 0.8, metalness: 0.1 });
    for (let row = 0; row < 5; row++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(14.6, 0.34, 0.72), row % 2 ? stepMat2 : stepMat);
      step.position.set(0, 0.03 + row * 0.28, -3.15 - row * 0.66);
      step.receiveShadow = true;
      courtGroup.add(step);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(16.5, 6.8, 0.35), new THREE.MeshStandardMaterial({ color: 0x080d18, roughness: 0.9 }));
    back.position.set(0, 3.2, -6.75);
    back.receiveShadow = true;
    courtGroup.add(back);

    const banner = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 1.85), new THREE.MeshBasicMaterial({
      map: makeBannerTexture(), transparent: true, side: THREE.DoubleSide
    }));
    banner.position.set(0, 3.3, -6.55);
    courtGroup.add(banner);

    // Side tunnel walls.
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.6, 8.4), new THREE.MeshStandardMaterial({
        color: 0x0a1120, roughness: 0.9
      }));
      wall.position.set(side * 8.2, 1.8, -2.1);
      wall.receiveShadow = true;
      courtGroup.add(wall);
    }

    // Crowd: three coloured blocks of low-poly fans.
    crowdGroup = new THREE.Group();
    const colors = [0xffd23f, 0x38bdf8, 0xff5d6c];
    const geo = new THREE.SphereGeometry(0.12, 6, 5);
    for (let group = 0; group < 3; group++) {
      const mat = new THREE.MeshStandardMaterial({ color: colors[group], roughness: 0.8 });
      const mesh = new THREE.InstancedMesh(geo, mat, 34);
      for (let i = 0; i < 34; i++) {
        const row = Math.floor(Math.random() * 5);
        tmpObj.position.set(
          -6.9 + Math.random() * 13.8,
          0.35 + row * 0.28,
          -3.15 - row * 0.66 + (Math.random() - 0.5) * 0.14
        );
        const sc = 0.8 + Math.random() * 0.55;
        tmpObj.scale.set(sc, sc * 1.18, sc);
        tmpObj.updateMatrix();
        mesh.setMatrixAt(i, tmpObj.matrix);
      }
      crowdGroup.add(mesh);
    }
    courtGroup.add(crowdGroup);

    // Bench balls on both sides.
    const spareMat = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.55 });
    for (const [x, z] of [[-5.3, 2.15], [-5.0, 2.3], [5.3, -2.15], [5.0, -2.3]]) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), spareMat);
      ball.position.set(x, 0.14, z);
      ball.castShadow = true;
      courtGroup.add(ball);
    }
  }

  function buildAim() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    aimLine = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.42 }));
    aimGroup.add(aimLine);

    aimDot = new THREE.Mesh(new THREE.CircleGeometry(0.055, 18), new THREE.MeshBasicMaterial({
      color: 0xffd23f, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false
    }));
    aimDot.rotation.x = -Math.PI / 2;
    aimDot.position.y = 0.02;
    aimGroup.add(aimDot);

    aimReticle = new THREE.Mesh(new THREE.RingGeometry(0.13, 0.17, 28), new THREE.MeshBasicMaterial({
      color: 0xffd23f, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false
    }));
    aimReticle.rotation.x = -Math.PI / 2;
    aimReticle.position.y = 0.025;
    aimGroup.add(aimReticle);

    catchRing = new THREE.Mesh(new THREE.RingGeometry(0.82, 0.9, 48), new THREE.MeshBasicMaterial({
      color: 0x38bdf8, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false
    }));
    catchRing.rotation.x = -Math.PI / 2;
    catchRing.position.y = 0.03;
    catchRing.visible = false;
    aimGroup.add(catchRing);
  }

  function buildParticles() {
    const max = 320;
    particlePos = new Float32Array(max * 3);
    particleCol = new Float32Array(max * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(particleCol, 3));
    particlePoints = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.115, vertexColors: true, transparent: true, opacity: 0.95,
      depthWrite: false, blending: THREE.AdditiveBlending
    }));
    particlePoints.frustumCulled = false;
    effectGroup.add(particlePoints);

    trailPos = new Float32Array(360 * 3);
    trailCol = new Float32Array(360 * 3);
    const tgeo = new THREE.BufferGeometry();
    tgeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    tgeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
    trailPoints = new THREE.Points(tgeo, new THREE.PointsMaterial({
      size: 0.09, vertexColors: true, transparent: true, opacity: 0.55,
      depthWrite: false, blending: THREE.AdditiveBlending
    }));
    trailPoints.frustumCulled = false;
    effectGroup.add(trailPoints);
  }
  // ---------------------------------------------------------------- actors
  function makeCharacter(kind, shirt = '#38bdf8', shorts = '#0a3651', number = 7) {
    const group = new THREE.Group();
    const body = new THREE.Group();
    group.add(body);

    const skin = new THREE.MeshStandardMaterial({ color: kind === 'brute' ? 0xd08a5a : 0xf0b27a, roughness: 0.72 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.66, flatShading: true });
    const shortsMat = new THREE.MeshStandardMaterial({ color: shorts, roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xfff6dc, roughness: 0.5 });

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.34, 24), new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.33, depthWrite: false
    }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    group.add(shadow);

    const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.2, 10), shortsMat);
    hips.position.y = 0.34;
    hips.castShadow = true;
    body.add(hips);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.205, 0.46, 10), shirtMat);
    torso.position.y = 0.64;
    torso.castShadow = true;
    torso.receiveShadow = true;
    body.add(torso);

    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.247, 0.226, 0.055, 10, 1, true), trimMat);
    stripe.position.y = 0.46;
    body.add(stripe);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.09, 8), skin);
    neck.position.y = 0.89;
    body.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.155, 12, 10), skin);
    head.position.y = 1.03;
    head.castShadow = true;
    body.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.158, 12, 8, 0, TAU, 0, Math.PI * 0.48), new THREE.MeshStandardMaterial({
      color: 0x24160d, roughness: 0.85
    }));
    hair.position.y = 1.045;
    hair.rotation.x = Math.PI;
    body.add(hair);

    // Headband in team colour.
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.152, 0.022, 6, 16), new THREE.MeshStandardMaterial({
      color: shirt, roughness: 0.6
    }));
    band.rotation.x = Math.PI / 2;
    band.position.y = 1.06;
    body.add(band);

    function limb(parent, x, y, len, width, mat, isArm) {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(width, width * 0.9, len, 7), mat);
      seg.position.y = -len / 2;
      seg.castShadow = true;
      pivot.add(seg);
      if (isArm) {
        const hand = new THREE.Mesh(new THREE.SphereGeometry(width * 1.15, 7, 6), skin);
        hand.position.y = -len - 0.01;
        pivot.add(hand);
      } else {
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(width * 2.2, 0.09, width * 3.3), shoeMat);
        shoe.position.set(0, -len + 0.015, 0.045);
        shoe.castShadow = true;
        pivot.add(shoe);
      }
      parent.add(pivot);
      return pivot;
    }

    const legL = limb(body, -0.115, 0.33, 0.31, 0.066, shortsMat, false);
    const legR = limb(body, 0.115, 0.33, 0.31, 0.066, shortsMat, false);
    const armL = limb(body, -0.275, 0.79, 0.32, 0.055, skin, true);
    const armR = limb(body, 0.275, 0.79, 0.32, 0.055, skin, true);
    // Sleeves.
    for (const [arm, sign] of [[armL, -1], [armR, 1]]) {
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.07, 0.13, 7), shirtMat);
      sleeve.position.y = -0.05;
      sleeve.castShadow = true;
      arm.add(sleeve);
    }

    // Number on the chest.
    const nc = document.createElement('canvas');
    nc.width = 64; nc.height = 64;
    const ng = nc.getContext('2d');
    ng.font = '900 44px "Arial Black", Impact, sans-serif';
    ng.textAlign = 'center'; ng.textBaseline = 'middle';
    ng.fillStyle = 'rgba(255,246,220,.92)';
    ng.fillText(String(number), 32, 34);
    const numberTex = new THREE.CanvasTexture(nc);
    numberTex.encoding = THREE.sRGBEncoding;
    const numberPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({
      map: numberTex, transparent: true, depthWrite: false
    }));
    numberPlane.position.set(0, 0.67, 0.245);
    body.add(numberPlane);

    group.userData.body = body;
    group.userData.legL = legL;
    group.userData.legR = legR;
    group.userData.armL = armL;
    group.userData.armR = armR;
    group.userData.head = head;
    group.userData.lastX = 0;
    group.userData.lastZ = 0;
    group.userData.kind = kind;
    return group;
  }

  function animateCharacter(group, dt, x, z, windup = 0) {
    const d = group.userData;
    const moved = Math.hypot(x - d.lastX, z - d.lastZ);
    d.lastX = x; d.lastZ = z;
    const now = performance.now() / 1000;
    const walk = Math.min(1, moved * 90);
    const swing = Math.sin(now * 12) * 0.52 * walk;
    d.legL.rotation.x = swing;
    d.legR.rotation.x = -swing;
    d.armL.rotation.x = -swing * 0.85;
    d.armR.rotation.x = swing * 0.85;
    if (windup > 0) {
      const raise = Math.sin(Math.min(1, windup / 0.42) * Math.PI * 0.9);
      d.armR.rotation.x = -1.5 * raise;
    }
    const bob = walk ? Math.abs(Math.sin(now * 12)) * 0.025 : Math.sin(now * 2.1) * 0.008;
    d.body.position.y = bob;
    d.head.rotation.z = Math.sin(now * 2.4) * 0.03;
  }

  function personFor(enemy) {
    let model = enemyModels.get(enemy);
    if (model) return model;
    const type = enemy.type;
    let shirt = '#ff5d6c', shorts = '#7a1b2a', number = 5;
    if (type === 'sniper') { shirt = '#a78bfa'; shorts = '#3b2470'; number = 9; }
    if (type === 'brute') { shirt = '#fb923c'; shorts = '#6b2c0a'; number = 4; }
    if (type === 'boss') { shirt = '#e2e8f0'; shorts = '#111827'; number = 0; }
    model = makeCharacter(type, shirt, shorts, number);
    model.scale.setScalar(type === 'boss' ? 1.24 : type === 'brute' ? 1.1 : 1);
    model.visible = false;
    actorGroup.add(model);
    enemyModels.set(enemy, model);
    return model;
  }

  function syncActors(game, player) {
    const live = new Set(game.enemies);
    for (const [enemy, model] of enemyModels) {
      if (!live.has(enemy)) {
        actorGroup.remove(model);
        enemyModels.delete(enemy);
      }
    }
    for (const e of game.enemies) {
      const model = personFor(e);
      const x = wx(e.x), z = wz(e.y);
      model.visible = !(e.spawnT > 0 && Math.random() < 0.55);
      model.position.set(x, 0, z);
      model.rotation.y = Math.atan2(wx(player.x) - x, wz(player.y) - z);
      animateCharacter(model, 0.016, x, z, e.windup || 0);
    }

    playerModel.position.set(wx(player.x), 0, wz(player.y));
    playerModel.rotation.y = Math.atan2(
      wx(player.x + Math.cos(player.aim)) - wx(player.x),
      wz(player.y + Math.sin(player.aim)) - wz(player.y)
    );
    playerModel.visible = true;
    animateCharacter(playerModel, 0.016, wx(player.x), wz(player.y), 0);
    playerModel.userData.body.position.y += Math.sin(performance.now() / 210) * 0.01;

    // Menu mascot: the team's mascot waits at centre court.
    if (game.mode === 'menu') {
      menuEnemy.visible = true;
      menuEnemy.position.set(0.75, 0, 0.3);
      menuEnemy.rotation.y = 0.3;
      animateCharacter(menuEnemy, 0.016, 0.75, 0.3, 0);
      playerModel.position.set(-1.5, 0, -1.5);
      playerModel.visible = false;
    } else {
      menuEnemy.visible = false;
    }
  }

  function ballMaterial(color) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.05 });
  }

  function ballFor(ball) {
    let model = ballModels.get(ball);
    if (model) return model;
    const group = new THREE.Group();
    const color = new THREE.Color(ball.color || '#ff5d6c');
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10), ballMaterial(color));
    mesh.castShadow = true;
    group.add(mesh);
    const seam = new THREE.Mesh(new THREE.TorusGeometry(0.136, 0.012, 4, 20), new THREE.MeshBasicMaterial({
      color: 0xfff6dc, transparent: true, opacity: 0.55
    }));
    seam.rotation.x = Math.PI / 2;
    group.add(seam);
    ballGroup.add(group);
    ballModels.set(ball, group);
    return group;
  }

  function syncBalls(game) {
    const live = new Set(game.balls);
    for (const [ball, model] of ballModels) {
      if (!live.has(ball)) {
        ballGroup.remove(model);
        ballModels.delete(ball);
      }
    }
    for (const b of game.balls) {
      const model = ballFor(b);
      const speed = Math.hypot(b.vx, b.vy);
      const height = b.ground ? 0.14 : 0.34 + Math.min(0.46, speed / 2600);
      model.position.set(wx(b.x), height, wz(b.y));
      model.rotation.x += (b.spin || 0) * 0.012;
      model.rotation.z += 0.02;
      if (b.owner === 'enemy' && speed > 500) {
        const glow = model.children[1];
        glow.material.opacity = 0.7;
        glow.material.color.setHex(0xff5d6c);
      }
    }
  }

  function syncPickups(game) {
    const live = new Set(game.pickups);
    for (const [pickup, sprite] of pickupModels) {
      if (!live.has(pickup)) {
        effectGroup.remove(sprite);
        pickupModels.delete(pickup);
      }
    }
    for (const p of game.pickups) {
      let sprite = pickupModels.get(p);
      if (!sprite) {
        sprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: heartTexture, transparent: true, depthWrite: false
        }));
        sprite.scale.set(0.5, 0.5, 1);
        effectGroup.add(sprite);
        pickupModels.set(p, sprite);
      }
      sprite.position.set(wx(p.x), 0.55 + Math.sin((p.t || 0) * 4) * 0.09, wz(p.y));
    }
  }

  function syncEffects(game) {
    // Particles.
    let n = 0;
    for (const p of game.particles) {
      if (n >= 320) break;
      particlePos[n * 3] = wx(p.x);
      particlePos[n * 3 + 1] = 0.3 + (p.life / p.max) * 0.6;
      particlePos[n * 3 + 2] = wz(p.y);
      const c = new THREE.Color(p.color || '#ffd23f');
      particleCol[n * 3] = c.r; particleCol[n * 3 + 1] = c.g; particleCol[n * 3 + 2] = c.b;
      n++;
    }
    particlePoints.geometry.setDrawRange(0, n);
    particlePoints.geometry.attributes.position.needsUpdate = true;
    particlePoints.geometry.attributes.color.needsUpdate = true;

    // Ball trails.
    let tn = 0;
    for (const b of game.balls) {
      if (b.ground) continue;
      const speed = Math.hypot(b.vx, b.vy);
      if (speed < 380) continue;
      const c = new THREE.Color(b.owner === 'player' ? '#ffd23f' : '#ff5d6c');
      for (let i = 0; i < b.trail.length && tn < 360; i++) {
        const t = b.trail[i];
        const fade = (i + 1) / b.trail.length;
        trailPos[tn * 3] = wx(t.x);
        trailPos[tn * 3 + 1] = 0.34 + fade * 0.1;
        trailPos[tn * 3 + 2] = wz(t.y);
        trailCol[tn * 3] = c.r * fade; trailCol[tn * 3 + 1] = c.g * fade; trailCol[tn * 3 + 2] = c.b * fade;
        tn++;
      }
    }
    trailPoints.geometry.setDrawRange(0, tn);
    trailPoints.geometry.attributes.position.needsUpdate = true;
    trailPoints.geometry.attributes.color.needsUpdate = true;

    // Floating score text.
    const live = new Set(game.floaters);
    for (const [floater, sprite] of floaterSprites) {
      if (!live.has(floater)) {
        effectGroup.remove(sprite);
        floaterSprites.delete(floater);
      }
    }
    for (const f of game.floaters) {
      let sprite = floaterSprites.get(f);
      if (!sprite) {
        sprite = makeTextSprite(f.text, f.color);
        effectGroup.add(sprite);
        floaterSprites.set(f, sprite);
      }
      const t = 1 - f.life / f.max;
      sprite.position.set(wx(f.x), 1.35 + t * 0.8, wz(f.y));
      sprite.material.opacity = Math.min(1, f.life / 0.3);
      sprite.scale.set(1.25 - t * 0.25, 0.31 - t * 0.06, 1);
    }
  }
  // ---------------------------------------------------------------- aim & camera
  function syncAim(game, player, opts) {
    const show = game.mode === 'playing' || game.mode === 'paused' || game.mode === 'gameover';
    aimGroup.visible = show;
    catchRing.visible = show && player.catchTimer > 0;
    if (!show) return;

    const px = wx(player.x);
    const pz = wz(player.y);
    const dx = Math.cos(player.aim);
    const dz = Math.sin(player.aim);
    const reach = 3.2;
    const tx = px + dx * reach;
    const tz = pz + dz * reach;

    const arr = aimLine.geometry.attributes.position.array;
    arr[0] = px; arr[1] = 0.05; arr[2] = pz;
    arr[3] = tx; arr[4] = 0.05; arr[5] = tz;
    aimLine.geometry.attributes.position.needsUpdate = true;
    aimLine.material.opacity = opts.isTouch ? 0.18 : 0.46;

    aimDot.position.set(tx, 0.02, tz);
    aimReticle.position.set(tx, 0.024, tz);
    const pulse = 1 + Math.sin(performance.now() / 190) * 0.08;
    aimReticle.scale.set(pulse, pulse, pulse);
    aimReticle.material.opacity = player.ammo > 0 ? 0.95 : 0.35;

    if (player.catchTimer > 0) {
      const t = player.catchTimer / 0.28;
      catchRing.position.set(px, 0.03, pz);
      catchRing.scale.setScalar(0.9 + t * 0.25);
      catchRing.material.opacity = 0.35 + t * 0.45;
    }
  }

  function updateCamera(game, player, dt) {
    const playerX = wx(player.x);
    const playerZ = wz(player.y);
    const focusX = playerX * 0.36;
    const focusZ = playerZ * 0.18;
    const desiredX = camBase.x + focusX;
    const desiredZ = camBase.z + focusZ * 0.35;
    camera.position.x += (desiredX - camera.position.x) * Math.min(1, dt * 4.2);
    camera.position.z += (desiredZ - camera.position.z) * Math.min(1, dt * 4.2);
    const shake = Math.min(0.35, (game.shake || 0) * 0.06);
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y = camBase.y + (Math.random() - 0.5) * shake * 0.6;
    camera.lookAt(camTarget.x + focusX * 0.2, camTarget.y, camTarget.z + focusZ * 0.2);
  }

  B3.projectCourt = function projectCourt(x, y) {
    if (!ready) return null;
    camera.updateMatrixWorld();
    const v = new THREE.Vector3(wx(x), 0.62, wz(y)).project(camera);
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + (v.x * 0.5 + 0.5) * rect.width,
      y: rect.top + (-v.y * 0.5 + 0.5) * rect.height
    };
  };

  B3.screenToCourt = function screenToCourt(clientX, clientY) {
    if (!ready) {
      return { x: CENTER_X, y: CENTER_Y + 140 };
    }
    const rect = canvas.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera({ x: nx, y: ny }, camera);
    if (!raycaster.ray.intersectPlane(aimPlane, tmpVec)) {
      return { x: CENTER_X, y: CENTER_Y + 120 };
    }
    return { x: CENTER_X + tmpVec.x * S, y: CENTER_Y + tmpVec.z * S };
  };

  B3.render = function render(game, player, opts = {}) {
    if (!ready) return;
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - (render._last || now)) / 1000));
    render._last = now;

    if (centerLineMat) {
      const pulse = 0.7 + Math.sin(now / 260) * 0.2;
      const playerNear = Math.abs(wx(player.x) - 0) < 0.55;
      centerLineMat.opacity = playerNear ? 1 : pulse;
      centerLineMat.color.setHex(playerNear ? 0xffb01a : 0xffd23f);
    }
    if (logoMat) logoMat.opacity = 0.1 + Math.sin(now / 500) * 0.05;

    syncActors(game, player);
    syncBalls(game);
    syncPickups(game);
    syncEffects(game);
    syncAim(game, player, opts);
    updateCamera(game, player, dt);

    renderer.render(scene, camera);
  };
})();


