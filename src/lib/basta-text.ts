// File role: Shared Basta text helpers for detecting the explicit between-kalam marker and rendering each kalam as a separate text block.
export const BASTA_KALAM_BREAK = "---***---";

export function splitBastaKalams(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, "\n");
  const kalams: string[] = [];
  let current: string[] = [];

  const pushCurrent = () => {
    const value = current.join("\n").trim();
    if (value) kalams.push(value);
    current = [];
  };

  for (const line of normalized.split("\n")) {
    if (line.trim() === BASTA_KALAM_BREAK) {
      pushCurrent();
      continue;
    }
    current.push(line);
  }

  pushCurrent();
  return kalams;
}
