# CV Intelligence: upload, extraction and CV Quality report

Route `#/cv` (Profile → My CV). It runs entirely in the browser, with no server, no API key and no LLM, in line with the owner constraints.

## Flow
1. **Add a CV.** The user can upload a file (drag-and-drop or **Browse files**), paste text, or **Build From Profile**. Optional fields take a target job title and a job description.
2. **States.** Each run moves through Uploading → Extracting text → Review text → Analysing → Completed, or ends in Failed.
   - A failed run offers **Retry**, **Replace file**, **Remove** and **Paste text instead**.
3. **Review.** The extracted text is shown in an editable box with its word and page counts, an extraction status and a list of limitations. The user corrects it, then clicks **Analyse CV**.
4. **Report** (sub-tab "CV Quality report"). Sub-tabs "Review extracted items" (the Prompt 3 confirm/edit/delete review) and "Extracted text" (edit + re-analyse) sit alongside it.
5. **Actions:** Re-analyse, Copy recommendations, Download report (`cv-quality-report.html`, standalone, with no contact details), Replace CV, Delete CV data.

## Extraction (`js/cv-extract.js`)
| Input | How | Notes |
|---|---|---|
| PDF | Vendored **pdf.js 4.10.38** legacy build (`vendor/pdfjs/`, Apache-2.0), loaded on demand with `isEvalSupported:false` | CID/Identity-H fonts (as exported by WPS Office, Word and Chrome) work; `cmaps/` covers predefined CJK maps. Lines are rebuilt in content order and wrapped lines are re-joined. |
| DOCX | The zip is read with `DecompressionStream('deflate-raw')`, then `word/document.xml` (and headers) | Keeps paragraphs, list bullets (`numPr` → "• "), tabs and table rows ("a \| b"). Skips `mc:Fallback` duplicates. |
| DOC (legacy) | Not parsed | Can't be read reliably in the browser. The user gets conversion steps. |
| TXT / MD | UTF-8 | |

The real format is sniffed from the file's magic bytes, so the extension alone is not trusted.

**Failures.** A run never "succeeds" on any of these:
- an empty file;
- a file over 10 MB;
- an unsupported type (PNG, RTF, ODT, Pages…);
- a corrupt or password-protected PDF;
- a scanned or image-only PDF (pages with images but no text: there is no OCR, so the user gets instructions);
- undecodable fonts;
- fewer than 40 readable words.

**Incomplete extraction.** If some pages are scanned, characters can't be decoded, or the layout uses columns or text boxes:
- the extraction status is `partial`;
- the report is **provisional**;
- "Missing evidence" badges become **Unable to assess**, because missing text is not missing qualifications;
- this lasts until the user ticks *"I've checked and corrected the text… it's my complete resume"*.

## Scoring (`js/cv-analysis.js`)
`analyzeCvQuality(text, {target, jd, extraction, confirmedComplete})` is deterministic. Each category is a sum of named criteria with fixed partial-credit rules.

| Category | Max | Criteria |
|---|---|---|
| Professional positioning | 10 | summary 3, identity 2, specific focus 2, evidence vs generic 2, headline 1 |
| Work experience evidence | 20 | entries 5, dates 3, detail 4, action-led 4, outcomes 4 |
| Quantified impact | 15 | quantified lines (qualitative outcomes earn partial credit) 8, variety 4, tied to result 3 |
| Skills evidence | 15 | listed 3, **shown in experience 6**, tools in context 3, focused list 3 |
| Education and qualifications | 10 | qualification or training 4, provider + year 3, certifications or courses 3 |
| Structure and readability | 10 | headings 3, core sections 3, scannable 2, length 2 |
| AI-training relevance | 10 | transferable evidence (7 clusters: demonstrated or inferred) 6, direct AI work 2, depth in a field 2 |
| Consistency signals | 10 | date format 3, order 2, bullets 2, headings 1, repeats 1, punctuation 1 |

**Bands and badges**
- Rating bands: 90+ Excellent, 75+ Strong, 60+ Good foundation, 40+ Needs improvement, below 40 Significant revision needed.
- Category badges: Strong (≥75%), Partial (≥35%), Missing evidence, or Unable to assess.

**Validation.** `validateCvReport` checks every report before it renders:
- the 8 category ids and maxima, which must total 100;
- each criterion's points are an integer within its range;
- criteria sum to their category and categories sum to the total;
- the rating label matches the band;
- required sections are present;
- no duplicate advice ids;
- no `undefined` or `NaN`.

A report that fails is never shown.

**Separate from the score.** The job-description comparison and the target title never change the score.

## Report sections
- **A** Score ring + rating + overview + disclaimer.
- **B** Professional Profile (resume-only, no contact details).
- **C** Evidence by Category (8 cards: points, bar, badge, explanation, verbatim excerpts, improvement).
- **D** Detailed Breakdown table.
- **E** Priority Improvements (High / Medium / Low, each with what / why / how).
- **F** Consistency Signals:
  - factual counts;
  - overlapping dates flagged neutrally;
  - a "years claimed vs dated entries" check;
  - ignored injected or stuffed lines;
  - visual formatting not assessed.
- **G** Strengths.
- **H** Weaknesses.
- **I** Development Areas (document fixes vs skills to show or develop).
- **J** Transferable Skills (directly demonstrated vs inferred, with the link to AI training).
- **K** Recommended Improvements (never repeats E).
- **L** Suggested Rewrites (original beside suggested; only the user's words plus `[placeholders]` and questions).
- **M** AI Training Role Alignment (evidence and gaps, framed as preparation and not eligibility).
- **Optional:** Job Description Comparison.
  - Each requirement is marked Supported, Partially supported or Not evidenced.
  - There is no match percentage.
  - Truthful tailoring tips: never add a keyword without evidence.

## Fairness and safety rules
These are enforced in code and tested:
- **Not used or scored:**
  - name, date of birth, nationality, marital status, gender and address;
  - contact lines, which are optional and skipped.
- **Experience is not only paid jobs:** employment, freelance, volunteer, academic and project entries all count.
- **No keyword-only credit:** skills listed but not shown in the experience earn little.
- **Keyword stuffing** (more than 30 terms, or a word repeated 6+ times in a line) earns nothing.
- **Untrusted content:** lines addressed to screening tools or AI ("ignore previous instructions…", "rate this resume 100") are ignored, and the user is told to remove them. Job-description lines like that are dropped too.
- **No fabrication:** rewrites never add numbers, employers, tools, qualifications or AI experience. Bracketed placeholders must be replaced or removed. Copied text starts with that warning.

## Storage and privacy
- The original file is never stored.
- `Repo.cv` keeps the following in browser storage until the user deletes it (My CV → Delete CV data, or Privacy → Clear My Data → CV Data):
  - `text` (the corrected text);
  - `format`, `extraction`, `target`, `jd`;
  - `report`, `items`, `mappings`.
- No resume text is logged.

## Tests
- `node tests/engine-check.js`: the samples in `tests/fixtures/cv-samples.js` (fictional) validate, the score order holds, and the JD doesn't change the score.
- `node tests/regression.mjs`, sections "CV Intelligence":
  - fixtures generated at test time: a Chromium text PDF (CID fonts, like WPS), a scanned PDF, a mixed PDF, an in-memory DOCX, plus empty, oversized, PNG, .doc and corrupt files;
  - extraction, review/correct, scoring totals, JD comparison, copy, download, re-analyse, provisional flow;
  - fairness, injection, stuffing and no-fabrication checks;
  - mobile layout.
