// What the pointer check (pointers.mjs) reads of a Markdown file, by the lexer of the `marked` package the core installs
// from its lock file (packages.mjs; #530, #654): its headings, its bold lead-ins and its blocks, each by the line it
// stands on (from 0). A block is a paragraph or a list item, its lines joined, each trimmed and led by a space, a list
// item led by its marker; a heading, and each row of a table, is a block of its own line as written, a heading
// underlined on the line after it of all its lines. A code block, fenced or indented, is no block, and nothing in it is
// read. What HTML holds, a comment among it, is read as plain lines, as the reader before this one read every line: a
// block from each line that leads a list item or follows a blank line, joined as a paragraph's, and its bold lead-ins
// by their asterisks, so a pointer an agent reads in the raw file is read. A front matter ("---" on the first line to
// its close) is one block of plain text, as a tool that reads the file whole reads it: no heading or bold in it. A bold
// lead-in is one written with two asterisks, as the check's pointers name them.
//
//   import { markdownReader } from "./markdown.mjs";   const readMarkdown = await markdownReader();
//                                                       readMarkdown(text) -> { heads: [{ level, i, text }],
//                                                       bolds: [{ i, text }], blocks: [{ i, text }] }
import { load } from "./packages.mjs";

// The reader, once the package is loaded: where it is used, never on import (packages.mjs).
export async function markdownReader() {
  const { Lexer } = await load("marked");
  return text => read(text, Lexer);
}

const breaks = s => (s.match(/\n/gu) || []).length;
// (a token's lines, those empty at its end left out: no pattern that backtracks over a run of line ends)
const rows = raw => { const lines = raw.split("\n"); while (lines.length && lines.at(-1) === "") lines.pop(); return lines; };
const joined = lines => lines.map(l => ` ${l.trim()}`).join("");
const item = /^\s*(?:[-*+]|\d+[.)])\s/u;
// A line's nesting, from the run that leads it: a space is 1, a tab 4, a quote's ">" 2 and a list marker (a bullet or a
// number with its "." or ")", then a space or tab) 2, so a list indented two spaces a level, a quote or markers written inline
// reach MAX_NESTING at about 100 levels. The lexer's time and memory grow far faster than the file as nesting deepens
// (1000 levels took 8.5 s, 2000 ran out of memory, which no `try` catches; #1032), so a file is refused here.
export const MAX_NESTING = 200;
const nesting = line => {
  let w = 0, i = 0;
  while (i < line.length) {
    const c = line[i];
    if (c === " ") w += 1; else if (c === "\t") w += 4; else if (c === ">") w += 2;
    else {
      let j = i;
      if ("-*+".includes(c)) j = i + 1;
      else if (c >= "0" && c <= "9") { while (line[j] >= "0" && line[j] <= "9") j++; if (j < line.length && (line[j] === "." || line[j] === ")")) j++; else break; }
      else break;
      if (line[j] !== " " && line[j] !== "\t") break;
      w += 2; i = j;
    }
    i++;
  }
  return w;
};

function read(text, Lexer) {
  // (lines end as the lexer ends them: at a line feed, a carriage return, or both)
  let src = String(text).replace(/\r\n?/gu, "\n");
  const deep = src.split("\n").findIndex(l => l.trim() && nesting(l) > MAX_NESTING);
  if (deep >= 0) throw new Error(`line ${deep + 1} nests lists or quotes deeper than the reader follows (about ${MAX_NESTING / 2} levels)`);
  const out = { heads: [], bolds: [], blocks: [] }, front = /^---\n(?:.*\n)*?---(?:\n|$)/u.exec(src);
  let line = 0;
  if (front) {
    const inner = front[0].slice(4, front[0].lastIndexOf("---"));
    if (inner.trim()) out.blocks.push({ i: 1, text: joined(rows(inner)) });
    line = breaks(front[0]) + (front[0].endsWith("\n") ? 0 : 1);
    src = src.slice(front[0].length);
  }
  walk(out, Lexer.lex(src), line);
  return out;
}

// Each token from `line` on, as the blocks and anchors above.
function walk(out, tokens, line) {
  for (const t of tokens) {
    if (t.type === "heading") {
      const lines = rows(t.raw), setext = lines.length > 1;
      out.heads.push({ level: t.depth, i: line, text: t.text });
      out.blocks.push({ i: line, text: setext ? joined(lines.slice(0, -1)).trim() : lines[0] });
      bolds(out, t, line);
    } else if (t.type === "table") {
      rows(t.raw).forEach((l, k) => out.blocks.push({ i: line + k, text: l }));
      // (its bold lead-ins by row: the header's line, then each row's after the line under it)
      [t.header, ...t.rows].forEach((cells, k) => cells.forEach(c => bolds(out, c, line + (k ? k + 1 : 0))));
    } else if (t.type === "paragraph" || t.type === "text") {
      out.blocks.push({ i: line, text: joined(rows(t.raw)) });
      bolds(out, t, line);
    } else if (t.type === "html") plainLines(out, t.raw, line);
    else if (t.type === "list") items(out, t.items, line);
    else if (t.type === "blockquote") walk(out, t.tokens, line);
    line += breaks(t.raw);
  }
}

// A list's items from `line` on: each item's first block led by its marker, what it holds read as the rest.
function items(out, list, line) {
  for (const it of list) {
    const marker = /^\s*(?:[-*+]|\d+[.)])\s+/u.exec(it.raw)?.[0].trim() ?? "";
    let at = line;
    for (const c of it.tokens) {
      if ((c.type === "text" || c.type === "paragraph") && at === line) {
        out.blocks.push({ i: at, text: ` ${marker}${joined(rows(c.raw))}` });
        bolds(out, c, at);
      } else walk(out, [c], at);
      at += breaks(c.raw);
    }
    line += breaks(it.raw);
  }
}

// What HTML holds, from `line` on, as plain lines: a block from each line that leads a list item or follows a blank
// one, and the bold lead-ins of each line by their asterisks.
function plainLines(out, raw, line) {
  let cur = null;
  rows(raw).forEach((l, k) => {
    if (!l.trim()) { cur = null; return; }
    if (!cur || item.test(l)) { cur = { i: line + k, text: "" }; out.blocks.push(cur); }
    cur.text += ` ${l.trim()}`;
    for (const b of l.matchAll(/\*\*([^*]+?)\*\*/gu)) out.bolds.push({ i: line + k, text: b[1] });
  });
}

// The bold spans of a block written with two asterisks, each on the line where its raw text stands, found in turn.
function bolds(out, block, line) {
  const whole = block.raw ?? block.text ?? ""; // (a table's cell holds its text alone, on its row's one line)
  let from = 0;
  const go = tokens => {
    for (const x of tokens ?? []) {
      if (x.type !== "strong") { go(x.tokens); continue; }
      const k = whole.indexOf(x.raw, from), at = k < 0 ? from : k;
      if (x.raw.startsWith("**")) out.bolds.push({ i: line + breaks(whole.slice(0, at)), text: x.text });
      else go(x.tokens);
      from = at + x.raw.length;
    }
  };
  go(block.tokens);
}
