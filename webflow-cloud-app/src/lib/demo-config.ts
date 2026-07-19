/**
 * Demo yapılandırması — dil listeleri config-driven, gerçek sayfa
 * (sestek.com/demos) doğrulandıkça buradan genişletilir.
 */

export type DemoLanguage = { code: string; label: string };

/* Araştırmayla doğrulanan diller (SR snippet'leri: ar, en, az, nl, tr …) */
export const SR_LANGUAGES: DemoLanguage[] = [
  { code: "tr-TR", label: "Türkçe" },
  { code: "en-US", label: "English (US)" },
  { code: "ar-SA", label: "العربية" },
  { code: "az-AZ", label: "Azərbaycanca" },
  { code: "nl-NL", label: "Nederlands" },
  { code: "de-DE", label: "Deutsch" },
];

/* TTS: doğrulanan dil kapsamı (EN/TR/AR/ES/DE/FR/UR/AZ/KU) */
export const TTS_LANGUAGES: DemoLanguage[] = [
  { code: "tr-TR", label: "Türkçe" },
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "ar-SA", label: "العربية" },
  { code: "es-ES", label: "Español" },
  { code: "de-DE", label: "Deutsch" },
  { code: "fr-FR", label: "Français" },
];

export const TTS_MAX_CHARS = 500;
export const SR_MAX_FILE_MB = 100;

export const SAMPLE_TEXTS: Record<string, string> = {
  "tr-TR":
    "Merhaba! Ben Sestek'in konuşma sentezi teknolojisiyim. Yazdığınız her metni doğal bir sesle seslendirebilirim.",
  "en-US":
    "Hello! I am Sestek's speech synthesis technology. I can turn any text you type into natural-sounding speech.",
};
