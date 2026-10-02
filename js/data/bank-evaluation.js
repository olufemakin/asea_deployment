/* Practice bank — AI RESPONSE EVALUATION and DOMAIN EXPERT EVALUATION (original BSP content).
   Easy: one clear error in a short response. Medium: subtle or two errors. Hard: interacting errors
   hidden in polished responses, or correct-looking numbers built on faulty reasoning. */
"use strict";
(()=>{
const E=(id,d,u,r,errs,sig,model,x)=>qEval("ai_response_evaluation",id,d,u,r,errs,sig,model,x);

/* ---------- AI RESPONSE EVALUATION · EASY ---------- */
E("ae-e-1","easy","Name the largest planet in our solar system.","Saturn is the largest planet in our solar system.",["fact"],["jupiter","saturn","wrong"],"Factual error: Jupiter is the largest planet.");
E("ae-e-2","easy","In one sentence, what is photosynthesis?","Photosynthesis is how plants make food. They use sunlight, water and carbon dioxide. Oxygen is released as a by-product.",["instr"],["one sentence","three","instruction"],
  "The content is accurate, but the prompt asked for one sentence and the response uses three: an instruction error.");
E("ae-e-3","easy","What is the boiling point of water at sea level, in Celsius?","Water boils at 90°C at sea level.",["fact"],["100","90","wrong"],"Factual error: water boils at 100°C at sea level.");
E("ae-e-4","easy","List three fruits.","Apple, carrot, banana.",["fact"],["carrot","vegetable","not a fruit"],"Carrot is a vegetable, so the list contains a factual error.");
E("ae-e-5","easy","Answer in one word: what colour is grass?","Grass is usually green because of chlorophyll.",["instr"],["one word","green","instruction"],"The answer is right, but the prompt asked for one word.");
E("ae-e-6","easy","Translate 'cat' into French.","Chien.",["fact"],["chat","chien","dog","wrong"],"'Chien' means dog; the answer should be 'chat'.");
E("ae-e-7","easy","How many days are in a leap year?","365.",["fact"],["366","365","leap year"],"A leap year has 366 days.");
E("ae-e-8","easy","Write one sentence about the ocean.","Mountains form when tectonic plates collide.",["irrel"],["ocean","mountains","irrelevant","off-topic"],"The sentence is about mountains, not the ocean: irrelevant.");
E("ae-e-9","easy","Give me one tip for better sleep.","Drink two cups of strong coffee before bed to help you relax.",["fact"],["caffeine","stimulant","keeps you awake","wrong advice"],
  "Caffeine is a stimulant that disrupts sleep, so the tip is factually wrong.");
E("ae-e-10","easy","Write a sentence using the word 'library'.","I borrowed three books from the library yesterday.",["none"],["correct","uses library","no errors"],"The response does exactly what was asked. No significant errors.");
E("ae-e-legacy-1","easy","What is 15% of 80?","15% of 80 is 15 × 80 ÷ 100 = 1.2.",["fact"],["12","1,200","arithmetic","final answer"],
  "The method is right but the arithmetic is wrong: 15 × 80 = 1,200, and 1,200 ÷ 100 = 12. A wrong final answer is a factual error even when the method looks right.",
  { source:"legacy:pt-math-find", version:"1.1" });

/* ---------- MEDIUM ---------- */
E("ae-m-1","medium","Is it safe to mix bleach and ammonia for cleaning?","Yes. Mixing them makes a stronger cleaner that's great for tough stains.",["fact","safety"],
  ["toxic","gas","chloramine","never","dangerous"],"Factually wrong and unsafe: mixing bleach and ammonia releases toxic chloramine gas. The response should say never to mix them.");
E("ae-m-2","medium","Why is the sky blue?","Because the sky reflects the colour of the oceans.",["fact","reason"],["scattering","rayleigh","reflect","myth"],
  "This repeats a myth. Air molecules scatter shorter (blue) wavelengths more than longer ones (Rayleigh scattering).");
E("ae-m-3","medium","Give me a simple recipe for pancakes.","Ingredients: 200 g flour, 2 eggs, 300 ml milk, a pinch of salt, butter for the pan. Enjoy your pancakes!",["missing"],
  ["method","steps","missing","ingredients only"],"The ingredients are fine, but there are no steps, so the user can't make the pancakes: missing information.");
E("ae-m-4","medium","What's a good laptop for students under $800?","Studies show that 97% of students prefer Brand X laptops, so Brand X is the only sensible choice.",["unsupported","reason"],
  ["97%","source","only","budget","overclaim"],"The '97%' statistic has no source (unsupported), and 'the only sensible choice' doesn't follow from a preference statistic (reasoning). It also ignores the budget.");
E("ae-m-5","medium","Summarise: 'Sales rose 8% in Q2 while costs fell 3%.'","Sales rose 3% and costs fell 8% in Q2.",["fact"],["swapped","8%","3%","sales","costs"],
  "The figures are swapped: sales rose 8% and costs fell 3%.");
E("ae-m-6","medium","Explain why ice floats on water.","Ice floats because it is colder than the water around it.",["reason","fact"],["density","less dense","expands","temperature not the reason"],
  "Temperature isn't the reason. Water expands when it freezes, so ice is less dense than liquid water. The causal explanation is wrong.");
E("ae-m-7","medium","Write a 50-word product description for wireless headphones.",
  "Experience music like never before with our wireless headphones. Featuring active noise cancellation, 30-hour battery life, fast USB-C charging, soft memory-foam ear cushions and a foldable design, they're perfect for commuting, travelling or working from home. Multipoint Bluetooth lets you switch between laptop and phone instantly, while the built-in microphones keep calls crystal clear. Available in black, white and navy.",
  ["instr"],["50 words","length","about 65","instruction"],"The content is fine, but it's about 65 words, well over the requested 50: an instruction error.");
E("ae-m-8","medium","What should I do if I smell gas at home?","Open the windows and switch on the lights so you can see better, then phone the gas company.",["safety","missing"],
  ["switches","spark","leave","don't use","emergency line"],"Switching on lights can create a spark, so the advice is unsafe. It also omits leaving the property and calling the gas emergency line from outside.");
E("ae-m-9","medium","Compare Python and JavaScript for a beginner.","Python is a great first language: clean syntax, lots of tutorials and widely used in data science.",["missing"],
  ["javascript","comparison","one-sided","missing"],"It only describes Python, so the comparison the user asked for is missing.");
E("ae-m-10","medium","Give three benefits of regular exercise, with a source.","Exercise improves mood, strengthens the heart and helps sleep. According to a 2021 Harvard study, exercise adds exactly 10 years to your life.",["unsupported"],
  ["source","exactly","10 years","vague citation"],"The three benefits are reasonable, but the 'exactly 10 years' claim with a vague citation is unsupported.");

/* ---------- HARD ---------- */
E("ae-h-1","hard","Summarise our Q3 sales results for the board, in a formal tone.","Sales were lit this quarter 🔥🔥 we absolutely smashed it lol, revenue up 12% which is kinda insane.",["style"],
  ["formal","tone","slang","emoji","board"],"The figure may be correct, but slang and emoji break the 'formal tone for the board' requirement: a style problem.");
E("ae-h-2","hard","How do I change a flat tyre?","Pneumatic tyres were developed in the 1880s and transformed cycling and motoring. Today's tyres use advanced rubber compounds.",["irrel","missing"],
  ["history","irrelevant","steps","jack","spare"],"It discusses tyre history (irrelevant) and gives none of the steps the user asked for (missing information).");
E("ae-h-3","hard","If all bloops are razzies, and some razzies are lazzies, are all bloops lazzies?","Yes. Since bloops are razzies and razzies are lazzies, all bloops are lazzies.",["reason"],
  ["some","not all","invalid","cannot conclude"],"Reasoning error: only SOME razzies are lazzies, so we can't conclude that bloops are lazzies. The correct answer is 'not necessarily'.");
E("ae-h-4","hard","Give a 3-item packing list for a beach day as a JSON array of strings.","- Sunscreen\n- Towel\n- Water bottle",["instr"],["json","array","format","bullets"],
  "The items are sensible, but it's a bullet list instead of the requested JSON array, e.g. [\"Sunscreen\",\"Towel\",\"Water bottle\"].");
E("ae-h-5","hard","Calculate a 15% tip on a $40 bill, and the total to pay.","Tip: $6. Total: $44.",["fact"],["$46","total","addition","tip correct"],
  "The tip ($6) is correct, but the total should be $46: a subtle arithmetic error in the second figure.");
E("ae-h-6","hard","Summarise this study for a newsletter: 120 participants used a sleep app for 4 weeks; their self-reported sleep quality improved by 10%; there was no control group.",
  "A controlled trial has proved that the app improves sleep for everyone who uses it.",["fact","unsupported"],["no control group","proved","everyone","self-reported","overgeneralise"],
  "There was no control group (so 'controlled trial' is false), and 'proved… for everyone' overstates a small, self-reported result.");
E("ae-h-7","hard","Draft a formal email to a client apologising for a billing error and confirming a refund of $250 within 5 business days.",
  "Dear Ms Patel,\nPlease accept our sincere apologies for the billing error on your recent invoice. We have issued a refund of $205, which will reach your account within 5 business days.\nCheers!\nSam",
  ["fact","style"],["$205","$250","cheers","formal","sign-off"],"The refund amount is wrong ($205 instead of $250), and 'Cheers!' breaks the formal tone.");
E("ae-h-8","hard","Explain how vaccines work for a general audience. Don't give personal medical advice.",
  "Vaccines train your immune system to recognise a germ without you getting the full illness, so your body can respond faster later. You should skip your second dose if the first one made you feel tired.",
  ["instr","safety"],["medical advice","second dose","instruction","unsafe"],"The explanation is good, but the last sentence gives personal medical advice (against the instruction) that could be unsafe.");
E("ae-h-9","hard","Which weighs more: a kilogram of feathers or a kilogram of steel? Explain.","Steel, because steel is much denser than feathers.",["fact","reason"],
  ["same","one kilogram","density","volume"],"Both weigh one kilogram. Density affects volume, not mass, so the answer and the reasoning are both wrong.");
E("ae-h-10","hard","List the planets of our solar system in order from the Sun.","Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto.",["fact"],
  ["pluto","dwarf planet","2006","eight"],"Pluto was reclassified as a dwarf planet in 2006, so listing it as a planet is a factual error. The order of the eight planets is correct.");

/* ---------- DOMAIN EXPERT EVALUATION ---------- */
const D=(id,d,domain,u,r,errs,sig,model)=>qEval("domain_expert_evaluation",id,d,u,r,errs,sig,model,{ subcategory:domain, domain });
/* Easy */
D("de-e-1","easy","software","(Software) What HTTP status code means 'Not Found'?","500 Internal Server Error.",["fact"],["404","500"],"'Not Found' is 404. 500 is a server error.");
D("de-e-2","easy","marketing","(Marketing) What does CTR stand for?","CTR means 'Customer Total Revenue'.",["fact"],["click-through rate","clicks","impressions"],"CTR is click-through rate: clicks ÷ impressions.");
D("de-e-3","easy","education","(Education) What does 'formative assessment' mean?","Formative assessment is the final exam at the end of a course that decides the grade.",["fact"],["summative","during","feedback"],"That describes summative assessment. Formative assessment happens during learning to guide teaching.");
D("de-e-4","easy","finance","(Finance) What is the accounting equation?","Assets = Liabilities − Equity.",["fact"],["assets","liabilities","plus","equity"],"It's Assets = Liabilities + Equity.");
D("de-e-5","easy","healthcare","(Healthcare, educational) What does 'BP' usually stand for in patient notes?","Body pulse.",["fact"],["blood pressure"],"BP stands for blood pressure.");
D("de-e-6","easy","project management","(Project management) What is a milestone?","A milestone is a task that takes the longest time in the project.",["fact"],["zero duration","checkpoint","significant point"],"A milestone is a significant checkpoint or event, usually with zero duration, not the longest task.");
D("de-e-7","easy","data","(Data) What is the median of 3, 7, 9?","The median is 6.33.",["fact"],["7","middle","mean"],"The median is the middle value, 7. 6.33 is the mean.");
D("de-e-8","easy","law (general)","(Law, general information) What is a 'plaintiff' in a civil case?","The plaintiff is the judge who decides the case.",["fact"],["brings the case","claimant","sues"],"The plaintiff (claimant) is the party who brings the case.");
D("de-e-9","easy","engineering","(Engineering) What is the SI unit of force?","The joule.",["fact"],["newton","joule is energy"],"Force is measured in newtons; the joule is the unit of energy.");
D("de-e-10","easy","hr","(HR) What does 'onboarding' mean?","Onboarding is the process of dismissing an employee.",["fact"],["new hire","integrating","offboarding"],"Onboarding integrates new hires; dismissal is offboarding.");
/* Medium */
D("de-m-1","medium","finance","(Finance) A company's revenue is $500k and costs are $400k. What is its profit margin?","The profit margin is 25%, because profit is $100k and 100 ÷ 400 = 25%.",["fact","reason"],
  ["20%","revenue","denominator","mark-up"],"Profit margin divides profit by revenue: 100 ÷ 500 = 20%. Dividing by costs gives mark-up.");
D("de-m-2","medium","data","(Data) Ice-cream sales and drownings are correlated. Does ice cream cause drowning?","Yes, the strong correlation shows that ice cream causes drowning.",["reason"],
  ["confounder","temperature","correlation","causation"],"Correlation isn't causation. Hot weather is a confounder driving both.");
D("de-m-3","medium","marketing","(Marketing) Our click-through rate doubled from 1% to 2%. Did revenue double?","Yes. Twice as many clicks always means twice the revenue.",["reason"],
  ["conversion","attribution","not always","funnel"],"Revenue depends on conversion rate and order value, not clicks alone. 'Always' doesn't follow.");
D("de-m-4","medium","software","(Software) Is it safe to store user passwords with MD5 hashing?","Yes, MD5 is a hash, so passwords are fully protected.",["fact","safety"],
  ["md5","broken","bcrypt","argon2","salt"],"MD5 is fast and broken for passwords. Use a slow, salted algorithm like bcrypt or Argon2.");
D("de-m-5","medium","education","(Education) A student scores 18/20 on a quiz after the teacher gave them the answers. Does this show mastery?","Yes, 90% clearly shows mastery of the topic.",["reason"],
  ["validity","answers given","assessment","evidence"],"If answers were provided, the score isn't valid evidence of mastery.");
D("de-m-6","medium","project management","(Project management) The project is 50% complete and has spent 50% of its budget. Is it on track?","Yes, spending matches progress, so it's definitely on track.",["reason","missing"],
  ["schedule","time elapsed","earned value","definitely"],"Budget alignment says nothing about the schedule. If 80% of the time has elapsed, it's late. 'Definitely' isn't supported.");
D("de-m-7","medium","healthcare","(Healthcare, educational) A fictional patient's temperature is 38.5°C. An AI says this is 'normal for adults'. How would you rate that?","38.5°C is a normal adult temperature, so no action is needed.",["fact","safety"],
  ["fever","above normal","37","monitor"],"38.5°C is a fever (normal is around 37°C). Saying no action is needed could be unsafe.");
D("de-m-8","medium","engineering","(Engineering) Two resistors of 100 Ω are connected in parallel. What is the total resistance?","200 Ω.",["fact"],["50","parallel","series"],"In parallel, two equal resistors give half: 50 Ω. 200 Ω is the series value.");
D("de-m-9","medium","hr","(HR) Can a manager ask a job applicant about their age in an interview?","Yes, it's always fine to ask, so you can plan for retirement.",["fact","safety"],
  ["discrimination","age","law","jurisdiction","job-related"],"In many jurisdictions this risks age discrimination. 'Always fine' is wrong.");
D("de-m-10","medium","law (general)","(Law, general information) Is a verbal agreement ever legally binding?","No. Contracts are only valid if they are written and signed.",["fact"],
  ["can be binding","some contracts","writing","jurisdiction"],"Many verbal agreements can be binding; only some contract types must be written, depending on jurisdiction.");
/* Hard */
D("de-h-1","hard","project management","(Project management) Our critical-path task is delayed by 3 days. Does the finish date move?","No. A delay on one task never affects the finish date, because other tasks absorb it.",["fact","reason"],
  ["zero float","critical path","finish date","crash","fast-track"],"Critical-path tasks have zero float, so the finish moves by 3 days unless time is recovered (crashing or fast-tracking).");
D("de-h-2","hard","engineering","(Engineering) A rope rated for 2 kN must hold 1.8 kN with a required safety factor of 2. Is it adequate?","Yes. 2 kN is more than 1.8 kN, so it's safe.",["reason","safety"],
  ["3.6","1.11","safety factor","not adequate"],"With a safety factor of 2, the rope needs 3.6 kN capacity. Its actual factor is about 1.11, so it's not adequate.");
D("de-h-3","hard","finance","(Finance) Revenue grew 10% but operating cash flow fell. Is something definitely wrong with the accounts?","Yes. If revenue grows, cash must grow too, so the accounts must contain an error.",["reason"],
  ["receivables","timing","working capital","inventory","not necessarily"],"Cash can fall while revenue rises (slower customer payments, inventory build-up, timing). It's worth investigating, not proof of error.");
D("de-h-4","hard","data","(Data) A model has 95% accuracy on a dataset where 95% of cases are negative. Is it a good model?","Yes, 95% accuracy is excellent, so the model is very good.",["reason","missing"],
  ["baseline","imbalance","precision","recall","always negative"],"A model that always predicts 'negative' also scores 95%. Without precision and recall the claim is unsupported.");
D("de-h-5","hard","software","(Software) Code review: a function sorts a list of 10 items using bubble sort. Is this a performance problem?","Yes. Bubble sort is O(n²), so it must be replaced immediately everywhere.",["reason"],
  ["10 items","negligible","context","premature","scale"],"For 10 items the cost is negligible. Complexity matters at scale, so 'immediately everywhere' overreacts.");
D("de-h-6","hard","healthcare","(Healthcare, educational) An AI summary of a fictional chart says 'No known allergies' when the chart says 'Allergy status not recorded'. Does it matter?","No, they mean the same thing.",["fact","safety"],
  ["not recorded","unknown","different","prescribing risk"],"'Not recorded' means unknown, which is not the same as 'none'. Treating unknown as none is a safety risk.");
D("de-h-7","hard","education","(Education) A class average rose from 62% to 70% after a new homework policy. Did the policy cause it?","Yes, the 8-point rise proves the policy worked.",["reason","unsupported"],
  ["other factors","control","different test","cohort","cannot prove"],"Other factors (easier test, teaching changes, cohort differences) could explain it. Without a comparison group it can't prove causation.");
D("de-h-8","hard","marketing","(Marketing) Ad A had a 4% conversion rate from 50 clicks; Ad B had 3% from 5,000 clicks. Which performs better?","Ad A, clearly, because 4% is higher than 3%.",["reason"],
  ["sample size","2 conversions","uncertainty","significance"],"Ad A's 4% is 2 conversions out of 50, which is too small to conclude. Ad B's estimate is far more reliable.");
D("de-h-9","hard","law (general)","(Law, general information) A contract says 'either party may terminate with 30 days' notice'. An AI summary says 'the supplier can end the contract at any time'. Is that accurate?","Yes. 'Either party' includes the supplier, so the summary is accurate.",["fact"],
  ["30 days","notice","at any time","omits","both parties"],"It omits the 30-day notice requirement (not 'any time') and drops that either party may terminate.");
D("de-h-10","hard","hr","(HR) Staff turnover is 25% in Team A and 10% in Team B. Is Team A's manager the cause?","Yes, the manager is clearly the reason for the higher turnover.",["reason","unsupported"],
  ["other factors","role type","sample","exit interviews","investigate"],"Turnover differences can come from role type, pay, workload or team size. Attributing it to the manager needs evidence such as exit interviews.");
})();
