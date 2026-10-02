/* =============================================================================
   BSP AI Practice Lab UI — category home, setup, timed 10-question runner,
   results + question review, history, recommendations.
   ========================================================================== */
"use strict";

let pTimer=null, pShownAt=0, pSaveT=null;
const fmtClock=ms=>{ const s=Math.ceil(ms/1000), m=Math.floor(s/60); return `${String(m).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`; };
const fmtDur=sec=>sec>=60?`${Math.floor(sec/60)} min ${sec%60} s`:`${sec} s`;
function activePractice(){
  const id=Repo.prefs.get().activePracticeId, ps=id && Repo.practiceSessions.get(id);
  return ps && ps.status==="in_progress" ? ps : null;
}

/* ---------- Recommendations card (used on reports, progress and the lab) --- */
function recommendationsHTML(ctx){
  const recs=getRecommendations(ctx||{}); if(!recs.length) return "";
  return `<div class="recs noprint"><h3>Recommended next</h3><div class="list">${recs.map(r=>{
    if(r.kind==="voice") return `<div class="item"><div><div class="t">🎙️ Voice Interview With Alex</div><div class="m">${H(r.because)}</div></div>
      <button class="btn sm primary" onclick="recVoice()">Start voice interview</button></div>`;
    const c=practiceCat(r.category), D=PRACTICE_DIFF[r.difficulty];
    return `<div class="item"><div><div class="t">${c.icon} ${H(c.label)} Practice</div><div class="m">${D.label} · ${PRACTICE_QUESTIONS} Questions · ${D.minutes} Minutes · because ${H(r.because)}</div></div>
      <button class="btn sm primary" onclick="openPracticeSetup('${r.category}','${r.difficulty}')">Practise</button></div>`; }).join("")}</div></div>`;
}
function recVoice(){ App.setup.mode="voice"; App.setup.step=App.setup.professionId?7:1; saveSetup(); go("interview/start"); }
function openPracticeSetup(cat, diff){ App.practicePreset={ cat, diff }; go("practice/setup/"+cat); }

/* ---------- Practice Lab home --------------------------------------------- */
function scrPractice(){
  const done=standardPracticeSessions(), active=activePractice();
  const last={}; done.forEach(p=>{ const k=normCategoryId(p.category); if(!last[k]) last[k]=p; });
  const avail=PRACTICE_CATEGORIES.filter(c=>isCategoryAvailable(c.id));
  el.innerHTML=pageHead("Practice Lab","BSP AI Practice Lab","Timed practice for AI evaluation work. Every session is exactly 10 questions: Easy 15 minutes, Medium 20 minutes, Hard 25 minutes.")
  + (active?`<div class="card" style="margin-bottom:18px"><div class="row between center wrapw"><div><h3 style="margin:0 0 4px">Practice in progress</h3>
      <b>${H(practiceCat(active.category).label)}</b> · ${PRACTICE_DIFF[active.difficulty].label} · <span class="faint">${fmtClock(practiceRemaining(active))} remaining</span></div>
      <a class="btn primary" href="#/practice/run">Resume →</a></div></div>`:"")
  + `<div class="grid g3" style="margin-bottom:18px">
      <div class="card stat"><div class="l">Sessions completed</div><div class="v">${done.length}</div></div>
      <div class="card stat"><div class="l">Average score</div><div class="v">${done.length?avg(done.map(p=>p.results.score)):"–"}</div></div>
      <div class="card stat"><div class="l">Categories practised</div><div class="v">${Object.keys(last).length} / ${avail.length}</div></div></div>`
  + (done.length||Repo.sessions.completed().length?`<div class="card" style="margin-bottom:18px">${recommendationsHTML()||`<p class="small muted" style="margin:0">Complete more sessions to unlock personalised recommendations.</p>`}</div>`:"")
  + `<div class="grid g3">${PRACTICE_CATEGORIES.map(c=>{ const l=last[c.id], prog=practiceProgression(c.id);
      if(!isCategoryAvailable(c.id)) return `
      <div class="card soon" data-cat="${c.id}" aria-disabled="true">
        <div class="row between center"><span class="ic" style="margin:0">${c.icon}</span><span class="badge ok">Coming soon</span></div>
        <div class="t" style="margin-top:8px">${H(c.label)}</div><div class="d">${H(c.d)}</div>
        <div class="small faint" style="margin-top:8px">Content incomplete: more practice questions are being prepared.</div></div>`;
      return `
      <a class="card linkcard" href="#/practice/setup/${c.id}" data-cat="${c.id}">
        <div class="row between center"><span class="ic" style="margin:0">${c.icon}</span>${l?scoreBadge(l.results.score):`<span class="badge">New</span>`}</div>
        <div class="t" style="margin-top:8px">${H(c.label)}</div><div class="d">${H(c.d)}</div>
        ${prog?`<div class="small" style="margin-top:8px;color:var(--accent)">Recommended: ${PRACTICE_DIFF[prog.difficulty].label}</div>`:""}</a>`; }).join("")}</div>
    <p class="note">Your sessions are saved in <a href="#/practice/history">My Practice History</a>.</p>`;
}

/* ---------- Setup --------------------------------------------------------- */
function scrPracticeSetup(catId){
  const c=practiceCat(catId); if(!c){ go("practice"); return; }
  if(normCategoryId(catId)!==catId){ go("practice/setup/"+normCategoryId(catId)); return; }
  const counts=QuestionBank.counts(catId), avail=isCategoryAvailable(catId);
  const prog=practiceProgression(catId);
  const preset=(App.practicePreset&&App.practicePreset.cat===catId)?App.practicePreset.diff:null;
  App.practiceSel = App.practiceSel && App.practiceSel.cat===catId ? App.practiceSel : { cat:catId, diff:preset||(prog&&prog.difficulty)||"easy" };
  if(preset) App.practiceSel.diff=preset; App.practicePreset=null;
  const active=activePractice();
  el.innerHTML=`<p class="small"><a href="#/practice">← Practice Lab</a></p>`+pageHead("Practice setup", `${c.icon} ${H(c.label).toUpperCase()}`, H(c.d))
  + `<div class="card">
      <h3>Choose difficulty</h3>
      <div class="opts" id="pDiff">${Object.entries(PRACTICE_DIFF).map(([k,D])=>optCard({ sel:App.practiceSel.diff===k, onclick:`pickPracticeDiff('${k}')`,
        title:D.label.toUpperCase(), d:`${PRACTICE_QUESTIONS} Questions · ${D.minutes} Minutes`, why:D.d+` (${counts[k]} published questions in this level.)`,
        tag:counts[k]<PRACTICE_MIN_PER_DIFFICULTY?"Coming soon":prog&&prog.difficulty===k?"Recommended":"" })).join("")}</div>
      ${counts[App.practiceSel.diff]<PRACTICE_QUESTIONS?`<p class="note" id="pUnavailable" style="color:#ffe08a">More practice questions are being prepared for this level.</p>`:""}
      ${avail?"":`<p class="note">This category is marked <b>Coming soon</b> until it has at least ${PRACTICE_MIN_PER_DIFFICULTY} published Easy, Medium and Hard questions. Questions are never borrowed from other categories.</p>`}
      ${prog?`<p class="note">${H(prog.reason)} Difficulty is never locked; choose any level.</p>`:`<p class="note">Progression: Medium is recommended after 3 Easy sessions with 80%+ on your latest two; Hard after 3 Medium sessions with 80%+ on your latest two. Difficulty is never locked.</p>`}
      <h3 style="margin-top:18px">Competencies tested</h3>
      <div class="feat" style="margin-top:0">${c.competencies.map(x=>`<span>${H(competencyName(x.id))}</span>`).join("")}</div>
      <h3 style="margin-top:18px">How it works</h3>
      <ul class="clean small"><li>Exactly ${PRACTICE_QUESTIONS} questions. The timer starts when you press Start and keeps running if you leave or refresh.</li>
        <li>Move with Previous / Next, jump using the question numbers, and flag questions for review.</li>
        <li>Every answer autosaves. When time runs out, your answers are submitted automatically; unanswered questions are marked "No response".</li></ul>
      ${active?`<p class="note" style="color:var(--ok)">Starting a new session will submit your in-progress ${H(practiceCat(active.category).label)} session as it is.</p>`:""}
      <div class="row wrapw" style="margin-top:18px;gap:10px"><button class="btn primary lg upper" id="startPractice" onclick="startPractice('${catId}')" ${counts[App.practiceSel.diff]<PRACTICE_QUESTIONS?"disabled":""}>Start practice</button><a class="btn ghost" href="#/practice">Cancel</a></div>
    </div>`;
}
function pickPracticeDiff(k){ App.practiceSel.diff=k; scrPracticeSetup(App.practiceSel.cat); }
function startPractice(catId){
  if(QuestionBank.pool(normCategoryId(catId), App.practiceSel.diff).length<PRACTICE_QUESTIONS){ alert("More practice questions are being prepared for this level."); return; }
  const prev=activePractice(); if(prev) submitPracticeSession(prev, false);
  if(!createPracticeSession(catId, App.practiceSel.diff)){ alert("More practice questions are being prepared for this level."); return; }
  go("practice/run");
}

/* ---------- Runner -------------------------------------------------------- */
function scrPracticeRun(){
  const ps=activePractice();
  if(!ps){ el.innerHTML=emptyCard("⏱️","No practice in progress","Choose a category in the Practice Lab to start a timed 10-question session.","#/practice","Open Practice Lab"); return; }
  if(practiceRemaining(ps)<=0){ submitPracticeSession(ps, true); App.autoSubmitted=ps.id; go("practice/results/"+ps.id); return; }
  renderPracticeRun(ps);
  clearInterval(pTimer);
  pTimer=setInterval(()=>{
    const left=practiceRemaining(ps), t=document.getElementById("pClock");
    if(t){ t.textContent=fmtClock(left); t.className="pclock"+(left<60000?" over":left<180000?" warn":""); }
    if(left<=0){ clearInterval(pTimer); accountTime(ps); submitPracticeSession(ps, true); App.autoSubmitted=ps.id; go("practice/results/"+ps.id); }
  }, 1000);
}
function accountTime(ps){ if(!pShownAt) return; const q=ps.questions[ps.current]; if(q){ ps.timeSpent[q.id]=(ps.timeSpent[q.id]||0)+Math.round((Date.now()-pShownAt)/1000); } pShownAt=Date.now(); }
function leavePractice(){ clearInterval(pTimer); pTimer=null; const ps=activePractice(); if(ps){ accountTime(ps); Repo.practiceSessions.save(ps); } pShownAt=0; Speech.stop(); }
function renderPracticeRun(ps){
  const q=ps.questions[ps.current], r=ps.responses[q.id]||{}, c=practiceCat(ps.category), D=PRACTICE_DIFF[ps.difficulty];
  const answered=ps.questions.filter(x=>isAnswered(x, ps.responses[x.id])).length, flagged=ps.flags.includes(q.id);
  pShownAt=Date.now();
  el.innerHTML=`<div class="card prun">
    <div class="row between center wrapw"><div><span class="kicker" style="margin:0">${c.icon} ${H(c.label)} · ${D.label}</span>
      <div style="font-weight:800;font-size:18px" id="pCount">Question ${ps.current+1} / ${PRACTICE_QUESTIONS}</div></div>
      <div class="ptime"><div class="small faint">Time remaining</div><div class="pclock" id="pClock" role="timer" aria-live="off">${fmtClock(practiceRemaining(ps))}</div></div></div>
    <div class="progress" style="margin:12px 0 6px" role="progressbar" aria-label="Questions answered" aria-valuenow="${answered}" aria-valuemin="0" aria-valuemax="${PRACTICE_QUESTIONS}"><i style="width:${answered/PRACTICE_QUESTIONS*100}%"></i></div>
    <div class="row between wrapw small faint"><span>${answered} of ${PRACTICE_QUESTIONS} answered${ps.flags.length?` · ${ps.flags.length} flagged`:""}</span><span id="pSaved">Autosave on</span></div>
    <nav class="palette" aria-label="Questions">${ps.questions.map((x,i)=>`<button class="pnum ${i===ps.current?"cur":""} ${isAnswered(x,ps.responses[x.id])?"done":""} ${ps.flags.includes(x.id)?"flag":""}" onclick="pGoto(${i})" aria-label="Question ${i+1}${ps.flags.includes(x.id)?", flagged":""}">${i+1}</button>`).join("")}</nav>
  </div>
  <div class="card" id="pQuestion">
    <div class="row between center wrapw"><span class="qmeta" style="margin:0">${H(q.comp)} · ${typeof q.d==="number"?["","Easy","Medium","Hard"][q.d]:PRACTICE_DIFF[q.difficulty||ps.difficulty].label} item</span>
      <button class="btn sm ${flagged?"danger":"ghost"}" id="flagBtn" onclick="pFlag()" aria-pressed="${flagged}">${flagged?"⚑ Flagged for review":"⚐ Flag for review"}</button></div>
    ${renderPQ(q, r, false)}
  </div>
  <div class="card"><div class="row between wrapw" style="gap:10px">
    <button class="btn" onclick="pGoto(${ps.current-1})" ${ps.current===0?"disabled":""}>← Previous</button>
    <button class="btn primary" id="pSubmit" onclick="pSubmit()">Submit practice</button>
    <button class="btn" id="pNext" onclick="pGoto(${ps.current+1})" ${ps.current===PRACTICE_QUESTIONS-1?"disabled":""}>Next →</button>
  </div></div>`;
}

/* Material + inputs for one question. readonly=true renders the review version. */
function renderPQ(q, r, ro){
  r=r||{}; const m=q.material||{}, dis=ro?"disabled":"";
  const block=(label, text, code)=>`<div class="resplabel">${label}</div><div class="resp ${code?"code":""}">${H(text)}</div>`;
  let mat="";
  if(q.prompt) mat+=`<div class="qtext" style="margin:10px 0 6px">${H(q.prompt)}</div>`;
  if(m.guideline) mat+=`<div class="small muted" style="margin:6px 0">${H(m.guideline)}</div>`;
  if(m.user) mat+=block("User prompt", m.user);
  if(m.query) mat+=block("Search query", m.query)+block("Result", m.result);
  if(m.direction) mat+=block(`Source (${m.direction})`, m.source)+block("Translation", m.translation);
  if(m.text) mat+=block("Text", m.text);
  if(m.reference) mat+=block("Reference material", m.reference);
  if(m.claim) mat+=block("Claim", m.claim);
  if(m.response) mat+=block(q.fmt==="multi"&&m.reference?"AI summary":"AI response", m.response, /def |function |=>|\{\n/.test(m.response));
  if(m.code) mat+=block("AI-generated code", m.code, true);
  if(m.a) mat+=`<div class="grid g2">${["a","b"].map(k=>`<div>${block("Response "+k.toUpperCase(), m[k])}</div>`).join("")}</div>`;
  if(m.artifact) mat+=renderArtifact(m.artifact);
  if(m.svg) mat+=`<div class="pimg">${m.svg}</div>`;
  if(m.caption) mat+=block("AI caption", m.caption);
  if(q.fmt==="transcribe"){
    const plays=r.plays||0, limit={easy:Infinity,medium:3,hard:2}[(activePractice()||{}).difficulty||"easy"];
    mat += Speech.ttsAvailable
      ? `<div class="row wrapw center" style="gap:10px;margin:10px 0">${ro?"":`<button class="btn" onclick="pPlay()" ${plays>=limit?"disabled":""}>▶ Play audio</button>`}<span class="small faint">${limit===Infinity?"Unlimited plays":`Plays used: ${plays} / ${limit}`}</span></div>`
      : `<div class="note">Audio playback isn't available in this browser, so this item is a proofreading task: correct the draft transcript below.</div>${block("Draft transcript", corruptDraft(q.answer))}`;
  }
  const radio=(name, val, label, checked)=>`<label class="pick"><input type="radio" name="${name}" ${checked?"checked":""} ${dis} onchange='pSet(${JSON.stringify(name)}, ${JSON.stringify(val)})'> <span>${H(label)}</span></label>`;
  const check=(val, label, checked)=>`<label class="pick"><input type="checkbox" ${checked?"checked":""} ${dis} onchange='pToggle(${JSON.stringify(val)})'> <span>${H(label)}</span></label>`;
  let inp="";
  switch(q.fmt){
    case "rank":
      inp=`<h3 style="margin-top:16px">Overall preference</h3><div class="picks">${RANK_SCALE.map(([v,l])=>radio("pref", v, l, r.pref===v)).join("")}</div>
        <h3 style="margin-top:16px">Dimension ratings</h3><table class="dimtbl"><tbody>${RANK_DIMS.map(([k,l])=>`<tr><th scope="row">${l}</th>${["A","T","B"].map(v=>`<td><label class="pick"><input type="radio" name="dim-${k}" ${(r.dims||{})[k]===v?"checked":""} ${dis} onchange="pDim('${k}','${v}')"> ${v==="T"?"Tie":v}</label></td>`).join("")}</tr>`).join("")}</tbody></table>`; break;
    case "eval": inp=`<h3 style="margin-top:16px">Which errors are present?</h3><div class="picks">${ERROR_TYPES.map(([k,l])=>check(k, l, (r.choices||[]).includes(k))).join("")}</div>`; break;
    case "fact": inp=`<h3 style="margin-top:16px">Classification</h3><div class="small faint" style="margin-bottom:8px">${H(FACT_HELP)}</div><div class="picks">${FACT_LABELS.map(l=>radio("choice", l, l, r.choice===l)).join("")}</div>`; break;
    case "multi": inp=`<h3 style="margin-top:16px">Select all that apply</h3><div class="picks">${q.options.map((o,i)=>check(i, o, (r.choices||[]).includes(i))).join("")}</div>`; break;
    case "single": inp=`<h3 style="margin-top:16px">Choose one</h3><div class="picks">${q.options.map((o,i)=>radio("choice", i, o, r.choice===i)).join("")}</div>`; break;
  }
  const textLabel = q.fmt==="rewrite" ? "Your improved response" : q.fmt==="transcribe" ? "Your transcript" : q.fmt==="fact" ? "Evidence from the reference (required)" : "Written reasoning (required)";
  inp+=`<div class="field"><label class="fld" for="pText">${textLabel}</label><textarea id="pText" ${ro?"readonly":""} oninput="pTextInput(this.value)" placeholder="${q.fmt==="rewrite"?"Write the corrected response…":q.fmt==="transcribe"?"Type exactly what you hear…":"Explain your judgment and cite the evidence…"}">${H(r.text||"")}</textarea></div>`;
  return mat+inp;
}
function corruptDraft(t){ const sw={"four":"for","two":"to","their":"there","whether":"weather","weather":"whether","nine":"nein","to":"too","for":"four"};
  let n=0; return t.replace(/\b\w+\b/g,w=>{ const k=w.toLowerCase(); if(sw[k] && n<2){ n++; return sw[k]; } return w; }).replace(/\./g,"").replace(/,/g,""); }

/* Input handlers — every change autosaves */
function pResp(){ const ps=activePractice(); if(!ps) return null; const q=ps.questions[ps.current]; ps.responses[q.id]=ps.responses[q.id]||{}; return { ps, q, r:ps.responses[q.id] }; }
function pPersist(ps, light){
  ps.responses[ps.questions[ps.current].id].updatedAt=Date.now();
  clearTimeout(pSaveT); const save=()=>{ Repo.practiceSessions.save(ps); const s=document.getElementById("pSaved"); if(s) s.textContent="Saved ✓ "+new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"}); };
  if(light) pSaveT=setTimeout(save, 250); else save();
  if(!light) refreshPalette(ps);
}
function refreshPalette(ps){
  document.querySelectorAll(".palette .pnum").forEach((b,i)=>{ const x=ps.questions[i]; b.classList.toggle("done", isAnswered(x, ps.responses[x.id])); b.classList.toggle("flag", ps.flags.includes(x.id)); });
  const a=ps.questions.filter(x=>isAnswered(x, ps.responses[x.id])).length, bar=document.querySelector(".prun .progress>i"); if(bar) bar.style.width=(a/PRACTICE_QUESTIONS*100)+"%";
}
function pSet(k, v){ const o=pResp(); if(!o) return; o.r[k]=v; pPersist(o.ps); }
function pDim(k, v){ const o=pResp(); if(!o) return; o.r.dims=o.r.dims||{}; o.r.dims[k]=v; pPersist(o.ps); }
function pToggle(v){ const o=pResp(); if(!o) return; const c=o.r.choices=o.r.choices||[]; const i=c.indexOf(v); if(i>=0) c.splice(i,1); else c.push(v); pPersist(o.ps); }
function pTextInput(v){ const o=pResp(); if(!o) return; o.r.text=v; pPersist(o.ps, true); refreshPalette(o.ps); }
function pPlay(){ const o=pResp(); if(!o) return; o.r.plays=(o.r.plays||0)+1; pPersist(o.ps); const was=Speech.settings.muted; Speech.settings.muted=false; Speech.say([{text:o.q.answer, lang:"en"}]); Speech.settings.muted=was; renderPracticeRun(o.ps); }
function pFlag(){ const ps=activePractice(); if(!ps) return; const id=ps.questions[ps.current].id, i=ps.flags.indexOf(id); if(i>=0) ps.flags.splice(i,1); else ps.flags.push(id); Repo.practiceSessions.save(ps);
  const b=document.getElementById("flagBtn"), f=ps.flags.includes(id); if(b){ b.textContent=f?"⚑ Flagged for review":"⚐ Flag for review"; b.className="btn sm "+(f?"danger":"ghost"); b.setAttribute("aria-pressed",f); } refreshPalette(ps); }
function pGoto(i){ const ps=activePractice(); if(!ps || i<0 || i>=PRACTICE_QUESTIONS) return; accountTime(ps); ps.current=i; Repo.practiceSessions.save(ps); Speech.stop(); renderPracticeRun(ps); window.scrollTo({top:0}); }
function pSubmit(){
  const ps=activePractice(); if(!ps) return;
  const un=ps.questions.filter(x=>!isAnswered(x, ps.responses[x.id])).length, fl=ps.flags.length;
  const msg=`Submit this practice session now?${un?`\n\n${un} question${un>1?"s are":" is"} unanswered and will be marked "No response".`:""}${fl?`\n${fl} question${fl>1?"s are":" is"} flagged for review.`:""}`;
  if(!confirm(msg)) return;
  accountTime(ps); clearInterval(pTimer); submitPracticeSession(ps, false); go("practice/results/"+ps.id);
}

/* ---------- Results + review ---------------------------------------------- */
function answerSummary(q, r){
  if(!isAnswered(q, r)) return "<i>No response</i>";
  const parts=[];
  if(q.fmt==="rank"){ parts.push(RANK_SCALE.find(x=>x[0]===r.pref)[1]); const d=Object.entries(r.dims||{}).map(([k,v])=>`${(RANK_DIMS.find(x=>x[0]===k)||[k,k])[1]}: ${v==="T"?"Tie":v}`); if(d.length) parts.push(d.join("; ")); }
  if(q.fmt==="eval") parts.push((r.choices||[]).map(k=>optName(q,k)).join(", "));
  if(q.fmt==="multi") parts.push((r.choices||[]).map(i=>q.options[i]).join("; "));
  if(q.fmt==="fact") parts.push(r.choice);
  if(q.fmt==="single") parts.push(q.options[r.choice]);
  return parts.map(H).join(" · ")+(r.text?`<div class="qa" style="margin:6px 0 0">“${H(r.text)}”</div>`:"");
}
function scrPracticeResults(id){
  const ps=Repo.practiceSessions.get(id);
  if(!ps){ el.innerHTML=emptyCard("🔎","Session not found","This practice session may have been deleted.","#/practice/history","My Practice History"); return; }
  if(ps.status!=="submitted"){ go("practice/run"); return; }
  const R=ps.results, c=practiceCat(ps.category), D=PRACTICE_DIFF[ps.difficulty], auto=App.autoSubmitted===id; App.autoSubmitted=null;
  const prog=practiceProgression(ps.category);
  const nextDiff = prog ? prog.difficulty : (R.score>=80 && ps.difficulty!=="hard" ? (ps.difficulty==="easy"?"medium":"hard") : ps.difficulty);
  const focusCat = R.focus ? practiceRecFor(R.focus, R.competencies[R.focus]).category : ps.category;
  const recCat = R.score>=80 ? ps.category : (focusCat||ps.category);
  el.innerHTML=`${auto?`<div class="alexsay"><span class="who">Time's up</span><p>Your answers were saved and submitted automatically. Unanswered questions are marked "No response".</p></div>`:""}
  <div class="card">
    <div class="row between center wrapw"><div><span class="kicker" style="margin:0">${c.icon} ${H(c.label)}</span><h2 style="margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Session complete</h2></div>${scoreBadge(R.score)}</div>
    <div class="row center wrapw" style="gap:26px;margin-top:18px">
      <div class="ring" style="--p:${R.score}"><div><div class="scorebig">${R.score}</div><div class="small muted">/ 100</div></div></div>
      <div class="grid g4 grow" style="min-width:260px">
        ${[["Difficulty",D.label],["Questions answered",`${R.answered} / ${PRACTICE_QUESTIONS}`],["Strong",R.strong],["Needs improvement",R.needs],["No response",R.noResponse],
           ["Time used",fmtDur(R.timeUsedSec)],["Avg per question",fmtDur(R.avgSec)],["Submitted",ps.autoSubmitted?"Auto (time up)":"Manually"]]
          .map(([l,v])=>`<div class="mini"><div class="l">${l}</div><div class="v">${H(v)}</div></div>`).join("")}
      </div></div>
    <div class="grid g2" style="margin-top:18px">
      <div><h3>Competency breakdown</h3>${R.competencyEvidence
          ? Object.values(R.competencyEvidence).sort((a,b)=>b.score-a.score).map(e=>barRow(`${e.name} (${e.n} question${e.n>1?"s":""})`, e.score)).join("")
          : Object.entries(R.competencies).map(([k,v])=>barRow(k,v)).join("")}
        ${ps.snapshot?`<p class="small faint" style="margin-top:8px">Scored against question versions captured on ${H(fmtDate(ps.snapshot.takenAt))}.</p>`:""}</div>
      <div><h3>Summary</h3><ul class="clean small">
        <li><b>Strongest skill:</b> ${H(R.strongest||"Not yet established: aim for 75+ on a competency")}</li>
        <li><b>Focus next:</b> ${H(R.focus||"Move up a difficulty level")}</li>
        <li><b>Recommended practice:</b> ${H(practiceCat(recCat).label)} · ${PRACTICE_DIFF[nextDiff].label} · ${PRACTICE_QUESTIONS} Questions · ${PRACTICE_DIFF[nextDiff].minutes} Minutes</li></ul>
        ${prog?`<p class="note">${H(prog.reason)}</p>`:""}
        <div class="row wrapw noprint" style="gap:10px;margin-top:12px"><button class="btn primary" onclick="openPracticeSetup('${recCat}','${nextDiff}')">Start recommended practice</button><a class="btn" href="#/practice/history">Practice history</a></div></div>
    </div>
  </div>
  <div class="card"><h2>Question review</h2>
    ${ps.questions.map((q,i)=>{ const g=R.questions[i], r=ps.responses[q.id], st=g.status==="no_response"?`<span class="badge bad">No response</span>`:scoreBadge(g.score); return `
    <details class="qresult" ${i===0?"open":""}><summary class="row between center wrapw"><span class="qmeta" style="margin:0">Q${i+1} · ${H(q.comp)} ${ps.flags.includes(q.id)?"· ⚑ flagged":""} · ${fmtDur(ps.timeSpent[q.id]||0)}</span>${st}</summary>
      ${renderPQ(q, r, true)}
      <div class="review">
        <div><b>Your answer:</b> ${answerSummary(q, r)}</div>
        <div><b>Expected outcome:</b> ${H(g.expected)}</div>
        ${g.correct.length?`<div><b>What was correct:</b><ul class="tips">${g.correct.map(x=>`<li>${H(x)}</li>`).join("")}</ul></div>`:""}
        ${g.missed.length?`<div><b>What was missed:</b><ul class="tips">${g.missed.map(x=>`<li>${H(x)}</li>`).join("")}</ul></div>`:""}
        <div class="small muted"><b>Rubric:</b> ${H(g.rubric)}</div>
        <div><b>Strong reasoning example:</b> ${H(q.model)}</div>
      </div></details>`; }).join("")}
  </div>`;
}

/* ---------- History ------------------------------------------------------- */
function scrPracticeHistory(){
  const list=Repo.practiceSessions.all(), legacy=Repo.practice.all();
  el.innerHTML=pageHead("Practice","My practice history","Every timed practice session, newest first.")
  + (list.length?`<div class="card"><div class="art-scroll"><table class="htable"><thead><tr><th>Date</th><th>Category</th><th>Difficulty</th><th>Score</th><th>Questions</th><th>Time</th><th>Avg time</th><th></th></tr></thead><tbody>
    ${list.map(p=>{ const c=practiceCat(p.category), R=p.results, D=PRACTICE_DIFF[p.difficulty]||{label:p.difficulty}; return `<tr><td>${H(fmtDate(p.startedAt))}</td><td>${c?c.icon+" "+H(c.label):H(p.category)}</td><td>${H(D.label)}</td>
      <td>${R?scoreBadge(R.score):`<span class="badge info">In progress</span>`}</td><td>${PRACTICE_QUESTIONS}</td><td>${R?fmtDur(R.timeUsedSec):fmtClock(practiceRemaining(p))+" left"}</td><td>${R?fmtDur(R.avgSec):"–"}</td>
      <td>${R?`<a class="btn sm" href="#/practice/results/${p.id}">Review</a>`:`<a class="btn sm primary" href="#/practice/run">Resume</a>`}</td></tr>`; }).join("")}
    </tbody></table></div></div>`
  : emptyCard("🧪","No practice sessions yet","Start a timed 10-question session in the Practice Lab.","#/practice","Open Practice Lab"))
  + (legacy.length?`<div class="card legacy"><h3>Legacy practice</h3><p class="small muted">Single tasks completed before the Practice Lab upgrade. They stay readable here but are not counted in standardised analytics, progression or recommendations.</p>
    <div class="list">${legacy.map(a=>`<div class="item legacyrow"><div><div class="t"><span class="badge">LEGACY PRACTICE</span> ${H(a.title)}</div><div class="m">1 Task · Completed before Practice Lab upgrade · ${H(fmtDate(a.at))}${a.skill?" · "+H(a.skill):""}</div></div>${scoreBadge(a.score)}</div>`).join("")}</div></div>`:"");
}
