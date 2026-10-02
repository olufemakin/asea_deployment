/* Practice bank — FACTUALITY CHECKING, HALLUCINATION DETECTION, RESEARCH VERIFICATION
   (original BSP content; all organisations, studies and figures are fictional).
   Easy: short reference, direct claim. Medium: longer reference, partial/unsupported claims.
   Hard: conflicting evidence, valid-vs-invalid inferences, overstated certainty. */
"use strict";
(()=>{
const F=(id,d,ref,claim,label,sig,model,x)=>qFact("fact_checking",id,d,ref,claim,label,sig,model,x);

/* ---------- FACT CHECKING: references ---------- */
const LIB="The Riverside Library opened in 1998. It holds about 120,000 books and is open Monday to Saturday from 9am to 6pm. Membership is free for city residents; non-residents pay $20 per year.";
const SURVEY="In a 2025 survey of 400 employees, 62% said they preferred hybrid work, 25% preferred working full-time in the office and 13% preferred working fully remotely. The survey did not ask about productivity.";
const BRIDGE="The Harbor Bridge is 2 km long and opened in 2004. It has two traffic lanes in each direction.";
const CAFE="Sunset Café is open daily from 7am to 3pm and serves breakfast and lunch. It does not serve dinner.";
const RACE="Mia ran the 10 km city race in 52 minutes, finishing 14th out of 300 runners.";
const GARDEN="The Northfield community garden has 40 plots. Thirty are rented to residents; the remaining ten are reserved for the primary school. Plot rental costs $25 per season, and water is included. The garden is closed from December to February.";
const RECYCLE="In March, the city recycled 1,200 tonnes of waste, up from 1,000 tonnes in February. The council attributes part of the increase to a new food-waste collection service launched on 1 March.";
const EVCAR="Report A (2024) estimates that 35% of the town's households own an electric car. Report B (2025), based on vehicle registrations, puts the figure at 22%. The council's own survey on the topic had a 9% response rate.";
const DRUG="In a fictional six-week trial of 300 patients, symptoms improved in 60% of patients taking the new drug, compared with 45% on placebo. Side effects were reported by 12% of patients on the drug and 10% on placebo.";

/* Easy */
F("fc-e-1","easy",LIB,"The library opened in 1998.","Supported",["1998","opened"],"The reference states it opened in 1998.");
F("fc-e-2","easy",LIB,"The library is open seven days a week.","Contradicted",["monday to saturday","six days","sunday"],"It is open Monday to Saturday (six days).");
F("fc-e-3","easy",SURVEY,"Most surveyed employees preferred hybrid work.","Supported",["62%","majority"],"62% is a majority.");
F("fc-e-4","easy",BRIDGE,"The bridge opened in 2004.","Supported",["2004"],"The reference says it opened in 2004.");
F("fc-e-5","easy",BRIDGE,"The bridge is 5 km long.","Contradicted",["2 km","5 km"],"It is 2 km long, not 5 km.");
F("fc-e-6","easy",CAFE,"The café serves dinner.","Contradicted",["does not serve dinner","breakfast and lunch"],"The reference explicitly says it does not serve dinner.");
F("fc-e-7","easy",CAFE,"The café opens at 7am.","Supported",["7am"],"It is open daily from 7am.");
F("fc-e-8","easy",RACE,"Mia finished in the top 20.","Supported",["14th","top 20"],"14th place is within the top 20.");
F("fc-e-9","easy",RACE,"Mia ran a marathon.","Contradicted",["10 km","marathon","42"],"She ran a 10 km race, not a marathon (about 42 km).");
F("fc-e-10","easy",BRIDGE,"The bridge has four traffic lanes in total.","Supported",["two lanes","each direction","four"],"Two lanes in each direction makes four lanes in total.");
/* Medium */
F("fc-m-1","medium",LIB,"Non-residents pay an annual fee to join.","Supported",["$20","per year","non-residents"],"Non-residents pay $20 per year, which is an annual fee.");
F("fc-m-2","medium",LIB,"It has the largest book collection in the region.","Unsupported",["120,000","no comparison","region"],"The reference gives its size but nothing about other libraries.");
F("fc-m-3","medium",SURVEY,"Over 70% of employees preferred hybrid work.","Contradicted",["62%","70%"],"The figure is 62%.");
F("fc-m-4","medium",SURVEY,"Fully remote work was the least popular option.","Supported",["13%","lowest"],"13% is the lowest of the three.");
F("fc-m-5","medium",GARDEN,"All 40 plots are rented to residents.","Contradicted",["thirty","ten","school"],"Only 30 are rented to residents; 10 are reserved for the school.");
F("fc-m-6","medium",GARDEN,"Water is included, and plots cost $30 per season.","Partially Supported",["water included","$25","$30"],"Water is included (supported), but the price is $25, not $30.",{ flags:["part"] });
F("fc-m-7","medium",GARDEN,"The garden is popular with local families.","Unsupported",["no evidence","popular","not mentioned"],"The reference describes the garden but gives no evidence about popularity.");
F("fc-m-8","medium",GARDEN,"The garden is open in January.","Contradicted",["december to february","closed"],"It is closed from December to February.");
F("fc-m-9","medium",RECYCLE,"Recycling rose by 20% from February to March.","Supported",["1,000","1,200","200","20%"],"(1,200 − 1,000) ÷ 1,000 = 20%.");
F("fc-m-10","medium",RECYCLE,"The food-waste service caused the entire increase.","Contradicted",["part","entire","council"],"The council attributes only PART of the increase to the service.");
F("fc-m-11","medium",RECYCLE,"Recycling will keep rising in April.","Cannot Determine",["prediction","future","april"],"A prediction about April can't be confirmed by this reference.");
/* Hard */
F("fc-h-1","hard",LIB,"The library opened in 1998 and is open on Sundays.","Partially Supported",["1998","sunday","monday to saturday","part"],
  "The opening year is supported, but 'open on Sundays' is contradicted, so the claim as a whole is partially supported.",{ flags:["part"] });
F("fc-h-2","hard",LIB,"Residents will love visiting the library.","Cannot Determine",["subjective","prediction","opinion"],"A subjective prediction can't be settled by any factual reference.");
F("fc-h-3","hard",SURVEY,"Hybrid workers in the survey were more productive.","Unsupported",["productivity","not ask"],"The survey explicitly did not ask about productivity.");
F("fc-h-4","hard",EVCAR,"About a third of the town's households own an electric car.","Cannot Determine",["35%","22%","conflicting","report a","report b"],
  "Report A supports roughly a third, but the more recent registration-based Report B says 22%. The reference contains conflicting evidence it doesn't resolve.");
F("fc-h-5","hard",EVCAR,"Report B is based on vehicle registrations.","Supported",["registrations","report b"],"The reference says Report B is based on vehicle registrations.");
F("fc-h-6","hard",EVCAR,"The council's survey is the most reliable estimate.","Unsupported",["9%","response rate","no evidence","reliability"],
  "Nothing in the reference supports this; the 9% response rate, if anything, suggests caution.");
F("fc-h-7","hard",EVCAR,"Both reports agree on the level of electric-car ownership.","Contradicted",["35%","22%","disagree"],"They disagree: 35% vs 22%.");
F("fc-h-8","hard",DRUG,"In the trial, the drug outperformed placebo.","Supported",["60%","45%","placebo"],"60% vs 45% improved.");
F("fc-h-9","hard",DRUG,"The drug had no side effects.","Contradicted",["12%","side effects"],"12% of patients on the drug reported side effects.");
F("fc-h-10","hard",DRUG,"The drug is effective in the long term.","Unsupported",["six weeks","long term","duration"],"The trial lasted six weeks, so it says nothing about long-term effects.",{ flags:["unc"] });
F("fc-h-11","hard",DRUG,"Side effects were slightly more common with the drug than with placebo.","Supported",["12%","10%","slightly"],"12% vs 10% is slightly more common.");

/* ---------- HALLUCINATION DETECTION ---------- */
const STUDY="A randomised trial of 240 adults found that a 10-minute daily walking routine reduced self-reported stress scores by 12% over eight weeks compared with a control group. Blood pressure did not change significantly. The authors note the study relied on self-reported measures.";
/* Easy: three short sentences, at most one fabrication */
qHallu("hd-e-1","easy",LIB,["The Riverside Library opened in 1998.","It holds about 120,000 books.","It has a café on the top floor."],[2],["café","not mentioned","sentence 3"],"Sentence 3 (the café) isn't in the source.");
qHallu("hd-e-2","easy","The museum's new exhibition, 'Rivers of Light', opens on 3 March and runs until 30 June. Entry is free.",
  ["'Rivers of Light' opens on 3 March.","It runs until 30 June.","Entry is free."],[],["all supported","accurate"],"Every sentence matches the source.");
qHallu("hd-e-3","easy",BRIDGE,["The Harbor Bridge opened in 2004.","It is 2 km long.","It was designed by a famous Italian architect."],[2],["architect","not mentioned"],"Nothing in the source mentions the designer.");
qHallu("hd-e-4","easy",CAFE,["Sunset Café opens at 7am.","It serves breakfast and lunch.","It closes at 3pm."],[],["all supported"],"All three sentences match the source.");
qHallu("hd-e-5","easy",RACE,["Mia ran the 10 km race in 52 minutes.","She finished 14th.","It was her first race."],[2],["first race","not mentioned"],"The source doesn't say it was her first race.");
qHallu("hd-e-6","easy","The town library offers free Wi-Fi and has 12 public computers. Printing costs 10 cents per page.",
  ["The library has free Wi-Fi.","Printing is free.","There are 12 public computers."],[1],["10 cents","printing"],"Printing costs 10 cents a page, so sentence 2 is contradicted.");
qHallu("hd-e-7","easy","Our yoga class meets on Tuesdays at 6pm in Room 4. Mats are provided.",
  ["The class meets on Tuesdays.","Mats are provided.","The class costs $5."],[2],["price","not mentioned"],"No price is given in the source.");
qHallu("hd-e-8","easy","The museum is closed on Mondays. Entry is $12 for adults and free for children under 12.",
  ["Children under 12 enter free.","Adult entry is $12.","The museum is open every day."],[2],["closed on mondays"],"It is closed on Mondays.");
qHallu("hd-e-9","easy","Lake Verde is 3 km wide and 40 m deep at its deepest point. Swimming is allowed only in summer.",
  ["Lake Verde is 3 km wide.","Its deepest point is 40 m.","Swimming is allowed all year."],[2],["only in summer"],"Swimming is allowed only in summer.");
qHallu("hd-e-10","easy","The bakery sells sourdough, rye and white bread. It opens at 6am.",
  ["The bakery sells rye bread.","It opens at 6am.","It sells sourdough."],[],["all supported"],"All three sentences are supported.");
/* Medium: four sentences, subtle number/qualifier changes */
qHallu("hd-m-1","medium",SURVEY,["The 2025 survey asked 400 employees about work preferences.","Most preferred hybrid work.","Managers were the group most likely to prefer office work.","Productivity was higher among hybrid workers."],[2,3],
  ["managers","productivity","not asked"],"Sentence 3 invents a breakdown by role; sentence 4 contradicts the source, which didn't ask about productivity.");
qHallu("hd-m-2","medium",STUDY,["The trial included 240 adults.","Participants walked for 30 minutes a day.","Stress scores fell by 12%."],[1],["10 minutes","30 minutes"],"The source says 10 minutes, not 30.");
qHallu("hd-m-3","medium",GARDEN,["The garden has 40 plots.","Thirty plots are rented to residents.","Rental costs $25 per season, excluding water.","The garden closes from December to February."],[2],
  ["water is included","excluding"],"Water is included in the rental, so 'excluding water' is contradicted.");
qHallu("hd-m-4","medium",RECYCLE,["The city recycled 1,200 tonnes in March.","That was up from 1,000 tonnes in February.","The council says the food-waste service explains all of the increase.","The service began on 1 March."],[2],
  ["part","all of the increase"],"The council attributes only part of the increase to the service.");
qHallu("hd-m-5","medium",STUDY,["240 adults took part.","Participants walked for ten minutes a day.","Stress scores fell by 12% compared with the control group.","Blood pressure also fell significantly."],[3],
  ["blood pressure","did not change"],"Blood pressure did not change significantly.");
const BIKE="The city's bike-share scheme launched in May with 500 bikes at 40 stations. In its first month, riders made 18,000 trips. A single trip costs $2; monthly passes cost $15.";
qHallu("hd-m-6","medium",BIKE,["The scheme launched in May.","It started with 500 bikes.","Riders made 18,000 trips in the first month.","Monthly passes cost $20."],[3],["$15","$20"],"Monthly passes cost $15.");
qHallu("hd-m-7","medium",BIKE,["There are 40 stations.","A single trip costs $2.","The scheme was funded by a national grant.","Most trips were made by commuters."],[2,3],["funding","commuters","not mentioned"],
  "Neither the funding source nor who made the trips is in the source.");
const ENERGY="Greenline Energy reported revenue of $4.2 million in 2025, up from $3.5 million in 2024. Profit fell slightly because of higher equipment costs. The company employs 85 people.";
qHallu("hd-m-8","medium",ENERGY,["Revenue grew to $4.2 million in 2025.","Revenue grew by 20%.","Profit increased in 2025.","The company has 85 employees."],[2],["profit fell","20% is correct"],
  "Profit fell. Sentence 2 is a valid inference: (4.2 − 3.5) ÷ 3.5 = 20%.");
const READING="The school's new reading programme ran for one term with 120 Year 4 pupils. Average reading-age scores rose by 4 months. Teachers reported higher library use, but this was not measured.";
qHallu("hd-m-9","medium",READING,["The programme ran for one term.","120 pupils took part.","Reading-age scores rose by 4 months on average.","Library use rose by 30%."],[3],["not measured","30%"],
  "Library use was not measured, so a specific 30% figure is fabricated.");
qHallu("hd-m-10","medium","The town hall's opening hours are 8:30am to 5pm, Monday to Friday. The planning office inside is open only on Tuesday and Thursday mornings.",
  ["The town hall opens at 8:30am on weekdays.","It closes at 5pm.","The planning office is open every weekday morning.","The town hall is closed at weekends."],[2],["tuesday","thursday","every weekday"],
  "The planning office opens only on Tuesday and Thursday mornings. Sentence 4 follows from 'Monday to Friday'.");
/* Hard: six sentences; valid inferences mixed with fabrications and overstated certainty */
qHallu("hd-h-1","hard",DRUG,["The trial included 300 patients.","It lasted six weeks.","60% of patients on the drug improved, compared with 45% on placebo.","Side effects were more common on placebo.","The drug is likely to work for most patients in the long term.","Twelve percent of patients on the drug reported side effects."],[3,4],
  ["placebo 10%","long term","six weeks","overstated"],"Sentence 4 reverses the side-effect figures (12% drug vs 10% placebo). Sentence 5 goes beyond a six-week trial.",[4]);
qHallu("hd-h-2","hard",EVCAR,["Two reports estimate electric-car ownership in the town.","Report A gives 35%.","Report B, based on registrations, gives 22%.","Report B is more recent.","The reports agree that ownership has doubled since 2024.","The council survey had a high response rate."],[4,5],
  ["disagree","doubled","9%"],"The reports disagree (and say nothing about doubling); the survey response rate was 9%. Sentence 4 is valid: 2025 is later than 2024.");
const FLOOD="The Westbrook flood defence project was completed in 2023 at a cost of $18 million, $3 million over budget. Since completion, the river has exceeded flood level twice, and on both occasions no homes were flooded. Engineers say the defences are designed for a 1-in-100-year flood but caution that climate projections are uncertain.";
qHallu("hd-h-3","hard",FLOOD,["The project finished in 2023.","It cost $18 million, which was $3 million over budget.","The river has flooded homes once since then.","The defences are designed for a 1-in-100-year flood.","Engineers guarantee the town will never flood again.","The original budget was $15 million."],[2,4],
  ["no homes flooded","guarantee","uncertain","15 million is valid"],"Sentence 3 is contradicted (no homes flooded); sentence 5 overstates certainty. Sentence 6 is a valid inference (18 − 3 = 15).",[4]);
const PILOT="In a pilot, 50 customer-service agents used an AI drafting tool for 8 weeks. Average handling time fell from 9 to 7 minutes. Customer satisfaction scores did not change. Agents said the tool sometimes suggested incorrect refund amounts.";
qHallu("hd-h-4","hard",PILOT,["50 agents took part in an 8-week pilot.","Handling time fell by about 22%.","Customer satisfaction improved.","Agents reported some incorrect refund suggestions.","The tool made agents twice as fast.","The pilot shows the tool is error-free."],[2,4,5],
  ["did not change","twice","error-free","22% is valid"],"Satisfaction didn't change; 9→7 minutes is about 22% faster (valid), not twice as fast; agents reported errors, so 'error-free' is false.",[5]);
const AUDIT="The 2025 audit sampled 60 of the charity's 400 grants. It found documentation gaps in 9 sampled grants but no evidence of fraud. The auditors recommended a new approval checklist.";
qHallu("hd-h-5","hard",AUDIT,["The audit reviewed every grant.","Documentation gaps were found in 9 sampled grants.","That is 15% of the sample.","The auditors found no evidence of fraud.","Fraud was confirmed in a small number of grants.","A new approval checklist was recommended."],[0,4],
  ["sampled 60","no evidence of fraud","15% is valid"],"Only 60 of 400 grants were sampled, and no fraud was found. 9 ÷ 60 = 15% is a valid inference.");
const TRIAGE="Riverside Hospital's new triage system was introduced in January. Median emergency waiting time fell from 4.1 to 3.4 hours over the next three months. Over the same period, patient numbers fell by 6%. The hospital says it is too early to know how much of the improvement is due to the new system.";
qHallu("hd-h-6","hard",TRIAGE,["The triage system started in January.","Median waits fell from 4.1 to 3.4 hours.","The new system caused the shorter waits.","Patient numbers also fell over the period.","Waiting times fell by 0.7 hours.","The hospital is confident the system explains the improvement."],[2,5],
  ["too early","caused","confident","0.7 is valid"],"The source says it's too early to attribute the improvement, so sentences 3 and 6 overstate certainty. 4.1 − 3.4 = 0.7 is valid.",[2,5]);
const PWD="A survey of 1,000 adults found that 48% use a password manager, up from 31% two years earlier. Among those who don't, the most common reason given was 'too complicated' (41%).";
qHallu("hd-h-7","hard",PWD,["Just under half of adults surveyed use a password manager.","Use rose by 17 percentage points in two years.","41% of all respondents said password managers are too complicated.","Password-manager users are less likely to be hacked.","The survey covered 1,000 adults.","Use more than doubled in two years."],[2,3,5],
  ["non-users","41% of non-users","not doubled","hacked not covered"],"The 41% is among non-users, not all respondents; hacking risk isn't covered; 31%→48% is not 'more than doubled'. 48−31 = 17 points is valid.");
const BOOK="The bookshop's sales rose 12% in December compared with November. Online orders made up 30% of December sales, up from 20% in November. The owner believes a local newspaper article helped, but has no data on this.";
qHallu("hd-h-8","hard",BOOK,["December sales were 12% higher than November's.","Online orders were 30% of December sales.","Online orders made up a larger share in December than in November.","The newspaper article caused the sales rise.","Online sales rose by 10%.","The owner has data showing the article's impact."],[3,4,5],
  ["no data","percentage points","share vs sales","caused"],"The article's effect is only a belief with no data; the share rose 10 percentage points, which isn't the same as online sales rising 10%; the owner has no data.",[3]);
qHallu("hd-h-9","hard",STUDY,["The trial was randomised.","It ran for about two months.","Walking reduced stress scores by 12% compared with a control group.","The results were measured objectively with sensors.","Walking had no significant effect on blood pressure.","Daily walking will reduce stress for anyone who tries it."],[3,5],
  ["self-reported","sensors","anyone","generalise"],"Measures were self-reported, not sensor-based; 'anyone who tries it' overgeneralises a 240-person trial. Eight weeks ≈ two months is valid.",[5]);
qHallu("hd-h-10","hard",FLOOD,["The defences cost $18 million.","The budget overrun was $3 million.","The river has exceeded flood level twice since 2023.","No homes were flooded on either occasion.","The defences have been tested by a 1-in-100-year flood.","Climate projections make future risk uncertain."],[4],
  ["designed for","not tested","exceeded flood level"],"The source says the defences are DESIGNED for a 1-in-100-year flood, not that such a flood has occurred.");

/* ---------- RESEARCH VERIFICATION ---------- */
const RV=(id,d,ref,claim,label,sig,model,x)=>qFact("research_verification",id,d,ref,claim,label,sig,model,x);
const MUSIC="A survey of 500 university students found that 70% study with music. Students who studied with music reported exam scores similar to those who did not.";
const COFFEE="In a lab study, 40 volunteers drank either coffee or water before a reaction-time test. The coffee group responded 30 milliseconds faster on average.";
const BIRDS="Researchers counted birds in Elm Park every spring from 2015 to 2024. Sparrow numbers fell by half over the period, while pigeon numbers stayed stable.";
const DESKS="A 12-week randomised trial of 160 office workers compared standing desks with normal desks. Standing-desk users sat for 60 fewer minutes per day. There was no significant difference in back pain or productivity.";
const BREAKFAST="An observational study of 2,000 adults found that people who ate breakfast daily had a lower average body weight than those who skipped breakfast. The authors note that breakfast eaters also exercised more.";
const MINDFUL="A meta-analysis of 18 studies (4,200 participants in total) found that mindfulness programmes reduced anxiety scores by a small-to-moderate amount on average. Effects were larger in studies without an active control group. The authors rated the overall evidence quality as low.";
const APP2="Two studies examined the same reading app. Study 1 (80 pupils, one school, no control group) reported a 15% improvement. Study 2 (600 pupils randomised across 20 schools) found a 2% improvement that was not statistically significant.";
/* Easy */
RV("rv-e-1","easy",STUDY,"In the trial, daily walking reduced stress scores.","Supported",["12%","stress","reduced"],"The trial reports a 12% reduction in self-reported stress.");
RV("rv-e-2","easy",STUDY,"The trial lasted about two months.","Supported",["eight weeks"],"Eight weeks is about two months.");
RV("rv-e-3","easy",MUSIC,"Most surveyed students study with music.","Supported",["70%","majority"],"70% is a majority.");
RV("rv-e-4","easy",MUSIC,"Studying with music improves exam scores.","Contradicted",["similar","no difference"],"Scores were similar with and without music.");
RV("rv-e-5","easy",MUSIC,"The survey included 500 students.","Supported",["500"],"The survey had 500 students.");
RV("rv-e-6","easy",COFFEE,"The study had 40 volunteers.","Supported",["40"],"The reference says 40 volunteers.");
RV("rv-e-7","easy",COFFEE,"The coffee group reacted faster on average.","Supported",["30 milliseconds","faster"],"They responded 30 ms faster on average.");
RV("rv-e-8","easy",BIRDS,"Sparrow numbers halved over the study period.","Supported",["fell by half"],"Sparrow numbers fell by half.");
RV("rv-e-9","easy",BIRDS,"Pigeon numbers rose during the study.","Contradicted",["stable"],"Pigeon numbers stayed stable.");
RV("rv-e-10","easy",BIRDS,"The birds were counted every autumn.","Contradicted",["spring"],"Counts were done every spring.");
/* Medium */
RV("rv-m-1","medium",STUDY,"The trial showed that daily walking lowers blood pressure.","Contradicted",["blood pressure","did not change"],"Blood pressure did not change significantly.");
RV("rv-m-2","medium",STUDY,"Stress was measured using heart-rate monitors.","Contradicted",["self-reported"],"The study relied on self-reported measures.");
RV("rv-m-3","medium",COFFEE,"Coffee makes people smarter.","Unsupported",["reaction time","intelligence","not measured"],"Only reaction time was measured, not intelligence.",{ flags:["unc"] });
RV("rv-m-4","medium",DESKS,"Standing desks reduced daily sitting time in the trial.","Supported",["60 fewer minutes"],"Standing-desk users sat 60 minutes less per day.");
RV("rv-m-5","medium",DESKS,"Standing desks reduced back pain.","Contradicted",["no significant difference"],"There was no significant difference in back pain.");
RV("rv-m-6","medium",DESKS,"The trial lasted three months.","Supported",["12 weeks"],"12 weeks is about three months.");
RV("rv-m-7","medium",DESKS,"The participants were factory workers.","Contradicted",["office workers"],"Participants were office workers.");
RV("rv-m-8","medium",BREAKFAST,"Breakfast eaters had a lower average body weight.","Supported",["lower average"],"The study reports exactly this association.");
RV("rv-m-9","medium",BREAKFAST,"Eating breakfast causes weight loss.","Unsupported",["observational","causation","exercise","confounder"],"An observational association, with exercise as a possible confounder, can't establish causation.",{ flags:["unc"] });
RV("rv-m-10","medium",BREAKFAST,"The study was a randomised trial.","Contradicted",["observational"],"It was observational.");
/* Hard */
RV("rv-h-1","hard",STUDY,"The results prove that walking reduces stress for everyone.","Unsupported",["240","prove","everyone","self-reported","generalise"],"One trial of 240 adults with self-reported measures can't prove an effect for everyone.",{ flags:["unc"] });
RV("rv-h-2","hard",STUDY,"Ten minutes of walking reduced stress more than yoga did.","Unsupported",["yoga","not compared","control group"],"The trial compared walking with a control group, not yoga.");
RV("rv-h-3","hard",MINDFUL,"Mindfulness programmes reduced anxiety scores on average.","Supported",["small-to-moderate","on average"],"The meta-analysis found a small-to-moderate average reduction.");
RV("rv-h-4","hard",MINDFUL,"The evidence for the effect is strong.","Contradicted",["evidence quality","low"],"The authors rated evidence quality as low.",{ flags:["unc"] });
RV("rv-h-5","hard",MINDFUL,"Studies with an active control group showed larger effects.","Contradicted",["without an active control","larger"],"Effects were larger in studies WITHOUT an active control.");
RV("rv-h-6","hard",MINDFUL,"Mindfulness works as well as medication for anxiety.","Unsupported",["medication","not compared"],"Medication isn't compared in this reference.");
RV("rv-h-7","hard",APP2,"The larger study found a statistically significant benefit.","Contradicted",["not statistically significant","study 2"],"Study 2 (the larger) found a non-significant 2% change.");
RV("rv-h-8","hard",APP2,"The evidence shows the app reliably improves reading by 15%.","Unsupported",["no control group","weaker study","randomised found 2%"],
  "The 15% figure comes only from the smaller, uncontrolled study; the stronger randomised study didn't confirm it.",{ flags:["unc"] });
RV("rv-h-9","hard",APP2,"Study 1 had no control group.","Supported",["no control group"],"The reference states this.");
RV("rv-h-10","hard",APP2,"The two studies reached the same conclusion.","Contradicted",["15%","2%","not significant"],"Study 1 reported 15% improvement; Study 2 found no significant improvement.");
})();
