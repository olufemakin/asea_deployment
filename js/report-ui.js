/* =============================================================================
   Alex Interview Report, Interview History, Score Trends.
   Every major score has a "Why did I get this score?" panel built from stored
   rubric evidence (js/scoring.js): evidence found, evidence missing, verbatim
   excerpts from the candidate's own answers, and how to improve.
   ========================================================================== */
"use strict";

const fmtDurS=sec=>{ sec=Math.max(0,Math.round(sec||0)); const m=Math.floor(sec/60); return m?`${m} min ${String(sec%60).padStart(2,"0")} s`:`${sec} s`; };
function sessionDuration(s){ return s.completedAt&&s.startedAt ? Math.round((s.completedAt-s.startedAt)/1000) : (s.answers||[]).reduce((a,x)=>a+(x.seconds||0),0); }
function whyPanel(title, w, open){
  const sec=(h, xs, cls)=>xs&&xs.length?`<div class="why-sec ${cls||""}"><div class="why-h">${h}</div><ul class="tips">${xs.map(x=>`<li>${H(x)}</li>`).join("")}</ul></div>`:"";
  return `<details class="whybox" ${open?"open":""}><summary>Why did I get this score?${title?` <span class="faint small">· ${H(title)}</span>`:""}</summary>
    ${sec("Evidence found", w.found, "good")}${sec("Evidence missing", w.missing, "bad")}
    ${w.excerpts&&w.excerpts.length?`<div class="why-sec"><div class="why-h">Relevant response excerpts</div>${w.excerpts.map(x=>`<blockquote class="excerpt">“${H(x)}”</blockquote>`).join("")}</div>`:""}
    ${sec("How to improve", w.improve)}
    ${!(w.found||[]).length&&!(w.missing||[]).length?`<p class="small muted">Not enough answer content to show evidence.</p>`:""}</details>`;
}
function levelBadge(L){ const k=L>=3?"good":L===2?"ok":"bad"; return `<span class="badge ${k}">Rubric ${L}/4 · ${RUBRIC_LEVELS[L].label}</span>`; }

/* ---------- Report -------------------------------------------------------- */
function scrReport(id){
  const s=Repo.sessions.get(id);
  if(!s || !s.answers || !s.answers.length){ el.innerHTML=emptyCard("🔎","Report not found","This report may have been deleted, or the interview ended before any answers were recorded.","#/results","All results"); return; }
  reportOf(s); Repo.sessions.save(s);
  const sc=s.scores.overall, [bk,bl]=band(sc), nm=s.candidate&&s.candidate.name, role=s.scores.role||{ dims:{}, why:{}, weights:{} };
  const closing = App.closing && App.closing.id===id ? App.closing : null;
  if(closing){ App.closing=null; if(closing.speak) Speech.say(closing.text); }
  const dims=Object.values(role.dims), strong=dims.filter(d=>d.pct>=70).sort((a,b)=>b.pct-a.pct), weak=dims.filter(d=>d.pct<70).sort((a,b)=>a.pct-b.pct);
  const an=responseAnalytics(s), nx=nextInterviewFor(s), canRepeat=s.version>=2 && getProfession(s.profession.id);
  const head=[["Interviewed by",`${ALEX.name} · ${ALEX.title}`],["Profession",s.profession.title],["Interview",sessionTypeLabel(s).replace(/ Interview$/,"")],
    ["Mode",MODES[s.mode]?MODES[s.mode].label:"Text"],["Difficulty",DIFFS[s.difficulty]?DIFFS[s.difficulty].label:"–"],["Experience",LEVELS[s.experienceLevel]?LEVELS[s.experienceLevel].label:"–"],
    ["Date",fmtDate(s.completedAt||s.startedAt)],["Questions",String(s.answers.length)]];
  if(s.recommendedInterviewType && s.recommendedInterviewType!==s.interviewType && TYPES[s.recommendedInterviewType]) head.push(["Recommended type",TYPES[s.recommendedInterviewType].label]);
  if(s.cv && s.cv.used) head.push(["Personalised with","Your confirmed CV"]);
  el.innerHTML=`
  ${closing?`<div class="alexsay noprint"><span class="who">${H(ALEX.name)}</span><p>${H(closing.text)}</p></div>`:""}
  <div class="card report-head">
    <div class="row between center wrapw"><div><div class="kicker" style="margin:0">BSP AI WorkReady</div><h1 class="rtitle">Interview Report</h1>${nm?`<div class="muted">${H(nm)}</div>`:""}</div>
      <span>${statusBadge(s)} <span class="badge ${bk}">${bl}</span></span></div>
    <div class="row center wrapw" style="gap:26px;margin-top:16px">
      <div class="ring" style="--p:${sc}"><div><div class="scorebig">${sc}</div><div class="small muted">/ 100</div></div></div>
      <div class="grow" style="min-width:240px"><div class="small faint" style="text-transform:uppercase;letter-spacing:1px;font-weight:800">Overall score · BSP Role Interview Score</div>
        <div style="font-size:22px;font-weight:900;margin:2px 0 8px" id="overallScore">${sc} / 100</div>
        <table class="summary kv">${head.map(([k,v])=>`<tr><td>${k}</td><td>${H(v)}</td></tr>`).join("")}</table></div>
    </div>
  </div>

  <div class="card"><h2>Overall performance</h2>
    <p style="font-size:16px">${H(s.feedback?s.feedback.verdict:"")}</p>
    <p class="small muted">How this score was built: each answer was given a rubric level from 0 to 4 on every dimension it tested. Each dimension's % is its average level ÷ 4. The overall score is the weighted average of the dimensions this interview tested (${dims.map(d=>`${d.label} ${d.weight}`).join(" · ")}).</p>
    ${whyPanel("Overall score", role.why||{}, false)}
  </div>

  <div class="card"><h2>Competency breakdown</h2>
    ${dims.length?dims.map(d=>`<div class="dimrow">${barRow(d.label, d.pct, `· rubric ${d.avgLevel}/4 · ${d.n} answer${d.n>1?"s":""}`)}${whyPanel(d.label, d, false)}</div>`).join(""):`<p class="small muted">No rubric dimensions were recorded for this session.</p>`}
    ${s.langBalance && s.scores.areas?`<h3 style="margin-top:16px">Language areas</h3>${Object.entries(s.scores.areas).map(([k,v])=>barRow(k, v.score, `· ${v.weight}% weight`)).join("")}`:""}
    ${s.scores.competencyEvidence?`<details class="evidence" style="margin-top:12px"><summary><b>Competency evidence by question</b> <span class="small faint">(each competency Alex tested)</span></summary>
      <div class="list" style="margin-top:10px">${Object.values(s.scores.competencyEvidence).sort((a,b)=>a.score-b.score).map(e=>`<div class="item"><div>
        <div class="t">${H(e.name)} · ${e.score}% <span class="faint small">· ${e.n} answer${e.n>1?"s":""}</span></div>
        ${e.found.length?`<div class="m">Evidence found: ${H(e.found.slice(0,8).join(", "))}</div>`:""}
        ${e.missing.length?`<div class="m faint">Evidence missing: ${H(e.missing.slice(0,8).join(", "))}</div>`:""}</div></div>`).join("")}</div></details>`:""}
  </div>

  <div class="grid g2">
    <div class="card"><h2>What you did well</h2>${strong.length?`<ul class="clean small">${strong.map(d=>`<li><b>${H(d.label)} (${d.pct}%)</b>: ${H(d.found.slice(0,3).join("; ")||"consistent rubric levels")}</li>`).join("")}</ul>`:`<p class="small muted">No dimension reached 70% yet. The next section shows exactly what to add.</p>`}</div>
    <div class="card"><h2>Where you can improve</h2>${weak.length?`<ul class="clean small">${weak.map(d=>`<li><b>${H(d.label)} (${d.pct}%)</b>: ${H((d.improve[0]||d.missing[0]||"Add more evidence."))}</li>`).join("")}</ul>`:`<p class="small muted">Every dimension is at 70% or above. Try a harder difficulty or a Full Mock Interview.</p>`}</div>
  </div>

  <div class="card"><h2>Answer-by-answer review</h2>
    ${s.answers.map((a,i)=>{ const L=a.rubric?a.rubric.level:0; return `
      <details class="qresult" ${i===0?"open":""}><summary class="row between center wrapw"><span class="qmeta" style="margin:0">Q${i+1}${a.questionType?` · ${H(QTYPE_LABEL[a.questionType]||"")}`:""}${a.compLabel?` · ${H(a.compLabel)}`:""}</span>${levelBadge(L)}</summary>
        ${a.artifact?renderArtifact(a.artifact):""}
        ${a.scenario?`<div class="scenario ${a.code?"code":""}" style="margin-top:10px">${H(a.scenario)}</div>`:""}
        <div class="rv"><b>Question</b><div>${H(a.q)}</div></div>
        <div class="rv"><b>${s.mode==="voice"?"Your answer / transcript":"Your answer"}</b><div class="qa">${H(a.answer)}</div></div>
        ${a.followUp?`<div class="rv"><b>${H(ALEX.name)}'s follow-up${a.followUp.label?` (${H(a.followUp.label)})`:""}</b><div class="qa">${H(a.followUp.question)}<br><b>Your follow-up answer:</b> ${a.followUp.answer?H(a.followUp.answer):"<i>Not answered</i>"}</div></div>`:""}
        <div class="grid g2 rvgrid">
          <div><b>Competency</b><div class="small">${H(a.compLabel||"–")}</div></div>
          <div><b>Score</b><div class="small">${a.rubric?`${a.rubric.pct}% · rubric level ${L}/4 (${H(RUBRIC_LEVELS[L].d)})`:H(a.score+"/100")}</div></div>
          <div><b>Strong signals found</b><div class="small">${(a.hit||[]).length?H(a.hit.join(", ")):"<i>None of the expected signals</i>"}</div></div>
          <div><b>Missing signals</b><div class="small">${(a.missed||[]).length?H(a.missed.slice(0,8).join(", ")):"<i>None</i>"}</div></div>
        </div>
        <div class="rv"><b>${H(ALEX.name)}'s feedback</b><ul class="tips small">${(a.feedback||[]).map(t=>`<li>${H(t)}</li>`).join("")}</ul></div>
        <div class="rv"><b>A stronger structure could be:</b><ol class="tips small">${strongerStructure(a).map(t=>`<li>${H(t)}</li>`).join("")}</ol></div>
        <div class="small faint">${a.seconds||0}s · ${a.wc||0} words${a.rubric&&a.rubric.dims?` · ${Object.entries(a.rubric.dims).filter(([k])=>ROLE_DIMS[k]).map(([k,v])=>`${ROLE_DIMS[k].label} ${v}/4`).join(" · ")}`:""}</div>
      </details>`; }).join("")}
  </div>

  <div class="card"><h2>Time / response analytics</h2>
    <div class="grid g4">${[["Total duration",fmtDurS(an.durationSec)],["Answering time",fmtDurS(an.answerSec)],["Avg per answer",fmtDurS(an.avgSec)],["Avg words",`${an.avgWords} (target ${an.targetWords}+)`],
      ["Questions",an.questions],["Follow-ups",`${an.followUpsAnswered} / ${an.followUps} answered`],["Longest answer",an.longest?`Q${an.longest.n} · ${an.longest.wc} words`:"–"],["Shortest answer",an.shortest?`Q${an.shortest.n} · ${an.shortest.wc} words`:"–"]]
      .map(([l,v])=>`<div class="mini"><div class="l">${l}</div><div class="v">${H(v)}</div></div>`).join("")}</div></div>

  <div class="card"><h2>Recommended practice</h2><div id="reportRecs">${recommendationsHTML({ session:s })||`<p class="small muted">No practice gap stood out. Keep practising across categories in the <a href="#/practice">Practice Lab</a>.</p>`}</div></div>

  <div class="card"><h2>Recommended next interview</h2>
    ${nx?`<div class="item" style="display:flex"><div class="grow"><div class="t">${H(getProfession(nx.professionId).title)} · ${H(nx.label)}${nx.mode==="voice"?" · Voice":""}${nx.difficulty?" · "+H(DIFFS[nx.difficulty].label):""}</div><div class="m">${H(nx.why)}</div></div>
      <button class="btn primary" id="nextInterviewBtn" onclick="startRecommendedInterview(${H(JSON.stringify(nx))})">Set up this interview</button></div>`:`<p class="small muted">Start a new interview from the <a href="#/interview/start">setup page</a>.</p>`}
    <div class="row wrapw noprint" style="margin-top:16px;gap:10px">
      ${canRepeat?`<button class="btn" onclick="practiceAgain('${s.sessionId}')">↻ Retry this interview</button>`:""}
      <a class="btn" href="#/progress/trends/${H(s.profession.id)}">Compare progress</a>
      <button class="btn" onclick="window.print()">⬇ Save / print report</button>
      <a class="btn ghost" href="#/interview/history">Interview history</a>
    </div>
  </div>
  ${s.healthcare?`<p class="note">Educational practice with fictional scenarios only. This report is not medical advice and does not assess real patient care.</p>`:""}
  ${s.langBalance||["bilingual","language"].includes(s.interviewType)?`<p class="note">This practice report scores your answers to these questions only. It does not label you as native, fluent or a certified translator.</p>`:""}
  <div class="card"><h3>How scoring works</h3>
    <p class="small muted">Scores come from an explicit rubric, not a guess. Each answer is first rated 0–4 per dimension: <b>0</b> no meaningful answer or materially incorrect · <b>1</b> limited understanding, major concepts missing · <b>2</b> partial, correct direction but important gaps · <b>3</b> strong, correct reasoning with appropriate detail · <b>4</b> excellent, evidence-based with strong professional judgment. The criteria are coverage of what the question targets, explained reasoning, supporting specifics, judgment (risk, impact, verification), structure, and whether every part of the question was answered. Only then are levels converted to percentages.</p>
    <p class="small muted"><b>Communication</b> is scored from the words of your answers only. Hesitation sounds are removed first. <b>Accent, voice pitch, regional speech patterns, gender presentation and perceived ethnicity are never scored</b>; audio is never analysed or stored. Scoring runs entirely in your browser. This is a practice score for your own development, not a prediction of any hiring or assessment outcome.</p></div>`;
}
function startRecommendedInterview(nx){
  Object.assign(App.setup, { professionId:nx.professionId, type:nx.type, typeChosen:true }, nx.mode?{ mode:nx.mode }:{}, nx.difficulty?{ difficulty:nx.difficulty }:{});
  normalizeSetup(); App.setup.step=7; saveSetup(); go("interview/start");
}
function practiceAgain(id){
  const o=Repo.sessions.get(id); if(!o || !getProfession(o.profession.id)){ go("interview/start"); return; }
  const s=createSession({ professionId:o.profession.id, mode:o.mode, type:o.interviewType, level:o.experienceLevel, difficulty:o.difficulty, length:o.length||"standard", name:o.candidate&&o.candidate.name, platform:o.candidate&&o.candidate.platform, langBalance:o.langBalance, useCv:!!(o.cv&&o.cv.used) });
  startSession(s); App.session=s; Repo.prefs.set({ activeSessionId:s.sessionId }); go(needsMicCheck(s)?"interview/mic-check":"interview/session");
}

/* ---------- Interview history -------------------------------------------- */
function scrHistory(){
  const list=Repo.sessions.all();
  el.innerHTML=pageHead("Interview","Interview history","Every interview with Alex: open a report, retry it, or compare your progress over time.")
  + (list.length?`<div class="card"><div class="hrows">
    <div class="hrow hhead"><span>Profession</span><span>Interview type</span><span>Mode</span><span>Difficulty</span><span>Date</span><span>Duration</span><span>Score</span><span></span></div>
    ${list.map(s=>{ const has=s.answers&&s.answers.length; if(has) reportOf(s); return `
    <div class="hrow" data-session="${H(s.sessionId)}">
      <span data-l="Profession"><b>${H(s.profession.title)}</b> ${statusBadge(s)}</span><span data-l="Interview type">${H(sessionTypeLabel(s))}</span>
      <span data-l="Mode">${s.mode==="voice"?"🎙️ Voice":"⌨️ Text"}</span><span data-l="Difficulty">${H(DIFFS[s.difficulty]?DIFFS[s.difficulty].label:"–")}</span>
      <span data-l="Date">${H(fmtDate(s.startedAt))}</span><span data-l="Duration">${has?fmtDurS(sessionDuration(s)):"–"}</span>
      <span data-l="Score">${has&&s.scores?scoreBadge(s.scores.overall):"–"}</span>
      <span class="hacts">
        ${s.status==="in_progress"?`<button class="btn sm primary" onclick="resumeSession('${s.sessionId}')">Resume</button>`:""}
        ${has&&s.status!=="in_progress"?`<a class="btn sm" href="#/results/${s.sessionId}">View report</a>`:""}
        ${s.version>=2&&getProfession(s.profession.id)&&s.status!=="in_progress"?`<button class="btn sm" onclick="practiceAgain('${s.sessionId}')">Retry</button>`:""}
        ${has&&s.status!=="in_progress"?`<a class="btn sm ghost" href="#/progress/trends/${H(s.profession.id)}">Compare progress</a>`:""}
        <button class="btn sm ghost" onclick="deleteSession('${s.sessionId}')" aria-label="Delete this interview">Delete</button></span></div>`; }).join("")}
    </div></div>`
  : emptyCard("🗂️","No interviews yet","Your completed sessions will appear here. Practice your first interview with Alex.","#/interview/start","Start interview"));
}
function deleteSession(id){
  if(!confirm("Delete this interview and its report? This can't be undone.")) return;
  Repo.sessions.remove(id); if(Repo.prefs.get().activeSessionId===id) Repo.prefs.set({ activeSessionId:null });
  if(App.session && App.session.sessionId===id) App.session=null;
  scrHistory();
}

/* ---------- Score trends -------------------------------------------------- */
const TREND_SERIES=[["overall","Overall","#a78bfa"],["professional_reasoning","Reasoning","#60a5fa"],["domain_knowledge","Domain Expertise","#34d399"],["ai_evaluation","AI Evaluation","#f472b6"],["communication","Communication","#fbbf24"]];
function trendData(profId){
  return Repo.sessions.completed().filter(s=>s.profession.id===profId).map(reportOf).sort((a,b)=>(a.completedAt||a.startedAt)-(b.completedAt||b.startedAt))
    .map((s,i)=>{ const d=(s.scores.role||{}).dims||{}; return { n:i+1, id:s.sessionId, at:s.completedAt||s.startedAt, type:sessionTypeLabel(s), overall:s.scores.overall,
      professional_reasoning:d.professional_reasoning?d.professional_reasoning.pct:null, domain_knowledge:d.domain_knowledge?d.domain_knowledge.pct:null,
      ai_evaluation:d.ai_evaluation?d.ai_evaluation.pct:null, communication:d.communication?d.communication.pct:null }; });
}
function trendChart(rows){
  const W=640, Hh=220, P=34, n=rows.length, x=i=>n===1?W/2:P+i*(W-2*P)/(n-1), y=v=>Hh-P-(v/100)*(Hh-2*P);
  const grid=[0,25,50,75,100].map(v=>`<line x1="${P}" x2="${W-P}" y1="${y(v)}" y2="${y(v)}" stroke="rgba(255,255,255,.08)"/><text x="4" y="${y(v)+4}" font-size="10" fill="#7178ab">${v}</text>`).join("");
  const lines=TREND_SERIES.map(([k,,c])=>{ const pts=rows.map((r,i)=>r[k]==null?null:[x(i),y(r[k])]).filter(Boolean); if(!pts.length) return "";
    return `<polyline fill="none" stroke="${c}" stroke-width="${k==="overall"?3:2}" points="${pts.map(p=>p.join(",")).join(" ")}"/>${pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${c}"/>`).join("")}`; }).join("");
  const xl=rows.map((r,i)=>`<text x="${x(i)}" y="${Hh-10}" font-size="11" fill="#a7acd8" text-anchor="middle">Attempt ${r.n}</text>`).join("");
  return `<svg viewBox="0 0 ${W} ${Hh}" class="trendsvg" role="img" aria-label="Score trend chart">${grid}${lines}${xl}</svg>
    <div class="legend">${TREND_SERIES.map(([,l,c])=>`<span><i style="background:${c}"></i>${l}</span>`).join("")}</div>`;
}
function scrTrends(profId){
  const done=Repo.sessions.completed().map(reportOf), profs={};
  done.forEach(s=>{ (profs[s.profession.id]=profs[s.profession.id]||{ id:s.profession.id, title:s.profession.title, n:0 }).n++; });
  const ids=Object.keys(profs);
  if(!profId && ids.length) profId=ids.sort((a,b)=>profs[b].n-profs[a].n)[0];
  const head=pageHead("Progress","Score trends","How your BSP Role Interview Score and its dimensions change from attempt to attempt, per profession.")+tabs(PROGRESS_TABS,"#/progress/trends");
  if(!ids.length){ el.innerHTML=head+emptyCard("📈","No trends yet","Your completed sessions will appear here. Practice your first interview with Alex.","#/interview/start","Start interview"); return; }
  const rows=trendData(profId), t=profs[profId];
  const delta=(k)=>{ const v=rows.filter(r=>r[k]!=null); if(v.length<2) return ""; const d=v[v.length-1][k]-v[0][k]; return `<span class="small ${d>=0?"up":"down"}">${d>=0?"▲":"▼"} ${Math.abs(d)}</span>`; };
  el.innerHTML=head+`<div class="chips" style="margin-bottom:14px">${ids.map(id=>`<a class="chip ${id===profId?"sel":""}" href="#/progress/trends/${H(id)}">${H(profs[id].title)} (${profs[id].n})</a>`).join("")}</div>`
  + (!t?emptyCard("📈","No completed interviews for this profession","Your completed sessions will appear here.","#/interview/start","Start interview")
  : `<div class="card"><h2 style="text-transform:uppercase;letter-spacing:1px">${H(t.title)}</h2>
      ${rows.length>1?trendChart(rows):`<p class="small muted">Complete another ${H(t.title)} interview to see a trend line.</p>`}
      <div class="trendlist">${rows.map(r=>`<div class="item"><div><div class="t">Attempt ${r.n}: <span id="att${r.n}">${r.overall}</span></div><div class="m">${H(fmtDate(r.at))} · ${H(r.type)}</div></div><a class="btn sm" href="#/results/${r.id}">Report</a></div>`).join("")}</div>
      <h3 style="margin-top:18px">Individual trends</h3>
      <div class="grid g2">${TREND_SERIES.slice(1).map(([k,l])=>{ const v=rows.map(r=>r[k]); return `<div class="mini"><div class="l">${l} ${delta(k)}</div><div class="v small">${v.map(x=>x==null?"–":x).join(" → ")}</div></div>`; }).join("")}</div>
      <div class="row wrapw" style="gap:10px;margin-top:16px"><button class="btn primary" onclick="retryLatest('${H(profId)}')">Practice ${H(t.title)} again</button></div></div>`);
}
function retryLatest(profId){ const s=Repo.sessions.completed().find(x=>x.profession.id===profId); if(s) practiceAgain(s.sessionId); else go("interview/start"); }
