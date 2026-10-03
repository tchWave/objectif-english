// Vérifie que Kokoro fonctionne : charge le modèle, liste les voix, génère une phrase de test.
import { KokoroTTS } from "kokoro-js";

const t0 = Date.now();
const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "q8", device: "cpu" });
console.log(`Modèle chargé en ${((Date.now() - t0) / 1000).toFixed(1)} s`);

const voices = tts.voices;
console.log("Voix :", Object.entries(voices).map(([id, v]) => `${id} (${v.language} ${v.gender} ${v.overallGrade})`).join(", "));

const t1 = Date.now();
const audio = await tts.generate("Hey, what's up? Not much, you?", { voice: "af_heart" });
console.log(`Phrase générée en ${((Date.now() - t1) / 1000).toFixed(1)} s, ${audio.audio.length} échantillons à ${audio.sampling_rate} Hz`);
await audio.save("check.wav");
console.log("OK : check.wav");
