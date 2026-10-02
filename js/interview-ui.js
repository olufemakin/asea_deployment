/* =============================================================================
   Live interview UI — microphone check, voice/text answering, Alex controls,
   practical-task exhibits (artifacts). Uses Speech (engine.js), Mic and
   createRecognizer (voice.js). Only transcripts are saved; audio is never stored.
   ========================================================================== */
"use strict";

let tick=null, elapsed=0, renderToken=0, ansTick=null;
const V = { state:"idle", rec:null, text:"", interim:"", ansElapsed:0, showLive:true, answerLang:"en", micOK:null };

/* ---------- Artifacts (visual practical tasks) ---------------------------- */
function renderArtifact(a){
  if(!a) return "";
  const title=a.title?`<div class="art-title">${H(a.title)}</div>`:"";
  const note=a.note?`<div class="art-note">${H(a.note)}</div>`:"";
  if(a.kind==="table") return `<figure class="artifact">${title}<div class="art-scroll"><table class="art-table"><thead><tr>${a.cols.map(c=>`<th>${H(c)}</th>`).join("")}</tr></thead>
    <tbody>${a.rows.map(r=>`<tr>${r.map(c=>`<td>${c===""?'<span class="art-empty">(blank)</span>':H(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${note}</figure>`;
  if(a.kind==="code") return `<figure class="artifact">${title}<pre class="art-code">${H(a.code)}</pre>${note}</figure>`;
  if(a.kind==="doc") return `<figure class="artifact">${title}<div class="art-doc">${H(a.text)}</div>${note}</figure>`;
  if(a.kind==="chart"){
    const vals=a.bars.map(b=>b[1]), lo=a.floor!=null?a.floor:Math.min(...vals)-Math.max(1,(Math.max(...vals)-Math.min(...vals))*0.4), hi=Math.max(...vals);
    return `<figure class="artifact">${title}<div class="art-chart" role="img" aria-label="${H(a.title)}: ${a.bars.map(b=>b[0]+" "+b[1]+(a.unit||"")).join(", ")}">
      ${a.bars.map(([l,v])=>`<div class="art-bar"><div class="art-col" style="height:${Math.max(6,Math.round((v-lo)/(hi-lo||1)*100))}%"><span>${H(v)}${H(a.unit||"")}</span></div><div class="art-lbl">${H(l)}</div></div>`).join("")}
    </div>${note}</figure>`;
  }
  if(a.kind==="compare") return `<figure class="artifact">${title}<div class="art-compare">${a.items.map(([l,t])=>`<div class="art-item"><div class="art-label">${H(l)}</div><div class="art-doc">${H(t)}</div></div>`).join("")}</div>${note}</figure>`;
  return "";
}

/* ---------- Session lookup ------------------------------------------------ */
function activeSession(){
  if(App.session && App.session.status==="in_progress") return App.session;
  const id=Repo.prefs.get().activeSessionId, s=id && Repo.sessions.get(id);
  if(s && s.status==="in_progress"){ App.session=s; return s; }
  return null;
}
function needsMicCheck(s){ return s.mode==="voice" && Speech.sttAvailable && !s.micChecked; }

/* ---------- Microphone check ---------------------------------------------- */
let sampleRec=null, sampleTimer=null;
function scrMicCheck(){
  const s=activeSession();
  if(!s){ el.innerHTML=emptyCard("🎙️","No interview in progress","Set up a voice interview with Alex to run a microphone check.","#/interview/start","Start interview"); return; }
  const nm=s.candidate.name||"[your preferred name]";
  el.innerHTML = pageHead("Voice interview","Microphone check","Let's make sure Alex can hear you before you begin.")
  + `<div class="card">
      <div class="row center wrapw" style="gap:16px">${alexBlock()}<div class="grow"></div><span class="pill">${H(s.profession.title)} · ${H(TYPES[s.interviewType].label)}</span></div>
      <h3 style="margin-top:22px">1 · Microphone</h3>
      <div id="micStatus" class="small muted" role="status">Detecting your microphone…</div>
      <div class="meter" id="micMeter" aria-hidden="true"><i></i></div>
      <h3 style="margin-top:22px">2 · Sample recording</h3>
      <p>Press <b>Record sample</b> and say:</p>
      <div class="quote"><p>“My name is ${H(nm)}, and I'm ready to begin.”</p></div>
      <div class="row wrapw" style="gap:10px;margin:14px 0"><button class="btn" id="sampleBtn" onclick="recordSample()">🎙️ Record sample</button></div>
      <div class="transcript empty" id="samplePreview" aria-live="polite">Your transcription preview will appear here.</div>
      <div class="row wrapw" style="gap:10px;margin-top:18px">
        <button class="btn primary" id="micGood" onclick="micSoundsGood()" disabled>Sounds good</button>
        <button class="btn" onclick="micTryAgain()">Try again</button>
        <button class="btn ghost" onclick="micUseText()">Use text instead</button>
      </div>
      <p class="note">Privacy: nothing is recorded or stored. The level meter and transcription run live in your browser; only the text of your answers is saved with your interview. Your accent, voice and speech patterns are never scored.</p>
    </div>`;
  micDetect();
}
async function micDetect(){
  const st=document.getElementById("micStatus"); if(!st) return;
  try{
    await Mic.open();
    V.micOK=true; st.innerHTML=`✅ Microphone detected: <b>${H(Mic.deviceLabel())}</b>. Speak and watch the input level move.`;
    Mic.meter("#micMeter");
  }catch(e){
    V.micOK=false; Mic.close();
    st.innerHTML = e.code==="unsupported"
      ? `This browser can't access a microphone directly. You can still try a sample recording, or use text instead.`
      : `<span class="err">We couldn't access your microphone.</span> Check your browser's permission for this site, then press <b>Try again</b>, or continue with text.`;
  }
}
function recordSample(){
  const pv=document.getElementById("samplePreview"), btn=document.getElementById("sampleBtn");
  if(!Speech.SR){ pv.classList.remove("empty"); pv.textContent="Speech-to-text isn't supported in this browser. Alex can still speak; you'll type your answers."; return; }
  if(sampleRec) sampleRec.stop();
  pv.classList.add("empty"); pv.textContent="Listening…"; btn.disabled=true; btn.textContent="● Recording…";
  sampleRec=createRecognizer("en-US",{
    onUpdate:(f,i)=>{ const t=(f+" "+i).trim(); if(t){ pv.classList.remove("empty"); pv.textContent=t; }
      if(words(f).length>=5){ clearTimeout(sampleTimer); sampleTimer=setTimeout(finishSample, 900); } },
    onError:k=>{ if(k==="mic"){ finishSample(); pv.innerHTML=`<span class="err">We couldn't access your microphone.</span> Press Try again, or use text instead.`; } },
  });
  sampleRec.start();
  clearTimeout(sampleTimer); sampleTimer=setTimeout(finishSample, 7000);
}
function finishSample(){
  clearTimeout(sampleTimer); const pv=document.getElementById("samplePreview"), btn=document.getElementById("sampleBtn"), good=document.getElementById("micGood");
  const t=sampleRec?sampleRec.text:""; if(sampleRec){ sampleRec.stop(); sampleRec=null; }
  if(btn){ btn.disabled=false; btn.textContent="🎙️ Record sample"; }
  if(!pv) return;
  if(t){ pv.classList.remove("empty"); pv.innerHTML=`<b>We heard:</b> “${H(t)}”`; if(good) good.disabled=false; }
  else if(!/err/.test(pv.innerHTML)){ pv.classList.remove("empty"); pv.innerHTML=`<span class="err">We couldn't clearly transcribe that.</span> Press Try again and speak a little closer to the microphone, or use text instead.`; }
}
function micTryAgain(){ if(sampleRec){ sampleRec.stop(); sampleRec=null; } clearTimeout(sampleTimer); Mic.close(); scrMicCheck(); }
function micSoundsGood(){ const s=activeSession(); if(!s) return; s.micChecked=true; Repo.sessions.save(s); closeMicCheck(); go("interview/session"); }
function micUseText(){ const s=activeSession(); if(!s) return; s.mode="text"; s.micChecked=true; Repo.sessions.save(s); closeMicCheck(); go("interview/session"); }
function closeMicCheck(){ if(sampleRec){ sampleRec.stop(); sampleRec=null; } clearTimeout(sampleTimer); Mic.close(); }

/* ---------- Interview screen --------------------------------------------- */
function scrSession(){
  const s=activeSession();
  if(!s){ el.innerHTML=emptyCard("🎙️","No interview in progress","Set up a new interview with Alex, or resume one from your history.","#/interview/start","Start interview"); return; }
  if(!Array.isArray(s.asked) || !s.asked.length || !currentQ(s) || !Array.isArray(s.answers) || !TYPES[s.interviewType] || !getProfession(s.profession&&s.profession.id)){
    el.innerHTML=`<div class="card empty" role="alert"><div class="ic">⚠️</div><h2>Session restore failed</h2><p class="muted">This interview couldn't be restored (its saved data is incomplete or its profession is no longer available).</p>
      <div class="row wrapw" style="gap:10px;justify-content:center">${s.answers&&s.answers.length?`<button class="btn primary" onclick="salvageSession()">End it and see the report</button>`:""}<button class="btn" onclick="discardSession()">Discard it</button><a class="btn ghost" href="#/interview/start">Start a new interview</a></div></div>`; return;
  }
  if(needsMicCheck(s)){ go("interview/mic-check"); return; }
  renderInterview(s);
}
const lineLang=t=>langOf(t)==="fr"?"fr":"en";
function speechPlan(s){
  const q=currentQ(s), ql=q.lang==="fr"?"fr":"en";
  const lead=(q.scenario||q.artifact)?[{ text: ql==="fr"?"Voici le document à l'écran.":"Here is the example on your screen.", lang:ql }]:[];
  const ask={ text:q.questionText, lang:ql };
  if(s.phase==="followup" && s.pending && s.pending.followUp){ const f=s.pending.followUp; return { display:[f.lead], spoken:[{text:f.lead,lang:lineLang(f.lead)},{text:f.question,lang:ql}] }; }
  if(s.currentQuestion===0 && !s.answers.length){
    const lv=LEVELS[s.experienceLevel]&&s.experienceLevel!=="doctoral"?LEVELS[s.experienceLevel].label.toLowerCase().replace(" level",""):s.experienceLevel==="doctoral"?"doctoral":null;
    const intro=ALEX.intro({ name:s.candidate.name, profession:s.profession.title, typeIntro:TYPES[s.interviewType].intro, level:lv, custom:!!s.profession.custom, specialty:s.profession.specialty, healthcare:s.healthcare, bilingual:!!s.langBalance, cv:!!(s.cv&&s.cv.used) });
    return { display:intro, spoken:intro.map(t=>({text:t,lang:lineLang(t)})).concat(lead,[ask]) };
  }
  const t=s.lastTransition?[s.lastTransition]:[];
  return { display:t, spoken:t.map(x=>({text:x,lang:lineLang(x)})).concat(lead,[ask]) };
}
function qProgress(s){
  const L=LENGTHS[s.length], denom = s.length==="deep" ? L.min : s.questionTarget;
  return { n:s.currentQuestion+1, total: s.length==="deep" ? `${L.min}–${L.max}` : s.questionTarget, pct:Math.min(100, Math.round(s.answers.length/denom*100)) };
}
function renderInterview(s){
  const q=currentQ(s), T=TYPES[s.interviewType], plan=speechPlan(s), pr=qProgress(s);
  const fu=s.phase==="followup" && s.pending ? s.pending.followUp : null;
  const voice = s.mode==="voice", listen = voice && Speech.sttAvailable, talk = voice && Speech.ttsAvailable;
  const t=s.adaptive.target, st=Speech.settings;
  V.state = listen ? "idle" : "typing"; V.text=""; V.interim=""; V.ansElapsed=0; V.answerLang = q.lang==="fr"?"fr":"en";
  if(V.rec){ V.rec.stop(); V.rec=null; } Mic.close();
  el.innerHTML=`
  <div class="card interview">
    <div class="row between center small muted wrapw"><span><b>${H(s.profession.title)}</b> · ${H(T.label)} · ${H(LEVELS[s.experienceLevel].label)}</span><span class="timer" id="timer" aria-label="Time on this question">0:00</span></div>
    <div class="progress" style="margin:10px 0 4px" role="progressbar" aria-label="Interview progress" aria-valuenow="${pr.pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pr.pct}%"></i></div>
    <div class="row between wrapw small faint"><span id="qcount">Question ${pr.n} / ${pr.total}</span><span>${s.difficulty==="adaptive"?`Adaptive depth <span title="Current depth ${t} of 3">${"●".repeat(t)}${"○".repeat(3-t)}</span>`:H(DIFFS[s.difficulty].label)} · ${voice?"Voice":"Text"} mode</span></div>
    <div class="stage">
      <div class="orb" id="orb" aria-hidden="true"><span class="face">${H(ALEX.avatar||"A")}</span></div>
      <div class="eq" id="eq" style="visibility:hidden" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
      <div class="alexname" style="font-size:15px;margin-top:4px">ALEX</div><div class="alextitle">${ALEX.title}</div>
      <div class="status" id="status" role="status" style="margin-top:8px">&nbsp;</div>
      ${Speech.ttsAvailable?`<div class="alexctl noprint" role="group" aria-label="Alex voice controls">
        <button class="btn sm ghost" onclick="repeatQ()">🔁 Replay question</button>
        <button class="btn sm ghost" id="muteBtn" onclick="toggleMute()" aria-pressed="${st.muted}">${st.muted?"🔈 Unmute Alex":"🔇 Mute Alex"}</button>
        <label class="small muted">Speed <select id="rateSel" onchange="setRate(this.value)" aria-label="Playback speed">${[0.8,1,1.2,1.5].map(r=>`<option value="${r}" ${st.rate==r?"selected":""}>${r}×</option>`).join("")}</select></label>
      </div>`:""}
    </div>
    ${plan.display.length>2 && window.innerWidth<=600
      ? `<details class="alexsay introfold"><summary><span class="who" style="display:inline">${H(ALEX.name)}</span> · ${H(plan.display[0])} <span class="faint small">(show full introduction)</span></summary>${plan.display.slice(1).map(l=>`<p>${H(l)}</p>`).join("")}</details>`
      : plan.display.length?`<div class="alexsay"><span class="who">${H(ALEX.name)}</span>${plan.display.map(l=>`<p>${H(l)}</p>`).join("")}</div>`:""}
    <div class="qbox">
      <div class="qmeta">Alex asks · ${H(QTYPE_LABEL[q.questionType]||"Question")} · ${H(q.compLabel)}${q.lang==="fr"?" · En français":q.lang==="x"?" · English or French":""}</div>
      ${renderArtifact(q.artifact)}
      ${q.scenario?`<div class="scenario ${q.code?"code":""}">${H(q.scenario)}</div>`:""}
      <div class="qtext" lang="${q.lang==="fr"?"fr":"en"}">${H(q.questionText)}</div>
      ${fu?`<div class="followup"><span class="lbl">Follow-up · ${H(fu.label||"")}</span>${H(fu.question)}</div>`:""}
    </div>
    <div id="answerArea"></div>
    <div class="row between wrapw" style="margin-top:18px;gap:10px">
      <button class="btn ghost" onclick="endInterviewEarly()">End interview</button>
      <button class="btn primary" id="nextBtn" onclick="submitCurrent()">${fu?"Submit follow-up →":"Submit answer →"}</button>
    </div>
    <div class="note">Tip: aim for ${LEVELS[s.experienceLevel].words}–${LEVELS[s.experienceLevel].words+50} words. Structure your answer, explain your reasoning and give a concrete example.${s.healthcare?" All scenarios are fictional; don't include real patient details.":""}</div>
  </div>`;
  renderAnswerArea();
  elapsed=0;
  const token=++renderToken;
  if(talk && !st.muted){
    orbMode("speaking"); setStatus(ALEX.status.speaking);
    Speech.say(plan.spoken).then(()=>{ if(token!==renderToken) return; if(V.state!=="recording"){ orbMode("idle"); setStatus(listen?"Your turn: press “Start answer”":"Your turn: type your answer"); } startTimer(); });
  } else {
    orbMode("idle"); setStatus(listen?"Your turn: press “Start answer”":"Your turn: type your answer"); startTimer();
    const tb=document.getElementById("typeBox"); if(tb && !listen) setTimeout(()=>tb.focus({preventScroll:true}),50);
  }
}

/* Answer area state machine: idle → recording ⇄ paused → review → submit; plus typing, micError, txError. */
function renderAnswerArea(){
  const box=document.getElementById("answerArea"); if(!box) return;
  const s=App.session, q=s&&currentQ(s), cross=q&&q.lang==="x";
  const langPick = cross && Speech.sttAvailable && ["idle","txError"].includes(V.state) ? `<label class="small muted">Answer language <select onchange="V.answerLang=this.value" aria-label="Answer language"><option value="en" ${V.answerLang==="en"?"selected":""}>English</option><option value="fr" ${V.answerLang==="fr"?"selected":""}>Français</option></select></label>` : "";
  const wc=`<span class="small faint" id="wc"></span>`;
  let h="";
  switch(V.state){
    case "idle": h=`<div class="voicebox"><p class="small muted" style="margin:0 0 10px">Speak naturally. You can pause, review the transcript and type corrections before submitting.</p>
      <div class="row wrapw center" style="gap:10px"><button class="btn good" id="micBtn" onclick="startAnswer()">🎙️ Start answer</button><button class="btn ghost" onclick="useTyping()">⌨️ Type instead</button>${langPick}</div></div>`; break;
    case "recording": case "paused": h=`<div class="voicebox ${V.state}">
      <div class="row between center wrapw"><span class="rec ${V.state==="paused"?"paused":""}">${V.state==="paused"?"⏸ Paused":"● Recording"}</span><span class="small muted">Answer time <b id="ansTime">${fmtSecs(V.ansElapsed)}</b></span></div>
      ${Mic.analyser?`<div class="meter" id="ansMeter" aria-hidden="true"><i></i></div>`:`<div class="meter nolevel" id="ansMeter" aria-hidden="true"><i></i></div><div class="small faint">Input level isn't available in this browser; your words still appear in the transcript.</div>`}
      ${V.showLive?`<div class="transcript ${V.text||V.interim?"":"empty"}" id="transcript" aria-live="polite">${V.text||V.interim?H(V.text)+(V.interim?` <span class="interim">${H(V.interim)}</span>`:""):"Your words will appear here as you speak…"}</div>`:`<div class="small faint" style="margin:8px 0">Live transcript hidden.</div>`}
      <div class="row wrapw" style="gap:10px;margin-top:12px">
        ${V.state==="recording"?`<button class="btn" onclick="pauseAnswer()">⏸ Pause</button>`:`<button class="btn" onclick="resumeAnswer()">▶ Resume</button>`}
        <button class="btn good" id="finishBtn" onclick="finishAnswer()">✓ Finish answer</button>
        <button class="btn ghost sm" onclick="toggleLive()">${V.showLive?"Hide live transcript":"Show live transcript"}</button>
      </div></div>`; break;
    case "review": h=`<div class="voicebox"><label class="fld" for="typeBox">Your transcript (type a correction if needed)</label>
      <textarea id="typeBox" aria-label="Your answer">${H(V.text)}</textarea>
      <div class="row wrapw center" style="gap:10px;margin-top:10px"><button class="btn primary" onclick="submitCurrent()">Submit answer</button><button class="btn" onclick="retryAnswer()">↺ Try again</button>${wc}</div></div>`; break;
    case "micError": h=`<div class="voicebox err-box" role="alert"><b>We couldn't access your microphone.</b>
      <p class="small muted">Check that your browser has permission to use the microphone for this site.</p>
      <div class="row wrapw" style="gap:10px"><button class="btn" onclick="startAnswer()">Try again</button><button class="btn primary" onclick="continueWithText()">Continue with text</button></div></div>`; break;
    case "txError": h=`<div class="voicebox err-box" role="alert"><b>We couldn't clearly transcribe that answer.</b>
      <div class="row wrapw center" style="gap:10px;margin-top:10px"><button class="btn" onclick="retryAnswer()">🎙️ Record again</button><button class="btn primary" onclick="useTyping()">⌨️ Type my answer</button>${langPick}</div></div>`; break;
    default: h=`<textarea id="typeBox" placeholder="Type your answer here…" aria-label="Your answer">${H(V.text)}</textarea>
      <div class="row wrapw center" style="margin-top:8px;gap:10px">${s&&s.mode==="voice"&&Speech.sttAvailable?`<button class="btn ghost sm" onclick="V.state='idle';V.text='';renderAnswerArea()">🎙️ Use microphone instead</button>`:""}${wc}</div>`;
  }
  box.innerHTML=h;
  const tb=document.getElementById("typeBox"), w=document.getElementById("wc");
  if(tb && w){ const upd=()=>{ const n=words(tb.value).length; w.textContent=n?`${n} words`:""; }; tb.addEventListener("input", upd); upd(); }
  if((V.state==="recording"||V.state==="paused") && Mic.analyser) Mic.meter("#ansMeter");
}
function fmtSecs(n){ return `${Math.floor(n/60)}:${String(n%60).padStart(2,"0")}`; }
function setStatus(t){ const s=document.getElementById("status"); if(s) s.textContent=t; }
function orbMode(m){
  const orb=document.getElementById("orb"), eq=document.getElementById("eq"); if(!orb) return;
  orb.classList.remove("speaking","listening","reviewing"); if(eq) eq.style.visibility="hidden";
  if(m==="speaking"||m==="reviewing") orb.classList.add(m);
  if(m==="listening"){ orb.classList.add("listening"); if(eq) eq.style.visibility="visible"; }
}
function startTimer(){
  clearInterval(tick);
  const limit=DIFFS[App.session?App.session.difficulty:"medium"].time;
  tick=setInterval(()=>{ elapsed++;
    const t=document.getElementById("timer");
    if(t){ t.textContent=fmtSecs(elapsed); t.className="timer"+(elapsed>limit?" over":elapsed>limit*0.75?" warn":""); }
  },1000);
}

/* Alex controls */
function repeatQ(){
  const s=App.session; if(!s) return; const q=currentQ(s), ql=q.lang==="fr"?"fr":"en";
  const f=s.phase==="followup"&&s.pending?s.pending.followUp:null;
  if(V.state==="recording") pauseAnswer();
  const was=Speech.settings.muted; Speech.settings.muted=false;
  orbMode("speaking"); setStatus(ALEX.status.speaking);
  const token=renderToken;
  Speech.say(f?[{text:f.question,lang:ql}]:[{text:q.questionText,lang:ql}]).then(()=>{ if(token===renderToken && V.state!=="recording"){ orbMode("idle"); setStatus("Your turn"); } });
  Speech.settings.muted=was;
}
function toggleMute(){
  const st=Speech.settings; st.muted=!st.muted; Repo.prefs.set({ voice:{ muted:st.muted, rate:st.rate } });
  if(st.muted){ Speech.stop(); orbMode("idle"); setStatus("Alex is muted: questions stay on screen"); }
  const b=document.getElementById("muteBtn"); if(b){ b.textContent=st.muted?"🔈 Unmute Alex":"🔇 Mute Alex"; b.setAttribute("aria-pressed", st.muted); }
}
function setRate(v){ Speech.settings.rate=+v||1; Repo.prefs.set({ voice:{ muted:Speech.settings.muted, rate:Speech.settings.rate } }); }

/* Voice answering */
function startAnswer(){
  const s=App.session; if(!s || !Speech.SR){ useTyping(); return; }
  Speech.stop(); if(!tick) startTimer();
  const q=currentQ(s), lang = q.lang==="fr" ? "fr-FR" : q.lang==="x" ? (V.answerLang==="fr"?"fr-FR":"en-US") : "en-US";
  V.text=""; V.interim=""; V.ansElapsed=0;
  V.rec=createRecognizer(lang,{
    onUpdate:(f,i)=>{ V.text=f; V.interim=i; const tr=document.getElementById("transcript");
      if(tr){ tr.classList.toggle("empty", !(f||i)); tr.innerHTML=(f||i)?H(f)+(i?` <span class="interim">${H(i)}</span>`:""):"Your words will appear here as you speak…"; } },
    onError:k=>{ if(k==="mic"){ stopRecording(); V.state="micError"; renderAnswerArea(); setStatus("Microphone unavailable"); orbMode("idle"); } },
  });
  V.rec.start(); V.state="recording";
  Mic.open().catch(()=>{}).then(()=>{ if(V.state==="recording"||V.state==="paused") renderAnswerArea(); });
  orbMode("listening"); setStatus(ALEX.status.listening);
  clearInterval(ansTick); ansTick=setInterval(()=>{ if(V.state==="recording"){ V.ansElapsed++; const a=document.getElementById("ansTime"); if(a) a.textContent=fmtSecs(V.ansElapsed); } },1000);
  renderAnswerArea();
}
function pauseAnswer(){ if(V.rec) V.rec.pause(); V.text=V.rec?V.rec.text:V.text; V.interim=""; V.state="paused"; orbMode("idle"); setStatus("Answer paused"); renderAnswerArea(); }
function resumeAnswer(){ if(V.rec) V.rec.start(); V.state="recording"; orbMode("listening"); setStatus(ALEX.status.listening); renderAnswerArea(); }
function stopRecording(){ if(V.rec){ V.text=V.rec.text; V.rec.stop(); V.rec=null; } V.interim=""; clearInterval(ansTick); Mic.close(); }
function finishAnswer(){
  stopRecording(); orbMode("idle");
  if(words(V.text).length<1){ V.state="txError"; setStatus("No clear transcript"); }
  else { V.state="review"; setStatus("Review your transcript, then submit"); }
  renderAnswerArea();
}
function retryAnswer(){ stopRecording(); V.text=""; V.state="idle"; renderAnswerArea(); startAnswer(); }
function useTyping(){ stopRecording(); V.state="typing"; renderAnswerArea(); orbMode("idle"); setStatus("Your turn: type your answer"); const tb=document.getElementById("typeBox"); if(tb) tb.focus(); }
function continueWithText(){ const s=App.session; if(s){ s.mode="text"; Repo.sessions.save(s); } useTyping(); }
function toggleLive(){ V.showLive=!V.showLive; renderAnswerArea(); }
function currentAnswerText(){
  const tb=document.getElementById("typeBox");
  if(tb) return tb.value.trim();
  return (V.rec ? V.rec.text : (V.text+" "+V.interim)).trim();
}
function submitCurrent(){
  const s=App.session; if(!s) return;
  if(V.state==="recording"||V.state==="paused"){ stopRecording(); }
  const ans=currentAnswerText();
  if(words(ans).length<3){
    if(V.state==="recording"||V.state==="paused"){ V.state="txError"; renderAnswerArea(); }
    setStatus("Please give a fuller answer before submitting");
    const nb=document.getElementById("nextBtn"); if(nb){ nb.classList.add("danger"); setTimeout(()=>nb.classList.remove("danger"),1200); } return;
  }
  Speech.stop(); clearInterval(tick); tick=null;
  document.querySelectorAll(".interview button").forEach(b=>b.disabled=true);
  orbMode("reviewing"); setStatus(ALEX.status.reviewing);
  const token=++renderToken, secs=elapsed;
  setTimeout(()=>{
    if(token!==renderToken) return;
    let res;
    try{ res=submitAnswer(s, ans, secs); }
    catch(e){ console.error(e); engineError(s, ans, e); return; }
    if(res.kind==="done"){ finishToReport(s); return; }
    renderInterview(s);
    window.scrollTo({top:0,behavior:"smooth"});
  }, 600);
}
function finishToReport(s){
  Repo.prefs.set({ activeSessionId:null });
  App.closing={ id:s.sessionId, text:ALEX.closing(s.candidate.name), speak:s.mode==="voice" && Speech.ttsAvailable && !Speech.settings.muted };
  App.session=null;
  el.innerHTML=`<div class="card empty" id="preparing" role="status"><div class="orb reviewing" style="margin:0 auto 14px" aria-hidden="true"><span class="face">${H(ALEX.avatar||"A")}</span></div><h2>Preparing your interview report…</h2><p class="muted">${H(ALEX.name)} is scoring each answer against the rubric.</p></div>`;
  const from=location.hash;
  setTimeout(()=>{ if(location.hash===from && document.getElementById("preparing")) go("results/"+s.sessionId); }, 450);   // never yank the user back if they navigated away
}
/* "AI unavailable": the in-browser engine failed on this answer. The answer text is kept so nothing is lost. */
function engineError(s, ans, e){
  orbMode("idle"); setStatus("");
  const box=document.getElementById("answerArea"); document.querySelectorAll(".interview button").forEach(b=>b.disabled=false);
  if(box) box.innerHTML=`<div class="voicebox err-box" role="alert"><b>${H(ALEX.name)} couldn't prepare the next question.</b>
    <p class="small muted">Your answer is kept below. Try again, or end the interview and get a report for the questions you've answered.</p>
    <textarea id="typeBox" aria-label="Your answer">${H(ans)}</textarea>
    <div class="row wrapw" style="gap:10px;margin-top:10px"><button class="btn primary" onclick="V.state='typing';submitCurrent()">Try again</button><button class="btn" onclick="salvageSession()">End and see report</button></div></div>`;
}
function salvageSession(){ const s=App.session||activeSession(); if(!s){ go("interview/history"); return; } leaveInterview(); try{ endSessionEarly(s); }catch(e){ s.status="abandoned"; Repo.sessions.save(s); } App.session=s; finishToReport(s); }
function discardSession(){ const s=App.session||activeSession(); if(s){ Repo.sessions.remove(s.sessionId); } Repo.prefs.set({ activeSessionId:null }); App.session=null; go("interview/start"); }
function endInterviewEarly(){
  const s=App.session; if(!s) return;
  const has=s.answers.length || (s.pending && s.pending.answer);
  if(!has){
    if(!confirm("End this interview? Nothing has been answered yet, so no report will be created.")) return;
    leaveInterview(); completeSession(s,"abandoned"); Repo.prefs.set({ activeSessionId:null }); App.session=null; go("interview"); return;
  }
  if(!confirm("End the interview now and see your report for the questions you've answered?")) return;
  leaveInterview(); endSessionEarly(s); finishToReport(s);
}
function leaveInterview(){ stopRecording(); Speech.stop(); clearInterval(tick); tick=null; renderToken++; V.state="idle"; }
