/* =============================================================================
   BSP AI Practice Lab engine — 10-question timed sessions, grading, results,
   progression and interview ↔ practice recommendations.
   Session timer is anchored to wall-clock (endsAt), so a refresh never resets it.
   ========================================================================== */
"use strict";

const ANNOTATION_CATS = new Set(["text-classification","data-annotation","entity-annotation","search-relevance","image-labelling","image-to-text"]);
function practiceCat(id){ return PRACTICE_CATEGORIES.find(c=>c.id===id) || null; }
const DIFF_NUM = { easy:1, medium:2, hard:3 };

/* ---------- Building a session (always exactly PRACTICE_QUESTIONS) -------- */
function shuffle(a, R){ R=R||Math.random; const x=a.slice(); for(let i=x.length-1;i>0;i--){ const j=Math.floor(R()*(i+1)); [x[i],x[j]]=[x[j],x[i]]; } return x; }
function poolFor(catId){ return PB.filter(q=>q.cats.includes(catId)); }
function pickByDifficulty(pool, d, n, used){
  const order = d===1 ? [1,2,3] : d===2 ? [2,1,3] : [3,2,1];
  const out=[];
  order.forEach(k=>{ shuffle(pool.filter(q=>q.d===k && !used.has(q.id))).forEach(q=>{ if(out.length<n){ out.push(q); used.add(q.id); } }); });
  return out;
}
function buildPracticeQuestions(catId, diff, seed){
  const d=DIFF_NUM[diff]||2, N=PRACTICE_QUESTIONS, base=(seed||Date.now())%1000003;
  const gen=PRACTICE_GENERATORS[catId];
  if(gen) return Array.from({length:N},(_,i)=>gen(base*31+i*7919+1, d));
  const used=new Set(); let qs=[];
  if(catId==="generalist"){
    qs=pickByDifficulty(PB.filter(q=>q.cats.includes("generalist")), d, N-2, used);
    qs.push(genSpreadsheet(base+11, d), genCaption(base+29, d));
  } else {
    qs=pickByDifficulty(poolFor(catId), d, N, used);
    (PRACTICE_RELATED[catId]||[]).forEach(rc=>{ if(qs.length<N) qs=qs.concat(pickByDifficulty(poolFor(rc), d, N-qs.length, used)); });
    if(qs.length<N) qs=qs.concat(pickByDifficulty(PB.filter(q=>q.cats.includes("generalist")), d, N-qs.length, used));
  }
  return shuffle(qs).slice(0, N).map(q=>JSON.parse(JSON.stringify(q)));
}
function createPracticeSession(catId, diff){
  const now=Date.now(), mins=PRACTICE_DIFF[diff].minutes;
  const ps={ id:"p-"+now.toString(36)+"-"+Math.random().toString(36).slice(2,6), category:catId, difficulty:diff,
    questions:buildPracticeQuestions(catId, diff, now), responses:{}, flags:[], timeSpent:{}, current:0,
    durationMs:mins*60000, startedAt:now, endsAt:now+mins*60000, status:"in_progress", submittedAt:null, autoSubmitted:false, results:null };
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

/* ---------- Grading -------------------------------------------------------- */
function normWords(s){
  const NUM={"0":"zero","1":"one","2":"two","3":"three","4":"four","5":"five","6":"six","7":"seven","8":"eight","9":"nine","10":"ten","12":"twelve","14th":"fourteenth","%":" percent"};
  return words(fold(String(s||"").replace(/%/g," percent").replace(/\b(\d+)\b/g,m=>NUM[m]||m).replace(/[-]/g," ")));
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
    case "maxWords": return w>0 && w<=c.v;
    case "maxSentences": return t.length>0 && t.split(/[.!?]+(\s|$)/).filter(x=>x.trim().length>1).length<=c.v;
    case "has": return fold(t).includes(fold(c.v));
    case "lacks": return t.length>0 && !t.includes(c.v);
    case "hasRe": return new RegExp(c.v,"i").test(t);
    case "lacksRe": return t.length>0 && !new RegExp(c.v,"i").test(t);
    case "bullets": return t.split(/\n/).filter(l=>/^\s*([-•*]|\d+[.)])\s+\S/.test(l)).length===c.v;
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
    case "multi": return q.answer.map(i=>q.options[i]).join("; ");
    case "single": return q.options[q.answer];
    case "rewrite": return "A rewrite that meets: "+q.checks.map(c=>c.label).join("; ");
    case "transcribe": return `"${q.answer}"`;
  }
  return "";
}
function rubricText(q){
  const reasonW = ANNOTATION_CATS.has(q.cats[0]) ? 25 : 40;
  return ({
    rank:`Preference strength 70% of the judgment (exact = full credit, adjacent on the same side = partial) and dimension calls 30%; written reasoning ${reasonW}% of the question.`,
    eval:`Error types scored by overlap (credit for each correct type, penalty for false flags); written explanation ${reasonW}% of the question.`,
    multi:`Selections scored by overlap (credit for each correct option, penalty for wrong ones); written explanation ${reasonW}% of the question.`,
    fact:`Correct label = full credit; a near-miss label = partial credit; written evidence ${reasonW}% of the question.`,
    single:`Correct choice = full credit; a near-miss = partial credit; written reasoning ${reasonW}% of the question.`,
    rewrite:"Each requirement your rewrite meets earns credit (70%); content quality 30%.",
    transcribe:"Accuracy = 1 − word error rate. Case and punctuation are ignored, and numbers may be written as digits or words.",
  })[q.fmt];
}
function gradePracticeQuestion(q, r, diff){
  const D=PRACTICE_DIFF[diff]||PRACTICE_DIFF.medium, correct=[], missed=[];
  if(!isAnswered(q, r)) return { score:0, status:"no_response", correct, missed:["No response"], expected:expectedText(q), rubric:rubricText(q), objective:0, reasoning:0 };
  let obj=0;
  const set=(a,b)=>{ const A=new Set(a), B=new Set(b); const tp=[...B].filter(x=>A.has(x)).length; const p=B.size?tp/B.size:0, rc=A.size?tp/A.size:0; return { f1:(p+rc)?2*p*rc/(p+rc):0, tp:[...B].filter(x=>A.has(x)), fp:[...B].filter(x=>!A.has(x)), fn:[...A].filter(x=>!B.has(x)) }; };
  switch(q.fmt){
    case "rank": {
      const e=q.answer.pref, u=r.pref, same=(Math.sign(e)===Math.sign(u));
      const ps = u===e ? 1 : (same && Math.abs(u-e)===1) ? 0.6 : (Math.abs(u-e)===1) ? 0.4 : 0;
      (ps===1?correct:missed).push(ps===1?"Preference strength matches":"Expected preference: "+RANK_SCALE.find(x=>x[0]===e)[1]);
      const dk=Object.keys(q.answer.dims||{}); let dsc=1;
      if(dk.length){ let ok=0; dk.forEach(k=>{ const lbl=(RANK_DIMS.find(d=>d[0]===k)||[k,k])[1]; if((r.dims||{})[k]===q.answer.dims[k]){ ok++; correct.push(`${lbl} call correct`); } else missed.push(`${lbl}: expected ${q.answer.dims[k]==="T"?"tie":q.answer.dims[k]}`); }); dsc=ok/dk.length; }
      obj=ps*0.7+dsc*0.3; break; }
    case "eval": case "multi": {
      const s=set(q.answer, r.choices||[]);
      s.tp.forEach(x=>correct.push("Identified: "+optName(q,x))); s.fn.forEach(x=>missed.push("Missed: "+optName(q,x))); s.fp.forEach(x=>missed.push("Incorrectly selected: "+optName(q,x)));
      obj=s.f1; break; }
    case "fact": {
      const near=[["Supported","Partially Supported"],["Unsupported","Cannot Determine"],["Partially Supported","Unsupported"]];
      if(r.choice===q.answer){ obj=1; correct.push("Label correct: "+q.answer); }
      else { obj = near.some(([a,b])=>(a===r.choice&&b===q.answer)||(b===r.choice&&a===q.answer)) ? 0.3 : 0; missed.push(`Expected "${q.answer}", you chose "${r.choice}"`); }
      break; }
    case "single": {
      if(r.choice===q.answer){ obj=1; correct.push("Correct: "+q.options[q.answer]); }
      else { const ordinal=q.options===REL || q.cats[0]==="search-relevance"; obj = ordinal && Math.abs(r.choice-q.answer)===1 ? 0.4 : 0; missed.push(`Expected "${q.options[q.answer]}", you chose "${q.options[r.choice]}"`); }
      break; }
    case "rewrite": {
      let pass=0; q.checks.forEach(c=>{ if(runCheck(c, r.text)){ pass++; correct.push("Meets: "+c.label); } else missed.push("Not met: "+c.label); });
      const content=q.sig.length ? scoreAnswer(r.text, { expectedStrongSignals:q.sig, commonWeakSignals:[] }, { words:15 }).dims.Relevance/100 : 1;
      const score=Math.round(100*(pass/q.checks.length*0.7 + content*0.3));
      return { score, status:score>=75?"strong":"needs_improvement", correct, missed, expected:expectedText(q), rubric:rubricText(q), objective:pass/q.checks.length, reasoning:content }; }
    case "transcribe": {
      const acc=1-wer(q.answer, r.text), score=Math.round(acc*100);
      (score>=95?correct:missed).push(`Word accuracy ${score}%`);
      return { score, status:score>=75?"strong":"needs_improvement", correct, missed, expected:expectedText(q), rubric:rubricText(q), objective:acc, reasoning:null }; }
  }
  // Written reasoning
  const text=(r.text||"").trim(), wc=words(text).length, reasonW = ANNOTATION_CATS.has(q.cats[0]) ? 0.25 : 0.4;
  let rs=0;
  if(!wc){ missed.push("No written reasoning (required)"); }
  else {
    const sr=scoreAnswer(text, { expectedStrongSignals:q.sig, commonWeakSignals:WEAK_DEFAULT }, { words:D.minWords*3 });
    rs = q.sig.length ? Math.min(1, (sr.dims.Relevance*0.6 + sr.dims.Depth*0.25 + sr.dims.Structure*0.15)/100) : Math.min(1, wc/(D.minWords*2));
    if(wc < D.minWords){ rs*=0.5; missed.push(`Reasoning too brief for ${D.label} (aim for ${D.minWords}+ words)`); }
    if(sr.hit.length) correct.push("Reasoning cites: "+sr.hit.slice(0,4).join(", "));
    else if(q.sig.length) missed.push("Reasoning could cite: "+q.sig.slice(0,4).join(", "));
  }
  const score=Math.round(100*(obj*(1-reasonW) + rs*reasonW));
  return { score, status:score>=75?"strong":"needs_improvement", correct, missed, expected:expectedText(q), rubric:rubricText(q), objective:obj, reasoning:rs };
}

/* ---------- Submit + results ---------------------------------------------- */
function submitPracticeSession(ps, auto){
  if(ps.status!=="in_progress") return ps;
  const now=Date.now();
  const graded=ps.questions.map(q=>({ id:q.id, comp:q.comp, ...gradePracticeQuestion(q, ps.responses[q.id], ps.difficulty) }));
  const usedMs=Math.min(now, ps.endsAt)-ps.startedAt;
  const comps={}; graded.forEach(g=>{ (comps[g.comp]=comps[g.comp]||[]).push(g.score); });
  const competencies=Object.fromEntries(Object.entries(comps).map(([k,v])=>[k,avg(v)]));
  const sorted=Object.entries(competencies).sort((a,b)=>b[1]-a[1]);
  ps.results={ score:avg(graded.map(g=>g.score)), questions:graded,
    answered:graded.filter(g=>g.status!=="no_response").length, strong:graded.filter(g=>g.status==="strong").length,
    needs:graded.filter(g=>g.status==="needs_improvement").length, noResponse:graded.filter(g=>g.status==="no_response").length,
    timeUsedSec:Math.round(usedMs/1000), avgSec:Math.round(usedMs/1000/PRACTICE_QUESTIONS), competencies,
    strongest: sorted.length>1 ? sorted[0][0] : (sorted.length && sorted[0][1]>=75 ? sorted[0][0] : null),
    focus: sorted.length>1 ? sorted[sorted.length-1][0] : (sorted.length && sorted[0][1]<75 ? sorted[0][0] : null) };
  ps.status="submitted"; ps.submittedAt=now; ps.autoSubmitted=!!auto;
  Repo.practiceSessions.save(ps);
  if(Repo.prefs.get().activePracticeId===ps.id) Repo.prefs.set({ activePracticeId:null });
  return ps;
}

/* ---------- Progression (never locks a difficulty) ------------------------ */
function practiceProgression(catId){
  const done=Repo.practiceSessions.all().filter(p=>p.status==="submitted" && p.category===catId);
  const of=d=>done.filter(p=>p.difficulty===d).sort((a,b)=>b.submittedAt-a.submittedAt);
  const ready=list=>list.length>=3 && list.slice(0,2).every(p=>p.results.score>=80);
  if(ready(of("medium"))) return { difficulty:"hard", reason:"You've completed 3+ Medium sessions and scored 80%+ on your latest two." };
  if(ready(of("easy"))) return { difficulty:"medium", reason:"You've completed 3+ Easy sessions and scored 80%+ on your latest two." };
  return null;
}

/* ---------- Interview ↔ practice recommendations -------------------------- */
const COMP_TO_CAT=[[/hallucin/i,"hallucination"],[/fact|verif/i,"factuality"],[/research|evidence/i,"research"],[/instruction/i,"instruction-following"],
  [/translat|meaning|french|register|tone|grammar|bilingual|english/i,"french-english"],[/code|software|correct/i,"coding-evaluation"],
  [/data|statist|visual|spreadsheet|reconcil|calculat/i,"spreadsheet-evaluation"],[/safety/i,"safety-evaluation"],[/annotat|label/i,"data-annotation"],
  [/preference|rank|rubric|consisten/i,"preference-ranking"],[/prompt/i,"prompt-evaluation"],[/error/i,"response-evaluation"],[/\bai\b|evaluation/i,"response-evaluation"]];
function practiceRecFor(label, score){
  const m=COMP_TO_CAT.find(([re])=>re.test(label)), cat=m?m[1]:"domain-expert";
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
  const prac=Repo.practiceSessions.all().filter(p=>p.status==="submitted").sort((a,b)=>b.submittedAt-a.submittedAt);
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
  PRACTICE_CATEGORIES.forEach(c=>["easy","medium","hard"].forEach(d=>{
    const qs=buildPracticeQuestions(c.id, d, 12345+sessions); sessions++;
    if(qs.length!==PRACTICE_QUESTIONS) issues.push(`${c.id}/${d}: ${qs.length} questions`);
    if(new Set(qs.map(q=>q.id)).size!==qs.length) issues.push(`${c.id}/${d}: duplicate questions`);
    qs.forEach(q=>{
      if(!q.model) issues.push(q.id+": no strong-reasoning example");
      if(["multi","single"].includes(q.fmt)){ const ok = q.fmt==="single" ? (q.answer>=0 && q.answer<q.options.length) : (q.answer.length && q.answer.every(i=>i>=0&&i<q.options.length)); if(!ok) issues.push(q.id+": bad answer index"); }
      if(q.fmt==="fact" && !FACT_LABELS.includes(q.answer)) issues.push(q.id+": bad fact label");
      const perfect = q.fmt==="rank" ? { pref:q.answer.pref, dims:q.answer.dims } : q.fmt==="eval"||q.fmt==="multi" ? { choices:q.answer } : q.fmt==="fact"||q.fmt==="single" ? { choice:q.answer } : q.fmt==="transcribe" ? { text:q.answer } : { text:null };
      if(q.fmt==="rewrite") return;
      perfect.text = perfect.text || (q.sig.join(", ")+". This matters because the evidence shows the issue clearly; therefore the rating follows. "+(q.model||""));
      const g=gradePracticeQuestion(q, perfect, d);
      if(g.score<75) issues.push(`${q.id}: perfect answer scored ${g.score}`);
      if(gradePracticeQuestion(q, null, d).score!==0) issues.push(q.id+": empty answer not zero");
    });
  }));
  const rw=PB.filter(q=>q.fmt==="rewrite");
  const good={ rw1:"This reusable steel bottle keeps drinks cold all day and cuts plastic waste.", rw2:'{"name": "Maria", "age": 34}', rw3:"- Drink water regularly.\n- Carry a bottle.\n- Eat fruit.",
    rw4:"Thank you for your offer. We have decided not to proceed at this time, but we appreciate your time.", rw5:"When you save money the bank pays you interest, and next year you earn interest on that interest too, so your money grows faster.",
    rw6:"Water boils at 100°C at sea level, so pasta cooks quickly." };
  rw.forEach(q=>{ const g=gradePracticeQuestion(q,{text:good[q.id]},"medium"); if(g.score<75) issues.push(`${q.id}: good rewrite scored ${g.score} (${g.missed.join("; ")})`); });
  return { issues, summary:`${PRACTICE_CATEGORIES.length} categories × 3 difficulties = ${sessions} sessions, all exactly ${PRACTICE_QUESTIONS} questions; ${PB.length} static items + 3 generators` };
}
