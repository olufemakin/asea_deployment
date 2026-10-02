/* Browser regression suite for Interview IQ (Playwright + Chromium).
 *
 *   python3 -m http.server 4555 &          # from the repo root
 *   node tests/regression.mjs              # BASE_URL defaults to http://localhost:4555/
 *
 * Playwright is resolved from PLAYWRIGHT_MODULE, then the local/global "playwright" package.
 * CHROMIUM_PATH can point at a specific Chromium binary. Voice flows use a fake microphone
 * (Chromium flags) plus mocked SpeechRecognition / speechSynthesis.
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
let pw;
try { pw = await import(process.env.PLAYWRIGHT_MODULE || "playwright"); }
catch { const { execSync } = await import("child_process"); pw = require(execSync("npm root -g").toString().trim() + "/playwright"); }
const { chromium } = pw.default || pw;

const BASE = process.env.BASE_URL || "http://localhost:4555/";
const results = []; let failed = 0;
function check(name, ok, detail = "") { results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) failed++; }
async function section(name, fn) { try { await fn(); } catch (e) { check(`${name} (section crashed)`, false, String(e.message).split("\n")[0]); } }

const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"] });
async function newPage(viewport = { width: 1280, height: 900 }, init, initArg) {
  const ctx = await browser.newContext({ viewport, permissions: ["microphone"] });
  if (init) await ctx.addInitScript(init, initArg);
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", e => page.errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/favicon/.test(m.text())) page.errors.push(m.text()); });
  page.on("dialog", d => d.accept());
  return page;
}
const appText = p => p.$eval("#app", n => n.innerText.replace(/\s+/g, " "));
/* Mock speech: SpeechRecognition emits one transcript per start(); speechSynthesis records what Alex says. */
function voiceMocks(opt) {
  window.__spoken = [];
  window.__sr = Object.assign({ mode: "ok", text: "My name is Tolu, and I'm ready to begin." }, opt || {});
  class FakeSR {
    start() { if (this._fired) return; this._fired = true; const m = window.__sr.mode;
      this._t = setTimeout(() => {
        if (m === "denied") { this.onerror && this.onerror({ error: "not-allowed" }); this.onend && this.onend(); return; }
        if (m === "empty") return;
        const r = [{ transcript: window.__sr.text }]; r.isFinal = true;
        this.onresult && this.onresult({ resultIndex: 0, results: [r] });
      }, 120); }
    stop() { clearTimeout(this._t); setTimeout(() => this.onend && this.onend(), 5); }
    abort() { this.stop(); }
  }
  window.SpeechRecognition = FakeSR; window.webkitSpeechRecognition = FakeSR;
  const synth = { speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 15); }, cancel() {}, getVoices() { return []; }, onvoiceschanged: null };
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
}
const goodAnswer = "First, I would identify the risk and its likelihood and impact, assign an owner and a mitigation, because unmanaged risk becomes schedule slip. For example, in my last project a vendor delay threatened our critical path by 5 days; therefore I escalated to stakeholders, agreed a contingency and tracked it in the risk register until it closed. As a result we delivered on time.";
/* Answer typed questions until the report appears. */
async function answerUntilDone(p, answerFor) {
  for (let g = 0; g < 45; g++) {
    if (await p.$(".ring") && /interview report/i.test(await appText(p))) return true;
    await p.waitForSelector("#typeBox", { timeout: 8000 });
    await p.fill("#typeBox", answerFor ? answerFor(g, await p.innerText(".qbox")) : goodAnswer);
    const before = await p.$eval("#app", n => n.innerText.length + "|" + (document.getElementById("qcount") || {}).textContent + "|" + !!document.querySelector(".followup"));
    await p.click("#nextBtn");
    await p.waitForFunction(b => document.querySelector(".ring") || ((document.querySelector("#nextBtn") && !document.querySelector("#nextBtn").disabled) &&
      (document.querySelector("#app").innerText.length + "|" + (document.getElementById("qcount") || {}).textContent + "|" + !!document.querySelector(".followup")) !== b), before, { timeout: 8000 });
  }
  return !!(await p.$(".ring"));
}
async function setupInterview(p, { search, pick, mode = "TEXT", type, level, length = "STANDARD", name, balance }) {
  await p.goto(BASE + "#/interview/start"); await p.waitForSelector("#stepper");
  await p.click(".step >> text=Profession"); await p.waitForSelector("#profSearch");
  await p.fill("#profSearch", search); await p.click(`#profList .pchip:text-is("${pick}")`);
  await p.click("text=Continue →"); await p.click(`.opt:has-text("${mode}")`); await p.click("text=Continue →");
  if (type) await p.click(`.opt:has-text("${type}")`);
  if (balance) await p.click(`#langBalance .opt:has-text("${balance}")`);
  await p.click("text=Continue →");
  if (level) await p.click(`.opt:has-text("${level}")`);
  await p.click("text=Continue →"); await p.click('.opt:has-text("Adaptive")'); await p.click("text=Continue →");
  await p.click(`.opt:has-text("${length}")`); await p.click("text=Review summary →");
  if (name) await p.fill("#candName", name);
  await p.click("text=Start interview with Alex");
}

/* =================== PROMPT 1 REGRESSION =================== */
const p = await newPage();
await section("Home + navigation", async () => {
  await p.goto(BASE); await p.waitForSelector(".hero");
  const home = await appText(p);
  check("App launches and home renders", /PRACTICE REALISTIC AI-LED INTERVIEWS/i.test(home) && /START INTERVIEW/i.test(home) && /PRACTICE AI TASKS/i.test(home));
  check("Home shows BSP AI WorkReady + Interview IQ hierarchy", /BSP AI WorkReady/i.test(home) && /Interview IQ/i.test(home));
  check("Home lists the six features", ["Voice Interviews","Text Interviews","Domain Expert Interviews","AI Evaluation Interviews","Adaptive Follow-Ups","Detailed Feedback"].every(f => home.includes(f)));
  const hrefs = await p.$$eval("#mainNav a[href]", as => as.map(a => a.getAttribute("href")));
  check("Navigation has all 13 destinations", hrefs.length === 13, hrefs.join(" "));
  for (const h of hrefs) { await p.goto(BASE + h); await p.waitForTimeout(80); const t = (await appText(p)).trim(); check(`Nav ${h} renders`, t.length > 40 && !/Something went wrong/.test(t)); }
  await p.goto(BASE + "#/");
  await p.click('.dd[data-nav="interview"] .ddbtn');
  check("Interview dropdown opens on click", await p.isVisible('.dd[data-nav="interview"] .ddmenu'));
  await p.click('.dd[data-nav="interview"] .ddmenu a[href="#/interview/alex"]'); await p.waitForTimeout(80);
  check("Dropdown link navigates (Interview With Alex)", /Meet Alex/.test(await appText(p)));
  check("Alex identity shown", /ALEX/.test(await appText(p)) && /BSP AI Interviewer/.test(await appText(p)));
  await p.goto(BASE + "#/does-not-exist"); await p.waitForTimeout(80);
  check("Unknown route falls back to home (no blank screen)", /PRACTICE REALISTIC/i.test(await appText(p)));
});
await section("Profession library + custom profession", async () => {
  await p.goto(BASE + "#/interview/start"); await p.waitForSelector("#profSearch");
  const total = await p.$$eval("#profList .pchip", n => n.length);
  check("At least 30 professions available", total >= 30, `${total} professions`);
  check("Search placeholder text", (await p.getAttribute("#profSearch", "placeholder")) === "Search nurse, accountant, teacher, engineer...");
  await p.fill("#profSearch", "nurse");
  const nurse = await p.$$eval("#profList .pchip", n => n.map(x => x.textContent));
  check("Search 'nurse' finds nursing roles", nurse.some(t => /Registered Nurse/.test(t)) && nurse.some(t => /Nurse Practitioner/.test(t)));
  await p.fill("#profSearch", "zzzz-nothing");
  check("Empty search offers custom profession", /add it below as a custom profession/i.test(await p.innerText("#profList")));
  await p.fill("#profSearch", "");
  check("Continue disabled until a profession is chosen", await p.isDisabled(".wizfoot .btn.primary"));
  await p.click("text=Add My Profession"); await p.click("text=Create my interview profile");
  check("Custom profession validates required fields", /job title/i.test(await p.innerText("#cpErr")));
  await p.fill("#cpTitle", "Veterinary Technician"); await p.fill("#cpIndustry", "Animal health");
  await p.fill("#cpResp", "Monitoring anaesthesia, Preparing surgical equipment, Client education");
  await p.click("text=Create my interview profile"); await p.waitForTimeout(80);
  check("Custom profession created and selected", /Selected: Veterinary Technician/.test(await appText(p)));
  check("Custom profession listed under My Professions", /My Professions/i.test(await p.innerText("#profList")));
  await p.fill("#profSearch", "janitor"); await p.click('#profList .pchip:has-text("Janitor")');
  await p.click("text=Continue →"); await p.click("text=Continue →");
  const domainDisabled = await p.$eval('.opt:has-text("DOMAIN EXPERT INTERVIEW")', b => b.disabled);
  check("Transferable role: domain types disabled, no invented AI job", domainDisabled && /No profession-specific AI job is invented/.test(await appText(p)));
});
let firstSessionId = null;
await section("Setup flow + text interview", async () => {
  await p.click(".step >> text=Profession");
  await p.fill("#profSearch", "project manager"); await p.click('#profList .pchip:text-is("Project Manager")');
  await p.click("text=Continue →");
  await p.click('.opt:has-text("TEXT")'); check("Mode selection works", await p.$eval('.opt:has-text("TEXT")', b => b.classList.contains("sel")));
  await p.click("text=Continue →");
  await p.click('.opt:has-text("AI DOMAIN EXPERT INTERVIEW")'); check("Interview type selection works", await p.$eval('.opt:has-text("AI DOMAIN EXPERT INTERVIEW")', b => b.classList.contains("sel")));
  await p.click("text=Continue →");
  await p.click('.opt:has-text("Experienced")'); check("Experience selection works", await p.$eval('.opt:has-text("Experienced")', b => b.classList.contains("sel")));
  await p.click("text=Continue →");
  check("Adaptive difficulty is recommended", /Adaptive\s*Recommended|Recommended\s*Adaptive/i.test(await appText(p)));
  await p.click('.opt:has-text("Adaptive")'); check("Difficulty selection works", await p.$eval('.opt:has-text("Adaptive")', b => b.classList.contains("sel")));
  await p.click("text=Continue →");
  await p.click('.opt:has-text("QUICK")'); check("Length selection works", await p.$eval('.opt:has-text("QUICK")', b => b.classList.contains("sel")));
  await p.click('.opt:has-text("STANDARD")'); await p.click("text=Review summary →");
  const sum = await appText(p);
  check("Setup summary is correct", /YOUR INTERVIEW/i.test(sum) && /Profession Project Manager/.test(sum) && /Interviewer Alex/.test(sum) && /Mode Text/.test(sum)
    && /Interview AI Domain Expert/.test(sum) && /Experience Experienced/.test(sum) && /Difficulty Adaptive/.test(sum) && /Questions 10/.test(sum));
  await p.fill("#candName", "Tolu"); await p.click("text=Start interview with Alex"); await p.waitForSelector(".qbox");
  const sess = await p.evaluate(() => App.session);
  const keys = ["sessionId","profession","interviewType","mode","experienceLevel","difficulty","questionTarget","currentQuestion","answers","followUps","startedAt","completedAt","status","scores","feedback"];
  check("Starting interview creates a valid session", keys.every(k => k in sess) && sess.status === "in_progress" && sess.questionTarget === 10);
  firstSessionId = sess.sessionId;
  const intro = await p.innerText(".alexsay");
  check("Alex introduction (personalised + profession-specific)", /Hi Tolu, I'm Alex, your AI interviewer from BSP AI WorkReady/.test(intro) && /Today we'll be completing a Project Manager AI Domain Expert Interview/.test(intro));
  check("Alex asks one question at a time", (await p.$$(".qbox .qtext")).length === 1);
  // Memory: intro mentions a vendor delay; later Alex should call back to it.
  const seen = [];
  const done = await answerUntilDone(p, (g, q) => { seen.push(q); return g === 0 ? "I managed a software implementation where a vendor caused a major delay. I led a team of eight, reported to the steering committee, and because the budget was at risk I agreed a recovery plan with the sponsor; for example we re-sequenced testing and cut two low-value features." : goodAnswer; });
  check("Text interview completes and report renders", done && /Question-by-question feedback/.test(await appText(p)));
  check("Alex remembers prior answers (memory callback)", seen.some(q => /You mentioned that you managed a software implementation where a vendor caused a major delay/.test(q)), "");
  check("Practical task exhibit shown (risk register / status report)", seen.some(q => /RISK REGISTER|AI-GENERATED WEEKLY STATUS REPORT/i.test(q)));
  const rep = await appText(p);
  check("Alex closes the interview", /That concludes today's interview/.test(rep));
  const doneS = await p.evaluate(id => Repo.sessions.get(id), firstSessionId);
  check("Session completed with scores, areas and feedback", doneS.status === "completed" && doneS.answers.length === 10 && doneS.scores.areas && Object.keys(doneS.scores.competencies).length >= 3);
  check("Interview flow: background → … → final", doneS.answers[0].questionType === "intro" && doneS.answers[9].questionType === "final");
  check("Report shows weighted interview areas", /Interview areas/i.test(rep) && /Domain Expertise/.test(rep) && /AI Evaluation/.test(rep) && /Communication/.test(rep));
  check("Report states accent is never scored", /Accent, voice pitch, regional speech patterns, gender presentation and perceived ethnicity are never scored/.test(rep));
  check("Alex stays neutral (no 'Great answer/Perfect/Excellent')", !/great answer|perfect!|excellent!/i.test(rep));
});
await section("Adaptive follow-up", async () => {
  await setupInterview(p, { search: "accountant", pick: "Accountant", type: "AI DOMAIN EXPERT INTERVIEW", level: "Experienced" });
  await p.waitForSelector("#typeBox"); await p.fill("#typeBox", "I check things."); await p.click("#nextBtn");
  await p.waitForSelector(".followup", { timeout: 6000 });
  const fu = await p.innerText(".followup");
  check("Short answer triggers a clarification follow-up", /Follow-up · Clarification/i.test(fu) && /explain what you mean/i.test(fu), fu);
  check("Status shows 'reviewing', never 'thinking'", !/thinking/i.test(await p.innerText("body")));
  await p.reload(); await p.waitForSelector(".qbox");
  const resumed = await p.evaluate(() => ({ st: App.session.status, ph: App.session.phase }));
  check("In-progress interview survives a page reload (follow-up kept)", resumed.st === "in_progress" && resumed.ph === "followup", JSON.stringify(resumed));
  await p.click("text=End interview"); await p.waitForTimeout(150);
  check("End interview early still produces a report", /interview report/i.test(await appText(p)));
});
await section("Healthcare + bilingual", async () => {
  await setupInterview(p, { search: "registered nurse", pick: "Registered Nurse", type: "AI DOMAIN EXPERT INTERVIEW" });
  await p.waitForSelector(".alexsay");
  check("Healthcare interview states scenarios are fictional", /fictional and for education only/.test(await p.innerText(".alexsay")));
  await p.click("text=End interview"); await p.waitForTimeout(100);
  await p.goto(BASE + "#/interview/start"); await p.click(".step >> text=Profession");
  await p.fill("#profSearch", "french"); await p.click('#profList .pchip:has-text("Bilingual Evaluator")');
  await p.click("text=Continue →"); await p.click('.opt:has-text("TEXT")'); await p.click("text=Continue →");
  check("Bilingual interview offers language balance", /Language balance/i.test(await appText(p)) && /Mostly English/.test(await appText(p)) && /Mostly French/.test(await appText(p)));
  await p.click('#langBalance .opt:has-text("Balanced")'); await p.click(".step >> text=Summary");
  check("Summary shows language balance", /Language balance Balanced/.test(await appText(p)));
  await p.click("text=Start interview with Alex"); await p.waitForSelector(".qbox");
  const qs = [];
  await answerUntilDone(p, (g, q) => { qs.push(q); return /En français/.test(q) ? "Je pense que le registre est important parce que le client attend un ton formel, par exemple avec le vouvoiement, donc je vérifie le sens et le contexte avant d'envoyer." : goodAnswer; });
  check("Alex switches into French", qs.some(q => /En français/.test(q)) && qs.some(q => /English or French/.test(q)));
  const rep = await appText(p);
  check("Bilingual report has English/French areas and no fluency label", /English/.test(rep) && /French/.test(rep) && /does not label you as native, fluent or a certified translator/.test(rep));
});
await section("Results, history, migration", async () => {
  for (const [h, re] of [["#/progress", /Interview-ready|Nearly ready|Building foundations/], ["#/progress/skills", /Competencies/i], ["#/progress/activity", /Report/], ["#/results", /All reports/], ["#/interview/history", /Report/]]) {
    await p.goto(BASE + h); await p.waitForTimeout(60); check(`${h} shows data`, re.test(await appText(p)));
  }
  const m = await newPage(undefined, () => {
    if (!localStorage.getItem("ia_history")) localStorage.setItem("ia_history", JSON.stringify([{ date: "1/2/2026, 10:00:00 AM", candidate: "Ada", domain: "Finance / Accounting", score: 64,
      answers: [{ q: "Old question?", hint: "h", answer: "old answer text here", seconds: 30, score: 64, wc: 3, dims: { Relevance: 60, Depth: 50, Structure: 70, Specificity: 40 }, feedback: ["tip"] }], cfg: { difficulty: "standard", voice: true } }]));
  });
  await m.goto(BASE + "#/results"); await m.waitForTimeout(100);
  check("v1 history migrated into results", /Finance \/ Accounting/.test(await appText(m)));
  await m.click("#app a:has-text('View')"); await m.waitForTimeout(80);
  check("Migrated v1 report opens", /Old question\?/.test(await appText(m)));
  check("No console errors in migration run", m.errors.length === 0, m.errors.slice(0, 3).join(" | "));
});

/* =================== PROMPT 2: VOICE =================== */
await section("Voice: mic check + answer flow", async () => {
  const v = await newPage(undefined, voiceMocks);
  await setupInterview(v, { search: "data analyst", pick: "Data Analyst", mode: "VOICE", type: "AI DOMAIN EXPERT INTERVIEW", name: "Tolu" });
  await v.waitForSelector("#micStatus");
  check("Voice interview starts with MICROPHONE CHECK", /Microphone check/i.test(await appText(v)));
  await v.waitForFunction(() => /Microphone detected/.test(document.getElementById("micStatus").innerText), null, { timeout: 5000 });
  check("Microphone detected + input meter shown", !!(await v.$("#micMeter")));
  check("Sounds Good disabled until a sample is transcribed", await v.isDisabled("#micGood"));
  await v.click("#sampleBtn");
  await v.waitForFunction(() => /We heard/.test(document.getElementById("samplePreview").innerText), null, { timeout: 5000 });
  check("Sample transcription preview shown", /My name is Tolu, and I'm ready to begin/.test(await v.innerText("#samplePreview")));
  check("Mic check offers Sounds Good / Try Again / Use Text Instead", !!(await v.$("text=Sounds good")) && !!(await v.$("text=Try again")) && !!(await v.$("text=Use text instead")));
  await v.click("#micGood"); await v.waitForSelector(".qbox");
  check("Voice UI shows ALEX + BSP AI Interviewer + Question X / N", /ALEX/.test(await appText(v)) && /BSP AI Interviewer/.test(await appText(v)) && /Question 1 \/ 10/.test(await appText(v)));
  check("Alex reads the question aloud (speech output)", (await v.evaluate(() => window.__spoken.join(" "))).includes("I'm Alex"));
  check("Replay / Mute / Speed controls present", !!(await v.$("text=Replay question")) && !!(await v.$("#muteBtn")) && !!(await v.$("#rateSel")));
  await v.click("#muteBtn");
  check("Mute Alex toggles", /Unmute Alex/.test(await v.innerText("#muteBtn")));
  await v.click("#muteBtn");
  await v.selectOption("#rateSel", "1.2");
  check("Playback speed setting saved", (await v.evaluate(() => Repo.prefs.get().voice.rate)) === 1.2);
  await v.evaluate(() => { window.__sr.text = "In my last role I built weekly dashboards in SQL and Python. First I check data quality because duplicates and missing values distort trends; for example I found a 12 percent duplication in a sales feed and fixed the source before reporting."; });
  await v.click("#micBtn"); await v.waitForTimeout(80);
  check("Recording state shows status, elapsed time, Pause and Finish", /Recording/.test(await appText(v)) && /Answer time/.test(await appText(v)) && !!(await v.$("text=Pause")) && !!(await v.$("#finishBtn")));
  check("Status: Alex is listening…", /Alex is listening/i.test(await v.innerText("#status")));
  await v.waitForFunction(() => /dashboards/.test((document.getElementById("transcript") || {}).innerText || ""), null, { timeout: 4000 });
  check("Live transcript shown while recording", true);
  await v.click("text=Hide live transcript");
  check("Live transcript can be hidden", /Live transcript hidden/.test(await appText(v)));
  await v.click("text=Pause"); check("Pause works", /Paused/.test(await appText(v)));
  await v.click("#finishBtn"); await v.waitForSelector("#typeBox");
  check("After recording: transcript shown for review / correction", /dashboards in SQL/.test(await v.inputValue("#typeBox")) && !!(await v.$("text=Try again")));
  await v.fill("#typeBox", (await v.inputValue("#typeBox")) + " Corrected: I also validate totals against the finance ledger.");
  await v.click("#answerArea >> text=Submit answer");
  await v.waitForFunction(() => /reviewing your response/i.test(document.getElementById("status").innerText), null, { timeout: 2000 });
  check("Status: Alex is reviewing your response…", true);
  await v.waitForFunction(() => /Question 2 \/ 10/.test(document.body.innerText) || document.querySelector(".followup"), null, { timeout: 6000 });
  const s = await v.evaluate(() => App.session);
  check("Voice answer (with typed correction) saved as transcript", /Corrected: I also validate/.test(s.answers[0] ? s.answers[0].answer : s.pending.answer));
  check("No raw audio stored (transcript only)", !JSON.stringify(await v.evaluate(() => localStorage)).match(/blob:|audio\/|data:audio/));
  check("Never shows 'Alex is thinking'", !/thinking/i.test(await v.innerText("body")));
  check("No console errors in voice flow", v.errors.length === 0, v.errors.slice(0, 3).join(" | "));
});
await section("Voice failures + text fallback", async () => {
  const d = await newPage(undefined, voiceMocks, { mode: "denied" });
  await setupInterview(d, { search: "software engineer", pick: "Software Engineer", mode: "VOICE" });
  await d.waitForSelector("#micStatus"); await d.click("text=Use text instead"); await d.waitForSelector("#typeBox");
  check("'Use text instead' at mic check switches to text", (await d.evaluate(() => App.session.mode)) === "text");
  await d.evaluate(() => { App.session.mode = "voice"; Repo.sessions.save(App.session); }); await d.reload(); await d.waitForSelector("#micBtn");
  await d.click("#micBtn"); await d.waitForSelector(".err-box");
  check("Mic failure shows 'We couldn't access your microphone.'", /We couldn't access your microphone/.test(await appText(d)) && !!(await d.$("text=Continue with text")));
  await d.click("text=Continue with text"); await d.waitForSelector("#typeBox");
  check("Continue With Text keeps the session going", (await d.evaluate(() => App.session.status)) === "in_progress" && (await d.evaluate(() => App.session.mode)) === "text");
  const e = await newPage(undefined, voiceMocks, { mode: "empty" });
  await setupInterview(e, { search: "software engineer", pick: "Software Engineer", mode: "VOICE" });
  await e.waitForSelector("#micStatus"); await e.click("text=Use text instead"); await e.waitForSelector(".qbox");
  await e.evaluate(() => { App.session.mode = "voice"; Repo.sessions.save(App.session); }); await e.reload(); await e.waitForSelector("#micBtn");
  await e.click("#micBtn"); await e.waitForTimeout(300); await e.click("#finishBtn");
  check("Transcription failure: 'We couldn't clearly transcribe that answer.'", /We couldn't clearly transcribe that answer/.test(await appText(e)) && !!(await e.$("text=Record again")) && !!(await e.$("text=Type my answer")));
  await e.click("text=Type my answer");
  check("Type My Answer fallback works", !!(await e.$("#typeBox")));
  const f = await newPage(undefined, () => { navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("denied", "NotAllowedError")); });
  await f.addInitScript(voiceMocks);
  await setupInterview(f, { search: "teacher", pick: "Secondary School Teacher", mode: "VOICE" });
  await f.waitForFunction(() => /couldn't access your microphone/.test((document.getElementById("micStatus") || {}).innerText || ""), null, { timeout: 5000 });
  check("Mic check handles denied permission gracefully", true);
  const sc = await f.evaluate(() => { const q = { expectedStrongSignals: ["mitigation", "stakeholder"], commonWeakSignals: [] };
    const a = scoreAnswer("First I agree a mitigation with each stakeholder because it matters; for example last year.", q, {});
    const b = scoreAnswer("Um, first I, uh, agree a mitigation with each stakeholder because it matters; uh, for example last year.", q, {}); return [a.score, b.score]; });
  check("Accent/speech pattern not scored: fillers don't change the score", sc[0] === sc[1], sc.join(" vs "));
});

/* =================== PROMPT 2: PRACTICE LAB =================== */
async function answerCurrent(pp, text) {
  const q = await pp.$("#pQuestion");
  const radio = await q.$("input[type=radio]"); if (radio) await radio.check();
  const box = await q.$("input[type=checkbox]"); if (box) await box.check();
  await pp.fill("#pText", text || "This response has a clear issue because the evidence shows it; therefore my rating reflects that.");
}
await section("Practice Lab: setup + runner", async () => {
  const pp = await newPage();
  await pp.goto(BASE + "#/practice"); await pp.waitForSelector(".linkcard");
  const cats = await pp.$$eval(".linkcard .t", n => n.map(x => x.textContent));
  check("All 24 practice categories listed", cats.length === 24, cats.length + "");
  await pp.goto(BASE + "#/practice/setup/response-evaluation"); await pp.waitForSelector("#pDiff");
  const st = await appText(pp);
  check("Setup shows Easy 15 / Medium 20 / Hard 25 minutes, 10 questions each", /EASY 10 Questions · 15 Minutes/.test(st) && /MEDIUM 10 Questions · 20 Minutes/.test(st) && /HARD 10 Questions · 25 Minutes/.test(st));
  check("No 5/15/20 practice-length picker", !/\b(5|15|20) questions\b/i.test(st) && (await pp.$$("#pDiff .opt")).length === 3);
  check("Setup shows competencies tested", /Competencies tested/i.test(st) && /Error Detection/.test(st));
  await pp.click("#startPractice"); await pp.waitForSelector("#pClock");
  check("Session has exactly 10 questions", (await pp.$$(".palette .pnum")).length === 10 && /Question 1 \/ 10/.test(await appText(pp)));
  check("Easy timer starts at 15:00", /^1[45]:\d\d$/.test(await pp.innerText("#pClock")), await pp.innerText("#pClock"));
  await answerCurrent(pp);
  await pp.click("#pNext"); check("Next works", /Question 2 \/ 10/.test(await appText(pp)));
  await pp.click("text=← Previous"); check("Previous works", /Question 1 \/ 10/.test(await appText(pp)));
  await pp.click("#flagBtn"); check("Flag for review works", await pp.$eval(".palette .pnum", b => b.classList.contains("flag")));
  await pp.click(".palette .pnum >> nth=4"); check("Palette jump works", /Question 5 \/ 10/.test(await appText(pp)));
  await answerCurrent(pp, "Second answer with reasoning because the evidence clearly shows the issue in this case.");
  await pp.waitForTimeout(400);
  const clockBefore = await pp.innerText("#pClock");
  await pp.waitForTimeout(1200); await pp.reload(); await pp.waitForSelector("#pClock");
  const saved = await pp.evaluate(() => { const ps = Repo.practiceSessions.all()[0]; return { n: Object.keys(ps.responses).length, flags: ps.flags.length, left: ps.endsAt - Date.now(), dur: ps.durationMs }; });
  check("Autosave: answers + flags survive reload", saved.n >= 2 && saved.flags === 1, JSON.stringify(saved));
  check("Timer not reset by refresh", saved.left < saved.dur - 1000 && (await pp.innerText("#pClock")) <= clockBefore, `${clockBefore} → ${await pp.innerText("#pClock")}`);
  check("Reload returns to the same question", /Question 5 \/ 10/.test(await appText(pp)));
  for (let i = 0; i < 10; i++) { await pp.click(`.palette .pnum >> nth=${i}`); if (i !== 9) await answerCurrent(pp); }
  await pp.click("#pSubmit"); await pp.waitForSelector(".ring");
  const res = await appText(pp);
  check("Manual submit → SESSION COMPLETE results", /SESSION COMPLETE/i.test(res));
  check("Results show difficulty, score, answered, strong, needs improvement, no response, time used, average time",
    ["Difficulty","Questions answered","Strong","Needs improvement","No response","Time used","Avg per question"].every(k => new RegExp(k, "i").test(res)) && /9 \/ 10/.test(res));
  check("Results show competency breakdown + strongest / focus / recommended", /Competency breakdown/i.test(res) && /Strongest skill/.test(res) && /Focus next/.test(res) && /Recommended practice/.test(res));
  const reviews = await pp.$$("details.qresult");
  check("Question review covers all 10 questions", reviews.length === 10);
  await reviews[9].click();
  const r10 = await reviews[9].innerText();
  check("Review: answer, expected outcome, correct, missed, rubric, strong example", /Your answer/.test(r10) && /Expected outcome/.test(r10) && /What was missed/.test(r10) && /Rubric/.test(r10) && /Strong reasoning example/.test(r10) && /No response/.test(r10));
  await pp.goto(BASE + "#/practice/history"); await pp.waitForTimeout(80);
  const hist = await appText(pp);
  check("Practice history: date, category, difficulty, score, 10 questions, time, avg time", /AI Response Evaluation/.test(hist) && /Easy/.test(hist) && /\/100/.test(hist) && /Avg time/i.test(hist) && /\b10\b/.test(hist));
  check("No console errors in practice run", pp.errors.length === 0, pp.errors.slice(0, 3).join(" | "));
});
await section("Practice Lab: timers, auto-submit, formats, progression", async () => {
  const pp = await newPage();
  await pp.goto(BASE + "#/practice/setup/factuality"); await pp.click('#pDiff .opt:has-text("MEDIUM")'); await pp.click("#startPractice"); await pp.waitForSelector("#pClock");
  check("Medium timer starts at 20:00", /^(20:00|19:5\d)$/.test(await pp.innerText("#pClock")), await pp.innerText("#pClock"));
  await answerCurrent(pp);
  await pp.evaluate(() => { const ps = Repo.practiceSessions.all()[0]; ps.endsAt = Date.now() + 1500; Repo.practiceSessions.save(ps); });
  await pp.reload(); await pp.waitForSelector(".ring", { timeout: 6000 });
  const res = await appText(pp);
  check("Timer reaching 00:00 auto-submits", /Time's up/i.test(res) && /SESSION COMPLETE/i.test(res));
  check("Unanswered marked NO RESPONSE after auto-submit", (await pp.evaluate(() => Repo.practiceSessions.all()[0].results.noResponse)) === 9);
  await pp.goto(BASE + "#/practice/setup/coding-evaluation"); await pp.click('#pDiff .opt:has-text("HARD")'); await pp.click("#startPractice"); await pp.waitForSelector("#pClock");
  check("Hard timer starts at 25:00", /^(25:00|24:5\d)$/.test(await pp.innerText("#pClock")), await pp.innerText("#pClock"));
  // formats render
  const fmts = {};
  for (const [cat, sel] of [["preference-ranking", ".dimtbl"], ["image-labelling", ".pimg svg"], ["spreadsheet-evaluation", ".art-table"], ["transcription", "text=Play audio"], ["fact", null]]) {
    if (!sel) continue;
    await pp.goto(BASE + "#/practice/setup/" + cat); await pp.click("#startPractice"); await pp.waitForSelector("#pClock");
    fmts[cat] = !!(await pp.$(sel));
  }
  check("Ranking shows 5-point scale + 6 dimensions", fmts["preference-ranking"] && /A much better/.test(await (async () => { await pp.goto(BASE + "#/practice/setup/preference-ranking"); await pp.click("#startPractice"); await pp.waitForSelector("#pClock"); return appText(pp); })()) && (await pp.$$(".dimtbl tr")).length === 6);
  check("Image labelling renders an image", fmts["image-labelling"]);
  check("Spreadsheet evaluation renders a table", fmts["spreadsheet-evaluation"]);
  check("Transcription offers audio playback", fmts["transcription"]);
  // progression: seed 3 easy sessions ≥80 → Medium recommended (not locked)
  await pp.evaluate(() => { const now = Date.now(); for (let i = 0; i < 3; i++) Repo.practiceSessions.save({ id: "seed" + i, category: "factuality", difficulty: "easy", questions: [], responses: {}, flags: [], timeSpent: {}, status: "submitted", startedAt: now - 1e6 + i, submittedAt: now - 1e6 + i, results: { score: 85, competencies: {}, timeUsedSec: 300, avgSec: 30 } }); });
  await pp.goto(BASE + "#/practice/setup/factuality"); await pp.waitForTimeout(80);
  const t = await appText(pp);
  check("Progression recommends Medium after 3 Easy sessions with 80%+", /MEDIUM\s*10 Questions[^]*Recommended|Recommended\s*MEDIUM/i.test(t) && /3\+ Easy sessions/.test(t));
  check("Difficulty is not locked (Hard selectable)", !(await pp.$eval('#pDiff .opt:has-text("HARD")', b => b.disabled)));
  check("No console errors in practice formats", pp.errors.length === 0, pp.errors.slice(0, 3).join(" | "));
});

/* =================== PROMPT 2: INTEGRATION =================== */
await section("Interview ↔ practice recommendations", async () => {
  const ip = await newPage();
  await ip.goto(BASE); await ip.waitForSelector(".hero");
  const recs = await ip.evaluate(() => {
    Repo.sessions.save({ sessionId: "seed-int", version: 3, profession: { id: "project-manager", title: "Project Manager" }, interviewType: "ai_domain", mode: "text", experienceLevel: "experienced", difficulty: "adaptive", length: "standard",
      weights: { background: 20, domain: 25, reasoning: 20, ai: 20, communication: 15 }, questionTarget: 10, questionRange: [10, 10], currentQuestion: 2, startedAt: Date.now(), completedAt: Date.now(), status: "completed", candidate: {},
      answers: [{ q: "q", questionType: "ai_eval", stage: "ai", compLabel: "AI Project Evaluation", score: 58, communication: 60, dims: { Relevance: 50, Depth: 60, Structure: 60, Specificity: 60 } },
                { q: "q2", questionType: "knowledge", stage: "domain", compLabel: "Risk Management", score: 80, communication: 70, dims: { Relevance: 80, Depth: 80, Structure: 80, Specificity: 80 } }] });
    return getRecommendations();
  });
  check("Weak AI evaluation (58%) → AI Response Evaluation practice, Medium", recs.some(r => r.category === "response-evaluation" && r.difficulty === "medium"), JSON.stringify(recs));
  await ip.goto(BASE + "#/results/seed-int"); await ip.waitForTimeout(80);
  check("Report shows 'AI Response Evaluation Practice · Medium · 10 Questions · 20 Minutes'", /AI Response Evaluation Practice/.test(await appText(ip)) && /Medium · 10 Questions · 20 Minutes/.test(await appText(ip)));
  const voiceRec = await ip.evaluate(() => { const now = Date.now(); for (let i = 0; i < 2; i++) Repo.practiceSessions.save({ id: "strong" + i, category: "factuality", difficulty: "medium", questions: [], responses: {}, flags: [], timeSpent: {}, status: "submitted", startedAt: now + i, submittedAt: now + i, results: { score: 90, competencies: {}, timeUsedSec: 300, avgSec: 30 } }); return getRecommendations(); });
  check("Strong practice + no voice interview → Voice Interview With Alex", voiceRec.some(r => r.kind === "voice"));
  await ip.goto(BASE + "#/progress"); await ip.waitForTimeout(80);
  check("Progress page shows recommendations", /Recommended next/i.test(await appText(ip)) && /Voice Interview With Alex/.test(await appText(ip)));
  await ip.click("text=Start voice interview"); await ip.waitForTimeout(80);
  check("Voice recommendation opens setup in voice mode", (await ip.evaluate(() => App.setup.mode)) === "voice" && /#\/interview\/start/.test(ip.url()));
});

/* =================== MOBILE + NAMING =================== */
await section("Mobile", async () => {
  const mob = await newPage({ width: 390, height: 844 });
  await mob.goto(BASE); await mob.click("#navToggle");
  check("Mobile menu opens", await mob.isVisible('#mainNav a[href="#/interview/start"]'));
  await mob.click('#mainNav a[href="#/interview/start"]'); await mob.waitForSelector("#profSearch");
  check("Mobile setup has no horizontal overflow", (await mob.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0);
  await mob.fill("#profSearch", "accountant"); await mob.click('#profList .pchip:text-is("Accountant")');
  for (let i = 0; i < 5; i++) await mob.click("text=Continue →");
  await mob.click("text=Review summary →"); await mob.click("text=Start interview with Alex");
  await mob.waitForSelector(".qbox, #micStatus");
  check("Mobile interview screen usable (no overflow)", (await mob.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0);
  await mob.goto(BASE + "#/practice/setup/spreadsheet-evaluation"); await mob.click("#startPractice"); await mob.waitForSelector("#pClock");
  check("Mobile practice runner usable (no overflow)", (await mob.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0);
  check("No console errors on mobile", mob.errors.length === 0, mob.errors.slice(0, 3).join(" | "));
});
await section("Naming + errors", async () => {
  let banned = false;
  for (const h of ["#/", "#/interview/alex", "#/about", "#/interview/start", "#/practice"]) { await p.goto(BASE + h); await p.waitForTimeout(50); if (/AI Bot|Virtual Recruiter|Interview Bot|Career Bot|AI Agent/i.test(await p.innerText("body"))) banned = true; }
  check("Alex is never called a bot/recruiter/agent", !banned);
  check("No console errors on desktop run", p.errors.length === 0, p.errors.slice(0, 3).join(" | "));
});

await browser.close();
console.log(results.join("\n"));
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
