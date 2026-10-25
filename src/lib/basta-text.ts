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

/** A standalone final line is a closing first-line reprise, not a new stanza. */
export function splitBastaRefrain(kalam: string): { body: string; refrain?: string } {
  const lines = kalam.trimEnd().split("\n");
  const last = lines.at(-1)?.trim() ?? "";
  const bodyLines = lines.slice(0, -1);
  if (
    !last ||
    bodyLines.at(-1)?.trim() !== "" ||
    bodyLines.filter((line) => line.trim() !== "").length < 2 ||
    /^(?:[\[(（]|\d+$)/u.test(last)
  ) {
    return { body: kalam };
  }

  return { body: bodyLines.join("\n").trimEnd(), refrain: last };
}
