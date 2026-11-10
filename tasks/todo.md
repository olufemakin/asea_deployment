# AI Interview Simulator — Build Plan

Goal: A free, voice-enabled AI interview simulator with feature parity to
`mercorhrai-5z9a8d53.manus.space` (Mercor Voice AI HR Agent), for a community
that trains people to pass the AI screening gates on Outlier, Mercor, Micro1.

Constraints (from user):
- Build the real app (not on Manus). Deploy to a free static host -> live URL.
- 100% free, no API keys. Voice = browser Web Speech API. Brain = built-in
  adaptive question engine + rubric scorer (no LLM).
- Tracks: AI-trainer / data-annotation screening across ALL professions.

## Plan
- [x] Q&A: lock approach, AI brain, tracks
- [x] Scaffold project dir
- [ ] Build single-file `index.html` app
  - [ ] Welcome screen + branding
  - [ ] Setup: pick profession track, difficulty, # questions, voice on/off
  - [ ] Mic / voice check + graceful fallback to typing
  - [ ] Interview screen: animated AI orb, TTS question, live transcript,
        STT answer capture, timer, progress, repeat/skip, follow-ups
  - [ ] Multi-profession question bank with rubric metadata
  - [ ] Free rubric scorer (coverage / depth / structure / specificity)
  - [ ] Results: overall + per-dimension + per-question feedback, printable
  - [ ] localStorage history
  - [ ] Responsive + dark theme + a11y
- [ ] Verify in preview (navigation, typing path, scoring, results)
- [ ] README + free-deploy guide
- [ ] Hand off: how to get a live URL

## Review
Built `index.html` (single self-contained file) + `README.md` with free-deploy guide.

Verified in browser preview (port 4555):
- Welcome → Setup → Interview → Results flow works.
- Question engine builds correct sets per track/length.
- Typing-fallback path works (STT-available browsers start with mic; type box reveals on demand).
- Scorer discriminates correctly: empty answer "I just read it carefully" → 1/100;
  structured+specific answers → 51–76/100. Overall + 4 rubric dimensions render.
- Per-question feedback + targeted tips render; report printable; history saved to localStorage.
- Responsive: feature chips reflow to 2×2 on mobile; fixed header/pill overlap on <440px.

Could not do (capability/permission boundaries — handed to user):
- Cannot operate the Manus platform (separate product, no access). Built the real app instead.
- Cannot create hosting accounts / deploy on user's behalf (account creation is a restricted action).
  README documents 4 free one-drag deploy paths.

Note: added an `interviewace` entry to epsilon's `.claude/launch.json` purely to preview the
static file locally; harmless, can be removed.

## 2026-10-01 — Source recovered into GitHub
- Original local files were lost; the live Netlify deploy was downloaded and pushed to
  `olufemakin/asea_deployment` (`main`). The source is the original readable `index.html`.
- Added `CLAUDE.md` (project context + code map), `netlify.toml` (publish root, headers),
  and fixed the readme's run instructions. Smoke-tested the full flow in headless Chromium: no errors.

## 2026-10-02 — Upgrade Prompt 1 of 3: Foundation + Alex + Role system + Interview setup
Audit of v1 (single-file, no framework): flow/voice/scoring/print/history WORKING; history (last
report only), follow-ups (voice + word count only) PARTIAL; no routing, so refresh/back lost state, and
typed answers never got follow-ups (BROKEN); nav, Alex, profession library, custom professions,
interview types/modes/levels, adaptive engine, session model, practice, progress, about MISSING.

Done:
- [x] Split into static files (no build step): css/, js/data/, storage, engine, app; v1 bank kept verbatim and reused
- [x] Hash router + nav (Home · Interview ▾ · Practice ▾ · Results · Progress ▾ · About); no dead links; unknown routes → home
- [x] Rebrand: BSP AI WorkReady › INTERVIEW IQ › AI Interview Lab; navy/indigo/violet premium theme; responsive
- [x] Alex (BSP AI Interviewer): consistent identity, neutral transitions, standard intro tailored to profession and type, closing line
- [x] 145 professions / 13 groups, each with its own competency model; searchable selector; group filters
- [x] Add My Profession → private profile (custom competencies, AI evaluation, practical items); transferable detection
- [x] Transferable-skills roles → Transferable Skills Interview only (no invented AI job)
- [x] 7-step setup: profession, mode, type (8), experience (5), difficulty (4, Adaptive default), length (4, Standard default), summary
- [x] Structured question architecture (competency, difficulty, type, scenario, signals, follow-up rules, rubric)
- [x] Adaptive engine: difficulty target, competency revisit, clarify/evidence/probe/deepen follow-ups (typed or spoken), deep 12–20 length
- [x] Session model with statuses; saved every step; resume after reload; end-early report
- [x] Storage abstraction (StorageAdapter + Repo), v1 `ia_history` migration, export/delete data
- [x] Results, report (rubric + competencies + strengths/focus), interview history, Practice Lab (8 tasks), progress (readiness, skills, activity), About
- [x] Tests: tests/regression.mjs (65/65 pass), tests/engine-check.js (911 profession×type combos, 0 issues)

## 2026-10-02 — Upgrade Prompt 2 of 3: Adaptive engine + Voice + Timed Practice Lab
- [x] Stage blueprint (Background → Domain → Reasoning → AI → Communication → Final) with 20/25/20/20/15 weighting per type; weighted area scores
- [x] Same-session memory: role triggers + generic experience callbacks ("You mentioned that …"); behavioral repeats avoided
- [x] Seven follow-up types (clarify, evidence, depth, tradeoff, edge, challenge, AI connection) + harder follow-up after the AI stage
- [x] 18 role models (54 professions) with curated questions, exhibits, memory triggers; advanced interviews always include an exhibit
- [x] Healthcare safeguards (fictional scenarios, no patient info); FR-EN bilingual with Mostly EN / Mostly FR / Balanced, FR TTS/STT
- [x] Fair scoring: text only, fillers stripped, diacritic-insensitive stem matching, communication score; accent never scored
- [x] Voice: mic check (meter, sample transcript, Sounds good / Try again / Use text), speaking/listening/reviewing statuses,
      replay/mute/speed, start/pause/finish, live transcript toggle, transcript review/correction, mic + transcription fallbacks
- [x] Practice Lab rebuilt: 24 categories, 7 formats, exactly 10 questions, Easy 15 / Medium 20 / Hard 25 min, wall-clock timer,
      prev/next/palette/flags, autosave, manual + auto-submit (NO RESPONSE), results, full question review, progression, history
- [x] Interview↔practice recommendations on reports, Progress and Practice Lab
- [x] Tests: tests/regression.mjs 137/137 · tests/engine-check.js OK (911 combos, 72 practice sessions)

## 2026-10-02 — Prompt 2 correction pass: question bank integrity + interview defaults
- [x] Removed the cross-category practice top-up; `QuestionBank.select` is strict (category + difficulty + published), unseen first, exactly 10 or no session
- [x] Question bank rebuilt to the full schema with statuses and versions; 751 questions; 23/24 categories AVAILABLE (≥10 per difficulty); Response Critique = COMING SOON
- [x] Per-category competency mapping + central `COMPETENCY_REGISTRY`; practice results and interview reports carry competency-level evidence
- [x] Legacy single tasks reviewed: 4 converted with full metadata (ranking/eval), 4 archived; old history labelled LEGACY PRACTICE and excluded from analytics
- [x] Interview defaults: recommended vs selected type (no forced selection), "Recommended for Your Background" + why-text, Language Evaluation Interview for single-language evaluators, Technical recommended for software roles, role matrices
- [x] Tests: regression 179/179 (removed the borrowing expectation; added purity, coming-soon, no-borrowing, legacy, status, dead-handler and interview-default checks) · engine-check OK (614 combos, 138 strict sessions)
- [x] Prompt 3 readiness audit: docs/PROMPT3_READINESS.md

## 2026-10-02 — Prompt 3 of 3: interview intelligence, CV, skills & readiness, question bank, admin, production QA
- [x] BSP Role Interview Score: explicit 0–4 rubric per dimension → readable %; evidence found/missing, verbatim excerpts, how to improve
- [x] Premium Alex Interview Report (all 8 sections, "Why did I get this score?", "A stronger structure could be:"), history table, retry, score trends
- [x] Skills & Scores (practice + interview + CV sources), BSP Interview Readiness with inputs, Progress Dashboard + next best action, My AI Work Profile (BSP Internal Fit)
- [x] CV Intelligence: paste / .txt upload / build from profile; confirm/edit/delete; AI Experience Mapper with evidence labels; "Use my confirmed CV" personalises Alex
- [x] Interview question bank records + statuses, 5 concepts × 5 variants, unseen-first reuse; Response Critique completed (24/24 practice categories available)
- [x] Local Content Studio (#/admin): question manager, draft generator, role manager, Alex settings, export/import — local-only by design
- [x] Privacy page + granular Clear My Data, integrity notice, error/empty/loading states, storage-blocked banner, mobile polish, Netlify SPA fallback
- [x] Tests: regression 283/283 (journeys 1–6 + feature/QA checks), engine-check OK (614 combos, 144 strict practice sessions)

## 2026-10-02 — Profession Library expansion (unlimited professions + dynamic domain interviews)
- [x] Config-driven profession records (445: 145 existing + seeded), 59 categories, 50+ family templates; full data model with optional fields
- [x] Search by title / partial / alias / specialty / category / family; ambiguous aliases (PM, Doctor, Teacher) shown as choices; browse chips; recent + recommended
- [x] Specialties (incl. alias→specialty, e.g. "Corporate Lawyer" → Lawyer · Corporate); doctoral level only for academic professions
- [x] Custom professions v2 (specialty, goal) with family inference → dynamic competency profile; dynamic domain interviews for every profession
- [x] Profession profile pages; practice available vs opportunity verified kept separate; pay seed with verification metadata, never on cards or in matching
- [x] My Professions (multi-career) + CV profession detection (confirm before adding); profession-relevant practice recommendations; Alex intro uses level/specialty/custom wording
- [x] Admin → Professions (add/edit/archive, aliases, category, family, specialties, competencies, types, tasks, pay + verification, verified opportunities) + CSV bulk import
- [x] Fixed a practice autosave race (flag within 250 ms of typing could be lost) with an in-memory active session
- [x] Tests: regression 334/334 (3 consecutive runs), engine-check 1,894 profession × type combos, 0 issues


## CV Intelligence upgrade (2026-11)
- [x] In-browser PDF (vendored pdf.js 4.10.38) / DOCX / TXT extraction; 10 MB limit; empty, unsupported, legacy .doc, corrupt, password, scanned and garbled files fail with clear steps
- [x] Upload states (uploading → extracting → review → analysing → completed / failed) with retry / replace / remove; review and correct text before analysis
- [x] Deterministic CV Quality Score /100 (8 categories, criteria with partial credit, validated totals), provisional when extraction is incomplete
- [x] Report A–M, optional JD comparison (no match %), copy recommendations, HTML download, re-analyse, delete
- [x] Fairness / untrusted-content rules (personal data ignored, injection ignored, stuffing uncredited, no fabricated rewrites)
- [x] Tests: engine-check CV samples + regression CV sections; docs/CV_INTELLIGENCE.md

## Launch Scripts sales page (2026-11)
- [x] Standalone sales page at `launch-scripts/index.html` (served at /launch-scripts/); independent of the app. Checkout link + price in its CONFIG block; the 7 reviews are placeholders to replace with real customer reviews
- [x] AI Launch Script Writer at `/script-writer/`: offer details + launch stage (12) + platform (10) + tone → one tailored script streamed from `netlify/functions/launch-script.mjs` (Claude via Netlify AI Gateway). Never invents proof/deadlines (placeholders instead); optional `SCRIPT_WRITER_ACCESS_CODE`; sales page links to it under the buy button. Tested locally against a mock streaming endpoint (ok / fallback rejected / refusal / rate limit / access code)
- [x] Script Writer: business-type suggestions incl. Real estate (sales, land, rentals, shortlets, off-plan); prompt adds real-estate guidance (no invented title/approvals/returns/prices)
- [x] Interactive 30-Day Launch Execution Calendar at `/launch-calendar/` (navy & gold): set launch day (Day 22) → dates for Days 1–30 + 31–37, "Today is Day N", 90 tick-off tasks with progress, notes, phase filters, real estate examples toggle, copy plan, "Write this post with AI" deep link (Script Writer now reads ?stage= & ?type=), after-launch checklist + debrief; all saved on the device
- [x] Calendar renamed **Sold-Out Launch Studio**: week tabs, one tick per day, progress /30, opens on next undone day, 8 business types with a per-day example each (Real estate is one), sales-page button "Open the 30-Day Launch Calendar"
- [x] Sold-Out Launch Studio v2: 48 business profiles + custom, per-day reel/carousel/story/status generated for the business, week tabs with counts, Authority Content Studio (profile, create with pillars/questions/formats, quick draft + AI, proof library with permission, weekly balance); function gains carousel, live-selling and authority mode; sales page "Everything inside the Sold-Out Launch Studio"
- [x] Studio: weekly content balance (5 sliders kept at 100%, restore default, posts/week allocation, this-week actuals, After-your-launch pillars → Create); 3 new authority pillars; day content gets titles, labelled slides and posting tips; in-place "Fresh version with AI" per day×format, saved and toggleable, markdown stripped
- [x] Studio ↔ Script Writer: day "Write this post with AI" preselects the stage; writer links back to the studio. Bonus Live Stream Selling Script (TikTok LIVE / Instagram LIVE, 25 min, 6 timed parts, copy per part + full). Writer + function: "Live Stream Selling" stage, TikTok LIVE / Instagram LIVE platforms
- [x] Product renamed to Sold-Out Launch Studio. Stripe paid access: Payment Link → /access/ claim → signed HttpOnly cookie; edge paywall on Studio + Script Writer; AI function checks cookie; restore with email + receipt number; refunds blocked; off until ACCESS_SECRET set (docs/PAYMENTS.md). Access-code field removed
- [x] Renamed the 12 launch stages (display names only; ids unchanged): Warm-Up & Visibility, Stir the Problem, Share Your Story, Prove Your Expertise, Position Your Offer, Gather Your People, Fill Your Waitlist, Build the Hype, Open the Doors, Answer the Doubts, Show the Proof, Last Call
- [x] Studio: after-launch posts (delivery, review request, keep-selling, weekly value, thank-you) and personal branding posts (my story, meet-the-person, what I stand for, lesson from a mistake, prove your expertise), each in caption / Reel-TikTok / Story / WhatsApp status; "Open Authority Content Studio" card
- [x] 120 interactive launch scripts in the Studio (#scripts): 12 stages × 10, filled for the business, search, stage/used/saved filters, copy, mark used, save, AI rewrite; day cards link to their stage; sales page says 120
- [x] Stripe Payment Link wired into the sales page and /access/ buy buttons
