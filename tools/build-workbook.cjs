// Builds members/downloads/sold-out-launch-studio-workbook.pdf from the Studio's own content
// (days.js, scripts.js, businesses.js and the post/live data in studio.js), so the PDF never drifts from the app.
// Run: node tools/build-workbook.cjs   (needs Playwright + Chromium)
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, ".."), LC = path.join(ROOT, "launch-calendar");
const ctx = {}; vm.createContext(ctx);
for (const f of ["businesses.js", "days.js", "scripts.js"]) vm.runInContext(fs.readFileSync(path.join(LC, f), "utf8"), ctx);
const studio = fs.readFileSync(path.join(LC, "studio.js"), "utf8");
function grab(name) { // top-level `var NAME = …` up to the next top-level declaration
  const i = studio.indexOf("\nvar " + name + " = "); if (i < 0) throw new Error("missing " + name);
  const rest = studio.slice(i + 1), m = rest.slice(1).search(/\n(var |function |\/\*)/);
  vm.runInContext(rest.slice(0, m + 1), ctx);
}
["WEEKS", "AFTER", "POSTS", "LIVE_P", "LIVE_PARTS", "LIVE_TT"].forEach(grab);
const { BUSINESS_CUSTOM: C, DAYS, SCRIPT_STAGES, WEEKS, AFTER, POSTS, LIVE_P, LIVE_PARTS, LIVE_TT } = ctx;
const P = { thing: C[3], who: C[4], pain: C[5], want: C[6], proof: C[7], bts: C[8], buy: C[9], biz: "[your business]" };
const fill = (s, extra) => String(s).replace(/\{(\w+)\}/g, (m, k) => (extra && extra[k]) || P[k] || "[" + k + "]");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rich = (s) => esc(s).replace(/\[[^\]\n]{1,90}\]/g, (m) => `<span class="ph">${m}</span>`).replace(/\n/g, "<br>");

let h = `<section class="cover"><div class="k">learnwithtolu · member workbook</div><h1>Sold-Out<br><em>Launch Studio</em></h1>
<p class="lede">Your printable launch plan: the 30-day calendar, all 120 launch scripts, the live selling scripts, personal branding posts and your after-launch plan.</p>
<div class="box"><b>How to use this workbook</b><ol><li>Pick your launch date. Day 22 is launch day.</li><li>Each day: do the post, the story or status, and the action. Tick it off.</li><li>Use the scripts for that day's stage. Fill every <span class="ph">[bracket]</span> with your real details.</li><li>Never invent results, testimonials or deadlines. Real beats impressive.</li></ol>
<p>For the interactive version (made for your business, with the AI Script Writer and ✨ Make It Sound Human), open your <b>Members Hub</b> from your purchase email.</p></div></section>`;

h += `<section><h2>The 12 launch stages</h2><div class="grid">` + SCRIPT_STAGES.map((s, i) => `<div class="stg"><b>${i + 1}. ${esc(s.name)}</b><span>${esc(s.goal)}</span></div>`).join("") + `</div></section>`;

h += `<section><h2>The 30-day launch calendar</h2>`;
WEEKS.filter((w) => w.from).forEach((w) => {
  h += `<h3>${esc(w.name)}</h3><p class="why">${esc(w.why)}</p>`;
  for (let n = w.from; n <= w.to; n++) {
    const d = DAYS[n - 1];
    h += `<div class="day"><div class="dh"><span class="circ">${n}</span><b>Day ${n}${n === 22 ? " · Launch Day" : ""}: ${esc(d.title)}</b><span class="tag">${esc(d.set)}</span><span class="tick">☐</span></div>
<p><b>Post:</b> ${rich(d.post)}</p><p><b>Story / Status:</b> ${rich(d.stories)}</p><p><b>Action:</b> ${rich(d.action)}</p>
<p class="hook"><b>Hook to use:</b> ${rich(fill(d.hook))}</p></div>`;
  }
});
h += `<h3>After launch</h3>` + AFTER.map((g) => `<div class="day"><b>${esc(g.h)}</b><ul>${g.items.map((it) => `<li>☐ ${rich(fill(Array.isArray(it) ? it[0] : it))}</li>`).join("")}</ul></div>`).join("") + `</section>`;

let num = 0;
h += `<section><h2>The 120 launch scripts</h2><p class="why">Twelve stages, ten scripts each. Copy, fill the brackets, post.</p>`;
SCRIPT_STAGES.forEach((s) => {
  h += `<h3>${esc(s.name)}</h3><p class="why">${esc(s.goal)}</p>`;
  s.scripts.forEach((sc) => { num++; h += `<div class="script"><b>#${String(num).padStart(3, "0")} · ${esc(sc[0])}</b><p>${rich(fill(sc[1]))}</p></div>`; });
});
h += `</section>`;

h += `<section><h2>Live stream selling scripts</h2><p class="why">25 minutes, timed parts. Read it once before you go live, then talk naturally.</p>`;
[["tiktok", LIVE_TT], ["instagram", LIVE_PARTS]].forEach(([k, parts]) => {
  const L = LIVE_P[k];
  h += `<h3>${esc(L.name)}</h3><p class="why">${esc(L.prep)}</p>` + parts.map((pt, i) => `<div class="script"><b>${esc(pt[0])} · ${i + 1}. ${esc(pt[1])}</b><p class="why">${esc(pt[2])}</p><p>${rich(fill(pt[3], { engage: L.engage, buy: L.buy, pin: L.pin }))}</p></div>`).join("");
});
h += `</section>`;

const postBlock = (it) => `<div class="script"><b>${esc(it[1])}</b><p>${rich(fill(it[2]))}<br>${it[3].map((x) => rich(fill(x))).join("<br>")}<br>${rich(fill(it[4]))}</p></div>`;
h += `<section><h2>Personal branding posts</h2><p class="why">People buy from people. Fill the brackets with your own story, in your own words.</p>${POSTS.brand.map(postBlock).join("")}</section>`;
h += `<section><h2>After-launch posts</h2>${POSTS.after.map(postBlock).join("")}</section>`;
h += `<section class="end"><h2>You've got this</h2><p>Show up every day, answer every message and celebrate every buyer. Questions? learnwithtolu@gmail.com</p></section>`;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@page{size:A4;margin:16mm 14mm}*{box-sizing:border-box}body{font-family:Poppins,"Segoe UI",Arial,sans-serif;color:#0c2142;font-size:10.5pt;line-height:1.5;margin:0}
.k{font-size:8pt;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#b8862b}
.cover{background:#07152b;color:#f5f1e6;margin:-16mm -14mm 0;padding:40mm 18mm;min-height:297mm;page-break-after:always}
.cover h1{font-family:Anton,Impact,sans-serif;font-weight:400;text-transform:uppercase;font-size:46pt;line-height:1;margin:10px 0}
.cover h1 em{font-family:Georgia,serif;text-transform:none;color:#d4a849}.lede{font-size:13pt;color:#dfe6ef;max-width:140mm}
.box{border:1px solid #d4a849;border-radius:12px;padding:14px 18px;margin-top:20mm;color:#f5f1e6}.box ol{padding-left:18px}
section{page-break-before:always}section.cover{page-break-before:auto}
h2{font-family:Anton,Impact,sans-serif;font-weight:400;text-transform:uppercase;font-size:22pt;color:#07152b;border-bottom:3px solid #d4a849;padding-bottom:4px;margin:0 0 8px}
h3{font-size:13pt;color:#7a5a12;margin:16px 0 2px;page-break-after:avoid}.why{color:#4a5b73;margin:2px 0 8px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.stg{border:1px solid #e3d3a8;border-radius:10px;padding:8px 10px}.stg span{display:block;color:#4a5b73;font-size:9.5pt}
.day,.script{border:1px solid #e6dcc2;border-radius:10px;padding:8px 12px;margin:7px 0;page-break-inside:avoid}.day p,.script p{margin:3px 0}
.dh{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.circ{background:#07152b;color:#d4a849;border-radius:50%;width:22px;height:22px;display:inline-grid;place-items:center;font-weight:800;font-size:9pt}
.tag{font-size:8pt;background:#f6efdc;color:#7a5a12;border-radius:99px;padding:1px 8px}.tick{margin-left:auto;font-size:13pt}
.hook{color:#07152b}.cover .ph{color:#07152b}.ph{background:#fff1c9;border-radius:3px;padding:0 2px}ul{margin:4px 0;padding-left:4px;list-style:none}
.end{text-align:center;padding-top:60mm}</style></head><body>${h}</body></html>`;

(async () => {
  const { chromium } = require("playwright");
  const b = await chromium.launch(), pg = await b.newPage();
  await pg.setContent(html, { waitUntil: "load" });
  const out = path.join(ROOT, "members/downloads/sold-out-launch-studio-workbook.pdf");
  await pg.pdf({ path: out, format: "A4", printBackground: true, displayHeaderFooter: true, headerTemplate: "<span></span>",
    footerTemplate: '<div style="font-size:7pt;color:#8a96a8;width:100%;text-align:center">Sold-Out Launch Studio · learnwithtolu · <span class="pageNumber"></span></div>', margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" } });
  await b.close(); console.log("wrote", out, fs.statSync(out).size, "bytes", num, "scripts");
})();
