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
      id: "sports",
      match: ["sports", "sport", "football", "soccer", "basketball", "hockey", "tennis", "penalty", "goal", "kick", "tournament", "league", "team", "cup", "season", "classic match", "coach", "match"],
      icon: "◎",
      name: "Matchday",
      tagline: "A five-shot match: pick your corner and beat the keeper.",
      features: [
        "Space, click or tap to strike the ball where the marker sits",
        "The keeper drifts and speeds up after every shot",
        "Five shots, goals counted, a full-time screen with replay",
        "One canvas, no images, works with a mouse, a key or a thumb",
      ],
      screens: ["Kick-off", "Shots", "Full time"],
      stack: ["HTML", "Canvas 2D", "Vanilla JS", "requestAnimationFrame"],
      data: [["shots", "number"], ["goals", "number"], ["aim", "0–1 across the goal"], ["keeper", "0–1 across the goal"]],
      steps: [
        ["Draw the goal", "Two posts, a net grid and a keeper are enough to read as football."],
        ["Add the aim", "Sweep a marker across the mouth of the goal on a sine or ping-pong value."],
        ["Judge the shot", "Compare the aim with the keeper's position — inside the reach is a save."],
        ["End the match", "Five shots, a scoreline, and a replay button that resets everything."],
      ],
      html() {
        const script = `
var cv=document.getElementById("cv"),cx=cv.getContext("2d");
var goalsEl=document.getElementById("goals"),shotsEl=document.getElementById("shots");
var over=false,taken=false,raf=0,last=0,aim=.5,dir=1,keeper=.5,vel=.006,shots=5,goals=0,flash=0,msg="";
function reset(){shots=5;goals=0;over=false;taken=false;aim=.5;dir=1;keeper=.5;vel=.006;flash=0;msg="";
  goalsEl.textContent="0";shotsEl.textContent="5";document.getElementById("over").style.display="none"}
function shoot(){
  if(over||taken||shots<=0)return;
  taken=true;shots--;shotsEl.textContent=shots;
  if(Math.abs(aim-keeper)>.13){goals++;goalsEl.textContent=goals;msg="GOAL";}
  else{msg="SAVED";}
  flash=34;vel=(Math.random()<.5?-1:1)*(.005+Math.random()*.007);
  setTimeout(function(){
    taken=false;msg="";
    if(shots<=0){
      over=true;var o=document.getElementById("over");o.style.display="flex";
      o.innerHTML='<h2 style="margin:0 0 6px;font-size:26px">'+goals+' / 5</h2><p class="sub">Full time.</p><button class="btn" id="again">Play again</button>';
      document.getElementById("again").onclick=reset;
    }
  },700);
}
function step(t){
  var r=cv.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2);
  if(cv.width!==Math.round(r.width*d)||cv.height!==Math.round(r.height*d)){cv.width=Math.round(r.width*d);cv.height=Math.round(r.height*d);}
  cx.setTransform(d,0,0,d,0,0);
  var dt=Math.min((t-last)/16.7,3);last=t;
  var w=r.width,h=r.height;
  if(!over&&!taken){
    aim+=dir*.012*dt;if(aim>.88){aim=.88;dir=-1}if(aim<.12){aim=.12;dir=1}
    keeper+=vel*dt;if(keeper>.82){keeper=.82;vel=-Math.abs(vel)}if(keeper<.18){keeper=.18;vel=Math.abs(vel)}
  }
  if(flash>0)flash-=dt;
  for(var i=0;i<6;i++){cx.fillStyle=i%2?"#0e2116":"#0c1d13";cx.fillRect(0,i*h/6,w,h/6+1)}
  var gx=w*.1,gy=h*.1,gw=w*.8,gh=h*.42;
  cx.strokeStyle="#e9eef8";cx.lineWidth=Math.max(2,w*.006);cx.strokeRect(gx,gy,gw,gh);
  cx.globalAlpha=.22;cx.lineWidth=Math.max(1,w*.002);
  for(var j=1;j<6;j++){cx.beginPath();cx.moveTo(gx+j*gw/6,gy);cx.lineTo(gx+j*gw/6,gy+gh);cx.stroke()}
  for(var k=1;k<4;k++){cx.beginPath();cx.moveTo(gx,gy+k*gh/4);cx.lineTo(gx+gw,gy+k*gh/4);cx.stroke()}
  cx.globalAlpha=1;
  var kx=gx+keeper*gw,ky=gy+gh*.55;
  cx.fillStyle="#8a91a6";cx.fillRect(kx-w*.035,ky-gh*.28,w*.07,gh*.5);
  cx.beginPath();cx.arc(kx,ky-gh*.32,w*.022,0,7);cx.fill();
  if(!taken&&!over){
    var ax=gx+aim*gw;
    cx.fillStyle="#b8ff3d";cx.beginPath();cx.moveTo(ax,gy+gh+4);cx.lineTo(ax-w*.018,gy+gh+18);cx.lineTo(ax+w*.018,gy+gh+18);cx.closePath();cx.fill();
  }
  if(!taken){cx.fillStyle="#fff";cx.beginPath();cx.arc(w*.5,h*.84,w*.022,0,7);cx.fill()}
  if(msg){
    cx.fillStyle=msg==="GOAL"?"#b8ff3d":"#ff6b6b";
    cx.font="700 "+Math.round(w*.07)+"px Inter,system-ui,sans-serif";cx.textAlign="center";
    cx.fillText(msg,w/2,h*.75);cx.textAlign="start";
  }
  raf=requestAnimationFrame(step);
}
document.addEventListener("keydown",function(e){if(e.key===" "||e.key==="Enter"){e.preventDefault();shoot()}});
cv.addEventListener("click",shoot);
document.getElementById("start").onclick=function(){reset();last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(step)};
`;
        return page(
          "Matchday — sports match",
          "#b8ff3d",
          `.stage{position:relative;aspect-ratio:4/3;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.09);background:#07080d}
           canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:pointer}
           #over{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(6,7,11,.82);text-align:center;gap:6px}
           .hud{display:flex;gap:8px;margin-bottom:10px}
           .hud span{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#8a91a6;border:1px solid rgba(255,255,255,.12);border-radius:99px;padding:4px 10px}
           .hud b{color:#b8ff3d;margin-left:4px}`,
          `<h1>Matchday</h1><p class="sub">Tap or press space to strike where the marker sits.</p>
  <div class="hud"><span>goals<b id="goals">0</b></span><span>shots left<b id="shots">5</b></span></div>
  <div class="stage"><canvas id="cv"></canvas><div id="over"><button class="btn" id="start">Kick off</button></div></div>`,
          script
        );
      },
    },
    {
      id: "shooter",
      match: ["shooter", "shoot", "space", "alien", "enemy", "laser", "blaster", "invader"],
      icon: "▲",
      name: "Blaster",
      tagline: "A space shooter: move, fire, survive the wave.",
      features: [
        "Arrow keys or A/D to steer, space to fire",
        "Enemies fall in a wave and speed up as the score climbs",
        "Three lives and a game-over screen with restart",
        "Everything runs in one canvas, no assets needed",
      ],
      screens: ["Title", "Play", "Game over"],
      stack: ["HTML", "Canvas 2D", "Vanilla JS", "requestAnimationFrame"],
      data: [["player", "x, y, cooldown"], ["bullets", "x, y, vy"], ["enemies", "x, y, vy, hp"]],
      steps: [
        ["Draw the ship", "A triangle and a key handler is the whole player."],
        ["Add the weapon", "Spawn bullets on a cooldown, not every frame."],
        ["Send the wave", "Spawn enemies on a timer and move them down."],
        ["Make it fair", "Give three lives and a short invulnerable blink after a hit."],
      ],
      html() {
        const script = `
var cv=document.getElementById("cv"),cx=cv.getContext("2d");
var scoreEl=document.getElementById("score"),livesEl=document.getElementById("lives");
var keys={},player={x:180,y:300,cool:0},bullets=[],enemies=[],score=0,lives=3,over=false,raf=0,last=0,spawn=0;
function size(){var r=cv.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2);cv.width=r.width*d;cv.height=r.height*d;cx.setTransform(d,0,0,d,0,0);player.y=r.height-34;player.x=Math.min(player.x,r.width-26);return r}
function reset(){bullets=[];enemies=[];score=0;lives=3;over=false;spawn=0;player.x=cv.getBoundingClientRect().width/2;scoreEl.textContent="0";livesEl.textContent="3";document.getElementById("over").style.display="none"}
function step(t){
  var r=cv.getBoundingClientRect(),dt=Math.min((t-last)/16.7,3);last=t;
  if(!over){
    if((keys.ArrowLeft||keys.a))player.x-=5*dt;
    if((keys.ArrowRight||keys.d))player.x+=5*dt;
    player.x=Math.max(16,Math.min(r.width-16,player.x));
    player.cool-=dt;
    if((keys[" "]||keys.ArrowUp)&&player.cool<=0){bullets.push({x:player.x,y:player.y-16});player.cool=9}
    bullets.forEach(function(b){b.y-=8*dt});
    bullets=bullets.filter(function(b){return b.y>-10});
    spawn+=dt;
    if(spawn>55-Math.min(score*2,30)){spawn=0;enemies.push({x:20+Math.random()*(r.width-40),y:-16,vy:1.6+Math.random()*0.8+score*0.02,hp:1})}
    enemies.forEach(function(e){e.y+=e.vy*dt});
    enemies.forEach(function(e){
      bullets.forEach(function(b){
        if(e.hp>0&&Math.abs(b.x-e.x)<16&&Math.abs(b.y-e.y)<16){e.hp=0;b.y=-99;score++;scoreEl.textContent=score}
      });
    });
    enemies=enemies.filter(function(e){return e.hp>0&&e.y<r.height+30});
    enemies.forEach(function(e){
      if(Math.abs(e.x-player.x)<22&&Math.abs(e.y-player.y)<22){
        e.hp=0;lives--;livesEl.textContent=Math.max(lives,0);
        if(lives<=0){over=true;document.getElementById("over").style.display="flex";
          document.getElementById("over").innerHTML='<h2 style="margin:0 0 6px;font-size:26px">'+score+' down</h2><p class="sub">Wave over.</p><button class="btn" id="again">Play again</button>';
          document.getElementById("again").onclick=reset}
      }
    });
  }
  cx.clearRect(0,0,r.width,r.height);
  cx.fillStyle="#b8ff3d";cx.beginPath();cx.moveTo(player.x,player.y-14);cx.lineTo(player.x-11,player.y+10);cx.lineTo(player.x+11,player.y+10);cx.closePath();cx.fill();
  cx.fillStyle="#e8ffb0";bullets.forEach(function(b){cx.fillRect(b.x-2,b.y,4,10)});
  cx.fillStyle="#ff6b6b";enemies.forEach(function(e){cx.beginPath();cx.arc(e.x,e.y,11,0,7);cx.fill()});
  raf=requestAnimationFrame(step);
}
document.addEventListener("keydown",function(e){keys[e.key]=1;if(e.key===" "||e.key==="ArrowLeft"||e.key==="ArrowRight")e.preventDefault()});
document.addEventListener("keyup",function(e){keys[e.key]=0});
document.getElementById("start").onclick=function(){reset();last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(step)};
window.addEventListener("resize",function(){size()});
size();
`;
        return page(
          "Blaster — space shooter",
          "#b8ff3d",
          `.stage{position:relative;aspect-ratio:4/3;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.09);background:#07080d}
           canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
           #over{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(6,7,11,.8);text-align:center;gap:6px}
           .hud{display:flex;gap:8px;margin-bottom:10px}
           .hud span{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#8a91a6;border:1px solid rgba(255,255,255,.12);border-radius:99px;padding:4px 10px}
           .hud b{color:#b8ff3d;margin-left:4px}`,
          `<h1>Blaster</h1><p class="sub">Arrows to move, space to fire.</p>
  <div class="hud"><span>score<b id="score">0</b></span><span>lives<b id="lives">3</b></span></div>
  <div class="stage"><canvas id="cv"></canvas><div id="over"><button class="btn" id="start">Start wave</button></div></div>`,
          script
        );
      },
    },
    {
      id: "runner",
      match: ["runner", "run", "jump", "platformer", "jump button", "endless", "obstacle", "sprint"],
      icon: "➜",
      name: "Dashline",
      tagline: "An endless runner with one button: jump.",
      features: [
        "Tap, click or press space to jump — one input, readable timing",
        "Obstacles speed up the longer you survive",
        "Score counts distance, best run is kept for the session",
        "Touch friendly: the whole stage is the jump button",
      ],
      screens: ["Play", "Game over"],
      stack: ["HTML", "Canvas 2D", "Vanilla JS", "requestAnimationFrame"],
      data: [["player", "y, vy, grounded"], ["obstacles", "x, w, h"], ["speed", "grows with distance"]],
      steps: [
        ["One verb", "Jump is the only control — everything else is difficulty."],
        ["Ground and gravity", "A fixed gravity value makes jumps feel right."],
        ["Spawn obstacles", "Timed gaps, not random chaos."],
        ["Speed up slowly", "Raise speed with distance, cap it so it stays fair."],
      ],
      html() {
        const script = `
var cv=document.getElementById("cv"),cx=cv.getContext("2d");
var scoreEl=document.getElementById("score"),bestEl=document.getElementById("best");
var ground=0,py=0,vy=0,air=false,obs=[],speed=3.3,score=0,best=0,t=0,raf=0,dead=false,last=0;
function size(){var r=cv.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2);cv.width=r.width*d;cv.height=r.height*d;cx.setTransform(d,0,0,d,0,0);ground=r.height-38;if(py===0)py=ground;return r}
function jump(){if(dead){start();return}if(!air){vy=-9.2;air=true}}
function start(){dead=false;obs=[];speed=3.3;score=0;py=ground;vy=0;air=false;t=0;scoreEl.textContent="0";document.getElementById("over").style.display="none"}
function step(now){
  var r=cv.getBoundingClientRect(),dt=Math.min((now-last)/16.7,3);last=now;
  if(!dead){
    t+=dt*0.055;score=Math.floor(t*10);scoreEl.textContent=score;
    speed=Math.min(3.3+score*0.012,9);
    vy+=0.62*dt;py+=vy*dt;
    if(py>=ground){py=ground;vy=0;air=false}
    if(!obs.length||obs[obs.length-1].x<r.width-150){
      if(Math.random()<0.03)obs.push({x:r.width+10,w:16+Math.random()*16,h:20+Math.random()*22});
    }
    obs.forEach(function(o){o.x-=speed*dt});
    obs=obs.filter(function(o){return o.x>-60});
    obs.forEach(function(o){
      if(o.x<58&&o.x+o.w>30&&py+26>ground-o.h){dead=true;best=Math.max(best,score);bestEl.textContent=best;
        var ov=document.getElementById("over");ov.style.display="flex";
        ov.innerHTML='<h2 style="margin:0 0 4px;font-size:26px">'+score+' m</h2><p class="sub">Best '+best+' m</p><button class="btn" id="again">Run again</button>';
        document.getElementById("again").onclick=start}
    });
  }
  cx.clearRect(0,0,r.width,r.height);
  cx.strokeStyle="rgba(255,255,255,.12)";cx.beginPath();cx.moveTo(0,ground+26);cx.lineTo(r.width,ground+26);cx.stroke();
  cx.fillStyle="#b8ff3d";cx.fillRect(34,py-6,24,30);
  cx.fillStyle="#ff6b6b";obs.forEach(function(o){cx.fillRect(o.x,ground+26-o.h,o.w,o.h)});
  raf=requestAnimationFrame(step);
}
cv.onpointerdown=function(e){e.preventDefault();jump()};
document.addEventListener("keydown",function(e){if(e.key===" "||e.key==="ArrowUp"){e.preventDefault();jump()}});
window.addEventListener("resize",size);
size();last=performance.now();raf=requestAnimationFrame(step);
`;
        return page(
          "Dashline — endless runner",
          "#b8ff3d",
          `.stage{position:relative;aspect-ratio:4/3;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.09);background:#07080d;touch-action:none}
           canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:pointer}
           #over{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;background:rgba(6,7,11,.78);text-align:center}
           .hud{display:flex;gap:8px;margin-bottom:10px}
           .hud span{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#8a91a6;border:1px solid rgba(255,255,255,.12);border-radius:99px;padding:4px 10px}
           .hud b{color:#b8ff3d;margin-left:4px}`,
          `<h1>Dashline</h1><p class="sub">Tap the stage to jump. Don't stop.</p>
  <div class="hud"><span>distance<b id="score">0</b></span><span>best<b id="best">0</b></span></div>
  <div class="stage"><canvas id="cv"></canvas><div id="over"></div></div>`,
          script
        );
      },
    },
    {
      id: "memory",
      match: ["memory", "memory match", "pairs", "cards", "flip", "concentration", "matching"],
      icon: "▣",
      name: "Pairup",
      tagline: "A memory game: flip two cards, find the pairs.",
      features: [
        "A shuffled 4×4 board rebuilt on every new game",
        "Two-card turns with a short reveal before flipping back",
        "Move counter and a win state that shows your score",
        "Keyboard reachable buttons, no drag needed",
      ],
      screens: ["Board", "Win"],
      stack: ["HTML", "CSS grid", "Vanilla JS"],
      data: [["deck", "symbol, matched"], ["open", "two indexes"], ["moves", "number"]],
      steps: [
        ["Shuffle", "Duplicate the symbols, then sort randomly."],
        ["Flip two", "Lock the board while a pair is showing."],
        ["Match or flip back", "Compare symbols, then hide both after a beat."],
        ["Count moves", "Fewer moves is the score."],
      ],
      html() {
        const script = `
var board=document.getElementById("board"),movesEl=document.getElementById("moves"),msg=document.getElementById("msg");
var syms=["◆","●","▲","■","✦","✚","◈","◐"],deck=[],open=[],moves=0,lock=false,found=0;
function build(){
  deck=syms.concat(syms).sort(function(){return Math.random()-0.5}).map(function(s){return {s:s,up:false,done:false}});
  open=[];moves=0;found=0;lock=false;movesEl.textContent="0";msg.textContent="Find all 8 pairs.";
  board.innerHTML="";
  deck.forEach(function(c,i){
    var b=document.createElement("button");
    b.className="card";b.type="button";b.dataset.i=i;
    b.addEventListener("click",function(){flip(i,b)});
    board.appendChild(b);
  });
}
function flip(i,b){
  if(lock||deck[i].done||deck[i].up)return;
  deck[i].up=true;b.textContent=deck[i].s;b.classList.add("up");
  open.push(i);
  if(open.length===2){
    moves++;movesEl.textContent=moves;
    var a=deck[open[0]],c=deck[open[1]];
    if(a.s===c.s){
      a.done=c.done=true;found++;
      b.classList.add("done");
      var prev=board.querySelector('[data-i="'+open[0]+'"]');if(prev)prev.classList.add("done");
      open=[];
      if(found===8){msg.textContent="Solved in "+moves+" moves."}
      return;
    }
    lock=true;
    setTimeout(function(){
      open.forEach(function(k){deck[k].up=false;var el=board.querySelector('[data-i="'+k+'"]');if(el){el.textContent="";el.classList.remove("up")}});
      open=[];lock=false;
    },650);
  }
}
document.getElementById("new").onclick=build;
build();
`;
        return page(
          "Pairup — memory match",
          "#b8ff3d",
          `#board{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:6px}
           .card{aspect-ratio:1;border-radius:11px;border:1px solid rgba(255,255,255,.12);background:#12161f;color:#0a0b10;font-size:22px;cursor:pointer;transition:.15s}
           .card.up{background:#b8ff3d;color:#0a0b10}
           .card.done{background:#2a3520;color:#b8ff3d;border-color:rgba(184,255,61,.4);cursor:default}
           .bar{display:flex;align-items:center;gap:10px;margin-bottom:12px;font-size:12px;color:#8a91a6}
           .bar b{color:#eef1f6}`,
          `<h1>Pairup</h1><p class="sub">Flip two, keep the pair.</p>
  <div class="bar"><span>moves <b id="moves">0</b></span><span id="msg">Find all 8 pairs.</span>
    <button class="btn" id="new" style="margin-left:auto">New game</button></div>
  <div id="board"></div>`,
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

  function buildPlan(prompt, forcedId) {
    const archetype = (forcedId && ARCHETYPES.find((a) => a.id === forcedId)) || detect(prompt);
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
      name: customName || (archetype.titleFor ? archetype.titleFor(prompt) : archetype.name),
      tagline: customName ? `Your take on ${archetype.tagline.toLowerCase()}` : archetype.tagline,
      features,
      screens: archetype.screens,
      stack,
      data: archetype.data,
      steps: archetype.steps,
      code: archetype.html(prompt),
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
  let editingGame = null;
  const saveBtn = $("#saveToGame");
  const saveNewBtn = $("#saveAsNew");

  function setEditingGame(game) {
    editingGame = game || null;
    if (saveBtn) {
      saveBtn.hidden = !editingGame;
      if (editingGame) {
        saveBtn.textContent = `Save to ${editingGame.title}`;
        saveBtn.title = `Replace ${editingGame.title}'s playable build with the code below`;
      }
    }
  }

  // A prompt that names a game type gets that build; otherwise the arcade loop.
  function pickGameArchetype(prompt) {
    const a = detect(prompt);
    return a && ["shooter", "runner", "memory", "sports", "quiz"].includes(a.id) ? a : null;
  }

  // Editing keeps the game's own shape: a sports game stays a sports game.
  const GENRE_ARCHETYPE = { sports: "sports", puzzle: "memory", arcade: "game", sandbox: "game", prototypes: "game" };
  function genreArchetype(game) {
    const genre = String((game && game.genre) || "").toLowerCase();
    const id = GENRE_ARCHETYPE[genre] || "game";
    return ARCHETYPES.find((a) => a.id === id) || ARCHETYPES[0];
  }

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
    if (editingGame && saveBtn) saveBtn.textContent = `Save to ${editingGame.title}`;
    if (saveNewBtn) saveNewBtn.hidden = false;

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

      // Editing a library game always yields a playable game build, never a tracker or timer.
      const gameArchetype = editingGame ? pickGameArchetype(trimmed) || genreArchetype(editingGame) : null;
      const plan = buildPlan(trimmed, gameArchetype ? gameArchetype.id : null);
      if (editingGame) {
        const title = escapeHtml(editingGame.title);
        plan.name = editingGame.title;
        plan.code = plan.code
          .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
          .replace(/<h1([^>]*)>[^<]*<\/h1>/, `<h1$1>${title}</h1>`)
          .replace(/var TOPIC = "[^"]*";/, `var TOPIC = ${JSON.stringify(editingGame.title)};`);
      }
      renderPlan(plan);
      // Games land on the code tab, where Save to game / Save as new game live.
      const isGamePlan = ["game", "shooter", "runner", "memory", "sports", "quiz"].includes(plan.archetype.id);
      switchTab(editingGame || isGamePlan ? "code" : "plan");

      const stackNote = plan.mentions.length
        ? ` I kept your ${plan.mentions.join(" / ")} preference in the stack and used a vanilla reference build for the starter.`
        : "";
      const featureNote = /login|auth|account/.test(trimmed.toLowerCase())
        ? " Auth is listed as a follow-up — get the core loop right first."
        : "";
      let quizNote = "";
      if (plan.archetype.id === "quiz") {
        const askingMath = /math|maths|arithmetic|addition|subtraction|multiplication|division|times table|plus|minus|fraction/.test(trimmed.toLowerCase());
        const written = (trimmed.match(/[^?=;\n]{3,90}\?\s*=\s*[^;=\n]{1,60}/g) || []).length;
        quizNote = askingMath
          ? "\n\nIt really is a math quiz: ten arithmetic questions are generated on the spot (the numbers get bigger from question 7), four choices each, instant right/wrong feedback, a score and a replay. Nothing in it is filler."
          : written
            ? `\n\nI put your ${written} question${written === 1 ? "" : "s"} into the deck exactly as you wrote ${written === 1 ? "it" : "them"} and generated the wrong choices around ${written === 1 ? "it" : "them"}.`
            : "\n\nThe engine is built, but your message did not include the actual questions, and I will not invent facts for you. Type them into **Add a question** on the page, or write them in the prompt as `Capital of France? = Paris` and they go straight into the deck.";
      }

      addMessage(
        "ai",
        editingGame
          ? `Here is a **${plan.archetype.name}** build for **${plan.name}** — ${plan.archetype.tagline.toLowerCase()}

It is a ${plan.archetype.name} build because ${detect(trimmed) === GENERIC ? `${plan.name} is a ${editingGame.genre} game and your wording did not name a game shape I know` : `your wording asked for that shape`}; if you meant a different shape, name it (“a space shooter”, “an endless runner”, “a memory game”, “a sports match”).\n\nBe clear about what this is: it is a fresh, self-contained game in the same shape, not a patch of your original ${plan.name} file — the Architect has no model behind it, so it cannot rewrite your Three.js code. **Save as new game** keeps ${plan.name} untouched; **Save to ${plan.name}** swaps its playable build for this one, and *Restore original* puts the shipped version back.`
          : `Locked the blueprint for **${plan.name}** — ${plan.features.length} features, ${plan.screens.length} screens, and a working starter.${stackNote}${featureNote}${quizNote}\n\nThe **Plan** tab has the build order; **Code** has the full HTML file; **Preview** runs it right here. Want me to break down any step or add something like auth or saving?`
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
    setEditingGame(null);
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

  $("#resetChat").addEventListener("click", () => {
    window.PowerplayApp.openModal("reset");
  });

  $("#confirmReset").addEventListener("click", () => {
    window.PowerplayApp.closeModal("reset");
    resetChat();
  });

  saveBtn.addEventListener("click", () => {
    if (!editingGame) return;
    if (!current || !current.code) {
      if (window.PowerplayApp) window.PowerplayApp.toast("Nothing to save yet — ask for a change first.", "err");
      return;
    }
    const game = window.PowerplayApp && window.PowerplayApp.applyBuild
      ? window.PowerplayApp.applyBuild(editingGame.id, current.code)
      : null;
    if (game) {
      saveBtn.textContent = `Saved to ${game.title}`;
      const link = new URL(window.PowerplayApp.playLink(game), location.href).href;
      addMessage(
        "ai",
        `Saved — **${game.title}** now plays from this build.\n\nPlay link: \`${link}\`\n\nThe card for ${game.title} has the same link with a Copy button; *Restore original* on the game puts the shipped version back.`
      );
    }
    else if (window.PowerplayApp) window.PowerplayApp.toast("That game is no longer in the library.", "err");
  });

  if (saveNewBtn) saveNewBtn.addEventListener("click", () => {
    if (!current || !current.code) {
      if (window.PowerplayApp) window.PowerplayApp.toast("Nothing to save yet — ask for a change first.", "err");
      return;
    }
    const base = current.name || (editingGame && editingGame.title) || "New game";
    let title = base;
    if (window.PowerplayApp && window.PowerplayApp.getGames) {
      const taken = window.PowerplayApp.getGames().some((g) => g.title.toLowerCase() === title.toLowerCase());
      if (taken) title = `${base} (remix)`;
    }
    const game = window.PowerplayApp && window.PowerplayApp.addBuildGame
      ? window.PowerplayApp.addBuildGame({
          title,
          code: current.code,
          pitch: current.tagline,
          genre: current.archetype ? current.archetype.name : "Arcade",
        })
      : null;
    if (game) {
      saveNewBtn.textContent = `Added “${game.title}”`;
      const link = new URL(window.PowerplayApp.playLink(game), location.href).href;
      addMessage(
        "ai",
        `**${game.title}** is in the library with its own play link:\n\n\`${link}\`\n\nOpen it in a new tab, or copy it from the card with the Copy button.`
      );
    }
  });

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
    setEditingGame(game);
    const label = game.genre ? game.genre.toLowerCase() : "arcade";
    input.value = `Add a new feature to ${game.title}, a ${label} game: `;
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
