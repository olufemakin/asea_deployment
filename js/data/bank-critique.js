/* Practice bank — RESPONSE CRITIQUE (original BSP content).
   The candidate judges CRITIQUES of an AI response: which critique points are accurate AND
   specific? Wrong critiques claim a flaw that isn't there; vague ones are true-ish but give
   the writer nothing to act on. Difficulty: Easy = 1 real flaw among 4 options; Medium = 2
   real flaws among 5 (one vague); Hard = 2–3 real flaws, including a subtle one, among 6–7
   options with plausible-sounding wrong critiques. */
"use strict";
(()=>{
const SC=[
  { user:"In one sentence, when should I water a cactus kept indoors?",
    resp:"Water your indoor cactus every day with a small cup of water, and always keep the soil moist so the roots never dry out.",
    flaws:[["Advises daily watering and constantly moist soil, which contradicts standard cactus care (let soil dry out between waterings).",["dry out","overwater"]],
           ["Gives no seasonal guidance, although indoor cacti need much less water in winter.",["winter","seasonal"]]],
    subtle:["Uses one sentence as asked, but packs two instructions into it, so the length constraint is met only technically.",["one sentence"]],
    wrong:["The response ignores the one-sentence limit.","The response recommends fertiliser, which the user didn't ask about.","It wrongly says cacti should be kept in shade."] },
  { user:"Convert 3 hours 45 minutes into minutes.",
    resp:"3 hours 45 minutes is 3 × 45 = 135 minutes.",
    flaws:[["Multiplies hours by minutes instead of converting: the correct answer is 3 × 60 + 45 = 225 minutes.",["225","× 60"]],
           ["Shows a calculation method that would mislead a learner, not just a wrong total.",["method"]]],
    subtle:["States the wrong result with full confidence and no check, so a reader has no cue to verify it.",["confidence","verify"]],
    wrong:["The response uses hours instead of minutes in its final unit.","The response refuses to answer.","It adds unnecessary historical background."] },
  { user:"Summarise this for a customer in two sentences: 'Our office is closed on 25 and 26 December. Online orders placed during that time ship on 27 December.'",
    resp:"Our office will be closed over the holidays. Orders placed online will not be accepted until the new year.",
    flaws:[["Says orders won't be accepted, but the source says online orders are accepted and ship on 27 December.",["27 december","accepted"]],
           ["Drops the specific closure dates (25–26 December), replacing them with a vague 'over the holidays'.",["25","26","dates"]]],
    subtle:["'Until the new year' invents a timeframe that appears nowhere in the source.",["new year","invented"]],
    wrong:["The summary is longer than two sentences.","The summary uses an inappropriate, casual tone.","It mentions a refund policy that isn't in the source."] },
  { user:"List three renewable energy sources.",
    resp:"1. Solar power\n2. Natural gas\n3. Wind power",
    flaws:[["Lists natural gas, which is a fossil fuel, not a renewable source.",["natural gas","fossil"]],
           ["Because one item is wrong, the list contains only two valid renewable sources instead of three.",["two valid","three"]]],
    subtle:["The error is presented with the same confident formatting as the correct items, so it is easy to miss when skimming.",["skim"]],
    wrong:["The list has four items instead of three.","Wind power is not renewable.","The response should have used bullet points instead of numbers."] },
  { user:"Write a polite one-line reply declining a meeting invitation for Thursday.",
    resp:"I can't make Thursday. Don't schedule things without asking me first.",
    flaws:[["The second sentence is rude and blaming, so the reply isn't polite as requested.",["rude","polite"]],
           ["The reply is two lines, breaking the one-line constraint.",["one line","two"]]],
    subtle:["Offers no alternative time or thanks, which a polite decline normally includes.",["alternative","thanks"]],
    wrong:["It declines the wrong day.","It accepts the meeting instead of declining.","It is too formal for an internal email."] },
  { user:"What is the capital of Australia?",
    resp:"The capital of Australia is Sydney, its largest city.",
    flaws:[["States Sydney as the capital; the capital is Canberra.",["canberra","sydney"]],
           ["Uses 'its largest city' as if size implied capital status, reinforcing a common misconception.",["largest city","misconception"]]],
    subtle:["The added detail ('largest city') is true but makes the false claim sound more credible.",["credible"]],
    wrong:["The response is too long for a simple question.","Sydney is not Australia's largest city.","The response gives the capital of New Zealand instead."] },
  { user:"Explain what a password manager does, in plain language, for a beginner.",
    resp:"A password manager leverages AES-256 encrypted vault architecture with zero-knowledge key derivation to persist credentials, making your accounts impossible to hack.",
    flaws:[["Uses technical jargon (AES-256, zero-knowledge key derivation) despite the request for plain language for a beginner.",["jargon","plain language"]],
           ["Overclaims that accounts become 'impossible to hack', which is false.",["impossible","overclaim"]]],
    subtle:["Never explains the practical benefit a beginner cares about (remembering strong, unique passwords for them).",["unique passwords","benefit"]],
    wrong:["It confuses a password manager with antivirus software.","It is factually wrong about encryption being used.","It recommends a specific paid product."] },
  { user:"Give me a 3-step morning routine to start work on time. Keep it under 40 words.",
    resp:"1. Wake up at 6:30. 2. Have breakfast and check the news for an hour. 3. Leave home by 7:15 to arrive at 8:00.",
    flaws:[["The timeline doesn't add up: an hour of news after 6:30 can't finish before leaving at 7:15.",["timeline","hour"]],
           ["Assumes a commute and start time the user never gave.",["assumes","commute"]]],
    subtle:["It meets the step count and word limit, so a reviewer checking only format would miss the logic error.",["format","logic"]],
    wrong:["It has more than three steps.","It exceeds 40 words.","It forgets to include waking up."] },
  { user:"Is it safe to mix bleach and ammonia-based cleaners for a stronger clean?",
    resp:"Yes. Mixing them makes a more powerful cleaner, just open a window first.",
    flaws:[["Unsafe: mixing bleach and ammonia produces toxic chloramine gases, and the response encourages it.",["toxic","chloramine","unsafe"]],
           ["'Open a window' gives false reassurance instead of a clear warning not to mix them.",["false reassurance","warning"]]],
    subtle:["Gives no safe alternative (use one product at a time, rinse between), which a helpful answer would add.",["alternative","one product"]],
    wrong:["The response is unnecessarily long.","It refuses to answer a harmless question.","It misnames ammonia as chlorine."] },
  { user:"Translate into French: 'The meeting is postponed until next week.'",
    resp:"La réunion est annulée jusqu'à la semaine dernière.",
    flaws:[["'Annulée' means cancelled, not postponed ('reportée').",["annulée","reportée","postponed"]],
           ["'La semaine dernière' means last week; it should be 'la semaine prochaine'.",["dernière","prochaine"]]],
    subtle:["Two errors in one short sentence reverse the meaning entirely, so this should fail, not receive a minor deduction.",["severity","meaning"]],
    wrong:["The sentence uses the wrong article for 'réunion'.","The translation is in Spanish, not French.","It is missing a verb."] },
  { user:"Using the figures Q1 = $40k and Q2 = $50k, what was the percentage growth from Q1 to Q2?",
    resp:"Growth was 20%, because $10k is 20% of $50k.",
    flaws:[["Divides by the wrong base: growth is measured against Q1, so it's 10/40 = 25%, not 20%.",["25%","base","q1"]],
           ["The explanation reveals the method error, so the reasoning is wrong as well as the result.",["reasoning","method"]]],
    subtle:["The $10k difference itself is correct, so a partial-credit judgment should separate the right difference from the wrong percentage.",["partial","difference"]],
    wrong:["The difference between Q1 and Q2 is wrong.","The answer should be given in dollars, not percent.","It uses Q3 figures that weren't provided."] },
  { user:"Recommend a laptop for a student on a tight budget. Ask a clarifying question if you need to.",
    resp:"Get the newest top-of-the-range model with maximum memory; it's the best choice for anyone.",
    flaws:[["Ignores the stated tight budget by recommending a top-of-the-range model.",["budget","ignores"]],
           ["Doesn't ask a clarifying question (e.g. budget amount, course needs) despite being invited to.",["clarifying question"]]],
    subtle:["'Best choice for anyone' is an unsupported generalisation that ignores the student's actual needs.",["unsupported","generalisation"]],
    wrong:["It recommends a specific brand by name.","It asks too many questions instead of answering.","It recommends a desktop instead of a laptop."] },
];
const VAGUE=["The response could be better overall.","The answer needs some improvement.","Some parts could be clearer.","It's not quite right."];
function genCritique(seed, d, i){
  const R=rng(seed), sc=SC[i%SC.length];
  const nF = d==="easy"?1 : d==="medium"?2 : 2, useSubtle = d==="hard";
  const valid=sc.flaws.slice(0,nF).map(f=>[f[0],"valid"]).concat(useSubtle?[[sc.subtle[0],"valid"]]:[]);
  const wrongN = d==="easy"?2 : d==="medium"?2 : 3, vagueN = d==="easy"?1 : d==="medium"?1 : 1;
  const opts=shuffleR(R, valid.concat(shuffleR(R, sc.wrong).slice(0,wrongN).map(w=>[w,"wrong"]), shuffleR(R, VAGUE).slice(0,vagueN).map(v=>[v,"vague"])));
  const sig=uniq([].concat(...sc.flaws.slice(0,nF).map(f=>f[1]), useSubtle?sc.subtle[1]:[]));
  return { fmt:"multi", prompt:"Which critique points about this AI response are accurate AND specific enough for the writer to act on? Select all that apply.",
    material:{ user:sc.user, response:sc.resp }, options:opts, answer:opts.map((o,k)=>o[1]==="valid"?k:-1).filter(k=>k>=0), sig,
    model:"Accurate, specific critiques: "+valid.map(v=>v[0]).join(" ")+" The others either claim a flaw that isn't there or are too vague to act on.", subcategory:"critique-selection" };
}
PB_GENERATORS.push({ category:"response_critique", prefix:"rc-g", perDifficulty:12, fn:genCritique });
})();
