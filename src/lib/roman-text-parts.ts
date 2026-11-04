// Source-side emphasis is explicit editorial markup, not arbitrary HTML.
// Only <u>...</u> is interpreted; all other source characters stay literal.
export interface RomanTextPart { text: string; underline: boolean }
export function romanTextParts(text: string): RomanTextPart[] {
  const result: RomanTextPart[] = [];
  const pattern = /<u>([^<>\n]+)<\/u>/gu;
  let at = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > at) result.push({ text: text.slice(at, match.index), underline: false });
    result.push({ text: match[1], underline: true });
    at = match.index + match[0].length;
  }
  if (at < text.length) result.push({ text: text.slice(at), underline: false });
  return result;
}
