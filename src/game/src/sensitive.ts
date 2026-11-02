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
  [
    /\b(?:Mozilla|AppleWebKit|Chrome|Safari|Firefox|Edg|Gecko|Version|Mobile)\/[\w.]+(?:\s*\([^)]*\))?/g,
    "[device]",
  ],
  // Any address: a provider's or the bridge's, whose path, query or user part may carry a token.
  // Taken to the first space or quotation mark: "]" and ")" may stand in a URL's query, as part of a token.
  [/\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>]+/gi, "[address]"],
  // An e-mail address, in any alphabet ("jane@bücher.de").
  [
    /(?<![\p{L}\p{N}._%+-])[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu,
    "[e-mail]",
  ],
  // Keys: Anthropic's and OpenAI's ("sk-ant-...", "sk-proj-...", masked or not), Google's ("AIza..."), bearer tokens, and
  // any key or token named as one.
  [/\bsk-[\w*.-]{4,}/g, "[key]"],
  [/\bAIza[\w-]{20,}/g, "[key]"],
  [/\bBearer\s+[\w.~+/=-]+/gi, "[key]"],
  [
    /\b(?:x-api-key|api[_-]?key|access[_-]?token|authorization)(["']?\s*[:=]\s*["']?)[^\s"',;}]+/gi,
    "[key]",
  ],
  // Request and organisation ids: "req_011C...", "request_id": "...", "org-...", and any UUID (Anthropic names an
  // organisation by one in its rate-limit messages).
  [
    /["']?\b(?:request[_-]?id|x-request-id|organi[sz]ation[_-]?id|org[_-]?id)["']?\s*[:=]\s*["']?[\w-]+["']?/gi,
    "[id]",
  ],
  [/\breq_[A-Za-z0-9]{8,}/g, "[id]"],
  [/\borg-[A-Za-z0-9]{8,}/g, "[id]"],
  [
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    "[id]",
  ],
  // Local paths. One under a drive, a share or a home folder is taken to the end of its line, since a folder's name may
  // hold spaces ("C:\Users\Jane Smith\...", "/home/jane/My Games/..."); any other absolute path of two parts or more is
  // taken while it runs, in any alphabet ("/srv/øystein/seats").
  [/\b[A-Za-z]:[\\/][^\n"'<>|]*/g, "[path]"],
  [/\\\\[^\s\\]+\\[^\n"'<>|]*/g, "[path]"],
  [/(?:~|\/(?:home|Users|root|mnt|Volumes|media))\/[^\n"'<>|]*/g, "[path]"],
  [
    /(?<![\p{L}\p{N}_.~:/\]])\/(?:[\p{L}\p{N}_.@-]+\/)+[\p{L}\p{N}_.@-]*/gu,
    "[path]",
  ],
];

/**
 * The keys in use, taken out by their exact value: a provider may echo a key of any shape in its error ("Incorrect API key
 * provided: ..."). Every provider registers its key as it is made, so the scrubber never needs to know a key's format.
 */
const keys = new Set<string>();

/** Registers a key to take out by its value: every key in use, whatever its length. */
export function rememberKey(key: string): void {
  if (key.trim().length > 0) keys.add(key.trim());
}

/** A key short enough to be part of an ordinary word is taken out only where it stands whole, between word boundaries. */
const ShortKey = 8;
const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The text with every sensitive piece replaced by its marker ("[key]", "[address]", "[path]", ...). */
export function withoutSensitive(text: string): string {
  if (text.length === 0) return text;
  let out = text;
  for (const k of keys)
    if (out.includes(k))
      out =
        k.length >= ShortKey
          ? out.split(k).join("[key]")
          : out.replace(
              new RegExp(
                `(?<![\\p{L}\\p{N}_])${escape(k)}(?![\\p{L}\\p{N}_])`,
                "gu",
              ),
              "[key]",
            );
  for (const [re, marker] of Patterns) out = out.replace(re, marker);
  return out;
}

/**
 * A text that may hold JSON (a model's reply, a provider's error) with anything sensitive taken out: its JSON read
 * decoded (see `inJson`), since JSON may write any letter as an escape ("\\u00fc") that hides an address or a key from a
 * scan of the raw text, and the text around it scrubbed as it stands.
 */
export function withoutSensitiveJson(text: string): string {
  return inJson(text, withoutSensitive);
}

/**
 * A text with `change` applied to each decoded string and name of the JSON it holds, written back in one spelling with
 * no escapes but the ones JSON needs, and to the text around it as it stands. The JSON is the whole text, or else the
 * widest span that parses from a first "{" or "[" to a last "}" or "]" (a fenced reply, "local API 400: [...]").
 */
export function inJson(text: string, change: (s: string) => string): string {
  const decoded = (part: string): string | null => {
    let node: unknown;
    try {
      node = JSON.parse(part);
    } catch {
      return null;
    }
    const walk = (v: unknown): unknown => {
      if (typeof v === "string") return change(v);
      if (Array.isArray(v)) return v.map(walk);
      if (v !== null && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [change(k), walk(x)]));
      return v;
    };
    return JSON.stringify(walk(node));
  };
  if (!/[{["]/.test(text)) return change(text);
  const whole = decoded(text);
  if (whole !== null) return whole;
  const first = (a: number, b: number): number => (a < 0 ? b : b < 0 ? a : Math.min(a, b));
  for (const [start, end] of [
    [first(text.indexOf("{"), text.indexOf("[")), Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"))],
    [text.indexOf("{"), text.lastIndexOf("}")],
    [text.indexOf("["), text.lastIndexOf("]")],
  ]) {
    if (start < 0 || end <= start) continue;
    const inner = decoded(text.slice(start, end + 1));
    if (inner !== null) return change(text.slice(0, start)) + inner + change(text.slice(end + 1));
  }
  return change(text);
}

/** The same, for a text that may be null (a call's or a shadow's error, which may carry a provider's JSON). */
export function withoutSensitiveOrNull(text: string | null): string | null {
  return text === null ? null : withoutSensitiveJson(text);
}
