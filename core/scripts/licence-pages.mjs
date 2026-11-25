// The parts of a page or component that run, for the licence scan (licence-scan.mjs, beside this file, reads the
// commands in them as in any file that runs): executable() gives a page's, Vue's, Svelte's or Astro's scripts, event
// handlers, bound attributes and expressions, and no text outside them. Node's own modules only (none).

/**
 * An opening tag's attributes ([name, value] pairs) and the index of the ">" that ends it, from `at` just after its
 * name, read by the states HTML's tokenizer reads them in: a value is quoted only where it starts with its quote, an
 * unquoted one runs to a space or ">" whatever it holds (x=a="b>), and a name may hold quotes ("type=json is no type).
 * `end` is -1 where the tag has none.
 */
const HTML_SPACE = /[\t\n\f\r ]/u; // (HTML's whitespace, ASCII only: a no-break space is part of a name or value)
function attributesOf(text, at) {
  const s = { attributes: [], state: "before", name: "", value: "", quote: "" };
  for (let k = at; k < text.length; k++) if (readAttributeChar(s, text[k])) return { attributes: s.attributes, end: k };
  return { attributes: s.attributes, end: -1 };
}
const doneAttribute = (s) => { if (s.name) s.attributes.push([s.name, s.value]); s.name = s.value = ""; };
/** One character of a tag's attributes, read into the states `s` holds; whether it is the ">" that ends the tag. */
function readAttributeChar(s, ch) {
  const space = HTML_SPACE.test(ch);
  if (s.state === "quoted") { if (ch === s.quote) { s.state = "before"; doneAttribute(s); } else s.value += ch; return false; }
  if (s.state === "unquoted" && !space && ch !== ">") { s.value += ch; return false; }
  if (s.state === "unquoted" || ch === ">") { doneAttribute(s); s.state = "before"; return ch === ">"; }
  ATTRIBUTE_STATES[s.state](s, ch, space);
  return false;
}
// (the states that read one character each: "before", where a name starts, "=" itself among what may start one)
const ATTRIBUTE_STATES = {
  value: (s, ch, space) => { if (ch === '"' || ch === "'") { s.quote = ch; s.state = "quoted"; } else if (!space) { s.value = ch; s.state = "unquoted"; } },
  name: (s, ch, space) => {
    if (ch === "=") s.state = "value";
    else if (space) s.state = "after";
    else if (ch === "/") { doneAttribute(s); s.state = "before"; } else s.name += ch;
  },
  after: (s, ch, space) => {
    if (ch === "=") s.state = "value";
    else if (!space) { doneAttribute(s); s.state = "before"; ATTRIBUTE_STATES.before(s, ch, space); }
  },
  before: (s, ch, space) => { if (!space && ch !== "/") { s.name = ch; s.state = "name"; } },
};

/**
 * The parts of a page or component that run, read so as to fail closed rather than to match HTML's parser case by case:
 * every script element's tag and body wherever "<script" stands (in a comment, an attribute's value or a textarea too),
 * to the first "</script" that ends its name, or to the file's end where the body holds "<!--" (as HTML may read it on)
 * or the tag has no end, but a script of data or a template by its own type attribute (JSON-LD, an import map,
 * text/template); every event handler and bound attribute (onclick, @click, :value, v-if, x-data, quoted or not) and
 * javascript: address anywhere; an Astro component's frontmatter; and, but in a plain page, every expression in braces
 * (Vue's, Svelte's, Astro's, a style block's rules among them), each brace read to its match. Text outside these runs
 * nothing, so a page showing a command in its text fetches nothing.
 */
export function executable(text, f) {
  const parts = [];
  if (/\.astro$/iu.test(f)) { const front = /^\s*---\r?\n([\s\S]*?)(?:\r?\n---|$)/u.exec(text); if (front) parts.push(front[1]); }
  scriptParts(text, parts);
  for (const m of text.matchAll(/\s(?:on[\w-]+|@[\w.:-]+|:[\w.:-]+|v-[\w.:-]+|x-[\w.:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/giu)) parts.push(m[1] ?? m[2] ?? m[3]);
  for (const m of text.matchAll(/javascript:([^"'<>]*)/giu)) parts.push(m[1]);
  if (!/\.html?$/iu.test(f)) bracedParts(text, parts);
  return parts.join("\n");
}

/** Pushes to `parts` each script element's tag and body (see `executable`). */
function scriptParts(text, parts) {
  const lower = text.toLowerCase();
  const ends = (k, length) => !/[^\t\n\f\r />]/u.test(lower[k + length] ?? ">"); // (a tag's name ends there)
  const closes = [];
  for (let k = lower.indexOf("</script"); k >= 0; k = lower.indexOf("</script", k + 8)) if (ends(k, 8)) closes.push(k);
  for (let k = lower.indexOf("<script"), covered = 0, c = 0; k >= 0; k = lower.indexOf("<script", k + 7)) {
    if (k < covered || !ends(k, 7)) continue; // (one inside a body or tag already read is part of it)
    const tag = attributesOf(text, k + 7);
    if (tag.end < 0) { parts.push(text.slice(k + 7)); break; }
    parts.push(text.slice(k + 7, tag.end)); // (its tag too: one that is only text may span a script that runs)
    while (c < closes.length && closes[c] <= tag.end) c++;
    let stop = c < closes.length ? closes[c] : text.length;
    // (a script that runs is read, to the file's end where it holds "<!--", and covers what it read; one of data covers
    // only its own tag, since it may be only text, in a comment or a value, before a script that runs)
    const type = tag.attributes.find(([n]) => n.toLowerCase() === "type")?.[1] ?? "";
    if (/json|template|importmap|speculationrules|^text\/(html|plain|markdown)$/iu.test(type.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/gu, ""))) covered = tag.end + 1;
    else {
      if (text.slice(tag.end + 1, stop).includes("<!--")) stop = text.length;
      parts.push(text.slice(tag.end + 1, stop));
      covered = stop;
    }
  }
}

/** Pushes to `parts` each outermost {...} of `text`, to its end where one is left open. */
function bracedParts(text, parts) {
  let depth = 0, start = 0;
  for (let k = 0; k < text.length; k++) {
    if (text[k] === "{" && depth++ === 0) start = k;
    else if (text[k] === "}" && depth > 0 && --depth === 0) parts.push(text.slice(start, k + 1));
  }
  if (depth > 0) parts.push(text.slice(start));
}
