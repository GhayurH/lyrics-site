// File role: Central missing-edition messages; never silently replace Roman with Urdu.
export function romanUnavailable(scope: "page" | "kalam" | "stanza", hasScan: boolean, number?: number | string): string {
  const location = scope === "stanza" && number !== undefined ? "stanza " + number
    : scope === "page" ? "this page" : "this kalam";
  return "Roman Urdu is not available for " + location + "." +
    (hasScan ? " The original scan can be viewed instead." : "");
}
