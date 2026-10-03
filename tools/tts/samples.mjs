// Génère les extraits de la page d'écoute (voix.html) : quelques voix Kokoro sur trois phrases de l'appli.
// Usage : node tools/tts/samples.mjs
import { KokoroTTS } from "kokoro-js";
import { mkdirSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { toMp3 } from "./mp3.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outDir = join(root, "audio", "samples");
mkdirSync(outDir, { recursive: true });

export const SAMPLE_VOICES = ["af_heart", "af_bella", "af_nicole", "am_michael", "am_fenrir", "am_puck", "bf_emma", "bm_george", "bm_fable"];
export const SAMPLE_TEXTS = [
  "Hey, what's up? Not much, you?",
  "Can I get a large latte to go, please?",
  "You won't believe this. I lost my phone on the bus yesterday!",
];

const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" });
let total = 0;
for (const voice of SAMPLE_VOICES) {
  for (let i = 0; i < SAMPLE_TEXTS.length; i++) {
    const audio = await tts.generate(SAMPLE_TEXTS[i], { voice });
    const mp3 = toMp3(audio.audio, audio.sampling_rate);
    writeFileSync(join(outDir, `${voice}-${i + 1}.mp3`), mp3);
    total += mp3.length;
  }
  console.log(`✓ ${voice}`);
}
console.log(`${SAMPLE_VOICES.length * SAMPLE_TEXTS.length} extraits, ${(total / 1024).toFixed(0)} Ko au total`);
