// What every check of the core does with what a project's own files, or a pull request, shape before it uses it
// (floor rule 5, in floor/topics/input.md): a path a config or manifest names is read only inside the project, a file
// is read only where its real place, its links followed, lies inside the project, and a name or line from the project
// is printed to a workflow's log as one line of plain text, never as a command GitHub Actions acts on. Node's own
// modules only.
//
//   import { inProject, leadsOut, logged } from "./guards.mjs";
import fs from "node:fs";
import path from "node:path";

/** Whether `p`, a path a project's file names, stays inside the project: a non-empty string with no control character,
 *  not rooted (no leading "/" or "\", no drive), and no ".." part that leads above where it starts. "./x" and "a/../b"
 *  stay inside. */
export function inProject(p) {
  if (typeof p !== "string" || p === "" || /[\u0000-\u001f\u007f]/u.test(p)) return false;
  const s = p.replace(/\\/gu, "/");
  if (s.startsWith("/") || /^[A-Za-z]:/u.test(s)) return false;
  const n = path.posix.normalize(s);
  return n !== ".." && !n.startsWith("../");
}

/** Whether the file or folder at `at`, every link on its way followed, lies outside the folder `root` (its own real
 *  place): where `at` does not stand yet, the nearest folder above it that does is read, so a file about to be written
 *  under a linked folder leads out too; a link that leads nowhere counts as leading out. */
export function leadsOut(root, at) {
  let top;
  try { top = fs.realpathSync(root); } catch { return true; }
  for (let p = path.resolve(at); ;) {
    let real;
    try { real = fs.realpathSync(p); } catch {
      let found;
      try { found = fs.lstatSync(p, { throwIfNoEntry: false }); } catch { found = undefined; }
      if (found?.isSymbolicLink()) return true;
      const up = path.dirname(p);
      if (up === p) return true;
      p = up;
      continue;
    }
    const rel = path.relative(top, real);
    return rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel);
  }
}

/** Text with every control character and line separator shown as "?": on one line, and, where it changes nothing,
 *  text that held none. */
export const oneLine = text => String(text).replace(/[\u0000-\u001f\u007f\u0085\u2028\u2029]/gu, "?");

/** Text from a project, made safe to print on one line of a workflow's log: "%", a carriage return and a line feed
 *  escaped as GitHub documents a command's data is (%25, %0D, %0A), and any other control character or line separator
 *  shown as "?" (oneLine), so no part of it starts a line of its own, which GitHub Actions could read as a command. */
export const logged = text => oneLine(String(text).replace(/%/gu, "%25").replace(/\r/gu, "%0D").replace(/\n/gu, "%0A"));

/** How deep a value read from a project's JSON may nest, in objects and lists, before a check refuses it: far past any
 *  config, manifest or lock file, and short of where reading it, or printing it, would run out of stack. */
export const DEEPEST = 200;

/** Whether a value read from JSON nests deeper than `limit` objects and lists, counted without recursion. */
export function tooDeep(value, limit = DEEPEST) {
  const stack = [[value, 0]];
  while (stack.length) {
    const [v, d] = stack.pop();
    if (!v || typeof v !== "object") continue;
    if (d >= limit) return true;
    for (const x of Object.values(v)) stack.push([x, d + 1]);
  }
  return false;
}

/** A message that may name the project's place on this machine (an error of Node's or git's), with that place written
 *  as "." in every spelling it may take there (as given, made real, with either slash), so the path is the project's. */
export function unrooted(text, root) {
  let real = root;
  try { real = fs.realpathSync(root); } catch { /* (as given) */ }
  const forms = new Set([root, real].filter(Boolean).flatMap(r => [r, r.replace(/\\/gu, "/"), r.replace(/\//gu, "\\")]));
  let out = String(text);
  for (const form of [...forms].sort((a, b) => b.length - a.length)) out = out.split(form).join(".");
  return out;
}

/** Whether `name` names a repository as GitHub writes one, "<owner>/<name>": letters, digits, "_", "." and "-" alone,
 *  and neither part dots alone, so a route built from it reaches that repository's routes and no other. */
export const aRepository = name => typeof name === "string" && /^[\w.-]+\/[\w.-]+$/u.test(name) && name.split("/").every(part => !/^\.+$/u.test(part));

/** Whether `sha` is a commit's whole name as GitHub gives it: forty hexadecimal digits, in lower case. */
export const aCommit = sha => typeof sha === "string" && /^[0-9a-f]{40}$/u.test(sha);

/** The text of a comment or description in Markdown as a reader of it on GitHub sees it: what an HTML comment holds,
 *  and every block of code fenced by ``` or ~~~, left out (each to the end, where it is never closed), and the lines
 *  kept where they stood, so a line hidden from the reader is never read as one said. */
export function seen(markdown) {
  const out = [];
  let fence = null, hidden = false;
  for (const line of String(markdown ?? "").replaceAll("\r\n", "\n").split("\n")) {
    if (fence) {
      if (new RegExp(`^ {0,3}${fence[0] === "`" ? "`" : "~"}{${fence.length},}[ \\t]*$`, "u").test(line)) fence = null;
      out.push("");
      continue;
    }
    const opens = hidden ? null : /^ {0,3}(`{3,}|~{3,})/u.exec(line);
    if (opens && !(opens[1][0] === "`" && line.slice(opens[0].length).includes("`"))) { fence = opens[1]; out.push(""); continue; }
    let rest = line, kept = "";
    while (rest) {
      if (hidden) { const end = rest.indexOf("-->"); if (end < 0) break; rest = rest.slice(end + 3); hidden = false; }
      else { const start = rest.indexOf("<!--"); if (start < 0) { kept += rest; break; } kept += rest.slice(0, start); rest = rest.slice(start + 4); hidden = true; }
    }
    out.push(kept);
  }
  return out.join("\n");
}

/** JSON's text parsed, as JSON.parse parses it, and refused, as text that is no JSON is, where it nests deeper than
 *  DEEPEST: what reads it after, by recursion or by printing it, then never runs out of stack. */
export function parseBounded(text) {
  const value = JSON.parse(text);
  if (tooDeep(value)) throw new SyntaxError(`it nests deeper than ${DEEPEST} objects and lists`);
  return value;
}
