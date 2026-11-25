// What a step's `run:` text runs of the core's scripts: its commands read with bash's grammar (bash-commands.mjs), each
// `node` run of a script with the file it is given as config, and the names of the script no run accounts for, which leave
// the step not read. Node's own modules, and the parser the core installs.
import path from "node:path";
import { bashCommands } from "./bash-commands.mjs";
import { Unread } from "./workflow-calls.mjs";
import { rootOf, plainPath, unplaced } from "./step-paths.mjs";

// A shell's line without its comment: a "#" that starts a word, outside quotes and outside an expression of GitHub's.
export function uncommented(line) {
  for (let i = 0, quote = ""; i < line.length; i++) {
    const c = line[i];
    if (quote === "'") { if (c === "'") quote = ""; }
    else if (quote === '"') { if (c === "\\") i++; else if (c === '"') quote = ""; }
    else if (line.startsWith("${{", i)) { const end = line.indexOf("}}", i); if (end < 0) break; i = end + 1; }
    else if (c === "\\") i++;
    else if (c === "'" || c === '"') quote = c;
    else if (c === "#" && (i === 0 || /\s/u.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}
// The commands of a step's `run:`, each a list of its words as { text, dynamic }, as bash reads them, on the parser
// the core installs (bash-commands.mjs, beside this file, says what a command and a word are). Where the parser cannot
// be loaded, the step that asks is reported as not read, saying so with the install's mend.
export function commands(run) {
  try { return bashCommands(run); } catch (e) { throw new Unread(e.message); }
}
// The shell a step runs in, as one of ROOTS' names, or null where the reader cannot tell: its own `shell:`, else its
// job's or its workflow's default, else the runner's (PowerShell on Windows, bash elsewhere), where its labels say it.
export function shellOf(given, runsOn) {
  if (given !== undefined && given !== null) {
    if (typeof given !== "string") return null;
    const name = path.posix.basename(/^\s*(\S*)/u.exec(given)[1].replace(/\\/gu, "/")).toLowerCase().replace(/\.exe$/u, ""); // (/bin/bash, pwsh.exe)
    return { bash: "bash", sh: "bash", pwsh: "pwsh", powershell: "pwsh", cmd: "cmd" }[name] ?? null;
  }
  const labels = typeof runsOn === "string" ? [runsOn] : runsOn;
  if (!Array.isArray(labels) || labels.some(l => typeof l !== "string" || l.includes("${{"))) return null;
  if (labels.some(l => /windows/iu.test(l))) return "pwsh";
  return labels.some(l => /ubuntu|linux|macos/iu.test(l)) ? "bash" : null;
}
// A word as a path from the project's root, run in the folder `dir` (from the root): { at } where it is known, at null
// where it leads out of the project; { dynamic } where it is named only when the workflow runs; { windows } where it
// holds a "\\", a folder's parting on Windows and part of a file's name on Linux, so no one file.
function located(word, dir, shell) {
  if (word.text.includes("\\")) return { windows: true };
  // (the root's name is filled only where the word lets the shell fill it: in single quotes it is text)
  const root = rootOf(shell), text = word.text, rooted = word.dynamic && root.test(text), rest = rooted ? text.replace(root, "") : text;
  if (word.dynamic && /\$|`|%\w+%|[{*?[(]/u.test(rest)) return { dynamic: true }; // (a variable, braces or a glob, an extended one too)
  if (!rooted && rest.startsWith("/")) return { at: null };
  const at = path.posix.normalize(rooted ? rest : path.posix.join(dir, rest));
  return { at: at === ".." || at.startsWith("../") ? null : at.replace(/^\.\//u, "") };
}
const NODE = /(?:^|\/)node(?:\.exe)?$/iu;
const WRAPPERS = new Set(["env", "exec", "time", "command", "nohup", "sudo"]);
// The shell's words that start a command's place without being one (if …; then node …), passed over as wrappers are.
// ("!" is none of them: it turns the status of the command after it over, so a check run under it cannot fail, and
// is no run of the check; Codex's security review of 76119ae)
const KEYWORDS = new Set(["if", "then", "else", "elif", "do", "while", "until", "{"]);
// A shell given its commands as one word (`bash -c "…"`), whose commands are read as the step's own.
const SHELL = /^(?:.*\/)?(?:(?:ba|z|da)?sh|pwsh|powershell)(?:\.exe)?$/iu;
// Node's options that take the next word as their value, so that it is no script.
const VALUED = new Set(["-r", "--require", "--import", "--loader", "--experimental-loader", "-C", "--conditions", "--env-file", "--title", "--input-type"]);
const CHDIR = /^(?:cd|pushd|popd|chdir|set-location|sl|push-location|pop-location)$/iu;
// The word a command runs with node, by its index ({ at }), past what goes before node (a variable set, env, exec)
// and node's own options; { moves } where the command changes the folder; { inner }, the commands a shell is given as
// one word; {} where it runs nothing with node.
function nodeRuns(words) {
  // (a command led by "!" still changes its folder, since bash with -e does not stop on it; a run behind it is none)
  const negated = words[0]?.text === "!";
  let i = negated ? 1 + pastWrappers(words.slice(1)) : pastWrappers(words);
  if (i < words.length && CHDIR.test(words[i].text)) return { moves: true };
  if (negated) return {};
  if (i < words.length && SHELL.test(words[i].text)) return inline(words, i);
  if (i >= words.length || !NODE.test(words[i].text)) return {};
  const shifted = words.slice(0, i).some(w => CHDIR_OPTION.test(w.text)); // (env --chdir=app node …: another folder)
  for (i++; i < words.length && words[i].text.startsWith("-"); i++) if (VALUED.has(words[i].text)) i++;
  return { at: i, shifted };
}
// Where a command's own word starts: past the variables it sets and its wrappers, with their options (sudo -E -H, env
// -i); an option's value (sudo -u bot) it cannot tell from the command, and runsIn says so.
function pastWrappers(words) {
  let i = 0;
  while (i < words.length && (/^\w+=/u.test(words[i].text) || WRAPPERS.has(words[i].text) || KEYWORDS.has(words[i].text))) {
    const wrapper = WRAPPERS.has(words[i].text);
    for (i++; wrapper && words[i]?.text.startsWith("-"); i++);
  }
  return i;
}
// The commands a shell at word `i` is given as one word, in its plain forms only, as { inner, filled, elsewhere }
// (elsewhere: run in another folder); {} where the reader finds none, and then a naming of the script in the line is
// said not read (unaccounted), never passed over. sh: its options before the string, one of them holding c (-c, -ec,
// -ce), -o and a cluster ending in o taking a value.
function inline(words, i) {
  if (/pwsh|powershell/iu.test(words[i].text)) return powershell(words, i);
  let c = false, k = i + 1;
  for (; k < words.length && /^[-+]/u.test(words[k].text); k++) {
    if (/^-[a-zA-Z]*c[a-zA-Z]*$/u.test(words[k].text)) c = true;
    if (/^[-+][a-zA-Z]*[oO]$/u.test(words[k].text)) k++;
  }
  return c && k < words.length ? { inner: words[k].text, filled: words[k].dynamic, shell: "bash" } : {};
}
// PowerShell's: -Command (or a prefix down to -c) and -CommandWithArgs (-cwa) give it; a word with a blank and no
// option before it is the command (Windows PowerShell's default); -File (or a prefix) gives a file; -WorkingDirectory
// (-wd) runs it elsewhere; another option takes the next word where that holds no blank and is no option.
function powershell(words, i) {
  let elsewhere = false;
  for (let k = i + 1; k < words.length; k++) {
    const t = words[k].text, next = words[k + 1];
    if (/^-(?:c|co|com|comm|comma|comman|command|commandwithargs|cwa)$/iu.test(t)) return next ? { inner: next.text, filled: next.dynamic, elsewhere, shell: "pwsh" } : {};
    if (/^-f(?:i(?:le?)?)?$/iu.test(t)) return {};
    if (!t.startsWith("-")) return /\s/u.test(t) ? { inner: t, filled: words[k].dynamic, elsewhere, shell: "pwsh" } : {};
    if (/^-(?:wd|wo\w*)$/iu.test(t)) elsewhere = true;
    if (next && !next.text.startsWith("-") && !/\s/u.test(next.text)) k++;
  }
  return {};
}
// How each script picks its config from its arguments, as it reads them: the first that does not start with "--"; of
// the reading-size and exact-versions checks, the first whatever it is; of the NuGet check, never the value of its
// "--packages", and none where it is run "--projects" or "--imports", which list files and read no config.
const PICKS = { "reading-size.mjs": { first: true }, "exact-versions.mjs": { first: true }, "nuget.mjs": { valued: ["--packages"], none: ["--projects", "--imports"] } };
// The config a run passes the script at word `i`, as that script picks it (PICKS), as { config }, a path from the
// root; { unread } with why it cannot be known; { none } where the run reads no config.
function configAfter(words, i, dir, script) {
  const pick = PICKS[path.posix.basename(script)] ?? {}, args = words.slice(i + 1);
  if (args.some(a => pick.none?.includes(a.text))) return { none: true };
  const k = pick.first ? 0 : args.findIndex((a, n) => !a.text.startsWith("--") && !(n > 0 && pick.valued?.includes(args[n - 1].text)));
  const arg = k < 0 ? words.length : i + 1 + k;
  if (arg >= words.length) return { unread: `runs ${script} with no config` };
  const config = located(words[arg], dir.at, dir.shell);
  if (config.windows) return { unread: `passes ${script} its config as ${words[arg].text}, a path with "\\" that Linux and Windows read as different files` };
  if (config.dynamic) return { unread: `passes ${script} its config as ${words[arg].text}, which names it only when the workflow runs` };
  return config.at === null ? { unread: `passes ${script} its config as ${words[arg].text}, outside the project` } : { config: config.at };
}
// Where a step names the copy's script more often than the reader accounts for, a run that cannot be known (never
// one that is not there), as [{ unread, unsure }]; else []. Each naming of it by its path is accounted for by a run the
// reader read (a config, or one it says it cannot place), or by a line that is one command that runs no script, alone
// (echo, cp, git: NO_RUNNER, with no pipe, redirection, here-document or second command); any other, in whatever form
// of the shell's (timeout 60s node …, cat <<EOF | bash, pwsh -c node …), leaves the step's run of it not read.
export function unaccounted(run, script, runs, given = 0) {
  let named = given, text = 0;
  for (const line of run.split(/\r?\n/u).map(uncommented).join("\n").replace(/\\\n/gu, " ").split("\n")) {
    const k = lineNamings(line, path.posix.basename(script));
    named += k;
    if (k && lone(line)) text += k;
  }
  if (runs.some(r => r.unsure)) return []; // (the step is not read already)
  return named > runs.filter(r => !r.unsure).length + text ? [{ unread: `names ${script} in a way the reader does not follow`, unsure: true }] : [];
}
// Whether a line is one command that runs no script, and nothing more.
const lone = line => {
  // (an operator outside quotes; a command's output, $(…) or `…`, or a variable set in passing, ${S:=…}, anywhere,
  // since double quotes run them too; printf -v, which sets a variable, and curl writing a file)
  if (/`|\$\(|\$\{(?!\{)/u.test(line) || /[|;&<>]/u.test(unquoted(line))) return false;
  if (/^\s*printf\s+-v\b/u.test(line) || /^\s*curl\b.*\s(?:-[a-zA-Z]*[oOK]|--output|--remote-name|--config)\b/u.test(line)) return false;
  const [words = [], more] = commands(line);
  return !more && NO_RUNNER.has(path.posix.basename(words[pastWrappers(words)]?.text ?? "").toLowerCase());
};
// How often a line names a script of that name, its quotes taken out and a "\\" read both as "/" and as nothing, as
// Windows and a shell read it.
export function lineNamings(line, name) {
  const bare = line.replace(/['"]/gu, "");
  return Math.max(namings(plainPath(bare), name), namings(plainPath(bare.replace(/\\/gu, "")), name));
}
// A line with what its quotes hold left out, read in one pass.
function unquoted(line) {
  let out = "", quote = "";
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) { if (c === "\\" && quote === '"') i++; else if (c === quote) quote = ""; }
    else if (c === "'" || c === '"') quote = c;
    else out += c;
  }
  return out;
}
// How often a text names a script of that name, `scripts/<name>`, as the reader matches a run's script (runAt), the
// text's quotes taken out first: whatever stands before it (a path, a variable's or the root's name, another folder
// whose name ends in scripts), so that no naming of the copy's escapes the count; one of another file is then not
// read, never a run hidden (one pass of indexOf, so no text makes it slow).
function namings(text, name) {
  const of = `scripts/${name}`.toLowerCase(), lower = text.toLowerCase();
  let n = 0;
  for (let at = lower.indexOf(of); at >= 0; at = lower.indexOf(of, at + 1)) if (!/[\w.-]/u.test(lower[at + of.length] ?? "")) n++;
  return n;
}
// (env's and sudo's options that run the command in another folder: env -C app, --chdir=app, sudo -D app)
const CHDIR_OPTION = /^(?:-C|-D|--chdir(?:=.*)?|--working-directory(?:=.*)?)$/u;
const NO_RUNNER = new Set(["sha256sum", "sha1sum", "md5sum", "shasum", "jq", "curl", "write-host", "write-output", "echo", "printf", "rm", "chmod", "chown", "cat", "head", "tail", "ls", "test", "[", "grep", "touch", "mkdir", "tee", "wc", "diff", "stat", "readlink", "realpath", "basename", "dirname", "which", "type", "true", "false", ":", "unset", "cd"]);
// The runs read inside a shell's command string, each not read where the outer shell fills the string when it runs
// (`bash -c "node … '$CONFIG'"`: the inner quotes keep nothing from it).
const within = (runs, filled, script) => (filled ? runs.map(() => ({ unread: `runs ${script} in a command string the workflow fills only when it runs`, unsure: true })) : runs);
// Where a step's `run:`, in the folder `dir`, runs `script` (a path from the root, "core/scripts/copies.mjs") with
// node: each as configAfter gives it.
export function runsIn(run, dir, script) {
  const found = [];
  let moved = false;
  for (const words of commands(run)) {
    const { moves, inner, filled, elsewhere, shifted, shell, at: i } = nodeRuns(words);
    moved ||= !!moves;
    if (inner !== undefined) found.push(...within(runsIn(inner, moved || elsewhere ? { dynamic: true, shell } : { ...dir, shell }, script), filled, script));
    else found.push(...runAt(words, i, moved || shifted ? { dynamic: true, moved: true, shell: dir.shell } : dir, script));
  }
  return found;
}
// The run of a command whose node is given the word at `i`, as runsIn gives it: where that word is no script of the
// copy's, nothing (unaccounted says so where it names the copy's); after a cd, or in a folder named only when it runs, which
// copy it runs cannot be known.
function runAt(words, i, dir, script) {
  const word = words[i];
  if (!word) return [];
  const name = path.posix.basename(script).toLowerCase(), at = located(word, dir.dynamic ? "." : dir.at, dir.shell);
  if (at.dynamic || at.windows || /[{*?[(]|\$'/u.test(word.text.replace(rootOf(dir.shell), ""))) return unplaced(word, dir, name, script);
  if (path.posix.basename(plainPath(word.text)).toLowerCase() !== name) return []; // (another script)
  if (dir.moved) return [{ unread: `runs ${word.text} after a command that changes its folder`, unsure: true }];
  if (dir.dynamic) return [{ unread: `runs ${word.text} in a folder named only when the workflow runs`, unsure: true }];
  // (only the copy's own path, letter for letter, is read; any other file of that name, in any case, is not: a runner
  // that ignores case may run the copy by it)
  return at.at === script ? [configAfter(words, i, dir, script)] : [{ unread: `runs ${word.text}, a file of the name of ${script} that the reader cannot tell from it`, unsure: true }];
}
