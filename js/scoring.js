/* =============================================================================
   BSP Role Interview Score — explicit rubric scoring.

   Every answer is first given a structured RUBRIC LEVEL (0–4) per relevant dimension,
   using written criteria (coverage of the expected signals, reasoning, evidence,
   judgment, structure, instruction adherence). Only after that are levels converted
   into readable percentages: dimension % = mean level ÷ 4 × 100, and the overall score
   is the weighted mean of the dimensions this interview actually tested.
   No score is ever produced without its evidence: each dimension keeps the evidence
   found, the evidence missing, verbatim excerpts from the candidate's own answers,
   and how to improve.
   ========================================================================== */
"use strict";

const RUBRIC_VERSION = "bsp-rubric-1";
const RUBRIC_LEVELS = [
  { level:0, label:"No meaningful answer", d:"No meaningful answer, or materially incorrect." },
  { level:1, label:"Limited",              d:"Limited understanding. Major concepts missing." },
  { level:2, label:"Partial",              d:"Partial understanding. Correct direction but important gaps." },
  { level:3, label:"Strong",               d:"Strong response. Correct reasoning with appropriate detail." },
  { level:4, label:"Excellent",            d:"Excellent, evidence-based response with strong professional judgment." },
];
/* BSP Role Interview Score dimensions. Only the dimensions an interview actually tests are reported. */
const ROLE_DIMS = {
  domain_knowledge:      { label:"Domain Knowledge",       w:25, skill:"domain_knowledge" },
  professional_reasoning:{ label:"Professional Reasoning", w:20, skill:"reasoning" },
  professional_judgment: { label:"Professional Judgment",  w:15, skill:"professional_judgment" },
  ai_evaluation:         { label:"AI Evaluation Ability",  w:20, skill:"ai_response_evaluation" },
  communication:         { label:"Communication",          w:15, skill:"communication" },
  instruction_following: { label:"Instruction Following",  w:10, skill:"instruction_following" },
  attention_to_detail:   { label:"Attention to Detail",    w:10, skill:"attention_to_detail" },
};
const TYPE_DIMS = {
  domain:      ["domain_knowledge","professional_reasoning","professional_judgment","communication"],
  ai_domain:   ["domain_knowledge","professional_reasoning","professional_judgment","ai_evaluation","communication","instruction_following","attention_to_detail"],
  ai_readiness:["ai_evaluation","instruction_following","attention_to_detail","professional_reasoning","communication"],
  behavioral:  ["professional_judgment","professional_reasoning","communication"],
  technical:   ["domain_knowledge","professional_reasoning","attention_to_detail","ai_evaluation","communication"],
  bilingual:   ["domain_knowledge","attention_to_detail","ai_evaluation","instruction_following","communication"],
  language:    ["domain_knowledge","attention_to_detail","ai_evaluation","instruction_following","communication"],
  transferable:["instruction_following","attention_to_detail","professional_judgment","professional_reasoning","communication"],
  full_mock:   ["domain_knowledge","professional_reasoning","professional_judgment","ai_evaluation","communication","instruction_following","attention_to_detail"],
  legacy:      ["domain_knowledge","professional_reasoning","communication"],
};

/* ---------- Criteria detectors (text only) -------------------------------- */
const RX_REASON=/\b(because|since|so that|which means|this means|as a result|therefore|the reason|due to|parce que|donc|car|afin de)\b/i;
const RX_EVIDENCE=/(for example|for instance|e\.g\.|such as|in my (last|previous|current)|at my|i once|a time when|in one case|i (worked|managed|led|built|handled|reviewed|delivered|ran|taught|supported|created|analy[sz]ed|designed|coordinated|translated)|par exemple|dans mon|\b\d+([.,]\d+)?%?\b)/i;
const RX_JUDGMENT=/\b(risk|impact|trade-?offs?|priorit\w*|escalat\w*|consequence\w*|stakeholders?|safety|safe|verify|verif\w*|check\w*|validat\w*|alternative\w*|depend\w*|severity|mitigat\w*|contingenc\w*|weigh\w*|balance|decide|decision|risque|vérifi\w*)\b/i;
const RX_STRUCT=/\b(first|second|third|then|next|finally|however|in addition|on the other hand|d'abord|ensuite|enfin|cependant)\b/gi;
function sentencesOf(t){ return stripFillers(t).split(/(?<=[.!?])\s+|\n+/).map(x=>x.trim()).filter(x=>words(x).length>=3); }
function clip(t, n){ t=String(t).trim(); return t.length>n ? t.slice(0,n-1).replace(/\s+\S*$/,"")+"…" : t; }

/* Which parts does a question ask for, and did the answer address them? */
const PARTS=[
  { k:"why",     re:/\bwhy\b|pourquoi/i,                                    ok:(t)=>RX_REASON.test(t),                         label:"the “why” (your reasoning)" },
  { k:"how",     re:/\bhow (do|would|did|will|you)\b|walk me through|step by step|describe the (checks|steps)|comment/i, ok:(t)=>/\b(first|then|step|next|i would|i'd|by |approach|process|d'abord|ensuite|je)\b/i.test(t), label:"the “how” (your method or steps)" },
  { k:"rate",    re:/\b(rate|rating|which response|which is better|prefer|choose|grade|score it)\b/i, ok:(t)=>/\b(rate|rating|score|better|worse|prefer|choose|response [ab]|option|fail|pass|acceptable|unacceptable|\d\s*\/\s*\d|out of)\b/i.test(t), label:"a clear rating or choice" },
  { k:"example", re:/\b(example|a time when|tell me about a time|describe a situation)\b|exemple/i, ok:(t)=>RX_EVIDENCE.test(t),   label:"a specific example" },
  { k:"fix",     re:/\b(fix|correct(ed)? version|rewrite|improve it|how would you change)\b/i, ok:(t)=>/\b(fix|correct|change|replace|rewrite|should (be|say)|instead)\b/i.test(t), label:"a correction or fix" },
];
function questionParts(q){ const t=String(q||""); const ps=PARTS.filter(p=>p.re.test(t)); return ps.length?ps:[]; }

/* ---------- Per-answer rubric --------------------------------------------- */
function answerText(a){ return stripFillers(a.answer+(a.followUp&&a.followUp.answer?" "+a.followUp.answer:"")); }
function levelFromCriteria(c){
  if(!c.answered || (c.coverage===0 && !c.reasoning && c.wc<25)) return 0;
  let L;
  if(c.coverage<0.2 || c.ratio<0.3) L=1;
  else if(c.coverage<0.45 || !c.reasoning) L=2;
  else if(c.coverage>=0.65 && c.reasoning && c.evidence && (c.judgment||c.structure) && c.ratio>=0.6 && !c.hedging) L=4;
  else L=3;
  if(c.langMismatch) L=Math.min(L,2);
  if(c.hedging) L=Math.min(L,3);
  return L;
}
function rubricFor(a, level){
  const text=answerText(a), wc=words(text).length, lv=LEVELS[level]||LEVELS.intermediate;
  const expected=(a.hit||[]).length+(a.missed||[]).length, hitN=(a.hit||[]).length;
  const c={ answered:wc>=6, wc, ratio:wc/lv.words, coverage: expected ? Math.min(1, hitN/Math.min(6, expected)) : (wc>=40?0.5:0),
    reasoning:RX_REASON.test(text), evidence:RX_EVIDENCE.test(text), judgment:RX_JUDGMENT.test(text),
    structure:(text.match(RX_STRUCT)||[]).length>=2, hedging:WEAK_DEFAULT.some(w=>fold(text).includes(w)), langMismatch:!!a.langMismatch };
  const L=levelFromCriteria(c);
  const dims={};
  const t=a.questionType, st=a.stage||STAGE_OF[t];
  if(st==="domain" || (t==="knowledge")) dims.domain_knowledge=L;
  if(["scenario","practical","callback"].includes(t) || (st==="reasoning" && t!=="behavioral")) dims.professional_reasoning=L;
  if(st==="ai" || t==="ai_eval") dims.ai_evaluation=L;
  if(["error_detection","practical","ai_eval"].includes(t)) dims.attention_to_detail=L;
  if(["scenario","behavioral","callback","final","practical"].includes(t)){
    dims.professional_judgment = L===0 ? 0 : Math.min(4, L+1, 1+(c.judgment?1:0)+(c.reasoning?1:0)+(c.evidence?1:0));
  }
  const cm=typeof a.communication==="number"?a.communication:0;
  dims.communication = !c.answered ? 0 : cm>=80?4 : cm>=65?3 : cm>=45?2 : cm>=25?1 : 0;
  if(t!=="intro"){
    const parts=questionParts(a.q), done=parts.filter(p=>p.ok(text));
    c.parts=parts.map(p=>({ k:p.k, label:p.label, ok:done.includes(p) }));
    let IF = !c.answered ? 0 : !parts.length ? (c.ratio>=0.5?4:3) : done.length===parts.length ? (c.ratio>=0.5?4:3) : done.length*2>=parts.length ? 2 : 1;
    if(c.langMismatch) IF=Math.min(IF,1);
    dims.instruction_following=IF;
  }
  return { version:RUBRIC_VERSION, level:L, label:RUBRIC_LEVELS[L].label, pct:L*25, criteria:c, dims };
}
function ansPct(a){ return a && a.rubric ? a.rubric.pct : (a ? a.score : 0); }

/* ---------- Evidence statements ------------------------------------------- */
const HUMAN=s=>String(s).replace(/_/g," ");
function evidenceFor(a, dim){
  const c=a.rubric.criteria, text=answerText(a), found=[], missing=[], excerpts=[], improve=[];
  const sents=sentencesOf(text);
  const pickSent=re=>{ const x=sents.find(s=>re.test(fold(s))); if(x && !excerpts.includes(x)) excerpts.push(clip(x,220)); };
  if(dim==="communication"){
    if(c.structure) found.push("Organised the answer with clear signposting"); else { missing.push("Little signposting (first… then… because…)"); improve.push("Signpost your answer: first, then, because, finally."); }
    if(c.reasoning) found.push("Explained the reasoning behind points"); else { missing.push("Points stated without explaining why"); improve.push("Add “because…” or “which means…” after each key point."); }
    if(c.ratio>=0.6) found.push("Gave an appropriate level of detail for the level chosen"); else { missing.push("Answer shorter than expected for this level"); improve.push("Develop the answer further: aim for the suggested word range."); }
    const m=text.match(RX_STRUCT); if(m) pickSent(new RegExp("\\b"+fold(m[0])+"\\b"));
  } else if(dim==="instruction_following"){
    (c.parts||[]).forEach(p=>{ if(p.ok) found.push("Addressed "+p.label); else { missing.push("Did not address "+p.label); improve.push("Answer every part of the question, including "+p.label+"."); } });
    if(!(c.parts||[]).length) found.push(c.answered?"Answered the question asked":"");
    if(c.langMismatch){ missing.push("Answered in a different language from the one the question asked for"); improve.push("Answer in the language Alex uses for the question."); }
    if(c.ratio<0.5){ missing.push("Shorter than the expected length"); }
  } else if(dim==="professional_judgment"){
    if(c.judgment){ found.push("Considered risk, impact, priorities or verification"); pickSent(RX_JUDGMENT); } else { missing.push("Risk, impact, trade-offs or verification not considered"); improve.push("Say what could go wrong, what you would check, and how you would prioritise."); }
    if(c.reasoning) found.push("Justified the decision"); else { missing.push("Decision not justified"); improve.push("Explain why your decision is the right one."); }
    if(c.evidence) found.push("Grounded the answer in a concrete example or detail"); else { missing.push("No concrete example or detail"); improve.push("Ground it in a real example from your own experience if you have one; otherwise describe exactly how you would apply it."); }
  } else {
    (a.hit||[]).slice(0,6).forEach(h=>{ found.push("Addressed “"+h+"”"); const f=fold(h), stem=f.slice(0,Math.max(5,Math.ceil(f.length*0.75))); pickSent(new RegExp(stem.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"))); });
    (a.missed||[]).slice(0,5).forEach(m=>missing.push("Did not mention “"+m+"”"));
    if(c.reasoning) found.push("Explained the reasoning"); else { missing.push("Reasoning not explained"); improve.push("Explain the reasoning behind each step."); }
    if(c.evidence) found.push("Supported the answer with specifics"); else missing.push("No supporting example or specific detail");
    if((a.missed||[]).length) improve.push("Cover the points this question targets, such as "+(a.missed||[]).slice(0,3).join(", ")+".");
    if(c.hedging){ missing.push("Hedging language (e.g. “not sure”, “I guess”)"); improve.push("State your judgment and the evidence for it instead of hedging."); }
  }
  return { found:found.filter(Boolean), missing, excerpts:excerpts.slice(0,2), improve };
}

/* ---------- Role score ---------------------------------------------------- */
function roleWeightsFor(s){
  const p=typeof getProfession==="function" ? getProfession(s.profession&&s.profession.id) : null;
  const ov=p && p.roleWeights ? p.roleWeights : {};
  return Object.fromEntries(Object.entries(ROLE_DIMS).map(([k,d])=>[k, ov[k]!=null ? +ov[k] : d.w]));
}
function computeRoleScore(s){
  const A=s.answers, level=s.experienceLevel;
  A.forEach(a=>{ if(!a.rubric || a.rubric.version!==RUBRIC_VERSION) a.rubric=rubricFor(a, level); });
  const allowed=TYPE_DIMS[s.interviewType]||TYPE_DIMS.domain, W=roleWeightsFor(s), dims={};
  allowed.forEach(id=>{
    const idx=A.map((a,i)=>[a,i]).filter(([a])=>a.rubric.dims[id]!=null);
    if(!idx.length) return;
    const levels=idx.map(([a])=>a.rubric.dims[id]), mean=levels.reduce((x,y)=>x+y,0)/levels.length;
    const ev={ found:[], missing:[], excerpts:[], improve:[] };
    idx.forEach(([a])=>{ const e=evidenceFor(a, id); Object.keys(ev).forEach(k=>e[k].forEach(x=>{ if(!ev[k].includes(x)) ev[k].push(x); })); });
    ev.missing=ev.missing.filter(m=>!ev.found.includes(m.replace(/^Did not mention/,"Addressed")));
    dims[id]={ id, label:ROLE_DIMS[id].label, avgLevel:Math.round(mean*10)/10, level:Math.round(mean), pct:Math.round(mean/4*100), n:levels.length, levels,
      answers:idx.map(([,i])=>i), weight:W[id]||0,
      found:ev.found.slice(0,8), missing:ev.missing.slice(0,8), excerpts:ev.excerpts.slice(0,3), improve:ev.improve.slice(0,4) };
  });
  const ent=Object.values(dims).filter(d=>d.weight>0), tw=ent.reduce((a,d)=>a+d.weight,0);
  const overall = tw ? Math.round(ent.reduce((a,d)=>a+d.pct*d.weight,0)/tw) : 0;
  const ranked=Object.values(dims).sort((a,b)=>b.pct-a.pct);
  return { version:RUBRIC_VERSION, overall, dims, weights:Object.fromEntries(ent.map(d=>[d.id,d.weight])),
    why:{ found:ranked.filter(d=>d.pct>=70).map(d=>`${d.label}: rubric level ${d.avgLevel}/4 across ${d.n} answer${d.n>1?"s":""}`),
          missing:ranked.slice().reverse().filter(d=>d.pct<70).map(d=>`${d.label}: rubric level ${d.avgLevel}/4 — ${d.missing[0]||"gaps in coverage"}`),
          excerpts:[].concat(...ranked.map(d=>d.excerpts)).slice(0,3),
          improve:[].concat(...ranked.slice().reverse().map(d=>d.improve)).filter((x,i,a)=>a.indexOf(x)===i).slice(0,4) } };
}

/* ---------- Answer review helpers ---------------------------------------- */
/* Never invents experience: it describes a SHAPE for a better answer. */
function strongerStructure(a){
  const pts=(a.missed||[]).slice(0,3), hits=(a.hit||[]).slice(0,2), cover=pts.length?pts.join(", "):hits.join(", ");
  switch(a.questionType){
    case "behavioral": case "intro": case "callback": return [
      "Situation: one or two sentences of context from your own experience.",
      "Task: what you were responsible for.",
      "Action: the specific steps you took"+(cover?`, touching on ${cover}`:"")+", and why.",
      "Result: what happened, with a measurable outcome if you have one.",
      "Reflection: what you learned or would do differently." ];
    case "ai_eval": case "error_detection": return [
      "State your overall rating or verdict first.",
      "List each issue you found and how severe it is"+(cover?` (for example ${cover})`:"")+".",
      "Explain why each issue matters to the reader or user.",
      "Say what you would verify, and against which source.",
      "Give the corrected version or the fix you would require." ];
    case "practical": return [
      "Restate the task and its constraints in one sentence.",
      "Work through it step by step"+(cover?`, covering ${cover}`:"")+".",
      "Explain the reason for each key choice.",
      "Say how you would check the result before handing it over." ];
    default: return [
      "Open with your approach in one sentence.",
      "Cover the points this question targets"+(cover?`: ${cover}`:"")+".",
      "Explain why each step matters (because…, which means…).",
      "Ground it in a real example from your own experience if you have one; otherwise explain exactly how you would apply it.",
      "Close with the risk you would watch for and how you would check the outcome." ];
  }
}
function responseAnalytics(s){
  const A=s.answers, secs=A.map(a=>a.seconds||0), wcs=A.map(a=>a.wc||0);
  const dur=s.completedAt&&s.startedAt ? Math.round((s.completedAt-s.startedAt)/1000) : secs.reduce((a,b)=>a+b,0);
  const i=wcs.indexOf(Math.max(...wcs)), j=wcs.indexOf(Math.min(...wcs));
  return { durationSec:dur, answerSec:secs.reduce((a,b)=>a+b,0), avgSec:avg(secs), avgWords:avg(wcs), questions:A.length,
    followUps:(s.followUps||[]).length, followUpsAnswered:(s.followUps||[]).filter(f=>f.answered).length,
    longest:A.length?{ n:i+1, wc:wcs[i] }:null, shortest:A.length?{ n:j+1, wc:wcs[j] }:null,
    mode:s.mode, targetWords:(LEVELS[s.experienceLevel]||LEVELS.intermediate).words };
}
/* Deterministic next-interview recommendation (never a hiring prediction). */
function nextInterviewFor(s){
  const p=getProfession(s.profession.id), role=s.scores&&s.scores.role; if(!p||!role) return null;
  const av=typeAvailability(p), dims=Object.values(role.dims).sort((a,b)=>a.pct-b.pct), weak=dims[0];
  const pick=(type, why, extra)=>av[type]&&av[type].ok ? Object.assign({ professionId:p.id, type, label:TYPES[type].label, why }, extra||{}) : null;
  if(role.overall<55) return pick(s.interviewType, `Your overall score was ${role.overall}/100. Repeat the same interview to build consistency before moving on.`);
  if(weak && weak.id==="ai_evaluation" && weak.pct<60) return pick("ai_readiness", `AI Evaluation Ability scored ${weak.pct}%.`) || pick("ai_domain", `AI Evaluation Ability scored ${weak.pct}%.`);
  if(s.mode==="text" && Speech.sttAvailable && !Repo.sessions.completed().some(x=>x.mode==="voice")) return pick(s.interviewType, "You haven't tried a voice interview yet. Explaining your reasoning out loud is the next step.", { mode:"voice" });
  if(role.overall>=78) return pick("full_mock", `You scored ${role.overall}/100. A Full Mock Interview tests every area together.`) || pick(s.interviewType, `You scored ${role.overall}/100. Try the Hard difficulty next.`, { difficulty:"hard" });
  return pick(s.interviewType, weak ? `Focus on ${weak.label} (${weak.pct}%), your lowest dimension.` : "Repeat to build consistency.");
}
