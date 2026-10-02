/* =============================================================================
   Interview engine — voice, scoring, question architecture, adaptive flow,
   session model. No network calls; everything is deterministic and in-browser.
   ========================================================================== */
"use strict";

/* ---------- Speech (Web Speech API) --------------------------------------- */
const Speech = (()=>{
  const synth = window.speechSynthesis || null;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let voice=null, gen=0;
  function pickVoice(){
    if(!synth) return;
    const vs=synth.getVoices();
    voice = vs.find(v=>/en[-_](US|GB)/i.test(v.lang)&&/google|natural|neural|daniel|alex|samantha/i.test(v.name))
         || vs.find(v=>/en[-_]US/i.test(v.lang)) || vs.find(v=>/^en/i.test(v.lang)) || vs[0] || null;
  }
  if(synth){ pickVoice(); synth.onvoiceschanged=pickVoice; }
  function speakOne(text){ return new Promise(res=>{
    if(!synth){ res(); return; }
    const u=new SpeechSynthesisUtterance(text);
    if(voice) u.voice=voice; u.rate=1.0; u.pitch=1.0;
    let done=false; const fin=()=>{ if(!done){ done=true; clearTimeout(t); res(); } };
    // Some browsers never fire onend; never let the interview hang on it.
    const t=setTimeout(fin, Math.max(4000, text.length*95));
    u.onend=fin; u.onerror=fin; synth.speak(u);
  }); }
  return {
    ttsAvailable:!!synth, sttAvailable:!!SR, SR,
    /* Speak lines in order. Resolves true if completed, false if interrupted by stop(). */
    async say(lines){
      const g=++gen; if(!synth) return true;
      try{ synth.cancel(); }catch(e){}
      for(const l of [].concat(lines).filter(Boolean)){ if(g!==gen) return false; await speakOne(l); }
      return g===gen;
    },
    stop(){ gen++; try{ synth&&synth.cancel(); }catch(e){} },
  };
})();

/* ---------- Text helpers -------------------------------------------------- */
function words(s){ return (String(s||"").trim().match(/[A-Za-z0-9’'-]+/g)||[]); }
function uniq(a){ return [...new Set(a)]; }
function fillTokens(text, p){
  const role=p.title, lang=p.lang||"your second language";
  return String(text||"").replace(/\{a_role\}/g, aOrAn(role)+" "+role).replace(/\{role\}/g, role).replace(/\{lang\}/g, lang);
}
/* Generic signal words that make a poor "You mentioned …" bridge. */
const GENERIC_HITS=new Set("example result check standard quality clear step first because specific evidence context process document review compare measure plan update test data source error priority team audience outcome action situation learned decision accurate simple".split(" "));
function readableHit(hit, text){ return hit.length>=5 && !GENERIC_HITS.has(hit) && /^[a-z][a-z \-]+$/.test(hit) && new RegExp("\\b"+hit.replace(/[-]/g,"\\-")+"\\b","i").test(text); }

/* ---------- Scoring ------------------------------------------------------- */
const STRUCT=["because","therefore","first","second","third","then","however","for example","such as","in addition","as a result","so that","which means","on the other hand","finally","next"];
function scoreAnswer(answer, q, ctx){
  ctx=ctx||{};
  const text=(answer||"").toLowerCase(), wc=words(answer).length;
  const sig=q.expectedStrongSignals||q.concepts||[];
  const hits=sig.filter(c=>text.includes(String(c).toLowerCase()));
  const coverage=sig.length? Math.min(1, hits.length/Math.min(6, sig.length)) : 0;
  const target=ctx.words || (LEVELS[ctx.level]||LEVELS.intermediate).words;
  const ratio=wc/target;
  const depth = ratio>=1.3?1 : ratio>=1?.86 : ratio>=.7?.7 : ratio>=.4?.5 : ratio>=.2?.3 : wc>=6?.12 : 0;
  const structure=Math.min(1, STRUCT.filter(s=>text.includes(s)).length/3);
  const nums=(String(answer||"").match(/\b\d+(\.\d+)?%?\b/g)||[]).length;
  const example=/for example|for instance|e\.g\.|such as|i once|in my|a time when|i worked|i built|at my last|in one case/i.test(answer)?1:0;
  const specificity=Math.min(1, nums*0.22 + example*0.5 + Math.min(1,new Set(words(text)).size/55)*0.5);
  const weakHits=(q.commonWeakSignals||[]).filter(w=>text.includes(w));
  let raw = coverage*0.40 + depth*0.25 + structure*0.20 + specificity*0.15 - Math.min(0.15, weakHits.length*0.05);
  raw = Math.max(0, Math.min(1, raw*(ctx.mult||1)));
  return { score:Math.round(raw*100), wc, weakHits,
    dims:{ Relevance:Math.round(coverage*100), Depth:Math.round(depth*100), Structure:Math.round(structure*100), Specificity:Math.round(specificity*100) },
    missed:sig.filter(c=>!text.includes(String(c).toLowerCase())), hit:hits };
}
function band(s){ return s>=78?["good","Strong"] : s>=55?["ok","Adequate"] : ["bad","Needs work"]; }
function feedbackFor(r, q, level){
  const lv=LEVELS[level]||LEVELS.intermediate, tips=[];
  if(r.wc < lv.words*0.5) tips.push(`Your answer was short. At the ${lv.label.toLowerCase()} level, aim for roughly ${lv.words}–${lv.words+50} words; brief answers read as shallow knowledge.`);
  if(r.dims.Relevance<60) tips.push("Cover more of what the question targets. A strong answer here would touch on: "+(q.expectedStrongSignals||q.concepts||[]).slice(0,6).join(", ")+".");
  if(r.dims.Structure<50) tips.push("Signpost your reasoning ('first… because… for example… therefore…') so it's easy to follow.");
  if(r.dims.Specificity<50) tips.push("Add a concrete example, number, or real situation; specifics separate experts from generalists.");
  if(r.weakHits && r.weakHits.length) tips.push(`Avoid hedging phrases like "${r.weakHits[0]}"; state your reasoning and the evidence behind it.`);
  if(!tips.length) tips.push("Solid, well-rounded answer. To go further, add a measurable outcome or an edge case.");
  const hint=(q.scoringRubric&&q.scoringRubric.hint)||q.hint;
  if(hint) tips.push("What a top answer demonstrates: "+hint+".");
  return tips;
}

/* ---------- Professions --------------------------------------------------- */
const CUSTOM_GROUP = { id:"custom", label:"My Professions", icon:"⭐" };
function allProfessions(){ return PROFESSIONS.concat(Repo.customProfessions.all()); }
function getProfession(id){ return PROF[id] || Repo.customProfessions.all().find(p=>p.id===id) || null; }
function groupOf(p){ return p.custom ? CUSTOM_GROUP : GROUP[p.group]; }
function isTransferable(p){ return p.group==="transferable" || !!p.transferable; }
function isLingual(p){ return p.group==="language" || !!p.lingual; }
function isTechnical(p){ return !!(p.tech || (GROUP[p.group]||{}).tech); }
function getComp(p, id){ return (p.customComps||[]).find(c=>c.id===id) || COMPS[id]; }
function competencyModel(p){ return p.comps.concat(p.ai?[p.ai]:[]).map(id=>getComp(p,id)).filter(Boolean); }

function typeAvailability(p){
  const out={};
  Object.keys(TYPES).forEach(t=>{
    let ok=true, why="";
    if(isTransferable(p) && ["domain","ai_domain","technical","bilingual"].includes(t)){ ok=false; why="Not used for transferable-skills roles; your strengths are assessed in the Transferable Skills Interview."; }
    else if(t==="technical" && !isTechnical(p)){ ok=false; why="For coding, data, science and engineering professions."; }
    else if(t==="bilingual" && !isLingual(p)){ ok=false; why="For language and translation professions."; }
    out[t]={ok, why};
  });
  return out;
}
function recommendedType(p){ return isTransferable(p) ? "transferable" : isLingual(p) ? "bilingual" : "ai_domain"; }

/* Builds a private interview profile from the "Add My Profession" form. */
function buildCustomProfession(f){
  const title=f.title.trim().replace(/\s+/g," ");
  const split=s=>String(s||"").split(/[\n,;•]+/).map(x=>x.trim().replace(/\.$/,"")).filter(x=>x.length>2);
  const items=uniq(split(f.responsibilities).concat(split(f.skills))).slice(0,5);
  const STOP=new Set("with from that this have will your their about into over under across using make making manage managing ensure ensuring daily work works working other others also such them they and the for".split(" "));
  const where=f.industry?` in ${f.industry.trim()}`:"";
  const customComps=items.map((it,i)=>{
    const kws=uniq((it.toLowerCase().match(/[a-z][a-z-]{3,}/g)||[]).filter(w=>!STOP.has(w))).slice(0,5);
    const lc=it.charAt(0).toLowerCase()+it.slice(1);
    return { id:"cc"+i, label:(it.charAt(0).toUpperCase()+it.slice(1)).slice(0,60), weak:WEAK_DEFAULT,
      sig:uniq(kws.concat(["example","result","check","standard","priority","quality"])).slice(0,10),
      know:`As ${aOrAn(title)} ${title}, how do you approach ${lc}? Walk me through your method and how you check the quality of the result.`,
      scen:`Imagine something goes wrong with ${lc} on a deadline-critical piece of work${where}. What do you do first, and why?`,
      beh:`you had to deliver on ${lc} under pressure` };
  });
  const transferable = !!f.transferable || TRANSFERABLE_HINTS.test(title);
  const comps = customComps.map(c=>c.id).concat(transferable ? ["attention_detail","process_adherence","quality_review"] : ["communication","judgment"]);
  let ai=null;
  if(!transferable){
    customComps.push({ id:"cc_ai", label:`AI ${title} Evaluation`, ai:true, weak:WEAK_DEFAULT,
      sig:["accurate","verify","source","error","omission","assumption","standard","risk","check","evidence"],
      know:`How would you evaluate an AI-generated answer to a question from your work as ${aOrAn(title)} ${title}? What would you check first?`,
      scen:`An AI tool produces a confident, well-written summary about ${(items[0]||"your main responsibility").toLowerCase()}${where}, but one key detail is outdated and another is missing. How do you rate it, and what do you check?`,
      beh:"you reviewed or corrected AI-generated or automated work" });
    ai="cc_ai";
  }
  const first=(items[0]||"your main responsibility").toLowerCase();
  const customItems=[
    {t:"practical",d:2,q:`Describe, step by step, how you would approach ${first} for a new employer, and how you would check the result.`,
      sig:["step","first","check","standard","quality","communicate","result","priority","document","review"]},
    {t:"explanation",d:1,q:`Explain to someone new to ${f.industry?f.industry.trim():"your field"} why ${first} matters and what good work looks like.`,
      sig:["because","example","standard","quality","customer","result","mistake","why","impact","good"]},
  ];
  return { id:"custom-"+slug(title).slice(0,40)+"-"+Date.now().toString(36), title, group:"custom", custom:true,
    comps, ai, set:transferable?"transferable":"general_ai", transferable, customComps, customItems,
    profile:{ industry:f.industry||"", years:f.years||"", responsibilities:f.responsibilities||"", skills:f.skills||"",
      education:f.education||"", credentials:f.credentials||"" }, createdAt:Date.now() };
}

/* ---------- Question architecture ---------------------------------------- */
/* Every question carries: profession, competency, difficulty, questionType, scenario,
   questionText, expectedStrongSignals, commonWeakSignals, followUpRules, scoringRubric. */
const RUBRIC_WEIGHTS={ relevance:.40, depth:.25, structure:.20, specificity:.15 };
const FOLLOWUP_RULES={ onShort:"clarify", onWeakSignal:"evidence", onMissingConcept:"probe", onStrong:"deepen" };
function hintFor(type, comp, sig){
  const s=sig.filter(x=>/^[a-z][a-z \-]+$/i.test(x)).slice(0,3).join(", ");
  return ({
    intro:"relevant experience, concrete projects and how your expertise maps to this work",
    knowledge:`a clear method for ${comp.label.toLowerCase()}, covering points such as ${s}, with a concrete example`,
    scenario:`a prioritised, step-by-step response that covers ${s} and explains the reasoning`,
    behavioral:`a specific situation, your actions, a measurable result and what you learned (STAR), showing ${comp.label.toLowerCase()}`,
    ai_eval:`a clear rating with justification, checking ${s} rather than trusting fluent wording`,
    error_detection:`every issue identified (for example ${s}), with its severity and a corrected version`,
    explanation:`plain language, an accurate example and a check for understanding (${s})`,
    practical:`a complete, usable output covering ${s}, plus how you would check it`,
  })[type] || "a structured, specific answer with a concrete example";
}
function mkQ(p, o){
  const comp=o.comp, sig=o.sig||comp.sig;
  return { id:o.id, profession:p.title, competency:comp.id, compLabel:comp.label, difficulty:o.d, questionType:o.type,
    scenario:o.scenario?fillTokens(o.scenario,p):"", code:!!o.code, questionText:fillTokens(o.text,p),
    expectedStrongSignals:sig, commonWeakSignals:comp.weak||WEAK_DEFAULT, followUpRules:FOLLOWUP_RULES,
    scoringRubric:{ weights:RUBRIC_WEIGHTS, hint:o.hint||hintFor(o.type, comp, sig) } };
}
function legacyType(text){
  if(/\bAI\b|model'?s?\b|\brate\b|\brating\b|\brank/i.test(text)) return "ai_eval";
  if(/^(You|A |An |Two |Your )/.test(text)) return "scenario";
  return "knowledge";
}
function matchComp(sig, comps){
  let best=comps[0], bestN=-1;
  comps.forEach(c=>{ const n=sig.filter(s=>c.sig.some(k=>k.includes(s)||s.includes(k))).length; if(n>bestN){ bestN=n; best=c; } });
  return best;
}
function legacyFor(p){
  const out=[];
  Object.entries(LEGACY_MAP).forEach(([dom,targets])=>{
    const hit=targets.some(t=> t[0]==="@" ? (t.slice(1)===p.group || (p.custom && t==="@general_ai")) : t===p.id);
    if(hit && DOMAINS[dom]) DOMAINS[dom].q.forEach((q,i)=>out.push({ ...q, lid:dom+"-"+i }));
  });
  return out;
}
const AI_GENERAL=["instruction_following","error_detection","factuality","rubric_consistency","preference_judgment","prompt_evaluation"];
function compIdsFor(p, type){
  if(type==="ai_readiness") return AI_GENERAL.concat(p.ai?[p.ai]:[]);
  if(type==="bilingual") return ["translation","register","localization","grammar","bilingual_eval","communication"];
  if(type==="transferable") return isTransferable(p) ? p.comps : ["attention_detail","process_adherence","quality_review","instructions","reliability","communication"];
  const ids=[...p.comps];
  if(["ai_domain","full_mock"].includes(type)){ if(p.ai) ids.push(p.ai); else if(!ids.some(id=>(getComp(p,id)||{}).ai)) ids.push("preference_judgment"); }
  return ids;
}
function introQuestion(p, type){
  const text = type==="transferable" ? "To begin, tell me about your work as {a_role}: what you do day to day, and what you take pride in."
    : type==="bilingual" ? "To begin, tell me about your background with English and {lang}, and where you have used both professionally."
    : (type==="ai_domain"||type==="ai_readiness") ? "To begin, tell me about your background as {a_role} and what makes you well suited to evaluating AI-generated work in your field."
    : "To begin, tell me about your background as {a_role} and the experience you would draw on for this kind of work.";
  const sig = type==="transferable" ? ["day","task","responsible","team","customer","standard","proud","years","example","safety"] : COMPS.experience.sig;
  return mkQ(p,{ id:"intro", type:"intro", comp:COMPS.experience, d:1, text, sig });
}
function buildPool(p, type){
  const pool=[], comps=compIdsFor(p,type).map(id=>getComp(p,id)).filter(Boolean);
  comps.forEach(c=>{
    const fieldAI = c.ai && /^(ai_|cc_ai)/.test(c.id);
    if(c.know) pool.push(mkQ(p,{ id:c.id+"-k", type: fieldAI?"ai_eval":"knowledge", comp:c, d: fieldAI?2:1, text:c.know }));
    if(c.scen) pool.push(mkQ(p,{ id:c.id+"-s", type: c.ai?"ai_eval":"scenario", comp:c, d: fieldAI?3:2, text:c.scen }));
    if(c.beh) pool.push(mkQ(p,{ id:c.id+"-b", type:"behavioral", comp:c, d:1,
      text:`Tell me about a time when ${c.beh}. What was the situation, what did you do, and what was the result?`,
      sig:["situation","action","result","learned","specific","outcome"].concat(c.sig.slice(0,4)) }));
  });
  if(["ai_domain","full_mock"].includes(type)) ["preference_judgment","factuality","error_detection"].forEach(id=>{
    if(!comps.some(c=>c.id===id)){ const c=COMPS[id]; pool.push(mkQ(p,{ id:id+"-s", type:"ai_eval", comp:c, d:2, text:c.scen })); }
  });
  const sets = type==="ai_readiness" ? uniq(["general_ai", p.set]) : type==="bilingual" ? ["language"] : type==="transferable" ? ["transferable"] : [p.set];
  const items=[].concat(...sets.map(k=>(ITEM_SETS[k]||[]).map((it,i)=>({...it, iid:k+"-"+i}))), (sets.includes("transferable")?[]:(p.customItems||[]).map((it,i)=>({...it, iid:"c-"+i}))));
  const itemComps = comps.concat(type==="ai_readiness"?[]:[COMPS.error_detection]);
  items.forEach(it=>{
    const c = it.t==="error_detection" && type==="ai_readiness" ? COMPS.error_detection : matchComp(it.sig, itemComps);
    pool.push(mkQ(p,{ id:"item-"+it.iid, type:it.t, comp:c, d:it.d, text:it.q, scenario:it.scenario, sig:it.sig, code:it.code }));
  });
  if(["domain","ai_domain","technical","full_mock"].includes(type)){
    legacyFor(p).forEach(q=>{ const c=matchComp(q.concepts, comps); pool.push(mkQ(p,{ id:"v1-"+q.lid, type:legacyType(q.q), comp:c, d:2, text:q.q, sig:q.concepts, hint:q.hint })); });
  }
  if(type==="ai_readiness"){
    const gc=AI_GENERAL.map(id=>COMPS[id]);
    CORE.slice(1).forEach((q,i)=>{ const c=matchComp(q.concepts, gc); pool.push(mkQ(p,{ id:"v1-core-"+i, type:legacyType(q.q)==="ai_eval"?"ai_eval":"knowledge", comp:c, d:2, text:q.q, sig:q.concepts, hint:q.hint })); });
  }
  const seen=new Set(); return pool.filter(q=>!seen.has(q.id) && seen.add(q.id));
}

/* ---------- Session model ------------------------------------------------- */
/* status: not_started → in_progress → completed | abandoned */
function newSessionId(){ return "s-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7); }
function initialTarget(cfg){ return cfg.difficulty==="adaptive" ? LEVELS[cfg.level].target : DIFFS[cfg.difficulty].target; }
function createSession(cfg){
  const p=getProfession(cfg.professionId); if(!p) throw new Error("Unknown profession");
  const L=LENGTHS[cfg.length];
  const s={ sessionId:newSessionId(), version:2,
    profession:{ id:p.id, title:p.title, group:p.group, custom:!!p.custom },
    interviewType:cfg.type, mode:cfg.mode, experienceLevel:cfg.level, difficulty:cfg.difficulty, length:cfg.length,
    questionTarget:L.n, questionRange:[L.min, L.max], currentQuestion:0,
    answers:[], followUps:[], asked:[introQuestion(p, cfg.type)],
    startedAt:Date.now(), completedAt:null, status:"not_started", scores:null, feedback:null,
    candidate:{ name:(cfg.name||"").trim(), platform:cfg.platform||"" },
    adaptive:{ target:initialTarget(cfg), revisit:[], fuUsed:0, fuBudget:L.fu },
    phase:"main", pending:null, lastSpoken:null };
  return s;
}
function startSession(s){
  Repo.sessions.inProgress().forEach(o=>{ if(o.sessionId!==s.sessionId){ o.status="abandoned"; if(o.answers.length) finalizeReport(o); Repo.sessions.save(o); } });
  s.status="in_progress"; Repo.sessions.save(s); return s;
}
function currentQ(s){ return s.asked[s.currentQuestion]; }
function scoreCtx(s){
  const mult = s.difficulty==="adaptive" ? ({1:1.08,2:1,3:.94})[s.adaptive.target] : DIFFS[s.difficulty].mult;
  return { level:s.experienceLevel, mult };
}

function pickNext(s){
  const p=getProfession(s.profession.id); if(!p) return null;
  const pool=buildPool(p, s.interviewType), used=new Set(s.asked.map(q=>q.baseId||q.id));
  const plan=TYPES[s.interviewType].plan, slot=plan[(s.asked.length-1) % plan.length];
  let cands=pool.filter(q=>!used.has(q.id) && q.questionType===slot);
  if(!cands.length) cands=pool.filter(q=>!used.has(q.id) && plan.includes(q.questionType));
  if(!cands.length) cands=pool.filter(q=>!used.has(q.id));
  if(!cands.length) return null;
  const compCount={}; s.asked.forEach(q=>compCount[q.competency]=(compCount[q.competency]||0)+1);
  const t=s.adaptive.target, revisit=s.adaptive.revisit||[];
  const order=compIdsFor(p, s.interviewType), rank=id=>{ const i=order.indexOf(id); return i<0?order.length:i; };
  const cost=q=>(compCount[q.competency]||0)*3 + Math.abs(q.difficulty-t)*2 - (revisit.includes(q.competency)?4:0) + rank(q.competency)*0.15 + Math.random()*0.8;
  cands.sort((a,b)=>cost(a)-cost(b));
  const q=JSON.parse(JSON.stringify(cands[0])); q.baseId=q.id;
  s.adaptive.revisit=revisit.filter(c=>c!==q.competency);
  const lv=LEVELS[s.experienceLevel];
  if(["knowledge","scenario"].includes(q.questionType)){
    if(t===3 && q.difficulty<3){ q.questionText+=COMPLICATIONS[s.asked.length % COMPLICATIONS.length]; q.difficulty=3; }
    else if(lv.suffix) q.questionText+=lv.suffix;
  }
  return q;
}

function decideFollowUp(s, q, r, text){
  if(s.adaptive.fuUsed>=s.adaptive.fuBudget) return null;
  const prev=s.answers[s.answers.length-1]; if(prev && prev.followUp) return null;
  const lv=LEVELS[s.experienceLevel];
  if(r.wc < Math.max(18, lv.words*0.35)) return { type:"clarify", lead:ALEX.explore, question:FOLLOWUP.clarify };
  if(q.questionType==="intro") return null;
  if(r.weakHits.length) return { type:"evidence", lead:ALEX.ack[0], question:FOLLOWUP.evidence };
  if(r.dims.Relevance<45){
    const h=r.hit.find(x=>readableHit(x,text));
    return { type:"probe", lead:h?ALEX.stayWith(h):ALEX.explore, question:FOLLOWUP.probe[q.questionType]||FOLLOWUP.clarify };
  }
  const deep=(s.difficulty==="adaptive"||s.difficulty==="hard") && r.score>=78 && ["experienced","senior","expert"].includes(s.experienceLevel);
  if(deep) return { type:"deepen", lead:ALEX.ack[1], question:FOLLOWUP.deepen[s.answers.length % FOLLOWUP.deepen.length] };
  return null;
}

function transitionFor(s, prevAnswer, next){
  const ack=ALEX.ack[s.answers.length % ALEX.ack.length];
  if(prevAnswer && next && next.questionType!=="intro"){
    const overlap=(prevAnswer.hit||[]).find(h=>next.expectedStrongSignals.includes(h) && readableHit(h, prevAnswer.answer));
    if(overlap) return ALEX.stayWith(overlap);
  }
  return ack+" "+(ALEX.transition[next.questionType]||ALEX.transition.knowledge);
}

/* Submit an answer. Returns {kind:"followup", followUp} | {kind:"next", transition} | {kind:"done"}. */
function submitAnswer(s, text, seconds){
  const q=currentQ(s), ctx=scoreCtx(s);
  if(s.phase==="main"){
    const r=scoreAnswer(text, q, ctx);
    s.pending={ answer:text, seconds, r };
    const fu=decideFollowUp(s, q, r, text);
    if(fu){
      s.phase="followup"; s.adaptive.fuUsed++;
      s.pending.followUp={ type:fu.type, lead:fu.lead, question:fu.question, answer:"" };
      s.followUps.push({ questionId:q.id, index:s.currentQuestion, type:fu.type, question:fu.question, askedAt:Date.now() });
      Repo.sessions.save(s);
      return { kind:"followup", followUp:fu };
    }
  } else {
    const base=s.pending.r, combined=scoreAnswer(s.pending.answer+" "+text, q, ctx);
    s.pending.followUp.answer=text; s.pending.seconds+=seconds;
    s.pending.r = combined.score>=base.score ? combined : base;
    const f=s.followUps[s.followUps.length-1]; if(f) f.answered=true;
  }
  const rec=recordPending(s);
  adapt(s, rec);
  if(shouldFinish(s)){ completeSession(s, "completed"); return { kind:"done" }; }
  const next=pickNext(s);
  if(!next){ completeSession(s, "completed"); return { kind:"done" }; }
  s.asked.push(next); s.currentQuestion++;
  const transition=transitionFor(s, rec, next);
  s.lastTransition=transition;
  Repo.sessions.save(s);
  return { kind:"next", transition };
}

function recordPending(s){
  const q=currentQ(s), r=s.pending.r;
  const rec={ q:q.questionText, questionId:q.id, questionType:q.questionType, competency:q.competency, compLabel:q.compLabel,
    scenario:q.scenario, code:q.code, difficulty:q.difficulty, hint:q.scoringRubric.hint,
    answer:s.pending.answer, seconds:s.pending.seconds, score:r.score, wc:r.wc, dims:r.dims, hit:r.hit, missed:r.missed,
    followUp:s.pending.followUp||null, feedback:feedbackFor(r, q, s.experienceLevel) };
  s.answers.push(rec); s.phase="main"; s.pending=null;
  return rec;
}
function adapt(s, rec){
  const A=s.adaptive;
  if(s.difficulty==="adaptive" && rec.questionType!=="intro"){
    const last=s.answers.filter(a=>a.questionType!=="intro").slice(-2).map(a=>a.score);
    if(last.length===2 && last.every(v=>v>=78)) A.target=Math.min(3, A.target+1);
    else if(last.length===2 && last.every(v=>v<50)) A.target=Math.max(1, A.target-1);
    else if(rec.score>=88 && ["senior","expert"].includes(s.experienceLevel)) A.target=Math.min(3, A.target+1);
  }
  if(rec.score<50 && rec.questionType!=="intro" && !A.revisit.includes(rec.competency)) A.revisit=A.revisit.concat(rec.competency).slice(-2);
}
function shouldFinish(s){
  const n=s.answers.length, [min,max]=s.questionRange;
  if(s.length!=="deep") return n>=s.questionTarget;
  if(n>=max) return true;
  if(n<min) return false;
  const last=s.answers.slice(-4).map(a=>a.score);
  return last.every(v=>v>=78) || last.every(v=>v<50);
}
function completeSession(s, status){
  s.status=status; s.completedAt=Date.now(); s.phase="main";
  if(s.pending){ s.pending=null; }
  if(s.answers.length) finalizeReport(s);
  Repo.sessions.save(s); return s;
}
function endSessionEarly(s){
  if(s.pending && s.pending.r) recordPending(s);  // keep a main answer whose follow-up was never answered
  const status = s.answers.length>=s.questionRange[0] ? "completed" : "abandoned";
  return completeSession(s, status);
}

/* ---------- Reports ------------------------------------------------------- */
function avg(xs){ return xs.length ? Math.round(xs.reduce((a,b)=>a+b,0)/xs.length) : 0; }
function finalizeReport(s){
  const A=s.answers;
  const dims={}; ["Relevance","Depth","Structure","Specificity"].forEach(n=>dims[n]=avg(A.map(a=>a.dims[n])));
  const comps={}; A.forEach(a=>{ if(a.compLabel && a.questionType!=="intro"){ (comps[a.compLabel]=comps[a.compLabel]||[]).push(a.score); } });
  const competencies=Object.fromEntries(Object.entries(comps).map(([k,v])=>[k,avg(v)]));
  const overall=avg(A.map(a=>a.score));
  const sorted=Object.entries(competencies).sort((a,b)=>b[1]-a[1]);
  const nm=s.candidate&&s.candidate.name;
  const verdict = overall>=78 ? `${nm?nm+", you":"You"} performed at the level strong candidates show. Keep it consistent across sessions.`
    : overall>=55 ? `${nm?nm+", you":"You"} are close. Strengthen the focus areas below and you'll clear most screening interviews.`
    : `This is a starting point${nm?", "+nm:""}. Work through the focus areas below, then run the interview again.`;
  s.scores={ overall, dims, competencies };
  s.feedback={ verdict, strengths:sorted.filter(([,v])=>v>=70).slice(0,3).map(([k])=>k), focus:sorted.slice().reverse().filter(([,v])=>v<70).slice(0,3).map(([k])=>k) };
  return s;
}
function reportOf(s){ if(!s.scores || s.scores.dims==null){ if(s.answers&&s.answers.length) finalizeReport(s); } return s; }
function sessionTypeLabel(s){ return s.interviewType==="legacy" ? "Interview (v1)" : (TYPES[s.interviewType]||{}).label || "Interview"; }

/* ---------- Practice Lab scoring ----------------------------------------- */
function scorePractice(task, input){
  const r=scoreAnswer(input.text||"", { expectedStrongSignals:task.sig, commonWeakSignals:WEAK_DEFAULT }, { words:45, mult:1 });
  let correct=null, choicePts=0;
  if(task.kind==="pair"){ correct = input.choice===task.answer; choicePts = correct?40:0; }
  if(task.kind==="rate"){ const v=+input.rating, [lo,hi]=task.range; correct = v>=lo && v<=hi; choicePts = correct?40 : (Math.abs(v-(v<lo?lo:hi))===1?20:0); }
  const hasChoice = task.kind==="pair" || task.kind==="rate";
  const score = hasChoice ? Math.round(choicePts + r.score*0.6) : r.score;
  const tips=[];
  if(r.wc<25) tips.push("Justify your judgment in more detail: name the specific issue and why it matters.");
  if(r.dims.Relevance<60) tips.push("A strong review would mention: "+task.sig.slice(0,5).join(", ")+".");
  if(r.dims.Structure<50) tips.push("Structure your reasoning: state the issue, its severity, then the fix.");
  if(!tips.length) tips.push("Clear, well-reasoned review. Keep naming the exact issue and its impact.");
  return { score, correct, r, tips };
}
