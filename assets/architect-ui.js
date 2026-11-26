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
  let restoring = false;
  let editingGame = null;
  let convo = [];
  const saveBtn = $("#saveToGame");
  const saveNewBtn = $("#saveAsNew");
  const codePre = codeOutput ? codeOutput.closest("pre") : null;
  const codeEditor = $("#codeEditor");
  const pythonOutput = $("#pythonOutput");

  function setEditingGame(game) {
    editingGame = game || null;
    if (saveBtn) {
      saveBtn.hidden = !editingGame;
      if (editingGame) {
        saveBtn.textContent = `Save to ${editingGame.title}`;
        saveBtn.title = `Replace ${editingGame.title}'s playable build with the code below`;
      }
    }
    // Workers work inside assigned games; they never add one to the library.
    if (saveNewBtn) saveNewBtn.hidden = !!workerSession();
  }

  // The signed-in worker, or null for admins and signed-out pages.
  function workerSession() {
    const A = window.PowerplayAccounts;
    const me = A && A.current ? A.current() : null;
    return me && me.role === "worker" ? me : null;
  }

  // Returns a refusal message when a worker may not build this, otherwise "".
  function workerBlock(game) {
    const me = workerSession();
    if (!me) return "";
    if (game) {
      const mine = (me.assigned || []).includes(game.id);
      return mine
        ? ""
        : `**${game.title} is not assigned to you**, so I can't change it. Your admin decides who works on what — open one of the games on your home screen and press **Edit with AI**.`;
    }
    return newGameRefusal();
  }

  // The full answer once, the short one after that: a worker is never told the
  // same paragraph twice in a row.
  let newGameRefusals = 0;
  function newGameRefusal() {
    newGameRefusals += 1;
    if (newGameRefusals > 1) {
      return "Adding a game to the library is the one thing I can't do here — your admin adds it and assigns it to you. Anything else, ask away.";
    }
    return "Workers can't create new games — your admin creates them and assigns them to you.\n\nOpen a game that is assigned to you (they're on your home screen) and press **Edit with AI**: I'll rebuild that game's playable version from your words. You can always ask me how something works.";
  }

  // A worker's message that asks for a game the library does not have yet. Only
  // that is refused: everything else they ask is answered and acted on.
  function wantsNewGame(text) {
    const t = String(text || "").trim();
    if (!t || isQuestion(t) || namedGame(t)) return false;
    return isBuildAsk(t) ||
      /\b(?:i (?:want|need)|give me|make|build|create|add|generate|design|start)\b[\s\S]{0,40}\b(?:game|games|app|apps|site|website|quiz|tool|page|player|level)\b/i.test(t);
  }

  // A worker asking why they cannot add games gets the reason, not the refusal.
  let workerWhySaid = false;
  function workerWhy(text) {
    if (!workerSession()) return "";
    const l = String(text || "").toLowerCase();
    if (!/\b(why|how come|what'?s the reason)\b/.test(l)) return "";
    const aboutGames = /\b(games?|apps?)\b/.test(l) &&
      /\b(make|makes|making|create|creates|creating|build|builds|building|add|adds|adding|design|start)\b/.test(l);
    const aboutBlock = /\b(can'?t|cannot|can not|not allowed|not able|unable|blocked|forbidden)\b/.test(l);
    if (!aboutGames || !aboutBlock) return "";
    if (workerWhySaid) {
      return "Short version: the library is your admin's, so they add games and hand them out — everything else is open to me. Open a game assigned to you and press **Edit with AI**, or ask your admin to add this one and assign it to you.";
    }
    workerWhySaid = true;
    return "Because the library is your admin's catalogue, not a shared folder: every game on it appears on everyone's home screen and is assigned to particular people, so one place has to decide what exists and who works on what. If every worker's AI could add games, the library would fill with near-duplicates and nobody could tell what was being tested.\n\n" +
      "So the split is: **your admin** adds a game and assigns it; **you and I** build inside the games assigned to you — open one on your home screen, press **Edit with AI**, and I'll rebuild or extend its playable version.\n\n" +
      "Want this one in the library? Ask your admin to add it and assign it to you. They can also make you an admin, and then you can add games yourself.";
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
    if (!restoring && window.PowerplayChats) {
      window.PowerplayChats.record(role === "me" ? "me" : "ai", text);
    }
    if (!restoring) {
      convo.push({ role: role === "me" ? "user" : "assistant", content: text });
      if (convo.length > 12) convo = convo.slice(-12);
    }
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

  /* "Show me the preview" is an order, so it runs the build instead of describing it. */
  function runPreview() {
    if (!current) return false;
    if (editingCode && codeEditor) current.code = codeEditor.value;
    current.code = current.code || "";
    codeOutput.textContent = current.code;
    previewFrame.setAttribute("srcdoc", "");
    switchTab("preview");
    // A fresh srcdoc means a fresh run, so asking again restarts the app or game.
    setTimeout(() => previewFrame.setAttribute("srcdoc", current.code), 30);
    const panel = $("#blueprintPanel");
    if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
    if (window.PowerplayApp) window.PowerplayApp.toast("Preview running.", "ok");
    return true;
  }

  function renderPlan(plan, silent) {
    $("#bpTitle").textContent = plan.name;
    $("#bpSubtitle").textContent = plan.archetype.tagline;
    $("#codeFilename").textContent = plan.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".html";
    $("#previewUrl").textContent = "localhost/" + $("#codeFilename").textContent;

    const parts = [];
    parts.push(`
      <div class="plan">
        <div class="plan-top">
          <div class="plan-icon">${plan.archetype.icon}</div>
          <div>
            <h3>${escapeHtml(plan.name)}</h3>
            <p class="plan-sub">${escapeHtml(plan.tagline)}</p>
          </div>
        </div>`);

    if (plan.summary) {
      parts.push(`<div class="plan-section plan-summary">${formatMessage(plan.summary)}</div>`);
    }
    if (plan.features && plan.features.length) {
      parts.push(`
        <div class="plan-section">
          <h4>Core features</h4>
          <ul>${plan.features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>
        </div>`);
    }
    if (plan.screens && plan.screens.length) {
      parts.push(`
        <div class="plan-section">
          <h4>Screens</h4>
          <div class="screens">${plan.screens.map((x) => `<span class="screen-pill">${escapeHtml(x)}</span>`).join("")}</div>
        </div>`);
    }
    if (plan.stack && plan.stack.length) {
      parts.push(`
        <div class="plan-section">
          <h4>Stack</h4>
          <div class="stack-row">${plan.stack.map((x) => `<span class="stack-pill">${escapeHtml(x)}</span>`).join("")}</div>
        </div>`);
    }
    if (plan.data && plan.data.length) {
      parts.push(`
        <div class="plan-section">
          <h4>Data model</h4>
          <table class="data-table">
            <thead><tr><th>entity</th><th>fields</th></tr></thead>
            <tbody>${plan.data.map(([n, f]) => `<tr><td>${escapeHtml(n)}</td><td>${escapeHtml(f)}</td></tr>`).join("")}</tbody>
          </table>
        </div>`);
    }
    if (plan.steps && plan.steps.length) {
      parts.push(`
        <div class="plan-section">
          <h4>Build order</h4>
          <div class="steps">
            ${plan.steps.map(([title, body], i) => `
              <div class="step">
                <span class="step-num">${i + 1}</span>
                <p><b>${escapeHtml(title)}</b>${escapeHtml(body)}</p>
              </div>`).join("")}
          </div>
        </div>`);
    }

    if (plan.code) {
      parts.push(`
        <div class="plan-actions">
          <button class="btn btn-lime btn-tiny" data-goto="code" type="button">View the code</button>
          <button class="btn btn-ghost btn-tiny" data-goto="preview" type="button">Run it</button>
        </div>`);
    }

    parts.push(`</div>`);
    planView.innerHTML = parts.join("");

    planView.querySelectorAll("[data-goto]").forEach((b) => {
      b.addEventListener("click", () => switchTab(b.dataset.goto));
    });

    codeOutput.textContent = plan.code;
    if (codeEditor) codeEditor.value = plan.code || "";
    setEditingCode(false);
    setCodeLang("html");
    renderPython(plan);
    previewFrame.setAttribute("srcdoc", plan.code);
    current = plan;
    if (editingGame && saveBtn) saveBtn.textContent = `Save to ${editingGame.title}`;
    if (saveNewBtn) saveNewBtn.hidden = !!workerSession();
    if (!silent && window.PowerplayChats) window.PowerplayChats.setPlan(plan);

    // bring the blueprint into view on small screens
    if (!silent && window.innerWidth < 1080) {
      $("#blueprintPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /* ---------- explanations: answer questions instead of building ---------- */

  // "make me a quiz?" is an order, "what is a quiz?" is a question.
  const QUESTION_START = /^(what|whats|what's|why|how|when|where|which|who|whose|does|do|did|is|are|was|were|can|could|should|would|will)\b/i;

  function isQuestion(text) {
    const t = String(text || "").trim();
    const l = t.toLowerCase();
    if (!l) return false;
    if (/^(explain|describe|tell me (about|how|why)|what does|what is|what's|why|how come)\b/.test(l)) return true;
    // an order dressed as a question still gets built
    if (/\b(can|could|will|would) you\b[^?]*\b(make|build|create|add|change|fix|generate|remake|rewrite|replace|turn)\b/.test(l)) return false;
    if (/^(make|build|create|add|change|rewrite|replace|turn|generate|design|remake|remove|delete)\b/.test(l)) return false;
    return /\?\s*$/.test(t) || QUESTION_START.test(l);
  }

  function libraryList() {
    const shipped = (window.PowerplayGames && window.PowerplayGames.GAMES) || [];
    const local = (window.PowerplayApp && window.PowerplayApp.getGames && window.PowerplayApp.getGames()) || [];
    const seen = {};
    return shipped.concat(local).filter((g) => {
      if (!g || !g.id || seen[g.id]) return false;
      seen[g.id] = true;
      return true;
    });
  }

  function explainPlan() {
    const p = current;
    const lines = [
      `**${p.name}** — the build in front of you`,
      "",
      `It is a **${p.archetype.name}** build: ${p.archetype.tagline}`,
      "",
      `**Screens:** ${p.screens.join(" → ")}`,
      `**What it does:** ${p.features.slice(0, 3).join("; ")}`,
      `**Stack:** ${p.stack.join(", ")}`,
      "",
      "Where the code lives: the **Code** tab is one self-contained HTML file — a style block for the look, the markup for each screen, and a script block holding the state variables plus the few functions that drive them. Nothing is fetched from a network, so that single file runs anywhere. The **Preview** tab runs that same file inside a sandboxed frame, and the **Plan** tab is the build order you would follow to write it yourself.",
      "",
      "To change it, describe the change: “make the timer 30 seconds”, “add a start screen”, “two players”. I rebuild the file from your words — I never patch the old one line by line.",
    ];
    return lines.join("\n");
  }

  const EXPLANATIONS = [
    {
      test: /(what are you|which ai|what ai|real ai|an? language model|chatgpt|openai|how do you work|how are you built|your model|api key|do you think)/,
      say: () =>
        "Straight answer: I'm the **Architect** in POWERPLAY Workshop — a planner made of templates, not a language model. I read your words for keywords and numbers, choose a shape I already carry (Hitgrid, Blaster, Dashline, Pairup, Matchday, Quizdeck, Streakline, and the app shapes), then print a blueprint plus a runnable starter file.\n\nNothing is sent to a server and there is no API key, which is why I answer instantly and work offline — and also why I can't invent a game I have no template for, rewrite your three.js code, or answer general knowledge questions. I explain the workshop's own building blocks well because that knowledge is written into me.\n\nIf you want a general-purpose model in here, its key has to live server-side (a tiny proxy in `start.py`), never in the page.",
    },
    {
      test: /(this|that|the build|the plan|the blueprint|the code|your code|you made|you built|why did you|which shape|the tab|the preview|the step)/,
      say: () => (current ? explainPlan() : null),
    },
    {
      test: /(game loop|requestanimationframe|animation frame|60 fps|frame rate|tick)/,
      say: () =>
        "Every game is the same three-beat heartbeat: **read input → update the world → draw it**. On the web the heartbeat is `requestAnimationFrame(step)`, which asks the browser to call your function just before the next repaint — about 60 times a second on a normal screen, slower on a busy phone.\n\n```\nfunction step(now) {\n  const dt = (now - last) / 1000;  // seconds since last frame\n  last = now;\n  update(dt);                      // move things by dt\n  draw();                          // clear + redraw everything\n  requestAnimationFrame(step);\n}\nrequestAnimationFrame(step);\n```\n\nMove things by the clock (`performance.now()`), never by “one step per frame”, or a slow machine makes the game slow. `setInterval(fn, 16)` is the wrong tool: it drifts and keeps running in a hidden tab, while animation frames politely pause.",
    },
    {
      test: /(canvas|getcontext|draw|render)/,
      say: () =>
        "A **canvas** is a blank rectangle the page gives you to paint on with JavaScript. You don't add elements to it — you call drawing commands:\n\n`const ctx = canvas.getContext(\"2d\"); ctx.fillStyle = \"#b8ff3d\"; ctx.fillRect(x, y, 30, 30);`\n\nCoordinates start at the top-left corner: `x` grows right, `y` grows down. Nothing stays on it — each frame you clear it (`clearRect`) and draw everything again, which is why a game redraws 60 times a second.\n\nAlso: a canvas is pixels, not DOM. You can't click a drawn button, style it with CSS, or select its text; and if its CSS size and its `width`/`height` attributes disagree, everything looks blurry.",
    },
    {
      test: /(collision|collide|hit|overlap|touch the wall)/,
      say: () =>
        "Two rectangles overlap when they overlap on **both** axes:\n\n`a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y`\n\nCircles are cheaper: the distance between centres is less than the sum of the radii. Run the check right after you move everything and before you draw, and move in small steps (or check the path) so a fast object can't jump straight through a wall between frames.",
    },
    {
      test: /(score|points|high score|restart|reset the game|game over)/,
      say: () =>
        "A score is just a variable: `let score = 0`. The number on screen is a **separate** thing you update whenever the variable changes — `scoreEl.textContent = score`. Nothing is automatic; forget the second step and the score moves in memory while the screen stands still.\n\nA restart is the same idea in reverse: set the score back to 0, empty the arrays, put the player back at the start, then re-render once. Keep all of a game's changing values in one `state` object so “restart” is `state = freshState()` instead of ten scattered lines.",
    },
    {
      test: /(keyboard|keypress|arrow keys|controls|tap|touch|mouse|pointer)/,
      say: () =>
        "Keyboard: listen for `keydown` and `keyup` on `window`, remember which keys are held in an object, and read that object in your update step. Holding a key then gives smooth movement instead of one jump per repeat press.\n\nPhones have no keyboard, so add on-screen buttons or pointer events: `pointerdown` / `pointerup` on a button, `pointermove` on the canvas if you need drag or aim. Make targets at least 44px, and call `preventDefault()` on arrow keys and space so the page doesn't scroll while someone plays.",
    },
    {
      test: /(localstorage|storage|save|persist|survive|database|backend|autosave)/,
      say: () =>
        "`localStorage` is a small text store that belongs to **one browser on one device**: around 5 MB, survives reloads and quitting, gone if the person clears site data or switches browser. You can only store strings, so `JSON.stringify` on the way in and `JSON.parse` on the way out. That's exactly what this workshop uses for games, accounts, assignments and chats — it is why everything is still there when you come back.\n\nIt is not shared between people and it is not private: anyone using that browser can read it. Real accounts and shared data need a server with a database, and passwords hashed there — never in the page.",
    },
    {
      test: /(login|auth|sign.?in|account|password|passcode|admin|worker|role|permission)/,
      say: () =>
        "In this workshop, login is a **screen, not security**: the accounts live in `localStorage` and the checking happens in the browser, so a technical person could read or edit them. For a private workshop on your own machine that's a fair trade — and the site hides the shell (`inert`) until someone signs in, so nothing behind the gate can be clicked by accident.\n\nTo make it real: send username + passcode to a server, store only a hash (`bcrypt`/`argon2`), return a session cookie, and check permissions **on the server** for every request. Roles (admin vs worker) must be enforced there too — a browser-side check is a hint, never a lock.",
    },
    {
      test: /(install|manifest|pwa|home screen|icon|standalone|app mode)/,
      say: () =>
        "The app installs because of `app.webmanifest`: a name, theme colours, icons and `display: \"standalone\"`, which tells the browser to open it without an address bar. Browsers only offer installation over **https or localhost**, which is why it works at `http://localhost:…` and not from a file you double-click.\n\nChrome/Edge show an install button in the address bar (the workshop's **Install app** button triggers the same prompt); on iPhone use Share → **Add to Home Screen**. The icons are real PNGs in `assets/icons/`, drawn in the lime/dark palette; one is full-bleed for Android's maskable icon slot.\n\nNext step if you want true offline use: a service worker that caches the files after the first visit.",
    },
    {
      test: /(deploy|host|publish|online|domain|netlify|vercel|github pages|public url|share)/,
      say: () =>
        "POWERPLAY Workshop is plain static files — `index.html`, `app.html`, `assets/`, `games/` — so any static host will serve it: GitHub Pages (repo → Settings → Pages), Netlify or Vercel (drag the folder in). No build step and no npm.\n\nThe catch is that everything in those files is public: the login gate is a screen, not protection, so don't put anything private in them. And the address you see in this workspace (`http://127.0.0.1:4173`) only exists inside this machine — nobody else can open it. To give someone a real link, the folder has to go to a host, or the site has to be published from here as a shareable page.",
    },
    {
      test: /(three\.?js|3d|webgl|your games are 3d|scene|camera|mesh)/,
      say: () =>
        "Your older games (Ballistic, ProKick and friends) use **three.js**: a scene, a camera, lights and meshes, drawn by WebGL. The starters I write are 2D canvas, one file, no libraries — deliberately, so they run anywhere with no setup and no network.\n\nBecause I have no model reading your code, I can't patch a three.js scene: when you ask me to edit one of those games I rebuild it in a shape I already know and save that as its playable build, leaving the original files in `games/<name>/` untouched. Real three.js changes mean editing those files by hand, or connecting a real model to the Architect.",
    },
    {
      test: /(quiz|question|answer|wrong choice|multiple choice|trivia)/,
      say: () =>
        "A quiz build has three moving parts. **The generator** (`mathQuestion`) makes a question and its answer — arithmetic for a math quiz, or your own `Question? = Answer` lines for anything else. **The distractor maker** (`wrongOnes`) invents the three wrong choices: for numbers, nearby values; for words, the other answers plus safe fillers.\n\n**The render step** shows one question at a time: buttons come from the shuffled choices, a click locks the buttons, marks right/wrong and adds to `score`, then **Next** advances the index. After the last question the card shows `You scored 7 out of 10` and a replay that rebuilds the deck.\n\nSo a math quiz genuinely computes, while a quiz about a subject uses the facts **you** give it — I won't invent them.",
    },
    {
      test: /(timer|countdown|seconds|time limit|clock)/,
      say: () =>
        "For a countdown, trust the clock rather than a counter: store `endAt = performance.now() + 30000`, then every frame show `Math.max(0, endAt - performance.now())`. A counter that subtracts 1 per frame runs fast on a 144 Hz screen and slow on a busy phone, so two players never get the same 30 seconds.\n\nFor “time played” in the library the workshop just adds a minute each time you press Play — honest enough for a personal workshop, and easy to replace with real elapsed time later.",
    },
    {
      test: /(mobile|phone|responsive|viewport|screen size|small screen)/,
      say: () =>
        "Three things make a page work on a phone. The `<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">` tag, so the page uses the real device width instead of pretending to be 980px wide. Flexible sizing — `max-width: 100%`, `flex-wrap`, no fixed pixel widths for big blocks. And touch-sized controls: at least 44px, spaced so a thumb doesn't hit two at once.\n\nA canvas needs its CSS size and its backing `width`/`height` to match, or it looks blurry; and media queries are where layout changes (the workshop switches the workers panel and top bar to stacked layouts under 860px and 560px).",
    },
    {
      test: /(bug|broken|error|not working|debug|console|crash|lag|slow)/,
      say: () =>
        "When something breaks: open devtools (F12) → **Console** and read the **first** red line, not the last — later errors are usually fallout. Then put a `console.log` of the values just before the line that fails, and shrink the case until it's tiny.\n\nFor a game that feels laggy, the usual suspects in order: redrawing the whole canvas for things that don't change, work inside the animation frame that could run once (loading images, building arrays), too many objects, and shadows or filters on a phone. Check with the Performance tab: if a frame takes more than 16 ms, something is too heavy.",
    },
    {
      test: /(react|next\.?js|vue|svelte|flutter|python|django|flask|typescript|which stack|what stack|framework)/,
      say: () =>
        "Pick the smallest stack that ships the idea. **Plain HTML/CSS/JS** for one screen with a bit of state — that's what I generate, and it needs no install, no build and no server. **React + Vite** (or Vue/Svelte) once several screens share the same state and you want components. **Node + SQLite** or **Supabase** when several people must see the same data. **Flutter / React Native** only if you genuinely need an app-store build.\n\nA static site plus `localStorage` gets you a working, shareable prototype far faster than a framework — move up a level when a real limit appears, not before.",
    },
    {
      test: /(how do i start|what should i build|what can you do|idea|stuck|new to|beginner|learn)/,
      say: () =>
        "Start with the smallest version of the idea that is still fun to press once. For a game that means one screen, one verb (move, aim, jump, answer), a score and a replay button — then add enemies, levels, menus. For an app it means one list, one form to add to it, and it saving itself.\n\nTell me the core action in plain words and I'll build that shape: “a 30-second quiz with three questions”, “a game where you dodge falling blocks”, “a page that lists my games”. Then ask me to change one thing at a time — small, named changes are what I follow best.",
    },
  ];

  function explainFor(prompt) {
    const l = String(prompt || "").toLowerCase();

    // a named game in the library
    const game = libraryList().find((g) => g.title && l.includes(g.title.toLowerCase()));
    if (game && !/^(make|build|create|add|change|rewrite|replace|turn|generate)/.test(l)) {
      return (
        `**${game.title}** — ${game.genre} game in your library\n\n` +
        `${game.pitch || game.description || "One of your own builds."}\n\n` +
        `It lives in \`games/${game.id}/\` and opens from its card's **Play** link. Since it is a real file of your own code, I treat it as the source of truth: **Edit with AI** gives you a fresh build in a known shape, and you choose whether to save it over this game (*Save to ${game.title}*) or keep the original (*Save as new game*, *Restore original*).\n\nAsk me something like “how does a game loop work” or “why do my edits replace the build” and I'll explain that part.`
      );
    }

    for (const entry of EXPLANATIONS) {
      if (!entry.test.test(l)) continue;
      const text = entry.say();
      if (!text) continue;
      // defining words inside a phrase like "make it 3d" should not steal a build order
      return text;
    }

    if (current && /\b(it|this|that|the)\b/.test(l)) return explainPlan();

    return (
      "I'm a planner made of templates, so I answer from explanations I carry rather than from general knowledge. Ask me about:\n\n" +
      "• the game loop and `requestAnimationFrame`\n" +
      "• what a canvas is and how drawing works\n" +
      "• collisions, score, restart, timers\n" +
      "• keyboard and touch controls\n" +
      "• saving with `localStorage` (or a real database)\n" +
      "• login, roles and why a browser-side gate isn't security\n" +
      "• installing the app, hosting it, three.js, debugging\n\n" +
      "Or say **make …** and I'll build instead — e.g. “make a math quiz”."
    );
  }

  /* ---------- fast lane: a hello must not wait for the network ---------- */
  // Words that mean "do some work". A message carrying one of them never gets a
  // written-here answer, however friendly it starts.
  const WORK_WORDS = /\b(make|build|create|add|remove|delete|fix|change|edit|update|rewrite|replace|turn|generate|design|install|deploy|save|rename|resize|move|copy|upgrade|code|script|game|games|app|apps|website|site|page|level|button|score|quiz|sound|colour|color|theme|speed|bigger|smaller|faster|slower)\b/;

  const QUICK_LINES = [
    {
      test: /^(hi|hii+|hello|helo|hey+|heya|yo|yoo+|sup|howdy|hiya|greetings|good (morning|afternoon|evening|day)|morning|afternoon|evening)\b/,
      lines: [
        "Hey! I'm the Architect. Say **make …** and I build it, or **add …** to change a game you already have.",
        "Hello! What are we building today — something new, or a change to one of your games?",
        "Hey there. Tell me the idea in plain words and I'll build it; open a game first if you want me to change that one."
      ]
    },
    {
      test: /^(how (are|r) (you|u)|how are you doing|how's it going|how is it going|how are things|what's up|whats up|wassup|you good|are you (ok|okay|alright))\b/,
      lines: [
        "All good here, thanks — ready to build. What's the idea?",
        "Running fine and ready. Give me a game or an app to make and I'll get to it."
      ]
    },
    {
      test: /^(thanks|thank you|thank u|thx|ty|tysm|cheers|appreciate it|nice one|perfect|great|awesome|amazing|brilliant|legend)\b/,
      lines: [
        "Any time. Want me to add anything else to it?",
        "Glad it landed. Say the next change whenever you're ready."
      ]
    },
    {
      test: /(you('| a)?re (the best|great|awesome|amazing|brilliant|a legend|so good)|good (job|work)|nice (work|job|one)|well done|love (it|this|that)|this is (great|awesome|amazing|sick|fire)|that's (great|awesome|amazing|sick|fire|cool)|so cool|looks great|works great|you rock|kudos|respect)/,
      lines: [
        "Thank you — that's kind. What should we build next?",
        "Appreciate it. Tell me the next thing and I'll make it.",
        "Nice of you to say. Open a game and say **add …** if you want to keep going."
      ]
    },
    {
      test: /^(bye|goodbye|good bye|see you|see ya|cya|good ?night|night|later|peace|i'm done|im done|that's all|thats all)\b/,
      lines: [
        "See you! Your chats and games are saved — just open the workshop again.",
        "Later! Everything you made is saved right here."
      ]
    },
    {
      test: /^(ok|okay|k|cool|nice|great|alright|sure|yes|yeah|yep|no|nope|lol|haha|hah|wow|oh|ah|omg|dang|hmm)\b/,
      lines: [
        "👍 Whenever you're ready — something new, or a change to one of your games.",
        "Got it. Say **make …** for something new, or open a game and say **add …**."
      ]
    }
  ];

  // The answer to a greeting, a thanks or a compliment is already written down,
  // so it comes back in about a tenth of a second instead of a network round trip.
  function quickReply(text) {
    const raw = String(text || "").trim();
    if (!raw || raw.length > 90) return "";
    if (WORK_WORDS.test(raw)) return "";
    const l = raw.toLowerCase().replace(/[^\w\s'?!]/g, " ").replace(/\s+/g, " ").trim();
    if (!l || l.split(" ").length > 8) return "";
    for (const entry of QUICK_LINES) {
      if (!entry.test.test(l)) continue;
      if (/\?/.test(l) && !/^(how|what'?s up|you good|are you)/.test(l)) return "";
      const pick = entry.lines[(entry.turn || 0) % entry.lines.length];
      entry.turn = ((entry.turn || 0) + 1) % entry.lines.length;
      return pick;
    }
    return "";
  }

  // "show me the preview", "run it", "let me play it" — a look, not a change.
  const PREVIEW_VERB =
    /\b(show|open|run|launch|start|replay|play|see|view|display|render|pull up|bring up|fire up)\b/;
  const PREVIEW_TARGET = /\b(it|this|that|preview|app|game|build|demo|result|site|page)\b/;
  function wantsPreview(text) {
    const t = String(text || "").toLowerCase().replace(/[^\w\s'!?]/g, " ").replace(/\s+/g, " ").trim();
    if (!t || t.length > 70) return false;
    if (/\b(how|why|explain|tutorial|teach|learn|mean|instead of)\b/.test(t)) return false;
    if (/\b(make|build|create|add|change|fix|update|remove|edit|rewrite|design|replace)\b/.test(t)) return false;
    if (/\bpreview\b/.test(t)) return true;
    return PREVIEW_VERB.test(t) && PREVIEW_TARGET.test(t);
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

    // A greeting, a thanks or a compliment is answered here, at once.
    const quick = quickReply(trimmed);
    if (quick) {
      setTimeout(() => {
        hideTyping();
        addMessage("ai", quick);
        busy = false;
      }, 120);
      return;
    }

    // A worker asking why they cannot add games gets the reason, once.
    const why = workerWhy(trimmed);
    if (why) {
      hideTyping();
      addMessage("ai", why);
      busy = false;
      return;
    }

    // "Show me the preview" runs the build at once, even with no model set up.
    if (wantsPreview(trimmed)) {
      hideTyping();
      if (runPreview()) {
        addMessage(
          "ai",
          `Running **${current.name}** — it is live in the **Preview** tab on the right now. Say "run it" again whenever you want it started over.`
        );
      } else {
        addMessage(
          "ai",
          "Nothing to preview yet. Tell me the app or game you want — one sentence is enough — and I'll build it, then run it right here."
        );
      }
      busy = false;
      return;
    }

    // A message that names one of the games is an edit of that game, not a new build.
    if (!editingGame) {
      let named = namedGame(trimmed);
      // "edit this game / this page": the game they last opened is the target.
      if (!named && EDIT_VERB.test(trimmed) && /\b(this|that|the current)\s+(game|page|app|site|file|build|one)\b/i.test(trimmed)) {
        const open = window.PowerplayApp && window.PowerplayApp.activeGame ? window.PowerplayApp.activeGame() : null;
        if (open) named = open;
      }
      const newBuild = /^\s*(?:please\s+)?(?:make|build|create)\b[\s\S]{0,25}\b(a|an|another)\b/i.test(trimmed);
      if (named && !newBuild && EDIT_VERB.test(trimmed) && !missingChange(trimmed) && !noChangeWords(trimmed) && !workerBlock(named)) {
        setEditingGame(named);
        addMessage("ai", `Working on **${named.title}** — I'll change that game and nothing else.`);
      }
    }

    // "Add a new feature to ProKick, a sports game:" with nothing after the colon:
    // ask which feature instead of guessing at one.
    const target = editingGame || namedGame(trimmed);
    if (missingChange(trimmed) || (EDIT_VERB.test(trimmed) && target && !isQuestion(trimmed) && noChangeWords(trimmed))) {
      hideTyping();
      askForChange(target);
      busy = false;
      return;
    }

    // A real model builds what was asked; the template planner is only the fallback.
    if (window.PowerplayAI && window.PowerplayAI.ready()) {
      respondWithAI(trimmed);
      return;
    }
    respondOffline(trimmed);
  }

  /* ---------- the real AI: it does what you ask ---------- */

  /* Who is signed in decides what may be refused. An admin is never refused. */
  function roleLine() {
    const A = window.PowerplayAccounts;
    const me = A && A.current ? A.current() : null;
    if (!me) {
      return "The person here is the workshop owner, so treat them as the admin: they may add, build and change anything, and you never refuse them.";
    }
    const who = me.username || "the person signed in";
    return me.role === "worker"
      ? `The person signed in is a WORKER (${who}). They may ask you for anything — explain, plan, review, and change the games assigned to them — and you say yes to all of it; the one thing you never do is add a new game to the library.`
      : `The person signed in is an ADMIN (${who}). Admins own the library: they add games, assign them to people, and may ask for anything. Never refuse an admin, never say a new game cannot be added to the library, and never tell them the library belongs to someone else.`;
  }

  function aiRules() {
    return [
    "You are the Architect inside POWERPLAY Workshop, the user's own app and game workshop.",
    "The user is the boss. Do exactly what they ask.",
    roleLine(),
    "Only a worker is limited, and only in one way: a worker cannot add a new game to the library. To anyone else a new game is a normal request — build it. If a worker asks why they cannot add one, give the reason in two sentences (the library is the admin's catalogue and every game on it is assigned to someone) and carry on; never repeat the same refusal twice in one conversation.",
    "Never replace their idea with a different app, never hand back a template because their wording was unfamiliar, and never say you cannot build something. Build the closest real, working version and say in one line what you left out.",
    "If the request is ambiguous, take the most likely reading and name it in one short line.",
    "If they ask a question or how something works, answer it plainly in 2-4 short paragraphs, no code.",
    "When they ask to see, run or play the preview, it is already running in the Preview tab: answer in one short sentence about what is on screen, never rebuild the app for that.",
    "When you are changing an app or game that already exists, you are adding to it: send only the small FIND/REPLACE, ADD AFTER or APPEND blocks the request below describes, never the whole file back, and never restyle or rewrite what was not asked about.",
    "A message shaped like 'Add a new feature to X, a game:' with nothing after the colon names no feature. Never invent one and never build a new game for it: ask what the feature should be, with two or three short examples.",
    "Never answer a change request with a complete different app or game. If you cannot tell what to change, ask one short question and wait.",
    "When changing an existing app, if their words could mean two different things or do not say where the change goes, ask ONE short question and wait instead of guessing.",
    "When you build: open with 2-4 sentences saying what the app does and how to use or play it, then exactly one ```html fence holding one complete file. Everything inline (style and script), no CDN, no imports, no external images or fonts, no build step: it must run by opening the file.",
    "Give it real working controls for keyboard, mouse and touch, a score or result the player can see, and a restart. Use no library unless the user asks for one.",
    "Make it look deliberate: a dark or bright palette of its own, readable type, and a layout that still works on a phone.",
    "Keep it compact: aim for under 250 lines, because one answer has a hard length limit. A short complete app beats a long truncated one."
  ].join("\n");
  }

  const CODE_LIMIT = 40000; // bigger files are described, not sent

  // A question needs a couple of paragraphs, not a build's worth of room. Asking
  // for less makes the model finish (and the answer arrive) several times sooner.
  const BUILD_ASK = /^(?:\s*(?:please|hey|hi|hello|ok|okay|now|so|and|can you|could you|will you|i want you to|i need you to)\s+)*(?:make|build|create|generate|design|turn|rewrite|give me)\b/i;
  function isBuildAsk(text) {
    const t = String(text || "");
    return BUILD_ASK.test(t) || /\b(make|build|create|rewrite)\b[\s\S]{0,40}\b(game|app|site|website|quiz|tool|page|player|level)\b/i.test(t);
  }

  // The Edit button pre-fills "Add a new feature to <title>, a <genre> game: ".
  // Pressing Enter with nothing after the colon asks for a change that was never
  // described: that gets a question back, never a guessed build.
  const EDIT_VERB = /^(?:\s*(?:please|hey|ok|now|so)\s+)*(?:add|change|edit|update|fix|remove|delete|rename|make|improve|tweak|upgrade)\b/i;
  const FILLER_WORDS =
    /\b(a|an|the|new|feature|features|game|games|app|apps|website|site|page|level|mode|please|kindly|to|for|in|on|at|with|me|my|it|its|and|or|some|something|anything|stuff|thing|things|just|really|now|again|also|thanks|thank|you|can|could|would|want|need|i|we|make|made|build|create|add|change|edit|update|fix|remove|delete|improve|tweak|upgrade|rename|there)\b/gi;

  function libraryGames() {
    const out = [];
    try {
      const saved = JSON.parse(localStorage.getItem("powerplay.games.v3") || "[]");
      if (Array.isArray(saved)) saved.forEach((g) => { if (g && g.title) out.push(g); });
    } catch (e) { /* a broken store just means the seeds below */ }
    const seed = window.PowerplayGames && Array.isArray(window.PowerplayGames.GAMES) ? window.PowerplayGames.GAMES : [];
    seed.forEach((g) => { if (g && g.title && !out.some((o) => o.id === g.id)) out.push(g); });
    return out;
  }

  function escapeRe(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /** The game whose title or id is named in the message, if any. */
  function namedGame(text) {
    const t = " " + String(text || "").toLowerCase().replace(/[!?.,]/g, "") + " ";
    let best = null;
    libraryGames().forEach((g) => {
      const title = String(g.title || "").toLowerCase().replace(/[!?.,]/g, "");
      const id = String(g.id || "").toLowerCase();
      const hit = (title.length > 2 && t.includes(title)) || (id.length > 2 && new RegExp("\\b" + escapeRe(id) + "\\b").test(t));
      if (hit && (!best || title.length > String(best.title).length)) best = g;
    });
    return best;
  }

  /** True when the message is the edit template with nothing after its colon. */
  function missingChange(text) {
    const raw = String(text || "").trim();
    const m = raw.match(/^(?:please\s+)?(?:add|change|edit|update|give|make)\b[\s\S]{0,140}?:\s*([\s\S]*)$/i);
    if (!m) return false;
    return !/[a-z0-9]{2,}/i.test(m[1].replace(/\[[^\]]*\]/g, " "));
  }

  /** An edit ask that names a game but never says what should change. */
  function noChangeWords(text) {
    let body = " " + String(text || "") + " ";
    const head = body.match(/^(?:please\s+)?(?:add|change|edit|update|fix|remove|delete|give|make)\b[\s\S]{0,140}?:/i);
    if (head) body = body.slice(head[0].length);
    libraryGames().forEach((g) => {
      body = body.replace(new RegExp(escapeRe(g.title), "gi"), " ").replace(new RegExp("\\b" + escapeRe(g.id) + "\\b", "gi"), " ");
    });
    return !/[a-z0-9]{2,}/i.test(body.replace(FILLER_WORDS, " ").replace(/\[[^\]]*\]/g, " "));
  }

  // No AI, no guessing: an existing game is never swapped for a made-up one.
  function answerWithoutAI() {
    const label = editingGame ? editingGame.title : "your game";
    hideTyping();
    addMessage(
      "ai",
      `The free AI is busy right now, so **${label}** is untouched — nothing was replaced and no new game was made.\n\n` +
        "Ask again in a minute and it will be free again. " +
        `You can also write the change straight into the Code tab and press **Save to ${label}**.`
    );
    busy = false;
  }

  function askForChange(game) {
    const label = game ? game.title : "your game";
    const genre = game && game.genre ? String(game.genre).toLowerCase() : "game";
    addMessage(
      "ai",
      `I need to know **what** to change in **${label}** — your message says to add a feature but not which one.\n\n` +
        "Finish the line after the colon, for example:\n" +
        `- \`Add a new feature to ${label}, a ${genre} game: a power meter that fills while you charge a shot\`\n` +
        `- \`Add a new feature to ${label}, a ${genre} game: a two-minute tournament mode with a scoreboard\`\n` +
        `- \`Add a new feature to ${label}, a ${genre} game: crowd sound when you score\`\n\n` +
        "**Nothing was changed and no new game was made.** Tell me the feature and I'll add only that to " +
        `${label}’s file.`
    );
  }

  // An answer cut off at the token limit has no closing fence, so take everything
  // after the opening one; a bare file with no fence at all is kept too.
  function fenceCode(text) {
    const src = String(text);
    const blocks = Array.from(src.matchAll(/```[a-zA-Z]*\s*\n([\s\S]*?)```/g)).map((m) => m[1]);
    const html = blocks.filter((b) => /<html|<!doctype|<body|<canvas|<script|<div/i.test(b));
    const pick = (html.length ? html : blocks).pop();
    if (pick && pick.trim()) return pick.trim();
    const open = src.match(/```[a-zA-Z]*\n([\s\S]*)$/);
    if (open && /<html|<!doctype|<body|<canvas|<script|<div/i.test(open[1])) return open[1].trim();
    if (/^\s*(<!doctype html|<html)/i.test(src)) return src.trim();
    return "";
  }

  const looksWhole = (code) => /<\/html>/i.test(code);

  function proseOnly(text) {
    return String(text).replace(/```[\s\S]*?```/g, "").replace(/\n{3,}/g, "\n\n").trim();
  }

  function titleFrom(code, prompt) {
    const m = code.match(/<title[^>]*>([^<]{2,70})<\/title>/i) || code.match(/<h1[^>]*>([^<]{2,70})<\/h1>/i);
    if (m) return m[1].trim();
    const words = prompt.replace(/^(please\s+)?(make|build|create|give me|i want|can you make)\s+(me\s+)?(a|an|the)?\s*/i, "").trim();
    const clean = words.split(/\s+/).slice(0, 5).join(" ").replace(/[^\w\s'&-]/g, "");
    return clean ? clean[0].toUpperCase() + clean.slice(1) : "New app";
  }

  function aiPlan(text, prompt) {
    const code = fenceCode(text);
    const prose = proseOnly(text);
    const lines = prose.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const features = lines
      .filter((l) => /^([-*•]|\d+[.)])\s+/.test(l))
      .map((l) => l.replace(/^([-*•]|\d+[.)])\s+/, "").replace(/\*\*/g, "").trim())
      .slice(0, 8);
    const first = lines.find((l) => !/^#{1,6}\s/.test(l)) || "";
    let name = editingGame ? editingGame.title : titleFrom(code, prompt);
    let outCode = code;
    if (editingGame) {
      const t = escapeHtml(editingGame.title);
      outCode = outCode
        .replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
        .replace(/<h1([^>]*)>[^<]*<\/h1>/, `<h1$1>${t}</h1>`);
    }
    return {
      name: name,
      tagline: (first || "Built from your words").replace(/^#+\s*/, "").slice(0, 150),
      summary: prose,
      features: features,
      screens: [],
      stack: [],
      data: [],
      steps: [],
      mentions: [],
      archetype: { id: "ai", icon: "✦", name: "AI build", tagline: "built by the AI from your request" },
      code: outCode
    };
  }

  async function currentGameCode(game) {
    if (game && game.build) return { code: String(game.build), fresh: false };
    const path = game && (game.playUrl || game.path || ("games/" + game.id + "/index.html"));
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) return null;
      return { code: await res.text(), fresh: true };
    } catch (e) {
      return null;
    }
  }

  // ---- editing means adding to the real file, not replacing it ----
  const PATCH_MAX = 12000; // a file this small can be pasted into the prompt whole

  function patchRules() {
    return [
      "Rules for changing an existing file:",
      "- Do NOT send the file back. Add to it: send only the pieces that change.",
      "- One block per change, exactly in this shape:",
      "---- FIND",
      "existing lines copied exactly (3 or more, so they are unique)",
      "---- REPLACE",
      "those same lines, with your change",
      "---- END",
      "- To put code next to something, or straight after a line:",
      "---- ADD AFTER",
      "an existing line, copied exactly",
      "---- WITH",
      "the new lines that go right after it",
      "---- END",
      "- To add code with no natural anchor, use ---- APPEND ---- (it lands just before </body>).",
      "- Never rewrite, reformat, shorten or re-title the rest of the file: everything you do not mention stays exactly as it is.",
      "- If my request does not say what to add, or there are two sensible places for it, do not patch: ask me ONE short question and wait."
    ].join("\n");
  }

  // What a big file looks like from the outside: the lines the AI can anchor on.
  function outlineOf(code) {
    const lines = String(code).split(/\r?\n/);
    const picked = [];
    lines.forEach((l, i) => {
      const t = l.trim();
      if (!t) return;
      if (/^<script[^>]*src=/.test(t) || /^<link[^>]*href=/.test(t) || /\bid="/.test(t) || /^function\s+\w+/.test(t) || /^\s*(const|let|var)\s+\w+\s*=\s*function/.test(l)) {
        if (picked.length < 90) picked.push(`${i + 1}: ${t.slice(0, 160)}`);
      }
    });
    return picked.length ? picked.join("\n") : lines.slice(0, 40).join("\n");
  }

  function contextForEditing(game, file) {
    const head = `Change this app: **${game.title}** (${game.genre || "game"}${game.tagline ? ", " + game.tagline : ""}).`;
    const rules = "\n\n" + patchRules();
    // A game added by hand has a card but no file yet: there is nothing to patch,
    // and asking "which page / which line" would only stall them. Build it instead.
    if (!file || !file.code) {
      return `Build this game: **${game.title}** (${game.genre || "game"}${game.tagline ? ", " + game.tagline : ""}).\n\n` +
        `It is in the library but has no code file yet — you are writing its first playable version, and the Save button puts it into **${game.title}** itself.\n\n` +
        "Rules:\n" +
        "- Answer with ONE complete HTML file in a single ```html fence, everything inline, ending with </html>.\n" +
        "- Never ask which page, which file or which line, and never ask me to paste code: this game has exactly one file and you are writing it now.\n" +
        "- If my message does not say what the game should be, take the most likely reading from its title and genre, and say that reading in one short line.\n" +
        "- Keep it compact, under 250 lines, with real controls for keyboard, mouse and touch, a visible score or result, and a restart.";
    }
    if (file.code.length <= PATCH_MAX) {
      return head + rules + "\n\nThe whole file is below — copy its lines from here exactly.\n\n```html\n" + file.code + "\n```";
    }
    const outline = outlineOf(file.code);
    return head + rules + `\n\nIts file is too big to paste (${Math.round(file.code.length / 1000)} KB), so here are its real lines with their line numbers. Anchor on one of them exactly, or use APPEND:\n\n` + outline;
  }

  function parsePatch(text) {
    const out = [];
    let cur = null;
    const flush = () => {
      if (!cur) return;
      if (cur.type === "replace") {
        const find = cur.find.replace(/^\n+|\s+$/g, "");
        if (find.trim()) out.push({ type: "replace", find, replace: cur.repl.replace(/^\n+|\s+$/g, "") });
      } else {
        const code = cur.code.replace(/^\n+|\s+$/g, "");
        if (code.trim()) out.push({ type: cur.type, anchor: cur.anchor.trim(), code });
      }
      cur = null;
    };
    for (const line of String(text).split(/\r?\n/)) {
      const m = line.match(/^\s*(?:-{3,}|={3,})\s*(FIND|REPLACE|WITH|ADD AFTER|APPEND|END)\s*$/i);
      if (!m) {
        if (cur) (cur.type === "replace" ? (cur.part === "repl" ? (cur.repl += line + "\n") : (cur.find += line + "\n")) : cur.part === "anchor" ? (cur.anchor += line + "\n") : (cur.code += line + "\n"));
        continue;
      }
      const k = m[1].toUpperCase();
      if (k === "FIND") { flush(); cur = { type: "replace", part: "find", find: "", repl: "" }; }
      else if (k === "ADD AFTER") { flush(); cur = { type: "after", part: "anchor", anchor: "", code: "" }; }
      else if (k === "APPEND") { flush(); cur = { type: "append", part: "code", anchor: "", code: "" }; }
      else if (k === "REPLACE" || k === "WITH") { if (cur) { cur.part = cur.type === "replace" ? "repl" : "code"; } }
      else if (k === "END") { flush(); }
    }
    flush();
    return out;
  }

  // exact match first, then the same text with any run of spaces/newlines inside it.
  function findSpot(hay, needle) {
    const n = needle.replace(/^\s+|\s+$/g, "");
    if (!n) return null;
    const direct = hay.indexOf(n);
    if (direct >= 0) return [direct, n.length];
    try {
      const re = new RegExp(n.split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"));
      const m = hay.match(re);
      if (m) return [m.index, m[0].length];
    } catch (e) { /* a pattern we cannot build is just a miss */ }
    return null;
  }

  function applyPatch(code, blocks) {
    let out = String(code || "");
    const done = [];
    const missed = [];
    for (const b of blocks) {
      if (b.type === "replace") {
        const spot = findSpot(out, b.find);
        if (!spot) { missed.push(b.find.split("\n")[0].trim().slice(0, 60)); continue; }
        out = out.slice(0, spot[0]) + b.replace + out.slice(spot[0] + spot[1]);
        done.push("changed “" + b.find.split("\n")[0].trim().slice(0, 48) + "”");
      } else if (b.type === "after") {
        const spot = findSpot(out, b.anchor);
        if (!spot) { missed.push(b.anchor.split("\n")[0].trim().slice(0, 60)); continue; }
        const at = spot[0] + spot[1];
        out = out.slice(0, at) + "\n" + b.code + out.slice(at);
        done.push("added after “" + b.anchor.split("\n")[0].trim().slice(0, 48) + "”");
      } else {
        const idx = out.search(/<\/body>/i);
        const at = idx >= 0 ? idx : out.length;
        out = out.slice(0, at) + "\n" + b.code + "\n" + out.slice(at);
        done.push("added " + b.code.split("\n").length + " lines at the end");
      }
    }
    return { code: out, done, missed };
  }

  async function respondWithAI(trimmed) {
    // A worker may ask for anything here; adding a game to the library is the
    // admin's job, so that — and only that — is refused.
    const blocked = !workerSession()
      ? ""
      : editingGame
        ? workerBlock(editingGame)
        : wantsNewGame(trimmed)
          ? newGameRefusal()
          : "";
    if (blocked) {
      hideTyping();
      addMessage("ai", blocked);
      busy = false;
      return;
    }

    const started = Date.now();
    const ticker = setInterval(() => {
      const row = $("#typingRow");
      if (!row) return;
      let note = row.querySelector(".typing-note");
      if (!note) {
        note = document.createElement("span");
        note.className = "typing-note";
        const b = row.querySelector(".bubble");
        if (b) b.appendChild(note);
      }
      note.textContent = " " + Math.round((Date.now() - started) / 1000) + "s";
    }, 1000);

    try {
      const file = editingGame ? await currentGameCode(editingGame) : null;
      const messages = [{ role: "system", content: aiRules() }]
        .concat(convo.slice(-8).map((m) => ({
          role: m.role,
          content: m.role === "assistant" ? String(m.content).slice(0, 1500) : String(m.content)
        })));
      if (editingGame) messages.push({ role: "user", content: contextForEditing(editingGame, file) });

      const maxTokens = editingGame ? (file && file.code ? 2000 : 4000) : isBuildAsk(trimmed) ? 4000 : 900;
      let out = await window.PowerplayAI.ask({ messages, maxTokens });
      let plan = aiPlan(out.text, trimmed);
      let patchInfo = null;
      let patchTried = false;
      let junk = false;

      if (editingGame) {
        const base = file && file.code ? file.code : "";
        if (!base) {
          // No file behind this game yet, so a whole file is its first build, not a patch.
          if (plan.code && (out.truncated || !looksWhole(plan.code))) {
            messages.push({ role: "assistant", content: String(out.text).slice(0, 3000) });
            messages.push({
              role: "user",
              content: "That answer was cut off by the length limit. Return ONE complete file that fits: the same game in under 200 lines, no comments, everything inline, ending with </html>."
            });
            out = await window.PowerplayAI.ask({ messages, maxTokens: 4000 });
            const second = aiPlan(out.text, trimmed);
            if (second.code && (looksWhole(second.code) || !looksWhole(plan.code))) plan = second;
          }
        } else {
          let blocks = parsePatch(out.text);
          let applied = applyPatch(base, blocks);

          // The blocks did not line up with the file: ask once more, with the file in view.
          if (blocks.length && !applied.done.length) {
            patchTried = true;
            messages.push({ role: "assistant", content: String(out.text).slice(0, 3000) });
            messages.push({
              role: "user",
              content: "None of those FIND lines matched the file exactly. Copy the lines character for character from the file in this conversation, or use ---- APPEND ---- for code that goes at the end. Send the blocks again."
            });
            out = await window.PowerplayAI.ask({ messages, maxTokens: 4000 });
            blocks = parsePatch(out.text);
            applied = applyPatch(base, blocks);
          }

          if (blocks.length && applied.done.length) {
            plan.code = applied.code;   // the patched real file, nothing else touched
            patchInfo = applied;
          } else if (blocks.length || patchTried) {
            plan.code = "";             // never replace the game with a patch that missed
          } else if (plan.code) {
            // A whole file is only taken if the user asked for a rewrite: a change
            // request must never turn into a different game in their library.
            const asDoc = /<!doctype|<html|<body/i.test(plan.code);
            const shrunk = base.length > PATCH_MAX && plan.code.length < base.length * 0.5;
            const askedRewrite = /\b(rewrite|rebuild|start over|from scratch|new version of the (whole |entire )?(file|game|code)|replace (it|the (whole |entire )?(file|game|code)))\b/i.test(trimmed);
            if (!asDoc || shrunk || !askedRewrite) { plan.code = ""; junk = true; }
          }
        }
      } else if (plan.code && (out.truncated || !looksWhole(plan.code))) {
        // A cut-off answer is asked for again as a compact file that fits the limit.
        messages.push({ role: "assistant", content: String(out.text).slice(0, 3000) });
        messages.push({
          role: "user",
          content: "That answer was cut off by the length limit. Return ONE complete file that fits: the same app in under 200 lines, no comments, everything inline, ending with </html>."
        });
        out = await window.PowerplayAI.ask({ messages, maxTokens: 4000 });
        const second = aiPlan(out.text, trimmed);
        if (second.code && (looksWhole(second.code) || !looksWhole(plan.code))) plan = second;
      }

      clearInterval(ticker);
      hideTyping();
      const engine = out.engine || window.PowerplayAI.label();

      if (patchInfo && editingGame) {
        renderPlan(plan);
        switchTab("code");
        const n = patchInfo.done.length;
        addMessage(
          "ai",
          `**${editingGame.title}** is updated — ${n} change${n === 1 ? "" : "s"}; the rest of the file is untouched.\n\n` +
            patchInfo.done.slice(0, 6).map((d) => "- " + d).join("\n") + "\n\n" +
            (plan.summary ? plan.summary + "\n\n" : "") +
            `Made by ${engine}. **Save to ${editingGame.title}** keeps it, and *Restore original* puts the shipped version back.` +
            (patchInfo.missed.length ? `\n\n⚠ ${patchInfo.missed.length} change didn't line up and was skipped.` : "")
        );
        if (window.PowerplayApp) window.PowerplayApp.toast("Updated — check the Code tab.", "ok");
      } else if (plan.code) {
        const cut = !editingGame && !looksWhole(plan.code);
        renderPlan(plan);
        switchTab("code");
        const saveNote = editingGame
          ? `**Save to ${editingGame.title}** puts it straight into the game; *Restore original* brings the old version back.`
          : "Press **Save as new game** to put it in your library with its own play link.";
        addMessage(
          "ai",
          `**${plan.name}** is built.\n\n` + (plan.summary ? plan.summary + "\n\n" : "") +
            `Made by ${engine}. ` + saveNote +
            (cut ? "\n\n⚠ The answer hit the free AI's length limit, so this is the compact version. Ask for one file at a time for the full-size build." : "")
        );
        if (window.PowerplayApp) window.PowerplayApp.toast(cut ? "Built a compact version — see the Code tab." : "Built it — check the Code tab.", "ok");
      } else if (editingGame && junk) {
        addMessage(
          "ai",
          `That answer described a different build, not a change to **${editingGame.title}** — so your game is exactly as it was, and no new game was added.\n\nSay what to add in a few words (for example “a power meter for shots”) and I'll patch only that into the file.`
        );
        if (window.PowerplayApp) window.PowerplayApp.toast("Nothing was changed — the answer wasn't usable.", "err");
      } else if (editingGame && patchTried) {
        addMessage(
          "ai",
          `I couldn't line that change up with **${editingGame.title}**'s file, so nothing was changed. Say where it should go (for example “add it under the scoreboard”) and I'll place it there.`
        );
      } else {
        addMessage("ai", out.text.trim());
      }
      busy = false;
    } catch (err) {
      clearInterval(ticker);
      hideTyping();
      if (editingGame) { answerWithoutAI(); return; }
      addMessage(
        "ai",
        `**The free AI could not answer this time.** ${err && err.message ? err.message : "Unknown error."}\n\nI'm falling back to the offline builder so you still get something.`
      );
      respondOffline(trimmed);
    }
  }

  function respondOffline(trimmed) {
    const delay = 520 + Math.min(trimmed.length * 8, 620);

    setTimeout(() => {
      hideTyping();
      // A question gets an explanation; orders still build.
      if (isQuestion(trimmed)) {
        addMessage("ai", explainFor(trimmed));
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

      // Workers only edit assigned games; they cannot add games to the library.
      const blocked = !workerSession()
        ? ""
        : editingGame
          ? workerBlock(editingGame)
          : wantsNewGame(trimmed)
            ? newGameRefusal()
            : "";
      if (blocked) {
        addMessage("ai", blocked);
        busy = false;
        return;
      }

      // Changing an existing game without an AI means inventing a feature, and a
      // template game dropped on top of theirs is how "it made its own game" happens.
      // Say so and leave their game exactly as it is.
      if (editingGame) {
        answerWithoutAI();
        return;
      }

      const plan = buildPlan(trimmed, null);
      renderPlan(plan);
      const isGamePlan = ["game", "shooter", "runner", "memory", "sports", "quiz"].includes(plan.archetype.id);
      switchTab(isGamePlan ? "code" : "plan");
      
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
    convo = [];
    if (window.PowerplayChats) window.PowerplayChats.startNew();
    current = null;
    setEditingGame(null);
    previewFrame.removeAttribute("srcdoc");
    codeOutput.textContent = "";
    if (codeEditor) codeEditor.value = "";
    if (pythonOutput) pythonOutput.textContent = "";
    setEditingCode(false);
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

  /* ---------- the code pane: edit it, run it, read its Python ---------- */
  let editingCode = false;
  let codeLang = "html";

  function setEditingCode(on) {
    editingCode = !!on;
    if (!codeEditor || !codePre) return;
    if (on && current) codeEditor.value = current.code || "";
    codeEditor.hidden = !on || codeLang === "python";
    codePre.hidden = on || codeLang === "python";
    $("#editCode").textContent = on ? "Done" : "Edit";
    $("#codeHint").hidden = !on || codeLang === "python";
    $("#runCode").hidden = codeLang === "python";
  }

  function setCodeLang(lang) {
    codeLang = lang === "python" ? "python" : "html";
    const py = codeLang === "python";
    if (py) $("#pyPane").hidden = false;
    else $("#pyPane").hidden = true;
    if (codePre) codePre.hidden = py || editingCode;
    if (codeEditor) codeEditor.hidden = py || !editingCode;
    $("#langHtml").classList.toggle("is-active", !py);
    $("#langPython").classList.toggle("is-active", py);
    $("#langHtml").setAttribute("aria-selected", String(!py));
    $("#langPython").setAttribute("aria-selected", String(py));
    $("#editCode").hidden = py;
    $("#runCode").hidden = py;
    $("#copyCode").hidden = py;
    $("#downloadCode").hidden = py;
    $("#codeFilename").hidden = py;
    $("#codeHint").hidden = py || !editingCode;
    if (py) renderPython(current);
  }

  function renderPython(plan) {
    if (!pythonOutput) return;
    const py = plan && plan.pythonCode ? plan.pythonCode : "";
    const slug = ((plan && plan.name) || "game").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    $("#pyFilename").textContent = slug + ".py";
    pythonOutput.textContent = py || (window.PowerplayAI && window.PowerplayAI.ready()
      ? "No Python version yet. Press “Write the Python version” and the AI writes one that behaves the same — one file, standard library only."
      : "The Python version is written by the free AI. Press “Write the Python version” again in a moment.");
    $("#makePython").hidden = !!py;
    $("#copyPython").hidden = !py;
    $("#downloadPython").hidden = !py;
  }

  function fencePython(text) {
    const blocks = Array.from(String(text).matchAll(/```[a-zA-Z]*\s*\n([\s\S]*?)```/g)).map((m) => m[1]);
    const pick = (blocks.filter((b) => /^\s*(#|import |from |def |class )/m.test(b))).pop() || blocks.pop();
    if (pick && /def |import |print\(/.test(pick)) return pick.trim();
    const open = String(text).match(/```[a-zA-Z]*\n([\s\S]*)$/);
    return open && /def |import |print\(/.test(open[1]) ? open[1].trim() : "";
  }

  if (codeEditor) codeEditor.addEventListener("input", () => {
    if (!current) return;
    current.code = codeEditor.value;
    codeOutput.textContent = codeEditor.value;
  });

  $("#editCode").addEventListener("click", () => {
    if (!current) {
      if (window.PowerplayApp) window.PowerplayApp.toast("Ask for an app first.", "err");
      return;
    }
    setEditingCode(!editingCode);
  });

  $("#runCode").addEventListener("click", () => {
    if (!current) return;
    if (editingCode) current.code = codeEditor.value;
    current.code = current.code || "";
    previewFrame.setAttribute("srcdoc", current.code);
    codeOutput.textContent = current.code;
    switchTab("preview");
    if (window.PowerplayApp) window.PowerplayApp.toast("Preview updated.", "ok");
  });

  $("#langHtml").addEventListener("click", () => setCodeLang("html"));
  $("#langPython").addEventListener("click", () => setCodeLang("python"));

  $("#makePython").addEventListener("click", async () => {
    if (!current || !current.code) return;
    if (!(window.PowerplayAI && window.PowerplayAI.ready())) {
      if (window.PowerplayApp) window.PowerplayApp.toast("The free AI is busy — try again in a moment.", "err");
      return;
    }
    const btn = $("#makePython");
    btn.disabled = true;
    const was = btn.textContent;
    btn.textContent = "Writing…";
    pythonOutput.textContent = "Writing the Python version of " + current.name + "…";
    try {
      const code = String(current.code).slice(0, 12000);
      const out = await window.PowerplayAI.ask({
        maxTokens: 4000,
        messages: [
          { role: "system", content: "You write Python. Answer with exactly one ```python fence holding one complete file, and nothing else. Standard library only, no pip installs, under 200 lines." },
          { role: "user", content: `Write the Python version of this app: ${current.name}. Same behaviour and the same controls, as a desktop program${/\b(game|player|score|level)\b/i.test(code) ? ": use tkinter with a Canvas and an after() loop" : ": use tkinter"}. It must run with \"python app.py\".\n\nIts code:\n\`\`\`html\n${code}\n\`\`\`` }
        ]
      });
      const py = fencePython(out.text);
      if (!py) throw new Error("The AI didn't return Python code. Try again.");
      current.pythonCode = py;
      renderPython(current);
      if (window.PowerplayChats) window.PowerplayChats.setPlan(current);
      if (window.PowerplayApp) window.PowerplayApp.toast("Python version ready.", "ok");
    } catch (err) {
      pythonOutput.textContent = "Couldn't write it: " + (err && err.message ? err.message : "unknown error") + "\nPress the button to try again.";
      if (window.PowerplayApp) window.PowerplayApp.toast("Python version failed — see the pane.", "err");
    } finally {
      btn.disabled = false;
      btn.textContent = was;
    }
  });

  $("#copyPython").addEventListener("click", async () => {
    if (!current || !current.pythonCode) return;
    try {
      await navigator.clipboard.writeText(current.pythonCode);
      if (window.PowerplayApp) window.PowerplayApp.toast("Python copied.");
    } catch (e) {
      if (window.PowerplayApp) window.PowerplayApp.toast("Select the code and copy it.", "err");
    }
  });

  $("#downloadPython").addEventListener("click", () => {
    if (!current || !current.pythonCode) return;
    const blob = new Blob([current.pythonCode], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = $("#pyFilename").textContent;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (window.PowerplayApp) window.PowerplayApp.toast("Python file downloaded.");
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

  window.PowerplayArchitect = { editGame, runPreview, hasPlan: () => !!current };

  /* Replay a saved conversation, messages first, then its blueprint. */
  function restoreSession(chat) {
    if (!chat) return;
    restoring = true;
    chatLog.innerHTML = "";
    current = null;
    chat.messages.forEach((m) => addMessage(m.role, m.text));
    convo = chat.messages.map((m) => ({ role: m.role === "me" ? "user" : "assistant", content: m.text }));
    restoring = false;
    if (chat.plan) renderPlan(chat.plan, true);
  }

  /* ---------- AI settings: which model builds for you ---------- */
  function paintEngine() {
    const el = $("#aiEngineLabel");
    const AI = window.PowerplayAI;
    if (!el || !AI) return;
    el.textContent = "Real AI · " + (AI.ready() ? AI.label() : "free hosted AI");
    const chip = $("#aiEngine");
    if (chip) chip.title = "Built by " + (AI.ready() ? AI.label() : "free hosted AI") + " — free, no key needed. Click to change it.";
  }

  function fillAiForm() {
    const AI = window.PowerplayAI;
    if (!AI) return;
    const s = AI.settings();
    $("#aiProvider").value = s.provider;
    $("#aiKey").value = s.key;
    $("#aiModel").value = s.model;
    $("#aiBase").value = s.provider === "free" ? "" : s.baseUrl;
    syncAiRows();
    $("#aiState").textContent = AI.ready()
      ? "In use now: " + AI.label() + ". The free AI needs no key; a key of your own is optional and never leaves this browser."
      : "The free AI is already on. A key of your own is optional.";
  }

  // The free engine needs no key; the others need a key and, for "custom", an address.
  function syncAiRows() {
    const provider = $("#aiProvider").value;
    $("#aiKeyRow").hidden = provider === "free";
    $("#aiBaseRow").hidden = provider !== "custom";
    const preset = window.PowerplayAI ? window.PowerplayAI.PRESETS[provider] : null;
    if (preset) {
      $("#aiModel").placeholder = preset.model || "model name";
      $("#aiBase").placeholder = preset.baseUrl || "https://your-server/v1/chat/completions";
    }
  }

  function readAiForm() {
    const provider = $("#aiProvider").value;
    const preset = window.PowerplayAI.PRESETS[provider] || {};
    return {
      provider: provider,
      key: $("#aiKey").value.trim(),
      model: $("#aiModel").value.trim() || preset.model || "",
      baseUrl: provider === "custom" ? $("#aiBase").value.trim() : (preset.baseUrl || "")
    };
  }

  function bindAiSettings() {
    if (!$("#aiEngine")) return;
    $("#aiEngine").addEventListener("click", () => {
      fillAiForm();
      window.PowerplayApp.openModal("ai");
    });
    $("#aiProvider").addEventListener("change", () => {
      const preset = window.PowerplayAI.PRESETS[$("#aiProvider").value] || {};
      $("#aiModel").value = preset.model || "";
      $("#aiBase").value = $("#aiProvider").value === "custom" ? "" : (preset.baseUrl || "");
      syncAiRows();
    });
    $("#aiSave").addEventListener("click", () => {
      window.PowerplayAI.saveSettings(readAiForm());
      paintEngine();
      $("#aiState").textContent = window.PowerplayAI.ready()
        ? "Saved. " + window.PowerplayAI.label() + " builds from now on."
        : "Saved. Without a working key it stays on the free AI, so building never stops.";
      if (window.PowerplayApp) window.PowerplayApp.toast("AI settings saved.");
    });
    $("#aiTest").addEventListener("click", async () => {
      const btn = $("#aiTest");
      btn.disabled = true;
      $("#aiState").textContent = "Testing…";
      try {
        const out = await window.PowerplayAI.test(readAiForm());
        $("#aiState").textContent = out.ok
          ? "It answered: " + out.engine + " is ready."
          : "It answered, but not with the test word. It is probably still fine.";
      } catch (err) {
        $("#aiState").textContent = err && err.message ? err.message : "That did not work.";
      } finally {
        btn.disabled = false;
      }
    });
    paintEngine();
  }

  if (window.PowerplayChats) window.PowerplayChats.onOpen(restoreSession);

  /* ---------- boot ---------- */
  const savedChat = window.PowerplayChats ? window.PowerplayChats.restoreCurrent() : null;
  if (savedChat) {
    restoreSession(savedChat);
  } else {
    addMessage(
      "ai",
      "Welcome to the Architect. Describe an app or game — one sentence is enough — and I'll hand back a blueprint plus runnable starter code.\n\nWhat are we building?"
    );
  }
  if (window.PowerplayChats) window.PowerplayChats.render();
  bindAiSettings();
})();
