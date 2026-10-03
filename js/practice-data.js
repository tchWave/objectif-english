// Contenu de l'onglet « S'entraîner » : histoires audio et sons difficiles.

// Histoires : débloquées quand la situation `unlock` est terminée.
// Dans chaque question, la première option est la bonne (l'ordre est mélangé à l'affichage).
export const STORIES = [
  {
    id: "monday",
    char: "jake",
    unlock: "greetings",
    title: "Lundi matin",
    lines: [
      { en: "It's Monday morning. Jake is at the office, and he's a little tired.", fr: "C'est lundi matin. Jake est au bureau, et il est un peu fatigué." },
      { en: "His colleague Lisa walks in. \"Hey Jake! How's it going?\"", fr: "Sa collègue Lisa arrive. « Salut Jake ! Comment ça va ? »" },
      { en: "\"Not bad, thanks. You?\"", fr: "« Pas mal, merci. Et toi ? »" },
      { en: "\"Pretty good! How was your weekend?\"", fr: "« Plutôt bien ! C'était comment ton week-end ? »" },
      { en: "\"Pretty chill. I just stayed home and slept a lot.\"", fr: "« Plutôt tranquille. Je suis juste resté chez moi et j'ai beaucoup dormi. »" },
      { en: "Lisa laughs. \"Lucky you! I went hiking for six hours. My legs are killing me!\"", fr: "Lisa rit. « T'as de la chance ! Moi, j'ai marché six heures en montagne. J'ai super mal aux jambes ! »" },
      { en: "Jake smiles. \"Coffee?\" \"Yes, please!\"", fr: "Jake sourit. « Un café ? » « Oh oui, avec plaisir ! »" },
    ],
    questions: [
      { q: "Comment se sent Jake ce matin ?", options: ["Un peu fatigué", "En pleine forme", "Malade"] },
      { q: "Qu'a fait Jake ce week-end ?", options: ["Il est resté chez lui", "Il a marché en montagne", "Il est allé à un concert"] },
      { q: "Pourquoi Lisa a-t-elle mal aux jambes ?", options: ["Elle a marché six heures", "Elle est tombée", "Elle a joué au foot"] },
    ],
  },
  {
    id: "cafe",
    char: "mia",
    unlock: "coffee",
    title: "Le client pressé",
    lines: [
      { en: "It's Monday morning, and Mia's café is really busy.", fr: "C'est lundi matin, et le café de Mia est plein de monde." },
      { en: "A man comes in. He looks stressed.", fr: "Un homme entre. Il a l'air stressé." },
      { en: "\"Hi! Can I get a large coffee to go, please? I'm running late!\"", fr: "« Bonjour ! Je peux avoir un grand café à emporter, s'il vous plaît ? Je suis en retard ! »" },
      { en: "Mia smiles. \"Sure! Anything else?\"", fr: "Mia sourit. « Bien sûr ! Autre chose ? »" },
      { en: "\"No, that's it, thanks. Do you take card?\"", fr: "« Non, ce sera tout, merci. Vous prenez la carte ? »" },
      { en: "He pays, takes his coffee and runs out.", fr: "Il paie, prend son café et sort en courant." },
      { en: "Two minutes later, he's back. He forgot his phone on the counter!", fr: "Deux minutes plus tard, il revient. Il a oublié son téléphone sur le comptoir !" },
      { en: "Mia laughs. \"Long day, huh?\"", fr: "Mia rit. « Longue journée, hein ? »" },
    ],
    questions: [
      { q: "Comment est le café de Mia ce matin ?", options: ["Plein de monde", "Fermé", "Presque vide"] },
      { q: "Qu'est-ce que l'homme commande ?", options: ["Un grand café à emporter", "Un thé sur place", "Un latte et un gâteau"] },
      { q: "Pourquoi revient-il ?", options: ["Il a oublié son téléphone", "Il veut un deuxième café", "Il a oublié de payer"] },
    ],
  },
  {
    id: "concert",
    char: "sam",
    unlock: "plans",
    title: "Le concert",
    lines: [
      { en: "Sam loves music. On Friday, there's a big concert in town.", fr: "Sam adore la musique. Vendredi, il y a un gros concert en ville." },
      { en: "He texts his friend Chloe: \"Are you free on Friday? Wanna come?\"", fr: "Il écrit à son amie Chloe : « T'es libre vendredi ? Tu veux venir ? »" },
      { en: "Chloe answers right away: \"I'm down! What time?\"", fr: "Chloe répond tout de suite : « Partante ! À quelle heure ? »" },
      { en: "\"Let's say seven, in front of the bar.\"", fr: "« Disons 19 h, devant le bar. »" },
      { en: "On Friday, Sam waits. Seven o'clock… seven thirty… no Chloe.", fr: "Vendredi, Sam attend. 19 h… 19 h 30… toujours pas de Chloe." },
      { en: "Finally, his phone rings. \"Sorry, I'm running late! I'm on my way!\"", fr: "Enfin, son téléphone sonne. « Désolée, je suis en retard ! J'arrive ! »" },
      { en: "She gets there at eight, just in time for the concert.", fr: "Elle arrive à 20 h, juste à temps pour le concert." },
    ],
    questions: [
      { q: "Où Sam et Chloe se donnent-ils rendez-vous ?", options: ["Devant le bar", "À la gare", "Chez Sam"] },
      { q: "À quelle heure Chloe arrive-t-elle ?", options: ["À 20 h", "À 19 h", "À 19 h 30"] },
      { q: "Pourquoi Chloe appelle-t-elle Sam ?", options: ["Elle est en retard", "Elle est malade", "Elle a perdu son billet"] },
    ],
  },
  {
    id: "wifi",
    char: "linda",
    unlock: "hotel",
    title: "Le mot de passe",
    lines: [
      { en: "Paul arrives at his Airbnb in New York. His host, Linda, is really nice.", fr: "Paul arrive à son Airbnb à New York. Son hôte, Linda, est très sympa." },
      { en: "\"Welcome! Here are the keys. The Wi-Fi password is on the fridge.\"", fr: "« Bienvenue ! Voilà les clés. Le mot de passe du wifi est sur le frigo. »" },
      { en: "Paul looks at the fridge. There's no password, just a photo of a cat.", fr: "Paul regarde le frigo. Pas de mot de passe, juste une photo de chat." },
      { en: "He calls Linda. \"Hi, sorry, I can't find the password.\"", fr: "Il appelle Linda. « Salut, désolé, je ne trouve pas le mot de passe. »" },
      { en: "\"Oh, my bad! The password is the cat's name: Pancake!\"", fr: "« Oh, ma faute ! Le mot de passe, c'est le nom du chat : Pancake ! »" },
      { en: "Paul types \"Pancake\". It works!", fr: "Paul tape « Pancake ». Ça marche !" },
      { en: "\"Thanks, I appreciate it!\" \"No worries. Enjoy your stay!\"", fr: "« Merci, c'est sympa ! » « Pas de souci. Bon séjour ! »" },
    ],
    questions: [
      { q: "Dans quelle ville est l'Airbnb ?", options: ["New York", "Londres", "Paris"] },
      { q: "Qu'est-ce que Paul trouve sur le frigo ?", options: ["Une photo de chat", "Le mot de passe", "Les clés"] },
      { q: "Quel est le mot de passe du wifi ?", options: ["Le nom du chat", "Le prénom de Linda", "Le numéro de l'appartement"] },
    ],
  },
  {
    id: "wallet",
    char: "diaz",
    unlock: "emergency",
    title: "Le portefeuille",
    lines: [
      { en: "Julie takes the subway to work. It's really crowded.", fr: "Julie prend le métro pour aller au travail. Il y a énormément de monde." },
      { en: "When she gets off, she looks in her bag. Her wallet is gone!", fr: "Quand elle descend, elle regarde dans son sac. Son portefeuille a disparu !" },
      { en: "She goes to the police station. \"Hi, I need help. Someone stole my wallet.\"", fr: "Elle va au commissariat. « Bonjour, j'ai besoin d'aide. Quelqu'un a volé mon portefeuille. »" },
      { en: "Officer Diaz asks: \"When did it happen?\" \"About an hour ago, on the subway.\"", fr: "L'agente Diaz demande : « C'est arrivé quand ? » « Il y a environ une heure, dans le métro. »" },
      { en: "Suddenly, Julie's phone rings. It's a man she doesn't know.", fr: "Soudain, le téléphone de Julie sonne. C'est un homme qu'elle ne connaît pas." },
      { en: "\"Hi! I found your wallet on the floor of the subway. Your number was inside.\"", fr: "« Bonjour ! J'ai trouvé votre portefeuille par terre dans le métro. Votre numéro était dedans. »" },
      { en: "Julie can't believe it. \"No way! Thank you so much!\"", fr: "Julie n'en revient pas. « Pas possible ! Merci beaucoup ! »" },
    ],
    questions: [
      { q: "Où Julie a-t-elle perdu son portefeuille ?", options: ["Dans le métro", "Au café", "Au travail"] },
      { q: "Où va-t-elle ensuite ?", options: ["Au commissariat", "À la banque", "Chez elle"] },
      { q: "Qui appelle Julie ?", options: ["Un inconnu qui a trouvé son portefeuille", "Sa banque", "Une collègue"] },
    ],
  },
  {
    id: "rainy",
    char: "nina",
    unlock: "weekend",
    title: "Le week-end de Nina",
    lines: [
      { en: "On Saturday, Nina wakes up late. She's in a good mood.", fr: "Samedi, Nina se réveille tard. Elle est de bonne humeur." },
      { en: "She texts her friend Kate: \"Any plans for today? Wanna hang out?\"", fr: "Elle écrit à son amie Kate : « Des projets aujourd'hui ? On se voit ? »" },
      { en: "Kate answers: \"Sorry, I can't make it. I'm swamped with work.\"", fr: "Kate répond : « Désolée, je ne peux pas. Je suis sous l'eau avec le boulot. »" },
      { en: "So Nina goes to the park alone. It's sunny and warm.", fr: "Alors Nina va au parc toute seule. Il fait beau et chaud." },
      { en: "Then, it starts pouring! Nina runs home.", fr: "Puis il se met à pleuvoir des cordes ! Nina rentre en courant." },
      { en: "At home, she orders pizza and watches a movie.", fr: "À la maison, elle commande une pizza et regarde un film." },
      { en: "On Monday, Sam asks: \"How was your weekend?\" Nina laughs: \"Pretty chill… and very wet!\"", fr: "Lundi, Sam lui demande : « C'était comment ton week-end ? » Nina rit : « Plutôt tranquille… et très mouillé ! »" },
    ],
    questions: [
      { q: "Pourquoi Kate ne peut-elle pas venir ?", options: ["Elle a trop de travail", "Elle est malade", "Elle est en voyage"] },
      { q: "Que se passe-t-il au parc ?", options: ["Il se met à pleuvoir", "Nina rencontre Sam", "Il fait trop froid"] },
      { q: "Que fait Nina le soir ?", options: ["Pizza et film à la maison", "Restaurant avec Kate", "Un concert"] },
    ],
  },
  {
    id: "suitcase",
    char: "chloe",
    unlock: "lostbag",
    title: "La valise de Chloe",
    lines: [
      { en: "Chloe lands in London after a long flight.", fr: "Chloe atterrit à Londres après un long vol." },
      { en: "She waits at baggage claim for thirty minutes, but her suitcase doesn't come.", fr: "Elle attend au retrait des bagages pendant trente minutes, mais sa valise n'arrive pas." },
      { en: "She goes to the desk. \"Hi, my suitcase didn't arrive. It's a big red suitcase.\"", fr: "Elle va au comptoir. « Bonjour, ma valise n'est pas arrivée. C'est une grande valise rouge. »" },
      { en: "The agent checks. \"I'm sorry, it's still in Paris. It'll be here tomorrow.\"", fr: "L'agent vérifie. « Désolé, elle est encore à Paris. Elle sera là demain. »" },
      { en: "\"Tomorrow? But I need it today! All my clothes are in it!\"", fr: "« Demain ? Mais j'en ai besoin aujourd'hui ! Tous mes vêtements sont dedans ! »" },
      { en: "\"Don't worry, we can deliver it to your hotel tomorrow morning.\"", fr: "« Ne vous inquiétez pas, on peut la livrer à votre hôtel demain matin. »" },
      { en: "That evening, Chloe goes shopping and buys a new T-shirt. Not bad!", fr: "Ce soir-là, Chloe fait du shopping et s'achète un nouveau t-shirt. Pas mal !" },
    ],
    questions: [
      { q: "Dans quelle ville arrive Chloe ?", options: ["Londres", "New York", "Paris"] },
      { q: "De quelle couleur est sa valise ?", options: ["Rouge", "Noire", "Bleue"] },
      { q: "Quand va-t-elle la récupérer ?", options: ["Demain matin", "Le soir même", "Dans une semaine"] },
    ],
  },
  {
    id: "bigday",
    char: "nina",
    unlock: "interview",
    title: "Le grand jour",
    lines: [
      { en: "Today is a big day for Nina: she has a job interview.", fr: "Aujourd'hui, c'est un grand jour pour Nina : elle a un entretien d'embauche." },
      { en: "She's stressed out, so she practices in front of the mirror.", fr: "Elle est stressée, alors elle s'entraîne devant le miroir." },
      { en: "The interviewer, Olivia, starts: \"So, tell me about yourself.\"", fr: "La recruteuse, Olivia, commence : « Alors, parlez-moi de vous. »" },
      { en: "\"I have three years of experience, I'm a fast learner, and I work well in a team.\"", fr: "« J'ai trois ans d'expérience, j'apprends vite et je travaille bien en équipe. »" },
      { en: "\"Great. Why do you want this job?\" \"I'm looking for a new challenge.\"", fr: "« Très bien. Pourquoi voulez-vous ce poste ? » « Je cherche un nouveau défi. »" },
      { en: "At the end, Olivia smiles. \"Thanks so much. We'll be in touch!\"", fr: "À la fin, Olivia sourit. « Merci beaucoup. On vous recontacte ! »" },
      { en: "Two days later, Nina gets an email. She got the job!", fr: "Deux jours plus tard, Nina reçoit un mail. Elle a eu le poste !" },
    ],
    questions: [
      { q: "Comment se sent Nina avant l'entretien ?", options: ["Stressée", "Fatiguée", "En colère"] },
      { q: "Combien d'années d'expérience a-t-elle ?", options: ["Trois", "Cinq", "Une"] },
      { q: "Comment se termine l'histoire ?", options: ["Nina obtient le poste", "Nina refuse le poste", "Olivia ne rappelle jamais"] },
    ],
  },
];

// Sons difficiles pour un francophone : des paires de mots qui ne diffèrent que par ce son.
export const SOUNDS = [
  {
    id: "th1",
    emoji: "😮‍💨",
    title: "Le TH soufflé",
    example: "think",
    how: "Place le bout de la langue entre tes dents et souffle doucement, sans faire vibrer ta gorge. Ce n'est ni un « s », ni un « f », ni un « t ».",
    pairs: [["think", "sink"], ["three", "tree"], ["thank", "tank"], ["mouth", "mouse"], ["thick", "sick"]],
  },
  {
    id: "th2",
    emoji: "👅",
    title: "Le TH vibré",
    example: "this",
    how: "Même position que le TH soufflé (langue entre les dents), mais ta gorge vibre, comme un « z » très doux. Ce n'est ni un « z », ni un « d ».",
    pairs: [["they", "day"], ["then", "den"], ["breathe", "breeze"], ["though", "dough"], ["there", "dare"]],
  },
  {
    id: "h",
    emoji: "🌬️",
    title: "Le H aspiré",
    example: "hello",
    how: "En anglais, le H se prononce : souffle comme pour faire de la buée sur une vitre. Sans ce souffle, « hair » (cheveux) devient « air » !",
    pairs: [["hair", "air"], ["heat", "eat"], ["hate", "eight"], ["hold", "old"], ["heart", "art"]],
  },
  {
    id: "ii",
    emoji: "🐑",
    title: "I court ou EE long",
    example: "ship / sheep",
    how: "Le « i » court (ship) est bref et relâché, entre le « i » et le « é » français. Le « ee » long (sheep) est un « i » tendu et allongé, comme quand tu souris.",
    pairs: [["ship", "sheep"], ["live", "leave"], ["sit", "seat"], ["fill", "feel"], ["chip", "cheap"]],
  },
  {
    id: "au",
    emoji: "🐱",
    title: "A ouvert ou A court",
    example: "cat / cut",
    how: "Le « a » de cat est très ouvert, entre « a » et « è », bouche grande ouverte. Le « u » de cut est un « a » court et neutre, proche du « eu » de « peur ».",
    pairs: [["cat", "cut"], ["hat", "hut"], ["bag", "bug"], ["match", "much"], ["ran", "run"]],
  },
];

export const getStory = (id) => STORIES.find((s) => s.id === id);
export const getSound = (id) => SOUNDS.find((s) => s.id === id);
