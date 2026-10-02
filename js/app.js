/* =============================================================================
   BSP AI WorkReady · Interview IQ — UI: hash router, navigation and screens.
   Screens rebuild #app from template strings; escape all user text with H().
   ========================================================================== */
"use strict";

const BRAND = { line:"BSP AI WorkReady", name:"Interview IQ", product:"AI Interview Lab", community:"Business Startup Powerhouse" };
const INTEGRITY_NOTICE = "BSP AI WorkReady Interview IQ is for interview practice and professional development. Do not use it to obtain real-time answers during an active external employer interview or qualification assessment.";
const el = document.getElementById("app");
const H = s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtDate = t=>{ try{ return new Date(t).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"}); }catch(e){ return ""; } };

const DEFAULT_SETUP = { step:1, professionId:null, mode:Speech.sttAvailable?"voice":"text", type:"ai_domain", typeChosen:false,
  level:"experienced", difficulty:"adaptive", length:"standard", name:"", platform:"", langBalance:"balanced", useCv:false, specialty:"" };
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
  if(!LANG_BALANCE[S.langBalance]) S.langBalance="balanced";
  const p=S.professionId && getProfession(S.professionId);
  if(S.professionId && p && p.status==="archived") S.professionId=null;
  if(p && S.specialty && !(p.specialties||[]).includes(S.specialty) && !p.custom) S.specialty="";
  if(!p || (S.level==="doctoral" && !p.academic)) { if(S.level==="doctoral") S.level="experienced"; }
  /* selected type (S.type) vs the profession's recommendation: the recommendation only fills the
     selection while the user hasn't chosen one, or when their choice isn't offered for this profession. */
  if(p && (!S.typeChosen || !typeAvailability(p)[S.type].ok)){
    if(S.typeChosen && S.type!==recommendedType(p)) App.ui.typeNote=`${TYPES[S.type].label} isn't offered for ${p.title}, so the recommended type is selected. You can change it.`;
    S.type=recommendedType(p); S.typeChosen=false;
  }
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
  [/^interview\/mic-check$/, scrMicCheck],
  [/^interview\/session$/, scrSession],
  [/^practice$/, scrPractice],
  [/^practice\/setup\/([\w-]+)$/, scrPracticeSetup],
  [/^practice\/run$/, scrPracticeRun],
  [/^practice\/results\/([\w-]+)$/, scrPracticeResults],
  [/^practice\/task\/([\w-]+)$/, ()=>go("practice")],
  [/^practice\/history$/, scrPracticeHistory],
  [/^results$/, scrResults],
  [/^results\/([\w-]+)$/, scrReport],
  [/^progress$/, scrDashboard],
  [/^progress\/readiness$/, scrReadinessDetail],
  [/^profile$/, scrProfile],
  [/^profile\/careers$/, scrCareers],
  [/^professions$/, scrProfessions],
  [/^professions\/([\w-]+)$/, id=>scrProfessionProfile(id)],
  [/^professions\/([\w-]+)\/skills$/, id=>scrProfessionProfile(id,"skills")],
  [/^cv$/, scrCV],
  [/^cv\/mapper$/, scrMapper],
  [/^admin$/, ()=>scrAdmin()],
  [/^admin\/(\w+)$/, scrAdmin],
  [/^progress\/skills$/, scrSkills],
  [/^progress\/activity$/, scrActivity],
  [/^progress\/trends$/, ()=>scrTrends()],
  [/^progress\/trends\/([\w-]+)$/, scrTrends],
  [/^about$/, scrAbout],
  [/^privacy$/, scrPrivacy],
];
let currentPath = null;
function pathNow(){ return location.hash.replace(/^#\/?/,"").split("?")[0].replace(/\/+$/,""); }
function go(path){ const h="#/"+String(path).replace(/^\//,""); if(location.hash===h) route(); else location.hash=h; }
function route(){
  const path=pathNow();
  if(currentPath==="interview/session" && path!=="interview/session") leaveInterview();
  if(currentPath==="interview/mic-check" && path!=="interview/mic-check") closeMicCheck();
  if(currentPath==="practice/run" && path!=="practice/run") leavePractice();
  currentPath=path;
  let fn=null, m=null;
  for(const [re,f] of ROUTES){ m=path.match(re); if(m){ fn=f; break; } }
  if(!fn){ go(""); return; }
  closeMenus();
  try{ fn(...m.slice(1)); }
  catch(e){ console.error(e); el.innerHTML=errorCard("Something went wrong","This page couldn't load. Your saved data is safe, and you can try again or go back to the home page.", e); }
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
  const t0=path.split("/")[0]||"home", top=({ cv:"profile", privacy:"about", admin:"about", professions:"interview" })[t0]||t0;
  document.querySelectorAll("#mainNav [data-nav]").forEach(n=>n.classList.toggle("active", n.dataset.nav===top));
  document.querySelectorAll("#mainNav a[href]").forEach(a=>a.classList.toggle("active", a.getAttribute("href")==="#/"+path));
}

/* ---------- Shared bits --------------------------------------------------- */
function pageHead(kicker, title, sub){ return `<div class="pagehead"><span class="kicker">${kicker}</span><h1>${title}</h1>${sub?`<p class="lead">${sub}</p>`:""}</div>`; }
function alexBlock(){ return `<div class="alexrow"><div class="alexav" aria-hidden="true">${H(ALEX.avatar||"A")}</div><div><div class="alexname">ALEX</div><div class="alextitle">${ALEX.title}</div><div class="alexsub">${ALEX.subtitle}</div></div></div>`; }
function errorCard(title, text, err){
  return `<div class="card empty" role="alert"><div class="ic">⚠️</div><h2>${H(title)}</h2><p class="muted">${H(text)}</p>
    <div class="row wrapw" style="gap:10px;justify-content:center"><button class="btn primary" onclick="route()">Try again</button><a class="btn" href="#/">Back to home</a><a class="btn ghost" href="#/privacy">Clear damaged data</a></div>
    ${err?`<p class="small faint" style="margin-top:12px">Details: ${H(String(err.message||err).slice(0,160))}</p>`:""}</div>`;
}
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
  ${!Repo.sessions.withReports().length?`<p class="note">Practice your first interview with ${H(ALEX.name)}: choose your profession and you'll get an evidence-based report at the end.</p>`:""}
  <p class="note integrity">${INTEGRITY_NOTICE}</p>
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
    { type:"ai_readiness", tag:"Generalist AI Readiness", title:TYPES.ai_readiness.label, d:TYPES.ai_readiness.d, cta:"Set up AI Training Readiness",
      points:["Instruction following and rubric consistency","Fact checking and error detection","Comparing and rating AI responses"] },
    { type:"ai_domain", tag:"Field expertise + AI", title:TYPES.ai_domain.label, d:TYPES.ai_domain.d, cta:"Set up AI Domain Expert Interview",
      points:["AI output evaluation in your own field","Error detection with domain context","Professional judgment"] },
  ]);
}
function presetType(t){
  App.setup.type=t; App.setup.typeChosen=true; normalizeSetup();
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
function setField(k, v){ App.setup[k]=v; if(k==="type"){ App.setup.typeChosen=true; App.ui.typeNote=""; } normalizeSetup(); saveSetup(); renderStep(); }
function optCard(o){
  return `<button class="opt ${o.sel?"sel":""}" ${o.disabled?"disabled":""} onclick="${o.onclick}" aria-pressed="${!!o.sel}">
    ${o.tag?`<span class="tag">${o.tag}</span>`:""}<div class="t">${o.title}</div>${o.d?`<div class="d">${o.d}</div>`:""}${o.why?`<div class="why">${o.why}</div>`:""}</button>`;
}

/* Step 1 (profession search, browse, custom) lives in js/profession-ui.js. */

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
  const order=Object.keys(TYPES);
  return `<h2>Step 3 · Choose interview type</h2>
    <div class="recbox" id="recType"><div class="small faint" style="text-transform:uppercase;letter-spacing:1px;font-weight:700">Recommended for Your Background</div>
      <div style="font-weight:800;margin:4px 0">${H(TYPES[rec].label)}</div><div class="small">${H(TYPES[rec].why)}</div>
      <div class="small muted" style="margin-top:6px">Based on <b>${H(p.title)}</b>${isLingual(p)?` · working language${profLanguages(p).length>1?"s":""}: ${H(profLanguages(p).join(" + "))}`:""}. This is a recommendation only: choose any available type below.</div></div>
    ${App.ui.typeNote?`<p class="note">${H(App.ui.typeNote)}</p>`:""}
    ${isTransferable(p)?`<p class="muted">For transferable-skills roles no profession-specific AI job is invented; the Transferable Skills Interview focuses on attention to detail, process adherence, quality review and instruction following.</p>`:""}
    <div class="opts" id="typeOpts">${order.map(k=>{ const t=TYPES[k]; return optCard({ sel:S.type===k, disabled:!av[k].ok, onclick:`setField('type','${k}')`,
      title:t.label.toUpperCase(), d:t.d, why:av[k].ok?t.why:av[k].why, tag:k===rec&&av[k].ok?"Recommended":"" }); }).join("")}</div>
    ${S.type==="bilingual" && isFrenchBilingual(p)?`<h3 style="margin-top:20px">Language balance</h3><p class="small muted">Alex switches naturally between English and French. Choose the mix.</p>
      <div class="opts" id="langBalance">${Object.entries(LANG_BALANCE).map(([k,b])=>optCard({ sel:S.langBalance===k, onclick:`setField('langBalance','${k}')`, title:b.label, d:b.d, tag:k==="balanced"?"Default":"" })).join("")}</div>`:""}
    ${wizFoot(true)}`;
}
function stepLevel(p){
  const S=App.setup;
  return `<h2>Step 4 · Experience level</h2><p class="muted">Question depth and the expected length of answers change with your level.</p>
    <div class="opts">${Object.entries(LEVELS).filter(([,l])=>!l.academicOnly || (p&&p.academic)).map(([k,l])=>optCard({ sel:S.level===k, onclick:`setField('level','${k}')`, title:l.label, d:l.d })).join("")}</div>
    ${p&&p.academic?`<p class="note">Doctoral / Research Expert is offered because this profession can involve research-level work. It is never assumed: choose it only if it applies to you.</p>`:""}
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
  const rows=[["Profession",H(p.title)+(S.specialty?` <span class="faint">· ${H(S.specialty)}</span>`:""),1],["Interviewer","Alex · BSP AI Interviewer",0],["Mode",MODES[S.mode].label,2],["Interview",TYPES[S.type].label.replace(/ Interview$/,""),3],
    ...(S.type==="bilingual"&&isFrenchBilingual(p)?[["Language balance",LANG_BALANCE[S.langBalance].label,3]]:[]),
    ["Experience",LEVELS[S.level].label,4],["Difficulty",DIFFS[S.difficulty].label,5],["Questions",S.length==="deep"?`${L.min}–${L.max} (adaptive)`:L.n,6]];
  return `<h2 style="text-transform:uppercase;letter-spacing:1px">Your interview</h2>
    <table class="summary">${rows.map(([k,v,st])=>`<tr><td>${k}</td><td>${v}${st?` <button class="linkbtn small" onclick="setStep(${st})" aria-label="Edit ${k}">edit</button>`:""}</td></tr>`).join("")}</table>
    <div class="grid g2" style="margin-top:18px">
      <div><label class="fld" for="candName">Your first name (optional)</label><input id="candName" maxlength="40" placeholder="So Alex can greet you" value="${H(S.name)}" oninput="App.setup.name=this.value;saveSetup()"></div>
      <div><label class="fld" for="candPlat">Preparing for (optional)</label><select id="candPlat" onchange="App.setup.platform=this.value;saveSetup()">
        ${[["","General practice"],["ai-training","AI training / evaluation work"],["job","A job interview"],["other","Something else"]].map(([v,l])=>`<option value="${v}" ${S.platform===v?"selected":""}>${l}</option>`).join("")}</select></div>
    </div>
    <div class="cvtoggle" id="cvToggleBox">${CV.hasConfirmed()
      ? `<label class="switch"><input type="checkbox" id="useCv" ${S.useCv?"checked":""} onchange="App.setup.useCv=this.checked;saveSetup()"> <b>USE MY CONFIRMED CV FOR THIS INTERVIEW</b></label>
         <div class="small muted">${H(ALEX.name)} may personalise questions using only the ${CV.confirmed().length} facts you confirmed (for example your roles and responsibilities). Nothing is invented. <a href="#/cv">Review CV</a></div>`
      : `<div class="small muted">Add your experience to personalize your interviews. <a href="#/cv">Add my CV</a> (optional).</div>`}</div>
    <p class="note integrity">${INTEGRITY_NOTICE}</p>
    <div class="row wrapw" style="margin-top:22px;gap:10px;justify-content:space-between">
      <button class="btn ghost" onclick="setStep(6)">← Back</button>
      <button class="btn primary lg upper" onclick="startFromSetup()">Start interview with Alex</button>
    </div>
    ${S.mode==="voice"&&Speech.sttAvailable?`<p class="note">Next, a quick microphone check. Audio is processed live by your browser's speech service; Interview IQ never records or stores audio, only the text transcript of your answers. Accent and voice are never scored.</p>`:""}`;
}
function startFromSetup(){
  const S=App.setup; if(!S.professionId){ setStep(1); return; }
  let s;
  try{ s=createSession({ professionId:S.professionId, mode:S.mode, type:S.type, level:S.level, difficulty:S.difficulty, length:S.length, name:S.name, platform:S.platform, langBalance:S.langBalance, useCv:!!S.useCv && CV.hasConfirmed(), specialty:S.specialty||"" }); }
  catch(e){ console.error(e); el.innerHTML=errorCard("Alex couldn't prepare this interview","The interview engine couldn't build questions for these settings. Try another interview type or profession, or reload the page.", e); return; }
  startSession(s); App.session=s; Repo.prefs.set({ activeSessionId:s.sessionId });
  go(needsMicCheck(s) ? "interview/mic-check" : "interview/session");
}
function resumeSession(id){
  const s=Repo.sessions.get(id); if(!s || s.status!=="in_progress"){ go("interview/history"); return; }
  App.session=s; Repo.prefs.set({ activeSessionId:id }); go("interview/session");
}

/* ---------- Results ------------------------------------------------------- */
function scrResults(){
  const list=Repo.sessions.withReports();
  if(!list.length){ el.innerHTML=pageHead("Results","Your interview reports","")+emptyCard("📊","No reports yet","Your completed sessions will appear here. Practice your first interview with Alex.","#/interview/start","Start interview"); return; }
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
/* ---------- About --------------------------------------------------------- */
function scrAbout(){
  el.innerHTML=pageHead("About","About BSP AI WorkReady · Interview IQ","The AI Interview Lab from Business Startup Powerhouse, built to help people practise realistic AI-led interviews for free.")
  + `<div class="grid g2">
    <div class="card"><h3>What it is</h3><p>Interview IQ simulates the AI-led screening interviews used across professional and AI-training work. Alex, your BSP AI interviewer, asks profession-specific questions, adapts to your answers and gives you a detailed, transparent report.</p>
      <p class="muted">${PROFESSIONS.length}+ professions · ${Object.keys(TYPES).length} interview types · voice or text · adaptive follow-ups · a timed Practice Lab with ${PRACTICE_CATEGORIES.filter(c=>isCategoryAvailable(c.id)).length} AI-evaluation categories (every session is exactly ${PRACTICE_QUESTIONS} questions).</p><a href="#/interview/alex">Meet Alex →</a></div>
    <div class="card"><h3>How interviews work</h3><ul class="clean small">
      <li>Each profession has its own competency model, for example Risk Management or Stakeholder Management for project managers.</li>
      <li>Questions are structured by competency, difficulty and type: knowledge, behavioral, scenario, AI output evaluation, error detection, explanation and practical tasks.</li>
      <li>Adaptive difficulty: strong answers go deeper, vague answers get clarification, and missing competencies get explored.</li></ul></div>
    <div class="card"><h3>How scoring works</h3><p class="small muted">Every answer is first rated on an explicit 0–4 rubric for each dimension it tests (Domain Knowledge, Professional Reasoning, Professional Judgment, AI Evaluation Ability, Communication, Instruction Following, Attention to Detail). Levels are converted to percentages only afterwards, and every score shows the evidence found, the evidence missing and excerpts from your own answers. Scoring is deterministic and runs in your browser; it is a practice score, not a prediction of any hiring outcome.</p></div>
    <div class="card"><h3>Original content</h3><p class="small muted">All interview and practice questions are original BSP practice material based on general professional competencies. They are not copied from any hiring or AI-training platform or employer assessment, and Interview IQ is not affiliated with any of them.</p></div>
  </div>
  <div class="card"><h3>Practice and integrity</h3><p class="small">${INTEGRITY_NOTICE}</p></div>
  <div class="card"><h3>Guest mode &amp; your data</h3>
    <p class="small muted">No account is needed and Interview IQ has no server: your history, practice, CV and preferences are stored ${Repo.kind==="browser"?"in this browser on this device":"for this tab only (your browser is blocking storage)"}. Read exactly how voice, transcripts, CV data and browser storage are handled on the <a href="#/privacy">Privacy &amp; your data</a> page, where you can also clear your data.</p>
    <div class="row wrapw" style="gap:10px"><button class="btn" onclick="exportData()">⬇ Export my data (JSON)</button><a class="btn danger" href="#/privacy">Clear my data</a></div></div>
  <div class="card"><h3>Browser support</h3><p class="small muted">Best experience: Chrome or Edge on desktop or Android, which support both speaking and listening. Safari and Firefox can speak questions aloud; you type your answers.</p></div>`;
}
function exportData(){
  const blob=new Blob([JSON.stringify(Repo.exportAll(),null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="interview-iq-data.json";
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
}
/* ---------- Privacy & Clear My Data --------------------------------------- */
const CLEAR_LABELS={ interviews:["Interview History","Every interview, transcript text and report"], practice:["Practice History","Practice Lab sessions, legacy attempts and question-usage counts"],
  cv:["CV Data","Your CV text, extracted items and experience mappings"], preferences:["Preferences & professional profile","Setup choices, voice settings, custom professions and your list of professions"] };
function scrPrivacy(){
  const counts={ interviews:Repo.sessions.all().length, practice:Repo.practiceSessions.all().length+Repo.practice.all().length, cv:Repo.cv.get()?1:0, preferences:Object.keys(Repo.prefs.get()).length+Repo.customProfessions.all().length+Repo.careers.all().length };
  el.innerHTML=pageHead("About","Privacy & your data","What Interview IQ stores, where, and how to remove it.")
  + `<div class="grid g2">
    <div class="card"><h3>Voice processing</h3><p class="small muted">Alex's voice uses your browser's built-in speech synthesis. When you answer by voice, your browser's speech-recognition service turns speech into text. In some browsers (for example Chrome and Edge) that service may send the audio to the browser maker's servers to transcribe it; that is controlled by your browser, not by Interview IQ. Interview IQ itself never records, stores, uploads or analyses raw audio, and the microphone level meter only reads volume live. Accent and voice are never scored.</p></div>
    <div class="card"><h3>Transcript storage</h3><p class="small muted">The text of your answers (typed, or transcribed and reviewed by you) is saved with your interview so you can read your report later. It stays in this browser. Remove it below with Interview History.</p></div>
    <div class="card"><h3>CV data</h3><p class="small muted">CV text you paste or upload (.txt / .md) is read inside your browser and never uploaded. Extracted items are only used after you confirm them, and only when you switch on “Use my confirmed CV” for an interview. Remove personal details you don't want stored before pasting.</p></div>
    <div class="card"><h3>Browser storage</h3><p class="small muted">Everything is kept in this browser's local storage (${Repo.kind==="browser"?"available":"blocked, so data lasts only until you close this tab"}). There is no account, no cloud copy and no sync: data doesn't follow you to another device, and clearing your browser data deletes it. The storage layer is designed so it could later be migrated to an account if one is ever added.</p></div>
  </div>
  <div class="card" id="clearData"><h2>Clear my data</h2><p class="small muted">Choose what to remove from this browser. This can't be undone; export first if you want a copy.</p>
    <div class="picks">${Object.entries(CLEAR_LABELS).map(([k,[l,d]])=>`<label class="pick"><input type="checkbox" name="clr" value="${k}" ${counts[k]?"checked":""}> <span><b>${l}</b> <span class="faint small">· ${d} (${counts[k]?counts[k]+" stored":"nothing stored"})</span></span></label>`).join("")}</div>
    <div class="row wrapw" style="gap:10px;margin-top:14px"><button class="btn danger" id="clearBtn" onclick="clearSelected()">Clear selected data</button><button class="btn" onclick="exportData()">⬇ Export my data first</button></div>
    <div id="clearMsg" class="small" role="status" style="margin-top:10px"></div></div>
  <div class="card"><h3>Practice and integrity</h3><p class="small">${INTEGRITY_NOTICE}</p></div>`;
}
function clearSelected(){
  const g=[...document.querySelectorAll("input[name=clr]:checked")].map(x=>x.value); if(!g.length){ document.getElementById("clearMsg").textContent="Select at least one type of data."; return; }
  if(!confirm("Remove "+g.map(k=>CLEAR_LABELS[k][0]).join(", ")+" from this browser? This can't be undone.")) return;
  Repo.clearGroups(g);
  if(g.includes("interviews")) App.session=null;
  if(g.includes("preferences")) loadSetup();
  scrPrivacy(); document.getElementById("clearMsg").textContent="Cleared: "+g.map(k=>CLEAR_LABELS[k][0]).join(", ")+" ✓";
}
function clearData(){ go("privacy"); }

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
    <span class="integrity">${INTEGRITY_NOTICE}</span><br>
    Original practice content; not affiliated with any hiring or AI-training platform. Guest mode: your data stays in this browser. <a href="#/privacy">Privacy &amp; your data</a>`;
}
function renderSysBanner(){
  const b=document.getElementById("sysBanner"); if(!b) return;
  if(Repo.kind!=="browser"){ b.hidden=false; b.innerHTML=`⚠️ Storage unavailable: your browser is blocking local storage, so progress will be lost when you close this tab. You can keep practising. <a href="#/privacy">Learn more</a>`; }
}

Repo.migrate();
applyRoleOverrides();
applyAlexSettings();
loadSetup();
(()=>{ const v=Repo.prefs.get().voice; if(v){ Speech.settings.muted=!!v.muted; Speech.settings.rate=+v.rate||1; } })();
renderBrand();
renderFooter();
renderSysBanner();
initNav();
window.addEventListener("hashchange", route);
window.addEventListener("error", e=>{ if(el && !el.innerText.trim()) el.innerHTML=errorCard("Something went wrong","Part of the app failed to load. Your saved data is safe.", e.error||e.message); });
window.__iqBooted=true;
route();
