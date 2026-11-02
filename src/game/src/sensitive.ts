/**
 * What is sensitive is never in a log or an export (Engine and models, "Logging and replay"): no key or anything from
 * where one is stored, no provider address carrying a token, no account, organisation or request id, no e-mail address,
 * no local path, and no detail of the player's browser or device. They reach the log only by accident, through what a
 * provider, the bridge or the file system says when a call fails, so every text the log keeps of a call is read through
 * here as it is logged, and each such piece is replaced by a plain marker that says what stood there.
 */

/** Each kind of sensitive text and its marker. Order matters: an address is taken whole before its parts. */
const Patterns: [RegExp, string][] = [
  // A browser's or device's description: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 ...".
  [/\b(?:Mozilla|AppleWebKit|Chrome|Safari|Firefox|Edg|Gecko|Version|Mobile)\/[\w.]+(?:\s*\([^)]*\))?/g, "[device]"],
  // Any address: a provider's or the bridge's, whose path, query or user part may carry a token.
  [/\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>)\]]+/gi, "[address]"],
  [/\b[\w.%+-]+@[\w-]+(?:\.[\w-]+)+\b/g, "[e-mail]"],
  // Keys: Anthropic's and OpenAI's ("sk-ant-...", "sk-proj-...", masked or not), Google's ("AIza..."), bearer tokens, and
  // any key or token named as one.
  [/\bsk-[\w*.-]{4,}/g, "[key]"],
  [/\bAIza[\w-]{20,}/g, "[key]"],
  [/\bBearer\s+[\w.~+/=-]+/gi, "[key]"],
  [/\b(?:x-api-key|api[_-]?key|access[_-]?token|authorization)(["']?\s*[:=]\s*["']?)[^\s"',;}]+/gi, "[key]"],
  // Request and organisation ids: "req_011C...", "request_id": "...", "org-...", and any UUID (Anthropic names an
  // organisation by one in its rate-limit messages).
  [/["']?\b(?:request[_-]?id|x-request-id|organi[sz]ation[_-]?id|org[_-]?id)["']?\s*[:=]\s*["']?[\w-]+["']?/gi, "[id]"],
  [/\breq_[A-Za-z0-9]{8,}/g, "[id]"],
  [/\borg-[A-Za-z0-9]{8,}/g, "[id]"],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[id]"],
  // Local paths: Windows ("C:\Users\...", "\\server\share"), home ("~/..."), and absolute paths of two parts or more.
  [/\b[A-Za-z]:[\\/][^\s"'<>|]*/g, "[path]"],
  [/\\\\[\w.$-]+\\[^\s"'<>|]*/g, "[path]"],
  [/~\/[^\s"'<>|]*/g, "[path]"],
  [/(?<![\w.~:/\]])\/(?:[\w.@-]+\/)+[\w.@-]*/g, "[path]"],
];

/** The text with every sensitive piece replaced by its marker ("[key]", "[address]", "[path]", ...). */
export function withoutSensitive(text: string): string {
  if (text.length === 0) return text;
  let out = text;
  for (const [re, marker] of Patterns) out = out.replace(re, marker);
  return out;
}

/** The same, for a text that may be null (a call's or a shadow's error). */
export function withoutSensitiveOrNull(text: string | null): string | null {
  return text === null ? null : withoutSensitive(text);
}
