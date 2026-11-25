// A file a step or a call names, as a path from the project's root: its folders walked, a pattern of files matched, and
// the root a step's shell names it from (for own-runs.mjs, step-commands.mjs and check-configs.mjs).
import path from "node:path";
import { Unread } from "./workflow-calls.mjs";

// A path as the project's root reads it: "./" and a slash at its end left out, and any "." or ".." in it taken.
export const tidy = f => path.posix.normalize(trimSlashes(f)).replace(/^\.\//u, "");
// A path with the "/" at its end left out, walked back over (no regex, so no run of "/" makes it slow).
function trimSlashes(f) {
  let end = f.length;
  while (end > 0 && f[end - 1] === "/") end--;
  return f.slice(0, end);
}
// A file a call or a config names, as a path from the root: one that leads out of the project, starts at the
// machine's root, or is spelled for Windows, is no file of the project's, and not read.
// (the core's workflows run on Linux, where a "\\" is part of a file's name, and a drive letter names no file of the
// project's: either is not read)
export const inside = (f, what) => {
  if (/\\|^[A-Za-z]:/u.test(f)) throw new Unread(`${what} names ${f}, a path spelled for Windows, which the check reads as no file of the project's`);
  const at = tidy(f);
  if (at === ".." || at.startsWith("../") || at.startsWith("/")) throw new Unread(`${what} names ${f}, outside the project`);
  return at;
};
// The root of the checkout as a workflow names it, at a path's start, read as the project's root: GitHub's expression
// in any shell, a variable only in the shell that fills it (bash's $GITHUB_WORKSPACE is text to cmd, and empty to
// PowerShell); in a shell the reader does not know, the expression alone.
// (a name in any case only where its shell reads it so: PowerShell's env: drive, though a variable's name only on
// Windows, so not; cmd's, which runs only on Windows; GitHub's expression)
const anyCase = text => text.replace(/[a-z]/giu, c => `[${c.toLowerCase()}${c.toUpperCase()}]`);
const ROOTS = { bash: "\\$GITHUB_WORKSPACE|\\$\\{GITHUB_WORKSPACE\\}|", pwsh: `\\$${anyCase("env")}:GITHUB_WORKSPACE|`, cmd: `%${anyCase("github_workspace")}%|` };
const ROOT_OF = new Map([null, ...Object.keys(ROOTS)].map(k => [k, new RegExp(`^(?:${ROOTS[k] ?? ""}\\$\\{\\{\\s*${anyCase("github")}\\.${anyCase("workspace")}\\s*\\}\\})/`, "u")]));
export const rootOf = shell => ROOT_OF.get(shell ?? null) ?? ROOT_OF.get(null);
// A text with "\\" read as "/" and "/./" and "//" made one "/", so a path spelled any of those ways reads as one.
export const plainPath = text => text.replace(/\\/gu, "/").replace(/\/(?:\.?\/)+/gu, "/");
const literal = x => !/[$`'"\\]/u.test(x);
// A run whose own name, and folder, are globs or braces and hold no variable, matched against the script's: one that
// cannot match it (*.test.mjs, test/**) is no run of it, one that can (copies.mj?, * under core/scripts) is not read.
function globbed(word, dir, folder, own, name, script) {
  if (!globMatches(own, name)) return [];
  if (!dir.moved && !dir.dynamic) {
    const where = folder === null ? dir.at : path.posix.join(dir.at, folder);
    if (literal(where) && !globMatches(where, path.posix.dirname(script))) return [];
  }
  return [{ unread: `runs ${word.text}, a script named only when the workflow runs`, unsure: true }];
}
// Whether a glob can match a name, case left aside. Only a plain one (letters, "*", "?") is ever told no: braces,
// "**" or a class ("[…]", in any form) may match. "*" stands for any run, "/" included, so the answer errs to "may",
// never "no" where one is (one pass of two pointers, so no glob makes it slow).
function globMatches(glob, name) {
  // (what stands before its first wildcard must begin the name, whatever follows: test/** never matches core/scripts)
  const lead = /^(?:[^*?[{(+@!]|[+@!](?!\())*/u.exec(glob)[0].toLowerCase();
  if (!name.toLowerCase().startsWith(lead)) return false;
  if (/[{}[\]()]|\*\*/u.test(glob)) return true; // (braces, a class, an extended glob's (…) or ** may match: none is read)
  const g = glob.toLowerCase(), s = name.toLowerCase();
  let i = 0, j = 0, star = -1, from = 0;
  while (j < s.length) {
    if (i < g.length && (g[i] === "?" || g[i] === s[j])) { i++; j++; }
    else if (i < g.length && g[i] === "*") { star = i++; from = j; }
    else if (star >= 0) { i = star + 1; j = ++from; }
    else return false;
  }
  while (g[i] === "*") i++;
  return i === g.length;
}
// A run whose script is named only when the workflow runs (a variable, an expression of GitHub's, braces, a glob,
// $'…', a "\\"): no run of this script where its folder plainly is no folder scripts (node --test tests/*.mjs) or its
// own name plainly is another's (node ${{ github.action_path }}/index.js); else, where it looks like one of the
// core's (a .mjs file, a folder scripts or core, an expression), not read; one given by a variable alone (node --test
// $RUN) is counted where the step names the path it holds (unaccounted).
export function unplaced(word, dir, name, script) {
  const plain = x => !/[$`{}\\'"*?[()]/u.test(x), text = trimSlashes(word.text.replace(rootOf(dir.shell), ""));
  const cut = text.lastIndexOf("/"), folder = cut < 0 ? null : text.slice(0, cut), own = text.slice(cut + 1);
  if (!dir.moved && !dir.dynamic && folder !== null && plain(folder) && !/(?:^|\/)scripts$/iu.test(path.posix.join(dir.at, folder))) return [];
  if (plain(own) && own.toLowerCase() !== name) return [];
  if (literal(own)) return globbed(word, dir, folder, own, name, script);
  return /\.mjs\b|scripts|\bcore\b|\$\{?CORE|\$\{\{/iu.test(text) ? [{ unread: `runs ${word.text}, a script named only when the workflow runs`, unsure: true }] : [];
}
// A step's folder, from the root: its own `working-directory`, else its job's or its workflow's default.
// (one that is no text, or names itself only when the workflow runs, cannot be known)
export const folder = (...dirs) => {
  const d = dirs.find(v => v !== undefined && v !== null);
  if (d === undefined) return { at: "." };
  if (typeof d !== "string") return { dynamic: true };
  const text = d;
  // (one named only when the workflow runs, or by a shell's variable, which no shell fills there, or holding a "\\",
  // which Linux and Windows read as different folders)
  if (/[$%\\]/u.test(text)) return { dynamic: true };
  const at = path.posix.normalize(text).replace(/(.)\/+$/u, "$1"); // (core/scripts/ is core/scripts)
  return at === ".." || at.startsWith("../") || at.startsWith("/") ? { dynamic: true } : { at };
};
