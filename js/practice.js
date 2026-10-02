/* =============================================================================
   BSP AI Practice Lab engine — 10-question timed sessions, grading with
   competency-level evidence, results, progression, recommendations.

   Sessions are built ONLY from the selected category + difficulty + published questions
   (QuestionBank.select). There is no cross-category or cross-difficulty top-up: if fewer than
   10 such questions exist, no session is created. Each session stores a snapshot of the exact
   question versions served, so it stays reviewable after bank edits.
   The timer is anchored to wall-clock (endsAt), so a refresh never resets it.
   ========================================================================== */
"use strict";

const ANNOTATION_CATS = new Set(["text_classification","data_annotation","entity_annotation","search_relevance","image_labelling","image_to_text"]);
const DIFF_NUM = { easy:1, medium:2, hard:3 };
function normCategoryId(id){ return LEGACY_CATEGORY_IDS[id] || id; }
function practiceCat(id){ return PRACTICE_CATEGORY[normCategoryId(id)] || null; }
function isCategoryAvailable(id){ return QuestionBank.availability(normCategoryId(id)).available; }

/* ---------- Building a session -------------------------------------------- */
function buildPracticeQuestions(catId, diff){ return QuestionBank.select(normCategoryId(catId), diff, PRACTICE_QUESTIONS); }
function createPracticeSession(catId, diff){
  catId=normCategoryId(catId);
  const qs=buildPracticeQuestions(catId, diff);
  if(!qs || qs.length!==PRACTICE_QUESTIONS) return null;   // "More practice questions are being prepared for this level."
  const now=Date.now(), mins=PRACTICE_DIFF[diff].minutes;
  const ps={ id:"p-"+now.toString(36)+"-"+Math.random().toString(36).slice(2,6), version:2, category:catId, difficulty:diff,
    questions:qs, snapshot:{ takenAt:now, versions:Object.fromEntries(qs.map(q=>[q.id,q.version])) },
    responses:{}, flags:[], timeSpent:{}, current:0,
    durationMs:mins*60000, startedAt:now, endsAt:now+mins*60000, status:"in_progress", submittedAt:null, autoSubmitted:false, results:null };
  QuestionBank.recordUse(qs.map(q=>q.id));
  Repo.practiceSessions.save(ps); Repo.prefs.set({ activePracticeId:ps.id });
  return ps;
}
function practiceRemaining(ps){ return Math.max(0, ps.endsAt - Date.now()); }

/* ---------- Answer state -------------------------------------------------- */
function isAnswered(q, r){
  if(!r) return false;
  switch(q.fmt){
    case "rank": return r.pref!=null;
    case "eval": case "multi": return (r.choices||[]).length>0;
    case "fact": case "single": return r.choice!=null;
    case "rewrite": case "transcribe": return !!(r.text||"").trim();
  }
  return false;
}

/* ---------- Grading helpers ----------------------------------------------- */
const NUM_WORDS=["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
const TENS_WORDS={20:"twenty",30:"thirty",40:"forty",50:"fifty",60:"sixty",70:"seventy",80:"eighty",90:"ninety"};
function numToWords(n){ n=+n; if(n<20) return NUM_WORDS[n]; if(n<100) return TENS_WORDS[n-n%10]+(n%10?" "+NUM_WORDS[n%10]:""); return String(n); }
function normWords(s){
  return words(fold(String(s||"").replace(/%/g," percent").replace(/(\d+)\.(\d+)/g,(m,a,b)=>`${a} point ${b.split("").join(" ")}`)
    .replace(/(\d+):(\d+)/g,"$1 $2").replace(/\b(\d{1,2})\b/g,m=>numToWords(m)).replace(/[-]/g," ")));
}
function wer(ref, hyp){
  const a=normWords(ref), b=normWords(hyp); if(!a.length) return b.length?1:0;
  const dp=Array.from({length:a.length+1},(_,i)=>[i].concat(Array(b.length).fill(0)));
  for(let j=1;j<=b.length;j++) dp[0][j]=j;
  for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++) dp[i][j]=Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return Math.min(1, dp[a.length][b.length]/a.length);
}
function runCheck(c, text){
  const t=String(text||"").trim(), w=words(t).length;
  switch(c.t){
    case "list": return listCheck(c.c, t);
    case "maxWords": return w>0 && w<=c.v;
    case "maxSentences": return t.length>0 && t.split(/[.!?]+(\s|$)/).filter(x=>x.trim().length>1).length<=c.v;
    case "has": return fold(t).includes(fold(c.v));
    case "lacks": return t.length>0 && !t.includes(c.v);
    case "hasRe": return new RegExp(c.v,"i").test(t);
    case "lacksRe": return t.length>0 && !new RegExp(c.v,"i").test(t);
    case "json": try{ JSON.parse(t); return true; }catch(e){ return false; }
    case "jsonEq": try{ return JSON.parse(t)[c.k]===c.v; }catch(e){ return false; }
  }
  return false;
}
function optName(q, i){ return q.fmt==="eval" ? (ERROR_TYPES.find(e=>e[0]===i)||[i,i])[1] : (q.options||[])[i]; }
function expectedText(q){
  switch(q.fmt){
    case "rank": { const p=RANK_SCALE.find(x=>x[0]===q.answer.pref)[1]; const dm=Object.entries(q.answer.dims||{}).map(([k,v])=>`${(RANK_DIMS.find(d=>d[0]===k)||[k,k])[1]}: ${v==="T"?"tie":v}`); return p+(dm.length?` (${dm.join("; ")})`:""); }
    case "eval": return q.answer.map(k=>optName(q,k)).join(", ");
    case "fact": return q.answer;
    case "multi": return q.answer.map(i=>optName(q,i)).join("; ");
    case "single": return optName(q, q.answer);
    case "rewrite": return "A rewrite that meets: "+q.checks.map(c=>c.label).join("; ");
    case "transcribe": return `"${q.answer}"`;
  }
  return "";
}
function rubricText(q){
  const reasonW = ANNOTATION_CATS.has(q.category||(q.cats||[])[0]) ? 25 : 40;
  return ({
    rank:`Preference strength is 70% of the judgment (exact = full credit, adjacent on the same side = partial) and dimension calls 30%; written reasoning is ${reasonW}% of the question.`,
    eval:`Error types are scored by overlap: credit for each correct type, a penalty for false flags. The written explanation is ${reasonW}% of the question.`,
    multi:`Selections are scored by overlap: credit for each correct option, a penalty for wrong ones. The written explanation is ${reasonW}% of the question.`,
    fact:`The correct label earns full credit and a near-miss label partial credit. Written evidence is ${reasonW}% of the question.`,
    single:`The correct choice earns full credit and a near-miss partial credit. Written reasoning is ${reasonW}% of the question.`,
    rewrite:"Each requirement your rewrite meets earns credit (70%); content quality is the other 30%.",
    transcribe:"Accuracy = 1 − word error rate. Case and punctuation are ignored, and numbers may be written as digits or words.",
  })[q.fmt];
}

/* ---------- Grading (score + components + competency evidence) ------------ */
function competencyEvidenceFor(q, comps){
  const cat=PRACTICE_CATEGORY[normCategoryId(q.category||(q.cats||[])[0])]; const out={};
  if(!cat) return out;
  cat.competencies.forEach(c=>{ const vals=c.from.filter(f=>comps[f]!=null).map(f=>comps[f]); if(vals.length) out[c.id]=Math.round(avg(vals.map(v=>v*100))); });
  return out;
}
function gradePracticeQuestion(q, r, diff){
  const D=PRACTICE_DIFF[diff]||PRACTICE_DIFF.medium, correct=[], missed=[], comps={};
  const done=g=>{ g.components=comps; g.competencyScores=competencyEvidenceFor(q, comps); g.expected=expectedText(q); g.rubric=rubricText(q); return g; };
  if(!isAnswered(q, r)){
    (q.competencies||[]).length; Object.assign(comps, { objective:0, reasoning:0, pref:0, dims:0, precision:0, recall:0, near:0, accuracy:0, exact:0, checks:0, content:0 });
    (q.flags||[]).forEach(f=>comps[f]=0); if(q.focus) comps["focus:"+q.focus]=0;
    (q.optionKinds||[]).forEach(k=>{ if(k&&k!=="none") comps["kind:"+k]=0; }); (q.checks||[]).forEach(c=>{ if(c.kind) comps["kind:"+c.kind]=0; });
    if(q.fmt==="eval") (q.answer||[]).forEach(k=>{ if(k!=="none") comps["err:"+k]=0; });
    if(q.fmt==="rank") Object.keys(q.answer.dims||{}).forEach(k=>comps["dim:"+k]=0);
    return done({ score:0, status:"no_response", correct, missed:["No response"], objective:0, reasoning:0 });
  }
  let obj=0;
  const setScore=(exp, got)=>{ const A=new Set(exp), B=new Set(got); const tp=[...B].filter(x=>A.has(x)); const p=B.size?tp.length/B.size:0, rc=A.size?tp.length/A.size:0;
    return { f1:(p+rc)?2*p*rc/(p+rc):0, p, rc, tp, fp:[...B].filter(x=>!A.has(x)), fn:[...A].filter(x=>!B.has(x)) }; };
  switch(q.fmt){
    case "rank": {
      const e=q.answer.pref, u=r.pref, same=(Math.sign(e)===Math.sign(u));
      const ps = u===e ? 1 : (same && Math.abs(u-e)===1) ? 0.6 : (Math.abs(u-e)===1) ? 0.4 : 0;
      (ps===1?correct:missed).push(ps===1?"Preference strength matches":"Expected preference: "+RANK_SCALE.find(x=>x[0]===e)[1]);
      comps.pref=ps;
      const dk=Object.keys(q.answer.dims||{}); let dsc=1;
      if(dk.length){ let ok=0; dk.forEach(k=>{ const lbl=(RANK_DIMS.find(d=>d[0]===k)||[k,k])[1], hit=(r.dims||{})[k]===q.answer.dims[k]; comps["dim:"+k]=hit?1:0;
        if(hit){ ok++; correct.push(`${lbl} call correct`); } else missed.push(`${lbl}: expected ${q.answer.dims[k]==="T"?"tie":q.answer.dims[k]}`); }); dsc=ok/dk.length; comps.dims=dsc; }
      obj=ps*0.7+dsc*0.3; break; }
    case "eval": case "multi": {
      const s=setScore(q.answer, r.choices||[]);
      s.tp.forEach(x=>correct.push("Identified: "+optName(q,x))); s.fn.forEach(x=>missed.push("Missed: "+optName(q,x))); s.fp.forEach(x=>missed.push("Incorrectly selected: "+optName(q,x)));
      obj=s.f1; comps.precision=s.p; comps.recall=s.rc;
      if(q.fmt==="eval") (q.answer||[]).forEach(k=>{ if(k!=="none") comps["err:"+k]=(r.choices||[]).includes(k)?1:0; });
      if(q.fmt==="multi"){ const kinds={}; (q.optionKinds||[]).forEach((k,i)=>{ if(!k||k==="none") return; const ok=(q.answer.includes(i))===((r.choices||[]).includes(i)); (kinds[k]=kinds[k]||[]).push(ok?1:0); });
        Object.entries(kinds).forEach(([k,v])=>comps["kind:"+k]=avg(v.map(x=>x*100))/100); }
      break; }
    case "fact": {
      const near=[["Supported","Partially Supported"],["Unsupported","Cannot Determine"],["Partially Supported","Unsupported"],["Unsupported","Contradicted"]];
      if(r.choice===q.answer){ obj=1; correct.push("Label correct: "+q.answer); }
      else { obj = near.some(([a,b])=>(a===r.choice&&b===q.answer)||(b===r.choice&&a===q.answer)) ? 0.3 : 0; missed.push(`Expected "${q.answer}", you chose "${r.choice}"`); }
      comps.near = obj===1 ? 1 : obj>0 ? 0.5 : 0; break; }
    case "single": {
      if(r.choice===q.answer){ obj=1; correct.push("Correct: "+optName(q,q.answer)); }
      else { const ordinal=(q.category||(q.cats||[])[0])==="search_relevance"; obj = ordinal && Math.abs(r.choice-q.answer)===1 ? 0.4 : 0; missed.push(`Expected "${optName(q,q.answer)}", you chose "${optName(q,r.choice)}"`); }
      comps.near = obj===1 ? 1 : obj>0 ? 0.5 : 0; break; }
    case "rewrite": {
      let pass=0; const kinds={};
      q.checks.forEach(c=>{ const ok=runCheck(c, r.text); if(c.kind) (kinds[c.kind]=kinds[c.kind]||[]).push(ok?1:0); if(ok){ pass++; correct.push("Meets: "+c.label); } else missed.push("Not met: "+c.label); });
      const content=q.sig&&q.sig.length ? scoreAnswer(r.text, { expectedStrongSignals:q.sig, commonWeakSignals:[] }, { words:15 }).dims.Relevance/100 : 1;
      comps.checks=pass/q.checks.length; comps.content=content; comps.objective=comps.checks;
      Object.entries(kinds).forEach(([k,v])=>comps["kind:"+k]=v.reduce((a,b)=>a+b,0)/v.length);
      const score=Math.round(100*(comps.checks*0.7 + content*0.3));
      return done({ score, status:score>=75?"strong":"needs_improvement", correct, missed, objective:comps.checks, reasoning:content }); }
    case "transcribe": {
      const acc=1-wer(q.answer, r.text), score=Math.round(acc*100);
      (score>=95?correct:missed).push(`Word accuracy ${score}%`);
      comps.accuracy=acc; comps.exact=acc>=0.999?1:0; comps.objective=acc;
      return done({ score, status:score>=75?"strong":"needs_improvement", correct, missed, objective:acc, reasoning:null }); }
  }
  comps.objective=obj;
  (q.flags||[]).forEach(f=>comps[f]=obj);
  if(q.focus) comps["focus:"+q.focus]=obj;
  // Written reasoning
  const text=(r.text||"").trim(), wc=words(text).length, reasonW = ANNOTATION_CATS.has(normCategoryId(q.category||(q.cats||[])[0])) ? 0.25 : 0.4;
  let rs=0;
  if(!wc){ missed.push("No written reasoning (required)"); }
  else {
    const sr=scoreAnswer(text, { expectedStrongSignals:q.sig||[], commonWeakSignals:WEAK_DEFAULT }, { words:D.minWords*3 });
    rs = (q.sig||[]).length ? Math.min(1, (sr.dims.Relevance*0.6 + sr.dims.Depth*0.25 + sr.dims.Structure*0.15)/100) : Math.min(1, wc/(D.minWords*2));
    if(wc < D.minWords){ rs*=0.5; missed.push(`Reasoning too brief for ${D.label} (aim for ${D.minWords}+ words)`); }
    if(sr.hit.length) correct.push("Reasoning cites: "+sr.hit.slice(0,4).join(", "));
    else if((q.sig||[]).length) missed.push("Reasoning could cite: "+q.sig.slice(0,4).join(", "));
  }
  comps.reasoning=rs;
  const score=Math.round(100*(obj*(1-reasonW) + rs*reasonW));
  return done({ score, status:score>=75?"strong":"needs_improvement", correct, missed, objective:obj, reasoning:rs });
}

/* ---------- Submit + results ---------------------------------------------- */
function submitPracticeSession(ps, auto){
  if(ps.status!=="in_progress") return ps;
  const now=Date.now();
  const graded=ps.questions.map(q=>({ id:q.id, version:q.version, comp:q.comp, competencies:q.competencies||[], ...gradePracticeQuestion(q, ps.responses[q.id], ps.difficulty) }));
  const usedMs=Math.min(now, ps.endsAt)-ps.startedAt;
  // Competency-level evidence (stable ids) — the basis for Prompt 3 Skills & Scores.
  const ev={};
  graded.forEach(g=>Object.entries(g.competencyScores||{}).forEach(([id,v])=>{ (ev[id]=ev[id]||{ id, name:competencyName(id), scores:[], questionIds:[] }); ev[id].scores.push(v); ev[id].questionIds.push(g.id); }));
  const competencyEvidence=Object.fromEntries(Object.values(ev).map(e=>[e.id,{ id:e.id, name:e.name, score:avg(e.scores), n:e.scores.length, questionIds:e.questionIds }]));
  const sorted=Object.values(competencyEvidence).filter(e=>e.n>=2).sort((a,b)=>b.score-a.score);
  const ranked=sorted.length?sorted:Object.values(competencyEvidence).sort((a,b)=>b.score-a.score);
  ps.results={ score:avg(graded.map(g=>g.score)), questions:graded,
    answered:graded.filter(g=>g.status!=="no_response").length, strong:graded.filter(g=>g.status==="strong").length,
    needs:graded.filter(g=>g.status==="needs_improvement").length, noResponse:graded.filter(g=>g.status==="no_response").length,
    timeUsedSec:Math.round(usedMs/1000), avgSec:Math.round(usedMs/1000/PRACTICE_QUESTIONS),
    competencyEvidence, competencies:Object.fromEntries(Object.values(competencyEvidence).map(e=>[e.name,e.score])),
    strongest: ranked.length>1 ? ranked[0].name : (ranked.length && ranked[0].score>=75 ? ranked[0].name : null),
    focus: ranked.length>1 ? ranked[ranked.length-1].name : (ranked.length && ranked[0].score<75 ? ranked[0].name : null),
    format:"standard-10" };
  ps.status="submitted"; ps.submittedAt=now; ps.autoSubmitted=!!auto;
  Repo.practiceSessions.save(ps);
  if(Repo.prefs.get().activePracticeId===ps.id) Repo.prefs.set({ activePracticeId:null });
  return ps;
}
/* Only standardised 10-question sessions count as practice evidence (legacy single tasks never do). */
function standardPracticeSessions(){ return Repo.practiceSessions.all().filter(p=>p.status==="submitted" && p.results && (p.questions||[]).length===PRACTICE_QUESTIONS); }

/* ---------- Progression (never locks a difficulty) ------------------------ */
function practiceProgression(catId){
  catId=normCategoryId(catId);
  const done=standardPracticeSessions().filter(p=>normCategoryId(p.category)===catId);
  const of=d=>done.filter(p=>p.difficulty===d).sort((a,b)=>b.submittedAt-a.submittedAt);
  const ready=list=>list.length>=3 && list.slice(0,2).every(p=>p.results.score>=80);
  if(ready(of("medium"))) return { difficulty:"hard", reason:"You've completed 3+ Medium sessions and scored 80%+ on your latest two." };
  if(ready(of("easy"))) return { difficulty:"medium", reason:"You've completed 3+ Easy sessions and scored 80%+ on your latest two." };
  return null;
}

/* ---------- Interview ↔ practice recommendations -------------------------- */
const COMP_TO_CAT=[[/hallucin/i,"hallucination_detection"],[/fact|verif/i,"fact_checking"],[/research|evidence/i,"research_verification"],[/instruction/i,"instruction_following"],
  [/translat|meaning|french|register|tone|grammar|bilingual|english|cross-language/i,"french_english_evaluation"],[/code|software|correct/i,"coding_evaluation"],
  [/data|statist|visual|spreadsheet|reconcil|calculat/i,"spreadsheet_evaluation"],[/safety/i,"safety_evaluation"],[/annotat|label/i,"data_annotation"],
  [/preference|rank|rubric|consisten/i,"preference_ranking"],[/prompt/i,"prompt_evaluation"],[/error/i,"ai_response_evaluation"],[/\bai\b|evaluation/i,"ai_response_evaluation"]];
function practiceRecFor(label, score){
  const m=COMP_TO_CAT.find(([re])=>re.test(label));
  let cat=m?m[1]:"domain_expert_evaluation";
  if(!isCategoryAvailable(cat)) cat="ai_response_evaluation";
  const prog=practiceProgression(cat);
  const difficulty = prog ? prog.difficulty : score<45 ? "easy" : "medium";
  return { kind:"practice", category:cat, difficulty, because:`${label} = ${score}%` };
}
function getRecommendations(ctx){
  ctx=ctx||{}; const recs=[];
  const sessions=Repo.sessions.completed().map(reportOf);
  const s=ctx.session || sessions[0];
  if(s && s.scores){
    const areas=Object.entries(s.scores.areas||{}).filter(([k,v])=>v.score<60 && k!=="Communication" && k!=="Background").sort((a,b)=>a[1].score-b[1].score);
    areas.forEach(([k,v])=>recs.push(practiceRecFor(k==="AI Evaluation"?"AI evaluation":k==="Translation & Cross-language"?"translation":k, v.score)));
    Object.entries(s.scores.competencies||{}).filter(([,v])=>v<60).sort((a,b)=>a[1]-b[1]).slice(0,3).forEach(([k,v])=>recs.push(practiceRecFor(k,v)));
  }
  const prac=standardPracticeSessions().sort((a,b)=>b.submittedAt-a.submittedAt);
  const practiceStrong = prac.length>=2 && avg(prac.slice(0,2).map(p=>p.results.score))>=75;
  const comm = s && s.scores && s.scores.areas && s.scores.areas.Communication ? s.scores.areas.Communication.score : null;
  const hasVoice = sessions.some(x=>x.mode==="voice");
  if(practiceStrong && (comm==null || comm<65 || !hasVoice))
    recs.unshift({ kind:"voice", because: comm!=null && comm<65 ? `Strong practice scores, but interview communication = ${comm}%` : "Strong practice scores. Now practise explaining your reasoning out loud." });
  const seen=new Set();
  return recs.filter(r=>{ const k=r.kind+":"+(r.category||""); if(seen.has(k)) return false; seen.add(k); return true; }).slice(0,3);
}

/* ---------- Self-check (used by tests/engine-check.js) -------------------- */
function practiceSelfCheck(){
  const issues=[]; let sessions=0;
  const audit=QuestionBank.audit();
  audit.forEach(a=>{
    if(a.status!=="available") return;
    DIFF_KEYS.forEach(d=>{
      for(let rep=0;rep<2;rep++){
        const qs=buildPracticeQuestions(a.id, d); sessions++;
        if(!qs || qs.length!==PRACTICE_QUESTIONS){ issues.push(`${a.id}/${d}: could not build 10`); continue; }
        if(new Set(qs.map(q=>q.id)).size!==qs.length) issues.push(`${a.id}/${d}: duplicate questions`);
        qs.forEach(q=>{ if(q.category!==a.id) issues.push(`${a.id}/${d}: foreign category ${q.category} (${q.id})`); if(q.difficulty!==d) issues.push(`${a.id}/${d}: wrong difficulty ${q.difficulty} (${q.id})`); if(q.status!=="published") issues.push(q.id+": not published"); });
      }
    });
  });
  QuestionBank.all().forEach(q=>{
    if(!q.explanation) issues.push(q.id+": no explanation");
    if(!q.competencies.length) issues.push(q.id+": no competencies");
    q.competencies.forEach(c=>{ if(!COMPETENCY_REGISTRY[c]) issues.push(q.id+": unregistered competency "+c); });
    if(!q.expectedOutcome) issues.push(q.id+": no expected outcome");
    if(!q.rubric) issues.push(q.id+": no rubric");
    if(!QUESTION_STATUSES.includes(q.status)) issues.push(q.id+": bad status");
    if(["multi","single"].includes(q.fmt)){ const ok = q.fmt==="single" ? (q.answer>=0 && q.answer<q.options.length) : (q.answer.length && q.answer.every(i=>i>=0&&i<q.options.length)); if(!ok) issues.push(q.id+": bad answer index"); }
    if(q.fmt==="fact" && !FACT_LABELS.includes(q.answer)) issues.push(q.id+": bad fact label");
    if(q.fmt==="eval" && !q.answer.every(k=>ERROR_TYPES.some(e=>e[0]===k))) issues.push(q.id+": bad error key");
    if(q.fmt==="rewrite"){
      if(q.checks.every(c=>runCheck(c, q.material.response))) issues.push(q.id+": rewrite already satisfies every check");
      const ex=(q.model.match(/e\.g\.:\n([\s\S]*?)\nIt changes/)||[])[1]; if(ex && !q.checks.every(c=>runCheck(c, ex))) issues.push(q.id+": model rewrite fails its own checks");
      return; }
    const perfect = q.fmt==="rank" ? { pref:q.answer.pref, dims:q.answer.dims } : q.fmt==="eval"||q.fmt==="multi" ? { choices:q.answer } : q.fmt==="fact"||q.fmt==="single" ? { choice:q.answer } : { text:q.answer };
    if(q.fmt!=="transcribe") perfect.text=(q.sig||[]).join(", ")+". This matters because the evidence shows the issue clearly; therefore the judgment follows. "+(q.explanation||"");
    const g=gradePracticeQuestion(q, perfect, q.difficulty);
    if(g.score<75) issues.push(`${q.id}: perfect answer scored ${g.score}`);
    if(gradePracticeQuestion(q, null, q.difficulty).score!==0) issues.push(q.id+": empty answer not zero");
    if(!Object.keys(g.competencyScores).length) issues.push(q.id+": no competency evidence");
  });
  return { issues, audit, summary:`${audit.filter(a=>a.status==="available").length}/${audit.length} categories available; ${QuestionBank.all().length} published-or-draft questions; ${sessions} strict sessions built` };
}
