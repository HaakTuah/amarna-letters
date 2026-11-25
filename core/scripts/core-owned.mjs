// What the core owns of a project's files, and how the one process takes each (#1083; converge.mjs, init.mjs): the
// marks that say a file or a part of one is the core's, the kinds of file, and, of one file, what the process makes of
// what stands. No file is read or written here. Node's own path module alone.
import path from "node:path";

// The first line of each workflow and Dependabot config the kit writes, which says the file is the core's, and the two
// lines that hold the core's part of a rule file of the project's own (AGENTS.md, CLAUDE.md), as their templates write them.
// (the part's marks name no path: a project whose copy stands elsewhere has each core/ in the kit's text written as its
// copy's path, and the marks are read word for word; the workflows' mark is read by its opening alone; the opening
// mark holds fewer words than the copies check's window of twelve, so the two rule files that hold it hold no copy)
export const MARK = "# The core's file: core/scripts/converge.mjs writes it from the starter kit at each sync. To keep a change of the project's own, take this line out and name the file in core-manifest.md's \"Differences\".";
export const BEGIN = "<!-- The core's part: a sync writes it; write yours outside. -->";
export const END = "<!-- The core's part ends. -->";
export const marked = to => /^\.github\/(?:workflows\/[^/]+\.yml|dependabot\.yml)$/u.test(to);

// The kinds: the rule files the core holds a part of; the kit's files that are the project's own from its first
// commit, written only where they are not there; and the core's whole files, every other the kit writes.
export const BLOCKS = ["AGENTS.md", "CLAUDE.md"];
export const OWN = new Set(["core-manifest.md", "SECURITY.md", "docs/threat-model.md", "docs/PROGRESS.md", "docs/choices.md", "checks/copies.json", "checks/shape.json", "checks/licences-audit.json"]);
const WHOLE = [".github/dependabot.yml", ".github/ISSUE_TEMPLATE/bug_report.md", ".github/ISSUE_TEMPLATE/feature_request.md", ".claude/settings.json", ".codex/hooks.json", ".kiro/steering/core.md", ".kiro/hooks/work-saved.json", ".agents/rules/core.md"];
export const whole = to => /^\.github\/workflows\/[^/]+\.yml$/u.test(to) || WHOLE.includes(to);

// line ends alone never count, as git makes them one: safe while every whole file is YAML, JSON or Markdown
export const lf = t => t.replace(/\r\n/gu, "\n");
// (a file as the comparison reads it: its line ends made one, the core's mark taken out and every pin made one, since
// the sync and Dependabot move pins)
const plainOf = t => lf(t).replace(/^# The core's file:[^\n]*\n/u, "").replace(/@[0-9a-f]{40}(\s*#\s*v?[\w.-]+)?/gu, "@<pin>");
export const blockOf = t => { const b = lf(t).indexOf(BEGIN), e = lf(t).indexOf(END); return b < 0 || e < b ? null : lf(t).slice(b, e + END.length); };
const imports = l => /^@\S+$/u.test(l);

// Where the core's part stands in a rule file's text: { at, end } (end past its last line, its line end kept outside),
// null where it has none, or "many" where it cannot be told which run of import lines it is. `kitLines` are the lines
// every kit's part holds.
export function partIn(text, kitLines) {
  const b = text.indexOf(BEGIN), e = text.indexOf(END);
  if (b >= 0 && e > b && text.indexOf(BEGIN, b + 1) < 0) return { at: b, end: e + END.length };
  if (b >= 0 || e >= 0) return "many";
  const lines = text.split("\n"), runs = [];
  let offset = 0, run = null;
  lines.forEach((l, i) => {
    const bare = l.replace(/\r$/u, "");
    if (imports(bare)) { run ??= { at: offset, lines: [] }; run.lines.push(bare); run.end = offset + bare.length; } else if (run) { runs.push(run); run = null; }
    offset += l.length + (i < lines.length - 1 ? 1 : 0);
  });
  if (run) runs.push(run);
  const core = runs.filter(r => r.lines.every(l => kitLines.has(l)));
  return core.length === 1 ? core[0] : core.length ? "many" : null;
}

// What a moved stub of the core's leads to (a file whose first line opens "# Moved:"; its "holds these rules now" link,
// each "Now in" link and each import it holds), as imports in a rule file of the folder `from` name them: the import `f`
// there names the stub; `read` gives a file's text from the project's root, null where it is none. Null where it is no
// stub, or holds a line beside its title and pointers (#1272, point 2). `seen` keeps each file's answer, so that a file
// many imports name is read once.
export function stubOf(read, from, f, seen = new Map()) {
  const at = path.posix.normalize(path.posix.join(from, f)), key = `${from}\n${at}`;
  if (!seen.has(key)) seen.set(key, leadsTo(at.startsWith("../") || path.posix.isAbsolute(at) ? null : read(at), at, from));
  return seen.get(key);
}
function leadsTo(text, at, from) {
  if (!text || !/^# Moved:/u.test(text)) return null;
  const pointers = [/^\[`[^`\s]+`\]\(([^)\s#]+)(?:#[^)\s]*)?\) holds these rules now/u, /^Now in \[`[^`\s]+`\]\(([^)\s#]+)(?:#[^)\s]*)?\)/u, /^@(\S+)$/u];
  // (a stub holds its pointers and nothing else: one with none, or a line of its own beside them, is no stub, its import kept)
  const lines = text.split(/\r?\n/u).slice(1).filter(l => l.trim());
  if (!lines.length || !lines.every(l => pointers.some(r => r.test(l)))) return null;
  const links = lines.map(l => pointers.map(r => r.exec(l)?.[1]).find(Boolean));
  return [...new Set(links.map(l => path.posix.relative(from, path.posix.join(path.posix.dirname(at), l))))];
}

// One file after the process, from what stands, `now` (null where nothing does), the kit's text `want` and the earlier
// kits' (`older`): { text } to write, {} where it is left as it stands, and `left` where it is left as the project's.
export function converged(to, now, want, older = [], there = () => true, stub = () => null) {
  if (now === null) return { text: want };
  if (BLOCKS.includes(to)) return partConverged(now, want, older, there, stub);
  if (!whole(to)) return {};
  const core = (marked(to) && /^# The core's file:/u.test(now)) || [want, ...older].some(t => t && plainOf(t) === plainOf(now));
  if (!core) return { left: "is not the core's (no mark of the core's, and not what a starter kit writes for the project): left as it is" };
  // (a file whose line ends alone differ, as a checkout on Windows holds it, is as the core writes it: git makes them one)
  return lf(now) === lf(want) ? {} : { text: want };
}

// The workflows of the core's whose check the one job of core.yml runs, as a private project's starter kit writes it
// (init.mjs, `oneJob`), each by the key of its `with:` that runs it there.
export const CORE_YML = ".github/workflows/core.yml";
export const FOLDED = { ".github/workflows/copies.yml": "copies", ".github/workflows/pr-description.yml": "description", ".github/workflows/signatures.yml": "signatures", ".github/workflows/nuget.yml": "nuget" };

// Whether a whole file of the core's that the kit no longer writes, standing as `now`, is to be taken out: it carries
// the core's mark, or it is, but for its mark and its pins, what an earlier kit wrote (`older`); any other is the
// project's and stays.
export const dropped = (to, now, older) => whole(to) && ((marked(to) && /^# The core's file:/u.test(now)) || older.some(t => plainOf(t) === plainOf(now)));

// A rule file of the project's own after the process: its core's part written where it stands, or at its end. Outside
// the part, an import line the part holds is taken out, so none stands twice, and so is one an earlier kit wrote whose
// path (`there`, from the rule file's folder) is not there, an import of an earlier layout that the part replaces, as
// in a run of imports that holds a line of the project's own, which is no part of the core's (#1246, point 4); and so is
// one of a moved stub (`stub`: what it leads to, from the rule file's folder) whose every target the part imports, which
// it replaces (#1272, point 2).
function partConverged(now, want, older, there, stub) {
  const part = blockOf(want);
  if (part === null) return {};
  const lines = t => (blockOf(t) ?? t).split("\n").map(l => l.replace(/\r$/u, "")).filter(imports);
  const kitLines = new Set([want, ...older].flatMap(lines)), partLines = new Set(lines(want));
  const at = partIn(now, kitLines), stubs = new Map();
  const replaced = l => { if (!stubs.has(l)) { const to = imports(l) ? stub(l.slice(1)) : null; stubs.set(l, !!to?.length && to.every(t => partLines.has(`@${t}`))); } return stubs.get(l); };
  if (at === "many") return { left: "its part of the core cannot be told apart (the core's marks stand more than once or apart, or more than one run of import lines is the kit's): left as it is" };
  const eol = now.includes("\r\n") ? "\r\n" : "\n", block = part.replaceAll("\n", eol), gone = [];
  // (a line inside a fenced block is an example, never an import: kept; a fence open before the part stays open after it)
  let fence = null;
  const outside = t => t.split("\n").filter(l => {
    const bare = l.replace(/\r$/u, ""), mark = (fence === null ? /^ {0,3}(`{3,}|~{3,})/u : /^ {0,3}(`{3,}|~{3,}) *$/u).exec(bare)?.[1];
    if (mark && (fence === null || (mark[0] === fence[0] && mark.length >= fence.length))) { fence = fence === null ? mark : null; return true; }
    const out = fence === null && (partLines.has(bare) || (kitLines.has(bare) && !there(bare.slice(1))) || replaced(bare)); if (out) gone.push(bare); return !out; }).join("\n");
  const rest = at === null ? outside(now) : null;
  const text = at === null ? `${rest}${rest.endsWith("\n") || rest === "" ? "" : eol}${eol}${block}${eol}` : `${outside(now.slice(0, at.at))}${block}${outside(now.slice(at.end))}`;
  if (text === now) return {};
  const said = gone.length ? `held ${gone.join(", ")} outside the core's part, which holds ${gone.length > 1 ? "what replaces each" : "what replaces it"}: taken out, so check that none was the project's on purpose` : "";
  // (a run of imports from before the marks that no kit wrote as it stands, one the project took an import out of or
  // reordered, is written as the kit writes it all the same, and named, so the change to its rule file is seen)
  const runOf = t => lines(t).join("\n");
  if (at?.lines && ![want, ...older].some(t => runOf(t) === at.lines.join("\n"))) return { text, left: ["held a run of the kit's imports that no kit writes as it stood (one taken out or moved): the core's part is written over it as this kit writes it, so check that no import the project took out on purpose came back", said].filter(Boolean).join("; it also ") };
  return said ? { text, left: said } : { text };
}

// A check's config after the key-merge mode (#1095, point 5): the kit's keys the project's config lacks added, at any
// depth of an object both hold, after the project's own, and every value the project holds kept, an array or a value of
// another kind than the kit's among them; `now` and `want` JSON texts. Only a key whose value reads nothing is added (an
// empty list, mapping or text, false or null), as its absence reads, so that no check reads more than it did: one that
// would (a lock file named, the security file's prose read) is the step's to ask, and so is each key `asks` names at its
// depth ({ required, keys }, as schemas.mjs `requiredOf` reads them), whose absence its check fails, asking a judgement
// (what ships, what is served). { text } where a key is added, {} where none is, and { left } where the project's is no
// JSON object, left as it is. The text keeps the project's indent and line ends.
export function keysMerged(now, want, asks = null) {
  let have, kit;
  try { have = JSON.parse(now); } catch { return { left: "is no JSON, so the kit's keys cannot be added: left as it is" }; }
  if (!plainObject(have)) return { left: "is no JSON object, so the kit's keys cannot be added: left as it is" };
  try { kit = JSON.parse(want); } catch { return {}; }
  const added = { count: 0 }, merged = into(have, kit, added, asks);
  if (!added.count) return {};
  const indent = /^([ \t]+)"/mu.exec(now)?.[1] ?? "  ", eol = now.includes("\r\n") ? "\r\n" : "\n";
  return { text: `${JSON.stringify(merged, null, indent).replaceAll("\n", eol)}${/\r?\n$/u.test(now) ? eol : ""}` };
}
const plainObject = v => v !== null && typeof v === "object" && !Array.isArray(v);
const readsNothing = v => v === null || v === false || v === "" || (Array.isArray(v) ? !v.length : plainObject(v) && !Object.keys(v).length);
function into(have, kit, added, asks) {
  if (!plainObject(have) || !plainObject(kit)) return have;
  const out = { ...have };
  for (const [key, value] of Object.entries(kit)) {
    if (Object.hasOwn(have, key)) out[key] = into(have[key], value, added, asks?.keys?.[key]);
    else if (readsNothing(value) && !asks?.required?.includes(key)) { out[key] = value; added.count++; }
  }
  return out;
}
