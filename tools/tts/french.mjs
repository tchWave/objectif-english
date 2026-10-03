// Voix française de Kokoro (« ff_siwis »). kokoro-js ne sait phonémiser que l'anglais :
// on transforme nous-mêmes le texte français en sons avec espeak-ng (version complète),
// en gardant la ponctuation qui donne le rythme et l'intonation, comme le fait kokoro-js en anglais.
import ESpeakNg from "espeak-ng";

const PUNCT = /(\s*[;:,.!?¡¿—…"«»“”(){}[\]]+\s*)+/g;

async function espeakIpa(text) {
  // « -b 1 » : texte en UTF-8 (indispensable pour les accents). Le mode d'emploi du paquet écrit « -b=1 », qui ne marche pas.
  const espeak = await ESpeakNg({ arguments: ["--phonout", "out", "--sep=", "-q", "-b", "1", "--ipa=3", "-v", "fr-fr", text] });
  return espeak.FS.readFile("out", { encoding: "utf8" });
}

export async function phonemizeFr(text) {
  let out = "";
  let last = 0;
  for (const m of text.matchAll(PUNCT)) {
    if (m.index > last) out += (await espeakIpa(text.slice(last, m.index))).replace(/\s+/g, " ").trim();
    out += m[0];
    last = m.index + m[0].length;
  }
  if (last < text.length) out += (await espeakIpa(text.slice(last))).replace(/\s+/g, " ").trim();
  // Mêmes corrections que kokoro-js ; les traits d'union d'espeak (liaisons) ne sont pas connus du modèle.
  return out.replace(/-/g, "").replace(/ʲ/g, "j").replace(/r/g, "ɹ").replace(/x/g, "k").replace(/ɬ/g, "l").replace(/\s+/g, " ").trim();
}

// Génère l'audio d'une phrase française avec un modèle Kokoro déjà chargé.
export async function generateFr(tts, text, voice = "ff_siwis") {
  const phonemes = await phonemizeFr(text);
  const { input_ids } = tts.tokenizer(phonemes, { truncation: true });
  return tts.generate_from_ids(input_ids, { voice });
}
