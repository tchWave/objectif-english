// Compare ce que l'utilisateur a dit avec la phrase attendue, mot à mot.
// Les deux côtés sont normalisés pour que « gonna » = « going to », « I'm » = « I am », « 7 » = « seven », etc.

const WORDS = {
  gonna: "going to", wanna: "want to", gotta: "got to", kinda: "kind of", ya: "you",
  cuz: "because", yeah: "yes", yep: "yes", yup: "yes", nah: "no", nope: "no",
  alright: "all right", "d'you": "do you",
  "can't": "can not", cant: "can not", cannot: "can not", "won't": "will not", "ain't": "is not",
  "let's": "let us", whats: "what is", thats: "that is", dont: "do not", im: "i am",
  "i'm": "i am", wassup: "what is up", whassup: "what is up", sup: "what is up",
  goin: "going", wifi: "wi fi", checkout: "check out", checkin: "check in", okay: "ok", nothin: "nothing", gimme: "give me", lemme: "let me", lets: "let us", linkedin: "linked in",
  // Contractions tapées sans apostrophe (fréquent en dictée). Les deux côtés passent par la même
  // conversion, donc la comparaison reste juste même pour un vrai mot comme « its ».
  its: "it is", youre: "you are", theyre: "they are", ive: "i have", youve: "you have", hes: "he is", shes: "she is",
  doesnt: "does not", didnt: "did not", isnt: "is not", arent: "are not", wasnt: "was not", werent: "were not",
  couldnt: "could not", wouldnt: "would not", shouldnt: "should not", havent: "have not", hasnt: "has not",
};
const NUMBERS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
];
const TENS = { 2: "twenty", 3: "thirty", 4: "forty", 5: "fifty", 6: "sixty", 7: "seventy", 8: "eighty", 9: "ninety" };
const IS_WORDS = new Set(["what", "how", "it", "that", "there", "here", "where", "who", "everything", "he", "she", "nothing", "this"]);
const SUFFIXES = { re: "are", m: "am", ll: "will", ve: "have", d: "would" };

function numberWords(n) {
  if (n <= 20) return [NUMBERS[n]];
  if (n < 100) return n % 10 ? [TENS[Math.floor(n / 10)], NUMBERS[n % 10]] : [TENS[n / 10]];
  return [String(n)];
}

function expand(w) {
  w = w.replace(/^'+|'+$/g, "");
  if (!w) return [];
  if (WORDS[w]) return WORDS[w].split(" ");
  if (/^\d+$/.test(w)) return numberWords(Number(w));
  let m;
  if ((m = w.match(/^(.+)n't$/))) return [m[1], "not"];
  if ((m = w.match(/^(.+)'(re|m|ll|ve|d)$/))) return [m[1], SUFFIXES[m[2]]];
  if ((m = w.match(/^(.+)'s$/))) return IS_WORDS.has(m[1]) ? [m[1], "is"] : [m[1]];
  return [w];
}

function clean(s) {
  return s.toLowerCase()
    .replace(/\b(?:[a-z]\.){2,}/g, (m) => m.replace(/\./g, "")) // I.D. → id, A.T.M. → atm
    .replace(/[’‘`]/g, "'").replace(/-/g, " ").replace(/[^a-z0-9' ]+/g, " ");
}

export function tokens(s) {
  return clean(s).split(/\s+/).filter(Boolean).flatMap(expand);
}

// Distance d'édition entre deux mots (nombre de lettres à changer, ajouter ou enlever).
function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

// Deux lettres voisines inversées (« wya » pour « way »).
function isSwap(a, b) {
  if (a.length !== b.length) return false;
  const diff = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff.push(i);
  return diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]];
}

// En dictée, on tolère une faute de frappe (deux pour les mots longs) et les lettres inversées.
function fuzzyEqual(a, b) {
  if (a === b || isSwap(a, b)) return true;
  if (a.length < 4) return false;
  return editDistance(a, b) <= (a.length >= 8 ? 2 : 1);
}

// Renvoie { words: [{ text, ok }], score } où score ∈ [0, 1] = part des mots attendus retrouvés dans l'ordre.
// fuzzy : accepte les petites fautes de frappe (pour la dictée).
export function compare(expected, heard, { fuzzy = false } = {}) {
  const eq = fuzzy ? fuzzyEqual : (a, b) => a === b;
  const orig = expected.split(/\s+/).filter(Boolean);
  const exp = [];
  orig.forEach((w, oi) => clean(w).split(/\s+/).filter(Boolean).flatMap(expand).forEach((t) => exp.push({ t, oi, ok: false })));
  const got = tokens(heard);
  const m = exp.length, n = got.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i][j] = eq(exp[i].t, got[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  for (let i = 0, j = 0; i < m && j < n; ) {
    if (eq(exp[i].t, got[j])) { exp[i].ok = true; i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  const words = orig.map((text, oi) => ({ text, ok: exp.filter((e) => e.oi === oi).every((e) => e.ok) }));
  const matched = exp.filter((e) => e.ok).length;
  // Pénalise un peu les mots en trop (ex. une phrase complètement différente mais qui contient les mots attendus).
  const extra = Math.max(0, n - matched - 2);
  const score = m ? Math.max(0, matched / m - extra * 0.05) : 0;
  return { words, score };
}

export function bestMatch(answers, heard) {
  let best = { answer: answers[0], score: -1, words: [] };
  for (const a of answers) {
    const r = compare(a, heard);
    if (r.score > best.score) best = { answer: a, ...r };
  }
  return best;
}
