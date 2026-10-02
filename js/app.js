import { SITUATIONS, CHARACTERS, CHAPTERS, getChapter, getSituation, getPhrase, phraseId } from "./data.js";
import { compare, bestMatch } from "./match.js";
import * as speech from "./speech.js";
import * as store from "./store.js";
import * as sfx from "./sfx.js";

const PASS = 0.8;
const DIALOG_PASS = 0.7;
const MAX_REVIEWS = 12;
const PRAISE = ["Nickel !", "Parfait !", "Bien joué !", "Excellent !", "Trop fort !", "Yes !"];
const MIC_ERRORS = {
  "not-allowed": "Accès au micro refusé. Autorise le micro et la reconnaissance vocale dans Réglages.",
  "service-not-allowed": "Reconnaissance vocale indisponible. Vérifie que Siri et Dictée sont activés.",
  "network": "Problème réseau pendant l'écoute. Réessaie ou utilise le clavier.",
  "audio-capture": "Aucun micro détecté.",
  "start-failed": "Le micro n'a pas pu démarrer. Réessaie.",
};

const app = document.getElementById("app");
let state = store.load();
let view = { name: "home" };
let listener = null;

// ---------- Utilitaires ----------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const save = () => store.save(state);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const plural = (n, word) => `${n} ${word}${n > 1 ? "s" : ""}`;
const say = (text, slow) =>
  speech.speak(text, { rate: state.settings.rate * (slow ? 0.75 : 1), voiceURI: state.settings.voice });

function newStepState() {
  return {
    listening: false, interim: "", error: null, keyboard: false,
    result: null, hint: false, recorded: false,
    turn: 0, log: [], playing: false, help: false, done: false, seen: 0, shown: false,
  };
}

function stopAll() {
  speech.stopSpeaking();
  if (listener) {
    const l = listener;
    listener = null;
    l.abort();
  }
}

function go(v) {
  stopAll();
  view = v;
  render();
  window.scrollTo(0, 0);
}

function render() {
  const screens = {
    home: renderHome, path: renderPath, phrases: renderPhrases, thread: renderThread,
    session: renderSession, practice: renderPractice, settings: renderSettings,
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
  return `
  <nav class="tabbar">
    <button class="${active === "home" ? "on" : ""}" data-a="home"><span class="tab-ico">💬</span>Messages</button>
    <button class="${active === "path" ? "on" : ""}" data-a="path"><span class="tab-ico">🗺️</span>Parcours</button>
    <button class="${active === "phrases" ? "on" : ""}" data-a="phrases"><span class="tab-ico">📚</span>Mes phrases${due ? `<span class="dot-badge">${due}</span>` : ""}</button>
    <button class="${active === "settings" ? "on" : ""}" data-a="settings"><span class="tab-ico">⚙️</span>Réglages</button>
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
      <div class="streak-pill ${streak ? "" : "cold"}">🔥 ${streak}</div>
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
  const c = CHARACTERS[cid];
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
        const level = card ? Math.min(3, Math.ceil(card.box / 2)) : 0;
        return `<button class="phrase-row" data-a="say" data-text="${esc(p.en)}">
          <div class="grow"><b>${esc(p.en)}</b><div class="muted small">${esc(p.fr)}</div></div>
          <div class="level" title="Niveau">${[1, 2, 3].map((n) => `<i class="${n <= level ? "on" : ""}"></i>`).join("")}</div>
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

// ---------- Séance ----------
function buildSession() {
  const steps = [];
  let reviews = store.dueIds(state).slice(0, MAX_REVIEWS);
  const next = nextSituation();
  if (!next && reviews.length < 6) reviews = reviews.concat(store.upcomingIds(state, 8 - reviews.length));
  reviews.forEach((id) => steps.push({ type: "review", id }));
  if (next) {
    steps.push({ type: "intro", sit: next.id });
    next.phrases.forEach((_, i) => steps.push({ type: "learn", id: phraseId(next.id, i) }));
    steps.push({ type: "dialogue", sit: next.id });
  } else {
    const sit = [...SITUATIONS].sort((a, b) => ((state.situations[a.id] || {}).dialogues || 0) - ((state.situations[b.id] || {}).dialogues || 0))[0];
    steps.push({ type: "dialogue", sit: sit.id });
  }
  steps.push({ type: "end" });
  return steps;
}

const currentStep = () => (view.name === "session" ? view.steps[view.i] : null);

function startSession() {
  go({ name: "session", steps: buildSession(), i: 0, ss: newStepState(), stats: { reviewed: 0, ok: 0, learned: 0, dialogues: 0 } });
  onEnterStep();
}

function onEnterStep() {
  const st = currentStep();
  if (!st) return;
  if (st.type === "learn" && state.settings.autoplay) say(getPhrase(st.id).en);
  if (st.type === "dialogue") playThem();
  if (st.type === "end") { sfx.done(); confetti(); }
}

function nextStep() {
  const st = currentStep();
  const ss = view.ss;
  if (st.type === "learn") {
    store.learn(state, st.id);
    view.stats.learned++;
  }
  if (st.type === "review" && !ss.recorded) {
    store.review(state, st.id, false, true);
    view.stats.reviewed++;
  }
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
  if (view.steps[view.i].type === "end") store.completeSession(state, view.stats);
  save();
  render();
  window.scrollTo(0, 0);
  onEnterStep();
}

function sessionTop(dark) {
  const pct = Math.round((view.i / (view.steps.length - 1)) * 100);
  return `
  <div class="session-top ${dark ? "on-dark" : ""}">
    <button class="icon" data-a="home" aria-label="Quitter">✕</button>
    <div class="progress"><div style="width:${pct}%"></div></div>
    <span class="streak-mini">🔥 ${store.streak(state)}</span>
  </div>`;
}

function renderSession() {
  const st = currentStep();
  if (st.type === "intro") return renderIntro(getSituation(st.sit));
  if (st.type === "learn" || st.type === "review") return renderCard(st);
  if (st.type === "dialogue") return renderDialogue(getSituation(st.sit), view.ss, true);
  return renderEnd();
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
    <div class="card-tag">${review ? "Révision" : "Nouvelle phrase"} · ${p.sit.emoji} ${esc(p.sit.title)}</div>
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
function micPanel(text) {
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
      <button class="link" data-a="kbd">⌨️ ${ss.keyboard ? "Masquer le clavier" : "Clavier"}</button>
      ${text ? `<button class="link" data-a="next">Passer</button>` : ""}
    </div>
    ${ss.keyboard ? `<div class="kbd"><input id="kbdInput" type="text" lang="en" autocomplete="off" autocapitalize="sentences" placeholder="Dicte ou tape en anglais…"><button class="btn3d small" data-a="check">OK</button></div>` : ""}
  </div>`;
}

function cardSheet(ss) {
  const sc = ss.result.score;
  const cls = sc >= PASS ? "ok" : sc >= 0.5 ? "mid" : "ko";
  const title = sc >= PASS ? `✓ ${ss.result.praise}` : sc >= 0.5 ? "Presque !" : "Pas encore";
  const sub = sc >= PASS ? "" : sc >= 0.5 ? "Retravaille les mots en rouge." : "Réécoute le modèle et réessaie.";
  return `
  <div class="sheet ${cls}">
    <div class="sheet-title">${title}</div>
    ${sub ? `<div class="sheet-sub">${sub}</div>` : ""}
    <div class="sheet-heard">Entendu : « ${esc(ss.result.heard)} »</div>
    <div class="sheet-actions">
      ${sc >= PASS ? "" : `<button class="btn3d ghost" data-a="retry">Réessayer</button>`}
      <button class="btn3d ${cls}" data-a="next">Continuer</button>
    </div>
  </div>`;
}

function renderEnd() {
  const s = view.stats;
  const streak = store.streak(state);
  return `
  <div class="screen end-screen">
    <div class="end-body">
      <div class="end-flame">🔥</div>
      <div class="end-streak">${plural(streak, "jour")} d'affilée</div>
      <h1>Séance terminée !</h1>
      ${s.chapterDone ? chapterDoneBanner(s.chapterDone) : ""}
      <div class="end-stats">
        ${s.learned ? `<div class="stat"><b>${s.learned}</b><span>nouvelles phrases</span></div>` : ""}
        ${s.reviewed ? `<div class="stat"><b>${s.ok}/${s.reviewed}</b><span>révisions réussies</span></div>` : ""}
        ${s.dialogues ? `<div class="stat"><b>${s.dialogues}</b><span>conversation</span></div>` : ""}
      </div>
      <p class="muted">Tes phrases reviendront en révision au bon moment.</p>
    </div>
    <div class="bottom-bar"><button class="btn3d wide" data-a="home">Retour aux messages</button></div>
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
    await new Promise((r) => setTimeout(r, 450));
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
      ${ss.help && !t.free ? `<div class="help">${esc(t.answers[0])} <button class="mini" data-a="say" data-text="${esc(t.answers[0])}">🔊</button></div>` : ""}
      ${dialogueMic(t)}
    </div>
    ${ss.result ? `
    <div class="sheet mid">
      <div class="sheet-title">Pas tout à fait</div>
      <div class="sheet-heard">Entendu : « ${esc(ss.result.heard)} »</div>
      <div class="sheet-sub">Essaie : <b>${esc(ss.result.answer)}</b> <button class="mini" data-a="say" data-text="${esc(ss.result.answer)}">🔊</button></div>
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

// ---------- Réglages ----------
function renderSettings() {
  const voices = speech.englishVoices();
  const current = state.settings.voice || (voices[0] && voices[0].voiceURI);
  return `
  <div class="screen">
    <header class="home-head"><h1>Réglages</h1></header>
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
  if (!st || (st.type !== "learn" && st.type !== "review")) return;
  const ss = view.ss;
  const r = compare(getPhrase(st.id).en, text);
  ss.result = { ...r, heard: text, praise: pick(PRAISE) };
  ss.error = null;
  if (r.score >= PASS) sfx.ok(); else if (r.score >= 0.5) sfx.almost(); else sfx.ko();
  if (st.type === "review" && !ss.recorded) {
    ss.recorded = true;
    const ok = r.score >= PASS;
    store.review(state, st.id, ok, ss.hint);
    view.stats.reviewed++;
    if (ok) view.stats.ok++;
    save();
  }
  render();
}

// ---------- Actions ----------
const actions = {
  noop: () => {},
  home: () => go({ name: "home" }),
  phrases: (d) => go({ name: "phrases", sit: d.id || null, from: d.from || null }),
  path: () => go({ name: "path" }),
  settings: () => go({ name: "settings" }),
  thread: (d) => go({ name: "thread", char: d.id }),
  practice: (d) => startPractice(d.id),
  replay: () => startPractice(view.sit),
  start: startSession,
  next: nextStep,
  say: (d) => say(d.text, d.slow === "1"),
  mic: startListening,
  retry: () => { view.ss.result = null; render(); },
  kbd: () => {
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
    view.ss.hint = true;
    render();
    say(getPhrase(currentStep().id).en);
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
  if (!el || !app.contains(el)) return;
  e.stopPropagation();
  const fn = actions[el.dataset.a];
  if (fn) fn(el.dataset, el);
});

// Débloque l'audio (iOS exige un geste de l'utilisateur).
document.addEventListener("pointerdown", sfx.unlock, { passive: true });

app.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "kbdInput") actions.check();
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
});

speech.initVoices(() => { if (view.name === "settings") render(); });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

render();
