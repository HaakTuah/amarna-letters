// A key given twice in one mapping of a YAML file, which GitHub's workflow reader refuses, running none of the file's
// jobs (#393). The workflow check (workflows.mjs, beside this file) fails each with its line. It reads the file with the
// YAML package the core installs from its lock file (packages.mjs; #528, #654), every document of it, each mapping,
// block or flow, and throws nothing, its errors read plainly so that a text full of them is read in linear time. A key
// is read as YAML spells it and GitHub reads it, as text: quoted or plain, with its escapes, so "if" and if are one
// key, and so are 1 and "1" (the failsafe schema, which reads every scalar as text). A key that is no scalar (a mapping
// or a list) or an alias is passed over, and each line break, \r\n, \r or \n, is one, as GitHub reads it. What it
// does not read: a list or mapping nested more than DEEPEST deep, far past what a workflow holds, which it reads as an
// empty value, the rest of the text read still, since Node stops by itself where the package builds one some 800 deep
// (#610); a text whose lists or mappings nest some thousands deep in block form, past what the package's parser can
// close, whose keys past that point it reads as none; and text that is no YAML past where the package can read it. A
// text where either cut was made, or that is longer than LONGEST and not read at all, is said so, an entry whose key is
// null, for the check to fail with its mend, since a key given twice in the part not read would go unseen. It holds
// one document's tokens at a time, so a text of many documents takes no more memory than reading them did.
import { loadSync } from "./packages.mjs";

export const DEEPEST = 128;
// The longest text it reads, in characters, far past a workflow's: the package's parser builds a token for each mark
// before anything here runs, so a text of three million `[` ran Node out of heap (#752). A longer text is read as not
// read, an entry whose key is null and whose `size` is true.
export const LONGEST = 256 * 1024;

// A text's tokens with each list or mapping nested past DEEPEST, a document counted as one, made an empty value, read
// without recursion so that a text nested past any stack is read; the offsets of those made so, which hold no key.
export function pruned(tokens) {
  const nests = new Set(["document", "block-map", "block-seq", "flow-collection"]), cut = new Set(), todo = [[tokens, 0]];
  while (todo.length) {
    const [holder, depth] = todo.pop();
    for (const part of Array.isArray(holder) ? holder.keys() : ["start", "key", "sep", "value", "items", "end"]) {
      const token = holder[part];
      if (!token || typeof token !== "object") continue;
      const own = nests.has(token.type) ? depth + 1 : depth;
      if (own > DEEPEST) { holder[part] = { type: "scalar", offset: token.offset, indent: token.indent, source: "" }; cut.add(token.offset); }
      else todo.push([token, own]);
    }
  }
  return cut;
}

// A line without its comment (" #" outside quotes, or "#" at its start).
export function uncommented(line) {
  let quote = "";
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) { if (c === quote && quote === "'" && line[i + 1] === "'") i++; else if (c === quote) quote = ""; else if (c === "\\" && quote === '"') i++; }
    else if (c === "#" && (i === 0 || /\s/u.test(line[i - 1]))) return line.slice(0, i).trimEnd();
    else if ((c === '"' || c === "'") && (i === 0 || /[\s:[{,-]/u.test(line[i - 1]))) quote = c;
  }
  return line.trimEnd();
}

// The keys given twice in one mapping of a YAML text, each as { line, key, first }: the line of the second, the key as
// YAML reads it and the line of the first, numbered from 1, in the order of the seconds in the text; and, where part of
// the text was not read (nested past DEEPEST, or past what the parser closes), { line, key: null, first: null } after
// them, on the line of the first part cut, or line 1 where the parser gave out with nothing cut; a text longer than
// LONGEST is only that entry, with `size` true.
export function twice(text) {
  if (String(text).length > LONGEST) return [{ line: 1, key: null, first: null, size: true }];
  // (the package, loaded here alone: a script that imports this file for `uncommented` needs nothing installed)
  const { Composer, LineCounter, Parser, isScalar, visit } = loadSync("yaml");
  const found = [], lines = new LineCounter(), cut = new Set();
  const composer = new Composer({ schema: "failsafe", uniqueKeys: false });
  const read = doc => visit(doc, { Map(_, map) {
    const seen = new Map();
    for (const { key } of map.items) {
      if (!isScalar(key) || !key.range || cut.has(key.range[0])) continue;
      const name = String(key.value), at = key.range[0];
      if (seen.has(name)) found.push({ at, line: lines.linePos(at).line, key: name, first: lines.linePos(seen.get(name)).line });
      else seen.set(name, at);
    }
  } });
  let whole = true;
  try {
    // (each of the parser's tokens pruned and composed as it comes, so one document's tokens are held at a time)
    for (const token of new Parser(lines.addNewLine).parse(String(text).replace(/^\ufeff/u, "").replace(/\r\n?/gu, "\n"))) {
      const one = [token];
      for (const offset of pruned(one)) cut.add(offset);
      for (const doc of composer.next(one[0])) read(doc);
    }
    for (const doc of composer.end()) read(doc);
  } catch { whole = false; } // (a text that runs the package's parser out of its stack: what was read before stands)
  const out = found.sort((a, b) => a.at - b.at).map(({ line, key, first }) => ({ line, key, first }));
  if (whole && !cut.size) return out;
  // (the line of the first part cut, where one was; where the parser gave out alone, no line is known, and 1 is named)
  let first = Infinity;
  for (const offset of cut) if (offset < first) first = offset;
  return [...out, { line: Number.isFinite(first) ? lines.linePos(first).line : 1, key: null, first: null }];
}
