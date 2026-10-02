# BSP AI WorkReady · Interview IQ

**AI Interview Lab — Powered by Business Startup Powerhouse (BSP)**

Practice realistic AI-led interviews with **Alex, your BSP AI Interviewer**. The lab covers
professional, domain-expert, AI-evaluation, behavioral and transferable-skills interviews for
more than 140 professions. It's free, needs no sign-up, and runs entirely in your browser.

Live: **https://strong-dragon-d8b60f.netlify.app**

## Features
- 🎙️ **Voice or text interviews.** Alex speaks each question, and in voice mode listens to your answer (Web Speech API), with automatic fallback to typing.
- 🧑‍💼 **Alex, the official interviewer.** Alex is professional, calm and neutral, uses a consistent introduction tailored to your profession, and asks adaptive follow-ups.
- 🔎 **Profession Library.** 445 professions in 59 categories, searchable by title, partial title, alias (RN, VA, MD, HVAC…), specialty, industry or profession family. Ambiguous abbreviations like "PM" show the choices instead of guessing. Browse by category chips, Recent and Recommended for You. Every profession has a profile page: competencies, interview areas, transferable AI skills, recommended interview types and practice. Practising for a profession never implies a paid AI role exists for it ("No Current Opportunity Verified").
- ➕ **Add Your Profession.** Not listed? Describe it (industry, specialty, responsibilities, skills, education, credentials, interview goal) and Interview IQ builds a private, dynamic interview profile from a matching profession-family template. Nothing about you is invented.
- 👥 **My Professions.** Keep several careers (primary, secondary, additional), each with its own experience, interview scores and readiness, and choose which one Alex uses. Roles in your confirmed CV can be suggested for you to add; nothing is added silently.
- 🧭 **Step-by-step setup:**
  1. Profession
  2. Mode: Voice or Text
  3. Interview type: Domain Expert, AI Domain Expert, AI Training Readiness, Behavioral, Technical, Bilingual, Transferable Skills, or Full Mock
  4. Experience: Entry to Expert
  5. Difficulty: Easy, Medium, Hard, or Adaptive
  6. Length: Quick (5), Standard (10), Full (15), or Deep Expert (12–20, adaptive)
  7. Summary
- 🔀 **Adaptive engine.** Strong answers lead to deeper follow-ups and harder scenarios. Vague answers get a request to clarify, and competencies you haven't shown yet get explored.
- 📊 **Evidence-based reports (BSP Role Interview Score).** Each answer is rated on an explicit 0–4 rubric per dimension (Domain Knowledge, Professional Reasoning, Professional Judgment, AI Evaluation Ability, Communication, Instruction Following, Attention to Detail), and only then converted to a score. Every score has a **Why did I get this score?** panel: evidence found, evidence missing, excerpts from your own answers, and how to improve. The report covers overall performance, competency breakdown, what you did well, where to improve, an answer-by-answer review (with "A stronger structure could be:"), time/response analytics, recommended practice and the recommended next interview.
- 🗂️ **Interview history and score trends.** View, retry and compare attempts; per-profession trend lines for Reasoning, Domain Expertise, AI Evaluation and Communication.
- 🧾 **CV Intelligence.** Paste your CV, upload a .txt/.md file, or build it from a short form. Every extracted item shows the exact line it came from and must be confirmed, edited or deleted before it's trusted. The **AI Experience Mapper** labels each transferable skill as Evidence supported, Potentially supported or Evidence required; you accept, edit or ignore each one. Switch on **Use my confirmed CV** and Alex personalises questions using only confirmed facts. PDF/Word parsing isn't attempted in the browser: paste the text instead.
- 🧭 **Skills, readiness and your AI Work Profile.** Skills combine Practice, Alex interview and CV evidence, each showing its inputs. BSP Interview Readiness shows its six components and inputs. The AI Work Profile shows strengths, development areas and potential AI-work paths labelled "BSP Internal Fit" (never an employment probability). The Progress Dashboard suggests a deterministic **next best action**.
- 🧠 **Same-session memory.** Alex remembers your earlier answers ("You mentioned that vendor delays affected your software implementation…") and builds on them instead of asking you to repeat yourself.
- 🧭 **Realistic interview flow.** Background → domain knowledge → reasoning → scenario → AI evaluation → a harder follow-up → final question, weighted 20/25/20/20/15 (adjusted per interview type).
- 🖼️ **Practical exhibits.** Risk registers, reconciliations, code, dashboards, lesson plans, captions, and source text with two translations, to evaluate out loud or in text.
- 🇫🇷 **French-English bilingual interviews.** Mostly English, Mostly French or Balanced (40/40/20). Alex switches languages naturally.
- 🎤 **Voice interview.** A microphone check with level meter and sample transcript, and Alex speaking/listening/reviewing statuses. Controls: replay, mute and playback speed, plus start/pause/finish answer. You can review and correct the transcript before submitting, and both mic and transcription failures fall back to text. Audio is never stored, and accent is never scored.
- 🧭 **Recommended, never forced.** Your profession recommends an interview type ("Recommended for Your Background"); you can still pick any type offered for that role. Bilingual interviews need two configured languages; single-language evaluators get a Language Evaluation Interview.
- ⏱️ **Timed Practice Lab.** 24 AI-evaluation categories (preference ranking, factuality, hallucination detection, spreadsheets, image labelling, transcription, coding, French-English, …). All 24 are available; a category would show **Coming soon** if it ever dropped below 10 published Easy, Medium or Hard questions.
  - Every session is exactly 10 questions: Easy 15 minutes, Medium 20 minutes, Hard 25 minutes.
  - All 10 questions come from the category and difficulty you chose. Questions are never borrowed from another category or level.
  - Results are broken down by competency, with the evidence each score is based on.
  - Navigation: previous/next, flag for review, autosave, and auto-submit when time runs out.
  - Results include a full question review: expected outcome, what was correct, what was missed, the rubric, and a strong example.
  - Difficulty progression is recommended, never locked.
- 🔗 **Interview ↔ practice.** A weak interview area leads to targeted practice (e.g. AI Evaluation 58% → AI Response Evaluation · Medium · 10 questions · 20 min). Strong practice with weak spoken explanation leads to a Voice Interview With Alex.
- 🔒 **Guest mode and privacy.** No sign-up. History, practice, CV and preferences stay in your browser; **Clear my data** (Privacy page) removes interview history, practice history, CV data and preferences separately. The Privacy page explains voice processing, transcripts, CV data and browser storage honestly.
- 🛠️ **Local Content Studio** at `#/admin` (not linked publicly, PIN-gated): question manager (create, edit, duplicate, publish, archive; filters), template-based question generator (drafts only), role manager and Alex settings. Changes affect only that browser and are exported as JSON for the site owner to commit, because there is no secure server-side admin.
- ⚖️ **Integrity.** Interview IQ is for interview practice and professional development. Do not use it to obtain real-time answers during an active external employer interview or qualification assessment.

All interview and practice questions are **original BSP practice content**. Interview IQ is not
affiliated with any hiring or AI-training platform.

## Project structure
Static site with no build step. See `CLAUDE.md` for the full architecture map.
```
index.html            shell + navigation
css/app.css           styles
js/data/*.js          competencies, professions, interview config, practice tasks, original v1 bank
js/storage.js         storage adapter + repositories (guest mode; cloud-ready)
js/engine.js          speech, scoring, question architecture, adaptive session engine
js/app.js             router + screens
tests/                Playwright regression suite + headless engine check
```

## Run it locally
```bash
# from this folder
python3 -m http.server 4555
# visit http://localhost:4555
```
The microphone needs `localhost` or HTTPS.

## Tests
```bash
node tests/engine-check.js     # every profession × interview type + practice bank, headless (≈5 s)
python3 tests/spa-server.py 4556 &   # Netlify-style SPA fallback for the deep-link test
SPA_URL=http://localhost:4556/ node tests/regression.mjs   # 334 browser checks, incl. journeys 1–6 and the profession library
```

## Live site & auto-deploy
The source of truth is this GitHub repo (`olufemakin/asea_deployment`). To deploy automatically, open
Netlify → Site configuration → Build & deploy → **Link repository**, then pick this repo and the `main`
branch. `netlify.toml` already sets the publish directory to `.` with no build command, so every merge
to `main` redeploys.

Manual alternative: drag this folder onto **Netlify Drop** (https://app.netlify.com/drop). Any static
host works, but it must serve over HTTPS for microphone access.

> **Best experience:** Chrome or Edge (desktop or Android) for full speech-to-text.
> Safari and Firefox can still speak questions aloud; you type your answers.

## Customise
- **Professions:** add a title to `PROFESSION_SEED` in `js/data/profession-catalog.js` (it inherits its category's family template), or add/bulk-import professions in the Local Content Studio (`#/admin` → Professions) and export them.
- **Competencies:** add a `C(...)` entry in `js/data/competencies.js` (signals plus knowledge, scenario and behavioral prompts).
- **Field question items:** edit `ITEM_SETS` in `js/data/items.js`.
- **Alex's script:** edit `ALEX` in `js/data/items.js`.
- **Scoring weights:** edit `scoreAnswer()` in `js/engine.js`.
