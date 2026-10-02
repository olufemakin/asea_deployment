# BSP AI WorkReady · Interview IQ

**AI Interview Lab — Powered by Business Startup Powerhouse (BSP)**

Practice realistic AI-led interviews with **Alex, your BSP AI Interviewer**. The lab covers
professional, domain-expert, AI-evaluation, behavioral and transferable-skills interviews for
more than 140 professions. It's free, needs no sign-up, and runs entirely in your browser.

Live: **https://strong-dragon-d8b60f.netlify.app**

## Features
- 🎙️ **Voice or text interviews.** Alex speaks each question, and in voice mode listens to your answer (Web Speech API), with automatic fallback to typing.
- 🧑‍💼 **Alex, the official interviewer.** Alex is professional, calm and neutral, uses a consistent introduction tailored to your profession, and asks adaptive follow-ups.
- 🔎 **Searchable profession library.** 145 professions in 13 groups (General AI, Business, Finance, Healthcare, Education, Science, Engineering, Software/Data, Marketing, Language, Writing, Legal, Transferable Skills). Each has its own competency model.
- ➕ **Add My Profession.** Build a private interview profile from your own job title, responsibilities and skills.
- 🧭 **Step-by-step setup:**
  1. Profession
  2. Mode: Voice or Text
  3. Interview type: Domain Expert, AI Domain Expert, AI Training Readiness, Behavioral, Technical, Bilingual, Transferable Skills, or Full Mock
  4. Experience: Entry to Expert
  5. Difficulty: Easy, Medium, Hard, or Adaptive
  6. Length: Quick (5), Standard (10), Full (15), or Deep Expert (12–20, adaptive)
  7. Summary
- 🔀 **Adaptive engine.** Strong answers lead to deeper follow-ups and harder scenarios. Vague answers get a request to clarify, and competencies you haven't shown yet get explored.
- 📊 **Detailed reports.** Each report scores Relevance, Depth, Structure and Specificity, breaks results down by competency, lists strengths and focus areas, and gives question-by-question feedback. Reports are printable.
- 🧪 **Practice Lab.** Original AI-evaluation tasks: compare responses, rate quality, find errors, fix the format.
- 📈 **Progress.** Interview readiness score, skills and scores, and recent activity.
- 🔒 **Guest mode.** History, practice and preferences are saved in your browser. You can export or delete them from the About page.

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
node tests/engine-check.js     # every profession × interview type, headless (≈2–3 min)
node tests/regression.mjs      # 65 browser checks (needs Playwright + Chromium and the local server)
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
- **Professions:** add a `P(group, title, comps, extra)` line in `js/data/professions.js`.
- **Competencies:** add a `C(...)` entry in `js/data/competencies.js` (signals plus knowledge, scenario and behavioral prompts).
- **Field question items:** edit `ITEM_SETS` in `js/data/items.js`.
- **Alex's script:** edit `ALEX` in `js/data/items.js`.
- **Scoring weights:** edit `scoreAnswer()` in `js/engine.js`.
