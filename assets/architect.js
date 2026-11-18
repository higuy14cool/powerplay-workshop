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

  /* ---------- quiz topic ---------- */
  function quizTopic(prompt) {
    const text = String(prompt || "");
    const lower = text.toLowerCase();
    const math = /math|maths|arithmetic|addition|subtraction|multiplication|division|times table|times tables|plus|minus|fraction/.test(lower);
    const about = text.match(/(?:quiz|test)\s+(?:about|on|of)\s+([a-z0-9 &'+-]{2,40})/i);
    const subject = text.match(/\b(?:a|an|the)\s+([a-z0-9 &'+-]{2,28}?)\s+(?:quiz|trivia)\b/i);
    let topic = (about && about[1]) || (subject && subject[1]) || (math ? "math" : "quiz");
    topic = topic.replace(/(?:quiz|trivia|app|game)$/i, "").replace(/\s+/g, " ").trim() || (math ? "math" : "quiz");
    return topic.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
  }

  function quizTitle(prompt) {
    const topic = quizTopic(prompt);
    return topic.toLowerCase() === "quiz" ? "Quiz" : topic + " Quiz";
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
    match: [
      "quiz", "trivia", "math", "maths", "arithmetic", "addition", "subtraction",
      "multiplication", "division", "times table", "times tables", "flashcard",
      "multiple choice", "study", "exam", "school",
    ],
    icon: "✎",
    name: "Quizdeck",
    tagline: "Ten questions, four choices, a score and a replay button.",
    features: [
      "A deck of questions, each with four choices",
      "Right/wrong feedback the moment a choice is picked",
      "Running score and a final result screen with replay",
      "Add your own questions from the page itself",
    ],
    screens: ["Rules", "Question", "Result"],
    stack: ["HTML", "CSS", "Vanilla JS"],
    data: [["question", "string"], ["answer", "string"], ["choices", "string[]"], ["score", "number"]],
    steps: [
      ["Write the deck", "Every question carries its answer plus three wrong choices."],
      ["One card at a time", "Show a single question with four answer buttons."],
      ["Score it", "Mark the pick immediately and keep the running total."],
      ["Finish and replay", "Show the final score and start a fresh deck."],
    ],
    titleFor(prompt) {
      return quizTitle(prompt);
    },
    html(prompt) {
      const text = String(prompt || "");
      const lower = text.toLowerCase();
      const isMath = /math|maths|arithmetic|addition|subtraction|multiplication|division|times table|times tables|plus|minus|fraction|sum\b/.test(lower);
      let ops = ["add", "sub", "mul"];
      if (/subtract|minus|take away/.test(lower)) ops = ["sub"];
      else if (/times table|multiplication|multiply/.test(lower)) ops = ["mul"];
      else if (/division|divide/.test(lower)) ops = ["div"];
      else if (/addition|plus|sum\b/.test(lower)) ops = ["add"];
      const heading = quizTitle(text);

      // Questions written into the prompt itself: "Capital of France? = Paris; 7 x 8? = 56"
      const bank = [];
      const pairs = /([^?=;\n]{3,90}\?)\s*=\s*([^;=\n]{1,60})/g;
      let m;
      while ((m = pairs.exec(text))) bank.push([m[1].trim(), m[2].trim()]);

      const script = `
var MODE = ${JSON.stringify(isMath ? "math" : "bank")};
var OPS = ${JSON.stringify(ops)};
var TOPIC = ${JSON.stringify(heading)};
var BANK = ${JSON.stringify(bank)};
var deck = [], idx = 0, score = 0, locked = false;
var $ = function (id) { return document.getElementById(id); };
function rnd(n) { return Math.floor(Math.random() * n); }
function shuffle(a) {
  for (var j = a.length - 1; j > 0; j--) { var k = rnd(j + 1), t = a[j]; a[j] = a[k]; a[k] = t; }
  return a;
}
function mathQuestion(level) {
  var op = OPS[rnd(OPS.length)], a, b, ans, sum;
  var top = level ? 60 : 20;
  if (op === "add") { a = 2 + rnd(top); b = 2 + rnd(top); ans = a + b; sum = a + " + " + b + " = ?"; }
  else if (op === "sub") { a = 5 + rnd(top); b = 1 + rnd(a - 1); ans = a - b; sum = a + " \\u2212 " + b + " = ?"; }
  else if (op === "mul") { a = 2 + rnd(11); b = 2 + rnd(11); ans = a * b; sum = a + " \\u00d7 " + b + " = ?"; }
  else { b = 2 + rnd(11); ans = 2 + rnd(11); a = b * ans; sum = a + " \\u00f7 " + b + " = ?"; }
  return { q: sum, a: String(ans), numeric: true };
}
function wrongOnes(answer, numeric, pool) {
  var out = [], used = {}, i;
  used[String(answer)] = true;
  if (numeric) {
    var v = Number(answer), span = Math.max(3, Math.round(Math.abs(v) * 0.25) + 3);
    while (out.length < 3) {
      var d = v + (rnd(2) ? 1 : -1) * (1 + rnd(span));
      if (d < 0) d = Math.abs(d) + 1;
      if (used[String(d)]) continue;
      used[String(d)] = true; out.push(String(d));
    }
    return out;
  }
  for (i = 0; i < pool.length && out.length < 3; i++) {
    if (!used[pool[i]]) { used[pool[i]] = true; out.push(pool[i]); }
  }
  var filler = ["Not sure", "None of these", "Pass"];
  for (i = 0; i < filler.length && out.length < 3; i++) {
    if (!used[filler[i]]) { used[filler[i]] = true; out.push(filler[i]); }
  }
  return out;
}
function buildDeck() {
  deck = []; idx = 0; score = 0; locked = false;
  var pool = BANK.map(function (e) { return e[1]; });
  if (MODE === "math") {
    for (var n = 0; n < 10; n++) {
      var item = mathQuestion(n >= 6);
      item.choices = shuffle([item.a].concat(wrongOnes(item.a, true, pool)));
      deck.push(item);
    }
    return;
  }
  shuffle(BANK.slice()).slice(0, 10).forEach(function (e) {
    deck.push({ q: e[0], a: e[1], numeric: false, choices: shuffle([e[1]].concat(wrongOnes(e[1], false, pool))) });
  });
}
function setProgress(extra) {
  $("progress").textContent = extra || ("Question " + (idx + 1) + " of " + deck.length + " \\u00b7 Score " + score);
}
function render() {
  $("qTitle").textContent = TOPIC;
  var q = deck[idx];
  var box = $("choices");
  box.innerHTML = "";
  $("feedback").textContent = "";
  $("next").hidden = true;
  $("again").hidden = true;
  locked = false;
  if (!q) {
    $("question").textContent = "No questions yet \\u2014 add your first one below.";
    $("progress").textContent = "Empty deck";
    return;
  }
  setProgress();
  $("question").textContent = q.q;
  q.choices.forEach(function (choice) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "choice";
    b.textContent = choice;
    b.onclick = function () { pick(b, choice); };
    box.appendChild(b);
  });
}
function pick(btn, choice) {
  if (locked) return;
  locked = true;
  var q = deck[idx];
  var right = String(choice) === String(q.a);
  Array.prototype.forEach.call(document.querySelectorAll(".choice"), function (el) {
    if (el.textContent === String(q.a)) el.classList.add("right");
    else if (el === btn) el.classList.add("wrong");
  });
  if (right) { score++; $("feedback").textContent = "Correct."; }
  else { $("feedback").textContent = "Not quite \\u2014 the answer is " + q.a + "."; }
  setProgress();
  if (idx < deck.length - 1) {
    var next = $("next");
    next.hidden = false;
    next.textContent = "Next question";
  } else {
    finish();
  }
}
function finish() {
  $("choices").innerHTML = "";
  $("feedback").textContent = "";
  $("next").hidden = true;
  $("question").textContent = "You scored " + score + " out of " + deck.length + ".";
  $("progress").textContent = "Finished \\u00b7 Score " + score + " / " + deck.length;
  var again = $("again");
  again.hidden = false;
  again.textContent = "Play again";
}
$("next").onclick = function () { idx++; render(); };
$("again").onclick = function () {
  buildDeck();
  if (!deck.length) { render(); return; }
  render();
};
$("addQ").onclick = function () {
  var q = $("newQ").value.trim(), a = $("newA").value.trim();
  if (!q || !a) return;
  BANK.push([q, a]);
  if (MODE === "math" || !deck.length) { MODE = "bank"; buildDeck(); }
  $("newQ").value = ""; $("newA").value = "";
  render();
};
buildDeck();
render();
`;
      const body = `<h1 id="qTitle">${heading}</h1><p class="sub" id="progress"></p>
  <div class="card"><p id="question" style="font-size:20px;font-weight:600;line-height:1.35;margin:0 0 14px">Ready?</p>
    <div class="choices" id="choices"></div>
    <p class="feedback" id="feedback"></p></div>
  <div class="row" style="margin-top:12px"><button class="btn" id="next" type="button" hidden>Next</button><button class="btn" id="again" type="button" hidden>Play again</button></div>
  <div class="card" style="margin-top:14px">
    <p style="margin:0 0 8px;font-size:13px;color:#8a91a6">Add a question</p>
    <input id="newQ" placeholder="Question"><input id="newA" placeholder="Correct answer" style="margin-top:8px">
    <button class="btn" id="addQ" type="button" style="margin-top:8px">Add question</button>
  </div>`;
      const css = `.choices{display:grid;gap:8px}
.choice{text-align:left;padding:11px 13px;border-radius:11px;border:1px solid rgba(255,255,255,.12);
  background:#0a0d15;color:#eef1f6;cursor:pointer;font:inherit}
.choice:hover{border-color:var(--accent)}
.choice.right{border-color:#b8ff3d;background:rgba(184,255,61,.14)}
.choice.wrong{border-color:#ff6b6b;background:rgba(255,107,107,.12)}
.feedback{min-height:18px;font-size:12.5px;color:#8a91a6;margin:10px 0 0}`;
      return page(heading, "#b8ff3d", css, body, script);
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
