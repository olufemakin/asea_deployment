/* =============================================================================
   Storage — guest-first persistence behind a small adapter.

   Layers:
     StorageAdapter  get(key) / set(key, value) / remove(key) — JSON values.
                     Today: localStorage, falling back to in-memory when the
                     browser blocks storage (private mode, disabled cookies).
                     Later: a cloud adapter with the same three methods can be
                     dropped in (e.g. hydrate on sign-in, write-through on set).
     Repo            Domain repositories (sessions, practice, prefs, custom
                     professions). The rest of the app only talks to Repo.
   ========================================================================== */
"use strict";

const StorageAdapter = (()=>{
  const NS = "bsp.workready.v1.";
  const mem = {};
  let ls = null;
  try { ls = window.localStorage; ls.setItem(NS+"__t","1"); ls.removeItem(NS+"__t"); } catch(e){ ls = null; }
  return {
    kind: ls ? "browser" : "session-only",
    get(k, d){ try{ const v = ls ? ls.getItem(NS+k) : mem[k]; return v==null ? d : JSON.parse(v); }catch(e){ return d; } },
    set(k, v){ const s = JSON.stringify(v); try{ if(ls) ls.setItem(NS+k, s); else mem[k]=s; return true; }catch(e){ mem[k]=s; return false; } },
    remove(k){ try{ if(ls) ls.removeItem(NS+k); }catch(e){} delete mem[k]; },
    legacy(k){ try{ return ls ? JSON.parse(ls.getItem(k)||"null") : null; }catch(e){ return null; } },
  };
})();

const Repo = (()=>{
  const A = StorageAdapter;
  const MAX_SESSIONS = 50, MAX_PRACTICE = 100;
  const byNewest = (a,b)=>(b.startedAt||0)-(a.startedAt||0);

  const sessions = {
    all(){ return A.get("sessions", []); },
    get(id){ return sessions.all().find(s=>s.sessionId===id) || null; },
    save(s){
      const list = sessions.all().filter(x=>x.sessionId!==s.sessionId);
      list.push(s); list.sort(byNewest);
      A.set("sessions", list.slice(0, MAX_SESSIONS)); return s;
    },
    remove(id){ A.set("sessions", sessions.all().filter(s=>s.sessionId!==id)); },
    completed(){ return sessions.all().filter(s=>s.status==="completed" && s.answers && s.answers.length); },
    withReports(){ return sessions.all().filter(s=>s.answers && s.answers.length && s.status!=="in_progress"); },
    inProgress(){ return sessions.all().filter(s=>s.status==="in_progress"); },
  };
  const practice = {
    all(){ return A.get("practice", []); },
    add(r){ const list=[r, ...practice.all()]; A.set("practice", list.slice(0, MAX_PRACTICE)); return r; },
  };
  /* Timed Practice Lab sessions (10 questions each). */
  const practiceSessions = {
    all(){ return A.get("practiceSessions", []); },
    get(id){ return practiceSessions.all().find(p=>p.id===id) || null; },
    save(ps){ const list=practiceSessions.all().filter(x=>x.id!==ps.id); list.push(ps); list.sort((a,b)=>b.startedAt-a.startedAt); A.set("practiceSessions", list.slice(0, MAX_PRACTICE)); return ps; },
    remove(id){ A.set("practiceSessions", practiceSessions.all().filter(p=>p.id!==id)); },
  };
  /* Per-question usage (unseen-first selection) and admin overrides (Prompt 3 Question Bank Admin). */
  const questionStats = {
    all(){ return A.get("questionStats", {}); },
    recordUse(ids){ const st=questionStats.all(), now=Date.now(); ids.forEach(id=>{ const s=st[id]||{ timesUsed:0 }; s.timesUsed++; s.lastUsedAt=now; st[id]=s; }); A.set("questionStats", st); },
  };
  const bankOverrides = {
    all(){ return A.get("bankOverrides", {}); },
    set(id, patch){ const o=bankOverrides.all(); o[id]=Object.assign(o[id]||{}, patch, { updatedAt:new Date().toISOString() }); A.set("bankOverrides", o); return o[id]; },
    clear(){ A.remove("bankOverrides"); },
  };
  const prefs = {
    get(){ return A.get("prefs", {}); },
    set(patch){ const p = Object.assign(prefs.get(), patch); A.set("prefs", p); return p; },
  };
  const customProfessions = {
    all(){ return A.get("customProfessions", []); },
    save(p){ const list = customProfessions.all().filter(x=>x.id!==p.id); list.push(p); A.set("customProfessions", list); return p; },
    remove(id){ A.set("customProfessions", customProfessions.all().filter(p=>p.id!==id)); },
  };

  /* Candidate CV: raw text the user supplied, extracted items (each with the exact source excerpt),
     their review status, and AI-experience mappings. Only "confirmed" items are trusted. */
  const cv = {
    get(){ return A.get("cv", null); },
    save(c){ c.updatedAt=Date.now(); A.set("cv", c); return c; },
    clear(){ A.remove("cv"); },
  };
  /* Local content studio (admin) data: stays on this device; exported as JSON for the site owner. */
  const kv = name => ({ all(){ return A.get(name, {}); }, set(id, v){ const o=A.get(name, {}); if(v==null) delete o[id]; else o[id]=v; A.set(name, o); return v; }, replace(o){ A.set(name, o||{}); }, clear(){ A.remove(name); } });
  const interviewBank = kv("interviewBank");     // id → patch (built-in) or full record (admin-created)
  const roleOverrides = kv("roleOverrides");     // profession id → patch | full new profession
  const alexSettings = { get(){ return A.get("alexSettings", {}); }, set(o){ A.set("alexSettings", o||{}); }, clear(){ A.remove("alexSettings"); } };
  const admin = { get(){ return A.get("admin", {}); }, set(p){ A.set("admin", Object.assign(A.get("admin", {}), p)); } };

  /* One-time import of v1 history (localStorage "ia_history") into sessions. */
  function migrate(){
    if(A.get("migratedV1", false)) return;
    const old = A.legacy("ia_history");
    if(Array.isArray(old)){
      old.forEach((h,i)=>{
        if(!h || !Array.isArray(h.answers)) return;
        const t = Date.parse(h.date) || (Date.now() - (i+1)*60000);
        const diff = LEGACY_DIFF[h.cfg && h.cfg.difficulty] || "medium";
        sessions.save({
          sessionId:"v1-"+t+"-"+i, legacy:true, version:1,
          profession:{ id:null, title:h.domain||"Interview", group:null },
          interviewType:"legacy", mode:(h.cfg&&h.cfg.voice)?"voice":"text",
          experienceLevel:"intermediate", difficulty:diff,
          questionTarget:h.answers.length, currentQuestion:h.answers.length,
          answers:h.answers, followUps:[], startedAt:t, completedAt:t, status:"completed",
          candidate:{ name:h.candidate||"", platform:h.platform||"" },
          scores:{ overall:h.score }, feedback:null,
        });
      });
    }
    A.set("migratedV1", true);
  }

  function exportAll(){
    return { exportedAt:new Date().toISOString(), storage:A.kind,
      sessions:sessions.all(), practiceSessions:practiceSessions.all(), practice:practice.all(), questionStats:questionStats.all(), prefs:prefs.get(), customProfessions:customProfessions.all(), cv:cv.get() };
  }
  /* Granular "Clear my data" groups. Local content-studio edits are separate (cleared from the studio). */
  const CLEAR_GROUPS = { interviews:["sessions"], practice:["practiceSessions","practice","questionStats"], cv:["cv"], preferences:["prefs","customProfessions"] };
  function clearGroups(groups){ groups.forEach(g=>(CLEAR_GROUPS[g]||[]).forEach(k=>A.remove(k))); }
  function clearAll(){ clearGroups(Object.keys(CLEAR_GROUPS)); }

  return { sessions, practice, practiceSessions, questionStats, bankOverrides, prefs, customProfessions, cv, interviewBank, roleOverrides, alexSettings, admin,
    migrate, exportAll, clearAll, clearGroups, CLEAR_GROUPS, kind:A.kind };
})();
