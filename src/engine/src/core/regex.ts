/**
 * Regular expressions with .NET's meaning in the places the C# build relied on it: a word boundary (\b) between Unicode
 * word characters (letters, combining marks, digits, connector punctuation), where JavaScript's \b knows only ASCII. Every
 * pattern is compiled with the u flag, so \p{L} and friends work.
 */
const W = "[\\p{L}\\p{Mn}\\p{Nd}\\p{Pc}]";
const BOUNDARY = `(?:(?<=${W})(?!${W})|(?<!${W})(?=${W}))`;
const NOT_BOUNDARY = `(?:(?<=${W})(?=${W})|(?<!${W})(?!${W}))`;

/** A RegExp from a .NET-style pattern: \b and \B are Unicode-aware, \w is a Unicode word character; always the u flag. */
export function rx(pattern: string, flags = ""): RegExp {
  let out = "";
  let inClass = false;
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "\\" && i + 1 < pattern.length) {
      const n = pattern[i + 1];
      if (!inClass && n === "b") out += BOUNDARY;
      else if (!inClass && n === "B") out += NOT_BOUNDARY;
      else if (n === "w") out += inClass ? "\\p{L}\\p{Mn}\\p{Nd}\\p{Pc}" : W;
      else out += ch + n;
      i++;
      continue;
    }
    if (ch === "[" ) inClass = true;
    else if (ch === "]") inClass = false;
    out += ch;
  }
  return new RegExp(out, flags.includes("u") ? flags : flags + "u");
}
