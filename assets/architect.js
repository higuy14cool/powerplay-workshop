/* ============================================================
   POWERPLAY Workshop — App Architect
   A local, rule-based planning co-pilot that turns a prompt into
   features, screens, a stack, a build order and working starter code.
   ============================================================ */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- shared starter-page shell ---------- */
  const BASE_CSS = `
    :root{--accent:#b8ff3d}
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
      background:radial-gradient(800px 460px at 85% -10%,rgba(184,255,61,.13),transparent 60%),#090b12;
      color:#eef1f6;display:flex;justify-content:center;padding:26px 16px}
    .app{width:100%;max-width:430px}
    h1{font-size:25px;margin:0 0 4px;letter-spacing:-.03em}
    .sub{color:#8a91a6;font-size:12.5px;margin:0 0 18px}
    .card{background:#11141f;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:14px}
    input,button{font:inherit}
    input{width:100%;padding:11px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.14);
      background:#0a0d15;color:#eef1f6;outline:none}
    input:focus{border-color:var(--accent)}
    .btn{background:var(--accent);color:#0a0b10;border:0;border-radius:10px;padding:11px 16px;
      font-weight:700;cursor:pointer;transition:.15s}
    .btn:hover{filter:brightness(1.08)}
    .row{display:flex;gap:8px}
    ul{list-style:none;margin:14px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
    li{display:flex;align-items:center;gap:10px;background:#11141f;border:1px solid rgba(255,255,255,.07);
      border-radius:11px;padding:11px 13px;font-size:14px}
    .del{margin-left:auto;background:none;border:0;color:#6b7280;cursor:pointer;font-size:15px}
    .empty{color:#6b7280;font-size:12.5px;text-align:center;padding:16px 0}
    .pill{display:inline-block;font-size:10px;letter-spacing:.1em;text-transform:uppercase;
      color:#8a91a6;border:1px solid rgba(255,255,255,.12);border-radius:99px;padding:3px 9px;margin-bottom:12px}
  `;

  function page(title, accent, extraCss, body, script) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>${BASE_CSS}${extraCss || ""}</style>
</head>
<body>
<div class="app">
  <span class="pill">starter · powerplay</span>
${body}
</div>
<script>
${script}
<\/script>
</body>
</html>`;
  }

  /* ---------- archetypes ---------- */
  const ARCHETYPES = [
    {
      id: "habit",
      match: ["habit", "streak", "routine", "daily", "goal", "habit tracker"],
      icon: "◈",
      name: "Streakline",
      tagline: "A habit tracker that makes consistency visible.",
      features: [
        "Add habits and remove the ones that no longer serve you",
        "Seven-day strip per habit — tap a day to mark it done",
        "Automatic streak count with a live summary",
        "Instant, zero-layout-shift updates as you tap",
      ],
      screens: ["Today", "Habit detail", "New habit"],
      stack: ["HTML", "CSS", "Vanilla JS", "Local state"],
      data: [["habits", "id, name, days[7]"], ["streak", "derived from days"]],
      steps: [
        ["Sketch the loop", "One screen: today's habits with a 7-day strip."],
        ["Model a habit", "An object with a name and seven booleans."],
        ["Make tapping count", "Toggle a day and recompute the streak."],
        ["Persist it", "Move state into localStorage once the loop feels right."],
      ],
      html() {
        const script = `
var habits = [{name:"Morning walk",days:[1,1,0,1,1,0,0]},{name:"Read 20 pages",days:[1,0,1,1,0,0,0]}];
var list = document.getElementById("list");
var input = document.getElementById("habitInput");
function streak(days){var s=0;for(var i=days.length-1;i>=0;i--){if(days[i])s++;else break}return s}
function render(){
  list.innerHTML = habits.length ? "" : '<li class="empty">No habits yet — add the first one.</li>';
  habits.forEach(function(h,hi){
    var li = document.createElement("li");
    li.style.display = "block";
    var head = document.createElement("div");
    head.style.cssText = "display:flex;align-items:center;gap:8px;margin-bottom:9px";
    head.innerHTML = '<strong style="font-size:14px">'+h.name+'</strong><span style="margin-left:auto;font-size:11px;color:#b8ff3d">'+streak(h.days)+' day streak</span>';
    var del = document.createElement("button");
    del.className = "del"; del.textContent = "×";
    del.onclick = function(){habits.splice(hi,1);render()};
    head.appendChild(del);
    li.appendChild(head);
    var strip = document.createElement("div");
    strip.style.cssText = "display:flex;gap:6px";
    ["M","T","W","T","F","S","S"].forEach(function(label,di){
      var b = document.createElement("button");
      b.textContent = label;
      b.style.cssText = "flex:1;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.1);cursor:pointer;font-size:11px;background:"+(h.days[di]?"#b8ff3d":"#0a0d15")+";color:"+(h.days[di]?"#0a0b10":"#8a91a6");
      b.onclick = function(){h.days[di] = h.days[di]?0:1;render()};
      strip.appendChild(b);
    });
    li.appendChild(strip);
    list.appendChild(li);
  });
}
document.getElementById("add").onclick = function(){
  var v = input.value.trim(); if(!v) return;
  habits.push({name:v,days:[0,0,0,0,0,0,0]}); input.value=""; render();
};
input.addEventListener("keydown", function(e){if(e.key==="Enter")document.getElementById("add").click()});
render();
`;
        return page(
          "Streakline — habit tracker",
          "#b8ff3d",
          "",
          `<h1>Streakline</h1><p class="sub">Small days, stacked.</p>
  <div class="row"><input id="habitInput" placeholder="New habit, e.g. stretch 5 min"><button class="btn" id="add">Add</button></div>
  <ul id="list"></ul>`,
          script
        );
      },
    },
    {
      id: "todo",
      match: ["todo", "to-do", "task", "checklist", "kanban", "project"],
      icon: "✓",
      name: "Taskline",
      tagline: "A focused task list with just enough structure.",
      features: [
        "Add, complete and delete tasks in one view",
        "Done tasks dim automatically and remember their place",
        "Live open-task counter in the header",
        "Keyboard-first: Enter adds, click circles to finish",
      ],
      screens: ["All tasks", "Completed", "New task"],
      stack: ["HTML", "CSS", "Vanilla JS"],
      data: [["tasks", "id, text, done"], ["filter", "all | open | done"]],
      steps: [
        ["List first", "Render an array of tasks before adding any filtering."],
        ["Toggle done", "Flip a boolean and restyle the row."],
        ["Add counters", "Show how many tasks are still open."],
        ["Save it", "Persist the array so a refresh does not wipe it."],
      ],
      html() {
        const script = `
var tasks = [{text:"Sketch the main screen",done:true},{text:"Ship the first playable",done:false}];
var list = document.getElementById("list"), input = document.getElementById("taskInput"), count = document.getElementById("count");
function render(){
  list.innerHTML = "";
  var open = tasks.filter(function(t){return !t.done}).length;
  count.textContent = open + (open===1?" open task":" open tasks");
  if(!tasks.length){list.innerHTML='<li class="empty">Inbox zero. Add something.</li>';return}
  tasks.forEach(function(t,i){
    var li = document.createElement("li");
    var box = document.createElement("button");
    box.style.cssText = "width:20px;height:20px;border-radius:6px;border:1px solid "+(t.done?"#b8ff3d":"rgba(255,255,255,.25)")+";background:"+(t.done?"#b8ff3d":"transparent")+";cursor:pointer;color:#0a0b10;font-size:12px;line-height:1";
    box.textContent = t.done ? "✓" : "";
    box.onclick = function(){t.done=!t.done;render()};
    var span = document.createElement("span");
    span.textContent = t.text;
    span.style.cssText = t.done ? "text-decoration:line-through;color:#6b7280" : "";
    var del = document.createElement("button");
    del.className="del"; del.textContent="×";
    del.onclick=function(){tasks.splice(i,1);render()};
    li.appendChild(box);li.appendChild(span);li.appendChild(del);list.appendChild(li);
  });
}
document.getElementById("add").onclick=function(){
  var v=input.value.trim(); if(!v)return;
  tasks.unshift({text:v,done:false}); input.value=""; render();
};
input.addEventListener("keydown",function(e){if(e.key==="Enter")document.getElementById("add").click()});
render();
`;
        return page(
          "Taskline — task list",
          "#b8ff3d",
          "",
          `<h1>Taskline</h1><p class="sub" id="count">0 open tasks</p>
  <div class="row"><input id="taskInput" placeholder="What needs doing?"><button class="btn" id="add">Add</button></div>
  <ul id="list"></ul>`,
          script
        );
      },
    },
    {
      id: "quiz",
      match: ["quiz", "flashcard", "study", "learn", "exam", "trivia", "school"],
      icon: "?",
      name: "Quizloop",
      tagline: "A quiz engine with instant feedback and a final score.",
      features: [
        "Multiple-choice questions with one correct answer",
        "Instant colour feedback on every answer",
        "Progress tracker and final score screen",
        "Replay without a page refresh",
      ],
      screens: ["Question", "Feedback", "Results"],
      stack: ["HTML", "CSS", "Vanilla JS"],
      data: [["questions", "prompt, options[], answerIndex"], ["progress", "current index, score"]],
      steps: [
        ["Write five questions", "Hard-code a small set so the loop is testable."],
        ["Render one at a time", "Track the current question index."],
        ["Grade an answer", "Compare against answerIndex, then advance."],
        ["Add the result screen", "Show score out of total with a replay."],
      ],
      html() {
        const script = `
var questions = [
  {q:"What does CSS stand for?",o:["Cascading Style Sheets","Creative Style System","Computer Styled Sections"],a:0},
  {q:"Which tag loads JavaScript?",o:["<js>","<script>","<code>"],a:1},
  {q:"What is 7 x 8?",o:["54","58","56"],a:2},
  {q:"Which one stores key-value data in the browser?",o:["localStorage","canvas","fetch"],a:0}
];
var i = 0, score = 0, locked = false;
var stage = document.getElementById("stage");
function render(){
  if(i >= questions.length){ return end(); }
  var q = questions[i];
  stage.innerHTML = '<p class="sub">Question '+(i+1)+' of '+questions.length+' · score '+score+'</p><h2 style="font-size:18px;margin:0 0 14px">'+q.q+'</h2>';
  q.o.forEach(function(opt,idx){
    var b = document.createElement("button");
    b.textContent = opt;
    b.style.cssText = "display:block;width:100%;text-align:left;margin-bottom:8px;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#0a0d15;color:#eef1f6;cursor:pointer;font:inherit";
    b.onclick = function(){ answer(idx, b); };
    stage.appendChild(b);
  });
}
function answer(idx, btn){
  if(locked) return; locked = true;
  var correct = idx === questions[i].a;
  if(correct){ score++; btn.style.background="rgba(184,255,61,.18)"; btn.style.borderColor="#b8ff3d"; }
  else { btn.style.background="rgba(255,95,158,.18)"; btn.style.borderColor="#ff5f9e"; }
  setTimeout(function(){ i++; locked=false; render(); }, 620);
}
function end(){
  stage.innerHTML = '<h2 style="font-size:22px;margin:0 0 6px">'+score+' / '+questions.length+'</h2><p class="sub">'+(score===questions.length?"Flawless run.":"Good run — review and go again.")+'</p><button class="btn" id="again">Play again</button>';
  document.getElementById("again").onclick = function(){ i=0; score=0; render(); };
}
render();
`;
        return page(
          "Quizloop — quiz app",
          "#2dd4ef",
          "",
          `<h1>Quizloop</h1><p class="sub">Four questions. No pressure.</p><div class="card" id="stage"></div>`,
          script
        );
      },
    },
    {
      id: "expense",
      match: ["expense", "budget", "money", "spending", "finance", "cost", "invoice"],
      icon: "▤",
      name: "Ledgerly",
      tagline: "A tiny expense tracker that adds itself up.",
      features: [
        "Log an expense with a label and an amount",
        "Running total recalculated on every change",
        "Delete a line and the total updates instantly",
        "Guard rails against empty or non-numeric input",
      ],
      screens: ["Overview", "Add expense"],
      stack: ["HTML", "CSS", "Vanilla JS"],
      data: [["expenses", "id, label, amount"], ["total", "derived"]],
      steps: [
        ["Two inputs, one list", "Keep entry to a label and an amount."],
        ["Parse safely", "Reject empty labels and values that are not numbers."],
        ["Derive the total", "Never store it — compute it from the list."],
        ["Polish the format", "Show amounts with two decimals and a currency mark."],
      ],
      html() {
        const script = `
var items = [{label:"Coffee beans",amount:12.5},{label:"Bus pass",amount:24}];
var list = document.getElementById("list"), totalEl = document.getElementById("total");
function render(){
  list.innerHTML = "";
  var total = items.reduce(function(s,x){return s+x.amount},0);
  totalEl.textContent = "$" + total.toFixed(2);
  if(!items.length){list.innerHTML='<li class="empty">Nothing logged yet.</li>';return}
  items.forEach(function(x,idx){
    var li = document.createElement("li");
    li.innerHTML = '<span>'+x.label+'</span><strong style="margin-left:auto">$'+x.amount.toFixed(2)+'</strong>';
    var del = document.createElement("button");
    del.className="del"; del.textContent="×";
    del.onclick=function(){items.splice(idx,1);render()};
    li.appendChild(del); list.appendChild(li);
  });
}
document.getElementById("add").onclick=function(){
  var label=document.getElementById("label").value.trim();
  var amount=parseFloat(document.getElementById("amount").value);
  if(!label || isNaN(amount) || amount<=0) return;
  items.unshift({label:label,amount:amount});
  document.getElementById("label").value=""; document.getElementById("amount").value="";
  render();
};
render();
`;
        return page(
          "Ledgerly — expense tracker",
          "#ffb020",
          ".total{font-size:32px;font-weight:800;letter-spacing:-.03em}",
          `<h1>Ledgerly</h1><p class="sub">This month's small stuff.</p>
  <div class="card" style="margin-bottom:12px"><span class="sub" style="margin:0">total spent</span><div class="total" id="total">$0.00</div></div>
  <div class="row"><input id="label" placeholder="What was it?"><input id="amount" type="number" step="0.01" placeholder="0.00" style="max-width:96px"><button class="btn" id="add">Add</button></div>
  <ul id="list"></ul>`,
          script
        );
      },
    },
  ];

  window.PowerplayArchitectData = { ARCHETYPES, page };
})();
