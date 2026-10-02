/* =============================================================================
   Profession UI — setup step 1 (search, recent, recommended, browse categories,
   "Can't find your profession?"), Profession Library, profession profile page,
   My Professions (several careers per person) and CV profession detection.
   All content comes from the profession records (js/profession-library.js).
   ========================================================================== */
"use strict";

const POPULAR_PROFESSIONS = ["Project Manager","Registered Nurse","Software Engineer","Accountant","Data Analyst","Teacher","Generalist","Lawyer","Virtual Assistant","Customer Service Representative","Electrician","Business Analyst"];
const STATUS_BADGE_CLS = { full_domain:"good", domain_template:"info", dynamic:"ok", transferable:"", archived:"bad" };
function statusChip(p){ return `<span class="badge ${STATUS_BADGE_CLS[p.status]||""}">${H(PROFESSION_STATUSES[p.status]||p.status)}</span>`; }
function catLabel(p){ const c=PCAT[p.category]; return c?`${c.icon} ${c.label}`:(p.custom?"⭐ My Professions":""); }
function recentProfessions(){
  const ids=uniq((Repo.prefs.get().recentProfessions||[]).concat(Repo.sessions.all().map(s=>s.profession&&s.profession.id))).filter(Boolean);
  return ids.map(getProfession).filter(p=>p && p.status!=="archived").slice(0,8);
}
/* Recommended for you: your saved professions and professions matched from your confirmed CV.
   Never based on pay, and never on a category merely existing in the library. */
function recommendedProfessions(){
  const out=Repo.careers.all().map(c=>getProfession(c.professionId)).filter(Boolean);
  ProfessionLib.detectFromCV().forEach(d=>{ if(d.professionId) out.push(getProfession(d.professionId)); });
  const seen=new Set(); return out.filter(p=>p && p.status!=="archived" && !seen.has(p.id) && seen.add(p.id)).slice(0,8);
}
function rememberProfession(id){ const r=(Repo.prefs.get().recentProfessions||[]).filter(x=>x!==id); r.unshift(id); Repo.prefs.set({ recentProfessions:r.slice(0,8) }); }
function profChip(p, sp){ const sel=App.setup.professionId===p.id;
  return `<button class="pchip ${sel?"sel":""}" onclick="pickProfession('${p.id}'${sp?`,'${H(sp)}'`:""})" aria-pressed="${sel}" title="${H(catLabel(p))}">${H(p.title)}${p.custom?`<span class="x" role="button" title="Remove" aria-label="Remove ${H(p.title)}" onclick="event.stopPropagation();removeCustom('${p.id}')">×</span>`:""}</button>`; }

/* ---------- Setup step 1 --------------------------------------------------- */
function stepProfession(p){
  const careers=Repo.careers.all().map(c=>({ c, p:getProfession(c.professionId) })).filter(x=>x.p);
  const recPrac=p?(p.recommended_practice||[]).filter(c=>PRACTICE_CATEGORY[c] && isCategoryAvailable(c)).slice(0,4):[];
  return `<h2>Step 1 · Choose your profession</h2>
    ${p?`<div class="selected">✓ Selected: <b>${H(p.title)}</b> <span class="faint">· ${H(catLabel(p))}</span> ${statusChip(p)}</div>
      ${(p.specialties||[]).length?`<div class="small muted" style="margin:6px 0 2px">Specialty (optional)</div><div class="chips" id="specChips">${p.specialties.map(sp=>`<button class="chip ${App.setup.specialty===sp?"sel":""}" onclick="setSpecialty('${H(sp)}')">${H(sp)}</button>`).join("")}${App.setup.specialty?`<button class="chip" onclick="setSpecialty('')">Clear</button>`:""}</div>`:""}
      ${recPrac.length?`<div class="small muted" style="margin-top:6px">Recommended practice for ${H(p.title)}: ${recPrac.map(c=>`<a href="javascript:void(0)" onclick="openPracticeSetup('${c}','easy')">${H(PRACTICE_CATEGORY[c].label)}</a>`).join(" · ")}</div>`:""}`:""}
    ${careers.length?`<div class="small muted" style="margin-top:12px">Your professions</div><div class="chips" id="careerChips">${careers.map(({c,p:x})=>`<button class="chip ${App.setup.professionId===x.id?"sel":""}" onclick="pickProfession('${x.id}'${c.specialty?`,'${H(c.specialty)}'`:""})">${H(x.title)} <span class="faint">· ${H(c.rank)}</span></button>`).join("")}</div>`:""}
    <div class="search"><input id="profSearch" type="search" autocomplete="off" placeholder="Search accountant, nurse, carpenter, lawyer, engineer..." aria-label="Search professions" value="${H(App.ui.search)}" oninput="onProfSearch(this.value)"></div>
    <div class="chips" id="groupChips">${groupChipsHTML()}</div>
    <div class="proflist" id="profList">${profListHTML()}</div>
    <div class="custombox" id="customBox">${customHTML()}</div>
    ${wizFoot(!!p)}`;
}
function groupChipsHTML(){
  const opts=[["all","All"]].concat(Repo.customProfessions.all().length?[["custom","⭐ My Professions"]]:[], recentProfessions().length?[["recent","Recent"]]:[],
    recommendedProfessions().length?[["recommended","Recommended for You"]]:[], BROWSE_GROUPS.map(b=>[b,b]));
  return opts.map(([id,l])=>`<button class="chip ${App.ui.group===id?"sel":""}" onclick="setGroupFilter('${H(id)}')">${H(l)}</button>`).join("");
}
function profSection(title, list, sp){ return list.length?`<div class="pgroup"><h4>${title}</h4><div class="pchips">${list.map(p=>profChip(p, sp&&sp[p.id])).join("")}</div></div>`:""; }
function profListHTML(){
  const q=App.ui.search.trim(), g=App.ui.group;
  if(q){
    const r=ProfessionLib.search(q,{limit:40});
    if(!r.results.length) return `<p class="muted" style="margin:14px 0">No professions match "<b>${H(q)}</b>". You can add it below as a custom profession.</p>`;
    return (r.ambiguous?`<div class="note ambig" role="status" style="margin-top:6px">“${H(r.ambiguous.term)}” can mean more than one profession. Choose the one you mean: ${r.ambiguous.options.map(p=>`<b>${H(p.title)}</b>`).join(" or ")}.</div>`:"")
      + `<div class="small faint">${r.total} match${r.total===1?"":"es"}${r.total>40?" (showing the best 40)":""}</div><div class="presults">`
      + r.results.map(x=>`<div class="presult">${profChip(x.p, x.specialty)}<span class="pmeta">${H(catLabel(x.p))}${x.via.alias?` · matched “${H(x.via.alias)}”`:""}${x.specialty?` · ${H(x.specialty)}`:x.via.specialty?` · specialty: ${H(x.via.specialty)}`:""}</span></div>`).join("")+`</div>`;
  }
  if(g==="custom") return profSection("⭐ My Professions", Repo.customProfessions.all());
  if(g==="recent") return profSection("Recent professions", recentProfessions());
  if(g==="recommended") return profSection("Recommended for you", recommendedProfessions())+`<p class="small faint">Based on the professions you saved and the roles you confirmed in your CV.</p>`;
  if(BROWSE_GROUPS.includes(g)) return ProfessionLib.categoriesIn(g).map(c=>profSection(`${c.icon} ${H(c.label)}`, ProfessionLib.byCategory(c.id))).join("") || `<p class="muted">No professions in this group yet.</p>`;
  const pop=POPULAR_PROFESSIONS.map(t=>ProfessionLib.search(t,{limit:1}).results[0]).filter(Boolean).map(r=>r.p);
  return profSection("⭐ My Professions", Repo.customProfessions.all()) + profSection("Recent", recentProfessions()) + profSection("Recommended for you", recommendedProfessions())
    + profSection("Popular", uniq(pop)) + `<p class="small faint" style="margin-top:8px">${ProfessionLib.all().length} professions across ${PROFESSION_CATEGORIES.length} categories. Search above, or browse a category.</p>`;
}
function onProfSearch(v){ App.ui.search=v; document.getElementById("profList").innerHTML=profListHTML(); }
function setGroupFilter(g){ App.ui.group=g; App.ui.search=""; const s=document.getElementById("profSearch"); if(s) s.value=""; document.getElementById("groupChips").innerHTML=groupChipsHTML(); document.getElementById("profList").innerHTML=profListHTML(); }
function pickProfession(id, specialty){
  const list=document.getElementById("profList"), top=list?list.scrollTop:0;
  App.ui.typeNote="";
  if(App.setup.professionId!==id) App.setup.specialty="";
  App.setup.professionId=id; if(specialty) App.setup.specialty=specialty;
  rememberProfession(id); normalizeSetup(); saveSetup(); renderStep();
  const l2=document.getElementById("profList"); if(l2) l2.scrollTop=top;
}
function setSpecialty(sp){ App.setup.specialty=sp; saveSetup(); renderStep(); }
function removeCustom(id){
  const p=getProfession(id); if(!p || !confirm(`Remove your custom profession "${p.title}"?`)) return;
  Repo.customProfessions.remove(id); Repo.careers.remove(id); if(App.setup.professionId===id) App.setup.professionId=null;
  if(App.ui.group==="custom" && !Repo.customProfessions.all().length) App.ui.group="all";
  saveSetup(); renderStep();
}
function customHTML(){
  if(!App.ui.customOpen) return `<div class="row between center wrapw"><div><h3 style="margin:0 0 4px;text-transform:uppercase;letter-spacing:.8px">Can't find your profession?</h3>
    <div class="small muted">Add it, and Interview IQ builds a private interview profile from your role. It stays in this browser and is never published.</div></div>
    <button class="btn" id="addProfBtn" onclick="toggleCustom(true)">＋ Add Your Profession</button></div>`;
  const yrs=["","Less than 1 year","1–3 years","3–5 years","5–10 years","10+ years"];
  return `<h3>Add your profession</h3>
    <div class="grid g2">
      <div><label class="fld" for="cpTitle">Profession name <span class="req">*</span></label><input id="cpTitle" maxlength="80" placeholder="e.g. Veterinary Practice Manager" value="${H(App.ui.search)}"></div>
      <div><label class="fld" for="cpIndustry">Industry</label><input id="cpIndustry" maxlength="80" placeholder="e.g. Veterinary / Healthcare"></div>
      <div><label class="fld" for="cpSpecialty">Specialty</label><input id="cpSpecialty" maxlength="80" placeholder="e.g. Small-animal practice"></div>
      <div><label class="fld" for="cpYears">Years of experience</label><select id="cpYears">${yrs.map(y=>`<option value="${y}">${y||"Select…"}</option>`).join("")}</select></div>
    </div>
    <div class="field"><label class="fld" for="cpResp">Main responsibilities <span class="req">*</span> <span class="faint">(one per line or comma-separated)</span></label>
      <textarea id="cpResp" style="min-height:90px" placeholder="e.g. Scheduling, Team supervision, Client communication, Inventory"></textarea></div>
    <div class="grid g2">
      <div><label class="fld" for="cpSkills">Top skills</label><input id="cpSkills" maxlength="300" placeholder="e.g. Rota planning, Stock control"></div>
      <div><label class="fld" for="cpEdu">Education</label><input id="cpEdu" maxlength="120" placeholder="Only what applies to you"></div>
      <div><label class="fld" for="cpCred">Professional credentials (if any)</label><input id="cpCred" maxlength="160" placeholder="Leave blank if none"></div>
      <div><label class="fld" for="cpGoal">Interview goal</label><select id="cpGoal">${["","Prepare for AI evaluation work in my field","Prepare for a job interview","Practise explaining my expertise","Career change"].map(x=>`<option value="${H(x)}">${x||"Select…"}</option>`).join("")}</select></div>
    </div>
    <div class="field"><label class="check"><input type="checkbox" id="cpTransferable"> This is a hands-on or service role. Use a Transferable Skills Interview instead of a profession-specific AI interview.</label></div>
    <p class="small faint">Interview IQ only uses what you enter. It never adds credentials, employers or experience you didn't provide.</p>
    <div id="cpErr" class="small" style="color:#ffb4b4;margin-top:10px" role="alert"></div>
    <div class="row wrapw" style="margin-top:14px;gap:10px"><button class="btn primary upper" id="cpCreate" onclick="saveCustom()">Create my interview profile</button><button class="btn ghost" onclick="toggleCustom(false)">Cancel</button></div>`;
}
function toggleCustom(open){ App.ui.customOpen=open; document.getElementById("customBox").innerHTML=customHTML(); if(open){ const t=document.getElementById("cpTitle"); if(t) t.focus(); } }
function saveCustom(){
  const v=id=>(document.getElementById(id)||{}).value||"";
  const f={ title:v("cpTitle").trim(), industry:v("cpIndustry").trim(), specialty:v("cpSpecialty").trim(), years:v("cpYears"), responsibilities:v("cpResp").trim(),
    skills:v("cpSkills").trim(), education:v("cpEdu").trim(), credentials:v("cpCred").trim(), goal:v("cpGoal"), transferable:document.getElementById("cpTransferable").checked };
  const err=document.getElementById("cpErr");
  if(f.title.length<2){ err.textContent="Please enter your profession name."; return; }
  if(f.responsibilities.length<4){ err.textContent="Please list at least one main responsibility. Alex builds your questions from them."; return; }
  let p; try{ p=ProfessionLib.normalize(buildCustomProfession(f)); }catch(e){ console.error(e); err.textContent="Your profile couldn't be created. Please check the details and try again."; return; }
  Repo.customProfessions.save(p);
  App.ui.customOpen=false; App.ui.search=""; App.ui.group="all";
  App.setup.professionId=p.id; App.setup.specialty=f.specialty; App.setup.typeChosen=false; rememberProfession(p.id); normalizeSetup(); saveSetup(); renderStep();
}
function presetProfession(id, sp){ App.setup.professionId=id; App.setup.specialty=sp||""; App.setup.typeChosen=false; rememberProfession(id); normalizeSetup(); App.setup.step=2; saveSetup(); go("interview/start"); }

/* ---------- Profession Library -------------------------------------------- */
function profCard(p){
  return `<div class="card pcard" data-prof="${p.id}">
    <div class="row between center wrapw" style="gap:6px"><div class="t">${H(p.title)}</div>${statusChip(p)}</div>
    <div class="small faint">${H(catLabel(p))} · ${H(p.profession_family||"")}</div>
    <div class="d small muted" style="margin:6px 0">${H(clip(p.description||"",150))}</div>
    <div class="small"><span class="badge good">Interview practice: Available</span> <span class="badge">AI opportunity: ${p.opportunities&&p.opportunities.length?"Verified":"Not verified"}</span></div>
    <div class="row wrapw" style="gap:6px;margin-top:10px"><a class="btn sm" href="#/professions/${p.id}">Prepare for This Profession</a>
      <button class="btn sm primary" onclick="presetProfession('${p.id}')">Start Interview With Alex</button><a class="btn sm ghost" href="#/professions/${p.id}/skills">View Skills</a></div></div>`;
}
function scrProfessions(){
  App.ui.libGroup=App.ui.libGroup||"Popular";
  el.innerHTML=pageHead("Interview","Profession Library",`${ProfessionLib.all().length} professions in ${PROFESSION_CATEGORIES.length} categories, and you can add your own. Interview practice is available for every profession; that is not the same as a verified AI-work opportunity.`)
  + `<div class="search"><input id="libSearch" type="search" autocomplete="off" placeholder="Search accountant, nurse, carpenter, lawyer, engineer..." aria-label="Search the profession library" value="${H(App.ui.libQ||"")}" oninput="App.ui.libQ=this.value;libRender()"></div>
    <div class="chips" id="libChips">${["Popular"].concat(BROWSE_GROUPS).map(b=>`<button class="chip ${App.ui.libGroup===b?"sel":""}" onclick="App.ui.libGroup='${b}';App.ui.libQ='';document.getElementById('libSearch').value='';scrProfessionsBody()">${H(b)}</button>`).join("")}</div>
    <div id="libBody"></div>
    <div class="card"><div class="row between center wrapw"><div><h3 style="margin:0">Can't find your profession?</h3><div class="small muted">Add it and get a private, dynamic interview profile.</div></div>
      <button class="btn" onclick="App.ui.customOpen=true;App.setup.step=1;saveSetup();go('interview/start')">＋ Add Your Profession</button></div></div>`;
  scrProfessionsBody();
}
function libRender(){ scrProfessionsBody(); }
function scrProfessionsBody(){
  const b=document.getElementById("libBody"); if(!b) return;
  const q=(App.ui.libQ||"").trim();
  document.querySelectorAll("#libChips .chip").forEach(c=>c.classList.toggle("sel", !q && c.textContent===App.ui.libGroup));
  if(q){ const r=ProfessionLib.search(q,{limit:30});
    b.innerHTML=(r.ambiguous?`<div class="note ambig">“${H(r.ambiguous.term)}” can mean ${r.ambiguous.options.map(p=>`<b>${H(p.title)}</b>`).join(" or ")}. Choose the one you mean.</div>`:"")
      +(r.results.length?`<div class="grid g3" id="libCards">${r.results.map(x=>profCard(x.p)).join("")}</div>`:emptyCard("🔎","No match yet",`Nothing matches “${H(q)}”. Add your profession to get a dynamic interview profile.`,"#/interview/start","Add your profession")); return; }
  if(App.ui.libGroup==="Popular"){ const pop=uniq(POPULAR_PROFESSIONS.map(t=>ProfessionLib.search(t,{limit:1}).results[0]).filter(Boolean).map(r=>r.p)); b.innerHTML=`<div class="grid g3" id="libCards">${pop.map(profCard).join("")}</div>`; return; }
  b.innerHTML=ProfessionLib.categoriesIn(App.ui.libGroup).map(c=>{ const list=ProfessionLib.byCategory(c.id); return list.length?`<h3 style="margin:18px 0 8px">${c.icon} ${H(c.label)} <span class="faint small">(${list.length})</span></h3><div class="grid g3">${list.map(profCard).join("")}</div>`:""; }).join("");
}

/* ---------- Profession profile -------------------------------------------- */
function transferableSkillsFor(p){
  const ids=new Set(["domain_knowledge"]);
  (p.core_competencies||[]).forEach(c=>{ const m=INTERVIEW_SKILL.find(([re])=>re.test(c)); if(m) ids.add(m[1]); if(/judg|ethic|risk|safety/.test(c)) ids.add("professional_judgment"); if(/comm|stakeholder|customer|guest/.test(c)) ids.add("communication"); });
  (p.recommended_practice||[]).forEach(cat=>Object.entries(SKILLS).forEach(([k,s])=>{ if(s.cat===cat) ids.add(k); }));
  if(p.status==="transferable"){ ["instruction_following","attention_to_detail","quality_review"].forEach(k=>ids.add(k)); }
  return [...ids].filter(k=>SKILLS[k]).map(k=>SKILLS[k].label);
}
function payBlock(p){
  const y=p.pay; if(!y || y.min==null) return `<p class="small muted">No compensation information is recorded for this profession.</p>`;
  const range=y.min===y.max?`$${y.min}`:`$${y.min}–$${y.max}`, verified=y.status==="verified_current";
  return `<div class="paybox ${verified?"":"unverified"}"><div><b>${verified?"Compensation":"Indicative / unverified range"}:</b> ${range} ${H(y.currency||"")} per ${H(y.period||"")}</div>
    <div class="small faint">Source: ${H(y.source||"unknown")} · Status: ${H(PAY_STATUSES[y.status]||y.status)} · Last verified: ${H(y.last_verified||"never")}${y.notes?` · ${H(y.notes)}`:""}</div>
    ${verified?"":`<div class="small">This is seed data, not a current market rate or a guarantee of earnings. It is never used to recommend a profession.</div>`}</div>`;
}
function scrProfessionProfile(id, sub){
  const p=getProfession(id);
  if(!p){ el.innerHTML=emptyCard("🔎","Profession not found","It may have been removed. Search the library or add your own profession.","#/professions","Profession Library"); return; }
  const types=p.typical_interview_types||allowedTypes(p), rec=recommendedType(p), comps=(p.core_competencies||[]).map(c=>(getComp(p,c)||COMPS[c]||{label:c}).label);
  const prac=(p.recommended_practice||[]).filter(c=>PRACTICE_CATEGORY[c]), inCareer=Repo.careers.all().some(c=>c.professionId===p.id);
  const paths=AI_PATHS.filter(a=>prac.includes(a.cat) || a.skills.some(s=>transferableSkillsFor(p).includes((SKILLS[s]||{}).label)));
  el.innerHTML=`<p class="small"><a href="#/professions">← Profession Library</a></p>`+pageHead(H(catLabel(p)), H(p.title), H(p.description||""))
  + `<div class="card"><div class="row wrapw" style="gap:8px">${statusChip(p)}<span class="badge good">Interview practice: Available</span><span class="badge">Transferable skills: Available</span>
      <span class="badge ${p.opportunities.length?"good":""}">Current AI opportunity: ${p.opportunities.length?"Verified":"Not verified"}</span></div>
      <table class="summary kv" style="margin-top:12px">
        <tr><td>Profession family</td><td>${H(p.profession_family)}</td></tr><tr><td>Category</td><td>${H(catLabel(p))}</td></tr>
        ${(p.aliases||[]).length?`<tr><td>Also known as</td><td>${H(p.aliases.slice(0,8).join(", "))}</td></tr>`:""}
        <tr><td>Specialties</td><td>${(p.specialties||[]).length?H(p.specialties.join(", ")):"None defined (you can still describe your focus to Alex)"}</td></tr>
        <tr><td>Education</td><td>${H(p.education_expectation)}</td></tr><tr><td>Credentials</td><td>${H(p.credential_notes)}</td></tr></table>
      <div class="row wrapw" style="gap:10px;margin-top:14px"><button class="btn primary" onclick="presetProfession('${p.id}')">Start Interview With Alex</button>
        ${inCareer?`<a class="btn" href="#/profile/careers">In My Professions ✓</a>`:`<button class="btn" id="addCareerBtn" onclick="addCareer('${p.id}')">Add to My Professions</button>`}</div></div>
  <div class="grid g2">
    <div class="card" id="profSkills"><h3>Core competencies</h3><div class="feat" style="margin-top:0">${comps.map(c=>`<span>${H(c)}</span>`).join("")}</div>
      <h3 style="margin-top:16px">Transferable AI skills</h3><div class="feat" style="margin-top:0">${transferableSkillsFor(p).map(s=>`<span>${H(s)}</span>`).join("")}</div></div>
    <div class="card"><h3>Typical interview areas</h3><ul class="clean small">${(p.interview_areas||[]).map(a=>`<li>${H(a)}</li>`).join("")}</ul>
      <h3 style="margin-top:14px">Practical tasks</h3><ul class="clean small">${(p.supported_practical_tasks||[]).map(a=>`<li>${H(a)}</li>`).join("")}</ul></div>
    <div class="card"><h3>Recommended interview types</h3><ul class="clean small">${types.map(t=>`<li><b>${H(TYPES[t].label)}</b>${t===rec?` <span class="badge info">Recommended</span>`:""}<br><span class="faint">${H(TYPES[t].why||"")}</span></li>`).join("")}</ul>
      <p class="small faint">The recommendation never forces your choice; you can pick any type above in setup.</p></div>
    <div class="card"><h3>Recommended practice</h3>${prac.length?`<div class="list">${prac.map(c=>`<div class="item"><div class="t small">${PRACTICE_CATEGORY[c].icon} ${H(PRACTICE_CATEGORY[c].label)}</div>${isCategoryAvailable(c)?`<button class="btn sm" onclick="openPracticeSetup('${c}','easy')">Practise</button>`:`<span class="badge ok">Coming soon</span>`}</div>`).join("")}</div>`:`<p class="small muted">No specific practice yet.</p>`}
      <h3 style="margin-top:14px">Potential AI work categories</h3>${paths.length?`<ul class="clean small">${paths.map(a=>`<li>${H(a.label)}</li>`).join("")}</ul>`:`<p class="small muted">None mapped yet.</p>`}
      <p class="small faint">These are categories of AI-evaluation work your skills relate to, not job openings.</p></div>
  </div>
  <div class="card"><h3>Opportunities</h3>${p.opportunities.length?`<h4>Verified Opportunities</h4><ul class="clean small">${p.opportunities.map(o=>`<li>${H(o.title)}${o.verifiedAt?` · verified ${H(o.verifiedAt)}`:""}</li>`).join("")}</ul>`
      :`<p><b>No Current Opportunity Verified</b></p><p class="small muted">Interview IQ lets you practise for this profession. That does not mean a paid AI role currently exists for it. No openings are invented.</p>`}</div>
  <div class="card"><h3>Compensation</h3>${payBlock(p)}</div>`;
  if(sub==="skills") setTimeout(()=>{ const s=document.getElementById("profSkills"); if(s) s.scrollIntoView({block:"start"}); },30);
}

/* ---------- My Professions (multi-career) --------------------------------- */
function addCareer(id, rank){ Repo.careers.add({ professionId:id, rank:rank||"secondary" }); route(); }
function careerStats(id){
  const S=Repo.sessions.completed().filter(s=>s.profession.id===id).map(reportOf), dims={};
  S.forEach(s=>Object.values((s.scores.role||{}).dims||{}).forEach(d=>(dims[d.label]=dims[d.label]||[]).push(d.pct)));
  const R=readinessModel(id);
  return { n:S.length, last:S[0]?S[0].scores.overall:null, avg:S.length?avg(S.map(s=>s.scores.overall)):null, dims:Object.entries(dims).map(([k,v])=>[k,avg(v)]).sort((a,b)=>b[1]-a[1]), readiness:R.overall };
}
function scrCareers(){
  const list=Repo.careers.all().map(c=>({ c, p:getProfession(c.professionId) })).filter(x=>x.p), det=ProfessionLib.detectFromCV().filter(d=>!d.already);
  el.innerHTML=pageHead("Profile","My Professions","Keep every professional background you have. Each one keeps its own experience, interview scores and readiness; nothing is merged into a single score.")+tabs(PROFILE_TABS,"#/profile/careers")
  + (det.length?`<div class="card" id="cvDetect"><h3>Detected from your confirmed CV</h3><p class="small muted">Add these to my Professional Profile? Nothing is added until you choose.</p>
      <div class="picks">${det.map((d,i)=>`<label class="pick"><input type="checkbox" name="cvprof" value="${i}" ${d.professionId&&!d.approx?"checked":""} ${d.professionId?"":"disabled"}> <span><b>${H(d.professionTitle||d.cvTitle)}</b> <span class="faint small">· from “${H(clip(d.source,80))}”${d.approx?` · closest match for “${H(d.cvTitle)}”, tick only if it fits`:""}${d.professionId?"":" · not in the library: add it as your own profession"}</span></span></label>`).join("")}</div>
      <button class="btn primary" style="margin-top:10px" id="cvDetectAdd" onclick="addDetected()">Add selected to My Professions</button></div>`:"")
  + (list.length?list.map(({c,p})=>{ const st=careerStats(p.id); return `<div class="card career" data-career="${p.id}">
      <div class="row between center wrapw"><div><h3 style="margin:0">${H(p.title)}</h3><div class="small faint">${H(catLabel(p))}${c.specialty?` · ${H(c.specialty)}`:""}</div></div>
        <select aria-label="Rank" onchange="Repo.careers.update('${p.id}',{rank:this.value});scrCareers()">${["primary","secondary","additional"].map(r=>`<option value="${r}" ${c.rank===r?"selected":""}>${r[0].toUpperCase()+r.slice(1)}</option>`).join("")}</select></div>
      <div class="grid g4" style="margin-top:12px">
        <div class="mini"><div class="l">Years experience</div><input aria-label="Years experience for ${H(p.title)}" value="${H(c.years||"")}" placeholder="e.g. 6" maxlength="12" onchange="Repo.careers.update('${p.id}',{years:this.value})"></div>
        <div class="mini"><div class="l">Interviews</div><div class="v">${st.n}</div></div>
        <div class="mini"><div class="l">Interview score</div><div class="v">${st.last!=null?st.last+" (avg "+st.avg+")":"–"}</div></div>
        <div class="mini"><div class="l">Domain readiness</div><div class="v">${st.readiness!=null?st.readiness:"–"}</div></div></div>
      ${st.dims.length?`<div class="small muted" style="margin-top:8px">Skill evidence: ${st.dims.slice(0,4).map(([k,v])=>`${H(k)} ${v}%`).join(" · ")}</div>`:`<div class="small faint" style="margin-top:8px">No interviews for this profession yet.</div>`}
      <div class="row wrapw" style="gap:8px;margin-top:12px"><button class="btn sm primary" onclick="presetProfession('${p.id}','${H(c.specialty||"")}')">Interview as ${H(p.title)}</button>
        <a class="btn sm" href="#/professions/${p.id}">Profession profile</a><button class="btn sm ghost" onclick="if(confirm('Remove ${H(p.title)} from My Professions?')){Repo.careers.remove('${p.id}');scrCareers()}">Remove</button></div></div>`; }).join("")
    : emptyCard("🧭","No professions saved yet","Add every profession you've worked in. You choose which one Alex uses for each interview.","",""))
  + `<div class="card"><h3>Add a profession</h3><div class="search"><input id="careerSearch" type="search" placeholder="Search accountant, nurse, carpenter, lawyer, engineer..." aria-label="Search professions to add" oninput="careerSearch(this.value)"></div><div id="careerResults"></div>
      <p class="small faint">Not listed? <a href="javascript:void(0)" onclick="App.ui.customOpen=true;App.setup.step=1;saveSetup();go('interview/start')">Add your profession</a> and it will appear here.</p></div>`;
}
function careerSearch(q){
  const r=ProfessionLib.search(q,{limit:8}), have=new Set(Repo.careers.all().map(c=>c.professionId)), box=document.getElementById("careerResults");
  if(box) box.innerHTML=!q.trim()?"":r.results.length?`<div class="list">${r.results.map(x=>`<div class="item"><div class="t small">${H(x.p.title)} <span class="faint">· ${H(catLabel(x.p))}</span></div>${have.has(x.p.id)?`<span class="badge good">Added</span>`:`<button class="btn sm" onclick="Repo.careers.add({professionId:'${x.p.id}',specialty:'${H(x.specialty||"")}'});scrCareers()">Add</button>`}</div>`).join("")}</div>`:`<p class="small muted">No match. Add it as your own profession.</p>`;
}
function addDetected(){
  const det=ProfessionLib.detectFromCV().filter(d=>!d.already);
  [...document.querySelectorAll("input[name=cvprof]:checked")].forEach(x=>{ const d=det[+x.value]; if(d && d.professionId) Repo.careers.add({ professionId:d.professionId, source:"cv" }); });
  scrCareers();
}
