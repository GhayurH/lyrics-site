// Read-only validation of the recitation builder's source selections.
import type { RecitationSet } from "../lib/recitation-set";
import { getCatalog, loadBasta } from "./recitation-catalog";

export async function sourceWarnings(set: RecitationSet): Promise<string[]> {
  const warnings: string[] = [];
  for (const item of set.items) {
    const source = getCatalog(item);
    if (!source?.ready) {
      warnings.push("Unavailable kalam: " + (item.sourceTitle || item.id));
      continue;
    }
    for (const ref of item.stanzaSequence || []) {
      try {
        const poem = await loadBasta(ref.kalamId);
        if (!poem.stanzas.some((stanza) => stanza.id === ref.stanzaId)) {
          warnings.push("Missing stanza: " + ref.kalamId + " / " + ref.stanzaId);
        }
      } catch {
        warnings.push("Unavailable stanza source: " + ref.kalamId);
      }
    }
  }
  return [...new Set(warnings)];
}
