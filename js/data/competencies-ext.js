/* =============================================================================
   Competency library extension for the expanded profession families
   (trades, transport, logistics, hospitality, sales, HR, real estate, insurance,
   energy, veterinary, agriculture, manufacturing, security, design, policy, media,
   telecom, care). Original BSP content, same shape as js/data/competencies.js.
   ========================================================================== */
"use strict";

/* ---------- Trades & technical work ------------------------------------- */
C("trade_process","Technical Process & Workmanship",
  ["sequence","specification","standard","measure","tolerance","material","tool","finish","inspect","code"],
  "Walk me through how you plan and carry out a typical job as {a_role}, from reading the instructions to checking the finished work.",
  "You arrive at a job and the drawings or work order don't match what you see on site. What do you do before starting?",
  "you had to redo work to meet the required standard");
C("troubleshooting","Troubleshooting & Diagnosis",
  ["symptom","isolate","test","cause","eliminate","measure","document","verify","safe","step"],
  "How do you diagnose a fault as {a_role} when the cause isn't obvious? Describe your method.",
  "A fix you made yesterday has failed again today. How do you find the real cause this time?",
  "you tracked down a fault that others had missed");
C("measurement","Measurement & Accuracy",
  ["measure","twice","tolerance","unit","calibrate","check","level","square","record","error"],
  "How do you make sure your measurements and quantities are accurate as {a_role}?",
  "A measurement on the plan doesn't add up with the other dimensions. What do you do?",
  "a small measuring mistake could have caused a big problem");
C("tools_equipment","Tools, Equipment & Maintenance",
  ["inspect","maintain","right tool","calibrate","damage","tag out","manual","store","replace","safe"],
  "How do you choose, check and maintain the tools and equipment you use as {a_role}?",
  "You notice a piece of shared equipment is damaged just before a colleague uses it. What do you do?",
  "you prevented an accident or breakdown by checking equipment");

/* ---------- Logistics, transport, warehousing --------------------------- */
C("logistics_planning","Logistics & Route Planning",
  ["route","schedule","capacity","lead time","delay","priority","carrier","cost","track","contingency"],
  "How do you plan deliveries or shipments as {a_role} so they arrive on time and within cost?",
  "A key delivery is delayed and three customers are affected. How do you decide who gets what first?",
  "you replanned work quickly because of a delay");
C("inventory_control","Inventory & Stock Control",
  ["count","reconcile","discrepancy","record","FIFO","location","damage","reorder","audit","system"],
  "How do you keep stock records accurate as {a_role}?",
  "The system says 40 units are in stock but you can only find 32. What do you do?",
  "you found and fixed a stock discrepancy");
C("fleet_safety","Road & Fleet Safety",
  ["inspection","hours","rest","load","secure","weather","speed","log","report","regulation"],
  "What safety checks and rules matter most in your work as {a_role}, and why?",
  "You're behind schedule and the weather turns bad on a long route. What do you do?",
  "you chose safety over speed and it was the right call");

/* ---------- Hospitality & food ----------------------------------------- */
C("food_safety","Food Safety & Hygiene",
  ["temperature","allergen","cross-contamination","label","date","clean","handwashing","storage","record","inspection"],
  "Which food-safety controls do you treat as non-negotiable as {a_role}, and why?",
  "A customer says they have a serious allergy and the dish they ordered might contain it. What do you do?",
  "you stopped a food-safety problem before it reached a customer");
C("guest_service","Guest & Customer Service",
  ["listen","apologise","resolve","expectation","follow up","empathy","options","escalate","recover","feedback"],
  "How do you handle a dissatisfied guest or customer as {a_role}?",
  "A guest complains loudly at a busy time and other guests are watching. How do you handle it?",
  "you turned a complaint into a positive experience");

/* ---------- Sales, customer success, HR -------------------------------- */
C("sales_process","Sales Process & Pipeline",
  ["qualify","discovery","pipeline","follow up","objection","value","close","forecast","CRM","next step"],
  "Describe your sales process as {a_role}, from a first conversation to a signed agreement.",
  "A promising deal has stalled for a month and the buyer stopped replying. What do you do?",
  "you won back a deal that looked lost");
C("needs_discovery","Customer Needs Discovery",
  ["question","listen","problem","goal","priority","budget","decision maker","summarise","confirm","fit"],
  "How do you find out what a customer actually needs before recommending anything?",
  "A customer asks for a specific product, but what they describe sounds like a different problem. What do you do?",
  "asking the right questions changed what you recommended");
C("account_mgmt","Account & Relationship Management",
  ["relationship","trust","renewal","health","risk","value","check-in","escalate","plan","feedback"],
  "How do you keep a long-term client relationship healthy as {a_role}?",
  "Your largest client is unhappy and hints they may leave at renewal. What do you do?",
  "you saved or grew an important account");
C("hr_practice","Employment Policy & HR Practice",
  ["policy","fair","consistent","document","confidential","law","investigate","process","evidence","communicate"],
  "How do you make sure HR decisions are fair, consistent and compliant as {a_role}?",
  "A manager wants to dismiss an employee quickly after one incident, without following the process. What do you do?",
  "you handled a sensitive people issue carefully");
C("learning_dev","Learning & Development",
  ["needs analysis","objective","design","practice","assess","feedback","transfer","measure","adapt","learner"],
  "How do you design training that actually changes how people work?",
  "A training programme had good feedback scores but performance didn't improve. What do you investigate?",
  "training you designed or delivered made a measurable difference");

/* ---------- Property, insurance, energy, agriculture, animals ----------- */
C("property_mgmt","Property & Tenancy Management",
  ["lease","inspection","maintenance","tenant","arrears","compliance","notice","record","budget","communicate"],
  "What are the most important responsibilities you manage as {a_role}, and how do you keep on top of them?",
  "A tenant reports a serious repair issue and the owner is slow to approve the cost. What do you do?",
  "you resolved a difficult tenant or owner situation");
C("market_analysis","Market & Valuation Analysis",
  ["comparable","trend","location","demand","price","adjust","data","assumption","range","evidence"],
  "How do you analyse a market or value an asset as {a_role}? What evidence do you use?",
  "Two recent comparable sales point to very different values. How do you reconcile them?",
  "your analysis changed a client's decision");
C("underwriting","Risk Underwriting",
  ["risk","exposure","history","probability","severity","terms","exclusion","price","evidence","decline"],
  "How do you assess whether to accept a risk as {a_role}, and on what terms?",
  "An applicant's information looks strong, but one detail doesn't fit. What do you do?",
  "you identified a risk others had missed");
C("claims","Claims Assessment",
  ["policy","coverage","evidence","document","investigate","fair","timely","exclusion","fraud indicator","communicate"],
  "Walk me through how you assess a claim as {a_role}.",
  "A claim is probably genuine but the paperwork is incomplete and the customer is distressed. What do you do?",
  "you handled a complex or disputed claim");
C("energy_systems","Energy Systems & Efficiency",
  ["load","demand","efficiency","generation","grid","storage","safety","regulation","cost","data"],
  "Explain a key technical or commercial factor in energy systems that you work with as {a_role}.",
  "Energy use at a site jumped 20% this month with no obvious change. How do you investigate?",
  "you improved efficiency or reliability in an energy system");
C("crop_livestock","Crops, Soil & Livestock Management",
  ["soil","yield","weather","rotation","pest","nutrition","health","record","season","cost"],
  "How do you plan and monitor production as {a_role} through a season?",
  "Yields in one field are well below the others this season. How do you find out why?",
  "you adapted quickly to a weather or disease problem");
C("animal_care","Animal Health & Welfare",
  ["welfare","observe","symptom","handle","hygiene","record","owner","escalate","dosage","comfort"],
  "How do you assess and protect an animal's welfare in your work as {a_role}?",
  "An owner insists their pet is fine, but you notice signs that worry you. What do you do?",
  "you noticed a health problem early");

/* ---------- Manufacturing & quality ------------------------------------ */
C("production_planning","Production Planning",
  ["schedule","capacity","bottleneck","changeover","material","output","downtime","priority","shift","target"],
  "How do you plan production as {a_role} to hit output targets without sacrificing quality?",
  "A machine breakdown cuts capacity by a third for two days. How do you re-plan?",
  "you got production back on track after a disruption");
C("quality_control","Quality Control & Inspection",
  ["specification","sample","inspect","defect","measure","record","root cause","quarantine","standard","corrective"],
  "How do you check that work or products meet the required standard as {a_role}?",
  "You find a defect in a batch that has partly shipped. What do you do?",
  "you caught a quality problem before it reached a customer");

/* ---------- Security ---------------------------------------------------- */
C("threat_analysis","Threat & Vulnerability Analysis",
  ["threat","vulnerability","likelihood","impact","attack surface","patch","prioritise","evidence","control","residual risk"],
  "How do you assess and prioritise security risks as {a_role}?",
  "A scan reports 300 vulnerabilities and you can fix 20 this week. How do you choose?",
  "you reduced a significant security risk");
C("incident_response","Incident Response",
  ["contain","triage","evidence","log","communicate","escalate","root cause","recover","lessons","timeline"],
  "Walk me through how you respond to a security incident as {a_role}.",
  "You see signs that an account may be compromised late on a Friday. What do you do first?",
  "you handled a security incident or near miss");

/* ---------- Design, research, media ------------------------------------ */
C("design_process","Design Process & Iteration",
  ["brief","user","research","sketch","prototype","feedback","iterate","constraint","accessibility","rationale"],
  "Walk me through your design process as {a_role} from brief to final delivery.",
  "Stakeholders love a design that early users found confusing. What do you do?",
  "feedback changed your design for the better");
C("user_research","User Research",
  ["interview","observe","bias","sample","question","synthesis","insight","evidence","method","validate"],
  "How do you plan user research so the findings are trustworthy?",
  "Research findings contradict what the product team already decided to build. What do you do?",
  "research you ran changed a decision");
C("media_production","Content & Media Production",
  ["brief","audience","story","edit","quality","deadline","rights","accuracy","format","feedback"],
  "How do you take a piece of content from brief to publication as {a_role}?",
  "Just before publishing, you notice a factual claim you can't verify. What do you do?",
  "you delivered strong work under a tight deadline");

/* ---------- Policy, government, telecom, care --------------------------- */
C("policy_analysis","Policy Analysis",
  ["evidence","options","impact","stakeholder","cost","trade-off","assumption","implementation","equity","recommendation"],
  "How do you analyse a policy option as {a_role}? What evidence do you weigh?",
  "Two credible studies point in opposite directions on a policy question. How do you advise?",
  "your analysis shaped a recommendation");
C("public_programs","Public Program Delivery",
  ["eligibility","budget","rules","fair","outcome","report","accountability","stakeholder","timeline","risk"],
  "How do you deliver a public or nonprofit program so it is fair, accountable and effective?",
  "A program is underspending and missing its targets halfway through the year. What do you do?",
  "you improved how a program was delivered");
C("telecom_networks","Networks & Telecommunications",
  ["network","capacity","latency","outage","redundancy","monitor","configuration","fault","coverage","standard"],
  "Explain how you keep a network reliable in your work as {a_role}.",
  "Customers in one area report dropped connections since a change last night. How do you investigate?",
  "you resolved a network fault or outage");
C("person_care","Person-Centred Care & Safeguarding",
  ["dignity","choice","consent","observe","record","safeguarding","report","routine","communicate","wellbeing"],
  "How do you make sure the care you give respects the person's dignity and choices?",
  "Fictional scenario: a person you support seems withdrawn and has an unexplained bruise. What do you do?",
  "you noticed a change in someone's wellbeing and acted on it");

/* ---------- Generic AI evaluation for families without a specialist AI competency */
AI("ai_general","AI Content Evaluation in Your Field","AI-generated guidance or content about your work",
  ["accurate","verify","source","outdated","missing","assumption","safety","practical","standard","rating"],
  "An AI tool writes step-by-step guidance for a task {a_role} does every week. It reads well but skips one important check. How do you evaluate and rate it?");
