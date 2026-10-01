# Interview IQ — by BSP · Business Startup Powerhouse

> A free AI Interview Simulator from **Business Startup Powerhouse (BSP)**.

A free, voice-enabled AI interview simulator that mirrors the AI screening "gate"
used by data-work platforms (**Outlier**, **Mercor**, **Micro1**). Built for a
community that trains people to pass those interviews.

Everything runs in the browser — **zero cost, zero accounts, no API keys**.

## What it does
- 👋 **Candidate intro** — captures the candidate's name, target platform
  (Outlier / Mercor / Micro1), and experience level. The AI interviewer greets
  them by name and tailors difficulty — just like a real HR screen.
- 🎙️ **Real voice interview** — the interviewer *speaks* each question
  (browser text-to-speech) and *listens* to spoken answers (browser
  speech-to-text). Falls back to typing automatically when a browser lacks
  speech support.
- 🧪 **17 profession tracks** — Software, Data/ML, Math, Physics, Chemistry,
  Biology, Medicine, Law, Finance, Economics, Business, Writing, Linguistics,
  Engineering, Psychology, Education, plus General. Each blends universal
  AI-trainer screening questions (instruction-following, spotting subtle errors,
  quality/consistency, handling feedback) with 6 domain-specific questions each
  — 108 questions in total; any interview draws up to 12.
- 🤖 **Adaptive** — asks a probing follow-up when an answer is thin.
- 📊 **Transparent scoring** — every answer scored 0–100 on **Relevance, Depth,
  Structure, Specificity**, with a per-question report and concrete "how to
  improve" tips. Personalised report header + printable.
- ⏱️ Difficulty levels, adjustable length, per-question timer.
- 🔒 **100% private** — no backend, no keys, no sign-up. Saves recent sessions
  locally.

## Branding (baked in for BSP)
The brand is **permanently set** (not user-editable): the app is **Interview IQ
by BSP · Business Startup Powerhouse**, on the Ocean-Blue theme that matches the
BSP logo. It shows in the header, page title, and footer.

**Logo:** the header loads, in order, `logo.png` → `logo.svg` → an emoji mark.
- A placeholder **`logo.svg`** (silver "bsp" badge) ships so it looks branded
  out of the box.
- **To use your exact logo:** save your BSP image as **`logo.png`** in this
  folder (next to `index.html`). The header picks it up automatically — no code
  change. A square image (e.g. 512×512) looks best.

To change the baked brand text, edit the `BRAND` object near the top of the
`<script>` in `index.html` (`name`, `community`, `tagline`).

## How it works (no API key, by design)
- **Voice** uses the built-in [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API).
- **The "brain"** is a built-in question bank with rubric metadata plus a
  deterministic scorer (concept coverage, depth, reasoning structure,
  specificity). No LLM, so it's free forever and works offline.
- Everything is one self-contained `index.html`.

> **Best experience:** Chrome or Edge (desktop or Android) for full speech-to-text.
> Safari/Firefox can still hear the interviewer and you type your answers.

## Run it locally
Open `index.html` in a browser. If your browser blocks the mic on `file://`,
serve it:
```bash
cd "/Users/olufemakin/AI Interviewer"
python3 -m http.server 4555
# visit http://localhost:4555
```

## Deploy it free (get a public URL like the reference app)
One static file → any free static host works:
1. **Netlify Drop** (no CLI): https://app.netlify.com/drop — drag this folder on.
   Instant live URL; sign in (free) to keep/rename it.
2. **Cloudflare Pages**: free account → Pages → "Upload assets" → drag the folder.
3. **GitHub Pages**: push to a repo → Settings → Pages → deploy from `main`/root.
4. **Vercel**: `npx vercel` in this folder.

All four are free and serve over HTTPS (required for microphone access).

## Customize questions
Edit the `CORE` and `DOMAINS` objects near the top of the `<script>` in
`index.html`. Each question lists `concepts` (keywords the scorer rewards) and a
`hint` (what a top answer shows). Scoring weights live in `scoreAnswer()`.
