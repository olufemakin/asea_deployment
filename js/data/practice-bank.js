/* =============================================================================
   BSP AI Practice Lab — question bank (original BSP practice content).

   Every practice session is EXACTLY 10 questions (PRACTICE_QUESTIONS is fixed).
   Difficulty: Easy 15 min · Medium 20 min · Hard 25 min.

   Question formats (fmt):
     rank       prompt + Response A/B → 5-point preference + 6 dimension calls + reasoning
     eval       prompt + response → select error types + explanation
     fact       reference + claim → 5-way label + evidence
     multi      material → select all that apply + explanation
     single     material → choose one + reasoning
     rewrite    prompt + flawed response → rewrite (checked against constraints)
     transcribe spoken audio (browser TTS) → type what you hear
   ========================================================================== */
"use strict";

const PRACTICE_QUESTIONS = 10;
const PRACTICE_DIFF = {
  easy:  { label:"Easy",   minutes:15, minWords:5,  d:"Clear-cut items with one main issue." },
  medium:{ label:"Medium", minutes:20, minWords:8,  d:"More subtle issues; reasoning must name the evidence." },
  hard:  { label:"Hard",   minutes:25, minWords:12, d:"Multiple or subtle issues; precise, well-justified reasoning." },
};
const ERROR_TYPES = [["instr","Instruction Error"],["fact","Factual Error"],["reason","Reasoning Error"],["missing","Missing Information"],
  ["irrel","Irrelevance"],["style","Style Problem"],["unsupported","Unsupported Claim"],["safety","Safety Concern"]];
const FACT_LABELS = ["Supported","Partially Supported","Unsupported","Contradicted","Cannot Determine"];
const FACT_HELP = "Supported: the reference fully backs the claim. Partially Supported: part is backed, part is not. Unsupported: the reference covers the topic but gives no evidence for this detail. Contradicted: the reference says otherwise. Cannot Determine: the claim is subjective or about something no reference like this could settle.";
const RANK_SCALE = [[-2,"A much better"],[-1,"A slightly better"],[0,"Tie"],[1,"B slightly better"],[2,"B much better"]];
const RANK_DIMS = [["if","Instruction Following"],["acc","Accuracy"],["rel","Relevance"],["comp","Completeness"],["cla","Clarity"],["saf","Safety"]];

const PRACTICE_CATEGORIES = [
  { id:"preference-ranking",   label:"Preference Ranking",        icon:"⚖️", comps:["Preference Judgment","Instruction Following","Justification"], d:"Compare two responses, choose a preference strength and justify it." },
  { id:"response-evaluation",  label:"AI Response Evaluation",    icon:"🧪", comps:["Error Detection","Factual Accuracy","Justification"], d:"Identify instruction, factual, reasoning and safety errors in AI responses." },
  { id:"instruction-following",label:"Instruction Following",     icon:"📋", comps:["Instruction Following","Attention to Detail"], d:"Check responses against every explicit constraint." },
  { id:"response-critique",    label:"Response Critique",         icon:"🔍", comps:["Error Detection","Critique Writing"], d:"Write precise, evidence-based critiques of AI responses." },
  { id:"response-rewriting",   label:"Response Rewriting",        icon:"✏️", comps:["Rewriting","Instruction Following"], d:"Fix flawed responses so they meet every requirement." },
  { id:"factuality",           label:"Factuality",                icon:"✅", comps:["Fact Checking","Evidence Use"], d:"Judge claims against controlled reference material." },
  { id:"hallucination",        label:"Hallucination Detection",   icon:"👻", comps:["Hallucination Detection","Evidence Use"], d:"Find statements that aren't supported by the source." },
  { id:"research",             label:"Research Verification",     icon:"📚", comps:["Research Evaluation","Evidence Use"], d:"Check whether claims match what a study actually found." },
  { id:"data-annotation",      label:"Data Annotation",           icon:"🏷️", comps:["Annotation Accuracy","Guideline Use"], d:"Apply a labelling guideline consistently." },
  { id:"text-classification",  label:"Text Classification",       icon:"🗂️", comps:["Classification","Guideline Use"], d:"Assign the correct class to short texts." },
  { id:"entity-annotation",    label:"Entity Annotation",         icon:"🔖", comps:["Entity Annotation","Attention to Detail"], d:"Select the correct entities and entity types." },
  { id:"image-labelling",      label:"Image Labelling",           icon:"🖼️", comps:["Visual Accuracy","Attention to Detail"], d:"Choose every label that is true of an image." },
  { id:"image-to-text",        label:"Image-to-Text",             icon:"📝", comps:["Caption Evaluation","Visual Accuracy"], d:"Judge whether AI captions match the image." },
  { id:"transcription",        label:"Transcription",             icon:"🎧", comps:["Transcription Accuracy","Listening"], d:"Transcribe short spoken sentences accurately." },
  { id:"search-relevance",     label:"Search Relevance",          icon:"🔎", comps:["Relevance Judgment","User Intent"], d:"Rate how well a result satisfies a search query." },
  { id:"prompt-evaluation",    label:"Prompt Evaluation",         icon:"💬", comps:["Prompt Evaluation","Clarity"], d:"Spot what makes a prompt unclear or unanswerable." },
  { id:"safety-evaluation",    label:"Safety Evaluation",         icon:"🛡️", comps:["Safety Judgment","Helpfulness"], d:"Balance safety and helpfulness, including over-refusal." },
  { id:"document-evaluation",  label:"Document Evaluation",       icon:"📄", comps:["Document Review","Consistency Checking"], d:"Find contradictions, omissions and unsupported conclusions in documents." },
  { id:"spreadsheet-evaluation",label:"Spreadsheet Evaluation",   icon:"📊", comps:["Calculation Checking","Data Quality"], d:"Find incorrect totals, duplicates and missing values." },
  { id:"domain-expert",        label:"Domain Expert Evaluation",  icon:"🎓", comps:["Domain Accuracy","Error Detection"], d:"Evaluate AI answers in professional fields." },
  { id:"coding-evaluation",    label:"Coding Evaluation",         icon:"💻", comps:["Code Correctness","Edge Cases"], d:"Find bugs and risks in AI-generated code." },
  { id:"multilingual",         label:"Multilingual Evaluation",   icon:"🌍", comps:["Translation Accuracy","Register"], d:"Judge translations across several languages." },
  { id:"french-english",       label:"French-English Evaluation", icon:"🇫🇷", comps:["Meaning Preservation","Register","Translation Judgment"], d:"Evaluate French ↔ English translations." },
  { id:"generalist",           label:"Generalist AI Evaluation",  icon:"🧭", comps:["Mixed AI Evaluation"], d:"A mixed set across all task types." },
];
/* Categories that may top up a session if their own pool is short. */
const PRACTICE_RELATED = {
  "response-critique":["response-evaluation"], "hallucination":["factuality"], "research":["factuality"],
  "data-annotation":["text-classification"], "text-classification":["data-annotation"], "entity-annotation":["data-annotation"],
  "instruction-following":["response-evaluation"], "domain-expert":["response-evaluation"], "multilingual":["french-english"],
  "french-english":["multilingual"], "safety-evaluation":["response-evaluation"], "prompt-evaluation":["instruction-following"],
  "document-evaluation":["spreadsheet-evaluation"], "response-rewriting":["instruction-following"],
};

const PB = [];   // static items
const add = o => PB.push(o);

/* ---------- Preference ranking ------------------------------------------- */
function RK(id,d,user,a,b,pref,dims,sig,model){ add({ id, cats:["preference-ranking"], fmt:"rank", d, comp:"Preference Judgment", material:{ user, a, b }, answer:{ pref, dims }, sig, model }); }
RK("rk1",1,"Give me a two-sentence summary of why sleep matters.",
  "Sleep lets your body repair itself and your brain store memories. Without enough of it, concentration, mood and health all suffer.",
  "Sleep is important. It has many benefits. It helps the body. It helps the brain. Most adults need seven to nine hours, and teenagers need even more, so try to get enough.",
  -2,{if:"A",cla:"A"},["two sentences","instruction","concise","b","five","length","clear","a"],
  "A follows the two-sentence instruction and is clear and accurate. B ignores the length constraint and is repetitive. A is much better.");
RK("rk2",1,"Translate 'Good morning' into Spanish.","Buenos días.","Buenas noches.",-2,{acc:"A"},["buenos días","buenas noches","good night","wrong","accurate","a"],
  "A is correct. B means 'Good night', so it is inaccurate. A is much better.");
RK("rk3",2,"List three tips for a job interview, one line each.",
  "1. Research the company.\n2. Prepare examples using the STAR method.\n3. Ask two thoughtful questions at the end.",
  "1. Research the company thoroughly, including its mission, recent news, competitors and the backgrounds of your interviewers, so you can tailor every answer.\n2. Prepare examples using the STAR method, practising them aloud until they feel natural.\n3. Ask thoughtful questions.",
  -1,{if:"A",comp:"B"},["one line","instruction","format","detail","b","longer","slightly","a"],
  "Both give useful tips, but only A respects 'one line each'. B adds useful detail yet breaks the format. A is slightly better.");
RK("rk4",2,"What is the capital of Australia?","Sydney is the capital of Australia and its largest city.","Canberra.",2,{acc:"B"},["canberra","sydney","wrong","accurate","fact","b"],
  "B is correct and concise. A states a common misconception: Sydney is the largest city, but Canberra is the capital. B is much better.");
RK("rk5",2,"Explain what a VPN does, for a complete beginner.",
  "A VPN is like a private tunnel for your internet traffic. It hides what you're doing from others on the same network, such as public Wi-Fi, and makes it look like you're connecting from somewhere else.",
  "A VPN establishes an encrypted tunnel using protocols such as WireGuard or IPsec, encapsulating packets and routing them through a remote endpoint, thereby masking the client's IP address.",
  -1,{cla:"A",rel:"A"},["beginner","jargon","analogy","clear","audience","accurate","both","a"],
  "Both are accurate, but the prompt asks for a beginner explanation. A uses a plain analogy; B is full of jargon. A is slightly better (B is not wrong).");
RK("rk6",3,"Write a short, polite reply declining a meeting invitation for Friday.",
  "Thank you for the invitation. Unfortunately I can't make Friday. Could we find another time next week?",
  "Thank you for the invitation. Unfortunately I'll be on holiday on Friday, so I can't attend. Could we find another time next week?",
  -1,{acc:"A",if:"T"},["holiday","invents","fabricates","reason","not given","user","a","slightly"],
  "Both are polite and short, but B invents a reason (a holiday) that the user never gave. Putting false information in someone's mouth is a real problem. A is slightly better.");
RK("rk7",2,"How many minutes are in 3.5 hours?","210 minutes.","3.5 hours × 60 minutes per hour = 210 minutes.",0,{acc:"T"},["both","correct","210","tie","working","concise"],
  "Both are correct. A is concise; B shows its working. Neither has a meaningful advantage for this simple question, so Tie (or a slight preference with a clear reason) is reasonable.");
RK("rk8",3,"My toddler just swallowed a coin. What should I do?",
  "Stay calm. If your child is choking, struggling to breathe, drooling or in pain, call emergency services now. If they seem fine, contact your doctor or a nurse advice line promptly for guidance; they may want an X-ray. Don't try to make them vomit.",
  "Coins usually pass naturally, so there's nothing to worry about. Just wait a few days.",
  -2,{saf:"A",acc:"A",comp:"A"},["safety","emergency","breathing","doctor","reassurance","dangerous","b","much better"],
  "A gives safe, prioritised guidance with clear warning signs. B gives false reassurance that could delay urgent care. A is much better.");
RK("rk9",3,"Summarise in under 20 words: 'The library will close at 5pm on Friday for staff training and reopen at 9am on Saturday.'",
  "Library closes 5pm Friday for staff training; reopens 9am Saturday.","The library is closing early on Friday.",-1,{comp:"A"},["reopen","saturday","omits","complete","under 20","both","a"],
  "Both meet the length limit, but B omits the reason and the reopening time, which readers need. A is better; slightly or much better are both defensible.");
RK("rk10",2,"Write a haiku about rain.","Soft rain on the roof\nthe garden drinks quietly\nclouds drift toward dusk",
  "The rain falls down today,\nIt washes all the dust away,\nThe children cannot play,\nThey'll go outside another day.",
  -2,{if:"A"},["haiku","5-7-5","syllables","form","rhyming","b","instruction","a"],
  "A follows the 5-7-5 haiku form. B is a rhyming quatrain, not a haiku, so it fails the instruction. A is much better.");

/* ---------- Response evaluation / critique -------------------------------- */
function EV(id,cats,d,user,response,errs,sig,model,comp){ add({ id, cats, fmt:"eval", d, comp:comp||"Error Detection", material:{ user, response }, answer:errs, sig, model }); }
EV("ev1",["response-evaluation","response-critique","generalist"],1,"Name the largest planet in our solar system.","Saturn is the largest planet in our solar system.",["fact"],
  ["jupiter","saturn","wrong","fact"],"Factual error: Jupiter is the largest planet, not Saturn.");
EV("ev2",["response-evaluation","instruction-following","generalist"],1,"In one sentence, what is photosynthesis?","Photosynthesis is how plants make food. They use sunlight, water and carbon dioxide. Oxygen is released as a by-product.",["instr"],
  ["one sentence","three","instruction","accurate"],"The content is accurate, but the prompt asked for one sentence and the response uses three: an instruction error.");
EV("ev3",["response-evaluation","safety-evaluation","response-critique"],2,"Is it safe to mix bleach and ammonia for cleaning?","Yes. Mixing them makes a stronger cleaner that's great for tough stains.",["fact","safety"],
  ["toxic","gas","chloramine","dangerous","never","safety","wrong"],"Factually wrong and unsafe: mixing bleach and ammonia releases toxic chloramine gas. The response should clearly say never to mix them.");
EV("ev4",["response-evaluation","response-critique"],2,"Why is the sky blue?","Because the sky reflects the colour of the oceans.",["fact","reason"],
  ["scattering","rayleigh","reflect","ocean","myth","wrong","reasoning"],"This repeats a myth. The sky is blue because air molecules scatter shorter (blue) wavelengths of sunlight more than longer ones (Rayleigh scattering).");
EV("ev5",["response-evaluation","response-critique"],2,"Give me a simple recipe for pancakes.","Ingredients: 200 g flour, 2 eggs, 300 ml milk, a pinch of salt, butter for the pan. Enjoy your pancakes!",["missing"],
  ["method","steps","missing","incomplete","ingredients"],"The ingredients are fine, but there are no method steps, so the user can't actually make the pancakes: missing information.");
EV("ev6",["response-evaluation","response-critique","generalist"],2,"What's a good laptop for students under $800?","Studies show that 97% of students prefer Brand X laptops, so Brand X is the only sensible choice.",["unsupported","reason"],
  ["studies","97%","source","unsupported","only","overclaim","no evidence"],"The '97%' statistic has no source (unsupported claim), and 'the only sensible choice' doesn't follow from a preference statistic (reasoning error). It also ignores the budget.");
EV("ev7",["response-evaluation","response-critique"],3,"Summarise our Q3 sales results for the board in a formal tone.","Sales were lit this quarter 🔥🔥 we absolutely smashed it lol, revenue up 12% which is kinda insane.",["style"],
  ["formal","tone","slang","emoji","board","style","12%"],"The content may be accurate, but the slang and emoji break the 'formal tone for the board' requirement: a style problem (arguably also an instruction error).");
EV("ev8",["response-evaluation","response-critique"],3,"How do I change a flat tyre?","Pneumatic tyres were developed in the 1880s and transformed cycling and motoring. Today's tyres use advanced rubber compounds.",["irrel","missing"],
  ["history","irrelevant","steps","jack","spare","missing","does not answer"],"The response talks about tyre history (irrelevant) and gives none of the steps the user asked for (missing information).");
EV("ev9",["response-evaluation","response-critique"],3,"If all bloops are razzies, and some razzies are lazzies, are all bloops lazzies?","Yes. Since bloops are razzies and razzies are lazzies, all bloops are lazzies.",["reason"],
  ["some","not all","does not follow","invalid","cannot conclude","logic","reasoning"],"Reasoning error: only some razzies are lazzies, so we can't conclude that all (or any) bloops are lazzies. The correct answer is 'not necessarily'.");
EV("ev10",["response-evaluation","instruction-following"],3,"Give a 3-item packing list for a beach day as a JSON array of strings.","- Sunscreen\n- Towel\n- Water bottle",["instr"],
  ["json","array","format","bullet","instruction","items fine"],"The items are sensible, but the response uses a bullet list instead of the requested JSON array, e.g. [\"Sunscreen\",\"Towel\",\"Water bottle\"].");

/* ---------- Domain expert evaluation -------------------------------------- */
EV("de1",["domain-expert"],2,"(Finance) A company's revenue is $500k and costs are $400k. What is its profit margin?","The profit margin is 25%, because profit is $100k and 100 ÷ 400 = 25%.",["fact","reason"],
  ["20%","revenue","divide","margin","costs","wrong denominator"],"Profit margin divides profit by revenue: 100 ÷ 500 = 20%. The response divided by costs (that's a mark-up), so the reasoning and the figure are wrong.","Domain Accuracy");
EV("de2",["domain-expert"],2,"(Software) What HTTP status code means 'Not Found'?","500 Internal Server Error.",["fact"],
  ["404","500","wrong","not found"],"'Not Found' is 404. 500 is a server error.","Domain Accuracy");
EV("de3",["domain-expert"],3,"(Project management) Our critical-path task is delayed by 3 days. Does the project finish date move?","No. A delay on one task never affects the finish date because other tasks can absorb it.",["fact","reason"],
  ["critical path","zero float","moves","finish date","3 days","unless","crash","fast-track"],"Critical-path tasks have zero float, so a 3-day delay moves the finish date by 3 days unless you recover time (e.g. crashing or fast-tracking).","Domain Accuracy");
EV("de4",["domain-expert"],2,"(Education) What does 'formative assessment' mean?","Formative assessment is the final exam at the end of a course that decides the grade.",["fact"],
  ["summative","during","feedback","final","wrong","learning"],"That describes summative assessment. Formative assessment happens during learning to give feedback and adjust teaching.","Domain Accuracy");
EV("de5",["domain-expert"],3,"(Data) Ice-cream sales and drowning incidents are correlated. Does ice cream cause drowning?","Yes, the strong correlation shows that eating ice cream causes drowning.",["reason"],
  ["confounder","temperature","summer","correlation","causation","reasoning"],"Correlation isn't causation. Hot weather is a confounder that increases both ice-cream sales and swimming.","Domain Accuracy");
EV("de6",["domain-expert"],3,"(Engineering) A rope rated for 2 kN must hold 1.8 kN with a required safety factor of 2. Is it adequate?","Yes, 2 kN is more than 1.8 kN, so it's safe.",["reason","safety"],
  ["safety factor","3.6","1.11","not adequate","required","ratio"],"With a safety factor of 2, the rope needs 3.6 kN capacity. Its factor is only 1.11, so it's not adequate.","Domain Accuracy");
EV("de7",["domain-expert"],2,"(Marketing) What does CTR stand for?","CTR means 'Customer Total Revenue'.",["fact"],
  ["click-through rate","clicks","impressions","wrong"],"CTR is click-through rate: clicks ÷ impressions.","Domain Accuracy");
EV("de8",["domain-expert"],3,"(Law, general) Is a verbal agreement ever legally binding?","No. Contracts are only valid if they are written and signed.",["fact"],
  ["can be","binding","some contracts","writing","jurisdiction","overgeneral","exceptions"],"Many verbal agreements can be binding; some contract types require writing depending on the jurisdiction. The blanket 'no' is wrong.","Domain Accuracy");

/* ---------- Instruction following ----------------------------------------- */
function IF(id,d,instruction,response,constraints,violated,sig,model){
  add({ id, cats:["instruction-following","generalist"], fmt:"multi", d, comp:"Instruction Following",
    prompt:"Which of the instruction's constraints does the response violate? Select all that apply.",
    material:{ user:instruction, response }, options:constraints.concat(["No constraints violated"]), answer:violated, sig, model });
}
IF("if1",1,"Write exactly three bullet points about recycling. Do not use the word 'environment'.","• Recycling saves resources.\n• It reduces landfill.\n• It protects the environment.",
  ["Exactly three bullet points","Do not use the word 'environment'"],[1],["environment","word","third bullet","three bullets ok"],"It has exactly three bullets, but the third uses the banned word 'environment'.");
IF("if2",1,"Reply in French, in one sentence: what colour is the sky on a clear day?","The sky is blue on a clear day.",
  ["Reply in French","One sentence"],[0],["english","french","one sentence ok","language"],"It is one sentence, but it's in English, not French.");
IF("if3",2,"Write a product name for a smart lamp. It must be one word, under 10 letters, and start with 'L'.","Luminara",
  ["One word","Under 10 letters","Starts with 'L'"],[2+1],["luminara","8 letters","one word","starts with l","all met"],"'Luminara' is one word, 8 letters and starts with L. No constraints are violated.");
IF("if4",2,"Summarise the meeting in under 30 words and end with the next meeting date (12 June).","The team agreed the launch plan, assigned design tasks to Priya and testing to Sam, and will review progress next week.",
  ["Under 30 words","End with the next meeting date (12 June)"],[1],["12 june","date","missing","21 words","under 30 ok"],"It's 21 words (fine), but it doesn't end with the 12 June meeting date.");
IF("if5",3,"List four European capitals in alphabetical order, in lowercase, separated by commas.","berlin, Madrid, paris, rome",
  ["Four capitals","Alphabetical order","Lowercase","Comma-separated"],[2],["madrid","capital m","lowercase","alphabetical ok","four ok"],"Four capitals in alphabetical order with commas, but 'Madrid' is capitalised, which breaks the lowercase rule.");
IF("if6",3,"Give two reasons to learn a language. Number them, keep each under 12 words, and don't mention travel.","1. It improves memory and concentration over time.\n2. It lets you travel and meet new people around the world.",
  ["Two reasons","Numbered","Each under 12 words","Don't mention travel"],[3],["travel","reason 2","under 12 ok","numbered ok"],"Two numbered reasons, each under 12 words, but reason 2 mentions travel.");
IF("if7",2,"Answer with only a number: how many sides does a hexagon have?","A hexagon has 6 sides.",
  ["Only a number","Correct answer"],[0],["only a number","6","extra words","correct"],"The answer (6) is correct, but the response adds words when only a number was requested.");
IF("if8",3,"Write a 2-line rhyming couplet about coffee. Don't use the word 'cup'.","Morning brew so dark and deep,\nYou rescue me from dreams of sleep.",
  ["Two lines","Rhyming","About coffee","Don't use the word 'cup'"],[4],["deep","sleep","rhymes","no cup","all met"],"Two lines, rhyming (deep/sleep), about coffee, no 'cup'. No constraints are violated.");

/* ---------- Response rewriting -------------------------------------------- */
function RW(id,d,user,response,checks,sig,model){ add({ id, cats:["response-rewriting","generalist"], fmt:"rewrite", d, comp:"Rewriting", material:{ user, response }, checks, sig, model }); }
RW("rw1",1,"Write a one-sentence product description of a reusable water bottle (max 25 words).",
  "This bottle is AMAZING!!! It keeps drinks cold. It is reusable. Everyone needs one. Buy it now!!!",
  [{label:"One sentence",t:"maxSentences",v:1},{label:"25 words or fewer",t:"maxWords",v:25},{label:"Mentions the bottle",t:"has",v:"bottle"},{label:"No shouting (!!!)",t:"lacks",v:"!!!"}],
  ["bottle","reusable","cold","one sentence"],"Example: \"This reusable steel bottle keeps drinks cold for 24 hours and cuts single-use plastic waste.\"");
RW("rw2",2,'Return ONLY a JSON object with the keys "name" and "age" for: Maria is 34.',"Sure! Here's the JSON: {name: Maria, age: thirty-four}",
  [{label:"Valid JSON only",t:"json"},{label:"name is \"Maria\"",t:"jsonEq",k:"name",v:"Maria"},{label:"age is the number 34",t:"jsonEq",k:"age",v:34}],
  ["json","maria","34"],"Correct output: {\"name\": \"Maria\", \"age\": 34}");
RW("rw3",2,"Give exactly 3 bullet points on staying hydrated.","You should drink water regularly through the day and carry a bottle with you, and also eat water-rich foods like fruit.",
  [{label:"Exactly 3 bullet points",t:"bullets",v:3},{label:"Mentions water",t:"has",v:"water"}],
  ["water","bottle","fruit"],"Example:\n- Drink water regularly through the day.\n- Carry a refillable bottle.\n- Eat water-rich foods like fruit.");
RW("rw4",2,"Write a polite email (under 60 words) declining a vendor's offer.","Your offer is a waste of our time and frankly not worth considering. Don't contact us again.",
  [{label:"Under 60 words",t:"maxWords",v:60},{label:"Includes thanks",t:"hasRe",v:"thank"},{label:"No insults",t:"lacksRe",v:"waste|worthless|don't contact"}],
  ["thank","decline","polite","offer"],"Example: \"Thank you for your proposal. After careful review, we've decided not to proceed at this time. We appreciate your time and wish you every success.\"");
RW("rw5",3,"Explain compound interest to a 12-year-old in under 50 words.","Compound interest is the APR-based amortisation of accrued principal, capitalised periodically under the effective annual rate.",
  [{label:"Under 50 words",t:"maxWords",v:50},{label:"Mentions interest",t:"hasRe",v:"interest"},{label:"No jargon (APR, amortisation)",t:"lacksRe",v:"\\bapr\\b|amorti"}],
  ["interest","grows","money","earn"],"Example: \"When you save money, the bank pays you a little extra called interest. Next year, you earn interest on your money and on last year's interest too, so your savings grow faster and faster.\"");
RW("rw6",3,"Fix only the factual error, keeping the rest of the sentence: 'Water boils at 90°C at sea level, so pasta cooks quickly.'","Water boils at 90°C at sea level, so pasta cooks quickly.",
  [{label:"Corrects to 100°C",t:"hasRe",v:"100\\s?°?\\s?c"},{label:"Removes 90°C",t:"lacksRe",v:"\\b90\\b"},{label:"Keeps the pasta clause",t:"hasRe",v:"pasta"}],
  ["100","sea level","pasta"],"Water boils at 100°C at sea level. Note that the 'so pasta cooks quickly' clause is a weak inference you might also flag in a critique.");

/* ---------- Fact checking / research / hallucination ---------------------- */
function FC(id,cats,d,reference,claim,label,sig,model){ add({ id, cats, fmt:"fact", d, comp: cats[0]==="research"?"Research Evaluation":"Fact Checking", material:{ reference, claim }, answer:label, sig, model }); }
const REF_LIB="The Riverside Library opened in 1998. It holds about 120,000 books and is open Monday to Saturday from 9am to 6pm. Membership is free for city residents; non-residents pay $20 per year.";
FC("fc1",["factuality","generalist"],1,REF_LIB,"The library opened in 1998.","Supported",["1998","opened"],"The reference states it opened in 1998.");
FC("fc2",["factuality"],1,REF_LIB,"The library is open seven days a week.","Contradicted",["monday to saturday","sunday","six days"],"It is open Monday to Saturday (six days), which contradicts the claim.");
FC("fc3",["factuality"],2,REF_LIB,"Non-residents pay an annual fee to join.","Supported",["$20","per year","non-residents"],"Non-residents pay $20 per year: an annual fee.");
FC("fc4",["factuality"],2,REF_LIB,"It has the largest book collection in the region.","Unsupported",["120,000","no comparison","region"],"The reference gives its size (about 120,000) but says nothing about other libraries, so 'largest in the region' is unsupported.");
FC("fc5",["factuality","generalist"],3,REF_LIB,"The library opened in 1998 and is open on Sundays.","Partially Supported",["1998","sunday","monday to saturday","part"],"The opening year is supported, but 'open on Sundays' is contradicted, so the claim as a whole is only partially supported.");
FC("fc6",["factuality"],3,REF_LIB,"Residents will love visiting the library.","Cannot Determine",["subjective","opinion","future","cannot"],"This is a subjective prediction; no factual reference could confirm it.");
const REF_SURVEY="In a 2025 survey of 400 employees, 62% said they preferred hybrid work, 25% preferred working full-time in the office and 13% preferred working fully remotely. The survey did not ask about productivity.";
FC("fc7",["factuality","generalist"],1,REF_SURVEY,"Most surveyed employees preferred hybrid work.","Supported",["62%","majority","hybrid"],"62% is a majority.");
FC("fc8",["factuality"],2,REF_SURVEY,"Over 70% of employees preferred hybrid work.","Contradicted",["62%","70%"],"The figure is 62%, not over 70%.");
FC("fc9",["factuality"],2,REF_SURVEY,"Fully remote work was the least popular option.","Supported",["13%","lowest","remote"],"13% is the lowest of the three options.");
FC("fc10",["factuality"],3,REF_SURVEY,"Hybrid workers in the survey were more productive.","Unsupported",["productivity","not ask","no evidence"],"The survey explicitly did not ask about productivity, so it gives no support for this claim.");
const REF_STUDY="A randomised trial of 240 adults found that a 10-minute daily walking routine reduced self-reported stress scores by 12% over eight weeks compared with a control group. Blood pressure did not change significantly. The authors note the study relied on self-reported measures.";
FC("rs1",["research","factuality"],1,REF_STUDY,"In the trial, daily walking reduced stress scores.","Supported",["12%","stress","reduced"],"The trial reports a 12% reduction in self-reported stress scores.");
FC("rs2",["research"],2,REF_STUDY,"The trial showed that daily walking lowers blood pressure.","Contradicted",["blood pressure","did not change","not significant"],"Blood pressure did not change significantly, which contradicts the claim.");
FC("rs3",["research"],1,REF_STUDY,"The trial lasted about two months.","Supported",["eight weeks","two months"],"Eight weeks is about two months.");
FC("rs4",["research"],3,REF_STUDY,"The results prove that walking reduces stress for everyone.","Unsupported",["240","prove","everyone","generalise","self-reported","sample"],"One trial of 240 adults using self-reported measures cannot prove an effect for everyone. The claim overgeneralises.");
FC("rs5",["research"],2,REF_STUDY,"Stress was measured using heart-rate monitors.","Contradicted",["self-reported","heart-rate","measure"],"The study relied on self-reported measures, not heart-rate monitors.");
FC("rs6",["research"],3,REF_STUDY,"Ten minutes of walking reduced stress more than yoga did.","Unsupported",["yoga","not compared","control group"],"The trial compared walking with a control group, not with yoga, so there is no evidence for this comparison.");

function HL(id,d,source,sentences,bad,sig,model){
  add({ id, cats:["hallucination","generalist"], fmt:"multi", d, comp:"Hallucination Detection",
    prompt:"Which sentences in the AI summary are NOT supported by the source? Select all that apply.",
    material:{ reference:source, response:sentences.map((x,i)=>`(${i+1}) ${x}`).join("\n") },
    options:sentences.map((x,i)=>`Sentence ${i+1}`).concat(["All sentences are supported"]), answer:bad, sig, model });
}
HL("hl1",1,REF_LIB,["The Riverside Library opened in 1998.","It holds about 120,000 books.","It also has a café on the top floor."],[2],["café","not mentioned","sentence 3"],"Sentence 3 (the café) isn't in the source.");
HL("hl2",2,REF_SURVEY,["The 2025 survey asked 400 employees about work preferences.","Most preferred hybrid work.","Managers were the group most likely to prefer office work.","Productivity was higher among hybrid workers."],[2,3],["managers","productivity","not asked","sentence 3","sentence 4"],"Sentence 3 invents a breakdown by role, and sentence 4 contradicts the source (productivity wasn't asked).");
HL("hl3",2,REF_STUDY,["The trial included 240 adults.","Participants walked for 30 minutes a day.","Stress scores fell by 12%."],[1],["10 minutes","30 minutes","sentence 2"],"Sentence 2 says 30 minutes; the source says 10.");
HL("hl4",3,"The Green Valley bus service runs every 15 minutes on weekdays and every 30 minutes at weekends. Tickets cost $2.50; children under 5 travel free.",
  ["Buses run every 15 minutes on weekdays.","At weekends, buses run every 30 minutes.","Tickets cost $2.50 and seniors travel free.","Children under 5 don't pay."],[2],["seniors","children","sentence 3","partially"],"Sentence 3 adds 'seniors travel free', which isn't in the source (only children under 5 travel free).");
HL("hl5",3,"Maple Street Clinic is open 8am–6pm Monday to Friday. Appointments can be booked online or by phone. Walk-ins are accepted only on Tuesday mornings.",
  ["The clinic is open on weekdays from 8am to 6pm.","You can book online or by phone.","Walk-ins are welcome any morning.","The clinic is open on Saturdays for emergencies."],[2,3],["tuesday","any morning","saturday","sentence 3","sentence 4"],"Sentence 3 overgeneralises (walk-ins are only on Tuesday mornings), and sentence 4 invents Saturday opening.");
HL("hl6",1,"The museum's new exhibition, 'Rivers of Light', opens on 3 March and runs until 30 June. Entry is free.",
  ["'Rivers of Light' opens on 3 March.","It runs until 30 June.","Entry is free."],[3],["all supported","accurate"],"Every sentence matches the source, so all are supported.");

/* ---------- Classification / annotation / entities / relevance ------------- */
function SG(id,cats,d,comp,prompt,material,options,answer,sig,model){ add({ id, cats, fmt:"single", d, comp, prompt, material, options, answer, sig, model }); }
const SENT=["Positive","Negative","Neutral","Mixed"];
const SENT_G="Guideline: Mixed = clearly positive AND negative opinions. Neutral = no opinion, only facts.";
[["tc1",1,"The delivery was fast and the shoes fit perfectly!",0,["fast","perfectly","positive"]],
 ["tc2",1,"The app crashes every time I open it.",1,["crashes","negative"]],
 ["tc3",2,"The order arrived on Tuesday in a brown box.",2,["fact","no opinion","neutral"]],
 ["tc4",2,"Great camera, but the battery dies by lunchtime.",3,["great","but","battery","mixed"]],
 ["tc5",3,"Well, that's just perfect: my refund is 'processing' for the third week.",1,["sarcasm","refund","third week","negative"]],
 ["tc6",3,"Not bad at all for the price.",0,["not bad","litotes","positive","price"]]].forEach(([id,d,t,a,sig])=>
  SG(id,["text-classification","generalist"],d,"Classification","Classify the sentiment of this review.",{ text:t, guideline:SENT_G },SENT,a,sig,`Correct label: ${SENT[a]}.`));
const INTENT=["Billing","Technical support","Cancellation","Feedback"];
[["tc7",1,"I was charged twice for my subscription this month.",0,["charged twice","billing"]],
 ["tc8",2,"How do I reset my password? The link in the email doesn't work.",1,["password","reset","link","technical"]],
 ["tc9",2,"Please close my account at the end of this billing period.",2,["close","account","cancellation"]],
 ["tc10",3,"Love the new dashboard design. Maybe add a dark mode?",3,["love","suggestion","feedback"]]].forEach(([id,d,t,a,sig])=>
  SG(id,["text-classification"],d,"Classification","Classify the customer's intent.",{ text:t, guideline:"Choose the single main intent." },INTENT,a,sig,`Correct label: ${INTENT[a]}.`));

const TOPICS=["Price","Quality","Delivery","Customer service"];
function DA(id,d,text,ans,sig){ add({ id, cats:["data-annotation","generalist"], fmt:"multi", d, comp:"Annotation Accuracy",
  prompt:"Tag every topic the review mentions (select all that apply).",
  material:{ text, guideline:"Delivery = shipping speed, packaging or courier. Customer service = any interaction with staff. Quality = how the product performs or is made. Price = cost or value for money." },
  options:TOPICS.concat(["None of these"]), answer:ans, sig, model:"Correct tags: "+(ans.map(i=>TOPICS[i]||"None").join(", "))+"." }); }
DA("da1",1,"Arrived two days late and the box was crushed.",[2],["late","box","delivery"]);
DA("da2",1,"Excellent sound for such a cheap speaker.",[0,1],["sound","quality","cheap","price"]);
DA("da3",2,"The support agent sorted my issue in five minutes. The blender itself is great too.",[1,3],["agent","service","blender","quality"]);
DA("da4",2,"Worth every penny, and it came the next day.",[0,2],["worth","price","next day","delivery"]);
DA("da5",3,"The courier was rude and left it in the rain, and the replacement the shop sent stopped working after a week.",[1,2],["courier","delivery","stopped working","quality","not staff of shop"]);
DA("da6",3,"I like the colour.",[1],["colour","quality","appearance"]);

function EN(id,d,text,opts,ans,sig){ add({ id, cats:["entity-annotation","generalist"], fmt:"multi", d, comp:"Entity Annotation",
  prompt:"Select every correct entity annotation (span — type). Leave incorrect ones unselected.", material:{ text, guideline:"Types: PERSON, ORGANISATION, LOCATION, DATE." },
  options:opts, answer:ans, sig, model:"Correct annotations: "+ans.map(i=>opts[i]).join("; ")+"." }); }
EN("en1",1,"Amina Diallo joined Northwind Bank in Lagos in 2019.",["Amina Diallo — PERSON","Northwind Bank — ORGANISATION","Lagos — LOCATION","2019 — DATE","Lagos — ORGANISATION"],[0,1,2,3],["amina","northwind","lagos","2019"]);
EN("en2",2,"On 4 July, Jordan visited Paris with the Red Cross team.",["4 July — DATE","Jordan — LOCATION","Jordan — PERSON","Paris — LOCATION","Red Cross — ORGANISATION"],[0,2,3,4],["jordan","person","paris","red cross","4 july"]);
EN("en3",2,"Apple announced new products in Cupertino on Monday.",["Apple — ORGANISATION","Apple — PERSON","Cupertino — LOCATION","Monday — DATE"],[0,2,3],["apple","company","cupertino","monday"]);
EN("en4",3,"Washington signed the agreement in Washington with Washington State University.",["Washington (1st) — PERSON","Washington (2nd) — LOCATION","Washington State University — ORGANISATION","Washington State University — LOCATION"],[0,1,2],["washington","context","person","location","organisation"]);
EN("en5",3,"Dr Chen from Pacific Health met the Mayor of Vancouver last Friday.",["Dr Chen — PERSON","Pacific Health — ORGANISATION","Vancouver — LOCATION","last Friday — DATE","Mayor — ORGANISATION"],[0,1,2,3],["chen","pacific health","vancouver","last friday","mayor is a title"]);

const REL=["Highly relevant","Somewhat relevant","Not relevant"];
[["sr1",1,"cheap flights to Lisbon","Compare low-cost flights to Lisbon from 200+ airlines. Prices from $49.",0],
 ["sr2",1,"cheap flights to Lisbon","Lisbon travel guide: 10 things to do in the city.",1],
 ["sr3",1,"how to boil an egg","History of the chicken: domestication in Asia.",2],
 ["sr4",2,"python list sort descending","Use sorted(my_list, reverse=True) or my_list.sort(reverse=True).",0],
 ["sr5",2,"python list sort descending","Python (snake) species found in Africa and Asia.",2],
 ["sr6",2,"symptoms of dehydration","Hydration tips for runners: how much water to drink before a race.",1],
 ["sr7",3,"apple pie recipe without butter","Classic apple pie recipe (uses 200 g butter in the crust).",1],
 ["sr8",3,"jaguar top speed","Jaguar F-TYPE: 0–60 mph in 3.5 seconds, top speed 186 mph.",1],
 ["sr9",3,"opening hours Riverside Library Sunday","Riverside Library: open Monday–Saturday, 9am–6pm.",0]].forEach(([id,d,qy,res,a])=>
  SG(id,["search-relevance","generalist"],d,"Relevance Judgment","How relevant is this result to the query?",{ query:qy, result:res },REL,a,["intent","query","result","relevant"],
  ({sr7:"Somewhat relevant: it's an apple pie recipe, but it violates the 'without butter' requirement.",sr8:"Ambiguous query (animal or car). The result covers one plausible meaning, so it's somewhat relevant.",sr9:"Highly relevant: it directly answers that the library is closed on Sundays."})[id]||`Expected: ${REL[a]}.`));

/* ---------- Prompt evaluation ---------------------------------------------- */
const PFLAWS=["Ambiguous goal","Missing audience","Missing format or length","Conflicting constraints","Missing context or data","No significant issues"];
function PE(id,d,prompt,ans,sig,model){ add({ id, cats:["prompt-evaluation","generalist"], fmt:"multi", d, comp:"Prompt Evaluation",
  prompt:"What problems does this prompt have? Select all that apply.", material:{ user:prompt }, options:PFLAWS, answer:ans, sig, model }); }
PE("pe1",1,"Write something about dogs.",[0,1,2],["vague","audience","length","format"],"The goal, audience and format are all unspecified.");
PE("pe2",2,"Summarise the attached report in 3 bullet points.",[4],["attached","no report","missing data"],"Nothing is attached, so the model has no data to summarise.");
PE("pe3",2,"Write a 500-word essay in under 100 words.",[3],["500","100","conflict"],"The two length constraints conflict.");
PE("pe4",3,"Explain quantum computing to my grandmother in 3 short paragraphs, using one everyday analogy, without equations.",[5],["clear","audience","format","constraint"],"Clear goal, audience, format and constraints: no significant issues.");
PE("pe5",3,"Fix the bug.",[0,4],["which bug","no code","context","goal"],"No code or error is given, and 'fix' is undefined without expected behaviour.");
PE("pe6",2,"Write a formal, casual email to my landlord.",[3,4],["formal","casual","conflict","purpose"],"'Formal' conflicts with 'casual', and the email's purpose is missing.");

/* ---------- Safety evaluation --------------------------------------------- */
const SAFE=["Safe and helpful","Harmful or dangerous","Unnecessary refusal","Privacy problem","Needs a safety caveat"];
[["sf1",1,"What's a healthy breakfast?","Oats with fruit, eggs with wholegrain toast, or yoghurt with nuts are balanced options.",0,"Helpful and harmless."],
 ["sf2",2,"How can I write a strongly worded complaint to my landlord about mould?","I'm sorry, I can't help with writing aggressive messages.",2,"A firm, legitimate complaint isn't harmful. Refusing is unhelpful (over-refusal)."],
 ["sf3",2,"What's my coworker Ana Silva's home address? She works at Delta Corp.","Ana Silva lives at 14 Harbour Road; her phone is 555-0142.",3,"Sharing a private individual's address and phone number is a privacy violation."],
 ["sf4",2,"I want to start running. Any tips?","Start with run-walk intervals three times a week and build up gradually. If you have heart problems or haven't exercised in a long time, check with a doctor first.",0,"Helpful, with a proportionate caveat. Safe."],
 ["sf5",3,"Can I take ibuprofen for my headache?","Sure, take as much as you need until the pain stops.",1,"Encourages exceeding dosing limits, which is unsafe. It should point to the label dose and a pharmacist."],
 ["sf6",3,"How do I replace a light switch myself?","Turn off power at the breaker, confirm it's off with a voltage tester, then swap the wires to the matching terminals. If you're unsure, or local rules require it, use a licensed electrician.",0,"Practical and includes key safety steps. Safe and helpful."],
 ["sf7",3,"How long can cooked rice sit out before I eat it?","Rice is fine at room temperature for several days.",1,"Wrong and risky: cooked rice should be refrigerated within about an hour or two. This is a food-safety risk."],
 ["sf8",3,"What should I do with old medicines?","Just throw them in the bin.",4,"Not dangerous to the user directly, but it should mention pharmacy take-back schemes and keeping medicines away from children: it needs a caveat."]].forEach(([id,d,u,r,a,m])=>
  SG(id,["safety-evaluation","generalist"],d,"Safety Judgment","How would you classify this response?",{ user:u, response:r },SAFE,a,["safe","helpful","refusal","privacy","caveat","harm"],m));

/* ---------- Document evaluation ------------------------------------------- */
const DISSUES=["Contradiction","Omission (missing key information)","Incorrect total or calculation","Duplicate entry","Unsupported conclusion","No issues"];
function DOC(id,d,artifact,ans,sig,model){ add({ id, cats:["document-evaluation","generalist"], fmt:"multi", d, comp:"Document Review",
  prompt:"What issues does this document contain? Select all that apply.", material:{ artifact }, options:DISSUES, answer:ans, sig, model }); }
DOC("doc1",1,{kind:"doc",title:"Email: team meeting",text:"Hi all,\nThe team meeting has moved to Thursday 14 May at 10am.\nPlease bring your updates.\nSee you on Wednesday!\nRavi"},[0,1],["thursday","wednesday","contradiction","location","where"],"Thursday vs Wednesday is a contradiction, and no location or link is given (omission).");
DOC("doc2",2,{kind:"doc",title:"Leave policy (extract)",text:"1. Full-time employees receive 20 days of annual leave.\n2. Leave requests need two weeks' notice.\n3. Full-time employees receive 25 days of annual leave, plus public holidays."},[0],["20","25","contradiction","clause 1","clause 3"],"Clauses 1 and 3 contradict each other (20 vs 25 days).");
DOC("doc3",2,{kind:"table",title:"Expense claim",cols:["Item","Amount ($)"],rows:[["Train ticket","45.00"],["Hotel (1 night)","120.00"],["Train ticket","45.00"],["Total","210.00"]]},[3],["duplicate","train ticket","total 210","45"],"The train ticket appears twice (possible duplicate). The total 210.00 matches the listed rows, so the calculation itself is fine.");
DOC("doc4",3,{kind:"doc",title:"Quarterly report (extract)",text:"Revenue: Q1 $40k, Q2 $45k, Q3 $50k. Total for the three quarters: $145k.\nWe changed our logo in Q2. The logo change is the reason revenue grew."},[2,4],["135","145","total","logo","unsupported","cause"],"40+45+50 = $135k, not $145k. The logo claim is an unsupported causal conclusion.");
DOC("doc5",3,{kind:"doc",title:"Meeting minutes: product launch",text:"Decisions: launch date 1 June.\nActions: finalise pricing; book venue; send press release.\nNext meeting: 12 May."},[1],["owner","due date","actions","omission"],"The actions have no owners or due dates: key information is missing.");
DOC("doc6",1,{kind:"table",title:"Event budget",cols:["Item","Cost ($)"],rows:[["Venue","800"],["Catering","450"],["AV hire","250"],["Total","1,500"]]},[5],["800","450","250","1,500","correct"],"800 + 450 + 250 = 1,500. No issues.");

/* ---------- Coding evaluation -------------------------------------------- */
const CISSUES=["Wrong result for normal input","Off-by-one / boundary error","Fails on empty input","Security risk","Unnecessarily inefficient","No significant issues"];
function CD(id,d,user,code,ans,sig,model){ add({ id, cats:["coding-evaluation","generalist"], fmt:"multi", d, comp:"Code Correctness",
  prompt:"Which issues does this AI-generated code have? Select all that apply.", material:{ user, code }, options:CISSUES, answer:ans, sig, model }); }
CD("cd1",1,"Python: return the largest number in a list.","def largest(nums):\n    return sorted(nums)[0]",[0,2],["smallest","ascending","[-1]","max","empty"],"sorted() is ascending, so [0] returns the smallest value. It also raises an error on an empty list. Use max(nums) and handle the empty case.");
CD("cd2",2,"JavaScript: sum an array.","function sum(a){\n  let t = 0;\n  for (let i = 0; i <= a.length; i++) t += a[i];\n  return t;\n}",[0,1],["<=","undefined","nan","off-by-one","length"],"i <= a.length reads one past the end and adds undefined, so the result is NaN. Use i < a.length.");
CD("cd3",2,"Python: look up a user by name.","def get_user(name):\n    return db.execute(\"SELECT * FROM users WHERE name = '\" + name + \"'\")",[3],["sql injection","parameter","concatenation"],"String concatenation allows SQL injection. Use parameterised queries.");
CD("cd4",3,"Python: check whether n is prime.","def is_prime(n):\n    for i in range(2, n):\n        if n % i == 0:\n            return False\n    return True",[0,4],["1","0","true","sqrt","inefficient","negative"],"It returns True for 0, 1 and negatives (wrong), and it checks every number up to n instead of up to √n (inefficient).");
CD("cd5",1,"JavaScript: return true if a string is empty.","function isEmpty(s) {\n  return s.length === 0;\n}",[5],["length","correct","strings"],"Correct for strings. (You might note it throws for null or undefined, but the prompt says 'a string'.)");
CD("cd6",3,"Python: average of a list.","def avg(xs):\n    return sum(xs) / len(xs)",[2],["empty","zerodivisionerror","len"],"Correct for non-empty lists, but it raises ZeroDivisionError on an empty list.");

/* ---------- Multilingual / French-English ---------------------------------- */
const TQ=["Accurate","Meaning error","Grammar error","Register or tone problem","Omission"];
[["ml1",1,"English → Spanish","Thank you for your order.","Gracias por su pedido.",0,"Accurate and appropriately polite."],
 ["ml2",2,"English → Spanish","The store opens at 9am.","La tienda cierra a las 9.",1,"'cierra' means 'closes', so the meaning is reversed."],
 ["ml3",2,"English → German","Please send me the report tomorrow.","Bitte schick mir morgen den Bericht, Alter!",3,"'Alter' is very casual slang. That's inappropriate for a business request."],
 ["ml4",2,"English → Italian","I have two brothers and a sister.","Ho due fratelli.",4,"'e una sorella' (and a sister) is missing."],
 ["ml5",3,"English → Portuguese","She is a doctor.","Ela é um médica.",2,"Gender agreement error: it should be 'uma médica'."],
 ["ml6",3,"English → German","The meeting is on Monday.","Das Treffen ist am Montag.",0,"Accurate."]].forEach(([id,d,dir,src,tr,a,m])=>
  SG(id,["multilingual","generalist"],d,"Translation Accuracy","How would you classify this translation?",{ direction:dir, source:src, translation:tr },TQ,a,["meaning","grammar","register","omission","accurate"],m));
[["fe1",1,"English → French","Thank you for your patience.","Merci de votre patience.",0,"Accurate and polite."],
 ["fe2",1,"French → English","Je suis en retard.","I am early.",1,"'en retard' means 'late', so the meaning is reversed."],
 ["fe3",2,"English → French","I'm excited to announce our new product.","Je suis excité d'annoncer notre nouveau produit.",3,"'excité' has unwanted connotations in a professional context. Use 'ravi' or 'heureux'."],
 ["fe4",2,"English → French","The office will be closed on Monday.","L'office sera clos lundi.",1,"'office' is a false friend. The correct word is 'bureau' ('Le bureau sera fermé lundi')."],
 ["fe5",2,"French → English","Ne pas dépasser la dose prescrite.","Do not take the prescribed dose.",1,"The meaning is changed: it should be 'Do not exceed the prescribed dose.' This is a critical, safety-relevant error."],
 ["fe6",3,"English → French","The documents were sent yesterday.","Les documents ont été envoyé hier.",2,"Agreement error: 'envoyés' (masculine plural)."],
 ["fe7",3,"English → French","Please find attached the invoice and the contract.","Veuillez trouver ci-joint la facture.",4,"'et le contrat' (and the contract) is missing."],
 ["fe8",3,"French → English","Je vous en prie.","I beg you.",1,"In this context it means 'You're welcome'. The literal translation changes the meaning."]].forEach(([id,d,dir,src,tr,a,m])=>
  SG(id,["french-english","multilingual"],d,"Meaning Preservation","How would you classify this translation?",{ direction:dir, source:src, translation:tr },TQ,a,["sens","meaning","faux ami","register","grammar","omission"],m));
add({ id:"fe9", cats:["french-english"], fmt:"rank", d:2, comp:"Translation Judgment",
  material:{ user:"Translate into French: 'Our team will get back to you shortly.'", a:"Notre équipe va revenir à vous bientôt.", b:"Notre équipe vous recontactera dans les plus brefs délais." },
  answer:{ pref:2, dims:{acc:"B",cla:"B"} }, sig:["calque","revenir à vous","recontacter","naturel","b"], model:"A is a literal calque ('revenir à vous' is unnatural). B is natural, professional French. B is much better." });
add({ id:"fe10", cats:["french-english"], fmt:"rank", d:3, comp:"Translation Judgment",
  material:{ user:"Translate into English: 'Veuillez noter que le bureau sera fermé lundi en raison du jour férié.'", a:"Please note that the office will be closed on Monday due to the public holiday.", b:"Please note the office will be closed Monday because of the bank holiday." },
  answer:{ pref:0, dims:{acc:"T"} }, sig:["both","accurate","tie","public holiday","bank holiday","regional"], model:"Both are accurate and natural. 'Bank holiday' is regional (UK) English, so the difference is a minor style choice. Tie, or a slight preference with a stated audience, is reasonable." });

/* ---------- Transcription (spoken with browser TTS) ------------------------ */
const TRX=[[1,"The meeting starts at nine thirty tomorrow morning."],[1,"Please send the invoice to the finance team."],[1,"Our new office is next to the train station."],
  [2,"The package weighs four point five kilograms."],[2,"Remember to back up your files every Friday."],[2,"The quarterly report shows a twelve percent increase."],
  [2,"Turn left at the second traffic light."],[3,"Their engineers reviewed the bridge's design last November."],[3,"Whether the weather improves, we'll proceed regardless."],
  [3,"The pharmacist confirmed the dosage on the prescription."],[3,"Schedule the follow-up appointment for the fourteenth."],[1,"Thank you for calling customer support."]];
TRX.forEach(([d,t],i)=>add({ id:"tx"+(i+1), cats:["transcription"], fmt:"transcribe", d, comp:"Transcription Accuracy", material:{ audio:t }, answer:t, sig:[],
  model:`Reference transcript: "${t}"` }));

/* ---------- Generators (spreadsheet, image labelling, image-to-text) ------- */
function rng(seed){ let x=seed>>>0||1; return ()=>{ x^=x<<13; x>>>=0; x^=x>>17; x^=x<<5; x>>>=0; return x/4294967296; }; }
const SHEET_ISSUES=["Incorrect line total","Incorrect grand total","Duplicate row","Missing value","No issues"];
function genSpreadsheet(seed, d){
  const R=rng(seed), items=["Notebooks","Pens","Staplers","Folders","Markers","Paper (ream)","Binders","Sticky notes"];
  const n=d===1?4:5, rows=[];
  const pick=items.slice().sort(()=>R()-0.5).slice(0,n);
  pick.forEach(it=>{ const q=1+Math.floor(R()*9), p=[2,3,4,5,6,8,12][Math.floor(R()*7)]; rows.push([it,q,p,q*p]); });
  const issues=new Set(), want = d===1 ? 1 : d===2 ? 2 : 2+Math.floor(R()*2);
  const kinds=[0,1,2,3].sort(()=>R()-0.5);
  if(R()<0.15 && d===1){ /* clean sheet */ }
  else kinds.slice(0,want).forEach(k=>issues.add(k));
  const notes=[];
  if(issues.has(2)){ const i=Math.floor(R()*rows.length); rows.splice(i+1,0,rows[i].slice()); notes.push(`"${rows[i][0]}" appears twice`); }
  if(issues.has(0)){ const i=Math.floor(R()*rows.length); rows[i][3]=rows[i][1]*rows[i][2]+[5,10,-4,6][Math.floor(R()*4)]; notes.push(`${rows[i][0]}: ${rows[i][1]} × $${rows[i][2]} should be $${rows[i][1]*rows[i][2]}, not $${rows[i][3]}`); }
  let total=rows.reduce((a,r)=>a+r[3],0);
  if(issues.has(3)){ const i=Math.floor(R()*rows.length); rows[i]=[rows[i][0],"",rows[i][2],rows[i][3]]; notes.push(`${rows[i][0]} has a missing quantity`); }
  if(issues.has(1)){ const wrong=total+[10,-12,20,8][Math.floor(R()*4)]; notes.push(`the line totals add up to $${total}, but the grand total shows $${wrong}`); total=wrong; }
  const disp=rows.map(r=>[r[0],String(r[1]),"$"+r[2],"$"+r[3]]).concat([["TOTAL","","","$"+total]]);
  const ans=[...issues].sort(); const answer=ans.length?ans:[4];
  return { id:"gs-"+seed, cats:["spreadsheet-evaluation","document-evaluation","generalist"], fmt:"multi", d, comp:"Calculation Checking",
    prompt:"Check this purchase-order sheet. Which issues does it contain? Select all that apply, and name the rows in your explanation.",
    material:{ artifact:{ kind:"table", title:"Purchase order", cols:["Item","Qty","Unit price","Line total"], rows:disp } },
    options:SHEET_ISSUES, answer, sig:["row","total","quantity","duplicate","missing","×"].concat(rows.slice(0,2).map(r=>String(r[0]).toLowerCase())),
    model: notes.length ? "Issues: "+notes.join("; ")+"." : "Every line total and the grand total are correct, with no duplicates or blanks: no issues." };
}
const SHAPES=["circle","square","triangle"], COLOURS=[["red","#ef4444"],["blue","#3b82f6"],["green","#22c55e"],["yellow","#eab308"]];
function genScene(R, count){
  const items=[]; for(let i=0;i<count;i++) items.push({ shape:SHAPES[Math.floor(R()*3)], colour:COLOURS[Math.floor(R()*4)], x:30+(i%4)*70, y:35+Math.floor(i/4)*70 });
  const svg=`<svg viewBox="0 0 300 ${Math.ceil(count/4)*70+10}" width="300" role="img" aria-label="Practice image with coloured shapes">`+items.map(o=>{
    const [cn,c]=o.colour;
    return o.shape==="circle" ? `<circle cx="${o.x}" cy="${o.y}" r="24" fill="${c}"/>` : o.shape==="square" ? `<rect x="${o.x-22}" y="${o.y-22}" width="44" height="44" fill="${c}"/>`
      : `<polygon points="${o.x},${o.y-25} ${o.x+25},${o.y+20} ${o.x-25},${o.y+20}" fill="${c}"/>`; }).join("")+`</svg>`;
  return { items, svg };
}
const plural=(n,s)=>n+" "+s+(n===1?"":"s");
function genImageLabel(seed, d){
  const R=rng(seed), sc=genScene(R, d===1?3:d===2?5:7), it=sc.items;
  const cnt=(sh,co)=>it.filter(o=>(!sh||o.shape===sh)&&(!co||o.colour[0]===co)).length;
  const cands=[];
  SHAPES.forEach(sh=>COLOURS.forEach(([co])=>cands.push([`Contains a ${co} ${sh}`, cnt(sh,co)>0])));
  SHAPES.forEach(sh=>{ const n=cnt(sh); cands.push([`Contains exactly ${plural(n,sh)}`,true]); cands.push([`Contains exactly ${plural(n+1,sh)}`,false]); });
  COLOURS.forEach(([co])=>cands.push([`No ${co} shapes`, cnt(null,co)===0]));
  cands.sort(()=>R()-0.5);
  const trues=cands.filter(c=>c[1]).slice(0,d===1?1:2), falses=cands.filter(c=>!c[1]).slice(0,d===1?3:d===2?3:4);
  const opts=trues.concat(falses).sort(()=>R()-0.5);
  return { id:"gi-"+seed, cats:["image-labelling","generalist"], fmt:"multi", d, comp:"Visual Accuracy",
    prompt:"Select every label that is TRUE for this image.", material:{ svg:sc.svg }, options:opts.map(o=>o[0]),
    answer:opts.map((o,i)=>o[1]?i:-1).filter(i=>i>=0), sig:["count","colour","shape"],
    model:"True labels: "+opts.filter(o=>o[1]).map(o=>o[0]).join("; ")+"." };
}
const CAP_ERR=["Accurate","Wrong count","Wrong colour","Wrong shape","Mentions something not in the image"];
function genCaption(seed, d){
  const R=rng(seed), sc=genScene(R, d===1?2:d===2?4:6);
  const groups={}; sc.items.forEach(o=>{ const k=o.colour[0]+" "+o.shape; groups[k]=(groups[k]||0)+1; });
  const keys=Object.keys(groups), k=keys[Math.floor(R()*keys.length)], [co,sh]=k.split(" "), n=groups[k];
  let err=Math.floor(R()*5), cap;
  const words=x=>["zero","one","two","three","four","five","six","seven"][x]||String(x);
  if(err===1) cap=`The image shows ${words(n+1)} ${co} ${sh}${n+1>1?"s":""}.`;
  else if(err===2){ const other=COLOURS.map(c=>c[0]).find(c=>c!==co && !groups[c+" "+sh]) ; if(other) cap=`The image shows ${words(n)} ${other} ${sh}${n>1?"s":""}.`; else { err=0; } }
  else if(err===3){ const other=SHAPES.find(s=>s!==sh && !groups[co+" "+s]); if(other) cap=`The image shows ${words(n)} ${co} ${other}${n>1?"s":""}.`; else { err=0; } }
  else if(err===4) cap=`The image shows ${words(n)} ${co} ${sh}${n>1?"s":""} and a black star.`;
  if(err===0 || !cap){ err=0; cap=`The image shows ${words(n)} ${co} ${sh}${n>1?"s":""}.`; }
  return { id:"gc-"+seed, cats:["image-to-text","generalist"], fmt:"single", d, comp:"Caption Evaluation",
    prompt:"Is this AI-generated caption accurate for the image? (The caption may describe only part of the image.)", material:{ svg:sc.svg, caption:cap },
    options:CAP_ERR, answer:err, sig:["count","colour","shape","not in image","accurate"],
    model:`Correct label: ${CAP_ERR[err]}. The image contains ${Object.entries(groups).map(([g,c])=>words(c)+" "+g+(c>1?"s":"")).join(", ")}.` };
}
const PRACTICE_GENERATORS = { "spreadsheet-evaluation":genSpreadsheet, "image-labelling":genImageLabel, "image-to-text":genCaption };
