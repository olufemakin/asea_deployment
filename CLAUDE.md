# CLAUDE.md — Interview IQ (by BSP · Business Startup Powerhouse)

Context for Claude (and humans) picking this project up later.

## What this is
A free, voice-enabled AI interview simulator for the BSP community, who train
people to pass the AI screening interviews on Outlier, Mercor and Micro1.
Live at **https://strong-dragon-d8b60f.netlify.app** (Netlify site
`strong-dragon-d8b60f`).

Design constraints set by the owner — keep them unless told otherwise:
- **Zero cost, no accounts, no API keys, no backend.** Everything runs in the browser.
- Voice = browser Web Speech API (TTS + STT), with automatic fallback to typing.
- The "AI" is a built-in question bank + deterministic rubric scorer (no LLM).
- Branding is fixed: "Interview IQ by BSP · Business Startup Powerhouse", ocean-blue theme.

## Project layout
| File | Purpose |
|---|---|
| `index.html` | The whole app: HTML, CSS and JS in one self-contained file |
| `logo.png` | BSP logo used in the header (512×512) |
| `logo.svg` | Fallback logo if `logo.png` fails to load |
| `log.png.jpeg` | Original full-size BSP logo image (source asset, not referenced by the app) |
| `readme.md` | User-facing overview + deploy guide |
| `tasks/todo.md` | Original build plan and change log |
| `netlify.toml` | Netlify config (publish root, security headers incl. microphone permission) |

## Map of `index.html` (`<script>` section)
- `BRAND` / `renderBrand()` — baked-in brand text and logo fallback chain (`logo.png` → `logo.svg` → emoji).
- `PLATFORMS` — target platforms offered on the intro screen.
- `CORE` — universal AI-trainer screening questions; `CORE[0]` is always asked first.
- `DOMAINS` — 17 profession tracks, each `{label, icon, q:[...]}`. Every question has
  `q` (text), `concepts` (keywords the scorer rewards) and `hint` (what a top answer shows).
- `DIFFICULTY` — warm-up / standard / rigorous: per-question time limit and score multiplier.
- `Speech` — wrapper around `speechSynthesis` and `SpeechRecognition`.
- `scoreAnswer()` — rubric: coverage 40%, depth 25%, structure 20%, specificity 15%;
  `feedbackFor()` turns the scores into tips.
- `App` — global state; `render()` dispatches to the `scrWelcome / scrIntro / scrSetup /
  scrInterview / scrResults` screen functions, which rebuild `#app` via template strings.
  Escape all user text with `H()`.
- `buildQuestions()` — `CORE[0]`, then domain and core questions interleaved, cut to `cfg.count`.
- History — last 10 sessions in `localStorage["ia_history"]`.
- Inline `onclick` handlers call functions exported onto `window` at the bottom
  (`Object.assign(window,{...})`) — add any new handler there too.

## Run / test locally
```bash
python3 -m http.server 4555   # then open http://localhost:4555
```
The mic needs `localhost` or HTTPS. To test without a mic, set `App.cfg.voice=false`, then
reveal `#typeBox` and call `submitAnswer()`. Headless Chromium + Playwright can drive the
whole flow (welcome → intro → setup → interview → results).

## Deploy
Static site, no build step. Preferred: connect the Netlify site to this GitHub repo
(`olufemakin/asea_deployment`, branch `main`) so every merge redeploys automatically.
A manual fallback is dragging the folder onto Netlify Drop.

## Conventions
- Keep it a single dependency-free `index.html` unless there's a strong reason to split.
- Match the existing compact JS style (template-string screens, short helpers).
- Record notable changes in `tasks/todo.md`.
