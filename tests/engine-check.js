/* Headless engine check: every profession x allowed interview type builds a valid pool and
   completes a simulated adaptive interview. Run from the repo root: node tests/engine-check.js (≈2–3 min). */
const fs=require('fs'), vm=require('vm');
const store={};
const ctx={ window:{ localStorage:{ getItem:k=>store[k]??null, setItem:(k,v)=>store[k]=String(v), removeItem:k=>delete store[k] } }, console, Math, Date, JSON };
ctx.window.window=ctx.window; vm.createContext(ctx);
const files=['legacy-bank','competencies','professions','items'].map(f=>'js/data/'+f+'.js').concat(['js/storage.js','js/engine.js']);
let src=files.map(f=>fs.readFileSync(f,'utf8')).join('\n;\n');
src+=`
;(function(){
const issues=[]; let combos=0, minPool=1e9, minAt='';
const counts={};
PROFESSIONS.forEach(p=>{
  p.comps.concat(p.ai?[p.ai]:[]).forEach(id=>{ if(!COMPS[id]) issues.push('missing comp '+id+' in '+p.title); });
  if(!ITEM_SETS[p.set]) issues.push('missing set '+p.set+' '+p.title);
  const av=typeAvailability(p);
  Object.keys(TYPES).forEach(t=>{ if(!av[t].ok) return; combos++;
    const pool=buildPool(p,t);
    if(pool.length<minPool){minPool=pool.length; minAt=p.title+'/'+t;}
    pool.forEach(q=>{ const txt=q.questionText+q.scenario; if(/[{}]/.test(txt.replace(/\\{name:[^}]*\\}/,''))&&/\\{(role|a_role|lang)\\}/.test(txt)) issues.push('token '+q.id);
      if(!q.questionText||!q.compLabel||!q.expectedStrongSignals.length) issues.push('bad q '+q.id);
      if(/undefined/.test(txt)) issues.push('undefined in '+q.id+' '+p.title); });
    // Simulate a deep interview with mixed answers.
    const s=createSession({professionId:p.id,mode:'text',type:t,level:'expert',difficulty:'adaptive',length:'deep',name:'T'});
    startSession(s);
    let guard=0, res;
    do{ const q=currentQ(s); const strong=guard%3!==0;
      const ans=strong? (q.expectedStrongSignals.join(', ')+'. First, because of this, for example in my last role I handled 3 cases; therefore I would check the result. ').repeat(4) : 'i guess not sure';
      res=submitAnswer(s, ans, 30); guard++; } while(res.kind!=='done' && guard<60);
    if(res.kind!=='done') issues.push('no finish '+p.title+'/'+t);
    if(s.answers.length<12||s.answers.length>20) issues.push('deep length '+s.answers.length+' '+p.title+'/'+t);
    const types=new Set(s.answers.map(a=>a.questionType)); counts[t]=(counts[t]||0)+1;
    if(s.status!=='completed') issues.push('status '+s.status);
  });
  if(!av[recommendedType(p)].ok) issues.push('recommended unavailable '+p.title);
});
// Standard length check for exact count
const s2=createSession({professionId:'project-manager',mode:'voice',type:'ai_domain',level:'experienced',difficulty:'adaptive',length:'standard'}); startSession(s2);
let r; do{ r=submitAnswer(s2, 'risk owner mitigation stakeholder because first for example 20% impact therefore '.repeat(8), 20);}while(r.kind!=='done');
console.log('PM standard answers:', s2.answers.length, 'types:', s2.answers.map(a=>a.questionType).join(','));
console.log('PM comps:', Object.keys(s2.scores.competencies).join(' | '));
console.log('followups:', s2.followUps.length, 'overall', s2.scores.overall);
console.log('professions', PROFESSIONS.length, 'groups', GROUPS.length, 'combos', combos, 'minPool', minPool, minAt);
console.log('issues', issues.length, issues.slice(0,20));
// custom profession
const cp=buildCustomProfession({title:'Veterinary Technician',industry:'Animal health',responsibilities:'Monitoring anaesthesia, Preparing surgical equipment\\nClient education',skills:'Sterile technique'});
Repo.customProfessions.save(cp);
const av=typeAvailability(cp); console.log('custom types', Object.keys(av).filter(k=>av[k].ok).join(','));
const s3=createSession({professionId:cp.id,mode:'text',type:'ai_domain',level:'entry',difficulty:'easy',length:'quick'}); startSession(s3);
do{ r=submitAnswer(s3,'monitoring anaesthesia carefully because safety first, for example I check vitals every 5 minutes and record them, therefore issues are caught early', 10);}while(r.kind!=='done');
console.log('custom quick:', s3.answers.map(a=>a.questionType+':'+a.compLabel).join(' | '));
const jan=buildCustomProfession({title:'Forklift Driver',responsibilities:'Moving pallets safely'}); console.log('custom transferable', jan.transferable, jan.ai);
})();`;
vm.runInContext(src, ctx);
