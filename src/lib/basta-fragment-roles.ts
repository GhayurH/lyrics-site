// Reviewed exceptions are applied ONLY to unindexed source fragments, not to
// Urdu/Roman content checks or stable recitation IDs. Each decision is tied
// to its source opening so separator changes cannot hide new mapping errors.
import { splitBastaSource } from "./basta-kalam-units.ts";

export interface ReviewedFragment {
  role: "supplement";
  opening: string;
  reason: string;
}
export interface ReviewedFragmentManifest {
  version: 1;
  fragments: Record<string, ReviewedFragment>;
}
export interface FragmentReviewIssue {
  key: string;
  code: "stale-fragment-role" | "invalid-fragment-role";
  detail: string;
}
export function validateReviewedFragments(
  manifest: ReviewedFragmentManifest,
  pageBodies: Map<number, string>,
  orphans: Array<{ page: number; part: number; opening: string }>,
): { approved: Set<string>; issues: FragmentReviewIssue[] } {
  if (manifest.version !== 1 || !manifest.fragments ||
      Array.isArray(manifest.fragments))
    throw Error("Unsupported reviewed-fragment manifest");
  const approved = new Set<string>(), issues: FragmentReviewIssue[] = [];
  const orphansByKey = new Map(orphans.map(item =>
    [item.page + ":" + item.part, item]));
  for (const [key, decision] of Object.entries(manifest.fragments)) {
    if (!/^\d+:[1-9]\d*$/.test(key) || decision.role !== "supplement" ||
        !decision.opening?.trim() || !decision.reason?.trim()) {
      issues.push({ key, code: "invalid-fragment-role", detail: "Invalid role metadata" });
      continue;
    }
    const [page, part] = key.split(":").map(Number);
    const body = pageBodies.get(page);
    const current = body && splitBastaSource(body)[part - 1]?.split("\n")
      .find(line => line.trim())?.trim();
    if (!orphansByKey.has(key) || current !== decision.opening) {
      issues.push({ key, code: "stale-fragment-role",
        detail: "Review source page, fragment order and index association again" });
      continue;
    }
    approved.add(key);
  }
  return { approved, issues };
}
