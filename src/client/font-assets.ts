// Load optional font-face CSS only for selected faces; share each loading promise.
// Default Nastaliq/Naskh faces stay in the initial stylesheet for source readability.
type FontName = "lateef" | "open-sans" | "source-sans" | "lora" | "merriweather" |
  "gulzar" | "scheherazade" | "amiri" | "markazi" | "noto-sans-arabic";
const loaders: Record<FontName, () => Promise<unknown>> = {
  "lateef": () => Promise.all([import("@fontsource/lateef/arabic-400.css"),import("@fontsource/lateef/arabic-700.css")]),
  "open-sans": () => Promise.all([import("@fontsource/open-sans/latin-400.css"),import("@fontsource/open-sans/latin-700.css")]),
  "source-sans": () => Promise.all([import("@fontsource/source-sans-3/latin-400.css"),import("@fontsource/source-sans-3/latin-700.css")]),
  "lora": () => Promise.all([import("@fontsource/lora/latin-400.css"),import("@fontsource/lora/latin-700.css")]),
  "merriweather": () => Promise.all([import("@fontsource/merriweather/latin-400.css"),import("@fontsource/merriweather/latin-700.css")]),
  "gulzar": () => import("@fontsource/gulzar/arabic-400.css"),
  "scheherazade": () => Promise.all([import("@fontsource/scheherazade-new/arabic-400.css"),import("@fontsource/scheherazade-new/arabic-700.css")]),
  "amiri": () => Promise.all([import("@fontsource/amiri/arabic-400.css"),import("@fontsource/amiri/arabic-700.css")]),
  "markazi": () => Promise.all([import("@fontsource/markazi-text/arabic-400.css"),import("@fontsource/markazi-text/arabic-700.css")]),
  "noto-sans-arabic": () => Promise.all([import("@fontsource/noto-sans-arabic/arabic-400.css"),import("@fontsource/noto-sans-arabic/arabic-700.css")]),
};
const loading = new Map<FontName, Promise<unknown>>();
function loadFont(name: string): Promise<unknown> {
  if (!Object.hasOwn(loaders,name)) return Promise.resolve();
  const font = name as FontName;
  if (!loading.has(font)) {
    const pending = loaders[font]().catch((error) => { loading.delete(font); throw error; });
    loading.set(font,pending);
  }
  return loading.get(font)!;
}
export async function ensureFontStyles(urdu: string, roman: string): Promise<void> {
  await Promise.all([loadFont(urdu),loadFont(roman)]);
}
