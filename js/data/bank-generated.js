/* Practice bank — generated categories (deterministic, original BSP content):
   INSTRUCTION FOLLOWING, RESPONSE REWRITING, DOCUMENT EVALUATION, SPREADSHEET EVALUATION,
   IMAGE LABELLING, IMAGE-TO-TEXT.

   Generators are seeded and materialised by js/question-bank.js into stable bank records
   (e.g. "if-g-medium-3"). Expected answers are computed by running the same checkers that grade
   the task, so they are correct by construction. Difficulty changes STRUCTURE: number of
   constraints/issues, document length, distractors and calculation complexity — not just names. */
"use strict";

function rng(seed){ let x=(seed>>>0)||1; return ()=>{ x^=x<<13; x>>>=0; x^=x>>17; x^=x<<5; x>>>=0; return x/4294967296; }; }
const pickR=(R,a)=>a[Math.floor(R()*a.length)];
const shuffleR=(R,a)=>{ const x=a.slice(); for(let i=x.length-1;i>0;i--){ const j=Math.floor(R()*(i+1)); [x[i],x[j]]=[x[j],x[i]]; } return x; };
const NUMW=["zero","one","two","three","four","five","six","seven","eight","nine","ten"];

/* ---------- Shared list-constraint library -------------------------------- */
const LIST_TOPICS = {
  fruits:      { label:"fruits", items:["apple","banana","cherry","grape","kiwi","lemon","mango","peach","pear","plum"], intruders:["carrot","potato","lettuce"] },
  capitals:    { label:"European capital cities", items:["berlin","dublin","lisbon","madrid","oslo","paris","prague","rome","vienna","warsaw"], intruders:["cairo","lima","tokyo"] },
  mammals:     { label:"mammals", items:["bat","cow","dolphin","fox","horse","lion","otter","rabbit","whale","zebra"], intruders:["shark","eagle","frog"] },
  instruments: { label:"musical instruments", items:["cello","drum","flute","guitar","harp","oboe","piano","trumpet","violin"], intruders:["hammer","pencil","ladder"] },
  vegetables:  { label:"vegetables", items:["beet","cabbage","carrot","celery","kale","leek","onion","pea","potato","spinach"], intruders:["banana","cherry","mango"] },
  colours:     { label:"colours", items:["amber","blue","green","indigo","orange","pink","red","violet","white","yellow"], intruders:["table","circle","window"] },
};
function parseList(text){
  const lines=String(text||"").split("\n").map(l=>l.trim()).filter(Boolean);
  const isList=l=>/^(\d+[.)]|[-•*])\s+\S/.test(l);
  const listLines=lines.filter(isList);
  let lastIdx=-1; lines.forEach((l,i)=>{ if(isList(l)) lastIdx=i; });
  return { lines, listLines, items:listLines.map(l=>l.replace(/^(\d+[.)]|[-•*])\s+/,"").trim()), trailing:lastIdx>=0?lines.slice(lastIdx+1):[] };
}
/* constraint: { t, n?, w?, topic?, kind } */
function listCheck(c, text){
  const L=parseList(text), it=L.items;
  switch(c.t){
    case "count": return it.length===c.n;
    case "numbered": return L.listLines.length>0 && L.listLines.every(l=>/^\d+[.)]\s/.test(l));
    case "bulleted": return L.listLines.length>0 && L.listLines.every(l=>/^[-•*]\s/.test(l));
    case "alpha": return it.length>0 && it.every((x,i)=>i===0 || it[i-1].toLowerCase()<=x.toLowerCase());
    case "lower": return it.length>0 && it.every(x=>x===x.toLowerCase());
    case "banned": return !it.some(x=>x.toLowerCase()===c.w);
    case "topic": return it.length>0 && it.every(x=>LIST_TOPICS[c.topic].items.includes(x.toLowerCase()));
    case "summary": return L.trailing.length===1 && /[.!]$/.test(L.trailing[0]) && words(L.trailing[0]).length<=25 && words(L.trailing[0]).length>=3;
  }
  return false;
}
function listLabel(c){
  return ({ count:`Exactly ${c.n} items`, numbered:"Numbered list (1. 2. 3.)", bulleted:"Bulleted list (- item)", alpha:"Alphabetical order",
    lower:"All items in lowercase", banned:`Does not include "${c.w}"`, topic:`Every item is one of the requested ${c.topic?LIST_TOPICS[c.topic].label:""}`,
    summary:"Ends with a one-sentence summary line" })[c.t];
}
const LIST_KIND={ count:"explicit", banned:"explicit", summary:"explicit", numbered:"format", bulleted:"format", alpha:"format", lower:"format", topic:"implicit" };
/* Build a list task: constraints by difficulty, a compliant response, then injected violations. */
function buildListTask(R, d, minViolations){
  const tk=pickR(R,Object.keys(LIST_TOPICS)), T=LIST_TOPICS[tk];
  const n = d==="easy"?3 : d==="medium"?4 : 5;
  const fmt = R()<0.5?"numbered":"bulleted";
  const cons=[{t:"count",n},{t:fmt}];
  let banned=null;
  if(d!=="easy"){ cons.push({t:"alpha"},{t:"lower"}); }
  if(d==="hard"){ banned=pickR(R,T.items); cons.push({t:"banned",w:banned},{t:"topic",topic:tk},{t:"summary"}); }
  else if(d==="medium" && R()<0.5){ banned=pickR(R,T.items); cons.push({t:"banned",w:banned}); }
  const has=t=>cons.some(c=>c.t===t);
  let items=shuffleR(R,T.items.filter(x=>x!==banned)).slice(0,n);
  if(has("alpha")) items.sort();
  let summary = has("summary") ? `These are all common ${T.label}.` : null;
  // violations
  const want = d==="easy" ? Math.max(minViolations, R()<0.2?0:1) : d==="medium" ? Math.max(minViolations, 1+Math.floor(R()*2)) : Math.max(minViolations, 2+Math.floor(R()*2));
  // Apply re-sorting violations first, then order/case violations, so a later sort can't undo them.
  const ORDER={ count:0, banned:1, topic:2, summary:3, numbered:4, bulleted:4, alpha:5, lower:6 };
  const chosen=shuffleR(R,cons.map(c=>c.t)).slice(0,want).sort((a,b)=>ORDER[a]-ORDER[b]);
  let fmtMode="ok", capIdx=-1;
  chosen.forEach(t=>{
    if(t==="count"){ if(R()<0.5 && items.length>2) items.pop(); else { const extra=T.items.find(x=>!items.includes(x) && x!==banned); if(extra){ items.push(extra); if(has("alpha")) items.sort(); } } }
    if(t==="numbered"||t==="bulleted") fmtMode = d==="easy" ? "all" : "one";
    if(t==="alpha" && items.length>2){ const i=Math.floor(R()*(items.length-1)); [items[i],items[i+1]]=[items[i+1],items[i]]; if(items.join()===items.slice().sort().join()) { [items[0],items[items.length-1]]=[items[items.length-1],items[0]]; } }
    if(t==="lower") capIdx=Math.floor(R()*items.length);
    if(t==="banned" && banned){ items[Math.floor(R()*items.length)]=banned; if(has("alpha")) items.sort(); }
    if(t==="topic"){ items[Math.floor(R()*items.length)]=pickR(R,T.intruders); if(has("alpha")) items.sort(); }
    if(t==="summary") summary=null;
  });
  const shown=items.map((x,i)=>i===capIdx ? x.charAt(0).toUpperCase()+x.slice(1) : x);
  const other = fmt==="numbered" ? "bulleted" : "numbered";
  const mark=(i,f)=>f==="numbered" ? `${i+1}. ` : "- ";
  const oneBad = fmtMode==="one" ? Math.floor(R()*shown.length) : -1;
  const lines=shown.map((x,i)=>mark(i, fmtMode==="all"||i===oneBad ? other : fmt)+x);
  if(summary) lines.push(summary);
  const instruction = `List ${n} ${T.label} as a ${fmt==="numbered"?"numbered":"bulleted"} list`
    + (has("alpha")?", in alphabetical order":"") + (has("lower")?", all in lowercase":"") + "."
    + (banned?` Do not include ${banned}.`:"") + (has("summary")?" End with a one-sentence summary.":"");
  return { topic:tk, cons, instruction, response:lines.join("\n"), banned };
}

/* ---------- INSTRUCTION FOLLOWING generator ------------------------------- */
function genInstruction(seed, d){
  const R=rng(seed), task=buildListTask(R, d, 0);
  const options=task.cons.map(c=>[listLabel(c), LIST_KIND[c.t]]).concat([["No constraints violated","none"]]);
  const violated=task.cons.map((c,i)=>listCheck(c, task.response)?-1:i).filter(i=>i>=0);
  const answer=violated.length?violated:[task.cons.length];
  return { category:"instruction_following", fmt:"multi", prompt:"Which of the instruction's requirements does the response violate? Select all that apply.",
    material:{ user:task.instruction, response:task.response }, options, answer,
    sig:violated.map(i=>task.cons[i].t==="banned"?task.banned:task.cons[i].t==="lower"?"capital":task.cons[i].t==="alpha"?"alphabetical":task.cons[i].t==="count"?"items":task.cons[i].t==="summary"?"summary":task.cons[i].t==="topic"?"not a":"marker"),
    model: violated.length ? "Violated: "+violated.map(i=>listLabel(task.cons[i])).join("; ")+". All other requirements are met." : "Every requirement is met: no constraints violated.",
    subcategory:"list-constraints" };
}
PB_GENERATORS.push({ category:"instruction_following", prefix:"if-g", perDifficulty:12, fn:genInstruction });

/* Authored instruction-following items */
const IFA=(id,d,instruction,response,cons,violated,sig,model)=>qMulti("instruction_following",id,d,"Which of the instruction's requirements does the response violate? Select all that apply.",
  { user:instruction, response }, cons.concat([["No constraints violated","none"]]), violated.length?violated:[cons.length], sig, model, { subcategory:"mixed" });
IFA("if-a-1","easy","Write exactly three bullet points about recycling. Do not use the word 'environment'.","• Recycling saves resources.\n• It reduces landfill.\n• It protects the environment.",
  [["Exactly three bullet points","explicit"],["Does not use the word 'environment'","explicit"]],[1],["environment","third bullet"],"Three bullets, but the third uses the banned word.");
IFA("if-a-2","easy","Reply in French, in one sentence: what colour is the sky on a clear day?","The sky is blue on a clear day.",
  [["Reply in French","explicit"],["One sentence","format"]],[0],["english","french"],"One sentence, but in English, not French.");
IFA("if-a-3","medium","Write a product name for a smart lamp. It must be one word, under 10 letters, and start with 'L'.","Luminara",
  [["One word","format"],["Under 10 letters","explicit"],["Starts with 'L'","explicit"]],[],["8 letters","all met"],"'Luminara' is one word, 8 letters and starts with L. Nothing is violated.");
IFA("if-a-4","medium","Summarise the meeting in under 30 words and end with the next meeting date (12 June).","The team agreed the launch plan, assigned design tasks to Priya and testing to Sam, and will review progress next week.",
  [["Under 30 words","explicit"],["Ends with the next meeting date (12 June)","explicit"]],[1],["12 june","missing date"],"It's 21 words (fine) but doesn't end with the 12 June date.");
IFA("if-a-5","medium","Answer with only a number: how many sides does a hexagon have?","A hexagon has 6 sides.",
  [["Only a number","format"],["Correct answer","implicit"]],[0],["only a number","extra words"],"The answer (6) is right, but it adds words when only a number was requested.");
IFA("if-a-6","hard","List four European capitals in alphabetical order, in lowercase, separated by commas.","berlin, Madrid, paris, rome",
  [["Four capitals","explicit"],["Alphabetical order","format"],["Lowercase","format"],["Comma-separated","format"]],[2],["madrid","capital m"],"Four capitals in order with commas, but 'Madrid' is capitalised.");
IFA("if-a-7","hard","Give two reasons to learn a language. Number them, keep each under 12 words, and don't mention travel.","1. It improves memory and concentration over time.\n2. It lets you travel and meet new people around the world.",
  [["Two reasons","explicit"],["Numbered","format"],["Each under 12 words","explicit"],["Doesn't mention travel","explicit"]],[3],["travel","reason 2"],"Two numbered reasons under 12 words, but reason 2 mentions travel.");
IFA("if-a-8","hard","Write a 2-line rhyming couplet about coffee. Don't use the word 'cup'.","Morning brew so dark and deep,\nYou rescue me from dreams of sleep.",
  [["Two lines","format"],["Rhyming","format"],["About coffee","implicit"],["Doesn't use the word 'cup'","explicit"]],[],["deep","sleep","all met"],"Two lines, rhyming, about coffee, no 'cup'. Nothing is violated.");

/* ---------- RESPONSE REWRITING generator ---------------------------------- */
function genRewrite(seed, d){
  let R=rng(seed), task=buildListTask(R, d, d==="easy"?1:2), guard=0;
  while(task.cons.every(c=>listCheck(c, task.response)) && guard++<20){ R=rng(seed+guard*7919); task=buildListTask(R, d, d==="easy"?1:2); }  // always something to fix
  return { category:"response_rewriting", fmt:"rewrite", material:{ user:task.instruction, response:task.response },
    checks:task.cons.map(c=>({ label:listLabel(c), t:"list", c, kind:LIST_KIND[c.t] })), sig:[],
    model:"A strong rewrite meets every requirement, e.g.:\n"+compliantList(task)+"\nIt changes only what was wrong.", subcategory:"list-constraints" };
}
function compliantList(task){
  const T=LIST_TOPICS[task.topic], n=(task.cons.find(c=>c.t==="count")||{}).n||3, fmt=task.cons.some(c=>c.t==="numbered")?"numbered":"bulleted";
  let it=T.items.filter(x=>x!==task.banned).slice(0,n); it.sort();
  const lines=it.map((x,i)=>(fmt==="numbered"?`${i+1}. `:"- ")+x); if(task.cons.some(c=>c.t==="summary")) lines.push(`These are all common ${T.label}.`);
  return lines.join("\n");
}
PB_GENERATORS.push({ category:"response_rewriting", prefix:"rw-g", perDifficulty:12, fn:genRewrite });
/* Authored rewriting items (non-list) */
qRewrite("response_rewriting","rw-a-1","easy","Write a one-sentence product description of a reusable water bottle (max 25 words).","This bottle is AMAZING!!! It keeps drinks cold. It is reusable. Everyone needs one. Buy it now!!!",
  [{label:"One sentence",t:"maxSentences",v:1,kind:"format"},{label:"25 words or fewer",t:"maxWords",v:25,kind:"explicit"},{label:"Mentions the bottle",t:"has",v:"bottle",kind:"implicit"},{label:"No shouting (!!!)",t:"lacks",v:"!!!",kind:"format"}],
  ["bottle","reusable","cold"],"Example: \"This reusable steel bottle keeps drinks cold for 24 hours and cuts single-use plastic waste.\"");
qRewrite("response_rewriting","rw-a-2","medium",'Return ONLY a JSON object with the keys "name" and "age" for: Maria is 34.',"Sure! Here's the JSON: {name: Maria, age: thirty-four}",
  [{label:"Valid JSON only",t:"json",kind:"format"},{label:'name is "Maria"',t:"jsonEq",k:"name",v:"Maria",kind:"explicit"},{label:"age is the number 34",t:"jsonEq",k:"age",v:34,kind:"explicit"}],
  ["json","maria","34"],"Correct output: {\"name\": \"Maria\", \"age\": 34}");
qRewrite("response_rewriting","rw-a-3","medium","Write a polite email (under 60 words) declining a vendor's offer.","Your offer is a waste of our time and frankly not worth considering. Don't contact us again.",
  [{label:"Under 60 words",t:"maxWords",v:60,kind:"explicit"},{label:"Includes thanks",t:"hasRe",v:"thank",kind:"implicit"},{label:"No insults",t:"lacksRe",v:"waste|worthless|don't contact",kind:"implicit"}],
  ["thank","decline","offer"],"Example: \"Thank you for your proposal. After careful review, we've decided not to proceed at this time. We appreciate your time and wish you every success.\"");
qRewrite("response_rewriting","rw-a-4","hard","Explain compound interest to a 12-year-old in under 50 words.","Compound interest is the APR-based amortisation of accrued principal, capitalised periodically under the effective annual rate.",
  [{label:"Under 50 words",t:"maxWords",v:50,kind:"explicit"},{label:"Mentions interest",t:"hasRe",v:"interest",kind:"implicit"},{label:"No jargon (APR, amortisation)",t:"lacksRe",v:"\\bapr\\b|amorti",kind:"implicit"}],
  ["interest","grows","money"],"Example: \"When you save money, the bank pays you a little extra called interest. Next year you earn interest on your money and on last year's interest too, so your savings grow faster and faster.\"");
qRewrite("response_rewriting","rw-a-5","hard","Fix only the factual error, keeping the rest of the sentence: 'Water boils at 90°C at sea level, so pasta cooks quickly.'","Water boils at 90°C at sea level, so pasta cooks quickly.",
  [{label:"Corrects to 100°C",t:"hasRe",v:"100\\s?°?\\s?c",kind:"explicit"},{label:"Removes 90°C",t:"lacksRe",v:"\\b90\\b",kind:"explicit"},{label:"Keeps the pasta clause",t:"hasRe",v:"pasta",kind:"implicit"}],
  ["100","sea level"],"Water boils at 100°C at sea level, so pasta cooks quickly.");

/* ---------- DOCUMENT EVALUATION generator --------------------------------- */
const DOC_IDX={ contradiction:0, omission:1, calc:2, duplicate:3, conclusion:4, none:5 };
const PEOPLE=["Priya","Sam","Leah","Omar","Grace","Tomás","Mei","Kwame"], ROOMS=["Room 4B","the Oak Room","Studio 2","the main boardroom"], DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday"];
const MONTHS=["March","April","May","June","September","October"];
const DOC_TEMPLATES = {
  email:{ supports:["contradiction","omission"], build(R, inj, d){
    const day=pickR(R,DAYS), other=pickR(R,DAYS.filter(x=>x!==day)), date=5+Math.floor(R()*20), mon=pickR(R,MONTHS), room=pickR(R,ROOMS), who=pickR(R,PEOPLE);
    const lines=["Hi all,",`The quarterly project review has moved to ${day} ${date} ${mon} at 10am${inj.omission?"":` in ${room}`}.`];
    if(d!=="easy") lines.push("Please bring your updated status slides and risk log.","Agenda: budget, delivery risks, next steps.");
    if(d==="hard") lines.push(`${who} will circulate the pre-read on ${pickR(R,DAYS)} morning.`,"If you can't attend, send a delegate who can make decisions.");
    lines.push(inj.contradiction?`See you on ${other}!`:`See you on ${day}!`, who);
    const notes=[]; if(inj.contradiction) notes.push(`the email says ${day} but signs off with ${other}`); if(inj.omission) notes.push("no location or dial-in is given for the meeting");
    return { artifact:{ kind:"doc", title:"Email: project review", text:lines.join("\n") }, notes, sig:[day.toLowerCase(),other.toLowerCase(),"location"] };
  } },
  policy:{ supports:["contradiction","omission"], build(R, inj, d){
    const leave=20+Math.floor(R()*6), alt=leave+pickR(R,[2,3,5]), notice=pickR(R,[1,2,3]);
    const cl=[`Full-time employees receive ${leave} days of annual leave per year.`,
      inj.omission?"Leave requests must be submitted with advance notice.":`Leave requests must be submitted at least ${notice} week${notice>1?"s":""} in advance.`];
    if(d!=="easy") cl.push("Requests are approved by your line manager.","Part-time employees receive leave pro rata.");
    if(d==="hard") cl.push("Up to 5 unused days may be carried into the next year.","Public holidays are in addition to annual leave.");
    cl.push(inj.contradiction?`Full-time employees are entitled to ${alt} days of annual leave.`:"Leave policy questions go to HR.");
    const notes=[]; if(inj.contradiction) notes.push(`clause 1 says ${leave} days but a later clause says ${alt}`); if(inj.omission) notes.push("the notice period is not specified");
    return { artifact:{ kind:"doc", title:"Annual leave policy (extract)", text:cl.map((c,i)=>`${i+1}. ${c}`).join("\n") }, notes, sig:[String(leave),String(alt),"notice","clause"] };
  } },
  expenses:{ supports:["duplicate","calc"], build(R, inj, d){
    const base=[["Train ticket",45],["Hotel (1 night)",120],["Dinner with client",64],["Taxi to airport",38],["Conference fee",250],["Parking",18]];
    const n=d==="easy"?3:d==="medium"?4:6, rows=shuffleR(R,base).slice(0,n).map(r=>r.slice());
    const notes=[];
    if(inj.duplicate){ const i=Math.floor(R()*rows.length); rows.splice(i+1,0,rows[i].slice()); notes.push(`"${rows[i][0]}" appears twice`); }
    let total=rows.reduce((a,r)=>a+r[1],0);
    if(inj.calc){ const wrong=total+pickR(R,[10,-15,20,-8]); notes.push(`the rows add up to $${total}, not $${wrong}`); total=wrong; }
    return { artifact:{ kind:"table", title:"Expense claim", cols:["Item","Amount ($)"], rows:rows.map(r=>[r[0],r[1].toFixed(2)]).concat([["Total",total.toFixed(2)]]) }, notes, sig:["total","duplicate","row"] };
  } },
  report:{ supports:["calc","conclusion"], build(R, inj, d){
    const q=[40+Math.floor(R()*10), 0, 0]; q[1]=q[0]+5+Math.floor(R()*6); q[2]=q[1]+3+Math.floor(R()*6);
    const sum=q[0]+q[1]+q[2], shown=inj.calc?sum+pickR(R,[10,-10,5]):sum;
    const lines=[`Revenue: Q1 $${q[0]}k, Q2 $${q[1]}k, Q3 $${q[2]}k.`,`Total for the three quarters: $${shown}k.`];
    if(d!=="easy") lines.push("Headcount stayed at 24 throughout the period.","Marketing spend was flat.");
    if(d==="hard"){ const pct=Math.round((q[2]-q[0])/q[0]*100); lines.push(`Q3 revenue was ${pct}% higher than Q1.`); }
    lines.push(inj.conclusion?"We changed our logo in Q2, and the new logo is the reason revenue grew.":"Revenue rose in each quarter.");
    const notes=[]; if(inj.calc) notes.push(`${q.join(" + ")} = ${sum}, not ${shown}`); if(inj.conclusion) notes.push("the logo is claimed as the cause with no supporting evidence");
    return { artifact:{ kind:"doc", title:"Quarterly report (extract)", text:lines.join("\n") }, notes, sig:[String(sum),"total","logo","cause"] };
  } },
  minutes:{ supports:["omission","contradiction"], build(R, inj, d){
    const a=pickR(R,PEOPLE), b=pickR(R,PEOPLE.filter(x=>x!==a)), date=12+Math.floor(R()*13), mon=pickR(R,MONTHS), alt=date+7;
    const lines=[`Decision: product launch on ${date} ${mon}.`,"Actions:"];
    if(inj.omission) lines.push("• Finalise pricing","• Book the venue","• Send the press release");
    else lines.push(`• Finalise pricing (${a}, by ${date-7} ${mon})`,`• Book the venue (${b}, by ${date-10} ${mon})`,`• Send the press release (${a}, by ${date-1} ${mon})`);
    if(d!=="easy") lines.push("Budget for the event approved at $5,000.");
    if(d==="hard") lines.push("Risks: venue availability; printing lead times.");
    lines.push(inj.contradiction?`Next steps: prepare materials for the ${alt} ${mon} launch.`:`Next meeting: ${date-14>0?date-14:1} ${mon}.`);
    const notes=[]; if(inj.omission) notes.push("the actions have no owners or due dates"); if(inj.contradiction) notes.push(`the launch is ${date} ${mon} in the decision but ${alt} ${mon} in next steps`);
    return { artifact:{ kind:"doc", title:"Meeting minutes: product launch", text:lines.join("\n") }, notes, sig:["owner","due","launch date"] };
  } },
};
function genDocument(seed, d){
  const R=rng(seed);
  const tplKey=pickR(R,Object.keys(DOC_TEMPLATES)), tpl=DOC_TEMPLATES[tplKey];
  const n = d==="easy" ? (R()<0.15?0:1) : 2;
  const inj={}; shuffleR(R,tpl.supports).slice(0,n).forEach(k=>inj[k]=true);
  const out=tpl.build(R, inj, d);
  const ans=Object.keys(inj).map(k=>DOC_IDX[k]).sort();
  return { category:"document_evaluation", fmt:"multi", prompt:"What issues does this document contain? Select all that apply, and explain where they are.",
    material:{ artifact:out.artifact }, options:DISSUES, answer:ans.length?ans:[DOC_IDX.none], sig:out.sig,
    model: out.notes.length ? "Issues: "+out.notes.join("; ")+"." : "The document is internally consistent and complete: no issues.", subcategory:tplKey };
}
PB_GENERATORS.push({ category:"document_evaluation", prefix:"doc-g", perDifficulty:12, fn:genDocument });
/* Authored document items */
const DOC=(id,d,artifact,ans,sig,model)=>qMulti("document_evaluation",id,d,"What issues does this document contain? Select all that apply, and explain where they are.",{ artifact },DISSUES,ans,sig,model);
DOC("doc-a-1","easy",{kind:"table",title:"Event budget",cols:["Item","Cost ($)"],rows:[["Venue","800"],["Catering","450"],["AV hire","250"],["Total","1,500"]]},[5],["800","450","250","1,500"],"800 + 450 + 250 = 1,500. No issues.");
DOC("doc-a-2","medium",{kind:"doc",title:"Leave policy (extract)",text:"1. Full-time employees receive 20 days of annual leave.\n2. Leave requests need two weeks' notice.\n3. Full-time employees receive 25 days of annual leave, plus public holidays."},[0],["20","25","clause 1","clause 3"],"Clauses 1 and 3 contradict each other (20 vs 25 days).");
DOC("doc-a-3","hard",{kind:"doc",title:"Quarterly report (extract)",text:"Revenue: Q1 $40k, Q2 $45k, Q3 $50k. Total for the three quarters: $145k.\nWe changed our logo in Q2. The logo change is the reason revenue grew."},[2,4],["135","145","logo","cause"],"40 + 45 + 50 = $135k, not $145k, and the logo claim is an unsupported causal conclusion.");

/* ---------- SPREADSHEET EVALUATION generator ------------------------------ */
const SHEETS = {
  order:{ title:"Purchase order", cols:["Item","Qty","Unit price","Line total"], names:["Notebooks","Pens","Staplers","Folders","Markers","Paper (ream)","Binders","Sticky notes"],
    row(R,name){ const q=1+Math.floor(R()*9), p=pickR(R,[2,3,4,5,6,8,12]); return { cells:[name,q,p], result:q*p, fmt:r=>[r.cells[0],String(r.cells[1]),"$"+r.cells[2],"$"+r.result] }; },
    calcText:r=>`${r.cells[1]} × $${r.cells[2]} = $${r.cells[1]*r.cells[2]}` },
  timesheet:{ title:"Weekly timesheet", cols:["Staff","Hours","Rate ($/h)","Pay"], names:["A. Diaz","B. Owusu","C. Lin","D. Novak","E. Haddad","F. Murphy","G. Rossi"],
    row(R,name){ const h=10+Math.floor(R()*30), rt=pickR(R,[15,18,20,22,25]); return { cells:[name,h,rt], result:h*rt, fmt:r=>[r.cells[0],String(r.cells[1]),"$"+r.cells[2],"$"+r.result] }; },
    calcText:r=>`${r.cells[1]} h × $${r.cells[2]} = $${r.cells[1]*r.cells[2]}` },
  inventory:{ title:"Stock movement", cols:["Product","Opening","Received","Sold","Closing"], names:["Widget A","Widget B","Cable kit","Adapter","Battery pack","Charger","Stand"],
    row(R,name){ const o=20+Math.floor(R()*60), rc=Math.floor(R()*40), s=Math.floor(R()*(o+rc)); return { cells:[name,o,rc,s], result:o+rc-s, fmt:r=>[r.cells[0],String(r.cells[1]),String(r.cells[2]),String(r.cells[3]),String(r.result)] }; },
    calcText:r=>`${r.cells[1]} + ${r.cells[2]} − ${r.cells[3]} = ${r.cells[1]+r.cells[2]-r.cells[3]}` },
  budget:{ title:"Budget vs actual", cols:["Line","Budget","Actual","Variance (Actual − Budget)"], names:["Travel","Software","Training","Catering","Equipment","Marketing","Contractors"],
    row(R,name){ const b=pickR(R,[500,800,1200,1500,2000,2500]), a=b+pickR(R,[-200,-150,-50,0,75,120,300]); return { cells:[name,b,a], result:a-b, fmt:r=>[r.cells[0],"$"+r.cells[1],"$"+r.cells[2],(r.result<0?"−$":"$")+Math.abs(r.result)] }; },
    calcText:r=>`$${r.cells[2]} − $${r.cells[1]} = ${r.cells[2]-r.cells[1]}` },
};
function genSpreadsheet(seed, d){
  const R=rng(seed);
  const key = d==="easy" ? pickR(R,["order","timesheet"]) : d==="medium" ? pickR(R,["order","timesheet","inventory"]) : pickR(R,["inventory","budget","timesheet"]);
  const S=SHEETS[key], n = d==="easy"?4 : d==="medium"?5 : 7;
  const rows=shuffleR(R,S.names).slice(0,n).map(nm=>S.row(R,nm));
  const issues = d==="easy" ? (R()<0.15?[]:[pickR(R,[0,1,2,3])]) : d==="medium" ? shuffleR(R,[0,1,2,3]).slice(0,2) : shuffleR(R,[0,1,2,3]).slice(0,2+Math.floor(R()*2));
  const notes=[];
  if(issues.includes(2)){ const i=Math.floor(R()*rows.length); rows.splice(i+1,0,JSON.parse(JSON.stringify(rows[i]))); rows[i+1].fmt=rows[i].fmt; notes.push(`"${rows[i].cells[0]}" appears twice`); }
  if(issues.includes(0)){ const i=Math.floor(R()*rows.length), r=rows[i], right=r.result;
    let wrong = d==="hard" && Math.abs(right)>=10 && String(Math.abs(right)).length>=2 ? Number(String(Math.abs(right)).split("").reverse().join(""))*(right<0?-1:1) : right+pickR(R,[5,10,-4,6]);
    if(wrong===right) wrong=right+7; r.result=wrong; notes.push(`${r.cells[0]}: ${S.calcText(r)}, not ${wrong}`); }
  let total=rows.reduce((a,r)=>a+r.result,0);
  if(issues.includes(3)){ const i=Math.floor(R()*rows.length); rows[i].missing=true; notes.push(`${rows[i].cells[0]} has a missing value`); }
  if(issues.includes(1)){ const wrong=total+pickR(R,[10,-12,20,8]); notes.push(`the ${key==="inventory"?"closing figures":key==="budget"?"variances":"line totals"} add up to ${total}, but the total row shows ${wrong}`); total=wrong; }
  const disp=rows.map(r=>{ const c=r.fmt(r); if(r.missing) c[1]=""; return c; });
  const totalRow=S.cols.map((c,i)=>i===0?"TOTAL":i===S.cols.length-1?(key==="order"||key==="timesheet"?"$":"")+total:"");
  const ans=issues.slice().sort();
  return { category:"spreadsheet_evaluation", fmt:"multi", prompt:"Check this sheet. Which issues does it contain? Select all that apply, and name the affected rows.",
    material:{ artifact:{ kind:"table", title:S.title, cols:S.cols, rows:disp.concat([totalRow]) } }, options:SHEET_ISSUES, answer:ans.length?ans:[4],
    sig:["row","total","duplicate","missing"].concat(rows.slice(0,2).map(r=>String(r.cells[0]).toLowerCase())),
    model: notes.length ? "Issues: "+notes.join("; ")+"." : "Every calculation and the total are correct, with no duplicates or blanks: no issues.", subcategory:key };
}
PB_GENERATORS.push({ category:"spreadsheet_evaluation", prefix:"ss-g", perDifficulty:12, fn:genSpreadsheet });

/* ---------- IMAGE LABELLING + IMAGE-TO-TEXT generators -------------------- */
const SHAPES=["circle","square","triangle"], COLOURS=[["red","#ef4444"],["blue","#3b82f6"],["green","#22c55e"],["yellow","#eab308"]];
function genScene(R, count, sized){
  const items=[]; for(let i=0;i<count;i++) items.push({ shape:pickR(R,SHAPES), colour:pickR(R,COLOURS), size: sized ? (R()<0.5?"small":"large") : "large", x:30+(i%4)*70, y:35+Math.floor(i/4)*70 });
  const rad=o=>o.size==="small"?13:24;
  const svg=`<svg viewBox="0 0 300 ${Math.ceil(count/4)*70+10}" width="300" role="img" aria-label="Practice image with coloured shapes">`+items.map(o=>{
    const c=o.colour[1], r=rad(o);
    return o.shape==="circle" ? `<circle cx="${o.x}" cy="${o.y}" r="${r}" fill="${c}"/>` : o.shape==="square" ? `<rect x="${o.x-r+2}" y="${o.y-r+2}" width="${2*r-4}" height="${2*r-4}" fill="${c}"/>`
      : `<polygon points="${o.x},${o.y-r} ${o.x+r},${o.y+r-4} ${o.x-r},${o.y+r-4}" fill="${c}"/>`; }).join("")+`</svg>`;
  return { items, svg };
}
const plural=(n,s)=>`${n} ${s}${n===1?"":"s"}`;
function genImageLabel(seed, d){
  const R=rng(seed), sc=genScene(R, d==="easy"?3:d==="medium"?5:8, d==="hard"), it=sc.items;
  const cnt=(sh,co,sz)=>it.filter(o=>(!sh||o.shape===sh)&&(!co||o.colour[0]===co)&&(!sz||o.size===sz)).length;
  const cands=[];
  if(d==="easy"){ SHAPES.forEach(sh=>COLOURS.forEach(([co])=>cands.push([`Contains a ${co} ${sh}`, cnt(sh,co)>0, "presence"]))); }
  else { SHAPES.forEach(sh=>{ const n=cnt(sh); cands.push([`Contains exactly ${plural(n,sh)}`,true,"count"]); cands.push([`Contains exactly ${plural(n+1,sh)}`,false,"count"]); if(n>0) cands.push([`Contains exactly ${plural(n-1,sh)}`,false,"count"]); });
    COLOURS.forEach(([co])=>cands.push([`No ${co} shapes`, cnt(null,co)===0, "presence"])); }
  if(d==="hard"){ SHAPES.forEach(sh=>{ cands.push([`Contains a small ${sh}`, cnt(sh,null,"small")>0, "presence"]); });
    const a=pickR(R,COLOURS)[0], b=pickR(R,COLOURS.filter(c=>c[0]!==a))[0]; cands.push([`More ${a} shapes than ${b} shapes`, cnt(null,a)>cnt(null,b), "count"]); }
  const sh=shuffleR(R,cands), nt = d==="easy"?1:2, nf = d==="easy"?3:d==="medium"?3:4;
  const trues=sh.filter(c=>c[1]).slice(0,nt), falses=sh.filter(c=>!c[1]).slice(0,nf);
  const opts=shuffleR(R,trues.concat(falses));
  return { category:"image_labelling", fmt:"multi", prompt:"Select every label that is TRUE for this image.", material:{ svg:sc.svg }, options:opts.map(o=>[o[0],o[2]]),
    answer:opts.map((o,i)=>o[1]?i:-1).filter(i=>i>=0), sig:["count","colour","shape"].concat(d==="hard"?["small"]:[]),
    model:"True labels: "+opts.filter(o=>o[1]).map(o=>o[0]).join("; ")+".", subcategory:d==="hard"?"size-and-count":"presence-and-count" };
}
PB_GENERATORS.push({ category:"image_labelling", prefix:"il-g", perDifficulty:12, fn:genImageLabel });
const CAP_ERR=["Accurate","Wrong count","Wrong colour","Wrong shape","Mentions something not in the image"];
function genCaption(seed, d){
  const R=rng(seed), sc=genScene(R, d==="easy"?3:d==="medium"?5:7, false);
  const groups={}; sc.items.forEach(o=>{ const k=o.colour[0]+" "+o.shape; groups[k]=(groups[k]||0)+1; });
  const keys=shuffleR(R,Object.keys(groups)), nGroups = d==="easy"?1 : d==="medium"?Math.min(2,keys.length) : Math.min(3,keys.length);
  const desc=keys.slice(0,nGroups).map(k=>({ k, n:groups[k], co:k.split(" ")[0], sh:k.split(" ")[1] }));
  let err=Math.floor(R()*5); const target=Math.floor(R()*desc.length), t=desc[target];
  if(err===2){ const other=COLOURS.map(c=>c[0]).find(c=>c!==t.co && !groups[c+" "+t.sh]); if(other) t.co=other; else err=0; }
  if(err===3){ const other=SHAPES.find(s=>s!==t.sh && !groups[t.co+" "+s]); if(other) t.sh=other; else err=0; }
  if(err===1) t.n=t.n+1;
  const part=x=>`${NUMW[x.n]||x.n} ${x.co} ${x.sh}${x.n>1?"s":""}`;
  let cap=`The image shows ${desc.length===1?part(desc[0]):desc.slice(0,-1).map(part).join(", ")+" and "+part(desc[desc.length-1])}`;
  if(err===4) cap+=" and a black star";
  cap+=".";
  return { category:"image_to_text", fmt:"single", prompt:"Is this AI-generated caption accurate for the image? (The caption may describe only part of the image.)",
    material:{ svg:sc.svg, caption:cap }, options:CAP_ERR, answer:err, sig:["count","colour","shape","not in image","accurate"],
    model:`Correct label: ${CAP_ERR[err]}. The image contains ${Object.entries(groups).map(([g,c])=>`${NUMW[c]||c} ${g}${c>1?"s":""}`).join(", ")}.`, subcategory:`${nGroups}-group caption` };
}
PB_GENERATORS.push({ category:"image_to_text", prefix:"it-g", perDifficulty:12, fn:genCaption });
