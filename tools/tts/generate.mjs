// Génère les fichiers audio de l'appli avec Kokoro, à partir du contenu (phrases, dialogues, histoires, sons).
// Ne génère que ce qui manque, supprime les fichiers devenus inutiles, puis écrit audio/manifest.json.
// Usage : node tools/tts/generate.mjs            (tout)
//         node tools/tts/generate.mjs --limit=5  (test sur 5 fichiers)
import { KokoroTTS } from "kokoro-js";
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { SITUATIONS } from "../../js/data.js";
import { STORIES, SOUNDS } from "../../js/practice-data.js";
import { MAIN_VOICE, speakerVoice, audioKey } from "../../js/voices.js";
import { toMp3 } from "./mp3.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = join(root, "audio", "v1");
mkdirSync(outDir, { recursive: true });
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : Infinity;

// 1. Tout ce que l'appli peut faire dire, avec la voix correspondante.
const jobs = new Map();
const add = (voice, text) => {
  const key = audioKey(voice, text);
  if (!jobs.has(key)) jobs.set(key, { voice, text });
};
for (const sit of SITUATIONS) {
  sit.phrases.forEach((p) => add(MAIN_VOICE, p.en));
  for (const turn of sit.dialogue.turns) {
    if (turn.them) add(speakerVoice(sit, turn), turn.them);
    if (turn.answers) turn.answers.forEach((a) => add(MAIN_VOICE, a));
  }
}
STORIES.forEach((story) => story.lines.forEach((l) => add(MAIN_VOICE, l.en)));
SOUNDS.forEach((snd) => snd.pairs.flat().forEach((w) => add(MAIN_VOICE, w)));
add(MAIN_VOICE, "Hey, what's up? This is how I sound.");

// 2. Ménage : les fichiers qui ne correspondent plus à aucun texte.
let removed = 0;
for (const f of readdirSync(outDir)) {
  if (f.endsWith(".mp3") && !jobs.has(f.slice(0, -4))) {
    unlinkSync(join(outDir, f));
    removed++;
  }
}

// 3. Génération de ce qui manque.
const todo = [...jobs.entries()].filter(([key]) => !existsSync(join(outDir, `${key}.mp3`))).slice(0, limit);
console.log(`${jobs.size} textes, ${todo.length} à générer, ${removed} fichier(s) supprimé(s)`);
if (todo.length) {
  const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" });
  const t0 = Date.now();
  for (let i = 0; i < todo.length; i++) {
    const [key, { voice, text }] = todo[i];
    const audio = await tts.generate(text, { voice });
    writeFileSync(join(outDir, `${key}.mp3`), toMp3(audio.audio, audio.sampling_rate));
    if ((i + 1) % 25 === 0 || i === todo.length - 1) {
      const elapsed = (Date.now() - t0) / 1000;
      const eta = (elapsed / (i + 1)) * (todo.length - i - 1);
      console.log(`${i + 1}/${todo.length} · ${Math.round(elapsed)} s écoulées · encore ~${Math.round(eta / 60)} min`);
    }
  }
}

// 4. Manifeste : la liste des fichiers disponibles, lue par l'appli au démarrage.
const files = [...jobs.keys()].filter((key) => existsSync(join(outDir, `${key}.mp3`))).sort();
const size = files.reduce((sum, key) => sum + statSync(join(outDir, `${key}.mp3`)).size, 0);
writeFileSync(join(root, "audio", "manifest.json"), JSON.stringify({ version: 1, generated: new Date().toISOString(), files }));
console.log(`Manifeste : ${files.length} fichiers, ${(size / 1024 / 1024).toFixed(1)} Mo`);
