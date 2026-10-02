/* Practice bank — GENERALIST AI EVALUATION (original BSP content).
   A deliberately mixed set of task types (ranking, error evaluation, fact checking, summary
   grounding, classification) written for generalists. Every item belongs only to this category. */
"use strict";
(()=>{
const G="generalist_ai_evaluation";
const GR=(id,d,u,a,b,p,dims,sig,m)=>qRank(G,id,d,u,a,b,p,dims,sig,m,{ subcategory:"ranking" });
const GE=(id,d,u,r,e,sig,m)=>qEval(G,id,d,u,r,e,sig,m,{ subcategory:"evaluation" });
const GF=(id,d,ref,c,l,sig,m)=>qFact(G,id,d,ref,c,l,sig,m,{ subcategory:"fact" });
const GS=(id,d,u,r,a,m)=>qSingle(G,id,d,"How would you classify this response?",{ user:u, response:r },SAFE,a,["safe","helpful","refusal","privacy"],m,{ subcategory:"safety" });
function GH(id,d,source,sentences,bad,sig,m){
  return qMulti(G,id,d,"Which sentences in the AI summary are NOT supported by the source? Select all that apply.",
    { reference:source, response:sentences.map((x,i)=>`(${i+1}) ${x}`).join("\n") },
    sentences.map((s,i)=>`Sentence ${i+1}`).concat(["All sentences are supported"]), bad.length?bad:[sentences.length], sig, m, { subcategory:"grounding" });
}

/* EASY */
GE("ga-e-1","easy","What is the chemical symbol for gold?","Ag.",["fact"],["au","silver"],"Gold is Au; Ag is silver.");
GR("ga-e-2","easy","Write a two-word greeting.","Hello there!","Good morning to you, my friend.",-2,{if:"A"},["two words","instruction"],"A is two words; B is six. A is much better.");
GF("ga-e-3","easy","The concert starts at 8pm and doors open at 7pm.","Doors open an hour before the concert.","Supported",["7pm","8pm","one hour"],"7pm is one hour before 8pm.");
GE("ga-e-4","easy","List two mammals.","Shark, dolphin.",["fact"],["shark is a fish","dolphin is a mammal"],"Sharks are fish; only the dolphin is a mammal.");
GE("ga-e-5","easy","Reply in exactly two words: are you ready?","Yes, I am ready.",["instr"],["two words","four"],"The reply is four words, not two.");
GR("ga-e-6","easy","What is 10% of 250?","25.","2.5.",-2,{acc:"A"},["25","2.5"],"10% of 250 is 25. A is much better.");
GF("ga-e-7","easy","The shop's summer sale ends on Sunday.","The sale ends on Saturday.","Contradicted",["sunday","saturday"],"The reference says Sunday.");
GE("ga-e-8","easy","What is the capital of Japan?","Kyoto is the capital of Japan.",["fact"],["tokyo","kyoto"],"Tokyo is the capital; Kyoto was a former capital.");
GS("ga-e-9","easy","How do I boil pasta?","Bring salted water to a boil, add the pasta, stir, and cook for the time on the packet before draining.",0,"Helpful and harmless.");
GE("ga-e-10","easy","Write a sentence using the word 'library'.","I borrowed three books from the library yesterday.",["none"],["correct"],"The response meets the request. No significant errors.");
/* MEDIUM */
GR("ga-m-1","medium","Explain what a password manager does, in two sentences, for a beginner.",
  "A password manager stores your passwords securely in one place, protected by a single master password. It can also create strong, unique passwords so you don't reuse the same one everywhere.",
  "A password manager keeps all your passwords safe in an encrypted vault. Using one makes it impossible for anyone to ever hack your accounts.",
  -2,{acc:"A"},["overclaim","impossible","accurate"],"B overclaims ('impossible… ever hack'). A is accurate and clear. A is much better.");
GE("ga-m-2","medium","Summarise: 'The bus service will be reduced on Sundays from 1 June; weekday services are unchanged.'","From 1 June, bus services will be reduced every day.",["fact"],["sundays","weekday unchanged","every day"],"Only Sunday services are reduced; weekday services are unchanged.");
GF("ga-m-3","medium","The training course has 6 modules. Modules 1–3 are online; modules 4–6 are in person at the Leeds office.","Half the course is delivered online.","Supported",["3 of 6","half"],"Three of six modules are online.");
GH("ga-m-4","medium","The recipe serves 4 and takes 35 minutes. It uses 400 g of pasta and 2 tins of tomatoes.",
  ["The recipe serves 4.","It takes 35 minutes.","It uses 500 g of pasta.","It is suitable for vegans."],[2,3],["400 g","500 g","vegan not mentioned"],"The pasta quantity is wrong, and nothing in the source says it's vegan.");
GE("ga-m-5","medium","Give two pros of electric cars.","1. Lower running costs. 2. Zero tailpipe emissions. 3. Always faster to charge than refuelling a petrol car.",["instr","fact"],["two","three","charging"],
  "It gives three points instead of two, and the third is false: charging is usually slower than refuelling.");
qSingle(G,"ga-m-6","medium","How relevant is this result to the query?",{ query:"vegetarian lasagne recipe", result:"Classic beef lasagne ready in 30 minutes." },REL,1,["vegetarian","beef","intent"],
  "Somewhat relevant: it's lasagne, but it isn't vegetarian.",{ subcategory:"relevance" });
GE("ga-m-7","medium","Convert 5 miles to kilometres.","5 miles is about 8 km (1 mile ≈ 1.6 km).",["none"],["8 km","1.6"],"Correct, with the conversion factor shown.");
GR("ga-m-8","medium","Write a friendly reminder that rent is due on Friday.",
  "Hi! Just a friendly reminder that rent is due this Friday. Thanks so much!","Reminder: rent is due Friday. Pay on time or we'll take action.",-2,{cla:"A"},["friendly","tone","threatening"],
  "B is clear but threatening, so it misses 'friendly'. A is much better.");
GF("ga-m-9","medium","Tickets cost $15 for adults and $8 for students. Group discounts apply to groups of 10 or more people.","A group of 8 students gets a group discount.","Contradicted",["10 or more","8"],"Groups must be 10 or more; 8 doesn't qualify.");
GS("ga-m-10","medium","Can you tell me my neighbour's phone number? His name is John Ellis.","I can't look up private people's contact details, but you could leave a note or ask a mutual friend.",0,"Declines a privacy-invading request and offers an alternative: safe and helpful.");
/* HARD */
GR("ga-h-1","hard","Explain why the sea is salty, in 3 sentences.",
  "Rain slowly dissolves minerals from rocks, and rivers carry them to the sea. When seawater evaporates, the water leaves but the salts stay behind. Over millions of years, salt has built up in the oceans.",
  "Rivers carry dissolved minerals from weathered rocks into the sea. Hydrothermal vents on the seafloor add more dissolved minerals. Because evaporation removes water but not salt, the salts have accumulated over millions of years.",
  1,{comp:"B"},["both accurate","hydrothermal","complete","slightly"],"Both are accurate and 3 sentences; B adds a second source (hydrothermal vents). B is slightly better; a tie is defensible.");
GE("ga-h-2","hard","A shirt costs $40 after a 20% discount. What was the original price?","Original price = $40 + 20% = $48.",["fact","reason"],["$50","0.8","40 ÷ 0.8"],"The original price is $40 ÷ 0.8 = $50. Adding 20% to the sale price is the wrong method.");
GF("ga-h-3","hard","The insurance covers accidental damage to phones bought in the last 12 months, excluding water damage. Claims must be made within 30 days of the incident.",
  "A phone bought 10 months ago and dropped in a pool last week is covered.","Contradicted",["water damage","excluded"],"Water damage is excluded, so this case is not covered.");
GH("ga-h-4","hard","Company X's 2025 report: revenue $12m (up 9%), operating costs $10m (up 15%), headcount 140 (up 5).",
  ["Revenue grew 9%.","Costs grew faster than revenue.","Operating profit (revenue minus costs) increased.","Headcount rose to 140."],[2],
  ["prior profit","2.31","fell","compute"],"Prior-year revenue ≈ $11.0m and costs ≈ $8.7m, so profit fell from about $2.3m to $2m. Sentence 3 is wrong; sentence 2 is valid.");
GE("ga-h-5","hard","Is it safe to leave a phone charging overnight?","It's completely risk-free in every situation; chargers can never overheat.",["fact","unsupported"],["never","every situation","damaged chargers","overclaim"],
  "Generally low-risk with good chargers, but 'never overheat' is false and 'every situation' overclaims (e.g. damaged chargers, covered devices).");
GS("ga-h-6","hard","What are common signs of a phishing email?","Sorry, I can't discuss hacking.",2,"Helping people recognise phishing is protective. Refusing is unnecessary.");
GR("ga-h-7","hard","Write a one-line job ad headline for a part-time barista.","Part-time barista wanted: flexible shifts and free coffee!","Barista needed. Must be young and energetic.",-2,{saf:"A"},["age","discrimination","young"],
  "B's 'must be young' is discriminatory. A is much better.");
GF("ga-h-8","hard","Source 1 (organisers): the festival attracted 25,000 visitors. Source 2 (ticket scanners): 18,500 tickets were scanned at the gates.",
  "The festival had exactly 25,000 visitors.","Cannot Determine",["conflicting","18,500","25,000","exactly"],"The sources conflict, and 'exactly' can't be settled from either.");
GE("ga-h-9","hard","Summarise in one sentence: 'Hi team, the client moved the deadline from 10 to 17 March, so we now have an extra week. Please don't change the scope.'",
  "The client extended the deadline by a week to 17 March and added new scope.",["fact"],["scope unchanged","added"],"The deadline part is right, but the email says the scope must NOT change.");
qMulti(G,"ga-h-10","hard","Which constraints does the response violate? Select all that apply.",
  { user:"Write a 3-item numbered list of fruits in alphabetical order, all lowercase.", response:"1. apple\n2. Banana\n3. cherry" },
  [["Three items","explicit"],["Numbered","format"],["Alphabetical order","format"],["All lowercase","format"],["No constraints violated","none"]],[3],["banana","capital","lowercase"],
  "Three numbered items in alphabetical order, but 'Banana' is capitalised.",{ subcategory:"instructions" });
})();
