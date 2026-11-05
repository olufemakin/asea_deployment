/* =============================================================================
   CV Quality report screen (sections A–M + optional job-description comparison),
   copy recommendations and a self-contained HTML download. All text that comes
   from the resume or job description is escaped with H(); nothing is executed.
   ========================================================================== */
"use strict";

const CVR_BADGE = { "Strong":"good", "Partial":"ok", "Missing evidence":"bad", "Unable to assess":"info" };
const CVR_PRI = { High:"bad", Medium:"ok", Low:"info" };
const CVR_JD = { supported:["good","Supported"], partial:["ok","Partially supported"], not_evidenced:["bad","Not evidenced"] };
const cvrPct = (p,m) => Math.round(p/m*100);
const cvrBarColor = b => b==="Strong"?"var(--teal)":b==="Partial"?"var(--ok)":b==="Unable to assess"?"var(--faint)":"var(--bad)";
const cvrQ = t => t?`<blockquote class="excerpt cvq">“${H(t)}”</blockquote>`:"";
const cvrPh = t => H(t).replace(/\[([^\]]{2,140})\]/g,'<mark class="ph">[$1]</mark>');
function cvrSec(letter, title, body, id){ return `<section class="card cvx cvsec-r" ${id?`id="${id}"`:""} aria-labelledby="cvh-${letter}"><h2 id="cvh-${letter}"><span class="cvletter" aria-hidden="true">${letter}</span>${title}</h2>${body}</section>`; }

function cvReportHTML(c){
  const r=c.report;
  if(!r){ return `<div class="card cvx"><h2>No CV Quality report yet</h2><p class="muted">Your CV text is saved, but it hasn't been analysed with the CV Quality rubric yet.</p>
      <div class="row wrapw" style="gap:8px"><button class="btn primary" id="cvAnalyzeStored" onclick="App.cvView='text';scrCV()">Review text and analyse</button></div></div>`; }
  const v=validateCvReport(r);
  if(!v.ok) return `<div class="card cvx"><div class="cvfail" role="alert"><b>This saved report failed its consistency checks</b><p style="margin:6px 0 0">No score is shown. Re-analyse the text to rebuild it.</p></div><button class="btn primary" style="margin-top:12px" onclick="App.cvView='text';scrCV()">Re-analyse</button></div>`;
  const P=r.profile, x=r.extraction;
  const actions=`<div class="card cvx cvactions noprint"><div class="row between center wrapw" style="gap:10px">
      <div class="small muted">Analysed ${new Date(r.analyzedAt).toLocaleString()} · ${H(cvSourceLabel(c))} · ${x.words} words${r.target?` · target: ${H(r.target)}`:""}${r.jd?" · job description compared":""}</div>
      <div class="row wrapw" style="gap:8px">
        <button class="btn sm" id="cvReanalyse" onclick="App.cvView='text';scrCV()">Re-analyse</button>
        <button class="btn sm" id="cvCopy" onclick="cvCopyRecs()">Copy recommendations</button>
        <button class="btn sm" id="cvDownload" onclick="cvDownload()">Download report</button>
        <button class="btn sm ghost" onclick="cvReplace()">Replace CV</button>
        <button class="btn sm danger" id="cvClear" onclick="cvDeleteAll()">Delete CV data</button></div></div>
      <div id="cvToast" class="small" role="status" aria-live="polite"></div></div>`;
  const warn = r.provisional ? `<div class="cvwarn" role="alert" id="cvProvisional"><b>Provisional score.</b> The text extraction was incomplete (${H((x.limitations||[])[0]||"some content may be missing")}). Categories marked “Unable to assess” may be affected by missing text, not missing qualifications. <button class="linkbtn" onclick="App.cvView='text';scrCV()">Correct the text</button> and confirm it's complete for a definitive score.</div>` : "";

  /* A. Score */
  const A=`<section class="card cvx cvscore" aria-labelledby="cvh-A"><h2 id="cvh-A" class="sr">A. CV Quality Score</h2>
    <div class="cvscorerow"><div class="cvring" style="--p:${r.total}" role="img" aria-label="CV Quality Score ${r.total} out of 100, ${H(r.rating)}${r.provisional?", provisional":""}"><div><div class="v" id="cvScore" tabindex="-1">${r.total}</div><div class="o">/100</div></div></div>
      <div class="grow"><span class="kicker cvk">CV Quality Score${r.provisional?" · provisional":""}</span><div class="cvrating" id="cvRating">${H(r.rating)}</div>
        <p style="margin:6px 0 0">${H(r.overview)}</p>
        <p class="small faint" style="margin:10px 0 0">${H(r.disclaimer)}</p>
        <div class="small faint">Rating bands: 90–100 Excellent · 75–89 Strong · 60–74 Good foundation · 40–59 Needs improvement · 0–39 Significant revision needed</div></div></div></section>`;

  /* B. Professional profile */
  const row=(k,v2)=>v2?`<tr><td>${k}</td><td>${v2}</td></tr>`:"";
  const B=cvrSec("B","Professional Profile",`<p class="small muted" style="margin-top:0">Based only on what this resume says. Contact and personal details are not shown or used.</p>
    <table class="summary cvprof">${row("Title line", H(P.headline))}${row("Most recent entry", H(P.recentRole))}
      ${row("Entries", [P.entries.work?`${P.entries.work} work`:"",P.entries.volunteer?`${P.entries.volunteer} volunteer`:"",P.entries.projects?`${P.entries.projects} project`:""].filter(Boolean).join(" · ")||"None detected")}
      ${row("Dated span", P.datedSpan?H(P.datedSpan)+(P.experienceYears!=null?` (about ${P.experienceYears} year${P.experienceYears===1?"":"s"} of dated entries)`:""):"")}
      ${row("Sections found", P.sections.length?H(P.sections.join(", ")):"None recognised")}
      ${row("Skills listed", H(P.skills.join(", ")))}${row("Tools listed", H(P.tools.join(", ")))}${row("Languages", H(P.languages.join(", ")))}
      ${row("Education", P.education.map(H).join("<br>"))}${row("Certifications", P.certifications.map(H).join("<br>"))}</table>`);

  /* C. Evidence by category */
  const C=cvrSec("C","Evidence by Category",`<div class="grid g2 cvcats">${r.categories.map(cat=>`<div class="cvcat" data-cat="${cat.id}">
      <div class="row between center"><h3>${H(cat.label)}</h3><span class="cvpts"><b>${cat.points}</b>/${cat.max}</span></div>
      <div class="bar" role="img" aria-label="${cat.points} of ${cat.max} points"><i style="width:${cvrPct(cat.points,cat.max)}%;background:${cvrBarColor(cat.badge)}"></i></div>
      <div style="margin:8px 0 4px"><span class="badge ${CVR_BADGE[cat.badge]}">${H(cat.badge)}</span></div>
      <p class="small">${H(cat.explanation)}</p>
      ${cat.evidence.length?`<div class="resplabel">From your resume</div>${cat.evidence.slice(0,2).map(cvrQ).join("")}`:""}
      <div class="resplabel">Improve</div><p class="small" style="margin:0">${H(cat.improvement)}</p></div>`).join("")}</div>`, "cvCats");

  /* D. Detailed breakdown */
  const D=cvrSec("D","Detailed Score Breakdown",`<p class="small muted" style="margin-top:0">Each category is the sum of fixed criteria with partial credit. Category totals add up to ${r.total}/100.</p>
    <div class="cvtablewrap"><table class="cvbreak" id="cvBreakdown"><thead><tr><th scope="col">Criterion</th><th scope="col">Points</th><th scope="col">What was found</th></tr></thead>
    <tbody>${r.categories.map(cat=>`<tr class="cvbcat"><th scope="rowgroup" colspan="2">${H(cat.label)}</th><td><b>${cat.points}/${cat.max}</b></td></tr>${cat.criteria.map(cr=>`<tr><td>${H(cr.label)}</td><td class="num">${cr.points}/${cr.max}</td><td class="small">${H(cr.detail)}</td></tr>`).join("")}`).join("")}
    <tr class="cvbtotal"><th scope="row" colspan="2">Total</th><td><b id="cvTotalCheck">${r.categories.reduce((a,c2)=>a+c2.points,0)}/100</b></td></tr></tbody></table></div>`);

  /* E. Priority improvements */
  const E=cvrSec("E","Priority Improvements", r.priority.length?`<ol class="cvpri" id="cvPriority">${r.priority.map(p=>`<li><div class="row center wrapw" style="gap:8px"><span class="badge ${CVR_PRI[p.priority]}">${p.priority} priority</span><b>${H(p.what)}</b><span class="small faint">${H(p.category)}</span></div>
      <div class="cvwwh"><div><span class="lbl">What</span>${H(p.now)}</div><div><span class="lbl">Why</span>${H(p.why)}</div><div><span class="lbl">How</span>${H(p.how)}</div></div></li>`).join("")}</ol>`:`<p class="muted">No priority improvements: every criterion has full credit.</p>`);

  /* F. Consistency signals */
  const tone={ ok:["good","Consistent"], check:["ok","Check"], neutral:["info","For information"], info:["","Note"] };
  const F=cvrSec("F","Consistency Signals",`<p class="small muted" style="margin-top:0">Counts are taken from the extracted text. Overlapping dates are listed for information and don't lower the score.</p><ul class="cvcons" id="cvConsistency">${r.consistency.map(f=>`<li><span class="badge ${tone[f.tone][0]}">${tone[f.tone][1]}</span> ${H(f.text)}</li>`).join("")}</ul>`);

  /* G / H. Strengths & weaknesses */
  const G=cvrSec("G","Strengths", r.strengths.length?r.strengths.map(s=>`<div class="cvitem2"><b>${H(s.category)}</b><p class="small" style="margin:4px 0">${H(s.text)}</p>${s.evidence.slice(0,1).map(cvrQ).join("")}</div>`).join(""):`<p class="muted">No category is strong yet. The priority improvements above are the quickest way to build one.</p>`);
  const Hh=cvrSec("H","Weaknesses", r.weaknesses.length?r.weaknesses.map(w=>`<div class="cvitem2"><div class="row center wrapw" style="gap:8px"><b>${H(w.category)}</b><span class="badge ${CVR_BADGE[w.badge]}">${H(w.badge)}</span></div><p class="small" style="margin:4px 0">${H(w.text)}</p><p class="small muted" style="margin:0">Next step: ${H(w.next)}</p></div>`).join(""):`<p class="muted">No weak categories found.</p>`);

  /* I. Development areas */
  const pr=cat=>cat&&typeof isCategoryAvailable==="function"&&isCategoryAvailable(cat)?` <button class="linkbtn" onclick="openPracticeSetup('${cat}','easy')">Practise</button>`:"";
  const I=cvrSec("I","Development Areas",`<div class="grid g2"><div><h3>Document fixes</h3><p class="small faint">Things the resume may not be showing yet.</p>${r.development.documentFixes.length?`<ul class="tips small">${r.development.documentFixes.map(d2=>`<li>${H(d2.text)}</li>`).join("")}</ul>`:`<p class="small muted">None.</p>`}</div>
      <div><h3>Skills to show or develop</h3><p class="small faint">Not shown here doesn't mean you don't have it.</p>${r.development.skillsToDevelop.length?`<ul class="tips small">${r.development.skillsToDevelop.map(d2=>`<li><b>${H(d2.skill)}.</b> ${H(d2.text)}${pr(d2.cat)}</li>`).join("")}</ul>`:`<p class="small muted">All seven transferable areas are shown directly.</p>`}</div></div>`);

  /* J. Transferable skills */
  const J=cvrSec("J","Transferable Skills", r.transferable.length?`<div class="list" id="cvTransferable">${r.transferable.map(t=>`<div class="item"><div class="grow"><div class="row center wrapw" style="gap:8px"><b>${H(t.skill)}</b><span class="badge ${t.status==="Directly demonstrated"?"good":"ok"}">${H(t.status)}</span></div>
      ${t.evidence?cvrQ(t.evidence):""}<div class="small muted">${H(t.relation)}</div></div></div>`).join("")}</div>`:`<p class="muted">No transferable evidence was found in the text. Describe what you did in each role (reviewing, writing, following procedures, handling data, explaining) and re-analyse.</p>`);

  /* K. Recommended improvements */
  const K=cvrSec("K","Recommended Improvements",`<ul class="tips" id="cvRecs">${r.recommendations.map(x2=>`<li>${H(x2.text)}${pr(x2.cat)}</li>`).join("")}</ul><p class="small faint">These add to the priority improvements above; nothing is repeated.</p>`);

  /* L. Suggested rewrites */
  const rw=r.rewrites, pair=(o,s2,qs,i)=>`<div class="cvpair"><div><div class="resplabel">Original</div><div class="resp">${o?H(o):`<span class="faint">No summary found.</span>`}</div></div>
      <div><div class="resplabel">Suggested</div><div class="resp cvsugg" id="cvSugg${i}">${cvrPh(s2)}</div>${qs&&qs.length?`<ul class="tips small">${qs.map(q=>`<li>${H(q)}</li>`).join("")}</ul>`:""}
      <button class="btn sm ghost noprint" onclick="cvCopyText(document.getElementById('cvSugg${i}').innerText,true)">Copy suggestion</button></div></div>`;
  const Lsec=cvrSec("L","Suggested Rewrites",`<p class="cvwarn small" style="margin-top:0"><b>Check before you use these.</b> ${H(rw.note)}</p>
      <h3>Summary</h3>${pair(rw.summary.original, rw.summary.suggested, rw.summary.questions, 0)}
      ${rw.bullets.length?`<h3 style="margin-top:16px">Selected bullets</h3>${rw.bullets.map((b,i)=>pair(b.original,b.suggested,b.questions,i+1)).join("")}`:`<p class="small muted">No bullets need a rewrite: your description lines already include results or scale.</p>`}`, "cvRewrites");

  /* M. AI training role alignment */
  const st={ "Strong evidence in this resume":"good", "Some evidence in this resume":"ok", "Little evidence in this resume yet":"" };
  const M=cvrSec("M","AI Training Role Alignment",`<p class="small muted" style="margin-top:0">How the evidence in this resume lines up with common AI-training task types. These are preparation suggestions, not eligibility decisions: each project sets its own requirements and tests.</p>
    <div class="grid g2" id="cvAlign">${r.alignment.map(a=>`<div class="cvcat"><div class="row between center wrapw" style="gap:6px"><h3>${H(a.label)}</h3><span class="badge ${st[a.strength]}">${H(a.strength)}</span></div>
      ${a.evidence.length?`<div class="resplabel">Evidence</div><ul class="tips small">${a.evidence.map(e2=>`<li>${H(e2)}</li>`).join("")}</ul>`:""}
      ${a.gaps.length?`<div class="resplabel">Gaps</div><ul class="tips small">${a.gaps.map(g=>`<li>${H(g)}</li>`).join("")}</ul>`:""}
      <p class="small" style="margin:8px 0 0">${H(a.prepare)}${pr(a.cat)}</p></div>`).join("")}</div>`);

  /* Optional JD comparison */
  const JD = r.jd ? cvrSec("JD","Job Description Comparison",`<p class="small muted" style="margin-top:0">${H(r.jd.disclaimer)} It's separate from your CV Quality score.</p>
      <div class="row wrapw" style="gap:8px;margin-bottom:10px"><span class="badge good">${r.jd.counts.supported} supported</span><span class="badge ok">${r.jd.counts.partial} partially supported</span><span class="badge bad">${r.jd.counts.not_evidenced} not evidenced</span></div>
      <div class="list" id="cvJdList">${r.jd.requirements.map(q=>`<div class="item" data-status="${q.status}"><div class="grow"><div class="row center wrapw" style="gap:8px"><span class="badge ${CVR_JD[q.status][0]}">${CVR_JD[q.status][1]}</span><b>${H(q.requirement)}</b></div>
        ${q.evidence&&q.status!=="not_evidenced"?`<div class="resplabel">Closest evidence in your resume</div>`+cvrQ(q.evidence):""}${q.note?`<div class="small muted">${H(q.note)}</div>`:""}<div class="small" style="margin-top:4px">${H(q.tip)}</div></div></div>`).join("")}</div>`, "cvJD") : (r.target?"":"");

  return actions+warn+`<div class="cvreport" id="cvReport">${A}${B}${C}${D}${E}${F}<div class="grid g2 cvgh">${G}${Hh}</div>${I}${J}${K}${Lsec}${M}${JD}</div>`+cvProcessingHTML();
}

/* ---------- copy & download ---------------------------------------------------------- */
function cvToast(m){ const t=document.getElementById("cvToast"); if(t){ t.textContent=m; setTimeout(()=>{ if(t.textContent===m) t.textContent=""; }, 4000); } }
function cvCopyText(text, hasPh){
  const body=(hasPh && /\[[^\]]+\]/.test(text) ? "Replace every [bracketed placeholder] with a verified fact or remove it before using this.\n\n" : "")+text;
  const done=()=>cvToast("Copied to clipboard."), fail=()=>{ const ta=document.createElement("textarea"); ta.value=body; ta.setAttribute("readonly",""); ta.style.position="fixed"; ta.style.opacity="0"; document.body.appendChild(ta); ta.select(); let ok=false; try{ ok=document.execCommand("copy"); }catch(e){} ta.remove(); cvToast(ok?"Copied to clipboard.":"Copy isn't available in this browser. Use Download report instead."); };
  try{ if(navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(body).then(done, fail); else fail(); }catch(e){ fail(); }
  window.__cvLastCopy=body;
}
function cvRecsText(r){
  const L=[`CV Quality Score: ${r.total}/100 (${r.rating})${r.provisional?" — provisional":""}`, r.disclaimer, "", "PRIORITY IMPROVEMENTS"];
  r.priority.forEach((p,i)=>L.push(`${i+1}. [${p.priority}] ${p.what} — ${p.how}`));
  L.push("", "RECOMMENDED IMPROVEMENTS"); r.recommendations.forEach(x=>L.push("- "+x.text));
  L.push("", "SUGGESTED REWRITES (replace every [placeholder] with a verified fact or remove it)", "Summary: "+r.rewrites.summary.suggested);
  r.rewrites.bullets.forEach(b=>L.push(`- Original: ${b.original}\n  Suggested: ${b.suggested}`));
  return L.join("\n");
}
function cvCopyRecs(){ const c=CV.get(); if(c&&c.report) cvCopyText(cvRecsText(c.report), false); }
function cvReportDoc(r){
  const e=H, li=a=>a.map(x=>`<li>${x}</li>`).join("");
  const css="body{font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;color:#111827;max-width:880px;margin:24px auto;padding:0 18px;line-height:1.5}h1{font-size:24px;margin:0}h2{font-size:18px;margin:26px 0 8px;border-bottom:2px solid #0d9488;padding-bottom:4px}h3{font-size:15px;margin:14px 0 4px}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #d1d5db;padding:6px 8px;text-align:left;vertical-align:top}.b{display:inline-block;font-size:11px;font-weight:700;border:1px solid #9ca3af;border-radius:99px;padding:1px 8px}.q{border-left:3px solid #0d9488;padding:2px 10px;margin:4px 0;color:#374151;font-size:13px}.muted{color:#4b5563;font-size:13px}mark{background:#fef3c7}.score{font-size:40px;font-weight:900}";
  const cats=r.categories.map(c=>`<h3>${e(c.label)}: ${c.points}/${c.max} <span class="b">${e(c.badge)}</span></h3><p>${e(c.explanation)}</p>${c.evidence.slice(0,2).map(x=>`<div class="q">“${e(x)}”</div>`).join("")}<p><b>Improve:</b> ${e(c.improvement)}</p>`).join("");
  const brk=`<table><tr><th>Criterion</th><th>Points</th><th>Found</th></tr>${r.categories.map(c=>`<tr><th colspan="2">${e(c.label)}</th><th>${c.points}/${c.max}</th></tr>`+c.criteria.map(x=>`<tr><td>${e(x.label)}</td><td>${x.points}/${x.max}</td><td>${e(x.detail)}</td></tr>`).join("")).join("")}<tr><th colspan="2">Total</th><th>${r.total}/100</th></tr></table>`;
  const P=r.profile;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CV Quality Report</title><style>${css}</style></head><body>
<p class="muted">BSP AI WorkReady · Interview IQ — CV Intelligence</p><h1>CV Quality Report</h1><p class="muted">Generated ${e(new Date(r.analyzedAt).toLocaleString())}. Built in the browser from the resume text; contact details are not included.</p>
<h2>A. Score</h2><div class="score">${r.total}/100</div><p><b>${e(r.rating)}</b>${r.provisional?" — provisional (extraction incomplete)":""}</p><p>${e(r.overview)}</p><p class="muted">${e(r.disclaimer)}</p>
<h2>B. Professional Profile</h2><table>${[["Title line",P.headline],["Most recent entry",P.recentRole],["Dated span",P.datedSpan],["Sections",P.sections.join(", ")],["Skills listed",P.skills.join(", ")],["Tools listed",P.tools.join(", ")],["Languages",P.languages.join(", ")],["Education",P.education.join("; ")],["Certifications",P.certifications.join("; ")]].filter(x=>x[1]).map(x=>`<tr><th>${x[0]}</th><td>${e(x[1])}</td></tr>`).join("")}</table>
<h2>C. Evidence by Category</h2>${cats}<h2>D. Detailed Score Breakdown</h2>${brk}
<h2>E. Priority Improvements</h2><ol>${li(r.priority.map(p=>`<b>[${e(p.priority)}] ${e(p.what)}</b><br>What: ${e(p.now)}<br>Why: ${e(p.why)}<br>How: ${e(p.how)}`))}</ol>
<h2>F. Consistency Signals</h2><ul>${li(r.consistency.map(f=>e(f.text)))}</ul>
<h2>G. Strengths</h2><ul>${li(r.strengths.map(s=>`<b>${e(s.category)}</b>: ${e(s.text)}`))||"<li>None yet.</li>"}</ul>
<h2>H. Weaknesses</h2><ul>${li(r.weaknesses.map(w=>`<b>${e(w.category)}</b> (${e(w.badge)}): ${e(w.text)} Next: ${e(w.next)}`))||"<li>None.</li>"}</ul>
<h2>I. Development Areas</h2><h3>Document fixes</h3><ul>${li(r.development.documentFixes.map(d=>e(d.text)))||"<li>None.</li>"}</ul><h3>Skills to show or develop</h3><ul>${li(r.development.skillsToDevelop.map(d=>`<b>${e(d.skill)}.</b> ${e(d.text)}`))||"<li>None.</li>"}</ul>
<h2>J. Transferable Skills</h2><ul>${li(r.transferable.map(t=>`<b>${e(t.skill)}</b> (${e(t.status)})${t.evidence?`: “${e(t.evidence)}”`:""} — ${e(t.relation)}`))||"<li>None found in the text.</li>"}</ul>
<h2>K. Recommended Improvements</h2><ul>${li(r.recommendations.map(x=>e(x.text)))}</ul>
<h2>L. Suggested Rewrites</h2><p class="muted">${e(r.rewrites.note)}</p><table><tr><th>Original</th><th>Suggested</th></tr><tr><td>${e(r.rewrites.summary.original||"No summary found.")}</td><td>${cvrPh(r.rewrites.summary.suggested)}</td></tr>${r.rewrites.bullets.map(b=>`<tr><td>${e(b.original)}</td><td>${cvrPh(b.suggested)}</td></tr>`).join("")}</table>
<h2>M. AI Training Role Alignment</h2><p class="muted">Preparation suggestions, not eligibility decisions.</p><ul>${li(r.alignment.map(a=>`<b>${e(a.label)}</b> — ${e(a.strength)}${a.evidence.length?`<br>Evidence: ${a.evidence.map(e).join("; ")}`:""}${a.gaps.length?`<br>Gaps: ${a.gaps.map(e).join("; ")}`:""}<br>${e(a.prepare)}`))}</ul>
${r.jd?`<h2>Job Description Comparison</h2><p class="muted">${e(r.jd.disclaimer)}</p><table><tr><th>Requirement</th><th>Status</th><th>Evidence / tip</th></tr>${r.jd.requirements.map(q=>`<tr><td>${e(q.requirement)}</td><td>${e(CVR_JD[q.status][1])}</td><td>${q.evidence?`“${e(q.evidence)}”<br>`:""}${q.note?e(q.note)+"<br>":""}${e(q.tip)}</td></tr>`).join("")}</table>`:""}
<p class="muted" style="margin-top:28px">Rating bands: 90–100 Excellent · 75–89 Strong · 60–74 Good foundation · 40–59 Needs improvement · 0–39 Significant revision needed.</p></body></html>`;
}
function cvDownload(){
  const c=CV.get(); if(!c||!c.report) return;
  const html=cvReportDoc(c.report); window.__cvLastDownload=html;
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([html],{ type:"text/html" })); a.download="cv-quality-report.html";
  document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 500); cvToast("Report downloaded as cv-quality-report.html.");
}
