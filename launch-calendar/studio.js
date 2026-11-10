/* Sold-Out Launch Studio: 30-day calendar + Authority Content Studio.
   Data: businesses.js (BUSINESSES, BUSINESS_CUSTOM) and days.js (DAYS). Everything is saved on this device. */
(function () {
"use strict";
var $ = function (id) { return document.getElementById(id); };
var KEY = "lwt-studio-v2", OLD_KEY = "lwt-launch-calendar-v1", WRITER_KEY = "lwt-script-writer";
var ENDPOINT = "/.netlify/functions/launch-script";

var STAGE_IDS = {"Warm-Up & Visibility":"pre-launch-visibility","Stir the Problem":"problem-awareness","Share Your Story":"storytelling","Prove Your Expertise":"authority","Position Your Offer":"offer-positioning","Gather Your People":"community","Fill Your Waitlist":"waitlist","Build the Hype":"anticipation","Open the Doors":"launch-day","Answer the Doubts":"objections","Show the Proof":"social-proof","Last Call":"urgency"};
var WEEKS = [
  {id:"w1",tab:"Week 1",name:"Week 1 · Get Visible",from:1,to:7,sub:"Warm-Up & Visibility · Stir the Problem",why:"Before anyone buys, they must know the problem exists, and that you exist."},
  {id:"w2",tab:"Week 2",name:"Week 2 · Build Trust & Demand",from:8,to:14,sub:"Share Your Story · Prove Your Expertise · Fill Your Waitlist · Position Your Offer",why:"People buy from people they trust. This week they get to know you and want what's coming."},
  {id:"w3",tab:"Week 3",name:"Week 3 · Reveal & Build Hype",from:15,to:21,sub:"Position Your Offer · Show the Proof · Answer the Doubts · Build the Hype",why:"Show them the offer, prove it works and let them count down with you."},
  {id:"w4",tab:"Week 4",name:"Week 4 · Launch & Sell",from:22,to:28,sub:"Open the Doors · Show the Proof · Answer the Doubts",why:"Doors are open. Show up every day, answer every question and celebrate every buyer."},
  {id:"w5",tab:"Days 29–30",name:"Days 29–30 · Sell Out",from:29,to:30,sub:"Last Call",why:"Don't go quiet at the finish line. The last call matters."},
  {id:"after",tab:"After launch",name:"After launch",sub:"Deliver, collect real reviews, debrief",why:"How you finish this launch sets up the next one."}
];
var FORMATS = [["reel","Reel script","reel"],["carousel","Carousel","carousel"],["story","Story","instagram-stories"],["status","Status post","whatsapp-status"]];
var PILLARS = {
  "Beginner education":["What should someone know before buying {thing}?","What is one thing beginners get wrong about {thing}?","Explain one term or idea your customers often misunderstand."],
  "Common mistakes":["What is one mistake beginners make in your industry?","What mistake costs your customers the most money?","What do people do that makes {pain} worse?"],
  "Myths and misconceptions":["What's a popular belief in your industry that isn't true?","What do people assume about {thing} that's wrong?","What 'rule' do you break in your work, and why?"],
  "Customer problems":["What question do customers ask you most?","What problem do customers come to you with first?","What does life look like for {who} before they find you?"],
  "Lessons from experience":["What's the biggest lesson your business has taught you?","What would you tell yourself on day one?","Tell a story about a customer that changed how you work."],
  "Practical tutorials":["Walk people through one simple step-by-step process.","What's a quick tip people can use today?","How should customers use or care for {thing}?"],
  "Behind-the-scenes expertise":["What does your process look like that customers never see?","What quality checks do you do before anything reaches a customer?","What skills or tools does your work need?"],
  "Service education":["How does buying or booking with you work, step by step?","What's included when someone buys {thing}, and what isn't?","What should customers prepare before working with you?"],
  "Frequently asked questions":["What's the question you answer most in your DMs?","What do people always ask about price, delivery or timing?","What do first-time customers worry about before they buy?"],
  "Market observations":["What change are you seeing in your industry right now?","What trend do you think customers should ignore, and why?","What do customers want today that they didn't a year ago?"]
};
var CATS = [["auth","Authority & education",30],["story","Personal storytelling",25],["engage","Audience engagement",20],["offer","Offer positioning",15],["sell","Direct selling",10]];
var SET_CAT = {"Warm-Up & Visibility":"engage","Stir the Problem":"auth","Share Your Story":"story","Prove Your Expertise":"auth","Position Your Offer":"offer","Gather Your People":"engage","Fill Your Waitlist":"offer","Build the Hype":"engage","Open the Doors":"sell","Answer the Doubts":"offer","Show the Proof":"offer","Last Call":"sell"};
var PILLAR_CAT = {"Lessons from experience":"story","Customer problems":"engage","Frequently asked questions":"engage"};
var AFTER_PILLARS = ["Lessons from experience","Service education","Frequently asked questions","Behind-the-scenes expertise","Market observations","Practical tutorials"];
var TIPS = {reel:"Film in natural light, put the hook on screen in the first second and keep it under 30 seconds.",carousel:"Put your face or your product on the cover slide and keep each slide to one idea.",story:"Post the frames an hour or two apart and use a sticker so people can reply.",status:"Post the first status in the morning and the others through the day so more people see it."};
var AFORMATS = [["facebook","Educational Facebook post"],["carousel","Instagram carousel"],["reel","Reel script"],["caption","Instagram caption"],["status","WhatsApp Status series"],["linkedin","LinkedIn post"],["email","Email newsletter"]];
var AFTER = [
  {h:"Deliver like a pro",items:["Send every buyer a welcome or confirmation message within 24 hours","Tell them exactly what happens next and when","Deliver on time, every time"]},
  {h:"Collect real reviews",items:["Ask once they've had a win, not the day they pay","Make it easy: \"What was your favourite part? What changed for you?\"","Get permission before sharing, and only ever post real reviews"]},
  {h:"Keep the momentum",items:["Post a thank-you and celebrate your community","Share delivery and buyer wins as they come in (with permission)","Open a waitlist for your next round","Check in with people who almost bought"]}
];
var DEBRIEF = [["waitlist","Waitlist size"],["sales","Sales"],["bestDay","Best day"],["bestScript","Best script"],["worked","What worked","full"],["next","Next time I'll…","full"]];
var PROF_FIELDS = ["thing","who","pain","want","proof","bts","buy"];

/* ---------- state ---------- */
function read(k) { try { return JSON.parse(localStorage.getItem(k)) || null; } catch (e) { return null; } }
var st = read(KEY) || {};
if (!st.v) { var old = read(OLD_KEY) || {}; st = {v:2, days:old.days||{}, notes:old.notes||{}, after:old.after||{}, debrief:old.debrief||{}, launch:old.launch||""}; }
["days","notes","after","debrief","fmt"].forEach(function (k) { st[k] = st[k] || {}; });
st.proof = st.proof || []; st.saved = st.saved || []; st.prof = st.prof || null; st.ai = st.ai || {};
function defaultMix() { var m = {}; CATS.forEach(function (c) { m[c[0]] = c[2]; }); return m; }
st.mix = st.mix || defaultMix(); st.ppw = st.ppw || 7;
function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
var ui = {week:null, open:{}, atab:"create", aDay:null, aiText:"", tpl:{}};

/* ---------- helpers ---------- */
function esc(s) { return String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function rich(s) { return esc(s).replace(/\[[^\]\n]{1,80}\]/g, function (m) { return '<span class="ph">' + m + "</span>"; }); }
function toast(t) { var el = $("toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 1900); }
function copyText(t) {
  function fb() { var a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); toast("Copied"); } catch (e) { toast("Select the text and copy it"); } document.body.removeChild(a); }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast("Copied"); }, fb); else fb();
}
function bizRow(id) { if (!id) return null; if (id.indexOf("custom:") === 0) { var r = BUSINESS_CUSTOM.slice(); r[1] = id.slice(7); return r; } for (var i = 0; i < BUSINESSES.length; i++) if (BUSINESSES[i][0] === id) return BUSINESSES[i]; return null; }
function bizName() { var r = bizRow(st.biz); return r ? r[1] : ""; }
function defaults(r) { return {thing:r[3], who:r[4], pain:r[5], want:r[6], proof:r[7], bts:r[8], buy:r[9], experience:"", method:""}; }
function prof() { return st.prof || (bizRow(st.biz) ? defaults(bizRow(st.biz)) : null); }
function fill(s, p) {
  p = p || prof() || defaults(BUSINESS_CUSTOM);
  return String(s).replace(/\{(\w+)\}/g, function (m, k) {
    var v = k === "biz" ? bizName() : p[k]; if (!v) return "[" + k + "]";
    return v;
  }).replace(/(^|[.!?]\s+|\n)([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); });
}

/* ---------- dates & progress ---------- */
function parseDate(v) { if (!/^\d{4}-\d{2}-\d{2}$/.test(v || "")) return null; var p = v.split("-"); return new Date(+p[0], p[1] - 1, +p[2]); }
function dateFor(n) { var l = parseDate(st.launch); if (!l) return null; var d = new Date(l); d.setDate(d.getDate() + (n - 22)); return d; }
function fmtD(d, long) { return d ? d.toLocaleDateString(undefined, long ? {weekday:"long",day:"numeric",month:"long"} : {weekday:"short",day:"numeric",month:"short"}) : ""; }
function nextTodo() { for (var n = 1; n <= 30; n++) if (!st.days[n]) return n; return null; }
function doneIn(w) { var c = 0; for (var n = w.from; n <= w.to; n++) if (st.days[n]) c++; return c; }
function weekOf(n) { for (var i = 0; i < WEEKS.length; i++) if (n >= WEEKS[i].from && n <= WEEKS[i].to) return WEEKS[i].id; return "after"; }
function progress() {
  var c = 0; for (var n = 1; n <= 30; n++) if (st.days[n]) c++;
  $("pText").textContent = c + " of 30 days done"; $("pPct").textContent = Math.round(c / 30 * 100) + "%"; $("pBar").style.width = (c / 30 * 100) + "%";
  $("range").textContent = st.launch ? "Day 1: " + fmtD(dateFor(1)) + " · Cart closes: " + fmtD(dateFor(30)) : "";
}

/* ---------- business picker ---------- */
function renderBiz() {
  var q = ($("bizSearch").value || "").toLowerCase().trim();
  $("bizChips").innerHTML = BUSINESSES.filter(function (b) { return !q || (b[1] + " " + b[2] + " " + b[3]).toLowerCase().indexOf(q) >= 0; })
    .map(function (b) { return '<button class="chip" type="button" data-biz="' + b[0] + '" aria-pressed="' + (st.biz === b[0]) + '">' + esc(b[1]) + "</button>"; }).join("") ||
    '<p class="muted" style="font-size:.88rem">No match. Type your business below.</p>';
  var picked = !!bizRow(st.biz) && !ui.changeBiz;
  $("bizPick").hidden = picked; $("bizPicked").hidden = !picked;
  if (picked) $("bizPicked").innerHTML = '<span>Your business: <b>' + esc(bizName()) + '</b>' + (/^\[/.test(prof().who) ? ' · <a href="#authority" data-goatab="profile">fill in your Profile</a> so every post fits you' : " · posts are made for " + esc(prof().who)) + '</span><span class="acts" style="margin:0"><a class="btn small" href="#authority" data-goatab="profile">Edit profile</a><button class="btn small" type="button" id="bizChange">Change</button></span>';
  $("profBiz").textContent = bizName() || "not picked yet";
}
function pickBiz(id) {
  st.biz = id; st.prof = defaults(bizRow(id)); ui.changeBiz = false; save();
  renderBiz(); renderWeek(); renderProfile(); renderLive(); renderPosts();
  toast(id.indexOf("custom:") === 0 ? "Added. Fill in your Profile so posts fit your business." : "Posts are now made for " + bizName());
}

/* ---------- content generators ---------- */
function gen(d, f) {
  var p = prof(), h = fill(d.hook, p), a = d.pts.map(function (x) { return fill(x, p); }), c = fill(d.cta, p), t = d.title.toUpperCase(), body;
  if (f === "reel") body = "🎬 Shot idea: " + fill(d.shot, p) + "\n\n0–3s · HOOK (say it + put it on screen)\n" + h + "\n\n3–10s\n" + a[0] + "\n\n10–20s\n" + a[1] + " " + a[2] + "\n\nLast 3s · CALL TO ACTION\n" + c + "\n\nCAPTION\n" + h + " " + a[0] + "\n\n" + c;
  else if (f === "carousel") body = "Slide 1 · Hook\n" + h + "\n\nSlide 2\n" + a[0] + "\n\nSlide 3\n" + a[1] + "\n\nSlide 4\n" + a[2] + "\n\nSlide 5 · Call to action\n" + c + "\n\nCAPTION\n" + h + "\n\n" + a[1] + "\n\n" + c;
  else if (f === "story") body = "Frame 1 · Hook\n" + h + "\n\nFrame 2\n" + a[0] + "\n\nFrame 3\n" + d.stories + "\n\nFrame 4 · Call to action\n" + c + " (add a link, poll or question sticker)";
  else body = "Status 1 (morning)\n" + fill(d.status, p) + "\n\nStatus 2 (afternoon)\n" + a[1] + "\n\nStatus 3 (evening)\n" + c;
  return t + "\n\n" + body + "\n\nPosting tip: " + TIPS[f];
}
function cleanAI(t) { return String(t).replace(/\*\*/g, "").replace(/^#{1,6}\s*/gm, "").replace(/^\s*SCRIPT\s*\n/, ""); }
function writerLink(n, platform) {
  var d = DAYS[n - 1], p = prof(), q = "stage=" + STAGE_IDS[d.set] + "&platform=" + platform;
  if (bizRow(st.biz)) q += "&type=" + encodeURIComponent(bizName()) + "&audience=" + encodeURIComponent(p.who) + "&problem=" + encodeURIComponent(p.pain);
  return "/script-writer/?" + q;
}

/* ---------- after-launch + personal branding posts ---------- */
var POST_FORMATS = [["caption","Instagram caption"],["reel","Instagram Reel / TikTok video"],["story","Instagram Story"],["status","WhatsApp status"]];
var POSTS = {
  after: [
    ["delivery","Delivery post","Orders are on their way! 📦",["Thank you to everyone who bought [offer name].","Here's what happens next: [delivery or start details].","Behind the scenes right now: {bts}."],"Already bought? Reply and tell me when yours arrives."],
    ["review","Review request","Can I ask you a small favour? 🙏",["If you've started using your {thing}, I'd love to hear how it's going.","What did you like most? What changed for you?","With your permission, I may share your words to help others decide."],"Reply with a few words or send a short video. It means the world."],
    ["keepselling","Keep-selling content","Missed the launch? You can still get it.",["[Offer name] helps {who} {want}.","Here's what a customer said: \"[real review, shared with permission]\".","[How to buy now, and any real limit]."],"Ready? {buy} here: [link]."],
    ["weekly","Weekly value post","Quick tip for {who} 💡",["[Your tip of the week]","Why it matters: it helps you {want}.","Try it this week and tell me how it goes."],"Save this for later and share it with a friend."],
    ["thanks","Thank-you post","Thank you. This launch happened because of you. 💛",["[What you loved about this launch]","[What you learned]","If you missed it: [how to join the next round]."],"Comment 💛 if you were part of it."]
  ],
  brand: [
    ["story","My story post","How I started selling {thing}.",["[Where you were before you started]","[The moment you decided to start]","Today I help {who} {want}."],"What's your story? Tell me below."],
    ["meet","Meet-the-person post","Hi, I'm [your name] 👋, the person behind [business name].",["I help {who} {want}.","3 things about me: [fact 1], [fact 2], [fact 3].","Something you might not know: [a personal detail you're happy to share]."],"Say hi in the comments and tell me one thing about you!"],
    ["stand","What I stand for","Here's what I'll never do in my business.",["I'll never [a practice you refuse].","I'll always [a promise you keep].","Because {who} deserve better than {pain}."],"If you agree, you're my kind of person. Follow for more."],
    ["mistake","Lesson from a mistake","The mistake that taught me the most.",["[What went wrong]","[What it cost you]","[What you do differently now]"],"Have you made this mistake? Tell me below."],
    ["expertise","Prove your expertise","What most people don't know about {thing}.",["[Insight 1 from your own experience]","[Insight 2]","[One quick tip anyone can use today]"],"Questions? Ask me in the comments. I answer every one."],
    ["dayinlife","A day in my life","A real day in my life running my business. ☀️",["Morning: [how your day starts]","Midday: {bts}","Evening: [how you wind down]"],"What does your day look like? Tell me below."],
    ["why","Why I started","Why I really started this business.",["[The moment you decided]","[What you were tired of seeing: {pain}]","Now I help {who} {want}."],"What made you start your thing? I'd love to know."],
    ["bts","Behind the scenes","What you don't see behind the scenes. 🎬",["Right now I'm {bts}.","[A detail customers never notice but you care about]","[Why it matters to you]"],"Want more behind-the-scenes? Comment MORE."],
    ["unpopular","Unpopular opinion","Unpopular opinion about {thing}… 👀",["[Your honest opinion]","[Why you believe it, from your experience]","[What you do differently because of it]"],"Agree or disagree? Tell me in the comments."],
    ["lessons","3 things I've learned","3 things running this business has taught me:",["1. [Lesson 1]","2. [Lesson 2]","3. [Lesson 3]"],"Which one hits home for you?"],
    ["askme","Questions people ask me","The questions people ask me most, answered.",["\"[Question 1]\" → [your answer]","\"[Question 2]\" → [your answer]","\"[Question 3]\" → [your answer]"],"Got another question? Drop it below."],
    ["win","A small win I'm proud of","A small win I'm proud of this week. 🙌",["[What happened]","[Why it matters to you]","[What it taught you]"],"Share a win of yours. Big or small, it counts."],
    ["fear","What I was scared of","Something I was scared to do in my business.",["[The fear]","[What you did anyway]","[What happened, honestly]"],"What's one thing you're scared to try? You've got this."],
    ["customer","The customer who changed me","A customer who changed how I work.",["[What happened, without private details]","[What you learned from them]","[What you do differently now]"],"Thank you to every customer who teaches me something. 💛"],
    ["tools","Tools I can't work without","Tools I can't run my business without:",["[Tool or habit 1] for [why]","[Tool or habit 2] for [why]","[Tool or habit 3] for [why]"],"What's one tool you swear by?"],
    ["myth","A myth about my industry","Let's bust a myth about {thing}.",["MYTH: [the common belief]","TRUTH: [what's actually true]","[How you know, from your own work]"],"Did you believe this one? Be honest. 😄"],
    ["younger","Advice to my younger self","What I'd tell myself on day one of this business:",["[Advice 1]","[Advice 2]","[Advice 3]"],"What would you tell your younger self?"],
    ["favourite","My favourite part of what I do","My favourite part of what I do. 💛",["[The moment you love most]","[Why it matters to you]","Helping {who} {want} never gets old."],"What's your favourite part of your work?"],
    ["thanks","Thank you to my community","A thank-you to everyone who supports this page. 🙏",["[What your community means to you]","[A moment that touched you]","[A promise for what's next]"],"Comment 💛 so I can say thank you personally."],
    ["next","Where I'm going next","Here's where I'm taking this business next.",["[Your next goal]","[Why it matters]","[How your audience can be part of it]"],"Want to come along? Follow so you don't miss it."]
  ]
};
var POST_TIPS = {caption:"Use a photo of your face or your work, and put the first line where people can see it before 'more'.",reel:"Film in natural light, say the hook in the first second and keep it under 30 seconds.",story:"Post the frames an hour or two apart and add a question or poll sticker.",status:"Post one status in the morning, one in the afternoon and one in the evening."};
function postText(g, id, f) {
  var it = POSTS[g].filter(function (x) { return x[0] === id; })[0], p = prof() || defaults(BUSINESS_CUSTOM);
  var h = fill(it[2], p), a = it[3].map(function (x) { return fill(x, p); }), c = fill(it[4], p), body;
  if (f === "reel") body = "🎬 Shot idea: face to camera, then show your work or your product\n\n0–3s · HOOK (say it + put it on screen)\n" + h + "\n\n3–15s\n" + a[0] + " " + a[1] + "\n\n15–25s\n" + a[2] + "\n\nLast 3s · CALL TO ACTION\n" + c;
  else if (f === "story") body = "Frame 1 · Hook\n" + h + "\n\nFrame 2\n" + a[0] + "\n\nFrame 3\n" + a[1] + "\n\nFrame 4\n" + a[2] + "\n\nFrame 5 · Call to action\n" + c + " (add a question or link sticker)";
  else if (f === "status") body = "Status 1 (morning)\n" + h + "\n\nStatus 2 (afternoon)\n" + a[0] + " " + a[1] + "\n\nStatus 3 (evening)\n" + a[2] + " " + c;
  else body = h + "\n\n" + a[0] + "\n\n" + a[1] + "\n\n" + a[2] + "\n\n" + c + "\n\n#[yourniche] #[yourcity]";
  return it[1].toUpperCase() + "\n\n" + body + "\n\nPosting tip: " + POST_TIPS[f];
}
function renderPosts() {
  st.posts = st.posts || {};
  ["after", "brand"].forEach(function (g) {
    var cur = st.posts[g] || {}, sel = document.querySelector('[data-postfmt="' + g + '"]');
    document.querySelector('[data-group="' + g + '"]').innerHTML = POSTS[g].map(function (x) { return '<button class="chip" type="button" data-post="' + g + ":" + x[0] + '" aria-pressed="' + (cur.id === x[0]) + '">' + esc(x[1]) + "</button>"; }).join("");
    if (!sel.options.length) sel.innerHTML = POST_FORMATS.map(function (f) { return '<option value="' + f[0] + '">' + f[1] + "</option>"; }).join("");
    sel.value = cur.f || "caption";
    var out = document.querySelector('[data-postout="' + g + '"]');
    out.innerHTML = cur.id ? '<div class="out" style="margin-top:12px">' + rich(postText(g, cur.id, sel.value)) + '</div><div class="acts"><button class="btn small solid" type="button" data-postcopy="' + g + '">Copy</button></div>' +
      (bizRow(st.biz) ? "" : '<p class="muted" style="font-size:.84rem;margin-top:8px">Pick your business at the top so this post fits you.</p>') : "";
  });
}

/* ---------- live stream selling script (bonus) ---------- */
var LIVE_P = {
  tiktok: {name:"TikTok LIVE", ai:"tiktok-live", engage:"Tap the screen a few times if you can hear me, and share this LIVE with one friend who needs it.", buy:"tap the link in my bio or comment [KEYWORD] and I'll send it to you", pin:"Pin a comment: \"How to buy: [link in bio / comment KEYWORD]\".",
    prep:"Before you go live: test your sound and light, write your pinned comment, and post a video earlier today saying what time you'll be live. TikTok LIVE needs your account to meet TikTok's LIVE requirements."},
  instagram: {name:"Instagram LIVE", ai:"instagram-live", engage:"Drop a 🔥 in the comments if you can hear me, and tell me where you're watching from.", buy:"DM me the word [KEYWORD] or tap the link in my bio", pin:"Pin a comment: \"How to buy: DM me [KEYWORD] or tap the link in my bio\".",
    prep:"Before you go live: post a Story with a countdown sticker, test your sound and light, and write your pinned comment. After the LIVE, share the replay so people who missed it can watch."}
};
var LIVE_PARTS = [
  ["0:00–2:00","Opening hook","Grab attention and give people a reason to stay.",
   "SAY: \"Hi, hi, welcome! If you're {who} and you're tired of {pain}, stay with me for the next 25 minutes, because I'm going to show you how to {want}.\"\nSAY: \"{engage}\"\nDO: Start talking straight away. Don't wait for people to join; the replay and new viewers will catch up."],
  ["2:00–5:00","Introduction","Say who you are and what this LIVE is about.",
   "SAY: \"If you're new here, I'm [your name] and I help {who}. [One true line about your experience].\"\nSAY: \"Here's the plan: first I'll teach you [today's topic], then I'll show you something I've made for you, and then I'll answer all your questions.\"\nDO: Greet people by name as they join. Every few minutes say: \"If you just joined, welcome! We're talking about [today's topic].\""],
  ["5:00–11:00","Teaching","Give real value so people trust you before you sell.",
   "SAY: \"The biggest mistake I see is [common mistake].\"\nSAY: \"Here's what to do instead: [tip 1]. [tip 2]. [tip 3].\"\nDO: Show it, don't just say it: [demonstrate your {thing} / show a real before-and-after / share your screen].\nASK: \"Type YES if this is helpful.\""],
  ["11:00–16:00","Showing the offer","Show exactly what they get, what it costs and how to buy.",
   "SAY: \"Now, I promised to show you something. This is [offer name].\"\nSAY: \"It's for {who} who want to {want}. Here's what you get: [what's included].\"\nSAY: \"The price is [price]. For people on this LIVE only: [LIVE-only bonus or offer, only if it's real].\"\nDO: Hold it close to the camera or show it on screen. {pin}"],
  ["16:00–22:00","Answering comments","Read questions out loud and answer them; every answer is a mini sales pitch.",
   "SAY: \"Let me answer your questions.\" Read each comment out loud, then answer.\nPREPARE:\n• \"How much is it?\" → [price and payment options]\n• \"How do I get it?\" → \"{buy}.\"\n• \"Is it for me?\" → \"It's for you if [who it's for]. It's not for you if [who it's not for].\"\n• \"How long does it take?\" → [delivery or start time]\nDO: Every few minutes, recap for new viewers: \"If you just joined: [one-line offer]. To get it, {buy}.\""],
  ["22:00–25:00","Close with a call to buy","Make one clear ask, then thank everyone.",
   "SAY: \"Before I go: [offer name] helps you {want}. If you want it, {buy} right now.\"\nSAY: \"[Real deadline or limit, only if it's true].\"\nSAY: \"Thank you so much for being here. If you bought today, check your DMs for [next step].\"\nDO: Stay on a minute or two for last questions, then follow up with everyone who asked but didn't buy."]
];
function liveText(k, i) {
  var P = LIVE_P[k], pr = prof() || {}, pt = LIVE_PARTS[i];
  var v = {who:pr.who, pain:pr.pain, want:pr.want, thing:pr.thing, engage:P.engage, buy:P.buy, pin:P.pin};
  var body = pt[3].replace(/\{(\w+)\}/g, function (m, key) { var x = v[key]; return x && !/^\[/.test(x) ? x : "[" + ({who:"who you help", pain:"the problem you solve", want:"the result they get", thing:"product"}[key] || key) + "]"; });
  return pt[0] + " · " + pt[1].toUpperCase() + "\n" + body;
}
function renderLive() {
  var k = st.live || "tiktok", P = LIVE_P[k];
  document.querySelectorAll("[data-live]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.live === k); });
  $("livePrep").textContent = P.prep;
  $("liveParts").innerHTML = LIVE_PARTS.map(function (pt, i) {
    return '<div class="part"><div class="part-h"><span><span class="time">' + pt[0] + "</span> · <b>" + (i + 1) + ". " + pt[1] + '</b></span><button class="btn small" type="button" data-livecopy="' + i + '">Copy</button></div><p class="goal">' + pt[2] + '</p><div class="out">' + rich(liveText(k, i).split("\n").slice(1).join("\n")) + "</div></div>";
  }).join("");
  var pr = prof(), q = "stage=live-selling&platform=" + P.ai;
  if (bizRow(st.biz)) q += "&type=" + encodeURIComponent(bizName()) + (pr && !/^\[/.test(pr.who) ? "&audience=" + encodeURIComponent(pr.who) + "&problem=" + encodeURIComponent(pr.pain) : "");
  $("liveAI").href = "/script-writer/?" + q;
}

/* ---------- calendar ---------- */
function renderTabs() {
  $("weekTabs").innerHTML = WEEKS.map(function (w) {
    var t = w.from ? w.to - w.from + 1 : 0, d = t ? doneIn(w) : 0;
    return '<button class="tab' + (t && d === t ? " full" : "") + '" type="button" data-week="' + w.id + '" aria-pressed="' + (ui.week === w.id) + '">' + w.tab + (t ? " · " + d + "/" + t : "") + "</button>";
  }).join("");
}
function dayHTML(n) {
  var d = DAYS[n - 1], done = !!st.days[n], open = !!ui.open[n], date = dateFor(n), nx = nextTodo() === n;
  var f = st.fmt[n] || "reel", has = !!bizRow(st.biz), stage = n <= 21 ? "Pre-launch authority" : "Launch authority";
  var key = n + ":" + f, ai = st.ai[key], showAI = ai && !ui.tpl[key], fname = FORMATS.filter(function (x) { return x[0] === f; })[0][1];
  var made = has ? '<div class="made"><div class="made-h"><b>Today\'s content for ' + esc(bizName()) + '</b>' + (ai ? '<button class="btn small" type="button" data-tpl="' + key + '">' + (showAI ? "Show template version" : "Show AI version") + "</button>" : "") + '</div>' +
      '<div class="ftabs">' + FORMATS.map(function (x) { return '<button class="ftab" type="button" data-fmt="' + x[0] + '" data-n="' + n + '" aria-pressed="' + (f === x[0]) + '">' + x[1] + (st.ai[n + ":" + x[0]] ? " ✨" : "") + "</button>"; }).join("") + "</div>" +
      '<div class="out" id="out-' + n + '">' + rich(showAI ? ai : gen(d, f)) + '</div><p class="err" id="aierr-' + n + '"></p>' +
      '<div class="acts"><button class="btn small solid" type="button" data-copyfmt="' + n + '">Copy ' + fname.toLowerCase() + '</button><button class="btn small" type="button" data-aigen="' + n + '">' + (ai ? "✨ New AI version" : "✨ Fresh version with AI") + "</button></div></div>"
    : '<p class="hintbox">Pick your business above to get today\'s reel script, carousel, story and status post.</p>';
  return '<article class="day' + (done ? " done" : "") + (n === 22 ? " launch" : "") + (nx ? " is-next" : "") + '" id="day-' + n + '">' +
    '<div class="dh"><input type="checkbox" class="tick" data-tick="' + n + '" aria-label="Day ' + n + ' done"' + (done ? " checked" : "") + '>' +
    '<button class="dhb" type="button" data-toggle="' + n + '" aria-expanded="' + open + '"><span class="circ">' + n + '</span><span class="dt"><b>Day ' + n + (n === 22 ? " · Launch Day" : "") + (nx ? '<span class="nextpill">Up next</span>' : "") + '</b><span>' + esc(d.set) + (date ? " · " + fmtD(date) : "") + '</span></span><span class="pm" aria-hidden="true">' + (open ? "−" : "+") + "</span></button></div>" +
    (open ? '<div class="db"><div class="lines"><p><b>Post:</b> ' + esc(d.post) + '</p><p><b>Story / Status:</b> ' + esc(d.stories) + '</p><p><b>Action:</b> ' + esc(d.action) + "</p></div>" + made +
      '<div class="auth"><span class="lbl">' + stage + " · " + esc(d.pillar) + '</span><div class="acts"><button class="btn small" type="button" data-auth="' + n + '">Create Day ' + n + ' authority content</button></div></div>' +
      '<div class="acts"><button class="btn" type="button" data-gostage="' + STAGE_IDS[d.set] + '">📝 Browse the 10 ' + esc(d.set) + ' scripts</button></div>' +
      '<div class="acts"><a class="btn solid" href="' + writerLink(n, "instagram-caption") + '">✨ Write this post with AI</a><button class="btn" type="button" data-mark="' + n + '">' + (done ? "✓ Done · undo" : "Mark day done") + "</button></div>" +
      '<textarea class="note" data-note="' + n + '" placeholder="Notes for Day ' + n + ' (script used, results, ideas)…">' + esc(st.notes[n] || "") + "</textarea></div>" : "") +
    "</article>";
}
function renderWeek() {
  var w = WEEKS.filter(function (x) { return x.id === ui.week; })[0], html = '<div class="weekh"><h2 class="anton">' + w.name + "</h2>";
  if (w.from) html += '<p class="sub">Days ' + w.from + "–" + w.to + " · " + w.sub + (dateFor(w.from) ? " · " + fmtD(dateFor(w.from)) + " – " + fmtD(dateFor(w.to)) : "") + "</p>";
  else html += '<p class="sub">' + w.sub + "</p>";
  html += '<p class="why">' + esc(w.why) + "</p></div>";
  if (w.from) for (var n = w.from; n <= w.to; n++) html += dayHTML(n);
  else html += afterHTML();
  var i = WEEKS.indexOf(w), prev = WEEKS[i - 1], next = WEEKS[i + 1];
  html += '<div class="weeknav">' + (prev ? '<button class="btn" type="button" data-week="' + prev.id + '">← ' + prev.tab + "</button>" : "<span></span>") + (next ? '<button class="btn" type="button" data-week="' + next.id + '">' + next.tab + " →</button>" : "<span></span>") + "</div>";
  $("weekView").innerHTML = html; renderTabs(); progress();
}
function afterHTML() {
  var h = "";
  AFTER.forEach(function (g, gi) {
    h += '<div class="card"><h2 class="anton" style="font-size:1.05rem;color:var(--g2)">' + g.h + "</h2>" + g.items.map(function (it, ii) {
      var k = gi + "-" + ii, c = !!st.after[k];
      return '<div class="task' + (c ? " checked" : "") + '"><input type="checkbox" class="tick" id="af' + k + '" data-after="' + k + '"' + (c ? " checked" : "") + '><label for="af' + k + '">' + esc(it) + "</label></div>";
    }).join("") + "</div>";
  });
  h += '<div class="card"><h2 class="anton" style="font-size:1.05rem;color:var(--g2)">My launch debrief</h2><div class="grid2">' + DEBRIEF.map(function (f) {
    var v = esc(st.debrief[f[0]] || "");
    return '<div' + (f[2] ? ' style="grid-column:1/-1"' : "") + '><label class="f" for="db-' + f[0] + '">' + f[1] + "</label>" + (f[2] ? '<textarea id="db-' + f[0] + '" data-deb="' + f[0] + '">' + v + "</textarea>" : '<input type="text" id="db-' + f[0] + '" data-deb="' + f[0] + '" value="' + v + '">') + "</div>";
  }).join("") + "</div></div>";
  return h;
}
function goDay(n, scroll) { ui.week = weekOf(n); ui.open = {}; ui.open[n] = 1; renderWeek(); if (scroll) { var el = $("day-" + n); if (el) el.scrollIntoView({behavior:"smooth", block:"start"}); } }
function tick(n) {
  if (st.days[n]) delete st.days[n]; else st.days[n] = Date.now(); save();
  if (st.days[n]) {
    var nx = nextTodo(); toast(nx === null ? "All 30 days done. You launched! 🎉" : "Day " + n + " done ✓ Up next: Day " + nx);
    delete ui.open[n];
    if (nx !== null) { if (weekOf(nx) === ui.week) { ui.open[nx] = 1; renderWeek(); var el = $("day-" + nx); if (el) el.scrollIntoView({behavior:"smooth", block:"start"}); return; } }
  }
  renderWeek();
}

/* ---------- authority studio ---------- */
function renderProfile() {
  var p = prof() || {};
  document.querySelectorAll("[data-prof]").forEach(function (el) { if (document.activeElement !== el) el.value = p[el.dataset.prof] || ""; });
  $("profBiz").textContent = bizName() || "not picked yet";
}
function questions(pillar) { return PILLARS[pillar].map(function (q) { return fill(q); }); }
function renderCreate() {
  var pill = $("aPillar").value || Object.keys(PILLARS)[0];
  $("pillarChips").innerHTML = Object.keys(PILLARS).map(function (k) { return '<button class="chip" type="button" data-pillar="' + esc(k) + '" aria-pressed="' + (k === pill) + '">' + esc(k) + "</button>"; }).join("");
  var qv = $("aQuestion").selectedIndex;
  $("aQuestion").innerHTML = questions(pill).map(function (q, i) { return '<option value="' + i + '">' + esc(q) + "</option>"; }).join("");
  if (qv > 0 && qv < 3) $("aQuestion").selectedIndex = qv;
  $("aCtx").textContent = ui.aDay ? "Day " + ui.aDay + " · " + (ui.aDay <= 21 ? "Pre-launch authority" : "Launch authority") : "";
  var usable = st.proof.filter(function (x) { return x.perm; });
  $("aProofPick").innerHTML = usable.length ? '<label class="f">Add real proof <small>(optional, from your Proof library)</small></label>' + usable.map(function (x) {
    return '<div class="task"><input type="checkbox" class="tick" id="ap' + x.id + '" data-useproof="' + x.id + '"><label for="ap' + x.id + '">' + esc(x.type) + ': "' + esc(x.text.slice(0, 90)) + (x.text.length > 90 ? "…" : "") + '" · ' + esc(x.source || "a customer") + "</label></div>";
  }).join("") : '<p class="muted" style="font-size:.84rem;margin-top:10px">Tip: add real testimonials to your <a href="#authority" data-goatab="proof">Proof library</a> to use them in posts.</p>';
}
function chosenProof() { var ids = {}; document.querySelectorAll("[data-useproof]:checked").forEach(function (el) { ids[el.dataset.useproof] = 1; }); return st.proof.filter(function (x) { return ids[x.id] && x.perm; }); }
function quickDraft() {
  var q = $("aQuestion").selectedOptions[0].textContent, det = $("aDetails").value.trim() || "[Your answer in your own words]", f = $("aFormat").value, pr = chosenProof(), p = prof() || {};
  var proofLine = pr.length ? pr.map(function (x) { return '"' + x.text + '" · ' + (x.source || "a customer"); }).join("\n") : "";
  var parts = (det.match(/[^.!?]+[.!?]*/g) || []).map(function (x) { return x.trim(); }).filter(Boolean), chunk = function (i) { var s = Math.ceil(parts.length / 3); return parts.slice(i * s, i * s + s).join(" ") || "[point " + (i + 1) + "]"; };
  var cta = "Save this and share it with someone who needs it. Questions? Ask me below 👇";
  if (f === "carousel") return "Slide 1 (cover): " + q + "\nSlide 2: " + chunk(0) + "\nSlide 3: " + chunk(1) + "\nSlide 4: " + chunk(2) + (proofLine ? "\nSlide 5: " + proofLine : "") + "\nLast slide: " + cta + "\n\nCAPTION\n" + q + "\n\n" + cta;
  if (f === "reel") return "0–3s · HOOK\n" + q + "\n\nBODY\n" + det + (proofLine ? "\n\nPROOF\n" + proofLine : "") + "\n\nCALL TO ACTION\nFollow for more" + (p.thing ? " on " + p.thing : "") + ". " + cta;
  if (f === "status") return "Status 1: " + q + "\nStatus 2: " + chunk(0) + "\nStatus 3: " + chunk(1) + " " + chunk(2) + (proofLine ? "\nStatus 4: " + proofLine : "") + "\nLast status: Reply with your questions 💬";
  if (f === "email") return "Subject: " + q + "\n\nHi [first name],\n\n" + det + (proofLine ? "\n\n" + proofLine : "") + "\n\nIf this helped, reply and tell me. I read every message.\n\n[Your name]";
  return q + "\n\n" + det + (proofLine ? "\n\n" + proofLine : "") + "\n\n" + cta;
}
function showOut(t) { ui.aiText = t; $("aOut").innerHTML = rich(t); $("aOutWrap").hidden = !t; }
function stream(body, onText) {
  var text = "";
  return fetch(ENDPOINT, {method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(body)}).then(function (res) {
    if (!res.ok) {
      if ((res.headers.get("content-type") || "").indexOf("json") >= 0) return res.json().then(function (j) { var e = new Error(j.error || "Something went wrong."); e.status = res.status; throw e; });
      throw new Error(res.status === 404 ? "The AI writer only works on the live site." : "Something went wrong. Please try again.");
    }
    var r = res.body.getReader(), dec = new TextDecoder();
    function pump() { return r.read().then(function (c) { if (c.done) return; text += dec.decode(c.value, {stream:true}); var s = text.split("\n\n[[")[0]; if (s.trim()) onText(cleanAI(s)); return pump(); }); }
    return pump();
  }).then(function () {
    var m = text.match(/\n\n\[\[(ERROR|NOTE)\]\] ([^\n]*)$/), note = "";
    if (m) { text = text.slice(0, m.index); if (m[1] === "ERROR" && !text.trim()) throw new Error(m[2]); note = m[2]; }
    if (!text.trim()) throw new Error("Nothing came back. Please try again.");
    return {text:cleanAI(text).trim(), note:note};
  });
}
function dayAI(n, btn) {
  var d = DAYS[n - 1], f = st.fmt[n] || "reel", p = prof(), err = $("aierr-" + n);
  if (/^\[/.test(p.who) || /^\[/.test(p.pain)) { err.innerHTML = 'Fill in <a href="#authority" data-goatab="profile">your Profile</a> first (who it\'s for and the problem you solve).'; return; }
  btn.disabled = true; btn.textContent = "Writing…"; err.textContent = "";
  var body = {offerName:p.thing, offerType:bizName(), audience:p.who, problem:p.pain, transformation:p.want, stage:STAGE_IDS[d.set], platform:FORMATS.filter(function (x) { return x[0] === f; })[0][2], tone:"warm",
    extra:"This is Day " + n + " of a 30-day launch plan: " + d.title + ". Today's post idea: " + d.post + (p.proof && !/^\[/.test(p.proof) ? " Their proof is " + p.proof + " (use a [placeholder] for any specific quote)." : "")};
  stream(body, function (t) { var o = $("out-" + n); if (o) o.innerHTML = rich(t); }).then(function (r) {
    st.ai[n + ":" + f] = r.text; delete ui.tpl[n + ":" + f]; save(); renderWeek(); var o2 = $("day-" + n); if (o2) o2.querySelector(".made").scrollIntoView({block:"start"}); if (r.note) { var e = $("aierr-" + n); if (e) e.textContent = r.note; }
  }).catch(function (e) { if (e.status === 401) return toAccess(); err.textContent = e.message; btn.disabled = false; btn.textContent = "✨ Try again"; });
}
function aiWrite() {
  var det = $("aDetails").value.trim();
  $("aErr").textContent = "";
  if (det.length < 20) { $("aErr").textContent = "Add your teaching details first (a few sentences in your own words)."; return; }
  if (!bizRow(st.biz)) { $("aErr").textContent = "Pick your business in the calendar first so the post fits you."; return; }
  var p = {}, raw = prof(); Object.keys(raw).forEach(function (k) { p[k] = /^\[.*\]$/.test(String(raw[k]).trim()) ? "" : raw[k]; });
  var body = {mode:"authority", business:bizName(), thing:p.thing, who:p.who, pain:p.pain, want:p.want, experience:p.experience || "", method:p.method || "",
    pillar:$("aPillar").value, format:$("aFormat").value, question:$("aQuestion").selectedOptions[0].textContent, details:det,
    proof:chosenProof().map(function (x) { return x.type + ': "' + x.text + '" (' + (x.source || "a customer") + ")"; })};
  $("aAI").disabled = true; $("aStatus").textContent = "Writing your authority content…"; showOut(""); var text = "";
  fetch(ENDPOINT, {method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(body)}).then(function (res) {
    if (!res.ok) {
      if ((res.headers.get("content-type") || "").indexOf("json") >= 0) return res.json().then(function (j) {
        if (res.status === 401) toAccess();
        throw new Error(j.error || "Something went wrong.");
      });
      throw new Error(res.status === 404 ? "The AI writer only works on the live site. Use Quick draft here." : "Something went wrong. Please try again.");
    }
    var r = res.body.getReader(), dec = new TextDecoder();
    function pump() { return r.read().then(function (c) { if (c.done) return; text += dec.decode(c.value, {stream:true}); var s = text.split("\n\n[[")[0]; if (s.trim()) showOut(s); return pump(); }); }
    return pump();
  }).then(function () {
    var m = text.match(/\n\n\[\[(ERROR|NOTE)\]\] ([^\n]*)$/);
    if (m) { text = text.slice(0, m.index); if (m[1] === "ERROR" && !text.trim()) throw new Error(m[2]); $("aErr").textContent = m[2]; }
    if (!text.trim()) throw new Error("Nothing came back. Please try again.");
    showOut(text.trim());
  }).catch(function (e) { $("aErr").textContent = e.message || "Something went wrong."; })
    .then(function () { $("aAI").disabled = false; $("aStatus").textContent = ""; });
}
function toAccess() { location.href = "/access/?next=" + encodeURIComponent(location.pathname); }
function renderProof() {
  $("prList").innerHTML = st.proof.length ? st.proof.map(function (x) {
    return '<div class="proof"><span class="tag">' + esc(x.type) + '</span><div style="flex:1">"' + esc(x.text) + '"<br><span class="muted">' + esc(x.source || "a customer") + "</span> · " + (x.perm ? '<span class="ok">Permission given</span>' : '<span class="no">No permission: not used in posts</span>') + '</div><button class="btn small" type="button" data-delproof="' + x.id + '">Remove</button></div>';
  }).join("") : '<p class="muted" style="margin-top:12px;font-size:.88rem">No proof yet. Add real testimonials, results and messages as they come in.</p>';
}
function weekAgo() { return Date.now() - 7 * 864e5; }
function actuals() {
  var c = {}; CATS.forEach(function (x) { c[x[0]] = 0; });
  for (var n = 1; n <= 30; n++) if (st.days[n] > 1 && st.days[n] >= weekAgo()) c[SET_CAT[DAYS[n - 1].set]]++;
  st.saved.forEach(function (x) { if (x.at >= weekAgo()) c[x.cat || PILLAR_CAT[x.pillar] || "auth"]++; });
  return c;
}
function rebalance(id, v) {
  v = Math.max(0, Math.min(100, Math.round(v / 5) * 5));
  var others = CATS.map(function (c) { return c[0]; }).filter(function (k) { return k !== id; }), rest = 100 - v, sum = 0;
  others.forEach(function (k) { sum += st.mix[k]; });
  others.forEach(function (k) { st.mix[k] = sum ? Math.round(st.mix[k] / sum * rest / 5) * 5 : Math.round(rest / others.length / 5) * 5; });
  st.mix[id] = v;
  var tot = 0; CATS.forEach(function (c) { tot += st.mix[c[0]]; });
  if (tot !== 100) { var big = others.slice().sort(function (x, y) { return st.mix[y] - st.mix[x]; })[0]; st.mix[big] = Math.max(0, st.mix[big] + 100 - tot); }
}
function renderMixNumbers() {
  var tot = 0; CATS.forEach(function (c) { tot += st.mix[c[0]]; $("mx-v-" + c[0]).textContent = st.mix[c[0]] + "%"; $("mx-" + c[0]).value = st.mix[c[0]]; });
  $("mixTotal").textContent = "Total: " + tot + "% · Saved";
  var act = actuals();
  $("mixAlloc").innerHTML = CATS.map(function (c) {
    var per = st.mix[c[0]] / 100 * st.ppw, got = act[c[0]];
    return '<div class="alloc"><span><b>' + c[1] + ":</b> " + st.mix[c[0]] + "% · " + per.toFixed(1) + ' posts per week on average</span><span class="' + (got >= Math.round(per) && per > 0 ? "ok" : "muted") + '">This week: ' + got + "</span></div>";
  }).join("");
  var gaps = CATS.filter(function (c) { return act[c[0]] < Math.round(st.mix[c[0]] / 100 * st.ppw); }).sort(function (x, y) { return (st.mix[y[0]] / 100 * st.ppw - act[y[0]]) - (st.mix[x[0]] / 100 * st.ppw - act[x[0]]); });
  $("mixTip").innerHTML = gaps.length ? "Next, post more <b>" + gaps[0][1].toLowerCase() + "</b> content to stay on your balance." : "You're on balance this week. 🎉";
}
function renderBalance() {
  $("mixSliders").innerHTML = CATS.map(function (c) {
    return '<div class="mix"><div class="mix-h"><label for="mx-' + c[0] + '">' + c[1] + '</label><b id="mx-v-' + c[0] + '"></b></div><input type="range" min="0" max="100" step="5" id="mx-' + c[0] + '" data-mix="' + c[0] + '"></div>';
  }).join("");
  $("ppw").value = st.ppw;
  renderMixNumbers();
  $("afterPillars").innerHTML = AFTER_PILLARS.map(function (k) { return '<button class="chip" type="button" data-afterpillar="' + esc(k) + '">' + esc(k) + "</button>"; }).join("");
  var counts = {}, max = 1; Object.keys(PILLARS).forEach(function (k) { counts[k] = 0; });
  st.saved.forEach(function (x) { if (x.at >= weekAgo() && counts[x.pillar] != null) counts[x.pillar]++; });
  Object.keys(counts).forEach(function (k) { max = Math.max(max, counts[k]); });
  $("balBars").innerHTML = Object.keys(counts).map(function (k) { return '<div class="r"><span>' + esc(k) + '</span><span class="b"><i style="width:' + (counts[k] / max * 100) + '%"></i></span><b>' + counts[k] + "</b></div>"; }).join("");
  $("savedList").innerHTML = st.saved.length ? st.saved.slice().reverse().map(function (x) {
    return '<div class="saved"><div class="meta">' + new Date(x.at).toLocaleDateString() + " · " + esc(x.pillar) + " · " + esc(x.formatName) + (x.day ? " · Day " + x.day : "") + '</div><div class="out">' + rich(x.text) + '</div><div class="acts"><button class="btn small" type="button" data-copysaved="' + x.id + '">Copy</button><button class="btn small" type="button" data-delsaved="' + x.id + '">Delete</button></div></div>';
  }).join("") : '<p class="muted" style="font-size:.88rem;margin-top:8px">Saved content appears here.</p>';
}
function setATab(t) {
  ui.atab = t;
  document.querySelectorAll("[data-atab]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.atab === t); });
  document.querySelectorAll("[data-apanel]").forEach(function (p) { p.hidden = p.dataset.apanel !== t; });
  if (t === "profile") renderProfile(); if (t === "create") renderCreate(); if (t === "proof") renderProof(); if (t === "balance") renderBalance();
}

/* ---------- 120-script library ---------- */
function scriptList() {
  var all = [], n = 0;
  SCRIPT_STAGES.forEach(function (sg) { sg.scripts.forEach(function (sc, i) { n++; all.push({key:sg.id + ":" + i, num:n, stage:sg, title:sc[0], text:sc[1]}); }); });
  return all;
}
var SCRIPTS = scriptList();
function scriptText(x) { return fill(x.text, prof() || defaults(BUSINESS_CUSTOM)); }
function renderScripts() {
  st.used = st.used || {}; st.fav = st.fav || {};
  var usedN = Object.keys(st.used).length, mode = ui.smode || "all", stage = ui.sstage || "all", q = ($("sSearch").value || "").toLowerCase().trim();
  $("sText").textContent = usedN + " of 120 scripts used"; $("sPct").textContent = Math.round(usedN / 120 * 100) + "%"; $("sBar").style.width = (usedN / 120 * 100) + "%";
  $("sBiz").innerHTML = bizRow(st.biz) ? "Written for your <b>" + esc(bizName()) + "</b>. <a href=\"#calendar\">Change business</a>" : 'Tip: <a href="#calendar">pick your business</a> and every script fills in your audience, problem and result.';
  document.querySelectorAll("[data-smode]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.smode === mode); });
  $("sStages").innerHTML = '<button class="chip" type="button" data-sstage="all" aria-pressed="' + (stage === "all") + '">All 12 stages</button>' + SCRIPT_STAGES.map(function (sg, i) {
    var u = sg.scripts.filter(function (_, j) { return st.used[sg.id + ":" + j]; }).length;
    return '<button class="chip" type="button" data-sstage="' + sg.id + '" aria-pressed="' + (stage === sg.id) + '">' + String(i + 1).padStart(2, "0") + " " + esc(sg.name) + " · " + u + "/10</button>";
  }).join("");
  var sg = SCRIPT_STAGES.filter(function (x) { return x.id === stage; })[0];
  $("sStageHead").innerHTML = sg ? '<div class="stagehead"><h2 class="anton">' + esc(sg.name) + '</h2><p>' + esc(sg.goal) + "</p></div>" : "";
  var list = SCRIPTS.filter(function (x) {
    if (stage !== "all" && x.stage.id !== stage) return false;
    if (mode === "unused" && st.used[x.key]) return false;
    if (mode === "fav" && !st.fav[x.key]) return false;
    return !q || (x.title + " " + x.text + " " + x.stage.name).toLowerCase().indexOf(q) >= 0;
  });
  $("sList").innerHTML = list.length ? list.map(function (x) {
    var used = !!st.used[x.key], fav = !!st.fav[x.key], pr = prof(), w = "/script-writer/?stage=" + x.stage.id + "&platform=instagram-caption";
    if (bizRow(st.biz)) w += "&type=" + encodeURIComponent(bizName()) + (pr && !/^\[/.test(pr.who) ? "&audience=" + encodeURIComponent(pr.who) + "&problem=" + encodeURIComponent(pr.pain) : "");
    return '<article class="script' + (used ? " used" : "") + '"><div class="script-h"><span><span class="num">#' + String(x.num).padStart(3, "0") + "</span> · <b>" + esc(x.title) + '</b></span><span class="stg">' + esc(x.stage.name) + '</span></div>' +
      '<div class="out">' + rich(scriptText(x)) + '</div><div class="acts">' +
      '<button class="btn small solid" type="button" data-scopy="' + x.key + '">Copy</button>' +
      '<button class="btn small' + (used ? " on" : "") + '" type="button" data-sused="' + x.key + '" aria-pressed="' + used + '">' + (used ? "✓ Used" : "Mark used") + "</button>" +
      '<button class="btn small" type="button" data-sfav="' + x.key + '" aria-pressed="' + fav + '">' + (fav ? "★ Saved" : "☆ Save") + "</button>" +
      '<a class="btn small" href="' + w + '">✨ Rewrite with AI</a></div></article>';
  }).join("") : '<p class="hintbox">No scripts match. Try another search or stage.</p>';
}
function scriptByKey(k) { return SCRIPTS.filter(function (x) { return x.key === k; })[0]; }

/* ---------- views ---------- */
function route() {
  var v = location.hash === "#authority" ? "authority" : location.hash === "#scripts" ? "scripts" : "calendar";
  ["calendar", "scripts", "authority"].forEach(function (k) { $("view-" + k).hidden = v !== k; $("nav-" + k).setAttribute("aria-current", v === k ? "page" : "false"); });
  $("lede").textContent = v === "authority" ? "Your experience. Your perspective. Useful knowledge worth sharing." : v === "scripts" ? "120 fully-written launch scripts across 12 launch stages, made for your business." : "Your 30-day launch calendar, one day at a time. Open today's day, do the post, the story and the action, then tick it off.";
  if (v === "authority") setATab(ui.atab);
  if (v === "scripts") renderScripts();
}

/* ---------- events ---------- */
document.addEventListener("click", function (e) {
  var t = e.target, el;
  if ((el = t.closest("[data-biz]"))) return pickBiz(el.dataset.biz);
  if (t.id === "bizChange") { ui.changeBiz = true; renderBiz(); $("bizSearch").focus(); return; }
  if (t.id === "bizOtherGo") { var v = $("bizOther").value.trim(); if (v) pickBiz("custom:" + v.slice(0, 60)); else $("bizOther").focus(); return; }
  if ((el = t.closest("[data-week]"))) { ui.week = el.dataset.week; ui.open = {}; if (ui.week !== "after") { var w = WEEKS.filter(function (x) { return x.id === ui.week; })[0]; for (var n = w.from; n <= w.to; n++) if (!st.days[n]) { ui.open[n] = 1; break; } } renderWeek(); $("weekTabs").scrollIntoView({block:"start", behavior:"smooth"}); return; }
  if ((el = t.closest("[data-toggle]"))) { var k = +el.dataset.toggle; if (ui.open[k]) delete ui.open[k]; else ui.open[k] = 1; renderWeek(); return; }
  if ((el = t.closest("[data-mark]"))) return tick(+el.dataset.mark);
  if ((el = t.closest("[data-fmt]"))) { st.fmt[el.dataset.n] = el.dataset.fmt; save(); renderWeek(); return; }
  if ((el = t.closest("[data-copyfmt]"))) { var dn = +el.dataset.copyfmt, fk = dn + ":" + (st.fmt[dn] || "reel"); return copyText(st.ai[fk] && !ui.tpl[fk] ? st.ai[fk] : gen(DAYS[dn - 1], st.fmt[dn] || "reel")); }
  if ((el = t.closest("[data-tpl]"))) { ui.tpl[el.dataset.tpl] = !ui.tpl[el.dataset.tpl]; return renderWeek(); }
  if ((el = t.closest("[data-aigen]"))) return dayAI(+el.dataset.aigen, el);
  if ((el = t.closest("[data-smode]"))) { ui.smode = el.dataset.smode; return renderScripts(); }
  if ((el = t.closest("[data-sstage]"))) { ui.sstage = el.dataset.sstage; renderScripts(); return $("sStageHead").scrollIntoView({block:"start"}); }
  if ((el = t.closest("[data-scopy]"))) { var sx = scriptByKey(el.dataset.scopy); return copyText(sx.title.toUpperCase() + "\n\n" + scriptText(sx)); }
  if ((el = t.closest("[data-sused]"))) { st.used = st.used || {}; if (st.used[el.dataset.sused]) delete st.used[el.dataset.sused]; else { st.used[el.dataset.sused] = Date.now(); toast("Marked used ✓"); } save(); return renderScripts(); }
  if ((el = t.closest("[data-sfav]"))) { st.fav = st.fav || {}; if (st.fav[el.dataset.sfav]) delete st.fav[el.dataset.sfav]; else st.fav[el.dataset.sfav] = 1; save(); return renderScripts(); }
  if ((el = t.closest("[data-gostage]"))) { ui.sstage = el.dataset.gostage; ui.smode = "all"; $("sSearch").value = ""; location.hash = "#scripts"; window.scrollTo(0, 0); return; }
  if ((el = t.closest("[data-post]"))) { var gp = el.dataset.post.split(":"); st.posts = st.posts || {}; st.posts[gp[0]] = {id:gp[1], f:(st.posts[gp[0]] || {}).f || "caption"}; save(); return renderPosts(); }
  if ((el = t.closest("[data-postcopy]"))) { var g2 = el.dataset.postcopy, c2 = st.posts[g2]; return copyText(postText(g2, c2.id, c2.f || "caption")); }
  if ((el = t.closest("[data-live]"))) { st.live = el.dataset.live; save(); return renderLive(); }
  if ((el = t.closest("[data-livecopy]"))) return copyText(liveText(st.live || "tiktok", +el.dataset.livecopy));
  if (t.id === "liveCopyAll") { var k2 = st.live || "tiktok"; return copyText(LIVE_P[k2].name + " SELLING SCRIPT (25 minutes)\n\n" + LIVE_PARTS.map(function (_, i) { return liveText(k2, i); }).join("\n\n")); }
  if ((el = t.closest("[data-mixreset]"))) { st.mix = defaultMix(); save(); return renderBalance(); }
  if ((el = t.closest("[data-afterpillar]"))) { ui.aDay = null; $("aPillar").value = el.dataset.afterpillar; $("aQuestion").selectedIndex = 0; return setATab("create"); }
  if ((el = t.closest("[data-auth]"))) {
    var an = +el.dataset.auth; ui.aDay = an; ui.atab = "create"; $("aPillar").value = DAYS[an - 1].pillar; $("aQuestion").selectedIndex = 0;
    location.hash = "#authority"; window.scrollTo(0, 0); return;
  }
  if ((el = t.closest("[data-goatab]"))) { ui.atab = el.dataset.goatab; if (location.hash === "#authority") { e.preventDefault(); setATab(ui.atab); } return; }
  if ((el = t.closest("[data-atab]"))) return setATab(el.dataset.atab);
  if ((el = t.closest("[data-pillar]"))) { $("aPillar").value = el.dataset.pillar; $("aQuestion").selectedIndex = 0; return renderCreate(); }
  if (t.id === "aQuick") { $("aErr").textContent = ""; showOut(quickDraft()); return; }
  if (t.id === "aAI") return aiWrite();
  if (t.id === "aCopy") return copyText(ui.aiText);
  if (t.id === "aSave") {
    var fm = $("aFormat"); st.saved.push({id:Date.now().toString(36), at:Date.now(), cat:PILLAR_CAT[$("aPillar").value] || "auth", pillar:$("aPillar").value, format:fm.value, formatName:fm.selectedOptions[0].textContent, day:ui.aDay, text:ui.aiText});
    save(); toast("Saved to My content · Weekly balance updated"); return;
  }
  if (t.id === "prAdd") {
    var tx = $("prText").value.trim(); $("prErr").textContent = "";
    if (tx.length < 5) { $("prErr").textContent = "Add the exact words or result first."; return; }
    st.proof.push({id:Date.now().toString(36), type:$("prType").value, source:$("prSource").value.trim(), text:tx, perm:$("prPerm").checked});
    save(); $("prText").value = ""; $("prSource").value = ""; $("prPerm").checked = false; renderProof(); toast("Added to your Proof library"); return;
  }
  if ((el = t.closest("[data-delproof]"))) { st.proof = st.proof.filter(function (x) { return x.id !== el.dataset.delproof; }); save(); return renderProof(); }
  if ((el = t.closest("[data-copysaved]"))) { var s = st.saved.filter(function (x) { return x.id === el.dataset.copysaved; })[0]; return s && copyText(s.text); }
  if ((el = t.closest("[data-delsaved]"))) { st.saved = st.saved.filter(function (x) { return x.id !== el.dataset.delsaved; }); save(); return renderBalance(); }
});
document.addEventListener("change", function (e) {
  var t = e.target;
  if (t.dataset.tick) return tick(+t.dataset.tick);
  if (t.dataset.after) { if (t.checked) st.after[t.dataset.after] = 1; else delete st.after[t.dataset.after]; save(); t.parentNode.classList.toggle("checked", t.checked); return; }
  if (t.id === "launch") { st.launch = t.value; save(); renderWeek(); if (st.launch) toast("Dates filled in"); return; }
  if (t.dataset.postfmt) { st.posts = st.posts || {}; var pg = st.posts[t.dataset.postfmt] || {}; pg.f = t.value; st.posts[t.dataset.postfmt] = pg; save(); return renderPosts(); }
  if (t.id === "aPillar") { $("aQuestion").selectedIndex = 0; renderCreate(); }
});
document.addEventListener("input", function (e) {
  var t = e.target;
  if (t.dataset.mix) { rebalance(t.dataset.mix, +t.value); save(); return renderMixNumbers(); }
  if (t.id === "ppw") { var v = Math.max(1, Math.min(50, +t.value || 7)); st.ppw = v; save(); return renderMixNumbers(); }
  if (t.id === "bizSearch") return renderBiz();
  if (t.id === "sSearch") return renderScripts();
  if (t.dataset.note) { st.notes[t.dataset.note] = t.value; save(); return; }
  if (t.dataset.deb) { st.debrief[t.dataset.deb] = t.value; save(); return; }
  if (t.dataset.prof) { st.prof = st.prof || prof() || defaults(BUSINESS_CUSTOM); st.prof[t.dataset.prof] = t.value; save(); renderLive(); renderPosts(); $("profSaved").textContent = "Saved ✓"; clearTimeout(renderProfile.t); renderProfile.t = setTimeout(function () { $("profSaved").textContent = ""; }, 1200); }
});
$("bizOther").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); $("bizOtherGo").click(); } });
window.addEventListener("hashchange", route);

/* ---------- start ---------- */
$("aPillar").innerHTML = Object.keys(PILLARS).map(function (k) { return '<option>' + esc(k) + "</option>"; }).join("");
$("aFormat").innerHTML = AFORMATS.map(function (f) { return '<option value="' + f[0] + '">' + esc(f[1]) + "</option>"; }).join("");
$("launch").value = st.launch || "";
renderBiz(); renderProfile(); renderLive(); renderPosts();
var first = nextTodo(); if (first === null) { ui.week = "after"; renderWeek(); } else goDay(first, false);
route();
})();
