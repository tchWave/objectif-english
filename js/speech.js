// Voix de synthèse (l'appli parle) et reconnaissance vocale (l'appli écoute), via les API du navigateur.

export const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const hasTTS = "speechSynthesis" in window;

let voices = [];

export function englishVoices() {
  return voices;
}

function rank(v) {
  let s = 0;
  if (/en[-_]US/i.test(v.lang)) s += 2;
  if (/en[-_]GB/i.test(v.lang)) s += 1;
  if (/enhanced|premium|améliorée/i.test(v.name)) s += 3;
  if (/samantha|ava|daniel|serena|zoe|evan/i.test(v.name)) s += 1;
  return s;
}

export function initVoices(onChange) {
  if (!hasTTS) return;
  const load = () => {
    const en = speechSynthesis.getVoices().filter((v) => /^en([-_]|$)/i.test(v.lang));
    if (en.length === voices.length) return;
    voices = en.sort((a, b) => rank(b) - rank(a));
    if (onChange) onChange(voices);
  };
  speechSynthesis.onvoiceschanged = load;
  load();
  setTimeout(load, 500);
  setTimeout(load, 2000);
}

// Résout quand la phrase est finie (ou interrompue, ou au bout d'un délai de sécurité).
export function speak(text, { rate = 0.9, voiceURI = null } = {}) {
  return new Promise((resolve) => {
    if (!hasTTS) return resolve();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = voices.find((x) => x.voiceURI === voiceURI) || voices[0];
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = "en-US"; }
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
