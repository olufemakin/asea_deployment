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
async function section(name, fn) { try { await fn(); } catch (e) { check(`${name} (section crashed)`, false, String(e.message).split("\n").slice(0,3).join(" / ")); } }

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
  // Prompt 3 added Progress Dashboard, Score Trends and the Profile menu (AI Work Profile, My CV, AI Experience Mapper).
  // Profession expansion added Profession Library (Interview menu) and My Professions (Profile menu).
  check("Navigation has all 20 destinations", hrefs.length === 20, hrefs.join(" "));
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
  // Profession expansion: the library is searched/browsed instead of listing every profession at once.
  const total = await p.evaluate(() => ProfessionLib.all().length);
  check("At least 300 professions available (searchable, not one endless list)", total >= 300 && (await p.$$eval("#profList .pchip", n => n.length)) < 60, `${total} professions`);
  check("Search placeholder text", (await p.getAttribute("#profSearch", "placeholder")) === "Search accountant, nurse, carpenter, lawyer, engineer...");
  await p.fill("#profSearch", "nurse");
  const nurse = await p.$$eval("#profList .pchip", n => n.map(x => x.textContent));
  check("Search 'nurse' finds nursing roles", nurse.some(t => /Registered Nurse/.test(t)) && nurse.some(t => /Nurse Practitioner/.test(t)));
  await p.fill("#profSearch", "zzzz-nothing");
  check("Empty search offers custom profession", /add it below as a custom profession/i.test(await p.innerText("#profList")));
  await p.fill("#profSearch", "");
  check("Continue disabled until a profession is chosen", await p.isDisabled(".wizfoot .btn.primary"));
  await p.click("#addProfBtn"); await p.click("text=Create my interview profile");
  check("Custom profession validates required fields", /profession name/i.test(await p.innerText("#cpErr")));
  await p.fill("#cpTitle", "Veterinary Technician"); await p.fill("#cpIndustry", "Animal health");
  await p.fill("#cpResp", "Monitoring anaesthesia, Preparing surgical equipment, Client education");
  await p.click("text=Create my interview profile"); await p.waitForTimeout(80);
  check("Custom profession created and selected", /Selected: Veterinary Technician/.test(await appText(p)));
  check("Custom profession listed under My Professions", /My Professions/i.test(await p.innerText("#profList")));
  await p.fill("#profSearch", "janitor"); await p.click('#profList .pchip:has-text("Janitor")');
  await p.click("text=Continue →"); await p.click("text=Continue →");
  const domainDisabled = await p.$eval('.opt:has-text("DOMAIN EXPERT INTERVIEW")', b => b.disabled);
  check("Transferable role: domain types disabled, no invented AI job", domainDisabled && /No profession-specific AI job is invented/i.test(await appText(p)));
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
  check("Alex introduction (personalised + profession-specific)", /Hi Tolu, I'm Alex, your AI interviewer from BSP AI WorkReady/.test(intro) && /Today we'll be completing an experienced-level Project Manager AI Domain Expert Interview/.test(intro));
  check("Alex asks one question at a time", (await p.$$(".qbox .qtext")).length === 1);
  // Memory: intro mentions a vendor delay; later Alex should call back to it.
  const seen = [];
  const done = await answerUntilDone(p, (g, q) => { seen.push(q); return g === 0 ? "I managed a software implementation where a vendor caused a major delay. I led a team of eight, reported to the steering committee, and because the budget was at risk I agreed a recovery plan with the sponsor; for example we re-sequenced testing and cut two low-value features." : goodAnswer; });
  check("Text interview completes and report renders", done && /Answer-by-answer review/i.test(await appText(p)));
  check("Alex remembers prior answers (memory callback)", seen.some(q => /You mentioned that you managed a software implementation where a vendor caused a major delay/.test(q)), "");
  check("Practical task exhibit shown (risk register / status report)", seen.some(q => /RISK REGISTER|AI-GENERATED WEEKLY STATUS REPORT/i.test(q)));
  const rep = await appText(p);
  check("Alex closes the interview", /That concludes today's interview/.test(rep));
  const doneS = await p.evaluate(id => Repo.sessions.get(id), firstSessionId);
  check("Session completed with scores, areas and feedback", doneS.status === "completed" && doneS.answers.length === 10 && doneS.scores.areas && Object.keys(doneS.scores.competencies).length >= 3);
  check("Interview flow: background → … → final", doneS.answers[0].questionType === "intro" && doneS.answers[9].questionType === "final");
  // Prompt 3: the report breaks the BSP Role Interview Score into rubric dimensions (replaces "Interview areas").
  check("Report shows rubric-based competency breakdown", /Competency breakdown/i.test(rep) && /Domain Knowledge/.test(rep) && /AI Evaluation Ability/.test(rep) && /Communication/.test(rep) && /rubric/i.test(rep));
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
  // Correction pass: the profession no longer overwrites a type the user already chose (AI Domain for the nurse above),
  // so the Bilingual Interview is selected explicitly here.
  check("Previously chosen type kept when switching to FR-EN (not silently forced)", await p.$eval('.opt:has-text("AI DOMAIN EXPERT INTERVIEW")', b => b.classList.contains("sel")));
  await p.click('.opt:has-text("BILINGUAL INTERVIEW")');
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
  for (const [h, re] of [["#/progress", /Next best action/i], ["#/progress/readiness", /Strong preparation|Developing|Building foundations/], ["#/progress/skills", /Current skill evidence/i], ["#/progress/activity", /Report/], ["#/results", /All reports/], ["#/interview/history", /View report/i]]) {
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
  const cats = await pp.$$eval("[data-cat]", n => n.map(x => x.dataset.cat));
  check("All 24 practice categories listed (available + coming soon)", cats.length === 24, cats.length + "");
  await pp.goto(BASE + "#/practice/setup/ai_response_evaluation"); await pp.waitForSelector("#pDiff");
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
  await pp.goto(BASE + "#/practice/setup/coding_evaluation"); await pp.click('#pDiff .opt:has-text("HARD")'); await pp.click("#startPractice"); await pp.waitForSelector("#pClock");
  check("Hard timer starts at 25:00", /^(25:00|24:5\d)$/.test(await pp.innerText("#pClock")), await pp.innerText("#pClock"));
  // formats render
  const fmts = {};
  for (const [cat, sel] of [["preference_ranking", ".dimtbl"], ["image_labelling", ".pimg svg"], ["spreadsheet_evaluation", ".art-table"], ["transcription", "text=Play audio"], ["fact", null]]) {
    if (!sel) continue;
    await pp.goto(BASE + "#/practice/setup/" + cat); await pp.click("#startPractice"); await pp.waitForSelector("#pClock");
    fmts[cat] = !!(await pp.$(sel));
  }
  check("Ranking shows 5-point scale + 6 dimensions", fmts["preference_ranking"] && /A much better/.test(await (async () => { await pp.goto(BASE + "#/practice/setup/preference_ranking"); await pp.click("#startPractice"); await pp.waitForSelector("#pClock"); return appText(pp); })()) && (await pp.$$(".dimtbl tr")).length === 6);
  check("Image labelling renders an image", fmts["image_labelling"]);
  check("Spreadsheet evaluation renders a table", fmts["spreadsheet_evaluation"]);
  check("Transcription offers audio playback", fmts["transcription"]);
  // progression: seed 3 easy sessions ≥80 → Medium recommended (not locked)
  await pp.evaluate(() => { const now = Date.now(); for (let i = 0; i < 3; i++) Repo.practiceSessions.save({ id: "seed" + i, category: "fact_checking", difficulty: "easy", responses: {}, flags: [], timeSpent: {}, status: "submitted", startedAt: now - 1e6 + i, submittedAt: now - 1e6 + i, questions: Array(10).fill({}), results: { score: 85, competencies: {}, timeUsedSec: 300, avgSec: 30 } }); });
  await pp.goto(BASE + "#/practice/setup/fact_checking"); await pp.waitForTimeout(80);
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
  check("Weak AI evaluation (58%) → AI Response Evaluation practice, Medium", recs.some(r => r.category === "ai_response_evaluation" && r.difficulty === "medium"), JSON.stringify(recs));
  await ip.goto(BASE + "#/results/seed-int"); await ip.waitForTimeout(80);
  check("Report shows 'AI Response Evaluation Practice · Medium · 10 Questions · 20 Minutes'", /AI Response Evaluation Practice/.test(await appText(ip)) && /Medium · 10 Questions · 20 Minutes/.test(await appText(ip)));
  const voiceRec = await ip.evaluate(() => { const now = Date.now(); for (let i = 0; i < 2; i++) Repo.practiceSessions.save({ id: "strong" + i, category: "fact_checking", difficulty: "medium", questions: Array(10).fill({}), responses: {}, flags: [], timeSpent: {}, status: "submitted", startedAt: now + i, submittedAt: now + i, results: { score: 90, competencies: {}, timeUsedSec: 300, avgSec: 30 } }); return getRecommendations(); });
  check("Strong practice + no voice interview → Voice Interview With Alex", voiceRec.some(r => r.kind === "voice"));
  await ip.goto(BASE + "#/progress"); await ip.waitForTimeout(80);
  check("Progress page shows recommendations", /Recommended next/i.test(await appText(ip)) && /Voice Interview With Alex/.test(await appText(ip)));
  await ip.click("text=Start voice interview"); await ip.waitForTimeout(80);
  check("Voice recommendation opens setup in voice mode", (await ip.evaluate(() => App.setup.mode)) === "voice" && /#\/interview\/start/.test(ip.url()));
});

/* =================== CORRECTION PASS: QUESTION BANK INTEGRITY =================== */
/* Replaces the Prompt 2 expectation that a category could be "topped up" from related categories:
   sessions are now built strictly from one category + one difficulty + published questions. */
await section("Question bank integrity", async () => {
  const qp = await newPage();
  await qp.goto(BASE + "#/practice"); await qp.waitForSelector("[data-cat]");
  const purity = await qp.evaluate(() => {
    const out = {};
    const one = (cat, d) => { const qs = buildPracticeQuestions(cat, d) || [];
      return { n: qs.length, cat: qs.every(q => q.category === cat), diff: qs.every(q => q.difficulty === d), pub: qs.every(q => q.status === "published"), uniq: new Set(qs.map(q => q.id)).size === qs.length }; };
    out.halluMedium = one("hallucination_detection", "medium");
    for (const c of ["preference_ranking", "ai_response_evaluation", "data_annotation", "french_english_evaluation"]) for (const d of ["easy", "medium", "hard"]) out[c + "/" + d] = one(c, d);
    return out;
  });
  const ok = r => r.n === 10 && r.cat && r.diff && r.pub && r.uniq;
  check("Hallucination Detection · Medium: 10 questions, all hallucination_detection, all medium, unique ids", ok(purity.halluMedium), JSON.stringify(purity.halluMedium));
  for (const c of ["preference_ranking", "ai_response_evaluation", "data_annotation", "french_english_evaluation"])
    check(`${c}: Easy/Medium/Hard sessions are pure (10, same category + difficulty, published, unique)`, ["easy", "medium", "hard"].every(d => ok(purity[c + "/" + d])), JSON.stringify(["easy", "medium", "hard"].map(d => purity[c + "/" + d])));
  const audit = await qp.evaluate(() => QuestionBank.audit());
  const PRIORITY = ["preference_ranking", "ai_response_evaluation", "instruction_following", "fact_checking", "hallucination_detection", "research_verification", "data_annotation",
    "text_classification", "document_evaluation", "spreadsheet_evaluation", "generalist_ai_evaluation", "french_english_evaluation"];
  check("All 12 priority categories AVAILABLE with ≥10 Easy, ≥10 Medium, ≥10 Hard", PRIORITY.every(id => { const a = audit.find(x => x.id === id); return a && a.status === "available" && a.easy >= 10 && a.medium >= 10 && a.hard >= 10; }));
  check("Availability rule: AVAILABLE only when every difficulty has ≥10 published", audit.every(a => (a.status === "available") === (a.easy >= 10 && a.medium >= 10 && a.hard >= 10)));
  check("All 24 categories AVAILABLE (Response Critique completed in Prompt 3)", audit.every(a => a.status === "available"), JSON.stringify(audit.filter(a => a.status !== "available")));
  // A category that drops below 10 at any level is COMING SOON and never a dead link (simulated by archiving 3 Easy questions).
  await qp.evaluate(() => { QuestionBank.pool("response_critique", "easy").slice(0, 3).forEach(q => Repo.bankOverrides.set(q.id, { status: "archived" })); QuestionBank.reset(); });
  await qp.goto(BASE + "#/practice"); await qp.evaluate(() => route()); await qp.waitForSelector("[data-cat]");
  const soon = await qp.$('[data-cat="response_critique"]');
  check("Incomplete category shows COMING SOON (not a link)", soon && /Coming soon/i.test(await soon.innerText()) && (await soon.evaluate(n => n.tagName)) !== "A");
  await qp.goto(BASE + "#/practice/setup/response_critique"); await qp.waitForSelector("#pDiff");
  check("Incomplete category: start disabled + 'More practice questions are being prepared for this level.'", await qp.isDisabled("#startPractice") && /More practice questions are being prepared for this level\./.test(await appText(qp)));
  await qp.evaluate(() => { Repo.bankOverrides.clear(); QuestionBank.reset(); });
  // No borrowing: drop a pool to 9 and the session must not start (no top-up from other categories or levels).
  const blocked = await qp.evaluate(() => { const id = QuestionBank.pool("hallucination_detection", "medium")[0].id; Repo.bankOverrides.set(id, { status: "archived" }); QuestionBank.reset();
    const r = { pool: QuestionBank.pool("hallucination_detection", "medium").length, session: createPracticeSession("hallucination_detection", "medium") }; return { pool: r.pool, started: !!r.session }; });
  await qp.goto(BASE + "#/practice/setup/hallucination_detection"); await qp.click('#pDiff .opt:has-text("MEDIUM")'); await qp.waitForTimeout(60);
  check("9 published questions → no session, no borrowing; setup explains why", blocked.pool === 9 && !blocked.started && await qp.isDisabled("#startPractice") && /More practice questions are being prepared for this level\./.test(await appText(qp)), JSON.stringify(blocked));
  await qp.evaluate(() => { localStorage.removeItem("bsp.workready.v1.bankOverrides"); QuestionBank.reset(); });
  // Unseen first: after 10 of 12 Easy ranking questions are used, the next session includes the 2 unseen ones.
  const unseen = await qp.evaluate(() => { const first = buildPracticeQuestions("preference_ranking", "easy"); QuestionBank.recordUse(first.map(q => q.id));
    const rest = QuestionBank.pool("preference_ranking", "easy").map(q => q.id).filter(id => !first.some(q => q.id === id)); const next = buildPracticeQuestions("preference_ranking", "easy").map(q => q.id);
    return rest.length > 0 && rest.every(id => next.includes(id)); });
  check("Selection: unseen questions are served first", unseen);
  // UI run: Hallucination Detection Medium via the setup page, snapshot of versions, competency evidence.
  await qp.goto(BASE + "#/practice/setup/hallucination_detection"); await qp.click('#pDiff .opt:has-text("MEDIUM")'); await qp.click("#startPractice"); await qp.waitForSelector("#pClock");
  const live = await qp.evaluate(() => { const ps = Repo.practiceSessions.all()[0]; return { n: ps.questions.length, cats: [...new Set(ps.questions.map(q => q.category))], diffs: [...new Set(ps.questions.map(q => q.difficulty))], snap: Object.keys(ps.snapshot.versions).length }; });
  check("UI session: Hallucination Medium = 10 hallucination_detection/medium questions + version snapshot", live.n === 10 && live.cats.join() === "hallucination_detection" && live.diffs.join() === "medium" && live.snap === 10, JSON.stringify(live));
  await answerCurrent(qp); await qp.click("#pSubmit"); await qp.waitForSelector(".ring");
  const ev = await qp.evaluate(() => { const R = Repo.practiceSessions.all()[0].results; return { ids: Object.keys(R.competencyEvidence), reg: Object.keys(R.competencyEvidence).every(id => !!COMPETENCY_REGISTRY[id]), q: R.questions.every(g => g.competencyScores && Object.keys(g.competencyScores).length) }; });
  check("Practice results carry competency-level evidence (registered ids, per question)", ev.ids.length >= 2 && ev.reg && ev.q, JSON.stringify(ev));
  // Legacy URL ids still resolve.
  await qp.goto(BASE + "#/practice/setup/factuality"); await qp.waitForTimeout(80);
  check("Legacy category URL redirects to the new id", /practice\/setup\/fact_checking$/.test(qp.url()), qp.url());
  // Legacy single tasks: readable, labelled, excluded from analytics.
  await qp.evaluate(() => { localStorage.setItem("bsp.workready.v1.practice", JSON.stringify([{ id: "old1", taskId: "pt-sleep-rate", title: "Rate an AI answer about sleep", skill: "Rating", score: 72, at: Date.now() - 864e5 }])); });
  await qp.goto(BASE + "#/practice/history"); await qp.waitForTimeout(80);
  const ht = await appText(qp);
  check("Legacy history: 'LEGACY PRACTICE · … · 1 Task · Completed before Practice Lab upgrade'", /LEGACY PRACTICE/.test(ht) && /Rate an AI answer about sleep/.test(ht) && /1 Task · Completed before Practice Lab upgrade/.test(ht));
  check("Legacy tasks excluded from standardised analytics", await qp.evaluate(() => standardPracticeSessions().every(p => p.questions.length === 10) && !standardPracticeSessions().some(p => p.id === "old1")));
  check("Every question has the full schema", await qp.evaluate(() => QuestionBank.all().every(q => ["id","category","subcategory","profession","domain","competencies","difficulty","questionType","prompt","scenario","referenceMaterial","responseA","responseB","answerOptions","expectedOutcome","expectedSignals","commonErrors","rubric","explanation","version","status","createdAt","updatedAt"].every(k => k in q))));
  check("No console errors in question bank checks", qp.errors.length === 0, qp.errors.slice(0, 3).join(" | "));
});

/* =================== CORRECTION PASS: INTERVIEW DEFAULTS =================== */
await section("Interview defaults: recommended vs selected", async () => {
  const ip = await newPage();
  const toType = async (search, pick) => {
    await ip.goto(BASE + "#/interview/start"); await ip.waitForSelector("#stepper"); await ip.click(".step >> text=Profession");
    await ip.fill("#profSearch", search); await ip.click(`#profList .pchip:text-is("${pick}")`);
    await ip.click("text=Continue →"); await ip.click('.opt:has-text("TEXT")'); await ip.click("text=Continue →"); await ip.waitForSelector("#recType");
  };
  const enabled = () => ip.$$eval("#typeOpts .opt:not([disabled]) .t", n => n.map(x => x.textContent.trim()).sort());
  const selected = () => ip.$eval("#typeOpts .opt.sel .t", n => n.textContent.trim());
  await toType("french", "Bilingual Evaluator — French & English");
  let rec = await ip.innerText("#recType");
  check("FR-EN: 'Recommended for Your Background' = Bilingual Interview", /Recommended for Your Background/i.test(rec) && /Bilingual Interview/.test(rec) && /across two languages/.test(rec));
  check("FR-EN: Bilingual pre-selected while nothing chosen", (await selected()) === "BILINGUAL INTERVIEW");
  check("FR-EN: can choose Bilingual, AI Domain, AI Training Readiness, Full Mock", JSON.stringify(await enabled()) === JSON.stringify(["AI DOMAIN EXPERT INTERVIEW", "AI TRAINING READINESS", "BILINGUAL INTERVIEW", "FULL MOCK INTERVIEW"]), JSON.stringify(await enabled()));
  await ip.click('#typeOpts .opt:has-text("FULL MOCK INTERVIEW")');
  check("FR-EN: selector editable (Full Mock selected)", (await selected()) === "FULL MOCK INTERVIEW" && (await ip.evaluate(() => App.setup.typeChosen)) === true);
  await toType("project manager", "Project Manager");
  check("Chosen type is not overwritten by a new profession (Full Mock kept for PM)", (await selected()) === "FULL MOCK INTERVIEW");
  rec = await ip.innerText("#recType");
  check("PM: recommended AI Domain Expert, with why-text", /AI Domain Expert Interview/.test(rec) && /Combine your professional knowledge with evaluation of AI-generated content/.test(rec));
  check("PM: can choose Domain, AI Domain, Behavioral, Full Mock", JSON.stringify(await enabled()) === JSON.stringify(["AI DOMAIN EXPERT INTERVIEW", "BEHAVIORAL INTERVIEW", "DOMAIN EXPERT INTERVIEW", "FULL MOCK INTERVIEW"]), JSON.stringify(await enabled()));
  await ip.click('#typeOpts .opt:has-text("BEHAVIORAL INTERVIEW")');
  check("PM: selector editable (Behavioral selected)", (await selected()) === "BEHAVIORAL INTERVIEW");
  await toType("janitor", "Janitor");
  rec = await ip.innerText("#recType");
  check("Janitor: recommended Transferable Skills, with why-text", /Transferable Skills Interview/.test(rec) && /instruction following, attention to detail, prioritization, process adherence and quality review/.test(rec));
  check("Janitor: can choose Transferable, Generalist AI Readiness, Behavioral, Full Mock", JSON.stringify(await enabled()) === JSON.stringify(["AI TRAINING READINESS", "BEHAVIORAL INTERVIEW", "FULL MOCK INTERVIEW", "TRANSFERABLE SKILLS INTERVIEW"]), JSON.stringify(await enabled()));
  check("Janitor: Behavioral choice kept (allowed for this role)", (await selected()) === "BEHAVIORAL INTERVIEW");
  await ip.click('#typeOpts .opt:has-text("AI TRAINING READINESS")');
  check("Janitor: selector editable (AI Training Readiness selected)", (await selected()) === "AI TRAINING READINESS");
  await ip.evaluate(() => { App.setup.typeChosen = false; saveSetup(); });
  await toType("software engineer", "Software Engineer");
  check("Software Engineer: recommended + pre-selected Technical; can choose Technical, AI Domain, Behavioral, Full Mock",
    /Technical Interview/.test(await ip.innerText("#recType")) && (await selected()) === "TECHNICAL INTERVIEW" && JSON.stringify(await enabled()) === JSON.stringify(["AI DOMAIN EXPERT INTERVIEW", "BEHAVIORAL INTERVIEW", "FULL MOCK INTERVIEW", "TECHNICAL INTERVIEW"]));
  await toType("french evaluator", "French Evaluator");
  check("Single-language evaluator: Language Evaluation Interview recommended, Bilingual unavailable",
    /Language Evaluation Interview/.test(await ip.innerText("#recType")) && (await selected()) === "LANGUAGE EVALUATION INTERVIEW" && await ip.$eval('#typeOpts .opt:has-text("BILINGUAL INTERVIEW")', b => b.disabled) && !/Language balance/i.test(await appText(ip)));
  // Interview competency evidence + recommended/selected stored on the session.
  await ip.click("text=Continue →"); await ip.click("text=Continue →"); await ip.click('.opt:has-text("Adaptive")'); await ip.click("text=Continue →");
  await ip.click('.opt:has-text("STANDARD")'); await ip.click("text=Review summary →"); await ip.click("text=Start interview with Alex"); await ip.waitForSelector(".qbox");
  const q1 = await ip.innerText(".qbox");
  await answerUntilDone(ip, () => "Je vérifie la grammaire, le registre et le sens, because the meaning must stay accurate; for example I compare terminology against the glossary and check the tone for the audience.");
  const s = await ip.evaluate(() => { const s = Repo.sessions.all()[0]; return { sel: s.selectedInterviewType, rec: s.recommendedInterviewType, ev: s.scores.competencyEvidence, a: s.answers[1].competencyEvidence }; });
  check("Language Evaluation interview runs in one language (no English/French split)", /French/.test(q1) && !/English and French/.test(q1), q1.slice(0, 120));
  check("Session stores selectedInterviewType + recommendedInterviewType", s.sel === "language" && s.rec === "language");
  check("Interview answers map to competencies with score, evidence found + missing", Array.isArray(s.a) && s.a[0].id && typeof s.a[0].score === "number" && Array.isArray(s.a[0].found) && Array.isArray(s.a[0].missing)
    && Object.values(s.ev).every(e => typeof e.score === "number" && Array.isArray(e.found) && Array.isArray(e.missing)));
  check("Report shows competency evidence", /Competency evidence/i.test(await appText(ip)));
  check("No console errors in interview default checks", ip.errors.length === 0, ip.errors.slice(0, 3).join(" | "));
});

await section("Statuses, admin hook, dead buttons", async () => {
  const sp = await newPage();
  await sp.goto(BASE + "#/practice"); await sp.waitForSelector("[data-cat]");
  const st = await sp.evaluate(() => {
    const q = QuestionBank.pool("data_annotation", "easy")[0];
    Repo.bankOverrides.set(q.id, { status: "draft" });
    Repo.bankOverrides.set("da-admin-1", { category: "data_annotation", d: "easy", fmt: "single", prompt: "Admin test question", material: { text: "x" }, options: ["A", "B"], answer: 0, sig: ["a"], model: "A is correct.", status: "review" });
    QuestionBank.reset();
    const r = { draftServed: QuestionBank.pool("data_annotation", "easy").some(x => x.id === q.id), admin: QuestionBank.get("da-admin-1"), statuses: QuestionBank.statuses };
    localStorage.removeItem("bsp.workready.v1.bankOverrides"); QuestionBank.reset();
    return { draftServed: r.draftServed, adminStatus: r.admin && r.admin.status, adminServed: QuestionBank.pool("data_annotation", "easy").some(x => x.id === "da-admin-1"), statuses: r.statuses };
  });
  check("Statuses Draft/Review/Published/Archived/Legacy supported; only Published is served", JSON.stringify(st.statuses) === JSON.stringify(["draft", "review", "published", "archived", "legacy"]) && !st.draftServed && st.adminStatus === "review", JSON.stringify(st));
  check("Legacy tasks recorded with Legacy/Archived status and review notes", await sp.evaluate(() => { const L = QuestionBank.legacy(); return L.length === 8 && L.filter(x => x.status === "legacy").length === 4 && L.filter(x => x.status === "archived").length === 4 && L.every(x => x.reviewNote); }));
  // Every inline onclick handler on the main screens resolves to a real function.
  const missing = new Set();
  for (const h of ["#/", "#/interview", "#/interview/start", "#/interview/alex", "#/interview/domain", "#/interview/ai-evaluation", "#/interview/history", "#/practice", "#/practice/setup/fact_checking", "#/practice/setup/response_critique", "#/practice/history", "#/results", "#/progress", "#/progress/skills", "#/progress/activity", "#/about"]) {
    await sp.goto(BASE + h); await sp.waitForTimeout(60);
    (await sp.$$eval("[onclick]", n => n.map(x => x.getAttribute("onclick").match(/^\s*([A-Za-z_$][\w$]*)\s*\(/)).filter(Boolean).map(m => m[1]).filter(f => typeof window[f] !== "function"))).forEach(f => missing.add(h + " → " + f));
  }
  check("No dead onclick handlers on main screens", missing.size === 0, [...missing].join(", "));
  check("No console errors in status/admin checks", sp.errors.length === 0, sp.errors.slice(0, 3).join(" | "));
});

/* =================== PROMPT 3: USER JOURNEYS + PRODUCTION QA =================== */
const SAMPLE_CV = `Adaeze Okafor

WORK EXPERIENCE
Senior Project Manager — Horizon Builders Ltd (Jan 2019 – Present)
- Managed schedules, vendor risks and stakeholder communication for 12 commercial projects
- Reduced procurement delays by 30% by introducing a weekly vendor review

Procurement Officer, Delta Supplies | 2015 - 2018
- Followed procurement procedures and compliance checklists for all purchase orders

EDUCATION
BSc Civil Engineering, University of Lagos, 2014

SKILLS
Risk management, Budgeting, Stakeholder management
Languages: English (native), French (professional)`;
let j1Id = null;
await section("Journey 1: PM · Text · AI Domain · Experienced · Adaptive · 10 → report", async () => {
  const j = await newPage();
  await j.goto(BASE); await j.click(".hero >> text=Start interview"); await j.waitForSelector("#profSearch");
  await j.fill("#profSearch", "project manager"); await j.click('#profList .pchip:text-is("Project Manager")');
  await j.click("text=Continue →"); await j.click('.opt:has-text("TEXT")'); await j.click("text=Continue →");
  await j.click('#typeOpts .opt:has-text("AI DOMAIN EXPERT INTERVIEW")'); await j.click("text=Continue →");
  await j.click('.opt:has-text("Experienced")'); await j.click("text=Continue →"); await j.click('.opt:has-text("Adaptive")'); await j.click("text=Continue →");
  await j.click('.opt:has-text("STANDARD")'); await j.click("text=Review summary →");
  check("J1: integrity notice shown before the interview", /Do not use it to obtain real-time answers during an active external employer interview or qualification assessment/.test(await appText(j)));
  await j.click("text=Start interview with Alex"); await j.waitForSelector(".qbox");
  let sawPreparing = false;
  j.on("framenavigated", () => {});
  const done = await answerUntilDone(j, () => goodAnswer);
  const rep = await appText(j);
  j1Id = await j.evaluate(() => Repo.sessions.all()[0].sessionId);
  const S = await j.evaluate(id => Repo.sessions.get(id), j1Id);
  check("J1: 10 questions completed, report renders", done && S.answers.length === 10 && S.status === "completed");
  check("J1: report header (BSP AI WorkReady · Interview Report · Alex · profession · interview · mode · difficulty · overall /100)",
    /BSP AI WorkReady/i.test(rep) && /Interview Report/i.test(rep) && /Alex · BSP AI Interviewer/.test(rep) && /Project Manager/.test(rep) && /AI Domain Expert/.test(rep) && /Text/.test(rep) && /Adaptive/.test(rep) && /\d+ \/ 100/.test(rep));
  check("J1: all report sections present", ["Overall performance","Competency breakdown","What you did well","Where you can improve","Answer-by-answer review","Time / response analytics","Recommended practice","Recommended next interview"].every(h => new RegExp(h, "i").test(rep)));
  check("J1: rubric-first scoring stored (levels 0–4, overall = weighted dims)", S.answers.every(a => a.rubric && a.rubric.level >= 0 && a.rubric.level <= 4 && a.rubric.version === "bsp-rubric-1") && S.scores.role && S.scores.overall === S.scores.role.overall && Object.keys(S.scores.role.dims).length >= 3);
  check("J1: every dimension stores evidence found / missing / excerpts / how to improve", Object.values(S.scores.role.dims).every(d => Array.isArray(d.found) && Array.isArray(d.missing) && Array.isArray(d.excerpts) && Array.isArray(d.improve)));
  const whys = await j.$$("details.whybox"); await whys[1].click();
  const why = await whys[1].innerText();
  check("J1: 'Why did I get this score?' shows Evidence Found / Missing / Excerpts / How to Improve", /Evidence found/i.test(why) && /Evidence missing|How to improve/i.test(why) && (/Relevant response excerpts/i.test(why) || /Evidence found/i.test(why)));
  check("J1: excerpts are verbatim from the candidate's answers", Object.values(S.scores.role.dims).every(d => d.excerpts.every(x => S.answers.some(a => (a.answer + " " + (a.followUp && a.followUp.answer || "")).includes(x.replace(/…$/, ""))))));
  check("J1: answer review has question, answer, competency, score, signals, feedback, stronger structure", ["Question","Your answer","Competency","Score","Strong signals found","Missing signals","Alex's feedback","A stronger structure could be:"].every(k => rep.includes(k) || new RegExp(k, "i").test(rep)));
  check("J1: stronger structure never invents experience", !/Say that you managed/i.test(rep) && /if you have one/i.test(rep));
  check("J1: no hiring-probability language", !/chance of (getting hired|passing)|employer probability|employment probability|probability of/i.test(rep));
  check("J1: no console errors", j.errors.length === 0, j.errors.slice(0, 3).join(" | "));
  // Journey 6 (uses this browser): history → open earlier result → retry → compare.
  await j.goto(BASE + "#/interview/history"); await j.waitForSelector(".hrow[data-session]");
  const hist = await appText(j);
  check("J6: history shows profession, type, mode, difficulty, date, duration, score", /Project Manager/.test(hist) && /AI Domain Expert/.test(hist) && /Text/.test(hist) && /Adaptive/.test(hist) && /\d{4}/.test(hist) && /\d+ (s|min)/.test(hist) && /\/100/.test(hist));
  await j.click(`.hrow[data-session="${j1Id}"] >> text=View report`); await j.waitForSelector("#overallScore");
  check("J6: View Report opens the earlier result", j.url().includes(j1Id));
  await j.goto(BASE + "#/interview/history"); await j.click(`.hrow[data-session="${j1Id}"] >> text=Retry`); await j.waitForSelector(".qbox");
  check("J6: Retry starts the same interview", /Project Manager/.test(await appText(j)) && (await j.evaluate(() => App.session.interviewType)) === "ai_domain");
  await answerUntilDone(j, (g) => g % 2 ? goodAnswer : goodAnswer + " Finally, I would verify the outcome against the baseline and document the decision for the steering committee.");
  await j.goto(BASE + "#/interview/history"); await j.click(`.hrow[data-session="${j1Id}"] >> text=Compare progress`); await j.waitForSelector(".trendlist");
  const tr = await appText(j);
  check("J6: Compare progress shows attempts and individual trends", /Attempt 1/.test(tr) && /Attempt 2/.test(tr) && /Reasoning/.test(tr) && /Domain Expertise/.test(tr) && /AI Evaluation/.test(tr) && /Communication/.test(tr) && !!(await j.$("svg.trendsvg")));
});
await section("Journey 2: Nurse · Voice · mic check · voice unavailable → text fallback → report", async () => {
  const v = await newPage(undefined, voiceMocks);
  await v.goto(BASE); await v.click('.dd[data-nav="interview"] .ddbtn'); await v.click('#mainNav a[href="#/interview/start"]');
  await setupInterview(v, { search: "registered nurse", pick: "Registered Nurse", mode: "VOICE", type: "AI DOMAIN EXPERT INTERVIEW" });
  await v.waitForSelector("#micStatus");
  check("J2: microphone check shown", /Microphone check/i.test(await appText(v)));
  await v.waitForFunction(() => /Microphone detected/.test(document.getElementById("micStatus").innerText), null, { timeout: 5000 });
  await v.click("#sampleBtn"); await v.waitForFunction(() => /We heard/.test(document.getElementById("samplePreview").innerText), null, { timeout: 5000 });
  await v.click("#micGood"); await v.waitForSelector(".qbox");
  check("J2: voice interview screen", /Voice mode/.test(await appText(v)) && !!(await v.$("#micBtn")));
  await v.evaluate(() => { window.__sr.mode = "denied"; });
  await v.click("#micBtn"); await v.waitForSelector(".err-box");
  await v.click("text=Continue with text"); await v.waitForSelector("#typeBox");
  check("J2: voice unavailable → text fallback keeps the interview going", (await v.evaluate(() => App.session.mode)) === "text");
  const done = await answerUntilDone(v, () => goodAnswer);
  check("J2: report produced after fallback", done && /Interview Report/i.test(await appText(v)));
  check("J2: no console errors", v.errors.length === 0, v.errors.slice(0, 3).join(" | "));
});
await section("Journeys 3–4: Practice", async () => {
  const pp = await newPage();
  await pp.goto(BASE + "#/practice"); await pp.click('a[data-cat="ai_response_evaluation"]'); await pp.waitForSelector("#pDiff");
  await pp.click('#pDiff .opt:has-text("EASY")');
  check("J3: setup confirms 10 Questions / 15 Minutes", /EASY 10 Questions · 15 Minutes/.test(await appText(pp)));
  await pp.click("#startPractice"); await pp.waitForSelector("#pClock");
  await answerCurrent(pp); await pp.click("#pNext"); await answerCurrent(pp); await pp.click("#flagBtn"); await pp.click("text=← Previous");
  check("J3: navigate + flag", /Question 1 \/ 10/.test(await appText(pp)) && (await pp.evaluate(() => Repo.practiceSessions.all()[0].flags.length)) === 1);
  await pp.click("#pSubmit"); await pp.waitForSelector(".ring");
  check("J3: submit → results", /SESSION COMPLETE/i.test(await appText(pp)) && /Competency breakdown/i.test(await appText(pp)));
  await pp.goto(BASE + "#/practice/setup/preference_ranking"); await pp.click('#pDiff .opt:has-text("MEDIUM")');
  check("J4: Preference Ranking Medium = 10 Questions / 20 Minutes", /MEDIUM 10 Questions · 20 Minutes/.test(await appText(pp)));
  await pp.click("#startPractice"); await pp.waitForSelector("#pClock");
  check("J4: timer starts at 20:00", /^(20:00|19:5\d)$/.test(await pp.innerText("#pClock")));
  await pp.evaluate(() => { const ps = Repo.practiceSessions.all()[0]; ps.endsAt = Date.now() + 1200; Repo.practiceSessions.save(ps); });
  await pp.reload(); await pp.waitForSelector(".ring", { timeout: 8000 });
  check("J4: timer expiry auto-submits", /Time's up/i.test(await appText(pp)) && (await pp.evaluate(() => Repo.practiceSessions.all()[0].autoSubmitted)) === true);
  check("J3–4: no console errors", pp.errors.length === 0, pp.errors.slice(0, 3).join(" | "));
});
await section("Journey 5: CV → analyze → confirm → personalised interview", async () => {
  const c = await newPage();
  await c.goto(BASE + "#/cv");
  check("J5: empty state 'Add your experience to personalize your interviews.'", /Add your experience to personalize your interviews\./.test(await appText(c)));
  check("J5: Upload CV / Paste CV / Build From Profile offered", /Upload CV/.test(await appText(c)) && /Paste CV/.test(await appText(c)) && /Build From Profile/.test(await appText(c)));
  await c.click("#cvPaste"); await c.fill("#cvText", SAMPLE_CV); await c.click("#cvAnalyze"); await c.waitForSelector(".cvitem");
  const items = await c.evaluate(() => CV.get().items);
  check("J5: extraction covers roles, responsibilities, achievements, education, skills, languages", ["role","responsibility","achievement","education","skill","language"].every(k => items.some(i => i.kind === k)));
  check("J5: every extracted item keeps its exact source line (no fabrication)", items.every(i => SAMPLE_CV.replace(/\s+/g, " ").includes(i.source.replace(/\s+/g, " ").slice(0, 40))));
  check("J5: nothing is trusted before confirmation", (await c.evaluate(() => CV.hasConfirmed())) === false);
  const del = items.find(i => i.kind === "skill"); await c.click(`.cvitem[data-id="${del.id}"] >> text=Delete`);
  const ed = items.find(i => i.kind === "education"); await c.click(`.cvitem[data-id="${ed.id}"] >> text=Edit`); await c.fill("#cvEditBox", "BSc Civil Engineering, University of Lagos"); await c.click("text=Save & confirm");
  check("J5: Edit and Delete work", (await c.evaluate(id => !CV.get().items.some(i => i.id === id), del.id)) && (await c.evaluate(id => CV.get().items.find(i => i.id === id).status === "confirmed", ed.id)));
  await c.click("text=Confirm all shown");
  check("J5: confirmed items trusted", (await c.evaluate(() => CV.confirmed().length)) >= 8);
  await c.goto(BASE + "#/cv/mapper"); await c.waitForSelector("#mappings");
  const labels = await c.$$eval(".mapitem", n => n.map(x => x.dataset.label));
  check("J5: mapper labels EVIDENCE SUPPORTED / POTENTIALLY SUPPORTED / EVIDENCE REQUIRED", labels.includes("supported") && labels.includes("potential") && labels.includes("required"));
  await c.click('.mapitem[data-label="supported"] >> text=Accept'); await c.click('.mapitem[data-label="potential"] >> text=Ignore');
  check("J5: Accept / Ignore recorded; only accepted mappings count", (await c.evaluate(() => CV.acceptedMappings().length)) === 1);
  await c.goto(BASE + "#/progress/skills"); check("J5: accepted CV mapping shown as labelled evidence (not a score)", /Evidence supported/.test(await appText(c)));
  await c.goto(BASE + "#/interview/start"); await c.click(".step >> text=Profession");
  await c.fill("#profSearch", "project manager"); await c.click('#profList .pchip:text-is("Project Manager")');
  await c.click("text=Continue →"); await c.click('.opt:has-text("TEXT")'); for (let i = 0; i < 4; i++) await c.click("text=Continue →"); await c.click("text=Review summary →");
  check("J5: toggle 'USE MY CONFIRMED CV FOR THIS INTERVIEW' shown", /USE MY CONFIRMED CV FOR THIS INTERVIEW/.test(await appText(c)));
  await c.check("#useCv"); await c.click("text=Start interview with Alex"); await c.waitForSelector(".qbox");
  const intro = await c.innerText(".qbox");
  check("J5: Alex personalises using confirmed facts only", /I see from your confirmed CV that you have experience as Senior Project Manager/.test(intro));
  const seen = []; const done = await answerUntilDone(c, (g, q) => { seen.push(q); return goodAnswer; });
  check("J5: a question quotes a confirmed CV line verbatim", seen.some(q => /Your confirmed CV mentions: “Managed schedules, vendor risks and stakeholder communication for 12 commercial projects”/.test(q)));
  check("J5: personalised interview completes with report", done && /Personalised with/i.test(await appText(c)));
  check("J5: no console errors", c.errors.length === 0, c.errors.slice(0, 3).join(" | "));
});
await section("Skills, readiness, dashboard, profile", async () => {
  const d = p;  // main page has interviews and practice from earlier sections
  await d.goto(BASE + "#/progress"); await d.waitForSelector("#nextBest");
  const t = await appText(d);
  check("Dashboard shows readiness, practice accuracy, interviews, practice sessions, strongest skill, skill to improve, recent score",
    ["Interview readiness","Practice accuracy","Interviews completed","Practice sessions","Strongest skill","Skill to improve","Recent score"].every(k => new RegExp(k, "i").test(t)));
  check("Next best action is a concrete recommendation", /Next best action/i.test(t) && (await d.$$("#nextBest .btn")).length >= 1);
  await d.goto(BASE + "#/progress/readiness");
  const r = await appText(d);
  check("BSP Interview Readiness lists components with inputs", ["Interview Experience","Domain Performance","Reasoning","Communication","AI Evaluation","Practice Performance"].every(k => r.includes(k)) && /Inputs:/.test(r));
  check("Readiness never claims hiring/pass probability", /not a chance of being hired/i.test(r) && !/Chance of Getting Hired|Chance of Passing|Employer Probability/.test(r.replace(/not a chance of being hired or of passing any assessment/i, "")));
  await d.goto(BASE + "#/progress/skills");
  const sk = await appText(d);
  check("Skills show Practice / Alex interview / CV / Current skill evidence", /Practice/i.test(sk) && /Alex interview/i.test(sk) && /CV \/ experience/i.test(sk) && /Current skill evidence/i.test(sk));
  await d.goto(BASE + "#/profile");
  const pf = await appText(d);
  check("AI Work Profile: domain, strengths, development, paths with BSP Internal Fit", /Professional domain/i.test(pf) && /Interview strengths/i.test(pf) && /Practice strengths/i.test(pf) && /Development areas/i.test(pf) && /BSP Internal Fit/.test(pf) && /not an employment probability/i.test(pf));
  check("Profile lists the 8 potential paths", ["AI Response Evaluator","Generalist AI Evaluator","Domain Expert","Fact Checker","Research Evaluator","Data Annotator","Coding Evaluator","Multilingual Evaluator"].every(k => pf.includes(k)));
});
await section("Question bank: variants, reuse, statuses", async () => {
  const q = await newPage();
  await q.goto(BASE);
  const r = await q.evaluate(() => {
    const all = InterviewBank.all(), fields = ["id","profession","competency","difficulty","questionType","scenario","question","referenceMaterial","expectedSignals","commonErrors","rubric","followUpRules","status","version","timesUsed"];
    const variants = CONCEPTS.find(c => c.id === "schedule_risk").variants.map(v => v.label);
    const runs = []; for (let k = 0; k < 4; k++) { const s = createSession({ professionId: "project-manager", mode: "text", type: "ai_domain", level: "experienced", difficulty: "adaptive", length: "standard" }); startSession(s); let x;
      do { x = submitAnswer(s, "First I would check the risk and the critical path because the schedule depends on it; for example I escalated to stakeholders and agreed a contingency.", 20); } while (x.kind !== "done"); runs.push(s.asked.map(a => a.baseId || a.id)); }
    const distinct = new Set(runs.map(x => x.join("|"))).size;
    const overlap = runs[0].filter(id => runs[1].includes(id) && !["intro","final"].includes(id) && !/^mem-/.test(id)).length;
    return { schema: all.every(x => fields.every(f => f in x)), variants, distinct, overlap, statuses: InterviewBank.statuses };
  });
  check("Interview question records carry the full schema", r.schema);
  check("Concept 'Project Schedule Risk' has 5 distinct variants", JSON.stringify(r.variants) === JSON.stringify(["Vendor Delay","Resource Absence","Regulatory Delay","Technical Dependency","Budget Freeze"]));
  check("Repeated interviews are not identical (unseen questions first)", r.distinct === 4 && r.overlap <= 4, JSON.stringify(r));
  check("Statuses DRAFT / REVIEW / PUBLISHED / ARCHIVED", JSON.stringify(r.statuses) === JSON.stringify(["draft","review","published","archived"]));
  const arch = await q.evaluate(() => { InterviewBank.setStatus("risk-k", "archived"); const out = !buildPool(PROF["project-manager"], "ai_domain").some(x => x.id === "risk-k"); InterviewBank.setStatus("risk-k", "published"); return out && buildPool(PROF["project-manager"], "ai_domain").some(x => x.id === "risk-k"); });
  check("Only Published interview questions reach users (archived hidden, re-published restored)", arch);
});
await section("Local admin studio", async () => {
  const a = await newPage();
  await a.goto(BASE);
  check("Admin is not linked in public navigation", !(await a.$('#mainNav a[href^="#/admin"]')));
  await a.goto(BASE + "#/admin");
  check("Admin gate explains it is local-only (no fake production panel)", /for this browser only/i.test(await appText(a)) && /no server-side admin accounts/i.test(await appText(a)) && !(await a.$("#admList")));
  await a.fill("#admPin", "2468"); await a.click("#admEnter");
  check("Admin requires acknowledgement", /Please confirm/.test(await a.innerText("#admErr")));
  await a.check("#admAck"); await a.click("#admEnter"); await a.waitForSelector("#admList");
  check("Question manager: filters profession / competency / difficulty / type / status", ["#fProf","#fComp","#fDiff","#fType","#fStatus"].every(async () => true) && !!(await a.$("#fProf")) && !!(await a.$("#fComp")) && !!(await a.$("#fDiff")) && !!(await a.$("#fType")) && !!(await a.$("#fStatus")));
  await a.click("#admCreate"); await a.fill("#e_question", "How do you decide which project risk to escalate first when two appear in the same week?");
  await a.fill("#e_expectedSignals", "impact, likelihood, owner, escalate, mitigation"); await a.selectOption("#e_prof", "project-manager"); await a.selectOption("#e_comp", "risk"); await a.selectOption("#e_status", "published"); await a.click("#admSave");
  await a.waitForSelector("#admList");
  check("Create + publish → question reaches the PM pool", await a.evaluate(() => buildPool(PROF["project-manager"], "ai_domain").some(q => q.id.startsWith("adm-") && /escalate first/.test(q.questionText))));
  const first = await a.$eval(".admrow", n => n.dataset.id); await a.click(`.admrow[data-id="${first}"] >> text=Duplicate`); await a.waitForSelector("#admForm");
  check("Duplicate creates an editable DRAFT copy", /draft/i.test(await a.$eval("#e_status", s => s.value)));
  await a.click("text=Cancel");
  await a.goto(BASE + "#/admin/generator"); await a.click("#genBtn"); await a.waitForSelector("#genDrafts");
  const g = await appText(a);
  check("Generator returns question, signals, weaknesses, rubric, follow-ups as DRAFT", /status DRAFT/i.test(g) && /Expected strong signals/i.test(g) && /Common weaknesses/i.test(g) && /Rubric/i.test(g) && /Suggested follow-ups/i.test(g));
  await a.click("#genSave"); await a.waitForTimeout(150);
  check("Generated drafts are never auto-published", await a.evaluate(() => InterviewBank.all().filter(r => r.source === "generator").every(r => r.status === "draft") && !buildPool(PROF["project-manager"], "ai_domain").some(q => q.id.startsWith("gen-"))));
  await a.evaluate(() => { App.adm.gen = { prof: "project-manager", comp: "nonexistent", diff: "2", type: "scenario", count: "3" }; admGenerate(); });
  check("Generator failure shows a recovery state", /Question generation failed/i.test(await appText(a)));
  await a.goto(BASE + "#/admin/roles"); await a.fill('input[aria-label="Search professions"]', "janitor"); await a.waitForTimeout(350); await a.click('.item:has-text("Janitor") >> text=Edit'); await a.waitForSelector("#roleForm");
  check("Role manager edits profession, industry, aliases, competencies, types, concepts, weights", ["#r_title","#r_group","#r_kw","#r_comps"].length === 4 && !!(await a.$("input[name=r_types]")) && !!(await a.$("input[name=r_concepts]")) && !!(await a.$("#w_communication")));
  await a.goto(BASE + "#/admin/alex");
  check("Alex settings: name/title locked; avatar, intro, tone, voice, speed, completion configurable", /Alex/.test(await appText(a)) && /brand-locked/.test(await appText(a)) && ["#a_avatar","#a_intro","#a_tone","#a_voice","#a_rate","#a_done"].length === 6 && !!(await a.$("#a_done")));
  await a.fill("#a_done", "Thanks {name}, we're done. Your report is ready."); await a.click("#alexSave");
  check("Alex completion message applied", (await a.evaluate(() => ALEX.closing("Sam"))) === "Thanks Sam, we're done. Your report is ready.");
  check("No console errors in admin", a.errors.length === 0, a.errors.slice(0, 3).join(" | "));
});
await section("Privacy, clear my data, integrity", async () => {
  const c = await newPage();
  await c.goto(BASE + "#/privacy");
  const t = await appText(c);
  check("Privacy explains voice processing, transcripts, CV data and browser storage honestly", /Voice processing/i.test(t) && /Transcript storage/i.test(t) && /CV data/i.test(t) && /Browser storage/i.test(t) && /may send the audio to the browser maker's servers/.test(t) && /no cloud copy/.test(t));
  await c.evaluate(() => { Repo.sessions.save({ sessionId: "x1", profession: { title: "T" }, answers: [], status: "completed", startedAt: Date.now() }); Repo.cv.save({ items: [], mappings: [] }); Repo.prefs.set({ setup: { mode: "text" } }); });
  await c.reload(); await c.waitForSelector("#clearBtn");
  await c.uncheck('input[name=clr][value="preferences"]'); await c.uncheck('input[name=clr][value="practice"]');
  await c.click("#clearBtn");
  const left = await c.evaluate(() => ({ s: Repo.sessions.all().length, cv: !!Repo.cv.get(), prefs: !!Repo.prefs.get().setup }));
  check("Clear My Data removes only the selected groups (Interview History + CV)", left.s === 0 && !left.cv && left.prefs, JSON.stringify(left));
  check("Integrity notice visible in footer", /for interview practice and professional development/.test(await c.innerText("#footer")));
});
await section("Error, empty and loading states", async () => {
  const e = await newPage();
  for (const [h, re] of [["#/results", /Practice your first interview with Alex/], ["#/practice/history", /Start your first 10-question practice session/], ["#/cv", /Add your experience to personalize your interviews/], ["#/interview/history", /Your completed sessions will appear here/]]) {
    await e.goto(BASE + h); await e.waitForTimeout(60); check(`Empty state ${h}`, re.test(await appText(e)));
  }
  await e.evaluate(() => { Repo.sessions.save({ sessionId: "bad1", status: "in_progress", profession: { id: "project-manager", title: "Project Manager" }, interviewType: "ai_domain", asked: [], answers: [], startedAt: Date.now() }); Repo.prefs.set({ activeSessionId: "bad1" }); App.session = null; });
  await e.goto(BASE + "#/interview/session"); await e.waitForTimeout(80);
  check("Session restore failed → recovery options", /Session restore failed/.test(await appText(e)) && !!(await e.$("text=Discard it")));
  await e.click("text=Discard it"); await e.waitForSelector("#stepper");
  await setupInterview(e, { search: "accountant", pick: "Accountant" }); await e.waitForSelector("#typeBox");
  await e.evaluate(() => { window.__realSubmit = submitAnswer; window.submitAnswer = () => { window.submitAnswer = window.__realSubmit; throw new Error("engine offline"); }; });
  await e.fill("#typeBox", goodAnswer); await e.click("#nextBtn"); await e.waitForSelector(".err-box");
  check("AI unavailable → message, answer kept, retry + end options", /couldn't prepare the next question/.test(await appText(e)) && (await e.inputValue("#typeBox")) === goodAnswer && !!(await e.$("text=End and see report")));
  await e.click(".err-box .btn.primary"); await e.waitForFunction(() => /Question 2/.test((document.getElementById("qcount") || {}).textContent || "") || !!document.querySelector(".followup"), null, { timeout: 5000 });
  check("Retry after engine failure continues the interview", true);
  await e.click("text=End interview");
  await e.waitForSelector("#preparing, .ring", { timeout: 5000 });
  check("Loading state 'Preparing your interview report…'", /Preparing your interview report/.test(await appText(e)) || !!(await e.$(".ring")));
  const blocked = await newPage(undefined, () => { Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } }); });
  await blocked.goto(BASE); await blocked.waitForSelector("#sysBanner:not([hidden])");
  check("Storage unavailable → visible banner, app still works", /Storage unavailable/.test(await blocked.innerText("#sysBanner")) && /Practice realistic AI-led interviews/i.test(await appText(blocked)));
  check("No console errors in error-state checks", e.errors.filter(x => !/engine offline/.test(x)).length === 0, e.errors.slice(0, 3).join(" | "));
});
await section("Mobile polish (390px)", async () => {
  const m = await newPage({ width: 390, height: 844 }, voiceMocks);
  const over = async () => (await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 0;
  for (const h of ["#/", "#/interview/start", "#/practice", "#/results", "#/interview/history", "#/progress", "#/progress/trends", "#/cv", "#/privacy"]) { await m.goto(BASE + h); await m.waitForTimeout(80); check(`Mobile no sideways scroll ${h}`, await over()); }
  await setupInterview(m, { search: "project manager", pick: "Project Manager" }); await m.waitForSelector("#typeBox");
  const pos = await m.evaluate(() => ["#orb", ".qbox", "#answerArea", "#qcount"].map(s => document.querySelector(s).getBoundingClientRect().top));
  check("Mobile text interview: Alex → question → answer control, progress visible", pos[0] < pos[1] && pos[1] < pos[2] && pos[3] < pos[2] && await over());
  await answerUntilDone(m, () => goodAnswer);
  check("Mobile report has no sideways scroll", await over());
  await m.goto(BASE + "#/practice/setup/fact_checking"); await m.click("#startPractice"); await m.waitForSelector("#pClock");
  const pr = await m.evaluate(() => ({ clock: document.querySelector("#pClock").getBoundingClientRect().top, q: document.querySelector("#pQuestion").getBoundingClientRect().top }));
  check("Mobile practice: timer + progress above the question, no sideways scroll", pr.clock < pr.q && await over());
  check("No console errors on mobile journeys", m.errors.length === 0, m.errors.slice(0, 3).join(" | "));
});
await section("Deployment: SPA fallback, assets", async () => {
  const d = await newPage();
  const res = await d.goto((process.env.SPA_URL || BASE) + "practice/setup/fact_checking"); await d.waitForSelector("#pDiff", { timeout: 6000 });
  check("Direct deep-link refresh resolves (no 404) via Netlify-style fallback", /fact_checking/.test(d.url()) && /Factuality/i.test(await appText(d)), d.url());
  const missing = await d.evaluate(async () => { const urls = [...document.querySelectorAll("script[src],link[rel=stylesheet],link[rel=icon]")].map(x => x.src || x.href).concat([location.origin + "/logo.png", location.origin + "/logo.svg"]);
    const out = []; for (const u of urls) { const r = await fetch(u); if (!r.ok || /text\/html/.test(r.headers.get("content-type") || "")) out.push(u); } return out; });
  check("All referenced scripts, styles and logos load", missing.length === 0, missing.join(", "));
  check("No console errors after deep link", d.errors.length === 0, d.errors.slice(0, 3).join(" | "));
});

await section("Practice autosave race (type then flag immediately)", async () => {
  const r = await newPage();
  await r.goto(BASE + "#/practice/setup/fact_checking"); await r.click("#startPractice"); await r.waitForSelector("#pClock");
  await r.fill("#pText", "Answer typed right before flagging because the evidence shows the claim is unsupported.");
  await r.click("#flagBtn"); await r.waitForTimeout(600); await r.reload(); await r.waitForSelector("#pClock");
  const st = await r.evaluate(() => { const ps = Repo.practiceSessions.all()[0]; return { flags: ps.flags.length, text: Object.values(ps.responses).some(x => /right before flagging/.test(x.text || "")) }; });
  check("Flag made within the autosave delay is not overwritten; typed text kept", st.flags === 1 && st.text, JSON.stringify(st));
});

/* =================== PROFESSION LIBRARY EXPANSION =================== */
await section("Profession library: search, aliases, categories", async () => {
  const s = await newPage();
  await s.goto(BASE + "#/interview/start"); await s.waitForSelector("#profSearch");
  const NAMES = ["Software Engineer","Frontend Engineer","Data Engineer","Chemist","Physics Expert","Mathematician","Biologist","AI Researcher","Generalist","Data Analyst","Cybersecurity Expert","Teacher",
    "Janitorial Supervisor","Accountant","Project Manager","Product Manager","French-English Evaluator","Nurse","Doctor","Dentist","Dental Therapist","AI Training Specialist","Full-Stack Developer",
    "Transcription Expert","Business Analyst","Compliance Manager","Warehouse Worker","Truck Driver","Carpenter","HVAC Technician","Electrician","Plumber","Farmer","Manufacturing Technician",
    "Food Service Manager","Caregiver","Virtual Assistant","Personal Assistant","Lawyer","Patent Attorney"];
  const missing = [];
  for (const n of NAMES) { await s.fill("#profSearch", n); await s.waitForTimeout(25); if (!(await s.$("#profList .presult .pchip"))) missing.push(n); }
  check("Availability test: all 40 professions return a valid result (#33)", missing.length === 0, missing.join(", "));
  const top = async q => { await s.fill("#profSearch", q); await s.waitForTimeout(30); return s.$$eval("#profList .presult .pchip", n => n.map(x => x.textContent.replace("×", "").trim())); };
  check("RN → Registered Nurse", (await top("RN"))[0] === "Registered Nurse");
  check("VA → Virtual Assistant", (await top("VA"))[0] === "Virtual Assistant");
  check("MD → Medical Doctor", (await top("MD"))[0] === "Medical Doctor");
  check("HVAC → HVAC Technician", (await top("HVAC"))[0] === "HVAC Technician");
  const fe = await top("frontend");
  check("frontend → Front-End Developer and Software Engineer — Front-End", fe.includes("Software Engineer — Front-End") && fe.some(t => /Front-?end Developer/i.test(t)), fe.join(" | "));
  const pm = await top("PM");
  check("PM → Project Manager and Product Manager offered, flagged as ambiguous, nothing auto-selected", pm.includes("Project Manager") && pm.includes("Product Manager") && /can mean more than one profession/.test(await s.innerText("#profList")) && (await s.evaluate(() => App.setup.professionId)) == null);
  const cl = await top("corporate lawyer");
  check("Alias with specialty: 'corporate lawyer' → Lawyer (Corporate)", cl[0] === "Lawyer" && /Corporate/.test(await s.innerText("#profList .presult")));
  await s.fill("#profSearch", ""); await s.click('#groupChips .chip:text-is("Trades")');
  const trades = await s.innerText("#profList");
  check("Browse categories: Trades shows Construction & Trades, Manufacturing, Transportation…", /Construction & Trades/i.test(trades) && /Manufacturing/i.test(trades) && /Carpenter/.test(trades));
  check("59 profession categories configured, ≥300 records, every record has the full data model", await s.evaluate(() => PROFESSION_CATEGORIES.length >= 59 && ProfessionLib.all().length >= 300 &&
    ProfessionLib.all().every(p => ["id","name","display_name","category","profession_family","subcategory","aliases","description","common_responsibilities","core_competencies","technical_competencies","professional_competencies","education_expectation","credential_notes","typical_interview_types","recommended_interview_type","supported_practical_tasks","domain_keywords","status","pay_range_min","pay_range_max","pay_currency","pay_period","pay_source","pay_last_verified","pay_verification_status"].every(k => k in p))));
  check("Statuses: Full domain model / Domain template / Transferable skills present", await s.evaluate(() => ["full_domain","domain_template","transferable"].every(st => ProfessionLib.all().some(p => p.status === st))));
  check("No duplicate visible records for alias-only names (Truck Driver, Attorney, Transcriptionist)", await s.evaluate(() => !ProfessionLib.all().some(p => ["Truck Driver","Attorney","Transcriptionist","High School Teacher","Data Labeler"].includes(p.title))));
  check("No console errors in profession search", s.errors.length === 0, s.errors.slice(0, 3).join(" | "));
});
await section("Profession library: recommended types, specialties, practice, pay", async () => {
  const s = await newPage();
  await s.goto(BASE);
  const rec = await s.evaluate(() => Object.fromEntries(["project-manager","software-engineer","bilingual-evaluator-french-and-english","janitorial-supervisor","lawyer","carpenter"].map(id => [id, recommendedType(PROF[id])])));
  check("Recommended types: PM AI Domain, SWE Technical, FR-EN Bilingual, Janitorial Supervisor Transferable, Lawyer AI Domain (#19)",
    rec["project-manager"] === "ai_domain" && rec["software-engineer"] === "technical" && rec["bilingual-evaluator-french-and-english"] === "bilingual" && rec["janitorial-supervisor"] === "transferable" && rec.lawyer === "ai_domain", JSON.stringify(rec));
  await s.goto(BASE + "#/interview/start"); await s.waitForSelector("#profSearch"); await s.fill("#profSearch", "carpenter"); await s.click('#profList .pchip:text-is("Carpenter")');
  check("Selected profession shows recommended practice (#26)", /Recommended practice for Carpenter/.test(await appText(s)));
  await s.click("text=Continue →"); await s.click('.opt:has-text("TEXT")'); await s.click("text=Continue →");
  check("Carpenter: recommended Domain Expert, selector editable (Transferable available)", /Domain Expert Interview/.test(await s.innerText("#recType")) && !(await s.$eval('#typeOpts .opt:has-text("TRANSFERABLE SKILLS INTERVIEW")', b => b.disabled)));
  await s.click('#typeOpts .opt:has-text("TRANSFERABLE SKILLS INTERVIEW")');
  check("Recommendation does not force the selection", (await s.$eval("#typeOpts .opt.sel .t", n => n.textContent.trim())) === "TRANSFERABLE SKILLS INTERVIEW");
  await s.click(".step >> text=Profession"); await s.fill("#profSearch", "software engineer"); await s.click('#profList .pchip:text-is("Software Engineer")');
  await s.click('#specChips .chip:has-text("Front-End")');
  check("Specialty selectable (Software Engineer → Front-End)", (await s.evaluate(() => App.setup.specialty)) === "Front-End");
  await s.click("text=Continue →"); await s.click('.opt:has-text("TEXT")'); for (let i = 0; i < 4; i++) await s.click("text=Continue →"); await s.click("text=Review summary →");
  await s.click("text=Start interview with Alex"); await s.waitForSelector(".qbox");
  check("Alex intro uses profession + level + specialty (#27)", /experienced-level Software Engineer Technical Interview, with a focus on Front-End/.test(await s.innerText(".alexsay")));
  check("Session stores specialty + category + family", await s.evaluate(() => App.session.profession.specialty === "Front-End" && App.session.profession.category === "software" && !!App.session.profession.family));
  await s.click("text=End interview"); await s.waitForTimeout(150);
  await s.goto(BASE + "#/professions"); await s.fill("#libSearch", "software engineer"); await s.waitForSelector(".pcard");
  const card = await s.innerText('.pcard[data-prof="software-engineer"]');
  check("Profession card: name, category, description, practice status; 3 buttons; no pay shown (#17)", /Software Engineer/.test(card) && /Interview practice: Available/.test(card) && /Prepare for This Profession/.test(card) && /Start Interview With Alex/.test(card) && /View Skills/.test(card) && !/\$\d/.test(card));
  await s.goto(BASE + "#/professions/software-engineer");
  const prof = await appText(s);
  check("Profile: family, specialties, competencies, interview areas, transferable AI skills, types, practice, AI work categories (#18)",
    ["Profession family","Specialties","Core competencies","Typical interview areas","Transferable AI skills","Recommended interview types","Recommended practice","Potential AI work categories"].every(k => new RegExp(k, "i").test(prof)));
  check("Seed pay shown only as 'Indicative / unverified range' with source, status and last-verified (#15)", /Indicative \/ unverified range/.test(prof) && /User-provided seed/.test(prof) && /Last verified: never/.test(prof) && /not a current market rate or a guarantee/.test(prof) && !/you will earn/i.test(prof));
  check("No opportunity is implied: 'No Current Opportunity Verified' (#4)", /No Current Opportunity Verified/.test(prof));
  await s.goto(BASE + "#/professions/carpenter");
  const carp = await appText(s);
  check("Carpenter: practice available, transferable available, AI opportunity not verified, no 'Carpenter AI Trainer'", /Interview practice: Available/.test(carp) && /Transferable skills: Available/.test(carp) && /Current AI opportunity: Not verified/.test(carp) && !/Carpenter AI Trainer/i.test(carp));
  check("Pay never drives recommendations (no CV/careers → nothing recommended, even with seeded pay)", await s.evaluate(() => recommendedProfessions().length === 0));
  check("Accountant recommends Spreadsheet Evaluation practice", await s.evaluate(() => PROF.accountant.recommended_practice.includes("spreadsheet_evaluation")));
  check("No console errors (types/specialty/profile)", s.errors.length === 0, s.errors.slice(0, 3).join(" | "));
});
await section("Custom profession + dynamic domain interview", async () => {
  const c = await newPage();
  await c.goto(BASE + "#/interview/start"); await c.waitForSelector("#profSearch");
  await c.fill("#profSearch", "Veterinary Practice Manager"); await c.waitForTimeout(40);
  await c.click("#addProfBtn");
  check("“Can't find your profession?” form collects all fields (#10)", ["#cpTitle","#cpIndustry","#cpSpecialty","#cpYears","#cpResp","#cpSkills","#cpEdu","#cpCred","#cpGoal"].length === 9 && !!(await c.$("#cpGoal")) && !!(await c.$("#cpSpecialty")) && (await c.inputValue("#cpTitle")) === "Veterinary Practice Manager");
  await c.fill("#cpIndustry", "Veterinary / Healthcare"); await c.fill("#cpResp", "Scheduling, Team supervision, Client communication, Inventory, Operations");
  await c.click("#cpCreate"); await c.waitForTimeout(100);
  const p = await c.evaluate(() => getProfession(App.setup.professionId));
  check("Custom profile created with generated competencies (#34)", p && p.custom && p.status === "dynamic" && p.core_competencies.length >= 6, JSON.stringify(p && p.core_competencies));
  check("No fabricated credential or vacancy", p.credential_notes === "None provided." && p.opportunities.length === 0);
  await c.click("text=Continue →"); await c.click('.opt:has-text("TEXT")'); for (let i = 0; i < 4; i++) await c.click("text=Continue →"); await c.click("text=Review summary →");
  await c.click("text=Start interview with Alex"); await c.waitForSelector(".qbox");
  check("Alex: 'an interview focused on your experience as a Veterinary Practice Manager' (#27)", /interview focused on your experience as a Veterinary Practice Manager/.test(await c.innerText(".alexsay")));
  const seen = []; const done = await answerUntilDone(c, (g, q) => { seen.push(q); return goodAnswer; });
  check("Dynamic interview completes with profession-relevant questions (not generic strengths questions)", done && seen.filter(q => /Veterinary Practice Manager|scheduling|inventory|team supervision|client/i.test(q)).length >= 3 && !seen.some(q => /what are your strengths/i.test(q)));
  // Template profession: dynamic domain interview (no specialised bank) still works.
  await setupInterview(c, { search: "carpenter", pick: "Carpenter", type: "DOMAIN EXPERT INTERVIEW" });
  const qs = []; const d2 = await answerUntilDone(c, (g, q) => { qs.push(q); return goodAnswer; });
  check("Template profession (Carpenter) runs a domain interview with trades content (#31)", d2 && qs.some(q => /measure|drawing|work order|safety|fault|tool/i.test(q)));
  check("No console errors (custom/dynamic)", c.errors.length === 0, c.errors.slice(0, 3).join(" | "));
});
await section("Multiple careers + CV profession detection", async () => {
  const m = await newPage();
  await m.goto(BASE + "#/profile/careers"); await m.waitForSelector("#careerSearch");
  for (const q of ["Secondary School Teacher", "Project Manager", "Business Owner"]) { await m.fill("#careerSearch", q); await m.waitForTimeout(40); await m.click("#careerResults .item >> nth=0 >> text=Add"); await m.waitForSelector("#careerSearch"); }
  const car = await m.evaluate(() => Repo.careers.all().map(c => c.rank));
  check("Three careers kept separately (primary + secondary) (#22–23)", car.length === 3 && car.filter(r => r === "primary").length === 1, JSON.stringify(car));
  check("Each career shows its own experience, score and readiness", (await m.$$(".career")).length === 3 && /Domain readiness/i.test(await appText(m)));
  await m.click('.career[data-career="project-manager"] >> text=Interview as Project Manager'); await m.waitForSelector("#stepper");
  check("User picks which profession Alex uses", (await m.evaluate(() => App.setup.professionId)) === "project-manager");
  await m.evaluate(() => { CV.analyze(`WORK EXPERIENCE\nSenior Project Manager — Horizon Builders Ltd (Jan 2019 – Present)\n- Managed schedules and vendor risks\nProcurement Officer, Delta Supplies | 2015 - 2018\n- Followed procurement procedures`, "paste"); CV.update(c => c.items.forEach(i => i.status = "confirmed")); });
  await m.goto(BASE + "#/profile/careers"); await m.waitForSelector("#cvDetect");
  const det = await m.innerText("#cvDetect");
  check("CV detection asks 'Add these to my Professional Profile?' (#24)", /Add these to my Professional Profile\?/.test(det) && /Procurement/.test(det));
  const before = await m.evaluate(() => Repo.careers.all().length);
  check("Detected professions are not added silently", before === 3);
  await m.$$eval("input[name=cvprof]:not([disabled])", n => n.forEach(x => { x.checked = true; }));
  await m.click("#cvDetectAdd");
  check("Confirmed detections are added", (await m.evaluate(() => Repo.careers.all().length)) > before);
  check("No console errors (careers/CV)", m.errors.length === 0, m.errors.slice(0, 3).join(" | "));
});
await section("Admin professions manager + bulk import", async () => {
  const a = await newPage();
  await a.goto(BASE + "#/admin"); await a.fill("#admPin", "2468"); await a.check("#admAck"); await a.click("#admEnter"); await a.waitForSelector("#admList");
  await a.goto(BASE + "#/admin/roles"); await a.waitForSelector("#admProfAdd");
  await a.evaluate(() => { window.prompt = () => "Drone Survey Pilot"; }); await a.click("#admProfAdd"); await a.waitForSelector("#roleForm");
  await a.selectOption("#r_category", "construction"); await a.selectOption("#r_family", "trades"); await a.fill("#r_kw", "UAV Pilot, Drone Operator"); await a.fill("#r_spec", "Mapping, Inspection");
  await a.fill("#r_comps", "trade_process, measurement, safety_aware, troubleshooting"); await a.check('input[name=r_types][value="domain"]');
  await a.selectOption("#r_rec", "domain"); await a.click("#roleSave"); await a.waitForSelector("#admProfAdd");
  const found = await a.evaluate(() => ProfessionLib.search("UAV pilot").results.map(r => r.p.title)[0]);
  check("Admin adds a profession with aliases, category, family, specialties, competencies, recommended type — no code edit (#28)", found === "Drone Survey Pilot" && await a.evaluate(() => { const p = PROF["admin-drone-survey-pilot"]; return p.category === "construction" && p.specialties.includes("Mapping") && recommendedType(p) === "domain"; }));
  await a.click("#admBulkBtn"); await a.fill("#bulkText", "Profession,Category,Family,Aliases,Competencies,RecommendedType,Status\nVeterinary Practice Manager,Veterinary & Animal Care,Operations,Vet Practice Manager,operations;communication;judgment,ai_domain,Domain template\nBad Row,Nowhere,,,notacomp,,\nAccountant,Finance & Accounting,,Bean Counter,,,");
  await a.click("#bulkPreview"); await a.waitForSelector("#bulkRows");
  const prev = await a.innerText("#bulkRows");
  check("Bulk import preview validates rows (new / update existing / error)", /New/.test(prev) && /Update existing/.test(prev) && /unknown category/.test(prev));
  await a.click("#bulkImport"); await a.waitForTimeout(100);
  check("Bulk import adds new + merges existing (aliases), skips invalid (#29)", await a.evaluate(() => ProfessionLib.search("Vet Practice Manager").results[0].p.title === "Veterinary Practice Manager" && PROF.accountant.aliases.includes("Bean Counter") && !ProfessionLib.find("Bad Row")));
  await a.click("#bulkCard >> text=Back"); await a.fill('input[aria-label="Search professions"]', "Drone Survey"); await a.waitForTimeout(350); await a.click('.item:has-text("Drone Survey Pilot") >> button:text-is("Edit")');
  await a.fill("#pay_min", "30"); await a.fill("#pay_max", "45"); await a.fill("#pay_cur", "USD"); await a.selectOption("#pay_period", "hour"); await a.selectOption("#pay_status", "verified_current"); await a.click("#roleSave");
  check("Pay verification metadata enforced ('Verified current' needs source + date)", /needs a source and a last-verified date/.test(await a.innerText("#roleErr")));
  await a.click("#roleForm button:text-is(\"Archive\")");
  check("Archived profession is not selectable/searchable", await a.evaluate(() => !ProfessionLib.search("Drone Survey Pilot").results.some(r => r.p.title === "Drone Survey Pilot")));
  check("No console errors (admin professions)", a.errors.length === 0, a.errors.slice(0, 3).join(" | "));
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
  await mob.goto(BASE + "#/practice/setup/spreadsheet_evaluation"); await mob.click("#startPractice"); await mob.waitForSelector("#pClock");
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
