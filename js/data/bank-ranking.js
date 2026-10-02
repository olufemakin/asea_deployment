/* Practice bank — PREFERENCE RANKING (original BSP content).
   Easy: one obvious failure. Medium: both reasonable, clear trade-off. Hard: strong competing
   responses with subtle accuracy, safety or fabrication issues. */
"use strict";
(()=>{
const R=(id,d,u,a,b,p,dims,sig,model,x)=>qRank("preference_ranking",id,d,u,a,b,p,dims,sig,model,x);

/* ---------- EASY ---------- */
R("pr-e-1","easy","Give me a two-sentence summary of why sleep matters.",
  "Sleep lets your body repair itself and your brain store memories. Without enough of it, concentration, mood and health all suffer.",
  "Sleep is important. It has many benefits. It helps the body. It helps the brain. Most adults need seven to nine hours, so try to get enough.",
  -2,{if:"A",cla:"A"},["two sentences","instruction","repetitive","length","clear"],
  "A follows the two-sentence instruction and is clear and accurate. B uses five short, repetitive sentences, so it breaks the length constraint. A is much better.");
R("pr-e-2","easy","Translate 'Good morning' into Spanish.","Buenos días.","Buenas noches.",-2,{acc:"A"},["buenos días","buenas noches","good night","wrong"],
  "A is correct. B means 'Good night'. A is much better.");
R("pr-e-3","easy","What is 12 × 12?","144.","124.",-2,{acc:"A"},["144","124","wrong","arithmetic"],"12 × 12 = 144, so A is correct and B is wrong. A is much better.");
R("pr-e-4","easy","Name the three primary colours used in traditional painting.","Red, yellow and blue.","Red, green and purple.",-2,{acc:"A"},["red","yellow","blue","green","purple","wrong"],
  "In traditional colour theory the primaries are red, yellow and blue. B is wrong. A is much better.");
R("pr-e-5","easy","Write ONE sentence inviting the team to Friday's lunch.","You're all invited to a team lunch this Friday at 12:30 in the canteen!",
  "Hi team! We're having lunch on Friday. It will be at 12:30. Please come along to the canteen.",-2,{if:"A"},["one sentence","instruction","four sentences"],
  "Both are friendly, but B uses four sentences when the prompt asked for one. A is much better.");
R("pr-e-6","easy","Give an antonym for 'ancient'.","Modern.","Old.",-2,{acc:"A"},["antonym","opposite","old","synonym","modern"],
  "An antonym is an opposite. 'Old' is a synonym, so B is wrong. A is much better.");
R("pr-e-7","easy","Reply only 'yes' or 'no': Is Paris in France?","Yes.",
  "Yes, Paris is the capital of France and is famous for the Eiffel Tower, the Louvre and its cafés.",-2,{if:"A"},["only","yes","extra","instruction"],
  "Both are correct, but the prompt says reply ONLY yes or no. B adds unrequested content. A is much better.");
R("pr-e-8","easy","Convert 2 kilometres to metres.","2,000 metres.","200 metres.",-2,{acc:"A"},["2,000","1,000","200","wrong"],
  "1 km = 1,000 m, so 2 km = 2,000 m. B is wrong. A is much better.");
R("pr-e-9","easy","Write an email subject line announcing that the system will be down on Saturday from 2am to 4am.",
  "Planned maintenance: system unavailable Saturday 2–4am","Important update",-2,{comp:"A",cla:"A"},["specific","time","vague","informative"],
  "A tells readers exactly what is happening and when. B is so vague that recipients may ignore it. A is much better.");
R("pr-e-legacy-1","easy","Explain why the sky is blue in two sentences, for a 10-year-old.",
  "The sky looks blue because of Rayleigh scattering: shorter wavelengths of visible light scatter more strongly off nitrogen and oxygen molecules. Blue light, at roughly 450 nanometres, is scattered far more than red light. This scattered light reaches our eyes from every direction, so the sky appears blue.",
  "Sunlight is made of many colours, and the air bounces blue light around the sky much more than the other colours. So when you look up, blue light is coming at you from everywhere!",
  2,{if:"B",cla:"B"},["two sentences","audience","child","jargon","accurate","b"],
  "B follows both constraints (two sentences, child-friendly) and stays accurate. A is accurate but ignores the length and audience constraints with technical jargon. B is much better.",
  { source:"legacy:pt-instr-pair", version:"1.1" });
R("pr-e-legacy-2","easy","Who wrote 'Pride and Prejudice', and when was it first published?",
  "Jane Austen wrote 'Pride and Prejudice'. It was first published in 1813.",
  "'Pride and Prejudice' was written by Charlotte Brontë and published in 1813, and it is a classic of Victorian literature.",
  -2,{acc:"A"},["austen","brontë","wrong author","1813","victorian","regency"],
  "A is correct. B names the wrong author and mislabels the period (1813 is before the Victorian era). A is much better.",
  { source:"legacy:pt-fact-pair", version:"1.1" });
R("pr-e-legacy-3","easy","How do I get rid of a wasp nest under my porch?",
  "Wait until evening, when wasps are less active. Wear long sleeves and gloves, use a spray labelled for wasp nests and keep a clear escape route. If you're allergic or the nest is large, call a pest-control professional.",
  "Just pour petrol on it and set it alight. That will take care of it instantly.",
  -2,{saf:"A",acc:"A"},["safety","fire","dangerous","professional","allergy"],
  "A is practical and safety-aware. B recommends setting a fire under a porch, which risks injury and property damage. A is much better.",
  { source:"legacy:pt-wasp-pair", version:"1.1" });

/* ---------- MEDIUM ---------- */
R("pr-m-1","medium","List three tips for a job interview, one line each.",
  "1. Research the company.\n2. Prepare examples using the STAR method.\n3. Ask two thoughtful questions at the end.",
  "1. Research the company thoroughly, including its mission, recent news, competitors and the backgrounds of your interviewers, so you can tailor every answer.\n2. Prepare examples using the STAR method, practising them aloud until they feel natural.\n3. Ask thoughtful questions.",
  -1,{if:"A",comp:"B"},["one line","instruction","format","detail","slightly"],
  "Both give useful tips. B adds helpful detail but breaks 'one line each', so A is slightly better.");
R("pr-m-2","medium","What is the capital of Australia?","Sydney is the capital of Australia and its largest city.","Canberra.",2,{acc:"B"},["canberra","sydney","misconception","largest city"],
  "B is correct. A states a common misconception: Sydney is the largest city, but Canberra is the capital. B is much better, despite being shorter.");
R("pr-m-3","medium","Explain what a VPN does, for a complete beginner.",
  "A VPN is like a private tunnel for your internet traffic. It hides what you're doing from others on the same network, such as public Wi-Fi, and makes it look like you're connecting from somewhere else.",
  "A VPN establishes an encrypted tunnel using protocols such as WireGuard or IPsec, encapsulating packets and routing them through a remote endpoint, thereby masking the client's IP address.",
  -1,{cla:"A",rel:"A"},["beginner","jargon","analogy","audience","both accurate"],
  "Both are accurate, but the prompt asks for a beginner explanation. A uses a plain analogy; B is jargon-heavy. A is slightly better; B isn't wrong.");
R("pr-m-4","medium","How many minutes are in 3.5 hours?","210 minutes.","3.5 hours × 60 minutes per hour = 210 minutes.",0,{acc:"T"},["both correct","210","tie","working"],
  "Both are correct. A is concise; B shows working. For a simple question neither has a meaningful advantage, so Tie is appropriate.");
R("pr-m-5","medium","Write a haiku about rain.","Soft rain on the roof\nthe garden drinks quietly\nclouds drift toward dusk",
  "The rain falls down today,\nIt washes all the dust away,\nThe children cannot play,\nThey'll go outside another day.",
  -2,{if:"A"},["haiku","5-7-5","syllables","form","quatrain"],"A follows the 5-7-5 haiku form. B is a rhyming four-line verse, not a haiku. A is much better.");
R("pr-m-6","medium","Explain what inflation is, in two sentences, for a teenager.",
  "Inflation means prices go up over time, so the same money buys less. If a snack cost $1 last year and $1.10 now, that's 10% inflation.",
  "Inflation is the rate of change of the CPI basket, reflecting growth in monetary aggregates. It erodes real purchasing power across the economy.",
  -1,{cla:"A",rel:"A"},["teenager","jargon","example","cpi","two sentences"],
  "Both are two sentences and broadly accurate, but A suits a teenager with a concrete example, while B relies on jargon (CPI basket, monetary aggregates). A is slightly better.");
R("pr-m-7","medium","Give me a 3-step plan to start saving money.",
  "1. Track your spending for a month.\n2. Set a savings goal and an automatic transfer on payday.\n3. Cut one regular cost, such as an unused subscription.",
  "1. Track spending. 2. Make a budget. 3. Open a high-yield account. 4. Automate transfers. 5. Review monthly and adjust.",
  -1,{if:"A",comp:"B"},["3 steps","five","instruction","actionable"],
  "B has good ideas but gives five steps when three were asked for. A is concrete and follows the instruction. A is slightly better.");
R("pr-m-8","medium","Summarise the pros and cons of remote work in 4 bullet points.",
  "• Pro: no commute saves time.\n• Pro: easier to focus for deep work.\n• Con: harder to build relationships.\n• Con: home and work can blur.",
  "• Saves commuting time.\n• Flexible hours.\n• Fewer office distractions.\n• Lower costs for lunches and travel.",
  -2,{if:"A",comp:"A"},["pros and cons","balanced","only pros","instruction"],
  "The prompt asks for pros AND cons. B lists only pros, so it misses half the task. A is much better.");
R("pr-m-9","medium","How do I remove a red wine stain from a cotton shirt?",
  "Blot (don't rub) the stain, rinse from the back with cold water, apply a little washing-up liquid or stain remover, then wash as normal. Check the stain is gone before tumble-drying, because heat can set it.",
  "Rinse the stain under hot water straight away, then apply washing-up liquid and wash as normal.",
  -2,{acc:"A",comp:"A"},["cold water","hot water","sets","blot","heat"],
  "B's hot-water step can set the stain, the opposite of what the user wants. A is accurate and complete. A is much better.");
R("pr-m-10","medium","Recommend a beginner programming language and explain why, in under 50 words.",
  "Python. Its readable syntax lets beginners focus on concepts, it has huge free learning resources, and it's used for automation, data and web work, so skills transfer to real jobs.",
  "Python is a great first language because its syntax is clean and readable, which means beginners can focus on learning programming concepts rather than fighting punctuation. It also has an enormous community, thousands of free tutorials and libraries for almost everything, from data analysis and machine learning to web development and automation.",
  -1,{if:"A"},["under 50 words","length","both good","instruction"],
  "Both recommend Python with sound reasons. B is about 60 words, over the 50-word limit; A is about 35. A is slightly better.");
R("pr-m-11","medium","Rewrite in plain English: 'Pursuant to clause 4, remuneration shall be disbursed monthly.'",
  "Under clause 4, you'll be paid every month.","Under clause 4, you get paid.",-1,{comp:"A",acc:"A"},["monthly","omits","plain","complete"],
  "Both are plain, but B drops 'monthly', which is the key information. A is better.");

/* ---------- HARD ---------- */
R("pr-h-1","hard","Write a short, polite reply declining a meeting invitation for Friday.",
  "Thank you for the invitation. Unfortunately I can't make Friday. Could we find another time next week?",
  "Thank you for the invitation. Unfortunately I'll be on holiday on Friday, so I can't attend. Could we find another time next week?",
  -1,{acc:"A"},["holiday","invents","fabricated reason","not given"],
  "Both are polite and short, but B invents a reason (a holiday) that the user never gave. Putting false information in someone's mouth is a real problem. A is slightly better.");
R("pr-h-2","hard","My toddler just swallowed a coin. What should I do?",
  "Stay calm. If your child is choking, struggling to breathe, drooling or in pain, call emergency services now. If they seem fine, contact your doctor or a nurse advice line promptly; they may want an X-ray. Don't try to make them vomit.",
  "Coins usually pass naturally, so there's nothing to worry about. Just wait a few days.",
  -2,{saf:"A",acc:"A",comp:"A"},["emergency","breathing","doctor","false reassurance","warning signs"],
  "A gives safe, prioritised guidance with clear warning signs. B gives false reassurance that could delay urgent care. A is much better.");
R("pr-h-3","hard","Summarise in under 20 words: 'The library will close at 5pm on Friday for staff training and reopen at 9am on Saturday.'",
  "Library closes 5pm Friday for staff training; reopens 9am Saturday.","The library is closing early on Friday.",-1,{comp:"A"},["reopen","saturday","omits","under 20"],
  "Both meet the length limit, but B omits the reason and the reopening time that readers need. A is better (slightly or much are both defensible).");
R("pr-h-4","hard","Explain the difference between viruses and bacteria for a 12-year-old, in 3 sentences.",
  "Bacteria are tiny living cells that can survive on their own, and some help us, like the ones in our gut. Viruses are much smaller and can only copy themselves inside another living cell. That's why antibiotics can treat some bacterial infections but don't work on viruses like colds. Your body's immune system fights both.",
  "Bacteria are single-celled living things, and some are helpful. Viruses are smaller living cells that make you ill. Antibiotics kill bacteria but not viruses.",
  -1,{acc:"A",if:"B"},["viruses are not cells","accuracy","four sentences","instruction","trade-off"],
  "B keeps to 3 sentences but wrongly calls viruses 'living cells'. A is accurate but uses 4 sentences. A factual error in a teaching answer outweighs a one-sentence overrun, so A is slightly better.");
R("pr-h-5","hard","Draft a two-line text message reminding a patient of their appointment tomorrow at 10am at Elm Street Clinic.",
  "Reminder: your appointment at Elm Street Clinic is tomorrow at 10:00.\nReply C to confirm or call 555-0100 to rearrange.",
  "Reminder: your diabetes check-up at Elm Street Clinic is tomorrow at 10:00.\nReply C to confirm or call 555-0100 to rearrange.",
  -2,{saf:"A"},["privacy","diagnosis","sms","sensitive","health information"],
  "Both are clear, but B puts the patient's condition in a text message, which anyone seeing the phone could read: a privacy problem. A is much better.");
R("pr-h-6","hard","A customer's order is late and we can't give a new delivery date yet. Write a short, polite reply.",
  "I'm sorry your order is late. The courier hasn't confirmed a new date yet, so I'll check again tomorrow and email you an update by 5pm.",
  "I'm so sorry your order is late! Good news: it will arrive on Monday. Thanks for your patience.",
  -2,{acc:"A"},["fabricated","promise","no date","commitment","update"],
  "B promises a Monday delivery that the business can't confirm: a fabricated commitment. A is honest and gives a concrete next step. A is much better.");
R("pr-h-7","hard","Explain 'correlation is not causation' with an example, in under 80 words.",
  "Two things can rise together without one causing the other. Ice-cream sales and drowning incidents both increase in summer, but ice cream doesn't cause drowning: hot weather drives both. That hidden third factor is called a confounder.",
  "Correlation means two things move together; causation means one makes the other happen. For example, children with bigger shoe sizes read better, but feet don't improve reading: older children have both bigger feet and more practice. Controlled experiments help separate the two.",
  1,{comp:"B"},["confounder","example","experiments","both accurate","slightly"],
  "Both are accurate and under 80 words with a good example. B also defines both terms and mentions how experiments separate them, so it is slightly more complete. B is slightly better (a tie is also defensible).");
R("pr-h-8","hard","Is it OK to give my dog grapes as a treat?",
  "No. Grapes and raisins can cause kidney damage in some dogs, so they're best avoided. If your dog has eaten some, contact a vet promptly.",
  "No. Grapes and raisins are toxic to dogs and can cause kidney failure. Even a single grape will always kill a dog. Watch for vomiting, lethargy and reduced urination, and contact a vet immediately if any are eaten.",
  -1,{acc:"A",comp:"B"},["overclaim","always","single grape","vet","symptoms"],
  "B is more complete (symptoms), but it adds a false absolute: a single grape doesn't 'always' kill a dog. A is accurate and gives the key action. A is slightly better.");
R("pr-h-9","hard","Rewrite 'We regret to inform you that your application was unsuccessful' to sound warmer but still clear.",
  "Thank you for applying. Unfortunately, we won't be moving forward with your application this time.",
  "Thank you so much for applying! We loved your application and hope to work with you very soon!",
  -2,{acc:"A",cla:"A"},["misleading","clear","rejection","warmer","sounds like acceptance"],
  "B is warmer but no longer clear; it reads like an acceptance, which would mislead the applicant. A keeps the meaning and softens the tone. A is much better.");
R("pr-h-10","hard","Explain why the Moon has phases, in 2–3 sentences.",
  "The Moon is always half lit by the Sun. As it orbits Earth over about a month, we see different amounts of that sunlit half, which creates the phases.",
  "The Moon's phases are caused by Earth's shadow falling across part of the Moon as it orbits. When more of the shadow covers it, we see a crescent.",
  -2,{acc:"A"},["shadow","eclipse","myth","sunlit half","viewing angle"],
  "B states a common myth: Earth's shadow causes eclipses, not phases. A is correct. B is fluent but wrong, so A is much better.");
R("pr-h-11","hard","Summarise this policy for staff: 'Expenses over $500 require director approval; under $500, manager approval suffices.'",
  "Over $500: director approval. Under $500: manager approval.","Expenses need manager or director approval depending on the amount.",-1,{comp:"A",cla:"A"},["threshold","$500","exactly $500","vague"],
  "A keeps the actionable threshold; B is too vague to follow. Note that neither says who approves exactly $500; a strong reviewer flags that gap. A is better.");
R("pr-h-12","hard","Give a balanced, two-sentence summary of the debate about a four-day working week.",
  "Supporters point to pilots, such as a 2022 UK trial involving 61 companies, where many firms kept the shorter week afterwards. Critics argue results may not transfer to sectors like healthcare or retail, where cover is needed every day.",
  "Studies prove that a four-day week always raises productivity and wellbeing. Critics worry it could be hard to apply to every industry.",
  -1,{acc:"A"},["overclaim","prove","always","balanced","evidence"],
  "B overclaims ('studies prove… always'), which misrepresents mixed evidence. A is balanced and specific. A is better.");
})();
