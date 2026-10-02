/* =============================================================================
   Question Bank + Competency Registry.

   - COMPETENCY_REGISTRY: one stable list of competency ids (practice + interview), each
     { id, name, description, category: practice|interview|shared, active }.
   - QuestionBank: every practice question as a full record:
       id, category, subcategory, profession, domain, competencies[], difficulty, questionType,
       prompt, scenario, referenceMaterial, responseA, responseB, answerOptions, expectedOutcome,
       expectedSignals, commonErrors, rubric, explanation, version, status, source,
       createdAt, updatedAt, timesUsed
     status ∈ draft | review | published | archived | legacy. Only "published" can be served.
   - Selection is STRICT: category + difficulty + published. Unseen first, then least recently
     seen, then random. Exactly 10 unique questions, or null (session must not start).
   - Admin edits (Prompt 3) can be layered through Repo.bankOverrides without touching content
     files; completed sessions keep their own snapshot of each question version.
   ========================================================================== */
"use strict";

const QUESTION_STATUSES = ["draft","review","published","archived","legacy"];

/* ---------- Competency registry ------------------------------------------- */
const COMPETENCY_REGISTRY = (()=>{
  const reg={};
  Object.entries(PRACTICE_COMPETENCIES).forEach(([id,[name,description]])=>{ reg[id]={ id, name, description, category:"practice", active:true }; });
  Object.values(COMPS).forEach(c=>{
    if(reg[c.id]){ reg[c.id].category="shared"; return; }
    reg[c.id]={ id:c.id, name:c.label, description: c.know ? "Assessed with questions such as: "+c.know.replace(/\{[a-z_]+\}/g,"…") : c.label, category:"interview", active:true };
  });
  const extra={ professional_reasoning:["Professional Reasoning","Reasoning through realistic scenarios and practical tasks."],
    domain_knowledge:["Domain Knowledge","Applying professional knowledge accurately."], ai_response_evaluation:["AI Response Evaluation","Evaluating AI outputs overall."] };
  Object.entries(extra).forEach(([id,[name,description]])=>{ if(reg[id]) reg[id].category="shared"; else reg[id]={ id, name, description, category:"interview", active:true }; });
  return reg;
})();
function competencyName(id){ return (COMPETENCY_REGISTRY[id]||{}).name || id; }
/* Interview stage → competency id used for stage-level evidence. */
const STAGE_COMPETENCY = { background:"experience", domain:"domain_knowledge", reasoning:"professional_reasoning", ai:"ai_response_evaluation", communication:"communication" };

/* ---------- Question bank ------------------------------------------------- */
const QuestionBank = (()=>{
  let cache=null, byId=null;
  const hash=s=>{ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; };

  /* Which grading components a question can produce (used to derive its competencies). */
  function components(raw){
    const c=new Set(["objective"]);
    if(!["transcribe","rewrite"].includes(raw.fmt)) c.add("reasoning");
    if(raw.fmt==="rank"){ c.add("pref"); const dk=Object.keys((raw.answer||{}).dims||{}); if(dk.length) c.add("dims"); dk.forEach(k=>c.add("dim:"+k)); }
    if(raw.fmt==="eval"){ c.add("precision"); c.add("recall"); (raw.answer||[]).forEach(k=>{ if(k!=="none") c.add("err:"+k); }); }
    if(raw.fmt==="multi"){ c.add("precision"); c.add("recall"); (raw.options||[]).forEach(o=>{ if(Array.isArray(o) && o[1] && o[1]!=="none") c.add("kind:"+o[1]); }); }
    if(raw.fmt==="fact"||raw.fmt==="single") c.add("near");
    if(raw.fmt==="transcribe"){ c.add("accuracy"); c.add("exact"); }
    if(raw.fmt==="rewrite"){ c.add("checks"); c.add("content"); (raw.checks||[]).forEach(k=>{ if(k.kind) c.add("kind:"+k.kind); }); }
    (raw.flags||[]).forEach(f=>c.add(f));
    if(raw.focus) c.add("focus:"+raw.focus);
    return c;
  }
  function normalize(raw){
    const cat=PRACTICE_CATEGORY[raw.category];
    if(!cat) throw new Error("Unknown practice category for "+raw.id+": "+raw.category);
    const comp=components(raw);
    const options=(raw.options||[]).map(o=>Array.isArray(o)?o[0]:o), optionKinds=(raw.options||[]).map(o=>Array.isArray(o)?o[1]:null);
    const m=raw.material||{};
    const q=Object.assign({}, raw, {
      category:raw.category, cats:[raw.category], subcategory:raw.subcategory||null, profession:raw.profession||null, domain:raw.domain||null,
      difficulty:raw.d, questionType:raw.fmt, options, optionKinds,
      comp:(competencyName((cat.competencies.find(c=>c.from.some(f=>comp.has(f)))||{}).id)),
      competencies:cat.competencies.filter(c=>c.from.some(f=>comp.has(f))).map(c=>c.id),
      prompt:raw.prompt||null, scenario:m.user||m.query||m.text||m.claim||null,
      referenceMaterial: m.reference || m.artifact || m.code || (m.direction ? m.source : null) || (m.svg ? "[generated image]" : null) || (m.audio ? "[spoken audio]" : null),
      responseA:m.a||null, responseB:m.b||null, answerOptions: raw.fmt==="eval"?ERROR_TYPES.map(e=>e[1]) : raw.fmt==="fact"?FACT_LABELS : raw.fmt==="rank"?RANK_SCALE.map(r=>r[1]) : options,
      expectedSignals:raw.sig||[], commonErrors:raw.errors||cat.commonErrors||[], explanation:raw.model||"",
      version:raw.version||"1.0", status:raw.status||"published", source:raw.source||(raw.generated?"generator":"authored"),
      createdAt:raw.createdAt||BANK_DATE, updatedAt:raw.updatedAt||BANK_DATE,
    });
    q.expectedOutcome = expectedText(q);
    q.rubric = rubricText(q);
    return q;
  }
  function legacyRecords(){
    return (typeof PRACTICE_TASKS!=="undefined"?PRACTICE_TASKS:[]).map(t=>{
      const rev=LEGACY_TASK_REVIEW[t.id]||{ status:"archived", note:"Not reviewed" };
      return { id:"legacy-"+t.id, category:null, legacyTaskId:t.id, title:t.title, skill:t.skill, questionType:"legacy-"+t.kind,
        status: rev.status==="converted" ? "legacy" : "archived", convertedTo:rev.to||null, reviewNote:rev.note, version:"0.1", createdAt:"2026-10-01", updatedAt:BANK_DATE, timesUsed:0 };
    });
  }
  function build(){
    const items=PB.map(normalize);
    PB_GENERATORS.forEach(g=>DIFF_KEYS.forEach(d=>{
      for(let i=0;i<g.perDifficulty;i++){
        const seed=hash(g.prefix+"|"+d+"|"+i);
        const raw=Object.assign(g.fn(seed, d), { id:`${g.prefix}-${d}-${i+1}`, d, category:g.category, generated:true, seed, version:"1.0" });
        items.push(normalize(raw));
      }
    }));
    const overrides=(typeof Repo!=="undefined" && Repo.bankOverrides) ? Repo.bankOverrides.all() : {};
    items.forEach(q=>{ const o=overrides[q.id]; if(o) Object.assign(q, o); });
    /* Admin-created questions (Prompt 3): an override whose id is new and that carries a full raw record. */
    const known=new Set(items.map(q=>q.id));
    Object.entries(overrides).forEach(([id,o])=>{ if(!known.has(id) && o.category && o.fmt && o.d){ try{ items.push(normalize(Object.assign({ source:"admin" }, o, { id }))); }catch(e){ console.warn("Skipped admin question", id, e.message); } } });
    const seen=new Set(); items.forEach(q=>{ if(seen.has(q.id)) console.warn("Duplicate question id", q.id); seen.add(q.id); });
    cache=items; byId=Object.fromEntries(items.map(q=>[q.id,q]));
    cache.legacy=legacyRecords();
    return cache;
  }
  const all=()=>cache||build();
  function stats(){ return (typeof Repo!=="undefined" && Repo.questionStats) ? Repo.questionStats.all() : {}; }
  function withUsage(q){ const s=stats()[q.id]; return Object.assign(q, { timesUsed:s?s.timesUsed:0, lastUsedAt:s?s.lastUsedAt:null }); }
  function pool(category, difficulty, status){ return all().filter(q=>q.category===category && q.difficulty===difficulty && q.status===(status||"published")); }
  function counts(category){ const o={}; DIFF_KEYS.forEach(d=>o[d]=pool(category,d).length); return o; }
  function availability(category){
    const c=counts(category), ok=DIFF_KEYS.every(d=>c[d]>=PRACTICE_MIN_PER_DIFFICULTY);
    return { category, counts:c, available:ok, status: ok ? "available" : "coming_soon" };
  }
  /* Strict selection: exactly n unique published questions of this category and difficulty. */
  function select(category, difficulty, n){
    n=n||PRACTICE_QUESTIONS;
    const p=pool(category, difficulty); if(p.length<n) return null;
    const st=stats();
    const key=q=>{ const s=st[q.id]; return [s&&s.timesUsed>0?1:0, s?s.lastUsedAt||0:0, Math.random()]; };
    const ranked=p.map(q=>({ q, k:key(q) })).sort((a,b)=>a.k[0]-b.k[0] || a.k[1]-b.k[1] || a.k[2]-b.k[2]).slice(0,n).map(x=>x.q);
    for(let i=ranked.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [ranked[i],ranked[j]]=[ranked[j],ranked[i]]; }
    return ranked.map(q=>JSON.parse(JSON.stringify(withUsage(q))));
  }
  function recordUse(ids){ if(typeof Repo!=="undefined" && Repo.questionStats) Repo.questionStats.recordUse(ids); }
  function audit(){ return PRACTICE_CATEGORIES.map(c=>{ const a=availability(c.id); return { id:c.id, label:c.label, easy:a.counts.easy, medium:a.counts.medium, hard:a.counts.hard, status:a.status }; }); }
  return { all, get:id=>{ all(); return byId[id]||null; }, pool, counts, availability, select, recordUse, audit, legacy:()=>all().legacy, reset:()=>{ cache=null; }, statuses:QUESTION_STATUSES };
})();
