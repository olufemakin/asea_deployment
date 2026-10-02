/* Headless engine check. Run from the repo root: node tests/engine-check.js
   Every profession x allowed interview type builds a valid pool and completes a simulated
   interview; plus targeted checks for stage flow, memory, follow-ups, bilingual balance,
   scoring fairness and role-specific competency scoring. */
const fs=require("fs"), vm=require("vm");
const store={};
const ctx={ window:{ localStorage:{ getItem:k=>store[k]??null, setItem:(k,v)=>store[k]=String(v), removeItem:k=>delete store[k] } }, console, Math, Date, JSON };
ctx.window.window=ctx.window; ctx.store=store; vm.createContext(ctx);
const files=["legacy-bank","competencies","professions","items","roles","practice-core","bank-ranking","bank-evaluation","bank-facts",
  "bank-annotation","bank-language","bank-generalist","bank-coding","bank-generated","bank-critique","concepts"].map(f=>"js/data/"+f+".js")
  .concat(["js/storage.js","js/engine.js","js/question-bank.js","js/scoring.js","js/interview-bank.js","js/practice.js","js/cv.js"]);
vm.runInContext(files.map(f=>fs.readFileSync(f,"utf8")).join("\n;\n"), ctx);
const R=src=>vm.runInContext(src, ctx);
R(`
const issues=[]; const fail=m=>issues.push(m);
const strongAns=q=>(q.expectedStrongSignals.join(", ")+". First, because of this, for example in my last role I managed 3 cases; therefore I would check the result. ").repeat(3);
function run(pid, type, length, opts={}){
  for(const k in store) delete store[k];
  const s=createSession(Object.assign({professionId:pid,mode:"text",type,level:"experienced",difficulty:"adaptive",length},opts));
  startSession(s); let g=0, r;
  do{ const q=currentQ(s); const ans = opts.answer ? opts.answer(q,g,s) : (g%3===1 ? "I guess not sure" : strongAns(q)); r=submitAnswer(s, ans, 20); g++; } while(r.kind!=="done" && g<80);
  return s;
}
let combos=0;
PROFESSIONS.forEach(p=>{
  profComps(p).concat(p.ai?[p.ai]:[]).forEach(id=>{ if(!getComp(p,id)) fail("missing comp "+id+" in "+p.title); });
  const av=typeAvailability(p);
  Object.keys(TYPES).forEach(t=>{ if(!av[t].ok) return; combos++;
    const pool=buildPool(p,t);
    pool.forEach(q=>{ if(!p.custom && !COMPETENCY_REGISTRY[q.competency]) fail("interview competency not registered: "+q.competency+" ("+q.id+")"); });
    pool.forEach(q=>{ const txt=q.questionText+q.scenario; if(/\\{(role|a_role|lang|cond)\\}/.test(txt)||/undefined/.test(txt)) fail("token "+q.id+" "+p.title); if(!q.compLabel||!q.expectedStrongSignals.length) fail("bad q "+q.id); });
    const s=run(p.id, t, "standard");
    if(s.answers.length!==10) fail("standard length "+s.answers.length+" "+p.title+"/"+t);
    if(s.answers[0].questionType!=="intro") fail("intro first "+p.title);
    if(s.answers[s.answers.length-1].questionType!=="final") fail("final last "+p.title+"/"+t);
    if(new Set(s.answers.map(a=>a.questionId)).size!==s.answers.length) fail("repeat q "+p.title+"/"+t);
    if(s.status!=="completed"||!s.scores||!s.scores.areas) fail("status/areas "+p.title+"/"+t);
  });
});
// Deep length range
["project-manager","janitor","bilingual-evaluator-french-and-english","data-analyst"].forEach(pid=>{
  const p=PROF[pid]; const t=recommendedType(p); const s=run(pid,t,"deep");
  if(s.answers.length<12||s.answers.length>20) fail("deep length "+s.answers.length+" "+pid);
  if(s.answers[s.answers.length-1].questionType!=="final") fail("deep final "+pid);
});
// Stage flow order for ai_domain standard (non-decreasing stage index, callbacks allowed)
const ORD={background:0,domain:1,reasoning:2,ai:3,communication:4};
const pm=run("project-manager","ai_domain","standard");
const stages=pm.answers.map(a=>a.stage); let ok=true; for(let i=1;i<stages.length;i++){ if(ORD[stages[i]]<ORD[stages[i-1]] && pm.answers[i].questionType!=="callback") ok=false; }
if(!ok) fail("stage order "+stages.join(">"));
["project-manager","accountant","data-analyst","software-engineer","secondary-school-teacher","social-media-manager","bilingual-evaluator-french-and-english","chemist","mechanical-engineer"].forEach(pid=>{
  for(let k=0;k<5;k++){ const t=PROF[pid].group==="language"?"bilingual":"ai_domain"; const s=run(pid,t,"standard"); if(!s.answers.some(a=>a.artifact)) { fail("no artifact in advanced "+pid+"/"+t); break; } }
});
console.log("PM flow:", pm.answers.map(a=>a.stage+":"+a.questionType).join(" | "));
console.log("PM areas:", JSON.stringify(pm.scores.areas));
console.log("PM follow-up types:", pm.followUps.map(f=>f.type).join(","));
// Memory: vendor answer -> callback that references it
const mem=run("project-manager","ai_domain","standard",{answer:(q,g)=> g===0 ? "I managed a software implementation where a vendor caused a major delay. I led a team of 8 and reported to the steering committee because the budget was at risk." : strongAns(q)});
const cb=mem.answers.find(a=>a.questionType==="callback");
if(!cb || !/You mentioned that you managed a software implementation where a vendor caused a major delay/.test(cb.q)) fail("memory callback missing: "+(cb&&cb.q));
console.log("Memory callback:", cb&&cb.q);
// Generic memory for a profession without role model
const gm=run("pharmacist","domain","standard",{answer:(q,g)=> g===0 ? "I worked in a busy hospital pharmacy for six years and I led the anticoagulation clinic, checking doses for 40 patients a day." : strongAns(q)});
const gcb=gm.answers.find(a=>a.questionType==="callback"); if(!gcb) fail("generic memory missing"); else console.log("Generic callback:", gcb.q);
// Follow-up variety: strong answers (tradeoff/edge/challenge/ai), hedging (evidence), off-topic (depth), short (clarify)
const types=new Set();
["project-manager","accountant","software-engineer","registered-nurse","data-analyst"].forEach(pid=>{ const s=run(pid,"ai_domain","full",{level:"senior",answer:q=>strongAns(q)}); s.followUps.forEach(f=>types.add(f.type)); });
const hedge="I guess I would just trust what the system says because it is usually right, and I am not sure there is much more to check. Probably fine overall, so I would move on to the next item and keep going with the rest of the list for the client.";
const offTopic="Honestly I enjoy working with people and I like learning new things every day. My colleagues say I am friendly and hard working, and I always arrive early. I also enjoy reading and travelling, and I think teamwork is very important in any office or company where people work together.";
run("accountant","ai_domain","standard",{answer:(q,g,s)=>(s.phase==="main"&&s.answers.length===2)?hedge:strongAns(q)}).followUps.forEach(f=>types.add(f.type));
run("accountant","ai_domain","standard",{answer:(q,g,s)=>(s.phase==="main"&&s.answers.length===2)?offTopic:strongAns(q)}).followUps.forEach(f=>types.add(f.type));
run("accountant","ai_domain","standard",{answer:(q,g,s)=>(s.phase==="main"&&s.answers.length===2)?"Check it.":strongAns(q)}).followUps.forEach(f=>types.add(f.type));
console.log("Follow-up types seen:", [...types].join(","));
["clarify","evidence","depth","tradeoff","edge","challenge","ai"].forEach(t=>{ if(!types.has(t)) fail("follow-up type never used: "+t); });
// Bilingual balance
["balanced","english","french"].forEach(b=>{
  const s=run("bilingual-evaluator-french-and-english","bilingual","standard",{langBalance:b, answer:(q,g)=> q.lang==="fr" ? "Je pense que le registre est important parce que le client attend un ton formel, par exemple avec le vouvoiement, donc je vérifie le sens et le contexte." : strongAns(q)});
  const c={en:0,fr:0,x:0}; s.answers.forEach(a=>c[a.lang||"en"]++);
  console.log("Bilingual", b, JSON.stringify(c), "areas", Object.keys(s.scores.areas).join("/"));
  if(b==="balanced" && (c.en<3||c.fr<3||c.x<1)) fail("balanced mix "+JSON.stringify(c));
  if(b==="french" && c.fr<c.en) fail("mostly french mix "+JSON.stringify(c));
  if(b==="english" && c.en<c.fr) fail("mostly english mix "+JSON.stringify(c));
});
// Language mismatch detection
const fq={expectedStrongSignals:["registre","ton"],commonWeakSignals:[],lang:"fr"};
if(!scoreAnswer("I think the tone is far too casual for a customer and should be formal and polite in this context.",fq,{}).langMismatch) fail("lang mismatch not detected");
// Fairness: fillers and accents do not change the score
const q={expectedStrongSignals:["mitigation","stakeholder","escalate"],commonWeakSignals:WEAK_DEFAULT};
const a1=scoreAnswer("First I would agree a mitigation with each stakeholder, because escalation matters. For example in my last role we escalated early.",q,{});
const a2=scoreAnswer("Um, first I would, uh, agree a mitigation with each stakeholder, because escalation matters. Uh, for example in my last role we, um, escalated early.",q,{});
if(a1.score!==a2.score) fail("fillers change score "+a1.score+" vs "+a2.score);
if(scoreAnswer("mitigating risks",q,{}).hit.indexOf("mitigation")<0) fail("stem match");
// Role-specific competency scoring
const roleProfs=PROFESSIONS.filter(p=>roleModelFor(p)).map(p=>p.id);
console.log("Professions with role models:", roleProfs.length);
if(roleProfs.length<10) fail("role models <10");
const nurse=run("registered-nurse","ai_domain","standard"); const nc=Object.keys(nurse.scores.competencies);
console.log("Nurse competencies:", nc.join(" | "));
if(!nc.some(k=>/Uncertainty|Evidence-Based|Patient Safety/.test(k))) fail("healthcare comps not scored");
if(!nurse.asked[0] || !nurse.healthcare) fail("healthcare flag");
console.log("combos", combos, "issues", issues.length); issues.slice(0,25).forEach(i=>console.log(" -", i));
if(issues.length) throw new Error(issues.length+" engine issues");
`);
R(`const r=practiceSelfCheck();
console.log("QUESTION BANK (published per difficulty)");
r.audit.forEach(a=>console.log("  "+a.label.padEnd(30)+" E "+String(a.easy).padStart(2)+"  M "+String(a.medium).padStart(2)+"  H "+String(a.hard).padStart(2)+"  "+a.status.toUpperCase()));
console.log("Practice bank:", JSON.stringify(r.summary));
if(r.issues.length){ r.issues.slice(0,30).forEach(i=>console.log(" -",i)); throw new Error(r.issues.length+" practice issues"); }`);
console.log("ENGINE CHECK OK");
