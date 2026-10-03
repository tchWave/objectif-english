# Roadmap · Objectif English

Appli perso pour apprendre l'**anglais parlé du quotidien**, sur iPhone.
Niveau de départ : débutant (A1-A2). Mise à jour : 3 octobre 2026 (phase 2 et voix IA livrées).

**Notre façon d'avancer :** je code une étape, tu la testes sur ton iPhone pendant quelques jours, tu me dis ce qui coince, on ajuste, puis on passe à l'étape suivante.

---

## ✅ Phase 0 · Les fondations (terminée le 2 octobre)

- [x] Page de test de la voix sur iPhone (synthèse, micro, dictée, enregistrement)
- [x] Appli installable sur l'écran d'accueil, utilisable hors ligne
- [x] 10 situations en anglais parlé réel (80 phrases, 10 dialogues)
- [x] Séance du jour : révisions → nouvelles phrases → mini-dialogue
- [x] Révision espacée (les phrases reviennent au bon moment)
- [x] Interface façon messagerie avec 7 personnages, cartes immersives, bandeau de résultat, sons, confettis
- [x] Série de jours d'affilée, onglet « Mes phrases », sauvegarde

---

## ✅ Phase 1 · Plus de contenu (terminée le 2 octobre)

**Pourquoi :** au rythme d'une situation par jour, les 10 situations actuelles sont finies en 10 jours.

- [x] Organiser les situations en **4 chapitres** : Les bases, Sortir et bouger, Discuter, Boulot et maison, avec un écran « Parcours »
- [x] **+20 situations** (30 au total, 240 phrases), chacune avec 8 phrases et un dialogue :
  - La vie courante : transports, hôtel ou Airbnb, pharmacie, médecin, au téléphone, livraison
  - La discussion : ton week-end, la météo, ton boulot, tes goûts, donner son avis, raconter une anecdote, faire un compliment
  - Les expressions courantes : « I'm beat », « Piece of cake », « Hang on », « Whatever », « I'm starving »…
- [x] 8 nouveaux personnages (Marcus, Linda, Priya, Dr Ross, Tom, Nina, Diane, Tony), et des anciens qui reviennent (Sam, Chloe, Jake)
- [x] Relecture complète du contenu (accords, incohérences, nuances d'anglais)

**Terminé quand :** environ 30 situations, de quoi tenir un mois. ✓

---

## ✅ Phase 1 bis · Le reste du contenu (terminée le 3 octobre)

- [x] **4 nouveaux chapitres** (8 au total) : Vie pratique, Comme dans les séries, Voyage, Carrière
- [x] **+13 situations** (43 au total, 344 phrases) :
  - Vie pratique : supermarché, salle de sport, coiffeur, un problème à signaler (vol, papiers perdus)
  - Séries : répliques et réactions qu'on entend dans toutes les séries américaines
  - Voyage : aéroport, dans l'avion, bagage perdu, banque
  - Carrière : entretien d'embauche, se présenter pro, avec un client (dialogues génériques, sans métier précis)
- [x] 10 nouveaux personnages (Carla, Jay, Mo, Officer Diaz, Grace, Ben, Daniel, Olivia, Raj, Steve)
- [x] Reconnaissance vocale : les sigles dictés avec des points (I.D., A.T.M.) et « LinkedIn » sont mieux reconnus
- [ ] Corrections issues de tes tests sur iPhone (dès que tu me fais tes retours)

---

## ✅ Phase 2 · Des exercices variés et l'écoute (terminée le 3 octobre)

**Pourquoi :** éviter la monotonie, et travailler la difficulté principale des débutants : comprendre les natifs.

- [x] **« Qu'est-ce qu'il a dit ? »** : une phrase à vitesse normale, tu choisis le bon sens parmi 3 propositions
- [x] **Réponse express** : le personnage te parle, tu as 8 à 14 secondes (selon ton niveau) pour commencer à répondre
- [x] **Mots à remettre dans l'ordre** : construire la phrase à partir de mots mélangés
- [x] **Dictée** : écrire ce que tu entends (les petites fautes de frappe et les apostrophes oubliées sont tolérées)
- [x] **Sons difficiles pour un francophone** : 5 leçons (TH soufflé, TH vibré, H aspiré, ship/sheep, cat/cut) pour entendre puis prononcer la différence
- [x] **Histoires audio** (comme les podcasts de Babbel) : 8 histoires, débloquées au fil des situations : de courtes histoires avec nos personnages, à écouter puis à comprendre (« Qu'est-ce qui est arrivé à Sam ? »)
- [x] **Révision « Mes points faibles »** (comme Babbel et Duolingo) : une séance avec seulement les phrases que tu rates le plus souvent
- [x] **Mode mains libres** (comme l'audio de Speak) : une séance 100 % audio avec des écouteurs, sans regarder l'écran, pour pratiquer en marchant ou dans les transports
- [x] Des séances qui **mélangent** automatiquement les types d'exercices, plus une vérification après les nouvelles phrases
- [x] Une difficulté qui **s'adapte** à tes 30 derniers résultats : plus d'écoute et de choix si tu rates souvent ; dictées, mots en trop, phrases plus longues et chrono plus court si tout va bien

**Terminé quand :** une séance contient au moins 3 types d'exercices différents. ✓ (jusqu'à 7 dans une même séance)

À vérifier sur iPhone : en mode mains libres, iOS peut refuser de lancer le micro tout seul. L'appli passe alors en mode « écoute et répète », sans vérification.

---

## ✅ Bonus · Des voix IA naturelles (terminé le 3 octobre)

- [x] Voix générées avec **Kokoro** (IA open source, gratuite, sur le PC) au lieu des voix de l'iPhone
- [x] **Heart** 🇺🇸 pour les phrases, les histoires, les sons et les personnages féminins ; **Fenrir** 🇺🇸 pour les personnages masculins
- [x] Environ 800 enregistrements, régénérés automatiquement pour chaque nouveau contenu (`node tools/tts/generate.mjs`)
- [x] La voix de l'iPhone reste en secours (fichier manquant, hors ligne avant la première écoute) et pour le français du mode mains libres
- [x] Interrupteur « Voix IA » dans les réglages ; les voix fantaisie d'Apple (Superstar, Bulles…) sont retirées de la liste

---

## 🔜 Phase 3 · Motivation et finitions (semaine du 19 octobre)

- [ ] **Accueil au premier lancement** : présentation rapide et choix de l'objectif quotidien (5, 10 ou 15 min)
- [ ] **Badges** : 7 jours d'affilée, 50 puis 100 phrases maîtrisées, tous les personnages débloqués…
- [ ] **Statistiques** : calendrier des séances, progression semaine par semaine
- [ ] **Niveau estimé** (comme Speak) : un indicateur A1 → A2 → B1 calculé d'après tes résultats, pour voir ta progression
- [ ] **Sauvegarde plus simple** (fichier à garder dans l'app Fichiers ou iCloud)
- [ ] Réglage pour couper les petits sons, et pourquoi pas une voix différente pour chaque personnage (Kokoro en propose 28)
- [ ] Corrections suite à tes retours d'usage

---

## 🏁 Point d'étape · vers le 26 octobre

Après 2 à 3 semaines d'usage régulier, on fait le bilan :
- Est-ce que tu utilises l'appli tous les jours ?
- Les dialogues écrits d'avance deviennent-ils trop faciles ?
- Est-ce que tu as envie de parler **librement** ?

👉 On décide alors si on passe à la phase 4 (l'IA).

---

## 💡 Phase 4 · Conversations libres avec l'IA (optionnelle)

**Coût estimé :** environ 1 à 6 $ par mois avec Claude (Haiku ou Sonnet), pour une séance par jour.

- [ ] Créer une clé API sur console.anthropic.com (à faire par toi), stockée uniquement sur ton iPhone
- [ ] **Conversation libre** avec un personnage, à l'oral, adaptée à ton niveau
- [ ] **Correction en fin de conversation** : tes erreurs, une version plus naturelle de tes phrases, les nouveaux mots
- [ ] Les phrases corrigées s'ajoutent à tes révisions
- [ ] **Situations générées à la demande**, d'après ta vie (ton métier, tes voyages, tes loisirs)
- [ ] Les personnages **se souviennent** de toi d'une conversation à l'autre
- [ ] Un plafond de dépense mensuel pour ne jamais avoir de surprise

---

## 💡 Phase 5 · Rappels quotidiens (optionnelle)

- [ ] Notifications sur iPhone (« Sam t'a écrit ! ») à l'heure que tu choisis
- [ ] Il faut un petit serveur gratuit (par exemple Cloudflare), avec un compte à créer de ton côté

---

## 🔍 Ce que font les autres applis (veille du 3 octobre)

| Fonctionnalité | Qui la propose | Chez nous |
|---|---|---|
| Jeux de rôle de la vie réelle, personnages récurrents | Duolingo, Speak, Praktika | ✅ Fait |
| Révision espacée, séries, notes culturelles | Tous, Babbel | ✅ Fait |
| Difficulté adaptative, histoires audio, points faibles, mains libres | Duolingo, Babbel, Speak | ✅ Fait (phase 2) |
| Badges, statistiques, niveau estimé | Duolingo, Speak | 🔜 Phase 3 |
| Conversation libre avec une IA qui se souvient de toi | Duolingo, Speak, Praktika, Memrise | 💡 Phase 4 |
| Correction de prononciation son par son | ELSA, Speak | ⚠️ Impossible gratuitement : Safari reconnaît les mots, pas les sons |
| Vidéos de natifs, cours en direct, communauté, ligues | Memrise, Busuu, Duolingo | ❌ Pas adapté à une appli perso |

---

## 🗂️ Idées pour plus tard

- Le **shadowing** : répéter en même temps que la voix, pour le rythme et l'intonation
- **Ajouter tes propres phrases** entendues dans une série ou au travail
- Des extraits audio réels (podcasts, séries) adaptés à ton niveau
- Un niveau intermédiaire (B1-B2) une fois les bases acquises
- D'autres langues avec le même moteur
