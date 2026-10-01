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
