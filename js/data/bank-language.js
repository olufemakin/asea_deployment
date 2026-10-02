/* Practice bank — FRENCH-ENGLISH EVALUATION, MULTILINGUAL EVALUATION, TRANSCRIPTION
   (original BSP content). Easy: obvious meaning slips or clean translations. Medium: register,
   omissions, faux amis, agreement. Hard: modality, idiom, subtle faux amis, competing translations. */
"use strict";
(()=>{
const focusOf=a=>["accurate","meaning","grammar","register","meaning"][a];
const T=(category, prompt)=>(id,d,dir,src,tr,a,model)=>qSingle(category,id,d,prompt,{ direction:dir, source:src, translation:tr },TQ,a,
  ["meaning","sens","grammar","register","omission","accurate"],model,{ focus:focusOf(a) });
const FE=T("french_english_evaluation","How would you classify this translation?");
const ML=T("multilingual_evaluation","How would you classify this translation?");

/* ---------- FRENCH-ENGLISH · EASY ---------- */
FE("fe-e-1","easy","English → French","Thank you for your patience.","Merci de votre patience.",0,"Accurate and polite.");
FE("fe-e-2","easy","French → English","Je suis en retard.","I am early.",1,"'En retard' means late, so the meaning is reversed.");
FE("fe-e-3","easy","English → French","Good evening.","Bonsoir.",0,"Accurate.");
FE("fe-e-4","easy","French → English","J'ai deux chats.","I have two dogs.",1,"'Chats' are cats, not dogs.");
FE("fe-e-5","easy","English → French","The shop is closed.","Le magasin est fermé.",0,"Accurate.");
FE("fe-e-6","easy","French → English","Il fait froid aujourd'hui.","It is hot today.",1,"'Froid' means cold.");
FE("fe-e-7","easy","English → French","I like apples and pears.","J'aime les pommes.",4,"'Et les poires' (and pears) is missing.");
FE("fe-e-8","easy","French → English","Où est la gare ?","Where is the station?",0,"Accurate.");
FE("fe-e-9","easy","English → French","She is tall.","Elle est grand.",2,"Agreement error: 'grande' (feminine).");
FE("fe-e-10","easy","French → English","Nous habitons à Lyon.","We live in Lyon.",0,"Accurate.");
/* ---------- MEDIUM ---------- */
FE("fe-m-1","medium","English → French","I'm excited to announce our new product.","Je suis excité d'annoncer notre nouveau produit.",3,"'Excité' has unwanted connotations in a professional context; use 'ravi' or 'heureux'.");
FE("fe-m-2","medium","English → French","The office will be closed on Monday.","L'office sera clos lundi.",1,"'Office' is a false friend here; the right word is 'bureau': 'Le bureau sera fermé lundi'.");
FE("fe-m-3","medium","French → English","Ne pas dépasser la dose prescrite.","Do not take the prescribed dose.",1,"It should be 'Do not exceed the prescribed dose.' A critical, safety-relevant meaning change.");
FE("fe-m-4","medium","English → French (email to a client)","Could you send me the invoice?","Tu peux m'envoyer la facture ?",3,"'Tu' is too familiar for a client; use 'Pourriez-vous m'envoyer la facture ?'.");
FE("fe-m-5","medium","English → French","The library is next to the bank.","La librairie est à côté de la banque.",1,"'Librairie' is a bookshop; a library is a 'bibliothèque'.");
FE("fe-m-6","medium","French → English","Il a raté son train.","He missed his train.",0,"Accurate.");
FE("fe-m-7","medium","English → French","Please confirm your attendance by Friday.","Veuillez confirmer votre présence d'ici vendredi.",0,"Accurate and appropriately formal.");
FE("fe-m-8","medium","French → English","Nous avons reçu votre candidature et nous vous contacterons sous peu.","We have received your application.",4,"'…and we will contact you shortly' is missing.");
FE("fe-m-9","medium","French → English","Je suis à la recherche d'un emploi.","I am in the search of an employ.",2,"Ungrammatical English: 'I am looking for a job'.");
FE("fe-m-10","medium","English → French","We received your message yesterday.","Nous avons reçu votre message demain.",1,"'Demain' means tomorrow; it should be 'hier'.");
/* ---------- HARD ---------- */
FE("fe-h-1","hard","English → French","The documents were sent yesterday.","Les documents ont été envoyé hier.",2,"Agreement error: 'envoyés' (masculine plural, passive).");
FE("fe-h-2","hard","English → French","Please find attached the invoice and the contract.","Veuillez trouver ci-joint la facture.",4,"'Et le contrat' is missing.");
FE("fe-h-3","hard","French → English","Je vous en prie.","I beg you.",1,"In this context it means 'You're welcome'. The literal translation changes the meaning.");
FE("fe-h-4","hard","English → French","The contract may be terminated with 30 days' notice.","Le contrat doit être résilié avec un préavis de 30 jours.",1,"'May' (peut) became 'must' (doit): a modality change with legal consequences.");
FE("fe-h-5","hard","French → English","Je vous saurais gré de bien vouloir me répondre rapidement.","I would know you to respond quickly.",1,"It means 'I would be grateful if you could reply promptly'.");
FE("fe-h-6","hard","English → French","Eventually, the team agreed.","Éventuellement, l'équipe a accepté.",1,"'Éventuellement' means 'possibly'; 'eventually' is 'finalement'.");
FE("fe-h-7","hard","French → English","Il n'est pas sans savoir que le délai est dépassé.","He doesn't know that the deadline has passed.",1,"'N'est pas sans savoir' means he is well aware; the translation reverses it.");
FE("fe-h-8","hard","English → French","The results, which we analysed, are promising.","Les résultats, que nous avons analysé, sont prometteurs.",2,"Past participle agreement with a preceding direct object: 'analysés'.");
qRank("french_english_evaluation","fe-h-9","hard","Translate into French: 'Our team will get back to you shortly.'",
  "Notre équipe va revenir à vous bientôt.","Notre équipe vous recontactera dans les plus brefs délais.",2,{acc:"B",cla:"B"},
  ["calque","revenir à vous","recontacter","naturel"],"A is a literal calque ('revenir à vous' is unnatural). B is natural, professional French. B is much better.",{ focus:"meaning" });
qRank("french_english_evaluation","fe-h-10","hard","Translate into English: 'Veuillez noter que le bureau sera fermé lundi en raison du jour férié.'",
  "Please note that the office will be closed on Monday due to the public holiday.","Please note the office will be closed Monday because of the bank holiday.",0,{acc:"T"},
  ["both accurate","tie","public holiday","bank holiday","regional"],"Both are accurate and natural; 'bank holiday' is regional (UK). Tie, or a slight preference with a stated audience, is reasonable.",{ focus:"register" });
qRank("french_english_evaluation","fe-h-11","hard","Translate into French: 'We look forward to hearing from you.'",
  "Nous attendons avec impatience de vous entendre.","Dans l'attente de votre réponse, nous vous prions d'agréer nos salutations distinguées.",2,{acc:"B",cla:"B"},
  ["calque","entendre","formule","naturel","register"],"A is a word-for-word calque that sounds wrong in French. B uses the standard formal closing. B is much better.",{ focus:"register" });

/* ---------- MULTILINGUAL ---------- */
ML("ml-e-1","easy","English → Spanish","Thank you for your order.","Gracias por su pedido.",0,"Accurate and polite.");
ML("ml-e-2","easy","English → Spanish","The store opens at 9am.","La tienda cierra a las 9.",1,"'Cierra' means closes; the meaning is reversed.");
ML("ml-e-3","easy","English → German","Good morning.","Guten Morgen.",0,"Accurate.");
ML("ml-e-4","easy","English → Italian","I like coffee.","Mi piace il tè.",1,"'Tè' is tea, not coffee.");
ML("ml-e-5","easy","English → Portuguese","Where is the hotel?","Onde fica o hotel?",0,"Accurate.");
ML("ml-e-6","easy","English → Spanish","I have a red car.","Tengo un coche.",4,"'Rojo' (red) is missing.");
ML("ml-e-7","easy","English → German","The meeting is on Monday.","Das Treffen ist am Montag.",0,"Accurate.");
ML("ml-e-8","easy","English → Italian","The museum is closed today.","Il museo è aperto oggi.",1,"'Aperto' means open.");
ML("ml-e-9","easy","English → Spanish","Two coffees, please.","Dos cafés, por favor.",0,"Accurate.");
ML("ml-e-10","easy","English → Portuguese","We are tired.","Nós estamos cansado.",2,"Agreement error: 'cansados'.");
ML("ml-m-1","medium","English → German (business email)","Please send me the report tomorrow.","Bitte schick mir morgen den Bericht, Alter!",3,"'Alter' is casual slang and 'du' is too familiar for a business request.");
ML("ml-m-2","medium","English → Italian","I have two brothers and a sister.","Ho due fratelli.",4,"'E una sorella' is missing.");
ML("ml-m-3","medium","English → Spanish (formal customer email)","We would be grateful if you could confirm your booking.","Confírmame la reserva, porfa.",3,"Far too casual for a formal customer email.");
ML("ml-m-4","medium","English → Spanish","I'm embarrassed.","Estoy embarazada.",1,"False friend: 'embarazada' means pregnant. 'Embarrassed' is 'avergonzado/a'.");
ML("ml-m-5","medium","English → German","The gift is for you.","Das Gift ist für dich.",1,"False friend: 'Gift' means poison in German. A gift is 'das Geschenk'.");
ML("ml-m-6","medium","English → Italian","Our offices are in Rome and Milan.","I nostri uffici sono a Roma e Milano.",0,"Accurate.");
ML("ml-m-7","medium","English → Portuguese","She speaks three languages.","Ela fala três línguas.",0,"Accurate.");
ML("ml-m-8","medium","English → Spanish","The children are playing in the park.","Los niños está jugando en el parque.",2,"Agreement error: 'están'.");
ML("ml-m-9","medium","English → German","We look forward to working with you, and thank you for your trust.","Wir freuen uns auf die Zusammenarbeit.",4,"The thanks ('und vielen Dank für Ihr Vertrauen') is missing.");
ML("ml-m-10","medium","English → Italian (formal letter)","Dear Sir or Madam,","Ciao a tutti,",3,"'Ciao a tutti' is informal; use 'Gentile Signore/Signora' or 'Spettabile…'.");
ML("ml-h-1","hard","English → Portuguese","She is a doctor.","Ela é um médica.",2,"Gender agreement: 'uma médica'.");
ML("ml-h-2","hard","English → Spanish","Actually, I disagree.","Actualmente, no estoy de acuerdo.",1,"False friend: 'actualmente' means currently; 'actually' is 'en realidad'.");
ML("ml-h-3","hard","English → German","The deadline cannot be extended.","Die Frist kann verlängert werden.",1,"The negation is lost: it now says the deadline CAN be extended.");
ML("ml-h-4","hard","English → Italian","The patient should not exceed two tablets a day.","Il paziente non deve superare due compresse al giorno.",0,"Accurate, including the negation.");
ML("ml-h-5","hard","English → Spanish","Please find attached the invoice and the delivery note.","Adjunto le envío la factura.",4,"'Y el albarán' (and the delivery note) is missing.");
ML("ml-h-6","hard","English → Portuguese","I intend to travel next month.","Eu pretendo viajar no próximo mês.",0,"Accurate: in Portuguese, 'pretender' means 'to intend' (it isn't a false friend here).");
ML("ml-h-7","hard","English → German (formal email)","Could you possibly send it by Friday?","Kannst du es bis Freitag schicken?",3,"'Du' is too familiar for a formal email; use 'Könnten Sie…'.");
ML("ml-h-8","hard","English → Italian","The results were better than expected.","I risultati erano peggiori del previsto.",1,"'Peggiori' means worse.");
ML("ml-h-9","hard","English → Spanish","If I had known, I would have come.","Si lo hubiera sabido, habría venido.",0,"Accurate conditional.");
ML("ml-h-10","hard","English → German","The children's books are on the table.","Die Kinderbücher liegt auf dem Tisch.",2,"Verb agreement: 'liegen' (plural).");

/* ---------- TRANSCRIPTION (spoken with browser text-to-speech) ---------- */
const TX=(id,d,t)=>qTranscribe("transcription",id,d,t,{ prompt: d==="easy" ? "Type exactly what you hear." : "Type exactly what you hear. Write numbers as words." });
["Please close the door behind you.","The bus leaves at noon.","I would like a glass of water.","We need more paper for the printer.","The park is open until sunset.",
 "Call me when you arrive.","Please send the invoice to the finance team.","Our new office is next to the train station.","Thank you for calling customer support.","The coffee machine is on the second floor."]
  .forEach((t,i)=>TX("tx-e-"+(i+1),"easy",t));
["The meeting starts at nine thirty tomorrow morning.","The package weighs four point five kilograms.","Remember to back up your files every Friday.","The quarterly report shows a twelve percent increase.",
 "Turn left at the second traffic light.","Doctor Patel will see you at three fifteen.","Our flight to Montreal departs from gate twenty two.","Please confirm the order by the end of the day on Thursday.",
 "The total comes to forty eight dollars and fifty cents.","Ms Okafor joined the team in September."].forEach((t,i)=>TX("tx-m-"+(i+1),"medium",t));
["Their engineers reviewed the bridge's design last November.","Whether the weather improves, we'll proceed regardless.","The pharmacist confirmed the dosage on the prescription.","Schedule the follow-up appointment for the fourteenth.",
 "They're bringing their own chairs over there.","The principal explained the school's new principle on attendance.","It's important that the team reviews its priorities.","Two of the four samples were too warm to test.",
 "The site will cite the source on its homepage.","We accepted every proposal except the last one."].forEach((t,i)=>TX("tx-h-"+(i+1),"hard",t));
})();
