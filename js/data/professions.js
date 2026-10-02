/* =============================================================================
   Profession library. Each profession has its own competency model (comps),
   an AI-evaluation competency (ai, omitted for transferable-skills roles),
   an item set for practical / error-detection / explanation questions (set),
   and optional search keywords (kw) and working language (lang).
   ========================================================================== */
"use strict";

const GROUPS = [
  { id:"general_ai",   label:"General AI",            icon:"🤖", set:"general_ai" },
  { id:"business",     label:"Business",              icon:"💼", set:"business",    ai:"ai_business" },
  { id:"finance",      label:"Finance",               icon:"💹", set:"finance",     ai:"ai_finance" },
  { id:"healthcare",   label:"Healthcare",            icon:"🩺", set:"healthcare",  ai:"ai_health" },
  { id:"education",    label:"Education",             icon:"📚", set:"education",   ai:"ai_education" },
  { id:"science",      label:"Science",               icon:"🔬", set:"science",     ai:"ai_science",     tech:true },
  { id:"engineering",  label:"Engineering",           icon:"🛠️", set:"engineering", ai:"ai_engineering", tech:true },
  { id:"software",     label:"Software / Data",       icon:"💻", set:"software",    ai:"ai_software",    tech:true },
  { id:"marketing",    label:"Marketing",             icon:"📣", set:"marketing",   ai:"ai_marketing" },
  { id:"language",     label:"Language",              icon:"🌐", set:"language",    ai:"ai_language",    lingual:true },
  { id:"writing",      label:"Writing / Content",     icon:"✍️", set:"writing",     ai:"ai_writing" },
  { id:"legal",        label:"Legal",                 icon:"⚖️", set:"legal",       ai:"ai_legal" },
  { id:"transferable", label:"Transferable Skills",   icon:"🧰", set:"transferable", transferable:true },
];
const GROUP = Object.fromEntries(GROUPS.map(g=>[g.id,g]));

const PROFESSIONS = [];
function slug(s){ return s.toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); }
function P(group, title, comps, extra){
  const g = GROUP[group];
  PROFESSIONS.push(Object.assign({ id:slug(title), title, group, comps:comps.split(" "), ai:g.ai||null, set:g.set }, extra||{}));
}

/* GENERAL AI */
P("general_ai","Generalist","instruction_following error_detection factuality rubric_consistency communication judgment",{kw:"general any field ai trainer"});
P("general_ai","AI Training Specialist","instruction_following annotation_accuracy rubric_consistency preference_judgment prompt_evaluation error_detection",{kw:"ai trainer rlhf"});
P("general_ai","AI Response Evaluator","preference_judgment error_detection factuality rubric_consistency instruction_following content_safety",{kw:"rater"});
P("general_ai","LLM Evaluator","preference_judgment factuality error_detection prompt_evaluation rubric_consistency content_safety",{kw:"large language model rater"});
P("general_ai","AI Quality Reviewer","rubric_consistency error_detection annotation_accuracy instruction_following communication judgment",{kw:"qa reviewer"});
P("general_ai","AI Content Reviewer","content_safety factuality rubric_consistency error_detection judgment communication",{kw:"moderator trust safety"});
P("general_ai","Preference Rating Specialist","preference_judgment rubric_consistency instruction_following error_detection content_safety",{kw:"ranking rlhf"});
P("general_ai","Prompt Evaluator","prompt_evaluation instruction_following preference_judgment error_detection rubric_consistency",{kw:"prompt engineer"});
P("general_ai","Fact Checker","factuality research_eval error_detection rubric_consistency communication",{kw:"verification"});
P("general_ai","Research Evaluator","research_eval factuality stats error_detection communication",{kw:"academic"});
P("general_ai","Data Annotator","annotation_accuracy instruction_following rubric_consistency error_detection multimodal",{kw:"labeler labeller tagging"});
P("general_ai","Multimodal Evaluator","multimodal annotation_accuracy error_detection factuality preference_judgment",{kw:"image video audio"});

/* BUSINESS */
P("business","Project Manager","risk stakeholder scheduling dependencies scope resources communication judgment",{kw:"pm pmp delivery"});
P("business","Program Manager","stakeholder dependencies risk resources scheduling communication judgment",{kw:"programme"});
P("business","Product Manager","product_strategy requirements stakeholder interpretation communication judgment",{kw:"product owner"});
P("business","Business Analyst","requirements process stakeholder data_quality communication judgment",{kw:"ba analyst"});
P("business","Scrum Master","agile stakeholder communication dependencies process judgment",{kw:"agile coach"});
P("business","Operations Manager","operations process resources risk communication judgment",{kw:"ops"});
P("business","Procurement Specialist","procurement compliance risk stakeholder communication judgment",{kw:"purchasing buyer sourcing"});
P("business","Supply Chain Specialist","supply_chain procurement risk process communication judgment",{kw:"logistics"});
P("business","Management Consultant","consulting stakeholder interpretation process communication judgment",{kw:"strategy"});
P("business","HR Professional","people compliance communication stakeholder judgment",{kw:"human resources hr"});
P("business","Recruiter","recruiting communication stakeholder people judgment",{kw:"talent acquisition hiring"});
P("business","Risk Specialist","risk compliance controls risk_fin communication judgment",{kw:"risk analyst"});
P("business","Compliance Specialist","compliance controls risk evidence communication judgment",{kw:"regulatory"});

/* FINANCE */
P("finance","Accountant","reconciliation accuracy controls materiality audit evidence judgment",{kw:"accounting cpa ca acca"});
P("finance","Auditor","audit evidence controls materiality accuracy judgment communication",{kw:"audit"});
P("finance","Financial Analyst","analysis_fin accuracy risk_fin interpretation communication judgment",{kw:"fp&a"});
P("finance","Bookkeeper","reconciliation accuracy evidence controls communication",{kw:"bookkeeping"});
P("finance","Finance Manager","analysis_fin controls risk_fin stakeholder communication judgment",{kw:"controller"});
P("finance","Investment Analyst","analysis_fin risk_fin stats interpretation communication judgment",{kw:"equity research"});
P("finance","Banking Professional","risk_fin compliance accuracy communication judgment",{kw:"bank banker"});
P("finance","Actuary","actuarial stats risk_fin communication judgment",{kw:"insurance",tech:true});
P("finance","Economist","analysis_fin stats causation interpretation communication judgment",{kw:"economics"});

/* HEALTHCARE */
P("healthcare","Healthcare Professional","prioritization clinical_comm documentation safety clinical_reasoning judgment",{kw:"health care clinician"});
P("healthcare","Medical Doctor","clinical_reasoning prioritization safety pharmacology clinical_comm ethics",{kw:"md gp doctor"});
P("healthcare","Physician","clinical_reasoning prioritization safety pharmacology clinical_comm ethics",{kw:"doctor md"});
P("healthcare","Registered Nurse","prioritization clinical_comm documentation safety clinical_reasoning judgment",{kw:"nurse rn nursing"});
P("healthcare","Nurse Practitioner","clinical_reasoning prioritization pharmacology documentation clinical_comm judgment",{kw:"nurse np"});
P("healthcare","Dentist","dental clinical_reasoning safety ethics clinical_comm documentation",{kw:"dental"});
P("healthcare","Dental Therapist","dental safety clinical_comm documentation judgment",{kw:"dental"});
P("healthcare","Dental Hygienist","dental safety clinical_comm documentation judgment",{kw:"dental hygiene"});
P("healthcare","Pharmacist","pharmacology safety clinical_comm documentation ethics judgment",{kw:"pharmacy"});
P("healthcare","Physiotherapist","rehab clinical_reasoning safety clinical_comm documentation",{kw:"physical therapist physio pt"});
P("healthcare","Medical Laboratory Scientist","lab reproducibility safety documentation judgment",{kw:"lab technologist mls",tech:true});
P("healthcare","Clinical Research Professional","research_clin ethics documentation lit_eval communication",{kw:"cra crc clinical trials"});
P("healthcare","Medical Coder","coding_med documentation accuracy compliance communication",{kw:"coding billing"});
P("healthcare","Social Worker","psychosocial ethics documentation clinical_comm judgment",{kw:"social work"});
P("healthcare","Mental Health Professional","psychosocial ethics clinical_comm documentation clinical_reasoning judgment",{kw:"therapist counsellor counselor"});
P("healthcare","Psychologist","psychosocial ethics clinical_reasoning lit_eval clinical_comm",{kw:"psychology"});

/* EDUCATION */
P("education","Secondary School Teacher","lesson_design assessment differentiation classroom subject_explain communication",{kw:"high school teacher educator"});
P("education","Primary School Teacher","lesson_design assessment differentiation classroom subject_explain communication",{kw:"elementary teacher educator"});
P("education","College Instructor","lesson_design assessment subject_explain differentiation communication",{kw:"teacher educator"});
P("education","University Lecturer","lesson_design assessment subject_explain lit_eval communication",{kw:"teacher academic"});
P("education","Professor","subject_explain assessment lit_eval experiment communication judgment",{kw:"academic faculty"});
P("education","Tutor","subject_explain differentiation assessment communication",{kw:"teacher coach"});
P("education","Special Education Teacher","differentiation classroom assessment communication judgment",{kw:"sen sped teacher"});
P("education","Instructional Designer","instr_design assessment lesson_design stakeholder communication",{kw:"learning designer e-learning"});
P("education","Curriculum Developer","instr_design lesson_design assessment differentiation communication",{kw:"curriculum"});

/* SCIENCE */
P("science","Scientist","experiment stats reproducibility lit_eval lab_safety communication");
P("science","Research Scientist","experiment stats reproducibility lit_eval communication judgment",{kw:"researcher"});
P("science","Chemist","experiment lab_safety reproducibility stats communication",{kw:"chemistry"});
P("science","Biochemist","experiment lab_safety reproducibility lit_eval stats",{kw:"biochemistry"});
P("science","Biologist","experiment field_methods stats lit_eval reproducibility",{kw:"biology life sciences"});
P("science","Microbiologist","experiment lab_safety lab reproducibility stats",{kw:"microbiology"});
P("science","Physicist","experiment math_reasoning stats reproducibility communication",{kw:"physics"});
P("science","Mathematician","math_reasoning stats subject_explain communication judgment",{kw:"math maths"});
P("science","Statistician","stats experiment missing_data causation communication",{kw:"statistics biostatistician"});
P("science","Environmental Scientist","field_methods experiment stats compliance communication",{kw:"environment ecology"});

/* ENGINEERING */
P("engineering","Mechanical Engineer","design_req eng_safety rca testing_eng communication judgment",{kw:"engineer"});
P("engineering","Electrical Engineer","design_req eng_safety testing_eng rca communication",{kw:"engineer electronics"});
P("engineering","Civil Engineer","design_req eng_safety testing_eng stakeholder judgment",{kw:"engineer structural"});
P("engineering","Chemical Engineer","process_eng eng_safety rca testing_eng communication",{kw:"engineer"});
P("engineering","Industrial Engineer","process quality_eng operations rca communication",{kw:"engineer manufacturing"});
P("engineering","Process Engineer","process_eng quality_eng rca eng_safety communication",{kw:"engineer"});
P("engineering","Systems Engineer","systems_eng design_req testing_eng risk communication",{kw:"engineer"});
P("engineering","Biomedical Engineer","design_req eng_safety testing_eng compliance communication",{kw:"engineer medical device"});
P("engineering","Aerospace Engineer","design_req eng_safety systems_eng testing_eng rca",{kw:"engineer aviation"});
P("engineering","Quality Engineer","quality_eng rca testing_eng process compliance",{kw:"engineer qa"});

/* SOFTWARE / DATA */
P("software","Software Engineer","correctness architecture testing debugging complexity security code_review",{kw:"developer programmer coder swe engineer"});
P("software","Frontend Developer","frontend correctness testing debugging code_review security",{kw:"front-end web developer react"});
P("software","Backend Developer","architecture correctness data_modeling security testing debugging",{kw:"back-end api developer"});
P("software","Full Stack Developer","architecture frontend data_modeling testing security code_review",{kw:"fullstack developer"});
P("software","DevOps Engineer","devops security architecture debugging testing",{kw:"sre platform engineer"});
P("software","Cloud Engineer","devops architecture security complexity debugging",{kw:"aws azure gcp engineer"});
P("software","QA Engineer","testing correctness debugging code_review communication",{kw:"tester quality assurance engineer"});
P("software","Data Scientist","ml stats causation data_quality interpretation communication",{ai:"ai_data",set:"data",kw:"data science"});
P("software","Data Analyst","data_quality stats missing_data visualization interpretation causation",{ai:"ai_data",set:"data",kw:"analytics bi analyst"});
P("software","Data Engineer","data_eng data_modeling data_quality architecture debugging",{ai:"ai_data",set:"data",kw:"etl engineer"});
P("software","Machine Learning Engineer","ml data_eng testing complexity correctness",{ai:"ai_data",set:"data",kw:"ml engineer"});
P("software","AI Engineer","ml architecture testing security correctness",{kw:"llm engineer"});
P("software","Database Administrator","data_modeling security devops complexity data_quality",{kw:"dba sql"});

/* MARKETING */
P("marketing","Digital Marketing Specialist","campaign analytics_mkt audience seo copy",{kw:"digital marketer"});
P("marketing","Marketing Manager","campaign audience analytics_mkt stakeholder resources judgment",{kw:"marketer"});
P("marketing","Marketing Strategist","audience campaign analytics_mkt content_strategy judgment",{kw:"strategy"});
P("marketing","Social Media Manager","community content_strategy analytics_mkt audience copy",{kw:"social"});
P("marketing","Content Creator","creative audience community analytics_mkt copy",{kw:"influencer youtube"});
P("marketing","Content Strategist","content_strategy audience seo analytics_mkt copy");
P("marketing","Copywriter","copy audience editing clarity creative",{kw:"writer"});
P("marketing","SEO Specialist","seo content_strategy analytics_mkt audience",{kw:"search"});
P("marketing","Email Marketing Specialist","copy audience analytics_mkt campaign compliance",{kw:"email"});
P("marketing","Paid Ads Specialist","campaign analytics_mkt audience copy",{kw:"ppc paid media"});
P("marketing","Brand Manager","copy audience campaign stakeholder judgment",{kw:"brand"});
P("marketing","Community Manager","community communication audience content_strategy");
P("marketing","UGC Creator","creative audience copy community",{kw:"user generated content"});

/* LANGUAGE */
const LANG_COMPS = "translation register localization grammar bilingual_eval";
P("language","Bilingual Evaluator — French & English",LANG_COMPS,{lang:"French",kw:"french english bilingual"});
["French","Spanish","German","Italian","Portuguese","Arabic","Mandarin","Japanese","Korean","Hindi","Russian","Dutch","Turkish","Polish","Vietnamese","Swahili","Yoruba","Tagalog"]
  .forEach(l=>P("language",l+" Evaluator",LANG_COMPS,{lang:l,kw:"language bilingual "+l.toLowerCase()}));
P("language","Linguist","grammar translation register lit_eval communication",{lang:"your second language",kw:"linguistics"});

/* WRITING / CONTENT */
P("writing","Writer","clarity editing factuality style",{lang:"English",kw:"author"});
P("writing","Editor","editing style clarity factuality communication",{lang:"English"});
P("writing","Proofreader","editing style attention_detail clarity",{lang:"English"});
P("writing","Technical Writer","tech_writing clarity style requirements",{lang:"English",kw:"documentation"});
P("writing","Journalist","journalism factuality clarity judgment",{lang:"English",kw:"reporter"});
P("writing","Translator","translation register localization grammar",{lang:"your target language",ai:"ai_language",lingual:true});
P("writing","Localization Specialist","localization translation register grammar",{lang:"your target language",ai:"ai_language",lingual:true,kw:"localisation l10n"});
P("writing","Transcription Specialist","transcription attention_detail instructions style",{lang:"English",kw:"transcriber"});

/* LEGAL */
P("legal","Lawyer","legal_analysis legal_research contracts communication judgment",{kw:"attorney solicitor barrister law"});
P("legal","Paralegal","legal_research contracts evidence communication attention_detail",{kw:"legal assistant law"});
P("legal","Legal Analyst","legal_analysis legal_research compliance communication",{kw:"law"});
P("legal","Contract Specialist","contracts compliance risk communication",{kw:"contracts manager law"});

/* TRANSFERABLE SKILLS — no profession-specific AI job is invented for these roles */
const TS = "attention_detail process_adherence quality_review safety_aware reliability instructions";
P("transferable","Janitor",TS,{kw:"cleaning"});
P("transferable","Custodian",TS,{kw:"cleaning janitor"});
P("transferable","Cleaner",TS,{kw:"cleaning housekeeping"});
P("transferable","Warehouse Worker","safety_aware process_adherence attention_detail reliability instructions quality_review",{kw:"warehouse picker packer forklift"});
P("transferable","Retail Associate","customer attention_detail reliability instructions quality_review process_adherence",{kw:"cashier sales associate shop"});
P("transferable","Hospitality Worker","customer quality_review reliability process_adherence safety_aware",{kw:"hotel restaurant server waiter"});
P("transferable","Receptionist","customer admin attention_detail reliability instructions",{kw:"front desk"});
P("transferable","Administrative Assistant","admin attention_detail reliability instructions communication quality_review",{kw:"admin assistant secretary office"});

const PROF = Object.fromEntries(PROFESSIONS.map(p=>[p.id,p]));

/* Words that suggest a hands-on / service role (used for custom professions). */
const TRANSFERABLE_HINTS = /clean|janitor|custodian|housekeep|warehouse|picker|packer|forklift|retail|cashier|store|shop|hospitality|waiter|waitress|server|barista|cook|kitchen|driver|delivery|courier|security guard|labou?rer|factory|cleaner|caregiver|nanny|receptionist|porter|mover/i;
