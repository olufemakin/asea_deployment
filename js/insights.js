/* =============================================================================
   Skills & Scores, BSP Interview Readiness, Progress Dashboard, Next Best Action,
   My AI Work Profile.

   A skill draws evidence from several SOURCES: practice (Practice Lab competency
   scores), interview (rubric levels from Alex interviews) and CV (accepted, confirmed
   experience mappings: labelled, never converted into a number). "assessment" and
   "learning" are reserved source keys so future modules can plug in.
   Every score shows its inputs. Nothing here is a hiring or pass probability.
   ========================================================================== */
"use strict";

const SKILLS = {
  instruction_following: { label:"Instruction Following",            cat:"instruction_following" },
  ai_response_evaluation:{ label:"AI Response Evaluation",           cat:"ai_response_evaluation" },
  fact_checking:         { label:"Fact Checking",                    cat:"fact_checking" },
  reasoning:             { label:"Reasoning",                        cat:"generalist_ai_evaluation" },
  attention_to_detail:   { label:"Attention to Detail",              cat:"data_annotation" },
  professional_judgment: { label:"Professional Judgment",            cat:"safety_evaluation" },
  writing:               { label:"Writing",                          cat:"response_rewriting" },
  communication:         { label:"Communication",                    cat:null },
  domain_knowledge:      { label:"Domain Knowledge",                 cat:"domain_expert_evaluation" },
  research:              { label:"Research & Information Synthesis", cat:"research_verification" },
  translation:           { label:"Translation",                      cat:"french_english_evaluation" },
  data_evaluation:       { label:"Data Evaluation",                  cat:"spreadsheet_evaluation" },
  quality_review:        { label:"Quality Review",                   cat:"document_evaluation" },
  risk_evaluation:       { label:"Risk Evaluation",                  cat:"safety_evaluation" },
};
const SKILL_SOURCES = ["practice","interview","cv","assessment","learning"];
/* Practice Lab competency → skill */
const PRACTICE_SKILL = {
  preference_judgment:"ai_response_evaluation", comparative_reasoning:"reasoning", instruction_following:"instruction_following", constraint_detection:"instruction_following",
  multi_part_tracking:"instruction_following", format_compliance:"instruction_following", explicit_instructions:"instruction_following", implicit_requirements:"instruction_following",
  guideline_application:"instruction_following", factual_accuracy:"fact_checking", unsupported_claim_detection:"fact_checking", claim_identification:"fact_checking",
  evidence_matching:"fact_checking", verification:"fact_checking", verdict_accuracy:"fact_checking", source_grounding:"fact_checking",
  written_justification:"writing", rewriting:"writing", content_quality:"writing",
  error_detection:"ai_response_evaluation", error_classification:"ai_response_evaluation", ai_response_evaluation:"ai_response_evaluation", helpfulness_judgment:"ai_response_evaluation",
  prompt_evaluation:"ai_response_evaluation", caption_evaluation:"ai_response_evaluation", relevance_judgment:"ai_response_evaluation",
  safety_judgment:"professional_judgment", uncertainty_recognition:"research", evidence_judgment:"research", source_interpretation:"research", study_interpretation:"research",
  classification_accuracy:"attention_to_detail", consistency:"attention_to_detail", edge_cases:"attention_to_detail", entity_recognition:"attention_to_detail", entity_typing:"attention_to_detail",
  visual_accuracy:"attention_to_detail", counting:"attention_to_detail", transcription_accuracy:"attention_to_detail", attention_to_detail:"attention_to_detail",
  omission_detection:"quality_review", consistency_checking:"quality_review", listening_comprehension:"communication", user_intent:"reasoning", ambiguity_detection:"reasoning",
  calculation_checking:"data_evaluation", data_quality:"data_evaluation", domain_knowledge:"domain_knowledge", code_correctness:"domain_knowledge", security_awareness:"risk_evaluation",
  translation_judgment:"translation", meaning_preservation:"translation", register_tone:"translation", grammar:"writing",
};
/* Interview competency id (COMPS) → extra skill, by pattern. */
const INTERVIEW_SKILL = [[/^(factuality|evidence|evidence_clin|research_eval)$/,"fact_checking"],[/^(research|research_clin|lit_eval|legal_research)$/,"research"],
  [/^(translation|register|localization|grammar_fr|meaning_pres|translation_judgment|bilingual_eval|ai_language|tone|comprehension)$/,"translation"],
  [/^(data_quality|missing_data|analysis|analysis_fin|interpretation|stats|reconciliation|accuracy|visualization|calculation)$/,"data_evaluation"],
  [/^(quality_review|quality_eng|code_review|audit|controls)$/,"quality_review"],[/^(risk|risk_fin|eng_safety|safety|lab_safety|safety_aware)$/,"risk_evaluation"],
  [/^(editing|clarity|style|copy|tech_writing|journalism|content_strategy)$/,"writing"],[/^(instruction_following|instructions|process_adherence)$/,"instruction_following"],
  [/^(attention_detail|annotation_accuracy|transcription)$/,"attention_to_detail"],[/^(error_detection|preference_judgment|rubric_consistency|prompt_evaluation|ai_\w+|cc_ai)$/,"ai_response_evaluation"]];

/* ---------- Skill evidence ------------------------------------------------ */
function skillEvidence(){
  const acc={}; Object.keys(SKILLS).forEach(k=>acc[k]={ practice:[], interview:[], pSess:new Set(), iSess:new Set(), cv:[] });
  standardPracticeSessions().forEach(p=>(p.results.questions||[]).forEach(g=>Object.entries(g.competencyScores||{}).forEach(([c,v])=>{
    const k=PRACTICE_SKILL[c]; if(k){ acc[k].practice.push(v); acc[k].pSess.add(p.id); } })));
  Repo.sessions.completed().map(reportOf).forEach(s=>s.answers.forEach(a=>{
    if(!a.rubric) return;
    Object.entries(a.rubric.dims||{}).forEach(([d,L])=>{ const k=(ROLE_DIMS[d]||{}).skill; if(k && (d!=="communication"||a.questionType!=="intro")){ acc[k].interview.push(L*25); acc[k].iSess.add(s.sessionId); } });
    const m=INTERVIEW_SKILL.find(([re])=>re.test(a.competency||"")); if(m && !["intro","final"].includes(a.questionType)){ acc[m[1]].interview.push(a.rubric.pct); acc[m[1]].iSess.add(s.sessionId); }
  }));
  if(typeof CV!=="undefined") CV.acceptedMappings().forEach(m=>{ if(acc[m.skill]) acc[m.skill].cv.push(m); });
  return Object.entries(SKILLS).map(([id,S])=>{
    const a=acc[id], np=a.practice.length, ni=a.interview.length;
    const P=np?avg(a.practice):null, I=ni?avg(a.interview):null;
    const wp=Math.min(np,20), wi=Math.min(ni,20);
    const current=(wp+wi)? Math.round(((P||0)*wp+(I||0)*wi)/(wp+wi)) : null;
    const cvLabel=a.cv.some(m=>m.label==="supported")?"Evidence supported":a.cv.length?"Potentially supported":null;
    const inputs=[];
    if(np) inputs.push(`Practice: ${P}% from ${np} question result${np>1?"s":""} in ${a.pSess.size} session${a.pSess.size>1?"s":""}`);
    if(ni) inputs.push(`Alex interview: ${I}% from ${ni} rubric-scored answer${ni>1?"s":""} in ${a.iSess.size} interview${a.iSess.size>1?"s":""}`);
    if(a.cv.length) inputs.push(`CV: ${cvLabel} by ${a.cv.length} accepted experience mapping${a.cv.length>1?"s":""} (not converted into a score)`);
    if((wp+wi) && np && ni) inputs.push(`Current evidence = practice and interview averages weighted by number of results (each capped at 20).`);
    return { id, label:S.label, cat:S.cat, sources:{ practice:np?{ pct:P, n:np, sessions:a.pSess.size }:null, interview:ni?{ pct:I, n:ni, sessions:a.iSess.size }:null,
      cv:a.cv.length?{ label:cvLabel, n:a.cv.length, excerpts:a.cv.map(m=>m.excerpt).filter(Boolean).slice(0,2) }:null, assessment:null, learning:null }, current, inputs };
  });
}

/* ---------- BSP Interview Readiness -------------------------------------- */
const READINESS_COMPONENTS=[["experience","Interview Experience",10],["domain","Domain Performance",20],["reasoning","Reasoning",20],["communication","Communication",15],["ai","AI Evaluation",15],["practice","Practice Performance",20]];
function readinessModel(){
  const done=Repo.sessions.completed().map(reportOf), last=done.slice(0,3), w=[3,2,1];
  const dimAvg=id=>{ let t=0, tw=0, n=0; last.forEach((s,i)=>{ const d=((s.scores.role||{}).dims||{})[id]; if(d){ t+=d.pct*w[i]; tw+=w[i]; n++; } }); return tw?{ pct:Math.round(t/tw), n }:null; };
  const prac=standardPracticeSessions().sort((a,b)=>b.submittedAt-a.submittedAt).slice(0,5);
  const comps=READINESS_COMPONENTS.map(([id,label,weight])=>{
    let pct=null, inputs="";
    if(id==="experience"){ pct=done.length?Math.min(100, Math.round(done.length/3*100)):null; inputs=`${done.length} completed interview${done.length===1?"":"s"} (3 or more = full credit)`; }
    if(["domain","reasoning","communication","ai"].includes(id)){
      const key={ domain:"domain_knowledge", reasoning:"professional_reasoning", communication:"communication", ai:"ai_evaluation" }[id], d=dimAvg(key);
      if(d){ pct=d.pct; inputs=`${ROLE_DIMS[key].label} across your last ${d.n} interview${d.n>1?"s":""} that tested it (newest weighted most)`; }
      else if(id==="ai"){ const sk=skillEvidence().find(x=>x.id==="ai_response_evaluation"); if(sk&&sk.sources.practice){ pct=sk.sources.practice.pct; inputs=`No interview tested AI evaluation yet; using AI Response Evaluation practice (${sk.sources.practice.n} results)`; } }
      if(pct==null) inputs="Not tested in your recent interviews yet";
    }
    if(id==="practice"){ pct=prac.length?avg(prac.map(p=>p.results.score)):null; inputs=prac.length?`Average of your last ${prac.length} 10-question practice session${prac.length>1?"s":""}`:"No 10-question practice sessions yet"; }
    return { id, label, weight, pct, inputs };
  });
  const have=comps.filter(c=>c.pct!=null), tw=have.reduce((a,c)=>a+c.weight,0);
  const overall = done.length && tw ? Math.round(have.reduce((a,c)=>a+c.pct*c.weight,0)/tw) : null;
  return { overall, components:comps, interviews:done.length, missing:comps.filter(c=>c.pct==null).map(c=>c.label),
    label: overall==null?"":overall>=78?"Strong preparation":overall>=55?"Developing":"Building foundations" };
}
function readiness(){ return readinessModel().overall; }

/* ---------- Next best action (deterministic) ------------------------------ */
function nextBestActions(){
  const out=[], done=Repo.sessions.completed(), act=Repo.sessions.inProgress()[0], ap=activePractice(), prac=standardPracticeSessions();
  if(act) out.push({ text:`Resume your ${act.profession.title} interview with ${ALEX.name}.`, cta:"Resume", js:`resumeSession('${act.sessionId}')` });
  if(ap) out.push({ text:`Finish your ${practiceCat(ap.category).label} practice session.`, cta:"Resume", href:"#/practice/run" });
  if(typeof CV!=="undefined" && CV.pendingCount()>0) out.push({ text:"Review your CV before your next interview.", cta:"Review CV", href:"#/cv" });
  if(!done.length) out.push({ text:`Practice your first interview with ${ALEX.name}.`, cta:"Start interview", href:"#/interview/start" });
  if(done.length && Speech.sttAvailable && !done.some(s=>s.mode==="voice")) out.push({ text:"Try your first Voice Interview.", cta:"Set up voice interview", js:"recVoice()" });
  const byCat={}; prac.forEach(p=>{ const k=normCategoryId(p.category); if(!byCat[k]) byCat[k]=p; });
  Object.keys(byCat).forEach(k=>{ const pr=practiceProgression(k), last=byCat[k]; if(pr && DIFF_KEYS.indexOf(pr.difficulty)>DIFF_KEYS.indexOf(last.difficulty))
    out.push({ text:`Move ${practiceCat(k).label} from ${PRACTICE_DIFF[last.difficulty].label} to ${PRACTICE_DIFF[pr.difficulty].label}.`, cta:"Practise", js:`openPracticeSetup('${k}','${pr.difficulty}')` }); });
  const weak=skillEvidence().filter(s=>s.current!=null && s.current<60 && s.cat && isCategoryAvailable(s.cat)).sort((a,b)=>a.current-b.current)[0];
  if(weak){ const pr=practiceProgression(weak.cat), d=pr?pr.difficulty:(weak.current<45?"easy":"medium"); out.push({ text:`Practice ${practiceCat(weak.cat).label} — ${PRACTICE_DIFF[d].label}.`, cta:"Practise", js:`openPracticeSetup('${weak.cat}','${d}')`, why:`${weak.label} evidence is ${weak.current}%.` }); }
  if(!prac.length) out.push({ text:"Start your first 10-question practice session.", cta:"Open Practice Lab", href:"#/practice" });
  if(typeof CV!=="undefined" && !CV.hasConfirmed() && done.length) out.push({ text:"Add your experience to personalize your interviews.", cta:"Add CV", href:"#/cv" });
  if(done.length){ const s=done[0]; out.push({ text:`Complete another ${s.profession.title} interview with ${ALEX.name}.`, cta:"Retry", js:`practiceAgain('${s.sessionId}')` }); }
  const seen=new Set(); return out.filter(a=>!seen.has(a.text) && seen.add(a.text));
}
function actionBtn(a, primary){ return a.href?`<a class="btn ${primary?"primary":"sm"}" href="${a.href}">${H(a.cta)}</a>`:`<button class="btn ${primary?"primary":"sm"}" onclick="${H(a.js)}">${H(a.cta)}</button>`; }

/* ---------- Screens ------------------------------------------------------- */
const PROGRESS_TABS=[["#/progress","Dashboard"],["#/progress/readiness","Interview Readiness"],["#/progress/skills","Skills & Scores"],["#/progress/trends","Score Trends"],["#/progress/activity","Recent Activity"]];
function scrDashboard(){
  const R=readinessModel(), done=Repo.sessions.completed().map(reportOf), prac=standardPracticeSessions(), sk=skillEvidence().filter(s=>s.current!=null).sort((a,b)=>b.current-a.current);
  const acts=nextBestActions(), recent=done[0];
  const tile=(l,v,sub,id)=>`<div class="card stat" ${id?`id="${id}"`:""}><div class="l">${l}</div><div class="v">${v}</div>${sub?`<div class="small faint">${sub}</div>`:""}</div>`;
  el.innerHTML=pageHead("Progress","Progress dashboard","Your interview readiness, practice accuracy and skills in one place. Every number links to the evidence behind it.")+tabs(PROGRESS_TABS,"#/progress")
  + `<div class="card nba" id="nextBest"><div class="kicker" style="margin:0">Next best action</div>
      ${acts.length?`<div class="row between center wrapw" style="gap:12px;margin-top:6px"><div><div style="font-size:19px;font-weight:900">${H(acts[0].text)}</div>${acts[0].why?`<div class="small muted">${H(acts[0].why)}</div>`:""}</div>${actionBtn(acts[0],true)}</div>
        ${acts.length>1?`<div class="list" style="margin-top:12px">${acts.slice(1,4).map(a=>`<div class="item"><div class="t small">${H(a.text)}</div>${actionBtn(a)}</div>`).join("")}</div>`:""}`:""}</div>
  <div class="grid g4" id="dashTiles">
    ${tile("Interview readiness", R.overall==null?"–":R.overall, R.overall==null?"Complete an interview":`<a href="#/progress/readiness">${H(R.label)} · see inputs</a>`, "tileReadiness")}
    ${tile("Practice accuracy", prac.length?avg(prac.map(p=>p.results.score))+"%":"–", prac.length?`Average of ${prac.length} session${prac.length>1?"s":""}`:"No practice yet")}
    ${tile("Interviews completed", done.length, "")}
    ${tile("Practice sessions", prac.length, "10-question sessions")}
    ${tile("Strongest skill", sk.length?H(sk[0].label):"–", sk.length?`${sk[0].current}% current evidence`:"")}
    ${tile("Skill to improve", sk.length>1?H(sk[sk.length-1].label):"–", sk.length>1?`${sk[sk.length-1].current}% current evidence`:"")}
    ${tile("Recent score", recent?recent.scores.overall:"–", recent?`${H(recent.profession.title)} · ${H(fmtDate(recent.completedAt||recent.startedAt))}`:"")}
    ${tile("CV status", typeof CV!=="undefined"&&CV.hasConfirmed()?"Confirmed":"Not added", `<a href="#/cv">${typeof CV!=="undefined"&&CV.hasConfirmed()?"Review CV":"Add your experience"}</a>`)}
  </div>
  ${(done.length||prac.length)?`<div class="card">${recommendationsHTML()||`<p class="small muted" style="margin:0">No specific practice gaps right now.</p>`}</div>`:""}`;
}
function scrReadinessDetail(){
  const R=readinessModel();
  el.innerHTML=pageHead("Progress","BSP Interview Readiness","A practice indicator built from your own interview and practice evidence. It is not a chance of being hired or of passing any assessment.")+tabs(PROGRESS_TABS,"#/progress/readiness")
  + (R.overall==null ? emptyCard("🎯","No readiness score yet","Practice your first interview with Alex to get your first readiness score.","#/interview/start","Start interview")
  : `<div class="card"><div class="row center wrapw" style="gap:26px">
      <div class="ring" style="--p:${R.overall}"><div><div class="scorebig" id="readinessScore">${R.overall}</div><div class="small muted">/ 100</div></div></div>
      <div class="grow" style="min-width:240px"><span class="badge ${band(R.overall)[0]}">${H(R.label)}</span>
        <p class="small muted" style="margin-top:10px">Readiness is the weighted average of the components below that have data${R.missing.length?`. Not yet included: ${H(R.missing.join(", "))}`:""}.</p></div></div></div>`)
  + `<div class="card"><h2>Components and their inputs</h2>${R.components.map(c=>`<div class="dimrow">${c.pct==null?`<div class="dim"><div class="between row"><span class="small"><b>${H(c.label)}</b> <span class="faint">· weight ${c.weight}</span></span><span class="small faint">No data yet</span></div></div>`:barRow(c.label, c.pct, `· weight ${c.weight}`)}<div class="small faint" style="margin:-4px 0 10px">Inputs: ${H(c.inputs)}</div></div>`).join("")}</div>`;
}
function scrSkills(){
  const S=skillEvidence(), any=S.some(s=>s.current!=null||s.sources.cv);
  el.innerHTML=pageHead("Progress","Skills & scores","Each skill combines evidence from Practice, Alex interviews and your confirmed CV. Every number shows its inputs.")+tabs(PROGRESS_TABS,"#/progress/skills")
  + (!any ? emptyCard("📈","No skill evidence yet","Your completed sessions will appear here. Start your first 10-question practice session or practice your first interview with Alex.","#/practice","Open Practice Lab")
  : `<div class="grid g2" id="skillCards">${S.map(s=>`<div class="card skill" data-skill="${s.id}">
      <div class="row between center"><h3 style="margin:0;text-transform:uppercase;letter-spacing:.8px">${H(s.label)}</h3>${s.current!=null?scoreBadge(s.current):`<span class="badge">No score yet</span>`}</div>
      <table class="summary kv" style="margin-top:10px">
        <tr><td>Practice</td><td>${s.sources.practice?`${s.sources.practice.pct}%`:"–"}</td></tr>
        <tr><td>Alex interview</td><td>${s.sources.interview?`${s.sources.interview.pct}%`:"–"}</td></tr>
        <tr><td>CV / experience</td><td>${s.sources.cv?H(s.sources.cv.label):"–"}</td></tr>
        <tr><td><b>Current skill evidence</b></td><td><b>${s.current!=null?s.current+"%":"–"}</b></td></tr></table>
      ${s.inputs.length?`<details class="whybox"><summary>Inputs</summary><ul class="tips small">${s.inputs.map(x=>`<li>${H(x)}</li>`).join("")}</ul>${s.sources.cv&&s.sources.cv.excerpts.length?s.sources.cv.excerpts.map(x=>`<blockquote class="excerpt">“${H(x)}”</blockquote>`).join(""):""}</details>`:""}
      ${s.cat&&isCategoryAvailable(s.cat)?`<button class="btn sm" style="margin-top:8px" onclick="openPracticeSetup('${s.cat}','${(practiceProgression(s.cat)||{}).difficulty||"easy"}')">Practise ${H(practiceCat(s.cat).label)}</button>`:""}
    </div>`).join("")}</div>`);
}
function scrActivity(){
  const items=[].concat(
    Repo.sessions.all().map(s=>({ at:s.completedAt||s.startedAt, html:`<div><div class="t">🎙️ ${sessionTitle(s)}</div><div class="m">${H(fmtDate(s.completedAt||s.startedAt))} ${statusBadge(s)}</div></div>
      <div class="row center" style="gap:10px">${s.answers&&s.answers.length?scoreBadge(reportOf(s).scores.overall):""}${s.status==="in_progress"?`<button class="btn sm" onclick="resumeSession('${s.sessionId}')">Resume</button>`:s.answers&&s.answers.length?`<a class="btn sm" href="#/results/${s.sessionId}">Report</a>`:""}</div>` })),
    Repo.practiceSessions.all().map(p=>{ const c=practiceCat(p.category)||{icon:"🧪",label:p.category}; return { at:p.submittedAt||p.startedAt, html:`<div><div class="t">${c.icon} ${H(c.label)} <span class="faint small">· Practice Lab · ${(PRACTICE_DIFF[p.difficulty]||{label:p.difficulty}).label}</span></div><div class="m">${H(fmtDate(p.submittedAt||p.startedAt))} · ${PRACTICE_QUESTIONS} questions</div></div>
      <div class="row center" style="gap:10px">${p.results?scoreBadge(p.results.score)+`<a class="btn sm" href="#/practice/results/${p.id}">Review</a>`:`<span class="badge info">In progress</span><a class="btn sm" href="#/practice/run">Resume</a>`}</div>` }; }),
    Repo.practice.all().map(a=>({ at:a.at, html:`<div><div class="t"><span class="badge">LEGACY PRACTICE</span> ${H(a.title)}</div><div class="m">1 Task · Completed before Practice Lab upgrade · ${H(fmtDate(a.at))}</div></div>${scoreBadge(a.score)}` }))
  ).sort((a,b)=>b.at-a.at).slice(0,40);
  el.innerHTML=pageHead("Progress","Recent activity","Your latest interviews and practice, newest first.")+tabs(PROGRESS_TABS,"#/progress/activity")
  + (items.length?`<div class="card"><div class="list">${items.map(i=>`<div class="item">${i.html}</div>`).join("")}</div></div>`
  : emptyCard("🕒","No activity yet","Your completed sessions will appear here.","#/interview/start","Start interview"));
}

/* ---------- My AI Work Profile ------------------------------------------- */
const AI_PATHS = [
  { id:"ai_response_evaluator", label:"AI Response Evaluator", skills:["ai_response_evaluation","instruction_following","attention_to_detail"], cat:"ai_response_evaluation" },
  { id:"generalist", label:"Generalist AI Evaluator", skills:["ai_response_evaluation","reasoning","instruction_following","fact_checking"], cat:"generalist_ai_evaluation" },
  { id:"domain_expert", label:"Domain Expert", skills:["domain_knowledge","professional_judgment","ai_response_evaluation"], cat:"domain_expert_evaluation" },
  { id:"fact_checker", label:"Fact Checker", skills:["fact_checking","research","attention_to_detail"], cat:"fact_checking" },
  { id:"research_evaluator", label:"Research Evaluator", skills:["research","reasoning","fact_checking"], cat:"research_verification" },
  { id:"data_annotator", label:"Data Annotator", skills:["attention_to_detail","instruction_following","data_evaluation"], cat:"data_annotation" },
  { id:"coding_evaluator", label:"Coding Evaluator", skills:["reasoning","attention_to_detail"], cat:"coding_evaluation", needsCat:true },
  { id:"multilingual_evaluator", label:"Multilingual Evaluator", skills:["translation","communication","attention_to_detail"], cat:"multilingual_evaluation" },
];
function aiWorkProfile(){
  const S=Object.fromEntries(skillEvidence().map(s=>[s.id,s])), done=Repo.sessions.completed().map(reportOf);
  const catAvg=cat=>{ const xs=standardPracticeSessions().filter(p=>normCategoryId(p.category)===cat); return xs.length?{ pct:avg(xs.map(p=>p.results.score)), n:xs.length }:null; };
  const roles=typeof CV!=="undefined" ? CV.confirmed("role").map(i=>i.value) : [];
  const profs={}; done.forEach(s=>profs[s.profession.title]=(profs[s.profession.title]||0)+1);
  const domain = roles.length ? roles.slice(0,3).join(" · ") : Object.keys(profs).sort((a,b)=>profs[b]-profs[a]).slice(0,2).join(" · ");
  const dimAvg={}; done.forEach(s=>Object.values((s.scores.role||{}).dims||{}).forEach(d=>(dimAvg[d.label]=dimAvg[d.label]||[]).push(d.pct)));
  const interviewStrengths=Object.entries(dimAvg).map(([k,v])=>[k,avg(v)]).filter(([,v])=>v>=70).sort((a,b)=>b[1]-a[1]).slice(0,4);
  const practiceStrengths=Object.values(S).filter(s=>s.sources.practice && s.sources.practice.pct>=75).sort((a,b)=>b.sources.practice.pct-a.sources.practice.pct).slice(0,4);
  const dev=Object.values(S).filter(s=>s.current!=null && s.current<60).sort((a,b)=>a.current-b.current).slice(0,4);
  const transferable=typeof CV!=="undefined" ? CV.acceptedMappings() : [];
  const paths=AI_PATHS.map(pth=>{
    const ev=pth.skills.map(k=>S[k]).filter(s=>s&&s.current!=null), ca=catAvg(pth.cat);
    const vals=ev.map(s=>s.current).concat(ca?[ca.pct]:[]), cvN=transferable.filter(m=>pth.skills.includes(m.skill)).length;
    const score=vals.length?avg(vals):null;
    const level = score==null || (pth.needsCat && !ca) ? "Not enough evidence yet" : score>=75 && vals.length>=2 ? "Strong" : score>=55 ? "Developing" : "Early";
    const inputs=ev.map(s=>`${s.label} ${s.current}%`).concat(ca?[`${practiceCat(pth.cat).label} practice ${ca.pct}% (${ca.n} session${ca.n>1?"s":""})`]:[], cvN?[`${cvN} accepted CV mapping${cvN>1?"s":""}`]:[]);
    return Object.assign({}, pth, { level, score, inputs });
  }).sort((a,b)=>(b.score==null?-1:b.score)-(a.score==null?-1:a.score));
  return { domain, transferable, interviewStrengths, practiceStrengths, dev, paths };
}
function scrProfile(){
  const P=aiWorkProfile(), hasAny=P.domain||P.transferable.length||P.interviewStrengths.length||P.practiceStrengths.length||P.paths.some(p=>p.score!=null);
  const lv={ "Strong":"good", "Developing":"ok", "Early":"bad", "Not enough evidence yet":"" };
  el.innerHTML=pageHead("Profile","My AI Work Profile","A concise summary of your evidence for AI-work paths, from your interviews, practice and confirmed CV.")+tabs(PROFILE_TABS,"#/profile")
  + (!hasAny ? emptyCard("🧭","Your profile is empty","Add your experience to personalize your interviews, then practise with Alex and in the Practice Lab.","#/cv","Add my experience")
  : `<div class="grid g2">
    <div class="card"><h3>Professional domain</h3><p>${P.domain?H(P.domain):`<span class="muted">Not set yet. <a href="#/cv">Add your experience</a>.</span>`}</p>
      <h3 style="margin-top:14px">Transferable strengths</h3>${P.transferable.length?`<ul class="clean small">${P.transferable.slice(0,6).map(m=>`<li><b>${H(SKILLS[m.skill]?SKILLS[m.skill].label:m.skill)}</b> <span class="badge ${m.label==="supported"?"good":"ok"}">${m.label==="supported"?"Evidence supported":"Potentially supported"}</span></li>`).join("")}</ul>`:`<p class="small muted">Accept mappings in the <a href="#/cv/mapper">AI Experience Mapper</a> to list them here.</p>`}</div>
    <div class="card"><h3>Interview strengths</h3>${P.interviewStrengths.length?`<ul class="clean small">${P.interviewStrengths.map(([k,v])=>`<li>${H(k)} · ${v}%</li>`).join("")}</ul>`:`<p class="small muted">No interview dimension averages 70%+ yet.</p>`}
      <h3 style="margin-top:14px">Practice strengths</h3>${P.practiceStrengths.length?`<ul class="clean small">${P.practiceStrengths.map(s=>`<li>${H(s.label)} · ${s.sources.practice.pct}%</li>`).join("")}</ul>`:`<p class="small muted">No practice skill at 75%+ yet.</p>`}
      <h3 style="margin-top:14px">Development areas</h3>${P.dev.length?`<ul class="clean small">${P.dev.map(s=>`<li>${H(s.label)} · ${s.current}%</li>`).join("")}</ul>`:`<p class="small muted">No skill below 60% in your current evidence.</p>`}</div>
  </div>
  <div class="card"><h2>Potential paths <span class="badge info">BSP Internal Fit</span></h2>
    <p class="small muted">BSP Internal Fit is an internal guide to where your current evidence is strongest. It is not an employment probability and doesn't predict any hiring or platform decision.</p>
    <div class="list" id="paths">${P.paths.map(p=>`<div class="item"><div><div class="t">${H(p.label)} <span class="badge ${lv[p.level]}">BSP Internal Fit: ${H(p.level)}</span></div>
      <div class="m">${p.inputs.length?"Inputs: "+H(p.inputs.join(" · ")):"No evidence for this path yet."}</div></div>
      ${isCategoryAvailable(p.cat)?`<button class="btn sm" onclick="openPracticeSetup('${p.cat}','${(practiceProgression(p.cat)||{}).difficulty||"easy"}')">Build evidence</button>`:""}</div>`).join("")}</div></div>`);
}
const PROFILE_TABS=[["#/profile","AI Work Profile"],["#/cv","My CV"],["#/cv/mapper","AI Experience Mapper"]];
