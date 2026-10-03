// Contenu : anglais parlé du quotidien, niveau débutant.
// Dialogues : { them, fr, who? } = l'autre personne parle ;
//             { you, answers[] } = consigne en français + réponses acceptées (la première sert de modèle) ;
//             { you, free: true, examples[] } = réponse libre.

// Les personnages qu'on retrouve dans la messagerie. color = teinte de l'avatar.
import { MORE_CHARACTERS, MORE_SITUATIONS } from "./situations-more.js";
import { EXTRA_CHARACTERS, EXTRA_SITUATIONS } from "./situations-extra.js";

export const CHARACTERS = {
  jake: { name: "Jake", role: "Ton collègue", emoji: "💼", color: "#4C7DFF" },
  leo: { name: "Leo", role: "Un inconnu pressé", emoji: "🏃", color: "#FF8A3D" },
  sam: { name: "Sam", role: "Ton pote", emoji: "🍻", color: "#8B5CF6" },
  chloe: { name: "Chloe", role: "Rencontrée en soirée", emoji: "🎉", color: "#EC4899" },
  mia: { name: "Mia", role: "Barista", emoji: "☕", color: "#B7794B" },
  emma: { name: "Emma", role: "Vendeuse", emoji: "🛍️", color: "#14B8A6" },
  rosa: { name: "Rosa", role: "Une passante", emoji: "🗺️", color: "#22A06B" },
  ...MORE_CHARACTERS,
  ...EXTRA_CHARACTERS,
};

const BASE_SITUATIONS = [
  {
    id: "greetings",
    char: "jake",
    emoji: "👋",
    title: "Se saluer",
    intro: "« How are you? » ou « What's up? » ne sont pas de vraies questions : on répond en deux mots et on renvoie la question. Personne n'attend que tu racontes ta journée.",
    phrases: [
      { en: "Hey, what's up?", fr: "Salut, quoi de neuf ?", note: "Très courant entre amis et collègues. Réponse typique : « Not much. »", sounds: "Hey, wassup?" },
      { en: "Not much, you?", fr: "Pas grand-chose, et toi ?" },
      { en: "How's it going?", fr: "Comment ça va ?", note: "Plus détendu que « How are you? ».", sounds: "How's it goin'?" },
      { en: "Pretty good, thanks.", fr: "Plutôt bien, merci.", note: "« Pretty » = plutôt. Bien plus naturel que « I'm fine, thank you »." },
      { en: "Long time no see!", fr: "Ça fait longtemps !" },
      { en: "Good to see you!", fr: "Content(e) de te voir !" },
      { en: "Catch you later!", fr: "À plus !", note: "Variante très courante : « See ya! »", sounds: "Catch ya later!" },
      { en: "Take care!", fr: "Prends soin de toi !", note: "Pour dire au revoir gentiment, à un ami comme à un collègue." },
    ],
    dialogue: {
      title: "Tu croises un collègue dans la rue",
      turns: [
        { them: "Hey! How's it going?", fr: "Salut ! Comment ça va ?" },
        { you: "Réponds que ça va plutôt bien et renvoie la question.", answers: ["Pretty good, thanks. You?", "Pretty good, you?", "Pretty good, how about you?", "Pretty good, what about you?", "Good, you?"] },
        { them: "Not bad. Long time no see!", fr: "Pas mal. Ça fait longtemps !" },
        { you: "Dis que tu es content(e) de le voir.", answers: ["Good to see you!", "Yeah, good to see you!", "Great to see you!"] },
        { them: "You too! Anyway, I gotta run.", fr: "Toi aussi ! Bon, je dois filer. (gotta = got to)" },
        { you: "Dis-lui au revoir : à plus, prends soin de toi.", answers: ["Catch you later! Take care!", "See you later, take care!", "See ya, take care!"] },
      ],
    },
  },
  {
    id: "understand",
    char: "leo",
    emoji: "🤔",
    title: "Faire répéter",
    intro: "La phrase la plus utile quand on débute : dire qu'on n'a pas compris. Les natifs parlent vite et avalent les mots, c'est normal de demander.",
    phrases: [
      { en: "Sorry, what?", fr: "Pardon, quoi ?", note: "Court et très naturel. Plus poli que « What? » tout seul." },
      { en: "Come again?", fr: "Tu peux répéter ?", note: "Familier et très courant." },
      { en: "I didn't catch that.", fr: "Je n'ai pas saisi.", note: "« Catch » = attraper : je n'ai pas attrapé ce que tu as dit." },
      { en: "Could you say that again?", fr: "Tu pourrais redire ça ?" },
      { en: "Can you slow down a bit?", fr: "Tu peux ralentir un peu ?" },
      { en: "What do you mean?", fr: "Comment ça ? / Tu veux dire quoi ?" },
      { en: "What does that mean?", fr: "Ça veut dire quoi ?" },
      { en: "Sorry, I'm not from around here.", fr: "Désolé(e), je ne suis pas d'ici." },
    ],
    dialogue: {
      title: "Quelqu'un t'arrête dans la rue et parle très vite",
      turns: [
        { them: "Hey, d'you know if the forty-two stops around here?", fr: "Dis, tu sais si le 42 s'arrête par ici ? (d'you = do you)" },
        { you: "Dis que tu n'as pas saisi.", answers: ["Sorry, I didn't catch that.", "I didn't catch that.", "Sorry, what?", "Come again?"] },
        { them: "The bus! The forty-two! Does it stop here?", fr: "Le bus ! Le 42 ! Il s'arrête ici ?" },
        { you: "Demande-lui de ralentir un peu.", answers: ["Can you slow down a bit?", "Could you slow down a bit?", "Sorry, can you slow down a bit?"] },
        { them: "Oh, sorry! Does… the bus… stop… here?", fr: "Oh, pardon ! Est-ce que… le bus… s'arrête… ici ?" },
        { you: "Réponds que tu es désolé(e), tu n'es pas d'ici.", answers: ["Sorry, I'm not from around here.", "Sorry, I don't know, I'm not from around here.", "Sorry, I'm not from here."] },
        { them: "No worries, thanks anyway!", fr: "Pas de souci, merci quand même !" },
      ],
    },
  },
  {
    id: "reactions",
    char: "sam",
    emoji: "💬",
    title: "Réagir",
    intro: "Merci, pardon, la surprise… Ces petits mots reviennent dans toutes les conversations. Les placer au bon moment, c'est ce qui fait sonner « naturel ».",
    phrases: [
      { en: "Thanks a lot!", fr: "Merci beaucoup !" },
      { en: "No worries.", fr: "Pas de souci.", note: "Réponse à un merci ou à une excuse. On l'entend partout." },
      { en: "My bad.", fr: "Oups, c'est ma faute.", note: "Pour une petite erreur. Familier." },
      { en: "No way!", fr: "Sérieux ?! / Pas possible !", note: "Surprise, bonne ou mauvaise." },
      { en: "That's awesome!", fr: "C'est génial !", note: "Très américain. Au Royaume-Uni on dit aussi « Brilliant! »" },
      { en: "That sucks.", fr: "C'est nul / Pas de bol.", note: "Familier, pour compatir. Pas grossier, mais à éviter en réunion." },
      { en: "Sounds good.", fr: "Ça marche / Ça me va.", note: "Pour accepter une proposition." },
      { en: "Fair enough.", fr: "Ça se comprend / OK, c'est normal.", note: "Pour accepter l'argument de quelqu'un." },
    ],
    dialogue: {
      title: "Un ami te raconte sa semaine",
      turns: [
        { them: "Guess what? I got the job!", fr: "Devine quoi ? J'ai eu le boulot !" },
        { you: "Réagis : pas possible, c'est génial !", answers: ["No way! That's awesome!", "No way, that's awesome!", "That's awesome!"] },
        { them: "Thanks! But I start Monday, so I can't come on Saturday.", fr: "Merci ! Mais je commence lundi, donc je ne peux pas venir samedi." },
        { you: "Dis que ça se comprend.", answers: ["Fair enough.", "Oh, fair enough."] },
        { them: "Sorry, I know I promised…", fr: "Désolé, je sais que j'avais promis…" },
        { you: "Rassure-le : pas de souci.", answers: ["No worries.", "Oh, no worries.", "No worries, man."] },
        { them: "Let's grab a drink next week to celebrate?", fr: "On boit un verre la semaine prochaine pour fêter ça ?" },
        { you: "Accepte : ça marche.", answers: ["Sounds good!", "Yeah, sounds good!"] },
      ],
    },
  },
  {
    id: "meeting",
    char: "chloe",
    emoji: "🙂",
    title: "Faire connaissance",
    intro: "Pour se présenter, on reste simple : « Hi, I'm Alex » (presque jamais « My name is… »). Et on pose vite une question à l'autre.",
    phrases: [
      { en: "Nice to meet you.", fr: "Enchanté(e).", note: "Réponse : « Nice to meet you too » ou juste « You too »." },
      { en: "Where are you from?", fr: "Tu viens d'où ?" },
      { en: "I'm from France.", fr: "Je viens de France." },
      { en: "What do you do?", fr: "Tu fais quoi dans la vie ?", note: "Ça demande ton métier, pas ce que tu fais en ce moment." },
      { en: "How long have you been here?", fr: "Tu es là depuis combien de temps ?" },
      { en: "Just a few days.", fr: "Juste quelques jours." },
      { en: "Do you live around here?", fr: "Tu habites dans le coin ?" },
      { en: "What brings you here?", fr: "Qu'est-ce qui t'amène ici ?" },
    ],
    dialogue: {
      title: "Soirée chez des amis",
      turns: [
        { them: "Hey, I'm Chloe. I don't think we've met.", fr: "Salut, moi c'est Chloe. Je crois qu'on ne se connaît pas." },
        { you: "Dis enchanté(e), et que tu viens de France.", answers: ["Nice to meet you, I'm from France.", "Hi, nice to meet you! I'm from France."] },
        { them: "Oh cool! How long have you been here?", fr: "Oh cool ! Tu es là depuis combien de temps ?" },
        { you: "Réponds : juste quelques jours. Puis demande-lui si elle habite dans le coin.", answers: ["Just a few days. Do you live around here?", "Just for a few days. Do you live around here?"] },
        { them: "Yeah, just down the street. So, what do you do?", fr: "Ouais, juste en bas de la rue. Alors, tu fais quoi dans la vie ?" },
        { you: "Réponds avec ton métier.", free: true, examples: ["I'm a teacher.", "I work in IT.", "I'm a student."] },
        { them: "Oh, nice! Want a drink?", fr: "Ah, sympa ! Tu veux boire un truc ?" },
      ],
    },
  },
  {
    id: "coffee",
    char: "mia",
    emoji: "☕",
    title: "Au café",
    intro: "Pour commander, « I would like » est correct mais un peu formel. Dans la vraie vie, on dit plutôt « Can I get… ? » ou « I'll have… » : c'est direct, et c'est poli.",
    phrases: [
      { en: "Can I get a coffee, please?", fr: "Je pourrais avoir un café, s'il vous plaît ?", note: "La façon la plus courante de commander." },
      { en: "I'll have a latte.", fr: "Je vais prendre un latte." },
      { en: "For here or to go?", fr: "Sur place ou à emporter ?", note: "Au Royaume-Uni : « Eat in or take away? »" },
      { en: "To go, please.", fr: "À emporter, s'il vous plaît." },
      { en: "What size?", fr: "Quelle taille ?" },
      { en: "Medium, please.", fr: "Taille moyenne, s'il vous plaît." },
      { en: "That's it, thanks.", fr: "Ce sera tout, merci." },
      { en: "Do you take card?", fr: "Vous prenez la carte ?", note: "Tournure surtout britannique. Aux États-Unis : « Do you take credit cards? »" },
    ],
    dialogue: {
      title: "Tu commandes dans un café",
      turns: [
        { them: "Hi there! What can I get you?", fr: "Bonjour ! Qu'est-ce que je vous sers ?" },
        { you: "Demande un latte, s'il te plaît.", answers: ["Can I get a latte, please?", "I'll have a latte, please.", "Hi, can I get a latte, please?"] },
        { them: "Sure. What size?", fr: "Bien sûr. Quelle taille ?" },
        { you: "Moyen, s'il vous plaît.", answers: ["Medium, please.", "A medium, please."] },
        { them: "For here or to go?", fr: "Sur place ou à emporter ?" },
        { you: "À emporter.", answers: ["To go, please.", "To go, thanks."] },
        { them: "Anything else?", fr: "Autre chose ?" },
        { you: "Dis que c'est tout, et demande s'ils prennent la carte.", answers: ["That's it, thanks. Do you take card?", "No, that's it, thanks. Do you take card?"] },
        { them: "Yep, just tap here.", fr: "Oui, posez juste votre carte ici." },
      ],
    },
  },
  {
    id: "plans",
    char: "sam",
    emoji: "📱",
    title: "Faire des plans",
    intro: "Pour proposer une sortie, tout est raccourci : « Wanna…? » = « Do you want to…? ». Tu l'entendras partout, à l'oral comme par texto.",
    phrases: [
      { en: "Are you free tonight?", fr: "Tu es libre ce soir ?" },
      { en: "Wanna grab a drink?", fr: "Ça te dit d'aller boire un verre ?", note: "« Wanna » = want to. « Grab » = prendre, vite fait." },
      { en: "I'm down!", fr: "Je suis partant(e) !", note: "Très familier, très américain." },
      { en: "What time works for you?", fr: "Quelle heure t'arrange ?" },
      { en: "Let's say seven?", fr: "Disons 19 h ?" },
      { en: "I'm on my way.", fr: "J'arrive / Je suis en route." },
      { en: "I'm running late.", fr: "Je suis en retard." },
      { en: "Sorry, I can't make it.", fr: "Désolé(e), je ne peux pas venir." },
    ],
    dialogue: {
      title: "Un ami t'appelle",
      turns: [
        { them: "Hey! Are you free tonight?", fr: "Salut ! T'es libre ce soir ?" },
        { you: "Dis oui, et propose d'aller boire un verre.", answers: ["Yeah! Wanna grab a drink?", "Yes! Wanna grab a drink?", "Yeah, do you want to grab a drink?"] },
        { them: "I'm down! What time works for you?", fr: "Partant ! Quelle heure t'arrange ?" },
        { you: "Propose 19 h.", answers: ["Let's say seven?", "How about seven?"] },
        { them: "Perfect. See you there!", fr: "Parfait. On se voit là-bas !" },
        { them: "Hey, where are you?", fr: "(Plus tard, il t'appelle) Hé, t'es où ?" },
        { you: "Dis que tu es désolé(e) : tu es en retard, mais en route.", answers: ["Sorry, I'm running late. I'm on my way!", "I'm running late, I'm on my way."] },
      ],
    },
  },
  {
    id: "restaurant",
    char: "sam",
    emoji: "🍻",
    title: "Au resto",
    intro: "Aux États-Unis, le serveur passe souvent demander si tout va bien. L'addition se dit « the check » (US) ou « the bill » (UK).",
    phrases: [
      { en: "Table for two, please.", fr: "Une table pour deux, s'il vous plaît." },
      { en: "Can we see the menu?", fr: "On peut voir la carte ?", note: "« The menu » = la carte. Un menu à la française, c'est un « set menu »." },
      { en: "I'll have the burger.", fr: "Je vais prendre le burger." },
      { en: "Can I get some water?", fr: "Je pourrais avoir de l'eau ?" },
      { en: "Everything's great, thanks.", fr: "Tout est super, merci.", note: "Réponse à « How is everything? »" },
      { en: "Can we get the check?", fr: "On peut avoir l'addition ?", note: "Au Royaume-Uni : « Can we get the bill? »" },
      { en: "It's on me.", fr: "C'est moi qui invite." },
      { en: "Cheers!", fr: "Santé !", note: "Au Royaume-Uni, « Cheers » veut aussi dire « merci »." },
    ],
    dialogue: {
      title: "Dîner avec un ami",
      turns: [
        { who: "Serveur", them: "Hi guys! Are you ready to order?", fr: "Bonsoir ! Vous êtes prêts à commander ?" },
        { you: "Commande le burger et demande de l'eau.", answers: ["I'll have the burger. Can I get some water?", "I'll have the burger, and can I get some water, please?"] },
        { who: "Serveur", them: "Sure thing! … So, how is everything?", fr: "Pas de problème ! … Alors, tout se passe bien ?" },
        { you: "Dis que tout est super.", answers: ["Everything's great, thanks.", "Everything's great, thank you."] },
        { who: "Serveur", them: "Awesome. Can I get you anything else?", fr: "Super. Je vous apporte autre chose ?" },
        { you: "Demande l'addition.", answers: ["Can we get the check?", "Can we get the check, please?", "Can we get the bill, please?"] },
        { who: "Sam", them: "Let's split it.", fr: "On partage ?" },
        { you: "Dis que c'est toi qui invites.", answers: ["It's on me.", "No, it's on me."] },
      ],
    },
  },
  {
    id: "shopping",
    char: "emma",
    emoji: "🛍️",
    title: "En magasin",
    intro: "En boutique, les vendeurs viennent souvent te parler. « I'm just looking » est la phrase magique pour être tranquille.",
    phrases: [
      { en: "I'm just looking, thanks.", fr: "Je regarde, merci." },
      { en: "Do you have this in a medium?", fr: "Vous l'avez en M ?" },
      { en: "Where are the fitting rooms?", fr: "Où sont les cabines d'essayage ?" },
      { en: "How much is this?", fr: "C'est combien ?" },
      { en: "That's a bit pricey.", fr: "C'est un peu cher.", note: "« Pricey » = familier pour « expensive »." },
      { en: "I'll take it.", fr: "Je le prends." },
      { en: "Do you need a bag?", fr: "Vous voulez un sac ?" },
      { en: "No, I'm good, thanks.", fr: "Non, ça va, merci.", note: "« I'm good » = non merci. Super courant pour refuser poliment." },
    ],
    dialogue: {
      title: "Dans une boutique de vêtements",
      turns: [
        { them: "Hi! Can I help you find anything?", fr: "Bonjour ! Je peux vous aider à trouver quelque chose ?" },
        { you: "Dis que tu regardes juste.", answers: ["I'm just looking, thanks.", "Just looking, thanks."] },
        { them: "No problem! Let me know if you need anything.", fr: "Pas de souci ! Dites-moi si vous avez besoin de quelque chose." },
        { you: "Un peu plus tard : demande s'ils l'ont en M.", answers: ["Do you have this in a medium?", "Excuse me, do you have this in a medium?"] },
        { them: "Yep, here you go. The fitting rooms are over there.", fr: "Oui, tenez. Les cabines sont par là." },
        { you: "Tu as essayé, ça te va : dis que tu le prends.", answers: ["I'll take it.", "I'll take it, thanks."] },
        { them: "Great! Do you need a bag?", fr: "Super ! Vous voulez un sac ?" },
        { you: "Refuse poliment.", answers: ["No, I'm good, thanks.", "I'm good, thanks."] },
      ],
    },
  },
  {
    id: "directions",
    char: "rosa",
    emoji: "🗺️",
    title: "Demander son chemin",
    intro: "Les réponses sont souvent approximatives : « like five minutes », « just down the street ». À l'oral, « like » est partout et veut souvent dire « environ ».",
    phrases: [
      { en: "Excuse me, is there a pharmacy around here?", fr: "Excusez-moi, il y a une pharmacie dans le coin ?" },
      { en: "Is it far?", fr: "C'est loin ?" },
      { en: "It's like five minutes away.", fr: "C'est à genre cinq minutes." },
      { en: "Go straight.", fr: "Va tout droit." },
      { en: "Take a left.", fr: "Prends à gauche.", note: "À droite : « Take a right ». On dit aussi « Turn left »." },
      { en: "It's just down the street.", fr: "C'est juste un peu plus loin dans la rue." },
      { en: "You can't miss it.", fr: "Tu ne peux pas le rater." },
      { en: "Thanks, I appreciate it.", fr: "Merci, c'est sympa.", note: "Un « merci » un peu plus chaleureux." },
    ],
    dialogue: {
      title: "Tu cherches une pharmacie",
      turns: [
        { you: "Interpelle quelqu'un : demande s'il y a une pharmacie dans le coin.", answers: ["Excuse me, is there a pharmacy around here?", "Sorry, is there a pharmacy around here?"] },
        { them: "Yeah, there's one on Main Street.", fr: "Oui, il y en a une sur Main Street." },
        { you: "Demande si c'est loin.", answers: ["Is it far?", "Is it far from here?"] },
        { them: "Nah, it's like five minutes. Go straight, then take a left. You can't miss it.", fr: "Non, c'est à genre cinq minutes. Va tout droit, puis prends à gauche. Tu ne peux pas la rater." },
        { you: "Remercie chaleureusement.", answers: ["Thanks, I appreciate it.", "Thanks a lot, I appreciate it.", "Thanks a lot!"] },
        { them: "No worries!", fr: "Pas de souci !" },
      ],
    },
  },
  {
    id: "work",
    char: "jake",
    emoji: "💼",
    title: "Au boulot",
    intro: "Entre collègues anglophones, le ton est souvent détendu, même avec le chef. Les phrases courtes passent très bien.",
    phrases: [
      { en: "Got a sec?", fr: "T'as une seconde ?", note: "= « Have you got a second? »" },
      { en: "Quick question.", fr: "Petite question." },
      { en: "Let me check.", fr: "Je vérifie." },
      { en: "I'll get back to you.", fr: "Je te redis / Je reviens vers toi." },
      { en: "Can you give me a hand?", fr: "Tu peux me donner un coup de main ?" },
      { en: "No rush.", fr: "Rien ne presse." },
      { en: "I'm on it.", fr: "Je m'en occupe." },
      { en: "Have a good weekend!", fr: "Bon week-end !" },
    ],
    dialogue: {
      title: "Un collègue passe à ton bureau",
      turns: [
        { them: "Hey, got a sec? Quick question.", fr: "Hé, t'as une seconde ? Petite question." },
        { you: "Dis : bien sûr, qu'est-ce qu'il y a ?", answers: ["Sure, what's up?", "Yeah, sure. What's up?"] },
        { them: "Do you know when the report is due?", fr: "Tu sais pour quand est le rapport ?" },
        { you: "Dis que tu vérifies et que tu reviens vers lui.", answers: ["Let me check. I'll get back to you.", "I'm not sure, let me check. I'll get back to you."] },
        { them: "Thanks! No rush. Oh, and can you give me a hand with the slides later?", fr: "Merci ! Rien ne presse. Ah, et tu pourras me donner un coup de main avec les slides plus tard ?" },
        { you: "Accepte : pas de souci, je m'en occupe.", answers: ["No worries, I'm on it.", "Sure, I'm on it.", "No problem, I'm on it."] },
        { them: "You're the best. Have a good weekend!", fr: "T'es au top. Bon week-end !" },
        { you: "Souhaite-lui bon week-end aussi.", answers: ["You too!", "Thanks, you too!", "Have a good weekend!"] },
      ],
    },
  },
];

// Les chapitres, dans l'ordre où on les débloque. Ne pas renommer les ids : la progression y est liée.
export const CHAPTERS = [
  { id: "bases", emoji: "🌱", title: "Les bases", desc: "Saluer, comprendre, réagir",
    ids: ["greetings", "understand", "reactions", "meeting", "coffee", "directions", "shopping"] },
  { id: "sortir", emoji: "🚕", title: "Sortir et bouger", desc: "Restos, transports, santé",
    ids: ["plans", "restaurant", "bar", "transport", "hotel", "phone", "pharmacy", "doctor"] },
  { id: "vie", emoji: "🛒", title: "Vie pratique", desc: "Courses, sport, coiffeur, imprévus",
    ids: ["supermarket", "gym", "haircut", "emergency"] },
  { id: "discuter", emoji: "💬", title: "Discuter", desc: "Raconter, donner son avis",
    ids: ["weekend", "weather", "hobbies", "opinions", "anecdote", "feelings", "compliments", "jobtalk"] },
  { id: "series", emoji: "🎬", title: "Comme dans les séries", desc: "Les répliques qu'on entend partout",
    ids: ["series1", "series2"] },
  { id: "voyage", emoji: "✈️", title: "Voyage", desc: "Aéroport, avion, banque",
    ids: ["airport", "plane", "lostbag", "bank"] },
  { id: "boulot", emoji: "🏠", title: "Boulot et maison", desc: "Collègues, coloc, livraisons",
    ids: ["work", "lunch", "videocall", "swamped", "delivery", "chores", "slang"] },
  { id: "carriere", emoji: "💼", title: "Carrière", desc: "Entretien, réseau, clients",
    ids: ["interview", "networking", "client"] },
];

const ALL = [...BASE_SITUATIONS, ...MORE_SITUATIONS, ...EXTRA_SITUATIONS];
export const SITUATIONS = CHAPTERS.flatMap((ch) =>
  ch.ids.map((id) => ({ ...ALL.find((s) => s.id === id), chapter: ch.id }))
);

export function getChapter(id) {
  return CHAPTERS.find((c) => c.id === id);
}

export function getSituation(id) {
  return SITUATIONS.find((s) => s.id === id);
}

export function phraseId(sitId, index) {
  return `${sitId}:${index}`;
}

export function getPhrase(id) {
  const [sitId, i] = id.split(":");
  const sit = getSituation(sitId);
  const p = sit && sit.phrases[Number(i)];
  return p ? { ...p, id, sit } : null;
}
