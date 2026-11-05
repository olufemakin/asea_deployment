/* =============================================================================
   CV Intelligence — upload (PDF / DOCX / TXT, read in the browser by js/cv-extract.js),
   paste, or build from profile; review and correct the extracted text; CV Quality
   report (js/cv-analysis.js, rendered by js/cv-report-ui.js); rule-based item
   extraction with review (Confirm / Edit / Delete); AI Experience Mapper with
   evidence labels (Accept / Edit / Ignore); confirmed-facts snapshot used by Alex.

   NO FABRICATION: every extracted item stores the exact line it came from. Nothing
   is inferred into a fact: only items the user confirms (or typed themselves) are
   trusted, and only mappings the user accepts count as CV evidence. Files are never
   uploaded anywhere; the original file is not stored.
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
  analyze(text, source, extra){
    const r=parseCV(text);
    const c=Object.assign({ text:String(text||"").slice(0,60000), source, analyzedAt:Date.now(), items:r.items, mappings:[] }, extra||{});
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
  const head=pageHead("Profile","My CV","Upload, paste or build your CV. It's read in this browser, you check the text, then you get a CV Quality report. Nothing is used by Alex until you confirm it.")+tabs(PROFILE_TABS,"#/cv");
  if(!c || App.cvMode || App.cvJob){ el.innerHTML=head+cvEntryHTML(); cvWireDrop(); return; }
  const view=App.cvView||(c.report?"report":"items");
  const pend=CV.pendingCount();
  const sub=`<nav class="tabs cvtabs" aria-label="CV views">
      ${c.text?`<button class="tabbtn ${view==="report"?"active":""}" id="cvTabReport" aria-pressed="${view==="report"}" onclick="App.cvView='report';scrCV()">CV Quality report</button>`:""}
      <button class="tabbtn ${view==="items"?"active":""}" id="cvTabItems" aria-pressed="${view==="items"}" onclick="App.cvView='items';scrCV()">Review extracted items${pend?` (${pend} to review)`:""}</button>
      ${c.text?`<button class="tabbtn ${view==="text"?"active":""}" id="cvTabText" aria-pressed="${view==="text"}" onclick="App.cvView='text';scrCV()">Extracted text</button>`:""}</nav>`;
  el.innerHTML=head+sub+(view==="report"&&c.text?cvReportHTML(c):view==="text"&&c.text?cvTextViewHTML(c):cvItemsHTML(c));
}
function cvItemsHTML(c){
  const by=k=>c.items.filter(i=>i.kind===k), pend=CV.pendingCount(), conf=CV.confirmed().length;
  return `<div class="card"><div class="row between center wrapw"><div><h2 style="margin:0">Review extracted information</h2>
      <div class="small muted">${c.items.length} items found · <b id="cvConfirmed">${conf}</b> confirmed · ${pend} to review · source: ${H(cvSourceLabel(c))}</div></div>
      <div class="row wrapw" style="gap:8px"><button class="btn sm" onclick="cvConfirmAll()">Confirm all shown</button><button class="btn sm ghost" onclick="cvReplace()">Replace CV</button><button class="btn sm danger" onclick="cvDeleteAll()">Delete CV data</button></div></div>
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
const cvSourceLabel=c=>c.source==="profile"?"built from your profile":c.source==="upload"?`uploaded ${(CVX_FORMATS[c.format]||"file").replace(/^Plain text$/,"text file")}`:"pasted text";
function cvTextViewHTML(c){
  return `<div class="card cvx"><h2>Extracted text</h2><p class="small muted">This is the text the report was built from. Correct anything that was read wrongly, then re-analyse. Your edits replace the stored text.</p>
    <label class="fld" for="cvText">Resume text</label><textarea id="cvText" class="cvtext" spellcheck="false">${H(c.text)}</textarea>
    ${cvTargetFields(c.target, c.jd)}
    <div id="cvErr" class="small cverr" role="alert"></div>
    <div class="row wrapw" style="gap:10px;margin-top:12px"><button class="btn primary" id="cvAnalyze" onclick="cvAnalyzeText()">Re-analyse</button><button class="btn ghost" onclick="App.cvView='report';scrCV()">Cancel</button></div></div>`;
}
function cvTargetFields(target, jd){
  return `<details class="cvopt-box" ${target||jd?"open":""}><summary>Optional: target job title and job description</summary>
    <p class="small muted" style="margin:8px 0 10px">Used only to tailor advice and compare requirements. They don't change your CV Quality score.</p>
    <label class="fld" for="cvTarget">Target job title</label><input id="cvTarget" maxlength="80" value="${H(target||"")}" placeholder="e.g. AI Response Evaluator">
    <label class="fld" for="cvJD" style="margin-top:12px">Job description</label><textarea id="cvJD" maxlength="12000" placeholder="Paste the job description or the requirements list">${H(jd||"")}</textarea></details>`;
}
function cvEntryHTML(){
  const job=App.cvJob, c=CV.get(), mode=App.cvMode&&App.cvMode!=="choose"?App.cvMode:"upload", p=App.setup&&App.setup.professionId?getProfession(App.setup.professionId):null, prof=p&&p.profile||{};
  const draft=App.cvDraft||{};
  const back=c?`<button class="btn ghost" onclick="cvCancelEntry()">← Back to my CV</button>`:"";
  const intro=`<div class="card cvx cvhero"><span class="kicker cvk">CV Intelligence</span>
      <h2 class="cvtitle">Improve Your CV for AI Training Opportunities</h2>
      <p class="muted" style="margin:6px 0 0">Upload your resume to understand its strengths, identify gaps, discover transferable skills, and get practical recommendations for AI training roles.</p>
      ${c?"":`<p class="small faint" style="margin:8px 0 0">Add your experience to personalize your interviews.</p>`}
      <div class="seg" role="group" aria-label="How to add your CV" id="cvEntry" style="margin-top:16px">
        <button class="segbtn ${mode==="upload"?"sel":""}" id="cvUpload" aria-pressed="${mode==="upload"}" onclick="cvSetMode('upload')"><span aria-hidden="true">📄</span> Upload CV</button>
        <button class="segbtn ${mode==="paste"?"sel":""}" id="cvPaste" aria-pressed="${mode==="paste"}" onclick="cvSetMode('paste')"><span aria-hidden="true">📋</span> Paste CV</button>
        <button class="segbtn ${mode==="profile"?"sel":""}" id="cvProfile" aria-pressed="${mode==="profile"}" onclick="cvSetMode('profile')"><span aria-hidden="true">🧩</span> Build From Profile</button></div></div>`;
  let body="";
  if(job) body=cvJobHTML(job);
  else if(mode==="upload") body=`<div class="card cvx">
      <div class="cvdrop" id="cvDrop"><div class="ic" aria-hidden="true">⬆</div>
        <div class="t">Drag and drop your resume here</div>
        <div class="small muted">PDF or Word (.docx) · up to 10 MB · PDFs exported from WPS Office, Word, Google Docs and LibreOffice are supported</div>
        <button class="btn primary" id="cvBrowse" style="margin-top:14px" onclick="document.getElementById('cvFile').click()">Browse files</button>
        <input type="file" id="cvFile" class="sr" tabindex="-1" accept=".pdf,.docx,.doc,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain" onchange="cvFile(this)" aria-label="Choose resume file"></div>
      <p class="small faint" style="margin:10px 0 0">Legacy Word (.doc) files can't be read reliably in the browser: save them as .docx or PDF first. Scanned (image-only) PDFs can't be read either, because this version has no OCR.</p>
      ${cvTargetFields(draft.target, draft.jd)}
      <div id="cvErr" class="small cverr" role="alert"></div>${back?`<div style="margin-top:12px">${back}</div>`:""}</div>`;
  else if(mode==="paste") body=`<div class="card cvx"><h2>Paste CV</h2><label class="fld" for="cvText">CV text</label>
      <textarea id="cvText" class="cvtext" placeholder="Paste the full text of your CV here (roles, dates, responsibilities, education, skills…)">${H(draft.text||"")}</textarea>
      ${cvTargetFields(draft.target, draft.jd)}
      <div id="cvErr" class="small cverr" role="alert"></div>
      <div class="row wrapw" style="gap:10px;margin-top:12px"><button class="btn primary" id="cvAnalyze" onclick="cvAnalyzeText()">Analyze</button>${back}</div>
      <p class="note">Remove anything you don't want stored, such as your address or phone number. They aren't needed for the analysis.</p></div>`;
  else body=`<div class="card"><h2>Build From Profile</h2><p class="small muted">Everything you type here is treated as confirmed, because it comes from you. Leave out anything you're unsure of. (The CV Quality report needs resume text, so use Upload or Paste for that.)</p>
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
    <div id="cvErr" class="small cverr" role="alert"></div>
    <div class="row wrapw" style="gap:10px;margin-top:12px"><button class="btn primary" onclick="cvBuild()">Save my experience</button>${back}</div></div>`;
  return intro+body+cvProcessingHTML();
}
const CV_STEPS=[["uploading","Uploading"],["extracting","Extracting text"],["review","Review text"],["analysing","Analysing"],["completed","Completed"]];
function cvJobHTML(job){
  const idx=CV_STEPS.findIndex(s=>s[0]===job.state), failed=job.state==="failed", at=failed?CV_STEPS.findIndex(s=>s[0]===job.failedAt):idx;
  const steps=`<ol class="cvsteps" aria-label="Progress">${CV_STEPS.map(([k,l],i)=>`<li class="${i<at?"done":i===at?(failed?"fail":"cur"):""}" ${i===at?'aria-current="step"':""}><span class="n">${i<at?"✓":failed&&i===at?"!":i+1}</span>${l}</li>`).join("")}</ol>`;
  const file=job.fileName?`<div class="cvfile"><span aria-hidden="true">📄</span><div class="grow"><div class="t">${H(job.fileName)}</div><div class="small faint">${job.size!=null?(job.size/1048576<0.1?Math.max(1,Math.round(job.size/1024))+" KB":(job.size/1048576).toFixed(1)+" MB"):""}${job.format?" · "+H(CVX_FORMATS[job.format]||job.format):""}</div></div></div>`:"";
  const ctl=`<div class="row wrapw" style="gap:8px;margin-top:14px">${job.file?`<button class="btn sm" id="cvRetry" onclick="cvRetry()">Retry</button>`:""}<button class="btn sm" id="cvReplaceFile" onclick="cvPickReplacement()">Replace file</button><button class="btn sm ghost" id="cvRemove" onclick="cvRemoveFile()">Remove</button><button class="btn sm ghost" onclick="cvSetMode('paste')">Paste text instead</button></div>
    <input type="file" id="cvFile" class="sr" tabindex="-1" accept=".pdf,.docx,.doc,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain" onchange="cvFile(this)" aria-label="Choose another resume file">`;
  if(failed) return `<div class="card cvx">${steps}${file}<div class="cvfail" id="cvFail" role="alert"><b>${job.failedAt==="analysing"?"Analysis failed":"We couldn't read this file"}</b><p style="margin:6px 0 0">${H(job.error)}</p></div>${ctl}</div>`;
  if(job.state==="review"){ const x=job.extraction||{}, partial=x.status==="partial";
    return `<div class="card cvx">${steps}${file}
      <h2 style="margin-top:14px">Review the extracted text</h2>
      <div class="row wrapw center" style="gap:8px"><span class="badge ${partial?"ok":"good"}" id="cvExtractStatus">${partial?"Extraction incomplete":"Text extracted"}</span><span class="small muted">${x.words||0} words${x.pages?` from ${x.pages} page${x.pages>1?"s":""}`:""} · ${H(CVX_FORMATS[x.format]||"")}</span></div>
      ${(x.limitations||[]).length?`<ul class="tips small" id="cvLimits">${x.limitations.map(l=>`<li>${H(l)}</li>`).join("")}</ul>`:""}
      <p class="small muted">Check the text below and correct anything that was read wrongly (for example merged words or sections in the wrong order) before analysing. Missing text isn't treated as missing experience, but it can't be credited either.</p>
      <label class="fld" for="cvText">Extracted resume text</label><textarea id="cvText" class="cvtext" spellcheck="false">${H(x.text||"")}</textarea>
      ${partial?`<label class="check" style="margin-top:10px"><input type="checkbox" id="cvComplete"> I've checked and corrected the text above, and it's my complete resume</label><p class="small faint" style="margin:4px 0 0">Without this, the score is shown as provisional.</p>`:""}
      ${cvTargetFields((App.cvDraft||{}).target, (App.cvDraft||{}).jd)}
      <div id="cvErr" class="small cverr" role="alert"></div>
      <div class="row wrapw" style="gap:8px;margin-top:14px"><button class="btn primary" id="cvAnalyze" onclick="cvAnalyzeText()">Analyse CV</button><button class="btn sm" onclick="cvPickReplacement()">Replace file</button><button class="btn sm ghost" id="cvRemove" onclick="cvRemoveFile()">Remove</button></div>
      <input type="file" id="cvFile" class="sr" tabindex="-1" accept=".pdf,.docx,.doc,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain" onchange="cvFile(this)" aria-label="Choose another resume file"></div>`; }
  return `<div class="card cvx" aria-busy="true">${steps}${file}<div class="cvbusy" id="cvBusy" role="status" aria-live="polite"><span class="spin" aria-hidden="true"></span>${H(job.step||CV_STEPS[Math.max(0,idx)][1]+"…")}</div></div>`;
}
function cvProcessingHTML(){
  return `<details class="card cvproc" id="cvProcessing"><summary><b>How your resume is processed</b></summary>
    <ul class="tips small">
      <li>Your file is read by your own browser on this device. It is <b>not uploaded</b>: this site has no server that receives files, and no AI service or API is called.</li>
      <li>PDFs are read with a copy of the open-source pdf.js library served with this site; Word files are unzipped and read in the browser. Scanned (image-only) pages can't be read because there's no OCR.</li>
      <li>The original file is not stored. The extracted text (after your corrections), the optional job title and description, the extracted items and the report are saved in this browser's storage ${typeof Repo!=="undefined"&&Repo.kind!=="browser"?"(your browser is blocking storage, so only until you close this tab)":"so they're there when you come back"}, until you click <b>Delete CV data</b> or clear your browser's site data. Anyone using this browser profile could see them.</li>
      <li>The analysis is a fixed set of rules applied to the text. Instructions written inside a resume or job description are treated as text and can't change those rules.</li>
      <li>Your name, photo, age, gender, marital status, nationality and address are not used or scored. Contact details are optional.</li></ul></details>`;
}
function cvErr(m){ const e=document.getElementById("cvErr"); if(e) e.textContent=m; }
function cvSaveDraft(){ const v=id=>{ const e=document.getElementById(id); return e?e.value:undefined; }; const d=App.cvDraft||{};
  ["target","jd"].forEach(k=>{ const x=v(k==="target"?"cvTarget":"cvJD"); if(x!==undefined) d[k]=x; }); if(App.cvMode==="paste" && !App.cvJob){ const t=v("cvText"); if(t!==undefined) d.text=t; } App.cvDraft=d; }
function cvSetMode(m){ cvSaveDraft(); App.cvJob=null; App.cvMode=m; scrCV(); }
function cvCancelEntry(){ App.cvJob=null; App.cvMode=null; App.cvDraft=null; scrCV(); }
function cvReplace(){ App.cvJob=null; App.cvMode="upload"; const c=CV.get(); App.cvDraft={ target:c&&c.target||"", jd:c&&c.jd||"" }; scrCV(); }
function cvWireDrop(){
  const z=document.getElementById("cvDrop"); if(!z) return;
  ["dragenter","dragover"].forEach(ev=>z.addEventListener(ev, e=>{ e.preventDefault(); z.classList.add("over"); }));
  ["dragleave","drop"].forEach(ev=>z.addEventListener(ev, e=>{ e.preventDefault(); z.classList.remove("over"); }));
  z.addEventListener("drop", e=>{ const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]; if(f) cvStartFile(f); });
}
function cvPickReplacement(){ const i=document.getElementById("cvFile"); if(i) i.click(); }
function cvFile(inp){ const f=inp.files&&inp.files[0]; inp.value=""; if(f) cvStartFile(f); }
function cvRemoveFile(){ App.cvJob=null; App.cvMode="upload"; scrCV(); }
function cvRetry(){ const j=App.cvJob; if(j&&j.file) cvStartFile(j.file); }
function cvJobSet(patch){ App.cvJob=Object.assign(App.cvJob||{}, patch); if(location.hash.replace(/^#\/?/,"")==="cv") scrCV(); }
async function cvStartFile(f){
  cvSaveDraft();
  const run=Symbol(); App.cvRun=run;
  App.cvJob={ state:"uploading", step:"Reading file…", fileName:f.name, size:f.size, file:f, format:null }; scrCV();
  const live=s=>{ if(App.cvRun!==run) return; const b=document.getElementById("cvBusy"); if(b) b.lastChild.textContent=s; };
  let r; try{ r=await cvxExtract(f, s=>{ if(App.cvRun!==run) return; if(App.cvJob.state==="uploading" && /Extract|page/i.test(s)) cvJobSet({ state:"extracting", step:s }); else live(s); }); }
  catch(e){ r=cvxError("unexpected","Something went wrong while reading this file. Retry, or use Paste text."); }
  if(App.cvRun!==run) return;
  if(!r.ok){ cvJobSet({ state:"failed", failedAt:App.cvJob.state==="uploading"?"uploading":"extracting", error:r.message, code:r.code, file:["too_large","empty","doc_legacy","unsupported"].includes(r.code)?null:f }); return; }
  cvJobSet({ state:"review", format:r.format, extraction:r });
}
function cvAnalyzeText(){
  const t=(document.getElementById("cvText")||{}).value||"";
  if(cvxWords(t)<CVX_MIN_WORDS){ cvErr(`Please add more of your CV (at least ${CVX_MIN_WORDS} words) so there is something to analyse.`); return; }
  cvSaveDraft();
  const d=App.cvDraft||{}, job=App.cvJob, prev=CV.get(), editing=!job && App.cvMode!=="paste" && prev && App.cvView==="text";
  const ext=job&&job.extraction ? { status:job.extraction.status, format:job.extraction.format, limitations:job.extraction.limitations, pages:job.extraction.pages||null, edited:t.trim()!==String(job.extraction.text).trim() }
    : editing ? Object.assign({}, prev.extraction||{ status:"complete", format:"paste", limitations:[] }, { edited:true }) : { status:"complete", format:"paste", limitations:["Pasted text has no formatting, so only wording and structure are assessed."] };
  const confirmedComplete=!!(document.getElementById("cvComplete")||{}).checked || (editing && prev.extraction && prev.extraction.confirmedComplete);
  const target=String(d.target||"").trim().slice(0,80), jd=String(d.jd||"").trim().slice(0,12000);
  const source=job?"upload":editing?prev.source:"paste";
  if(job) cvJobSet({ state:"analysing", step:"Analysing your resume…" }); else { App.cvJob={ state:"analysing", step:"Analysing your resume…" }; scrCV(); }
  setTimeout(()=>{
    let report, v;
    try{ report=analyzeCvQuality(t, { target, jd, extraction:ext, confirmedComplete }); v=validateCvReport(report); }catch(e){ v={ ok:false, errors:[String(e&&e.message||e)] }; }
    if(!v.ok){ App.cvJob=Object.assign(App.cvJob||{}, { state:"failed", failedAt:"analysing", error:"The analysis didn't pass its internal checks, so no score is shown. Check the text (or paste it again) and retry.", file:job&&job.file||null }); scrCV(); return; }
    ext.confirmedComplete=confirmedComplete;
    const keep=editing&&prev?{ items:prev.items }:null;
    const c=CV.analyze(t, source, { format:ext.format, extraction:ext, target, jd, report });
    if(keep){ // keep the user's confirmations for lines that are still present
      const old=Object.fromEntries(keep.items.map(i=>[i.kind+"|"+i.value.toLowerCase(), i]));
      CV.update(cc=>{ cc.items=cc.items.map(i=>{ const o=old[i.kind+"|"+i.value.toLowerCase()]; return o?Object.assign(i,{ status:o.status, edited:o.edited }):i; }).concat(keep.items.filter(i=>i.origin==="user")); });
    }
    App.cvJob=null; App.cvMode=null; App.cvDraft=null; App.cvView="report"; scrCV();
    const h=document.getElementById("cvScore"); if(h) h.focus();
  }, 40);
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
  const c={ text:"", source:"profile", analyzedAt:Date.now(), items, mappings:[] }; c.mappings=buildMappings(c); Repo.cv.save(c); App.cvMode=null; App.cvView="items"; scrCV();
}
function cvSet(id, status){ CV.update(c=>{ const i=c.items.find(x=>x.id===id); if(i) i.status=status; }); scrCV(); }
function cvDel(id){ CV.update(c=>{ c.items=c.items.filter(x=>x.id!==id); }); scrCV(); }
function cvSaveEdit(id){ const v=(document.getElementById("cvEditBox")||{}).value||""; if(v.trim().length<2) return; CV.update(c=>{ const i=c.items.find(x=>x.id===id); if(i){ i.value=v.trim(); i.edited=true; i.status="confirmed"; if(i.kind==="role"){ i.title=v.split(/\s+[—–-]\s+|\s+\(/)[0].trim(); } } }); App.cvEdit=null; scrCV(); }
function cvAdd(kind){ const v=prompt("Add "+CV_KINDS.find(k=>k[0]===kind)[1].toLowerCase().replace(/s$/,"")+" (exactly as it applies to you):"); if(!v||v.trim().length<2) return;
  CV.update(c=>{ c.items.push({ id:cvId(), kind, value:v.trim(), source:"Entered by you", status:"confirmed", origin:"user", title:kind==="role"?v.trim():undefined }); }); scrCV(); }
function cvConfirmAll(){ CV.update(c=>c.items.forEach(i=>{ if(i.status==="pending") i.status="confirmed"; })); scrCV(); }
function cvDeleteAll(){ if(!confirm("Delete your CV text, report, extracted items and mappings from this browser?")) return; Repo.cv.clear(); App.cvMode=null; App.cvJob=null; App.cvDraft=null; App.cvView=null; App.setup.useCv=false; saveSetup(); scrCV(); }

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
