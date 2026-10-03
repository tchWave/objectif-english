// Voix de synthèse (l'appli parle) et reconnaissance vocale (l'appli écoute), via les API du navigateur.
import { hasClip, playClip, stopClip } from "./clips.js";
import { MAIN_VOICE } from "./voices.js";

export const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const hasTTS = "speechSynthesis" in window;

let voices = [];
let frVoices = [];

export function englishVoices() {
  return voices;
}

function rank(v, main) {
  let s = 0;
  if (new RegExp(`^${main}`, "i").test(v.lang.replace("_", "-"))) s += 2;
  if (/en[-_]GB/i.test(v.lang)) s += 1;
  if (/enhanced|premium|améliorée/i.test(v.name)) s += 3;
  if (/samantha|ava|daniel|serena|zoe|evan|thomas|amélie|audrey/i.test(v.name)) s += 1;
  if (/eloquence/i.test(v.voiceURI)) s -= 2; // voix Eloquence (Flo, Rocko…) : compréhensibles mais robotiques
  return s;
}

// Voix « fantaisie » d'Apple (Bulles, Superstar, Zarvox…) et vieilles voix robotiques : inutilisables pour apprendre.
// Leur nom est traduit selon la langue de l'iPhone, d'où les noms en anglais et en français.
const NOVELTY = /^(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|pipe organ|superstar|trinoids|whisper|wobble|zarvox|deranged|hysterical|princess|fred|junior|kathy|ralph|mauvaises nouvelles|bonnes nouvelles|cloches|bulles|violoncelles|bouffon|orgue|trinoïdes|murmure)$/i;
const usable = (v) => !/speech\.synthesis\.voice\./i.test(v.voiceURI) && !NOVELTY.test(v.name.trim());

export function initVoices(onChange) {
  if (!hasTTS) return;
  const load = () => {
    const all = speechSynthesis.getVoices().filter(usable);
    const en = all.filter((v) => /^en([-_]|$)/i.test(v.lang));
    frVoices = all.filter((v) => /^fr([-_]|$)/i.test(v.lang)).sort((a, b) => rank(b, "fr-FR") - rank(a, "fr-FR"));
    if (en.length === voices.length) return;
    voices = en.sort((a, b) => rank(b, "en-US") - rank(a, "en-US"));
    if (onChange) onChange(voices);
  };
  speechSynthesis.onvoiceschanged = load;
  load();
  setTimeout(load, 500);
  setTimeout(load, 2000);
}

// Voix IA : si un enregistrement existe pour ce texte et cette voix, on le joue ; sinon voix de l'appareil.
let clipsEnabled = true;
export function setClipsEnabled(on) {
  clipsEnabled = on;
}

// Résout quand la phrase est finie (ou interrompue, ou au bout d'un délai de sécurité).
// lang : "fr-FR" pour faire parler l'appli en français (mode mains libres, toujours avec la voix de l'appareil).
// voice : voix IA voulue (ex. celle d'un personnage). device : force la voix de l'appareil.
export function speak(text, { rate = 0.9, voiceURI = null, lang = "en-US", voice = MAIN_VOICE, device = false } = {}) {
  if (clipsEnabled && !device && !/^fr/i.test(lang) && hasClip(voice, text)) {
    if (hasTTS) speechSynthesis.cancel();
    // La vitesse réglée (0,9 par défaut) correspond au débit normal des enregistrements.
    const clipRate = Math.min(1.5, Math.max(0.5, rate / 0.9));
    return playClip(voice, text, clipRate).catch(() => speakDevice(text, { rate, voiceURI, lang }));
  }
  return speakDevice(text, { rate, voiceURI, lang });
}

function speakDevice(text, { rate, voiceURI, lang }) {
  return new Promise((resolve) => {
    if (!hasTTS) return resolve();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const french = /^fr/i.test(lang);
    const v = french ? frVoices[0] : voices.find((x) => x.voiceURI === voiceURI) || voices[0];
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = lang; }
    u.rate = rate;
    let done = false;
    const timer = setTimeout(finish, 2000 + (text.length * 110) / rate);
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve();
    }
    u.onend = finish;
    u.onerror = finish;
    speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  stopClip();
  if (hasTTS) speechSynthesis.cancel();
}

// start() résout avec le texte reconnu ('' si rien), ou rejette avec un code d'erreur.
export function createListener({ onInterim } = {}) {
  const rec = new SR();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  let text = "", error = null, timer = null;
  const promise = new Promise((resolve, reject) => {
    rec.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      text = t.trim();
      if (onInterim) onInterim(text);
    };
    rec.onerror = (e) => { error = e.error; };
    rec.onend = () => {
      clearTimeout(timer);
      if (text) resolve(text);
      else if (error && error !== "no-speech" && error !== "aborted") reject(error);
      else resolve("");
    };
  });
  return {
    start() {
      try {
        rec.start();
        timer = setTimeout(() => rec.stop(), 10000);
      } catch (e) {
        return Promise.reject("start-failed");
      }
      return promise;
    },
    stop() { try { rec.stop(); } catch (e) {} },
    abort() { try { rec.abort(); } catch (e) {} },
  };
}
