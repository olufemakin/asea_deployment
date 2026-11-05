/* =============================================================================
   CV Quality analysis — deterministic, rubric-first, in the browser.

   The score is /100 across 8 fixed categories. Every category is the sum of named
   criteria with fixed partial-credit rules, so the same text always gets the same
   score and the breakdown always adds up to the total (validateCvReport checks it).

   Rules that must hold:
   - It assesses the DOCUMENT, never the person. Name, photo, age, gender, marital
     status, nationality and address are never read, scored or inferred. Contact
     details are optional and not scored.
   - Employment, freelance, volunteer, academic and independent projects all count
     as experience. Qualitative outcomes earn credit, not only numbers.
   - Keywords alone earn little: skills count most when the experience shows them.
     Keyword-stuffed lines and text addressed to screening tools / AI are ignored.
   - The resume is untrusted input. Text inside it can't change these rules.
   - No fabrication: suggested rewrites only reuse the user's own words; anything
     unknown is a clearly marked [placeholder] or a question.
   - Not a hiring prediction, an ATS score or an assessment guarantee.
   ========================================================================== */
"use strict";

const CVA_VERSION = 1;
const CVA_CATS = [
  { id:"positioning", label:"Professional positioning", max:10 },
  { id:"experience",  label:"Work experience evidence", max:20 },
  { id:"impact",      label:"Quantified impact", max:15 },
  { id:"skills",      label:"Skills evidence", max:15 },
  { id:"education",   label:"Education and qualifications", max:10 },
  { id:"structure",   label:"Structure and readability", max:10 },
  { id:"ai",          label:"AI-training relevance", max:10 },
  { id:"consistency", label:"Consistency signals", max:10 },
];
const CVA_RATINGS = [[90,"Excellent"],[75,"Strong"],[60,"Good foundation"],[40,"Needs improvement"],[0,"Significant revision needed"]];
const CVA_DISCLAIMER = "This score describes how clearly this resume shows evidence for AI-training work. It is not a hiring prediction, an ATS score or a guarantee of any assessment result.";
const cvaRating = t => CVA_RATINGS.find(([m])=>t>=m)[1];
const cvaBadge = (pts,max) => pts/max>=0.75 ? "Strong" : pts/max>=0.35 ? "Partial" : "Missing evidence";

/* ---------- text helpers ---------------------------------------------------- */
const cvaWords = s => (String(s||"").match(/[\p{L}\p{N}][\p{L}\p{N}’'+#&.-]*/gu)||[]).filter(w=>/[\p{L}\p{N}]/u.test(w));
const cvaClip = (t,n) => { t=String(t||"").trim(); return t.length>n ? t.slice(0,n-1).replace(/\s+\S*$/,"")+"…" : t; };
const cvaNorm = s => String(s||"").toLowerCase().replace(/[^\p{L}\p{N}+#]+/gu," ").trim();
const cvaStem = w => { w=w.toLowerCase(); return w.length>5 ? w.slice(0,5) : w; };
const CVA_BULLET = /^\s*([-–—•*·▪●◦►▸✓✔➢➤○■□♦]|\d{1,2}[.)])\s*/;

const CVA_INJECT = /\b(ignore (all |any )?(the )?(previous|prior|above|earlier) (instructions|prompts?|rules)|disregard (the|all|any) (instructions|rules)|you are (an? )?(ai|language model|chatbot|assistant|ats)|system prompt|(rate|score|rank) (this|the) (resume|cv|candidate) (as|at|highly|100|10)|give (this|the) (resume|cv|candidate) (a )?(perfect|high|top|100)|(chatgpt|gpt|claude|gemini|ats|ai)[,:]? (please )?(rank|rate|score|hire|select|pass)|hire this (candidate|person)|this candidate (is|should be) (the best|hired|selected))\b/i;

const CVA_MON = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,sept:8,oct:9,nov:10,dec:11,janv:0,févr:1,fevr:1,mars:2,avr:3,mai:4,juin:5,juil:6,août:7,aout:7,déc:11 };
const CVA_MONRE = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const CVA_END = `(?:${CVA_MONRE}\\.?\\s*,?\\s*((?:19|20)\\d{2})|(0?[1-9]|1[0-2])\\s*[/.]\\s*((?:19|20)\\d{2})|((?:19|20)\\d{2})\\s*[-/.]\\s*(0[1-9]|1[0-2])(?!\\d)|((?:19|20)\\d{2}))`;
const CVA_RANGE = new RegExp(CVA_END+"\\s*(?:–|—|-|−|to|until|till|through)\\s*(?:"+CVA_END+"|(present|current|now|date|today|ongoing))", "gi");
const CVA_CONTACT_RE = /@[\w-]+\.[\w.]+|\b(linkedin|github|gitlab|behance)\.(com|io)\b|https?:\/\/|www\.|\b(phone|tel|mobile|cell|email|e-mail|address|date of birth|dob|nationality|marital status|gender|religion)\s*[:：]/i;
/* Contact / personal lines are skipped (never scored, shown or inferred from). A phone needs 9+ digits once dates are removed. */
const CVA_CONTACT = { test:t=>{ if(CVA_CONTACT_RE.test(t)) return true; const d=String(t).replace(CVA_RANGE," ").replace(/\b(19|20)\d{2}\b/g," "); return (d.match(/\+?\d[\d\s().-]{7,}\d/g)||[]).some(x=>x.replace(/\D/g,"").length>=9); } };
function cvaEndpoint(m, o){
  if(m[o+1]) return { mi:+m[o+1]*12+CVA_MON[m[o].toLowerCase().slice(0,m[o].length>=4&&/^sept/i.test(m[o])?4:3)], fmt:m[o].length>3&&!/^sept$/i.test(m[o])?"Month YYYY":"Mon YYYY", raw:m[o]+" "+m[o+1] };
  if(m[o+3]) return { mi:+m[o+3]*12+(+m[o+2]-1), fmt:"MM/YYYY", raw:m[o+2]+"/"+m[o+3] };
  if(m[o+4]) return { mi:+m[o+4]*12+(+m[o+5]-1), fmt:"YYYY-MM", raw:m[o+4]+"-"+m[o+5] };
  if(m[o+6]) return { mi:+m[o+6]*12, fmt:"YYYY", raw:m[o+6], yearOnly:true };
  return null;
}
function cvaRanges(line, nowMi){
  const out=[]; CVA_RANGE.lastIndex=0; let m;
  while((m=CVA_RANGE.exec(line))){
    const s=cvaEndpoint(m,1), e=m[15] ? { mi:nowMi, fmt:"present", raw:m[15], present:true } : cvaEndpoint(m,8);
    if(s && e && e.mi>=s.mi && s.mi<=nowMi+12) out.push({ start:s.mi, end:e.mi, present:!!e.present, fmts:[s.fmt].concat(e.present?[]:[e.fmt]), raw:m[0].trim(), yearOnly:!!s.yearOnly });
  }
  return out;
}
const cvaMiLabel = mi => ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][mi%12]+" "+Math.floor(mi/12);

/* ---------- vocabulary ---------------------------------------------------------- */
const CVA_HEADS = [
  ["summary", /^(professional |career |personal |executive )?(summary|profile|objective|statement|overview)$|^about( me)?$|^profile summary$|^summary of qualifications$/],
  ["experience", /^((work|professional|employment|relevant|career|industry|teaching|clinical|research|freelance|consulting|military|other|additional) )?(experience|history|background)( (and|&) (projects|achievements))?$|^employment( history)?$|^(work|career|employment) history$|^positions held$/],
  ["projects", /^((key|selected|personal|academic|independent|freelance|side|research|capstone|notable) )?projects?( (and|&) (portfolio|research))?$|^portfolio$/],
  ["volunteer", /^(volunteer(ing)?( experience| work| roles)?|community (involvement|service|work)|leadership( (and|&) (activities|volunteering|involvement))?|extra-?curricular( activities)?|activities( (and|&) interests)?)$/],
  ["education", /^(education|academic (background|history|qualifications|record)|education( (and|&) (training|qualifications|certifications?|credentials))?|qualifications|training|educational background)$/],
  ["skills", /^((key|core|technical|professional|relevant|transferable|soft|hard|additional|other) )?(skills|competencies|competences|strengths|expertise|capabilities|abilities)( (and|&) (tools|technologies|abilities|interests|expertise|competencies))?$|^areas of (expertise|strength)$|^skills summary$|^skill set$/],
  ["tools", /^(tools|software|technologies|technical tools|systems|it skills|computer skills|tech stack|technical proficiencies|digital skills)$/],
  ["languages", /^languages?( skills| spoken)?$/],
  ["certifications", /^(certifications?|certificates?|licen[cs]es?( (and|&) certifications?)?|accreditations?|professional development|continuing education|courses|training (and|&) certifications?|professional (qualifications|memberships?|affiliations))$/],
  ["achievements", /^((key|selected|notable|career) )?(achievements|accomplishments|highlights|awards( (and|&) (honou?rs|recognition))?|honou?rs( (and|&) awards)?|recognition)$/],
  ["publications", /^(publications|presentations|research( (and|&) publications)?|conferences)$/],
  ["interests", /^(interests|hobbies( (and|&) interests)?|personal interests)$/],
  ["references", /^references?( available (up)?on request)?$|^referees$/],
  ["contact", /^(contact( details| information| info)?|personal (details|information|data))$/],
];
const CVA_EVIDENCE_SECS = ["experience","projects","volunteer","achievements","publications"];
const CVA_ROLE_RE = typeof ROLE_WORD!=="undefined" ? ROLE_WORD : /\b(manager|engineer|analyst|specialist|coordinator|officer|assistant|director|lead|developer|consultant|teacher|nurse|writer|editor|technician|designer|administrator|supervisor|intern|volunteer|researcher|tutor)\b/i;
const CVA_VERBS = ("accelerated achieved adapted addressed administered advised advocated allocated analysed analyzed annotated answered applied appraised approved arranged assembled assessed assigned assisted audited authored automated balanced briefed budgeted built calculated catalogued categorised categorized chaired championed checked classified cleaned coached collaborated collected compiled completed composed computed conducted configured consolidated constructed consulted contributed controlled converted coordinated corrected counselled counseled created cultivated curated customised customized debugged decreased defined delegated delivered demonstrated deployed designed detected determined developed devised diagnosed directed discovered dispatched documented drafted drove edited educated eliminated enabled encouraged engineered enhanced ensured established estimated evaluated examined executed expanded expedited explained facilitated fact-checked filed finalised finalized fixed forecasted formulated fostered founded gathered generated graded guided handled headed helped identified implemented improved increased influenced informed initiated inspected installed instructed integrated interpreted interviewed introduced investigated issued justified labelled labeled launched led liaised logged maintained managed mapped marked measured mediated mentored merged migrated moderated modernised modernized monitored motivated negotiated onboarded operated optimised optimized orchestrated ordered organised organized outlined oversaw participated partnered performed piloted pioneered planned prepared presented prevented prioritised prioritized processed produced programmed promoted proofread proposed protected provided published purchased qualified raised ran rated reconciled recorded recruited redesigned reduced refined registered regulated rehabilitated reorganised reorganized repaired replaced reported represented researched resolved responded restored restructured reviewed revised rewrote saved scheduled screened secured selected served serviced set shaped simplified sold solved sorted sourced spearheaded standardised standardized steered streamlined strengthened structured submitted summarised summarized supervised supplied supported surveyed synthesised synthesized systematised tagged taught tested tracked trained transcribed transformed translated triaged troubleshot tutored uncovered updated upgraded validated verified volunteered won wrote "+
  "manage lead develop create design build coordinate deliver review analyse analyze prepare write edit train supervise plan improve conduct research evaluate assess audit inspect monitor maintain resolve handle process support assist teach mentor negotiate draft translate verify test document produce oversee organise organize ensure provide implement operate track schedule").split(/\s+/);
const CVA_VERBSET = new Set(CVA_VERBS);
const CVA_RESP_ONLY = /^(responsible for|responsibilities (included|include)|duties (included|include)|tasked with|in charge of|my role (was|involved|included)|involved in|helped with|assisted with|worked on|participated in|duties:)/i;
const CVA_OUTCOME = /\b(resulting in|resulted in|leading to|led to|which (improved|reduced|increased|helped|allowed|enabled|cut|saved)|so that|enabling|recogni[sz]ed (for|by|as)|commended|praised|thanked|adopted (by|across|as)|became (the )?(standard|default|template)|selected (to|as|for)|promoted (to|after)|awarded|won|earned|achieved|exceeded|improved|reduced|increased|streamlined|eliminated|prevented|saved|cut|boosted|accelerated|strengthened|raised|grew|expanded|shortened|lowered|doubled|tripled|halved|minimi[sz]ed|maximi[sz]ed|resolved|delivered (on time|ahead|under budget)|reducing|improving|increasing|cutting|saving|raising|lowering|shortening|boosting|eliminating|preventing)\b/i;
const CVA_Q = {
  percent:/\d+(\.\d+)?\s?%|\b\d+(\.\d+)?\s?per ?cent\b|\bpercentage points?\b/i,
  currency:/[$£€₦¥₹]\s?\d|\b\d[\d,.]*\s?(k|m|bn|million|billion|thousand)?\s?(usd|cad|eur|gbp|ngn|aud|inr|dollars|euros|pounds|naira)\b/i,
  volume:/\b\d[\d,.]*\s?(k|\+)?\s+(?:[a-z-]+\s+){0,2}(people|persons|staff|employees|team members|reports?|direct reports|projects|clients|customers|students|pupils|learners|trainees|patients|residents|records|documents|files|cases|tickets|calls|queries|enquiries|inquiries|sites|stores|shops|branches|countries|regions|languages|accounts|vendors|suppliers|contractors|users|items|orders|invoices|articles|pages|posts|events|participants|volunteers|members|schools|classes|courses|modules|lessons|transactions|requests|applications|units|products|skus|beds|shifts|contracts|grants|campaigns|leads|words|surveys|interviews|samples|tests|audits|claims|properties|homes|vehicles|deliveries|shipments|colleagues|locations|departments|teams|machines|systems|servers|images|videos|annotations|labels|prompts|responses|tasks|translations|publications|papers)\b/i,
  time:/\b\d+(\.\d+)?\s*(hours?|hrs?|days?|weeks?|months?|minutes?|mins?|seconds?)\b(?!\s+of\s+experience)|\b(daily|weekly|monthly|quarterly|annually|per (day|week|month|year|shift))\b/i,
  scale:/\b\d+(\.\d+)?x\b|\btop \d+%?|\b\d+(st|nd|rd|th) (place|out of|of)\b|\b\d+ out of \d+\b|\b\d(\.\d)?\s?\/\s?(5|10) (rating|score|satisfaction)|\branked\b|\bfrom \d[\d,.]*\s?%?\s?to \d/i,
};
const CVA_Q_LABEL = { percent:"percentages", currency:"money", volume:"volumes or counts", time:"time or frequency", scale:"rankings or before/after comparisons" };

/* Transferable evidence for AI-training work: strong = directly demonstrated, weak = inferred. */
const CVA_CLUSTERS = [
  { id:"review", label:"Reviewing and evaluating work", skill:"quality_review",
    strong:/\b(review(ed|ing)?|evaluat(ed|ing|ion)|assess(ed|ing|ments?)|audit(ed|ing|s)?|quality (assurance|control|checks?)|\bqa\b|\bqc\b|grad(ed|ing)|marked (exams|papers|assignments|scripts|essays)|inspect(ed|ing|ions?)|moderat(ed|ing)|rat(ed|ing) (responses|outputs|content|quality))\b/i,
    weak:/\b(check(ed|ing)?|monitor(ed|ing)|feedback|test(ed|ing))\b/i,
    ai:"AI-training evaluation work is mostly reviewing outputs against criteria and explaining the judgement." },
  { id:"writing", label:"Writing and editing", skill:"writing",
    strong:/\b(wrote|written|writ(e|ing)|edit(ed|ing)|proofread(ing)?|copywrit\w*|authored|drafted|rewrote|technical writing|(prepared|produced|compiled) (\w+ ){0,2}(reports?|documentation|guides?|manuals?|articles?|content|briefs?|proposals?))\b/i,
    weak:/\b(documentation|documented|content|articles?|newsletters?|blogs?|correspondence|minutes|reports?)\b/i,
    ai:"Clear writing is used to justify ratings, rewrite weak AI responses and write reference answers." },
  { id:"research", label:"Research and fact-checking", skill:"fact_checking",
    strong:/\b(research(ed|ing)?|fact[- ]?check(ed|ing)?|verif(y|ied|ying|ication)|cross[- ]?check(ed|ing)?|literature review|due diligence|source (checking|verification))\b/i,
    weak:/\b(investigat(ed|ing|ions?)|sources?|accuracy|evidence|data gathering)\b/i,
    ai:"Fact-checking tasks ask you to verify claims in AI answers against reliable sources." },
  { id:"guidelines", label:"Following detailed guidelines", skill:"instruction_following",
    strong:/\b(follow(ed|ing)? (\w+ ){0,2}(guidelines?|procedures?|protocols?|sops?|instructions|specifications?|checklists?|standards?)|in (line|accordance|compliance) with|complian(ce|t) with|adhered to|applied (\w+ ){0,2}(guidelines?|standards?|rules|criteria)|standard operating procedures?)\b/i,
    weak:/\b(guidelines?|procedures?|protocols?|sops?|complian(ce|t)|regulations?|regulatory|polic(y|ies)|specifications?|checklists?)\b/i,
    ai:"AI-training projects come with detailed rubrics and guidelines that must be applied consistently." },
  { id:"data", label:"Structured data handling", skill:"attention_to_detail",
    strong:/\b(annotat(ed|ing|ions?)|label(l)?(ed|ing)|tagg(ed|ing)|data entry|data (quality|cleaning|validation|cleansing)|classif(ied|ying|ication)|categori[sz](ed|ing)|transcri(bed|bing|ption)|coded (responses|data|survey))\b/i,
    weak:/\b(spreadsheets?|databases?|records|inventory|excel|logged|logs|reconcil(ed|ing|iation))\b/i,
    ai:"Annotation and data-labelling tasks need consistent categories and careful record keeping." },
  { id:"explaining", label:"Explaining and giving feedback", skill:"communication",
    strong:/\b(explain(ed|ing)|taught|teach(ing)?|train(ed|ing) (staff|new|colleagues|users|students|employees|volunteers|team)|present(ed|ations?) (to|at)|mentor(ed|ing)|coach(ed|ing)|gave feedback|provid(ed|ing) feedback|tutor(ed|ing))\b/i,
    weak:/\b(communicat(ed|ion|ing)|present(ed|ations?)|liais(ed|ing)|advis(ed|ing)|support(ed|ing) (users|customers|clients))\b/i,
    ai:"Evaluators explain why one response is better, in plain language that others can check." },
  { id:"reasoning", label:"Problem solving and analysis", skill:"reasoning",
    strong:/\b(troubleshoot(ing)?|troubleshot|diagnos(ed|ing|is)|root[- ]cause|problem[- ]solv(ed|ing)|analy[sz](ed|ing)|investigat(ed|ing)|identified (errors|issues|discrepancies|risks|gaps))\b/i,
    weak:/\b(resolv(ed|ing)|solv(ed|ing)|analysis|issues|problems|risks?)\b/i,
    ai:"Spotting errors and reasoning through edge cases is central to evaluating AI output." },
];
const CVA_AI_DIRECT = /\b(ai|a\.i\.|artificial intelligence|machine learning|\bml\b|llms?|large language models?|chatgpt|gpt-?\d*|generative ai|genai|prompt(s| engineering| writing)|rlhf|model (evaluation|outputs?|responses?|training)|data labell?ing|ai training|training data)\b/i;
const CVA_CODE = /\b(python|javascript|typescript|java|c\+\+|c#|sql|r programming|golang|rust|php|ruby|kotlin|swift|html|css|react|node\.?js|git)\b/i;
const CVA_CLICHE = /\b(hard[- ]?working|team player|go-getter|results[- ]driven|detail[- ]oriented|self[- ]starter|dynamic|passionate|highly motivated|think outside the box|synergy|proven track record|excellent communication skills|fast learner|quick learner)\b/gi;
const CVA_EDU = /\b(b\.?sc|bsc|b\.?a\.?|ba|b\.?eng|b\.?ed|b\.?com|bachelor'?s?|m\.?sc|msc|m\.?a\.?|ma|meng|med|master'?s?|mba|ph\.?d|doctorate|diploma|hnd|ond|nd|associate degree|associate of|degree|gcse|a-levels?|high school|secondary school|waec|neco|ssce|ged|baccalaur[eé]at|licence|btec|nvq|apprenticeship|certificate|cert\.|bootcamp)\b/i;
const CVA_INST = /\b(universit(y|é|ies)|college|school|institute|academy|polytechnic|conservatoire|seminary|lyc[ée]e|faculty)\b/i;
const CVA_CERT = /\b(certified|certificate|certification|licen[cs]ed?|accredited|accreditation|chartered|course|training|bootcamp|apprenticeship|workshop|mooc|coursera|edx|udemy|linkedin learning|google (career )?certificate|registered (nurse|practitioner|engineer))\b/i;
const CVA_STOP = new Set(("a an and or the of to in on for with by at from as is are be been being this that these those it its our your their you we they will would should must can could may might shall "+
  "experience experienced years year ability able strong excellent good great proven demonstrated knowledge understanding skills skill skilled work working role candidate candidates required requirements preferred desirable essential plus including include includes etc "+
  "using use used well highly very across within new other such also both into level levels ideal ideally least minimum responsibilities responsible job position team teams environment related relevant field fields equivalent").split(/\s+/));

/* ---------- 1. Read the document -------------------------------------------------- */
function cvaRead(text, nowMi){
  const raw=String(text||"").replace(/\r\n?/g,"\n").split("\n");
  const lines=[]; raw.forEach(l=>{ const t=l.replace(/\s+/g," ").trim(); if(t) lines.push(t); });
  const L=lines.map((t,i)=>({ i, text:t, body:t.replace(CVA_BULLET,"").trim(), bullet:CVA_BULLET.test(t), bulletChar:(t.match(CVA_BULLET)||[])[1]||"", sec:null, heading:null, contact:CVA_CONTACT.test(t), inject:CVA_INJECT.test(t), stuffed:false }));
  // keyword stuffing: very long term lists, or one word repeated many times in a line
  L.forEach(l=>{ const parts=l.body.split(/\s*[,;|•·]\s*/).filter(Boolean); const wc={}; cvaWords(l.body).forEach(w=>{ if(w.length>3){ const k=w.toLowerCase(); wc[k]=(wc[k]||0)+1; } });
    if(parts.length>30 || Object.values(wc).some(n=>n>=6)) l.stuffed=true; });
  let sec=null; const headings=[];
  L.forEach(l=>{
    const h=cvaNorm(l.text.replace(/[:：]\s*$/,"")).replace(/\s+/g," ");
    const hit=!l.bullet && cvaWords(l.text).length<=6 && l.text.length<=48 && CVA_HEADS.find(([,re])=>re.test(h));
    if(hit){ sec=hit[0]; l.heading=hit[0]; headings.push(l); return; }
    // inline "Skills: a, b, c"
    const inl=l.body.match(/^([A-Za-z][A-Za-z &/]{2,38})[:：]\s*(.+)$/);
    const inSec=inl && CVA_HEADS.find(([,re])=>re.test(cvaNorm(inl[1])));
    if(inSec){ l.sec=inSec[0]; l.inline=inl[2]; return; }
    l.sec=sec;
  });
  // Entries: a non-bullet line with a date range, or a short title line with a job word, inside evidence sections.
  const entries=[]; let cur=null;
  L.forEach(l=>{
    if(l.heading){ cur=null; return; }
    const rs=cvaRanges(l.text, nowMi), evSec=!l.sec || CVA_EVIDENCE_SECS.includes(l.sec) && l.sec!=="achievements";
    const titleLike=!l.bullet && cvaWords(l.body).length<=14 && !/[.!?]$/.test(l.body) && CVA_ROLE_RE.test(l.body);
    if(evSec && !l.contact && ((rs.length && cvaWords(l.body).length<=18 && !l.bullet) || (titleLike && (l.sec==="experience"||l.sec==="volunteer"||l.sec==="projects") && !(cur && !cur.lines.length && !cur.range)))){
      if(cur && !cur.lines.length && !cur.range && rs.length){ cur.headers.push(l); cur.range=rs[0]; l.entry=cur; return; }
      if(cur && !cur.lines.length && cur.range && !rs.length && titleLike){ cur.headers.push(l); l.entry=cur; return; }
      cur={ headers:[l], range:rs[0]||null, lines:[], sec:l.sec||"experience" }; entries.push(cur); l.entry=cur; return;
    }
    if(cur && (l.sec===cur.sec || (!l.sec && cur.sec==="experience"))){ if(!l.contact) cur.lines.push(l); l.entry=cur; }
  });
  entries.forEach(e=>{ e.title=e.headers.map(h=>h.body.replace(CVA_RANGE,"").replace(/[()|,–—-]+\s*$/,"").replace(/\s{2,}/g," ").trim()).filter(Boolean).join(" · "); e.ranges=[].concat(...e.headers.map(h=>cvaRanges(h.text, nowMi))); });
  const used=l=>!l.inject && !l.stuffed && !l.contact && !l.heading;
  const evidenceLines=L.filter(l=>used(l) && (l.entry && !l.entry.headers.includes(l) || l.sec==="achievements" || (l.sec==="experience" && !l.entry)) && cvaWords(l.body).length>=3);
  const summary=L.filter(l=>l.sec==="summary" && used(l));
  const listSecs=["skills","tools","languages"];
  const listTerms=[]; L.filter(l=>used(l) && (listSecs.includes(l.sec))).forEach(l=>{ (l.inline||l.body).split(/\s*[,;|•·]\s*|\s+\/\s+|\s{2,}/).map(x=>x.replace(/^[A-Za-z &]{3,30}[:：]\s*/,"").replace(/[.]$/,"").trim()).filter(x=>x.length>=2 && x.length<=48 && cvaWords(x).length<=5).forEach(x=>listTerms.push({ term:x, sec:l.sec, line:l })); });
  // Opening paragraph (before the first heading) can act as a summary when there is no summary heading.
  const firstHead=headings.length?headings[0].i:L.length;
  const opening=L.filter(l=>l.i<firstHead && used(l) && !l.sec && cvaWords(l.body).length>=12);
  const top=L.slice(0, firstHead).filter(l=>used(l) && !l.sec).slice(0, 4);   // contact / personal lines don't push the title out of view
  const headline=top.find(l=>cvaWords(l.body).length<=14 && CVA_ROLE_RE.test(l.body) && !cvaRanges(l.text,nowMi).length) || null;
  return { L, lines:L.map(l=>l.text), headings, entries, evidenceLines, summary:summary.length?summary:opening, summaryFromHeading:summary.length>0, listTerms, headline, used,
    words:cvaWords(L.filter(l=>!l.contact).map(l=>l.text).join(" ")).length };
}

/* ---------- helpers on the read document ------------------------------------------- */
function cvaQuant(body){ const b=body.replace(CVA_RANGE," ").replace(/\b(19|20)\d{2}\b/g," ").replace(CVA_CONTACT_RE," ").replace(/\+?\d[\d\s().-]{8,}\d/g," "); return Object.keys(CVA_Q).filter(k=>CVA_Q[k].test(b)); }
function cvaFirstVerb(body){ const w=(body.match(/^[A-Za-z-]+/)||[""])[0].toLowerCase(); return CVA_VERBSET.has(w) || /^(re|co|over|out|up)?[a-z]+ed$/.test(w) && w.length>4 && !/^(need|based|skilled|used|red|bed|shed|seed|speed|feed|hundred|detailed|experienced|qualified|interested|dedicated|motivated|talented|organized|organised)$/.test(w); }
function cvaUnion(ranges){ const r=ranges.map(x=>[x.start,x.end]).sort((a,b)=>a[0]-b[0]); let tot=0, cs=null, ce=null;
  r.forEach(([s,e])=>{ if(cs===null){ cs=s; ce=e; } else if(s<=ce){ ce=Math.max(ce,e); } else { tot+=ce-cs; cs=s; ce=e; } }); if(cs!==null) tot+=ce-cs; return tot; }
function cvaShown(D, t){ const toks=cvaNorm(t).split(" ").filter(w=>w.length>=3 && !CVA_STOP.has(w)); if(!toks.length) return false; const st=toks.slice(0,2).map(cvaStem);
  return D.evidenceLines.concat(D.summary).some(l=>{ const n=cvaNorm(l.body).split(" "); return st.every(s=>n.some(w=>cvaStem(w)===s || w.startsWith(s))); }); }
const cvaQuote = l => cvaClip(l.body||l.text, 200);
const cvaPick = (arr, n) => arr.slice(0, n).map(cvaQuote);

/* ---------- 2. Score ------------------------------------------------------------------ */
function cvaScore(D, ctx){
  const C={}; const crit=(cat, id, label, points, max, detail, improve)=>{ points=Math.max(0, Math.min(max, Math.round(points))); (C[cat]=C[cat]||[]).push({ id:cat+"."+id, label, points, max, detail, improve:points<max?improve:"" }); return points; };
  const ev=D.evidenceLines, used=D.used, L=D.L;
  const sumText=D.summary.map(l=>l.body).join(" "), sumW=cvaWords(sumText).length;

  /* Professional positioning (10) */
  crit("positioning","summary","Summary or profile present", sumW>=25&&sumW<=160?3:sumW>=12?2:sumW>0?1:0, 3,
    sumW? `${D.summaryFromHeading?"Summary section":"Opening paragraph"} found (${sumW} words).` : "No summary or profile paragraph found.",
    sumW ? (sumW<25?"Expand your summary to 2–4 sentences (about 40–90 words) so readers understand your focus straight away.":"Tighten your summary to 2–4 sentences (about 40–90 words).") : "Add a 2–4 sentence profile at the top: your field, the kind of work you do best and one verified result.");
  const identity=D.headline || D.summary.find(l=>CVA_ROLE_RE.test(l.body));
  crit("positioning","identity","States a professional identity", identity?2:0, 2, identity?`Identity stated: “${cvaClip(identity.body,90)}”.`:"No job title or professional identity near the top.",
    "Put a clear professional title near the top (for example your current or target role) so the reader knows how to read the rest.");
  const specific=/\b\d+\+?\s*(years?|yrs?)\b/i.test(sumText) || D.listTerms.some(t=>new RegExp("\\b"+t.term.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\b","i").test(sumText)) || (typeof TOOL_LEX!=="undefined" && TOOL_LEX.some(t=>sumText.toLowerCase().includes(t.toLowerCase())));
  crit("positioning","focus","Specific focus (field, years, specialist skills)", sumW&&specific?2:sumW?1:0, 2, sumW?(specific?"The summary names specific skills, tools or years of experience.":"The summary doesn't name a specific field, skills or years."):"No summary to assess.",
    "Name your field and two or three specialist skills from your experience in the summary.");
  const cliches=(sumText.match(CVA_CLICHE)||[]).length, concrete=CVA_Q.percent.test(sumText)||CVA_Q.volume.test(sumText)||CVA_OUTCOME.test(sumText);
  crit("positioning","evidence","Evidence-based rather than generic", !sumW?0:concrete?2:cliches>=2?0:1, 2, !sumW?"No summary to assess.":concrete?"The summary includes a concrete result or scale.":cliches?`The summary relies on ${cliches} generic phrase${cliches>1?"s":""} (for example “${(sumText.match(CVA_CLICHE)||[""])[0]}”).`:"The summary is factual but has no concrete result.",
    "Replace generic adjectives with one verified result or the scale of your work (how many, how often, for whom).");
  crit("positioning","headline","Headline or title line at the top", D.headline?1:0, 1, D.headline?"A title line appears at the top.":"No title line under your name.", "Add a one-line title under your name (for example your profession and specialism).");

  /* Work experience evidence (20) */
  const E=D.entries; const nE=E.length;
  crit("experience","entries","Experience entries (paid, freelance, volunteer, academic or projects)", nE>=2?5:nE===1?3:ev.length>=3?2:0, 5,
    nE?`${nE} entr${nE>1?"ies":"y"} found (${["experience","volunteer","projects"].map(s=>{ const k=E.filter(e=>e.sec===s).length; return k?k+" "+(s==="experience"?"work":s):""; }).filter(Boolean).join(", ")}).`:"No clearly separated experience entries found.",
    "List each role or project as its own entry: title, organisation (or ‘Freelance’ / ‘Volunteer’ / ‘Independent project’) and dates, followed by bullet points.");
  const dated=E.filter(e=>e.range).length;
  crit("experience","dates","Entries have dates", nE?3*dated/nE:0, 3, nE?`${dated} of ${nE} entries have a date range.`:"No entries to check.", "Add a start and end date (month and year) to every entry. Gaps don't need explaining on the resume.");
  const perEntry=nE?E.reduce((a,e)=>a+e.lines.filter(used).length,0)/nE:0;
  crit("experience","detail","Each entry is described", perEntry>=3?4:perEntry>=2?3:perEntry>=1?2:ev.length?1:0, 4, nE?`On average ${perEntry.toFixed(1)} description line${perEntry===1?"":"s"} per entry.`:`${ev.length} description lines found.`,
    "Give each entry 2–5 bullet points describing what you did and what changed because of it.");
  const verbN=ev.filter(l=>cvaFirstVerb(l.body)).length, respN=ev.filter(l=>CVA_RESP_ONLY.test(l.body)).length, vr=ev.length?verbN/ev.length:0;
  crit("experience","action","Descriptions start with what you did", vr>=0.6?4:vr>=0.35?3:vr>=0.15?2:verbN?1:0, 4, ev.length?`${verbN} of ${ev.length} description lines start with an action verb${respN?`; ${respN} start with phrases like “Responsible for”`:""}.`:"No description lines found.",
    respN?`Start lines with the action itself: change “${cvaClip((ev.find(l=>CVA_RESP_ONLY.test(l.body))||{}).body,70)}” to begin with a verb such as “Managed” or “Reviewed”.`:"Start each bullet with a strong verb that says what you did (reviewed, wrote, organised, resolved…).");
  const outL=ev.filter(l=>CVA_OUTCOME.test(l.body) || cvaQuant(l.body).length && /\b(by|from|to|within|under|over|saving|reducing|increasing)\b/i.test(l.body)), or=ev.length?outL.length/ev.length:0;
  crit("experience","outcomes","Outcomes, not only responsibilities", or>=0.4?4:or>=0.2?3:outL.length?2:0, 4, ev.length?`${outL.length} of ${ev.length} description lines describe an outcome (measured or qualitative).`:"No description lines found.",
    "For your main bullets, add what changed because of your work: faster, fewer errors, better feedback, adopted by others. Words are fine if you don't have numbers.");

  /* Quantified impact (15) */
  const qL=ev.map(l=>({ l, k:cvaQuant(l.body) })).filter(x=>x.k.length), qN=qL.length, qualN=outL.filter(l=>!cvaQuant(l.body).length).length;
  const qPts=qN>=6?8:qN>=4?6:qN>=2?4:qN===1?2:0, qualPts=qualN>=2?3:qualN===1?2:0;
  crit("impact","count","Statements with numbers or scale", Math.max(qPts, qualPts), 8, qN?`${qN} description line${qN>1?"s":""} include numbers${qualN?`; ${qualN} more describe outcomes in words`:""}.`:qualN?`No numbers, but ${qualN} line${qualN>1?"s":""} describe outcomes in words (partial credit).`:"No numbers, scale or measurable outcomes found in the experience.",
    "Add verified numbers where you have them: how many (records, clients, students), how often, how much time or money, or a before/after. Never estimate what you can't support.");
  const types=new Set([].concat(...qL.map(x=>x.k)));
  crit("impact","variety","Different kinds of measures", types.size>=3?4:types.size===2?3:types.size===1?2:0, 4, types.size?`Measures used: ${Array.from(types).map(t=>CVA_Q_LABEL[t]).join(", ")}.`:"No measures used.",
    `Mix the kinds of evidence you give: ${["volume","time","percent","scale"].filter(t=>!types.has(t)).map(t=>CVA_Q_LABEL[t]).slice(0,2).join(" and ")||"volume and time"}.`);
  const tied=qL.filter(x=>CVA_OUTCOME.test(x.l.body)).length;
  crit("impact","tied","Numbers tied to a result", tied>=2?3:tied===1?2:0, 3, qN?`${tied} of ${qN} quantified line${qN>1?"s":""} connect the number to a result.`:"No quantified lines.",
    qN?`Say what the number achieved, e.g. “${cvaClip(qL.find(x=>!CVA_OUTCOME.test(x.l.body))?.l.body||qL[0].l.body,70)}” → add “…, which reduced/improved [verified result]”.`:"When you add a number, connect it to the result it produced.");

  /* Skills evidence (15) */
  const LT=D.listTerms.filter(t=>t.sec!=="languages"), nLT=LT.length;
  const evText=ev.concat(D.summary).map(l=>cvaNorm(l.body)).join(" \n ");
  const shows=t=>cvaShown(D,t);
  const demo=LT.filter(t=>shows(t.term)), dr=nLT?demo.length/nLT:0;
  crit("skills","listed","Skills are listed", nLT>=5?3:nLT>=2?2:nLT===1?1:0, 3, nLT?`${nLT} skills or tools listed.`:"No skills list found.", "Add a short skills section grouped by type (for example Tools, Methods, Languages).");
  const skillLex=typeof SKILL_LEX!=="undefined"?SKILL_LEX.filter(k=>evText.includes(k)).length:0;
  crit("skills","demonstrated","Listed skills are shown in the experience", nLT ? (dr>=0.5?6:dr>=0.25?4:demo.length?2:0) : (skillLex>=3?4:skillLex?2:0), 6,
    nLT?`${demo.length} of ${nLT} listed skills also appear in your experience or summary${demo.length?` (for example “${cvaClip(demo[0].term,40)}”)`:""}.`:`No skills list; ${skillLex} skill term${skillLex===1?"":"s"} appear in your experience.`,
    nLT?`Show your key skills in action: ${LT.filter(t=>!demo.includes(t) && !new RegExp(CVA_CLICHE.source,"i").test(t.term)).slice(0,3).map(t=>"“"+cvaClip(t.term,30)+"”").join(", ")} ${LT.filter(t=>!demo.includes(t)).length>1?"are":"is"} listed but not shown in any experience bullet.${LT.some(t=>new RegExp(CVA_CLICHE.source,"i").test(t.term))?" Personal qualities such as “team player” are better shown through an example than listed.":""}`:"Name the skills you used inside your experience bullets, then list the main ones in a skills section.");
  const toolsCtx=typeof TOOL_LEX!=="undefined"?TOOL_LEX.filter(t=>new RegExp("(^|[^A-Za-z])"+t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(?![A-Za-z])", t.length<=4?"":"i").test(ev.map(l=>l.body).join("\n"))):[];
  const methodsCtx=ev.filter(l=>/\b(using|with|in|via|through)\s+[A-Z][\w+#.-]+/.test(l.body)).length;
  crit("skills","tools","Tools or methods named in context", toolsCtx.length>=3?3:toolsCtx.length||methodsCtx>=2?2:methodsCtx?1:0, 3, toolsCtx.length?`Tools named inside experience: ${toolsCtx.slice(0,5).join(", ")}.`:methodsCtx?`${methodsCtx} line${methodsCtx>1?"s":""} name a method or system you used.`:"No tools or methods are named inside the experience.",
    "Mention the tools or methods you actually used inside the relevant bullets (for example “…using Excel pivot tables”).");
  const dupTerms=nLT-new Set(LT.map(t=>cvaNorm(t.term))).size, stuffedN=L.filter(l=>l.stuffed).length;
  crit("skills","focus","Focused list (no keyword stuffing)", !nLT?0:stuffedN||nLT>40?0:nLT>25||dupTerms?2:3, 3, !nLT?"No skills list.":stuffedN?`${stuffedN} line${stuffedN>1?"s look":" looks"} keyword-stuffed and earned no credit.`:`${nLT} skills listed${dupTerms?`, ${dupTerms} repeated`:""}.`,
    !nLT?"Add a focused skills list (about 8–20 items).":stuffedN?"Remove long keyword lists. Keep 8–20 skills you can show evidence for.":"Trim the skills list to about 8–20 items you can back up, without repeats.");

  /* Education and qualifications (10) */
  const eduL=L.filter(l=>used(l) && (l.sec==="education" || l.sec==="certifications" || CVA_EDU.test(l.body) && cvaWords(l.body).length<=24)), eduSec=D.headings.some(h=>h.heading==="education");
  const qual=eduL.filter(l=>CVA_EDU.test(l.body) || CVA_CERT.test(l.body) || l.sec==="education");
  crit("education","qualification","Qualification or training listed", qual.length&&eduSec?4:qual.length?3:0, 4, qual.length?`${qual.length} education or training line${qual.length>1?"s":""} found${eduSec?" in an Education section":""}.`:"No education, training or qualification found.",
    qual.length?"Put your qualifications under their own Education (or Education & Training) heading.":"Add your highest qualification or relevant training (school, college, apprenticeship, courses or certificates all count).");
  const inst=eduL.some(l=>CVA_INST.test(l.body)) || eduL.length>=2, eyear=eduL.some(l=>/\b(19|20)\d{2}\b/.test(l.body));
  crit("education","details","Institution and dates given", (inst?2:0)+(eyear?1:0), 3, qual.length?`${inst?"Institution or provider named":"No institution named"}; ${eyear?"year given":"no year given"}.`:"Nothing to check.",
    "For each qualification give the provider (school, college, university or training body) and the year completed or expected.");
  const certL=L.filter(l=>used(l) && (l.sec==="certifications" || (typeof CERT_LEX!=="undefined" && CERT_LEX.test(l.body)) || CVA_CERT.test(l.body) && (l.sec==="education"||l.sec==="certifications")));
  crit("education","certs","Certifications, licences or courses", certL.length>=2?3:certL.length?2:0, 3, certL.length?`${certL.length} certification, licence or course line${certL.length>1?"s":""} found.`:"No certifications, licences or courses listed.",
    "If you've completed relevant courses, certificates or licences (including free online ones), list them with the provider and year. Don't list ones you haven't completed.");

  /* Structure and readability (10) */
  const hk=new Set(D.headings.map(h=>h.heading)), nh=D.headings.length;
  crit("structure","headings","Clear section headings", nh>=4?3:nh>=2?2:nh===1?1:0, 3, nh?`${nh} section heading${nh>1?"s":""} recognised: ${Array.from(hk).join(", ")}.`:"No standard section headings recognised.",
    "Use standard headings such as Summary, Experience, Education and Skills so readers can scan the page.");
  const core=[["experience","projects","volunteer"].some(k=>hk.has(k))||nE>0, ["education","certifications"].some(k=>hk.has(k)), ["skills","tools","languages"].some(k=>hk.has(k))];
  crit("structure","core","Core sections present", core.filter(Boolean).length, 3, `${["Experience","Education","Skills"].filter((x,i)=>core[i]).join(", ")||"None"} present${core.every(Boolean)?"":"; missing: "+["Experience","Education / training","Skills"].filter((x,i)=>!core[i]).join(", ")}.`,
    `Add the missing section${core.filter(x=>!x).length>1?"s":""}: ${["Experience (any work, volunteer or project experience)","Education or training","Skills"].filter((x,i)=>!core[i]).join("; ")}.`);
  const longL=ev.filter(l=>cvaWords(l.body).length>45).length, bulletR=ev.length?ev.filter(l=>l.bullet||cvaWords(l.body)<=30).length/ev.length:0;
  crit("structure","scan","Easy to scan (bullets, short lines)", !ev.length?0:bulletR>=0.7&&!longL?2:bulletR>=0.4?1:0, 2, ev.length?`${Math.round(bulletR*100)}% of description lines are bullets or short lines${longL?`; ${longL} line${longL>1?"s are":" is"} over 45 words`:""}.`:"No description lines.",
    "Break long paragraphs into bullets of one or two lines each.");
  const w=D.words;
  crit("structure","length","Length", w>=250&&w<=1100?2:(w>=150&&w<250)||(w>1100&&w<=1600)?1:0, 2, `About ${w} words.`, w<250?"Your resume is short: add detail to your experience entries (what you did and what changed).":"Your resume is long: keep the most relevant 10–15 years and cut repeated points.");

  /* AI-training relevance (10) */
  const evPlus=ev.concat(D.summary).filter(used);
  const cl=CVA_CLUSTERS.map(c=>{ const s=evPlus.filter(l=>c.strong.test(l.body)), w2=s.length?[]:evPlus.filter(l=>c.weak.test(l.body)); return Object.assign({}, c, { status:s.length?"demonstrated":w2.length?"inferred":"none", lines:(s.length?s:w2).slice(0,2) }); });
  const nS=cl.filter(c=>c.status==="demonstrated").length, nW=cl.filter(c=>c.status==="inferred").length;
  crit("ai","transferable","Transferable evidence for AI-training tasks", Math.min(6, Math.round(nS*1.25+nW*0.6)), 6, `${nS} kind${nS===1?"":"s"} of transferable work directly shown${nW?`, ${nW} more inferred from wording`:""}.`,
    `Make transferable work explicit in your bullets, if you've done it: ${cl.filter(c=>c.status!=="demonstrated").slice(0,3).map(c=>c.label.toLowerCase()).join("; ")}.`);
  const aiEv=evPlus.filter(l=>CVA_AI_DIRECT.test(l.body)), aiList=D.listTerms.some(t=>CVA_AI_DIRECT.test(t.term));
  crit("ai","direct","Direct AI or data work", aiEv.length?2:aiList?1:0, 2, aiEv.length?`AI or data-training work described: “${cvaClip(aiEv[0].body,90)}”.`:aiList?"AI tools are listed as skills but not described in your experience.":"No AI or data-training work shown. That's fine: most people start from transferable experience.",
    aiList?"If you've used AI tools at work, describe one concrete use and what you checked or improved. Only include it if it's true.":"Not required. If you have any AI-related experience (even evaluating AI tools at work or a course), describe it specifically.");
  const span=cvaUnion(E.filter(e=>e.range && e.sec!=="projects").map(e=>e.range)), profCert=certL.length>0 || qual.some(l=>/\b(bachelor|master|ph\.?d|doctorate|degree|b\.?sc|m\.?sc|mba|diploma|licen[cs]ed|registered|chartered)\b/i.test(l.body));
  crit("ai","depth","Depth in a field", span>=36||profCert&&span>=12?2:span>=12||profCert?1:0, 2, `${span?`Dated experience covers about ${Math.floor(span/12)} year${Math.floor(span/12)===1?"":"s"}${span%12?` ${span%12} month${span%12>1?"s":""}`:""}`:"No dated experience to measure"}${profCert?"; a formal qualification or certification is listed":""}.`,
    "Domain-expert AI work values depth: make your years in a field and any formal qualifications easy to find.");

  /* Consistency signals (10) */
  const allR=[].concat(...E.map(e=>e.ranges||[])); const fmts=[].concat(...allR.map(r=>r.fmts));
  const fc={}; fmts.forEach(f=>fc[f]=(fc[f]||0)+1); const dom=Object.entries(fc).sort((a,b)=>b[1]-a[1])[0], domShare=dom?dom[1]/fmts.length:0;
  crit("consistency","dates","Date format consistency", fmts.length<2?1:domShare===1?3:domShare>=0.75?2:1, 3,
    fmts.length<2?"Fewer than two dates to compare.":`${dom[1]} of ${fmts.length} dates use the “${dom[0]}” format${Object.keys(fc).length>1?`; others: ${Object.entries(fc).filter(x=>x[0]!==dom[0]).map(x=>`${x[1]} × ${x[0]}`).join(", ")}`:""}.`,
    fmts.length<2?"Add dates to your entries in one format (for example “Mar 2021 – Present”).":`Use one date format throughout (for example “${dom?dom[0]:"Mon YYYY"}”).`);
  const st=E.filter(e=>e.range && e.sec==="experience").map(e=>e.range.start); let desc=0, asc=0; for(let i=1;i<st.length;i++){ if(st[i]>st[i-1]) asc++; else if(st[i]<st[i-1]) desc++; }
  const inv=Math.min(asc,desc);
  crit("consistency","order","Consistent order of entries", st.length<2?1:inv===0?2:inv===1?1:0, 2, st.length<2?"Fewer than two dated work entries to compare.":inv===0?(asc>desc?"Entries run oldest first (consistent; most readers expect the most recent first).":"Entries run most recent first."):`${inv} entr${inv>1?"ies are":"y is"} out of order.`,
    st.length<2?"Date your entries so the order is clear.":"List entries in reverse-chronological order (most recent first) within each section.");
  const bl=L.filter(l=>l.bullet && l.bulletChar && !/^\d/.test(l.bulletChar)); const bc={}; bl.forEach(l=>bc[l.bulletChar]=(bc[l.bulletChar]||0)+1); const bdom=Object.entries(bc).sort((a,b)=>b[1]-a[1])[0];
  crit("consistency","bullets","Bullet style consistency", !bl.length?1:bdom[1]/bl.length>=0.95?2:bdom[1]/bl.length>=0.8?1:0, 2, bl.length?`${bdom[1]} of ${bl.length} bullets use “${bdom[0]}”${Object.keys(bc).length>1?`; ${Object.keys(bc).length} different bullet symbols used`:""}.`:"No bullet symbols detected in the text.",
    bl.length?"Use one bullet symbol throughout.":"Use bullet points for your experience descriptions.");
  const hs=D.headings.map(h=>h.text.replace(/[:：]\s*$/,"")).map(t=>t===t.toUpperCase()?"UPPER":/^[A-Z][^\s]*(\s+([A-Z&]|and|of|or|the|in|for)[^\s]*)*$/.test(t)?"Title":"Sentence"); const hsU=new Set(hs);
  crit("consistency","headings","Heading style consistency", hs.length<2||hsU.size===1?1:0, 1, hs.length<2?"Fewer than two headings to compare.":hsU.size===1?`All ${hs.length} headings use the same capitalisation.`:`Headings mix ${Array.from(hsU).join(" and ").toLowerCase()} case.`, "Use the same capitalisation for every heading.");
  const seen={}, dups=[]; L.forEach(l=>{ if(cvaWords(l.body).length<5) return; const k=cvaNorm(l.body); if(seen[k]) dups.push(l); else seen[k]=1; });
  crit("consistency","repeats","No repeated lines", dups.length?0:1, 1, dups.length?`${dups.length} line${dups.length>1?"s are":" is"} repeated word for word (for example “${cvaClip(dups[0].body,60)}”).`:"No repeated lines.", "Remove or reword lines that appear more than once.");
  const blt=L.filter(l=>l.bullet && cvaWords(l.body).length>=4), per=blt.filter(l=>/[.]$/.test(l.body)).length, pr=blt.length?per/blt.length:1;
  crit("consistency","punct","Bullet punctuation consistency", pr>=0.8||pr<=0.2?1:0, 1, blt.length?`${per} of ${blt.length} bullets end with a full stop.`:"No bullets to compare.", "End every bullet the same way (all with a full stop, or none).");

  return C;
}

/* ---------- 3. Neutral findings, profile, sections ------------------------------------ */
function cvaFindings(D){
  const F=[], E=D.entries.filter(e=>e.range);
  for(let i=0;i<E.length;i++) for(let j=i+1;j<E.length;j++){ const a=E[i].range, b=E[j].range, ov=Math.min(a.end,b.end)-Math.max(a.start,b.start);
    if(ov>=2 && E[i].sec==="experience" && E[j].sec==="experience") F.push({ kind:"overlap", tone:"neutral", text:`Overlapping dates: “${cvaClip(E[i].title,50)}” (${E[i].range.raw}) and “${cvaClip(E[j].title,50)}” (${E[j].range.raw}) overlap by about ${ov} months. That's common for part-time, freelance or concurrent roles; if they were concurrent, you might label one as part-time or freelance.` }); }
  const claim=D.L.map(l=>l.body.match(/\b(\d{1,2})\+?\s*(?:years?|yrs?)(?:'|’)?\s*(?:of\s+)?(?:\w+\s+){0,3}experience\b/i)).find(Boolean);
  const span=cvaUnion(D.entries.filter(e=>e.range && e.sec==="experience").map(e=>e.range));
  if(claim && span && +claim[1]*12 > span+30) F.push({ kind:"claim", tone:"check", text:`Worth checking: the resume says “${claim[0]}”, while the dated work entries cover about ${Math.floor(span/12)} years. If earlier experience isn't listed, that's fine; readers may still ask about it.` });
  D.entries.forEach(e=>{ if(e.headers.some(h=>/\b(19|20)\d{2}\b/.test(h.text)) && !e.range && e.sec==="experience") F.push({ kind:"date", tone:"check", text:`“${cvaClip(e.title,60)}” has a year but no clear date range.` }); });
  const inj=D.L.filter(l=>l.inject).length; if(inj) F.push({ kind:"inject", tone:"check", text:`${inj} line${inj>1?"s":""} addressed to screening software or AI ${inj>1?"were":"was"} ignored and did not affect the score. Remove ${inj>1?"them":"it"}: human readers may see ${inj>1?"them":"it"} too.` });
  const st=D.L.filter(l=>l.stuffed).length; if(st) F.push({ kind:"stuffing", tone:"check", text:`${st} line${st>1?"s look":" looks"} like keyword lists (very long or heavily repeated) and earned no credit.` });
  F.push({ kind:"visual", tone:"info", text:"Visual formatting (fonts, colours, columns, spacing) isn't assessed: only the extracted text is analysed." });
  return F;
}
function cvaProfile(D){
  const E=D.entries, LT=D.listTerms, sec=s=>D.L.filter(l=>D.used(l) && l.sec===s).map(l=>l.inline||l.body);
  const ranges=E.filter(e=>e.range && e.sec!=="projects").map(e=>e.range), span=cvaUnion(ranges);
  const earliest=ranges.length?Math.min(...ranges.map(r=>r.start)):null, cur=ranges.some(r=>r.present);
  return {
    headline:D.headline?cvaClip(D.headline.body,120):"",
    recentRole:E.length?cvaClip(E[0].title,120):"",
    entries:{ work:E.filter(e=>e.sec==="experience").length, volunteer:E.filter(e=>e.sec==="volunteer").length, projects:E.filter(e=>e.sec==="projects").length },
    datedSpan: ranges.length ? `${cvaMiLabel(earliest)} – ${cur?"present":cvaMiLabel(Math.max(...ranges.map(r=>r.end)))}` : "",
    experienceYears: span ? Math.floor(span/12) : null,
    sections:D.headings.map(h=>h.heading).filter((x,i,a)=>a.indexOf(x)===i),
    skills:LT.filter(t=>t.sec==="skills").map(t=>t.term).slice(0,10),
    tools:LT.filter(t=>t.sec==="tools").map(t=>t.term).slice(0,10),
    languages:LT.filter(t=>t.sec==="languages").map(t=>t.term).slice(0,6),
    education:sec("education").filter(x=>cvaWords(x).length>=2).slice(0,3).map(x=>cvaClip(x,120)),
    certifications:sec("certifications").slice(0,4).map(x=>cvaClip(x,120)),
    words:D.words,
  };
}

/* Rewrite helpers: reuse the user's words; unknowns become [placeholders]. */
const CVA_IRREG = { running:"ran", leading:"led", writing:"wrote", teaching:"taught", building:"built", making:"made", overseeing:"oversaw", setting:"set", sending:"sent", buying:"bought", selling:"sold", meeting:"met", keeping:"kept", giving:"gave", taking:"took", bringing:"brought", drawing:"drew", choosing:"chose", speaking:"spoke", holding:"held", winning:"won", finding:"found", handling:"handled", planning:"planned", shipping:"shipped", mapping:"mapped", logging:"logged", tagging:"tagged", auditing:"audited", editing:"edited", visiting:"visited", monitoring:"monitored", ordering:"ordered", offering:"offered", delivering:"delivered", answering:"answered", entering:"entered", filtering:"filtered", gathering:"gathered", covering:"covered", referring:"referred", transferring:"transferred", controlling:"controlled", travelling:"travelled", labelling:"labelled", modelling:"modelled", cancelling:"cancelled" };
function cvaPastFixed(g){ // pick a past tense: “managing” → “managed”, “preparing” → “prepared”
  const w=g.toLowerCase(); if(CVA_IRREG[w]) return CVA_IRREG[w];
  const b=w.replace(/ing$/,"");
  const eWords=/(manag|prepar|coordinat|organis|organiz|creat|updat|validat|translat|evaluat|investigat|facilitat|generat|operat|compil|analys|analyz|schedul|issu|resolv|serv|receiv|achiev|improv|produc|reduc|introduc|assur|ensur|measur|secur|procur|advis|revis|supervis|us|guid|provid|decid|prioritis|prioritiz|summaris|summariz|categoris|categoriz|optimis|optimiz|standardis|standardiz|caus|clos|purchas|releas|increas|decreas|stor|scor|shar|prepar|declar|compar|explor|restor|negotiat|communicat|educat|motivat|calculat|automat|integrat|demonstrat|rat|locat|allocat|participat|anticipat|cultivat|initiat|complet|delet|writ|mov|remov|approv|hous|nurs|retir|hir|interview|tak|mak|giv|driv|liv|solv|involv|argu|valu|continu|pursu|rescu|tim|nam|fram|shap|tap|typ|cod|grad|trad|upgrad|handl|tackl|settl|bundl|sampl|assembl|tabl|enabl|structur|captur|featur|lectur|nurtur|sourc|forc|balanc|financ|influenc|enhanc|referenc|experienc|convinc|danc|plac|fac|trac|replac|pric|invoic|practic|servic|notic)$/;
  if(eWords.test(b)) return b+"ed";
  if(/([bdgmnprt])\1$/.test(b)) return b.slice(0,-1)+"ed";
  if(/[^aeiou]y$/.test(b)) return b.slice(0,-1)+"ied";
  return b+"ed";
}
function cvaRewriteBullet(body){
  let core=body.replace(/[.;]\s*$/,"").trim(), changed=false;
  const m=core.match(CVA_RESP_ONLY);
  if(m){ core=core.slice(m[0].length).replace(/^[:\s-]+/,"").trim(); changed=true;
    const g=core.match(/^([a-z]+ing)\b/i);
    if(g) core=cvaPastFixed(g[1]).replace(/^./,c=>c.toUpperCase())+core.slice(g[1].length);
    else core="[Action verb, e.g. Managed / Reviewed / Delivered] "+core;
  }
  else if(/^[a-z]+ing\b/i.test(core) && !cvaFirstVerb(core)){ const g=core.match(/^([a-z]+ing)\b/i)[1]; core=cvaPastFixed(g).replace(/^./,c=>c.toUpperCase())+core.slice(g.length); changed=true; }
  if(changed) core=core.replace(/(\band|,)\s+([a-z]+ing)\b/g,(m0,j,g)=>`${j} ${cvaPastFixed(g)}`);
  core=core.replace(/^./,c=>c.toUpperCase());
  const hasScale=cvaQuant(core).length>0, hasOut=CVA_OUTCOME.test(core);
  let s=core;
  if(!hasScale) s+=" [verified scale: how many / how often / for whom]";
  if(!hasOut) s+=", resulting in [verified result, e.g. time saved, errors reduced or feedback received]";
  const qs=[]; if(!hasScale) qs.push("How many, how often or for how many people did you do this? Use a number you can support."); if(!hasOut) qs.push("What changed because of this work? A qualitative result (e.g. ‘adopted as the team template’) is fine.");
  return { original:body, suggested:s+".", questions:qs, changedVerb:changed };
}

/* ---------- 4. JD comparison (separate from the score) --------------------------------- */
/* Small synonym groups so a requirement's wording can match the resume's own words (no keyword is ever added to the resume). */
const CVA_SYN = [["guide","proce","proto","sops","instr","stand","rules","polic","rubri"],["revie","check","evalu","audit","asses","inspe","rate","rated","ratin","grade","gradi"],
  ["custo","clien","patie","servi"],["writt","writi","wrote","write","draft","edite","editi","edit"],["resea","inves","verif","fact"],["detai","accur","preci","caref"],
  ["sprea","excel","sheet"],["annot","label","taggi","tagge","class","categ"],["commu","liais","prese","expla"],["analy","asses"],["manag","super","overs","led","lead","leadi"]];
const CVA_SYNMAP = (()=>{ const m={}; CVA_SYN.forEach((g,i)=>g.forEach(k=>{ if(!(k in m)) m[k]="#"+i; })); return m; })();
const cvaSyn = w => { const st=cvaStem(w); return CVA_SYNMAP[st]||CVA_SYNMAP[st.slice(0,4)]||st; };
function cvaRequirements(jd){
  const lines=String(jd||"").replace(/\r/g,"").split(/\n|(?<=[.;])\s+(?=[A-Z])/).map(l=>l.replace(CVA_BULLET,"").replace(/\s+/g," ").trim()).filter(l=>cvaWords(l).length>=3 && cvaWords(l).length<=60);
  const cue=/\b(experience|ability|able to|knowledge|familiar|proficien|skills?|degree|qualification|certif|must|required|essential|preferred|desirable|strong|excellent|background in|understanding of|track record|fluency|fluent|years)\b/i;
  const req=lines.filter(l=>cue.test(l) && !CVA_INJECT.test(l));
  return (req.length?req:lines.filter(l=>!CVA_INJECT.test(l))).slice(0,15);
}
function cvaCompareJD(D, jd, years){
  const reqs=cvaRequirements(jd); if(!reqs.length) return null;
  const evL=D.evidenceLines.concat(D.summary).filter(D.used), listL=D.listTerms.map(t=>t.term);
  const SHORT=new Set(["ai","ml","qa","qc","ux","ui","hr","it","r","c","c#","c++","go","bi","3d","pr","seo"]);
  const toks=s=>cvaNorm(s).split(" ").filter(w=>(w.length>=3 || SHORT.has(w)) && !CVA_STOP.has(w) && !/^\d+$/.test(w));
  const items=reqs.map(r=>{
    const T=Array.from(new Set(toks(r))).slice(0,8); if(!T.length) return null;
    const ym=r.match(/\b(\d{1,2})\+?\s*(?:years?|yrs?)\b/i);
    const has=(text,t)=>{ const st=cvaSyn(t); return cvaNorm(text).split(" ").some(w=>cvaSyn(w)===st); };
    let best=null, bestN=0; evL.forEach(l=>{ const n=T.filter(t=>has(l.body,t)).length; if(n>bestN){ bestN=n; best=l; } });
    const inList=T.filter(t=>listL.some(x=>has(x,t)));
    const cov=bestN/T.length, matched=best?T.filter(t=>has(best.body,t)):[], missing=T.filter(t=>!matched.includes(t) && !inList.includes(t));
    let status = (cov>=0.6 || (T.length<=2 && bestN===T.length)) ? "supported" : (new Set(matched.concat(inList)).size/T.length>=0.4) ? "partial" : "not_evidenced";
    let note="";
    if(ym){ if(years==null){ status=status==="supported"?"partial":status; note="The resume has no dated entries to compare the years requirement with."; }
      else if(years>=+ym[1]){ note=`Your dated entries cover about ${years} years.`; } else { status=status==="not_evidenced"?status:"partial"; note=`Your dated entries cover about ${years} year${years===1?"":"s"}; the posting asks for ${ym[1]}+. Earlier or unlisted experience can be added if it's real.`; } }
    const tip = status==="supported" ? `Your resume already shows this. Where it's accurate, describe it in the posting's own words${missing.length?` (it also mentions “${missing.slice(0,2).join("”, “")}”)`:""}.`
      : status==="partial" ? `Make the link explicit${inList.length&&cov<0.4?": it's in your skills list but not shown in your experience":""}. If you've done this, add one specific example${missing.length?` (posting words not found in your experience: “${missing.slice(0,3).join("”, “")}”)`:""}.`
      : "Not found in this resume. If you have this experience, add a concrete example. If you don't, don't add the keyword; consider preparing for it instead.";
    return { requirement:cvaClip(r,240), status, evidence:best&&bestN?cvaQuote(best):"", listed:inList.slice(0,3), matched, missing:missing.slice(0,5), note, tip };
  }).filter(Boolean);
  return { requirements:items, counts:{ supported:items.filter(x=>x.status==="supported").length, partial:items.filter(x=>x.status==="partial").length, not_evidenced:items.filter(x=>x.status==="not_evidenced").length },
    disclaimer:"This compares the text you pasted with your resume only. It doesn't access any employer or applicant-tracking system and isn't a match score." };
}

/* ---------- 5. Assemble the report --------------------------------------------------------- */
const CVA_WHY = {
  "positioning.summary":"Reviewers read the top third first; a short profile tells them how to interpret everything below.",
  "positioning.identity":"Without a stated identity, readers have to guess what you do from the job list.",
  "positioning.focus":"Specific skills and years make your experience easy to match to a project.",
  "positioning.evidence":"Generic adjectives can't be checked; a concrete result can.",
  "positioning.headline":"A title line is the fastest way to signal your field.",
  "experience.entries":"Clearly separated entries let readers see where each piece of experience came from.",
  "experience.dates":"Dates show how recent and how long each experience was.",
  "experience.detail":"Entries without descriptions don't show what you actually did.",
  "experience.action":"Starting with the action makes your contribution clear; “responsible for” describes the job, not your work.",
  "experience.outcomes":"Outcomes show the quality of your work, which is what evaluation work depends on.",
  "impact.count":"Numbers and scale make claims concrete and checkable.",
  "impact.variety":"Different measures (volume, time, quality) give a fuller picture of your work.",
  "impact.tied":"A number on its own shows activity; tied to a result it shows impact.",
  "skills.listed":"A short skills list helps readers scan for what they need.",
  "skills.demonstrated":"Skills shown in your experience are believable; a list alone is not evidence.",
  "skills.tools":"Naming tools in context shows how you used them, not just that you've heard of them.",
  "skills.focus":"Long keyword lists dilute the skills you can actually support.",
  "education.qualification":"Qualifications and training are part of the evidence, whatever their level.",
  "education.details":"Provider and year make a qualification verifiable.",
  "education.certs":"Courses and certificates show current, relevant learning.",
  "structure.headings":"Standard headings let readers (and parsers) find each section.",
  "structure.core":"Readers expect experience, education or training, and skills.",
  "structure.scan":"Short bullets are easier to read than dense paragraphs.",
  "structure.length":"The right length keeps the most relevant evidence visible.",
  "ai.transferable":"AI-training work relies on reviewing, writing, research, guideline and data skills; explicit examples make them visible.",
  "ai.direct":"Direct AI experience helps, but it isn't required to start.",
  "ai.depth":"Domain-expert projects look for depth in a field.",
  "consistency.dates":"Consistent dates look careful, which matters for detail-oriented work.",
  "consistency.order":"A consistent order makes your history easy to follow.",
  "consistency.bullets":"Mixed bullet symbols suggest copy-and-paste from different sources.",
  "consistency.headings":"Consistent headings make the page look deliberate.",
  "consistency.repeats":"Repeated lines waste space and look like copy errors.",
  "consistency.punct":"Consistent punctuation is a small, visible signal of care.",
};
/* Advice that only makes sense once its parent criterion has some evidence (avoids repeating “add numbers” three times). */
const CVA_DEPENDS = { "impact.variety":["impact.count"], "impact.tied":["impact.count"], "positioning.focus":["positioning.summary"], "positioning.evidence":["positioning.summary"],
  "education.details":["education.qualification"], "skills.focus":["skills.listed"], "structure.scan":["experience.detail"] };
const CVA_DOC_FIX = new Set(["positioning.summary","positioning.identity","positioning.focus","positioning.evidence","positioning.headline","experience.entries","experience.dates","experience.detail","experience.action","experience.outcomes","impact.count","impact.variety","impact.tied","skills.listed","skills.demonstrated","skills.tools","skills.focus","education.details","structure.headings","structure.core","structure.scan","structure.length","consistency.dates","consistency.order","consistency.bullets","consistency.headings","consistency.repeats","consistency.punct"]);
const CVA_PATHS = [
  { id:"ai_response_evaluator", label:"AI Response Evaluator", needs:["review","writing","guidelines"], cat:"ai_response_evaluation" },
  { id:"fact_checker", label:"Fact Checker / Research Evaluator", needs:["research","writing","review"], cat:"fact_checking" },
  { id:"data_annotator", label:"Data Annotator", needs:["data","guidelines","review"], cat:"data_annotation" },
  { id:"writing_specialist", label:"Writing & Rewriting Specialist", needs:["writing","review","explaining"], cat:"response_rewriting" },
  { id:"domain_expert", label:"Domain Expert Reviewer", needs:["review","reasoning","explaining"], depth:true, cat:"domain_expert_evaluation" },
  { id:"multilingual_evaluator", label:"Multilingual Evaluator", needs:["writing","review"], langs:true, cat:"multilingual_evaluation" },
  { id:"coding_evaluator", label:"Coding Evaluator", needs:["reasoning","review"], code:true, cat:"coding_evaluation" },
];

function analyzeCvQuality(text, opts){
  opts=opts||{}; const now=opts.now?new Date(opts.now):new Date(), nowMi=now.getFullYear()*12+now.getMonth();
  const D=cvaRead(text, nowMi), C=cvaScore(D, {}), ext=opts.extraction||{ status:"complete", limitations:[] };
  const incomplete=ext.status==="partial" && !opts.confirmedComplete;
  const categories=CVA_CATS.map(c=>{ const cr=C[c.id], pts=cr.reduce((a,x)=>a+x.points,0); let badge=cvaBadge(pts,c.max);
    if(incomplete && badge==="Missing evidence") badge="Unable to assess";
    const gaps=cr.filter(x=>x.points<x.max).sort((a,b)=>(b.max-b.points)-(a.max-a.points));
    const evidence=Array.from(new Set(cvaCatEvidence(c.id, D))).slice(0,3);
    return { id:c.id, label:c.label, max:c.max, points:pts, badge, explanation:cr.map(x=>x.detail).join(" "),
      evidence, improvement:gaps.length?gaps[0].improve:"Keep this as it is.", criteria:cr }; });
  const total=categories.reduce((a,c)=>a+c.points,0);
  const allCrit=[].concat(...categories.map(c=>c.criteria.map(x=>Object.assign({ cat:c.id, catLabel:c.label, catBadge:c.badge }, x))));
  // E. Priority improvements: biggest point gaps first, one per criterion.
  const zero=new Set(allCrit.filter(x=>x.points===0).map(x=>x.id));
  const gapsAll=allCrit.filter(x=>x.points<x.max && x.improve && !(x.id==="ai.direct" && x.points===0) && !(CVA_DEPENDS[x.id]||[]).some(p=>zero.has(p))).map(x=>Object.assign(x,{ gap:x.max-x.points })).sort((a,b)=>b.gap-a.gap || CVA_CATS.findIndex(c=>c.id===a.cat)-CVA_CATS.findIndex(c=>c.id===b.cat));
  const priority=gapsAll.slice(0,8).map(x=>({ id:x.id, priority:x.gap>=4||(x.catBadge==="Missing evidence"&&x.gap>=2)?"High":x.gap>=2?"Medium":"Low", category:x.catLabel, what:x.label, why:CVA_WHY[x.id]||"", how:x.improve, now:x.detail }));
  const pids=new Set(priority.map(p=>p.id));
  // G / H. Strengths & weaknesses
  const strengths=categories.filter(c=>c.badge==="Strong").map(c=>({ category:c.label, text:c.criteria.filter(x=>x.points===x.max).map(x=>x.detail).slice(0,2).join(" "), evidence:c.evidence.slice(0,2) }));
  const weaknesses=categories.filter(c=>c.badge!=="Strong").sort((a,b)=>a.points/a.max-b.points/b.max).map(c=>({ category:c.label, badge:c.badge,
    text:(c.badge==="Unable to assess"?"This couldn't be assessed reliably because the extracted text may be incomplete. ":"")+c.criteria.filter(x=>x.points<x.max).map(x=>x.detail).slice(0,2).join(" "), next:c.improvement }));
  // J. Transferable skills
  const clusters=CVA_CLUSTERS.map(c=>{ const s=D.evidenceLines.concat(D.summary).filter(D.used).filter(l=>c.strong.test(l.body)), w=s.length?[]:D.evidenceLines.concat(D.summary).filter(D.used).filter(l=>c.weak.test(l.body)); return { id:c.id, label:c.label, skill:c.skill, ai:c.ai, status:s.length?"demonstrated":w.length?"inferred":"none", evidence:(s.length?s:w).slice(0,2).map(cvaQuote) }; });
  const langs=D.listTerms.filter(t=>t.sec==="languages").length + (D.L.filter(l=>/\b(bilingual|multilingual|fluent in|native)\b/i.test(l.body)).length?1:0);
  const transferable=clusters.filter(c=>c.status!=="none").map(c=>({ skill:c.label, status:c.status==="demonstrated"?"Directly demonstrated":"Inferred", evidence:c.evidence[0]||"", relation:c.ai }));
  if(langs>=2) transferable.push({ skill:"Working in more than one language", status:"Inferred", evidence:D.listTerms.filter(t=>t.sec==="languages").map(t=>t.term).slice(0,4).join(", "), relation:"Multilingual projects review AI output in each language; listing languages isn't the same as translation experience." });
  // I. Development areas
  const docFixes=gapsAll.filter(x=>CVA_DOC_FIX.has(x.id)).slice(0,6).map(x=>({ id:x.id, text:x.improve }));
  const toDevelop=clusters.filter(c=>c.status!=="demonstrated").map(c=>({ skill:c.label, text:c.status==="inferred"?`Your wording suggests ${c.label.toLowerCase()} (“${cvaClip(c.evidence[0],80)}”) but doesn't show it directly. If you've done it, describe one example; otherwise practise it.`:`Not shown in this resume. That doesn't mean you lack it: if you've done ${c.label.toLowerCase()}, add an example. If not, it's a skill to build.`, cat:(SKILLS_FALLBACK[c.skill]||{}).cat||null }));
  // L. Rewrites
  const prof=cvaProfile(D), sumOrig=D.summary.map(l=>l.body).join(" ");
  const skillOk=t=>t.sec!=="languages" && t.term.length<=32 && !new RegExp(CVA_CLICHE.source,"i").test(t.term) && !/^(communication|teamwork|team work|leadership|hard[- ]?working|reliable|punctual|honest|flexible|motivated|organi[sz]ed|interpersonal skills?)$/i.test(t.term.trim());
  const skillCands=D.listTerms.filter(skillOk), shownTerms=skillCands.filter(t=>cvaShown(D,t.term));
  const topSkills=Array.from(new Set(shownTerms.map(t=>t.term))).slice(0,3);
  const quantLine=D.evidenceLines.find(l=>cvaQuant(l.body).length && CVA_OUTCOME.test(l.body));
  const roleTitle=(D.headline&&cvaClip(D.headline.body.split(/\s+[|·•–—-]\s+/)[0],60)) || (D.entries[0]&&cvaClip(D.entries[0].title.split(/\s+[|·•–—,-]\s+| at /)[0],60)) || "";
  const statedYears=(D.L.map(l=>l.body.match(/\b(\d{1,2})\+?\s*(?:years?|yrs?)(?:'|’)?\s*(?:of\s+)?(?:\w+\s+){0,2}experience\b/i)).find(Boolean)||[])[1];
  const skillTxt=t=>/[A-Z].*[A-Z]|[A-Z]{2}|\b(Excel|Word|Python|SQL)\b/.test(t.slice(1))||/^[A-Z]{2,}/.test(t)?t:t.charAt(0).toLowerCase()+t.slice(1);
  const sumNew=`${roleTitle||"[Your current or target job title]"} with ${statedYears?`${statedYears} years`:"[verified number of years]"} of experience in ${topSkills.length?topSkills.map(skillTxt).join(", ").replace(/, ([^,]*)$/," and $1"):"[two or three skills shown in your experience]"}. `+
    (quantLine?`Recent work includes: ${cvaClip(quantLine.body.replace(/[.]$/,""),140).replace(/^./,c=>c.toLowerCase())}. `:"Known for [one verified result from your experience]. ")+
    (clusters.filter(c=>c.status==="demonstrated").length?`Experienced in ${clusters.filter(c=>c.status==="demonstrated").slice(0,2).map(c=>c.label.toLowerCase()).join(" and ")}, `:"")+
    (opts.target?`interested in applying this experience to ${cvaClip(opts.target,60)} work.`:"interested in applying this experience to AI-training work such as evaluating and improving AI responses.");
  const summaryRewrite={ original:sumOrig?cvaClip(sumOrig,600):"", suggested:sumNew.replace(/, interested/," and interested").replace(/\.\s+interested/,". Interested"),
    questions:[!statedYears?`How many years of relevant experience can you verify?${prof.experienceYears?` (Your dated entries span about ${prof.experienceYears} years; count only relevant, verifiable time.)`:""}`:null, !quantLine?"Which one result from your experience best shows the quality of your work?":null].filter(Boolean) };
  const weakBullets=D.evidenceLines.filter(D.used).filter(l=>CVA_RESP_ONLY.test(l.body) || (!CVA_OUTCOME.test(l.body) && !cvaQuant(l.body).length && cvaWords(l.body).length>=5)).sort((a,b)=>(CVA_RESP_ONLY.test(b.body)?1:0)-(CVA_RESP_ONLY.test(a.body)?1:0)).slice(0,3);
  const rewrites={ summary:summaryRewrite, bullets:weakBullets.map(l=>cvaRewriteBullet(l.body)),
    note:"Suggestions reuse your own words. Every [bracketed placeholder] must be replaced with a verified fact or removed before you use it. Nothing here adds employers, qualifications, tools, AI experience, achievements or numbers you didn't write." };
  // M. Role alignment
  const hasCode=D.evidenceLines.some(l=>CVA_CODE.test(l.body)) || D.listTerms.some(t=>CVA_CODE.test(t.term));
  const alignment=CVA_PATHS.map(p=>{
    const have=p.needs.filter(n=>clusters.find(c=>c.id===n).status==="demonstrated"), inf=p.needs.filter(n=>clusters.find(c=>c.id===n).status==="inferred"), miss=p.needs.filter(n=>clusters.find(c=>c.id===n).status==="none");
    const extraOk = p.langs ? langs>=2 : p.code ? hasCode : p.depth ? (prof.experienceYears||0)>=3 || categories.find(c=>c.id==="education").points>=7 : true;
    const extraLbl = p.langs ? (langs>=2?"More than one language listed":"No second language listed") : p.code ? (hasCode?"Programming evidence found":"No programming evidence found") : p.depth ? (extraOk?"Depth in a field shown (years or qualification)":"Depth in a field not clear yet") : "";
    const strength = have.length===p.needs.length && extraOk ? "Strong evidence in this resume" : (have.length+inf.length*0.5)>=p.needs.length/2 && extraOk ? "Some evidence in this resume" : "Little evidence in this resume yet";
    const lbl=id=>CVA_CLUSTERS.find(c=>c.id===id).label.toLowerCase();
    return { id:p.id, label:p.label, strength, cat:p.cat,
      evidence:have.map(id=>`${CVA_CLUSTERS.find(c=>c.id===id).label}: “${cvaClip(clusters.find(c=>c.id===id).evidence[0],90)}”`).concat(p.langs||p.code||p.depth?(extraOk?[extraLbl]:[]):[]),
      gaps:miss.map(lbl).map(x=>`No example of ${x}`).concat(inf.map(lbl).map(x=>`${x.charAt(0).toUpperCase()+x.slice(1)} is only inferred`)).concat((p.langs||p.code||p.depth)&&!extraOk?[extraLbl]:[]),
      prepare: miss.length||inf.length||!extraOk ? `Practise ${p.label.toLowerCase()} tasks in the Practice Lab, then add any real, relevant examples to your resume.` : `Your resume already shows the core evidence. Practise ${p.label.toLowerCase()} tasks to prepare for project assessments.` };
  }).sort((a,b)=>["Strong evidence in this resume","Some evidence in this resume","Little evidence in this resume yet"].indexOf(a.strength)-["Strong evidence in this resume","Some evidence in this resume","Little evidence in this resume yet"].indexOf(b.strength));
  // K. Recommended improvements (not already in Priority Improvements)
  const recs=[];
  gapsAll.filter(x=>!pids.has(x.id)).slice(0,4).forEach(x=>recs.push({ id:x.id, text:x.improve }));
  if(opts.target){ const tw=cvaNorm(opts.target).split(" ").filter(w=>w.length>=3 && !CVA_STOP.has(w)); const top=D.L.slice(0,8).map(l=>cvaNorm(l.body)).join(" ");
    if(tw.length && !tw.some(w=>top.includes(cvaStem(w)))) recs.push({ id:"target.headline", text:`Your target is “${cvaClip(opts.target,60)}”, but the top of your resume doesn't mention it. If it fits your experience, reflect it in your title line or summary.` }); }
  const prep=alignment.find(a=>a.strength!=="Little evidence in this resume yet") || alignment[0];
  if(prep) recs.push({ id:"prepare."+prep.id, text:`Prepare for ${prep.label} work: practise in the Practice Lab, then add only real examples to your resume.`, cat:prep.cat });
  if(!recs.length) recs.push({ id:"keep", text:"Keep your resume updated with recent, specific examples of your work." });
  // A. Overview
  const best=categories.slice().sort((a,b)=>b.points/b.max-a.points/a.max)[0], worst=categories.slice().sort((a,b)=>a.points/a.max-b.points/b.max).slice(0,2);
  const E=D.entries, evN=D.evidenceLines.length, outN=D.evidenceLines.filter(l=>CVA_OUTCOME.test(l.body)).length;
  const overview=`This resume lists ${E.length} experience entr${E.length===1?"y":"ies"} with ${evN} description line${evN===1?"":"s"}, ${outN} of which ${outN===1?"describes":"describe"} an outcome. Its clearest area is ${best.label.toLowerCase()} (${best.points}/${best.max}). The biggest gains are available in ${worst.map(c=>`${c.label.toLowerCase()} (${c.points}/${c.max})`).join(" and ")}.`;
  const report={ version:CVA_VERSION, analyzedAt:Date.now(), total, max:100, rating:cvaRating(total), provisional:incomplete, disclaimer:CVA_DISCLAIMER, overview,
    extraction:{ status:ext.status||"complete", format:ext.format||"paste", limitations:(ext.limitations||[]).slice(), confirmedComplete:!!opts.confirmedComplete, words:D.words },
    profile:prof, categories, priority, consistency:cvaFindings(D).concat(categories.find(c=>c.id==="consistency").criteria.map(x=>({ kind:x.id, tone:x.points===x.max?"ok":"check", text:x.detail }))),
    strengths, weaknesses, development:{ documentFixes:docFixes, skillsToDevelop:toDevelop }, transferable, recommendations:recs, rewrites, alignment,
    jd:opts.jd?cvaCompareJD(D, opts.jd, prof.experienceYears):null, target:opts.target?cvaClip(opts.target,80):"" };
  return report;
}
const SKILLS_FALLBACK = typeof SKILLS!=="undefined" ? SKILLS : { quality_review:{cat:"document_evaluation"}, writing:{cat:"response_rewriting"}, fact_checking:{cat:"fact_checking"}, instruction_following:{cat:"instruction_following"}, attention_to_detail:{cat:"data_annotation"}, communication:{cat:null}, reasoning:{cat:"generalist_ai_evaluation"} };

function cvaCatEvidence(cat, D){
  const ev=D.evidenceLines.filter(D.used), L=D.L.filter(D.used);
  switch(cat){
    case "positioning": return (D.headline?[D.headline]:[]).concat(D.summary.slice(0,1)).map(cvaQuote);
    case "experience": return ev.filter(l=>CVA_OUTCOME.test(l.body)||cvaFirstVerb(l.body)).slice(0,3).map(cvaQuote).concat(D.entries.length?[]:[]);
    case "impact": return ev.filter(l=>cvaQuant(l.body).length).slice(0,3).map(cvaQuote);
    case "skills": return L.filter(l=>["skills","tools"].includes(l.sec)).slice(0,2).map(cvaQuote);
    case "education": return L.filter(l=>l.sec==="education"||l.sec==="certifications").slice(0,3).map(cvaQuote);
    case "structure": return D.headings.length?[D.headings.map(h=>h.text.replace(/[:：]\s*$/,"")).join(" · ")]:[];
    case "ai": return CVA_CLUSTERS.map(c=>ev.concat(D.summary).find(l=>c.strong.test(l.body))).filter(Boolean).slice(0,3).map(cvaQuote);
    case "consistency": return D.entries.filter(e=>e.range).slice(0,3).map(e=>e.range.raw);
  }
  return [];
}

/* ---------- 6. Validation: nothing renders unless the report is internally consistent ------- */
function validateCvReport(r){
  const errs=[]; const isStr=x=>typeof x==="string";
  if(!r || typeof r!=="object") return { ok:false, errors:["no report"] };
  if(!Array.isArray(r.categories) || r.categories.length!==CVA_CATS.length) errs.push("categories length");
  else {
    let sumMax=0, sum=0;
    r.categories.forEach((c,i)=>{ const def=CVA_CATS[i];
      if(c.id!==def.id || c.max!==def.max) errs.push("category def "+c.id);
      if(!Number.isInteger(c.points) || c.points<0 || c.points>c.max) errs.push("points range "+c.id);
      const cs=(c.criteria||[]).reduce((a,x)=>{ if(!Number.isInteger(x.points)||x.points<0||x.points>x.max) errs.push("criterion "+x.id); return a+x.points; },0);
      const cm=(c.criteria||[]).reduce((a,x)=>a+x.max,0);
      if(cs!==c.points) errs.push("criteria sum "+c.id); if(cm!==c.max) errs.push("criteria max "+c.id);
      if(!["Strong","Partial","Missing evidence","Unable to assess"].includes(c.badge)) errs.push("badge "+c.id);
      if(!isStr(c.explanation)||!isStr(c.improvement)||!Array.isArray(c.evidence)) errs.push("fields "+c.id);
      sumMax+=c.max; sum+=c.points; });
    if(sumMax!==100) errs.push("max sum "+sumMax);
    if(sum!==r.total) errs.push("total mismatch "+sum+"≠"+r.total);
  }
  if(!Number.isInteger(r.total) || r.total<0 || r.total>100) errs.push("total range");
  if(r.rating!==cvaRating(r.total)) errs.push("rating label");
  ["priority","consistency","strengths","weaknesses","transferable","recommendations","alignment"].forEach(k=>{ if(!Array.isArray(r[k])) errs.push("missing "+k); });
  if(!r.rewrites || !r.rewrites.summary || !Array.isArray(r.rewrites.bullets)) errs.push("rewrites");
  if(!r.extraction || !isStr(r.extraction.status)) errs.push("extraction");
  if(!r.profile) errs.push("profile");
  if(Array.isArray(r.priority)){ const ids=r.priority.map(p=>p.id).concat((r.recommendations||[]).map(x=>x.id)); if(new Set(ids).size!==ids.length) errs.push("duplicate advice"); }
  const s=JSON.stringify(r); if(/undefined|NaN/.test(s)) errs.push("undefined/NaN in report");
  return { ok:!errs.length, errors:errs };
}
