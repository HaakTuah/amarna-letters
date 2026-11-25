// What a posted review declares on lines of its own (tasks/reviews.md, "What a posted review declares"; #299): its
// blocking points, its other points and its score, each a number or null (not read). Split from review-comments.mjs,
// beside this file, which reads the rest of a comment, so that security-review.mjs, which that file imports, reads a
// review's blocking count with no cycle between them. It reads; it writes nothing. Node's own modules.
import { seen } from "./guards.mjs";

// A comment's text as its lines, each carriage return taken out (the web editor ends a line with one before the line feed).
export const lines = body => String(body ?? "").replaceAll("\r", "").split("\n");

// The one count that the lines of a posted review matching `count` (its number) or `none` (zero) declare, or null where
// none declares it or they disagree.
function declared(body, count, none) {
  const said = new Set();
  for (const raw of lines(seen(body))) { // (as the reader sees it: no line in an HTML comment or a fenced block of code)
    const line = raw.replaceAll("**", "").trim();
    const n = count.exec(line);
    if (n) said.add(Number(n[1]));
    else if (none.test(line)) said.add(0);
  }
  return said.size === 1 ? [...said][0] : null;
}

// The blocking points, and the other points, a posted review declares, each a number or null (not read).
export const blockingOf = body => declared(body, /^Blocking findings: (\d{1,6})\.(?:\s|$)/u, /^(?:No blocking findings?|No findings?|Nothing blocks|Blocking: none)\.(?:\s|$)/iu);
export const otherOf = body => declared(body, /^Other findings: (\d{1,6})\.(?:\s|$)/u, /^(?:No other findings?|No findings?)\.(?:\s|$)/iu);
// The score a posted review declares, on a line "Score: N of 10." of its own, N a whole number from 1 to 10
// (roles/shared/review-guidelines.md, "Every reviewer"; #710), or null (not read).
export const scoreOf = body => declared(body, /^Score: (10|[1-9]) of 10\.(?:\s|$)/u, /(?!)/u);
