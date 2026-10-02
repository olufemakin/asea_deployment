# Prompt 3 completion report

Date: 2026-10-02. Every item below was checked by `tests/regression.mjs` (283/283 passing) and
`tests/engine-check.js` (OK) in headless Chromium, unless it is marked otherwise.

## Working (verified)
- **Rubric scoring.** Each answer gets a 0–4 rubric level per dimension, using written criteria. The dimensions are Domain Knowledge, Professional Reasoning, Professional Judgment, AI Evaluation Ability, Communication, Instruction Following and Attention to Detail; only the dimensions an interview type tests are included. Levels are converted to percentages afterwards, and the overall BSP Role Interview Score is the weighted average of those dimensions.
- **Evidence for every score.** Each dimension and the overall score have a "Why did I get this score?" panel: evidence found, evidence missing, excerpts quoted verbatim from the candidate's own answers, and how to improve.
- **Alex Interview Report.** It has a header (BSP AI WorkReady · Interview Report · Alex · profession · interview · mode · difficulty · overall /100) and all 8 sections. The answer review covers question, answer/transcript, competency, score, signals found and missing, Alex's feedback, and "A stronger structure could be:". It never suggests experience the candidate didn't describe.
- **Interview history.** Shows profession, type, mode, difficulty, date, duration and score, with View report, Retry, Compare progress and Delete.
- **Score trends.** Per-profession attempt list, chart, and trends for Reasoning, Domain Expertise, AI Evaluation and Communication.
- **Skills & Scores.** 14 skills, each with Practice %, Alex interview %, a CV evidence label and a current evidence %, plus the inputs behind them. Assessment and learning are reserved as future evidence sources.
- **BSP Interview Readiness.** Six components, each with its inputs. It never claims a chance of being hired or passing.
- **Progress Dashboard.** Readiness, practice accuracy, interviews, practice sessions, strongest skill, skill to improve, recent score, CV status, and a deterministic next best action.
- **CV entry.** Paste, upload (.txt/.md), or Build From Profile. The rule-based extractor finds roles, experience, responsibilities, achievements, education, skills, tools, languages and certifications, and every item keeps its source line. Items can be confirmed, edited or deleted, and only confirmed items are trusted.
- **AI Experience Mapper.** Labels each mapping EVIDENCE SUPPORTED, POTENTIALLY SUPPORTED or EVIDENCE REQUIRED, with Accept, Edit and Ignore. Only accepted mappings count.
- **CV with Alex.** The "Use my confirmed CV" toggle lets Alex personalise the intro and one question by quoting confirmed CV text verbatim.
- **My AI Work Profile.** Professional domain, transferable / interview / practice strengths, development areas, and 8 paths labelled "BSP Internal Fit" (never an employment probability).
- **Interview question bank.**
  - Every interview question has the full record: id, profession, competency, difficulty, type, scenario, question, reference material, signals, common errors, rubric, follow-up rules, status, version and times used.
  - Statuses are DRAFT, REVIEW, PUBLISHED and ARCHIVED; only published questions reach interviews.
  - There are 5 concepts with 5 variants each.
  - Unseen and not-recently-used questions are served first.
- **Practice Lab.** All 24 categories are available (Response Critique was completed with 36 questions).
- **Local Content Studio (`#/admin`).**
  - Question manager: create, edit, duplicate, publish, archive and send to review, with filters for profession or category, competency, difficulty, type and status.
  - Question generator: draft-only.
  - Role manager: profession, industry, aliases, competencies, interview types, question concepts and scoring weights.
  - Alex settings: avatar, introduction, tone, default voice, playback speed and completion message. Name and title are locked to "Alex" / "BSP AI Interviewer".
  - Export / import as JSON.
- **Privacy, data and notices.**
  - A Privacy page explains voice processing, transcripts, CV data and browser storage.
  - Clear My Data removes interview history, practice history, CV data and preferences separately.
  - The integrity notice appears in the footer, on Home, on the setup summary, in the Practice Lab and on About.
- **Error, empty and loading states.**
  - Error states: engine failure ("AI unavailable", with the answer kept and options to retry or end the interview), microphone unavailable, speech recognition unsupported, question generation failed, session restore failed, storage unavailable (banner), and a script that fails to load (recovery screen instead of a blank page).
  - Empty states use the requested wording.
  - Loading states: "Alex is reviewing your response…" and "Preparing your interview report…".
- **Mobile (390 px).** No sideways scrolling on Home, Setup, Practice, Results, History, Progress, Trends, CV and Privacy. The interview screen shows Alex, then the question, then the answer box, with progress visible. In Practice, the timer and progress stay above the question.

## Fixed
- A race where the new report loading screen could pull the user back to the report after they had navigated elsewhere.
- The microphone meter used a simulated "fake" level animation when no real level was available. It now shows a static, clearly inactive bar with an explanation.
- Privacy wording had said "nothing is sent to a server" during voice answers. It now explains that some browsers' speech recognition may send audio to the browser maker.
- Report verdicts no longer imply passing screenings.
- On mobile, the long introduction pushed the question off-screen. It now folds away.

## Partial
- **CV parsing** is rule-based. It handles common CV layouts, but unusual formats need manual review. That is why every item must be confirmed and can be edited, deleted or added by hand.
- **Question generator** is template-based (original BSP templates plus the competency library), not an AI model. Drafts need human review before publishing.
- **Local Content Studio** changes apply only in that browser. To publish them for everyone, export the JSON and commit it to the repository.

## Browser-dependent
- Speech-to-text needs Chrome or Edge (desktop or Android), and those browsers may send audio to the vendor for transcription. In other browsers you type your answers; Alex can still speak where speech synthesis is available.
- Voice choice in Alex settings depends on the voices the browser reports.
- Live microphone level needs `getUserMedia` (HTTPS or localhost).

## Not yet implemented
- PDF / Word CV parsing. It isn't faked: users are asked to paste the text.
- Server-side accounts, cloud sync and a secure production admin. The storage layer (`Repo`) is ready for a cloud adapter.
- An LLM-based question generator or scorer. Both are deterministic by design (no API keys, zero cost).

## Test results
- Journey 1: PM · Text · AI Domain · Experienced · Adaptive · 10 questions → report ✔
- Journey 2: Nurse · Voice · mic check · voice unavailable → text fallback → report ✔
- Journey 3: AI Response Evaluation · Easy · 10 / 15 min · navigate · flag · submit → results ✔
- Journey 4: Preference Ranking · Medium · 10 / 20 min · timer expiry → auto-submit ✔
- Journey 5: paste CV → analyze → confirm / edit / delete → mapper → personalised interview ✔
- Journey 6: history → open earlier result → retry → compare scores ✔
- Totals: regression 283/283; engine-check 614 profession × type combinations and 144 strict practice sessions, 0 issues.

## Deployment
- There is no build step. `netlify.toml` (validated) publishes the repo root and adds the `/* → /index.html 200` SPA fallback; `index.html` turns `/path` into `#/path`.
- Deep-link refresh was tested with `tests/spa-server.py`, a local stand-in for that fallback.
- All referenced scripts, styles and logos load (tested).
- An actual Netlify deploy could not be run from the development environment. It needs the repository connected to the Netlify site, or a Netlify Drop upload of the deploy zip.
