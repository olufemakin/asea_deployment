// Day content for Sold-Out Launch Studio. {placeholders} are filled from the chosen business (businesses.js).
var DAYS = [
{
"set": "Pre-Launch Visibility",
"title": "Announce that something is coming",
"post": "Tell your audience you're working on something new for them. No details yet, just the who and the why.",
"stories": "Poll: \"Would you want this?\" Status: a blurred sneak peek.",
"action": "Update your bio and link so new visitors know what you do.",
"hook": "Something new is coming for {who}.",
"pts": [
"I've been quietly working on something.",
"It's built for anyone tired of {pain}.",
"I can't share everything yet, but I will soon."
],
"cta": "Want to be first to know? Comment ME.",
"status": "👀 Something new is coming… reply ME if you want first look.",
"shot": "Face to camera, then a blurred peek of what you're preparing.",
"pillar": "Customer problems",
"re": "\"Something new is coming for first-time buyers in [area].\""
},
{
"set": "Pre-Launch Visibility",
"title": "Get your circle talking",
"post": "Post a 'meet me / what I do' intro for new followers.",
"stories": "Ask friends & family to reshare. Status: \"Share this with one person who needs it.\"",
"action": "Message 10 friends personally and ask them to share your post.",
"hook": "If you don't know me yet, hi! 👋 Here's what I do.",
"pts": [
"I help {who}.",
"My {thing} are made so you can {want}.",
"Something new is on the way for you."
],
"cta": "Share this with one person who needs it.",
"status": "New here? I help {who}. Share my page with one friend who needs this 💛",
"shot": "Quick intro: your face, your workspace, your {thing}.",
"pillar": "Behind-the-scenes expertise",
"re": "Ask past clients and colleagues to reshare your intro."
},
{
"set": "Storytelling",
"title": "Share your 'why'",
"post": "Tell the story of why you started this business and who you do it for.",
"stories": "A throwback photo with one line about the moment you decided.",
"action": "Write your 3 key launch stories in your notes app to reuse.",
"hook": "Why I started selling {thing}.",
"pts": [
"It started with a problem I saw again and again: {pain}.",
"I knew there had to be a better way.",
"That's why everything I do is about helping you {want}."
],
"cta": "Tell me in the comments: what made you follow me?",
"status": "The story of why I started 💭 [your one-line why]. Full story on my page.",
"shot": "Old photo or early days, cutting to you today while {bts}.",
"pillar": "Lessons from experience",
"re": "Why you became an agent: the family you helped get their first keys."
},
{
"set": "Problem Awareness",
"title": "Name the problem",
"post": "Describe the struggle your audience faces daily, in their own words.",
"stories": "Question box: \"What's your biggest struggle with ___?\"",
"action": "Save every reply. These are your future captions.",
"hook": "Tired of {pain}?",
"pts": [
"You're not the only one.",
"Most people blame themselves, but it's usually not your fault.",
"There's a better way, and I'll show you this month."
],
"cta": "Comment 'ME TOO' if this is you.",
"status": "Be honest: are you tired of {pain}? Reply YES 👇",
"shot": "Point to on-screen text of the problem, nodding as you read it.",
"pillar": "Customer problems",
"re": "The stress of rent hikes, fake listings and agents who disappear."
},
{
"set": "Problem Awareness",
"title": "Make them feel seen",
"post": "Post 'the real reason you're still stuck isn't what you think.'",
"stories": "Quiz sticker: myth vs truth about the problem.",
"action": "Reply to every comment and DM from the last 3 days.",
"hook": "The real reason you're still dealing with {pain}.",
"pts": [
"It's not about trying harder.",
"It's about having the right solution and the right guidance.",
"That's exactly what I've been building for you."
],
"cta": "Save this so you remember it.",
"status": "Real talk: the reason it isn't working isn't you. More on my page 👀",
"shot": "Myth vs truth: two quick shots side by side.",
"pillar": "Myths and misconceptions",
"re": "\"The real reason you haven't bought yet isn't money. It's not knowing the process.\""
},
{
"set": "Authority Building",
"title": "Show you know your stuff",
"post": "Teach one quick, useful tip your audience can use today.",
"stories": "3-frame mini lesson. Status: the tip as one bold line.",
"action": "Pin your best value post to the top of your profile.",
"hook": "3 things to know before buying {thing}.",
"pts": [
"Tip 1: [your first tip]",
"Tip 2: [your second tip]",
"Tip 3: [your third tip]"
],
"cta": "Save this for later and share it with a friend.",
"status": "Quick tip before you buy {thing}: [one tip]. More on my page ✅",
"shot": "You demonstrating each tip while {bts}.",
"pillar": "Beginner education",
"re": "3 checks to do before paying for any property or land."
},
{
"set": "Community Building",
"title": "Open your community",
"post": "Invite people into a free WhatsApp group / broadcast / Close Friends list for launch updates.",
"stories": "Status with the join link: \"Insiders hear it first.\"",
"action": "Create the group, write the welcome message, and pin the rules.",
"hook": "I'm opening a free group for {who}.",
"pts": [
"Inside, you'll get tips, early updates and first access.",
"It's free, and it's where I'll share everything first.",
"Spots in the first group are limited to keep it personal."
],
"cta": "Comment GROUP and I'll send you the link.",
"status": "Join my free group for early updates & first access 👉 [link]",
"shot": "Screen recording of the group with a welcome message.",
"pillar": "Behind-the-scenes expertise",
"re": "\"Join my free property alerts group for early access to new listings.\""
},
{
"set": "Storytelling",
"title": "Share a lesson the hard way",
"post": "Post 'my journey, my mistakes, and what I learned.'",
"stories": "Behind-the-scenes of you working on the offer.",
"action": "Record a 30-second selfie video you can reuse on launch week.",
"hook": "A mistake I made when I started, so you don't have to.",
"pts": [
"[The mistake you made]",
"What it cost me: [what happened]",
"What I do now instead: [the lesson]"
],
"cta": "Have you made this mistake? Tell me below.",
"status": "Lesson learned the hard way 😅 [one line]. Story on my page.",
"shot": "Talking head, then cut to you {bts} the right way now.",
"pillar": "Lessons from experience",
"re": "A deal that nearly fell through, and what it taught you about due diligence."
},
{
"set": "Authority Building",
"title": "Prove it with a result",
"post": "Share a real result, before/after, or case study from your work.",
"stories": "Screenshot of real feedback (with permission).",
"action": "Ask 3 past customers if you can share their feedback.",
"hook": "This is what happens when {who} get the right help.",
"pts": [
"Before: [what it was like]",
"After: [what changed, the real result]",
"Shared with my client's permission. 🙏"
],
"cta": "Want results like this? Comment INFO.",
"status": "Real result from a real customer (shared with permission) 🙌 [screenshot]",
"shot": "Before/after or a real review on screen.",
"pillar": "Customer problems",
"re": "A real client you helped close, shared with their permission."
},
{
"set": "Waitlist Building",
"title": "Open the waitlist",
"post": "Announce the waitlist and what waitlisters get (early access, a perk).",
"stories": "Link sticker to the waitlist. Status: \"Reply WAITLIST and I'll add you.\"",
"action": "Set up the waitlist form or a WhatsApp broadcast list.",
"hook": "The waitlist is now open.",
"pts": [
"Something new is coming for {who}.",
"People on the waitlist get [your waitlist perk].",
"Joining is free and doesn't commit you to anything."
],
"cta": "Comment WAITLIST or tap the link in my bio.",
"status": "Waitlist is OPEN 🚨 Reply WAITLIST and I'll add you.",
"shot": "Show the waitlist page or a WhatsApp chat with 'WAITLIST'.",
"pillar": "Behind-the-scenes expertise",
"re": "\"Join the list to get first viewing slots before we go public.\""
},
{
"set": "Offer Positioning",
"title": "Introduce what's coming",
"post": "Explain what the offer is and the problem it solves. No price yet.",
"stories": "\"What's inside\" teaser frames.",
"action": "Write your offer one-liner: I help ___ get ___ without ___.",
"hook": "Here's what's coming…",
"pts": [
"It's made for {who}.",
"It helps you {want}.",
"Without {pain}."
],
"cta": "Join the waitlist to see it first.",
"status": "Sneak peek 👀 Something to help you {want}. Waitlist link on my page.",
"shot": "Teaser close-ups of your {thing}.",
"pillar": "Practical tutorials",
"re": "Introduce the property, estate or service: location, type, who it's for."
},
{
"set": "Problem Awareness",
"title": "Hit the pain point hard",
"post": "Post a problem story with a clear emotional trigger.",
"stories": "Poll: \"Have you ever ___?\"",
"action": "DM everyone who voted yes and start a real conversation.",
"hook": "Have you ever paid for something and regretted it?",
"pts": [
"Most people have dealt with {pain}.",
"It costs money, time and confidence.",
"You deserve better, and that's why I'm launching this."
],
"cta": "Comment YES if this has happened to you.",
"status": "Ever dealt with {pain}? 😩 Reply YES.",
"shot": "Reaction-style video reading a common complaint.",
"pillar": "Customer problems",
"re": "\"Paid a deposit and the agent vanished?\" Then your verification process."
},
{
"set": "Community Building",
"title": "Spark conversation",
"post": "Ask a question post that gets people talking.",
"stories": "Daily check-in in your group or Close Friends.",
"action": "Welcome every new community member by name.",
"hook": "Let's settle this… 👇",
"pts": [
"Question: [a fun question about your {thing}]",
"Option A: [answer A]",
"Option B: [answer B]"
],
"cta": "Vote in the comments: A or B?",
"status": "A or B? 🤔 [your question] Reply with your answer!",
"shot": "Show both options side by side and let viewers vote.",
"pillar": "Common mistakes",
"re": "\"Buy or keep renting? Tell me why\" in your property group."
},
{
"set": "Waitlist Building",
"title": "Waitlist perks & urgency",
"post": "Share exclusive perks for people on the waitlist.",
"stories": "Countdown sticker: waitlist closes soon.",
"action": "Send your waitlist a personal update message.",
"hook": "Waitlist members, this one's for you.",
"pts": [
"You'll get first access before anyone else.",
"You'll also get [your waitlist perk].",
"The waitlist closes soon."
],
"cta": "Not on the list yet? Comment WAITLIST.",
"status": "⏳ Waitlist perks: [perk]. Reply WAITLIST to join before it closes.",
"shot": "Countdown sticker plus a peek at the perk.",
"pillar": "Behind-the-scenes expertise",
"re": "Waitlist gets early viewing dates or a reservation window."
},
{
"set": "Offer Positioning",
"title": "Reveal the offer",
"post": "Full reveal: price, what's included, bonuses, and who it's for.",
"stories": "Swipe-through of everything they get.",
"action": "Prepare your payment link or booking process and test it.",
"hook": "It's finally here: everything you need to know.",
"pts": [
"What it is: [your offer]",
"What you get: [what's included]",
"Price: [your price]. Bonuses: [your bonuses]"
],
"cta": "Waitlist gets first access on launch day. Join now.",
"status": "The full reveal is on my page 🎉 [offer] · [price]",
"shot": "Swipe-style reveal of each part of the offer.",
"pillar": "Practical tutorials",
"re": "Reveal: price or payment plan, features, documents, inspection dates."
},
{
"set": "Social Proof",
"title": "Let others speak",
"post": "Share testimonials or real feedback (only real ones).",
"stories": "Repost customer stories and DMs (with permission).",
"action": "Collect any proof you don't have yet: ask, screenshot, save.",
"hook": "Don't just take my word for it.",
"pts": [
"\"[Real customer review]\": [name, with permission]",
"\"[Another real review]\"",
"Real words from real customers."
],
"cta": "Want to be next? Join the waitlist.",
"status": "What customers say 💬 \"[real review]\"",
"shot": "Screenshots of real reviews (permission given).",
"pillar": "Customer problems",
"re": "Real buyer or tenant feedback, shared with their permission."
},
{
"set": "Anticipation & Hype",
"title": "Behind the scenes",
"post": "Show the making-of: packing, filming, preparing.",
"stories": "A day-in-the-life of launch prep.",
"action": "Plan your launch-day posting times and set reminders.",
"hook": "Behind the scenes before launch.",
"pts": [
"This is me {bts}.",
"Every detail is checked before it gets to you.",
"Launch is almost here."
],
"cta": "Turn on post notifications so you don't miss launch day.",
"status": "Behind the scenes 🎬 {bts} for launch!",
"shot": "Day-in-the-life of launch prep.",
"pillar": "Behind-the-scenes expertise",
"re": "Site visit or inspection prep video."
},
{
"set": "Objection Handling",
"title": "\"What if…\" answers",
"post": "Answer the top 3 objections you keep hearing.",
"stories": "Question box: \"What's stopping you?\"",
"action": "Turn every objection into an FAQ reply you can paste.",
"hook": "\"What if…?\" Let me answer your questions.",
"pts": [
"What if it doesn't work for me? [your honest answer]",
"What if it's too expensive? [your answer]",
"What if I'm not ready? [your answer]"
],
"cta": "Got another question? Drop it below.",
"status": "Your questions answered 💬 [top question + answer]",
"shot": "Answer each question to camera, one per cut.",
"pillar": "Myths and misconceptions",
"re": "\"What if the documents aren't genuine?\" Explain your verification."
},
{
"set": "Waitlist Building",
"title": "Last call for the waitlist",
"post": "Remind people the waitlist gets in first.",
"stories": "Status: \"Last chance to get on the list.\"",
"action": "Message everyone who showed interest but hasn't joined.",
"hook": "Last chance to join the waitlist.",
"pts": [
"The waitlist closes [when].",
"Waitlist members get [your perk].",
"After that, you'll have to wait for public launch."
],
"cta": "Comment WAITLIST now.",
"status": "Last call ⏰ waitlist closes [when]. Reply WAITLIST.",
"shot": "Urgent energy: you holding up a clock or countdown.",
"pillar": "Behind-the-scenes expertise",
"re": "Final call for early viewing slots."
},
{
"set": "Anticipation & Hype",
"title": "The countdown begins",
"post": "Post '2 days to go' and build the hype.",
"stories": "Countdown sticker plus reminder.",
"action": "Prepare launch-day graphics, captions and DM replies.",
"hook": "2 days to go. 🚀",
"pts": [
"Everything is almost ready.",
"Here's a peek at what's coming.",
"Doors open [launch date and time]."
],
"cta": "Set a reminder and don't miss it.",
"status": "2 DAYS TO GO 🚀 Doors open [date/time].",
"shot": "Countdown graphic plus a quick peek at your {thing}.",
"pillar": "Behind-the-scenes expertise",
"re": "\"2 days to go: inspections open Saturday.\""
},
{
"set": "Anticipation & Hype",
"title": "Tomorrow is the day",
"post": "Post 'doors open tomorrow' with what to expect.",
"stories": "\"Turn on notifications\" frame. Status: \"Tomorrow!\"",
"action": "Send your waitlist an early-access link or time.",
"hook": "Tomorrow is the day!",
"pts": [
"Doors open tomorrow at [time].",
"Waitlist members get in first.",
"Here's exactly how to {buy}: [steps]."
],
"cta": "Turn on notifications and get ready.",
"status": "TOMORROW 🎉 [time]. Here's how to {buy}: [steps]",
"shot": "Excited face-to-camera message.",
"pillar": "Practical tutorials",
"re": "Tell the waitlist exactly when booking opens."
},
{
"set": "Launch Day",
"title": "LAUNCH DAY: doors open",
"post": "Open cart with a strong call to action. Post at your best time.",
"stories": "Go heavy: 5–8 frames through the day. Status every few hours.",
"action": "Go LIVE if you can, and reply to every DM within the hour.",
"hook": "IT'S LIVE! 🎉",
"pts": [
"It's here for {who}.",
"Here's what you get: [what's included].",
"Here's how to {buy}: [link or number]."
],
"cta": "Ready to {buy}? Tap the link or send me a DM now.",
"status": "WE'RE LIVE 🎉 Tap here to {buy}: [link]. DM me with any questions!",
"shot": "High energy: show the offer, then point to the link.",
"pillar": "Practical tutorials",
"re": "Bookings open: link, contact, inspection schedule."
},
{
"set": "Social Proof",
"title": "Celebrate early buyers",
"post": "Thank early buyers and share first reactions (with permission).",
"stories": "Repost buyer shoutouts and unboxings.",
"action": "Message every buyer personally to say thank you.",
"hook": "Thank you to everyone who has already joined! 🙏",
"pts": [
"The response has been amazing.",
"Here's what early buyers are saying: [real reactions, with permission]",
"Doors are still open."
],
"cta": "Want in? Tap the link before it closes.",
"status": "THANK YOU 🙏 [shoutouts with permission]. Still open: [link]",
"shot": "Screen recording of real messages or orders.",
"pillar": "Customer problems",
"re": "Celebrate first reservations or keys handed over (with permission)."
},
{
"set": "Objection Handling",
"title": "Clear the doubts",
"post": "Mid-cart objection post: price, time, 'is it for me?'",
"stories": "FAQ frames, one question per frame.",
"action": "Follow up with everyone who asked but didn't buy.",
"hook": "Still thinking about it? Let's clear things up.",
"pts": [
"Is it worth the price? [your honest answer]",
"Is it for me? [who it's for]",
"How does it work? [how it works]"
],
"cta": "DM me your question and I'll answer personally.",
"status": "Still deciding? 🤔 DM me your question. I'll answer personally.",
"shot": "Q&A-style quick cuts.",
"pillar": "Myths and misconceptions",
"re": "Payment plan, location and title questions answered."
},
{
"set": "Social Proof",
"title": "Proof keeps selling",
"post": "Share a strong testimonial or early win.",
"stories": "Screenshot carousel of real feedback.",
"action": "Ask happy buyers for a short video review.",
"hook": "Real results from real customers.",
"pts": [
"[Customer] said: \"[real feedback]\"",
"[What changed for them]",
"Shared with permission. 💛"
],
"cta": "You could be next. {buy} today.",
"status": "Another happy customer 💛 [real feedback] Still open: [link]",
"shot": "Customer video or review screenshot.",
"pillar": "Customer problems",
"re": "A buyer's walkthrough or a happy-client video."
},
{
"set": "Offer Positioning",
"title": "Spotlight one strong point",
"post": "Zoom in on the one feature or bonus people love most.",
"stories": "Bonus stack reminder.",
"action": "Check your stock or slots and update what's left (be truthful).",
"hook": "The one thing customers love most.",
"pts": [
"It's [your standout feature or bonus].",
"Here's why it matters: it helps you {want}.",
"You won't find this everywhere."
],
"cta": "Want it? {buy} before doors close.",
"status": "Customers' favourite part 😍 [feature]. {buy}: [link]",
"shot": "Close-up demo of the standout feature.",
"pillar": "Practical tutorials",
"re": "Spotlight: road access, security, amenities, or the payment plan."
},
{
"set": "Objection Handling",
"title": "\"This is NOT for you if…\"",
"post": "Post who it's not for, so the right people feel sure.",
"stories": "Poll: \"Is this for you?\"",
"action": "DM people who engaged this week with a soft check-in.",
"hook": "This is NOT for you if…",
"pts": [
"You want results without doing anything.",
"You're happy dealing with {pain}.",
"But if you're ready to {want}, it IS for you."
],
"cta": "Ready? {buy} now.",
"status": "Not for everyone ❌ but if you want to {want}, it's for you ✅ [link]",
"shot": "Two-column ❌/✅ text on screen.",
"pillar": "Myths and misconceptions",
"re": "\"Not for you if you want a quick flip with no paperwork.\""
},
{
"set": "Social Proof",
"title": "Before and after",
"post": "Show a transformation or case-study highlight.",
"stories": "Before/after frames.",
"action": "Plan your final-48-hours posts and reminders.",
"hook": "Before vs after.",
"pts": [
"Before: [the real before]",
"After: [the real after]",
"Real results, shared with permission."
],
"cta": "Want your own after? {buy} today.",
"status": "Before ➡️ After ✨ (real, shared with permission). [link]",
"shot": "Split-screen transition from before to after.",
"pillar": "Customer problems",
"re": "Land before vs. built, or an empty unit vs. a happy tenant."
},
{
"set": "Sell-Out & Urgency",
"title": "Final 24 hours",
"post": "\"Cart closes tomorrow\" post with clear urgency (only the real deadline).",
"stories": "Countdown sticker. Statuses every few hours.",
"action": "Go LIVE for a final Q&A and answer last-minute questions.",
"hook": "Final 24 hours. ⏰",
"pts": [
"Doors close [time and date].",
"After that, [what changes: price, bonus or availability].",
"If you've been waiting, this is your sign."
],
"cta": "{buy} now before it closes.",
"status": "⏰ FINAL 24 HOURS. Closes [time]. {buy}: [link]",
"shot": "Countdown with your face, calm but clear.",
"pillar": "Common mistakes",
"re": "\"Offer price or plan ends tomorrow at [time].\""
},
{
"set": "Sell-Out & Urgency",
"title": "Cart closes",
"post": "Last call, then a thank-you post when doors close.",
"stories": "Final countdown, then \"Doors closed, thank you!\"",
"action": "Close the cart on time and start a list for next time.",
"hook": "Doors close tonight. Thank you! 💛",
"pts": [
"This launch has been incredible because of you.",
"Last chance: [link] closes at [time].",
"If you missed it, join the list for next time."
],
"cta": "Last call. {buy} now or join the next waitlist.",
"status": "LAST CALL 🔔 Closes at [time] tonight. Thank you for everything 💛",
"shot": "Thank-you message to camera.",
"pillar": "Lessons from experience",
"re": "Close reservations; start a list for the next phase."
}
];
