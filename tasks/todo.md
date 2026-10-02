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
