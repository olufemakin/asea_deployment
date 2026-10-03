/* =============================================================================
   Local Content Studio (admin) — #/admin, not linked from public navigation.

   Interview IQ has no server and no accounts, so there is no secure server-side admin
   identity. This studio therefore never changes the public site: every edit is stored
   only in THIS browser (Repo.interviewBank, Repo.bankOverrides, Repo.roleOverrides,
   Repo.alexSettings) and can be exported as JSON for the site owner to review and commit
   to the repository. A local PIN keeps casual users of a shared device out; it is not
   security against someone who controls the device.
   ========================================================================== */
"use strict";

async function adminHash(s){
  try{ const b=await crypto.subtle.digest("SHA-256", new TextEncoder().encode("bsp-studio|"+s)); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join(""); }
  catch(e){ let h=5381; for(const c of "bsp-studio|"+s) h=((h<<5)+h+c.charCodeAt(0))>>>0; return "x"+h.toString(16); }
}
const ADMIN_TABS=[["questions","Question Manager"],["generator","Question Generator"],["roles","Professions"],["alex","Alex Settings"],["data","Export / Import"]];
function scrAdmin(tab){
  if(!App.adminUnlocked){ el.innerHTML=adminGateHTML(); return; }
  tab=tab||"questions"; App.adm=App.adm||{ bank:"interview", f:{}, page:0, edit:null };
  if(tab==="roles"){ App.adm.bulk=false; App.adm.role=null; }   // entering the tab from navigation always shows the list
  el.innerHTML=pageHead("Local Content Studio","Admin · this device only",`Edits here are saved only in this browser and never change the public site. Export them as JSON for the site owner to review and publish in the repository.`)
    +`<nav class="tabs" aria-label="Studio">${ADMIN_TABS.map(([k,l])=>`<a href="#/admin/${k}" class="${k===tab?"active":""}">${l}</a>`).join("")}<a href="javascript:void(0)" onclick="adminLock()">Lock studio</a></nav><div id="admBody"></div>`;
  ({ questions:admQuestions, generator:admGenerator, roles:admRoles, alex:admAlex, data:admData })[tab] ? ({ questions:admQuestions, generator:admGenerator, roles:admRoles, alex:admAlex, data:admData })[tab]() : go("admin");
}
function adminGateHTML(){
  const has=!!Repo.admin.get().pinHash;
  return pageHead("Local Content Studio","Admin access","")+`<div class="card" style="max-width:640px">
    <p class="small muted">This area manages questions, roles and ${H(ALEX.name)}'s settings <b>for this browser only</b>. Interview IQ has no server-side admin accounts, so nothing here can change what other people see. To publish changes for everyone, export them and have the site owner commit them to the repository.</p>
    ${has?`<label class="fld" for="admPin">Studio PIN</label><input id="admPin" type="password" autocomplete="current-password" onkeydown="if(event.key==='Enter')adminUnlock()">`
      :`<label class="fld" for="admPin">Create a studio PIN for this device (4+ characters)</label><input id="admPin" type="password" autocomplete="new-password">
        <label class="pick" style="margin-top:10px"><input type="checkbox" id="admAck"> <span>I understand changes stay in this browser and do not change the public site.</span></label>`}
    <div id="admErr" class="small" role="alert" style="color:#ffb4b4;margin-top:8px"></div>
    <div class="row wrapw" style="gap:10px;margin-top:12px"><button class="btn primary" id="admEnter" onclick="adminUnlock()">${has?"Unlock":"Create PIN and enter"}</button><a class="btn ghost" href="#/">Back to home</a></div></div>`;
}
async function adminUnlock(){
  const pin=(document.getElementById("admPin")||{}).value||"", err=m=>{ const e=document.getElementById("admErr"); if(e) e.textContent=m; }, cur=Repo.admin.get().pinHash;
  if(pin.length<4){ err("The PIN needs at least 4 characters."); return; }
  if(!cur){ if(!(document.getElementById("admAck")||{}).checked){ err("Please confirm you understand changes stay in this browser."); return; } Repo.admin.set({ pinHash:await adminHash(pin) }); }
  else if(await adminHash(pin)!==cur){ err("That PIN doesn't match."); return; }
  App.adminUnlocked=true; route();
}
function adminLock(){ App.adminUnlocked=false; go("admin"); }
const admSel=(id, opts, cur, onch, label)=>`<label class="fld small" for="${id}">${label}</label><select id="${id}" onchange="${onch}">${opts.map(([v,l])=>`<option value="${H(v)}" ${String(cur)===String(v)?"selected":""}>${H(l)}</option>`).join("")}</select>`;
const STATUS_BADGE={ draft:"", review:"info", published:"good", archived:"bad", legacy:"" };
function admBody(h){ const b=document.getElementById("admBody"); if(b) b.innerHTML=h; }

/* ---------- Question Manager --------------------------------------------- */
function admFilter(k, v){ App.adm.f[k]=v; App.adm.page=0; admQuestions(); }
function admQuestions(){
  const A=App.adm, f=A.f, iv=A.bank==="interview";
  if(A.edit) return admEditForm();
  const profOpts=[["","All professions"]].concat(PROFESSIONS.slice().sort((a,b)=>a.title.localeCompare(b.title)).map(p=>[p.id,p.title]));
  const catOpts=[["","All categories"]].concat(PRACTICE_CATEGORIES.map(c=>[c.id,c.label]));
  let rows = iv ? InterviewBank.all() : QuestionBank.all().map(q=>Object.assign({}, q, { question:q.prompt||q.scenario||"", profession:(PRACTICE_CATEGORY[q.category]||{}).label }));
  if(iv && f.prof) rows=rows.filter(r=>(r.professions||[]).includes(f.prof) || /^All professions/.test(r.profession||"") || (r.professions||[]).includes("*"));
  if(!iv && f.cat) rows=rows.filter(r=>r.category===f.cat);
  if(f.comp) rows=rows.filter(r=>iv ? r.competency===f.comp : (r.competencies||[]).includes(f.comp));
  if(f.diff) rows=rows.filter(r=>String(r.difficulty)===String(f.diff));
  if(f.type) rows=rows.filter(r=>r.questionType===f.type);
  if(f.status) rows=rows.filter(r=>r.status===f.status);
  if(f.q) rows=rows.filter(r=>fold((r.question||"")+" "+r.id).includes(fold(f.q)));
  const comps=iv ? uniq(InterviewBank.all().map(r=>r.competency)).filter(c=>COMPS[c]).sort() : Object.keys(PRACTICE_COMPETENCIES).sort();
  const types=iv ? IQ_TYPES : uniq(QuestionBank.all().map(q=>q.questionType));
  const per=25, pages=Math.max(1,Math.ceil(rows.length/per)), page=Math.min(A.page,pages-1), list=rows.slice(page*per, page*per+per);
  admBody(`<div class="card"><div class="row wrapw" style="gap:8px;margin-bottom:10px">
      <button class="btn sm ${iv?"primary":""}" onclick="App.adm.bank='interview';App.adm.f={};admQuestions()">Interview bank</button>
      <button class="btn sm ${iv?"":"primary"}" onclick="App.adm.bank='practice';App.adm.f={};admQuestions()">Practice bank</button>
      ${iv?`<button class="btn sm good" id="admCreate" onclick="admNew()">+ Create Question</button>`:`<span class="small faint">Practice questions need answer keys: create new ones by duplicating and editing an existing question.</span>`}</div>
    <div class="grid g3 admfilters">
      <div>${iv?admSel("fProf",profOpts,f.prof||"","admFilter('prof',this.value)","Profession"):admSel("fCat",catOpts,f.cat||"","admFilter('cat',this.value)","Category")}</div>
      <div>${admSel("fComp",[["","All competencies"]].concat(comps.map(c=>[c,competencyName(c)])),f.comp||"","admFilter('comp',this.value)","Competency")}</div>
      <div>${admSel("fDiff",[["","All difficulties"]].concat(iv?[["1","1 · Easy"],["2","2 · Medium"],["3","3 · Hard"]]:[["easy","Easy"],["medium","Medium"],["hard","Hard"]]),f.diff||"","admFilter('diff',this.value)","Difficulty")}</div>
      <div>${admSel("fType",[["","All types"]].concat(types.map(t=>[t,QTYPE_LABEL[t]||t])),f.type||"","admFilter('type',this.value)","Type")}</div>
      <div>${admSel("fStatus",[["","All statuses"]].concat((iv?IQ_STATUSES:QUESTION_STATUSES).map(s=>[s,s.toUpperCase()])),f.status||"","admFilter('status',this.value)","Status")}</div>
      <div><label class="fld small" for="fQ">Search</label><input id="fQ" value="${H(f.q||"")}" onchange="admFilter('q',this.value)" placeholder="Text or id"></div></div>
    <div class="small muted" style="margin:10px 0" id="admCount">${rows.length} question${rows.length===1?"":"s"} · page ${page+1} of ${pages}</div>
    <div class="list" id="admList">${list.map(r=>`<div class="item admrow" data-id="${H(r.id)}"><div class="grow"><div class="t small">${H(clip(r.question||"(no text)",160))}</div>
      <div class="m faint">${H(r.id)} · ${H(r.profession||"")} · ${H(iv?competencyName(r.competency):(r.competencies||[]).map(competencyName).join(", "))} · ${H(r.difficulty)} · ${H(QTYPE_LABEL[r.questionType]||r.questionType)} · v${H(r.version)}${iv?` · used ${r.timesUsed}×`:""}</div></div>
      <span class="badge ${STATUS_BADGE[r.status]||""}">${H(String(r.status).toUpperCase())}</span>
      <div class="row wrapw" style="gap:6px"><button class="btn sm" onclick="admEdit('${H(r.id)}')">Edit</button><button class="btn sm" onclick="admDup('${H(r.id)}')">Duplicate</button>
        ${r.status!=="published"&&r.status!=="legacy"?`<button class="btn sm good" onclick="admStatus('${H(r.id)}','published')">Publish</button>`:""}${r.status==="draft"?`<button class="btn sm" onclick="admStatus('${H(r.id)}','review')">Send to review</button>`:""}
        ${r.status!=="archived"&&r.status!=="legacy"?`<button class="btn sm ghost" onclick="admStatus('${H(r.id)}','archived')">Archive</button>`:""}</div></div>`).join("")||`<p class="small muted">No questions match these filters.</p>`}</div>
    <div class="row wrapw" style="gap:8px;margin-top:12px">${page>0?`<button class="btn sm" onclick="App.adm.page=${page-1};admQuestions()">← Previous</button>`:""}${page<pages-1?`<button class="btn sm" onclick="App.adm.page=${page+1};admQuestions()">Next →</button>`:""}</div></div>`);
}
function admStatus(id, status){
  if(App.adm.bank==="interview") InterviewBank.setStatus(id, status);
  else { const q=QuestionBank.get(id); if(q){ const prev=Repo.bankOverrides.all()[id]; if(prev && prev.__admin) Repo.bankOverrides.set(id, Object.assign(prev,{ status })); else Repo.bankOverrides.set(id, { status }); QuestionBank.reset(); } }
  admQuestions();
}
function admDup(id){
  if(App.adm.bank==="interview"){ const c=InterviewBank.duplicate(id); App.adm.edit=c&&c.id; return admQuestions(); }
  const q=QuestionBank.get(id); if(!q) return;
  const nid=q.category.split("_").map(x=>x[0]).join("")+"-adm-"+Date.now().toString(36);
  const raw={ category:q.category, fmt:q.fmt, d:q.d, prompt:q.prompt, material:q.material, options:(q.options||[]).map((o,i)=>q.optionKinds&&q.optionKinds[i]?[o,q.optionKinds[i]]:o), answer:q.answer, checks:q.checks, sig:q.sig, model:q.model, flags:q.flags, focus:q.focus, status:"draft", source:"admin (copy of "+id+")", version:"1.0", __admin:true };
  Repo.bankOverrides.set(nid, JSON.parse(JSON.stringify(raw))); QuestionBank.reset(); App.adm.edit=nid; admQuestions();
}
function admNew(){
  const id="adm-"+Date.now().toString(36);
  Repo.interviewBank.set(id, { id, admin:true, source:"admin", status:"draft", version:"1.0", professions:["*"], profession:"All professions", competency:"judgment", difficulty:2, questionType:"scenario",
    question:"", scenario:"", referenceMaterial:"", expectedSignals:[], commonErrors:[], rubric:"", followUpRules:followUpsFor("scenario") });
  App.adm.edit=id; admQuestions();
}
function admEdit(id){ App.adm.edit=id; admQuestions(); }
function admEditForm(){
  const iv=App.adm.bank==="interview", id=App.adm.edit;
  const r=iv?InterviewBank.get(id):QuestionBank.get(id);
  if(!r){ App.adm.edit=null; return admQuestions(); }
  const ta=(k,l,v,rows)=>`<label class="fld" for="e_${k}">${l}</label><textarea id="e_${k}" rows="${rows||3}">${H(Array.isArray(v)?v.join(iv&&k!=="followUpRules"?", ":"\n"):v||"")}</textarea>`;
  if(!iv) return admBody(`<div class="card"><h2>Edit practice question <span class="faint small">${H(id)}</span></h2>
    <p class="small muted">Category, format and answer key are fixed. Edits create a new version; completed sessions keep their own snapshot.</p>
    ${ta("prompt","Prompt",r.prompt)}${ta("explanation","Explanation / strong example",r.model,4)}
    ${admSel("e_status",QUESTION_STATUSES.map(s=>[s,s.toUpperCase()]),r.status,"","Status")}
    <div class="row wrapw" style="gap:10px;margin-top:14px"><button class="btn primary" onclick="admSavePractice('${H(id)}')">Save</button><button class="btn ghost" onclick="App.adm.edit=null;admQuestions()">Cancel</button></div></div>`);
  const builtIn=!r.admin, profOpts=[["*","All professions"]].concat(PROFESSIONS.map(p=>[p.id,p.title]));
  admBody(`<div class="card" id="admForm"><h2>${r.question?"Edit":"Create"} interview question <span class="faint small">${H(id)} · v${H(r.version)}</span></h2>
    ${builtIn?`<p class="small muted">Built-in question: profession, competency and type are fixed. Text, signals, rubric, difficulty and status can be edited.</p>`:""}
    <div class="grid g2">
      <div>${builtIn?`<label class="fld">Profession</label><div class="small">${H(r.profession)}</div>`:admSel("e_prof",profOpts,(r.professions||["*"])[0],"","Profession")}</div>
      <div>${builtIn?`<label class="fld">Competency</label><div class="small">${H(competencyName(r.competency))}</div>`:admSel("e_comp",Object.values(COMPS).map(c=>[c.id,c.label]).sort((a,b)=>a[1].localeCompare(b[1])),r.competency,"","Competency")}</div>
      <div>${admSel("e_diff",[["1","1 · Easy"],["2","2 · Medium"],["3","3 · Hard"]],r.difficulty,"","Difficulty")}</div>
      <div>${builtIn?`<label class="fld">Question type</label><div class="small">${H(QTYPE_LABEL[r.questionType]||r.questionType)}</div>`:admSel("e_type",IQ_TYPES.map(t=>[t,QTYPE_LABEL[t]]),r.questionType,"","Question type")}</div></div>
    ${ta("scenario","Scenario (optional)",r.scenario)}${ta("question","Question *",r.question,3)}${ta("referenceMaterial","Reference material (optional)",r.referenceMaterial,2)}
    ${ta("expectedSignals","Expected strong signals (comma-separated)",r.expectedSignals,2)}${ta("commonErrors","Common errors / weaknesses (comma-separated)",r.commonErrors,2)}
    ${ta("rubric","Rubric (0–4)",r.rubric,5)}${ta("followUpRules","Follow-up rules (one per line)",r.followUpRules,3)}
    ${admSel("e_status",IQ_STATUSES.map(s=>[s,s.toUpperCase()]),r.status,"","Status")}
    <div id="admFormErr" class="small" role="alert" style="color:#ffb4b4;margin-top:8px"></div>
    <div class="row wrapw" style="gap:10px;margin-top:14px"><button class="btn primary" id="admSave" onclick="admSave('${H(id)}')">Save</button><button class="btn ghost" onclick="App.adm.edit=null;admQuestions()">Cancel</button></div></div>`);
}
function admSave(id){
  const v=k=>((document.getElementById("e_"+k)||{}).value||"").trim(), list=s=>s.split(/[,\n]+/).map(x=>x.trim()).filter(Boolean);
  const r=InterviewBank.get(id); if(!r) return;
  if(v("question").length<15){ document.getElementById("admFormErr").textContent="Write the question (at least 15 characters)."; return; }
  const upd=Object.assign({}, r, { question:v("question"), scenario:v("scenario"), referenceMaterial:v("referenceMaterial"), expectedSignals:list(v("expectedSignals")), commonErrors:list(v("commonErrors")),
    rubric:v("rubric")||rubric4(list(v("expectedSignals")), r.questionType), followUpRules:v("followUpRules").split(/\n+/).filter(Boolean), difficulty:+v("diff")||2, status:v("status")||"draft" });
  if(r.admin){ const pid=v("prof")||"*"; Object.assign(upd, { professions:[pid], profession:pid==="*"?"All professions":(PROF[pid]||{}).title||pid, competency:v("comp")||r.competency, questionType:v("type")||r.questionType }); }
  if(upd.status==="published" && !upd.expectedSignals.length){ document.getElementById("admFormErr").textContent="Add expected strong signals before publishing; the scorer needs them."; return; }
  InterviewBank.save(upd); App.adm.edit=null; admQuestions();
}
function admSavePractice(id){
  const v=k=>((document.getElementById("e_"+k)||{}).value||"").trim(), o=Repo.bankOverrides.all()[id]||{};
  const ver=(QuestionBank.get(id)||{}).version||"1.0", p=String(ver).split(".");
  Repo.bankOverrides.set(id, Object.assign(o, { prompt:v("prompt"), model:v("explanation"), status:v("status"), version:`${p[0]}.${(+p[1]||0)+1}` }));
  QuestionBank.reset(); App.adm.edit=null; admQuestions();
}

/* ---------- Question Generator -------------------------------------------- */
function admGenerator(){
  const g=App.adm.gen=App.adm.gen||{ prof:"project-manager", comp:"", diff:"2", type:"scenario", count:"3", drafts:null, err:"" };
  const p=getProfession(g.prof), pcomps=p?uniq(profComps(p).concat(p.ai?[p.ai]:[])).filter(id=>getComp(p,id)):[];
  if(!g.comp || !pcomps.includes(g.comp)) g.comp=pcomps[0]||"";
  admBody(`<div class="card"><h2>Question generator</h2><p class="small muted">Creates ORIGINAL draft questions from BSP templates and the competency library (no external AI service). Drafts are never published automatically: review and publish them in the Question Manager.</p>
    <div class="grid g3">
      <div>${admSel("gProf",PROFESSIONS.slice().sort((a,b)=>a.title.localeCompare(b.title)).map(x=>[x.id,x.title]),g.prof,"App.adm.gen.prof=this.value;App.adm.gen.comp='';admGenerator()","Profession")}</div>
      <div>${admSel("gComp",pcomps.map(id=>[id,getComp(p,id).label]),g.comp,"App.adm.gen.comp=this.value","Competency")}</div>
      <div>${admSel("gDiff",[["1","1 · Easy"],["2","2 · Medium"],["3","3 · Hard"]],g.diff,"App.adm.gen.diff=this.value","Difficulty")}</div>
      <div>${admSel("gType",IQ_TYPES.map(t=>[t,QTYPE_LABEL[t]]),g.type,"App.adm.gen.type=this.value","Question type")}</div>
      <div>${admSel("gCount",[1,2,3,4,5,6,8,10].map(n=>[n,n+" draft"+(n>1?"s":"")]),g.count,"App.adm.gen.count=this.value","Number of draft questions")}</div>
      <div style="align-self:end"><button class="btn primary" id="genBtn" onclick="admGenerate()">Generate drafts</button></div></div>
    ${g.err?`<div class="voicebox err-box" role="alert" style="margin-top:12px"><b>Question generation failed.</b><p class="small muted">${H(g.err)}</p><button class="btn sm" onclick="App.adm.gen.err='';admGenerator()">Try again</button></div>`:""}</div>
  ${g.drafts?`<div class="card" id="genDrafts"><div class="row between center wrapw"><h2 style="margin:0">${g.drafts.length} draft${g.drafts.length>1?"s":""} · status DRAFT</h2><div class="row" style="gap:8px"><button class="btn good" id="genSave" onclick="admSaveDrafts()">Save as drafts</button><button class="btn ghost" onclick="App.adm.gen.drafts=null;admGenerator()">Discard</button></div></div>
    ${g.drafts.map((d,i)=>`<div class="qresult"><div class="qmeta">Draft ${i+1} · ${H(QTYPE_LABEL[d.questionType])} · difficulty ${d.difficulty} · ${H(competencyName(d.competency))}</div>
      <div class="rv"><b>Question</b><div>${H(fillTokens(d.question, getProfession(g.prof)))}</div></div>${d.scenario?`<div class="rv"><b>Scenario</b><div>${H(d.scenario)}</div></div>`:""}
      <div class="grid g2 rvgrid"><div><b>Expected strong signals</b><div class="small">${H(d.expectedSignals.join(", "))}</div></div><div><b>Common weaknesses</b><div class="small">${H(d.commonErrors.join("; "))}</div></div></div>
      <div class="rv"><b>Rubric</b><pre class="small rubricpre">${H(d.rubric)}</pre></div><div class="rv"><b>Suggested follow-ups</b><ul class="tips small">${d.followUpRules.map(x=>`<li>${H(x)}</li>`).join("")}</ul></div></div>`).join("")}</div>`:""}`);
}
function admGenerate(){
  const g=App.adm.gen;
  try{ g.drafts=generateDrafts({ professionId:g.prof, competency:g.comp, difficulty:g.diff, type:g.type, count:g.count }); g.err=""; }
  catch(e){ g.drafts=null; g.err=e.message||"Unknown error."; }
  admGenerator();
}
function admSaveDrafts(){ const g=App.adm.gen; (g.drafts||[]).forEach(d=>Repo.interviewBank.set(d.id, Object.assign({}, d, { status:"draft" }))); const n=(g.drafts||[]).length; g.drafts=null;
  App.adm.bank="interview"; App.adm.f={ status:"draft" }; go("admin/questions"); setTimeout(()=>{ const c=document.getElementById("admCount"); if(c) c.textContent+=` · ${n} new draft${n>1?"s":""} saved`; },30); }

/* ---------- Role Manager -------------------------------------------------- */
function admRoles(){
  const A=App.adm; A.role=A.role||null;
  if(A.role) return admRoleForm(A.role);
  if(A.bulk) return admBulk();
  const q=fold(A.roleQ||""), cat=A.roleCat||"", st=A.roleStatus||"";
  const ov=Repo.roleOverrides.all();
  const list=PROFESSIONS.filter(p=>(!q||fold(p.title+" "+(p.aliases||[]).join(" ")+" "+(p.kw||"")).includes(q)) && (!cat||p.category===cat) && (!st||p.status===st)).sort((a,b)=>a.title.localeCompare(b.title));
  admBody(`<div class="card"><div class="row between center wrapw"><h2 style="margin:0">Professions</h2>
      <div class="row wrapw" style="gap:8px"><button class="btn sm good" id="admProfAdd" onclick="admRoleNew()">+ Add Profession</button><button class="btn sm" id="admBulkBtn" onclick="App.adm.bulk=true;admRoles()">Bulk import</button></div></div>
    <p class="small muted">${PROFESSIONS.length} profession records (${PROFESSIONS.filter(p=>p.status==="archived").length} archived). Professions come from configuration plus the changes saved here; no application code is needed to add one.</p>
    <div class="grid g3 admfilters">
      <div><label class="fld small" for="rq">Search</label><input id="rq" placeholder="Search professions" aria-label="Search professions" value="${H(A.roleQ||"")}" oninput="App.adm.roleQ=this.value;clearTimeout(window.__rq);window.__rq=setTimeout(admRoles,200)"></div>
      <div>${admSel("rCat",[["","All categories"]].concat(PROFESSION_CATEGORIES.map(c=>[c.id,c.label])),cat,"App.adm.roleCat=this.value;admRoles()","Category")}</div>
      <div>${admSel("rStatus",[["","All statuses"]].concat(Object.entries(PROFESSION_STATUSES)),st,"App.adm.roleStatus=this.value;admRoles()","Status")}</div></div>
    <div class="small faint" style="margin:8px 0" id="admProfCount">${list.length} shown${list.length>60?" (first 60)":""}</div>
    <div class="list">${list.slice(0,60).map(p=>`<div class="item"><div><div class="t">${H(p.title)} ${statusChip(p)} ${ov[p.id]?`<span class="badge info">Edited locally</span>`:""}</div><div class="m faint">${H((PCAT[p.category]||{}).label||"")} · ${H(p.profession_family||"")} · ${profComps(p).length} competencies · recommended: ${H((TYPES[recommendedType(p)]||{}).label||"")}</div></div>
      <button class="btn sm" onclick="App.adm.role='${p.id}';admRoles()">Edit</button></div>`).join("")}</div></div>`);
}
function admRoleNew(){ const t=prompt("New profession name:"); if(!t||t.trim().length<3) return; const id="admin-"+slug(t).slice(0,40);
  if(PROF[id]||ProfessionLib.find(t)){ alert("A profession with this name already exists. Edit it, or add this name as an alias."); return; }
  Repo.roleOverrides.set(id, { admin:true, title:t.trim(), category:"other", family:"generalist" }); applyRoleOverrides(); App.adm.role=id; admRoles(); }
function admRoleForm(id){
  const p=PROF[id]; if(!p){ App.adm.role=null; return admRoles(); }
  const W=Object.assign(Object.fromEntries(Object.entries(ROLE_DIMS).map(([k,d])=>[k,d.w])), p.roleWeights||{}), y=p.pay||{};
  const opp=(p.opportunities||[]).map(o=>[o.title,o.url||"",o.verifiedAt||""].join(" | ")).join("\n");
  admBody(`<div class="card" id="roleForm"><h2>${H(p.title)} <span class="faint small">${H(id)}</span></h2>
    <div class="grid g2"><div><label class="fld" for="r_title">Profession name</label><input id="r_title" value="${H(p.title)}"></div>
      <div><label class="fld" for="r_display">Display name</label><input id="r_display" value="${H(p.display_name||p.title)}"></div>
      <div>${admSel("r_category",PROFESSION_CATEGORIES.map(c=>[c.id,c.label]),p.category,"","Category")}</div>
      <div>${admSel("r_family",Object.values(PROFESSION_FAMILIES).map(f=>[f.id,f.label]),p.family,"","Profession family (template)")}</div>
      <div>${admSel("r_group",GROUPS.map(g=>[g.id,g.label]),p.group,"","Engine group (item set & AI competency)")}</div>
      <div>${admSel("r_status",Object.entries(PROFESSION_STATUSES),p.status,"","Status (Archived = not selectable)")}</div></div>
    <label class="fld" for="r_desc">Description</label><textarea id="r_desc" rows="2">${H(p.description||"")}</textarea>
    <label class="fld" for="r_kw">Aliases (comma-separated)</label><input id="r_kw" value="${H((p.aliases||[]).join(", "))}">
    <label class="fld" for="r_spec">Specialties (comma-separated)</label><input id="r_spec" value="${H((p.specialties||[]).join(", "))}">
    <label class="fld" for="r_comps">Competencies (ids, comma-separated)</label><input id="r_comps" list="compIds" value="${H(profComps(p).join(", "))}">
    <datalist id="compIds">${Object.keys(COMPS).map(c=>`<option value="${c}">${H(COMPS[c].label)}</option>`).join("")}</datalist>
    <label class="fld">Interview types</label><div class="picks">${Object.entries(TYPES).map(([k,t])=>`<label class="pick"><input type="checkbox" name="r_types" value="${k}" ${allowedTypes(p).includes(k)?"checked":""}> <span>${H(t.label)}</span></label>`).join("")}</div>
    <div>${admSel("r_rec",Object.entries(TYPES).map(([k,t])=>[k,t.label]),recommendedType(p),"","Recommended interview type (never forced)")}</div>
    <label class="fld" for="r_tasks">Practical task types (comma-separated)</label><input id="r_tasks" value="${H((p.supported_practical_tasks||[]).join(", "))}">
    <label class="fld">Question concepts</label><div class="picks">${CONCEPTS.map(c=>`<label class="pick"><input type="checkbox" name="r_concepts" value="${c.id}" ${!p.concepts||p.concepts.includes(c.id)?"checked":""}> <span>${H(c.label)} (${c.variants.length} variants)</span></label>`).join("")}</div>
    <label class="fld">Scoring weights (BSP Role Interview Score)</label><div class="grid g3">${Object.entries(ROLE_DIMS).map(([k,d])=>`<div><label class="small" for="w_${k}">${H(d.label)}</label><input id="w_${k}" type="number" min="0" max="100" value="${W[k]}"></div>`).join("")}</div>
    <h3 style="margin-top:16px">Pay information &amp; verification</h3>
    <div class="grid g3"><div><label class="small" for="pay_min">Min</label><input id="pay_min" type="number" value="${H(y.min==null?"":y.min)}"></div><div><label class="small" for="pay_max">Max</label><input id="pay_max" type="number" value="${H(y.max==null?"":y.max)}"></div>
      <div><label class="small" for="pay_cur">Currency</label><input id="pay_cur" value="${H(y.currency||"")}" placeholder="USD"></div>
      <div>${admSel("pay_period",[["","—"],["hour","Hourly"],["project","Project"],["year","Salary (yearly)"]],y.period||"","","Type")}</div>
      <div>${admSel("pay_status",Object.entries(PAY_STATUSES),y.status||"unknown","","Verification status")}</div>
      <div><label class="small" for="pay_ver">Last verified (YYYY-MM-DD)</label><input id="pay_ver" value="${H(y.last_verified||"")}"></div></div>
    <label class="small" for="pay_src">Source</label><input id="pay_src" value="${H(y.source||"")}"><label class="small" for="pay_notes">Notes</label><input id="pay_notes" value="${H(y.notes||"")}">
    <h3 style="margin-top:16px">Verified opportunities</h3><p class="small faint">Only add opportunities you have verified. One per line: title | link | verified date.</p>
    <textarea id="r_opps" rows="2">${H(opp)}</textarea>
    <div id="roleErr" class="small" role="alert" style="color:#ffb4b4;margin-top:8px"></div>
    <div class="row wrapw" style="gap:10px;margin-top:14px"><button class="btn primary" id="roleSave" onclick="admRoleSave('${id}')">Save</button><button class="btn ghost" onclick="App.adm.role=null;admRoles()">Cancel</button>
      ${p.status!=="archived"?`<button class="btn" onclick="admRoleArchive('${id}')">Archive</button>`:""}
      ${Repo.roleOverrides.all()[id]?`<button class="btn danger" onclick="admRoleReset('${id}')">Discard local changes</button>`:""}</div></div>`);
}
function admRoleSave(id){
  const v=k=>((document.getElementById(k)||{}).value||"").trim(), err=m=>{ document.getElementById("roleErr").textContent=m; }, list=x=>x.split(/\s*,\s*/).filter(Boolean);
  const comps=v("r_comps").split(/[,\s]+/).filter(Boolean), bad=comps.filter(c=>!COMPS[c]);
  if(bad.length){ err("Unknown competency ids: "+bad.join(", ")); return; }
  if(comps.length<2){ err("Choose at least two competencies."); return; }
  const types=[...document.querySelectorAll('input[name=r_types]:checked')].map(x=>x.value); if(!types.length){ err("Choose at least one interview type."); return; }
  const rec=v("r_rec"); if(!types.includes(rec)){ err("The recommended type must be one of the selected interview types."); return; }
  const concepts=[...document.querySelectorAll('input[name=r_concepts]:checked')].map(x=>x.value);
  const roleWeights=Object.fromEntries(Object.keys(ROLE_DIMS).map(k=>[k, Math.max(0,Math.min(100,+v("w_"+k)||0))]));
  const num=x=>x===""?null:+x, pay={ min:num(v("pay_min")), max:num(v("pay_max")), currency:v("pay_cur")||null, period:v("pay_period")||null, source:v("pay_src")||null, last_verified:v("pay_ver")||null, status:v("pay_status")||"unknown", notes:v("pay_notes") };
  if(pay.status==="verified_current" && (!pay.source || !pay.last_verified)){ err("“Verified current” pay needs a source and a last-verified date."); return; }
  const opportunities=v("r_opps").split(/\n+/).map(l=>l.split("|").map(x=>x.trim())).filter(a=>a[0]).map(([title,url,verifiedAt])=>({ title, url, verifiedAt }));
  if(opportunities.some(o=>!o.verifiedAt)){ err("Each opportunity needs a verified date (only verified opportunities may be listed)."); return; }
  const prev=Repo.roleOverrides.all()[id]||{};
  Repo.roleOverrides.set(id, Object.assign(prev, { title:v("r_title")||PROF[id].title, display_name:v("r_display"), category:v("r_category"), family:v("r_family"), group:v("r_group"), status:v("r_status"),
    description:v("r_desc"), aliases:list(v("r_kw")), specialties:list(v("r_spec")), comps, types, recommendedType:rec, supported_practical_tasks:list(v("r_tasks")), concepts, roleWeights, pay, opportunities }));
  applyRoleOverrides(); InterviewBank.reset(); App.adm.role=null; admRoles();
}
function admRoleArchive(id){ if(!confirm("Archive this profession? It will no longer be selectable; past interviews stay readable.")) return; const prev=Repo.roleOverrides.all()[id]||{}; Repo.roleOverrides.set(id, Object.assign(prev,{ status:"archived" })); applyRoleOverrides(); App.adm.role=null; admRoles(); }
function admRoleReset(id){ if(!confirm("Discard local changes to this profession? A locally added profession is removed.")) return; Repo.roleOverrides.set(id, null); alert("Changes discarded. The page will reload to restore the built-in profession."); location.reload(); }

/* ---------- Bulk profession import (CSV) ----------------------------------- */
const BULK_HEADER="Profession,Category,Family,Aliases,Competencies,RecommendedType,Status";
function parseCSV(text){
  const rows=[]; let row=[], cell="", q=false;
  for(let i=0;i<text.length;i++){ const ch=text[i];
    if(q){ if(ch==='"' && text[i+1]==='"'){ cell+='"'; i++; } else if(ch==='"') q=false; else cell+=ch; }
    else if(ch==='"') q=true; else if(ch===","){ row.push(cell); cell=""; } else if(ch==="\n"||ch==="\r"){ if(ch==="\r"&&text[i+1]==="\n") i++; row.push(cell); rows.push(row); row=[]; cell=""; } else cell+=ch; }
  if(cell.length||row.length){ row.push(cell); rows.push(row); }
  return rows.map(r=>r.map(x=>x.trim())).filter(r=>r.some(Boolean));
}
function bulkResolve(text){
  const rows=parseCSV(text||""); if(!rows.length) return [];
  const head=rows[0].map(h=>h.toLowerCase()), body=/profession/.test(head[0])?rows.slice(1):rows, col=n=>head.indexOf(n.toLowerCase());
  const get=(r,n,i)=>{ const c=col(n); return (c>=0?r[c]:r[i])||""; }, findBy=(list,val)=>list.find(x=>x.id===val||fold(x.label)===fold(val));
  const statusIds=Object.keys(PROFESSION_STATUSES);
  return body.map((r,n)=>{
    const title=get(r,"Profession",0), errs=[];
    const cat=findBy(PROFESSION_CATEGORIES, get(r,"Category",1)); if(!cat) errs.push("unknown category “"+get(r,"Category",1)+"”");
    const famRaw=get(r,"Family",2), fam=famRaw?findBy(Object.values(PROFESSION_FAMILIES), famRaw):(cat?PROFESSION_FAMILIES[CATEGORY_FAMILY[cat.id]]:null); if(!fam) errs.push("unknown family “"+famRaw+"”");
    const aliases=get(r,"Aliases",3).split(/\s*;\s*/).filter(Boolean), comps=get(r,"Competencies",4).split(/\s*;\s*/).filter(Boolean);
    const badC=comps.filter(c=>!COMPS[c]); if(badC.length) errs.push("unknown competencies: "+badC.join(", "));
    const rec=get(r,"RecommendedType",5); if(rec && !TYPES[rec]) errs.push("unknown interview type “"+rec+"”");
    const stRaw=get(r,"Status",6), st=stRaw?(statusIds.find(k=>k===stRaw||fold(PROFESSION_STATUSES[k])===fold(stRaw))):"domain_template"; if(!st) errs.push("unknown status “"+stRaw+"”");
    if(title.length<2) errs.push("missing profession name");
    const existing=title && ProfessionLib.find(title);
    return { line:n+2, title, category:cat&&cat.id, family:fam&&fam.id, aliases, comps, rec, status:st, existing:existing&&existing.id, errs };
  });
}
function admBulk(){
  const A=App.adm, res=A.bulkRows||[];
  admBody(`<div class="card" id="bulkCard"><h2>Bulk import professions</h2>
    <p class="small muted">Paste CSV with the header <code>${BULK_HEADER}</code>. Separate several aliases or competencies with “;”. Category and family accept an id or a label; the family defaults to the category's template. Existing professions are updated (merged), not duplicated.</p>
    <textarea id="bulkText" rows="8" placeholder="${BULK_HEADER}&#10;Veterinary Practice Manager,Veterinary & Animal Care,Operations,Vet Practice Manager;Practice Manager (Veterinary),operations;communication;judgment,ai_domain,Domain template">${H(A.bulkText||"")}</textarea>
    <div class="row wrapw" style="gap:10px;margin-top:10px"><button class="btn" id="bulkPreview" onclick="App.adm.bulkText=document.getElementById('bulkText').value;App.adm.bulkRows=bulkResolve(App.adm.bulkText);admBulk()">Preview</button>
      ${res.length?`<button class="btn primary" id="bulkImport" onclick="admBulkImport()" ${res.some(r=>!r.errs.length)?"":"disabled"}>Import ${res.filter(r=>!r.errs.length).length} valid row(s)</button>`:""}
      <button class="btn ghost" onclick="App.adm.bulk=false;App.adm.bulkRows=null;admRoles()">Back</button></div>
    ${res.length?`<div class="list" id="bulkRows" style="margin-top:12px">${res.map(r=>`<div class="item"><div><div class="t small">Line ${r.line}: ${H(r.title||"(no name)")} ${r.errs.length?`<span class="badge bad">Error</span>`:r.existing?`<span class="badge info">Update existing</span>`:`<span class="badge good">New</span>`}</div>
      <div class="m faint">${r.errs.length?H(r.errs.join("; ")):H([(PCAT[r.category]||{}).label,(PROFESSION_FAMILIES[r.family]||{}).label,r.aliases.length?r.aliases.length+" aliases":"",r.comps.length?r.comps.length+" competencies":"family competencies",r.rec?"recommended: "+TYPES[r.rec].label:"",PROFESSION_STATUSES[r.status]].filter(Boolean).join(" · "))}</div></div></div>`).join("")}</div>`:""}
    <div id="bulkMsg" class="small" role="status" style="margin-top:10px">${H(A.bulkMsg||"")}</div></div>`);
  A.bulkMsg="";
}
function admBulkImport(){
  const A=App.adm, ok=(A.bulkRows||[]).filter(r=>!r.errs.length); let added=0, updated=0;
  ok.forEach(r=>{
    const patch={ category:r.category, family:r.family, status:r.status };
    if(r.comps.length) patch.comps=r.comps; if(r.rec) patch.recommendedType=r.rec;
    if(r.existing){ const prev=Repo.roleOverrides.all()[r.existing]||{}; patch.aliases=uniq(((PROF[r.existing]||{}).aliases||[]).concat(r.aliases)); Repo.roleOverrides.set(r.existing, Object.assign(prev, patch)); updated++; }
    else { const id="admin-"+slug(r.title).slice(0,40); Repo.roleOverrides.set(id, Object.assign({ admin:true, title:r.title, aliases:r.aliases }, patch)); added++; }
  });
  applyRoleOverrides(); InterviewBank.reset();
  A.bulkRows=null; A.bulkMsg=`Imported ✓ ${added} new, ${updated} updated (this browser only; export to publish).`; admBulk();
}

/* ---------- Alex settings -------------------------------------------------- */
function admAlex(){
  const c=alexConfig(), voices=(window.speechSynthesis&&speechSynthesis.getVoices&&speechSynthesis.getVoices()||[]).filter(v=>/^en/i.test(v.lang));
  admBody(`<div class="card" id="alexForm"><h2>Alex settings</h2>
    <table class="summary kv"><tr><td>Name</td><td>${H(ALEX.name)} <span class="faint small">(brand-locked)</span></td></tr><tr><td>Title</td><td>${H(ALEX.title)} <span class="faint small">(brand-locked)</span></td></tr></table>
    <div class="grid g2" style="margin-top:12px">
      <div><label class="fld" for="a_avatar">Avatar (1–2 characters or an emoji)</label><input id="a_avatar" maxlength="2" value="${H(c.avatar)}"></div>
      <div>${admSel("a_tone",[["neutral","Neutral (default)"],["formal","Formal"],["warm","Warm"]],c.tone,"","Tone of acknowledgements")}</div>
      <div>${admSel("a_voice",[["","Browser default"]].concat(voices.map(v=>[v.voiceURI,`${v.name} (${v.lang})`])),c.voice,"","Default voice")}${voices.length?"":`<div class="small faint">No English voices reported by this browser yet.</div>`}</div>
      <div>${admSel("a_rate",[["0.8","0.8×"],["1","1× (default)"],["1.2","1.2×"],["1.5","1.5×"]],String(c.rate),"","Playback speed")}</div></div>
    <label class="fld" for="a_intro">Introduction line (replaces “I'll be guiding you through today's interview.”)</label><textarea id="a_intro" maxlength="240">${H(c.introduction)}</textarea>
    <label class="fld" for="a_done">Completion message ({name} is replaced by the candidate's first name)</label><textarea id="a_done" maxlength="240" placeholder="Thank you, {name}. That concludes today's interview. Your report is ready.">${H(c.completion)}</textarea>
    <p class="small faint">Tone changes only Alex's neutral acknowledgements; Alex never praises answers during an interview.</p>
    <div class="row wrapw" style="gap:10px;margin-top:12px"><button class="btn primary" id="alexSave" onclick="admAlexSave()">Save</button><button class="btn ghost" onclick="Repo.alexSettings.clear();applyAlexSettings();admAlex()">Reset to defaults</button></div>
    <div id="alexSaved" class="small" style="margin-top:8px"></div></div>`);
}
function admAlexSave(){
  const v=k=>((document.getElementById(k)||{}).value||"").trim();
  Repo.alexSettings.set({ avatar:v("a_avatar")||"A", tone:v("a_tone"), voice:v("a_voice"), rate:+v("a_rate")||1, introduction:v("a_intro"), completion:v("a_done") });
  applyAlexSettings(); const s=document.getElementById("alexSaved"); if(s) s.textContent="Saved ✓ (this browser only)";
}

/* ---------- Export / import ------------------------------------------------ */
function admData(){
  const n=k=>Object.keys(k).length;
  admBody(`<div class="card"><h2>Export / import studio changes</h2>
    <ul class="clean small"><li>Interview bank edits and new questions: <b>${n(Repo.interviewBank.all())}</b></li><li>Practice bank edits: <b>${n(Repo.bankOverrides.all())}</b></li>
      <li>Role changes: <b>${n(Repo.roleOverrides.all())}</b></li><li>Alex settings: <b>${n(Repo.alexSettings.get())?"customised":"default"}</b></li></ul>
    <div class="row wrapw" style="gap:10px;margin-top:12px"><button class="btn primary" onclick="admExport()">⬇ Export JSON</button>
      <label class="btn">⬆ Import JSON<input type="file" accept=".json,application/json" style="display:none" onchange="admImport(this)"></label>
      <button class="btn danger" onclick="admDiscard()">Discard all studio changes</button></div>
    <div id="admDataMsg" class="small" role="status" style="margin-top:10px"></div></div>`);
}
function admExport(){
  const data={ kind:"bsp-interview-iq-studio", exportedAt:new Date().toISOString(), interviewBank:Repo.interviewBank.all(), bankOverrides:Repo.bankOverrides.all(), roleOverrides:Repo.roleOverrides.all(), alexSettings:Repo.alexSettings.get() };
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"})); a.download="interview-iq-studio.json"; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
}
function admImport(inp){
  const f=inp.files&&inp.files[0], msg=m=>{ const e=document.getElementById("admDataMsg"); if(e) e.textContent=m; }; if(!f) return;
  const r=new FileReader(); r.onload=()=>{ try{ const d=JSON.parse(r.result); if(d.kind!=="bsp-interview-iq-studio") throw new Error("This isn't an Interview IQ studio export.");
    Repo.interviewBank.replace(d.interviewBank); Object.entries(d.bankOverrides||{}).forEach(([k,v])=>Repo.bankOverrides.set(k,v)); Repo.roleOverrides.replace(d.roleOverrides); Repo.alexSettings.set(d.alexSettings);
    QuestionBank.reset(); InterviewBank.reset(); applyRoleOverrides(); applyAlexSettings(); msg("Imported ✓"); admData(); }catch(e){ msg("Import failed: "+e.message); } };
  r.readAsText(f);
}
function admDiscard(){ if(!confirm("Discard ALL local studio changes (questions, roles, Alex settings) on this device?")) return;
  Repo.interviewBank.clear(); Repo.roleOverrides.clear(); Repo.alexSettings.clear(); Repo.bankOverrides.clear(); location.reload(); }
