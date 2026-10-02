/* =============================================================================
   BSP AI Practice Lab — core definitions (categories, competencies, schema).

   PRODUCT RULES
   - Every practice session is EXACTLY 10 questions (PRACTICE_QUESTIONS).
   - Easy 15 min · Medium 20 min · Hard 25 min.
   - A session draws ONLY from: selected category + selected difficulty + status "published".
     There is no cross-category or cross-difficulty top-up. If fewer than 10 such questions
     exist, the session does not start ("More practice questions are being prepared…").
   - A category is AVAILABLE only with ≥10 published questions at EACH difficulty.

   Content lives in js/data/bank-*.js (authored items + deterministic generators).
   js/question-bank.js normalises everything into full question records.
   ========================================================================== */
"use strict";

const PRACTICE_QUESTIONS = 10;
const PRACTICE_MIN_PER_DIFFICULTY = 10;
const DIFF_KEYS = ["easy","medium","hard"];
const DIFF_FROM_NUM = { 1:"easy", 2:"medium", 3:"hard" };
const PRACTICE_DIFF = {
  easy:  { label:"Easy",   minutes:15, minWords:5,  d:"A clear issue, short material, few criteria." },
  medium:{ label:"Medium", minutes:20, minWords:8,  d:"Several criteria and subtler issues; separate major from minor errors." },
  hard:  { label:"Hard",   minutes:25, minWords:12, d:"Interacting errors, edge cases and conflicting evidence; professional judgment." },
};
const BANK_DATE = "2026-10-02";

/* ---------- Shared answer vocabularies ------------------------------------ */
const ERROR_TYPES = [["instr","Instruction Error"],["fact","Factual Error"],["reason","Reasoning Error"],["missing","Missing Information"],
  ["irrel","Irrelevance"],["style","Style Problem"],["unsupported","Unsupported Claim"],["safety","Safety Concern"],["none","No significant errors"]];
const FACT_LABELS = ["Supported","Partially Supported","Unsupported","Contradicted","Cannot Determine"];
const FACT_HELP = "Supported: the reference fully backs the claim. Partially Supported: part is backed, part is not. Unsupported: the reference covers the topic but gives no evidence for this detail. Contradicted: the reference says otherwise. Cannot Determine: the claim is subjective or predictive, or the reference contains conflicting evidence it does not resolve.";
const RANK_SCALE = [[-2,"A much better"],[-1,"A slightly better"],[0,"Tie"],[1,"B slightly better"],[2,"B much better"]];
const RANK_DIMS = [["if","Instruction Following"],["acc","Accuracy"],["rel","Relevance"],["comp","Completeness"],["cla","Clarity"],["saf","Safety"]];
const REL = ["Highly relevant","Somewhat relevant","Not relevant"];
const SENT = ["Positive","Negative","Neutral","Mixed"];
const INTENT = ["Billing","Technical support","Cancellation","Feedback"];
const TOPICS = ["Price","Quality","Delivery","Customer service"];
const SAFE = ["Safe and helpful","Harmful or dangerous","Unnecessary refusal","Privacy problem","Needs a safety caveat"];
const TQ = ["Accurate","Meaning error","Grammar error","Register or tone problem","Omission"];
const DISSUES = [["Contradiction","contradiction"],["Omission (missing key information)","omission"],["Incorrect total or calculation","calc"],
  ["Duplicate entry","duplicate"],["Unsupported conclusion","conclusion"],["No issues","none"]];
const SHEET_ISSUES = [["Incorrect line calculation","calc"],["Incorrect grand total","calc"],["Duplicate row","data"],["Missing value","data"],["No issues","none"]];
const CISSUES = [["Wrong result for normal input","correct"],["Off-by-one / boundary error","edge"],["Fails on empty or missing input","edge"],
  ["Security risk","security"],["Unnecessarily inefficient","efficiency"],["No significant issues","none"]];
const PFLAWS = [["Ambiguous goal","ambiguity"],["Missing audience","ambiguity"],["Missing format or length","spec"],["Conflicting constraints","conflict"],
  ["Missing context or data","context"],["No significant issues","none"]];

/* ---------- Practice competency registry entries -------------------------- */
/* Interview competencies come from COMPS; js/question-bank.js merges both into COMPETENCY_REGISTRY. */
const PRACTICE_COMPETENCIES = {
  preference_judgment:["Preference Judgment","Choosing the better response and how strongly, for the right reasons."],
  comparative_reasoning:["Comparative Reasoning","Comparing responses dimension by dimension (accuracy, clarity, completeness, safety)."],
  instruction_following:["Instruction Following","Checking outputs against every explicit instruction."],
  factual_accuracy:["Factual Accuracy","Spotting statements that are factually wrong."],
  written_justification:["Written Justification","Explaining a judgment clearly with specific evidence."],
  error_detection:["Error Detection","Finding the errors present in an AI response."],
  error_classification:["Error Classification","Labelling errors correctly without false flags."],
  safety_judgment:["Safety Judgment","Recognising harmful, risky or over-cautious responses."],
  unsupported_claim_detection:["Unsupported Claim Detection","Finding statements a source does not support."],
  source_grounding:["Source Grounding","Judging only against the provided source; not flagging supported content."],
  uncertainty_recognition:["Uncertainty Recognition","Noticing overstated certainty, overgeneralisation and claims beyond the evidence."],
  evidence_judgment:["Evidence Judgment","Weighing what the evidence does and doesn't show."],
  claim_identification:["Claim Identification","Breaking a claim into its checkable parts."],
  evidence_matching:["Evidence Matching","Citing the specific reference text that settles a claim."],
  source_interpretation:["Source Interpretation","Reading reference material accurately, including near-miss distinctions."],
  verification:["Verification","Reaching a justified, checkable conclusion about a claim."],
  verdict_accuracy:["Verdict Accuracy","Choosing the correct verdict label."],
  study_interpretation:["Study Interpretation","Understanding what a study design can and cannot show."],
  constraint_detection:["Constraint Detection","Finding every violated constraint."],
  multi_part_tracking:["Multi-Part Requirement Tracking","Tracking several requirements at once without missing or inventing violations."],
  format_compliance:["Format Compliance","Checking format rules such as lists, case, order and structure."],
  explicit_instructions:["Explicit Instructions","Checking stated rules such as counts, banned words and required elements."],
  implicit_requirements:["Implicit Requirements","Checking requirements implied by the task, such as items matching the requested topic."],
  guideline_application:["Guideline Application","Applying a labelling guideline as written."],
  classification_accuracy:["Classification Accuracy","Assigning the correct label."],
  consistency:["Consistency","Applying the same standard across items."],
  edge_cases:["Edge Cases","Handling ambiguous or boundary items correctly."],
  attention_to_detail:["Attention to Detail","Catching small but important details."],
  entity_recognition:["Entity Recognition","Finding the entities present."],
  entity_typing:["Entity Typing","Assigning the correct entity type."],
  visual_accuracy:["Visual Accuracy","Describing images accurately."],
  counting:["Counting","Counting objects precisely."],
  caption_evaluation:["Caption Evaluation","Judging whether text matches an image."],
  transcription_accuracy:["Transcription Accuracy","Writing exactly what was said."],
  listening_comprehension:["Listening Comprehension","Understanding spoken content."],
  relevance_judgment:["Relevance Judgment","Rating how well a result satisfies a query."],
  user_intent:["User Intent","Inferring what the searcher actually needs."],
  prompt_evaluation:["Prompt Evaluation","Diagnosing what makes a prompt unclear or unanswerable."],
  ambiguity_detection:["Ambiguity Detection","Spotting vague goals, missing audience and missing context."],
  helpfulness_judgment:["Helpfulness Judgment","Balancing helpfulness against risk, including over-refusal."],
  consistency_checking:["Consistency Checking","Finding contradictions within a document."],
  omission_detection:["Omission Detection","Noticing missing key information."],
  calculation_checking:["Calculation Checking","Verifying totals and calculations."],
  data_quality:["Data Quality","Finding duplicates and missing values."],
  domain_knowledge:["Domain Knowledge","Applying professional knowledge to judge AI answers."],
  code_correctness:["Code Correctness","Judging whether code does what was asked."],
  security_awareness:["Security Awareness","Recognising security risks in code."],
  translation_judgment:["Translation Judgment","Judging translation quality overall."],
  meaning_preservation:["Meaning Preservation","Checking the meaning survives translation."],
  register_tone:["Register & Tone","Judging formality, politeness and tone."],
  grammar:["Grammar","Spotting grammatical errors."],
  rewriting:["Rewriting","Producing a corrected response that meets every requirement."],
  content_quality:["Content Quality","Keeping rewritten content relevant and useful."],
  ai_response_evaluation:["AI Response Evaluation","Evaluating AI outputs overall."],
};

/* ---------- Categories (id = stable snake_case key) ----------------------- */
/* competencies: [{ id, from:[grading components] }] — the first available component(s) are averaged
   into that competency's evidence. Components come from js/practice.js gradePracticeQuestion(). */
const C_ = (id, ...from)=>({ id, from });
const PRACTICE_CATEGORIES = [
  { id:"preference_ranking", label:"Preference Ranking", icon:"⚖️", d:"Compare two responses, choose a preference strength and justify it.",
    competencies:[C_("preference_judgment","pref"),C_("comparative_reasoning","dims"),C_("instruction_following","dim:if"),C_("factual_accuracy","dim:acc"),C_("written_justification","reasoning")],
    commonErrors:["Preferring the longer response by default","Ignoring an explicit constraint","Treating a factual error as a style issue","Strength of preference not justified"] },
  { id:"ai_response_evaluation", label:"AI Response Evaluation", icon:"🧪", d:"Identify instruction, factual, reasoning and safety errors in AI responses.",
    competencies:[C_("error_detection","recall"),C_("error_classification","precision"),C_("factual_accuracy","err:fact"),C_("instruction_following","err:instr"),C_("safety_judgment","err:safety"),C_("written_justification","reasoning")],
    commonErrors:["Trusting fluent wording","Flagging style problems as factual errors","Missing a second, quieter error","Explanation names no evidence"] },
  { id:"instruction_following", label:"Instruction Following", icon:"📋", d:"Check responses against every explicit and implied requirement.",
    competencies:[C_("constraint_detection","recall"),C_("multi_part_tracking","objective"),C_("format_compliance","kind:format"),C_("explicit_instructions","kind:explicit"),C_("implicit_requirements","kind:implicit"),C_("written_justification","reasoning")],
    commonErrors:["Stopping after the first violation","Flagging constraints that were actually met","Missing a single capitalised item or wrong marker","Ignoring that items must match the requested topic"] },
  { id:"response_critique", label:"Response Critique", icon:"🔍", d:"Write precise, evidence-based critiques of AI responses.",
    competencies:[C_("error_detection","recall"),C_("error_classification","precision"),C_("written_justification","reasoning")],
    commonErrors:["Endorsing a critique that claims a flaw the response doesn't have","Accepting vague critiques that give the writer nothing to act on","Missing a second, quieter flaw"] },
  { id:"response_rewriting", label:"Response Rewriting", icon:"✏️", d:"Fix flawed responses so they meet every requirement.",
    competencies:[C_("rewriting","checks"),C_("format_compliance","kind:format"),C_("explicit_instructions","kind:explicit"),C_("implicit_requirements","kind:implicit"),C_("content_quality","content")],
    commonErrors:["Fixing one rule and breaking another","Leaving extra commentary around the answer","Changing content that was already correct"] },
  { id:"fact_checking", label:"Factuality Checking", icon:"✅", d:"Judge claims against controlled reference material.",
    competencies:[C_("verdict_accuracy","objective"),C_("evidence_matching","reasoning"),C_("source_interpretation","near"),C_("claim_identification","part"),C_("verification","objective","reasoning")],
    commonErrors:["Using outside knowledge instead of the reference","Calling a partly-true claim Supported","Confusing Unsupported with Contradicted","Not quoting the deciding evidence"] },
  { id:"hallucination_detection", label:"Hallucination Detection", icon:"👻", d:"Find statements in AI summaries that the source does not support.",
    competencies:[C_("unsupported_claim_detection","recall"),C_("source_grounding","precision"),C_("factual_accuracy","objective"),C_("uncertainty_recognition","kind:unc"),C_("evidence_judgment","reasoning")],
    commonErrors:["Flagging valid inferences (e.g. correct arithmetic) as hallucinations","Missing changed numbers or qualifiers","Missing overstated certainty"] },
  { id:"research_verification", label:"Research Verification", icon:"📚", d:"Check whether claims match what a study actually found.",
    competencies:[C_("study_interpretation","objective"),C_("source_grounding","near"),C_("uncertainty_recognition","unc"),C_("evidence_judgment","reasoning")],
    commonErrors:["Treating correlation as causation","Generalising beyond the sample","Ignoring stated limitations or evidence quality"] },
  { id:"data_annotation", label:"Data Annotation", icon:"🏷️", d:"Apply a labelling guideline consistently.",
    competencies:[C_("guideline_application","objective"),C_("classification_accuracy","precision"),C_("attention_to_detail","recall"),C_("edge_cases","edge"),C_("written_justification","reasoning")],
    commonErrors:["Tagging topics that are only implied","Missing a second topic","Ignoring guideline clarifications"] },
  { id:"text_classification", label:"Text Classification", icon:"🗂️", d:"Assign the correct class to short texts.",
    competencies:[C_("classification_accuracy","objective"),C_("guideline_application","guide"),C_("edge_cases","edge"),C_("written_justification","reasoning")],
    commonErrors:["Missing sarcasm","Calling a factual statement Neutral when it contains an opinion","Choosing a secondary intent"] },
  { id:"entity_annotation", label:"Entity Annotation", icon:"🔖", d:"Select the correct entities and entity types.",
    competencies:[C_("entity_recognition","recall"),C_("entity_typing","precision"),C_("edge_cases","edge"),C_("attention_to_detail","objective")],
    commonErrors:["Typing a person's name as a location because it matches a place","Tagging titles as organisations"] },
  { id:"image_labelling", label:"Image Labelling", icon:"🖼️", d:"Choose every label that is true of an image.",
    competencies:[C_("visual_accuracy","objective"),C_("counting","kind:count"),C_("attention_to_detail","precision")],
    commonErrors:["Approximate counting","Missing a small object","Accepting a label that is almost true"] },
  { id:"image_to_text", label:"Image-to-Text", icon:"📝", d:"Judge whether AI captions match the image.",
    competencies:[C_("caption_evaluation","objective"),C_("visual_accuracy","objective"),C_("written_justification","reasoning")],
    commonErrors:["Accepting a caption with a wrong count","Missing an invented object"] },
  { id:"transcription", label:"Transcription", icon:"🎧", d:"Transcribe short spoken sentences accurately.",
    competencies:[C_("transcription_accuracy","accuracy"),C_("listening_comprehension","accuracy"),C_("attention_to_detail","exact")],
    commonErrors:["Homophones (their/there, four/for)","Dropping small words","Guessing names and numbers"] },
  { id:"search_relevance", label:"Search Relevance", icon:"🔎", d:"Rate how well a result satisfies a search query.",
    competencies:[C_("relevance_judgment","objective"),C_("user_intent","near"),C_("written_justification","reasoning")],
    commonErrors:["Rewarding keyword overlap instead of intent","Ignoring a constraint in the query"] },
  { id:"prompt_evaluation", label:"Prompt Evaluation", icon:"💬", d:"Spot what makes a prompt unclear or unanswerable.",
    competencies:[C_("prompt_evaluation","objective"),C_("ambiguity_detection","kind:ambiguity"),C_("constraint_detection","kind:conflict"),C_("written_justification","reasoning")],
    commonErrors:["Flagging a clear prompt as vague","Missing referenced-but-absent material"] },
  { id:"safety_evaluation", label:"Safety Evaluation", icon:"🛡️", d:"Balance safety and helpfulness, including over-refusal.",
    competencies:[C_("safety_judgment","objective"),C_("helpfulness_judgment","near"),C_("written_justification","reasoning")],
    commonErrors:["Rewarding unnecessary refusals","Missing privacy problems","Missing a needed caveat"] },
  { id:"document_evaluation", label:"Document Evaluation", icon:"📄", d:"Find contradictions, omissions, wrong totals and unsupported conclusions.",
    competencies:[C_("consistency_checking","kind:contradiction"),C_("omission_detection","kind:omission"),C_("calculation_checking","kind:calc"),C_("unsupported_claim_detection","kind:conclusion"),C_("attention_to_detail","objective"),C_("written_justification","reasoning")],
    commonErrors:["Checking only the first half of a document","Not re-adding totals","Accepting a causal conclusion with no evidence"] },
  { id:"spreadsheet_evaluation", label:"Spreadsheet Evaluation", icon:"📊", d:"Find incorrect totals, duplicates and missing values.",
    competencies:[C_("calculation_checking","kind:calc"),C_("data_quality","kind:data"),C_("attention_to_detail","objective"),C_("written_justification","reasoning")],
    commonErrors:["Checking the grand total but not each line","Missing a duplicated row","Not naming the affected rows"] },
  { id:"domain_expert_evaluation", label:"Domain Expert Evaluation", icon:"🎓", d:"Evaluate AI answers in professional fields.",
    competencies:[C_("domain_knowledge","objective"),C_("error_detection","recall"),C_("error_classification","precision"),C_("written_justification","reasoning")],
    commonErrors:["Accepting a confident but wrong professional claim","Missing a reasoning error behind a correct-looking number"] },
  { id:"coding_evaluation", label:"Coding Evaluation", icon:"💻", d:"Find bugs and risks in AI-generated code.",
    competencies:[C_("code_correctness","objective"),C_("edge_cases","kind:edge"),C_("security_awareness","kind:security"),C_("written_justification","reasoning")],
    commonErrors:["Testing only the happy path","Missing injection risks","Calling correct code buggy"] },
  { id:"multilingual_evaluation", label:"Multilingual Evaluation", icon:"🌍", d:"Judge translations across several languages.",
    competencies:[C_("translation_judgment","objective"),C_("meaning_preservation","focus:meaning"),C_("grammar","focus:grammar"),C_("register_tone","focus:register"),C_("written_justification","reasoning")],
    commonErrors:["Missing an omitted clause","Missing reversed meaning","Ignoring register"] },
  { id:"french_english_evaluation", label:"French-English Evaluation", icon:"🇫🇷", d:"Evaluate French ↔ English translations.",
    competencies:[C_("translation_judgment","objective"),C_("meaning_preservation","focus:meaning"),C_("register_tone","focus:register"),C_("grammar","focus:grammar"),C_("written_justification","reasoning")],
    commonErrors:["Missing faux amis","Missing agreement errors","Accepting literal calques","Ignoring tu/vous register"] },
  { id:"generalist_ai_evaluation", label:"Generalist AI Evaluation", icon:"🧭", d:"A mixed set of evaluation task types written for generalists.",
    competencies:[C_("ai_response_evaluation","objective"),C_("error_detection","recall"),C_("preference_judgment","pref"),C_("verdict_accuracy","near"),C_("written_justification","reasoning")],
    commonErrors:["Switching standards between task types","Trusting fluent but wrong answers"] },
];
const PRACTICE_CATEGORY = Object.fromEntries(PRACTICE_CATEGORIES.map(c=>[c.id,c]));
/* Category ids used before this correction pass (kebab-case) → current ids. */
const LEGACY_CATEGORY_IDS = { "preference-ranking":"preference_ranking","response-evaluation":"ai_response_evaluation","instruction-following":"instruction_following",
  "response-critique":"response_critique","response-rewriting":"response_rewriting","factuality":"fact_checking","hallucination":"hallucination_detection",
  "research":"research_verification","data-annotation":"data_annotation","text-classification":"text_classification","entity-annotation":"entity_annotation",
  "image-labelling":"image_labelling","image-to-text":"image_to_text","transcription":"transcription","search-relevance":"search_relevance",
  "prompt-evaluation":"prompt_evaluation","safety-evaluation":"safety_evaluation","document-evaluation":"document_evaluation",
  "spreadsheet-evaluation":"spreadsheet_evaluation","domain-expert":"domain_expert_evaluation","coding-evaluation":"coding_evaluation",
  "multilingual":"multilingual_evaluation","french-english":"french_english_evaluation","generalist":"generalist_ai_evaluation" };

/* ---------- Constructors (authored items) --------------------------------- */
/* Raw item: { id, category, d, fmt, prompt?, material, options?, answer, checks?, sig, model,
   flags?:["edge","unc","guide","part"], focus?, kinds?, subcategory?, domain?, errors?, version?, status?, source? } */
const PB = [];
const PB_GENERATORS = [];   // { category, prefix, perDifficulty, fn(seed, d) } → materialised by question-bank.js
function Q(o){ if(typeof o.d==="number") o.d=DIFF_FROM_NUM[o.d]; PB.push(o); return o; }
function qRank(category, id, d, user, a, b, pref, dims, sig, model, x){ return Q(Object.assign({ id, category, d, fmt:"rank", material:{ user, a, b }, answer:{ pref, dims:dims||{} }, sig, model }, x)); }
function qEval(category, id, d, user, response, errs, sig, model, x){ return Q(Object.assign({ id, category, d, fmt:"eval", material:{ user, response }, answer:errs, sig, model }, x)); }
function qFact(category, id, d, reference, claim, label, sig, model, x){ return Q(Object.assign({ id, category, d, fmt:"fact", material:{ reference, claim }, answer:label, sig, model }, x)); }
function qMulti(category, id, d, prompt, material, options, answer, sig, model, x){ return Q(Object.assign({ id, category, d, fmt:"multi", prompt, material, options, answer, sig, model }, x)); }
function qSingle(category, id, d, prompt, material, options, answer, sig, model, x){ return Q(Object.assign({ id, category, d, fmt:"single", prompt, material, options, answer, sig, model }, x)); }
function qRewrite(category, id, d, user, response, checks, sig, model, x){ return Q(Object.assign({ id, category, d, fmt:"rewrite", material:{ user, response }, checks, sig, model }, x)); }
function qTranscribe(category, id, d, text, x){ return Q(Object.assign({ id, category, d, fmt:"transcribe", material:{ audio:text }, answer:text, sig:[], model:`Reference transcript: "${text}"` }, x)); }
/* Hallucination helper: numbered summary sentences; kinds marks overstated-certainty sentences ("unc"). */
function qHallu(id, d, source, sentences, bad, sig, model, unc){
  const opts=sentences.map((s,i)=>[`Sentence ${i+1}`, (unc||[]).includes(i)?"unc":"claim"]).concat([["All sentences are supported","none"]]);
  return qMulti("hallucination_detection", id, d, "Which sentences in the AI summary are NOT supported by the source? Select all that apply.",
    { reference:source, response:sentences.map((x,i)=>`(${i+1}) ${x}`).join("\n") }, opts, bad.length?bad:[sentences.length], sig, model);
}

/* ---------- Review of the old Prompt 1 single tasks ------------------------ */
/* Each old task (PRACTICE_TASKS in items.js) was reviewed. Converted tasks became full bank records
   (category, difficulty, competencies, rubric, expected outcome, signals, explanation, version)
   in js/data/bank-*.js with source "legacy:<id>". The rest are kept as Legacy/Archived records only. */
const LEGACY_TASK_REVIEW = {
  "pt-instr-pair": { status:"converted", to:"pr-e-legacy-1", note:"Re-authored as a 5-point preference ranking with dimension calls." },
  "pt-fact-pair":  { status:"converted", to:"pr-e-legacy-2", note:"Re-authored as a 5-point preference ranking with dimension calls." },
  "pt-wasp-pair":  { status:"converted", to:"pr-e-legacy-3", note:"Re-authored as a 5-point preference ranking with a safety dimension." },
  "pt-math-find":  { status:"converted", to:"ae-e-legacy-1", note:"Re-authored as an error-type evaluation." },
  "pt-sleep-rate": { status:"archived", note:"1–5 rating format is not used in the new Practice Lab, and the expected rating was a judgment range rather than a checkable outcome." },
  "pt-json-rewrite":{ status:"archived", note:"Duplicate of an existing Response Rewriting question (rw-a-2)." },
  "pt-code-rate":  { status:"archived", note:"Duplicate of an existing Coding Evaluation question (ce-e-1)." },
  "pt-logic-find": { status:"archived", note:"Open-ended argument critique without a response-under-evaluation; doesn't fit a production format." },
};
