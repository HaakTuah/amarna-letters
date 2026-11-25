// Where the commands in a project's files stand, for the licence scan (licence-scan.mjs, beside this file, which says
// what it needs of each): each npx, npm exec (Windows' npx.cmd and npm.cmd too), npm install (and its other spellings),
// npm link, npm pack, npm diff, npm cache add and npm publish, past any redirection, in a file's text (commands: a line
// of its own for each, nested ones too, as in npx -c '...', and each command written as an array, execFileSync("npx",
// [...]), or by a path to the program), and in a JSON value (commandLines: package.json's "scripts", a hook's
// "command", a task's program with its arguments). What each line fetches is read apart, in licence-npm.mjs
// (fetched), and the fetchers of other kinds in licence-fetchers.mjs. What cannot be read here: a command running on
// past 16 KB.
// Node's own modules only, and licence-npm.mjs, beside this file.
import { CONFIG, NO_FETCH, RUN, whole } from "./licence-npm.mjs";

// The words that run another program, given among their arguments (sudo -Hu root npm, timeout --signal KILL 60 npm,
// flock /tmp/lock npm, npx cross-env A=1 npm); those that run a string as a command line (eval "npm ...", sh -c,
// concurrently "npm run a" "npm run b", nodemon --exec "..."); and the words after which a command starts.
const RUNNERS = new Set([
  "sudo", "doas", "su", "runuser", "pkexec", "env", "cross-env", "cross-env-shell", "env-cmd", "dotenv", "time",
  "nohup", "nice", "ionice", "timeout", "xargs", "parallel", "stdbuf", "unbuffer", "chronic", "flock", "watch",
  "setsid", "taskset", "chrt", "strace", "ltrace", "valgrind", "systemd-run", "caffeinate", "script", "xvfb-run",
  "faketime", "fakeroot", "chroot", "unshare", "nsenter", "firejail", "bwrap", "proxychains", "torsocks",
  "dbus-run-session", "concurrently", "nodemon", "eval", "exec", "command", "builtin", "npx",
]);
const STRING_RUNNERS = /^(?:-c|--command|--exec|run:|eval|concurrently|watch|cross-env-shell|parallel|su)$/u;
const KEYWORDS = new Set(["if", "elif", "while", "until", "then", "do", "else"]);
const SPACE = new Set([" ", "\t", "\r", "\v", "\f"]);

/** Whether the word at `words[k]` runs another program: a runner (by any path), npm exec, or a variable ($SUDO). */
function runnerAt(words, k) {
  const name = words[k].replace(/^.*[\/\\]/u, "");
  return RUNNERS.has(name) || (name === "npm" && RUN.has(words[k + 1])) || /^\$(\w+|\{\w+\})$/u.test(name);
}

/**
 * Whether the words before a command are what may run it: variables set for it (A=1), and then, if any, a runner,
 * whose options and arguments, whatever their form, are all taken as its own (sudo -Hu root, timeout --signal KILL 60).
 */
function prefixes(words) {
  let k = 0;
  while (k < words.length && /^\w+=/u.test(words[k])) k++;
  return k === words.length || runnerAt(words, k);
}

/**
 * Whether a string whose quote stands just after `k` opens a command line: at a line's start, after ( { [ = : or ,, or
 * after a word that runs a string (-c, --exec, eval, concurrently and the like), past other quoted strings and options
 * between (concurrently -k "npm run a" "npm run b"). It reads at most 4096 characters back, and past those, counts.
 */
function opensCommand(text, k, lineStart) {
  const reach = { left: 4096 };
  while (reach.left > 0) {
    if (lineStart(k) || "({[=:,".includes(text[k - 1])) return true;
    const before = "'\"`".includes(text[k - 1]) ? quotedBefore(text, k, reach) : wordBefore(text, k, lineStart, reach);
    if ("opens" in before) return before.opens;
    k = before.from;
    while (!lineStart(k) && SPACE.has(text[k - 1]) && reach.left-- > 0) k--;
  }
  return true;
}

// (what stands before `k` for opensCommand: either its answer, { opens }, or where the walk goes on, { from }; `reach`
// counts the characters it may still read)
function quotedBefore(text, k, reach) {
  const q = text[k - 1];
  let start = k - 1;
  while (start > 0 && text[start - 1] !== q && text[start - 1] !== "\n" && reach.left-- > 0) start--;
  if (reach.left <= 0) return { opens: true }; // (read no further: it counts)
  return start === 0 || text[start - 1] !== q ? { opens: false } : { from: start - 1 };
}

function wordBefore(text, k, lineStart, reach) {
  let start = k;
  while (!lineStart(start) && !SPACE.has(text[start - 1]) && reach.left-- > 0) start--;
  if (reach.left <= 0) return { opens: true };
  const w = text.slice(start, k).replace(/^.*[\/\\]/u, "");
  if (STRING_RUNNERS.test(w)) return { opens: true };
  return w.startsWith("-") ? { from: start } : { opens: false };
}

/**
 * Whether the npm or npx at `at` in `text` stands as a command, read by walking back over its line: past a path
 * (/usr/bin/), variables set for it (A=1) and runners with their options (sudo -E, timeout 60, npx --no-install
 * cross-env), to a line's start, ; & | ( ) { [ or !, "=", "run:", a list's "- ", if, then, do, else and the like, or a
 * quote: one that opens the string npm stands in, a command if the string opens a line or follows ( { [ = : , -c or
 * run:, or one that closes a quoted word before it ("$SUDO" npm), read as that word; either reading counts. A message,
 * echo "npm ...", is only words. The walk stops at its first word that can be no part of what runs it, and reads at
 * most 64 words or 4096 characters: past those, a line whose words could all be such parts counts as a command.
 */
function atCommand(text, at) {
  const lineStart = (k) => k === 0 || text[k - 1] === "\n";
  const words = [];
  let end = at, walked = 0;
  // (past what it reads: a command if a runner stands among the words read, or each could be a runner's option or
  // value)
  const cut = () => words.some((w, k) => runnerAt(words, k)) || words.every((w, k) => k === 0 || /^\w+=|^-/u.test(w) || /^-/u.test(words[k - 1]));
  if (end && "/\\".includes(text[end - 1])) while (end && !lineStart(end) && /[\w.~${}\/\\-]/u.test(text[end - 1]) && walked++ < 4096) end--;
  for (;;) {
    if (words.length > 64 || walked > 4096) return cut();
    while (!lineStart(end) && SPACE.has(text[end - 1])) end--;
    if (lineStart(end)) return prefixes(words);
    const c = text[end - 1];
    if (";&|(){[!".includes(c)) return prefixes(words);
    if ("],".includes(c)) return false;
    if ("'\"`".includes(c)) {
      let k = end - 1;
      while (!lineStart(k) && SPACE.has(text[k - 1])) k--;
      if (opensCommand(text, k, lineStart) && prefixes(words)) return true;
      if (end === at || !SPACE.has(text[end])) return false; // (a quote right before npm opens its string)
      let open = end - 2;
      while (open >= 0 && text[open] !== c && text[open] !== "\n" && walked++ < 4096) open--;
      if (walked > 4096) return cut(); // (read no further: past what it reads, it counts)
      if (open < 0 || text[open] !== c) return false;
      // (the word the quoted part ends, with what stands before it: PAD="x y" npm, "$SUDO" npm)
      let start = open;
      while (!lineStart(start) && !SPACE.has(text[start - 1]) && walked++ < 4096
        && !(";&|()[]!,'\"`".includes(text[start - 1]) || (text[start - 1] === "{" && text[start - 2] !== "$"))) start--;
      words.unshift(text.slice(start, end).replace(/['"`]/gu, ""));
      end = start;
      continue;
    }
    let start = end;
    while (!lineStart(start) && !SPACE.has(text[start - 1]) && walked++ < 4096
      && !(";&|()[]!,'\"`".includes(text[start - 1]) || (text[start - 1] === "{" && text[start - 2] !== "$"))) start--;
    const w = text.slice(start, end);
    end = start;
    let k = start;
    while (!lineStart(k) && SPACE.has(text[k - 1])) k--;
    if (w === "=" || w === "run:" || KEYWORDS.has(w) || (w === "-" && lineStart(k))) return prefixes(words);
    words.unshift(w);
  }
}

/**
 * A YAML folded block ("key: >") as the one line it reads as: the lines after it indented deeper than its key, up to a
 * blank line or one indented no deeper, joined with spaces (as YAML folds them).
 */
function folded(text) {
  const lines = text.split(/\r?\n/u), out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\s*(?:-\s+)?)[\w'"$.-]+\s*:\s*>[-+]?\d?\s*$/u.exec(lines[i]);
    if (!m) { out.push(lines[i]); continue; }
    // (blank lines inside the block, before a line still deeper, break it into the lines YAML folds it to)
    const key = m[1].length, start = i, block = [""];
    for (let j = i + 1; j < lines.length; j++) {
      if (!lines[j].trim()) { if (block.at(-1)) block.push(""); continue; }
      if (lines[j].search(/\S/u) <= key) break;
      block[block.length - 1] += ` ${lines[j].trim()}`;
      i = j;
    }
    out.push(`${lines[start]}${block[0]}`, ...block.slice(1).filter(Boolean));
  }
  return out.join("\n");
}

/** The strings of an array written only of string literals ("[", literals and commas, "]"), or null: read by hand. */
function literalArray(src) {
  if (src[0] !== "[") return null;
  const out = [], space = () => { while (/\s/u.test(src[i] ?? "")) i++; };
  let i = 1;
  for (;;) {
    space();
    if (src[i] === "]") return i === src.length - 1 ? out : null;
    const quote = src[i];
    if (quote !== "'" && quote !== '"' && quote !== "`") return null;
    const end = src.indexOf(quote, i + 1);
    if (end < 0 || (quote === "`" && src.slice(i, end).includes("${"))) return null;
    out.push(src.slice(i + 1, end));
    i = end + 1;
    space();
    if (src[i] === ",") i++;
    else if (src[i] !== "]") return null;
  }
}

/**
 * The command lines in a text: each npx or npm and what follows it on its line, and each written as an array. A line
 * continued on the next (a shell's "\\" at its end, or a YAML folded block, "key: >") is read as one.
 */
export function commands(text, code = false, literal = false) {
  const out = [];
  const joined = folded(text.replace(/\\\r?\n/gu, " "));
  // (each npx or npm, nested ones too, as in npx -c 'npm install ...', starts a line of its own; an array, below)
  // (a command runs to the next ; | && || or & that is no redirection; a redirection is read past in fetched())
  for (const m of joined.matchAll(/\b(?=(npx|npm)(\.cmd)?\b(?!['"`]\s*,))/giu)) {
    // (what stands just before it on its line, at most 64 characters: a "\0" marks a line that starts further back)
    const cut = joined.slice(Math.max(0, m.index - 64), m.index), nl = cut.lastIndexOf("\n");
    const before = nl >= 0 || m.index <= 64 ? cut.slice(nl + 1) : `\0${cut}`;
    // (a shell's check that it is there, as a statement of its own, never one whose answer is kept: $(command -v npx))
    if (!code && /(?:^|[;&|!]|\b(?:if|elif|while|until|then|do|else))\s*(?:command\s+-v|which|type|hash)\s+$/u.test(before)) continue;
    // (where it stands as a command, it is read at most 16384 characters on, and one longer, with no end, cannot be
    // read, so it fails as such; elsewhere, as in a message, 1024 characters on are read, for a fetch it names)
    const at = atCommand(joined, m.index), size = at ? 16384 : 1024;
    const rest = joined.slice(m.index, m.index + size), command = (literal ? /^[^\n]*/u : /^(?:[^\n;|&]|&(?=>)|(?<=[<>])&)*/u).exec(rest)[0];
    const whole = command.length < rest.length || m.index + rest.length === joined.length;
    // (the quote that opens a string it stands in goes with it, so its quotes are read in pairs: '...') // note)
    const prev = joined[m.index - 1] ?? "", opener = prev && "'\"`".includes(prev) ? prev : "";
    out.push(Object.assign(new String(whole || !at ? opener + command : `${m[1].toLowerCase()} install a-command-too-long-to-read`), { atCommand: at }));
  }
  // (an array of literal strings is read as its words; any other arguments, a variable or a spread, cannot be)
  // (in code, a string that is only npx or npm, not called with its arguments right there, is a program held in a
  // variable, which cannot be followed; in a workflow or a config, "npm" names npm, as an ecosystem or a cache)
  // (in a shell script, a variable set to only npx or npm, "$NPX -y x", is a program held in a variable too)
  if (!code) for (const m of joined.matchAll(/^\s*(?:(?:export|local|readonly|declare|typeset)(?:\s+-\w+)*\s+)?\w+=["']?(?:\S*\/)?(npx|npm)(?:\.cmd)?["']?\s*$/gimu)) out.push(`${m[1].toLowerCase()} ${m[1].toLowerCase() === "npm" ? "install " : ""}a-program-held-in-a-variable`);
  if (code) for (const m of joined.matchAll(/['"`](?:[^'"`\s]*[/\\])?(npx|npm)(?:\.cmd)?['"`](?!\s*,)/giu)) out.push(`${m[1]} ${m[1] === "npm" ? "install " : ""}a-program-held-in-a-variable`);
  for (const m of joined.matchAll(/['"`](?:[^'"`\s]*[/\\])?(npx|npm)(?:\.cmd)?['"`]\s*,\s*(\[[^\]]*\]?|[^\s)]*)/giu)) {
    const literal = literalArray(m[2]);
    const first = /^\[\s*(?:'([^']*)'|"([^"]*)"|`([^`$]*)`)/u.exec(m[2]), command = first && (first[1] ?? first[2] ?? first[3]);
    if (literal) out.push(Object.assign(new String([m[1], ...literal.map(whole)].join(" ")), { literal: true }));
    else if (!(m[1] === "npm" && NO_FETCH.has(command) && !CONFIG.has(command) && !/^(audit|cache|diff|publish)$/u.test(command))) out.push(`${m[1]} ${m[1] === "npm" ? "install " : ""}its-arguments-not-written-out`); // (npm view with a variable: no fetch)
  }
  return out;
}

/**
 * The commands in a JSON value, one line each: every string in it (package.json's "scripts" and tools' hooks, a hook's
 * "command", a task's, a container's set-up) but those under a key of prose (an "about", a "description", a "how"),
 * which may name a command without running it. In each object, the strings and lists under keys that hold a command
 * (a task's "command" and "args", a launch's "runtimeExecutable" and "runtimeArgs") are read as one line, so a program
 * meets its arguments.
 */
const COMMAND = /command|cmd|script|exec|args|^run$/iu;
const PROSE = /^(\$?comment|about|description|summary|how|used|why|notes?|help|message|text|title|label|keywords|author|contributors|maintainers|homepage|repository|bugs|funding|licen[cs]e|url)$/iu;
// (each list joined a value at a time, never spread into one call, which a long list would overflow; the caller bounds
// how deep a value nests, as the scan does with tooDeep, in guards.mjs)
const add = (to, list) => { for (const x of list) to.push(x); };
const strings = (v) => (typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(strings) : []);
export function commandLines(v) {
  if (!v || typeof v !== "object") return typeof v === "string" ? [v] : [];
  const programs = [], args = [], out = [], keyed = !Array.isArray(v);
  for (const [k, x] of Object.entries(v)) {
    if (keyed && PROSE.test(k)) continue;
    const command = keyed && COMMAND.test(k);
    if (command && typeof x === "string") programs.push(x);
    else if (command && Array.isArray(x) && x.every((y) => typeof y === "string")) add(args, x);
    else if (command) add(out, strings(x)); // (package.json's "scripts": every one, a "help" too)
    else add(out, commandLines(x));
  }
  return withArguments(programs, args, out);
}

// (one program with its arguments, as a task or a launch writes them; several, each its own line, as scripts are,
// each with any arguments beside them)
function withArguments(programs, args, out) {
  // (a line built from an argument list is literal: no shell reads it, so "#" or ">" there is an argument)
  const line = (words) => (args.length ? Object.assign(new String(words.join(" ")), { literal: true }) : words.join(" "));
  // (an argument holding spaces is kept whole for the list's program, and also read as a command line of its own,
  // since a list may hand a shell one: ["bash", "-c", "npx -y x"])
  const listed = args.map(whole), lines = args.filter((a) => /\s/u.test(a));
  if (programs.length === 1) return [line([programs[0], ...listed]), ...lines, ...out];
  return [...programs.map((p) => line([p, ...listed])), ...(args.length ? [line(listed)] : []), ...lines, ...out];
}
