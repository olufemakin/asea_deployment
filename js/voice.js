/* =============================================================================
   Voice helpers — microphone level meter and speech recognition wrapper.

   Privacy: raw audio is never recorded or stored. The microphone stream is used
   only for a live input-level meter and is released as soon as it isn't needed;
   speech recognition returns text, and only that text (the transcript) is saved.
   ========================================================================== */
"use strict";

const Mic = {
  stream:null, ctx:null, analyser:null, data:null, raf:null,
  supported(){ return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); },
  async open(){
    if(this.stream) return this.stream;
    if(!this.supported()){ const e=new Error("unsupported"); e.code="unsupported"; throw e; }
    try{ this.stream=await navigator.mediaDevices.getUserMedia({ audio:{ echoCancellation:true, noiseSuppression:true } }); }
    catch(err){ const e=new Error(err&&err.name||"denied"); e.code = /NotFound|DevicesNotFound/i.test(err&&err.name) ? "nodevice" : "denied"; throw e; }
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      if(AC){ this.ctx=new AC(); const src=this.ctx.createMediaStreamSource(this.stream);
        this.analyser=this.ctx.createAnalyser(); this.analyser.fftSize=512; src.connect(this.analyser);
        this.data=new Uint8Array(this.analyser.fftSize); }
    }catch(e){ this.analyser=null; }
    return this.stream;
  },
  deviceLabel(){ const t=this.stream && this.stream.getAudioTracks()[0]; return t ? (t.label||"Microphone") : ""; },
  level(){
    if(!this.analyser) return 0;
    this.analyser.getByteTimeDomainData(this.data);
    let sum=0; for(let i=0;i<this.data.length;i++){ const v=(this.data[i]-128)/128; sum+=v*v; }
    return Math.min(1, Math.sqrt(sum/this.data.length)*4);
  },
  /* Drive one or more meter elements (their --lvl CSS variable). */
  meter(selector){
    cancelAnimationFrame(this.raf);
    const tick=()=>{ const lv=this.level(); document.querySelectorAll(selector).forEach(n=>n.style.setProperty("--lvl", lv.toFixed(3)));
      if(document.querySelector(selector)) this.raf=requestAnimationFrame(tick); };
    tick();
  },
  close(){
    cancelAnimationFrame(this.raf); this.raf=null;
    if(this.stream){ this.stream.getTracks().forEach(t=>{ try{ t.stop(); }catch(e){} }); }
    if(this.ctx){ try{ this.ctx.close(); }catch(e){} }
    this.stream=null; this.ctx=null; this.analyser=null;
  },
};

/* Continuous recognition with pause/resume. Callbacks: onUpdate(final, interim), onError(kind), onStop(). */
function createRecognizer(lang, cb){
  if(!Speech.SR) return null;
  let rec=null, active=false, finalText="", interim="";
  function make(){
    rec=new Speech.SR(); rec.lang=lang||"en-US"; rec.continuous=true; rec.interimResults=true;
    rec.onresult=e=>{ interim="";
      for(let i=e.resultIndex;i<e.results.length;i++){ const r=e.results[i];
        if(r.isFinal) finalText+=(finalText?" ":"")+String(r[0].transcript||"").trim(); else interim+=r[0].transcript; }
      cb.onUpdate && cb.onUpdate(finalText, interim); };
    rec.onerror=e=>{
      const k = /not-allowed|service-not-allowed|audio-capture/.test(e.error) ? "mic" : e.error==="no-speech" ? "nospeech" : e.error==="aborted" ? null : "transcribe";
      if(k==="mic"){ active=false; }
      if(k) cb.onError && cb.onError(k, e.error);
    };
    rec.onend=()=>{ if(active){ try{ rec.start(); }catch(e){} } else { cb.onStop && cb.onStop(); } };
  }
  return {
    start(){ if(active) return; finalText=finalText||""; make(); active=true; try{ rec.start(); }catch(e){} },
    pause(){ if(!active) return; active=false; if(interim){ finalText+=(finalText?" ":"")+interim.trim(); interim=""; } try{ rec.stop(); }catch(e){} },
    stop(){ this.pause(); },
    reset(){ this.pause(); finalText=""; interim=""; },
    get text(){ return (finalText+" "+interim).trim(); },
    get active(){ return active; },
  };
}
