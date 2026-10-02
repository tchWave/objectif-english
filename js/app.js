import { SITUATIONS, getSituation, getPhrase, phraseId } from "./data.js";
import { compare, bestMatch } from "./match.js";
import * as speech from "./speech.js";
import * as store from "./store.js";

const PASS = 0.8;
const DIALOG_PASS = 0.7;
const MAX_REVIEWS = 12;
const PRAISE = ["Parfait !", "Nickel !", "Super !", "Bien joué !", "Excellent !"];
const MIC_ERRORS = {
  "not-allowed": "Accès au micro refusé. Autorise le micro et la reconnaissance vocale dans Réglages.",
  "service-not-allowed": "Reconnaissance vocale indisponible. Vérifie que Siri et Dictée sont activés dans Réglages.",
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
const say = (text, slow) =>
  speech.speak(text, { rate: state.settings.rate * (slow ? 0.75 : 1), voiceURI: state.settings.voice });

function newStepState() {
  return {
    listening: false, interim: "", error: null, keyboard: false,
    result: null, hint: false, recorded: false,
    turn: 0, log: [], playing: false, help: false, done: false,
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
  const screens = { home: renderHome, session: renderSession, situation: renderSituation, practice: renderPractice, settings: renderSettings };
  app.innerHTML = screens[view.name]();
}

// ---------- Accueil ----------
function nextSituation() {
  return SITUATIONS.find((s) => !(state.situations[s.id] && state.situations[s.id].learned));
}

function renderHome() {
  const due = store.dueIds(state).length;
  const learned = Object.keys(state.cards).length;
  const streak = store.streak(state);
  const next = nextSituation();
  const plan = [
    due ? `${Math.min(due, MAX_REVIEWS)} révision${due > 1 ? "s" : ""}` : null,
    next ? `Nouveau : ${next.emoji} ${next.title}` : "Dialogue d'entraînement",
  ].filter(Boolean).join(" · ");

  return `
  <header class="top">
    <div>
      <h1>Objectif English</h1>
      <p class="sub">L'anglais qu'on parle vraiment</p>
    </div>
    <button class="icon" data-a="settings" aria-label="Réglages">⚙️</button>
  </header>

  <section class="stats">
    <div class="stat"><div class="num">🔥 ${streak}</div><div class="lbl">jour${streak > 1 ? "s" : ""} d'affilée</div></div>
    <div class="stat"><div class="num">${learned}</div><div class="lbl">phrases vues</div></div>
    <div class="stat"><div class="num">${store.masteredCount(state)}</div><div class="lbl">maîtrisées</div></div>
  </section>

  <section class="card cta">
    <h2>${store.doneToday(state) ? "Séance du jour faite ✓" : "Séance du jour"}</h2>
    <p class="muted">${esc(plan)}</p>
    <button class="primary wide" data-a="start">${store.doneToday(state) ? "En refaire une" : "Commencer"}</button>
  </section>

  <h3 class="section-title">Situations</h3>
  <section class="list">
    ${SITUATIONS.map((s) => {
      const st = state.situations[s.id];
      const badge = st && st.learned ? '<span class="badge ok">✓</span>' : s === next ? '<span class="badge next">Prochaine</span>' : "";
      return `<button class="list-item" data-a="situation" data-id="${s.id}">
        <span class="emoji">${s.emoji}</span><span class="grow">${esc(s.title)}</span>${badge}<span class="chev">›</span>
      </button>`;
    }).join("")}
  </section>`;
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

function currentStep() {
  return view.name === "session" ? view.steps[view.i] : null;
}

function startSession() {
  go({ name: "session", steps: buildSession(), i: 0, ss: newStepState(), stats: { reviewed: 0, ok: 0, learned: 0, dialogues: 0 } });
  onEnterStep();
}

function onEnterStep() {
  const st = currentStep();
  if (!st) return;
  if (st.type === "learn" && state.settings.autoplay) say(getPhrase(st.id).en);
  if (st.type === "dialogue") playThem();
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
    s.learned = true;
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

function renderSession() {
  const st = currentStep();
  const pct = Math.round((view.i / (view.steps.length - 1)) * 100);
  let body = "";
  if (st.type === "intro") body = renderIntro(getSituation(st.sit));
  else if (st.type === "learn" || st.type === "review") body = renderCard(st);
  else if (st.type === "dialogue") body = renderDialogue(getSituation(st.sit), view.ss, true);
  else body = renderEnd();
  return `
  <div class="topbar">
    <button class="icon" data-a="home" aria-label="Quitter">✕</button>
    <div class="progress"><div style="width:${pct}%"></div></div>
  </div>
  ${body}`;
}

function renderIntro(sit) {
  return `
  <section class="card intro">
    <div class="big-emoji">${sit.emoji}</div>
    <h2>${esc(sit.title)}</h2>
    <p>${esc(sit.intro)}</p>
    <p class="muted">${sit.phrases.length} phrases à découvrir, puis un mini-dialogue.</p>
  </section>
  <div class="bottom"><button class="primary wide" data-a="next">C'est parti</button></div>`;
}

function wordsHtml(words) {
  return words.map((w) => `<span class="w ${w.ok ? "ok" : "ko"}">${esc(w.text)}</span>`).join(" ");
}

function renderCard(st) {
  const p = getPhrase(st.id);
  const ss = view.ss;
  const review = st.type === "review";
  const reveal = !review || ss.hint || ss.result;
  let feedback = "";
  if (ss.result) {
    const sc = ss.result.score;
    const cls = sc >= PASS ? "ok" : sc >= 0.5 ? "mid" : "ko";
    const msg = sc >= PASS ? pick(PRAISE) : sc >= 0.5 ? "Presque ! Retravaille les mots en rouge." : "Pas encore. Réécoute et réessaie.";
    feedback = `<div class="feedback ${cls}">${msg}<div class="heard">Entendu : « ${esc(ss.result.heard)} »</div></div>`;
  }
  return `
  <div class="step-label">${review ? "Révision" : "Nouvelle phrase"} · ${p.sit.emoji} ${esc(p.sit.title)}</div>
  <section class="card phrase">
    <div class="fr">${esc(p.fr)}</div>
    ${reveal
      ? `<div class="en">${ss.result ? wordsHtml(ss.result.words) : esc(p.en)}</div>`
      : `<div class="en hidden-en">Comment on le dit en anglais ?</div>`}
    ${reveal && p.sounds ? `<div class="sounds">🗣️ À l'oral, ça sonne : « ${esc(p.sounds)} »</div>` : ""}
    ${reveal && p.note ? `<div class="note">💡 ${esc(p.note)}</div>` : ""}
    <div class="row">
      ${reveal
        ? `<button data-a="say" data-text="${esc(p.en)}">🔊 Écouter</button><button data-a="say" data-slow="1" data-text="${esc(p.en)}">🐢 Lentement</button>`
        : `<button data-a="hint">💡 Je ne sais pas, écouter</button>`}
    </div>
  </section>
  ${micBlock()}
  ${feedback}
  <div class="bottom"><button class="${ss.result ? "primary" : ""} wide" data-a="next">${ss.result ? "Suivant" : "Passer"}</button></div>`;
}

function micBlock() {
  const ss = view.ss;
  const label = ss.listening ? esc(ss.interim) || "J'écoute…" : ss.error ? esc(ss.error) : "Touche le micro et parle";
  return `
  <div class="mic-area">
    <button class="mic ${ss.listening ? "on" : ""}" data-a="mic" aria-label="Parler">${ss.listening ? "■" : "🎤"}</button>
    <div class="mic-label ${ss.error && !ss.listening ? "err" : ""}" id="interim">${label}</div>
    <button class="link" data-a="kbd">⌨️ ${ss.keyboard ? "Masquer le clavier" : "Utiliser le clavier"}</button>
    ${ss.keyboard ? `<div class="kbd"><input id="kbdInput" type="text" lang="en" autocomplete="off" autocapitalize="sentences" placeholder="Dicte ou tape en anglais…"><button data-a="check">OK</button></div>` : ""}
  </div>`;
}

function renderEnd() {
  const s = view.stats;
  const streak = store.streak(state);
  return `
  <section class="card intro">
    <div class="big-emoji">🎉</div>
    <h2>Séance terminée !</h2>
    <ul class="recap">
      ${s.reviewed ? `<li>${s.ok} / ${s.reviewed} révisions réussies</li>` : ""}
      ${s.learned ? `<li>${s.learned} nouvelles phrases</li>` : ""}
      ${s.dialogues ? `<li>${s.dialogues} dialogue terminé</li>` : ""}
      <li>🔥 ${streak} jour${streak > 1 ? "s" : ""} d'affilée</li>
    </ul>
    <p class="muted">Les phrases reviendront en révision au bon moment. À demain !</p>
  </section>
  <div class="bottom"><button class="primary wide" data-a="home">Retour à l'accueil</button></div>`;
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
  while (ss.turn < turns.length && turns[ss.turn].them) {
    const t = turns[ss.turn];
    ss.log.push({ side: "them", en: t.them, fr: t.fr, who: t.who });
    ss.turn++;
    render();
    scrollToBottom();
    if (state.settings.autoplay) await say(t.them);
    else await new Promise((r) => setTimeout(r, 600));
    if (view.ss !== ss) return;
  }
  ss.playing = false;
  if (ss.turn >= turns.length) ss.done = true;
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
      return `<div class="bubble them" data-a="say" data-text="${esc(m.en)}">
        ${m.who ? `<div class="who">${esc(m.who)}</div>` : ""}
        <div>${esc(m.en)}</div>
        ${m.showFr ? `<div class="tr">${esc(m.fr)}</div>` : ""}
        <button class="fr-btn" data-a="fr" data-i="${i}">${m.showFr ? "Masquer" : "FR"}</button>
      </div>`;
    }
    return `<div class="bubble you ${m.skipped ? "skipped" : ""}">
      <div>${esc(m.en)}</div>
      ${m.heard ? `<div class="tr">Entendu : « ${esc(m.heard)} »</div>` : ""}
    </div>`;
  }).join("");

  let bottom = "";
  if (ss.done) {
    bottom = `
    <section class="card done">Dialogue terminé ! 🎉</section>
    <div class="bottom">
      ${inSession
        ? `<button class="primary wide" data-a="next">Suivant</button>`
        : `<button class="wide" data-a="replay">Rejouer</button><button class="primary wide" data-a="situation" data-id="${sit.id}">Retour</button>`}
    </div>`;
  } else if (ss.playing || !t) {
    bottom = `<div class="typing"><span></span><span></span><span></span></div>`;
  } else {
    let result = "";
    if (ss.result) {
      result = `<div class="feedback mid">Pas tout à fait (${Math.round(ss.result.score * 100)} %).
        <div class="heard">Entendu : « ${esc(ss.result.heard)} »</div>
        <div>Essaie : <b>${esc(ss.result.answer)}</b> <button class="mini" data-a="say" data-text="${esc(ss.result.answer)}">🔊</button></div>
      </div>`;
    }
    bottom = `
    <section class="card prompt">
      <div class="prompt-label">À toi</div>
      <div class="prompt-text">${esc(t.you)}</div>
      ${t.free ? `<div class="muted small">Par exemple : ${t.examples.map(esc).join(" · ")}</div>` : ""}
      ${ss.help && !t.free ? `<div class="help">${esc(t.answers[0])} <button class="mini" data-a="say" data-text="${esc(t.answers[0])}">🔊</button></div>` : ""}
      ${result}
      ${micBlock()}
      <div class="row center">
        ${t.free ? "" : `<button data-a="dlgHelp">💡 Aide</button>`}
        <button data-a="dlgSkip">Passer</button>
      </div>
    </section>`;
  }

  return `
  ${inSession ? `<div class="step-label">Mini-dialogue · ${sit.emoji} ${esc(sit.title)}</div>` : ""}
  <div class="scene">🎬 ${esc(sit.dialogue.title)}</div>
  <div class="chat">${bubbles}</div>
  ${bottom}`;
}

function advanceDialogue(ctx, entry) {
  const { ss } = ctx;
  ss.log.push(entry);
  ss.turn++;
  ss.result = null;
  ss.help = false;
  ss.error = null;
  playThem();
}

function onDialogueAnswer(ctx, text) {
  const { sit, ss } = ctx;
  const t = sit.dialogue.turns[ss.turn];
  if (!t || !t.you) return;
  if (t.free) return advanceDialogue(ctx, { side: "you", en: text });
  const m = bestMatch(t.answers, text);
  if (m.score >= DIALOG_PASS) {
    advanceDialogue(ctx, { side: "you", en: m.answer, heard: m.score < 1 ? text : null });
  } else {
    ss.result = { score: m.score, answer: m.score >= 0.5 ? m.answer : t.answers[0], heard: text };
    render();
    scrollToBottom();
  }
}

// ---------- Situation (consultation libre) ----------
function renderSituation() {
  const sit = getSituation(view.sit);
  return `
  <div class="topbar"><button class="icon" data-a="home" aria-label="Retour">‹</button><div class="grow"></div></div>
  <section class="card intro">
    <div class="big-emoji">${sit.emoji}</div>
    <h2>${esc(sit.title)}</h2>
    <p>${esc(sit.intro)}</p>
  </section>
  <h3 class="section-title">Les phrases <span class="muted small">(touche pour écouter)</span></h3>
  <section class="list">
    ${sit.phrases.map((p) => `
      <button class="list-item phrase-item" data-a="say" data-text="${esc(p.en)}">
        <span class="grow"><b>${esc(p.en)}</b><br><span class="muted small">${esc(p.fr)}</span>
        ${p.note ? `<br><span class="small note-inline">💡 ${esc(p.note)}</span>` : ""}</span>
        <span>🔊</span>
      </button>`).join("")}
  </section>
  <div class="bottom"><button class="primary wide" data-a="practice" data-id="${sit.id}">🎬 Jouer le dialogue</button></div>`;
}

function startPractice(id) {
  go({ name: "practice", sit: id, ss: newStepState() });
  playThem();
}

function renderPractice() {
  const sit = getSituation(view.sit);
  return `
  <div class="topbar"><button class="icon" data-a="situation" data-id="${sit.id}" aria-label="Retour">‹</button><div class="grow"><b>${sit.emoji} ${esc(sit.title)}</b></div></div>
  ${renderDialogue(sit, view.ss, false)}`;
}

// ---------- Réglages ----------
function renderSettings() {
  const voices = speech.englishVoices();
  const current = state.settings.voice || (voices[0] && voices[0].voiceURI);
  return `
  <div class="topbar"><button class="icon" data-a="home" aria-label="Retour">‹</button><div class="grow"><b>Réglages</b></div></div>
  <section class="card">
    <h2>Voix</h2>
    <label for="voiceSel">Voix anglaise</label>
    <select id="voiceSel">
      ${voices.map((v) => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === current ? "selected" : ""}>${esc(v.name)} (${esc(v.lang)})</option>`).join("")}
    </select>
    <label for="rateRange">Vitesse : <span id="rateVal">${state.settings.rate}</span></label>
    <input type="range" id="rateRange" min="0.5" max="1.2" step="0.05" value="${state.settings.rate}">
    <label class="check"><input type="checkbox" id="autoplay" ${state.settings.autoplay ? "checked" : ""}> Lire les phrases automatiquement</label>
    <div class="row"><button data-a="say" data-text="Hey, what's up? This is how I sound.">🔊 Tester la voix</button></div>
    <p class="muted small">Pour une voix plus naturelle sur iPhone : Réglages → Accessibilité → Contenu énoncé → Voix → Anglais, puis télécharge une voix « améliorée ».</p>
  </section>
  <section class="card">
    <h2>Sauvegarde</h2>
    <p class="muted small">Ta progression est enregistrée uniquement sur cet appareil. Copie ta sauvegarde de temps en temps (dans Notes, par exemple).</p>
    <div class="row"><button data-a="backup">📋 Copier ma sauvegarde</button></div>
    <label for="restoreText">Restaurer une sauvegarde</label>
    <textarea id="restoreText" rows="3" placeholder="Colle ta sauvegarde ici…"></textarea>
    <div class="row"><button data-a="restore">Restaurer</button></div>
  </section>
  <section class="card">
    <h2>Autres</h2>
    <div class="row">
      <a class="button" href="test.html">🩺 Diagnostic voix</a>
      <button class="danger" data-a="reset">Tout réinitialiser</button>
    </div>
  </section>`;
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
  Object.assign(ss, { listening: true, interim: "", error: null });
  render();
  const l = speech.createListener({
    onInterim: (t) => {
      if (view.ss !== ss) return;
      ss.interim = t;
      const el = document.getElementById("interim");
      if (el) el.textContent = t || "J'écoute…";
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
  ss.result = { ...r, heard: text };
  ss.error = null;
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
  home: () => go({ name: "home" }),
  settings: () => go({ name: "settings" }),
  situation: (d) => go({ name: "situation", sit: d.id }),
  practice: (d) => startPractice(d.id),
  replay: () => startPractice(view.sit),
  start: startSession,
  next: nextStep,
  say: (d) => say(d.text, d.slow === "1"),
  mic: startListening,
  kbd: () => { view.ss.keyboard = !view.ss.keyboard; render(); if (view.ss.keyboard) document.getElementById("kbdInput").focus(); },
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
