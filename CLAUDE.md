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
integration) are done. Prompt 3 will follow; extend the systems below, don't replace them.

Prompt 2 rules that must hold:
- Practice sessions are ALWAYS exactly 10 questions (`PRACTICE_QUESTIONS`); Easy 15 / Medium 20 / Hard 25 min.
  There is no practice-length picker. Timer is wall-clock (`endsAt`) so refresh never resets it; 00:00 auto-submits.
- Never score accent, pitch, regional speech, gender presentation or perceived ethnicity. Only transcript text is
  scored (fillers stripped). Raw audio is never recorded or stored.
- Alex statuses: "Alex is speaking…", "Alex is listening…", "Alex is reviewing your response…" (never "thinking").
- Healthcare: fictional educational scenarios only; never ask for real patient info; no diagnosis.
- Bilingual FR-EN: Mostly English / Mostly French / Balanced (40/40/20); never label someone native/fluent/certified.

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
| `js/data/practice-bank.js` | Practice Lab: 24 `PRACTICE_CATEGORIES`, ~150 static items (`PB`), generators (spreadsheet, image labelling, image-to-text) |
| `js/voice.js` | `Mic` (getUserMedia level meter, released after use) and `createRecognizer` (SpeechRecognition with pause/resume) |
| `js/practice.js` | Practice engine: session build (always 10), grading per format, submit/results, progression, `getRecommendations` |
| `js/interview-ui.js` | Mic check, live interview screen (voice state machine, Alex controls), `renderArtifact` |
| `js/practice-ui.js` | Practice Lab home/setup/runner/results/history, `recommendationsHTML` |
| `js/storage.js` | `StorageAdapter` (localStorage → memory fallback) + `Repo` (sessions, practice, prefs, customProfessions), v1 migration |
| `js/engine.js` | `Speech` (lang/rate/mute), `scoreAnswer` (+communication, stem match, filler strip, language check), question architecture, blueprint (stage flow + weights), same-session memory, follow-ups, session model, area-weighted reports |
| `js/app.js` | Hash router, nav, home, setup wizard, results/report, history, progress, about, boot (loads last) |
| `tests/regression.mjs` | Playwright browser regression suite (137 checks, voice flows mocked) |
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
- **Interview types** (`TYPES`) each have a `plan` of question-type slots; `typeAvailability(p)` gates
  technical / bilingual / transferable; `recommendedType(p)`.
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
`/practice/setup/:category` · `/practice/run` · `/practice/results/:id` · `/practice/history` · `#/results` · `/results/:id` · `#/progress` · `/progress/skills` · `/progress/activity` · `#/about`.
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
