# CLAUDE.md — BSP AI WorkReady · Interview IQ

Context for Claude (and humans) picking this project up later.

## What this is
**BSP AI WorkReady · Interview IQ — AI Interview Lab, powered by Business Startup Powerhouse.**
A free, guest-first AI interview simulator. **Alex** (always "Alex · BSP AI Interviewer", never
"bot", "agent" or "recruiter") runs adaptive, profession-specific interviews in voice or text mode.
Live at **https://strong-dragon-d8b60f.netlify.app** (Netlify site `strong-dragon-d8b60f`).

Owner constraints (keep unless told otherwise):
- **Zero cost, no accounts, no API keys, no backend.** Everything runs in the browser.
- **Guest-first:** never block interviews, reports or practice behind sign-up.
- Voice = Web Speech API (TTS + STT) with automatic fallback to typing.
- The "AI" is a structured question bank + deterministic adaptive engine + rubric scorer (no LLM).
- **Original content only.** Never copy questions from hiring/AI-training platforms.
- Transferable-skills roles (janitor, retail…) get a Transferable Skills Interview, never an invented AI job.
- Alex stays neutral during interviews (no "Great answer!"); feedback goes in the report.
- Design: premium dark navy / near-black with indigo, purple and electric violet accents.

## Upgrade roadmap
The owner is delivering a 3-part upgrade brief. **Prompt 1** (foundation, Alex, role system, setup) and
**Prompt 2** (adaptive engine + memory, voice interview, timed Practice Lab, interview↔practice
integration) are done, plus the **Prompt 2 correction pass** (question-bank integrity, recommended-vs-selected
interview types, competency evidence) and **Prompt 3** (rubric scoring + evidence, premium report, history/trends,
skills/readiness/dashboard, CV intelligence, AI Work Profile, interview question bank + variants, local admin studio,
privacy, error states, Netlify hardening) are done. See `docs/PROMPT3_COMPLETION.md`. Extend these systems; don't replace them.

Prompt 3 rules that must hold:
- **Scoring is rubric-first** (`js/scoring.js`): per-answer 0–4 levels per dimension, then % = level ÷ 4; overall = weighted
  dims the interview tested. Every score keeps evidence found/missing, verbatim excerpts and how-to-improve. The adaptive
  engine still uses the internal 0–100 `a.score` for pacing only; anything shown to users uses `ansPct(a)` / `s.scores.role`.
- **No fabrication:** stronger-structure advice never invents experience; CV items keep their source line; only confirmed
  CV items and accepted mappings are used; Alex quotes confirmed CV text verbatim.
- **Never** "chance of getting hired / passing" or "employment probability". Paths use "BSP Internal Fit".
- **Admin is local-only** (`#/admin`): it must never pretend to change the public site. Generated questions stay DRAFT.
- Only PUBLISHED questions reach users (interview: `InterviewBank.finalizePool`; practice: `QuestionBank.pool`).

Prompt 2 rules that must hold:
- Practice sessions are ALWAYS exactly 10 questions (`PRACTICE_QUESTIONS`); Easy 15 / Medium 20 / Hard 25 min.
  There is no practice-length picker. Timer is wall-clock (`endsAt`) so refresh never resets it; 00:00 auto-submits.
- Never score accent, pitch, regional speech, gender presentation or perceived ethnicity. Only transcript text is
  scored (fillers stripped). Raw audio is never recorded or stored.
- Alex statuses: "Alex is speaking…", "Alex is listening…", "Alex is reviewing your response…" (never "thinking").
- Healthcare: fictional educational scenarios only; never ask for real patient info; no diagnosis.
- Bilingual FR-EN: Mostly English / Mostly French / Balanced (40/40/20); never label someone native/fluent/certified.

Correction-pass rules that must hold:
- **Practice integrity:** a session's 10 questions all share the chosen category + difficulty and are `published`
  (`QuestionBank.select`). NEVER top up from other categories or levels. Fewer than 10 → no session, and the UI says
  "More practice questions are being prepared for this level." A category is AVAILABLE only with ≥10 published
  Easy, Medium and Hard; otherwise it shows COMING SOON (not a link). `node tests/engine-check.js` prints the counts.
- **Interview types:** the profession only RECOMMENDS (`recommendedType`). `App.setup.type` is the user's selection,
  `App.setup.typeChosen` marks an explicit choice; never overwrite a chosen type unless it isn't offered for the new
  profession (`allowedTypes`). Bilingual needs two `languages`; one language → `language` (Language Evaluation Interview).
- **Legacy single tasks** (`Repo.practice`) stay readable as "LEGACY PRACTICE … 1 Task · Completed before Practice Lab
  upgrade" and are excluded from analytics; only `standardPracticeSessions()` feed progression/recommendations/progress.

## Project layout (static, no build step)
| Path | Purpose |
|---|---|
| `index.html` | Shell: header/nav, `<main id="app">`, footer, script tags (order matters) |
| `css/app.css` | All styles (tokens in `:root`) |
| `js/data/legacy-bank.js` | Original v1 question bank (`CORE`, `DOMAINS`), kept verbatim and reused |
| `js/data/competencies.js` | `COMPS`: competency library (signals, knowledge/scenario/behavioral prompts) |
| `js/data/professions.js` | `GROUPS`, `PROFESSIONS` (145), `PROF` lookup, `TRANSFERABLE_HINTS` |
| `js/data/items.js` | `ALEX` script, `TYPES` (+stage `weights`), `MODES`, `LEVELS`, `DIFFS`, `LENGTHS`, `FOLLOWUP` (7 types), `LANG_BALANCE`, `FINALS`, `ITEM_SETS`, `LEGACY_MAP`, `PRACTICE_TASKS` (v1, unused) |
| `js/data/roles.js` | `ROLE_MODELS` (18 role models → 54 professions): curated questions with follow-ups, artifacts, memory triggers, finals; FR-EN bilingual bank; extra competencies |
| `js/data/concepts.js` | Interview `CONCEPTS`, each with 5 meaningfully different variants (e.g. Project Schedule Risk: vendor delay, resource absence, regulatory delay, technical dependency, budget freeze) |
| `js/data/bank-critique.js` | Response Critique generator (select accurate + specific critiques) |
| `js/scoring.js` | `RUBRIC_LEVELS`, `ROLE_DIMS`, `TYPE_DIMS`, `rubricFor`, `computeRoleScore`, `strongerStructure`, `responseAnalytics`, `nextInterviewFor` |
| `js/interview-bank.js` | `InterviewBank` (record catalog, statuses, local edits, `finalizePool`), `conceptQuestionsFor`, `generateDrafts`, `applyRoleOverrides`, Alex settings |
| `js/cv.js` | CV parse (paste / .txt upload / build), review UI, `CV` API, AI Experience Mapper (`buildMappings`), `cvIntroLine` |
| `js/insights.js` | `SKILLS` taxonomy, `skillEvidence`, `readinessModel`, `nextBestActions`, dashboard / readiness / skills / activity / AI Work Profile screens |
| `js/report-ui.js` | Alex Interview Report, Interview History, Score Trends |
| `js/admin.js` | Local Content Studio: question manager, generator, role manager, Alex settings, export/import |
| `js/data/practice-core.js` | Practice constants, `PRACTICE_COMPETENCIES`, 24 `PRACTICE_CATEGORIES` (each with a competency mapping `{id, from:[grading components]}` and common errors), question constructors (`qRank`, `qEval`, `qFact`, `qMulti`, `qSingle`, `qRewrite`, `qTranscribe`, `qHallu`), `LEGACY_TASK_REVIEW` |
| `js/data/bank-*.js` | Original question content per family: ranking, evaluation (+domain expert), facts (fact checking, hallucination, research), annotation (6 categories), language (FR-EN, multilingual, transcription), generalist, coding |
| `js/data/bank-generated.js` | Deterministic seeded generators (instruction following, rewriting, documents, spreadsheets, image labelling, image-to-text), materialised as stable ids `prefix-difficulty-n` |
| `js/question-bank.js` | `COMPETENCY_REGISTRY`, `QuestionBank` (full question schema, statuses, strict selection, availability audit, usage stats, admin overrides) |
| `js/voice.js` | `Mic` (getUserMedia level meter, released after use) and `createRecognizer` (SpeechRecognition with pause/resume) |
| `js/practice.js` | Practice engine: session build (always 10), grading per format, submit/results, progression, `getRecommendations` |
| `js/interview-ui.js` | Mic check, live interview screen (voice state machine, Alex controls), `renderArtifact` |
| `js/practice-ui.js` | Practice Lab home/setup/runner/results/history, `recommendationsHTML` |
| `js/storage.js` | `StorageAdapter` (localStorage → memory fallback) + `Repo` (sessions, practice [legacy], practiceSessions, questionStats, bankOverrides, prefs, customProfessions, cv, interviewBank, roleOverrides, alexSettings, admin; `clearGroups`), v1 migration |
| `js/engine.js` | `Speech` (lang/rate/mute), `scoreAnswer` (+communication, stem match, filler strip, language check), question architecture, blueprint (stage flow + weights), same-session memory, follow-ups, session model, area-weighted reports |
| `js/app.js` | Hash router, nav, home, setup wizard, results/report, history, progress, about, boot (loads last) |
| `tests/regression.mjs` | Playwright browser regression suite (283 checks incl. Prompt 3 journeys 1–6; voice flows mocked) |
| `tests/spa-server.py` | Local stand-in for Netlify's `/* → /index.html` fallback (deep-link test) |
| `tests/engine-check.js` | Headless sweep: every profession × allowed type builds a pool and finishes an interview |
| `logo.png` / `logo.svg` | Header logo + fallback; `log.png.jpeg` is the source logo asset (unused) |

Scripts are classic (not modules) and share globals; load order is in `index.html`.
Top-level `function` declarations are global, which is what inline `onclick` handlers rely on.

## Key concepts
- **Profession** `{id, title, group, comps[], ai, set, kw?, lang?, tech?, lingual?}`. Custom professions
  (from "Add My Profession") add `custom:true, customComps, customItems, profile` and live only in `Repo.customProfessions`.
- **Question** (built by `mkQ`): `profession, competency, compLabel, difficulty(1–3), questionType, scenario,
  questionText, expectedStrongSignals, commonWeakSignals, followUpRules, scoringRubric`.
  Types: intro, knowledge, behavioral, scenario, ai_eval, error_detection, explanation, practical (+ adaptive follow-up).
- **Interview types** (`TYPES`, 9 incl. `language`) each have a `plan`, stage `weights` and a `why` line;
  `allowedTypes(p)` → `typeAvailability(p)`; `recommendedType(p)`; sessions store `selectedInterviewType` + `recommendedInterviewType`.
- **Competency evidence:** interview answers carry `competencyEvidence` ([{id, name, score, found, missing}]) and reports
  `scores.competencyEvidence`; practice results carry per-question `competencyScores` and `results.competencyEvidence`.
  Ids come from `COMPETENCY_REGISTRY`.
- **Practice question** (`QuestionBank.normalize`): id, category, subcategory, profession, domain, competencies, difficulty,
  questionType, prompt, scenario, referenceMaterial, responseA/B, answerOptions, expectedOutcome, expectedSignals,
  commonErrors, rubric, explanation, version, status (draft|review|published|archived|legacy), createdAt, updatedAt, timesUsed.
  Sessions keep a `snapshot` of served question versions.
- **Blueprint:** `buildBlueprint` allocates slots by stage weights (Background 20 / Domain 25 / Reasoning 20 / AI 20 /
  Communication 15 by default; per type in `TYPES[x].weights`) in flow order, ending with a `final` question.
  Bilingual FR uses language slots (`lang:en|fr|x`). Deep length extends/shortens before the final question.
- **Memory:** `memoryQuestion` turns earlier answers into callbacks ("You mentioned that you …") from role
  `memory` triggers or a generic experience callback; it only replaces reasoning slots (1 per standard, 2 for full/deep).
- **Session** (`createSession`): `sessionId, profession, interviewType, mode, experienceLevel, difficulty, length,
  questionTarget, questionRange, currentQuestion, answers[], followUps[], asked[], startedAt, completedAt,
  status (not_started|in_progress|completed|abandoned), scores, feedback, candidate, adaptive{target,revisit,fuUsed,fuBudget}, phase, pending`.
  Saved on every step, so in-progress interviews survive reloads (`prefs.activeSessionId`).
- **Adaptive engine:** `pickNext` chooses the slot type, least-covered competency, difficulty near `adaptive.target`
  and `revisit` competencies (weak answers). `adapt()` raises the target only after two strong answers
  (or one very strong answer at senior/expert level) and lowers it after two weak ones. `decideFollowUp()`: clarify (short),
  evidence (hedging), depth (missing concepts / weak structure), tradeoff · edge · challenge · ai (strong answers),
  plus a harder follow-up after the AI-evaluation stage. Question-specific `fu` text overrides defaults. Budget per length.
- **Scoring:** Relevance 40 / Depth 25 (scaled to level word targets) / Structure 20 / Specificity 15, minus hedging.

## Routes
`#/` home · `#/interview` hub · `/interview/start` (7-step wizard) · `/interview/alex` · `/interview/domain` ·
`/interview/ai-evaluation` · `/interview/history` · `/interview/mic-check` · `/interview/session` · `#/practice` ·
`/practice/setup/:category` · `/practice/run` · `/practice/results/:id` · `/practice/history` · `#/results` · `/results/:id` · `#/progress` (dashboard) ·
`/progress/readiness` · `/progress/skills` · `/progress/trends[/:professionId]` · `/progress/activity` · `#/profile` · `#/cv` · `/cv/mapper` · `#/privacy` · `#/about` ·
`#/admin[/:tab]` (local studio, not in nav). `netlify.toml` serves index.html for any path; index.html turns `/path` into `#/path`.
Unknown routes fall back to home. Add new nav links only with a working route.

## Run / test locally
```bash
python3 -m http.server 4555            # then open http://localhost:4555
node tests/regression.mjs              # needs Playwright + Chromium; BASE_URL overrides the URL
node tests/engine-check.js             # no browser needed (~5 s): engine + practice self-check
```
The mic needs `localhost` or HTTPS. Run both suites before every push.

## Deploy
Static site with no build step. Preferred: connect the Netlify site to `olufemakin/asea_deployment` (branch `main`).
`netlify.toml` publishes the repo root.

## Conventions
- Match the compact JS style (template-string screens, short helpers); escape user text with `H()`.
- Persist through `Repo` only. Never call `localStorage` directly, so a cloud adapter can be added later.
- Record notable changes in `tasks/todo.md`.
