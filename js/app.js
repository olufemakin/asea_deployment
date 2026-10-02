/* =============================================================================
   BSP AI WorkReady · Interview IQ — UI: hash router, navigation and screens.
   Screens rebuild #app from template strings; escape all user text with H().
   ========================================================================== */
"use strict";

const BRAND = { line:"BSP AI WorkReady", name:"Interview IQ", product:"AI Interview Lab", community:"Business Startup Powerhouse" };
const el = document.getElementById("app");
const H = s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtDate = t=>{ try{ return new Date(t).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"}); }catch(e){ return ""; } };

const DEFAULT_SETUP = { step:1, professionId:null, mode:Speech.sttAvailable?"voice":"text", type:"ai_domain",
  level:"experienced", difficulty:"adaptive", length:"standard", name:"", platform:"" };
const App = { setup:null, session:null, ui:{ search:"", group:"all", customOpen:false }, practice:{}, closing:null };

function loadSetup(){
  const saved = Repo.prefs.get().setup || {};
  App.setup = Object.assign({}, DEFAULT_SETUP, saved, { step:1 });
  normalizeSetup();
}
function saveSetup(){ const { step, ...rest } = App.setup; Repo.prefs.set({ setup:rest }); }
function normalizeSetup(){
  const S=App.setup;
  if(S.professionId && !getProfession(S.professionId)) S.professionId=null;
  if(!MODES[S.mode]) S.mode=DEFAULT_SETUP.mode;
  if(!TYPES[S.type]) S.type="ai_domain";
  if(!LEVELS[S.level]) S.level="experienced";
  if(!DIFFS[S.difficulty]) S.difficulty="adaptive";
  if(!LENGTHS[S.length]) S.length="standard";
  const p=S.professionId && getProfession(S.professionId);
  if(p && !typeAvailability(p)[S.type].ok) S.type=recommendedType(p);
}

/* ---------- Router -------------------------------------------------------- */
const ROUTES = [
  [/^$/, scrHome],
  [/^interview$/, scrInterviewHub],
  [/^interview\/start$/, scrSetup],
  [/^interview\/alex$/, scrAlex],
  [/^interview\/domain$/, scrDomainLanding],
  [/^interview\/ai-evaluation$/, scrAiEvalLanding],
  [/^interview\/history$/, scrHistory],
  [/^interview\/session$/, scrSession],
  [/^practice$/, scrPractice],
  [/^practice\/task\/([\w-]+)$/, scrPracticeTask],
  [/^practice\/history$/, scrPracticeHistory],
  [/^results$/, scrResults],
  [/^results\/([\w-]+)$/, scrReport],
  [/^progress$/, scrReadiness],
  [/^progress\/skills$/, scrSkills],
  [/^progress\/activity$/, scrActivity],
  [/^about$/, scrAbout],
];
let currentPath = null;
function pathNow(){ return location.hash.replace(/^#\/?/,"").split("?")[0].replace(/\/+$/,""); }
function go(path){ const h="#/"+String(path).replace(/^\//,""); if(location.hash===h) route(); else location.hash=h; }
function route(){
  const path=pathNow();
  if(currentPath==="interview/session" && path!=="interview/session") leaveInterview();
  currentPath=path;
  let fn=null, m=null;
  for(const [re,f] of ROUTES){ m=path.match(re); if(m){ fn=f; break; } }
  if(!fn){ go(""); return; }
  closeMenus();
  try{ fn(...m.slice(1)); }
  catch(e){ console.error(e); el.innerHTML=emptyCard("⚠️","Something went wrong","This page couldn't load. Your saved data is safe.","#/","Back to home"); }
  markNav(path);
  window.scrollTo(0,0);
}

/* ---------- Navigation ---------------------------------------------------- */
function initNav(){
  document.addEventListener("click", e=>{
    const b=e.target.closest(".ddbtn");
    if(b){ const dd=b.parentElement, open=!dd.classList.contains("open"); closeMenus(true); dd.classList.toggle("open",open); b.setAttribute("aria-expanded",open); return; }
    if(e.target.closest("#navToggle")){ const n=document.getElementById("mainNav"), open=!n.classList.contains("open");
      n.classList.toggle("open",open); document.getElementById("navToggle").setAttribute("aria-expanded",open); return; }
    if(!e.target.closest(".dd")) closeMenus(true);
  });
  document.addEventListener("keydown", e=>{ if(e.key==="Escape") closeMenus(); });
}
function closeMenus(keepPanel){
  document.querySelectorAll(".dd.open").forEach(d=>{ d.classList.remove("open"); const b=d.querySelector(".ddbtn"); if(b) b.setAttribute("aria-expanded","false"); });
  if(!keepPanel){ const n=document.getElementById("mainNav"); if(n) n.classList.remove("open"); const t=document.getElementById("navToggle"); if(t) t.setAttribute("aria-expanded","false"); }
}
function markNav(path){
  const top=path.split("/")[0]||"home";
  document.querySelectorAll("#mainNav [data-nav]").forEach(n=>n.classList.toggle("active", n.dataset.nav===top));
  document.querySelectorAll("#mainNav a[href]").forEach(a=>a.classList.toggle("active", a.getAttribute("href")==="#/"+path));
}

/* ---------- Shared bits --------------------------------------------------- */
function pageHead(kicker, title, sub){ return `<div class="pagehead"><span class="kicker">${kicker}</span><h1>${title}</h1>${sub?`<p class="lead">${sub}</p>`:""}</div>`; }
function alexBlock(){ return `<div class="alexrow"><div class="alexav" aria-hidden="true">A</div><div><div class="alexname">ALEX</div><div class="alextitle">${ALEX.title}</div><div class="alexsub">${ALEX.subtitle}</div></div></div>`; }
function emptyCard(icon, title, text, href, label){
  return `<div class="card empty"><div class="ic">${icon}</div><h2>${title}</h2><p class="muted">${text}</p>${href?`<a class="btn primary" href="${href}">${label}</a>`:""}</div>`;
}
function barColor(v){ return v>=78?"var(--good)":v>=55?"var(--ok)":"var(--bad)"; }
function barRow(name, v, sub){
  return `<div class="dim"><div class="between row"><span class="small"><b>${H(name)}</b>${sub?` <span class="faint">${sub}</span>`:""}</span><span class="small muted">${v}/100</span></div><div class="bar"><i style="width:${v}%;background:${barColor(v)}"></i></div></div>`;
}
function statusBadge(s){
  return ({ in_progress:`<span class="badge info">In progress</span>`, completed:`<span class="badge good">Completed</span>`,
    abandoned:`<span class="badge ok">Ended early</span>`, not_started:`<span class="badge">Not started</span>` })[s.status] || "";
}
function scoreBadge(v){ const [k,l]=band(v); return `<span class="badge ${k}">${v}/100 · ${l}</span>`; }
function sessionTitle(s){ return `${H(s.profession.title)} · ${H(sessionTypeLabel(s))}`; }
function tabs(items, cur){ return `<nav class="tabs" aria-label="Section">${items.map(([href,l])=>`<a href="${href}" class="${href===cur?"active":""}">${l}</a>`).join("")}</nav>`; }

/* ---------- Home ---------------------------------------------------------- */
function scrHome(){
  const active=Repo.sessions.inProgress()[0], last=Repo.sessions.withReports()[0];
  const side = active ? `
      <h3>Continue where you left off</h3>
      <p><b>${sessionTitle(active)}</b><br><span class="small faint">Question ${active.currentQuestion+1} · started ${H(fmtDate(active.startedAt))}</span></p>
      <button class="btn primary" onclick="resumeSession('${active.sessionId}')">Resume interview →</button>`
    : last ? `
      <h3>Your latest result</h3>
      <div class="row center" style="gap:16px;margin-bottom:12px"><div class="scorebig" style="font-size:40px">${reportOf(last).scores.overall}</div>
      <div><b>${sessionTitle(last)}</b><div class="small faint">${H(fmtDate(last.completedAt||last.startedAt))}</div></div></div>
      <div class="row wrapw" style="gap:10px"><a class="btn" href="#/results/${last.sessionId}">View report</a><a class="btn ghost" href="#/progress">See progress</a></div>`
    : `
      <h3>Guest mode</h3>
      <p class="muted">No sign-up needed. Start an interview, finish it, and get your report straight away. Your history, practice and preferences are saved in this browser.</p>
      <a class="btn" href="#/about">How it works</a>`;
  el.innerHTML=`
  <section class="card hero">
    <div class="brandline">${BRAND.line}</div>
    <div class="product">${BRAND.name}</div>
    <h1>Practice realistic AI-led interviews</h1>
    <p class="lead">Practice professional, domain-expert and AI-evaluation interviews with Alex, your BSP AI interviewer.</p>
    <div class="ctas">
      <a class="btn primary lg upper" href="#/interview/start">Start interview</a>
      <a class="btn lg upper" href="#/practice">Practice AI tasks</a>
    </div>
    <div class="feat">
      <span>🎙️ Voice Interviews</span><span>⌨️ Text Interviews</span><span>🧑‍💼 Domain Expert Interviews</span>
      <span>🤖 AI Evaluation Interviews</span><span>🔀 Adaptive Follow-Ups</span><span>📊 Detailed Feedback</span>
    </div>
  </section>
  <div class="grid g2" style="margin-top:18px">
    <div class="card">${alexBlock()}
      <p class="muted" style="margin:14px 0">Alex runs every interview: calm, neutral and focused on your reasoning. Follow-up questions depend on your answers, just like a real AI-led screen.</p>
      <a href="#/interview/alex">Meet Alex →</a></div>
    <div class="card">${side}</div>
  </div>
  ${!Speech.sttAvailable?`<p class="note">This browser can't transcribe speech, so you'll type your answers (Alex can still speak). For full voice, use Chrome or Edge on desktop or Android.</p>`:""}`;
}

/* ---------- Interview hub & landings -------------------------------------- */
function scrInterviewHub(){
  const active=Repo.sessions.inProgress()[0];
  const cards=[
    ["#/interview/start","🚀","Start Interview","Choose your profession, mode and interview type, then begin."],
    ["#/interview/alex","🧑‍💼","Interview With Alex","Meet your BSP AI interviewer and see how Alex runs a session."],
    ["#/interview/domain","🎯","Domain Expert Interview","Test the depth of your professional expertise."],
    ["#/interview/ai-evaluation","🤖","AI Evaluation Interview","Show you can review and rate AI-generated work."],
    ["#/interview/history","🗂️","Interview History","Resume, review or delete past interviews."],
  ];
  el.innerHTML = pageHead("Interview","Interview Lab","Realistic, adaptive interviews with Alex across more than 140 professions.")
    + (active?`<div class="card" style="margin-bottom:18px"><div class="row between center wrapw"><div><h3 style="margin:0 0 4px">Interview in progress</h3><b>${sessionTitle(active)}</b></div><button class="btn primary" onclick="resumeSession('${active.sessionId}')">Resume →</button></div></div>`:"")
    + `<div class="grid g3">${cards.map(([h,i,t,d])=>`<a class="card linkcard" href="${h}"><div class="ic">${i}</div><div class="t">${t}</div><div class="d">${d}</div></a>`).join("")}</div>`;
}
function scrAlex(){
  const sample=ALEX.intro({ name:"", profession:"Project Manager", typeIntro:TYPES.ai_domain.intro });
  el.innerHTML = pageHead("Interview With Alex","Meet Alex, your BSP AI Interviewer","")
  + `<div class="grid g2">
    <div class="card">${alexBlock()}
      <h3 style="margin-top:22px">How Alex interviews</h3>
      <ul class="clean">
        <li>Professional, calm and clear: one question at a time.</li>
        <li>Neutral during the interview: no "great answer!" praise to skew your sense of performance.</li>
        <li>Adaptive: strong answers lead to deeper follow-ups; vague answers get a request to clarify.</li>
        <li>Explores competencies you haven't demonstrated yet, rather than repeating what you've shown.</li>
        <li>Saves detailed, honest feedback for your report.</li>
      </ul></div>
    <div class="card"><h3>How Alex opens every interview</h3>
      <div class="quote">${sample.map(l=>`<p>${H(l)}</p>`).join("")}</div>
      <h3 style="margin-top:20px">Typical follow-ups</h3>
      <ul class="clean small muted"><li>"Walk me through your reasoning."</li><li>"What evidence supports that conclusion?"</li><li>"What would cause you to change your decision?"</li><li>"Let's look at that from an AI-evaluation perspective."</li></ul>
    </div></div>
  <div class="card" style="margin-top:18px"><div class="row between center wrapw"><p class="muted" style="margin:0">Ready? Choose a profession and Alex will tailor the interview to it.</p>
    <a class="btn primary upper" href="#/interview/start">Start interview with Alex</a></div></div>`;
}
function landing(kicker, title, sub, options){
  el.innerHTML = pageHead(kicker, title, sub) + `<div class="grid g2">${options.map(o=>`
    <div class="card"><span class="pill">${o.tag}</span><h2 style="margin-top:12px">${o.title}</h2><p class="muted">${o.d}</p>
      <ul class="clean small">${o.points.map(x=>`<li>${x}</li>`).join("")}</ul>
      <button class="btn primary" style="margin-top:12px" onclick="presetType('${o.type}')">${o.cta}</button></div>`).join("")}</div>`;
}
function scrDomainLanding(){
  landing("Domain Expert Interview","Prove your professional expertise","Alex uses your profession's competency model to probe knowledge, judgment and real-world scenarios.",[
    { type:"domain", tag:"Profession-specific", title:TYPES.domain.label, d:TYPES.domain.d, cta:"Set up Domain Expert Interview",
      points:["Professional knowledge questions","Scenario reasoning and judgment","Behavioral questions about your experience"] },
    { type:"ai_domain", tag:"Recommended", title:TYPES.ai_domain.label, d:TYPES.ai_domain.d, cta:"Set up AI Domain Expert Interview",
      points:["Everything in a domain interview","Reviewing AI-generated work from your field","Spotting confident but wrong answers"] },
  ]);
}
function scrAiEvalLanding(){
  landing("AI Evaluation Interview","Show you can evaluate AI-generated work","These interviews test the skills AI-training and evaluation roles screen for.",[
    { type:"ai_readiness", tag:"Any profession", title:TYPES.ai_readiness.label, d:TYPES.ai_readiness.d, cta:"Set up AI Training Readiness",
      points:["Instruction following and rubric consistency","Fact checking and error detection","Comparing and rating AI responses"] },
    { type:"ai_domain", tag:"Field expertise + AI", title:TYPES.ai_domain.label, d:TYPES.ai_domain.d, cta:"Set up AI Domain Expert Interview",
      points:["AI output evaluation in your own field","Error detection with domain context","Professional judgment"] },
  ]);
}
function presetType(t){
  App.setup.type=t; normalizeSetup();
  App.setup.step = App.setup.professionId ? 3 : 1;
  saveSetup(); go("interview/start");
}

/* ---------- Setup wizard -------------------------------------------------- */
const STEPS=["Profession","Mode","Interview Type","Experience","Difficulty","Length","Summary"];
function scrSetup(){
  normalizeSetup();
  el.innerHTML = pageHead("Interview setup","Set up your interview with Alex","")
    + `<div class="card"><div class="stepper" id="stepper"></div><div id="stepBody"></div></div>`;
  renderStep();
}
function renderStep(){
  const S=App.setup, p=S.professionId?getProfession(S.professionId):null;
  document.getElementById("stepper").innerHTML = STEPS.map((n,i)=>`<button class="step ${i+1===S.step?"cur":i+1<S.step?"done":""}" onclick="setStep(${i+1})" ${!p&&i>0?"disabled":""} aria-current="${i+1===S.step?"step":"false"}"><span class="n">${i+1<S.step?"✓":i+1}</span>${n}</button>`).join("");
  const body=document.getElementById("stepBody");
  body.innerHTML = [null,stepProfession,stepMode,stepType,stepLevel,stepDifficulty,stepLength,stepSummary][S.step](p);
  if(S.step===1){ const sr=document.getElementById("profSearch"); if(sr && App.ui.focusSearch){ sr.focus(); App.ui.focusSearch=false; } }
}
function setStep(n){ const S=App.setup; if(n>1 && !S.professionId) return; S.step=Math.max(1,Math.min(7,n)); saveSetup(); renderStep(); document.getElementById("stepper").scrollIntoView({block:"nearest"}); }
function wizFoot(canNext, nextLabel){
  const S=App.setup;
  return `<div class="wizfoot">${S.step>1?`<button class="btn ghost" onclick="setStep(${S.step-1})">← Back</button>`:`<a class="btn ghost" href="#/interview">← Interview Lab</a>`}
    ${S.step<7?`<button class="btn primary" onclick="setStep(${S.step+1})" ${canNext?"":"disabled"}>${nextLabel||"Continue →"}</button>`:""}</div>`;
}
function setField(k, v){ App.setup[k]=v; normalizeSetup(); saveSetup(); renderStep(); }
function optCard(o){
  return `<button class="opt ${o.sel?"sel":""}" ${o.disabled?"disabled":""} onclick="${o.onclick}" aria-pressed="${!!o.sel}">
    ${o.tag?`<span class="tag">${o.tag}</span>`:""}<div class="t">${o.title}</div>${o.d?`<div class="d">${o.d}</div>`:""}${o.why?`<div class="why">${o.why}</div>`:""}</button>`;
}

/* Step 1 — profession */
function stepProfession(p){
  return `<h2>Step 1 · Choose your profession</h2>
    ${p?`<div class="selected">✓ Selected: <b>${H(p.title)}</b> <span class="faint">· ${H(groupOf(p).label)}</span></div>`:""}
    <div class="search"><input id="profSearch" type="search" autocomplete="off" placeholder="Search nurse, accountant, teacher, engineer..." aria-label="Search professions" value="${H(App.ui.search)}" oninput="onProfSearch(this.value)"></div>
    <div class="chips" id="groupChips">${groupChipsHTML()}</div>
    <div class="proflist" id="profList">${profListHTML()}</div>
    <div class="custombox" id="customBox">${customHTML()}</div>
    ${wizFoot(!!p)}`;
}
function groupChipsHTML(){
  const gs=[{id:"all",label:"All"}].concat(Repo.customProfessions.all().length?[CUSTOM_GROUP]:[], GROUPS);
  return gs.map(g=>`<button class="chip ${App.ui.group===g.id?"sel":""}" onclick="setGroupFilter('${g.id}')">${g.icon?g.icon+" ":""}${H(g.label)}</button>`).join("");
}
function profMatches(p, q){
  if(!q) return true;
  const hay=(p.title+" "+(p.kw||"")+" "+groupOf(p).label).toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(t=>hay.includes(t));
}
function profListHTML(){
  const q=App.ui.search.trim(), sel=App.setup.professionId;
  const list=allProfessions().filter(p=>(App.ui.group==="all"||groupOf(p).id===App.ui.group) && profMatches(p,q));
  if(!list.length) return `<p class="muted" style="margin:14px 0">No professions match "<b>${H(q)}</b>". You can add it below as a custom profession.</p>`;
  const groups=[CUSTOM_GROUP].concat(GROUPS).map(g=>({ g, items:list.filter(p=>groupOf(p).id===g.id) })).filter(x=>x.items.length);
  return `<div class="small faint">${list.length} profession${list.length===1?"":"s"}</div>` + groups.map(({g,items})=>`
    <div class="pgroup"><h4>${g.icon} ${H(g.label)}</h4><div class="pchips">${items.map(p=>`
      <button class="pchip ${sel===p.id?"sel":""}" onclick="pickProfession('${p.id}')" aria-pressed="${sel===p.id}">${H(p.title)}${p.custom?`<span class="x" role="button" title="Remove" aria-label="Remove ${H(p.title)}" onclick="event.stopPropagation();removeCustom('${p.id}')">×</span>`:""}</button>`).join("")}
    </div></div>`).join("");
}
function onProfSearch(v){ App.ui.search=v; document.getElementById("profList").innerHTML=profListHTML(); }
function setGroupFilter(g){ App.ui.group=g; document.getElementById("groupChips").innerHTML=groupChipsHTML(); document.getElementById("profList").innerHTML=profListHTML(); }
function pickProfession(id){
  const list=document.getElementById("profList"), top=list?list.scrollTop:0;
  App.setup.professionId=id; normalizeSetup(); saveSetup(); renderStep();
  const l2=document.getElementById("profList"); if(l2) l2.scrollTop=top;
}
function removeCustom(id){
  const p=getProfession(id); if(!p || !confirm(`Remove your custom profession "${p.title}"?`)) return;
  Repo.customProfessions.remove(id); if(App.setup.professionId===id) App.setup.professionId=null;
  if(App.ui.group==="custom" && !Repo.customProfessions.all().length) App.ui.group="all";
  saveSetup(); renderStep();
}
function customHTML(){
  if(!App.ui.customOpen) return `<div class="row between center wrapw"><div><h3 style="margin:0 0 4px">Can't find your profession?</h3>
    <div class="small muted">Create a private interview profile from your own role. It stays in this browser and is never published.</div></div>
    <button class="btn" onclick="toggleCustom(true)">＋ Add My Profession</button></div>`;
  const yrs=["","Less than 1 year","1–3 years","3–5 years","5–10 years","10+ years"];
  return `<h3>Add my profession</h3>
    <div class="grid g2">
      <div><label class="fld" for="cpTitle">Job title <span class="req">*</span></label><input id="cpTitle" maxlength="80" placeholder="e.g. Veterinary Technician"></div>
      <div><label class="fld" for="cpIndustry">Industry</label><input id="cpIndustry" maxlength="80" placeholder="e.g. Animal health"></div>
      <div><label class="fld" for="cpYears">Years of experience</label><select id="cpYears">${yrs.map(y=>`<option value="${y}">${y||"Select…"}</option>`).join("")}</select></div>
      <div><label class="fld" for="cpEdu">Education</label><input id="cpEdu" maxlength="120" placeholder="e.g. Diploma in Veterinary Nursing"></div>
    </div>
    <div class="field"><label class="fld" for="cpResp">Main responsibilities <span class="req">*</span> <span class="faint">(one per line or comma-separated)</span></label>
      <textarea id="cpResp" style="min-height:90px" placeholder="e.g. Monitoring anaesthesia, Preparing surgical equipment, Client education"></textarea></div>
    <div class="field"><label class="fld" for="cpSkills">Skills</label><input id="cpSkills" maxlength="300" placeholder="e.g. Sterile technique, Record keeping"></div>
    <div class="field"><label class="fld" for="cpCred">Credentials (if relevant)</label><input id="cpCred" maxlength="160" placeholder="e.g. Registered Veterinary Technician"></div>
    <div class="field"><label class="check"><input type="checkbox" id="cpTransferable"> This is a hands-on or service role. Use a Transferable Skills Interview instead of a profession-specific AI interview.</label></div>
    <div id="cpErr" class="small" style="color:#ffb4b4;margin-top:10px" role="alert"></div>
    <div class="row wrapw" style="margin-top:14px;gap:10px"><button class="btn primary" onclick="saveCustom()">Create my interview profile</button><button class="btn ghost" onclick="toggleCustom(false)">Cancel</button></div>`;
}
function toggleCustom(open){ App.ui.customOpen=open; document.getElementById("customBox").innerHTML=customHTML(); if(open){ const t=document.getElementById("cpTitle"); if(t) t.focus(); } }
function saveCustom(){
  const v=id=>(document.getElementById(id)||{}).value||"";
  const f={ title:v("cpTitle").trim(), industry:v("cpIndustry").trim(), years:v("cpYears"), responsibilities:v("cpResp").trim(),
    skills:v("cpSkills").trim(), education:v("cpEdu").trim(), credentials:v("cpCred").trim(), transferable:document.getElementById("cpTransferable").checked };
  const err=document.getElementById("cpErr");
  if(f.title.length<2){ err.textContent="Please enter your job title."; return; }
  if(f.responsibilities.length<4){ err.textContent="Please list at least one main responsibility. Alex builds your questions from them."; return; }
  const p=buildCustomProfession(f);
  Repo.customProfessions.save(p);
  App.ui.customOpen=false; App.ui.search=""; App.ui.group="all";
  App.setup.professionId=p.id; normalizeSetup(); saveSetup(); renderStep();
}

/* Steps 2–6 */
function stepMode(p){
  const S=App.setup;
  return `<h2>Step 2 · Choose interview mode</h2><p class="muted">Interviewing for <b>${H(p.title)}</b>.</p>
    <div class="opts">${Object.entries(MODES).map(([k,m])=>optCard({ sel:S.mode===k, onclick:`setField('mode','${k}')`, title:`${m.icon} ${m.label.toUpperCase()}`, d:m.d,
      why: k==="voice" && !Speech.sttAvailable ? "This browser can't transcribe speech. Alex will still speak, and you'll type your answers." : k==="voice" && !Speech.ttsAvailable ? "Speech output isn't available here; questions will appear as text." : "" })).join("")}</div>
    ${wizFoot(true)}`;
}
function stepType(p){
  const S=App.setup, av=typeAvailability(p), rec=recommendedType(p);
  return `<h2>Step 3 · Choose interview type</h2>
    ${isTransferable(p)?`<p class="muted">For transferable-skills roles, Alex runs a <b>Transferable Skills Interview</b> focused on attention to detail, process adherence, quality review and instruction following. No profession-specific AI job is invented.</p>`:""}
    <div class="opts">${Object.entries(TYPES).map(([k,t])=>optCard({ sel:S.type===k, disabled:!av[k].ok, onclick:`setField('type','${k}')`,
      title:t.label.toUpperCase(), d:t.d, why:av[k].ok?"":av[k].why, tag:k===rec&&av[k].ok?"Recommended":"" })).join("")}</div>
    ${wizFoot(true)}`;
}
function stepLevel(){
  const S=App.setup;
  return `<h2>Step 4 · Experience level</h2><p class="muted">Question depth and the expected length of answers change with your level.</p>
    <div class="opts">${Object.entries(LEVELS).map(([k,l])=>optCard({ sel:S.level===k, onclick:`setField('level','${k}')`, title:l.label, d:l.d })).join("")}</div>
    ${wizFoot(true)}`;
}
function stepDifficulty(){
  const S=App.setup;
  return `<h2>Step 5 · Difficulty</h2>
    <div class="opts">${Object.entries(DIFFS).map(([k,d])=>optCard({ sel:S.difficulty===k, onclick:`setField('difficulty','${k}')`, title:d.label, d:d.d, tag:k==="adaptive"?"Recommended":"" })).join("")}</div>
    <p class="note">Adaptive: strong answers lead to deeper follow-ups and more complex scenarios; weak or vague answers lead to clarification; competencies you haven't shown yet get explored. Difficulty never rises mechanically after every answer.</p>
    ${wizFoot(true)}`;
}
function stepLength(){
  const S=App.setup;
  return `<h2>Step 6 · Interview length</h2>
    <div class="opts">${Object.entries(LENGTHS).map(([k,l])=>optCard({ sel:S.length===k, onclick:`setField('length','${k}')`, title:l.label.toUpperCase(),
      d:`${l.d} · ≈ ${k==="deep"?"30–50":Math.round(l.n*2.5)} min`, tag:k==="standard"?"Default":"" })).join("")}</div>
    ${wizFoot(true,"Review summary →")}`;
}
function stepSummary(p){
  const S=App.setup, L=LENGTHS[S.length];
  const rows=[["Profession",H(p.title),1],["Interviewer","Alex · BSP AI Interviewer",0],["Mode",MODES[S.mode].label,2],["Interview",TYPES[S.type].label.replace(/ Interview$/,""),3],
    ["Experience",LEVELS[S.level].label,4],["Difficulty",DIFFS[S.difficulty].label,5],["Questions",S.length==="deep"?`${L.min}–${L.max} (adaptive)`:L.n,6]];
  return `<h2 style="text-transform:uppercase;letter-spacing:1px">Your interview</h2>
    <table class="summary">${rows.map(([k,v,st])=>`<tr><td>${k}</td><td>${v}${st?` <button class="linkbtn small" onclick="setStep(${st})" aria-label="Edit ${k}">edit</button>`:""}</td></tr>`).join("")}</table>
    <div class="grid g2" style="margin-top:18px">
      <div><label class="fld" for="candName">Your first name (optional)</label><input id="candName" maxlength="40" placeholder="So Alex can greet you" value="${H(S.name)}" oninput="App.setup.name=this.value;saveSetup()"></div>
      <div><label class="fld" for="candPlat">Preparing for (optional)</label><select id="candPlat" onchange="App.setup.platform=this.value;saveSetup()">
        ${[["","General practice"],["ai-training","AI training / evaluation work"],["job","A job interview"],["other","Something else"]].map(([v,l])=>`<option value="${v}" ${S.platform===v?"selected":""}>${l}</option>`).join("")}</select></div>
    </div>
    <div class="row wrapw" style="margin-top:22px;gap:10px;justify-content:space-between">
      <button class="btn ghost" onclick="setStep(6)">← Back</button>
      <button class="btn primary lg upper" onclick="startFromSetup()">Start interview with Alex</button>
    </div>
    ${S.mode==="voice"&&Speech.sttAvailable?`<p class="note">Your browser will ask for microphone permission when you start answering. Audio is processed by your browser's speech service; Interview IQ never uploads or stores audio.</p>`:""}`;
}
function startFromSetup(){
  const S=App.setup; if(!S.professionId){ setStep(1); return; }
  const s=createSession({ professionId:S.professionId, mode:S.mode, type:S.type, level:S.level, difficulty:S.difficulty, length:S.length, name:S.name, platform:S.platform });
  startSession(s); App.session=s; Repo.prefs.set({ activeSessionId:s.sessionId });
  go("interview/session");
}
function resumeSession(id){
  const s=Repo.sessions.get(id); if(!s || s.status!=="in_progress"){ go("interview/history"); return; }
  App.session=s; Repo.prefs.set({ activeSessionId:id }); go("interview/session");
}

/* ---------- Live interview ------------------------------------------------ */
let recog=null, listening=false, finalText="", interimText="", tick=null, elapsed=0, renderToken=0;
function activeSession(){
  if(App.session && App.session.status==="in_progress") return App.session;
  const id=Repo.prefs.get().activeSessionId, s=id && Repo.sessions.get(id);
  if(s && s.status==="in_progress"){ App.session=s; return s; }
  return null;
}
function scrSession(){
  const s=activeSession();
  if(!s){ el.innerHTML=emptyCard("🎙️","No interview in progress","Set up a new interview with Alex, or resume one from your history.","#/interview/start","Start interview"); return; }
  renderInterview(s);
}
function speechPlan(s){
  const q=currentQ(s), lead=q.scenario?["Here is the example on your screen."]:[];
  if(s.phase==="followup" && s.pending && s.pending.followUp){ const f=s.pending.followUp; return { display:[f.lead], spoken:[f.lead, f.question] }; }
  if(s.currentQuestion===0 && !s.answers.length){
    const intro=ALEX.intro({ name:s.candidate.name, profession:s.profession.title, typeIntro:TYPES[s.interviewType].intro });
    return { display:intro, spoken:intro.concat(lead, q.questionText) };
  }
  const t=s.lastTransition?[s.lastTransition]:[];
  return { display:t, spoken:t.concat(lead, q.questionText) };
}
function renderInterview(s){
  const q=currentQ(s), T=TYPES[s.interviewType], L=LENGTHS[s.length], plan=speechPlan(s);
  const fu=s.phase==="followup" && s.pending ? s.pending.followUp : null;
  const denom = s.length==="deep" ? L.min : s.questionTarget;
  const pct=Math.min(100, Math.round(s.answers.length/denom*100));
  const total = s.length==="deep" ? `${L.min}–${L.max}` : s.questionTarget;
  const listen = s.mode==="voice" && Speech.sttAvailable, talk = s.mode==="voice" && Speech.ttsAvailable;
  const t=s.adaptive.target;
  el.innerHTML=`
  <div class="card">
    <div class="row between center small muted wrapw"><span>${H(s.profession.title)} · ${H(T.label)} · ${H(LEVELS[s.experienceLevel].label)}</span><span class="timer" id="timer" aria-label="Time on this question">0:00</span></div>
    <div class="progress" style="margin:10px 0 4px" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
    <div class="small faint">Question ${s.currentQuestion+1} of ${total}${s.difficulty==="adaptive"?` · Adaptive depth <span title="Current depth ${t} of 3">${"●".repeat(t)}${"○".repeat(3-t)}</span>`:` · ${H(DIFFS[s.difficulty].label)}`}</div>
    <div class="stage">
      <div class="orb" id="orb" aria-hidden="true"><span class="face">A</span></div>
      <div class="eq" id="eq" style="visibility:hidden" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
      <div class="alexname" style="font-size:15px;margin-top:4px">ALEX</div><div class="alextitle">${ALEX.title}</div>
      <div class="status" id="status" role="status" style="margin-top:8px">Preparing…</div>
    </div>
    ${plan.display.length?`<div class="alexsay"><span class="who">Alex</span>${plan.display.map(l=>`<p>${H(l)}</p>`).join("")}</div>`:""}
    <div class="qbox">
      <div class="qmeta">Alex asks · ${H(QTYPE_LABEL[q.questionType]||"Question")} · ${H(q.compLabel)}</div>
      ${q.scenario?`<div class="scenario ${q.code?"code":""}">${H(q.scenario)}</div>`:""}
      <div class="qtext">${H(q.questionText)}</div>
      ${fu?`<div class="followup"><span class="lbl">Follow-up</span>${H(fu.question)}</div>`:""}
    </div>
    <div id="answerArea">
      ${listen?`
        <div class="transcript empty" id="transcript" aria-live="polite">Your spoken answer will appear here…</div>
        <div class="row wrapw" style="margin-top:12px;gap:10px">
          <button class="btn good" id="micBtn" onclick="toggleMic()">🎙️ Start answering</button>
          <button class="btn ghost" onclick="repeatQ()">🔁 Repeat question</button>
          <button class="btn ghost" onclick="showTyping()">⌨️ Type instead</button>
        </div>
        <textarea id="typeBox" class="hidden" placeholder="Type your answer here…" style="margin-top:12px" aria-label="Your answer"></textarea>`
      :`
        <textarea id="typeBox" placeholder="Type your answer here…" aria-label="Your answer"></textarea>
        <div class="row wrapw" style="margin-top:8px;gap:10px">${Speech.ttsAvailable?`<button class="btn ghost sm" onclick="repeatQ(true)">🔊 Read question aloud</button>`:""}<span class="small faint" id="wc"></span></div>`}
    </div>
    <div class="row between wrapw" style="margin-top:18px;gap:10px">
      <button class="btn ghost" onclick="endInterviewEarly()">End interview</button>
      <button class="btn primary" id="nextBtn" onclick="submitCurrent()">${fu?"Submit follow-up →":"Submit answer →"}</button>
    </div>
    <div class="note">Tip: aim for ${LEVELS[s.experienceLevel].words}–${LEVELS[s.experienceLevel].words+50} words. Structure your answer, explain your reasoning and give a concrete example.</div>
  </div>`;
  finalText=""; interimText=""; elapsed=0; listening=false;
  const tb=document.getElementById("typeBox"), wc=document.getElementById("wc");
  if(tb && wc) tb.addEventListener("input", ()=>{ const n=words(tb.value).length; wc.textContent=n?`${n} words`:""; });
  const token=++renderToken;
  if(talk){
    orbMode("speaking"); setStatus("Alex is speaking…");
    Speech.say(plan.spoken).then(()=>{ if(token!==renderToken) return; if(!listening){ orbMode("idle"); setStatus(listen?"Your turn: press “Start answering”":"Your turn: type your answer"); } startTimer(); });
  } else {
    orbMode("idle"); setStatus("Your turn: type your answer"); startTimer();
    if(tb && !listen) setTimeout(()=>tb.focus({preventScroll:true}),50);
  }
}
function setStatus(t){ const s=document.getElementById("status"); if(s) s.textContent=t; }
function orbMode(m){
  const orb=document.getElementById("orb"), eq=document.getElementById("eq"); if(!orb) return;
  orb.classList.remove("speaking","listening"); if(eq) eq.style.visibility="hidden";
  if(m==="speaking") orb.classList.add("speaking");
  if(m==="listening"){ orb.classList.add("listening"); if(eq) eq.style.visibility="visible"; }
}
function repeatQ(){
  const s=App.session; if(!s) return; const q=currentQ(s);
  const f=s.phase==="followup"&&s.pending?s.pending.followUp:null;
  orbMode("speaking"); setStatus("Alex is speaking…");
  const token=renderToken;
  Speech.say(f?[f.question]:(q.scenario?["Here is the example on your screen.", q.questionText]:[q.questionText])).then(()=>{ if(token===renderToken && !listening){ orbMode("idle"); setStatus("Your turn"); } });
}
function startTimer(){
  clearInterval(tick);
  const limit=DIFFS[App.session?App.session.difficulty:"medium"].time;
  tick=setInterval(()=>{ elapsed++;
    const t=document.getElementById("timer");
    if(t){ const m=Math.floor(elapsed/60), s=String(elapsed%60).padStart(2,"0");
      t.textContent=`${m}:${s}`; t.className="timer"+(elapsed>limit?" over":elapsed>limit*0.75?" warn":""); }
  },1000);
}
function toggleMic(){ if(!listening) startMic(); else stopMic(); }
function startMic(){
  if(!Speech.SR) return;
  Speech.stop(); if(!tick) startTimer();
  recog=new Speech.SR(); recog.lang="en-US"; recog.continuous=true; recog.interimResults=true;
  recog.onresult=e=>{ interimText="";
    for(let i=e.resultIndex;i<e.results.length;i++){ const r=e.results[i];
      if(r.isFinal) finalText+=(finalText?" ":"")+r[0].transcript.trim(); else interimText+=r[0].transcript; }
    paintTranscript(); };
  recog.onend=()=>{ if(listening){ try{ recog.start(); }catch(e){} } };
  recog.onerror=e=>{ if(e.error==="not-allowed"||e.error==="service-not-allowed") micDenied(); };
  try{ recog.start(); }catch(e){}
  listening=true; orbMode("listening"); setStatus("Listening…");
  const b=document.getElementById("micBtn"); if(b){ b.textContent="⏹ Stop answering"; b.classList.remove("good"); b.classList.add("danger"); }
}
function stopMic(){
  const was=listening; listening=false; try{ recog&&recog.stop(); }catch(e){}
  if(!was) return;
  orbMode("idle"); setStatus("Answer captured: submit when ready");
  const b=document.getElementById("micBtn"); if(b){ b.textContent="🎙️ Resume answering"; b.classList.add("good"); b.classList.remove("danger"); }
}
function micDenied(){
  listening=false; orbMode("idle"); setStatus("Microphone blocked: type your answer instead");
  const ta=document.getElementById("typeBox"); if(ta){ ta.classList.remove("hidden"); ta.focus(); }
  const tr=document.getElementById("transcript"); if(tr) tr.classList.add("hidden");
  const b=document.getElementById("micBtn"); if(b) b.disabled=true;
}
function paintTranscript(){
  const tr=document.getElementById("transcript"); if(!tr) return;
  const full=(finalText+" "+interimText).trim();
  if(!full){ tr.classList.add("empty"); tr.textContent="Your spoken answer will appear here…"; return; }
  tr.classList.remove("empty"); tr.innerHTML=H(finalText)+(interimText?` <span class="interim">${H(interimText)}</span>`:"");
}
function showTyping(){ const ta=document.getElementById("typeBox"); if(ta){ ta.classList.toggle("hidden"); if(!ta.classList.contains("hidden")) ta.focus(); } }
function currentAnswerText(){
  const ta=document.getElementById("typeBox");
  const typed=ta && !ta.classList.contains("hidden") ? ta.value.trim() : "";
  return [(finalText+" "+interimText).trim(), typed].filter(Boolean).join(" ").trim();
}
function submitCurrent(){
  const s=App.session; if(!s) return;
  const ans=currentAnswerText();
  if(words(ans).length<3){ setStatus("Please give a fuller answer before submitting");
    const nb=document.getElementById("nextBtn"); if(nb){ nb.classList.add("danger"); setTimeout(()=>nb.classList.remove("danger"),1200); } return; }
  stopMic(); Speech.stop(); clearInterval(tick); tick=null;
  const res=submitAnswer(s, ans, elapsed);
  if(res.kind==="done"){ finishToReport(s); return; }
  renderInterview(s);
  window.scrollTo({top:0,behavior:"smooth"});
}
function finishToReport(s){
  Repo.prefs.set({ activeSessionId:null });
  App.closing={ id:s.sessionId, text:ALEX.closing(s.candidate.name), speak:s.mode==="voice" && Speech.ttsAvailable };
  App.session=null; go("results/"+s.sessionId);
}
function endInterviewEarly(){
  const s=App.session; if(!s) return;
  const has=s.answers.length || (s.pending && s.pending.answer);
  if(!has){
    if(!confirm("End this interview? Nothing has been answered yet, so no report will be created.")) return;
    stopMic(); Speech.stop(); clearInterval(tick); tick=null;
    completeSession(s,"abandoned"); Repo.prefs.set({ activeSessionId:null }); App.session=null; go("interview"); return;
  }
  if(!confirm("End the interview now and see your report for the questions you've answered?")) return;
  stopMic(); Speech.stop(); clearInterval(tick); tick=null;
  endSessionEarly(s); finishToReport(s);
}
function leaveInterview(){ stopMic(); Speech.stop(); clearInterval(tick); tick=null; renderToken++; }

/* ---------- Results ------------------------------------------------------- */
function scrResults(){
  const list=Repo.sessions.withReports();
  if(!list.length){ el.innerHTML=pageHead("Results","Your interview reports","")+emptyCard("📊","No reports yet","Complete an interview with Alex and your detailed report will appear here.","#/interview/start","Start interview"); return; }
  const latest=reportOf(list[0]);
  el.innerHTML=pageHead("Results","Your interview reports","Every completed interview produces a scored report with question-by-question feedback.")
  + `<div class="card"><h3>Latest report</h3><div class="row center wrapw" style="gap:22px">
      <div class="ring" style="--p:${latest.scores.overall}"><div><div class="scorebig">${latest.scores.overall}</div><div class="small muted">/ 100</div></div></div>
      <div class="grow" style="min-width:220px"><div style="font-weight:800;font-size:17px">${sessionTitle(latest)}</div>
        <div class="small faint" style="margin:4px 0 12px">${H(fmtDate(latest.completedAt||latest.startedAt))} · ${latest.answers.length} questions</div>
        <a class="btn primary" href="#/results/${latest.sessionId}">Open full report</a></div></div></div>
  <div class="card"><h2>All reports</h2><div class="list">${list.map(s=>{ reportOf(s); return `
    <div class="item"><div><div class="t">${sessionTitle(s)}</div><div class="m">${H(fmtDate(s.completedAt||s.startedAt))} · ${s.answers.length} answered ${statusBadge(s)}</div></div>
    <div class="row center" style="gap:10px">${scoreBadge(s.scores.overall)}<a class="btn sm" href="#/results/${s.sessionId}">View</a></div></div>`; }).join("")}</div></div>`;
}
function scrReport(id){
  const s=Repo.sessions.get(id);
  if(!s || !s.answers || !s.answers.length){ el.innerHTML=emptyCard("🔎","Report not found","This report may have been deleted, or the interview ended before any answers were recorded.","#/results","All results"); return; }
  reportOf(s);
  const sc=s.scores.overall, [bk,bl]=band(sc), nm=s.candidate&&s.candidate.name;
  const closing = App.closing && App.closing.id===id ? App.closing : null;
  if(closing){ App.closing=null; if(closing.speak) Speech.say(closing.text); }
  const comps=Object.entries(s.scores.competencies||{}).sort((a,b)=>a[1]-b[1]);
  const meta=[ s.profession.title, sessionTypeLabel(s), s.mode?MODES[s.mode]&&MODES[s.mode].label+" mode":"",
    LEVELS[s.experienceLevel]?LEVELS[s.experienceLevel].label:"", DIFFS[s.difficulty]?DIFFS[s.difficulty].label:"", `${s.answers.length} question${s.answers.length===1?"":"s"}`, fmtDate(s.completedAt||s.startedAt) ].filter(Boolean);
  const canRepeat = s.version===2 && getProfession(s.profession.id);
  el.innerHTML=`
  ${closing?`<div class="alexsay noprint"><span class="who">Alex</span><p>${H(closing.text)}</p></div>`:""}
  <div class="card">
    <div class="row between center wrapw"><h2 style="margin:0">${nm?H(nm)+"'s interview report":"Interview report"}</h2><span>${statusBadge(s)} <span class="badge ${bk}">${bl}</span></span></div>
    <div class="row center wrapw" style="gap:26px;margin:18px 0 6px">
      <div class="ring" style="--p:${sc}"><div><div class="scorebig">${sc}</div><div class="small muted">/ 100</div></div></div>
      <div class="grow" style="min-width:240px"><p style="font-size:16px">${H(s.feedback?s.feedback.verdict:"")}</p>
        <div class="small muted">${meta.map(H).join(" · ")}</div>
        ${s.version===2?`<div class="small faint" style="margin-top:4px">Interviewer: Alex · ${ALEX.title}</div>`:""}</div>
    </div>
    <div class="grid g2" style="margin-top:14px">
      <div><h3>Rubric</h3>${["Relevance","Depth","Structure","Specificity"].map(n=>barRow(n, s.scores.dims[n])).join("")}</div>
      <div><h3>Competencies</h3>${comps.length?comps.map(([k,v])=>barRow(k,v)).join(""):`<p class="small muted">Competency scores are available for interviews taken with Alex (v2).</p>`}</div>
    </div>
    ${s.feedback&&(s.feedback.strengths.length||s.feedback.focus.length)?`<div class="grid g2" style="margin-top:8px">
      <div><h3>Strengths</h3>${s.feedback.strengths.length?`<ul class="clean small">${s.feedback.strengths.map(x=>`<li>${H(x)}</li>`).join("")}</ul>`:`<p class="small muted">Build consistency: no competency scored 70+ yet.</p>`}</div>
      <div><h3>Focus areas</h3>${s.feedback.focus.length?`<ul class="clean small">${s.feedback.focus.map(x=>`<li>${H(x)}</li>`).join("")}</ul>`:`<p class="small muted">No competency below 70. Keep going.</p>`}</div></div>`:""}
    <div class="row wrapw noprint" style="margin-top:20px;gap:10px">
      ${canRepeat?`<button class="btn primary" onclick="practiceAgain('${s.sessionId}')">↻ Practice again</button>`:""}
      <a class="btn" href="#/interview/start">New interview</a>
      <button class="btn" onclick="window.print()">⬇ Save / print report</button>
      <a class="btn ghost" href="#/results">All results</a>
    </div>
  </div>
  <div class="card">
    <h2>Question-by-question feedback</h2>
    ${s.answers.map((a,i)=>{ const [k,l]=band(a.score); return `
      <div class="qresult">
        <div class="row between center wrapw"><div class="qmeta" style="margin:0">Q${i+1}${a.questionType?` · ${H(QTYPE_LABEL[a.questionType]||"")}`:""}${a.compLabel?` · ${H(a.compLabel)}`:""} · ${a.seconds}s · ${a.wc} words</div><span class="badge ${k}">${a.score}/100 · ${l}</span></div>
        ${a.scenario?`<div class="scenario ${a.code?"code":""}" style="margin-top:10px">${H(a.scenario)}</div>`:""}
        <div style="font-weight:700;margin:8px 0">${H(a.q)}</div>
        <div class="qa"><b>Your answer:</b> ${H(a.answer)}</div>
        ${a.followUp?`<div class="qa"><b>Alex's follow-up:</b> ${H(a.followUp.question)}<br><b>Your follow-up answer:</b> ${a.followUp.answer?H(a.followUp.answer):"<i>Not answered</i>"}</div>`:""}
        <div class="row wrapw small" style="gap:14px;margin-bottom:8px">${Object.entries(a.dims).map(([n,v])=>`<span class="muted">${n}: <b style="color:${barColor(v)}">${v}</b></span>`).join("")}</div>
        <div class="small"><b>How to improve:</b><ul class="tips">${(a.feedback||[]).map(t=>`<li>${H(t)}</li>`).join("")}</ul></div>
      </div>`; }).join("")}
  </div>
  <div class="card"><h3>How scoring works</h3>
    <p class="small muted">Each answer is scored 0–100 on four rubric dimensions: <b>Relevance</b> (did you cover what the question targets), <b>Depth</b> (substance relative to your experience level), <b>Structure</b> (clear, signposted reasoning) and <b>Specificity</b> (examples, numbers, concrete detail). Hedging phrases reduce the score slightly. Competency scores average the questions that tested each competency. Scoring runs entirely in your browser; nothing is uploaded.</p></div>`;
}
function practiceAgain(id){
  const o=Repo.sessions.get(id); if(!o || !getProfession(o.profession.id)){ go("interview/start"); return; }
  const s=createSession({ professionId:o.profession.id, mode:o.mode, type:o.interviewType, level:o.experienceLevel, difficulty:o.difficulty, length:o.length||"standard", name:o.candidate&&o.candidate.name, platform:o.candidate&&o.candidate.platform });
  startSession(s); App.session=s; Repo.prefs.set({ activeSessionId:s.sessionId }); go("interview/session");
}

/* ---------- Interview history -------------------------------------------- */
function scrHistory(){
  const list=Repo.sessions.all();
  el.innerHTML=pageHead("Interview","Interview history","Resume an interview in progress, reopen a report, or remove old sessions.")
  + (list.length?`<div class="card"><div class="list">${list.map(s=>{ const has=s.answers&&s.answers.length; if(has) reportOf(s); return `
    <div class="item"><div><div class="t">${sessionTitle(s)}</div>
      <div class="m">${H(fmtDate(s.startedAt))} · ${has?s.answers.length+" answered":"no answers"} ${statusBadge(s)}</div></div>
      <div class="row center wrapw" style="gap:8px">${has&&s.scores?scoreBadge(s.scores.overall):""}
        ${s.status==="in_progress"?`<button class="btn sm primary" onclick="resumeSession('${s.sessionId}')">Resume</button>`:""}
        ${has&&s.status!=="in_progress"?`<a class="btn sm" href="#/results/${s.sessionId}">Report</a>`:""}
        <button class="btn sm ghost" onclick="deleteSession('${s.sessionId}')" aria-label="Delete this interview">Delete</button></div></div>`; }).join("")}</div></div>`
  : emptyCard("🗂️","No interviews yet","Your interviews, including any you pause, will be listed here.","#/interview/start","Start interview"));
}
function deleteSession(id){
  if(!confirm("Delete this interview and its report? This can't be undone.")) return;
  Repo.sessions.remove(id); if(Repo.prefs.get().activeSessionId===id) Repo.prefs.set({ activeSessionId:null });
  if(App.session && App.session.sessionId===id) App.session=null;
  scrHistory();
}

/* ---------- Practice Lab -------------------------------------------------- */
const KIND_LABEL={ pair:"Compare two responses", rate:"Rate a response (1–5)", find:"Find the errors", rewrite:"Fix and rewrite" };
const KIND_HELP={ pair:"Which response is better? Choose A or B, then justify your choice.",
  rate:"Rate this response from 1 (poor) to 5 (excellent), then justify your rating.",
  find:"Identify every problem in the response and explain why it matters.",
  rewrite:"List the problems, then write a corrected version." };
function practiceBest(){ const best={}; Repo.practice.all().forEach(a=>{ best[a.taskId]=Math.max(best[a.taskId]||0, a.score); }); return best; }
function scrPractice(){
  const attempts=Repo.practice.all(), best=practiceBest();
  el.innerHTML=pageHead("Practice Lab","Practice AI evaluation tasks","Short, original tasks that build the skills AI-evaluation interviews test: comparing responses, rating quality, spotting errors and enforcing instructions.")
  + `<div class="grid g3" style="margin-bottom:18px">
      <div class="card stat"><div class="l">Tasks attempted</div><div class="v">${attempts.length}</div></div>
      <div class="card stat"><div class="l">Average score</div><div class="v">${attempts.length?avg(attempts.map(a=>a.score)):"–"}</div></div>
      <div class="card stat"><div class="l">Tasks mastered (80+)</div><div class="v">${Object.values(best).filter(v=>v>=80).length} / ${PRACTICE_TASKS.length}</div></div></div>
    <div class="grid g2">${PRACTICE_TASKS.map(t=>`<a class="card linkcard" href="#/practice/task/${t.id}">
      <div class="row between center"><span class="pill">${H(t.skill)}</span>${best[t.id]!=null?scoreBadge(best[t.id]):`<span class="badge">New</span>`}</div>
      <div class="t" style="margin-top:12px">${H(t.title)}</div><div class="d">${KIND_LABEL[t.kind]}</div></a>`).join("")}</div>
    <p class="note">Your attempts are saved in <a href="#/practice/history">My Practice History</a>.</p>`;
}
function scrPracticeTask(id){
  const t=PRACTICE_TASKS.find(x=>x.id===id);
  if(!t){ el.innerHTML=emptyCard("🧪","Task not found","That practice task doesn't exist.","#/practice","Back to Practice Lab"); return; }
  const st=App.practice[id]||(App.practice[id]={ choice:null, rating:null, text:"", result:null });
  const idx=PRACTICE_TASKS.indexOf(t), next=PRACTICE_TASKS[(idx+1)%PRACTICE_TASKS.length];
  const res=st.result;
  el.innerHTML=`<p class="small"><a href="#/practice">← Practice Lab</a></p>`
  + pageHead(H(t.skill), H(t.title), KIND_HELP[t.kind])
  + `<div class="card">
      <div class="resplabel">User prompt</div><div class="resp">${H(t.prompt)}</div>
      ${t.kind==="pair"?`<div class="grid g2"><div><div class="resplabel">Response A</div><div class="resp">${H(t.a)}</div></div><div><div class="resplabel">Response B</div><div class="resp">${H(t.b)}</div></div></div>`
        :`<div class="resplabel">AI response</div><div class="resp ${t.code?"code":""}">${H(t.response)}</div>`}
    </div>
    <div class="card">
      ${t.kind==="pair"?`<h3>Your choice</h3><div class="opts">${["a","b"].map(k=>optCard({ sel:st.choice===k, onclick:`practiceSet('${id}','choice','${k}')`, title:"Response "+k.toUpperCase()+" is better" })).join("")}</div>`:""}
      ${t.kind==="rate"?`<h3>Your rating</h3><div class="rate">${[1,2,3,4,5].map(n=>optCard({ sel:+st.rating===n, onclick:`practiceSet('${id}','rating',${n})`, title:String(n) })).join("")}</div>`:""}
      <div class="field"><label class="fld" for="ptText">${t.kind==="rewrite"?"Problems and your corrected version":"Your justification"}</label>
        <textarea id="ptText" placeholder="Explain your reasoning…" oninput="App.practice['${id}'].text=this.value">${H(st.text)}</textarea></div>
      <div id="ptErr" class="small" style="color:#ffb4b4;margin-top:8px" role="alert"></div>
      <div class="row wrapw" style="margin-top:14px;gap:10px"><button class="btn primary" onclick="submitPractice('${id}')">${res?"Re-submit":"Submit"}</button>
        <a class="btn ghost" href="#/practice/task/${next.id}">Skip to next task →</a></div>
    </div>
    ${res?`<div class="card" id="ptResult">
      <div class="row between center wrapw"><h2 style="margin:0">Your result</h2>${scoreBadge(res.score)}</div>
      ${res.correct!=null?`<p style="margin-top:12px">${res.correct?"✅ Your judgment matches the expected answer.":"❌ Your judgment differs from the expected answer."}</p>`:""}
      <h3 style="margin-top:14px">What a strong reviewer notices</h3><p>${H(t.model)}</p>
      <h3>How to improve</h3><ul class="tips small">${res.tips.map(x=>`<li>${H(x)}</li>`).join("")}</ul>
      <div class="row wrapw" style="margin-top:14px;gap:10px"><a class="btn primary" href="#/practice/task/${next.id}">Next task →</a><a class="btn ghost" href="#/practice/history">My Practice History</a></div>
    </div>`:""}`;
  if(res){ const r=document.getElementById("ptResult"); if(r && App.practice[id].justSubmitted){ App.practice[id].justSubmitted=false; r.scrollIntoView({behavior:"smooth"}); } }
}
function practiceSet(id, k, v){ App.practice[id][k]=v; App.practice[id].text=(document.getElementById("ptText")||{}).value||App.practice[id].text; scrPracticeTask(id); }
function submitPractice(id){
  const t=PRACTICE_TASKS.find(x=>x.id===id), st=App.practice[id];
  st.text=(document.getElementById("ptText")||{}).value||"";
  const err=document.getElementById("ptErr");
  if(t.kind==="pair" && !st.choice){ err.textContent="Choose Response A or B first."; return; }
  if(t.kind==="rate" && !st.rating){ err.textContent="Choose a rating from 1 to 5 first."; return; }
  if(words(st.text).length<5){ err.textContent="Add a short justification (at least a sentence) so your reasoning can be scored."; return; }
  const r=scorePractice(t, st);
  st.result=r; st.justSubmitted=true;
  Repo.practice.add({ id:"p-"+Date.now().toString(36), taskId:id, title:t.title, skill:t.skill, kind:t.kind, score:r.score, correct:r.correct,
    choice:st.choice, rating:st.rating, text:st.text, at:Date.now() });
  scrPracticeTask(id);
}
function scrPracticeHistory(){
  const list=Repo.practice.all();
  el.innerHTML=pageHead("Practice","My practice history","Every Practice Lab attempt, newest first.")
  + (list.length?`<div class="card"><div class="list">${list.map(a=>`
    <div class="item"><div><div class="t">${H(a.title)} <span class="faint small">· ${H(a.skill)}</span></div>
      <div class="m">${H(fmtDate(a.at))} · ${H(KIND_LABEL[a.kind]||"")}${a.correct!=null?(a.correct?" · judgment matched":" · judgment differed"):""}</div></div>
      <div class="row center" style="gap:10px">${scoreBadge(a.score)}<a class="btn sm" href="#/practice/task/${a.taskId}">Retry</a></div></div>`).join("")}</div></div>`
  : emptyCard("🧪","No practice yet","Try a Practice Lab task. Each takes two or three minutes.","#/practice","Open Practice Lab"));
}

/* ---------- Progress ------------------------------------------------------ */
const PROGRESS_TABS=[["#/progress","Interview Readiness"],["#/progress/skills","Skills & Scores"],["#/progress/activity","Recent Activity"]];
function readiness(){
  const done=Repo.sessions.completed().map(reportOf).slice(0,3);
  if(!done.length) return null;
  const w=[3,2,1].slice(0,done.length), tot=w.reduce((a,b)=>a+b,0);
  return Math.round(done.reduce((a,s,i)=>a+s.scores.overall*w[i],0)/tot);
}
function allAnswers(){ return [].concat(...Repo.sessions.withReports().map(s=>s.answers||[])); }
function competencyStats(){
  const m={}; allAnswers().forEach(a=>{ if(a.compLabel && a.questionType!=="intro"){ (m[a.compLabel]=m[a.compLabel]||[]).push(a.score); } });
  return Object.entries(m).map(([k,v])=>({ label:k, score:avg(v), n:v.length })).sort((a,b)=>a.score-b.score);
}
function scrReadiness(){
  const r=readiness(), done=Repo.sessions.completed().map(reportOf), prac=Repo.practice.all(), weak=competencyStats()[0];
  const label = r==null?"":r>=78?"Interview-ready":r>=55?"Nearly ready":"Building foundations";
  el.innerHTML=pageHead("Progress","Interview readiness","Your readiness weighs your three most recent completed interviews, with the newest counting most.")+tabs(PROGRESS_TABS,"#/progress")
  + (r==null ? emptyCard("🎯","No readiness score yet","Complete an interview with Alex to get your first readiness score.","#/interview/start","Start interview")
  : `<div class="card"><div class="row center wrapw" style="gap:26px">
      <div class="ring" style="--p:${r}"><div><div class="scorebig">${r}</div><div class="small muted">/ 100</div></div></div>
      <div class="grow" style="min-width:240px"><span class="badge ${band(r)[0]}">${label}</span>
        <p style="margin-top:10px">${r>=78?"You're consistently performing at the level strong candidates show. Keep practising different interview types to stay sharp."
          :r>=55?"You're close. Target your weakest competencies and aim for consistency across sessions."
          :"Focus on structured, specific answers. Practise your weakest competencies, then run another interview."}</p>
        ${weak?`<p class="small muted">Suggested focus: <b>${H(weak.label)}</b> (average ${weak.score}/100).</p>`:""}
        <div class="row wrapw" style="gap:10px"><a class="btn primary" href="#/interview/start">Start another interview</a><a class="btn" href="#/practice">Practice AI tasks</a></div></div></div></div>`)
  + `<div class="grid g4">
      <div class="card stat"><div class="l">Interviews completed</div><div class="v">${done.length}</div></div>
      <div class="card stat"><div class="l">Best score</div><div class="v">${done.length?Math.max(...done.map(s=>s.scores.overall)):"–"}</div></div>
      <div class="card stat"><div class="l">Practice tasks</div><div class="v">${prac.length}</div></div>
      <div class="card stat"><div class="l">Practice average</div><div class="v">${prac.length?avg(prac.map(a=>a.score)):"–"}</div></div></div>`;
}
function scrSkills(){
  const A=allAnswers(), comps=competencyStats();
  const pm={}; Repo.practice.all().forEach(a=>{ (pm[a.skill]=pm[a.skill]||[]).push(a.score); });
  el.innerHTML=pageHead("Progress","Skills & scores","Averages across every interview answer and practice attempt.")+tabs(PROGRESS_TABS,"#/progress/skills")
  + (!A.length && !Object.keys(pm).length ? emptyCard("📈","No scores yet","Complete an interview or a practice task to see your skill profile.","#/interview/start","Start interview")
  : `<div class="grid g2">
      <div class="card"><h3>Rubric dimensions</h3>${A.length?["Relevance","Depth","Structure","Specificity"].map(n=>barRow(n, avg(A.map(a=>a.dims[n])))).join(""):`<p class="small muted">No interview answers yet.</p>`}</div>
      <div class="card"><h3>Practice Lab skills</h3>${Object.keys(pm).length?Object.entries(pm).map(([k,v])=>barRow(k, avg(v), `· ${v.length} attempt${v.length>1?"s":""}`)).join(""):`<p class="small muted">No practice attempts yet. <a href="#/practice">Try one</a>.</p>`}</div>
    </div>
    <div class="card"><h3>Competencies (weakest first)</h3>${comps.length?comps.map(c=>barRow(c.label, c.score, `· ${c.n} question${c.n>1?"s":""}`)).join(""):`<p class="small muted">Competency scores appear after your first interview with Alex.</p>`}</div>`);
}
function scrActivity(){
  const items=[].concat(
    Repo.sessions.all().map(s=>({ at:s.completedAt||s.startedAt, html:`<div><div class="t">🎙️ ${sessionTitle(s)}</div><div class="m">${H(fmtDate(s.completedAt||s.startedAt))} ${statusBadge(s)}</div></div>
      <div class="row center" style="gap:10px">${s.answers&&s.answers.length?scoreBadge(reportOf(s).scores.overall):""}${s.status==="in_progress"?`<button class="btn sm" onclick="resumeSession('${s.sessionId}')">Resume</button>`:s.answers&&s.answers.length?`<a class="btn sm" href="#/results/${s.sessionId}">Report</a>`:""}</div>` })),
    Repo.practice.all().map(a=>({ at:a.at, html:`<div><div class="t">🧪 ${H(a.title)} <span class="faint small">· Practice Lab</span></div><div class="m">${H(fmtDate(a.at))} · ${H(a.skill)}</div></div>
      <div class="row center" style="gap:10px">${scoreBadge(a.score)}<a class="btn sm" href="#/practice/task/${a.taskId}">Retry</a></div>` }))
  ).sort((a,b)=>b.at-a.at).slice(0,40);
  el.innerHTML=pageHead("Progress","Recent activity","Your latest interviews and practice, newest first.")+tabs(PROGRESS_TABS,"#/progress/activity")
  + (items.length?`<div class="card"><div class="list">${items.map(i=>`<div class="item">${i.html}</div>`).join("")}</div></div>`
  : emptyCard("🕒","No activity yet","Start an interview or a practice task and it will appear here.","#/interview/start","Start interview"));
}

/* ---------- About --------------------------------------------------------- */
function scrAbout(){
  el.innerHTML=pageHead("About","About BSP AI WorkReady · Interview IQ","The AI Interview Lab from Business Startup Powerhouse, built to help people practise realistic AI-led interviews for free.")
  + `<div class="grid g2">
    <div class="card"><h3>What it is</h3><p>Interview IQ simulates the AI-led screening interviews used across professional and AI-training work. Alex, your BSP AI interviewer, asks profession-specific questions, adapts to your answers and gives you a detailed, transparent report.</p>
      <p class="muted">${PROFESSIONS.length}+ professions · 8 interview types · voice or text · adaptive follow-ups.</p><a href="#/interview/alex">Meet Alex →</a></div>
    <div class="card"><h3>How interviews work</h3><ul class="clean small">
      <li>Each profession has its own competency model, for example Risk Management or Stakeholder Management for project managers.</li>
      <li>Questions are structured by competency, difficulty and type: knowledge, behavioral, scenario, AI output evaluation, error detection, explanation and practical tasks.</li>
      <li>Adaptive difficulty: strong answers go deeper, vague answers get clarification, and missing competencies get explored.</li></ul></div>
    <div class="card"><h3>How scoring works</h3><p class="small muted">Every answer is scored 0–100 on Relevance, Depth, Structure and Specificity, with expectations scaled to your experience level. Scores roll up into competencies and an overall readiness score. Scoring is deterministic and runs in your browser.</p></div>
    <div class="card"><h3>Original content</h3><p class="small muted">All interview and practice questions are original BSP practice material based on general professional competencies. They are not copied from any hiring or AI-training platform, and Interview IQ is not affiliated with any of them.</p></div>
  </div>
  <div class="card"><h3>Guest mode &amp; your data</h3>
    <p class="small muted">No account is needed. Your interview history, practice history and preferences are stored ${Repo.kind==="browser"?"in this browser on this device":"for this session only (your browser is blocking storage)"}. Nothing is sent to a server, and Interview IQ never stores audio. Clearing your browser data removes them.</p>
    <div class="row wrapw" style="gap:10px"><button class="btn" onclick="exportData()">⬇ Export my data (JSON)</button><button class="btn danger" onclick="clearData()">Delete all my data</button></div></div>
  <div class="card"><h3>Browser support</h3><p class="small muted">Best experience: Chrome or Edge on desktop or Android, which support both speaking and listening. Safari and Firefox can speak questions aloud; you type your answers.</p></div>`;
}
function exportData(){
  const blob=new Blob([JSON.stringify(Repo.exportAll(),null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="interview-iq-data.json";
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
}
function clearData(){
  if(!confirm("Delete all interviews, practice history, custom professions and preferences stored in this browser? This can't be undone.")) return;
  Repo.clearAll(); App.session=null; App.practice={}; loadSetup(); go("");
}

/* ---------- Brand, footer, boot ------------------------------------------- */
function renderBrand(){
  const img=document.getElementById("brandLogo"), mk=document.getElementById("brandMark");
  if(!img) return;
  img.onload=()=>{ img.style.display="inline-block"; if(mk) mk.style.display="none"; };
  img.onerror=function(){
    if(img.getAttribute("data-fallback")!=="1"){ img.setAttribute("data-fallback","1"); img.src="logo.svg"; }
    else { img.style.display="none"; if(mk) mk.style.display="grid"; }
  };
  img.src="logo.png";
}
function renderFooter(){
  document.getElementById("footer").innerHTML=`<b>${BRAND.line}</b> · ${BRAND.name}, ${BRAND.product}. Powered by ${BRAND.community}.<br>
    Original practice content; not affiliated with any hiring or AI-training platform. Guest mode: your data stays in this browser.`;
}

Repo.migrate();
loadSetup();
renderBrand();
renderFooter();
initNav();
window.addEventListener("hashchange", route);
route();
