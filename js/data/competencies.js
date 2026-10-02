/* =============================================================================
   Competency library — original BSP practice content.
   Each competency: label, sig (expected strong signals), weak (common weak signals),
   know (professional-knowledge question), scen (scenario question),
   beh (behavioral prompt fragment: "Tell me about a time when …").
   Tokens: {role} = profession title, {a_role} = "a/an <title>", {lang} = language.
   ai:true marks AI-evaluation competencies (their scenario becomes an AI-evaluation question).
   ========================================================================== */
"use strict";

const WEAK_DEFAULT = ["i guess","not sure","no idea","whatever","doesn't matter","just trust","always trust","i would ignore","skip it","probably fine"];

const COMPS = {};
function C(id, label, sig, know, scen, beh, extra){ COMPS[id] = Object.assign({ id, label, sig, know, scen, beh, weak:WEAK_DEFAULT }, extra||{}); }

/* ---------- Cross-cutting -------------------------------------------------- */
C("experience","Professional Experience",
  ["experience","years","project","responsible","skills","team","result","example","specialised","background"],
  "Tell me about your background as {a_role} and the experience you would draw on for this kind of work.",
  "", "");
C("communication","Professional Communication",
  ["audience","clear","concise","listen","tailor","confirm","written","update","expectations","feedback"],
  "How do you adapt your communication for different audiences in your work as {a_role}?",
  "You need to deliver unwelcome news to a stakeholder who is already frustrated. How do you handle the conversation?",
  "a misunderstanding caused a problem and you had to resolve it through communication");
C("judgment","Professional Judgment",
  ["evidence","risk","trade-off","priority","ethical","consequence","standard","escalate","decision","context"],
  "Describe how you make a judgment call as {a_role} when the guidance doesn't give a clear answer.",
  "You're asked to sign off on work you're not fully confident in because of a tight deadline. What do you do?",
  "you made a difficult decision with incomplete information");

/* ---------- General AI ----------------------------------------------------- */
C("instruction_following","Instruction Following",
  ["guideline","re-read","clarify","constraint","requirement","edge case","document","consistent","example","checklist"],
  "How do you make sure you follow a long, detailed set of task instructions exactly, including the parts that seem minor?",
  "Midway through a batch of tasks, you notice two guideline sections seem to contradict each other on a borderline case. What do you do, step by step?",
  "you had to follow a strict procedure even though a shortcut looked faster", {ai:true});
C("error_detection","Error Detection",
  ["verify","check","source","calculation","logic","assumption","inconsistent","claim","evidence","step"],
  "What is your systematic method for finding subtle errors in text or reasoning that looks polished and confident?",
  "An AI response reaches the correct final answer, but one step in its reasoning is wrong. How do you rate it, and why?",
  "you found an error that others had overlooked", {ai:true});
C("factuality","Fact Checking & Verification",
  ["source","primary","cross-check","date","citation","credible","verify","claim","outdated","evidence"],
  "How do you decide whether a factual claim is trustworthy, and which sources do you treat as authoritative?",
  "A response cites a statistic you can't find in any credible source, but the rest of the answer is excellent. How does that affect your rating?",
  "you had to verify information under time pressure", {ai:true});
C("rubric_consistency","Rubric Consistency & Calibration",
  ["rubric","criteria","consistent","calibrate","anchor","bias","fatigue","document","compare","standard"],
  "How do you keep your ratings consistent across hundreds of similar items over a long session?",
  "You realise your ratings from the morning were noticeably stricter than your afternoon ratings. What do you do?",
  "you had to apply the same standard consistently across a large volume of work", {ai:true});
C("preference_judgment","Preference & Ranking Judgment",
  ["helpful","harmless","honest","accurate","compare","criteria","trade-off","justify","instructions","tone"],
  "When comparing two AI responses to the same prompt, which criteria do you weigh, and in what order?",
  "Response A is accurate but curt. Response B is warm and thorough but contains one minor factual error. Which do you prefer, and how do you justify it?",
  "you had to choose between two imperfect options and explain your choice", {ai:true});
C("prompt_evaluation","Prompt Evaluation",
  ["ambiguous","intent","constraint","context","specific","audience","format","clarify","scope","example"],
  "What makes a prompt well written, and how do you spot a prompt that will produce unreliable responses?",
  "A user's prompt is ambiguous and the model silently picked one interpretation. How do you evaluate that response?",
  "you clarified an unclear request before starting work", {ai:true});
C("annotation_accuracy","Annotation Accuracy",
  ["label","guideline","edge case","consistent","ambiguous","taxonomy","double-check","agreement","example","precise"],
  "How do you approach labelling items that don't fit neatly into any category in the taxonomy?",
  "Your inter-annotator agreement score on a batch came back low. How do you investigate and respond?",
  "you maintained accuracy on repetitive, detailed work", {ai:true});
C("multimodal","Multimodal Evaluation",
  ["image","caption","describe","visual","detail","alignment","hallucination","object","accurate","context"],
  "How would you evaluate whether an AI's description of an image is accurate and complete?",
  "A model describes a photo correctly but invents a sign with text that isn't in the image. How serious is that, and how do you rate it?",
  "you had to pay very close attention to visual detail", {ai:true});
C("research_eval","Research Evaluation",
  ["methodology","sample","source","bias","evidence","peer-reviewed","limitation","citation","replicate","conclusion"],
  "How do you judge whether a research summary accurately reflects the underlying study?",
  "An AI summary of a study states a causal conclusion that the paper only presents as a correlation. How do you flag and rate this?",
  "you challenged a conclusion that wasn't supported by the evidence", {ai:true});
C("content_safety","Content Policy & Safety Review",
  ["policy","harm","context","guideline","sensitive","escalate","consistent","bias","intent","severity"],
  "How do you apply a content policy to borderline material where intent or context is unclear?",
  "A response technically answers the user but includes advice that could cause harm if misapplied. How do you rate it?",
  "you had to make a judgment call on sensitive content", {ai:true});

/* ---------- Business ------------------------------------------------------- */
C("risk","Risk Management",
  ["risk","likelihood","impact","mitigation","owner","register","contingency","monitor","escalate","probability"],
  "How do you identify, prioritise and track risks on a project or initiative?",
  "Two weeks before launch, a key vendor warns they may miss their delivery date. Walk me through your response.",
  "you spotted a risk early and acted before it became a problem");
C("stakeholder","Stakeholder Management",
  ["stakeholder","expectations","influence","align","communicate","conflict","priority","buy-in","map","update"],
  "How do you identify and manage stakeholders who have competing priorities?",
  "Two senior stakeholders give you conflicting requirements and both say theirs is non-negotiable. What do you do?",
  "you had to win support from a sceptical stakeholder");
C("scheduling","Scheduling & Planning",
  ["milestone","critical path","estimate","buffer","dependency","timeline","baseline","track","slip","sequence"],
  "How do you build a realistic schedule, and how do you know when it's at risk?",
  "A task on your critical path is running five days late. What options do you consider?",
  "a plan slipped and you had to recover the timeline");
C("dependencies","Dependency Management",
  ["dependency","upstream","downstream","handoff","blocker","sequence","critical path","owner","track","risk"],
  "How do you identify and manage dependencies between teams?",
  "Another team's delay is blocking your deliverable, and they don't report to you. How do you resolve it?",
  "you unblocked work that depended on another team");
C("scope","Scope Management",
  ["scope","requirement","change request","baseline","impact","approve","creep","priority","trade-off","document"],
  "How do you prevent scope creep while staying responsive to legitimate changes?",
  "A sponsor asks for a 'small' feature addition one week before delivery. How do you respond?",
  "you pushed back on a scope change");
C("resources","Resource Planning",
  ["capacity","allocation","skills","utilisation","priority","budget","forecast","conflict","backfill","plan"],
  "How do you plan and allocate people and budget across competing work?",
  "Your most experienced team member is pulled onto another project mid-delivery. How do you adapt?",
  "you delivered with fewer resources than planned");
C("requirements","Requirements Analysis",
  ["requirement","stakeholder","user story","acceptance criteria","process","gap","validate","document","priority","traceability"],
  "How do you elicit and validate requirements so that what gets built is what the business actually needs?",
  "Developers say a requirement is ambiguous after the build has started. What do you do?",
  "you uncovered a requirement nobody had written down");
C("process","Process Improvement",
  ["process","bottleneck","metric","root cause","map","waste","standard","measure","improve","kpi"],
  "How do you identify and improve an inefficient process?",
  "Order processing time has doubled in three months. How do you find out why?",
  "you improved a process and measured the result");
C("agile","Agile Delivery",
  ["sprint","backlog","velocity","retrospective","impediment","team","iteration","ceremony","prioritise","increment"],
  "How do you help a team deliver predictably in an agile environment?",
  "Your team has missed its sprint goal three sprints in a row. How do you investigate?",
  "you helped a team remove a serious impediment");
C("product_strategy","Product Strategy",
  ["user","problem","metric","prioritise","roadmap","hypothesis","research","value","outcome","trade-off"],
  "How do you decide what to build next when every stakeholder has a different priority?",
  "Usage of a feature you launched is far below forecast. What do you do next?",
  "you said no to a feature request for a good reason");
C("procurement","Procurement & Vendor Management",
  ["supplier","contract","tender","cost","quality","negotiate","risk","compliance","evaluate","sla"],
  "How do you evaluate and select suppliers?",
  "A key supplier raises prices by 20% with little notice. How do you respond?",
  "you negotiated a better outcome with a vendor");
C("supply_chain","Supply Chain Operations",
  ["inventory","demand","forecast","lead time","logistics","supplier","buffer","disruption","cost","service level"],
  "How do you balance inventory cost against the risk of stock-outs?",
  "A port closure delays your main inbound shipment by three weeks. What are your options?",
  "you handled a supply disruption");
C("people","People & HR Practice",
  ["policy","employee","fair","confidential","document","law","consistent","investigate","culture","wellbeing"],
  "How do you handle a sensitive employee-relations issue fairly and consistently?",
  "An employee raises a complaint against their manager, who is a high performer. What steps do you take?",
  "you handled a confidential people issue");
C("recruiting","Recruiting & Selection",
  ["criteria","structured","bias","candidate","assess","sourcing","pipeline","experience","fair","job"],
  "How do you assess candidates fairly and reduce bias in hiring?",
  "A hiring manager wants to hire a candidate who performed poorly in the structured interview. How do you handle it?",
  "you filled a hard-to-hire role");
C("compliance","Compliance & Controls",
  ["regulation","policy","control","audit","evidence","risk","breach","report","monitor","document"],
  "How do you make sure an organisation stays compliant as regulations change?",
  "You discover a process has been non-compliant for six months. What do you do first?",
  "you raised a compliance concern");
C("consulting","Problem Structuring",
  ["hypothesis","issue tree","data","mece","recommendation","prioritise","stakeholder","analysis","assumption","impact"],
  "How do you structure an ambiguous business problem so it can be solved?",
  "A client's profit fell 15% this year. How would you structure the first week of analysis?",
  "you structured a messy problem for a client or leader");
C("operations","Operations Management",
  ["kpi","capacity","throughput","quality","cost","staffing","process","schedule","safety","improve"],
  "Which operational metrics do you watch most closely, and why?",
  "Customer complaints spike after a process change you approved. What do you do?",
  "you turned around under-performing operations");

/* ---------- Finance -------------------------------------------------------- */
C("reconciliation","Reconciliation",
  ["reconcile","ledger","bank statement","variance","timing difference","investigate","match","adjust","document","sub-ledger"],
  "Walk me through how you perform a bank or balance-sheet account reconciliation.",
  "A reconciliation is out by an amount you can't explain, and the close is tomorrow. What do you do?",
  "you tracked down an unexplained variance");
C("accuracy","Financial Accuracy",
  ["accurate","check","review","tie out","formula","source","reconcile","error","materiality","validate"],
  "How do you make sure financial figures you produce are accurate before anyone relies on them?",
  "You find a formula error in a spreadsheet that fed last month's management report. What do you do?",
  "you caught an error before it reached a decision-maker");
C("controls","Internal Controls",
  ["segregation","approval","control","authorisation","review","risk","fraud","test","document","evidence"],
  "What makes an internal control effective, and how would you test one?",
  "One person can both create and approve supplier payments. What is the risk, and what do you recommend?",
  "you strengthened a control");
C("materiality","Materiality",
  ["material","threshold","qualitative","quantitative","misstatement","judgment","users","benchmark","revenue","decision"],
  "How do you decide whether a misstatement is material?",
  "An error is below your quantitative threshold but relates to executive bonuses. Is it material? Why?",
  "you had to judge whether an issue mattered enough to escalate");
C("audit","Audit Reasoning",
  ["assertion","evidence","sample","risk","test","sufficient","appropriate","substantive","control","conclusion"],
  "How do you decide how much audit evidence is enough?",
  "Management can't produce invoices for a sample of large expenses. How do you proceed?",
  "you challenged management's explanation");
C("evidence","Evidence & Documentation",
  ["evidence","document","source","reliable","independent","audit trail","support","verify","retain","review"],
  "What makes evidence reliable, and how do you document your work so someone else can follow it?",
  "A reviewer can't follow your working papers. How do you fix that and prevent it happening again?",
  "your documentation saved time or resolved a dispute");
C("analysis_fin","Financial Analysis",
  ["ratio","forecast","cash flow","margin","assumption","sensitivity","trend","valuation","driver","variance"],
  "How do you build a forecast and test the assumptions behind it?",
  "Revenue is up 10% but cash is down. What could explain it, and how would you check?",
  "your analysis changed a business decision");
C("risk_fin","Financial Risk",
  ["risk","exposure","hedge","credit","liquidity","market","stress test","limit","diversify","model"],
  "How do you identify and measure financial risk?",
  "A large customer that owes you money is showing signs of financial distress. What do you do?",
  "you flagged a financial risk early");
C("actuarial","Actuarial Modelling",
  ["probability","assumption","mortality","reserve","model","experience","sensitivity","data","validate","regulation"],
  "How do you set and validate assumptions in an actuarial model?",
  "Claims experience deviates sharply from your pricing assumptions. What do you investigate?",
  "you explained a complex model to non-specialists");

/* ---------- Healthcare ----------------------------------------------------- */
C("prioritization","Clinical Prioritization",
  ["triage","urgent","airway","deteriorating","assess","escalate","abc","risk","stable","priority"],
  "How do you prioritise care when several patients need you at the same time?",
  "You have three patients: one with new chest pain, one due for routine medication, and one asking for discharge paperwork. Who do you see first, and why?",
  "you had to prioritise under a heavy workload");
C("clinical_comm","Professional Communication",
  ["handover","sbar","clear","patient","family","confirm","document","escalate","listen","teach-back"],
  "How do you make sure critical information is communicated safely during handover?",
  "A patient's family is upset and demands information you're not yet able to confirm. How do you respond?",
  "clear communication prevented a clinical problem");
C("documentation","Documentation",
  ["accurate","timely","objective","record","legal","chart","signed","legible","contemporaneous","confidential"],
  "What does good clinical documentation look like, and why does it matter?",
  "You realise you forgot to document an intervention from earlier in your shift. What do you do?",
  "documentation affected a patient outcome or a review");
C("safety","Patient Safety",
  ["safety","protocol","check","allergy","error","report","escalate","verify","infection","risk"],
  "What safety checks do you build into your routine?",
  "You notice a prescribed dose looks ten times higher than usual. What do you do?",
  "you prevented a safety incident");
C("clinical_reasoning","Clinical Reasoning",
  ["assess","history","differential","evidence","guideline","symptoms","test","diagnosis","monitor","reassess"],
  "Walk me through your clinical reasoning when a patient presents with an unclear set of symptoms.",
  "A patient's vital signs are normal, but they tell you they 'feel wrong'. How do you proceed?",
  "your clinical reasoning changed a patient's care");
C("ethics","Ethics & Confidentiality",
  ["consent","confidential","privacy","autonomy","capacity","ethics","policy","disclose","advocate","dignity"],
  "How do you handle situations where a patient's or client's autonomy conflicts with what you think is best?",
  "A relative phones asking for a patient's test results. What do you do?",
  "you handled a confidentiality dilemma");
C("pharmacology","Medication Management",
  ["dose","interaction","contraindication","allergy","renal","verify","prescription","counsel","adverse","monitor"],
  "How do you check a prescription for safety before it is dispensed or given?",
  "A patient on warfarin is newly prescribed an antibiotic. What do you check, and why?",
  "you caught a medication issue");
C("dental","Oral Health Care",
  ["assessment","prevention","hygiene","consent","radiograph","infection control","treatment plan","patient education","periodontal","record"],
  "How do you build a preventive oral-health plan for a patient?",
  "A patient refuses a recommended treatment because of cost and anxiety. How do you proceed?",
  "you helped an anxious patient through treatment");
C("rehab","Rehabilitation Planning",
  ["assessment","goal","function","exercise","progress","measure","patient","plan","safety","adapt"],
  "How do you set and measure rehabilitation goals?",
  "A patient isn't progressing after four weeks of therapy. What do you reassess?",
  "you adapted a treatment plan");
C("lab","Laboratory Quality",
  ["specimen","quality control","calibration","contamination","protocol","result","validate","chain of custody","accuracy","report"],
  "How do you make sure a laboratory result is reliable before it is reported?",
  "Quality-control samples fail midway through a run. What do you do with the patient results?",
  "you investigated an unexpected lab result");
C("research_clin","Clinical Research Integrity",
  ["protocol","consent","adverse event","gcp","data","deviation","report","ethics","monitor","regulatory"],
  "How do you protect participant safety and data integrity in a clinical study?",
  "You discover a site enrolled a participant who didn't meet the eligibility criteria. What happens next?",
  "you handled a protocol deviation");
C("coding_med","Medical Coding Accuracy",
  ["icd","cpt","documentation","guideline","specific","query","audit","compliance","modifier","accurate"],
  "How do you code accurately when clinical documentation is incomplete?",
  "A clinician's note supports a lower-level code than the one they selected. What do you do?",
  "you queried a clinician about documentation");
C("psychosocial","Psychosocial Assessment",
  ["risk","assessment","safeguarding","empathy","boundaries","referral","confidential","strengths","plan","culture"],
  "How do you assess risk while building trust with a client?",
  "A client discloses thoughts of self-harm near the end of a session. What do you do?",
  "you supported someone in crisis");

/* ---------- Education ------------------------------------------------------ */
C("lesson_design","Lesson Design",
  ["objective","outcome","activity","assessment","differentiate","scaffold","engage","sequence","prior knowledge","reflect"],
  "How do you design a lesson so that every student can reach the learning objective?",
  "Half the class didn't grasp yesterday's lesson. How do you plan today?",
  "you redesigned a lesson that wasn't working");
C("assessment","Assessment & Feedback",
  ["rubric","formative","summative","criteria","feedback","evidence","progress","moderate","fair","align"],
  "How do you design assessments that measure what students actually learned?",
  "A student's essay is excellent, but you suspect AI wrote it. How do you handle it fairly?",
  "your feedback changed a learner's results");
C("differentiation","Differentiation & Inclusion",
  ["needs","adapt","support","extension","accommodation","inclusive","scaffold","iep","group","accessible"],
  "How do you meet the needs of learners at very different levels in one class?",
  "A student with a learning accommodation is falling behind despite support. What do you do?",
  "you adapted your teaching for a learner who was struggling");
C("classroom","Learning Environment",
  ["expectations","routine","behaviour","relationship","consistent","positive","engage","respect","de-escalate","safe"],
  "How do you create a learning environment where students are focused and feel safe?",
  "A normally engaged student becomes disruptive for a whole week. How do you respond?",
  "you turned around a difficult group");
C("instr_design","Instructional Design",
  ["needs analysis","objective","addie","learner","assessment","alignment","engagement","evaluate","prototype","feedback"],
  "How do you go from a vague training request to a course that actually changes behaviour?",
  "Learners complete your e-learning module, but their performance on the job doesn't improve. What do you investigate?",
  "you designed training that measurably worked");
C("subject_explain","Subject Explanation",
  ["example","analogy","misconception","step","check understanding","simple","accurate","visual","practice","question"],
  "How do you explain a difficult concept in your subject so that a struggling learner understands it?",
  "A learner keeps making the same mistake after three explanations. What do you change?",
  "you helped a learner finally understand something");

/* ---------- Science -------------------------------------------------------- */
C("experiment","Experimental Design",
  ["hypothesis","control","variable","sample size","randomise","replicate","bias","measure","confound","power"],
  "How do you design an experiment so that its results are trustworthy?",
  "Your experiment gives a striking result that nobody has reported before. What do you do before sharing it?",
  "you redesigned an experiment after a flaw was found");
C("stats","Statistical Reasoning",
  ["p-value","confidence interval","sample","distribution","variance","significance","effect size","assumption","test","bias"],
  "How do you choose the right statistical test, and which assumptions do you check?",
  "A colleague reports p = 0.04 after running twenty different tests. What concerns you?",
  "statistics changed a conclusion you or your team had reached");
C("reproducibility","Reproducibility & Rigor",
  ["replicate","protocol","document","data","version","method","peer review","transparent","control","error"],
  "What practices make your scientific work reproducible?",
  "You can't reproduce a result your own lab produced six months ago. How do you investigate?",
  "you made a piece of work more rigorous");
C("lit_eval","Scientific Evidence Evaluation",
  ["peer-reviewed","method","sample","limitation","bias","replicate","citation","effect","consensus","conflict of interest"],
  "How do you evaluate the quality of a published study?",
  "A widely shared paper makes a strong claim from a small, unblinded study. How do you assess it?",
  "you challenged a popular claim with evidence");
C("lab_safety","Laboratory Safety",
  ["risk assessment","ppe","hazard","sds","waste","protocol","ventilation","spill","training","report"],
  "How do you assess and control hazards before starting lab work?",
  "A colleague skips a safety step to save time on a reaction. What do you do?",
  "you raised a safety concern in the lab");
C("math_reasoning","Mathematical Reasoning",
  ["proof","assumption","definition","counterexample","induction","logic","step","verify","general","rigor"],
  "How do you check that a proof or derivation is actually correct, not just plausible?",
  "An AI-written proof reaches the right conclusion but divides by a quantity that could be zero. How do you evaluate it?",
  "you found a flaw in a mathematical argument");
C("field_methods","Field & Environmental Methods",
  ["sample","site","contamination","protocol","baseline","monitor","regulation","data","impact","quality"],
  "How do you design a sampling plan that gives representative environmental data?",
  "Readings from one monitoring site are suddenly ten times higher than at the others. What do you check?",
  "you collected reliable data in difficult field conditions");

/* ---------- Engineering ---------------------------------------------------- */
C("design_req","Design & Requirements",
  ["requirement","specification","constraint","trade-off","load","tolerance","standard","verify","iterate","stakeholder"],
  "How do you turn requirements into a design you can verify?",
  "A late requirement change conflicts with an approved design. How do you evaluate the impact?",
  "you balanced competing design constraints");
C("eng_safety","Safety & Standards",
  ["safety factor","code","standard","hazard","fmea","risk","compliance","inspect","failure","redundancy"],
  "How do you make sure a design meets the relevant safety standards and codes?",
  "You discover a design already in production has a smaller safety margin than intended. What do you do?",
  "you raised a safety issue on a project");
C("rca","Root Cause Analysis",
  ["root cause","5 whys","fishbone","data","hypothesis","failure","test","corrective","preventive","verify"],
  "Walk me through how you find the root cause of a recurring failure.",
  "A component fails in the field but passes every lab test. How do you investigate?",
  "you solved a recurring technical problem");
C("testing_eng","Testing & Validation",
  ["test","validate","verify","measure","tolerance","prototype","data","acceptance","failure","specification"],
  "How do you plan testing to prove a design works before release?",
  "Test results are within specification but trending toward the limit. Do you release? Why or why not?",
  "testing caught a problem before release");
C("quality_eng","Quality Management",
  ["spc","defect","capability","iso","audit","corrective action","root cause","control chart","inspection","process"],
  "How do you use data to control and improve process quality?",
  "Defect rates on one production line double overnight. What do you check first?",
  "you reduced defects measurably");
C("systems_eng","Systems Integration",
  ["interface","requirement","integration","architecture","trade-off","verification","lifecycle","subsystem","stakeholder","risk"],
  "How do you manage the interfaces between subsystems built by different teams?",
  "Two subsystems pass their own tests but fail when integrated. How do you resolve it?",
  "you resolved an integration issue between teams");
C("process_eng","Process Optimization",
  ["yield","throughput","mass balance","parameter","control","efficiency","safety","data","experiment","bottleneck"],
  "How do you optimise a process for yield without compromising safety?",
  "Yield dropped 8% after a change of raw-material supplier. How do you investigate?",
  "you improved a process's efficiency");

/* ---------- Software / Data ------------------------------------------------ */
C("correctness","Code Correctness",
  ["edge case","input","test","requirement","null","boundary","expected","verify","invariant","bug"],
  "How do you convince yourself that a piece of code is correct, not just that it runs?",
  "A function passes all its tests, but you suspect it's wrong for some inputs. What do you do?",
  "you found a correctness bug that others had missed");
C("architecture","Architecture",
  ["modular","coupling","cohesion","scalable","trade-off","interface","pattern","maintainable","separation","layer"],
  "How do you decide on the architecture for a new service or feature?",
  "A monolith is slowing your team down. Would you split it into services? How would you decide?",
  "you made an architectural trade-off and lived with the result");
C("testing","Testing",
  ["unit test","integration","coverage","mock","regression","edge case","automate","assert","ci","flaky"],
  "What is your testing strategy for a new feature?",
  "Your team's test suite is slow and flaky, so developers skip it. What do you do?",
  "testing caught a serious bug before production");
C("debugging","Debugging",
  ["reproduce","logs","isolate","hypothesis","breakpoint","root cause","bisect","minimal","verify","stack trace"],
  "Walk me through how you debug an issue you've never seen before.",
  "A bug happens only in production, intermittently, about once a day. How do you approach it?",
  "you tracked down a hard bug");
C("complexity","Complexity",
  ["big-o","time","space","scale","profile","bottleneck","cache","algorithm","memory","benchmark"],
  "How do you reason about the performance of an algorithm before you run it?",
  "An endpoint that took 50 ms now takes 5 seconds with ten times more data. How do you investigate?",
  "you fixed a performance problem");
C("security","Security",
  ["injection","validation","authentication","authorization","secret","encrypt","least privilege","sanitize","vulnerability","dependency"],
  "What security checks do you apply when reviewing code?",
  "You find an API key committed to a public repository. What do you do, in order?",
  "you fixed a security weakness");
C("code_review","Code Review",
  ["readability","correctness","test","naming","constructive","suggestion","standard","edge case","maintainable","explain"],
  "What do you look for in a code review, and how do you give feedback?",
  "A senior colleague's pull request has a subtle bug and they're defensive about review comments. How do you handle it?",
  "your code review prevented a problem");
C("devops","Delivery & Reliability",
  ["pipeline","monitor","alert","rollback","infrastructure as code","deploy","incident","sla","automate","observability"],
  "How do you make deployments safe and reversible?",
  "A deploy causes a spike in errors at 2 a.m. Walk me through your response.",
  "you handled a production incident");
C("frontend","Frontend Quality",
  ["accessibility","responsive","performance","state","component","browser","usability","semantic","test","render"],
  "How do you build a user interface that is accessible and fast?",
  "Users on low-end phones report the app is unusable. How do you investigate?",
  "you improved a user-facing experience");
C("data_modeling","Data Modeling & Databases",
  ["schema","normalise","index","query","transaction","constraint","migration","backup","integrity","performance"],
  "How do you design a database schema that stays correct as the product grows?",
  "A query that powers the main dashboard has become very slow. How do you diagnose it?",
  "you fixed a data integrity or performance problem");
C("data_quality","Data Quality",
  ["missing","duplicate","outlier","validate","source","consistent","schema","clean","profile","accuracy"],
  "How do you check the quality of a dataset before analysing it?",
  "Yesterday's sales figure is 40% higher than any previous day. What do you check before reporting it?",
  "you caught a data-quality problem");
C("missing_data","Missing Data",
  ["missing","impute","random","bias","drop","pattern","mean","sensitivity","mechanism","document"],
  "How do you handle missing data, and how do you decide which method to use?",
  "30% of income values are missing, mostly from one region. What do you do?",
  "you handled incomplete data responsibly");
C("visualization","Visualization",
  ["chart","axis","scale","audience","clear","label","compare","misleading","colour","story"],
  "How do you choose the right chart for a message?",
  "A stakeholder wants a 3D pie chart with twelve slices for a board report. How do you respond?",
  "a visualization changed how people understood the data");
C("interpretation","Interpretation",
  ["context","business","insight","recommend","limitation","uncertainty","trend","segment","compare","action"],
  "How do you turn analysis results into a recommendation people can act on?",
  "Your analysis contradicts what leadership expected to see. How do you present it?",
  "your insight changed a decision");
C("causation","Correlation vs Causation",
  ["correlation","causation","confounder","experiment","a/b test","control","reverse","spurious","randomise","bias"],
  "How do you explain the difference between correlation and causation, and how can causation be established?",
  "Customers who use feature X churn less. A manager wants to force everyone to use X. What do you say?",
  "you stopped a wrong causal conclusion");
C("ml","Machine Learning",
  ["overfitting","validation","leakage","baseline","metric","feature","bias","generalise","precision","recall"],
  "How do you know a machine-learning model will work on new data?",
  "A model scores 98% accuracy offline but performs badly in production. What are the likely causes?",
  "you improved or rescued a model");
C("data_eng","Data Pipelines",
  ["pipeline","etl","schema","idempotent","monitor","latency","partition","quality check","orchestration","backfill"],
  "How do you design a data pipeline that is reliable and easy to recover?",
  "A nightly pipeline silently loaded duplicate records for a week. How do you fix it and prevent it recurring?",
  "you fixed a broken data pipeline");

/* ---------- Marketing ------------------------------------------------------ */
C("audience","Audience & Targeting",
  ["audience","segment","persona","research","needs","insight","channel","targeting","data","behaviour"],
  "How do you define and understand a target audience?",
  "A campaign reaches lots of people but very few of them convert. What do you examine?",
  "audience research changed a campaign");
C("campaign","Campaign Strategy",
  ["objective","kpi","budget","channel","message","funnel","timeline","test","audience","plan"],
  "How do you plan a campaign from objective to launch?",
  "Halfway through a campaign, the budget is cut by 40%. How do you adapt?",
  "you planned a campaign that beat its targets");
C("analytics_mkt","Marketing Analytics",
  ["conversion","click-through","acquisition cost","roi","attribution","a/b test","cohort","retention","kpi","dashboard"],
  "Which metrics tell you whether marketing is actually working?",
  "Paid ads show a great return on ad spend, but total revenue hasn't moved. What could be going on?",
  "you used data to change marketing spend");
C("copy","Copy & Brand Voice",
  ["audience","benefit","clear","tone","voice","call to action","headline","concise","brand","test"],
  "How do you write copy that is on-brand and persuasive?",
  "Legal asks you to add three disclaimers to a short ad. How do you keep it effective?",
  "your copy measurably improved results");
C("content_strategy","Content Strategy",
  ["audience","goal","calendar","seo","distribution","format","measure","pillar","repurpose","consistent"],
  "How do you build a content strategy that supports business goals?",
  "Your blog traffic is high but leads from it are almost zero. What do you change?",
  "you built a content programme from scratch");
C("seo","Search Optimization",
  ["keyword","intent","ranking","backlink","technical","crawl","content","serp","metadata","page speed"],
  "How do you decide which keywords to target?",
  "Organic traffic dropped 30% after a site redesign. How do you diagnose it?",
  "you grew organic traffic");
C("community","Community & Social",
  ["engagement","community","moderation","guidelines","tone","response","sentiment","crisis","creator","authentic"],
  "How do you build an engaged online community?",
  "A negative post about your brand is going viral. What do you do in the first hour?",
  "you handled a public complaint well");
C("creative","Creative Production",
  ["brief","hook","audience","authentic","platform","format","story","brand","disclosure","performance"],
  "How do you create content that feels authentic but still meets a brand brief?",
  "A brand asks you to make claims about a product that you can't verify. What do you do?",
  "your content performed well for a client");

/* ---------- Language ------------------------------------------------------- */
C("translation","Translation Accuracy",
  ["meaning","source","target","accurate","omission","addition","terminology","context","faithful","nuance"],
  "How do you make sure a translation into {lang} is faithful to the source without being too literal?",
  "A machine translation into {lang} is grammatical but subtly changes the meaning of a negation. How do you rate and fix it?",
  "you caught a meaningful translation error");
C("register","Register & Tone",
  ["formal","informal","register","tone","audience","politeness","honorific","context","consistent","natural"],
  "How do you decide on the right register when translating or writing in {lang}?",
  "A customer-service reply in {lang} is accurate but far too casual for the situation. How do you evaluate it?",
  "you adjusted tone for a different audience");
C("localization","Cultural Localization",
  ["culture","idiom","local","convention","date","currency","adapt","audience","sensitive","region"],
  "What is the difference between translation and localization when working in {lang}?",
  "An English idiom has been translated literally into {lang} and makes no sense. How do you handle it?",
  "you adapted content for a specific culture");
C("grammar","Grammar & Fluency Evaluation",
  ["grammar","agreement","syntax","spelling","punctuation","natural","fluent","native","error","consistent"],
  "How do you judge whether a {lang} text reads naturally to a native speaker?",
  "An AI response in {lang} is fluent but uses a word form that is only common in another region. How do you rate it?",
  "you edited text so that it sounded natural");
C("bilingual_eval","Bilingual Response Evaluation",
  ["both languages","consistent","meaning","instructions","accurate","natural","compare","rubric","cultural","error"],
  "How do you evaluate an AI response that must be correct in both English and {lang}?",
  "A user writes in {lang} and the AI replies in English. How do you rate that response?",
  "you worked across two languages professionally", {ai:true});

/* ---------- Writing / Content ---------------------------------------------- */
C("clarity","Clarity & Structure",
  ["audience","structure","concise","clear","purpose","heading","plain language","flow","edit","logical"],
  "How do you structure a piece of writing so the reader gets the point quickly?",
  "A 2,000-word report needs to become a one-page summary for executives. How do you approach it?",
  "you made complex writing clear");
C("editing","Editing & Proofreading",
  ["grammar","consistency","style guide","accuracy","clarity","tone","fact","track changes","query","pass"],
  "What is your process for editing someone else's work?",
  "An author strongly resists your edits to a paragraph that is factually unclear. How do you handle it?",
  "your editing significantly improved a piece of work");
C("style","Style Guide Adherence",
  ["style guide","consistent","terminology","format","convention","house style","capitalisation","checklist","standard","voice"],
  "How do you apply a style guide consistently across a long document?",
  "Two style guides apply to one document and they conflict. What do you do?",
  "you enforced consistency across a large body of work");
C("tech_writing","Technical Writing",
  ["audience","procedure","step","accurate","example","structure","test","diagram","terminology","update"],
  "How do you write documentation that users can actually follow?",
  "Users keep making the same mistake despite your documentation. What do you change?",
  "your documentation reduced support requests");
C("journalism","Reporting & Sourcing",
  ["source","verify","attribution","fair","balance","accurate","interview","ethics","correction","independent"],
  "How do you verify a story before publishing?",
  "A single anonymous source gives you an explosive tip. What do you do before publishing?",
  "you verified a difficult story");
C("transcription","Transcription Accuracy",
  ["verbatim","accurate","speaker","timestamp","guideline","inaudible","spelling","consistent","review","context"],
  "How do you produce an accurate transcript when the audio quality is poor?",
  "Two speakers talk over each other and one uses technical jargon. How do you transcribe it?",
  "you delivered accurate work under a tight deadline");

/* ---------- Legal ---------------------------------------------------------- */
C("legal_analysis","Legal Analysis",
  ["issue","rule","application","conclusion","precedent","statute","facts","argument","counterargument","jurisdiction"],
  "How do you analyse a legal question from the facts through to a conclusion?",
  "An AI legal summary cites a case you can't find anywhere. How do you handle it?",
  "your analysis changed a case strategy");
C("legal_research","Legal Research",
  ["source","primary","secondary","current","jurisdiction","citation","verify","statute","case law","update"],
  "How do you make sure your legal research is current and authoritative?",
  "You find a case that supports your argument, but it's from another jurisdiction. How do you use it?",
  "your research found something decisive");
C("contracts","Contract Review",
  ["clause","obligation","liability","indemnity","term","risk","ambiguity","negotiate","definition","compliance"],
  "What do you look for first when reviewing a contract?",
  "A supplier contract has an unlimited liability clause that the business wants to accept to save time. What do you advise?",
  "you negotiated a contract change");

/* ---------- Transferable skills ------------------------------------------- */
C("attention_detail","Attention to Detail",
  ["check","double-check","careful","accurate","notice","standard","list","verify","mistake","detail"],
  "How do you make sure your work is done right every time, even on repetitive tasks?",
  "You're given a task list with 20 steps and notice that step 12 conflicts with step 4. What do you do?",
  "you noticed something small that turned out to matter");
C("process_adherence","Process Adherence",
  ["procedure","step","checklist","follow","standard","safety","consistent","ask","report","rule"],
  "Why do procedures matter in your work, even when you know a faster way?",
  "A coworker shows you a shortcut that skips a required step. What do you do?",
  "you followed a process carefully when it really mattered");
C("quality_review","Quality Review",
  ["inspect","check","standard","quality","fix","report","complete","compare","clean","recheck"],
  "How do you check your own work before calling it finished?",
  "You inspect a coworker's completed work and find it doesn't meet the standard. What do you do?",
  "you caught a quality problem");
C("instructions","Instruction Following",
  ["read","listen","clarify","ask","confirm","exactly","step","instructions","note","repeat"],
  "How do you make sure you've understood instructions before you start a task?",
  "Your supervisor gives you instructions quickly and leaves, and one part is unclear. What do you do?",
  "you completed a task exactly as instructed");
C("reliability","Reliability & Time Management",
  ["on time","schedule","prioritise","plan","reliable","deadline","communicate","organise","consistent","responsible"],
  "How do you organise your time so that you finish your work reliably?",
  "You won't be able to finish all your assigned tasks before the end of your shift. What do you do?",
  "others relied on you to get something done");
C("safety_aware","Safety Awareness",
  ["safety","hazard","report","ppe","sign","risk","protect","procedure","clean","warn"],
  "How do you stay safe, and keep others safe, while you work?",
  "You see a spill in an area customers walk through, and you're busy with another task. What do you do?",
  "you prevented an accident");
C("customer","Customer Service",
  ["listen","polite","help","solve","patient","empathy","apologise","escalate","follow up","respect"],
  "How do you handle a customer or visitor who is unhappy?",
  "A customer is angry about a problem you didn't cause. How do you respond?",
  "you turned an unhappy customer around");
C("admin","Organisation & Admin Accuracy",
  ["organise","schedule","file","accurate","confidential","priority","system","track","deadline","communicate"],
  "How do you keep schedules, records and messages organised and accurate?",
  "Two important meetings have been double-booked and both parties are arriving now. What do you do?",
  "your organisation saved the day");

/* ---------- AI evaluation per field (ai:true) ------------------------------ */
function AI(id, label, artifact, sig, scen){
  C(id, label, sig,
    "How would you evaluate {artifact} for accuracy and usefulness from {a_role}'s perspective? What do you check first?".replace("{artifact}", artifact),
    scen, "you reviewed or corrected AI-generated or automated work", {ai:true});
}
AI("ai_business","AI Project Evaluation","an AI-generated project plan or status report",
  ["owner","risk","dependency","realistic","assumption","milestone","verify","missing","stakeholder","feasible"],
  "An AI-generated project plan looks complete, but it assigns no owners to risks and schedules testing after launch. How would you evaluate it?");
AI("ai_finance","AI Financial Evaluation","an AI-generated financial analysis",
  ["calculation","formula","source","reconcile","assumption","ratio","verify","material","error","standard"],
  "An AI explains a company's liquidity using the current ratio but divides current liabilities by current assets. How do you rate the response?");
AI("ai_health","AI Healthcare Content Evaluation","AI-generated patient or clinical information",
  ["safety","contraindication","evidence","guideline","accurate","harm","omission","patient","escalate","source"],
  "An AI gives a patient a clear, friendly explanation of a medication but leaves out a serious contraindication. How do you rate it?");
AI("ai_education","AI Educational Content Evaluation","AI-generated lesson material or a quiz",
  ["accurate","age-appropriate","objective","misconception","level","clear","assessment","bias","vocabulary","learner"],
  "An AI-generated quiz for 10-year-olds has correct answers, but two questions use vocabulary far above that level. How do you evaluate it?");
AI("ai_science","AI Scientific Reasoning Evaluation","an AI explanation of a scientific result",
  ["evidence","replicate","sample","causal","overclaim","method","uncertainty","control","units","source"],
  "An AI explains an experiment's result and claims it 'proves' the hypothesis based on a single trial. How do you evaluate it?");
AI("ai_engineering","AI Engineering Evaluation","an AI-generated design calculation",
  ["units","assumption","formula","safety factor","standard","verify","load","tolerance","check","error"],
  "An AI-generated design calculation uses the right formula but mixes millimetres and metres. How do you rate it?");
AI("ai_software","AI Code Evaluation","AI-generated code",
  ["correct","edge case","test","security","readable","requirement","complexity","injection","run","maintainable"],
  "An AI-generated function solves the prompt but builds a SQL query by concatenating user input into a string. How do you rate it?");
AI("ai_data","AI Insight Evaluation","an AI-generated data insight or dashboard summary",
  ["causation","correlation","evidence","sample","data quality","assumption","verify","uncertainty","segment","confounder"],
  "An AI summary of a dashboard says 'sales rose because of the new ad campaign', with no supporting analysis. How do you evaluate it?");
AI("ai_marketing","AI Marketing Content Evaluation","AI-generated marketing copy",
  ["claim","substantiate","brand","audience","compliance","tone","misleading","competitor","accurate","call to action"],
  "AI-written ad copy is catchy but promises 'guaranteed results' and names a competitor negatively. How do you evaluate it?");
AI("ai_language","AI Translation Evaluation","an AI translation into {lang}",
  ["meaning","register","natural","omission","terminology","cultural","accurate","fluent","consistent","severity"],
  "An AI translates a formal business email into {lang}. The meaning is right, but the greeting is far too informal. How do you rate it?");
AI("ai_writing","AI Writing Evaluation","an AI-written article or draft",
  ["fact","source","quote","attribution","tone","structure","accurate","plagiarism","clarity","verify"],
  "An AI-written article is well structured but includes a quote attributed to a real person that you can't verify. How do you evaluate it?");
AI("ai_legal","AI Legal Content Evaluation","an AI-generated legal summary or memo",
  ["citation","verify","jurisdiction","accurate","risk","hallucination","source","current","misstate","client"],
  "An AI-generated memo is persuasive and well cited, but one cited case doesn't exist. How do you rate it, and what do you do?");
