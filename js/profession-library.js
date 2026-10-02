/* =============================================================================
   Profession library engine — builds every profession record from configuration
   (js/data/professions.js + js/data/profession-catalog.js + local admin imports),
   provides search (title, partial, alias, specialty, category, family), specialty
   handling, custom-profession family inference, and CV profession detection.
   No profession-specific logic lives here: everything comes from config.
   ========================================================================== */
"use strict";

const normP = s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/&/g," and ").replace(/\bphd\b/g,"phd");
const compactP = s=>normP(s).replace(/[^a-z0-9]/g,"");
const tokensP = s=>normP(s).split(/[^a-z0-9]+/).filter(Boolean);
const LEGACY_GROUP_FAMILY = { general_ai:"ai_ml", business:"business", finance:"finance", healthcare:"healthcare", education:"education", science:"science",
  engineering:"engineering", software:"software", marketing:"marketing", language:"language", writing:"writing", legal:"legal", transferable:"facilities_frontline" };
const PROFESSIONAL_COMPS = new Set(["communication","judgment","stakeholder","ethics","people","customer","reliability","clinical_comm","needs_discovery","account_mgmt","guest_service","prioritization","documentation"]);
/* Specialty → extra competency (optional, config). */
const SPECIALTY_COMPS = { "Front-End":"frontend", "DevOps":"devops", "Cloud":"devops", "Machine Learning":"ml", "Statistics":"stats", "Experimentation":"experiment",
  "Audit":"audit", "Tax":"compliance", "Litigation":"evidence", "Contract":"contracts", "Compliance":"compliance", "Mental Health":"psychosocial", "Construction":"eng_safety" };

const ProfessionLib = (()=>{
  const byCompact = {};
  const index = ()=>PROFESSIONS.forEach(p=>{ byCompact[compactP(p.title)] = byCompact[compactP(p.title)] || p; });
  function family(p){ return PROFESSION_FAMILIES[p.family] || PROFESSION_FAMILIES.generalist; }
  function langFromTitle(title){ const m=title.match(/^([A-Z][a-z]+) Evaluator$/); return m ? m[1] : null; }
  /* Build a new record from a family template. */
  function make(title, catId, famId, extra){
    const f=PROFESSION_FAMILIES[famId]||PROFESSION_FAMILIES.generalist, g=GROUP[f.group]||GROUP.general_ai;
    const id=(extra&&extra.id)||slug(title);
    const p=Object.assign({ id, title, group:f.group, comps:f.comps.slice(), ai:f.ai!==undefined?f.ai:(g.ai||null), set:f.set||g.set,
      transferable:!!f.transferable, lingual:!!f.lingual, academic:!!f.academic || /PhD|Professor|Researcher|Research Scientist|Research Expert/.test(title),
      category:catId, family:famId, seeded:true }, extra||{});
    if(f.types) p.types=f.types.slice();
    if(f.recommended) p.recommendedType=f.recommended;
    if(p.lingual){ const L=langFromTitle(title); if(L){ p.lang=L; p.languages=[L]; } else if(/bilingual/i.test(title)){ p.lang="your second language"; p.languages=["English","your second language"]; } }
    if(p.transferable){ p.ai=null; }
    return p;
  }
  /* Fill the full data model on every record (fields are optional; nothing blocks use). */
  function normalize(p){
    const f=family(p), types=allowedTypes(p);
    const comps=uniq((p.comps||[]).concat(p.ai?[p.ai]:[])).filter(id=>getComp(p,id)||COMPS[id]);
    p.name=p.name||p.title; p.display_name=p.display_name||p.title;
    p.profession_family=f.label; p.subcategory=p.subcategory||f.label;
    p.aliases=p.aliases||[]; p.specialties=p.specialties||[];
    p.description=p.description||PROFESSION_DESCRIPTIONS[p.title]||`Interview practice for ${p.title} roles, built on the ${f.label} template: ${f.areas.slice(0,4).join(", ").toLowerCase()} and more.`;
    p.common_responsibilities=p.common_responsibilities||(p.profile&&p.profile.responsibilities?String(p.profile.responsibilities).split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean):f.responsibilities.slice());
    p.core_competencies=comps;
    p.technical_competencies=comps.filter(id=>!PROFESSIONAL_COMPS.has(id));
    p.professional_competencies=comps.filter(id=>PROFESSIONAL_COMPS.has(id));
    p.education_expectation=p.education_expectation||(p.profile&&p.profile.education)||f.education;
    p.credential_notes=p.credential_notes||(p.custom?(p.profile&&p.profile.credentials?`Provided by you: ${p.profile.credentials}`:"None provided."):f.credentials);
    p.typical_interview_types=types; p.recommended_interview_type=recommendedType(p);
    p.supported_practical_tasks=p.supported_practical_tasks||f.tasks.slice();
    p.recommended_practice=p.recommended_practice||f.practice.slice();
    p.interview_areas=f.areas.slice();
    p.domain_keywords=p.domain_keywords||uniq(tokensP((p.kw||"")+" "+p.title)).filter(w=>w.length>2);
    p.status=p.status||(p.custom?"dynamic":isTransferable(p)?"transferable":roleModelFor(p)&&!roleModelFor(p).group?"full_domain":p.seeded?"domain_template":"full_domain");
    p.opportunities=p.opportunities||[];   // only verified opportunities may ever be added here
    if(!p.pay) p.pay={ min:null, max:null, currency:null, period:null, source:null, last_verified:null, status:"unknown", notes:"" };
    Object.assign(p, { pay_range_min:p.pay.min, pay_range_max:p.pay.max, pay_currency:p.pay.currency, pay_period:p.pay.period, pay_source:p.pay.source, pay_last_verified:p.pay.last_verified, pay_verification_status:p.pay.status });
    return p;
  }
  function find(title){ return byCompact[compactP(title)] || null; }
  function build(){
    index();
    PROFESSIONS.forEach(p=>{ p.category=p.category||GROUP_CATEGORY[p.group]||"other"; p.family=p.family||LEGACY_GROUP_FAMILY[p.group]||"generalist"; });
    Object.entries(PROFESSION_SEED).forEach(([cat,titles])=>titles.forEach(entry=>{
      const [title,famOverride]=entry.split(">"), fam=famOverride||CATEGORY_FAMILY[cat];
      const ex=find(title);
      if(ex){ ex.category=cat; if(famOverride) ex.family=famOverride; return; }
      const p=make(title, cat, fam); PROFESSIONS.push(p); PROF[p.id]=p; byCompact[compactP(title)]=p;
    }));
    Object.entries(PROFESSION_ALIASES).forEach(([target,list])=>{ const p=find(target); if(!p) return;
      p.aliases=uniq((p.aliases||[]).concat(list.map(a=>typeof a==="string"?a:a.alias)));
      p.aliasSpecialty=Object.assign(p.aliasSpecialty||{}, Object.fromEntries(list.filter(a=>typeof a!=="string").map(a=>[compactP(a.alias), a.specialty]))); });
    Object.entries(PROFESSION_SPECIALTIES).forEach(([t,list])=>{ const p=find(t); if(p) p.specialties=list.slice(); });
    Object.entries(PROFESSION_PAY_SEED).forEach(([t,[a,b]])=>{ const p=find(t); if(p) p.pay={ min:a, max:b, currency:"USD", period:"hour", source:"Owner seed brief", last_verified:null, status:"user_provided_seed", notes:PAY_SEED_NOTE }; });
    // Existing keyword lists double as aliases for search.
    PROFESSIONS.forEach(normalize);
  }
  function rebuildOne(p){ ["core_competencies","typical_interview_types","recommended_interview_type","status"].forEach(k=>{ if(k!=="status") delete p[k]; }); return normalize(p); }

  /* ---------- Search ------------------------------------------------------ */
  function aliasIndex(){
    const m={}; all().forEach(p=>uniq((p.aliases||[]).map(compactP)).forEach(k=>(m[k]=m[k]||[]).push(p))); return m;
  }
  function all(){ return PROFESSIONS.concat(typeof Repo!=="undefined"?Repo.customProfessions.all():[]).filter(p=>p.status!=="archived"); }
  function score(p, q, qc, qt){
    const name=compactP(p.title), al=(p.aliases||[]).map(compactP), via={};
    let s=0;
    if(name===qc) s=1000;
    else if(al.includes(qc)){ s=900; via.alias=(p.aliases||[])[al.indexOf(qc)]; }
    else if(qc.length>=3 && name.startsWith(qc)) s=700;
    else if(qc.length>=3 && name.includes(qc)) s=520;
    else if(qc.length>=3 && al.some(a=>a.startsWith(qc))){ s=480; via.alias=(p.aliases||[])[al.findIndex(a=>a.startsWith(qc))]; }
    else if(qc.length>=4 && al.some(a=>a.includes(qc))){ s=420; via.alias=(p.aliases||[])[al.findIndex(a=>a.includes(qc))]; }
    const sp=(p.specialties||[]).find(x=>compactP(x)===qc || (qc.length>=4 && compactP(x).startsWith(qc))); if(sp){ s=Math.max(s,400); via.specialty=sp; }
    if(qt.length){
      const nt=tokensP(p.title), at=[].concat(...(p.aliases||[]).map(tokensP)), kt=tokensP((p.kw||"")+" "+(p.specialties||[]).join(" ")+" "+(p.domain_keywords||[]).join(" ")),
        ct=tokensP(((PCAT[p.category]||{}).label||"")+" "+((PROFESSION_FAMILIES[p.family]||{}).label||""));
      let hit=0, t=0;
      qt.forEach(w=>{ const short=w.length<=2, pre=x=>short?x===w:x.startsWith(w);
        const v = nt.some(pre)?60 : at.some(pre)?45 : kt.some(pre)?30 : ct.some(pre)?15 : 0; if(v){ hit++; t+=v; } });
      if(hit) s=Math.max(s, t + (hit===qt.length ? 100 : 0));
    }
    return { s, via };
  }
  function search(q, opts){
    opts=opts||{}; const qc=compactP(q), qt=tokensP(q).filter(w=>!["the","and","of","a","an"].includes(w));
    if(!qc) return { results:[], ambiguous:null };
    const res=all().map(p=>Object.assign({ p }, score(p,q.trim(),qc,qt))).filter(r=>r.s>=45);
    const statusRank={ full_domain:0, domain_template:1, transferable:2, dynamic:3 };
    res.sort((a,b)=>b.s-a.s || (statusRank[a.p.status]||0)-(statusRank[b.p.status]||0) || a.p.title.localeCompare(b.p.title));
    const am=aliasIndex()[qc], ambiguous = am && am.length>1 && !all().some(p=>compactP(p.title)===qc) ? { term:q.trim(), options:am } : null;
    res.forEach(r=>{ const k=compactP(r.via.alias||""); r.specialty = (r.p.aliasSpecialty||{})[k] || null; });
    return { results:res.slice(0, opts.limit||40), ambiguous, total:res.length };
  }
  function byCategory(cat){ return all().filter(p=>p.category===cat).sort((a,b)=>a.title.localeCompare(b.title)); }
  function categoriesIn(browse){ return PROFESSION_CATEGORIES.filter(c=>c.browse===browse); }

  /* ---------- Specialty: a session-level view of the profession ------------ */
  function withSpecialty(p, sp){
    if(!p || !sp) return p;
    const extra=SPECIALTY_COMPS[sp], c=Object.assign({}, p, { specialty:sp });
    if(extra && COMPS[extra] && !p.comps.includes(extra)) c.comps=[extra].concat(p.comps).slice(0,8);
    return c;
  }
  /* ---------- Custom profession: infer category + family from the user's words */
  const ROLE_FAMILY=[[/\b(manager|director|coordinator|supervisor|administrator|head of|lead)\b/i,"operations"],[/\b(engineer|engineering)\b/i,"engineering"],[/\b(developer|programmer|software)\b/i,"software"],
    [/\b(analyst|analytics)\b/i,"data"],[/\b(nurse|doctor|clinician|therapist|paramedic|midwife)\b/i,"healthcare"],[/\b(teacher|tutor|lecturer|trainer|instructor)\b/i,"education"],
    [/\b(lawyer|attorney|solicitor|legal|paralegal)\b/i,"legal"],[/\b(accountant|bookkeeper|finance|auditor)\b/i,"finance"],[/\b(technician|mechanic|installer|fitter|electrician|plumber|carpenter|welder|joiner|mason|roofer|painter)\b/i,"trades"],
    [/\b(driver|courier)\b/i,"driving"],[/\b(carer|caregiver|support worker|care assistant)\b/i,"care_support"],[/\b(designer|artist|illustrator)\b/i,"design"],
    [/\b(writer|editor|journalist)\b/i,"writing"],[/\b(sales|account executive|business development)\b/i,"sales"],[/\b(assistant|receptionist|secretary|clerk)\b/i,"admin"],
    [/\b(scientist|researcher|chemist|biologist|physicist)\b/i,"science"],[/\b(consultant|strategist|advisor|adviser)\b/i,"business"],[/\b(cook|chef|server|waiter|barista|bartender)\b/i,"hospitality_frontline"]];
  const INDUSTRY_CATEGORY=[[/vet|animal|pet/i,"veterinary"],[/health|medic|clinic|hospital|care home|pharm/i,"healthcare"],[/dental|dentist/i,"dental"],[/school|education|universit|college|teach/i,"education"],
    [/law|legal/i,"legal"],[/bank|invest|financ|account/i,"finance"],[/software|tech|it\b|saas|digital/i,"software"],[/construct|building|trade/i,"construction"],[/farm|agri/i,"agriculture"],
    [/hotel|hospitality|restaurant|food|catering/i,"hospitality"],[/retail|shop|store/i,"retail"],[/logistic|warehouse|supply|transport|shipping/i,"supply_chain"],[/energy|oil|gas|utility|solar|wind/i,"energy"],
    [/government|public sector|council|ministry/i,"government"],[/nonprofit|charity|ngo|community/i,"nonprofit"],[/insurance/i,"insurance"],[/real estate|property/i,"real_estate"],
    [/marketing|advertis|media|social/i,"marketing"],[/manufactur|factory|production/i,"manufacturing"],[/hr|human resources|recruit/i,"hr"],[/security|cyber/i,"security"]];
  function inferCustom(title, industry){
    const t=title+" "+(industry||"");
    const cat=(INDUSTRY_CATEGORY.find(([re])=>re.test(industry||""))||INDUSTRY_CATEGORY.find(([re])=>re.test(title))||[null,"other"])[1];
    const fam=(ROLE_FAMILY.find(([re])=>re.test(title))||[null,CATEGORY_FAMILY[cat]||"generalist"])[1];
    return { category:cat, family:fam };
  }
  /* ---------- CV → possible professions (suggestions only; never added silently) */
  function detectFromCV(){
    if(typeof CV==="undefined") return [];
    const have=new Set((Repo.careers?Repo.careers.all():[]).map(c=>c.professionId)), out=[];
    CV.confirmed("role").forEach(item=>{
      const title=(item.title||item.value||"").replace(/\(.*\)$/,"").split(/\s+[—–-]\s+/)[0].trim(); if(!title) return;
      const r=search(title,{limit:3}).results[0];
      const strong=r && r.s>=420, approx=!strong && r && r.s>=60;   // approx = closest library match, offered unticked
      out.push({ cvTitle:title, source:item.value, professionId:(strong||approx)?r.p.id:null, professionTitle:(strong||approx)?r.p.title:null, approx, already:(strong||approx)&&have.has(r.p.id) });
    });
    const seen=new Set(); return out.filter(x=>{ const k=x.professionId||x.cvTitle; if(seen.has(k)) return false; seen.add(k); return true; });
  }
  return { build, normalize, rebuildOne, make, search, all, byCategory, categoriesIn, withSpecialty, inferCustom, detectFromCV, family, find };
})();
ProfessionLib.build();
