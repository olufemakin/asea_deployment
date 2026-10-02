/* =============================================================================
   Profession catalogue — configuration, not code.

   Every profession is a record built from:
     • a CATEGORY (59 browseable categories),
     • a FAMILY TEMPLATE (competencies, item set, AI competency, interview types,
       recommended type, practical tasks, recommended practice, interview areas),
     • optional per-profession data (aliases, specialties, pay seed, overrides).
   Existing hand-built professions (js/data/professions.js) keep their own competency
   models and simply gain a category, family, aliases and status here.

   Adding a profession = adding a line to PROFESSION_SEED (or importing it in the
   Local Content Studio). No application logic is profession-specific.

   Status: full_domain | domain_template | dynamic | transferable | archived.
   "Interview practice available" is NEVER the same as "AI opportunity verified":
   opportunities[] is empty unless a verified opportunity is added.
   ========================================================================== */
"use strict";

const PROFESSION_STATUSES = { full_domain:"Full domain model", domain_template:"Domain template", dynamic:"Dynamic profession", transferable:"Transferable skills", archived:"Archived" };
const PAY_STATUSES = { verified_current:"Verified current", needs_verification:"Needs verification", historical:"Historical", user_provided_seed:"User-provided seed", unknown:"Unknown" };

/* ---------- Categories (browse chips group them) -------------------------- */
const PROFESSION_CATEGORIES = [
  ["engineering","Engineering","🛠️","Engineering"],["software","Software & Technology","💻","Technology"],["data","Data & Analytics","📊","Technology"],
  ["ai_ml","AI & Machine Learning","🤖","Technology"],["ai_research","AI / ML Research","🧠","Science"],["science","Science & Research","🔬","Science"],
  ["math","Mathematics & Statistics","∑","Science"],["healthcare","Healthcare","🩺","Healthcare"],["dental","Dental","🦷","Healthcare"],["pharmacy","Pharmacy","💊","Healthcare"],
  ["mental_health","Mental Health & Social Care","🤝","Healthcare"],["education","Education","📚","Education"],["finance","Finance & Accounting","💹","Finance"],
  ["banking","Banking & Investment","🏦","Finance"],["legal","Legal","⚖️","Legal"],["compliance","Compliance & Regulatory","📜","Legal"],["security","Cybersecurity","🔐","Technology"],
  ["business","Business & Strategy","💼","Business"],["project","Project & Program Management","🗂️","Business"],["product","Product Management","🧩","Business"],
  ["operations","Operations","⚙️","Business"],["supply_chain","Supply Chain & Logistics","🚚","Business"],["manufacturing","Manufacturing","🏭","Trades"],
  ["construction","Construction & Trades","🔨","Trades"],["transportation","Transportation","🚛","Trades"],["agriculture","Agriculture","🌾","Trades"],
  ["energy","Energy & Utilities","⚡","Engineering"],["oil_gas","Oil & Gas","🛢️","Engineering"],["environmental","Environmental","🌍","Science"],
  ["telecom","Telecommunications","📡","Technology"],["sales","Sales","🤝","Business"],["cx","Customer Experience","🎧","Business"],["marketing","Marketing","📣","Business"],
  ["advertising","Advertising","📢","Business"],["social_content","Social Media & Content","📱","More"],["writing","Writing & Editing","✍️","More"],
  ["language","Language & Translation","🌐","Languages"],["transcription","Transcription","🎙️","Languages"],["hr","Human Resources","👥","Business"],
  ["recruitment","Recruitment","🔎","Business"],["admin","Administrative Support","🗃️","Business"],["hospitality","Hospitality","🏨","More"],["food","Food Service","🍽️","More"],
  ["retail","Retail","🛍️","More"],["warehousing","Warehousing","📦","Trades"],["facilities","Facilities & Maintenance","🧰","Trades"],["real_estate","Real Estate","🏠","Business"],
  ["architecture","Architecture","🏛️","More"],["design","Design & Creative","🎨","More"],["media","Media & Communications","🎬","More"],
  ["government","Government & Public Administration","🏛","More"],["policy","Policy & Economics","📈","More"],["nonprofit","Nonprofit & Community Services","💛","More"],
  ["insurance","Insurance","🛡️","Business"],["travel","Travel & Tourism","✈️","More"],["veterinary","Veterinary & Animal Care","🐾","Healthcare"],
  ["research_participation","Research Participation","🧪","More"],["generalist","Generalist","🧭","More"],["other","Other","➕","More"],
].map(([id,label,icon,browse])=>({ id, label, icon, browse }));
const PCAT = Object.fromEntries(PROFESSION_CATEGORIES.map(c=>[c.id,c]));
const BROWSE_GROUPS = ["Healthcare","Engineering","Business","Finance","Legal","Science","Trades","Languages","Technology","Education","More"];

/* ---------- Extra legacy-compatible groups for new families ---------------- */
[["trades","Construction & Trades","🔨","trades",null],["logistics","Logistics & Transport","🚚","logistics","ai_business"],["hospitality","Hospitality & Food","🏨","hospitality","ai_general"],
 ["admin_support","Administrative Support","🗃️","admin","ai_general"],["sales","Sales & Customer Experience","🤝","sales","ai_general"],["people","Human Resources","👥","people","ai_general"],
 ["property","Real Estate","🏠","property","ai_general"],["insurance","Insurance","🛡️","insurance","ai_finance"],["energy","Energy & Environment","⚡","energy","ai_general"],
 ["agri","Agriculture","🌾","agri","ai_general"],["animal","Veterinary & Animal Care","🐾","animal","ai_general"],["manufacturing","Manufacturing","🏭","manufacturing","ai_engineering"],
 ["security","Cybersecurity","🔐","security","ai_software"],["design","Design & Creative","🎨","design","ai_general"],["public","Government, Policy & Nonprofit","🏛","public","ai_general"],
 ["media","Media & Communications","🎬","media","ai_writing"],["telecom","Telecommunications","📡","telecom","ai_general"]]
  .forEach(([id,label,icon,set,ai])=>{ if(GROUP[id]) return; const g={ id, label, icon, set, ai, tech:["security","telecom"].includes(id) }; GROUPS.push(g); GROUP[id]=g; });

/* ---------- Family templates ---------------------------------------------- */
const T_AI=["domain","ai_domain","ai_readiness","behavioral","full_mock"], T_TECH=["technical","ai_domain","behavioral","full_mock"],
  T_HANDS=["domain","transferable","ai_readiness","behavioral","full_mock"], T_TRANS=["transferable","ai_readiness","behavioral","full_mock"];
const AREAS={
  engineering:["Technical Knowledge","Problem Solving","Safety","Assumptions","Trade-offs","Validation","Professional Judgment","AI Technical Evaluation"],
  healthcare:["Professional Reasoning","Evidence","Safety","Communication","Documentation","Uncertainty","AI Healthcare Content Evaluation"],
  legal:["Issue Identification","Legal Reasoning","Evidence","Interpretation","Risk","Professional Judgment","AI Legal Content Review"],
  trades:["Technical Process","Safety","Troubleshooting","Instruction Following","Quality Control","Prioritization","Practical Judgment"],
  admin:["Organization","Communication","Instruction Following","Prioritization","Documentation","Quality Control"],
  software:["Correctness","Design & Architecture","Testing","Debugging","Code Review","Security","AI Code Evaluation"],
  data:["Data Quality","Analysis","Interpretation","Visualisation","Statistical Reasoning","AI Analysis Evaluation"],
  science:["Scientific Method","Evidence","Statistics","Reproducibility","Lab Safety","AI Science Evaluation"],
  business:["Stakeholders","Risk","Planning","Prioritization","Communication","Professional Judgment","AI Business Content Evaluation"],
  finance:["Accuracy","Reconciliation","Controls","Evidence","Risk","Professional Judgment","AI Financial Content Evaluation"],
  education:["Learning Design","Assessment","Differentiation","Explanation","Classroom Practice","AI Educational Content Evaluation"],
  service:["Customer Focus","Safety","Process","Quality","Prioritization","Communication"],
  transferable:["Attention to Detail","Process Adherence","Quality Review","Safety Awareness","Reliability","Instruction Following"],
  generic:["Domain Knowledge","Professional Reasoning","Professional Judgment","Communication","Quality","AI Content Evaluation"],
};
function F(id, label, o){ return Object.assign({ id, label, types:null, recommended:null, tasks:[], practice:["ai_response_evaluation","instruction_following"], areas:AREAS.generic,
  responsibilities:[], education:"Varies by country, employer and specialty.", credentials:"Requirements vary by country and employer. Interview IQ does not verify credentials." }, o); }
const PROFESSION_FAMILIES = Object.fromEntries([
  F("engineering","Engineering",{ group:"engineering", comps:["design_req","eng_safety","rca","testing_eng","quality_eng","systems_eng","communication","judgment"], tasks:["Specification / calculation review","Design assumption check","Safety procedure review"], practice:["domain_expert_evaluation","fact_checking","ai_response_evaluation"], areas:AREAS.engineering, responsibilities:["Design and analysis","Specifications and calculations","Safety and compliance","Testing and validation"] }),
  F("software","Software Engineering",{ group:"software", comps:["correctness","architecture","testing","debugging","code_review","security"], tasks:["Code Review","Bug diagnosis"], practice:["coding_evaluation","instruction_following","ai_response_evaluation"], areas:AREAS.software, recommended:"technical", responsibilities:["Writing and reviewing code","Testing","Debugging","System design"] }),
  F("data","Data & Analytics",{ group:"software", set:"data", comps:["data_quality","visualization","interpretation","causation","stats","data_modeling"], ai:"ai_data", tasks:["Table / Chart Evaluation","Data quality check"], practice:["spreadsheet_evaluation","fact_checking","ai_response_evaluation"], areas:AREAS.data, recommended:"technical", responsibilities:["Data preparation","Analysis","Reporting","Stakeholder insight"] }),
  F("ai_ml","AI Training & Evaluation",{ group:"general_ai", comps:["instruction_following","preference_judgment","error_detection","factuality","rubric_consistency","prompt_evaluation","content_safety"], tasks:["Response ranking","Error identification","Rubric application"], practice:["preference_ranking","ai_response_evaluation","instruction_following","generalist_ai_evaluation"], responsibilities:["Rating AI responses","Writing justifications","Applying guidelines"] }),
  F("ai_research","AI / ML Research",{ group:"science", set:"science", comps:["ml","stats","experiment","reproducibility","lit_eval","math_reasoning"], ai:"ai_data", academic:true, tasks:["Research result critique","Experimental design review"], practice:["research_verification","coding_evaluation","fact_checking"], areas:AREAS.science, recommended:"technical", types:["technical","domain","ai_domain","behavioral","full_mock"] }),
  F("science","Science & Research",{ group:"science", comps:["experiment","stats","reproducibility","lit_eval","lab_safety","communication"], ai:"ai_science", academic:true, tasks:["Experimental design critique","Data interpretation"], practice:["research_verification","fact_checking","hallucination_detection"], areas:AREAS.science }),
  F("math","Mathematics & Statistics",{ group:"science", comps:["math_reasoning","stats","reproducibility","lit_eval","communication"], ai:"ai_science", academic:true, tasks:["Proof / calculation check"], practice:["fact_checking","spreadsheet_evaluation","ai_response_evaluation"], areas:AREAS.science }),
  F("healthcare","Healthcare",{ group:"healthcare", comps:["clinical_reasoning","clinical_comm","documentation","safety","ethics"], tasks:["Fictional Professional Scenario","Documentation review"], practice:["domain_expert_evaluation","fact_checking","safety_evaluation"], areas:AREAS.healthcare, responsibilities:["Assessment","Care planning","Documentation","Communication with patients and colleagues"] }),
  F("dental","Dental",{ group:"healthcare", comps:["dental","clinical_comm","safety","documentation","ethics"], tasks:["Fictional Professional Scenario"], practice:["domain_expert_evaluation","fact_checking"], areas:AREAS.healthcare }),
  F("pharmacy","Pharmacy",{ group:"healthcare", comps:["pharmacology","safety","documentation","clinical_comm","ethics"], tasks:["Fictional prescription check"], practice:["domain_expert_evaluation","fact_checking","safety_evaluation"], areas:AREAS.healthcare }),
  F("social_care","Mental Health & Social Care",{ group:"healthcare", set:"care", comps:["psychosocial","person_care","documentation","ethics","communication"], ai:"ai_health", tasks:["Fictional Professional Scenario"], practice:["domain_expert_evaluation","safety_evaluation"], areas:AREAS.healthcare }),
  F("care_support","Care & Support Work",{ group:"transferable", set:"care", comps:["person_care","safety_aware","reliability","attention_detail","process_adherence","communication"], transferable:true, types:T_TRANS, recommended:"transferable", tasks:["Fictional care scenario","Routine & safety instructions"], practice:["instruction_following","safety_evaluation"], areas:AREAS.transferable }),
  F("education","Education",{ group:"education", comps:["lesson_design","assessment","differentiation","classroom","subject_explain"], tasks:["Lesson Plan","Feedback on student work"], practice:["domain_expert_evaluation","instruction_following","ai_response_evaluation"], areas:AREAS.education }),
  F("finance","Finance & Accounting",{ group:"finance", comps:["reconciliation","accuracy","controls","evidence","analysis_fin","risk_fin"], tasks:["Financial Reconciliation","Variance analysis"], practice:["spreadsheet_evaluation","fact_checking","ai_response_evaluation","domain_expert_evaluation"], areas:AREAS.finance }),
  F("banking","Banking & Investment",{ group:"finance", comps:["analysis_fin","risk_fin","evidence","interpretation","compliance","communication"], tasks:["Investment memo review"], practice:["spreadsheet_evaluation","fact_checking","research_verification"], areas:AREAS.finance }),
  F("legal","Legal",{ group:"legal", comps:["legal_analysis","legal_research","contracts","evidence","compliance","judgment"], tasks:["Document / Argument Review","Contract clause check"], practice:["domain_expert_evaluation","fact_checking","document_evaluation"], areas:AREAS.legal }),
  F("compliance","Compliance & Risk",{ group:"business", set:"legal", comps:["compliance","controls","risk","evidence","communication","judgment"], ai:"ai_legal", tasks:["Policy / control review"], practice:["document_evaluation","fact_checking","instruction_following"], areas:AREAS.legal }),
  F("security","Cybersecurity",{ group:"security", comps:["threat_analysis","incident_response","security","compliance","risk","communication"], tasks:["Access review / incident triage"], practice:["coding_evaluation","safety_evaluation","instruction_following"], areas:["Threats & Vulnerabilities","Incident Response","Controls","Risk","Communication","AI Security Content Evaluation"], recommended:"technical", types:T_TECH }),
  F("business","Business & Strategy",{ group:"business", comps:["consulting","stakeholder","interpretation","process","requirements","communication","judgment"], tasks:["Business case review","Process map"], practice:["document_evaluation","spreadsheet_evaluation","ai_response_evaluation"], areas:AREAS.business }),
  F("project","Project & Program Management",{ group:"business", comps:["risk","stakeholder","scheduling","dependencies","scope","resources","communication","judgment"], tasks:["Risk Register","Status report review"], practice:["document_evaluation","instruction_following","ai_response_evaluation"], areas:AREAS.business }),
  F("product","Product Management",{ group:"business", comps:["product_strategy","requirements","stakeholder","interpretation","communication","judgment"], tasks:["Product requirement review"], practice:["document_evaluation","prompt_evaluation","ai_response_evaluation"], areas:AREAS.business }),
  F("operations","Operations",{ group:"business", comps:["operations","process","resources","quality_control","communication","judgment"], tasks:["Process / SOP review"], practice:["instruction_following","document_evaluation","spreadsheet_evaluation"], areas:AREAS.business }),
  F("supply_chain","Supply Chain & Logistics",{ group:"logistics", comps:["supply_chain","procurement","logistics_planning","inventory_control","risk","communication"], tasks:["Order / inventory reconciliation","Delivery plan"], practice:["spreadsheet_evaluation","instruction_following","document_evaluation"], areas:AREAS.business }),
  F("warehousing","Warehousing",{ group:"transferable", set:"logistics", comps:["safety_aware","process_adherence","inventory_control","attention_detail","reliability","instructions"], transferable:true, types:T_TRANS, recommended:"transferable", tasks:["Process / Inventory / Safety Instructions"], practice:["instruction_following","data_annotation"], areas:AREAS.transferable }),
  F("transport_ops","Transportation Management",{ group:"logistics", comps:["logistics_planning","fleet_safety","resources","compliance","communication","judgment"], tasks:["Route & schedule plan","Safety compliance check"], practice:["spreadsheet_evaluation","instruction_following"], areas:AREAS.business, types:T_HANDS, recommended:"domain" }),
  F("driving","Driving & Delivery",{ group:"transferable", set:"logistics", comps:["fleet_safety","safety_aware","reliability","instructions","process_adherence","customer"], transferable:true, types:T_TRANS, recommended:"transferable", tasks:["Safety & route instructions"], practice:["instruction_following"], areas:AREAS.transferable }),
  F("manufacturing","Manufacturing",{ group:"manufacturing", comps:["production_planning","quality_control","troubleshooting","safety_aware","process_adherence","communication"], tasks:["Inspection record check","Line performance diagnosis"], practice:["spreadsheet_evaluation","instruction_following","data_annotation"], areas:AREAS.trades, types:T_HANDS, recommended:"domain" }),
  F("trades","Construction & Trades",{ group:"trades", comps:["trade_process","troubleshooting","measurement","safety_aware","tools_equipment","quality_control","instructions"], tasks:["Work Instructions / Safety / Measurement Scenario","Procedure / Troubleshooting Scenario"], practice:["instruction_following","document_evaluation"], areas:AREAS.trades, types:T_HANDS, recommended:"domain", responsibilities:["Reading drawings and instructions","Measuring and fitting","Working safely","Checking finished work"] }),
  F("construction_mgmt","Construction Management",{ group:"trades", comps:["risk","scheduling","safety_aware","stakeholder","quality_control","resources","judgment"], ai:"ai_business", tasks:["Risk Register","Site safety plan"], practice:["document_evaluation","spreadsheet_evaluation","instruction_following"], areas:AREAS.business }),
  F("agriculture","Agriculture",{ group:"agri", comps:["crop_livestock","operations","safety_aware","quality_control","judgment"], tasks:["Season plan / field log review"], practice:["spreadsheet_evaluation","fact_checking"], areas:AREAS.generic, types:T_HANDS, recommended:"domain" }),
  F("energy","Energy & Utilities",{ group:"energy", comps:["energy_systems","eng_safety","risk","compliance","data_quality","communication"], tasks:["Energy data check","Consumption investigation"], practice:["spreadsheet_evaluation","fact_checking","domain_expert_evaluation"], areas:AREAS.engineering }),
  F("environmental","Environmental",{ group:"energy", set:"science", comps:["field_methods","compliance","stats","energy_systems","communication"], ai:"ai_science", tasks:["Environmental data review"], practice:["research_verification","fact_checking"], areas:AREAS.science }),
  F("telecom","Telecommunications",{ group:"telecom", comps:["telecom_networks","troubleshooting","security","risk","communication"], tasks:["Outage investigation"], practice:["instruction_following","coding_evaluation"], areas:AREAS.engineering, types:T_TECH, recommended:"technical" }),
  F("sales","Sales",{ group:"sales", comps:["sales_process","needs_discovery","account_mgmt","communication","judgment"], tasks:["Discovery plan","Forecast review"], practice:["prompt_evaluation","ai_response_evaluation","search_relevance"], areas:AREAS.business }),
  F("cx","Customer Experience",{ group:"sales", comps:["guest_service","needs_discovery","account_mgmt","communication","reliability"], tasks:["Complaint response","Customer email review"], practice:["ai_response_evaluation","safety_evaluation","instruction_following"], areas:AREAS.service }),
  F("cx_frontline","Customer Service",{ group:"transferable", set:"sales", comps:["customer","guest_service","communication","reliability","instructions","attention_detail"], transferable:true, types:T_TRANS, recommended:"transferable", tasks:["Complaint response"], practice:["ai_response_evaluation","instruction_following"], areas:AREAS.service }),
  F("marketing","Marketing & Content",{ group:"marketing", comps:["audience","campaign","analytics_mkt","copy","content_strategy"], tasks:["Campaign Brief","Copy review"], practice:["response_rewriting","prompt_evaluation","ai_response_evaluation"], areas:AREAS.business }),
  F("media","Media & Communications",{ group:"media", comps:["media_production","clarity","editing","journalism","style"], tasks:["Caption / script check","Production plan"], practice:["fact_checking","response_rewriting","image_to_text"], areas:AREAS.generic }),
  F("writing","Writing & Editing",{ group:"writing", comps:["clarity","editing","style","factuality"], ai:"ai_writing", tasks:["Edit / proofread a passage"], practice:["response_rewriting","fact_checking","ai_response_evaluation"], areas:AREAS.generic }),
  F("language","Language & Translation",{ group:"language", comps:["translation","register","localization","grammar","bilingual_eval"], lingual:true, tasks:["Translation review"], practice:["french_english_evaluation","multilingual_evaluation","transcription"], areas:["Comprehension","Meaning","Register & Tone","Grammar","Localization","AI Language Evaluation"] }),
  F("transcription","Transcription",{ group:"writing", comps:["transcription","attention_detail","instructions","style"], tasks:["Transcript proofreading"], practice:["transcription","instruction_following"], areas:AREAS.transferable }),
  F("hr","Human Resources",{ group:"people", comps:["hr_practice","people","recruiting","learning_dev","communication","judgment"], tasks:["Job advert / interview plan review"], practice:["document_evaluation","safety_evaluation","ai_response_evaluation"], areas:AREAS.business }),
  F("admin","Administrative Support",{ group:"admin_support", comps:["admin","prioritization","communication","instructions","documentation","quality_review"], tasks:["Email / Scheduling / Prioritization"], practice:["instruction_following","document_evaluation","response_rewriting"], areas:AREAS.admin, types:T_HANDS, recommended:"domain" }),
  F("hospitality","Hospitality & Food Service",{ group:"hospitality", comps:["food_safety","guest_service","operations","quality_control","communication"], tasks:["Allergen / safety check","Service recovery"], practice:["instruction_following","safety_evaluation"], areas:AREAS.service, types:T_HANDS, recommended:"domain" }),
  F("hospitality_frontline","Hospitality & Food Service (frontline)",{ group:"transferable", set:"hospitality", comps:["food_safety","guest_service","reliability","process_adherence","safety_aware","customer"], transferable:true, types:T_TRANS, recommended:"transferable", tasks:["Allergen / safety check"], practice:["instruction_following"], areas:AREAS.service }),
  F("retail","Retail",{ group:"transferable", comps:["customer","attention_detail","reliability","instructions","quality_review","process_adherence"], transferable:true, types:T_TRANS, recommended:"transferable", tasks:["Stock / delivery check"], practice:["instruction_following"], areas:AREAS.transferable }),
  F("facilities","Facilities & Maintenance",{ group:"trades", comps:["operations","safety_aware","troubleshooting","quality_control","tools_equipment","communication"], tasks:["Maintenance / safety procedure"], practice:["instruction_following","document_evaluation"], areas:AREAS.trades, types:T_HANDS, recommended:"domain" }),
  F("facilities_frontline","Facilities (frontline & supervision)",{ group:"transferable", comps:["attention_detail","process_adherence","quality_review","safety_aware","reliability","instructions"], transferable:true, types:T_TRANS, recommended:"transferable", tasks:["Work order / checklist review"], practice:["instruction_following"], areas:AREAS.transferable }),
  F("real_estate","Real Estate",{ group:"property", comps:["property_mgmt","market_analysis","needs_discovery","compliance","communication"], tasks:["Listing accuracy check","Tenancy scenario"], practice:["fact_checking","document_evaluation"], areas:AREAS.business }),
  F("design","Design & Creative",{ group:"design", comps:["design_process","user_research","clarity","communication","judgment"], tasks:["Design spec / accessibility review","Design brief"], practice:["image_labelling","image_to_text","ai_response_evaluation"], areas:["Design Process","User Needs","Accessibility","Rationale","Collaboration","AI Design Evaluation"] }),
  F("architecture","Architecture",{ group:"design", comps:["design_process","design_req","eng_safety","compliance","communication"], tasks:["Design spec review"], practice:["document_evaluation","image_labelling"], areas:AREAS.engineering }),
  F("public","Government & Public Administration",{ group:"public", comps:["public_programs","policy_analysis","stakeholder","compliance","communication"], tasks:["Briefing note check","Options appraisal"], practice:["fact_checking","research_verification","document_evaluation"], areas:AREAS.business }),
  F("policy","Policy & Economics",{ group:"public", comps:["policy_analysis","stats","interpretation","causation","communication"], tasks:["Briefing note check"], practice:["fact_checking","research_verification","spreadsheet_evaluation"], areas:AREAS.data }),
  F("insurance","Insurance",{ group:"insurance", comps:["underwriting","claims","risk","compliance","communication"], tasks:["Claim / application review"], practice:["document_evaluation","fact_checking"], areas:AREAS.finance }),
  F("veterinary","Veterinary & Animal Care",{ group:"animal", comps:["animal_care","clinical_comm","safety","documentation","ethics"], tasks:["Fictional animal-care scenario","Dose calculation check"], practice:["domain_expert_evaluation","fact_checking"], areas:AREAS.healthcare }),
  F("generalist","Generalist",{ group:"general_ai", comps:["instruction_following","error_detection","factuality","rubric_consistency","communication","judgment"], tasks:["Response ranking","Fact check"], practice:["generalist_ai_evaluation","ai_response_evaluation","fact_checking"] }),
].map(f=>[f.id,f]));

/* Default family for each category (a seed line can override with "Title>family"). */
const CATEGORY_FAMILY = { engineering:"engineering", software:"software", data:"data", ai_ml:"ai_ml", ai_research:"ai_research", science:"science", math:"math",
  healthcare:"healthcare", dental:"dental", pharmacy:"pharmacy", mental_health:"social_care", education:"education", finance:"finance", banking:"banking", legal:"legal",
  compliance:"compliance", security:"security", business:"business", project:"project", product:"product", operations:"operations", supply_chain:"supply_chain",
  manufacturing:"manufacturing", construction:"trades", transportation:"transport_ops", agriculture:"agriculture", energy:"energy", oil_gas:"energy", environmental:"environmental",
  telecom:"telecom", sales:"sales", cx:"cx", marketing:"marketing", advertising:"marketing", social_content:"marketing", writing:"writing", language:"language",
  transcription:"transcription", hr:"hr", recruitment:"hr", admin:"admin", hospitality:"hospitality", food:"hospitality", retail:"retail", warehousing:"warehousing",
  facilities:"facilities", real_estate:"real_estate", architecture:"architecture", design:"design", media:"media", government:"public", policy:"policy", nonprofit:"public",
  insurance:"insurance", travel:"cx", veterinary:"veterinary", research_participation:"generalist", generalist:"generalist", other:"generalist" };
/* Existing legacy group → default category (for records not named in the seed list). */
const GROUP_CATEGORY = { general_ai:"ai_ml", business:"business", finance:"finance", healthcare:"healthcare", education:"education", science:"science", engineering:"engineering",
  software:"software", marketing:"marketing", language:"language", writing:"writing", legal:"legal", transferable:"facilities" };

/* ---------- Seed list (category: titles; "Title>family" overrides the family) ---- */
const PROFESSION_SEED = {
  engineering:["Engineering","Engineering — PhD","Mechanical Engineer","Electrical Engineer","Civil Engineer","Chemical Engineer","Industrial Engineer","Manufacturing Engineer","Process Engineer",
    "Systems Engineer","Structural Engineer","Environmental Engineer","Biomedical Engineer","Aerospace Engineer","Automotive Engineer","Quality Engineer","Engineering Project Manager>project","Petroleum Engineer","Energy Engineer"],
  software:["Software Engineer","Software Engineer — Front-End","Front-End Developer","Back-End Developer","Full-Stack Developer","Web Developer","Mobile Developer","QA Engineer",
    "Software Tester","DevOps Engineer","Cloud Engineer","Systems Engineer — Technology","Solutions Architect","Database Administrator","Technical Support Specialist>cx","IT Support Specialist>cx"],
  data:["Data Analyst","Data Engineer","Data Scientist","Data Science Consultant","Business Intelligence Analyst","Analytics Consultant","Quantitative Analyst","Database Analyst"],
  ai_ml:["AI Training Specialist","AI Trainer","AI Response Evaluator","LLM Evaluator","AI Quality Reviewer","AI Content Reviewer","Preference Rating Specialist","Prompt Evaluator","Prompt Writer",
    "Prompt Engineer","AI Safety Evaluator","Human Feedback Specialist","AI Dataset Reviewer","Machine Learning Engineer>data","AI Engineer>data","Multimodal Evaluator"],
  ai_research:["AI/ML Research Expert","AI Researcher","Machine Learning Researcher","Research Expert — Frontier AI/ML","AI Research Scientist","ML Research Scientist"],
  science:["Scientist","Research Scientist","Chemist","Chemistry — PhD","Organic Chemist","Analytical Chemist","Biochemist","Biologist","Biology — PhD","Molecular Biologist","Microbiologist",
    "Physicist","Physics — PhD","Materials Scientist","Geologist","Laboratory Scientist","Research Assistant","Food Scientist","Agricultural Scientist"],
  math:["Mathematician","Mathematics — PhD","Statistician","Actuary>finance"],
  environmental:["Environmental Scientist","Environmental Specialist"],
  generalist:["Generalist","General AI Evaluator","Research Evaluator","Fact Checker","Data Annotator","Search Relevance Evaluator","Content Moderator","Quality Reviewer"],
  security:["Cybersecurity Expert","Information Security Specialist","Security Analyst","Security Engineer","Security Architect","Security Consultant","Governance Risk & Compliance Specialist>compliance"],
  education:["Secondary School Teacher","Primary School Teacher","College Instructor","University Lecturer","Professor","Teaching Assistant","Tutor","Special Education Teacher",
    "Early Childhood Educator","Academic Advisor","Instructional Designer","Curriculum Developer","School Counselor","Education Administrator","Education Researcher"],
  operations:["Operations Manager","Operations Specialist","Process Improvement Specialist","Quality Assurance Specialist"],
  facilities:["Facilities Manager","Facilities Coordinator","Maintenance Supervisor","Janitorial Supervisor>facilities_frontline","Maintenance Technician"],
  finance:["Accountant","Public Accountant","Corporate Accountant","Tax Accountant","Auditor","Bookkeeper","Financial Analyst","FP&A Analyst","Finance Manager","Controller",
    "Financial Reporting Specialist","Treasury Analyst","Credit Analyst"],
  banking:["Investment Analyst","Investment Banker","Portfolio Analyst","Portfolio Manager","Wealth Manager","Financial Advisor","Equity Research Analyst",
    "Private Equity Professional","Venture Capital Professional","Trader","Banking Professional","Relationship Manager"],
  project:["Project Manager","Project Manager — AI Tools & Optimization","Program Manager","Scrum Master","Agile Coach"],
  product:["Product Manager"],
  business:["Management Consultant","Strategy Consultant","Business Consultant","Entrepreneur","Business Owner","Startup Founder","Business Analyst","Senior Business Analyst",
    "Process Analyst","Business Process Analyst","Requirements Analyst","Market Researcher"],
  language:["Bilingual Evaluator — French & English","French Evaluator","English Evaluator","Spanish Evaluator","German Evaluator","Italian Evaluator","Portuguese Evaluator","Arabic Evaluator",
    "Mandarin Evaluator","Cantonese Evaluator","Japanese Evaluator","Korean Evaluator","Hindi Evaluator","Dutch Evaluator","Polish Evaluator","Russian Evaluator","Ukrainian Evaluator",
    "Turkish Evaluator","Vietnamese Evaluator","Thai Evaluator","Indonesian Evaluator","Hebrew Evaluator","Bengali Evaluator","Tamil Evaluator","Tagalog Evaluator","Malay Evaluator",
    "Translator","Localization Specialist","Bilingual Content Reviewer","Linguist"],
  healthcare:["Nursing Professional","Registered Nurse","Nurse Practitioner","Licensed Practical Nurse","Healthcare Professional","Healthcare Administrator>operations","Healthcare Operations Specialist>operations",
    "Telemedicine Provider","Medical Doctor","Physician","General Practitioner","Healthcare Entrepreneur>business","Occupational Therapist","Physiotherapist","Respiratory Therapist","Radiologist",
    "Radiology Professional","Medical Laboratory Scientist","Medical Laboratory Professional","Clinical Research Professional","Clinical Documentation Specialist","Medical Coder",
    "Public Health Professional","Healthcare Compliance Specialist>compliance","Care Coordinator","Patient Services Specialist>cx"],
  pharmacy:["Pharmacy Specialist","Pharmacist","Pharmacy Technician"],
  dental:["Dentist","Dental Therapist","Dental Hygienist","Dental Assistant","Dental Office Manager>admin","Dental Professional"],
  mental_health:["Social Worker","Clinical Social Worker","Case Manager","Community Support Worker>care_support","Youth Worker","Family Support Worker","Counsellor","Psychologist",
    "Mental Health Professional","Behavioral Support Worker>care_support","Disability Support Worker>care_support","Caregiver>care_support","Nonprofit Program Coordinator>public"],
  transcription:["Transcription Specialist","Medical Transcriptionist","Legal Transcriptionist"],
  compliance:["Compliance Specialist","Compliance & Risk Manager","Risk Manager","Risk Analyst","Risk Specialist","Financial Compliance Specialist","Regulatory Affairs Specialist","Governance Specialist","Quality & Compliance Specialist"],
  supply_chain:["Logistics Coordinator","Logistics Manager","Supply Chain Specialist","Supply Chain Manager","Procurement Specialist","Procurement Manager","Vendor Manager","Contract Manager",
    "Inventory Specialist","Inventory Manager","Distribution Specialist"],
  warehousing:["Warehouse Worker","Warehouse Supervisor>supply_chain","Warehouse Manager>supply_chain"],
  transportation:["Commercial Truck Driver>driving","Delivery Driver>driving","Fleet Manager","Transportation Manager","Dispatcher"],
  construction:["Carpenter","HVAC Technician","Electrician","Plumber","Construction Manager>construction_mgmt","Construction Supervisor>construction_mgmt","Construction Worker","Site Manager>construction_mgmt",
    "Quantity Surveyor>construction_mgmt","Estimator>construction_mgmt","Welder","Machinist","Heavy Equipment Operator"],
  agriculture:["Farmer","Agricultural Worker","Agronomist","Farm Manager","Agricultural Technician","Agricultural Consultant"],
  manufacturing:["Manufacturing Technician","Production Worker","Production Supervisor","Production Manager","Quality Technician","Quality Manager","Machine Operator","Process Technician"],
  food:["Food Service Manager","Restaurant Manager","Chef","Cook>hospitality_frontline","Food Service Worker>hospitality_frontline","Server>hospitality_frontline"],
  hospitality:["Hotel Manager","Hospitality Manager","Front Desk Professional>hospitality_frontline","Hospitality Worker>hospitality_frontline"],
  travel:["Travel Professional"],
  admin:["Virtual Assistant","Personal Assistant","Administrative Assistant","Executive Assistant","Office Manager","Receptionist>cx_frontline","Data Entry Specialist","Administrative Coordinator"],
  legal:["Lawyer","Legal Expert & Consultant","Corporate Counsel","Legal Operations Specialist","Compliance & Regulatory Lawyer","Intellectual Property Expert","Patent Attorney","Paralegal",
    "Legal Assistant","Legal Researcher","Contract Specialist","Legal Operations Manager","Legal Analyst"],
  marketing:["Digital Marketing Specialist","Digital Marketing Manager","Marketing Strategist","Marketing Manager","Content Marketing Specialist","SEO Specialist","Email Marketing Specialist",
    "Paid Advertising Specialist","Performance Marketer","Brand Manager","Influencer Marketing Specialist","Affiliate Marketing Specialist","E-commerce Specialist","Market Researcher"],
  advertising:["Paid Ads Specialist"],
  social_content:["Social Media Manager","Social Media Specialist","Content Creator","Content Strategist","Copywriter","Community Manager","UGC Creator"],
  media:["Communications Specialist","Public Relations Specialist","Journalist>writing","Producer","Video Editor","Photographer","Media Specialist"],
  writing:["Writer","Editor","Proofreader","Technical Writer","Research Writer","Creative Writer","Content Editor"],
  sales:["Sales Representative","Account Executive","Business Development Representative","Business Development Manager","Sales Manager","Account Manager"],
  cx:["Customer Service Representative>cx_frontline","Customer Success Specialist","Customer Success Manager","Call Center Representative>cx_frontline","Technical Support Representative",
    "Client Services Specialist"],
  hr:["HR Specialist","HR Manager","HR Professional","Learning & Development Specialist","Training Manager","Compensation Analyst","HR Business Partner","People Operations Specialist"],
  recruitment:["Recruiter","Talent Acquisition Specialist"],
  real_estate:["Real Estate Agent","Real Estate Broker","Property Manager","Real Estate Analyst","Property Administrator","Mortgage Professional","Leasing Specialist"],
  architecture:["Architect","Interior Designer"],
  design:["Graphic Designer","UX Designer","UI Designer","Product Designer","UX Researcher","Industrial Designer"],
  government:["Government Administrator","Public Administrator","Program Officer","Government Program Manager","Research Officer"],
  policy:["Policy Analyst","Economist","Public Policy Specialist"],
  insurance:["Insurance Underwriter","Insurance Analyst","Claims Adjuster","Claims Specialist","Insurance Broker","Insurance Agent","Risk Underwriter"],
  energy:["Energy Analyst","Utility Specialist","Renewable Energy Specialist"],
  oil_gas:["Oil & Gas Professional"],
  telecom:["Telecommunications Engineer","Network Engineer"],
  veterinary:["Veterinarian","Veterinary Technician","Veterinary Assistant","Animal Care Professional"],
  retail:["Retail Associate"],
  research_participation:["Research Study Participant","User Testing Participant"],
};

/* Aliases. Plain string → alias of that record. {to, specialty} → alias that opens a record with a specialty. */
const PROFESSION_ALIASES = {
  "Registered Nurse":["RN","Nurse","Staff Nurse"], "Medical Doctor":["MD","DO","Doctor","Medic"], "Physician":["Doctor"], "Project Manager":["PM","Project Lead","Delivery Manager"],
  "Product Manager":["PM","Product Owner"], "Software Engineer — Front-End":["Front End Engineer","Frontend Engineer","Front-End Software Engineer","Frontend Software Engineer"],
  "Front-End Developer":["Frontend Developer","Front End Developer","Frontend Dev"], "Back-End Developer":["Backend Developer","Back End Developer","Backend Engineer"],
  "Full-Stack Developer":["Full Stack Developer","Fullstack Developer","Full Stack Engineer"], "Software Engineer":["SWE","Software Developer","Developer","Programmer","Coder"],
  "Virtual Assistant":["VA","Remote Assistant"], "HR Professional":["HR","Human Resources"], "HR Specialist":["HR","Human Resources Specialist"],
  "Primary School Teacher":["Elementary School Teacher","Elementary Teacher","Teacher"], "Secondary School Teacher":["High School Teacher","Teacher","Subject Teacher"],
  "Lawyer":["Attorney","Solicitor","Barrister","Legal Practitioner","Advocate",{alias:"Corporate Lawyer",specialty:"Corporate"},{alias:"Litigation Lawyer",specialty:"Litigation"},
    {alias:"Employment Lawyer",specialty:"Employment"},{alias:"Tax Lawyer",specialty:"Tax"}],
  "Legal Expert & Consultant":["Legal Consultant","Legal Expert"], "Transcription Specialist":["Transcriptionist","Content Transcription Expert","Transcription Expert","Transcriber"],
  "Data Annotator":["Data Labeler","Data Labeller","Annotator","Labeler"], "Commercial Truck Driver":["Truck Driver","HGV Driver","Lorry Driver","CDL Driver"],
  "Delivery Driver":["Logistics Driver","Courier","Van Driver"], "Caregiver":["Carer","Care Worker","Care Assistant"], "Bilingual Evaluator — French & English":["French-English Evaluator","French English Evaluator","English-French Evaluator"],
  "Physicist":["Physics Expert"], "Mathematician":["Math Expert","Mathematics Expert"], "Chemist":["Chemistry Expert"], "Biologist":["Biology Expert"],
  "Cybersecurity Expert":["Cyber Security","Cybersecurity Specialist","InfoSec"], "Compliance & Risk Manager":["Compliance Manager"], "Janitorial Supervisor":["Janitor Supervisor","Cleaning Supervisor"],
  "Janitor":["Janitorial Staff"], "Dentist":["Dental Surgeon"], "Data Scientist":["DS"], "Business Analyst":["BA"],
  "Quality Assurance Specialist":["QA Specialist"], "QA Engineer":["Test Engineer","QA"], "Software Tester":["Tester","Manual Tester"], "Database Administrator":["DBA"],
  "Machine Learning Engineer":["ML Engineer","MLE"], "AI Training Specialist":["AI Tutor","RLHF Specialist"], "Customer Service Representative":["CSR","Customer Service Agent"],
  "Business Development Representative":["BDR","SDR","Sales Development Representative"], "Account Executive":["AE"], "Executive Assistant":["EA"], "Personal Assistant":["PA"],
  "Quantity Surveyor":["QS"], "HVAC Technician":["HVAC","Heating and Air Conditioning Technician","Refrigeration Technician"], "Electrician":["Electrical Technician","Sparky"],
  "Plumber":["Pipefitter"], "Carpenter":["Joiner","Woodworker"], "Farmer":["Grower","Rancher"], "Chef":["Head Chef","Sous Chef"], "Paid Advertising Specialist":["PPC Specialist","Paid Media Specialist"],
  "Public Relations Specialist":["PR Specialist"], "Licensed Practical Nurse":["LPN","LVN"], "Nurse Practitioner":["NP"], "General Practitioner":["GP","Family Doctor"],
  "Accountant":["CPA","Chartered Accountant"], "Financial Advisor":["Financial Adviser","Financial Planner"], "Scrum Master":["Agile Delivery Lead"],
  "UX Designer":["User Experience Designer"], "UI Designer":["User Interface Designer"], "Social Media Manager":["SMM"], "Search Relevance Evaluator":["Search Quality Rater","Ads Quality Rater"],
  "Content Moderator":["Trust & Safety Specialist"], "Engineering — PhD":["Engineering PhD","PhD Engineer"], "Physics — PhD":["Physics PhD"], "Chemistry — PhD":["Chemistry PhD"],
  "Biology — PhD":["Biology PhD"], "Mathematics — PhD":["Mathematics PhD","Math PhD"], "AI/ML Research Expert":["AI ML Research","AI/ML Research"],
  "Patent Attorney":["Patent Agent","Patent Lawyer"], "Intellectual Property Expert":["IP Specialist","IP Lawyer"], "Veterinarian":["Vet","Veterinary Surgeon","DVM"],
};
/* Specialties: chosen in setup, used by Alex's introduction and question focus. */
const PROFESSION_SPECIALTIES = {
  "Software Engineer":["Front-End","Back-End","Full-Stack","Mobile","Systems","Cloud","DevOps","Machine Learning"],
  "Registered Nurse":["Critical Care","Emergency","Pediatric","Mental Health","Community","Clinical"], "Nursing Professional":["Critical Care","Emergency","Pediatric","Mental Health","Community","Clinical"],
  "Lawyer":["Corporate","Litigation","Compliance","Intellectual Property","Employment","Contract","Tax"],
  "Engineering":["Mechanical","Electrical","Civil","Chemical","Structural","Systems","Biomedical","Aerospace"], "Engineering — PhD":["Mechanical","Electrical","Civil","Chemical","Structural","Systems","Biomedical","Aerospace"],
  "Medical Doctor":["General Practice","Internal Medicine","Emergency Medicine","Pediatrics","Surgery","Psychiatry"], "Accountant":["Audit","Tax","Management Accounting","Financial Reporting","Forensic"],
  "Secondary School Teacher":["Mathematics","Science","English","Languages","Humanities","Computing"], "Data Scientist":["Machine Learning","Statistics","Experimentation","NLP","Computer Vision"],
  "Project Manager":["IT","Construction","Healthcare","Marketing","AI Tools & Optimization"], "Electrician":["Domestic","Commercial","Industrial","Maintenance"],
  "Translator":["Legal","Medical","Technical","Marketing","Literary"], "Chemist":["Organic","Analytical","Physical","Inorganic"], "Biologist":["Molecular","Cell","Ecology","Microbiology"],
};
/* Pay data: SEED DATA ONLY (from the owner's brief, 2026-10-02). Never presented as current or guaranteed. */
const PAY_SEED_NOTE = "From the owner's seed brief (2026-10-02). Not externally verified. Currency assumed from the '$' symbol.";
const PROFESSION_PAY_SEED = {
  "Software Engineer":[60,100], "Engineering — PhD":[73,73], "Software Engineer — Front-End":[70,80], "Data Engineer":[75,95], "Chemistry — PhD":[73,73],
  "Physics — PhD":[70,90], "Mathematics — PhD":[73,73], "Biology — PhD":[73,73], "AI/ML Research Expert":[80,90], "Generalist":[50,70], "Data Analyst":[55,75],
};
/* Short descriptions for frequently searched roles (others get a family-based description). */
const PROFESSION_DESCRIPTIONS = {
  "Registered Nurse":"Assesses, plans and delivers patient care, documents it accurately and escalates concerns.",
  "Software Engineer":"Designs, builds, tests and maintains software systems.", "Project Manager":"Plans and delivers projects on time, scope and budget while managing risk and stakeholders.",
  "Product Manager":"Decides what to build and why, balancing user needs, business goals and constraints.", "Accountant":"Prepares, reconciles and reviews financial records and reports.",
  "Lawyer":"Advises clients, analyses legal issues and drafts or reviews legal documents.", "Carpenter":"Builds, fits and repairs structures and fittings from drawings and measurements.",
  "HVAC Technician":"Installs, maintains and troubleshoots heating, ventilation and air-conditioning systems.", "Electrician":"Installs, tests and repairs electrical systems safely and to code.",
  "Virtual Assistant":"Provides remote administrative support: email, scheduling, research and organisation.", "Warehouse Worker":"Receives, picks, packs and moves stock safely and accurately.",
  "Generalist":"Evaluates AI responses across everyday topics using clear guidelines and justification.", "Data Analyst":"Turns data into reliable analysis, reports and recommendations.",
};
