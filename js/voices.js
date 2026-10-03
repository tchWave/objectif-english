// Voix IA (Kokoro) : les phrases sont enregistrées à l'avance par tools/tts/generate.mjs,
// et l'appli joue ces fichiers. Ce module est partagé entre l'appli et le générateur.
import { CHARACTERS } from "./data.js";

// Voix des phrases à apprendre, des histoires et des sons.
export const MAIN_VOICE = "af_heart";
// Voix française (mode mains libres).
export const FR_VOICE = "ff_siwis";

// Texte français tel qu'il est prononcé : sans « (e) » ni « / », et « 19 h » dit « 19 heures ».
export function frSpeech(fr) {
  return fr
    .replace(/\s?\((?:e|es|s|nouvelle)\)/g, "")
    .replace(/\s*\/\s*/g, ", ou ")
    .replace(/(\d+) h\b/g, "$1 heures");
}

// Voix d'une réplique de dialogue : celle indiquée sur la réplique (ex. la serveuse),
// sinon celle du personnage de la situation.
export function speakerVoice(sit, turn) {
  if (turn && turn.voice) return turn.voice;
  const c = CHARACTERS[sit.char];
  return (c && c.voice) || MAIN_VOICE;
}

// Nom du fichier audio : une empreinte de la voix et du texte (cyrb53), identique côté appli et générateur.
export function audioKey(voice, text) {
  const str = `${voice}|${text}`;
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
