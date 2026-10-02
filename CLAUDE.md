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
The owner is delivering a 3-part upgrade brief. **Prompt 1 (foundation, Alex, role system,
interview setup) is done.** Prompts 2 and 3 will follow; extend the systems below, don't replace them.

## Project layout (static, no build step)
| Path | Purpose |
|---|---|
| `index.html` | Shell: header/nav, `<main id="app">`, footer, script tags (order matters) |
| `css/app.css` | All styles (tokens in `:root`) |
| `js/data/legacy-bank.js` | Original v1 question bank (`CORE`, `DOMAINS`), kept verbatim and reused |
| `js/data/competencies.js` | `COMPS`: competency library (signals, knowledge/scenario/behavioral prompts) |
| `js/data/professions.js` | `GROUPS`, `PROFESSIONS` (145), `PROF` lookup, `TRANSFERABLE_HINTS` |
| `js/data/items.js` | `ALEX` script, `TYPES`, `MODES`, `LEVELS`, `DIFFS`, `LENGTHS`, `FOLLOWUP`, `ITEM_SETS`, `LEGACY_MAP`, `PRACTICE_TASKS` |
| `js/storage.js` | `StorageAdapter` (localStorage → memory fallback) + `Repo` (sessions, practice, prefs, customProfessions), v1 migration |
| `js/engine.js` | `Speech`, `scoreAnswer`, question architecture (`buildPool`, `mkQ`), session model, adaptive engine, reports |
| `js/app.js` | Hash router, nav, all screens |
| `tests/regression.mjs` | Playwright browser regression suite (65 checks) |
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
- **Session** (`createSession`): `sessionId, profession, interviewType, mode, experienceLevel, difficulty, length,
  questionTarget, questionRange, currentQuestion, answers[], followUps[], asked[], startedAt, completedAt,
  status (not_started|in_progress|completed|abandoned), scores, feedback, candidate, adaptive{target,revisit,fuUsed,fuBudget}, phase, pending`.
  Saved on every step, so in-progress interviews survive reloads (`prefs.activeSessionId`).
- **Adaptive engine:** `pickNext` chooses the slot type, least-covered competency, difficulty near `adaptive.target`
  and `revisit` competencies (weak answers). `adapt()` raises the target only after two strong answers
  (or one very strong answer at senior/expert level) and lowers it after two weak ones. `decideFollowUp()`: clarify (short),
  evidence (hedging), probe (missing concepts), deepen (strong + adaptive/hard + experienced+). Budget per length.
- **Scoring:** Relevance 40 / Depth 25 (scaled to level word targets) / Structure 20 / Specificity 15, minus hedging.

## Routes
`#/` home · `#/interview` hub · `/interview/start` (7-step wizard) · `/interview/alex` · `/interview/domain` ·
`/interview/ai-evaluation` · `/interview/history` · `/interview/session` · `#/practice` · `/practice/task/:id` ·
`/practice/history` · `#/results` · `/results/:id` · `#/progress` · `/progress/skills` · `/progress/activity` · `#/about`.
Unknown routes fall back to home. Add new nav links only with a working route.

## Run / test locally
```bash
python3 -m http.server 4555            # then open http://localhost:4555
node tests/regression.mjs              # needs Playwright + Chromium; BASE_URL overrides the URL
node tests/engine-check.js             # no browser needed
```
The mic needs `localhost` or HTTPS. Run both suites before every push.

## Deploy
Static site with no build step. Preferred: connect the Netlify site to `olufemakin/asea_deployment` (branch `main`).
`netlify.toml` publishes the repo root.

## Conventions
- Match the compact JS style (template-string screens, short helpers); escape user text with `H()`.
- Persist through `Repo` only. Never call `localStorage` directly, so a cloud adapter can be added later.
- Record notable changes in `tasks/todo.md`.
