# Prompt 3 readiness audit

Audit date: 2026-10-02, after the Prompt 2 correction pass. Prompt 3 features are **not** built yet.
This page shows, for each feature, which data and flows already exist for it to build on and what is still missing.

## Acceptance criteria (correction pass) and how each was verified

| # | Criterion | Verified by |
|---|---|---|
| 1–4 | 10 questions; Easy 15 / Medium 20 / Hard 25 min | regression: "Session has exactly 10 questions", Easy/Medium/Hard timer checks |
| 5–6 | All 10 from the selected category and difficulty | regression purity checks (Hallucination Medium, Preference Ranking, AI Response Evaluation, Data Annotation, French-English × 3 levels, live UI session); engine-check builds 138 strict sessions with 0 issues |
| 7 | No cross-category top-up | `PRACTICE_RELATED` and the top-up code are deleted; regression: a pool of 9 refuses to start and borrows nothing |
| 8 | No duplicates | purity checks (unique ids); engine-check |
| 9 | Available ⇒ ≥10 per difficulty | regression: availability rule holds for all 24; 12 priority categories available |
| 10 | Incomplete categories marked honestly | Response Critique shows COMING SOON (not a link); setup disables Start with "More practice questions are being prepared for this level." |
| 11–12 | Legacy history kept; not equal to 10-question sessions | regression: LEGACY PRACTICE label; `standardPracticeSessions()` excludes legacy single tasks |
| 13 | Old questions reused only after conversion | `LEGACY_TASK_REVIEW`: 4 converted with full metadata (version 1.1, source `legacy:pt-…`), 4 archived with reasons |
| 14–17 | Recommended vs selected; nothing forced | regression: FR-EN, PM, Janitor, Software Engineer, French Evaluator matrices; chosen type kept across profession changes |
| 18–19 | Competency mappings (practice + interview) | every practice question has registered competencies (engine-check); every interview question's competency is in `COMPETENCY_REGISTRY` (engine-check, all built-in professions × types) |
| 20–21 | Competency-level evidence | regression: practice `results.competencyEvidence`; interview `answers[].competencyEvidence` + `scores.competencyEvidence` (score, found, missing) |
| 22 | Session question versions preserved | practice `snapshot.versions` + full question copies in each session (regression); interview sessions store every asked question |
| 23 | Draft/Review/Published/Archived/Legacy | regression: statuses list; only Published served; admin record in Review not served |
| 24–25 | Alex flow, voice and text unchanged | regression: text interview, adaptive follow-ups, memory callbacks, voice (mocked STT/TTS), mic/transcription fallbacks, bilingual |
| 26 | No dead buttons | regression: every inline `onclick` on 16 screens resolves to a function; COMING SOON cards are not links |
| 27 | Regression tests pass | `tests/regression.mjs` 179/179 · `tests/engine-check.js` OK |

## Prompt 3 features: what exists now and what's missing

| Feature | Exists now | Missing for Prompt 3 |
|---|---|---|
| Evidence-based interview scoring | Per answer: `competencyEvidence` [{id, name, score, found, missing}], rubric dims, `hit`/`missed` signals, stage | Scoring weights per competency (currently each answer scores its competency equally) |
| Alex Interview Reports | `scores.{overall, areas, dims, competencies, competencyEvidence, communication}`, `feedback`; report screen | Narrative evidence quotes per competency |
| Interview History | `Repo.sessions` with statuses, timestamps, `selectedInterviewType`, `recommendedInterviewType` | Filters and search UI |
| Score Trends | Timestamped sessions + registry ids that stay stable over time | Trend charts |
| Skills & Scores | One `COMPETENCY_REGISTRY` shared by practice and interviews | Progress page still groups by display name; switch it to group by id |
| Interview Readiness | `readiness()`, `standardPracticeSessions()` | Combine competency coverage with readiness |
| CV Intelligence | Profession model, custom-profession profile, registry to map onto | CV store (`Repo.profile`) and a parser (rule-based, to keep zero cost) |
| AI Experience Mapper | `PRACTICE_CATEGORIES` competency maps, `COMP_TO_CAT`, `allowedTypes` / `recommendedType` | Experience-to-category mapping UI |
| Question Bank Admin | Full schema, statuses, versions, `QuestionBank.audit()`, `Repo.bankOverrides` (patch existing questions **or** add new ones as full records) | Admin screens; there are no accounts, so "admin" is local only |
| Question Generator | `PB_GENERATORS` (seeded, deterministic, stable ids) + `practiceSelfCheck` validation | Generator UI with a Draft → Review → Published workflow |
| Role Manager | `ROLE_MODELS`, `PROFESSIONS`, `allowedTypes`, `languages`, custom professions | Editing UI; role edits stored as overrides |
| Progress Dashboard | Standard practice sessions, interview sessions, competency evidence | Dashboard layout |

## Known limits and risks
- **Response Critique** had no questions at the time of this audit (COMING SOON). It was completed in Prompt 3 (36 questions), so all 24 categories are now available.
- **Content review:** all question content is original but was written without review by subject experts. Plan to have an expert review it, using the Review status, before calling the bank final.
- **AI Training Readiness** is no longer offered to Project Managers, Software Engineers and similar roles. This follows the "can choose" lists in the correction brief; restore it in `allowedTypes()` if that wasn't intended.
- **Storage** is localStorage only (guest mode). Every read and write goes through `Repo`, so a cloud adapter can be added without touching screens.
