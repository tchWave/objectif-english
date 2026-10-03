// Encode un son Kokoro (Float32, mono) en MP3 léger pour le téléphone.
import { readFileSync } from "fs";
import { createRequire } from "module";

// Le point d'entrée npm de lamejs 1.2.1 est cassé (« MPEGMode is not defined ») : on charge
// la version compilée lame.all.js, qui définit une fonction globale `lamejs`.
const require = createRequire(import.meta.url);
const code = readFileSync(require.resolve("lamejs/lame.all.js"), "utf8");
const lamejs = new Function(`${code}\nreturn lamejs;`)();

export function toMp3(samples, sampleRate, kbps = 64) {
  const encoder = new lamejs.Mp3Encoder(1, sampleRate, kbps);
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const chunks = [];
  for (let i = 0; i < pcm.length; i += 1152) {
    const buf = encoder.encodeBuffer(pcm.subarray(i, i + 1152));
    if (buf.length) chunks.push(Buffer.from(buf));
  }
  const end = encoder.flush();
  if (end.length) chunks.push(Buffer.from(end));
  return Buffer.concat(chunks);
}
