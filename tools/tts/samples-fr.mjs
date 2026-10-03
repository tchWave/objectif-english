// Extraits de la voix française Kokoro (Siwis) pour la page d'écoute.
// Usage : node tools/tts/samples-fr.mjs
import { KokoroTTS } from "kokoro-js";
import { mkdirSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { toMp3 } from "./mp3.mjs";
import { generateFr, phonemizeFr } from "./french.mjs";
import { frSpeech } from "../../js/voices.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = join(root, "audio", "samples");
mkdirSync(outDir, { recursive: true });

export const FR_SAMPLES = [
  "Ça te dit d'aller boire un verre ?",
  "Désolé(e), je ne suis pas d'ici.",
  "Je suis en retard, mais j'arrive ! Disons 19 h ?",
];

const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" });
for (let i = 0; i < FR_SAMPLES.length; i++) {
  const text = frSpeech(FR_SAMPLES[i]);
  console.log(`${text}\n  → ${await phonemizeFr(text)}`);
  const audio = await generateFr(tts, text);
  writeFileSync(join(outDir, `ff_siwis-${i + 1}.mp3`), toMp3(audio.audio, audio.sampling_rate));
}
console.log("OK");
