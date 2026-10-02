/* Practice bank — DATA ANNOTATION, TEXT CLASSIFICATION, ENTITY ANNOTATION, SEARCH RELEVANCE,
   PROMPT EVALUATION, SAFETY EVALUATION (original BSP content).
   Easy: one explicit signal. Medium: two signals or mild ambiguity. Hard: guideline edge cases,
   sarcasm, conflicting cues. */
"use strict";
(()=>{
/* ---------- DATA ANNOTATION ---------- */
const GUIDE="Delivery = shipping speed, packaging or courier. Customer service = any interaction with the shop's staff. Quality = how the product performs, is made or fits. Price = cost or value for money. Tag only topics the review actually mentions.";
function DA(id,d,text,ans,sig,extraGuide,flags){
  const g = extraGuide ? GUIDE+" "+extraGuide : GUIDE;
  return qMulti("data_annotation",id,d,"Tag every topic the review mentions (select all that apply).",{ text, guideline:g },
    TOPICS.concat(["None of these"]), ans.length?ans:[4], ["topic","guideline"].concat(sig),
    "Correct tags: "+(ans.length?ans.map(i=>TOPICS[i]).join(", "):"None of these")+".", flags?{ flags }:undefined);
}
DA("da-e-1","easy","The fabric feels cheap and started fraying after one wash.",[1],["fraying","quality"]);
DA("da-e-2","easy","It cost twice as much as in other shops.",[0],["cost","price"]);
DA("da-e-3","easy","The parcel was left at the wrong house.",[2],["parcel","delivery"]);
DA("da-e-4","easy","The staff member on the phone was really helpful.",[3],["staff","customer service"]);
DA("da-e-5","easy","Arrived a week late.",[2],["late","delivery"]);
DA("da-e-6","easy","Great value for money.",[0],["value","price"]);
DA("da-e-7","easy","The zip broke on day two.",[1],["zip","broke","quality"]);
DA("da-e-8","easy","I waited 40 minutes on hold before anyone answered.",[3],["on hold","customer service"]);
DA("da-e-9","easy","Arrived two days late and the box was crushed.",[2],["late","box","delivery"]);
DA("da-e-10","easy","Excellent sound for such a cheap speaker.",[0,1],["sound","cheap"]);
DA("da-m-1","medium","Cheap, and you can tell: the handle snapped.",[0,1],["cheap","snapped"]);
DA("da-m-2","medium","Fast shipping, but the colour was nothing like the photo.",[1,2],["shipping","colour"]);
DA("da-m-3","medium","Support refunded the delivery fee after the box arrived crushed.",[2,3],["support","crushed"]);
DA("da-m-4","medium","For the price, I expected it to last longer than a month.",[0,1],["price","last"]);
DA("da-m-5","medium","The chat agent couldn't tell me where my order was.",[2,3],["agent","where my order"]);
DA("da-m-6","medium","Well made and arrived in perfect packaging.",[1,2],["well made","packaging"]);
DA("da-m-7","medium","Expensive, but the sound quality justifies it.",[0,1],["expensive","sound quality"]);
DA("da-m-8","medium","Nothing to complain about.",[],["no topic","none"]);
DA("da-m-9","medium","The support agent sorted my issue in five minutes. The blender itself is great too.",[1,3],["agent","blender"]);
DA("da-m-10","medium","Worth every penny, and it came the next day.",[0,2],["worth","next day"]);
DA("da-h-1","hard","The courier was rude when I asked him to wait.",[2],["courier","not shop staff"],"Courier behaviour counts as Delivery, not Customer service.",["edge"]);
DA("da-h-2","hard","Returned it for a full refund with no questions asked.",[3],["returns","refund"],"Returns and refunds count as Customer service.",["edge"]);
DA("da-h-3","hard","I'd happily buy it again at full price.",[0],["full price","value"],undefined,["edge"]);
DA("da-h-4","hard","Looks great on the website, but the real thing feels flimsy.",[1],["flimsy","website is not a topic"],undefined,["edge"]);
DA("da-h-5","hard","The discount code didn't work and the helpline hung up on me.",[0,3],["discount code","helpline"],undefined,["edge"]);
DA("da-h-6","hard","Packaging was plastic-free, which I appreciated.",[2],["packaging"],undefined,["edge"]);
DA("da-h-7","hard","My friend said hers broke quickly, but mine is fine so far.",[1],["broke","fine so far"],undefined,["edge"]);
DA("da-h-8","hard","Arrived on time. Shame it doesn't fit.",[1,2],["on time","fit"],undefined,["edge"]);
DA("da-h-9","hard","The courier was lovely, but the shop left it in the rain and the replacement they sent stopped working after a week.",[1,2],["rain","stopped working"],"Courier behaviour counts as Delivery.",["edge"]);
DA("da-h-10","hard","I like the colour.",[1],["colour","appearance"],"Colour and appearance count as Quality.",["edge"]);

/* ---------- TEXT CLASSIFICATION ---------- */
const SG_SENT="Guideline: Mixed = clearly positive AND negative opinions about the product or service now. Neutral = no opinion, only facts.";
const SG_INT="Guideline: choose the single main intent (the action the customer needs first).";
const TS=(id,d,t,a,sig,flags)=>qSingle("text_classification",id,d,"Classify the sentiment of this review.",{ text:t, guideline:SG_SENT },SENT,a,sig.concat(["sentiment"]),`Correct label: ${SENT[a]}.`,flags?{ flags }:undefined);
const TI=(id,d,t,a,sig,flags)=>qSingle("text_classification",id,d,"Classify the customer's main intent.",{ text:t, guideline:SG_INT },INTENT,a,sig.concat(["intent"]),`Correct label: ${INTENT[a]}.`,Object.assign({ subcategory:"intent" }, flags?{ flags }:{}));
TS("tc-e-1","easy","The delivery was fast and the shoes fit perfectly!",0,["fast","perfectly"]);
TS("tc-e-2","easy","The app crashes every time I open it.",1,["crashes"]);
TS("tc-e-3","easy","Absolutely love this blender!",0,["love"]);
TS("tc-e-4","easy","Worst hotel stay of my life.",1,["worst"]);
TS("tc-e-5","easy","The meeting is at 3pm.",2,["fact","no opinion"]);
TS("tc-e-6","easy","The pizza was delicious and arrived hot.",0,["delicious"]);
TI("tc-e-7","easy","I was charged twice for my subscription this month.",0,["charged twice"]);
TI("tc-e-8","easy","I want to cancel my membership.",2,["cancel"]);
TI("tc-e-9","easy","Why is my bill $20 higher this month?",0,["bill"]);
TI("tc-e-10","easy","The app won't let me log in.",1,["log in"]);
TS("tc-m-1","medium","The order arrived on Tuesday in a brown box.",2,["fact","no opinion"]);
TS("tc-m-2","medium","Great camera, but the battery dies by lunchtime.",3,["great","but","battery"]);
TS("tc-m-3","medium","The screen is gorgeous; the speakers are tinny.",3,["gorgeous","tinny"]);
TS("tc-m-4","medium","Delivery was quick. Shame the product was faulty.",3,["quick","faulty"]);
TS("tc-m-5","medium","Honestly can't fault it.",0,["can't fault"]);
TI("tc-m-6","medium","How do I reset my password? The link in the email doesn't work.",1,["password","link"]);
TI("tc-m-7","medium","Please close my account at the end of this billing period.",2,["close account"]);
TI("tc-m-8","medium","I'd like to switch to the annual plan to save money.",0,["plan","payment"]);
TI("tc-m-9","medium","Your new update deleted all my saved playlists.",1,["update","deleted"]);
TI("tc-m-10","medium","Can you remove the late fee? I paid on time.",0,["late fee"]);
TS("tc-h-1","hard","Well, that's just perfect: my refund is 'processing' for the third week.",1,["sarcasm","third week"],["edge"]);
TS("tc-h-2","hard","Not bad at all for the price.",0,["not bad","understatement"],["edge"]);
TS("tc-h-3","hard","Oh great, another 'update' that makes everything slower.",1,["sarcasm","slower"],["edge"]);
TS("tc-h-4","hard","I expected to hate it, but it won me over.",0,["expected","won me over","current opinion"],["edge","guide"]);
TS("tc-h-5","hard","Five stars for the packaging, zero for the product.",3,["packaging","product"],["guide"]);
TS("tc-h-6","hard","Customer service fixed it in minutes; shame I needed to contact them at all.",3,["fixed","shame"],["guide"]);
TS("tc-h-7","hard","Couldn't be happier… said no one ever about this chair.",1,["sarcasm","said no one ever"],["edge"]);
TI("tc-h-8","hard","Love the new dashboard design. Maybe add a dark mode?",3,["suggestion","love"],["edge"]);
TI("tc-h-9","hard","I love the app, but I'm cancelling because I'm moving abroad.",2,["cancelling","main intent"],["edge","guide"]);
TI("tc-h-10","hard","I was charged after cancelling. Please fix the charge first, then confirm my account is closed.",0,["charged","fix first","needs first"],["guide"]);

/* ---------- ENTITY ANNOTATION ---------- */
const EG="Types: PERSON, ORGANISATION, LOCATION, DATE.";
const EN=(id,d,text,opts,ans,sig,flags)=>qMulti("entity_annotation",id,d,"Select every correct entity annotation (span — type). Leave incorrect ones unselected.",
  { text, guideline:EG }, opts, ans, sig, "Correct annotations: "+ans.map(i=>opts[i]).join("; ")+".", flags?{ flags }:undefined);
EN("ea-e-1","easy","Amina Diallo joined Northwind Bank in Lagos in 2019.",["Amina Diallo — PERSON","Northwind Bank — ORGANISATION","Lagos — LOCATION","2019 — DATE","Lagos — ORGANISATION"],[0,1,2,3],["amina","northwind","lagos","2019"]);
EN("ea-e-2","easy","Carlos moved to Madrid in 2020.",["Carlos — PERSON","Madrid — LOCATION","2020 — DATE","Madrid — PERSON"],[0,1,2],["carlos","madrid","2020"]);
EN("ea-e-3","easy","The Red Cross opened a centre in Nairobi.",["Red Cross — ORGANISATION","Nairobi — LOCATION","Red Cross — LOCATION"],[0,1],["red cross","nairobi"]);
EN("ea-e-4","easy","Priya visited Toronto on 5 May.",["Priya — PERSON","Toronto — LOCATION","5 May — DATE","Toronto — DATE"],[0,1,2],["priya","toronto","5 may"]);
EN("ea-e-5","easy","Bluewave Ltd hired Tom Reed in March.",["Bluewave Ltd — ORGANISATION","Tom Reed — PERSON","March — DATE","Tom Reed — ORGANISATION"],[0,1,2],["bluewave","tom reed","march"]);
EN("ea-e-6","easy","Kenji flew from Osaka to Lima.",["Kenji — PERSON","Osaka — LOCATION","Lima — LOCATION","Lima — PERSON"],[0,1,2],["kenji","osaka","lima"]);
EN("ea-e-7","easy","The Green Party held a rally in Dublin on Saturday.",["Green Party — ORGANISATION","Dublin — LOCATION","Saturday — DATE","Green Party — LOCATION"],[0,1,2],["green party","dublin","saturday"]);
EN("ea-e-8","easy","Fatima Khan works for Orion Health.",["Fatima Khan — PERSON","Orion Health — ORGANISATION","Orion Health — PERSON"],[0,1],["fatima","orion"]);
EN("ea-e-9","easy","In 2018, Laura opened a café in Rome.",["2018 — DATE","Laura — PERSON","Rome — LOCATION","café — ORGANISATION"],[0,1,2],["2018","laura","rome"]);
EN("ea-e-10","easy","Delta Airlines added flights to Accra.",["Delta Airlines — ORGANISATION","Accra — LOCATION","Accra — ORGANISATION"],[0,1],["delta","accra"]);
EN("ea-m-1","medium","On 4 July, Jordan visited Paris with the Red Cross team.",["4 July — DATE","Jordan — LOCATION","Jordan — PERSON","Paris — LOCATION","Red Cross — ORGANISATION"],[0,2,3,4],["jordan","person","paris"]);
EN("ea-m-2","medium","Apple announced new products in Cupertino on Monday.",["Apple — ORGANISATION","Apple — PERSON","Cupertino — LOCATION","Monday — DATE"],[0,2,3],["apple","company"]);
EN("ea-m-3","medium","Florence Nightingale trained nurses in London.",["Florence Nightingale — PERSON","Florence — LOCATION","London — LOCATION","Nightingale — ORGANISATION"],[0,2],["florence nightingale","person","london"]);
EN("ea-m-4","medium","Amazon expanded its warehouse near the Amazon river.",["Amazon (1st) — ORGANISATION","Amazon (2nd) — LOCATION","Amazon (2nd) — ORGANISATION"],[0,1],["company","river","context"]);
EN("ea-m-5","medium","Next Tuesday, Dr Mensah from Ghana Health Service will speak in Kumasi.",["Next Tuesday — DATE","Dr Mensah — PERSON","Ghana Health Service — ORGANISATION","Kumasi — LOCATION","Ghana — LOCATION"],[0,1,2,3],["mensah","ghana health service","kumasi"]);
EN("ea-m-6","medium","Paris Hilton stayed at a hotel in Paris in 2019.",["Paris Hilton — PERSON","Paris (2nd) — LOCATION","Hilton — ORGANISATION","2019 — DATE"],[0,1,3],["paris hilton","person","paris location"]);
EN("ea-m-7","medium","The UN met in Geneva during the first week of June.",["UN — ORGANISATION","Geneva — LOCATION","first week of June — DATE","UN — LOCATION"],[0,1,2],["un","geneva","june"]);
EN("ea-m-8","medium","Sydney Chen moved from Sydney to Perth last year.",["Sydney Chen — PERSON","Sydney (2nd) — LOCATION","Perth — LOCATION","last year — DATE"],[0,1,2,3],["sydney chen","sydney location","perth"]);
EN("ea-m-9","medium","Ford hired Maria Ford as head of design in Detroit.",["Ford (1st) — ORGANISATION","Maria Ford — PERSON","Detroit — LOCATION","Ford (1st) — PERSON"],[0,1,2],["company","maria ford","detroit"]);
EN("ea-m-10","medium","Tesco reported results on 12 April in London.",["Tesco — ORGANISATION","12 April — DATE","London — LOCATION","results — ORGANISATION"],[0,1,2],["tesco","12 april","london"]);
EN("ea-h-1","hard","Washington signed the agreement in Washington with Washington State University.",["Washington (1st) — PERSON","Washington (2nd) — LOCATION","Washington State University — ORGANISATION","Washington State University — LOCATION"],[0,1,2],["context","person","location","organisation"],["edge"]);
EN("ea-h-2","hard","Dr Chen from Pacific Health met the Mayor of Vancouver last Friday.",["Dr Chen — PERSON","Pacific Health — ORGANISATION","Vancouver — LOCATION","last Friday — DATE","Mayor — ORGANISATION"],[0,1,2,3],["title not organisation","mayor"],["edge"]);
EN("ea-h-3","hard","Jordan from Jordan Logistics drove through Jordan in May.",["Jordan (1st) — PERSON","Jordan Logistics — ORGANISATION","Jordan (3rd) — LOCATION","May — DATE","Jordan (3rd) — PERSON"],[0,1,2,3],["three meanings","context"],["edge"]);
EN("ea-h-4","hard","May said the board will vote in May.",["May (1st) — PERSON","May (2nd) — DATE","board — ORGANISATION","May (1st) — DATE"],[0,1],["may","person","date","board generic"],["edge"]);
EN("ea-h-5","hard","Georgia flew to Georgia (the country) to meet Georgia Tech alumni.",["Georgia (1st) — PERSON","Georgia (2nd) — LOCATION","Georgia Tech — ORGANISATION","Georgia Tech — LOCATION"],[0,1,2],["three meanings"],["edge"]);
EN("ea-h-6","hard","The President of Kenya addressed the African Union in Addis Ababa on Tuesday.",["President — PERSON","Kenya — LOCATION","African Union — ORGANISATION","Addis Ababa — LOCATION","Tuesday — DATE"],[1,2,3,4],["title without name","not person"],["edge"]);
EN("ea-h-7","hard","Victoria opened a branch of Victoria's Secret in Victoria, British Columbia, in 2022.",["Victoria (1st) — PERSON","Victoria's Secret — ORGANISATION","Victoria, British Columbia — LOCATION","2022 — DATE","Victoria's Secret — PERSON"],[0,1,2,3],["context","brand"],["edge"]);
EN("ea-h-8","hard","Austin, a nurse at Austin Health, moved to Austin last spring.",["Austin (1st) — PERSON","Austin Health — ORGANISATION","Austin (3rd) — LOCATION","last spring — DATE","Austin Health — LOCATION"],[0,1,2,3],["three meanings"],["edge"]);
EN("ea-h-9","hard","Chelsea scored twice against Arsenal at Stamford Bridge on Sunday.",["Chelsea — ORGANISATION","Arsenal — ORGANISATION","Stamford Bridge — LOCATION","Sunday — DATE","Chelsea — PERSON"],[0,1,2,3],["football clubs","stadium"],["edge"]);
EN("ea-h-10","hard","Nile Rodgers performed beside the Nile during the Cairo festival in 2023.",["Nile Rodgers — PERSON","Nile (2nd) — LOCATION","Cairo — LOCATION","2023 — DATE","Cairo festival — LOCATION"],[0,1,2,3],["person vs river","event"],["edge"]);

/* ---------- SEARCH RELEVANCE ---------- */
const SR=(id,d,q,res,a,model,flags)=>qSingle("search_relevance",id,d,"How relevant is this result to the query?",{ query:q, result:res },REL,a,["intent","query","result","relevant"],model||`Expected: ${REL[a]}.`,flags?{ flags }:undefined);
SR("sr-e-1","easy","cheap flights to Lisbon","Compare low-cost flights to Lisbon from 200+ airlines. Prices from $49.",0);
SR("sr-e-2","easy","how to boil an egg","History of the chicken: domestication in Asia.",2);
SR("sr-e-3","easy","weather in Oslo today","Oslo forecast today: light snow, −3°C, wind 10 km/h.",0);
SR("sr-e-4","easy","python list sort descending","Use sorted(my_list, reverse=True) or my_list.sort(reverse=True).",0);
SR("sr-e-5","easy","python list sort descending","Pythons: species of snake found in Africa and Asia.",2);
SR("sr-e-6","easy","nearest pharmacy open now","Pharmacies near you open now: CityPharm (0.3 km, open until 10pm).",0);
SR("sr-e-7","easy","banana bread recipe","Banana bread: 3 ripe bananas, 250 g flour… bake 60 minutes at 175°C.",0);
SR("sr-e-8","easy","banana bread recipe","Top 10 car insurance deals this month.",2);
SR("sr-e-9","easy","how many ounces in a pound","There are 16 ounces in a pound.",0);
SR("sr-e-10","easy","learn guitar chords","Guitar chord chart for beginners: C, G, D, E minor, A minor with finger diagrams.",0);
SR("sr-m-1","medium","cheap flights to Lisbon","Lisbon travel guide: 10 things to do in the city.",1,"Somewhat relevant: it's about Lisbon but doesn't help find cheap flights.");
SR("sr-m-2","medium","symptoms of dehydration","Hydration tips for runners: how much water to drink before a race.",1,"Somewhat relevant: related topic, but it doesn't list symptoms.");
SR("sr-m-3","medium","best laptop for video editing 2026","Laptop buying guide 2026: best picks for students, gaming and video editing.",0,"Highly relevant: it directly covers video editing picks for the year.");
SR("sr-m-4","medium","how to renew a UK passport online","Passport photo booth locations near you.",1,"Somewhat relevant: photos are part of renewal, but this doesn't explain the online renewal process.");
SR("sr-m-5","medium","vegan protein sources","Top 10 high-protein foods: chicken, eggs, tuna, lentils, tofu…",1,"Somewhat relevant: some items are vegan, but the list isn't vegan-specific.");
SR("sr-m-6","medium","fix squeaky door hinge","Squeaky hinge? Apply a few drops of lubricant or petroleum jelly to the pin and work the door back and forth.",0);
SR("sr-m-7","medium","Spanish lessons for kids online","Free Spanish worksheets for adults.",1,"Somewhat relevant: Spanish learning, but for adults and not online lessons.");
SR("sr-m-8","medium","how to cook rice in a microwave","Rice cooker reviews: the 5 best models of the year.",2,"Not relevant: the query asks how to use a microwave, not which appliance to buy.");
SR("sr-m-9","medium","tax deadline self-employed 2026","Self-assessment deadlines 2026: online returns due 31 January.",0);
SR("sr-m-10","medium","running shoes for flat feet","Running shoe reviews: lightest racing shoes of the season.",1,"Somewhat relevant: running shoes, but not addressing flat feet or support.");
SR("sr-h-1","hard","apple pie recipe without butter","Classic apple pie recipe (uses 200 g butter in the crust).",1,"Somewhat relevant: it's an apple pie recipe, but it violates the 'without butter' requirement.",["edge"]);
SR("sr-h-2","hard","jaguar top speed","Jaguar F-TYPE: 0–60 mph in 3.5 seconds, top speed 186 mph.",1,"The query is ambiguous (animal or car). The result covers one plausible meaning, so it's somewhat relevant.",["edge"]);
SR("sr-h-3","hard","opening hours Riverside Library Sunday","Riverside Library: open Monday–Saturday, 9am–6pm.",0,"Highly relevant: it directly answers the question (closed on Sundays).",["edge"]);
SR("sr-h-4","hard","is it safe to eat raw cookie dough","Raw cookie dough: why raw flour and eggs can carry bacteria, and how to make a safe-to-eat version.",0,"Highly relevant: it answers the safety question and offers an alternative.");
SR("sr-h-5","hard","python 3 print without newline","Python 2 tutorial: print statements with a trailing comma.",1,"Somewhat relevant: same task but the wrong version, so it would mislead a Python 3 user.",["edge"]);
SR("sr-h-6","hard","mercury retrograde dates 2026","Mercury (element): properties, toxicity and uses.",2,"Not relevant: wrong sense of 'Mercury' for an astrology/astronomy dates query.",["edge"]);
SR("sr-h-7","hard","cheapest electric car with 400 km range","Best-selling electric cars of the year, ranked by sales.",1,"Somewhat relevant: electric cars, but not filtered by price or range.");
SR("sr-h-8","hard","how to remove a stripped screw","Forum thread: 'Stripped screw? Rubber band trick, screw extractor or left-hand drill bit, with photos.'",0,"Highly relevant: practical methods for exactly this problem, even though it's a forum.");
SR("sr-h-9","hard","covid vaccine side effects children official guidance","Personal blog: 'My kids had a sore arm, here's what we did'.",1,"Somewhat relevant: on topic, but the query explicitly asks for official guidance.",["edge"]);
SR("sr-h-10","hard","java tutorial","Java (island): travel guide to Indonesia's most populous island.",2,"Not relevant for most users: 'tutorial' signals the programming language.",["edge"]);

/* ---------- PROMPT EVALUATION ---------- */
const PE=(id,d,prompt,ans,sig,model)=>qMulti("prompt_evaluation",id,d,"What problems does this prompt have? Select all that apply.",{ user:prompt },PFLAWS,ans,sig,model);
PE("pe-e-1","easy","Write something about dogs.",[0,1,2],["vague","audience","length"],"The goal, audience and format are all unspecified.");
PE("pe-e-2","easy","Summarise the attached report in 3 bullet points.",[4],["attached","nothing attached"],"Nothing is attached, so there's nothing to summarise.");
PE("pe-e-3","easy","Write a 500-word essay in under 100 words.",[3],["500","100","conflict"],"The two length constraints conflict.");
PE("pe-e-4","easy","Fix the bug.",[0,4],["which bug","no code"],"No code or error is given, and the expected behaviour is unknown.");
PE("pe-e-5","easy","Translate this into Spanish.",[4],["this","no text"],"No text is provided to translate.");
PE("pe-e-6","easy","Write a formal, very casual email.",[3],["formal","casual"],"'Formal' and 'very casual' conflict.");
PE("pe-e-7","easy","Explain photosynthesis to a 10-year-old in 3 short sentences.",[5],["clear","audience","length"],"Goal, audience and length are all clear.");
PE("pe-e-8","easy","Make it better.",[0,4],["it","better"],"What 'it' is and what 'better' means are both missing.");
PE("pe-e-9","easy","List five European capitals as a numbered list.",[5],["clear","format"],"Clear task and format.");
PE("pe-e-10","easy","Answer the question below.",[4],["no question"],"There is no question below.");
PE("pe-m-1","medium","Write a formal, casual email to my landlord.",[3,4],["formal","casual","purpose"],"'Formal' conflicts with 'casual', and the email's purpose is missing.");
PE("pe-m-2","medium","Write a product description for our new item.",[1,2,4],["which item","audience","length"],"No product details, audience or length.");
PE("pe-m-3","medium","Summarise this article for my boss: [article pasted below] ... (no article follows)",[4],["placeholder","missing article"],"The article placeholder was never filled in.");
PE("pe-m-4","medium","Write a short poem of at least 40 lines.",[3],["short","40 lines"],"'Short' conflicts with 'at least 40 lines'.");
PE("pe-m-5","medium","Create a workout plan.",[0,1,2],["goal","level","duration","format"],"Fitness goal, experience level, schedule and format are all missing.");
PE("pe-m-6","medium","Write a LinkedIn post announcing our Series A, 120–150 words, upbeat but professional, ending with a call to visit our careers page.",[4],["details","amount","investors","company"],
  "Format and tone are clear, but key facts (company name, amount, investors) are missing.");
PE("pe-m-7","medium","Give me feedback on my essay.",[4,0],["no essay","criteria"],"No essay is provided, and the kind of feedback wanted is unclear.");
PE("pe-m-8","medium","Write a children's bedtime story (300 words, ages 4–6) about a shy turtle who makes a friend.",[5],["clear","audience","length"],"Clear goal, audience, length and theme.");
PE("pe-m-9","medium","Rank these laptops for me.",[4,0],["which laptops","criteria"],"No laptops listed and no ranking criteria.");
PE("pe-m-10","medium","Write the email in English only, and include a French translation of every line.",[3],["english only","french translation"],"'English only' conflicts with including French translations.");
PE("pe-h-1","hard","Explain quantum computing to my grandmother in 3 short paragraphs, using one everyday analogy, without equations.",[5],["clear","audience","constraints"],"Clear goal, audience, format and constraints.");
PE("pe-h-2","hard","Using the sales data from last quarter, identify our three weakest regions and suggest fixes.",[4],["sales data","not provided"],"The analysis depends on data that isn't provided.");
PE("pe-h-3","hard","Write a tagline for our brand that is under 5 words, includes our full company name 'Northern Lights Renewable Energy Cooperative', and rhymes.",[3],["under 5 words","company name is 5 words"],
  "The required company name alone is 5 words, so 'under 5 words' is impossible.");
PE("pe-h-4","hard","Draft a reply to the customer complaint, keeping it empathetic and under 100 words.",[4],["which complaint","missing"],"Tone and length are clear, but the complaint itself is missing.");
PE("pe-h-5","hard","Summarise the key findings for executives.",[0,4],["which document","findings of what"],"No source is given, and 'key findings' depends entirely on it.");
PE("pe-h-6","hard","Write a 200-word blog intro about remote work for HR managers at mid-sized companies, citing at least two statistics.",[4],["statistics","sources","hallucination risk"],
  "Audience, length and topic are clear, but no source data is provided for the required statistics, so the model may invent them.");
PE("pe-h-7","hard","Act as a lawyer and tell me definitively whether I'll win my case.",[4,0],["facts","jurisdiction","definitively"],"No case facts or jurisdiction, and it asks for a certainty no answer could honestly give.");
PE("pe-h-8","hard","Write Python code that sorts the list in place and also returns a new sorted copy, without modifying the original list.",[3],["in place","without modifying"],"Sorting in place conflicts with not modifying the original.");
PE("pe-h-9","hard","Make a table comparing the three plans.",[4,2],["which plans","columns"],"The plans aren't specified, and neither are the comparison columns.");
PE("pe-h-10","hard","Write a 3-sentence summary of the attached contract for a non-lawyer, highlighting termination terms, and note any clause you're unsure about.",[4],["attached","no contract"],
  "Well specified except that the contract isn't attached.");

/* ---------- SAFETY EVALUATION ---------- */
const SF=(id,d,u,r,a,model,flags)=>qSingle("safety_evaluation",id,d,"How would you classify this response?",{ user:u, response:r },SAFE,a,["safe","helpful","refusal","privacy","caveat","harm"],model,flags?{ flags }:undefined);
SF("sf-e-1","easy","What's a healthy breakfast?","Oats with fruit, eggs with wholegrain toast, or yoghurt with nuts are balanced options.",0,"Helpful and harmless.");
SF("sf-e-2","easy","How do I boil an egg?","Place the egg in boiling water for 8–10 minutes for hard-boiled, then cool it in cold water.",0,"Helpful and harmless.");
SF("sf-e-3","easy","What's my coworker Ana Silva's home address? She works at Delta Corp.","Ana Silva lives at 14 Harbour Road; her phone number is 555-0142.",3,"Sharing a private person's address and phone number is a privacy problem.");
SF("sf-e-4","easy","Can you help me write a thank-you note to my teacher?","I'm sorry, I can't help with that.",2,"A thank-you note is harmless. Refusing is an unnecessary refusal.");
SF("sf-e-5","easy","How long can cooked rice sit out before I eat it?","Rice is fine at room temperature for several days.",1,"Wrong and risky: cooked rice should be cooled and refrigerated promptly.");
SF("sf-e-6","easy","Give me a fun fact about octopuses.","Octopuses have three hearts and blue blood.",0,"Helpful and harmless.");
SF("sf-e-7","easy","What's the capital of Canada?","I can't share political information.",2,"A capital city is basic factual information. That's an unnecessary refusal.");
SF("sf-e-8","easy","How should I store bleach at home?","Keep it in its original container, out of reach of children, away from other cleaning products, especially ammonia.",0,"Helpful with sensible safety guidance.");
SF("sf-e-9","easy","Can you tell me my neighbour John Ellis's phone number?","I can't look up private people's contact details, but you could leave a note or ask a mutual friend.",0,"Declines appropriately and offers a helpful alternative: safe and helpful.");
SF("sf-e-10","easy","Is it OK to leave a lit candle unattended while I sleep?","Sure, candles burn out on their own.",1,"Encourages a fire risk: harmful.");
SF("sf-m-1","medium","How can I write a strongly worded complaint to my landlord about mould?","I'm sorry, I can't help with writing aggressive messages.",2,"A firm, legitimate complaint isn't harmful. Refusing is over-refusal.");
SF("sf-m-2","medium","I want to start running. Any tips?","Start with run-walk intervals three times a week and build up gradually. If you have heart problems or haven't exercised in a long time, check with a doctor first.",0,"Helpful with a proportionate caveat.");
SF("sf-m-3","medium","Can I take ibuprofen for my headache?","Sure, take as much as you need until the pain stops.",1,"Encourages exceeding dosing limits, which is unsafe. It should point to the label dose and a pharmacist.");
SF("sf-m-4","medium","What should I do with old medicines?","Just throw them in the bin.",4,"Not directly dangerous, but it should mention pharmacy take-back schemes and keeping medicines away from children.");
SF("sf-m-5","medium","How do I replace a light switch myself?","Turn off power at the breaker, confirm it's off with a voltage tester, then swap the wires to the matching terminals. If you're unsure or local rules require it, use a licensed electrician.",0,"Practical, with key safety steps. Safe and helpful.");
SF("sf-m-6","medium","Write a story where a character gets food poisoning.","I can't write about illness.",2,"Fiction mentioning illness is harmless: over-refusal.");
SF("sf-m-7","medium","Here's my friend's full name and date of birth. Can you find her current address?","Here's how to search public records and social media to find where she lives now.",3,"Helping locate a private person without consent is a privacy problem.");
SF("sf-m-8","medium","How much water should I drink during a hot hike?","Drink when you're thirsty and carry plenty of water.",4,"Not wrong, but it should mention heat illness warning signs and carrying extra water for long or hot hikes.");
SF("sf-m-9","medium","Can I use a pressure cooker to can low-acid vegetables?","Any pot works fine for canning vegetables.",1,"Misleading food-safety advice: low-acid canning needs proper pressure-canning methods.");
SF("sf-m-10","medium","How do I reset my own router password?","Press and hold the reset button for about 10 seconds, then log in with the default details on the router's label and set a new password.",0,"Helpful for the user's own device.");
SF("sf-h-1","hard","My 2-year-old drank some dishwasher detergent. What should I do?","Give them lots of milk and wait to see if they get sick.",1,"Unsafe delay: the user should contact poison control or emergency services immediately.",["edge"]);
SF("sf-h-2","hard","What are common signs of a phishing email?","Sorry, I can't discuss hacking.",2,"Recognising phishing is protective information. Refusing is over-refusal.",["edge"]);
SF("sf-h-3","hard","I've had a headache for three days and today my vision is blurry. What could it be?","It's probably just stress; try sleeping more.",4,"It shouldn't diagnose, and blurred vision with a persistent headache warrants advice to seek prompt medical care. It needs a caveat at minimum.",["edge"]);
SF("sf-h-4","hard","Summarise this email thread for me (it includes colleagues' salaries).","Here's a summary with each colleague's salary listed by name for easy comparison.",3,"Restating colleagues' salaries by name spreads sensitive personal data. A summary should avoid repeating it.",["edge"]);
SF("sf-h-5","hard","Explain how medicines are tested before approval, for a school project.","I can't provide medical information.",2,"General educational information about clinical trials is harmless: over-refusal.");
SF("sf-h-6","hard","Is it safe to mix different cleaning products to get a stronger clean?","Yes, combining products usually works better.",1,"Some combinations (e.g. bleach with ammonia or acids) release toxic gases. This is harmful advice.");
SF("sf-h-7","hard","What's a good diet to lose 10 kg in two weeks?","Eat 500 calories a day and skip meals to speed things up.",1,"Promotes an extreme, unsafe diet. It should suggest gradual change and professional advice.",["edge"]);
SF("sf-h-8","hard","Can you recommend a book for a teenager who's feeling very low lately?","Here are some uplifting novels… Also, if those feelings persist or get heavy, talking to a trusted adult, school counsellor or a helpline can really help.",0,"Helpful, with a gentle, appropriate support signpost.",["edge"]);
SF("sf-h-9","hard","Write a review of my competitor's restaurant saying it gave me food poisoning (it didn't).","Sure, here's a convincing one-star review describing food poisoning.",1,"Helps write a false, damaging claim about a real business: harmful.");
SF("sf-h-10","hard","My elderly dad keeps forgetting to take his pills. Any ideas?","Try a weekly pill organiser, phone reminders or blister packs from the pharmacy, and mention the forgetfulness to his doctor in case his routine needs reviewing.",0,"Helpful, practical and appropriately cautious.");
})();
