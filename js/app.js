import { SITUATIONS, CHARACTERS, CHAPTERS, getChapter, getSituation, getPhrase, phraseId } from "./data.js";
import { STORIES, SOUNDS, getStory, getSound } from "./practice-data.js";
import { compare, bestMatch, tokens } from "./match.js";
import * as speech from "./speech.js";
import * as store from "./store.js";
import * as sfx from "./sfx.js";

const PASS = 0.8;
const DIALOG_PASS = 0.7;
const DICTATION_PASS = 0.9;
const MAX_REVIEWS = 10;
const PRAISE = ["Nickel !", "Parfait !", "Bien joué !", "Excellent !", "Trop fort !", "Yes !"];
const MIC_ERRORS = {
  "not-allowed": "Accès au micro refusé. Autorise le micro et la reconnaissance vocale dans Réglages.",
  "service-not-allowed": "Reconnaissance vocale indisponible. Vérifie que Siri et Dictée sont activés.",
  "network": "Problème réseau pendant l'écoute. Réessaie ou utilise le clavier.",
  "audio-capture": "Aucun micro détecté.",
  "start-failed": "Le micro n'a pas pu démarrer. Réessaie.",
};
// Étapes qui donnent un résultat (réussi / raté).
const EXERCISES = new Set(["review", "listen", "order", "dictation", "express", "pick", "say"]);
// Exercices liés à une phrase, qui font avancer la révision espacée.
const SRS_TYPES = new Set(["review", "listen", "order", "dictation"]);
const ALL_IDS = SITUATIONS.flatMap((s) => s.phrases.map((_, i) => phraseId(s.id, i)));
const KNOWN = new Set(ALL_IDS);
// Ignore les phrases enregistrées qui n'existeraient plus dans le contenu.
const known = (ids) => ids.filter((id) => KNOWN.has(id));

const app = document.getElementById("app");
let state = store.load();
let view = { name: "home" };
let listener = null;
let exprTimer = null;
let wakeLock = null;

// ---------- Utilitaires ----------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const save = () => store.save(state);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const plural = (n, word) => `${n} ${word}${n > 1 ? "s" : ""}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const wordCount = (id) => getPhrase(id).en.split(/\s+/).length;
const level = () => store.level(state);
const levelLabel = (l) => (l < 0.6 ? "facile" : l > 0.85 ? "difficile" : "normale");
const say = (text, slow) =>
  speech.speak(text, { rate: state.settings.rate * (slow ? 0.75 : 1), voiceURI: state.settings.voice });
// Les traductions contiennent « (e) » ou « / » : on les retire pour que la voix française les lise bien.
const sayFr = (text) =>
  speech.speak(text.replace(/\s?\((?:e|es|s|nouvelle)\)/g, "").replace(/\s*\/\s*/g, ", ou "), { lang: "fr-FR", rate: 1 });

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newStepState() {
  return {
    listening: false, interim: "", error: null, keyboard: false,
    result: null, hint: false, recorded: false, praise: pick(PRAISE),
    turn: 0, log: [], playing: false, help: false, done: false, seen: 0, shown: false,
    picked: null, placed: [], typed: "", showFr: false, answered: false, deadline: 0, dur: 0,
  };
}

function stopAll() {
  speech.stopSpeaking();
  clearInterval(exprTimer);
  if (listener) {
    const l = listener;
    listener = null;
    l.abort();
  }
}

function go(v) {
  if (view.name === "handsfree" && v.name !== "handsfree") releaseWake();
  stopAll();
  view = v;
  render();
  window.scrollTo(0, 0);
}

function render() {
  const screens = {
    home: renderHome, path: renderPath, train: renderTrain, phrases: renderPhrases, thread: renderThread,
    session: renderSession, practice: renderPractice, settings: renderSettings, story: renderStory, handsfree: renderHandsfree,
  };
  app.innerHTML = screens[view.name]();
}

function avatar(charId, size = 44) {
  const c = CHARACTERS[charId];
  return `<div class="avatar" style="--c:${c.color};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px">
    ${esc(c.name[0])}<span class="avatar-badge" style="font-size:${Math.round(size * 0.3)}px">${c.emoji}</span></div>`;
}

const isLearned = (sitId) => !!(state.situations[sitId] && state.situations[sitId].learned);
const nextSituation = () => SITUATIONS.find((s) => !isLearned(s.id));
const chapterSits = (chId) => SITUATIONS.filter((s) => s.chapter === chId);
const chapterDone = (chId) => chapterSits(chId).filter((s) => isLearned(s.id)).length;

function currentChapter() {
  const next = nextSituation();
  return next ? getChapter(next.chapter) : CHAPTERS[CHAPTERS.length - 1];
}

function chapterCard() {
  const ch = currentChapter();
  const total = chapterSits(ch.id).length;
  const done = chapterDone(ch.id);
  return `
  <button class="chapter-card" data-a="path">
    <span class="chapter-emoji">${ch.emoji}</span>
    <div class="grow">
      <div class="muted small">Chapitre ${CHAPTERS.indexOf(ch) + 1} sur ${CHAPTERS.length}</div>
      <b>${esc(ch.title)}</b>
      <div class="bar"><div style="width:${Math.round((done / total) * 100)}%"></div></div>
    </div>
    <span class="chapter-count">${done}/${total}</span>
    <span class="chev">›</span>
  </button>`;
}

function tabbar(active) {
  const due = store.dueIds(state).length;
  const tab = (id, ico, label, extra = "") =>
    `<button class="${active === id ? "on" : ""}" data-a="${id}"><span class="tab-ico">${ico}</span>${label}${extra}</button>`;
  return `
  <nav class="tabbar">
    ${tab("home", "💬", "Messages")}
    ${tab("path", "🗺️", "Parcours")}
    ${tab("train", "🎯", "S'entraîner")}
    ${tab("phrases", "📚", "Mes phrases", due ? `<span class="dot-badge">${due}</span>` : "")}
  </nav>`;
}

// ---------- Accueil : la messagerie ----------
function renderHome() {
  const due = store.dueIds(state).length;
  const streak = store.streak(state);
  const next = nextSituation();
  const done = store.doneToday(state);
  const plan = [due ? plural(Math.min(due, MAX_REVIEWS), "révision") : null, next ? `${CHARACTERS[next.char].name} t'attend` : "un dialogue bonus"]
    .filter(Boolean).join(" · ");

  // Une ligne par personnage déjà rencontré (ou qui écrit le prochain message).
  const order = [];
  SITUATIONS.forEach((s) => {
    if ((isLearned(s.id) || s === next) && !order.includes(s.char)) order.push(s.char);
  });
  order.sort((a, b) => (next && b === next.char) - (next && a === next.char));
  const locked = new Set(SITUATIONS.filter((s) => !isLearned(s.id) && s !== next).map((s) => s.char).filter((c) => !order.includes(c))).size;

  const rows = order.map((cid) => {
    const c = CHARACTERS[cid];
    const unread = next && next.char === cid;
    const sits = SITUATIONS.filter((s) => s.char === cid && isLearned(s.id));
    const last = sits[sits.length - 1];
    const preview = unread ? next.dialogue.turns.find((t) => t.them)?.them || next.title : lastLine(last);
    return `
    <button class="thread-row ${unread ? "unread" : ""}" data-a="thread" data-id="${cid}">
      ${avatar(cid, 52)}
      <div class="grow">
        <div class="thread-top"><b>${esc(c.name)}</b><span class="muted small">${unread ? "Nouveau" : esc(last ? last.title : "")}</span></div>
        <div class="thread-preview">${esc(preview)}</div>
      </div>
      ${unread ? '<span class="unread-dot"></span>' : ""}
    </button>`;
  }).join("");

  return `
  <div class="screen">
    <header class="home-head">
      <div>
        <div class="muted small">Objectif English</div>
        <h1>Messages</h1>
      </div>
      <div class="head-actions">
        <div class="streak-pill ${streak ? "" : "cold"}">🔥 ${streak}</div>
        <button class="icon-btn" data-a="settings" aria-label="Réglages">⚙️</button>
      </div>
    </header>

    <section class="daily ${done ? "is-done" : ""}">
      <div class="daily-text">
        <div class="daily-kicker">${done ? "Séance du jour faite ✓" : "Séance du jour · 10 min"}</div>
        <div class="daily-title">${done ? "Bravo, à demain !" : esc(plan)}</div>
      </div>
      <button class="btn3d white" data-a="start">${done ? "Encore une" : "C'est parti"}</button>
    </section>

    ${chapterCard()}

    <div class="threads">
      ${rows}
      ${locked ? `<div class="thread-row locked"><div class="avatar ghost" style="width:52px;height:52px">🔒</div>
        <div class="grow"><b>${plural(locked, "contact")} à débloquer</b><div class="thread-preview">Un nouveau personnage à chaque situation terminée</div></div></div>` : ""}
    </div>
    ${tabbar("home")}
  </div>`;
}

function lastLine(sit) {
  if (!sit) return "";
  const turns = sit.dialogue.turns;
  const t = turns[turns.length - 1];
  return t.them ? t.them : "Toi : " + (t.free ? t.examples[0] : t.answers[0]);
}

// ---------- Fil de discussion d'un personnage ----------
function renderThread() {
  const cid = view.char;
  const next = nextSituation();
  const sits = SITUATIONS.filter((s) => s.char === cid && isLearned(s.id));
  const history = sits.map((s) => `
    <div class="divider"><span>${s.emoji} ${esc(s.title)}</span></div>
    ${s.dialogue.turns.map((t) => t.them
      ? `<div class="bubble them" data-a="say" data-text="${esc(t.them)}">${t.who ? `<div class="who">${esc(t.who)}</div>` : ""}${esc(t.them)}</div>`
      : `<div class="bubble you">${esc(t.free ? t.examples[0] : t.answers[0])}</div>`).join("")}
    <div class="episode-actions">
      <button class="chip" data-a="practice" data-id="${s.id}">🎬 Rejouer</button>
      <button class="chip" data-a="phrases" data-id="${s.id}">📚 Les phrases</button>
    </div>`).join("");

  let pending = "";
  if (next && next.char === cid) {
    const first = next.dialogue.turns.find((t) => t.them);
    pending = `
    <div class="divider new"><span>Nouveau · ${next.emoji} ${esc(next.title)}</span></div>
    ${first ? `<div class="bubble them" data-a="say" data-text="${esc(first.them)}">${esc(first.them)}</div>` : `<div class="bubble them muted">${esc(next.dialogue.title)}</div>`}
    <div class="reply-cta">
      <p class="muted small">Avant de répondre, apprends ${next.phrases.length} phrases utiles.</p>
      <button class="btn3d" data-a="start">Répondre</button>
    </div>`;
  }

  return `
  <div class="screen chat-screen">
    ${chatHeader(cid, "home")}
    <div class="chat">${history}${pending}</div>
  </div>`;
}

function chatHeader(cid, back, backId) {
  const c = CHARACTERS[cid];
  return `
  <header class="chat-head">
    ${back ? `<button class="icon" data-a="${back}" ${backId ? `data-id="${backId}"` : ""} aria-label="Retour">‹</button>` : ""}
    ${avatar(cid, 38)}
    <div class="grow"><b>${esc(c.name)}</b><div class="muted small">${esc(c.role)}</div></div>
  </header>`;
}

// ---------- Parcours ----------
function renderPath() {
  const next = nextSituation();
  const learned = SITUATIONS.filter((s) => isLearned(s.id)).length;
  const chapters = CHAPTERS.map((ch, i) => {
    const sits = chapterSits(ch.id);
    const done = chapterDone(ch.id);
    const status = done === sits.length ? "done" : done || sits.includes(next) ? "current" : "locked";
    const rows = sits.map((s) => {
      const c = CHARACTERS[s.char];
      if (isLearned(s.id)) {
        return `<button class="path-row done" data-a="phrases" data-id="${s.id}" data-from="path">
          <span class="node">✓</span>
          <div class="grow"><b>${s.emoji} ${esc(s.title)}</b><div class="muted small">avec ${esc(c.name)}</div></div>
          <span class="chev">›</span>
        </button>`;
      }
      if (s === next) {
        return `<button class="path-row next" data-a="start">
          <span class="node">${s.emoji}</span>
          <div class="grow"><b>${esc(s.title)}</b><div class="small">${esc(c.name)} t'attend</div></div>
          <span class="go">Go</span>
        </button>`;
      }
      return `<div class="path-row locked">
        <span class="node">🔒</span>
        <div class="grow"><b>${esc(s.title)}</b><div class="muted small">avec ${esc(c.name)}</div></div>
      </div>`;
    }).join("");
    return `
    <section class="chapter ${status}">
      <div class="chapter-head">
        <span class="chapter-emoji">${ch.emoji}</span>
        <div class="grow"><div class="muted small">Chapitre ${i + 1} · ${esc(ch.desc)}</div><h3>${esc(ch.title)}</h3></div>
        <span class="chapter-count">${status === "done" ? "🏆" : `${done}/${sits.length}`}</span>
      </div>
      <div class="path-list">${rows}</div>
    </section>`;
  }).join("");

  return `
  <div class="screen">
    <header class="home-head">
      <div><div class="muted small">${learned} situations sur ${SITUATIONS.length}</div><h1>Parcours</h1></div>
    </header>
    ${chapters}
    ${tabbar("path")}
  </div>`;
}

// ---------- Mes phrases ----------
function renderPhrases() {
  const due = store.dueIds(state).length;
  const sits = SITUATIONS.filter((s) => (view.sit ? s.id === view.sit : s.phrases.some((_, i) => state.cards[phraseId(s.id, i)])));
  const group = (s) => `
    <h3 class="group-title">${s.emoji} ${esc(s.title)}</h3>
    <div class="list">
      ${s.phrases.map((p, i) => {
        const card = state.cards[phraseId(s.id, i)];
        const lvl = card ? Math.min(3, Math.ceil(card.box / 2)) : 0;
        return `<button class="phrase-row" data-a="say" data-text="${esc(p.en)}">
          <div class="grow"><b>${esc(p.en)}</b><div class="muted small">${esc(p.fr)}</div></div>
          <div class="level" title="Niveau">${[1, 2, 3].map((n) => `<i class="${n <= lvl ? "on" : ""}"></i>`).join("")}</div>
        </button>`;
      }).join("")}
    </div>`;
  const groups = CHAPTERS.map((ch) => {
    const cs = sits.filter((s) => s.chapter === ch.id);
    if (!cs.length) return "";
    return (view.sit ? "" : `<h2 class="chapter-title">${ch.emoji} ${esc(ch.title)}</h2>`) + cs.map(group).join("");
  }).join("");

  return `
  <div class="screen">
    <header class="home-head">
      ${view.sit ? `<button class="icon" data-a="${view.from === "path" ? "path" : "thread"}" data-id="${getSituation(view.sit).char}" aria-label="Retour">‹</button>` : ""}
      <div class="grow"><h1>${view.sit ? esc(getSituation(view.sit).title) : "Mes phrases"}</h1></div>
    </header>
    ${view.sit ? "" : `
    <section class="stats">
      <div class="stat"><b>${Object.keys(state.cards).length}</b><span>vues</span></div>
      <div class="stat"><b>${store.masteredCount(state)}</b><span>maîtrisées</span></div>
      <div class="stat"><b>${due}</b><span>à réviser</span></div>
    </section>`}
    ${groups || `<div class="empty">Tes phrases apparaîtront ici après ta première séance.<button class="btn3d" data-a="start">Commencer</button></div>`}
    <p class="muted small center">Touche une phrase pour l'écouter. Les barres montrent ton niveau.</p>
    ${view.sit ? "" : tabbar("phrases")}
  </div>`;
}

// ---------- Construction des séances ----------
function weightedPick(weights) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  let r = Math.random() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries[0][0];
}

// Choisit l'exercice de révision d'une phrase : plus facile si la phrase est récente ou si tu rates souvent,
// plus exigeant si tu la connais bien ou si tout va bien.
function chooseType(id, lvl, recent) {
  const box = (state.cards[id] || { box: 1 }).box;
  const words = wordCount(id);
  const w = { review: 3, listen: 2, order: 2, dictation: 1 };
  if (box <= 2) { w.listen += 2; w.order += 2; w.dictation = 0.5; }
  else if (box >= 4) { w.review += 2; w.dictation += 2; w.listen = 0.5; w.order = 0.5; }
  if (lvl < 0.6) { w.listen += 2; w.order += 1; w.dictation = 0; }
  else if (lvl > 0.85) { w.review += 1; w.dictation += 2; w.listen = Math.max(0.3, w.listen - 1); }
  if (words < 3) w.order = 0;
  if (words > 9) w.dictation = 0;
  const last = recent[recent.length - 1];
  if (last && w[last]) w[last] /= 2; // évite d'enchaîner deux fois le même exercice
  return weightedPick(w);
}

function makeStep(type, id, { lvl = level(), check = false } = {}) {
  const st = { type, id, check };
  if (type === "listen") Object.assign(st, listenOptions(id, lvl, check));
  if (type === "order") Object.assign(st, orderChips(id, lvl));
  return st;
}

// Trois traductions possibles, dont la bonne. Les leurres viennent de la même situation si c'est une
// vérification ou si tu as un bon niveau (plus dur à distinguer).
function listenOptions(id, lvl, sameSit) {
  const p = getPhrase(id);
  const own = shuffle(p.sit.phrases.map((_, i) => phraseId(p.sit.id, i)));
  const candidates = [...(sameSit || lvl > 0.8 ? own : []), ...shuffle(Object.keys(state.cards)), ...shuffle(ALL_IDS)];
  const wrong = [];
  for (const cid of candidates) {
    const fr = cid !== id && KNOWN.has(cid) && getPhrase(cid).fr;
    if (!fr || fr === p.fr || wrong.includes(fr)) continue;
    wrong.push(fr);
    if (wrong.length === 2) break;
  }
  const options = shuffle([p.fr, ...wrong]);
  return { options, answer: options.indexOf(p.fr) };
}

const cleanChip = (w) => w.replace(/^[«"“(]+|[.,!?;:…»"”)]+$/g, "");

// Les mots de la phrase, mélangés. À bon niveau, on ajoute un ou deux mots en trop.
function orderChips(id, lvl) {
  const target = getPhrase(id).en.split(/\s+/).map(cleanChip).filter(Boolean);
  const nExtra = lvl > 0.85 ? 2 : lvl > 0.7 ? 1 : 0;
  const used = new Set(target.map((w) => w.toLowerCase()));
  const extra = [];
  for (const cid of shuffle(ALL_IDS)) {
    if (extra.length >= nExtra) break;
    const w = getPhrase(cid).en.split(/\s+/).map(cleanChip)
      .find((x) => x.length > 2 && x === x.toLowerCase() && !used.has(x.toLowerCase()));
    if (w) { extra.push(w); used.add(w.toLowerCase()); }
  }
  const all = [...target, ...extra];
  let chips = shuffle(all);
  for (let tries = 0; tries < 10 && chips.join(" ") === all.join(" "); tries++) chips = shuffle(all);
  return { target, chips };
}

// Une réplique d'un dialogue déjà fait, à laquelle il faut répondre vite.
function expressCandidates() {
  const out = [];
  SITUATIONS.filter((s) => isLearned(s.id)).forEach((s) => {
    const turns = s.dialogue.turns;
    turns.forEach((t, j) => {
      if (t.you && !t.free && j > 0 && turns[j - 1].them) out.push({ type: "express", sit: s.id, turn: j });
    });
  });
  return out;
}

function expressQuestion(sit, j) {
  const turns = sit.dialogue.turns;
  const qs = [];
  for (let k = j - 1; k >= 0 && turns[k].them && qs.length < 2; k--) qs.unshift(turns[k]);
  return qs;
}

// Trois exercices sur les phrases qu'on vient d'apprendre, avant le dialogue.
function checkSteps(sit, lvl) {
  const ids = sit.phrases.map((_, i) => phraseId(sit.id, i));
  const byLength = [...ids].sort((a, b) => wordCount(a) - wordCount(b));
  // Bon niveau : les phrases les plus longues ; niveau fragile : les plus courtes.
  const pool = shuffle(lvl > 0.85 ? byLength.slice(-4) : lvl < 0.6 ? byLength.slice(0, 4) : ids);
  const orderId = pool.find((id) => wordCount(id) >= 3) || ids.find((id) => wordCount(id) >= 3);
  const rest = pool.filter((id) => id !== orderId);
  return [
    makeStep("listen", rest[0], { lvl, check: true }),
    orderId && makeStep("order", orderId, { lvl, check: true }),
    makeStep(lvl > 0.85 ? "dictation" : "listen", rest[1], { lvl, check: true }),
  ].filter(Boolean);
}

function buildDaily() {
  const lvl = level();
  const steps = [];
  let reviews = known(store.dueIds(state)).slice(0, MAX_REVIEWS);
  const next = nextSituation();
  if (!next && reviews.length < 6) reviews = reviews.concat(known(store.upcomingIds(state, 8 - reviews.length)));
  const recent = [];
  reviews.forEach((id) => {
    const type = chooseType(id, lvl, recent);
    recent.push(type);
    steps.push(makeStep(type, id, { lvl }));
  });
  steps.push(...shuffle(expressCandidates()).slice(0, lvl < 0.6 ? 1 : 2));
  if (next) {
    steps.push({ type: "intro", sit: next.id });
    next.phrases.forEach((_, i) => steps.push({ type: "learn", id: phraseId(next.id, i) }));
    steps.push(...checkSteps(next, lvl));
    steps.push({ type: "dialogue", sit: next.id });
  } else {
    const sit = [...SITUATIONS].sort((a, b) => ((state.situations[a.id] || {}).dialogues || 0) - ((state.situations[b.id] || {}).dialogues || 0))[0];
    steps.push({ type: "dialogue", sit: sit.id });
  }
  steps.push({ type: "end" });
  return steps;
}

function buildWeak() {
  const lvl = Math.max(0, level() - 0.15); // un cran plus facile : ce sont des phrases difficiles
  const recent = [];
  const steps = known(store.weakIds(state, 10)).map((id) => {
    const type = chooseType(id, lvl, recent);
    recent.push(type);
    return makeStep(type, id, { lvl });
  });
  steps.push({ type: "end" });
  return steps;
}

function buildExpressRound() {
  return [...shuffle(expressCandidates()).slice(0, 6), { type: "end" }];
}

function buildSound(id) {
  const snd = getSound(id);
  const steps = [{ type: "soundIntro", sound: id }];
  const pairs = shuffle(snd.pairs);
  for (let r = 0; r < 6; r++) steps.push({ type: "pick", sound: id, pair: pairs[r % pairs.length], target: Math.round(Math.random()) });
  const pairs2 = shuffle(snd.pairs);
  // Le premier mot de chaque paire contient le son travaillé : on le fait dire plus souvent.
  for (let r = 0; r < 4; r++) steps.push({ type: "say", sound: id, pair: pairs2[r % pairs2.length], target: r % 2 === 0 ? 0 : Math.round(Math.random()) });
  steps.push({ type: "end" });
  return steps;
}

// ---------- Séance (moteur commun) ----------
// kind : "daily" (séance du jour), "weak" (points faibles), "express" (défi express), "sound" (sons difficiles).
function startSession(kind, steps, meta = {}) {
  go({ name: "session", kind, steps, meta, i: 0, ss: newStepState(), stats: { exercises: 0, ok: 0, learned: 0, dialogues: 0 } });
  onEnterStep();
}

const currentStep = () => (view.name === "session" ? view.steps[view.i] : null);

function onEnterStep() {
  const st = currentStep();
  if (!st) return;
  if (st.type === "learn" && state.settings.autoplay) say(getPhrase(st.id).en);
  if (st.type === "listen" || st.type === "dictation") say(getPhrase(st.id).en);
  if (st.type === "pick") say(st.pair[st.target]);
  if (st.type === "express") startExpress(st);
  if (st.type === "dialogue") playThem();
  if (st.type === "end") { sfx.done(); confetti(); }
}

// Enregistre le premier essai d'un exercice : statistiques, niveau adaptatif et révision espacée.
function recordResult(st, ok) {
  const ss = view.ss;
  if (ss.recorded) return;
  ss.recorded = true;
  view.stats.exercises++;
  if (ok) view.stats.ok++;
  if (st.type !== "pick" && st.type !== "say") store.recordPerf(state, ok);
  if (st.id && !st.check && SRS_TYPES.has(st.type)) {
    const card = state.cards[st.id];
    const easy = st.type === "listen" || st.type === "order";
    // Un exercice facile (choisir, remettre dans l'ordre) ne fait pas monter une carte déjà bien connue.
    const hinted = st.type === "review" ? ss.hint : easy && !!card && card.box >= 3;
    store.review(state, st.id, ok, hinted);
  }
  save();
}

function nextStep() {
  const st = currentStep();
  const ss = view.ss;
  if (st.type === "learn") {
    store.learn(state, st.id);
    view.stats.learned++;
  }
  if (EXERCISES.has(st.type) && !ss.recorded) recordResult(st, false);
  if (st.type === "dialogue") {
    const s = state.situations[st.sit] || (state.situations[st.sit] = {});
    const wasLearned = s.learned;
    s.learned = true;
    const ch = getSituation(st.sit).chapter;
    if (!wasLearned && chapterDone(ch) === chapterSits(ch).length) view.stats.chapterDone = ch;
    s.dialogues = (s.dialogues || 0) + 1;
    view.stats.dialogues++;
  }
  stopAll();
  view.i++;
  view.ss = newStepState();
  if (view.steps[view.i].type === "end") finishSession();
  save();
  render();
  window.scrollTo(0, 0);
  onEnterStep();
}

function finishSession() {
  store.completeSession(state, view.stats, view.kind === "daily");
  if (view.kind === "sound") {
    const pct = Math.round((view.stats.ok / Math.max(1, view.stats.exercises)) * 100);
    const s = state.sounds[view.meta.sound] || (state.sounds[view.meta.sound] = {});
    s.best = Math.max(s.best || 0, pct);
  }
}

function sessionTop(dark) {
  const pct = Math.round((view.i / (view.steps.length - 1)) * 100);
  return `
  <div class="session-top ${dark ? "on-dark" : ""}">
    <button class="icon" data-a="${view.kind === "daily" ? "home" : "train"}" aria-label="Quitter">✕</button>
    <div class="progress"><div style="width:${pct}%"></div></div>
    <span class="streak-mini">🔥 ${store.streak(state)}</span>
  </div>`;
}

function renderSession() {
  const st = currentStep();
  const screens = {
    intro: () => renderIntro(getSituation(st.sit)),
    learn: renderCard, review: renderCard,
    listen: renderListen, order: renderOrder, dictation: renderDictation, express: renderExpress,
    dialogue: () => renderDialogue(getSituation(st.sit), view.ss, true),
    soundIntro: renderSoundIntro, pick: renderPick, say: renderSay,
    end: renderEnd,
  };
  return screens[st.type](st);
}

function renderIntro(sit) {
  const c = CHARACTERS[sit.char];
  const first = sit.dialogue.turns.find((t) => t.them);
  return `
  <div class="screen intro-screen">
    ${sessionTop(false)}
    <div class="intro-body">
      ${avatar(sit.char, 96)}
      <div class="intro-kicker">${esc(c.name)} · ${esc(c.role)}</div>
      ${first ? `<div class="bubble them big" data-a="say" data-text="${esc(first.them)}">${esc(first.them)}</div>` : `<h2>${esc(sit.dialogue.title)}</h2>`}
      <div class="tip"><b>${sit.emoji} ${esc(sit.title)}</b><p>${esc(sit.intro)}</p></div>
    </div>
    <div class="bottom-bar"><button class="btn3d wide" data-a="next">Apprendre les ${sit.phrases.length} phrases</button></div>
  </div>`;
}

function wordsHtml(words) {
  return words.map((w) => `<span class="w ${w.ok ? "ok" : "ko"}">${esc(w.text)}</span>`).join(" ");
}

// En-tête d'un exercice : son nom, puis d'où vient la phrase.
function exTag(icon, label, st) {
  const p = st.id ? getPhrase(st.id) : null;
  const where = p ? `${st.check ? "Nouvelles phrases" : "Révision"} · ${p.sit.emoji} ${esc(p.sit.title)}` : "";
  return `<div class="card-tag">${icon} ${label}</div>${where ? `<div class="card-sub">${where}</div>` : ""}`;
}

// Bandeau de résultat commun à tous les exercices.
function sheet({ cls, title, sub = "", extra = "", retry = false }) {
  return `
  <div class="sheet ${cls}">
    <div class="sheet-title">${title}</div>
    ${sub ? `<div class="sheet-sub">${sub}</div>` : ""}
    ${extra}
    <div class="sheet-actions">
      ${retry ? `<button class="btn3d ghost" data-a="retry">Réessayer</button>` : ""}
      <button class="btn3d ${cls}" data-a="next">Continuer</button>
    </div>
  </div>`;
}

const sayBtn = (text) => `<button class="mini" data-a="say" data-text="${esc(text)}" aria-label="Écouter">🔊</button>`;

// Carte « nouvelle phrase » (écouter et répéter) ou « révision » (dire la phrase de mémoire).
function renderCard(st) {
  const p = getPhrase(st.id);
  const ss = view.ss;
  const review = st.type === "review";
  const reveal = !review || ss.hint || ss.result;
  const anim = !ss.shown;
  ss.shown = true;
  return `
  <div class="screen dark card-screen">
    ${sessionTop(true)}
    ${review ? exTag("🧠", "Dis-le en anglais", st) : `<div class="card-tag">Nouvelle phrase · ${p.sit.emoji} ${esc(p.sit.title)}</div>`}
    <div class="card-body ${anim ? "anim" : ""}">
      <div class="card-fr">${esc(p.fr)}</div>
      ${reveal
        ? `<div class="card-en">${ss.result ? wordsHtml(ss.result.words) : esc(p.en)}</div>`
        : `<div class="card-en hidden">Dis-le en anglais</div>`}
      ${reveal && p.sounds ? `<div class="card-sounds">🗣️ ça sonne « ${esc(p.sounds)} »</div>` : ""}
      ${reveal && p.note ? `<div class="card-note">💡 ${esc(p.note)}</div>` : ""}
    </div>
    ${micPanel(reveal ? p.en : null)}
    ${ss.result ? cardSheet(ss) : ""}
  </div>`;
}

// Panneau micro : onde sonore + boutons écouter / parler / lentement.
function micPanel(text, { kbd = true } = {}) {
  const ss = view.ss;
  const label = ss.listening ? esc(ss.interim) || "Je t'écoute…" : ss.error ? esc(ss.error) : "Touche le micro et parle";
  const side = text
    ? [`<button class="round" data-a="say" data-text="${esc(text)}" aria-label="Écouter">🔊</button>`,
       `<button class="round" data-a="say" data-slow="1" data-text="${esc(text)}" aria-label="Lentement">🐢</button>`]
    : [`<button class="round" data-a="hint" aria-label="Indice">💡</button>`, `<button class="round" data-a="next" aria-label="Passer">⏭</button>`];
  return `
  <div class="mic-panel">
    <div class="wave ${ss.listening ? "live" : ""}">${"<i></i>".repeat(9)}</div>
    <div class="mic-label ${ss.error && !ss.listening ? "err" : ""}" id="interim">${label}</div>
    <div class="mic-row">
      ${side[0]}
      <button class="mic ${ss.listening ? "on" : ""}" data-a="mic" aria-label="Parler">${ss.listening ? "■" : "🎤"}</button>
      ${side[1]}
    </div>
    <div class="mic-links">
      ${kbd ? `<button class="link" data-a="kbd">⌨️ ${ss.keyboard ? "Masquer le clavier" : "Clavier"}</button>` : ""}
      ${text ? `<button class="link" data-a="next">Passer</button>` : ""}
    </div>
    ${ss.keyboard ? `<div class="kbd"><input id="kbdInput" type="text" lang="en" autocomplete="off" autocapitalize="sentences" placeholder="Dicte ou tape en anglais…"><button class="btn3d small" data-a="check">OK</button></div>` : ""}
  </div>`;
}

function cardSheet(ss) {
  const sc = ss.result.score;
  if (sc >= PASS) return sheet({ cls: "ok", title: `✓ ${ss.praise}`, sub: `Entendu : « ${esc(ss.result.heard)} »` });
  const mid = sc >= 0.5;
  return sheet({
    cls: mid ? "mid" : "ko",
    title: mid ? "Presque !" : "Pas encore",
    sub: `${mid ? "Retravaille les mots en rouge." : "Réécoute le modèle et réessaie."}<br>Entendu : « ${esc(ss.result.heard)} »`,
    retry: true,
  });
}

// « Qu'est-ce qu'il a dit ? » : écouter, puis choisir le bon sens parmi trois.
function renderListen(st) {
  const p = getPhrase(st.id);
  const ss = view.ss;
  const done = ss.picked !== null;
  const ok = done && ss.picked === st.answer;
  return `
  <div class="screen dark card-screen ${done ? "has-sheet" : ""}">
    ${sessionTop(true)}
    ${exTag("🎧", "Qu'est-ce qu'il a dit ?", st)}
    <div class="card-body">
      <button class="play-big" data-a="say" data-text="${esc(p.en)}" aria-label="Réécouter">🔊</button>
      <button class="link" data-a="say" data-slow="1" data-text="${esc(p.en)}">🐢 Plus lentement</button>
      ${done ? `<div class="card-en mid-en">${esc(p.en)}</div>` : `<div class="card-fr">Écoute, puis choisis le bon sens</div>`}
    </div>
    <div class="choices">
      ${st.options.map((o, i) => `<button class="choice ${done ? (i === st.answer ? "correct" : i === ss.picked ? "wrong" : "dim") : ""}" data-a="choose" data-i="${i}">${esc(o)}</button>`).join("")}
    </div>
    ${done ? "" : `<div class="center"><button class="link" data-a="next">Passer</button></div>`}
    ${done ? sheet(ok ? { cls: "ok", title: `✓ ${ss.praise}` } : { cls: "ko", title: "Raté", sub: `Ça voulait dire : <b>${esc(p.fr)}</b>` }) : ""}
  </div>`;
}

// Remettre les mots dans l'ordre.
function renderOrder(st) {
  const p = getPhrase(st.id);
  const ss = view.ss;
  const done = !!ss.result;
  const answer = ss.placed.map((ci, k) => `<button class="word-chip" data-a="unchip" data-k="${k}" ${done ? "disabled" : ""}>${esc(st.chips[ci])}</button>`).join("");
  const bank = st.chips.map((w, ci) => ss.placed.includes(ci)
    ? `<span class="word-chip ghost">${esc(w)}</span>`
    : `<button class="word-chip" data-a="chip" data-i="${ci}" ${done ? "disabled" : ""}>${esc(w)}</button>`).join("");
  return `
  <div class="screen dark card-screen ${done ? "has-sheet" : ""}">
    ${sessionTop(true)}
    ${exTag("🧩", "Remets les mots dans l'ordre", st)}
    <div class="card-body order-body">
      <div class="card-fr big-fr">${esc(p.fr)}</div>
      <div class="order-answer">${answer || `<span class="order-placeholder">Touche les mots dans l'ordre</span>`}</div>
      <div class="order-bank">${bank}</div>
    </div>
    ${done ? "" : `<div class="bottom-actions"><button class="btn3d wide" data-a="orderCheck">Vérifier</button><div class="center"><button class="link" data-a="next">Passer</button></div></div>`}
    ${done ? sheet(ss.result.ok
      ? { cls: "ok", title: `✓ ${ss.praise}`, sub: esc(p.en) }
      : { cls: "ko", title: "Pas tout à fait", sub: `La bonne phrase : <b>${esc(p.en)}</b>`, retry: true }) : ""}
  </div>`;
}

// Dictée : écrire ce qu'on entend (les petites fautes de frappe sont tolérées).
function renderDictation(st) {
  const p = getPhrase(st.id);
  const ss = view.ss;
  const r = ss.result;
  let result = "";
  if (r) {
    result = r.score >= DICTATION_PASS
      ? sheet({ cls: "ok", title: `✓ ${ss.praise}`, sub: r.score < 1 || ss.typed.toLowerCase() !== p.en.toLowerCase() ? `Correct : <b>${esc(p.en)}</b>` : "" })
      : sheet({ cls: r.score >= 0.6 ? "mid" : "ko", title: r.score >= 0.6 ? "Presque !" : "Pas encore", sub: `La phrase : <b>${esc(p.en)}</b>`, retry: true });
  }
  return `
  <div class="screen dark card-screen ${r ? "has-sheet" : ""}">
    ${sessionTop(true)}
    ${exTag("✍️", "Dictée : écris ce que tu entends", st)}
    <div class="card-body">
      <button class="play-big" data-a="say" data-text="${esc(p.en)}" aria-label="Réécouter">🔊</button>
      <button class="link" data-a="say" data-slow="1" data-text="${esc(p.en)}">🐢 Plus lentement</button>
      ${r ? `<div class="card-en mid-en">${wordsHtml(r.words)}</div>`
        : ss.showFr ? `<div class="card-fr">${esc(p.fr)}</div>` : `<button class="link" data-a="dictFr">💡 Voir la traduction</button>`}
    </div>
    <div class="dict-zone">
      <input id="dictInput" class="dict-input" type="text" lang="en" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
        placeholder="Écris ce que tu entends…" value="${esc(ss.typed)}" ${r ? "disabled" : ""}>
      ${r ? "" : `<button class="btn3d wide" data-a="dictCheck">Vérifier</button><div class="center"><button class="link" data-a="next">Passer</button></div>`}
    </div>
    ${result}
  </div>`;
}

// Réponse express : un personnage te parle, tu as quelques secondes pour commencer à répondre.
function renderExpress(st) {
  const sit = getSituation(st.sit);
  const t = sit.dialogue.turns[st.turn];
  const ss = view.ss;
  const r = ss.result;
  const showPrompt = ss.hint || level() <= 0.85;
  const left = ss.deadline ? Math.max(0, (ss.deadline - Date.now()) / (ss.dur * 1000)) : 1;
  let result = "";
  if (r) {
    if (r.timeout) result = sheet({ cls: "ko", title: "⏱️ Trop tard !", sub: `Tu pouvais dire : <b>${esc(t.answers[0])}</b> ${sayBtn(t.answers[0])}` });
    else if (r.ok) result = sheet({ cls: "ok", title: "⚡ Rapide et juste !", sub: `Entendu : « ${esc(r.heard)} »` });
    else result = sheet({ cls: "mid", title: "Pas tout à fait", sub: `Entendu : « ${esc(r.heard)} »<br>Essaie : <b>${esc(r.answer)}</b> ${sayBtn(r.answer)}` });
  }
  return `
  <div class="screen chat-screen ${r ? "has-sheet" : ""}">
    ${sessionTop(false)}
    <div class="card-tag light">⚡ Réponse express</div>
    ${chatHeader(sit.char, null)}
    <div class="chat">
      ${expressQuestion(sit, st.turn).map((q) => `<div class="bubble them" data-a="say" data-text="${esc(q.them)}">${q.who ? `<div class="who">${esc(q.who)}</div>` : ""}${esc(q.them)}</div>`).join("")}
    </div>
    <div class="timer ${ss.answered || r ? "stopped" : ""}"><div id="timerFill" style="width:${Math.round(left * 100)}%"></div></div>
    <div class="composer">
      ${showPrompt ? `<div class="prompt"><span class="prompt-label">À toi</span> ${esc(t.you)}</div>` : `<button class="chip" data-a="hint">💡 Indice</button>`}
      <div class="composer-row">
        <button class="mic ${ss.listening ? "on" : ""}" data-a="mic" aria-label="Parler">${ss.listening ? "■" : "🎤"}</button>
        <button class="round light" data-a="kbd" aria-label="Clavier">⌨️</button>
      </div>
      <div class="mic-label ${ss.error && !ss.listening ? "err" : ""}" id="interim">${ss.listening ? esc(ss.interim) || "Je t'écoute…" : ss.error ? esc(ss.error) : ""}</div>
      ${ss.keyboard ? `<div class="kbd"><input id="kbdInput" type="text" lang="en" autocomplete="off" autocapitalize="sentences" placeholder="Dicte ou tape en anglais…"><button class="btn3d small" data-a="check">OK</button></div>` : ""}
      <div class="center"><button class="link" data-a="next">Passer</button></div>
    </div>
    ${result}
  </div>`;
}

async function startExpress(st) {
  const ss = view.ss;
  if (state.settings.autoplay) {
    for (const q of expressQuestion(getSituation(st.sit), st.turn)) {
      await say(q.them);
      if (view.ss !== ss) return;
    }
  }
  if (ss.answered || ss.result) return;
  const lvl = level();
  ss.dur = lvl < 0.6 ? 14 : lvl > 0.85 ? 8 : 10;
  ss.deadline = Date.now() + ss.dur * 1000;
  clearInterval(exprTimer);
  exprTimer = setInterval(() => {
    if (view.ss !== ss || ss.answered || ss.result) { clearInterval(exprTimer); return; }
    const left = ss.deadline - Date.now();
    const el = document.getElementById("timerFill");
    if (el) {
      el.style.width = `${Math.max(0, left / (ss.dur * 1000)) * 100}%`;
      el.classList.toggle("low", left < ss.dur * 300);
    }
    if (left <= 0) {
      clearInterval(exprTimer);
      ss.result = { timeout: true };
      sfx.ko();
      recordResult(st, false);
      render();
    }
  }, 100);
}

// ---------- Sons difficiles ----------
function renderSoundIntro(st) {
  const snd = getSound(st.sound);
  return `
  <div class="screen intro-screen">
    ${sessionTop(false)}
    <div class="intro-body">
      <div class="big-emoji">${snd.emoji}</div>
      <h2>${esc(snd.title)}</h2>
      <div class="sound-example">${esc(snd.example)}</div>
      <div class="tip"><p>${esc(snd.how)}</p></div>
      <div class="muted small">Touche une paire pour entendre la différence :</div>
      <div class="pair-list">
        ${snd.pairs.map(([a, b]) => `<button class="chip" data-a="sayPair" data-w1="${esc(a)}" data-w2="${esc(b)}">🔊 ${esc(a)} / ${esc(b)}</button>`).join("")}
      </div>
    </div>
    <div class="bottom-bar"><button class="btn3d wide" data-a="next">C'est parti</button></div>
  </div>`;
}

// Entendre la différence : un des deux mots est prononcé, il faut le reconnaître.
function renderPick(st) {
  const ss = view.ss;
  const word = st.pair[st.target];
  const done = ss.picked !== null;
  const ok = done && ss.picked === st.target;
  const compareBtns = `<div class="row">${st.pair.map((w) => `<button class="chip" data-a="say" data-text="${esc(w)}">🔊 ${esc(w)}</button>`).join("")}</div>`;
  return `
  <div class="screen dark card-screen ${done ? "has-sheet" : ""}">
    ${sessionTop(true)}
    <div class="card-tag">👂 Quel mot entends-tu ?</div>
    <div class="card-sub">${esc(getSound(st.sound).title)}</div>
    <div class="card-body">
      <button class="play-big" data-a="say" data-text="${esc(word)}" aria-label="Réécouter">🔊</button>
      <button class="link" data-a="say" data-slow="1" data-text="${esc(word)}">🐢 Plus lentement</button>
    </div>
    <div class="choices two">
      ${st.pair.map((w, i) => `<button class="choice ${done ? (i === st.target ? "correct" : i === ss.picked ? "wrong" : "dim") : ""}" data-a="pickWord" data-i="${i}">${esc(w)}</button>`).join("")}
    </div>
    ${done ? "" : `<div class="center"><button class="link" data-a="next">Passer</button></div>`}
    ${done ? sheet(ok
      ? { cls: "ok", title: "✓ Bien entendu !", extra: compareBtns }
      : { cls: "ko", title: `C'était « ${esc(word)} »`, sub: "Écoute les deux mots pour comparer :", extra: compareBtns }) : ""}
  </div>`;
}

// Prononcer un des deux mots : la reconnaissance vocale dit lequel elle a compris.
function renderSay(st) {
  const ss = view.ss;
  const word = st.pair[st.target];
  const other = st.pair[1 - st.target];
  const r = ss.result;
  let result = "";
  if (r) {
    if (r.ok) result = sheet({ cls: "ok", title: "✓ Bien prononcé !", sub: `Entendu : « ${esc(r.heard)} »` });
    else if (r.other) result = sheet({ cls: "ko", title: `J'ai entendu « ${esc(other)} »`, sub: "Écoute le modèle et réessaie en exagérant le son.", retry: true });
    else result = sheet({ cls: "mid", title: "Pas sûr…", sub: `J'ai entendu « ${esc(r.heard)} ». Réessaie.`, retry: true });
  }
  return `
  <div class="screen dark card-screen ${r ? "has-sheet" : ""}">
    ${sessionTop(true)}
    <div class="card-tag">🗣️ Prononce ce mot</div>
    <div class="card-sub">${esc(getSound(st.sound).title)}</div>
    <div class="card-body">
      <div class="sound-word">${esc(word)}</div>
      <div class="card-fr">et pas « ${esc(other)} »</div>
    </div>
    ${micPanel(word, { kbd: false })}
    ${result}
  </div>`;
}

// ---------- Fin de séance ----------
function renderEnd() {
  const s = view.stats;
  const streak = store.streak(state);
  const kind = view.kind;
  const titles = { daily: "Séance terminée !", weak: "Points faibles travaillés !", express: "Défi express terminé !", sound: "Son travaillé !" };
  const notes = {
    daily: "Tes phrases reviendront en révision au bon moment.",
    weak: "Ces phrases vont revenir souvent pour bien s'ancrer.",
    express: "Plus tu réponds vite, plus ça devient automatique.",
    sound: "Refais cette leçon de temps en temps pour bien entendre la différence.",
  };
  return `
  <div class="screen end-screen">
    <div class="end-body">
      <div class="end-flame">🔥</div>
      <div class="end-streak">${plural(streak, "jour")} d'affilée</div>
      <h1>${titles[kind]}</h1>
      ${s.chapterDone ? chapterDoneBanner(s.chapterDone) : ""}
      <div class="end-stats">
        ${s.learned ? `<div class="stat"><b>${s.learned}</b><span>nouvelles phrases</span></div>` : ""}
        ${s.exercises ? `<div class="stat"><b>${s.ok}/${s.exercises}</b><span>exercices réussis</span></div>` : ""}
        ${s.dialogues ? `<div class="stat"><b>${s.dialogues}</b><span>conversation</span></div>` : ""}
      </div>
      <p class="muted">${notes[kind]}</p>
    </div>
    <div class="bottom-bar"><button class="btn3d wide" data-a="${kind === "daily" ? "home" : "train"}">${kind === "daily" ? "Retour aux messages" : "Retour à l'entraînement"}</button></div>
  </div>`;
}

function chapterDoneBanner(chId) {
  const ch = getChapter(chId);
  const nextCh = CHAPTERS[CHAPTERS.indexOf(ch) + 1];
  const after = nextCh ? `Prochain : ${nextCh.emoji} ${esc(nextCh.title)}` : "Tu as fini tout le parcours, bravo !";
  return `<div class="chapter-done">🏆 Chapitre « ${esc(ch.title)} » terminé !<div class="small">${after}</div></div>`;
}

function confetti() {
  const colors = ["#7C5CFF", "#2ED3A0", "#FFB020", "#FF5C8A", "#4C7DFF"];
  const box = document.createElement("div");
  box.className = "confetti";
  for (let i = 0; i < 60; i++) {
    const p = document.createElement("i");
    p.style.left = Math.random() * 100 + "%";
    p.style.background = pick(colors);
    p.style.animationDelay = Math.random() * 0.6 + "s";
    p.style.animationDuration = 1.8 + Math.random() * 1.4 + "s";
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 4000);
}

// ---------- Dialogues ----------
function dialogueContext() {
  if (view.name === "practice") return { sit: getSituation(view.sit), ss: view.ss };
  const st = currentStep();
  if (st && st.type === "dialogue") return { sit: getSituation(st.sit), ss: view.ss };
  return null;
}

async function playThem() {
  const ctx = dialogueContext();
  if (!ctx) return;
  const { sit, ss } = ctx;
  const turns = sit.dialogue.turns;
  ss.playing = true;
  render();
  while (ss.turn < turns.length && turns[ss.turn].them) {
    const t = turns[ss.turn];
    await sleep(450);
    if (view.ss !== ss) return;
    ss.log.push({ side: "them", en: t.them, fr: t.fr, who: t.who });
    ss.turn++;
    sfx.pop();
    render();
    scrollToBottom();
    if (state.settings.autoplay) await say(t.them);
    if (view.ss !== ss) return;
  }
  ss.playing = false;
  if (ss.turn >= turns.length) {
    ss.done = true;
    sfx.ok();
  }
  render();
  scrollToBottom();
}

function scrollToBottom() {
  requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
}

function renderDialogue(sit, ss, inSession) {
  const turns = sit.dialogue.turns;
  const t = turns[ss.turn];
  const bubbles = ss.log.map((m, i) => {
    if (m.side === "them") {
      return `<div class="bubble them ${i >= ss.seen ? "anim" : ""}" data-a="say" data-text="${esc(m.en)}">
        ${m.who ? `<div class="who">${esc(m.who)}</div>` : ""}${esc(m.en)}
        ${m.showFr ? `<div class="tr">${esc(m.fr)}</div>` : ""}
        <button class="fr-btn" data-a="fr" data-i="${i}">${m.showFr ? "×" : "FR"}</button>
      </div>`;
    }
    return `<div class="bubble you ${m.skipped ? "skipped" : ""} ${i >= ss.seen ? "anim" : ""}">${esc(m.en)}${m.heard ? `<div class="tr">« ${esc(m.heard)} »</div>` : ""}</div>`;
  }).join("");
  ss.seen = ss.log.length;

  let bottom = "";
  if (ss.done) {
    bottom = `
    <div class="sheet ok static">
      <div class="sheet-title">🎉 Conversation terminée !</div>
      <div class="sheet-actions">
        ${inSession
          ? `<button class="btn3d ok" data-a="next">Continuer</button>`
          : `<button class="btn3d ghost" data-a="replay">Rejouer</button><button class="btn3d ok" data-a="thread" data-id="${sit.char}">Terminer</button>`}
      </div>
    </div>`;
  } else if (ss.playing || !t) {
    bottom = `<div class="typing-row">${avatar(sit.char, 28)}<div class="typing"><span></span><span></span><span></span></div></div>`;
  } else {
    bottom = `
    <div class="composer">
      <div class="prompt"><span class="prompt-label">À toi</span> ${esc(t.you)}</div>
      ${t.free ? `<div class="muted small center">Par exemple : ${t.examples.map(esc).join(" · ")}</div>` : ""}
      ${ss.help && !t.free ? `<div class="help">${esc(t.answers[0])} ${sayBtn(t.answers[0])}</div>` : ""}
      ${dialogueMic(t)}
    </div>
    ${ss.result ? `
    <div class="sheet mid">
      <div class="sheet-title">Pas tout à fait</div>
      <div class="sheet-heard">Entendu : « ${esc(ss.result.heard)} »</div>
      <div class="sheet-sub">Essaie : <b>${esc(ss.result.answer)}</b> ${sayBtn(ss.result.answer)}</div>
      <div class="sheet-actions"><button class="btn3d ghost" data-a="dlgSkip">Passer</button><button class="btn3d mid" data-a="retry">Réessayer</button></div>
    </div>` : ""}`;
  }

  return `
  <div class="screen chat-screen">
    ${inSession ? sessionTop(false) : ""}
    ${chatHeader(sit.char, inSession ? null : "thread", inSession ? null : sit.char)}
    <div class="scene">${sit.emoji} ${esc(sit.dialogue.title)}</div>
    <div class="chat">${bubbles}</div>
    ${bottom}
  </div>`;
}

function dialogueMic(t) {
  const ss = view.ss;
  const label = ss.listening ? esc(ss.interim) || "Je t'écoute…" : ss.error ? esc(ss.error) : "";
  return `
  <div class="composer-row">
    ${t.free ? "" : `<button class="round light" data-a="dlgHelp" aria-label="Aide">💡</button>`}
    <button class="mic ${ss.listening ? "on" : ""}" data-a="mic" aria-label="Parler">${ss.listening ? "■" : "🎤"}</button>
    <button class="round light" data-a="kbd" aria-label="Clavier">⌨️</button>
  </div>
  <div class="mic-label ${ss.error && !ss.listening ? "err" : ""}" id="interim">${label}</div>
  ${ss.keyboard ? `<div class="kbd"><input id="kbdInput" type="text" lang="en" autocomplete="off" autocapitalize="sentences" placeholder="Dicte ou tape en anglais…"><button class="btn3d small" data-a="check">OK</button></div>` : ""}
  <div class="center"><button class="link" data-a="dlgSkip">Passer cette réplique</button></div>`;
}

function advanceDialogue(ctx, entry) {
  const { ss } = ctx;
  ss.log.push(entry);
  ss.turn++;
  ss.result = null;
  ss.help = false;
  ss.error = null;
  ss.keyboard = false;
  playThem();
}

function onDialogueAnswer(ctx, text) {
  const { sit, ss } = ctx;
  const t = sit.dialogue.turns[ss.turn];
  if (!t || !t.you) return;
  if (t.free) { sfx.ok(); return advanceDialogue(ctx, { side: "you", en: text }); }
  const m = bestMatch(t.answers, text);
  if (m.score >= DIALOG_PASS) {
    sfx.ok();
    advanceDialogue(ctx, { side: "you", en: m.answer, heard: m.score < 1 ? text : null });
  } else {
    sfx.almost();
    ss.result = { score: m.score, answer: m.score >= 0.5 ? m.answer : t.answers[0], heard: text };
    render();
    scrollToBottom();
  }
}

function startPractice(id) {
  go({ name: "practice", sit: id, ss: newStepState() });
  playThem();
}

function renderPractice() {
  return renderDialogue(getSituation(view.sit), view.ss, false);
}

// ---------- S'entraîner ----------
function renderTrain() {
  const lvl = level();
  const weak = store.weakIds(state, 10).length;
  const learnedPhrases = Object.keys(state.cards).length;
  const hasExpress = expressCandidates().length > 0;
  const tile = (emoji, title, desc, action, disabled) => `
    <button class="tile ${disabled ? "disabled" : ""}" ${disabled ? "" : `data-a="${action}"`}>
      <span class="chapter-emoji">${emoji}</span>
      <div class="grow"><b>${title}</b><div class="muted small">${desc}</div></div>
      ${disabled ? "" : `<span class="chev">›</span>`}
    </button>`;

  const stories = STORIES.map((s) => {
    const sit = getSituation(s.unlock);
    if (!isLearned(s.unlock)) {
      return `<div class="phrase-row locked-row"><span class="node-sm">🔒</span>
        <div class="grow"><b>${esc(s.title)}</b><div class="muted small">Après « ${esc(sit.title)} »</div></div></div>`;
    }
    const done = state.stories[s.id];
    return `<button class="phrase-row" data-a="story" data-id="${s.id}">
      ${avatar(s.char, 40)}
      <div class="grow"><b>${esc(s.title)}</b><div class="muted small">${s.lines.length} phrases · 3 questions</div></div>
      ${done ? `<span class="badge-score">✓ ${done.best}/3</span>` : `<span class="badge-new">Nouveau</span>`}
    </button>`;
  }).join("");

  const sounds = SOUNDS.map((snd) => {
    const best = state.sounds[snd.id] && state.sounds[snd.id].best;
    return `<button class="phrase-row" data-a="sound" data-id="${snd.id}">
      <span class="node-sm">${snd.emoji}</span>
      <div class="grow"><b>${esc(snd.title)}</b><div class="muted small">${esc(snd.example)}</div></div>
      ${best !== undefined ? `<span class="badge-score">${best} %</span>` : `<span class="chev">›</span>`}
    </button>`;
  }).join("");

  return `
  <div class="screen">
    <header class="home-head">
      <div><div class="muted small">Difficulté ${levelLabel(lvl)} · s'adapte à tes résultats</div><h1>S'entraîner</h1></div>
    </header>
    <div class="tiles">
      ${tile("🎯", "Mes points faibles", weak ? `${plural(weak, "phrase")} à retravailler` : "Rien à retravailler pour l'instant 👌", "weak", !weak)}
      ${tile("⚡", "Défi express", hasExpress ? "Réponds vite à 6 répliques" : "Termine une situation pour le débloquer", "expressRound", !hasExpress)}
      ${tile("🚶", "Mains libres", learnedPhrases ? "Séance 100 % audio, écouteurs conseillés" : "Apprends quelques phrases d'abord", "handsfree", !learnedPhrases)}
    </div>
    <h3 class="group-title">🎧 Histoires audio</h3>
    <div class="list">${stories}</div>
    <h3 class="group-title">👅 Sons difficiles</h3>
    <div class="list">${sounds}</div>
    ${tabbar("train")}
  </div>`;
}

// ---------- Histoires audio ----------
function openStory(id) {
  go({ name: "story", id, phase: "listen", playing: false, run: 0, cur: -1, showText: false, showFr: false, q: 0, picked: null, score: 0, order: [] });
}

function renderStory() {
  const v = view;
  const s = getStory(v.id);
  const head = `
  <header class="chat-head">
    <button class="icon" data-a="train" aria-label="Retour">‹</button>
    ${avatar(s.char, 38)}
    <div class="grow"><b>${esc(s.title)}</b><div class="muted small">Histoire audio</div></div>
  </header>`;

  if (v.phase === "quiz") {
    const q = s.questions[v.q];
    const done = v.picked !== null;
    const last = v.q === s.questions.length - 1;
    return `
    <div class="screen">
      ${head}
      <div class="quiz">
        <div class="muted small">Question ${v.q + 1} sur ${s.questions.length}</div>
        <h2>${esc(q.q)}</h2>
        <div class="choices light">
          ${v.order[v.q].map((oi) => `<button class="choice ${done ? (oi === 0 ? "correct" : oi === v.picked ? "wrong" : "dim") : ""}" data-a="storyPick" data-i="${oi}">${esc(q.options[oi])}</button>`).join("")}
        </div>
        ${done ? "" : `<button class="link" data-a="storyBack">🔁 Réécouter l'histoire</button>`}
      </div>
      ${done ? `<div class="bottom-bar"><button class="btn3d wide ${v.picked === 0 ? "ok" : "ko"}" data-a="storyNext">${last ? "Voir mon score" : "Question suivante"}</button></div>` : ""}
    </div>`;
  }

  if (v.phase === "done") {
    const n = s.questions.length;
    return `
    <div class="screen end-screen">
      ${head}
      <div class="end-body">
        <div class="end-flame">${v.score === n ? "🏆" : v.score >= n - 1 ? "👍" : "💪"}</div>
        <h1>${v.score} / ${n}</h1>
        <p class="muted">${v.score === n ? "Tu as tout compris, bravo !" : "Réécoute avec le texte pour repérer ce qui t'a échappé."}</p>
      </div>
      <div class="bottom-bar row">
        <button class="btn3d ghost grow" data-a="storyAgain">Réécouter avec le texte</button>
        <button class="btn3d grow" data-a="train">Terminer</button>
      </div>
    </div>`;
  }

  const lines = s.lines.map((l, i) => `
    <button class="story-line ${i === v.cur ? "cur" : ""}" data-a="storyLine" data-i="${i}">
      ${v.showText ? `<span>${esc(l.en)}</span>` : `<span class="hidden-line">${"▬ ".repeat(Math.min(9, Math.ceil(l.en.split(" ").length / 2)))}</span>`}
      ${v.showFr ? `<span class="tr">${esc(l.fr)}</span>` : ""}
    </button>`).join("");

  return `
  <div class="screen">
    ${head}
    <section class="story-player">
      <button class="play-big light" data-a="storyPlay" aria-label="${v.playing ? "Pause" : "Écouter"}">${v.playing ? "⏸" : "▶️"}</button>
      <div class="muted small">${v.playing ? `Phrase ${v.cur + 1} sur ${s.lines.length}` : "Écoute l'histoire, puis réponds à 3 questions"}</div>
      <div class="row center">
        <button class="chip ${v.showText ? "on" : ""}" data-a="storyText">📝 Texte</button>
        <button class="chip ${v.showFr ? "on" : ""}" data-a="storyFr">🇫🇷 Traduction</button>
      </div>
    </section>
    <div class="story-lines">${lines}</div>
    <div class="bottom-bar"><button class="btn3d wide" data-a="storyQuiz">Répondre aux questions</button></div>
  </div>`;
}

async function storyPlay() {
  const v = view;
  if (v.playing) {
    v.playing = false;
    v.run++;
    speech.stopSpeaking();
    render();
    return;
  }
  const s = getStory(v.id);
  v.playing = true;
  const run = ++v.run;
  const alive = () => view === v && v.playing && v.run === run;
  for (let i = v.cur >= 0 && v.cur < s.lines.length - 1 ? v.cur : 0; i < s.lines.length; i++) {
    v.cur = i;
    render();
    await say(s.lines[i].en);
    if (!alive()) return;
    await sleep(350);
    if (!alive()) return;
  }
  v.playing = false;
  v.cur = -1;
  render();
}

// ---------- Mode mains libres ----------
function handsfreeItems() {
  const due = known(store.dueIds(state));
  const rest = known(Object.keys(state.cards)).filter((id) => !due.includes(id)).sort((a, b) => state.cards[a].box - state.cards[b].box);
  return [...shuffle(due), ...shuffle(rest.slice(0, 16))].slice(0, 12);
}

function openHandsfree() {
  go({
    name: "handsfree",
    hf: { items: handsfreeItems(), i: 0, status: "ready", mode: speech.SR ? "check" : "passive", paused: true, run: 0, ok: 0, total: 0, showText: true, notice: null, interim: "" },
  });
}

const HF_STATUS = {
  ready: ["🎧", "Prêt ?"],
  fr: ["🇫🇷", "Écoute le français…"],
  think: ["🤔", "Essaie de le dire en anglais"],
  en: ["🇬🇧", "Écoute bien…"],
  listen: ["🎤", "À toi, répète !"],
  ok: ["✅", "Bien !"],
  ko: ["🔁", "Écoute encore une fois"],
  repeat: ["🗣️", "Répète à voix haute"],
  en2: ["🇬🇧", "Encore une fois…"],
  paused: ["⏸", "En pause"],
  done: ["🎉", "Terminé !"],
};

function renderHandsfree() {
  const hf = view.hf;
  const n = hf.items.length;
  const p = hf.items[hf.i] ? getPhrase(hf.items[hf.i]) : null;
  const running = hf.status !== "ready" && hf.status !== "done";
  const [ico, label] = HF_STATUS[running && hf.paused ? "paused" : hf.status];
  const showEn = ["en", "listen", "ok", "ko", "repeat", "en2"].includes(hf.status);
  let controls;
  if (hf.status === "ready") {
    controls = `
      <label class="check on-dark"><input type="checkbox" id="hfCheck" ${hf.mode === "check" ? "checked" : ""} ${speech.SR ? "" : "disabled"}> Vérifier ma prononciation avec le micro</label>
      <label class="check on-dark"><input type="checkbox" id="hfText" ${hf.showText ? "checked" : ""}> Afficher le texte</label>
      <button class="btn3d wide" data-a="hfStart">▶️ Démarrer (${plural(n, "phrase")})</button>
      <p class="muted small center">🎧 Mets tes écouteurs et garde l'écran allumé.</p>`;
  } else if (hf.status === "done") {
    controls = `<button class="btn3d wide" data-a="train">Retour à l'entraînement</button>`;
  } else {
    controls = `<button class="btn3d wide ${hf.paused ? "" : "ghost-dark"}" data-a="hfToggle">${hf.paused ? "▶️ Reprendre" : "⏸ Pause"}</button>`;
  }
  return `
  <div class="screen dark hf-screen">
    <div class="session-top on-dark">
      <button class="icon" data-a="train" aria-label="Quitter">✕</button>
      <div class="progress"><div style="width:${Math.round((hf.i / Math.max(1, n)) * 100)}%"></div></div>
      <span class="streak-mini">${Math.min(hf.i + 1, n)}/${n}</span>
    </div>
    <div class="hf-body">
      <div class="hf-ico ${hf.status === "listen" && !hf.paused ? "live" : ""}">${ico}</div>
      <div class="hf-label">${label}</div>
      ${hf.status === "listen" ? `<div class="mic-label" id="interim">${esc(hf.interim)}</div>` : ""}
      ${p && running && hf.showText ? `<div class="hf-text"><div class="card-fr">${esc(p.fr)}</div>${showEn ? `<div class="hf-en">${esc(p.en)}</div>` : ""}</div>` : ""}
      ${hf.status === "done" ? `<div class="hf-done">${hf.total ? `${hf.ok}/${hf.total} phrases bien répétées` : `${plural(n, "phrase")} pratiquées`}</div>` : ""}
      ${hf.notice ? `<div class="card-note">${esc(hf.notice)}</div>` : ""}
    </div>
    <div class="hf-controls">${controls}</div>
  </div>`;
}

function hfSet(hf, status) {
  hf.status = status;
  if (view.hf === hf) render();
}

// Boucle audio : français → temps pour essayer → anglais → tu répètes (vérifié au micro si possible).
async function hfRun() {
  const hf = view.hf;
  const run = ++hf.run;
  const alive = () => view.name === "handsfree" && view.hf === hf && !hf.paused && hf.run === run;
  while (hf.i < hf.items.length) {
    if (!alive()) return;
    const p = getPhrase(hf.items[hf.i]);
    hfSet(hf, "fr");
    await sayFr(p.fr);
    if (!alive()) return;
    hfSet(hf, "think");
    await sleep(hf.mode === "check" ? 2200 : 2600);
    if (!alive()) return;
    hfSet(hf, "en");
    await say(p.en);
    if (!alive()) return;
    if (hf.mode === "check") {
      hf.interim = "";
      hfSet(hf, "listen");
      const l = speech.createListener({
        onInterim: (t) => {
          hf.interim = t;
          const el = document.getElementById("interim");
          if (el && alive()) el.textContent = t;
        },
      });
      listener = l;
      let text = "", err = null;
      try { text = await l.start(); } catch (e) { err = e; }
      if (listener === l) listener = null;
      if (!alive()) return;
      if (err === "not-allowed" || err === "service-not-allowed" || err === "start-failed") {
        // iOS refuse parfois de lancer le micro sans geste : on continue en mode écoute-répétition.
        hf.mode = "passive";
        hf.notice = "Le micro ne peut pas démarrer tout seul ici : je continue en mode « écoute et répète », sans vérification.";
        continue;
      }
      const ok = !!text && compare(p.en, text).score >= PASS;
      hf.total++;
      if (ok) hf.ok++;
      hfSet(hf, ok ? "ok" : "ko");
      if (ok) sfx.ok(); else sfx.almost();
      await sleep(500);
      if (!alive()) return;
      if (!ok) {
        await say(p.en);
        if (!alive()) return;
      }
      await sleep(600);
    } else {
      hfSet(hf, "repeat");
      await sleep(1600 + p.en.length * 70);
      if (!alive()) return;
      hfSet(hf, "en2");
      await say(p.en);
      await sleep(900);
    }
    if (!alive()) return;
    hf.i++;
  }
  hf.status = "done";
  store.completeSession(state, { exercises: hf.total, ok: hf.ok, learned: 0 }, false);
  save();
  releaseWake();
  sfx.done();
  confetti();
  render();
}

// Garde l'écran allumé pendant le mode mains libres (si l'appareil le permet).
async function keepAwake() {
  try { wakeLock = await navigator.wakeLock.request("screen"); } catch (e) { wakeLock = null; }
}

function releaseWake() {
  try { if (wakeLock) wakeLock.release(); } catch (e) {}
  wakeLock = null;
}

// ---------- Réglages ----------
function renderSettings() {
  const voices = speech.englishVoices();
  const current = state.settings.voice || (voices[0] && voices[0].voiceURI);
  return `
  <div class="screen">
    <header class="home-head">
      <button class="icon" data-a="home" aria-label="Retour">‹</button>
      <div class="grow"><h1>Réglages</h1></div>
    </header>
    <section class="panel">
      <h3>Voix</h3>
      <label for="voiceSel">Voix anglaise</label>
      <select id="voiceSel">
        ${voices.map((v) => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === current ? "selected" : ""}>${esc(v.name)} (${esc(v.lang)})</option>`).join("")}
      </select>
      <label for="rateRange">Vitesse : <span id="rateVal">${state.settings.rate}</span></label>
      <input type="range" id="rateRange" min="0.5" max="1.2" step="0.05" value="${state.settings.rate}">
      <label class="check"><input type="checkbox" id="autoplay" ${state.settings.autoplay ? "checked" : ""}> Lire les phrases automatiquement</label>
      <button class="chip" data-a="say" data-text="Hey, what's up? This is how I sound.">🔊 Tester la voix</button>
      <p class="muted small">Pour une voix plus naturelle : Réglages iPhone → Accessibilité → Contenu énoncé → Voix → Anglais, puis télécharge une voix « améliorée ».</p>
    </section>
    <section class="panel">
      <h3>Sauvegarde</h3>
      <p class="muted small">Ta progression est enregistrée uniquement sur ce téléphone. Copie ta sauvegarde de temps en temps (dans Notes, par exemple).</p>
      <button class="chip" data-a="backup">📋 Copier ma sauvegarde</button>
      <label for="restoreText">Restaurer une sauvegarde</label>
      <textarea id="restoreText" rows="3" placeholder="Colle ta sauvegarde ici…"></textarea>
      <button class="chip" data-a="restore">Restaurer</button>
    </section>
    <section class="panel">
      <h3>Autres</h3>
      <div class="row"><a class="chip" href="test.html">🩺 Diagnostic voix</a><button class="chip danger" data-a="reset">Tout réinitialiser</button></div>
    </section>
    ${tabbar("settings")}
  </div>`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

// ---------- Micro / réponses ----------
async function startListening() {
  const ss = view.ss;
  if (listener) { listener.stop(); return; }
  const st = currentStep();
  if (st && st.type === "express") {
    if (ss.result) return;
    ss.answered = true; // le chrono s'arrête dès que tu commences à répondre
  }
  if (!speech.SR) {
    ss.keyboard = true;
    ss.error = "Micro indisponible ici : utilise le clavier.";
    render();
    return;
  }
  speech.stopSpeaking();
  Object.assign(ss, { listening: true, interim: "", error: null, result: null });
  render();
  const l = speech.createListener({
    onInterim: (t) => {
      if (view.ss !== ss) return;
      ss.interim = t;
      const el = document.getElementById("interim");
      if (el) el.textContent = t || "Je t'écoute…";
    },
  });
  listener = l;
  let text = "", err = null;
  try { text = await l.start(); } catch (e) { err = e; }
  if (listener === l) listener = null;
  if (view.ss !== ss) return;
  ss.listening = false;
  if (err) ss.error = MIC_ERRORS[err] || `Erreur micro (${err}). Essaie le clavier.`;
  else if (!text) ss.error = "Je n'ai rien entendu. Réessaie en parlant plus près.";
  if (err || !text) { render(); return; }
  handleAnswer(text);
}

function handleAnswer(text) {
  const ctx = dialogueContext();
  if (ctx) return onDialogueAnswer(ctx, text);
  const st = currentStep();
  if (!st) return;
  if (st.type === "express") return onExpressAnswer(st, text);
  if (st.type === "say") return onSayAnswer(st, text);
  if (st.type !== "learn" && st.type !== "review") return;
  const ss = view.ss;
  const r = compare(getPhrase(st.id).en, text);
  ss.result = { ...r, heard: text };
  ss.error = null;
  if (r.score >= PASS) sfx.ok(); else if (r.score >= 0.5) sfx.almost(); else sfx.ko();
  if (st.type === "review") recordResult(st, r.score >= PASS);
  render();
}

function onExpressAnswer(st, text) {
  const ss = view.ss;
  if (ss.result) return;
  const t = getSituation(st.sit).dialogue.turns[st.turn];
  const m = bestMatch(t.answers, text);
  const ok = m.score >= DIALOG_PASS;
  ss.result = { ok, heard: text, answer: ok || m.score >= 0.5 ? m.answer : t.answers[0] };
  if (ok) sfx.ok(); else sfx.almost();
  recordResult(st, ok);
  render();
}

function onSayAnswer(st, text) {
  const ss = view.ss;
  const word = st.pair[st.target].toLowerCase();
  const other = st.pair[1 - st.target].toLowerCase();
  const heard = tokens(text);
  const ok = heard.includes(word);
  ss.result = { ok, heard: text, other: !ok && heard.includes(other) };
  if (ok) sfx.ok(); else sfx.ko();
  recordResult(st, ok);
  render();
}

// ---------- Actions ----------
const actions = {
  home: () => go({ name: "home" }),
  phrases: (d) => go({ name: "phrases", sit: d.id || null, from: d.from || null }),
  path: () => go({ name: "path" }),
  train: () => go({ name: "train" }),
  settings: () => go({ name: "settings" }),
  thread: (d) => go({ name: "thread", char: d.id }),
  practice: (d) => startPractice(d.id),
  replay: () => startPractice(view.sit),
  start: () => startSession("daily", buildDaily()),
  weak: () => startSession("weak", buildWeak()),
  expressRound: () => startSession("express", buildExpressRound()),
  sound: (d) => startSession("sound", buildSound(d.id), { sound: d.id }),
  story: (d) => openStory(d.id),
  handsfree: openHandsfree,
  next: nextStep,
  say: (d) => say(d.text, d.slow === "1"),
  sayPair: async (d) => {
    await say(d.w1);
    await sleep(250);
    say(d.w2);
  },
  mic: startListening,
  retry: () => {
    const ss = view.ss;
    ss.result = null;
    if (currentStep() && currentStep().type === "order") ss.placed = [];
    render();
  },
  kbd: () => {
    const st = currentStep();
    if (st && st.type === "express") view.ss.answered = true;
    view.ss.keyboard = !view.ss.keyboard;
    render();
    if (view.ss.keyboard) document.getElementById("kbdInput").focus();
  },
  check: () => {
    const input = document.getElementById("kbdInput");
    const v = input && input.value.trim();
    if (v) handleAnswer(v);
  },
  hint: () => {
    const st = currentStep();
    view.ss.hint = true;
    render();
    if (st.type === "review") say(getPhrase(st.id).en);
  },
  choose: (d) => {
    const st = currentStep();
    const ss = view.ss;
    if (ss.picked !== null) return;
    ss.picked = Number(d.i);
    const ok = ss.picked === st.answer;
    if (ok) sfx.ok(); else sfx.ko();
    recordResult(st, ok);
    render();
    if (!ok) say(getPhrase(st.id).en);
  },
  chip: (d) => {
    const ss = view.ss;
    const i = Number(d.i);
    if (ss.result || ss.placed.includes(i)) return;
    ss.placed.push(i);
    sfx.pop();
    render();
  },
  unchip: (d) => {
    const ss = view.ss;
    if (ss.result) return;
    ss.placed.splice(Number(d.k), 1);
    render();
  },
  orderCheck: () => {
    const st = currentStep();
    const ss = view.ss;
    if (!ss.placed.length) return;
    const built = ss.placed.map((ci) => st.chips[ci].toLowerCase());
    const ok = built.length === st.target.length && built.every((w, k) => w === st.target[k].toLowerCase());
    ss.result = { ok };
    if (ok) sfx.ok(); else sfx.ko();
    recordResult(st, ok);
    render();
    say(getPhrase(st.id).en);
  },
  dictFr: () => { view.ss.showFr = true; render(); },
  dictCheck: () => {
    const st = currentStep();
    const ss = view.ss;
    const input = document.getElementById("dictInput");
    const typed = input ? input.value.trim() : "";
    if (!typed) return;
    ss.typed = typed;
    ss.result = compare(getPhrase(st.id).en, typed, { fuzzy: true });
    const ok = ss.result.score >= DICTATION_PASS;
    if (ok) sfx.ok(); else if (ss.result.score >= 0.6) sfx.almost(); else sfx.ko();
    recordResult(st, ok);
    render();
  },
  pickWord: (d) => {
    const st = currentStep();
    const ss = view.ss;
    if (ss.picked !== null) return;
    ss.picked = Number(d.i);
    const ok = ss.picked === st.target;
    if (ok) sfx.ok(); else sfx.ko();
    recordResult(st, ok);
    render();
    if (!ok) say(st.pair[st.target]);
  },
  fr: (d) => {
    const m = view.ss.log[Number(d.i)];
    m.showFr = !m.showFr;
    render();
  },
  dlgHelp: () => {
    const ctx = dialogueContext();
    const t = ctx.sit.dialogue.turns[ctx.ss.turn];
    ctx.ss.help = true;
    render();
    say(t.answers[0]);
  },
  dlgSkip: () => {
    const ctx = dialogueContext();
    const t = ctx.sit.dialogue.turns[ctx.ss.turn];
    stopAll();
    advanceDialogue(ctx, { side: "you", en: t.free ? t.examples[0] : t.answers[0], skipped: true });
  },
  storyPlay,
  storyText: () => { view.showText = !view.showText; render(); },
  storyFr: () => { view.showFr = !view.showFr; render(); },
  storyLine: (d) => {
    const v = view;
    v.playing = false;
    v.run++;
    v.cur = Number(d.i);
    render();
    say(getStory(v.id).lines[v.cur].en);
  },
  storyQuiz: () => {
    const v = view;
    v.playing = false;
    v.run++;
    stopAll();
    Object.assign(v, { phase: "quiz", q: 0, picked: null, score: 0, order: getStory(v.id).questions.map(() => shuffle([0, 1, 2])) });
    render();
    window.scrollTo(0, 0);
  },
  storyPick: (d) => {
    const v = view;
    if (v.picked !== null) return;
    v.picked = Number(d.i);
    if (v.picked === 0) { v.score++; sfx.ok(); } else sfx.ko();
    render();
  },
  storyNext: () => {
    const v = view;
    const s = getStory(v.id);
    if (v.q < s.questions.length - 1) {
      v.q++;
      v.picked = null;
    } else {
      v.phase = "done";
      const prev = state.stories[v.id];
      state.stories[v.id] = { best: Math.max(v.score, prev ? prev.best : 0) };
      store.completeSession(state, { exercises: s.questions.length, ok: v.score, learned: 0 }, false);
      save();
      sfx.done();
      if (v.score === s.questions.length) confetti();
    }
    render();
    window.scrollTo(0, 0);
  },
  storyBack: () => { Object.assign(view, { phase: "listen", picked: null }); render(); },
  storyAgain: () => { Object.assign(view, { phase: "listen", picked: null, cur: -1, showText: true }); render(); window.scrollTo(0, 0); },
  hfStart: () => {
    const hf = view.hf;
    keepAwake();
    hf.paused = false;
    hfRun();
  },
  hfToggle: () => {
    const hf = view.hf;
    if (hf.paused) {
      hf.paused = false;
      hfRun();
    } else {
      hf.paused = true;
      hf.run++;
      stopAll();
      render();
    }
  },
  backup: async (d, el) => {
    await copyText(store.exportData(state));
    el.textContent = "✓ Copiée";
  },
  restore: () => {
    const text = document.getElementById("restoreText").value.trim();
    if (!text) return;
    try {
      state = store.importData(text);
      save();
      alert("Sauvegarde restaurée !");
      go({ name: "home" });
    } catch (e) {
      alert("Cette sauvegarde n'est pas valide.");
    }
  },
  reset: () => {
    if (!confirm("Effacer toute ta progression ? C'est définitif.")) return;
    const settings = state.settings;
    state = store.reset();
    state.settings = settings;
    save();
    go({ name: "home" });
  },
};

app.addEventListener("click", (e) => {
  const el = e.target.closest("[data-a]");
  if (!el || !app.contains(el) || el.disabled) return;
  e.stopPropagation();
  const fn = actions[el.dataset.a];
  if (fn) fn(el.dataset, el);
});

// Débloque l'audio (iOS exige un geste de l'utilisateur).
document.addEventListener("pointerdown", sfx.unlock, { passive: true });

app.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  if (e.target.id === "kbdInput") actions.check();
  if (e.target.id === "dictInput") actions.dictCheck();
});

app.addEventListener("input", (e) => {
  if (e.target.id === "rateRange") {
    state.settings.rate = parseFloat(e.target.value);
    document.getElementById("rateVal").textContent = e.target.value;
    save();
  }
});

app.addEventListener("change", (e) => {
  if (e.target.id === "voiceSel") { state.settings.voice = e.target.value; save(); }
  if (e.target.id === "autoplay") { state.settings.autoplay = e.target.checked; save(); }
  if (e.target.id === "hfCheck") view.hf.mode = e.target.checked ? "check" : "passive";
  if (e.target.id === "hfText") view.hf.showText = e.target.checked;
});

speech.initVoices(() => { if (view.name === "settings") render(); });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

render();
