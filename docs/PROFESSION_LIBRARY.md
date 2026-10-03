# Profession Library expansion — completion report

Date: 2026-10-02.
- **Browser suite:** `tests/regression.mjs` passed 334/334 three runs in a row.
- **Headless sweep:** `tests/engine-check.js` passed: every profession and each interview type it allows completed a full interview, 1,894 combinations with 0 issues.

## How it works (no profession-specific code)
- **Configuration.** Professions come from three places:
  - `js/data/professions.js`: the 145 original hand-built professions, kept unchanged;
  - `js/data/profession-catalog.js`: categories, family templates, seed list, aliases, specialties and pay seed;
  - Local Content Studio overrides and bulk imports.
- **Families.** A **family template** supplies the competencies, practical task item set, AI competency, interview types, recommended type, practical tasks, recommended practice and interview areas. This lets the library grow to thousands of professions without new code. Adding a profession is one line in `PROFESSION_SEED`, or a row in the admin bulk import.
- **Dynamic interviews.** Any profession without a specialised question bank still gets a dynamic domain interview, from its family template plus the shared concept/variant bank.

## Acceptance criteria
| Criterion | Status |
|---|---|
| Profession system is config driven | ✔ Data files plus local admin store. There is no server database: the app is static by design, so admin changes are local until exported and committed. |
| Search works (title, partial, alias, specialty, industry, family) | ✔ All 40 names in brief #33 return a valid result. |
| Categories / browse | ✔ 59 categories, browse chips, Recent, Recommended for You. |
| Aliases (#35) | ✔ RN → Registered Nurse; VA → Virtual Assistant; MD → Medical Doctor; frontend → both front-end records; PM → Project Manager and Product Manager shown as choices, never auto-selected. |
| Specialties | ✔ Chips in setup. Aliases can carry a specialty (e.g. "Corporate Lawyer" opens Lawyer · Corporate). Specialty-specific competencies come from config. |
| Hundreds of records | ✔ 445 records. Admin add and bulk import add more. |
| Custom professions + dynamic interviews (#34) | ✔ Veterinary Practice Manager: profile created, competencies generated, Alex interview available, no fabricated credential or vacancy. |
| Multiple careers | ✔ Primary / secondary / additional, each with its own experience, scores and readiness. The user picks the profession for each interview. |
| Recommended interview type never forced | ✔ PM → AI Domain, Software Engineer → Technical, FR-EN → Bilingual, Janitorial Supervisor → Transferable, Lawyer → AI Domain. All editable. |
| Competency mapping | ✔ Each profession's core / technical / professional competencies map to the competency registry and Skills & Scores. |
| Profession-specific practice recommendations | ✔ Shown on the profession profile and in setup, and used in report recommendations (e.g. Accountant → Spreadsheet Evaluation). |
| CV profession detection | ✔ Confirmed CV roles are matched to library professions (closest matches unticked) and only added after the user confirms. |
| Pay verification metadata | ✔ Source, last verified, status, currency, period and notes on every record. |
| Unverified pay not presented as current | ✔ Seed pay appears only on the profile page, labelled "Indicative / unverified range". It is hidden from cards and never used for recommendations. |
| No implied vacancy | ✔ Every profile shows "No Current Opportunity Verified" unless a dated, verified opportunity is added in admin. |
| Admin adds professions without code | ✔ Admin → Professions (add / edit / archive / aliases / category / family / specialties / competencies / types / tasks / pay / opportunities) plus CSV bulk import. |
| Existing Alex interview, voice, Practice Lab | ✔ All previous regression checks still pass. |
| Authentication still works | n/a: Interview IQ has no authentication. It is guest-only by design; nothing was added or removed. |
| Netlify build succeeds | There is no build step. `netlify.toml` validated, and all assets load in the deep-link test. An actual Netlify deploy happens when `main` is updated. |
| No blank screens / dead buttons | ✔ All new routes render, and the inline-handler check passes. |

## Honest notes
- **Pay data.** Only the 11 example ranges written in the brief are stored. They are marked "User-provided seed", currency assumed USD from the "$" symbol. The brief refers to "other ranges supplied in the existing seed data", but those weren't in the repository, so they were not invented.
- **Duplicates kept as aliases.** These were merged as aliases rather than separate records: High School / Elementary School Teacher, Attorney, Transcriptionist / Content Transcription Expert, Data Labeler, Truck Driver, Carer, Logistics Driver, Legal Consultant, Corporate / Litigation Lawyer.
- **Duplicates kept as records.** Existing records Physician and Medical Doctor both remain, because existing professions weren't deleted. Front-End Developer and Software Engineer — Front-End are separate, as the brief's search example expects both.
- **Bug fix.** While re-running the suite I found and fixed a real race in Practice Lab autosave: a flag set within 250 ms of typing could be overwritten. A regression test now covers it.
