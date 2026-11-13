// Canonical Basta results own their verified text; printed pages are indexed
// only for independent or still-unverified material, not the same verses twice.
import { splitBastaKalams } from "./basta-text";

export function unclaimedBastaFragments(
  text: string,
  page: number,
  assignments: Record<string, string>,
  indexedKalamIds: ReadonlySet<string>,
): string[] {
  return splitBastaKalams(text).filter((_fragment, index) =>
    !indexedKalamIds.has(assignments[page + ":" + (index + 1)]));
}

/** Roman and Urdu fragments must have matching physical divisions before omission. */
export function unclaimedBastaPageText(
  urdu: string,
  roman: string,
  page: number,
  assignments: Record<string, string>,
  indexedKalamIds: ReadonlySet<string>,
): { urdu: string; roman: string } {
  const urduParts = splitBastaKalams(urdu);
  const romanParts = splitBastaKalams(roman);
  const aligned = romanParts.length === urduParts.length;
  const unclaimed = (index: number) =>
    !indexedKalamIds.has(assignments[page + ":" + (index + 1)]);
  return {
    urdu: urduParts.filter((_text, index) => unclaimed(index)).join("\n"),
    // If editions disagree in fragment count, do not discard unverified Roman text.
    roman: (aligned ? romanParts.filter((_text, index) => unclaimed(index)) : romanParts).join("\n"),
  };
}
