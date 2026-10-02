// Progression enregistrée sur l'appareil (localStorage) + révision espacée.

const KEY = "oe-state-v1";
// Délai (en jours) avant la prochaine révision, selon la « boîte » de la carte.
const INTERVALS = [0, 1, 3, 7, 14, 30, 60];
export const MASTERED_BOX = 4;

export function today(d = new Date()) {
  return d.toLocaleDateString("en-CA");
}

export function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return today(d);
}

function fresh() {
  return {
    version: 1,
    cards: {},
    situations: {},
    streak: { count: 0, last: null },
    days: {},
    settings: { voice: null, rate: 0.9, autoplay: true },
  };
}

function merge(base, s) {
  return {
    ...base,
    ...s,
    settings: { ...base.settings, ...(s.settings || {}) },
    streak: { ...base.streak, ...(s.streak || {}) },
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return merge(fresh(), JSON.parse(raw));
  } catch (e) {}
  return fresh();
}

export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
}

export function reset() {
  return fresh();
}

export function learn(s, id) {
  if (!s.cards[id]) s.cards[id] = { box: 1, due: addDays(1), ok: 0, ko: 0 };
}

// success : phrase bien dite. hinted : l'utilisateur a écouté le modèle avant de répondre.
export function review(s, id, success, hinted) {
  const c = s.cards[id] || (s.cards[id] = { box: 1, due: today(), ok: 0, ko: 0 });
  if (success && !hinted) {
    c.box = Math.min(c.box + 1, INTERVALS.length - 1);
    c.ok++;
    c.due = addDays(INTERVALS[c.box]);
  } else if (success) {
    c.ok++;
    c.due = addDays(1);
  } else {
    c.box = 1;
    c.ko++;
    c.due = addDays(1);
  }
}

export function dueIds(s) {
  const t = today();
  return Object.entries(s.cards)
    .filter(([, c]) => c.due <= t)
    .sort((a, b) => a[1].due.localeCompare(b[1].due))
    .map(([id]) => id);
}

export function upcomingIds(s, n) {
  const t = today();
  return Object.entries(s.cards)
    .filter(([, c]) => c.due > t)
    .sort((a, b) => a[1].due.localeCompare(b[1].due))
    .slice(0, n)
    .map(([id]) => id);
}

export function masteredCount(s) {
  return Object.values(s.cards).filter((c) => c.box >= MASTERED_BOX).length;
}

export function streak(s) {
  const last = s.streak.last;
  return last === today() || last === addDays(-1) ? s.streak.count : 0;
}

export function doneToday(s) {
  return s.streak.last === today();
}

export function completeSession(s, stats) {
  const t = today();
  if (s.streak.last !== t) {
    s.streak.count = s.streak.last === addDays(-1) ? s.streak.count + 1 : 1;
    s.streak.last = t;
  }
  const d = s.days[t] || (s.days[t] = { sessions: 0, reviewed: 0, learned: 0 });
  d.sessions++;
  d.reviewed += stats.reviewed;
  d.learned += stats.learned;
}

export function exportData(s) {
  return JSON.stringify(s);
}

export function importData(text) {
  const s = JSON.parse(text);
  if (!s || typeof s !== "object" || typeof s.cards !== "object") throw new Error("Sauvegarde invalide");
  return merge(fresh(), s);
}
