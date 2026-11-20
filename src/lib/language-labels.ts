// UI labels describe the original language; Roman remains a separate edition.
export function originalLanguageLabel(lang: string): string {
  const labels: Record<string, string> = {
    ur: "Urdu", pa: "Panjabi", "pa-Arab": "Panjabi", skr: "Saraiki", "skr-Arab": "Saraiki",
    bft: "Balti", "bft-Arab": "Balti", ar: "Arabic", fa: "Persian", en: "English",
  };
  return labels[lang] ?? "Original";
}
