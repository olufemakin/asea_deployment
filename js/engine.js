/* =============================================================================
   Interview engine — voice, scoring, question architecture, adaptive flow,
   same-session memory, session model. No network calls; deterministic, in-browser.
   ========================================================================== */
"use strict";

/* ---------- Speech (Web Speech API) --------------------------------------- */
const Speech = (()=>{
  const synth = window.speechSynthesis || null;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let voices=[], gen=0;
  const settings = { muted:false, rate:1 };
  function loadVoices(){ if(synth){ try{ voices=synth.getVoices()||[]; }catch(e){ voices=[]; } } }
  if(synth){ loadVoices(); try{ synth.onvoiceschanged=loadVoices; }catch(e){} }
  function voiceFor(lang){
    const L=(lang||"en").slice(0,2).toLowerCase();
    if(L==="fr") return voices.find(v=>/^fr[-_]FR/i.test(v.lang)) || voices.find(v=>/^fr/i.test(v.lang)) || null;
    return voices.find(v=>/en[-_](US|GB)/i.test(v.lang)&&/google|natural|neural|daniel|samantha/i.test(v.name))
      || voices.find(v=>/en[-_]US/i.test(v.lang)) || voices.find(v=>/^en/i.test(v.lang)) || null;
  }
  function speakOne(text, lang){ return new Promise(res=>{
    if(!synth){ res(); return; }
    let u; try{ u=new SpeechSynthesisUtterance(text); }catch(e){ res(); return; }
    const v=voiceFor(lang); if(v) u.voice=v; u.lang = lang==="fr" ? "fr-FR" : "en-US";
    u.rate=settings.rate; u.pitch=1.0;
    let done=false; const fin=()=>{ if(!done){ done=true; clearTimeout(t); res(); } };
    // Some browsers never fire onend; never let the interview hang on it.
    const t=setTimeout(fin, Math.max(4000, text.length*95/settings.rate));
    u.onend=fin; u.onerror=fin; try{ synth.speak(u); }catch(e){ fin(); }
  }); }
  return {
    ttsAvailable:!!synth, sttAvailable:!!SR, SR, settings,
    /* Speak lines in order ([text] or [{text,lang}]). Resolves true if completed, false if interrupted. */
    async say(lines, lang){
      const g=++gen; if(!synth || settings.muted) return true;
      try{ synth.cancel(); }catch(e){}
      for(const l of [].concat(lines).filter(Boolean)){
        if(g!==gen) return false;
        const o = typeof l==="string" ? { text:l, lang } : l;
        await speakOne(o.text, o.lang||lang);
      }
      return g===gen;
    },
    stop(){ gen++; try{ synth&&synth.cancel(); }catch(e){} },
  };
})();

/* ---------- Text helpers -------------------------------------------------- */
function words(s){ return (String(s||"").trim().match(/[\p{L}0-9’'-]+/gu)||[]); }
function uniq(a){ return [...new Set(a)]; }
function fold(s){ return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’]/g,"'"); }
/* Hesitation sounds are removed before scoring so spoken answers are never penalised
   for how someone talks — only for what they say. */
const FILLERS=/\b(u+m+|u+h+m*|e+r+m+|e+h+m+|h+m+|mm+|euh+|bah)\b[,.]?/gi;
function stripFillers(s){ return String(s||"").replace(FILLERS," ").replace(/\s{2,}/g," ").trim(); }
function fillTokens(text, p){
  const role=p.title, lang=p.lang||"your second language";
  return String(text||"").replace(/\{a_role\}/g, aOrAn(role)+" "+role).replace(/\{role\}/g, role).replace(/\{lang\}/g, lang);
}
/* A signal matches as a phrase, or — for single long words — by stem, so that
   "mitigation" also credits "mitigating" and small transcription slips still count. */
function signalHit(sig, text, wordList){
  const s=fold(sig);
  if(/[^a-z0-9'-]/.test(s) || s.length<6) return text.includes(s);
  const stem=s.slice(0, Math.max(5, Math.ceil(s.length*0.75)));
  return wordList.some(w=>w.startsWith(stem));
}
/* Generic signal words that make a poor "You mentioned …" bridge. */
const GENERIC_HITS=new Set("example result check standard quality clear step first because specific evidence context process document review compare measure plan update test data source error priority team audience outcome action situation learned decision accurate simple".split(" "));
function readableHit(hit, text){ return hit.length>=5 && !GENERIC_HITS.has(hit) && /^[a-z][a-z \-]+$/.test(hit) && new RegExp("\\b"+hit.replace(/[-]/g,"\\-")+"\\b","i").test(text); }

/* ---------- Language detection (bilingual interviews) -------------------- */
const FR_WORDS=new Set("le la les des est et une un je que pour dans avec pas du au aux ce cette qui nous vous sur être sont mais très il elle on ne plus ou son sa ses leur mon ma mes avoir fait comme aussi donc alors parce si".split(" "));
const EN_WORDS=new Set("the and is are to of a in that for with it this be on not you i was have as but they we my our would should because which if then".split(" "));
function langOf(text){
  const w=words(fold(text)); if(w.length<4) return null;
  const fr=w.filter(x=>FR_WORDS.has(x)).length, en=w.filter(x=>EN_WORDS.has(x)).length;
  if(fr===0 && en===0) return null;
  return fr>en ? "fr" : "en";
}

/* ---------- Scoring ------------------------------------------------------- */
/* What is scored: the words of the answer only. Audio is never analysed, so accent,
   voice pitch, regional speech patterns, gender presentation and perceived ethnicity
   cannot affect any score. Communication = relevance, clarity, logical organisation,
   explanation and appropriate detail. */
const STRUCT=["because","therefore","first","second","third","then","however","for example","such as","in addition","as a result","so that","which means","on the other hand","finally","next",
  "parce que","donc","d'abord","ensuite","par exemple","cependant","enfin","ainsi","en revanche"];
const EXPLAIN=["because","so that","which means","this means","as a result","therefore","the reason","due to","parce que","donc","ce qui","car","afin de"];
function scoreAnswer(answer, q, ctx){
  ctx=ctx||{};
  const clean=stripFillers(answer), text=fold(clean), wl=words(text), wc=wl.length;
  const sig=q.expectedStrongSignals||q.concepts||[];
  const hits=sig.filter(c=>signalHit(c, text, wl));
  let coverage=sig.length? Math.min(1, hits.length/Math.min(6, sig.length)) : 0;
  const target=ctx.words || (LEVELS[ctx.level]||LEVELS.intermediate).words;
  const ratio=wc/target;
  const depth = ratio>=1.3?1 : ratio>=1?.86 : ratio>=.7?.7 : ratio>=.4?.5 : ratio>=.2?.3 : wc>=6?.12 : 0;
  const structure=Math.min(1, STRUCT.filter(s=>text.includes(fold(s))).length/3);
  const nums=(clean.match(/\b\d+([.,]\d+)?%?\b/g)||[]).length;
  const example=/for example|for instance|e\.g\.|such as|i once|in my|a time when|i worked|i built|at my last|in one case|par exemple|dans mon|j'ai travaille/i.test(fold(clean))?1:0;
  const specificity=Math.min(1, nums*0.22 + example*0.5 + Math.min(1,new Set(wl).size/55)*0.5);
  const weakHits=(q.commonWeakSignals||[]).filter(w=>text.includes(fold(w)));
  let langMismatch=false;
  if(q.lang==="fr"||q.lang==="en"){ const L=langOf(clean); if(L && L!==q.lang && wc>=8){ langMismatch=true; coverage*=0.5; } }
  let raw = coverage*0.40 + depth*0.25 + structure*0.20 + specificity*0.15 - Math.min(0.15, weakHits.length*0.05);
  raw = Math.max(0, Math.min(1, raw*(ctx.mult||1)));
  // Communication (text only)
  const sentences=clean.split(/[.!?]+\s|\n+/).map(x=>words(x).length).filter(n=>n>0);
  const avgLen=sentences.length? wc/sentences.length : wc;
  const clarity = wc<6 ? 0.2 : avgLen<=28 ? 1 : avgLen<=40 ? 0.75 : 0.5;
  const explanation=Math.min(1, EXPLAIN.filter(e=>text.includes(fold(e))).length/2);
  const detail = ratio>3.2 ? 0.75 : depth;
  const communication=Math.round(100*(coverage*0.2 + clarity*0.2 + structure*0.25 + explanation*0.15 + detail*0.2));
  return { score:Math.round(raw*100), wc, weakHits, langMismatch, communication,
    dims:{ Relevance:Math.round(coverage*100), Depth:Math.round(depth*100), Structure:Math.round(structure*100), Specificity:Math.round(specificity*100) },
    missed:sig.filter(c=>!hits.includes(c)), hit:hits };
}
function band(s){ return s>=78?["good","Strong"] : s>=55?["ok","Adequate"] : ["bad","Needs work"]; }
function feedbackFor(r, q, level){
  const lv=LEVELS[level]||LEVELS.intermediate, tips=[];
  if(r.langMismatch) tips.push(q.lang==="fr" ? "This question asked for an answer in French. Answer in the language Alex uses for the question." : "This question asked for an answer in English. Answer in the language Alex uses for the question.");
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
function isHealthcare(p){ const m=roleModelFor(p); return p.group==="healthcare" || !!(m&&m.healthcare); }
function isFrenchBilingual(p){ const m=roleModelFor(p); return !!(m && m.bilingual==="fr"); }
function getComp(p, id){ return (p.customComps||[]).find(c=>c.id===id) || COMPS[id]; }
/* A bilingual role model's competencies apply only to the Bilingual Interview itself. */
function profComps(p, type){ const m=roleModelFor(p); return (m && m.comps && (!m.bilingual || !type || type==="bilingual")) ? m.comps : p.comps; }
/* Working languages configured for a profession. Bilingual needs two; one language → Language Evaluation. */
function profLanguages(p){ return p.languages || (isLingual(p) ? [p.lang||"your working language"] : []); }
function isTwoLanguage(p){ return isLingual(p) && profLanguages(p).length>=2; }
function competencyModel(p){ return profComps(p).concat(p.ai?[p.ai]:[]).map(id=>getComp(p,id)).filter(Boolean); }

/* Interview types a profession may choose. The profession only RECOMMENDS a type (recommendedType);
   the user's selection is kept separately and never overwritten once they have chosen. */
function allowedTypes(p){
  if(isTransferable(p)) return ["transferable","ai_readiness","behavioral","full_mock"];
  if(isLingual(p)) return isTwoLanguage(p) ? ["bilingual","ai_domain","ai_readiness","full_mock"] : ["language","ai_domain","ai_readiness","full_mock"];
  if(p.group==="software") return ["technical","ai_domain","behavioral","full_mock"];
  if(isTechnical(p)) return ["technical","domain","ai_domain","behavioral","full_mock"];
  if(p.group==="general_ai") return ["ai_readiness","ai_domain","domain","behavioral","full_mock"];
  return ["domain","ai_domain","behavioral","full_mock"];
}
function typeAvailability(p){
  const allow=allowedTypes(p), out={};
  Object.keys(TYPES).forEach(t=>{
    let ok=allow.includes(t), why="";
    if(!ok) why = t==="technical" ? "For coding, data, science and engineering professions."
      : t==="bilingual" ? (isLingual(p) ? "Needs two configured working languages; this profession has one." : "For two-language evaluation professions.")
      : t==="language" ? (isLingual(p) ? "This profession uses the Bilingual Interview (two languages)." : "For single-language evaluation professions.")
      : isTransferable(p) && ["domain","ai_domain"].includes(t) ? "Not used for transferable-skills roles; your strengths are assessed in the Transferable Skills Interview."
      : "Not offered for this profession.";
    out[t]={ok, why};
  });
  return out;
}
function recommendedType(p){ return isTransferable(p) ? "transferable" : isLingual(p) ? (isTwoLanguage(p) ? "bilingual" : "language") : p.group==="software" ? "technical" : "ai_domain"; }

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
/* Every question carries: profession, competency, difficulty, questionType, stage, scenario,
   artifact, questionText, expectedStrongSignals, commonWeakSignals, followUpRules, scoringRubric. */
const RUBRIC_WEIGHTS={ relevance:.40, depth:.25, structure:.20, specificity:.15 };
const FOLLOWUP_RULES={ onShort:"clarify", onWeakSignal:"evidence", onMissingConcept:"depth", onWeakStructure:"depth",
  onStrong:["tradeoff","edge","challenge","ai"], afterAiStage:"challenge" };
const STAGE_OF={ intro:"background", behavioral:"background", callback:"reasoning", knowledge:"domain", scenario:"reasoning", practical:"reasoning",
  error_detection:"reasoning", ai_eval:"ai", explanation:"communication", final:"communication" };
const STAGE_LABEL={ background:"Background", domain:"Domain Expertise", reasoning:"Reasoning", ai:"AI Evaluation", communication:"Communication" };
const STAGE_TYPES={ background:["behavioral"], domain:["knowledge"], reasoning:["scenario","practical","error_detection"],
  ai:["ai_eval","error_detection"], communication:["explanation"] };
function hintFor(type, comp, sig){
  const s=sig.filter(x=>/^[\p{L} \-]+$/iu.test(x)).slice(0,3).join(", ");
  return ({
    intro:"relevant experience, concrete projects and how your expertise maps to this work",
    knowledge:`a clear method for ${comp.label.toLowerCase()}, covering points such as ${s}, with a concrete example`,
    scenario:`a prioritised, step-by-step response that covers ${s} and explains the reasoning`,
    behavioral:`a specific situation, your actions, a measurable result and what you learned (STAR), showing ${comp.label.toLowerCase()}`,
    callback:`a specific account of your own experience that addresses ${s} with evidence`,
    ai_eval:`a clear rating with justification, checking ${s} rather than trusting fluent wording`,
    error_detection:`every issue identified (for example ${s}), with its severity and a corrected version`,
    explanation:`plain language, an accurate example and a check for understanding (${s})`,
    practical:`a complete, usable output covering ${s}, plus how you would check it`,
    final:`a specific standard, a real example of protecting it, and the reasoning behind it`,
  })[type] || "a structured, specific answer with a concrete example";
}
function mkQ(p, o){
  const comp=o.comp, sig=o.sig||comp.sig;
  return { id:o.id, profession:p.title, competency:comp.id, compLabel:comp.label, difficulty:o.d, questionType:o.type,
    stage:o.stage||STAGE_OF[o.type]||"domain", lang:o.lang||null, curated:!!o.curated,
    scenario:o.scenario?fillTokens(o.scenario,p):"", code:!!o.code, artifact:o.artifact||null, fu:o.fu||null,
    questionText:fillTokens(o.text,p), expectedStrongSignals:sig, commonWeakSignals:comp.weak||WEAK_DEFAULT, followUpRules:FOLLOWUP_RULES,
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
  if(type==="bilingual"){ const m=roleModelFor(p); return m&&m.bilingual ? m.comps : ["translation","register","localization","grammar","bilingual_eval","communication"]; }
  if(type==="language") return ["grammar","register","translation","localization","ai_language","communication"];
  if(type==="transferable") return isTransferable(p) ? p.comps : ["attention_detail","process_adherence","quality_review","instructions","reliability","communication"];
  const ids=[...profComps(p, type)];
  if(["ai_domain","full_mock","technical"].includes(type)){ if(p.ai) ids.push(p.ai); else if(!ids.some(id=>(getComp(p,id)||{}).ai)) ids.push("preference_judgment"); }
  return uniq(ids);
}
function introQuestion(p, type, lang){
  const fr = lang==="fr";
  const text = fr ? "Pour commencer, présentez votre parcours en français et en anglais, et les contextes professionnels où vous utilisez chaque langue."
    : type==="transferable" ? "To begin, tell me about your work as {a_role}: what you do day to day, and what you take pride in."
    : type==="bilingual" ? "To begin, tell me about your background with English and {lang}, and where you have used both professionally."
    : type==="language" ? "To begin, tell me about your background with {lang}: how you use it professionally and what kinds of text you review or produce."
    : (type==="ai_domain"||type==="ai_readiness") ? "To begin, tell me about your background as {a_role} and what makes you well suited to evaluating AI-generated work in your field."
    : "To begin, tell me about your background as {a_role} and the experience you would draw on for this kind of work.";
  const sig = fr ? ["expérience","français","anglais","travail","projet","client","traduction","années","exemple","contexte"]
    : type==="transferable" ? ["day","task","responsible","team","customer","standard","proud","years","example","safety"] : COMPS.experience.sig;
  return mkQ(p,{ id:"intro", type:"intro", comp:COMPS.experience, d:1, text, sig, stage:"background", lang:fr?"fr":(type==="bilingual"&&isFrenchBilingual(p)?"en":null) });
}
function finalQuestion(p, type){
  const f = type==="bilingual" ? FINALS.bilingual : type==="language" ? FINALS.language : type==="transferable"||isTransferable(p) ? FINALS.transferable
    : ["ai_domain","ai_readiness","full_mock"].includes(type) ? FINALS.ai : FINALS.default;
  const m=roleModelFor(p);
  const use = (m && m.final && !["bilingual","language"].includes(type) && !m.bilingual) ? m.final : f;
  return mkQ(p,{ id:"final", type:"final", comp:COMPS.judgment, d:2, text:use.text, sig:use.sig, stage:"communication", lang:type==="bilingual"&&isFrenchBilingual(p)?"x":null });
}
function buildPool(p, type){
  const pool=[], comps=compIdsFor(p,type).map(id=>getComp(p,id)).filter(Boolean);
  const role=roleModelFor(p);
  const roleOK = role && !["transferable","language"].includes(type) && (type==="bilingual" ? !!role.bilingual : !role.bilingual);
  if(roleOK){
    role.questions.forEach((q,i)=>{
      if(q.stage==="ai" && TYPES[type].weights.ai===0) return;
      const c=getComp(p,q.comp)||COMPS[q.comp]; if(!c) return;
      pool.push(mkQ(p,{ id:"role-"+role.key+"-"+i, type:q.type, comp:c, d:q.d, text:q.text, sig:q.sig, stage:q.stage, lang:q.lang, artifact:q.artifact, fu:q.fu, curated:true }));
    });
    if(role.bilingual) return pool;
  }
  const hc=isHealthcare(p);
  comps.forEach(c=>{
    const fieldAI = c.ai && /^(ai_|cc_ai)/.test(c.id);
    if(c.know) pool.push(mkQ(p,{ id:c.id+"-k", type: fieldAI?"ai_eval":"knowledge", comp:c, d: fieldAI?2:1, text:c.know }));
    if(c.scen) pool.push(mkQ(p,{ id:c.id+"-s", type: c.ai?"ai_eval":"scenario", comp:c, d: fieldAI?3:2, text:(hc&&!c.ai?"Fictional scenario: ":"")+c.scen }));
    if(c.beh) pool.push(mkQ(p,{ id:c.id+"-b", type:"behavioral", comp:c, d:1,
      text:`Tell me about a time when ${c.beh}. What was the situation, what did you do, and what was the result?`+(hc?" Please keep it anonymous: no names or identifying patient details.":""),
      sig:["situation","action","result","learned","specific","outcome"].concat(c.sig.slice(0,4)) }));
  });
  if(["ai_domain","full_mock","ai_readiness"].includes(type)) ["preference_judgment","factuality","error_detection"].forEach(id=>{
    if(!comps.some(c=>c.id===id)){ const c=COMPS[id]; pool.push(mkQ(p,{ id:id+"-s", type:"ai_eval", comp:c, d:2, text:c.scen })); }
  });
  const sets = type==="ai_readiness" ? uniq(["general_ai", p.set]) : (type==="bilingual"||type==="language") ? ["language"] : type==="transferable" ? ["transferable"] : [p.set];
  const items=[].concat(...sets.map(k=>(ITEM_SETS[k]||[]).map((it,i)=>({...it, iid:k+"-"+i}))), (sets.includes("transferable")?[]:(p.customItems||[]).map((it,i)=>({...it, iid:"c-"+i}))));
  const itemComps = comps.concat(type==="ai_readiness"?[]:[COMPS.error_detection]);
  items.forEach(it=>{
    const c = it.t==="error_detection" && type==="ai_readiness" ? COMPS.error_detection : matchComp(it.sig, itemComps);
    const stage = it.t==="error_detection" && (type==="ai_readiness" || /\bAI\b/.test(it.scenario||"")) && TYPES[type].weights.ai>0 ? "ai" : undefined;
    pool.push(mkQ(p,{ id:"item-"+it.iid, type:it.t, comp:c, d:it.d, text:it.q, scenario:it.scenario, sig:it.sig, code:it.code, stage }));
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

/* ---------- Interview blueprint (stage flow + weighting) ------------------ */
/* Background → Domain → Reasoning/Scenario → AI Evaluation → Communication → Final. */
function sessionWeights(p, type){
  const m=roleModelFor(p);
  const w=Object.assign({}, TYPES[type].weights, (m&&m.weights&&(!m.bilingual||type==="bilingual"))?m.weights:{});
  if(isTransferable(p)) w.ai=0;
  return w;
}
function allocate(weights, keys, n){
  const tot=keys.reduce((a,k)=>a+(weights[k]||0),0)||1;
  const raw=keys.map(k=>({k, v:(weights[k]||0)/tot*n}));
  raw.forEach(r=>r.n=Math.floor(r.v));
  let left=n-raw.reduce((a,r)=>a+r.n,0);
  raw.slice().sort((a,b)=>(b.v-b.n)-(a.v-a.n)).forEach(r=>{ if(left>0 && r.v>0){ r.n++; left--; } });
  return Object.fromEntries(raw.map(r=>[r.k,r.n]));
}
function buildBlueprint(p, type, n, balance){
  if(type==="bilingual" && isFrenchBilingual(p)){
    const mix=(LANG_BALANCE[balance]||LANG_BALANCE.balanced).mix;
    const c=allocate(mix, ["en","fr","x"], n);
    const first = c.en>=c.fr ? "en" : "fr";
    c[first]=Math.max(0,c[first]-1);                 // intro counts toward the first language
    c.x=Math.max(0,c.x-1);                           // final is a cross-language question
    const half=k=>Math.ceil(c[k]/2), seq=[];
    const order = first==="en" ? ["en","fr","x"] : ["fr","en","x"];
    order.forEach(k=>{ for(let i=0;i<half(k);i++) seq.push("lang:"+k); });
    order.forEach(k=>{ for(let i=half(k);i<c[k];i++) seq.push("lang:"+k); });
    return ["intro:"+first].concat(seq.slice(0,n-2), ["final"]);
  }
  const w=sessionWeights(p, type);
  const c=allocate(w, ["background","domain","reasoning","ai","communication"], n);
  c.background=Math.max(1,c.background); c.communication=Math.max(1,c.communication);
  let extra=["background","domain","reasoning","ai","communication"].reduce((a,k)=>a+c[k],0)-n;
  ["domain","reasoning","background","ai"].forEach(k=>{ while(extra>0 && c[k]>(k==="background"?1:0)){ c[k]--; extra--; } });
  const bp=["intro"];
  for(let i=1;i<c.background;i++) bp.push("background");
  ["domain","reasoning","ai"].forEach(k=>{ for(let i=0;i<c[k];i++) bp.push(k); });
  for(let i=1;i<c.communication;i++) bp.push("communication");
  bp.push("final");
  return bp;
}

/* ---------- Same-session memory ------------------------------------------ */
function toSecondPerson(s){
  return s.replace(/\bI'm\b/gi,"you're").replace(/\bI've\b/gi,"you've").replace(/\bI'd\b/gi,"you'd").replace(/\bI'll\b/gi,"you'll")
    .replace(/\bI am\b/gi,"you are").replace(/\bI was\b/gi,"you were").replace(/\bwe were\b/gi,"your team was").replace(/\bwe're\b/gi,"your team is")
    .replace(/\bwe've\b/gi,"your team has").replace(/\bmyself\b/gi,"yourself").replace(/\bmine\b/gi,"yours").replace(/\bmy\b/gi,"your")
    .replace(/\bme\b/gi,"you").replace(/\bI\b/g,"you").replace(/\bour\b/gi,"your team's").replace(/\bwe\b/gi,"your team").replace(/\bus\b/g,"your team");
}
function factFrom(answer, re){
  const sents=stripFillers(answer).split(/(?<=[.!?])\s+|\n+/).map(x=>x.trim()).filter(x=>words(x).length>=4);
  let s = re ? sents.find(x=>re.test(x)) : sents.find(x=>/\b(I|we)\b/i.test(x) && /\b(managed|led|worked|built|handled|ran|delivered|supported|created|designed|taught|reviewed|cared|treated|translated|analy[sz]ed|developed|ran|coordinated)\b/i.test(x));
  if(!s) return null;
  if(words(s).length>24){ const cut=s.split(/,\s|;\s|\s—\s|\s-\s/)[0]; s = words(cut).length>=5 ? cut : words(s).slice(0,22).join(" "); }
  s=s.replace(/^(so|well|and|but|yes|ok(ay)?|honestly|basically)[,\s]+/i,"").replace(/[.!?;:,]+$/,"");
  if(/[\u00C0-\u017F]|\b(je|nous|j'ai|le|la|les)\b/i.test(s)) return { text:s, quote:true };
  s=toSecondPerson(s).replace(/\byou was\b/gi,"you were");
  return { text:s.charAt(0).toLowerCase()+s.slice(1), quote:false };
}
function memoryQuestion(s, p, stage){
  const cap=["full","deep"].includes(s.length)?2:1;
  if((s.memory||[]).length>=cap || stage!=="reasoning") return null;
  const prev=s.asked[s.asked.length-1]; if(prev && prev.questionType==="callback") return null;
  const usedKeys=new Set((s.memory||[]).map(m=>m.key));
  let role=roleModelFor(p); if(role && role.bilingual && s.interviewType!=="bilingual") role=null;   // bilingual model only drives the Bilingual Interview
  const triggers=(role&&role.memory)||[];
  const answers=s.answers.filter(a=>a.questionType!=="final");
  for(let i=0;i<triggers.length;i++){
    const t=triggers[i], key="role-"+i; if(usedKeys.has(key)) continue;
    const a=answers.find(x=>t.re.test(x.answer)); if(!a) continue;
    const f=factFrom(a.answer, t.re); if(!f) continue;
    const comp=getComp(p,t.comp)||COMPS[t.comp]||COMPS.judgment;
    return { key, from:a.questionId, fact:f.text, q:mkQ(p,{ id:"mem-"+key, type:"callback", comp, d:2, stage,
      text:(f.quote?`You mentioned "${f.text}". `:ALEX.remember(f.text)+" ")+t.q, sig:comp.sig.concat(["example","evidence","result"]).slice(0,12), lang:role&&role.bilingual?"x":null }) };
  }
  if(!usedKeys.has("generic") && !(role&&role.bilingual)){
    const intro=answers.find(a=>a.questionType==="intro"); const f=intro && factFrom(intro.answer);
    if(f && !f.quote){
      const comp=COMPS.judgment;
      return { key:"generic", from:"intro", fact:f.text, q:mkQ(p,{ id:"mem-generic", type:"callback", comp, d:2, stage,
        text:ALEX.remember(f.text)+" What was the hardest judgment call you made in that work, and what evidence did you rely on?",
        sig:["decision","evidence","risk","trade-off","because","data","outcome","stakeholder","priority","learned"] }) };
    }
  }
  return null;
}

/* ---------- Session model ------------------------------------------------- */
/* status: not_started → in_progress → completed | abandoned */
function newSessionId(){ return "s-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7); }
function initialTarget(cfg){ return cfg.difficulty==="adaptive" ? LEVELS[cfg.level].target : DIFFS[cfg.difficulty].target; }
function createSession(cfg){
  const p=getProfession(cfg.professionId); if(!p) throw new Error("Unknown profession");
  const L=LENGTHS[cfg.length];
  const fr = cfg.type==="bilingual" && isFrenchBilingual(p);
  const balance = fr ? (cfg.langBalance||"balanced") : null;
  const blueprint=buildBlueprint(p, cfg.type, L.n, balance);
  const introLang = fr && blueprint[0]==="intro:fr" ? "fr" : null;
  const s={ sessionId:newSessionId(), version:3,
    profession:{ id:p.id, title:p.title, group:p.group, custom:!!p.custom },
    interviewType:cfg.type, selectedInterviewType:cfg.type, recommendedInterviewType:recommendedType(p), mode:cfg.mode, experienceLevel:cfg.level, difficulty:cfg.difficulty, length:cfg.length,
    langBalance:balance, healthcare:isHealthcare(p), roleModel:(roleModelFor(p)||{}).key||null,
    weights: fr ? { en:40, fr:40, x:20 } : sessionWeights(p, cfg.type), blueprint,
    questionTarget:L.n, questionRange:[L.min, L.max], currentQuestion:0,
    answers:[], followUps:[], asked:[introQuestion(p, cfg.type, introLang)], memory:[],
    startedAt:Date.now(), completedAt:null, status:"not_started", scores:null, feedback:null,
    candidate:{ name:(cfg.name||"").trim(), platform:cfg.platform||"" },
    adaptive:{ target:initialTarget(cfg), revisit:[], fuUsed:0, fuBudget:L.fu },
    phase:"main", pending:null, lastTransition:null };
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
function isAdvanced(s){ return ["experienced","senior","expert"].includes(s.experienceLevel) || s.difficulty==="hard" || ["full","deep"].includes(s.length); }

function nextSlot(s){
  const bp=s.blueprint||[]; const i=s.asked.length;
  if(s.length==="deep"){
    const n=s.answers.length, [min,max]=s.questionRange;
    if(n>=min-1 && deepStable(s)) return "final";
    if(bp[i]==="final" && n<max-1){ const cyc=["reasoning","ai","domain"].filter(k=>(s.weights[k]||0)>0||k==="domain"); bp.splice(i,0,cyc[(i)%cyc.length]); }
  }
  return bp[i] || "final";
}
function deepStable(s){ const last=s.answers.slice(-4).map(a=>a.score); return last.length===4 && (last.every(v=>v>=78)||last.every(v=>v<50)); }

function pickNext(s){
  const p=getProfession(s.profession.id); if(!p) return null;
  const slot=nextSlot(s);
  if(slot==="final") return finalQuestion(p, s.interviewType);
  const pool=buildPool(p, s.interviewType), used=new Set(s.asked.map(q=>q.baseId||q.id));
  let stage=slot, lang=null;
  if(slot.startsWith("lang:")){ lang=slot.slice(5); stage=null; }
  if(!lang){
    const mem=memoryQuestion(s, p, stage);
    const memDue = mem && !s.asked.some(q=>q.questionType==="callback" && s.asked.indexOf(q)>=s.asked.length-2);
    if(memDue){ s.memory=(s.memory||[]).concat({ key:mem.key, from:mem.from, fact:mem.fact, askedAt:s.asked.length }); return mem.q; }
  }
  let cands=pool.filter(q=>!used.has(q.id) && (lang ? q.lang===lang : q.stage===stage) && q.questionType!=="intro");
  if(!cands.length && !lang){ const types=STAGE_TYPES[stage]||[]; cands=pool.filter(q=>!used.has(q.id) && types.includes(q.questionType)); }
  if(!cands.length && lang){
    const mem=memoryQuestion(s, p, "reasoning");
    if(mem){ s.memory=(s.memory||[]).concat({ key:mem.key, from:mem.from, fact:mem.fact, askedAt:s.asked.length }); return mem.q; }
    cands=pool.filter(q=>!used.has(q.id));
  }
  if(!cands.length) cands=pool.filter(q=>!used.has(q.id) && q.questionType!=="intro");
  if(!cands.length) return null;
  const compCount={}; s.asked.forEach(q=>compCount[q.competency]=(compCount[q.competency]||0)+1);
  const strongExample=new Set(s.answers.filter(a=>a.score>=70 && ["intro","behavioral","callback"].includes(a.questionType)).map(a=>a.competency));
  const t=s.adaptive.target, revisit=s.adaptive.revisit||[];
  const order=compIdsFor(p, s.interviewType), rank=id=>{ const i=order.indexOf(id); return i<0?order.length:i; };
  const adv=isAdvanced(s), needArt=adv && !s.asked.some(x=>x.artifact);  // advanced interviews always include a visual practical task
  const cost=q=>(compCount[q.competency]||0)*3 + Math.abs(q.difficulty-t)*2 - (revisit.includes(q.competency)?4:0) + rank(q.competency)*0.15
    - (q.curated?3:0) - (adv && q.artifact?(needArt?6:2):0) + (q.questionType==="behavioral" && strongExample.has(q.competency)?5:0) + Math.random()*0.8;
  cands.sort((a,b)=>cost(a)-cost(b));
  const q=JSON.parse(JSON.stringify(cands[0])); q.baseId=q.id;
  s.adaptive.revisit=revisit.filter(c=>c!==q.competency);
  const lv=LEVELS[s.experienceLevel];
  if(["knowledge","scenario"].includes(q.questionType) && !q.lang){
    if(t===3 && q.difficulty<3){ q.questionText+=COMPLICATIONS[s.asked.length % COMPLICATIONS.length]; q.difficulty=3; }
    else if(lv.suffix) q.questionText+=lv.suffix;
  }
  return q;
}

function fuText(type, q, s){
  const specific=q.fu && q.fu[type];
  if(specific) return specific;
  let t=FOLLOWUP.text[type];
  if(type==="edge") t=t.replace("{cond}", s.healthcare && !["ai_eval","error_detection"].includes(q.questionType) ? FOLLOWUP.edgeCond.healthcare : (FOLLOWUP.edgeCond[q.questionType]||FOLLOWUP.edgeCond.scenario));
  if(type==="challenge" && s.healthcare) t="What if a senior colleague disagreed with your plan?";
  if(q.lang==="fr") t=({ clarify:"Pouvez-vous préciser ce que vous voulez dire ?", evidence:"Sur quels éléments vous appuieriez-vous pour prendre cette décision ?",
    depth:"Pouvez-vous détailler cette étape ?", tradeoff:"Quel inconvénient cette approche pourrait-elle introduire ?", edge:"Votre décision changerait-elle si le client était très mécontent ?",
    challenge:"Et si un responsable n'était pas d'accord avec vous ?", ai:"Comment évalueriez-vous une réponse générée par une IA qui ferait la même hypothèse ?" })[type]||t;
  return t;
}
function decideFollowUp(s, q, r, text){
  if(s.adaptive.fuUsed>=s.adaptive.fuBudget) return null;
  if(q.questionType==="final") return null;
  const prev=s.answers[s.answers.length-1];
  const lv=LEVELS[s.experienceLevel];
  const used=new Set(s.followUps.map(f=>f.type));
  const mk=(type, lead)=>({ type, label:FOLLOWUP.label[type], lead, question:fuText(type, q, s) });
  if(r.wc < Math.max(18, lv.words*0.35)) return mk("clarify", q.lang==="fr"?"Merci.":ALEX.explore);
  if(q.questionType==="intro") return null;
  const nextStage=(s.blueprint||[])[s.asked.length];
  const lastAi = q.stage==="ai" && nextStage && nextStage!=="ai" && !String(nextStage).startsWith("lang");
  // Remediation (weak answers) is always allowed within budget; deepening follow-ups are not asked twice in a row.
  if(r.weakHits.length) return mk("evidence", ALEX.ack[0]);
  if(r.dims.Relevance<45 || (r.dims.Structure<34 && r.wc>=30)){
    const h=r.hit.find(x=>readableHit(x,text));
    return mk("depth", h?ALEX.stayWith(h):ALEX.explore);
  }
  if(prev && prev.followUp && !lastAi) return null;
  // "More difficult follow-up" after the AI-evaluation stage.
  if(lastAi && r.score>=55) return mk(used.has("challenge")?"edge":"challenge", ALEX.ack[1]);
  const strongOK = r.score>=75 && (s.difficulty==="adaptive"||s.difficulty==="hard"||["experienced","senior","expert"].includes(s.experienceLevel));
  if(strongOK){
    const specific=q.fu ? Object.keys(q.fu).find(k=>!used.has(k)) : null;
    if(specific) return mk(specific, ALEX.ack[1]);
    const aiType=["ai_domain","ai_readiness","full_mock"].includes(s.interviewType);
    if(aiType && !["ai_eval","error_detection"].includes(q.questionType) && !used.has("ai")) return mk("ai", ALEX.ack[1]);
    const rot=["tradeoff","edge","challenge"].filter(k=>!used.has(k)); return mk(rot[0]||"tradeoff", ALEX.ack[1]);
  }
  if(q.fu && q.fu.evidence && !used.has("evidence") && r.score>=55) return mk("evidence", ALEX.ack[1]);
  return null;
}

function transitionFor(s, prevAnswer, next){
  if(next.questionType==="callback") return ALEX.ack[0];
  if(next.questionType==="final") return ALEX.ack[1];
  const prevLang=(s.asked[s.asked.length-2]||{}).lang, nl=next.lang;
  if(nl && nl!==prevLang){ if(nl==="fr") return ALEX.toFrench; if(nl==="en") return ALEX.toEnglish; if(nl==="x") return ALEX.toCross; }
  const ack=ALEX.ack[s.answers.length % ALEX.ack.length];
  if(nl==="fr") return "Merci.";
  if(prevAnswer && next.questionType!=="intro"){
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
      s.pending.followUp={ type:fu.type, label:fu.label, lead:fu.lead, question:fu.question, answer:"" };
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
  if(q.questionType==="final" || shouldFinish(s)){ completeSession(s, "completed"); return { kind:"done" }; }
  const next=pickNext(s);
  if(!next){ completeSession(s, "completed"); return { kind:"done" }; }
  s.asked.push(next); s.currentQuestion++;
  s.lastTransition=transitionFor(s, rec, next);
  Repo.sessions.save(s);
  return { kind:"next", transition:s.lastTransition };
}
function recordPending(s){
  const q=currentQ(s), r=s.pending.r;
  const rec={ q:q.questionText, questionId:q.id, questionType:q.questionType, stage:q.stage, lang:q.lang, competency:q.competency, compLabel:q.compLabel,
    scenario:q.scenario, code:q.code, artifact:q.artifact, difficulty:q.difficulty, hint:q.scoringRubric.hint,
    answer:s.pending.answer, seconds:s.pending.seconds, score:r.score, wc:r.wc, dims:r.dims, communication:r.communication, langMismatch:r.langMismatch,
    hit:r.hit, missed:r.missed, followUp:s.pending.followUp||null, feedback:feedbackFor(r, q, s.experienceLevel) };
  rec.competencyEvidence=answerEvidence(rec);
  s.answers.push(rec); s.phase="main"; s.pending=null;
  return rec;
}
/* Competency-level evidence for one interview answer: the question's competency (with the
   expected signals found / missing), the interview stage's competency, and communication. */
function answerEvidence(a){
  const out=[{ id:a.competency, name:a.compLabel||competencyName(a.competency), score:a.score, found:(a.hit||[]).slice(), missing:(a.missed||[]).slice() }];
  const sc=STAGE_COMPETENCY[a.stage];
  if(sc && sc!==a.competency && !["intro","final"].includes(a.questionType)) out.push({ id:sc, name:competencyName(sc), score:a.score, found:[], missing:[] });
  if(typeof a.communication==="number" && a.competency!=="communication") out.push({ id:"communication", name:competencyName("communication"), score:a.communication, found:[], missing:[] });
  return out.filter(e=>e.id);
}
function interviewEvidence(A){
  const ev={};
  A.forEach(a=>(a.competencyEvidence||answerEvidence(a)).forEach(e=>{
    const x=ev[e.id]=ev[e.id]||{ id:e.id, name:e.name, scores:[], found:new Set(), missing:new Set(), questionIds:[] };
    x.scores.push(e.score); e.found.forEach(f=>x.found.add(f)); e.missing.forEach(f=>x.missing.add(f)); x.questionIds.push(a.questionId);
  }));
  return Object.fromEntries(Object.values(ev).map(x=>[x.id,{ id:x.id, name:x.name, score:avg(x.scores), n:x.scores.length,
    found:[...x.found], missing:[...x.missing].filter(m=>!x.found.has(m)), questionIds:x.questionIds }]));
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
  const n=s.answers.length;
  if(s.length==="deep") return n>=s.questionRange[1];
  return n>=s.questionTarget;
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
function areaScores(s){
  const A=s.answers, out={};
  if(s.langBalance){
    const by=k=>A.filter(a=>(a.lang||"en")===k);
    [["English","en"],["French","fr"],["Translation & Cross-language","x"]].forEach(([l,k])=>{ const xs=by(k); if(xs.length) out[l]={ score:avg(xs.map(a=>a.score)), weight:s.weights[k], n:xs.length }; });
    return out;
  }
  const w=s.weights||{};
  ["background","domain","reasoning","ai"].forEach(k=>{
    const xs=A.filter(a=>(a.stage||STAGE_OF[a.questionType])===k);
    if(xs.length && (w[k]||0)>0) out[STAGE_LABEL[k]]={ score:avg(xs.map(a=>a.score)), weight:w[k], n:xs.length };
  });
  const comm=A.filter(a=>typeof a.communication==="number").map(a=>a.communication);
  const commStage=A.filter(a=>(a.stage||STAGE_OF[a.questionType])==="communication").map(a=>a.score);
  if(comm.length) out[STAGE_LABEL.communication]={ score: commStage.length ? Math.round(avg(comm)*0.5+avg(commStage)*0.5) : avg(comm), weight:w.communication||15, n:A.length };
  return out;
}
function finalizeReport(s){
  const A=s.answers;
  const dims={}; ["Relevance","Depth","Structure","Specificity"].forEach(n=>dims[n]=avg(A.map(a=>a.dims[n])));
  const comps={}; A.forEach(a=>{ if(a.compLabel && !["intro","final"].includes(a.questionType)){ (comps[a.compLabel]=comps[a.compLabel]||[]).push(a.score); } });
  const competencies=Object.fromEntries(Object.entries(comps).map(([k,v])=>[k,avg(v)]));
  let overall=avg(A.map(a=>a.score)), areas=null;
  if(s.version>=3){
    areas=areaScores(s);
    const ent=Object.values(areas), tw=ent.reduce((a,x)=>a+x.weight,0);
    if(tw>0) overall=Math.round(ent.reduce((a,x)=>a+x.score*x.weight,0)/tw);
  }
  const sorted=Object.entries(competencies).sort((a,b)=>b[1]-a[1]);
  const nm=s.candidate&&s.candidate.name;
  const verdict = overall>=78 ? `${nm?nm+", you":"You"} performed at the level strong candidates show. Keep it consistent across sessions.`
    : overall>=55 ? `${nm?nm+", you":"You"} are close. Strengthen the focus areas below and you'll clear most screening interviews.`
    : `This is a starting point${nm?", "+nm:""}. Work through the focus areas below, then run the interview again.`;
  s.scores={ overall, dims, competencies, areas, competencyEvidence:interviewEvidence(A), communication:avg(A.filter(a=>typeof a.communication==="number").map(a=>a.communication)) };
  s.feedback={ verdict, strengths:sorted.filter(([,v])=>v>=70).slice(0,3).map(([k])=>k), focus:sorted.slice().reverse().filter(([,v])=>v<70).slice(0,3).map(([k])=>k) };
  return s;
}
function reportOf(s){ if(!s.scores || s.scores.dims==null){ if(s.answers&&s.answers.length) finalizeReport(s); } return s; }
function sessionTypeLabel(s){ return s.interviewType==="legacy" ? "Interview (v1)" : (TYPES[s.interviewType]||{}).label || "Interview"; }
