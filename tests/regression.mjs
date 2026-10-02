/* Browser regression suite for Interview IQ (Playwright + Chromium).
 *
 *   python3 -m http.server 4555 &          # from the repo root
 *   node tests/regression.mjs              # BASE_URL defaults to http://localhost:4555/
 *
 * Playwright is resolved from PLAYWRIGHT_MODULE, then the local/global "playwright" package.
 * CHROMIUM_PATH can point at a specific Chromium binary.
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

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
async function newPage(viewport = { width: 1280, height: 900 }, init) {
  const ctx = await browser.newContext({ viewport });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", e => page.errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/favicon/.test(m.text())) page.errors.push(m.text()); });
  page.on("dialog", d => d.accept());
  return page;
}
const appText = p => p.$eval("#app", n => n.innerText.replace(/\s+/g, " "));

/* 1. Launch + home */
const p = await newPage();
await p.goto(BASE);
await p.waitForSelector(".hero");
const home = await appText(p);
check("App launches and home renders", /PRACTICE REALISTIC AI-LED INTERVIEWS/i.test(home) && /START INTERVIEW/i.test(home) && /PRACTICE AI TASKS/i.test(home));
check("Home shows BSP AI WorkReady + Interview IQ hierarchy", /BSP AI WorkReady/i.test(home) && /Interview IQ/i.test(home));
check("Home lists the six features", ["Voice Interviews","Text Interviews","Domain Expert Interviews","AI Evaluation Interviews","Adaptive Follow-Ups","Detailed Feedback"].every(f => home.includes(f)));

/* 2. Every navigation link resolves to a non-empty page */
const hrefs = await p.$$eval("#mainNav a[href]", as => as.map(a => a.getAttribute("href")));
check("Navigation has all 13 destinations", hrefs.length === 13, hrefs.join(" "));
for (const h of hrefs) {
  await p.goto(BASE + h); await p.waitForTimeout(80);
  const t = (await appText(p)).trim();
  check(`Nav ${h} renders`, t.length > 40 && !/Something went wrong/.test(t));
}
await p.goto(BASE + "#/");
await p.click('.dd[data-nav="interview"] .ddbtn');
check("Interview dropdown opens on click", await p.isVisible('.dd[data-nav="interview"] .ddmenu'));
await p.click('.dd[data-nav="interview"] .ddmenu a[href="#/interview/alex"]');
await p.waitForTimeout(80);
check("Dropdown link navigates (Interview With Alex)", /Meet Alex/.test(await appText(p)));
check("Alex identity shown", /ALEX/.test(await appText(p)) && /BSP AI Interviewer/.test(await appText(p)));
await p.goto(BASE + "#/does-not-exist"); await p.waitForTimeout(80);
check("Unknown route falls back to home (no blank screen)", /PRACTICE REALISTIC/i.test(await appText(p)));

/* 3. Profession search + library size */
await p.goto(BASE + "#/interview/start"); await p.waitForSelector("#profSearch");
const total = await p.$$eval("#profList .pchip", n => n.length);
check("At least 30 professions available", total >= 30, `${total} professions`);
check("Search placeholder text", (await p.getAttribute("#profSearch", "placeholder")) === "Search nurse, accountant, teacher, engineer...");
await p.fill("#profSearch", "nurse");
const nurse = await p.$$eval("#profList .pchip", n => n.map(x => x.textContent));
check("Search 'nurse' finds nursing roles", nurse.some(t => /Registered Nurse/.test(t)) && nurse.some(t => /Nurse Practitioner/.test(t)), nurse.join(", "));
await p.fill("#profSearch", "zzzz-nothing");
check("Empty search offers custom profession", /add it below as a custom profession/i.test(await p.innerText("#profList")));
await p.fill("#profSearch", "");
check("Continue disabled until a profession is chosen", await p.isDisabled(".wizfoot .btn.primary"));

/* 4. Custom profession */
await p.click("text=Add My Profession");
await p.click("text=Create my interview profile");
check("Custom profession validates required fields", /job title/i.test(await p.innerText("#cpErr")));
await p.fill("#cpTitle", "Veterinary Technician");
await p.fill("#cpIndustry", "Animal health");
await p.fill("#cpResp", "Monitoring anaesthesia, Preparing surgical equipment, Client education");
await p.click("text=Create my interview profile");
await p.waitForTimeout(80);
check("Custom profession created and selected", /Selected: Veterinary Technician/.test(await appText(p)));
check("Custom profession listed under My Professions", /My Professions/i.test(await p.innerText("#profList")));

/* 5. Transferable-skills rule */
await p.fill("#profSearch", "janitor"); await p.click('#profList .pchip:has-text("Janitor")');
await p.click("text=Continue →"); await p.click("text=Continue →");
const tTxt = await appText(p);
const domainDisabled = await p.$eval('.opt:has-text("DOMAIN EXPERT INTERVIEW")', b => b.disabled);
check("Transferable role: Transferable Skills Interview recommended, domain disabled",
  domainDisabled && /TRANSFERABLE SKILLS INTERVIEW\s*Recommended|Recommended\s*TRANSFERABLE SKILLS INTERVIEW/i.test(tTxt.replace(/\n/g, " ")) || (domainDisabled && /No profession-specific AI job is invented/.test(tTxt)));

/* 6. Full setup flow for Project Manager */
await p.click(".step >> text=Profession");
await p.fill("#profSearch", "project manager"); await p.click('#profList .pchip:has-text("Project Manager")');
await p.click("text=Continue →");
await p.click('.opt:has-text("TEXT")'); check("Mode selection works", await p.$eval('.opt:has-text("TEXT")', b => b.classList.contains("sel")));
await p.click("text=Continue →");
await p.click('.opt:has-text("AI DOMAIN EXPERT INTERVIEW")');
check("Interview type selection works", await p.$eval('.opt:has-text("AI DOMAIN EXPERT INTERVIEW")', b => b.classList.contains("sel")));
await p.click("text=Continue →");
await p.click('.opt:has-text("Experienced")'); check("Experience selection works", await p.$eval('.opt:has-text("Experienced")', b => b.classList.contains("sel")));
await p.click("text=Continue →");
check("Adaptive difficulty is recommended", /Adaptive\s*Recommended|Recommended\s*Adaptive/i.test(await appText(p)));
await p.click('.opt:has-text("Adaptive")'); check("Difficulty selection works", await p.$eval('.opt:has-text("Adaptive")', b => b.classList.contains("sel")));
await p.click("text=Continue →");
await p.click('.opt:has-text("QUICK")'); check("Length selection works", await p.$eval('.opt:has-text("QUICK")', b => b.classList.contains("sel")));
await p.click('.opt:has-text("STANDARD")');
await p.click("text=Review summary →");
const sum = (await appText(p)).replace(/\s+/g, " ");
check("Setup summary is correct", /YOUR INTERVIEW/i.test(sum) && /Profession Project Manager/.test(sum) && /Interviewer Alex/.test(sum) && /Mode Text/.test(sum)
  && /Interview AI Domain Expert/.test(sum) && /Experience Experienced/.test(sum) && /Difficulty Adaptive/.test(sum) && /Questions 10/.test(sum), sum.slice(0, 300));
await p.fill("#candName", "Tolu");
await p.click("text=Start interview with Alex");
await p.waitForSelector(".qbox");

/* 7. Session model */
const sess = await p.evaluate(() => App.session);
const keys = ["sessionId","profession","interviewType","mode","experienceLevel","difficulty","questionTarget","currentQuestion","answers","followUps","startedAt","completedAt","status","scores","feedback"];
check("Starting interview creates a valid session", keys.every(k => k in sess) && sess.status === "in_progress" && sess.questionTarget === 10 && sess.profession.title === "Project Manager", keys.filter(k => !(k in sess)).join(","));
const stored = await p.evaluate(() => Repo.sessions.get(App.session.sessionId));
check("Session persisted to storage", !!stored && stored.status === "in_progress");
const intro = await p.innerText(".alexsay");
check("Alex introduction (personalised + profession-specific)", /Hi Tolu, I'm Alex, your AI interviewer from BSP AI WorkReady/.test(intro) && /Today we'll be completing a Project Manager AI Domain Expert Interview/.test(intro), intro);

/* 8. Answer through to the report (typed) */
const goodAnswer = "First, I would identify the risk and its likelihood and impact, assign an owner and a mitigation, because unmanaged risk becomes schedule slip. For example, in my last project a vendor delay threatened our critical path by 5 days; therefore I escalated to stakeholders, agreed a contingency and tracked it in the risk register until it closed. As a result we delivered on time.";
let guard = 0;
while (guard++ < 30) {
  const onReport = await p.$(".ring");
  if (onReport && /interview report/i.test(await appText(p))) break;
  await p.fill("#typeBox", guard % 4 === 0 ? "I guess I would just do it." + " ok".repeat(4) : goodAnswer);
  await p.click("#nextBtn"); await p.waitForTimeout(60);
}
const rep = await appText(p);
check("Interview completes and report renders", /interview report/i.test(rep) && /Question-by-question feedback/.test(rep));
check("Alex closes the interview", /That concludes today's interview/.test(rep));
const done = await p.evaluate(() => Repo.sessions.all()[0]);
check("Session completed with scores and feedback", done.status === "completed" && done.answers.length === 10 && typeof done.scores.overall === "number" && !!done.feedback && Object.keys(done.scores.competencies).length >= 3,
  `answers=${done.answers.length} followUps=${done.followUps.length}`);
check("Report includes competency breakdown", /Risk Management|Stakeholder Management|AI Project Evaluation/.test(rep));
const praise = done.answers.map(a => (a.followUp && a.followUp.question) || "").join(" ") + (done.lastTransition || "");
check("Alex stays neutral (no 'Great answer/Perfect/Excellent')", !/great answer|perfect!|excellent!/i.test(praise + rep));

/* 9. Resume after reload */
await p.goto(BASE + "#/interview/start"); await p.waitForSelector("#stepper");
await p.click(".step >> text=Summary"); await p.click("text=Start interview with Alex"); await p.waitForSelector(".qbox");
await p.fill("#typeBox", goodAnswer); await p.click("#nextBtn"); await p.waitForTimeout(80);
await p.reload(); await p.waitForSelector(".qbox");
const resumed = await p.evaluate(() => ({ n: App.session.answers.length, st: App.session.status }));
check("In-progress interview survives a page reload", resumed.st === "in_progress" && resumed.n >= 1, JSON.stringify(resumed));
await p.click("text=End interview"); await p.waitForTimeout(100);
check("End interview early still produces a report", /interview report/i.test(await appText(p)));

/* 10. Practice Lab */
await p.goto(BASE + "#/practice"); await p.waitForSelector(".linkcard");
await p.click(".linkcard >> nth=0"); await p.waitForSelector("#ptText");
await p.click('.opt:has-text("Response B")');
await p.fill("#ptText", "Response B follows the two sentences instruction for a child audience, simple and accurate without jargon; A ignores the length constraint.");
await p.click("text=Submit"); await p.waitForSelector("#ptResult");
check("Practice task scores and explains", /Your result/.test(await appText(p)) && /matches the expected answer/.test(await appText(p)));
await p.goto(BASE + "#/practice/history"); await p.waitForTimeout(60);
check("Practice history lists the attempt", /Follow the constraint/.test(await appText(p)));

/* 11. Progress + results + history pages with data */
for (const [h, re] of [["#/progress", /Interview-ready|Nearly ready|Building foundations/], ["#/progress/skills", /Competencies/i], ["#/progress/activity", /Practice Lab/], ["#/results", /All reports/], ["#/interview/history", /Report/]]) {
  await p.goto(BASE + h); await p.waitForTimeout(60);
  check(`${h} shows data`, re.test(await appText(p)));
}
check("No console errors on desktop run", p.errors.length === 0, p.errors.slice(0, 3).join(" | "));

/* 12. Voice mode renders mic controls */
const v = await newPage();
await v.goto(BASE + "#/interview/start"); await v.waitForSelector("#profSearch");
await v.click('#profList .pchip:has-text("Data Analyst")'); await v.click("text=Continue →");
await v.click('.opt:has-text("VOICE")'); await v.click(".step >> text=Summary");
await v.click("text=Start interview with Alex"); await v.waitForSelector(".qbox");
const hasMic = await v.$("#micBtn");
check("Voice mode shows mic + type fallback", !!hasMic ? !!(await v.$("text=Type instead")) : !!(await v.$("#typeBox")));
check("No console errors in voice mode", v.errors.length === 0, v.errors.slice(0, 3).join(" | "));

/* 13. v1 history migration */
const m = await newPage(undefined, () => {
  if (!localStorage.getItem("ia_history")) localStorage.setItem("ia_history", JSON.stringify([{ date: "1/2/2026, 10:00:00 AM", candidate: "Ada", platform: "outlier", domain: "Finance / Accounting", score: 64,
    answers: [{ q: "Old question?", hint: "h", answer: "old answer text here", seconds: 30, score: 64, wc: 3, dims: { Relevance: 60, Depth: 50, Structure: 70, Specificity: 40 }, feedback: ["tip"] }],
    cfg: { domain: "finance", difficulty: "standard", count: 6, voice: true }, candidateObj: { name: "Ada" } }]));
});
await m.goto(BASE + "#/results"); await m.waitForTimeout(100);
check("v1 history migrated into results", /Finance \/ Accounting/.test(await appText(m)));
await m.click("#app a:has-text('View')"); await m.waitForTimeout(80);
check("Migrated v1 report opens", /Old question\?/.test(await appText(m)));
check("No console errors in migration run", m.errors.length === 0, m.errors.slice(0, 3).join(" | "));

/* 14. Mobile setup flow */
const mob = await newPage({ width: 390, height: 844 });
await mob.goto(BASE);
await mob.click("#navToggle");
check("Mobile menu opens", await mob.isVisible('#mainNav a[href="#/interview/start"]'));
await mob.click('#mainNav a[href="#/interview/start"]'); await mob.waitForSelector("#profSearch");
const overflow = await mob.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("Mobile setup has no horizontal overflow", overflow <= 0, `overflow=${overflow}px`);
await mob.fill("#profSearch", "accountant"); await mob.click('#profList .pchip:has-text("Accountant")');
for (let i = 0; i < 5; i++) await mob.click("text=Continue →");
await mob.click("text=Review summary →");
await mob.click("text=Start interview with Alex"); await mob.waitForSelector(".qbox");
const mOverflow = await mob.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("Mobile interview screen usable (no overflow)", mOverflow <= 0, `overflow=${mOverflow}px`);
check("No console errors on mobile", mob.errors.length === 0, mob.errors.slice(0, 3).join(" | "));

/* 15. Alex naming consistency in visible UI */
let banned = false;
for (const h of ["#/", "#/interview/alex", "#/about", "#/interview/start"]) { await p.goto(BASE + h); await p.waitForTimeout(50); if (/AI Bot|Virtual Recruiter|Interview Bot|Career Bot|AI Agent/i.test(await p.innerText("body"))) banned = true; }
check("Alex is never called a bot/recruiter/agent", !banned);

await browser.close();
console.log(results.join("\n"));
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
