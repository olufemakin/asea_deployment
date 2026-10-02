/* =============================================================================
   Interview Question Bank — one record shape for every interview question:
     id, profession, professions[], competency, difficulty, questionType, scenario,
     question, referenceMaterial, expectedSignals, commonErrors, rubric, followUpRules,
     status (draft|review|published|archived), version, timesUsed, source, concept, variant.

   Built-in questions come from the competency library, role models, item sets and
   concept variants. Local Content Studio edits live in Repo.interviewBank (this
   device only): a patch for a built-in id, or a full record for an admin-created /
   generated question. Only PUBLISHED questions ever reach an interview.
   ========================================================================== */
"use strict";

const IQ_STATUSES = ["draft","review","published","archived"];
const IQ_TYPES = ["knowledge","scenario","behavioral","ai_eval","error_detection","practical","explanation"];
const iqKey = id=>"iq:"+id;

function rubric4(sig, type){
  const s=(sig||[]).slice(0,3).join(", ");
  return [`0 · No meaningful answer, or materially incorrect.`,
    `1 · Limited: mentions the topic but misses most of what matters (${s}).`,
    `2 · Partial: right direction, covers some of ${s}, but reasoning or specifics are thin.`,
    `3 · Strong: covers ${s} with explained reasoning and appropriate detail.`,
    `4 · Excellent: all of the above plus evidence${type==="behavioral"?" from the candidate's own experience":" or a concrete example"} and clear judgment about risk or verification.`].join("\n");
}
function followUpsFor(type){ return ["evidence","tradeoff","edge"].map(k=>`${FOLLOWUP.label[k]}: ${FOLLOWUP.text[k].replace("{cond}", (FOLLOWUP.edgeCond[type]||FOLLOWUP.edgeCond.scenario))}`); }

const InterviewBank = (()=>{
  let cat=null;
  function compProfs(){
    const m={};
    PROFESSIONS.forEach(p=>{ uniq(profComps(p).concat(p.ai?[p.ai]:[])).forEach(c=>(m[c]=m[c]||[]).push(p.id)); });
    return m;
  }
  function rec(o){
    return Object.assign({ status:"published", version:"1.0", source:"built-in", concept:null, variant:null, referenceMaterial:"", scenario:"",
      commonErrors:WEAK_DEFAULT.slice(0,5), followUpRules:followUpsFor(o.questionType), updatedAt:BANK_DATE }, o, { rubric:o.rubric||rubric4(o.expectedSignals, o.questionType) });
  }
  function build(){
    const out=[], cp=compProfs(), label=ids=>ids.length===1?(PROF[ids[0]]||{}).title||ids[0]:ids.length?`${ids.length} professions`:"Any profession";
    Object.values(COMPS).forEach(c=>{
      const ps=cp[c.id]||[];
      [["k","knowledge",c.know],["s",c.ai?"ai_eval":"scenario",c.scen],["b","behavioral",c.beh?`Tell me about a time when ${c.beh}. What was the situation, what did you do, and what was the result?`:null]].forEach(([suf,type,text])=>{
        if(!text) return;
        out.push(rec({ id:`${c.id}-${suf}`, profession:label(ps), professions:ps, competency:c.id, difficulty:suf==="b"?1:suf==="s"?2:1, questionType:type, question:text, expectedSignals:c.sig, commonErrors:(c.weak||WEAK_DEFAULT).slice(0,5) }));
      });
    });
    Object.entries(ROLE_MODELS).forEach(([key,m])=>(m.questions||[]).forEach((q,i)=>{
      const ps=m.appliesTo||PROFESSIONS.filter(p=>p.group===m.group).map(p=>p.id);
      out.push(rec({ id:`role-${key}-${i}`, profession:label(ps), professions:ps, competency:q.comp, difficulty:q.d, questionType:q.type, question:q.text, scenario:q.scenario||"",
        referenceMaterial:q.artifact?`[${q.artifact.kind||"exhibit"}] ${q.artifact.title||""}`:"", expectedSignals:q.sig||[], lang:q.lang||null }));
    }));
    Object.entries(ITEM_SETS).forEach(([k,items])=>items.forEach((it,i)=>{
      const ps=PROFESSIONS.filter(p=>p.set===k).map(p=>p.id);
      out.push(rec({ id:`item-${k}-${i}`, profession:k==="transferable"?"Transferable-skills roles":label(ps), professions:ps, competency:"(matched to the profession's closest competency)", difficulty:it.d, questionType:it.t,
        question:it.q, scenario:it.scenario||"", referenceMaterial:it.code?"[code]":"", expectedSignals:it.sig||[] }));
    }));
    CONCEPTS.forEach(c=>c.variants.forEach(v=>out.push(rec({ id:`concept-${c.id}-${v.id}`, profession:c.applies==="all"?"All professions":c.applies==="ai"?"Professions with an AI-evaluation stage":"Professions using: "+c.applies.slice(0,4).join(", "),
      professions:[], competency:c.comp[0]==="ai"?"(the profession's AI competency)":c.comp.join(" / "), difficulty:c.d, questionType:c.type, question:v.text, expectedSignals:v.sig, concept:c.label, variant:v.label }))));
    cat=out; return out;
  }
  const base=()=>cat||build();
  function all(){
    const ov=Repo.interviewBank.all(), st=Repo.questionStats.all();
    const items=base().map(r=>{ const o=ov[r.id]; const x=o?Object.assign({}, r, o, { edited:true }):Object.assign({}, r); x.timesUsed=(st[iqKey(r.id)]||{}).timesUsed||0; return x; });
    Object.entries(ov).forEach(([id,o])=>{ if(o.admin && !items.some(x=>x.id===id)) items.push(Object.assign({ id, timesUsed:(st[iqKey(id)]||{}).timesUsed||0 }, o)); });
    return items;
  }
  function get(id){ return all().find(r=>r.id===id)||null; }
  function save(r){
    const prev=get(r.id), isBuiltIn=base().some(b=>b.id===r.id);
    const v=prev&&prev.version?String(prev.version).split("."):["1","0"]; r.version=prev?`${v[0]}.${(+v[1]||0)+1}`:"1.0";
    r.updatedAt=new Date().toISOString();
    if(isBuiltIn){ const patch={}; ["status","question","scenario","expectedSignals","commonErrors","rubric","followUpRules","difficulty","referenceMaterial","version","updatedAt"].forEach(k=>{ if(r[k]!==undefined) patch[k]=r[k]; }); Repo.interviewBank.set(r.id, patch); }
    else Repo.interviewBank.set(r.id, Object.assign({}, r, { admin:true }));
    return get(r.id);
  }
  function setStatus(id, status){ const r=get(id); if(!r) return null; r.status=status; return save(r); }
  function duplicate(id){ const r=get(id); if(!r) return null; const c=Object.assign({}, r, { id:"adm-"+Date.now().toString(36)+Math.random().toString(36).slice(2,5), status:"draft", source:"admin (copy of "+id+")", admin:true, version:"1.0" }); delete c.edited; Repo.interviewBank.set(c.id, c); return c; }
  /* Pool integration: drop non-published built-ins, apply edited text, add concept variants and admin questions. */
  function finalizePool(p, type, pool, comps){
    const ov=Repo.interviewBank.all();
    let out=pool.filter(q=>{ const o=ov[q.id]; return !(o && o.status && o.status!=="published"); }).map(q=>{
      const o=ov[q.id]; if(!o) return q;
      return Object.assign(q, { questionText:o.question?fillTokens(o.question,p):q.questionText, scenario:o.scenario!=null?fillTokens(o.scenario,p):q.scenario,
        expectedStrongSignals:o.expectedSignals||q.expectedStrongSignals, difficulty:o.difficulty||q.difficulty, version:o.version });
    });
    const role=roleModelFor(p); if(type==="bilingual" && role && role.bilingual) return out;
    conceptQuestionsFor(p, type, comps).forEach(q=>{ const o=ov[q.id]; if(!(o && o.status && o.status!=="published")) out.push(o?Object.assign(q,{ questionText:o.question?fillTokens(o.question,p):q.questionText, expectedStrongSignals:o.expectedSignals||q.expectedStrongSignals }):q); });
    Object.entries(ov).forEach(([id,o])=>{
      if(!o.admin || o.status!=="published") return;
      const ps=o.professions||["*"];
      if(!(ps.includes("*") || ps.includes(p.id) || ps.includes("group:"+p.group))) return;
      const c=getComp(p,o.competency)||COMPS[o.competency]; if(!c || !IQ_TYPES.includes(o.questionType)) return;
      if(STAGE_OF[o.questionType]==="ai" && TYPES[type].weights.ai===0) return;
      out.push(mkQ(p,{ id, type:o.questionType, comp:c, d:+o.difficulty||2, text:o.question, scenario:o.scenario||"", sig:(o.expectedSignals&&o.expectedSignals.length)?o.expectedSignals:c.sig }));
    });
    return out;
  }
  return { all, get, save, setStatus, duplicate, finalizePool, reset:()=>{ cat=null; }, statuses:IQ_STATUSES };
})();

function conceptQuestionsFor(p, type, comps){
  const ids=(comps||[]).map(c=>c.id), out=[], aiOK=TYPES[type].weights.ai>0 && !isTransferable(p);
  CONCEPTS.forEach(c=>{
    if(p.concepts && !p.concepts.includes(c.id)) return;
    let comp=null;
    if(c.applies==="ai"){ if(!aiOK) return; comp=getComp(p,p.ai)||COMPS.error_detection; }
    else if(c.applies==="all"){ const id=c.comp.find(x=>ids.includes(x)); comp=id?getComp(p,id):COMPS[c.comp[c.comp.length-1]]; }
    else { const id=c.comp.find(x=>ids.includes(x)); if(!id) return; comp=getComp(p,id); }
    if(!comp) return;
    if(["behavioral"].includes(type) && c.type!=="scenario") return;
    c.variants.forEach(v=>out.push(mkQ(p,{ id:`concept-${c.id}-${v.id}`, type:c.type, comp, d:c.d, text:v.text, sig:v.sig, stage:c.stage, concept:c.id, variant:v.label })));
  });
  return out;
}

/* ---------- Draft question generator (template-based, deterministic) ------ */
const GEN_SITUATIONS = ["a deadline has just been moved forward by a week","a new colleague is shadowing you and will copy your approach","an external audit is scheduled for next week",
  "a client disputes the result you delivered","the system you normally rely on is unavailable for the day","two data sources you depend on disagree","a policy that affects the work changed this month",
  "a senior person asks you for a shortcut","the budget for the work was cut by 20%","an AI tool has produced a first draft for you","instructions have arrived from two different managers",
  "a complaint about the work has been escalated to you","you are handing the work over to someone else tomorrow","the work will be used to make a high-stakes decision"];
const GEN_COMPLICATION = { 1:"", 2:" There is a deadline in two days.", 3:" A senior stakeholder disagrees with you, and some of the information you need is missing." };
function generateDrafts(o){
  const p=getProfession(o.professionId); if(!p) throw new Error("Choose a profession.");
  const comp=getComp(p,o.competency)||COMPS[o.competency]; if(!comp) throw new Error("Choose a competency that exists in the competency library.");
  const type=o.type, d=Math.max(1,Math.min(3,+o.difficulty||2)), n=Math.max(1,Math.min(10,+o.count||3));
  if(!IQ_TYPES.includes(type)) throw new Error("Choose a question type.");
  const cl=comp.label.toLowerCase(), sigBase=(comp.sig||[]).slice(0,6);
  const extra={ knowledge:["method","why","check"], scenario:["prioritise","risk","verify"], behavioral:["situation","action","result"], ai_eval:["verify","source","accuracy","rating"],
    error_detection:["issue","severity","fix"], practical:["step","check","output"], explanation:["plain language","example","why"] }[type];
  const weak={ knowledge:["Lists definitions without a method"], scenario:["Jumps to a fix without assessing impact"], behavioral:["Hypothetical answer instead of a real example","No result or outcome"],
    ai_eval:["Trusts fluent wording","No verification against a source"], error_detection:["Finds only the most obvious issue","No severity or fix"], practical:["Steps without a check of the result"], explanation:["Uses jargon","No example"] }[type];
  const seed=[...(p.id+comp.id+type+d)].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7), existing=new Set(InterviewBank.all().map(r=>r.question));
  const drafts=[];
  for(let i=0;drafts.length<n && i<GEN_SITUATIONS.length*2;i++){
    const sit=GEN_SITUATIONS[(seed+i*5)%GEN_SITUATIONS.length], Sit=sit.charAt(0).toUpperCase()+sit.slice(1), comp3=GEN_COMPLICATION[d];
    const text={
      knowledge:`As {a_role}, how do you approach ${cl} when ${sit}? What do you check first, and why?${comp3}`,
      scenario:`${Sit}. Your work as {a_role} depends on ${cl}.${comp3} What do you do, in what order, and how will you know it worked?`,
      behavioral:`Tell me about a time when ${sit} and it affected ${cl}. What did you do, and what was the result?`,
      ai_eval:`An AI tool drafts guidance on ${cl} for {a_role} while ${sit}. It reads well but includes one outdated step.${comp3} How do you evaluate and rate it?`,
      error_detection:`A colleague's checklist for ${cl}, prepared when ${sit}, skips the verification step and lists two steps in the wrong order.${comp3} Identify the problems, how serious they are, and how you would fix them.`,
      practical:`Draft a short plan (3 to 5 steps) for ${cl}, given that ${sit}.${comp3} Explain how you would check the result.`,
      explanation:`Explain to a new colleague why ${cl} matters most when ${sit}. Use one example.`,
    }[type];
    if(existing.has(text)) continue;
    const sig=uniq(sigBase.concat(extra));
    drafts.push({ id:"gen-"+Date.now().toString(36)+"-"+i, admin:true, source:"generator", status:"draft", version:"1.0", professions:[p.id], profession:p.title,
      competency:comp.id, difficulty:d, questionType:type, scenario:"", question:text, referenceMaterial:"",
      expectedSignals:sig, commonErrors:uniq(weak.concat((comp.weak||WEAK_DEFAULT).slice(0,3))), rubric:rubric4(sig, type), followUpRules:followUpsFor(type), timesUsed:0, createdAt:new Date().toISOString() });
    existing.add(text);
  }
  if(!drafts.length) throw new Error("No new original drafts could be generated for this combination. Try another difficulty or question type.");
  return drafts;
}

/* ---------- Local role overrides + Alex settings (applied at boot) -------- */
const DERIVED_PROF_KEYS=["core_competencies","technical_competencies","professional_competencies","typical_interview_types","recommended_interview_type","profession_family","subcategory","interview_areas","recommended_practice","domain_keywords"];
/* Local Content Studio professions: patches to existing records, or new records built from a family template. */
function applyRoleOverrides(){
  Object.entries(Repo.roleOverrides.all()).forEach(([id,o])=>{
    let p=PROF[id];
    if(!p){
      if(!(o.admin && o.title)) return;
      const cat=o.category||"other", fam=o.family||CATEGORY_FAMILY[cat]||"generalist";
      p=ProfessionLib.make(o.title, cat, fam, { id, seeded:true }); PROFESSIONS.push(p); PROF[id]=p;
    }
    DERIVED_PROF_KEYS.forEach(k=>delete p[k]);
    if(o.family && o.family!==p.family && !o.comps){ const f=PROFESSION_FAMILIES[o.family]; if(f){ p.comps=f.comps.slice(); p.group=o.group||f.group; } }
    Object.assign(p, o);
    if(!o.supported_practical_tasks) delete p.supported_practical_tasks;
    ProfessionLib.normalize(p);
  });
}
const ALEX_DEFAULTS = { avatar:"A", introduction:"", tone:"neutral", voice:"", rate:1, completion:"" };
const ALEX_TONES = { neutral:["Thank you.","Thank you for that.","Understood.","Thank you. Noted."], warm:["Thank you, that's helpful.","Thanks for sharing that.","I appreciate that.","Thank you. Noted."], formal:["Thank you.","Noted, thank you.","Understood.","Thank you. I have noted that."] };
function alexConfig(){ return Object.assign({}, ALEX_DEFAULTS, Repo.alexSettings.get()); }
function applyAlexSettings(){
  const c=alexConfig();
  ALEX.avatar=(c.avatar||"A").slice(0,2); ALEX.ack=(ALEX_TONES[c.tone]||ALEX_TONES.neutral).slice(); ALEX.customIntro=c.introduction.trim(); ALEX.completion=c.completion.trim();
  Speech.settings.voiceURI=c.voice||"";
  if(!(Repo.prefs.get().voice) && c.rate) Speech.settings.rate=+c.rate||1;
}
