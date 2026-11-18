/* ============================================================
   POWERPLAY Workshop — more archetypes + Architect chat UI
   ============================================================ */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const { ARCHETYPES, page } = window.PowerplayArchitectData;

  /* ---------- extra archetypes ---------- */
  ARCHETYPES.push(
    {
      id: "game",
      match: ["game", "arcade", "clicker", "score", "player", "shooter", "platformer", "puzzle", "play"],
      icon: "✦",
      name: "Hitgrid",
      tagline: "A 15-second arcade loop with score and replay.",
      features: [
        "Start, play and replay without leaving the page",
        "Targets spawn in random positions with a shrinking window",
        "Score and personal best tracked live",
        "Timed round with a clean end screen",
      ],
      screens: ["Start", "Play", "Results"],
      stack: ["HTML", "Canvas 2D", "Vanilla JS", "requestAnimationFrame"],
      data: [["score", "number"], ["best", "number"], ["targets", "x, y, r, expiresAt"]],
      steps: [
        ["Pick the verb", "One action the player repeats — here, hitting a target."],
        ["Make the loop", "A fixed timestep that spawns and expires targets."],
        ["Reward skill", "Shorter windows as the score climbs."],
        ["Add a scoreboard", "Compare this run to a stored best."],
      ],
      html() {
        const script = `
var cv = document.getElementById("cv"), cx = cv.getContext("2d");
var wrap = cv.parentElement, scoreEl = document.getElementById("score"), bestEl = document.getElementById("best");
var best = 0, score = 0, running = false, ends = 0, target = null, raf = 0;
function size(){var r=cv.getBoundingClientRect();var d=Math.min(window.devicePixelRatio||1,2);cv.width=r.width*d;cv.height=r.height*d;cx.setTransform(d,0,0,d,0,0);return r}
function spawn(){var r=cv.getBoundingClientRect();var rad=15+Math.random()*12;
  target={x:rad+18+Math.random()*(r.width-rad*2-36),y:rad+18+Math.random()*(r.height-rad*2-36),r:rad,born:performance.now(),life:1100-Math.min(score*18,600)}}
function draw(now){
  var r=cv.getBoundingClientRect();
  cx.clearRect(0,0,r.width,r.height);
  cx.strokeStyle="rgba(255,255,255,.05)";
  for(var x=0;x<r.width;x+=36){cx.beginPath();cx.moveTo(x,0);cx.lineTo(x,r.height);cx.stroke()}
  for(var y=0;y<r.height;y+=36){cx.beginPath();cx.moveTo(0,y);cx.lineTo(r.width,y);cx.stroke()}
  if(target && now-target.born<target.life){
    var t=(now-target.born)/target.life;
    cx.globalAlpha=1-t*0.65;
    cx.fillStyle="#b8ff3d";cx.beginPath();cx.arc(target.x,target.y,target.r,0,7);cx.fill();
    cx.globalAlpha=1;cx.fillStyle="#0a0b10";cx.beginPath();cx.arc(target.x,target.y,target.r*.4,0,7);cx.fill();
    cx.globalAlpha=1;
  }
}
function loop(now){
  if(!running)return;
  if(target && now-target.born>target.life){target=null;spawn()}
  if(!target)spawn();
  if(now>ends){running=false;finish();return}
  draw(now); raf=requestAnimationFrame(loop);
}
cv.onpointerdown=function(e){
  if(!running||!target)return;
  var r=cv.getBoundingClientRect();
  var x=e.clientX-r.left,y=e.clientY-r.top;
  if(Math.hypot(x-target.x,y-target.y)<=target.r+10){score++;scoreEl.textContent=score;target=null;spawn()}
};
document.getElementById("start").onclick=function(){
  score=0;scoreEl.textContent="0";target=null;ends=performance.now()+15000;running=true;
  document.getElementById("over").style.display="none";
  size();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
};
function finish(){
  best=Math.max(best,score);bestEl.textContent=best;
  var ov=document.getElementById("over");
  ov.style.display="flex";
  ov.innerHTML='<h2 style="margin:0 0 4px;font-size:26px">'+score+' hits</h2><p class="sub" style="margin:0 0 14px">'+(score>=best&&score>0?"New best.":"Best: "+best)+'</p><button class="btn" id="again">Play again</button>';
  document.getElementById("again").onclick=function(){document.getElementById("start").click()};
  draw(performance.now());
}
window.addEventListener("resize",size);
size();draw(performance.now());
`;
        return page(
          "Hitgrid — arcade game",
          "#b8ff3d",
          `.stage{position:relative;aspect-ratio:4/3;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.09);background:#080a11}
           canvas{position:absolute;inset:0;width:100%;height:100%;cursor:crosshair}
           #over{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(6,7,11,.78);text-align:center}
           .hud{display:flex;gap:8px;margin-bottom:10px}
           .hud span{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#8a91a6;border:1px solid rgba(255,255,255,.12);border-radius:99px;padding:4px 10px}
           .hud b{color:#b8ff3d;margin-left:4px}`,
          `<h1>Hitgrid</h1><p class="sub">15 seconds. Hit everything.</p>
  <div class="hud"><span>score<b id="score">0</b></span><span>best<b id="best">0</b></span></div>
  <div class="stage"><canvas id="cv"></canvas><div id="over"><button class="btn" id="start">Start run</button></div></div>`,
          script
        );
      },
    },
    {
      id: "timer",
      match: ["timer", "pomodoro", "focus", "countdown", "productivity", "clock"],
      icon: "◔",
      name: "Focusblock",
      tagline: "A pomodoro timer with a big, calm countdown.",
      features: [
        "25-minute focus block with start, pause and reset",
        "Large tabular countdown that never jitters",
        "Clear running state so you know it is alive",
        "One-tap switch to a 5-minute break",
      ],
      screens: ["Focus", "Break"],
      stack: ["HTML", "CSS", "Vanilla JS", "setInterval"],
      data: [["secondsLeft", "number"], ["phase", "focus | break"], ["running", "boolean"]],
      steps: [
        ["Draw the clock", "Format seconds as mm:ss and keep digits tabular."],
        ["Drive it with one interval", "Tick every second against a stored end time."],
        ["Pause without drift", "Store remaining seconds on pause."],
        ["Switch phases", "Swap duration and reset the clock."],
      ],
      html() {
        const script = `
var timeEl=document.getElementById("time"), stateEl=document.getElementById("state");
var left=25*60, phase="focus", running=false, iv=null, endAt=0;
function fmt(s){var m=Math.floor(s/60),x=s%60;return (m<10?"0":"")+m+":"+(x<10?"0":"")+x}
function paint(){timeEl.textContent=fmt(left);stateEl.textContent=running?"running · "+phase:"paused · "+phase;document.body.style.setProperty("--accent",phase==="focus"?"#b8ff3d":"#2dd4ef")}
function tick(){
  var next=Math.max(0,Math.round((endAt-Date.now())/1000));
  left=next;paint();
  if(left<=0){clearInterval(iv);iv=null;running=false;paint();stateEl.textContent="block complete · take the win"}
}
document.getElementById("toggle").onclick=function(){
  if(running){running=false;clearInterval(iv);iv=null;paint();return}
  running=true;endAt=Date.now()+left*1000;iv=setInterval(tick,250);paint();
};
document.getElementById("reset").onclick=function(){
  running=false;clearInterval(iv);iv=null;left=phase==="focus"?25*60:5*60;paint();
};
document.getElementById("swap").onclick=function(){
  phase=phase==="focus"?"break":"focus";
  running=false;clearInterval(iv);iv=null;left=phase==="focus"?25*60:5*60;paint();
};
paint();
`;
        return page(
          "Focusblock — pomodoro timer",
          "#b8ff3d",
          `.clock{font-size:clamp(54px,16vw,84px);font-weight:800;letter-spacing:-.05em;text-align:center;
            font-variant-numeric:tabular-nums;line-height:1;margin:18px 0 6px}
           .state{text-align:center;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8a91a6;margin-bottom:20px}
           .controls{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
           .controls .btn{min-width:96px}`,
          `<h1>Focusblock</h1><p class="sub">One block at a time.</p>
  <div class="card" style="padding:26px 16px">
    <div class="clock" id="time">25:00</div>
    <div class="state" id="state">paused · focus</div>
    <div class="controls"><button class="btn" id="toggle">Start</button><button class="btn" id="reset" style="background:#1b2030;color:#eef1f6">Reset</button><button class="btn" id="swap" style="background:#1b2030;color:#eef1f6">Break</button></div>
  </div>`,
          script
        );
      },
    },
    {
      id: "store",
      match: ["store", "shop", "cart", "product", "ecommerce", "checkout", "sell"],
      icon: "◫",
      name: "Marketstall",
      tagline: "A product grid with a working cart counter.",
      features: [
        "Product cards with price and one-tap add",
        "Sticky cart total that updates immediately",
        "Quantity-aware totals, not just item counts",
        "Empty and populated states handled",
      ],
      screens: ["Shop", "Cart"],
      stack: ["HTML", "CSS", "Vanilla JS"],
      data: [["products", "id, name, price"], ["cart", "productId -> quantity"]],
      steps: [
        ["Hard-code the catalogue", "Three products are enough to test the flow."],
        ["Add to cart", "Keep quantities in an object keyed by id."],
        ["Derive totals", "Sum price times quantity on every render."],
        ["Add a cart view", "List lines, allow removal, show a checkout button."],
      ],
      html() {
        const script = `
var items=[{name:"Sticker pack",price:6},{name:"Poster",price:14},{name:"Cap",price:24}];
var cart={};
var grid=document.getElementById("grid"), bar=document.getElementById("bar");
function total(){var t=0,n=0;Object.keys(cart).forEach(function(k){t+=items[k].price*cart[k];n+=cart[k]});return {t:t,n:n}}
function render(){
  grid.innerHTML="";
  items.forEach(function(it,i){
    var d=document.createElement("div");
    d.className="card";d.style.padding="14px";
    d.innerHTML='<div style="height:54px;border-radius:9px;margin-bottom:10px;background:linear-gradient(135deg,rgba(184,255,61,.28),rgba(45,212,239,.18))"></div><strong style="font-size:13.5px">'+it.name+'</strong><div style="color:#8a91a6;font-size:12px;margin:2px 0 10px">$'+it.price.toFixed(2)+'</div>';
    var b=document.createElement("button");b.className="btn";b.textContent="Add";b.style.cssText="padding:8px 12px;font-size:12px";
    b.onclick=function(){cart[i]=(cart[i]||0)+1;render()};
    d.appendChild(b);grid.appendChild(d);
  });
  var s=total();
  bar.textContent="Cart · "+s.n+" item"+(s.n===1?"":"s")+" · $"+s.t.toFixed(2);
  document.getElementById("buy").disabled=!s.n;
}
document.getElementById("buy").onclick=function(){
  if(!total().n)return;
  cart={};render();
  bar.textContent="Thanks! Order placed.";
};
render();
`;
        return page(
          "Marketstall — shop",
          "#b8ff3d",
          `.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
           .bar{position:sticky;bottom:0;background:#0b0e17;border-top:1px solid rgba(255,255,255,.1);
             margin:14px -16px -26px;padding:12px 16px;font-size:12.5px;color:#c9cfdd;display:flex;align-items:center;gap:10px}
           .bar button{margin-left:auto;padding:8px 12px;font-size:12px}
           .bar button:disabled{opacity:.35;cursor:not-allowed}`,
          `<h1>Marketstall</h1><p class="sub">Three things. Small cart. Zero fuss.</p>
  <div class="grid" id="grid"></div>
  <div class="bar"><span id="bar">Cart · 0 items</span><button class="btn" id="buy">Checkout</button></div>`,
          script
        );
      },
    },
    {
      id: "chat",
      match: ["chat", "message", "messenger", "dm", "assistant", "bot", "support"],
      icon: "◌",
      name: "Chatline",
      tagline: "A chat interface with a scripted reply loop.",
      features: [
        "Message thread with your messages right-aligned",
        "Enter to send, auto-scroll to the newest message",
        "Scripted replies so the flow is demoable offline",
        "Empty input guarded",
      ],
      screens: ["Thread", "Composer"],
      stack: ["HTML", "CSS", "Vanilla JS"],
      data: [["messages", "role, text, time"], ["replyIndex", "number"]],
      steps: [
        ["Render a thread", "Keep messages in an array and re-render."],
        ["Send on Enter", "Trim the input and ignore whitespace."],
        ["Fake a reply", "Cycle a few canned responses with a short delay."],
        ["Autoscroll", "Pin the view to the bottom after each render."],
      ],
      html() {
        const script = `
var msgs=[{role:"bot",text:"Hey — this is a starter chat. Type anything."}];
var replies=["Good point. What would you build next?","I can see that working. Want to wire it to real data?","Noted. This is where your API call would go.","Nice. Try changing the accent colour to make it yours."];
var ri=0, log=document.getElementById("log"), input=document.getElementById("msg");
function render(){
  log.innerHTML="";
  msgs.forEach(function(m){
    var d=document.createElement("div");
    d.className="bubble "+(m.role==="me"?"me":"bot");
    d.textContent=m.text;log.appendChild(d);
  });
  log.scrollTop=log.scrollHeight;
}
document.getElementById("send").onclick=function(){
  var v=input.value.trim();if(!v)return;
  msgs.push({role:"me",text:v});input.value="";render();
  setTimeout(function(){msgs.push({role:"bot",text:replies[ri++%replies.length]});render()},700);
};
input.addEventListener("keydown",function(e){if(e.key==="Enter")document.getElementById("send").click()});
render();
`;
        return page(
          "Chatline — chat app",
          "#8b5cf6",
          `.thread{height:320px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:4px 2px 12px}
           .bubble{max-width:82%;padding:10px 13px;border-radius:13px;font-size:13.5px;line-height:1.5}
           .bubble.bot{background:#151a2a;border:1px solid rgba(255,255,255,.07);border-top-left-radius:4px;align-self:flex-start}
           .bubble.me{background:rgba(139,92,246,.24);border:1px solid rgba(139,92,246,.4);border-top-right-radius:4px;align-self:flex-end}
           .composer{display:flex;gap:8px;margin-top:10px}`,
          `<h1>Chatline</h1><p class="sub">A thread, a composer, a reply.</p>
  <div class="card"><div class="thread" id="log"></div>
  <div class="composer"><input id="msg" placeholder="Write a message…"><button class="btn" id="send">Send</button></div></div>`,
          script
        );
      },
    },
    {
      id: "notes",
      match: ["note", "journal", "diary", "writing", "notebook", "idea"],
      icon: "✎",
      name: "Noteboard",
      tagline: "A quick capture board for ideas and notes.",
      features: [
        "Capture a note title and body in one go",
        "Delete notes without a confirmation maze",
        "Newest note first with a tidy timestamp",
        "Counts keep the board honest",
      ],
      screens: ["Board", "New note"],
      stack: ["HTML", "CSS", "Vanilla JS"],
      data: [["notes", "id, title, body, createdAt"], ["view", "list | editor"]],
      steps: [
        ["Capture first", "A title and a body is enough."],
        ["Render cards", "Show title, snippet and time."],
        ["Open a note", "Swap the board for a full-height reader."],
        ["Persist locally", "Save notes so they survive a refresh."],
      ],
      html() {
        const script = `
var notes=[{title:"Workshop idea",body:"A page that collects every game I make and lets an AI plan the next one."}];
var board=document.getElementById("board");
function render(){
  board.innerHTML="";
  document.getElementById("count").textContent=notes.length+(notes.length===1?" note":" notes");
  if(!notes.length){board.innerHTML='<div class="empty">Blank board. Add the first note.</div>';return}
  notes.forEach(function(n,i){
    var d=document.createElement("div");d.className="card";d.style.marginBottom="8px";
    d.innerHTML='<div style="display:flex;align-items:center;gap:8px"><strong style="font-size:13.5px">'+n.title+'</strong><button class="del" data-i="'+i+'">×</button></div><p style="margin:5px 0 0;color:#8a91a6;font-size:12.5px;line-height:1.5">'+n.body+'</p>';
    board.appendChild(d);
  });
  board.querySelectorAll(".del").forEach(function(b){b.onclick=function(){notes.splice(Number(b.dataset.i),1);render()}});
}
document.getElementById("add").onclick=function(){
  var t=document.getElementById("nt").value.trim(), b=document.getElementById("nb").value.trim();
  if(!t||!b)return;
  notes.unshift({title:t,body:b});document.getElementById("nt").value="";document.getElementById("nb").value="";render();
};
render();
`;
        return page(
          "Noteboard — notes",
          "#ffb020",
          "textarea{width:100%;min-height:70px;padding:11px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:#0a0d15;color:#eef1f6;font:inherit;resize:vertical;outline:none}",
          `<h1>Noteboard</h1><p class="sub" id="count">0 notes</p>
  <div class="card" style="margin-bottom:12px"><input id="nt" placeholder="Title" style="margin-bottom:8px"><textarea id="nb" placeholder="Write it down…"></textarea><button class="btn" id="add" style="margin-top:8px">Add note</button></div>
  <div id="board"></div>`,
          script
        );
      },
    }
  );

  /* ---------- generic fallback ---------- */
  const GENERIC = {
    id: "starter",
    icon: "▲",
    name: "Launchpad",
    tagline: "A clean starter board you can grow into anything.",
    features: [
      "Add entries with a title and a short detail",
      "Delete entries inline as the list evolves",
      "Live counter and empty state included",
      "Semantic markup and accessible focus styles",
    ],
    screens: ["Board", "New entry", "Detail"],
    stack: ["HTML", "CSS", "Vanilla JS"],
    data: [["entries", "id, title, detail"], ["theme", "accent colour"]],
    steps: [
      ["Name the core object", "What is one thing this app manages?"],
      ["Make one screen work", "Add, read and delete before anything else."],
      ["Shape the data", "One array of objects, rendered on every change."],
      ["Choose the next power-up", "Persistence, search or accounts."],
    ],
    html() {
      const script = `
var entries=[{title:"First entry",detail:"Everything starts as a list you can edit."}];
var list=document.getElementById("list");
function render(){
  list.innerHTML="";
  document.getElementById("count").textContent=entries.length+" entries";
  if(!entries.length){list.innerHTML='<li class="empty">Nothing here yet.</li>';return}
  entries.forEach(function(e,i){
    var li=document.createElement("li");
    li.innerHTML='<div style="min-width:0"><strong style="font-size:13.5px;display:block">'+e.title+'</strong><span style="color:#8a91a6;font-size:12px">'+e.detail+'</span></div>';
    var d=document.createElement("button");d.className="del";d.textContent="×";
    d.onclick=function(){entries.splice(i,1);render()};
    li.appendChild(d);list.appendChild(li);
  });
}
document.getElementById("add").onclick=function(){
  var t=document.getElementById("t").value.trim(),d=document.getElementById("d").value.trim();
  if(!t)return;
  entries.unshift({title:t,detail:d||"—"});document.getElementById("t").value="";document.getElementById("d").value="";render();
};
render();
`;
      return page(
        "Launchpad — starter app",
        "#b8ff3d",
        ".entries li{align-items:flex-start}",
        `<h1>Launchpad</h1><p class="sub" id="count">0 entries</p>
  <div class="card" style="margin-bottom:12px"><input id="t" placeholder="Title"><input id="d" placeholder="Short detail" style="margin-top:8px"><button class="btn" id="add" style="margin-top:8px">Add entry</button></div>
  <ul class="entries" id="list"></ul>`,
        script
      );
    },
  };

  /* ---------- planning ---------- */
  function detect(prompt) {
    const text = prompt.toLowerCase();
    let best = null;
    let bestScore = 0;
    ARCHETYPES.forEach((a) => {
      let score = 0;
      a.match.forEach((kw) => {
        if (text.includes(kw)) score += kw.includes(" ") ? 4 : kw.length > 5 ? 2 : 1;
      });
      if (score > bestScore) {
        bestScore = score;
        best = a;
      }
    });
    return bestScore > 0 ? best : GENERIC;
  }

  function titleCase(str) {
    return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
  }

  function extractName(prompt) {
    const m = prompt.match(/(?:called|named|name it)\s+["“']?([a-z0-9][a-z0-9 &'.-]{1,26})["”']?/i);
    if (!m) return null;
    const cleaned = m[1].replace(/\s+(app|game|website|site|for|that|with|and)$/i, "").trim();
    return cleaned ? titleCase(cleaned) : null;
  }

  const STACK_HINTS = {
    react: "React + Vite",
    vue: "Vue 3",
    svelte: "Svelte",
    python: "Python + Flask",
    flutter: "Flutter",
    next: "Next.js",
    typescript: "TypeScript",
    firebase: "Firebase",
    supabase: "Supabase",
  };

  function buildPlan(prompt) {
    const archetype = detect(prompt);
    const customName = extractName(prompt);
    const lower = prompt.toLowerCase();
    const mentioned = Object.keys(STACK_HINTS).filter((k) => lower.includes(k));

    const stack = archetype.stack.slice();
    mentioned.forEach((k) => {
      const label = STACK_HINTS[k];
      if (!stack.some((s) => s.toLowerCase() === label.toLowerCase())) stack.push(label);
    });

    const features = archetype.features.slice();
    if (/login|auth|account|user/.test(lower)) features.push("Accounts and sign-in (add after the core loop works)");
    if (/database|save|persist|storage/.test(lower)) features.push("Persistent storage so data survives a refresh");
    if (/share|multiplayer|friend/.test(lower)) features.push("Sharing or multiplayer layer");

    return {
      archetype,
      name: customName || archetype.name,
      tagline: customName ? `Your take on ${archetype.tagline.toLowerCase()}` : archetype.tagline,
      features,
      screens: archetype.screens,
      stack,
      data: archetype.data,
      steps: archetype.steps,
      code: archetype.html(),
      mentions: mentioned,
    };
  }

  /* ---------- UI ---------- */
  const chatLog = $("#chatLog");
  const input = $("#promptInput");
  const planView = $("#bpPlan");
  const codeView = $("#bpCode");
  const previewView = $("#bpPreview");
  const codeOutput = $("#codeOutput");
  const previewFrame = $("#previewFrame");
  const previewUrl = $("#previewUrl");
  const codeFilename = $("#codeFilename");
  let current = null;
  let busy = false;

  function escapeHtml(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function formatMessage(text) {
    let safe = escapeHtml(text);
    safe = safe.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");
    return safe;
  }

  function addMessage(role, text, animate) {
    const wrap = document.createElement("div");
    wrap.className = "msg " + (role === "me" ? "msg-me" : "msg-ai");
    wrap.innerHTML = `
      <span class="msg-avatar">${role === "me" ? "YOU" : "AI"}</span>
      <div class="bubble">${formatMessage(text)}</div>`;
    chatLog.appendChild(wrap);
    chatLog.scrollTop = chatLog.scrollHeight;
    return wrap;
  }

  function showTyping() {
    const wrap = document.createElement("div");
    wrap.className = "msg msg-ai";
    wrap.id = "typingRow";
    wrap.innerHTML = `
      <span class="msg-avatar">AI</span>
      <div class="bubble"><span class="typing"><i></i><i></i><i></i></span></div>`;
    chatLog.appendChild(wrap);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function hideTyping() {
    const el = $("#typingRow");
    if (el) el.remove();
  }

  function switchTab(name) {
    $$(".bp-tab").forEach((t) => {
      const on = t.dataset.bp === name;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
    });
    planView.classList.toggle("is-active", name === "plan");
    codeView.classList.toggle("is-active", name === "code");
    previewView.classList.toggle("is-active", name === "preview");
    if (name === "preview" && current && previewFrame.getAttribute("srcdoc") !== current.code) {
      previewFrame.setAttribute("srcdoc", current.code);
    }
  }

  function renderPlan(plan) {
    $("#bpTitle").textContent = plan.name;
    $("#bpSubtitle").textContent = plan.archetype.tagline;
    $("#codeFilename").textContent = plan.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".html";
    $("#previewUrl").textContent = "localhost/" + $("#codeFilename").textContent;

    planView.innerHTML = `
      <div class="plan">
        <div class="plan-top">
          <div class="plan-icon">${plan.archetype.icon}</div>
          <div>
            <h3>${escapeHtml(plan.name)}</h3>
            <p class="plan-sub">${escapeHtml(plan.tagline)}</p>
          </div>
        </div>

        <div class="plan-section">
          <h4>Core features</h4>
          <ul>${plan.features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>
        </div>

        <div class="plan-section">
          <h4>Screens</h4>
          <div class="screens">${plan.screens.map((s) => `<span class="screen-pill">${escapeHtml(s)}</span>`).join("")}</div>
        </div>

        <div class="plan-section">
          <h4>Stack</h4>
          <div class="stack-row">${plan.stack.map((s) => `<span class="stack-pill">${escapeHtml(s)}</span>`).join("")}</div>
        </div>

        <div class="plan-section">
          <h4>Data model</h4>
          <table class="data-table">
            <thead><tr><th>entity</th><th>fields</th></tr></thead>
            <tbody>${plan.data.map(([n, f]) => `<tr><td>${escapeHtml(n)}</td><td>${escapeHtml(f)}</td></tr>`).join("")}</tbody>
          </table>
        </div>

        <div class="plan-section">
          <h4>Build order</h4>
          <div class="steps">
            ${plan.steps.map(([title, body], i) => `
              <div class="step">
                <span class="step-num">${i + 1}</span>
                <p><b>${escapeHtml(title)}</b>${escapeHtml(body)}</p>
              </div>`).join("")}
          </div>
        </div>

        <div class="plan-actions">
          <button class="btn btn-lime btn-tiny" data-goto="code" type="button">View starter code</button>
          <button class="btn btn-ghost btn-tiny" data-goto="preview" type="button">Run it</button>
        </div>
      </div>`;

    planView.querySelectorAll("[data-goto]").forEach((b) => {
      b.addEventListener("click", () => switchTab(b.dataset.goto));
    });

    codeOutput.textContent = plan.code;
    previewFrame.setAttribute("srcdoc", plan.code);
    current = plan;

    // bring the blueprint into view on small screens
    if (window.innerWidth < 1080) {
      $("#blueprintPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function adviceFor(prompt) {
    const t = prompt.toLowerCase();
    if (/login|auth|sign.?in|account/.test(t)) {
      return "**Auth next steps**\n\n1. Add email + password fields and validate them.\n2. Store users server-side with hashed passwords — never in the browser.\n3. Keep a session token and protect any route that reads private data.\n\nFor a local prototype, fake a signed-in user first and wire real auth once the core loop feels good.";
    }
    if (/database|backend|api|save|persist|storage/.test(t)) {
      return "**Make it stick**\n\nStart with `localStorage` for prototypes — zero setup, survives refreshes. When you need multiple users, move to a small API (Node + SQLite or Supabase) and keep the same data shape so the UI barely changes.";
    }
    if (/deploy|ship|publish|host|online/.test(t)) {
      return "**Ship it**\n\nA static starter like this goes live on Netlify, Vercel or GitHub Pages by dropping the file in a repo. Add a small `index.html`, push, and connect the repo to the host — no server needed until you add a database.";
    }
    if (/monet|price|pay|subscription/.test(t)) {
      return "**Charging for it**\n\nGate one genuinely useful feature, not the whole app. Use a hosted checkout (Stripe Checkout is the least code) and verify payments on a server — never trust a client-side 'paid' flag.";
    }
    return null;
  }

  function respond(prompt) {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    if (busy) return;
    busy = true;
    addMessage("me", trimmed);
    input.value = "";
    autoGrow();
    showTyping();

    const delay = 520 + Math.min(trimmed.length * 8, 620);

    setTimeout(() => {
      hideTyping();
      const wordCount = trimmed.split(/\s+/).length;
      // only treat short, question-shaped messages as follow-ups on the current plan
      const isFollowUp = /\?|^(how|what|can|should|where|why|do i|does|is it|add|make it|next)\b/i.test(trimmed);
      const advice = current && wordCount <= 9 && isFollowUp ? adviceFor(trimmed) : null;
      if (advice) {
        addMessage("ai", advice);
        busy = false;
        return;
      }
      if (/^(hi|hey|hello|yo|sup|help)\b/i.test(trimmed) && trimmed.split(/\s+/).length <= 2) {
        addMessage(
          "ai",
          "Hey — I'm the Architect. Describe an app or a game in plain words and I'll return a blueprint: features, screens, stack, data model, build order, and runnable starter code.\n\nTry something like **a habit tracker** or **a 15-second arcade game**."
        );
        busy = false;
        return;
      }

      const plan = buildPlan(trimmed);
      renderPlan(plan);
      switchTab("plan");

      const stackNote = plan.mentions.length
        ? ` I kept your ${plan.mentions.join(" / ")} preference in the stack and used a vanilla reference build for the starter.`
        : "";
      const featureNote = /login|auth|account/.test(trimmed.toLowerCase())
        ? " Auth is listed as a follow-up — get the core loop right first."
        : "";

      addMessage(
        "ai",
        `Locked the blueprint for **${plan.name}** — ${plan.features.length} features, ${plan.screens.length} screens, and a working starter.${stackNote}${featureNote}\n\nThe **Plan** tab has the build order; **Code** has the full HTML file; **Preview** runs it right here. Want me to break down any step or add something like auth or saving?`
      );
      busy = false;
    }, delay);
  }

  function autoGrow() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 110) + "px";
  }

  function resetChat() {
    chatLog.innerHTML = "";
    current = null;
    previewFrame.removeAttribute("srcdoc");
    codeOutput.textContent = "";
    $("#bpTitle").textContent = "Blueprint";
    $("#bpSubtitle").textContent = "Ask the Architect to generate a plan";
    planView.innerHTML = `
      <div class="bp-placeholder">
        <div class="ghost-glyph" aria-hidden="true">
          <svg viewBox="0 0 48 48"><rect x="6" y="8" width="36" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 18h36M16 8v10M24 26h12M24 32h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </div>
        <p>Your app blueprint appears here — features, screens, data model and a build order you can follow.</p>
      </div>`;
    switchTab("plan");
    addMessage(
      "ai",
      "Fresh page. Tell me what you want to make — a game, a tool, a shop, anything — and I'll turn it into a buildable blueprint.\n\nTip: mention the audience or the one core action and the plan gets sharper."
    );
  }

  /* ---------- events ---------- */
  $("#composer").addEventListener("submit", (e) => {
    e.preventDefault();
    respond(input.value);
  });

  input.addEventListener("input", autoGrow);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      respond(input.value);
    }
  });

  $("#promptChips").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-prompt]");
    if (chip) respond(chip.dataset.prompt);
  });

  $$(".bp-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.bp));
  });

  $("#resetChat").addEventListener("click", resetChat);

  $("#copyCode").addEventListener("click", async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.code);
      if (window.PowerplayApp) window.PowerplayApp.toast("Starter code copied.");
    } catch (err) {
      // clipboard is blocked on file:// in some browsers — fall back to selection
      const range = document.createRange();
      range.selectNodeContents(codeOutput);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      if (window.PowerplayApp) window.PowerplayApp.toast("Select + copy the highlighted code.", "err");
    }
  });

  $("#downloadCode").addEventListener("click", () => {
    if (!current) return;
    const blob = new Blob([current.code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = $("#codeFilename").textContent;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (window.PowerplayApp) window.PowerplayApp.toast("Starter downloaded.");
  });

  $("#openPreviewTab").addEventListener("click", () => {
    if (!current) return;
    const blob = new Blob([current.code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      if (window.PowerplayApp) window.PowerplayApp.toast("Pop-up blocked — use the Download button instead.", "err");
    }
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  });

  /* ---------- edit an existing game ---------- */
  function editGame(game) {
    if (!game) return;
    const label = game.genre ? game.genre.toLowerCase() : "game";
    input.value = `Add a new feature to ${game.title} (${label}): `;
    autoGrow();
    const panel = document.getElementById("architect");
    if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => input.focus({ preventScroll: true }), 420);
    if (window.PowerplayApp) {
      window.PowerplayApp.toast(`${game.title} loaded — say what to change, then press Enter.`);
    }
  }

  window.PowerplayArchitect = { editGame };

  /* ---------- boot ---------- */
  addMessage(
    "ai",
    "Welcome to the Architect. Describe an app or game — one sentence is enough — and I'll hand back a blueprint plus runnable starter code.\n\nWhat are we building?"
  );
})();
