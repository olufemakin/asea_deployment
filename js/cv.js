/* =============================================================================
   CV Intelligence — paste / upload (.txt, .md) / build from profile, rule-based
   extraction, review (Confirm / Edit / Delete), AI Experience Mapper with evidence
   labels (Accept / Edit / Ignore), and the confirmed-facts snapshot used by Alex.

   NO FABRICATION: every extracted item stores the exact line it came from. Nothing
   is inferred into a fact: only items the user confirms (or typed themselves) are
   trusted, and only mappings the user accepts count as CV evidence. PDF and Word
   files are not parsed (that can't be done reliably in the browser without a
   server), so the user is asked to paste the text instead.
   ========================================================================== */
"use strict";

const CV_KINDS = [["role","Professional roles"],["experience","Experience"],["responsibility","Responsibilities"],["achievement","Achievements"],
  ["education","Education"],["skill","Skills"],["tool","Tools"],["language","Languages"],["certification","Certifications"]];
const CV_HEADINGS = [["experience",/^(work |professional |employment |relevant |career )?(experience|history)$|^employment( history)?$|^career( history)?$|^work history$/i],
  ["education",/^(education|academic background|education (and|&) training|qualifications)$/i],["skill",/^(key |core |technical |professional )?(skills|competencies|strengths|expertise)$/i],
  ["tool",/^(tools|software|technologies|technical tools|systems|it skills)$/i],["language",/^languages?$/i],["certification",/^(certifications?|certificates?|licen[cs]es?( (and|&) certifications)?|accreditations?)$/i],
  ["achievement",/^(key )?(achievements|accomplishments|awards)$/i],["summary",/^(summary|professional summary|profile|about( me)?|objective|personal statement)$/i]];
const MON="(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const CV_DATE=new RegExp(`((?:${MON}\\s+)?(?:19|20)\\d{2})\\s*(?:–|-|—|to)\\s*((?:${MON}\\s+)?(?:19|20)\\d{2}|present|current|now|date)`,"i");
const ROLE_WORD=/\b(manager|engineer|analyst|nurse|teacher|specialist|coordinator|officer|assistant|director|lead|developer|consultant|accountant|administrator|supervisor|technician|designer|writer|editor|translator|interpreter|associate|executive|head|intern|representative|clerk|cleaner|janitor|driver|agent|scientist|researcher|lecturer|tutor|pharmacist|doctor|physician|therapist|worker|operator|owner|founder|volunteer|auditor|bookkeeper|programmer|architect|planner|buyer|controller|advisor|adviser|instructor|trainer|paralegal|lawyer|solicitor|attorney|chef|cook|cashier|receptionist|secretary|evaluator|annotator|reviewer|strategist|marketer|recruiter|counsel(l)?or|midwife|dentist|hygienist|surveyor|inspector|mechanic|electrician|plumber|carpenter|labourer|laborer|attendant|steward|officer)\b/i;
const ACHIEVE=/\b(increased|reduced|improved|delivered|saved|won|launched|achieved|grew|cut|exceeded|awarded|led to|resulted in|recogni[sz]ed|promoted|top performer)\b|[%$£€]|\b\d+\s*(people|staff|projects|clients|customers|students|patients|reports|sites|countries|languages)\b/i;
const DEGREE=/\b(b\.?sc|bachelor'?s?|b\.?a\b|b\.?eng|m\.?sc|master'?s?|mba|ph\.?d|doctorate|diploma|hnd|ond|associate degree|degree|university|college|polytechnic|gcse|a-levels?|high school|secondary school|waec|neco)\b/i;
const TOOL_LEX=["Microsoft Excel","Excel","Microsoft Word","PowerPoint","Outlook","MS Project","Microsoft Project","Jira","Confluence","Asana","Trello","Monday.com","Smartsheet","SharePoint","Slack","Microsoft Teams","Zoom",
  "Google Sheets","Google Docs","Google Workspace","SQL","Python","JavaScript","TypeScript","Java","C#","C++","Tableau","Power BI","Looker","SAP","Oracle","Salesforce","HubSpot","QuickBooks","Xero","Sage",
  "AutoCAD","SolidWorks","MATLAB","SPSS","Stata","Figma","Canva","Photoshop","WordPress","Git","GitHub","AWS","Azure","Docker","Epic","Cerner","Zendesk","Notion","Airtable","Primavera"];
const SKILL_LEX=["stakeholder management","risk management","budgeting","budget management","scheduling","procurement","vendor management","quality assurance","quality control","data analysis","customer service",
  "project management","team leadership","people management","reporting","negotiation","compliance","research","copywriting","editing","proofreading","translation","localization","localisation","problem solving",
  "time management","process improvement","change management","financial analysis","forecasting","auditing","bookkeeping","inventory management","patient care","lesson planning","curriculum design",
  "content writing","technical writing","data entry","annotation","fact-checking","fact checking","public speaking","training","mentoring","conflict resolution","contract management","supply chain"];
const LANG_LEX=["English","French","Spanish","German","Italian","Portuguese","Arabic","Mandarin","Chinese","Cantonese","Japanese","Korean","Hindi","Urdu","Bengali","Russian","Dutch","Turkish","Polish","Vietnamese","Swahili","Yoruba","Igbo","Hausa","Tagalog","Amharic","Somali","Greek","Swedish","Norwegian","Danish","Finnish","Hebrew","Persian","Farsi","Punjabi","Tamil","Romanian","Ukrainian","Czech","Hungarian","Thai","Malay","Indonesian","Zulu","Afrikaans","Twi"];
const CERT_LEX=/\b(PMP|PRINCE2|CAPM|CSM|Certified Scrum ?Master|PSM ?I{0,3}|ITIL|Lean Six Sigma|Six Sigma|CPA|ACCA|CIMA|CFA|CIPD|CompTIA [A-Za-z+]+|AWS Certified [A-Za-z ]+|Azure Fundamentals|Google Analytics|BLS|ACLS|TEFL|CELTA|TESOL|DELF [A-C][12]|DALF [A-C][12]|NEBOSH|IOSH|CIPS|CISA|CISSP|CISM)\b/;
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
let cvSeq=0; const cvId=()=>"cv"+Date.now().toString(36)+(cvSeq++).toString(36);

function parseCV(text){
  const lines=String(text||"").replace(/\r/g,"").split("\n").map(l=>l.replace(/\s+/g," ").trim()).filter(Boolean);
  const items=[], seen=new Set();
  const add=(kind, value, source, extra)=>{ value=String(value||"").replace(/^[-•*·▪●◦]\s*/,"").replace(/[;,.]\s*$/,"").trim(); if(value.length<2) return null;
    const key=kind+"|"+value.toLowerCase(); if(seen.has(key)) return null; seen.add(key);
    const it=Object.assign({ id:cvId(), kind, value, source:String(source).slice(0,300), status:"pending", origin:"cv" }, extra||{}); items.push(it); return it; };
  let sec=null, role=null;
  const bullet=l=>/^([-•*·▪●◦]|\d+[.)])\s+/.test(l), strip=l=>l.replace(/^([-•*·▪●◦]|\d+[.)])\s+/,"");
  lines.forEach((line, i)=>{
    const head=line.replace(/[:：]\s*$/,"").trim();
    const hit=words(head).length<=5 && CV_HEADINGS.find(([,re])=>re.test(head));
    if(hit){ sec=hit[0]; role=null; return; }
    const inl=line.match(/^([A-Za-z &]{3,40})[:：]\s*(.+)$/), inlSec=inl && CV_HEADINGS.find(([,re])=>re.test(inl[1].trim()));
    if(inlSec){ splitList(inl[2]).forEach(v=>addListItem(inlSec[0], v, line)); return; }
    const body=strip(line);
    // Role headers: a date range, or "Title at/—/| Employer" with a job word, outside list sections.
    if(!bullet(line) && !["skill","tool","language","certification","education"].includes(sec)){
      const dm=body.match(CV_DATE);
      const parts=body.replace(CV_DATE,"").replace(/[()]/g," ").split(/\s+(?:at|@)\s+|\s+[—–|]\s+|\s+-\s+|,\s+/).map(x=>x.trim()).filter(Boolean);
      if((dm && words(body).length<=16) || (ROLE_WORD.test(parts[0]||"") && words(body).length<=12 && parts.length>=2 && (sec==="experience"||dm))){
        const title=parts[0]||""; const employer=parts.length>1?parts[1]:"";
        if(title && ROLE_WORD.test(title)){ role=add("role", title+(employer?" — "+employer:"")+(dm?` (${dm[0]})`:""), line, { title, employer, dates:dm?dm[0]:"" }); return; }
        if(dm && sec==="experience"){ role=add("role", body, line, { title:body.replace(CV_DATE,"").trim(), employer:"", dates:dm[0] }); return; }
      }
    }
    const yrs=body.match(/\b(\d{1,2})\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:experience|in|as|working)\b[^.;]*/i);
    if(yrs) add("experience", yrs[0], line);
    if(sec==="education" || (!sec || sec==="summary") && DEGREE.test(body) && words(body).length<=20){ if(sec==="education"||DEGREE.test(body)){ add("education", body, line); return; } }
    if(sec==="certification"){ add("certification", body.replace(/,?\s*(19|20)\d{2}\s*$/,""), line); return; }
    if(sec==="skill"||sec==="tool"||sec==="language"){ splitList(body).forEach(v=>addListItem(sec, v, line)); return; }
    if(sec==="achievement"){ add("achievement", body, line); return; }
    if(sec==="experience" || role){
      if(words(body).length>=4) add(ACHIEVE.test(body)?"achievement":"responsibility", body, line, role?{ roleId:role.id }:{});
      return;
    }
    if(bullet(line) && words(body).length>=4) add(ACHIEVE.test(body)?"achievement":"responsibility", body, line);
  });
  function splitList(s){ return s.split(/\s*[,;•|·]\s*|\s+\/\s+/).map(x=>x.trim()).filter(x=>x.length>=2 && x.length<=60); }
  function addListItem(kind, v, line){
    if(kind==="summary"||kind==="experience") return;
    if(kind==="language"){ const L=LANG_LEX.find(l=>new RegExp("\\b"+l+"\\b","i").test(v)); if(L) add("language", v, line); return; }
    add(kind==="achievement"?"achievement":kind, v, line);
  }
  // Lexicon matches anywhere (literal words only), with the sentence they came from.
  const full=lines.join("\n");
  TOOL_LEX.forEach(t=>{ const re=new RegExp("(^|[^A-Za-z])"+esc(t)+"(?![A-Za-z])", t.length<=4?"":"i"); const l=lines.find(x=>re.test(x)); if(l && !items.some(x=>x.kind==="tool" && x.value.toLowerCase().includes(t.toLowerCase()))) add("tool", t, l); });
  SKILL_LEX.forEach(k=>{ const re=new RegExp("\\b"+esc(k)+"\\b","i"); const l=lines.find(x=>re.test(x)); if(l && !items.some(x=>x.kind==="skill" && x.value.toLowerCase()===k)) add("skill", k.charAt(0).toUpperCase()+k.slice(1), l); });
  lines.forEach(l=>{ const m=l.match(new RegExp("\\b(fluent in|native|bilingual in|speak|speaks)\\s+((?:"+LANG_LEX.join("|")+")(?:\\s*(?:and|,)\\s*(?:"+LANG_LEX.join("|")+"))*)","i")); if(m) m[2].split(/\s*(?:and|,)\s*/).forEach(v=>add("language", v, l)); });
  lines.forEach(l=>{ const m=l.match(CERT_LEX); if(m && !items.some(x=>x.kind==="certification" && x.value.includes(m[0]))) add("certification", m[0], l); });
  return { items, stats:{ lines:lines.length, chars:full.length } };
}

/* ---------- AI Experience Mapper rules ------------------------------------ */
const MAP_RULES = [
  ["instruction_following", /follow(ed|ing|s)? (the )?(procedures?|guidelines?|instructions?|sops?|protocols?|specifications?)|complian(ce|t)|standard operating|checklists?|requirements|specifications/i, /\b(process(es)?|polic(y|ies)|regulat\w*|rules)\b/i],
  ["risk_evaluation", /\brisks?\b|hazard|mitigat|contingenc|incident|safety (audit|assessment|check)/i, /\b(issues?|escalat\w*|problems?|delays?)\b/i],
  ["research", /research|literature|synthes|summari[sz]|analy[sz]ed (information|findings|evidence)|briefing/i, /\b(reports?|documentation|notes|minutes)\b/i],
  ["professional_judgment", /\b(decid\w*|decisions?|prioriti[sz]\w*|triage\w*|approv\w*|judg\w*|led|managed|supervis\w*|oversaw|owned)\b/i, /\b(coordinat\w*|resolv\w*|handled|organi[sz]ed)\b/i],
  ["quality_review", /quality|review(ed|ing|s)?\b|audit|inspect|proofread|\bqa\b|\bqc\b|verif(y|ied|ication)/i, /\b(check(ed|ing)?|monitor(ed|ing)?|test(ed|ing)?)\b/i],
  ["communication", /stakeholder|present(ed|ation)|communicat|liais|client|customer|negotiat|trained (staff|new|colleagues)|teach|taught/i, /\b(teams?|meetings?|emails?|correspond\w*|calls?)\b/i],
  ["fact_checking", /fact[- ]?check|verif(y|ied|ication)|cross-?check|source(s|d)? (checking|verification)|accuracy of/i, /\b(research|edit(ed|ing)?|proofread\w*)\b/i],
  ["attention_to_detail", /detail|accura(te|cy)|reconcil|data entry|proofread|inspect|label(l)?ing|annotat|transcri|inventory|stock count|audit/i, /\b(records?|logs?|tracked|tracking|filing)\b/i],
  ["data_evaluation", /\bdata\b|spreadsheet|excel|\bsql\b|dashboard|metrics|\bkpis?\b|analy[sz]|budget|forecast|reconcil|statistic/i, /\b(reports?|numbers|figures|records)\b/i],
  ["writing", /\b(writ(e|ing|ten)|wrote|edit(ed|ing)|copy|content|documentation|articles?|blogs?|proposals?|grants?)\b/i, /\b(reports?|emails?|letters?)\b/i],
  ["translation", /translat|interpret(er|ing|ed)|locali[sz]|bilingual|multilingual/i, null],
  ["ai_response_evaluation", /\b(ai|llm|chatgpt|machine learning)\b|annotat\w*|(model|ai) (evaluation|outputs?|responses?)|prompt/i, /\b(evaluat\w*|assess\w*|rated|rating|grad(ed|ing)|marked|marking)\b/i],
  ["reasoning", /problem[- ]solv|root cause|troubleshoot|diagnos/i, /\b(plann?\w*|solv\w*|analy[sz]\w*)\b/i],
];
const CORE_AI_SKILLS=["ai_response_evaluation","instruction_following","fact_checking","attention_to_detail","writing"];
function buildMappings(c){
  const conf=(c.items||[]).filter(i=>i.status==="confirmed" && ["role","responsibility","achievement","skill","tool","certification","experience"].includes(i.kind));
  const prev=Object.fromEntries((c.mappings||[]).map(m=>[m.id,m])), out=[];
  MAP_RULES.forEach(([skill, strong, weak])=>{
    const s=conf.filter(i=>strong.test(i.value)), w=weak?conf.filter(i=>!s.includes(i) && weak.test(i.value)):[];
    if(!s.length && !w.length) return;
    const label=s.length?"supported":"potential", ev=(s.length?s:w).slice(0,3);
    const id="map-"+skill, p=prev[id];
    out.push({ id, skill, label:p&&p.edited?p.label:label, autoLabel:label, evidence:ev.map(i=>i.id), excerpt:ev[0].value,
      reason: s.length ? `Your confirmed CV states this directly: “${clip(ev[0].value,140)}”.` : `Inferred from “${clip(ev[0].value,140)}”. This is an inference, not a stated fact: confirm it with a concrete example in an interview.`,
      status:p?p.status:"pending", note:p?p.note||"":"", edited:!!(p&&p.edited) });
  });
  const langs=(c.items||[]).filter(i=>i.status==="confirmed" && i.kind==="language");
  if(langs.length>=2 && !out.some(m=>m.skill==="translation")){ const id="map-translation", p=prev[id];
    out.push({ id, skill:"translation", label:p&&p.edited?p.label:"potential", autoLabel:"potential", evidence:langs.map(i=>i.id), excerpt:langs.map(i=>i.value).join(", "),
      reason:`You confirmed ${langs.length} languages. Working across languages is not the same as translation experience, so this is marked as potential.`, status:p?p.status:"pending", note:p?p.note||"":"", edited:!!(p&&p.edited) }); }
  CORE_AI_SKILLS.forEach(skill=>{ if(out.some(m=>m.skill===skill)) return; const id="req-"+skill, p=prev[id];
    out.push({ id, skill, label:"required", autoLabel:"required", evidence:[], excerpt:"", reason:"Nothing in your confirmed CV shows this yet. Build evidence through practice or an interview.", status:p?p.status:"pending", note:"", edited:false }); });
  return out;
}

/* ---------- CV API -------------------------------------------------------- */
const CV = {
  get(){ return Repo.cv.get(); },
  confirmed(kind){ const c=Repo.cv.get(); return c ? c.items.filter(i=>i.status==="confirmed" && (!kind || i.kind===kind)) : []; },
  hasConfirmed(){ return CV.confirmed().length>0; },
  pendingCount(){ const c=Repo.cv.get(); return c ? c.items.filter(i=>i.status==="pending").length : 0; },
  acceptedMappings(){ const c=Repo.cv.get(); return c&&c.mappings ? c.mappings.filter(m=>m.status==="accepted" && m.label!=="required") : []; },
  analyze(text, source){
    const r=parseCV(text);
    const c={ text:String(text||"").slice(0,60000), source, analyzedAt:Date.now(), items:r.items, mappings:[] };
    Repo.cv.save(c); return c;
  },
  update(fn){ const c=Repo.cv.get(); if(!c) return null; fn(c); c.mappings=buildMappings(c); return Repo.cv.save(c); },
  /* Confirmed facts only, copied verbatim into the interview session. */
  snapshot(){
    const roles=CV.confirmed("role").map(i=>({ title:i.title||i.value, employer:i.employer||"" }));
    const facts={ used:true, roles, skills:CV.confirmed("skill").map(i=>i.value).slice(0,8), tools:CV.confirmed("tool").map(i=>i.value).slice(0,6),
      responsibilities:CV.confirmed("responsibility").concat(CV.confirmed("achievement")).map(i=>i.value).filter(v=>words(v).length>=4).slice(0,6),
      languages:CV.confirmed("language").map(i=>i.value), takenAt:Date.now() };
    return facts;
  },
};
function cvIntroLine(cv){
  if(!cv || !cv.used) return "";
  const r=cv.roles.map(x=>x.title).filter(Boolean).slice(0,2), k=cv.skills.concat(cv.tools).slice(0,2).map(x=>x.toLowerCase());
  if(!r.length && !k.length) return "";
  return "I see from your confirmed CV that you have "+(r.length?`experience as ${r.join(" and as ")}`:"")+(r.length&&k.length?", including ":"")+(k.length?`${r.length?"":"experience with "}${k.join(" and ")}`:"")+". ";
}

/* ---------- Screens ------------------------------------------------------- */
function scrCV(){
  const c=CV.get();
  const head=pageHead("Profile","My CV","Add your experience so Alex can personalise interviews. Nothing is used until you confirm it, and it stays in this browser.")+tabs(PROFILE_TABS,"#/cv");
  if(!c || App.cvMode){ el.innerHTML=head+cvEntryHTML(); return; }
  const by=k=>c.items.filter(i=>i.kind===k), pend=CV.pendingCount(), conf=CV.confirmed().length;
  el.innerHTML=head+`<div class="card"><div class="row between center wrapw"><div><h2 style="margin:0">Review extracted information</h2>
      <div class="small muted">${c.items.length} items found · <b id="cvConfirmed">${conf}</b> confirmed · ${pend} to review · source: ${H(c.source==="profile"?"built from your profile":c.source==="upload"?"uploaded text file":"pasted text")}</div></div>
      <div class="row wrapw" style="gap:8px"><button class="btn sm" onclick="cvConfirmAll()">Confirm all shown</button><button class="btn sm ghost" onclick="App.cvMode='paste';scrCV()">Replace CV</button><button class="btn sm danger" onclick="cvDeleteAll()">Delete CV data</button></div></div>
      <p class="note">Only confirmed items become trusted context for Alex and your skills. Check every item against your real experience: edit anything that's wrong and delete anything that isn't yours. Interview IQ never adds employers, titles, dates, metrics or achievements you didn't write.</p></div>
    ${CV_KINDS.map(([k,l])=>`<div class="card cvsec" data-kind="${k}"><div class="row between center"><h3 style="margin:0">${l} <span class="faint small">(${by(k).length})</span></h3><button class="btn sm ghost" onclick="cvAdd('${k}')">+ Add</button></div>
      ${by(k).length?`<div class="list" style="margin-top:10px">${by(k).map(cvItemHTML).join("")}</div>`:`<p class="small muted" style="margin:8px 0 0">Nothing found. Add one if it applies to you.</p>`}</div>`).join("")}
    <div class="card"><div class="row between center wrapw"><div><h3 style="margin:0">Next: AI Experience Mapper</h3><div class="small muted">See how your confirmed experience could transfer to AI-work skills.</div></div><a class="btn primary" href="#/cv/mapper">Open mapper →</a></div></div>`;
}
function cvItemHTML(i){
  if(App.cvEdit===i.id) return `<div class="item cvitem editing"><div class="grow"><input id="cvEditBox" value="${H(i.value)}" aria-label="Edit item" maxlength="300"></div>
    <div class="row wrapw" style="gap:6px"><button class="btn sm primary" onclick="cvSaveEdit('${i.id}')">Save &amp; confirm</button><button class="btn sm ghost" onclick="App.cvEdit=null;scrCV()">Cancel</button></div></div>`;
  return `<div class="item cvitem" data-id="${i.id}"><div class="grow"><div class="t">${H(i.value)} ${i.status==="confirmed"?`<span class="badge good">Confirmed</span>`:`<span class="badge ok">Needs review</span>`}${i.edited?` <span class="badge">Edited</span>`:""}</div>
    <div class="m faint">${i.origin==="user"?"Entered by you":`From your CV: “${H(clip(i.source,160))}”`}</div></div>
    <div class="row wrapw" style="gap:6px">${i.status!=="confirmed"?`<button class="btn sm good" onclick="cvSet('${i.id}','confirmed')">Confirm</button>`:""}<button class="btn sm" onclick="App.cvEdit='${i.id}';scrCV()">Edit</button><button class="btn sm ghost" onclick="cvDel('${i.id}')">Delete</button></div></div>`;
}
function cvEntryHTML(){
  const mode=App.cvMode||"choose", p=App.setup&&App.setup.professionId?getProfession(App.setup.professionId):null, prof=p&&p.profile||{};
  const choose=`<div class="grid g3" id="cvEntry">
      <button class="card linkcard cvopt" id="cvUpload" onclick="App.cvMode='upload';scrCV()"><div class="ic">📄</div><div class="t">Upload CV</div><div class="d">A .txt or .md file. For PDF or Word, copy the text and use Paste CV.</div></button>
      <button class="card linkcard cvopt" id="cvPaste" onclick="App.cvMode='paste';scrCV()"><div class="ic">📋</div><div class="t">Paste CV</div><div class="d">Paste the text of your CV and we'll pull out roles, skills and more for you to review.</div></button>
      <button class="card linkcard cvopt" id="cvProfile" onclick="App.cvMode='profile';scrCV()"><div class="ic">🧩</div><div class="t">Build From Profile</div><div class="d">Type your experience into a short form instead.</div></button></div>`;
  const back=CV.get()||mode!=="choose"?`<button class="btn ghost" onclick="App.cvMode=${CV.get()?"null":"'choose'"};scrCV()">← Back</button>`:"";
  if(mode==="choose") return (CV.get()?"":emptyCard("🧾","No CV yet","Add your experience to personalize your interviews.","",""))+choose;
  if(mode==="upload") return `<div class="card"><h2>Upload CV</h2><p class="small muted">Plain-text files (.txt, .md) are read in your browser and never uploaded anywhere. PDF and Word files can't be read reliably in the browser: open the file, copy all the text and use <a href="javascript:void(0)" onclick="App.cvMode='paste';scrCV()">Paste CV</a>.</p>
      <input type="file" id="cvFile" accept=".txt,.md,.text,text/plain,text/markdown" onchange="cvFile(this)" aria-label="Choose CV text file"><div id="cvErr" class="small" role="alert" style="color:#ffb4b4;margin-top:8px"></div><div style="margin-top:12px">${back}</div></div>`;
  if(mode==="paste") return `<div class="card"><h2>Paste CV</h2><label class="fld" for="cvText">CV text</label>
      <textarea id="cvText" style="min-height:260px" placeholder="Paste the full text of your CV here (roles, dates, responsibilities, education, skills…)"></textarea>
      <div id="cvErr" class="small" role="alert" style="color:#ffb4b4;margin-top:8px"></div>
      <div class="row wrapw" style="gap:10px;margin-top:12px"><button class="btn primary" id="cvAnalyze" onclick="cvAnalyzePaste()">Analyze</button>${back}</div>
      <p class="note">Your CV text stays in this browser. Remove anything you don't want stored, such as your address or phone number.</p></div>`;
  return `<div class="card"><h2>Build From Profile</h2><p class="small muted">Everything you type here is treated as confirmed, because it comes from you. Leave out anything you're unsure of.</p>
    <div class="grid g2">
      <div><label class="fld" for="bfTitle">Job title *</label><input id="bfTitle" maxlength="80" value="${H(p&&!p.custom?p.title:(p&&p.title)||"")}"></div>
      <div><label class="fld" for="bfEmployer">Employer (optional)</label><input id="bfEmployer" maxlength="80"></div>
      <div><label class="fld" for="bfDates">Dates (optional)</label><input id="bfDates" maxlength="40" placeholder="e.g. 2019 – Present"></div>
      <div><label class="fld" for="bfYears">Years of experience (optional)</label><input id="bfYears" maxlength="20" value="${H(prof.years||"")}"></div></div>
    <label class="fld" for="bfResp">Responsibilities (one per line)</label><textarea id="bfResp">${H(prof.responsibilities||"")}</textarea>
    <label class="fld" for="bfAch">Achievements (one per line, optional)</label><textarea id="bfAch"></textarea>
    <div class="grid g2"><div><label class="fld" for="bfSkills">Skills (comma-separated)</label><input id="bfSkills" value="${H(prof.skills||"")}"></div>
      <div><label class="fld" for="bfTools">Tools (comma-separated)</label><input id="bfTools"></div>
      <div><label class="fld" for="bfEdu">Education (optional)</label><input id="bfEdu" value="${H(prof.education||"")}"></div>
      <div><label class="fld" for="bfLang">Languages (comma-separated)</label><input id="bfLang"></div></div>
    <label class="fld" for="bfCert">Certifications (optional)</label><input id="bfCert" value="${H(prof.credentials||"")}">
    <div id="cvErr" class="small" role="alert" style="color:#ffb4b4;margin-top:8px"></div>
    <div class="row wrapw" style="gap:10px;margin-top:12px"><button class="btn primary" onclick="cvBuild()">Save my experience</button>${back}</div></div>`;
}
function cvErr(m){ const e=document.getElementById("cvErr"); if(e) e.textContent=m; }
function cvAnalyzePaste(){
  const t=(document.getElementById("cvText")||{}).value||"";
  if(words(t).length<15){ cvErr("Please paste more of your CV (at least a few lines) so there is something to analyze."); return; }
  const c=CV.analyze(t,"paste"); App.cvMode=null;
  if(!c.items.length){ cvErr(""); }
  scrCV();
}
function cvFile(inp){
  const f=inp.files&&inp.files[0]; if(!f) return;
  if(/\.(pdf|docx?|odt|rtf|pages)$/i.test(f.name) || /pdf|word|officedocument/.test(f.type)){ cvErr("PDF and Word files can't be read reliably in the browser. Open the file, copy the text and use Paste CV instead."); inp.value=""; return; }
  if(f.size>500000){ cvErr("That file is too large for a CV text file (500 KB max)."); return; }
  const r=new FileReader();
  r.onload=()=>{ const t=String(r.result||""); if(words(t).length<15){ cvErr("This file doesn't contain enough readable text."); return; } CV.analyze(t,"upload"); App.cvMode=null; scrCV(); };
  r.onerror=()=>cvErr("The file couldn't be read. Try pasting the text instead.");
  r.readAsText(f);
}
function cvBuild(){
  const v=id=>((document.getElementById(id)||{}).value||"").trim(), title=v("bfTitle");
  if(!title){ cvErr("Add your job title."); return; }
  const items=[], u=(kind, value, extra)=>{ value=value.trim(); if(value.length>=2) items.push(Object.assign({ id:cvId(), kind, value, source:"Entered by you", status:"confirmed", origin:"user" }, extra||{})); };
  const emp=v("bfEmployer"), dates=v("bfDates");
  u("role", title+(emp?" — "+emp:"")+(dates?` (${dates})`:""), { title, employer:emp, dates });
  if(v("bfYears")) u("experience", v("bfYears")+(/\byears?\b/i.test(v("bfYears"))?"":" years")+" of experience");
  v("bfResp").split(/\n+/).forEach(x=>u("responsibility", x.replace(/^[-•*]\s*/,"")));
  v("bfAch").split(/\n+/).forEach(x=>u("achievement", x.replace(/^[-•*]\s*/,"")));
  v("bfSkills").split(/[,;\n]+/).forEach(x=>u("skill", x)); v("bfTools").split(/[,;\n]+/).forEach(x=>u("tool", x));
  v("bfLang").split(/[,;\n]+/).forEach(x=>u("language", x)); if(v("bfEdu")) u("education", v("bfEdu")); v("bfCert").split(/[;\n]+/).forEach(x=>u("certification", x));
  const c={ text:"", source:"profile", analyzedAt:Date.now(), items, mappings:[] }; c.mappings=buildMappings(c); Repo.cv.save(c); App.cvMode=null; scrCV();
}
function cvSet(id, status){ CV.update(c=>{ const i=c.items.find(x=>x.id===id); if(i) i.status=status; }); scrCV(); }
function cvDel(id){ CV.update(c=>{ c.items=c.items.filter(x=>x.id!==id); }); scrCV(); }
function cvSaveEdit(id){ const v=(document.getElementById("cvEditBox")||{}).value||""; if(v.trim().length<2) return; CV.update(c=>{ const i=c.items.find(x=>x.id===id); if(i){ i.value=v.trim(); i.edited=true; i.status="confirmed"; if(i.kind==="role"){ i.title=v.split(/\s+[—–-]\s+|\s+\(/)[0].trim(); } } }); App.cvEdit=null; scrCV(); }
function cvAdd(kind){ const v=prompt("Add "+CV_KINDS.find(k=>k[0]===kind)[1].toLowerCase().replace(/s$/,"")+" (exactly as it applies to you):"); if(!v||v.trim().length<2) return;
  CV.update(c=>{ c.items.push({ id:cvId(), kind, value:v.trim(), source:"Entered by you", status:"confirmed", origin:"user", title:kind==="role"?v.trim():undefined }); }); scrCV(); }
function cvConfirmAll(){ CV.update(c=>c.items.forEach(i=>{ if(i.status==="pending") i.status="confirmed"; })); scrCV(); }
function cvDeleteAll(){ if(!confirm("Delete your CV text, extracted items and mappings from this browser?")) return; Repo.cv.clear(); App.cvMode=null; App.setup.useCv=false; saveSetup(); scrCV(); }

/* ---------- AI Experience Mapper ----------------------------------------- */
const MAP_LABEL={ supported:["good","EVIDENCE SUPPORTED"], potential:["ok","POTENTIALLY SUPPORTED"], required:["bad","EVIDENCE REQUIRED"] };
function scrMapper(){
  const c=CV.get(), head=pageHead("Profile","AI Experience Mapper","How your confirmed experience could transfer to AI-work skills. Every mapping is labelled; inferences never become facts unless you accept them.")+tabs(PROFILE_TABS,"#/cv/mapper");
  if(!c || !CV.hasConfirmed()){ el.innerHTML=head+emptyCard("🧭","Nothing to map yet","Add your experience to personalize your interviews, then confirm the items that are accurate.","#/cv","Add my experience"); return; }
  if(!c.mappings || !c.mappings.length){ CV.update(()=>{}); }
  const M=CV.get().mappings, items=Object.fromEntries(CV.get().items.map(i=>[i.id,i])), roles=CV.confirmed("role");
  el.innerHTML=head+`${roles.length?`<div class="card"><h3>Your confirmed experience</h3>${roles.map(r=>{ const rs=CV.confirmed().filter(i=>i.roleId===r.id); return `<div style="margin-bottom:10px"><b style="text-transform:uppercase;letter-spacing:.6px">${H(r.title||r.value)} experience</b>${rs.length?`<ul class="tips small">${rs.slice(0,4).map(i=>`<li>“${H(i.value)}”</li>`).join("")}</ul>`:""}</div>`; }).join("")}</div>`:""}
  <div class="card"><h2>Potential transfer</h2><p class="small muted"><b>Evidence supported</b>: your confirmed CV states it directly. <b>Potentially supported</b>: an inference from your wording, to confirm in an interview. <b>Evidence required</b>: a core AI-work skill with no CV evidence yet. Only accepted mappings count towards your skills.</p>
    <div class="list" id="mappings">${M.map(m=>{ const [k,l]=MAP_LABEL[m.label]; return `<div class="item mapitem" data-map="${m.id}" data-label="${m.label}"><div class="grow">
      <div class="t">${H(SKILLS[m.skill]?SKILLS[m.skill].label:m.skill)} <span class="badge ${k}">${l}</span> ${m.status==="accepted"?`<span class="badge good">Accepted</span>`:m.status==="ignored"?`<span class="badge">Ignored</span>`:""}${m.edited?` <span class="badge">Edited by you</span>`:""}</div>
      <div class="m">${H(m.reason)}</div>${m.note?`<div class="m">Your note: ${H(m.note)}</div>`:""}
      ${m.evidence.length>1?`<div class="m faint">Also based on: ${m.evidence.slice(1).map(id=>items[id]?`“${H(clip(items[id].value,90))}”`:"").join(" · ")}</div>`:""}
      ${App.mapEdit===m.id?`<div class="row wrapw" style="gap:8px;margin-top:8px"><select id="mapLabel" aria-label="Evidence label">${["supported","potential"].map(x=>`<option value="${x}" ${m.label===x?"selected":""}>${MAP_LABEL[x][1]}</option>`).join("")}</select>
        <input id="mapNote" placeholder="Your note (optional)" value="${H(m.note)}" maxlength="200" style="flex:1;min-width:160px"><button class="btn sm primary" onclick="mapSave('${m.id}')">Save</button><button class="btn sm ghost" onclick="App.mapEdit=null;scrMapper()">Cancel</button></div>`:""}</div>
      <div class="row wrapw" style="gap:6px">${m.label==="required"
        ? `${SKILLS[m.skill]&&SKILLS[m.skill].cat&&isCategoryAvailable(SKILLS[m.skill].cat)?`<button class="btn sm" onclick="openPracticeSetup('${SKILLS[m.skill].cat}','easy')">Build evidence</button>`:""}${m.status!=="ignored"?`<button class="btn sm ghost" onclick="mapSet('${m.id}','ignored')">Ignore</button>`:""}`
        : `${m.status!=="accepted"?`<button class="btn sm good" onclick="mapSet('${m.id}','accepted')">Accept</button>`:""}<button class="btn sm" onclick="App.mapEdit='${m.id}';scrMapper()">Edit</button>${m.status!=="ignored"?`<button class="btn sm ghost" onclick="mapSet('${m.id}','ignored')">Ignore</button>`:""}`}</div></div>`; }).join("")}</div></div>
  <div class="card"><div class="row between center wrapw"><div class="small muted">Accepted mappings appear in Skills &amp; Scores as CV evidence (labelled, never as a score) and in your AI Work Profile.</div><a class="btn" href="#/profile">View AI Work Profile</a></div></div>`;
}
function mapSet(id, status){ CV.update(c=>{ const m=c.mappings.find(x=>x.id===id); if(m) m.status=status; }); const c=CV.get(); const m=c.mappings.find(x=>x.id===id); if(m){ m.status=status; Repo.cv.save(c); } scrMapper(); }
function mapSave(id){
  const label=(document.getElementById("mapLabel")||{}).value, note=((document.getElementById("mapNote")||{}).value||"").trim();
  const c=CV.get(); const m=c.mappings.find(x=>x.id===id); if(m){ m.label=label||m.label; m.note=note; m.edited=true; Repo.cv.save(c); } App.mapEdit=null; scrMapper();
}
