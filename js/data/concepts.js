/* =============================================================================
   Interview question CONCEPTS with meaningfully different VARIANTS (original BSP content).
   A concept tests one competency; each variant is a different situation with its own
   expected signals, not a renamed copy. Alex asks at most one variant of a concept per
   interview and prefers variants the candidate hasn't seen (js/engine.js pickNext).
   applies: "all" | list of competency ids (the profession must use one of them).
   comp: preferred competency ids in order; the first one the profession has is used.
   ========================================================================== */
"use strict";
const CONCEPTS = [
  { id:"schedule_risk", label:"Project Schedule Risk", applies:["risk","scheduling","dependencies","scope","resources","procurement","supply_chain"], comp:["risk","scheduling","dependencies","scope","resources","procurement","supply_chain"], type:"scenario", d:2,
    variants:[
      { id:"vendor_delay", label:"Vendor Delay", text:"A key vendor tells you on Monday that a critical component will arrive three weeks late. Two downstream teams depend on it, and the launch date has already been announced. What do you do in the first 48 hours, and how do you decide whether the date can hold?",
        sig:["vendor","critical path","dependency","downstream","contract","alternative supplier","escalate","stakeholder","re-baseline","contingency"] },
      { id:"resource_absence", label:"Resource Absence", text:"The only specialist on a regulated part of your work goes on unexpected leave for six weeks, two weeks before a compliance milestone. How do you protect the milestone without cutting corners?",
        sig:["knowledge transfer","backup","prioritise","compliance","contractor","scope","documentation","risk","stakeholder","timeline"] },
      { id:"regulatory_delay", label:"Regulatory Delay", text:"A regulator announces a new approval step that adds an unknown review period to work you planned to start next month. How do you plan when the length of the delay is unknown?",
        sig:["scenario","assumption","buffer","regulator","parallel","critical path","communicate","re-plan","contingency","decision point"] },
      { id:"technical_dependency", label:"Technical Dependency", text:"Testing reveals that a system your work depends on uses an older data format than everyone assumed. Fixing it belongs to another team with its own priorities. How do you resolve the dependency and keep your plan honest?",
        sig:["dependency","owner","negotiate","workaround","impact","escalate","priority","schedule","test","communicate"] },
      { id:"budget_freeze", label:"Budget Freeze", text:"Halfway through delivery, finance freezes all new spending for the rest of the quarter. Some planned purchases haven't been made yet. How do you re-plan, and what do you tell stakeholders?",
        sig:["scope","prioritise","re-sequence","budget","trade-off","stakeholder","defer","value","risk","approval"] },
    ] },
  { id:"conflicting_priorities", label:"Conflicting Priorities", applies:"all", comp:["prioritization","judgment"], type:"scenario", d:2,
    variants:[
      { id:"two_seniors", label:"Two Senior Requests", text:"Two senior colleagues each ask you for urgent work by the end of the day. You only have time to do one properly. How do you decide, and how do you handle the person who has to wait?",
        sig:["impact","deadline","clarify","priority","communicate","escalate","trade-off","transparent","agree","expectations"] },
      { id:"safety_vs_speed", label:"Safety vs Speed", text:"A manager asks you to skip a required checking step so the team can meet a deadline. You believe the step matters. What do you do?",
        sig:["risk","standard","safety","explain","escalate","alternative","document","consequence","compromise","integrity"] },
      { id:"customer_vs_internal", label:"Customer vs Internal Deadline", text:"An important customer asks for a change that would push back an internal deadline other teams rely on. How do you handle it?",
        sig:["impact","customer","stakeholder","negotiate","options","dependency","communicate","priority","agree","trade-off"] },
      { id:"quality_vs_volume", label:"Quality vs Volume", text:"Your team is measured on volume, and you notice the quality of finished work is starting to slip. What do you do about it?",
        sig:["quality","evidence","sample","measure","raise","root cause","standard","balance","propose","monitor"] },
      { id:"overloaded", label:"Sustained Overload", text:"For the third week in a row you have more work than you can finish to the right standard. How do you handle it?",
        sig:["prioritise","communicate","manager","capacity","delegate","standard","plan","negotiate","transparent","sustainable"] },
    ] },
  { id:"late_quality_issue", label:"Quality Issue Found Late", applies:"all", comp:["quality_review","attention_detail","accuracy","judgment"], type:"scenario", d:2,
    variants:[
      { id:"after_delivery", label:"After Delivery", text:"You discover an error in work that was delivered to a client last week. The client hasn't noticed. What do you do?",
        sig:["disclose","impact","correct","apologise","root cause","prevent","communicate","assess","honest","follow up"] },
      { id:"colleague_error", label:"Colleague's Error", text:"While building on a colleague's work, you find a mistake that affects your part. The colleague is senior to you. How do you handle it?",
        sig:["verify","respectful","raise","evidence","impact","privately","correct","document","collaborate","check"] },
      { id:"own_error", label:"Own Error", text:"You realise you made a mistake in something you finished yesterday. Nobody else has noticed yet. Walk me through what you do.",
        sig:["own","disclose","impact","fix","communicate","lesson","prevent","check","honest","timely"] },
      { id:"supplier_defect", label:"Supplier Defect", text:"Materials or data you received from a supplier turn out to be flawed after you've already started using them. What do you do?",
        sig:["stop","quarantine","impact","supplier","evidence","replace","document","inform","rework","prevent"] },
      { id:"data_report", label:"Figures Don't Reconcile", text:"The figures in a report going to leadership tomorrow morning don't reconcile with the source system. What do you do tonight?",
        sig:["reconcile","source","trace","difference","flag","delay","caveat","communicate","verify","document"] },
    ] },
  { id:"ambiguous_instructions", label:"Ambiguous Instructions", applies:"all", comp:["instruction_following","instructions","process_adherence","requirements","judgment"], type:"scenario", d:2,
    variants:[
      { id:"contradictory_guidelines", label:"Contradictory Guidelines", text:"Two official guidelines you must follow give contradictory instructions for the same task. What do you do?",
        sig:["clarify","document","escalate","priority","source","consistent","ask","record","assumption","apply"] },
      { id:"missing_information", label:"Missing Information", text:"You're given a task with an important detail missing, and the person who assigned it is unavailable until next week. How do you proceed?",
        sig:["assumption","document","ask","alternative","reversible","risk","proceed","flag","clarify","partial"] },
      { id:"changing_requirements", label:"Changing Requirements", text:"Halfway through a task, the requirements change for the second time. How do you handle it?",
        sig:["confirm","written","impact","scope","timeline","re-plan","communicate","version","agree","priority"] },
      { id:"unclear_acceptance", label:"Unclear Acceptance Criteria", text:"You're asked to deliver something 'to a high standard', with no definition of what that means. What do you do before starting?",
        sig:["criteria","example","clarify","define","agree","measurable","checklist","confirm","expectations","review"] },
      { id:"conflicts_with_policy", label:"Instruction Conflicts With Policy", text:"A manager's instruction would mean breaking a written policy. What do you do?",
        sig:["policy","clarify","escalate","document","explain","risk","comply","alternative","respectful","record"] },
    ] },
  { id:"confident_wrong_ai", label:"Confident but Wrong AI Output", applies:"ai", comp:["ai"], type:"ai_eval", stage:"ai", d:2,
    variants:[
      { id:"outdated_rule", label:"Outdated Rule", text:"An AI assistant writes a clear, confident summary for {a_role}, but it relies on a rule or standard that was replaced last year. How do you evaluate and rate the response?",
        sig:["outdated","verify","current","source","severity","rating","accuracy","correct","date","fail"] },
      { id:"fabricated_source", label:"Fabricated Source", text:"An AI answer about your field cites a report with a convincing title and author, but you can't find the report anywhere. How do you handle it?",
        sig:["fabricated","citation","verify","search","unsupported","hallucination","flag","trust","rating","source"] },
      { id:"wrong_calculation", label:"Wrong Calculation", text:"An AI tool gives you a confident total for a calculation you use in your work, but one intermediate step is wrong. How do you catch this kind of error, and how serious is it?",
        sig:["recalculate","step","check","error","severity","impact","verify","method","rating","correct"] },
      { id:"unsafe_advice", label:"Unsafe Advice", text:"An AI response to a question from your field recommends skipping a step that exists for safety or compliance reasons. How do you rate it, and what do you write in your justification?",
        sig:["safety","compliance","harm","severity","fail","rating","justification","standard","correct","escalate"] },
      { id:"biased_recommendation", label:"Biased Recommendation", text:"An AI tool ranks options for a decision in your field and appears to favour one because of an irrelevant personal characteristic. How do you evaluate it?",
        sig:["bias","irrelevant","fair","criteria","evidence","flag","severity","rating","consistent","harm"] },
    ] },
];
