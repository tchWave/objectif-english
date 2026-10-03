// Lecture des enregistrements de voix IA (audio/v1/*.mp3), avec la liste des fichiers disponibles.
import { audioKey } from "./voices.js";

// 0,1 s de silence : sert à « débloquer » le lecteur au premier toucher (exigence d'iOS).
const SILENCE = "data:audio/mpeg;base64,//NAxAAAAANIAAAAAExBTUUDAAkIAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/80LEAAAAA0gAAAAATEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRQMACQgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zQsQAAAADSAAAAABMQU1FAwAJCAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zQMQAAAADSAAAAABMQU1FAwAJCAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//NCxAAAAANIAAAAAExBTUUDAAkIAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

const player = new Audio();
player.preservesPitch = true; // en mode lent, la voix est ralentie sans devenir grave
player.webkitPreservesPitch = true;

let available = null; // ensemble des fichiers présents, d'après audio/manifest.json
fetch("audio/manifest.json")
  .then((r) => (r.ok ? r.json() : null))
  .then((m) => { if (m && Array.isArray(m.files)) available = new Set(m.files); })
  .catch(() => {});

export function hasClip(voice, text) {
  return !!available && available.has(audioKey(voice, text));
}

let finishCurrent = null;

// Joue un enregistrement. Résout quand il est fini ou interrompu ; rejette s'il ne peut pas être lu.
export function playClip(voice, text, rate = 1) {
  stopClip();
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn, arg) => {
      if (settled) return;
      settled = true;
      player.onended = player.onerror = player.onpause = player.onplaying = null;
      if (finishCurrent === done) finishCurrent = null;
      fn(arg);
    };
    const done = () => settle(resolve);
    finishCurrent = done;
    player.onended = done;
    player.onpause = done;
    player.onerror = () => settle(reject, new Error("audio"));
    // Safari remet parfois la vitesse à 1 au chargement : on la réapplique au démarrage.
    player.onplaying = () => { player.playbackRate = rate; };
    player.src = `audio/v1/${audioKey(voice, text)}.mp3`;
    player.defaultPlaybackRate = rate;
    player.playbackRate = rate;
    player.play().catch((e) => settle(reject, e));
  });
}

export function stopClip() {
  if (!player.paused) player.pause();
  if (finishCurrent) finishCurrent();
}

// À appeler lors d'un geste de l'utilisateur : iOS autorise ensuite le lecteur à jouer à tout moment
// (dialogues enchaînés, mode mains libres…).
let unlocked = false;
export function unlockClips() {
  if (unlocked) return;
  unlocked = true;
  player.src = SILENCE;
  // Seul un refus explicite d'iOS compte comme un échec (une interruption par une vraie lecture, non).
  player.play().catch((e) => { if (e && e.name === "NotAllowedError") unlocked = false; });
}
