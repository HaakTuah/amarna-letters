// What the commands in a project's files fetch, for the licence scan (licence-scan.mjs, beside this file, which says
// what it needs of each). It reads each npx, npm exec (Windows' npx.cmd and npm.cmd too), npm install (and its other
// spellings), npm link, npm pack, npm diff, npm cache add and npm publish, past any redirection, in a file's text
// (commands: a line of its own for each, nested ones too, as in npx -c '...', and each command written as an array,
// execFileSync("npx", [...]), or by a path to the program), and in a JSON value (commandLines: package.json's
// "scripts", a hook's "command", a task's program with its arguments). For each it says what it fetches (fetched): the
// packages it names, or why that cannot be read. npx --no-install (or --no) never fetches. A word that is no command,
// straight after an option, is read as that option's value. What cannot be read: a variable, npx naming nothing to run
// here ("npx -y" in a variable), npm init or create, which fetch by another name, npm update or npm audit fix, which
// take the newest a range allows, another registry or npm config, npm install without its lockfile, a word that is no
// npm command where npm stands as one (atCommand), a command running on past 16 KB. Other fetchers (curl, wget, pip,
// pnpm, yarn, bun, playwright install, git clone and the like): OTHER_FETCHER. Node's own modules only (none).

// npm's commands that fetch a package, by every spelling npm takes; those that fetch nothing new (the lockfile's own,
// or none); and options known to take a value. A word that is no command, straight after an option, is read as that
// option's value, so an option it does not know cannot hide the command after it.
const INSTALL = new Set(["install", "i", "in", "ins", "inst", "insta", "instal", "isnt", "isnta", "isntal", "isntall", "add", "install-test", "it", "pack"]);
const RUN = new Set(["exec", "x"]);
const BY_OTHER_NAME = new Set(["create", "init", "innit"]);
const UPDATE = new Set(["update", "up", "upgrade", "udpate"]);
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
// (an argument of a list keeps its own spaces as this mark when the list is written as one line, so it stays one word)
const KEPT = "\u0000";
const whole = (argument) => argument.replace(/\s/gu, KEPT);
const LINK = new Set(["link", "ln"]);
const CONFIG = new Set(["config", "c", "set"]);
const NO_FETCH = new Set([
  "access", "adduser", "add-user", "audit", "author", "bugs", "issues", "cache", "ci", "clean-install", "ic", "install-clean", "isntall-clean", "install-ci-test",
  "cit", "clean-install-test", "completion", "config", "c", "get", "set", "dedupe", "ddp", "deprecate", "diff", "dist-tag", "dist-tags",
  "docs", "home", "doctor", "edit", "explain", "why", "explore", "find-dupes", "fund", "help", "hlp", "help-search", "hook",
  "ll", "la", "login", "logout", "ls", "list", "org", "outdated", "owner", "ping", "pkg", "prefix", "profile",
  "prune", "publish", "query", "rebuild", "rb", "repo", "restart", "root", "run", "run-script", "rum", "urn", "sbom",
  "search", "find", "s", "se", "shrinkwrap", "star", "stars", "start", "stop", "team", "test", "t", "tst", "token",
  "undeprecate", "uninstall", "unlink", "remove", "rm", "r", "un", "unpublish", "unstar", "version", "verison", "v",
  "view", "info", "show", "whoami",
]);
const VALUED = new Set([
  "-C", "-w", "-L", "--access", "--auth-type", "--before", "--browser", "--ca", "--cache", "--cafile", "--call", "-c",
  "--cert", "--cidr", "--cpu", "--depth", "--diff", "--diff-dst-prefix", "--diff-src-prefix", "--diff-unified",
  "--editor", "--expect-result-count", "--fetch-retries", "--fetch-retry-factor", "--fetch-retry-maxtimeout",
  "--fetch-retry-mintimeout", "--fetch-timeout", "--globalconfig", "--heading", "--https-proxy", "--include",
  "--init-author-email", "--init-author-name", "--init-author-url", "--init-license", "--init-module", "--init-version",
  "--install-strategy", "--key", "--libc", "--local-address", "--location", "--lockfile-version", "--loglevel",
  "--logs-dir", "--logs-max", "--maxsockets", "--message", "-m", "--node-options", "--noproxy", "--omit", "--os", "--otp",
  "--pack-destination", "--preid", "--prefix", "--provenance-file", "--proxy", "--registry", "--replace-registry-host",
  "--save-prefix", "--sbom-format", "--sbom-type", "--scope", "--script-shell", "--searchexclude", "--searchlimit",
  "--searchopts", "--searchstaleness", "--shell", "--tag", "--tag-version-prefix", "--umask", "--userconfig", "--viewer",
  "--which", "--workspace",
]);
// Other fetchers, as a command (at a line's or command's start, or as a program named in quotes before its arguments),
// past any options before their subcommand (pip --isolated install, git -C "vendor dir" clone, cargo +nightly
// install), each word read with its quoted parts, eight at most: past eight, a fetcher with options counts as a fetch.
// A program's name may stand as a word, or as a quoted word of its own, by its path too ("pip" install,
// "$here/node_modules/.bin/playwright" install, or \"pip\" in a string of code), and so may its subcommand (pip "install").
// bunx counts only before what can start an argument, so code that names "bunx" in a comparison or a list passes.
const PART = String.raw`(?:[^\s"']|"[^"\n]*"|'[^'\n]*')`;
const OPTION = String.raw`(?:\s+[-+]${PART}+(?:\s+(?:[^\s"'+-]|"[^"\n]*"|'[^'\n]*')${PART}*)?)`;
const program = (name) => String.raw`(?:\b${name}|\\?"(?:[^"\n]*[/\\])?${name}\\?"|\\?'(?:[^'\n]*[/\\])?${name}\\?')`;
const fetcher = (name, then) => `${program(name)}(?:${OPTION}{0,8}\\s+\\\\?["']?${then}|${OPTION}{8})`;
export const OTHER_FETCHER = new RegExp(
  "(?:(?:^|[\\s;&|(`$\'\"/\\\\])(?:curl|wget)|\\\\?\"(?:[^\"\\n]*[/\\\\])?(?:curl|wget)\\\\?\"|\\\\?\'(?:[^\'\\n]*[/\\\\])?(?:curl|wget)\\\\?\')" +
    "\\s+(?:-[-a-zA-Z]|https?://|[\'\"$])|['\"`](?:[^'\"`\\s]*[/\\\\])?(?:curl|wget|pip3?|pipx|pnpm|yarn|bunx|bun|gem|cargo|deno)['\"`]\\s*,\\s*\\[|" +
    "['\"`](?:[^'\"`\\s]*[/\\\\])?git['\"`]\\s*,\\s*\\[\\s*['\"`]clone|" +
    `(?:${fetcher("pipx?3?", "install")}|${fetcher("pnpm", "(?:dlx|add|install|i)[\"']?\\s")}|${fetcher("yarn", "(?:dlx|add)[\"']?\\s")}|${program("bunx")}\\s+[\\w@./"'$~\`\\\\-]|` +
    `${fetcher("bun", "(?:add|x|install)[\"']?\\s")}|${fetcher("playwright", "install")}|${fetcher("git", "clone")}|${fetcher("gem", "install")}|` +
    `${fetcher("cargo", "install")}|${fetcher("go", "install")}|${fetcher("apt(?:-get)?", "install")}|${fetcher("brew", "install")}|` +
    `${fetcher("deno", "(?:install|run)")})`,
  "mu",
);

/**
 * What one command line fetches: { specs, unreadable, packs } where specs are the packages written for npx, npm exec,
 * npm install (and its other spellings) or npm pack, unreadable says why a fetch could not be read, and packs that it
 * is npm pack, which only fetches.
 * Others: { specs: [] }.
 */
export function fetched(line, atCommand = false, literal = false) {
  // (a comment after the command, and a redirection, ">log", "2> log", "&>log", "<in", with its target wherever it
  // stands, are known by the word as written and only outside quotes: a quoted '#x', "release #1" or '>' is an
  // argument; in a line built from an argument list, where no shell reads it, every word is one. Quotes are followed
  // twice, a backslash escaping the next character and not, since it may belong to a string around the command
  // ("npm i --cache \"a #c\" x" in code); a word counts as outside only where both readings say so)
  const raw = line.trim().split(/\s+/u);
  const inside = (escapes) => {
    let quote = "";
    return raw.map((w) => {
      const was = quote !== "";
      for (let k = 0; k < w.length; k++) {
        if (escapes && w[k] === "\\" && quote !== "'") k++;
        else if (quote) { if (w[k] === quote) quote = ""; } else if ("'\"`".includes(w[k])) quote = w[k];
      }
      return was;
    });
  };
  const escaped = inside(true), plain = inside(false), quoted = raw.map((w, k) => escaped[k] || plain[k]);
  const end = literal ? -1 : raw.findIndex((w, k) => !quoted[k] && (w.startsWith("#") || w.startsWith("//")));
  const operator = (k) => !literal && !quoted[k] && /^\d*[<>&]/u.test(raw[k] ?? "");
  const kept = (end < 0 ? raw : raw.slice(0, end)).filter((w, k) => !operator(k) && !(operator(k - 1) && /^\d*[<>&]+$/u.test(raw[k - 1])));
  // (then each word loses the quotes, brackets and commas of the string or call it sits in; a "+" between the pieces of
  // a string built in code joins them: npm ' + 'install x)
  const words = kept.map((w) => w.replace(/^['"`([{]+|['"`),;\]}]+$/gu, "").replaceAll(KEPT, " ")).filter((w) => w && w !== "+");
  if (/^(npx|npm)\.cmd$/iu.test(words[0] ?? "")) words[0] = words[0].slice(0, 3).toLowerCase(); // (Windows' spelling)
  // (an audited name means the npm registry's package: a command that fetches from elsewhere cannot be audited by it)
  if (/^(npx|npm)$/u.test(words[0] ?? "") && words.some((w) => /^--?(@[^=]*:)?registry\b|^--replace-registry-host\b|^--(user|global)config\b|^npm_config_.*(registry|config)/iu.test(w)))
    return { specs: [], unreadable: "it fetches from another registry than npm's, or reads another npm config that may name one" };
  let i = 0, args = words.slice(1);
  const options = () => { while (i < words.length && words[i].startsWith("-")) i += VALUED.has(words[i]) ? 2 : 1; };
  let runs = false, npx = false, local = false, packs = false, linking = false;
  if (words[0] === "npx") { runs = npx = true; i = 1; } else if (words[0] === "npm") {
    // (after npm, its options; a word that is no command, straight after an option, is taken as that option's value)
    const fetching = (w) => INSTALL.has(w) || RUN.has(w) || BY_OTHER_NAME.has(w) || UPDATE.has(w) || LINK.has(w);
    i = 1;
    let command;
    for (let afterOption = false; i < words.length; ) {
      const w = words[i++];
      if (w.startsWith("-")) { if (VALUED.has(w)) i++; afterOption = !VALUED.has(w) && !w.includes("="); continue; }
      if (fetching(w) || NO_FETCH.has(w) || !afterOption) { command = w; break; }
      afterOption = false;
    }
    // (npm reads the options before its command as its config, as it reads those after: npm --diff=x diff)
    const early = command === undefined ? [] : words.slice(1, i - 1);
    // (npm config set registry, and the like, points every later fetch at another registry; npm audit fix installs
    // releases the lockfile does not hold)
    const sets = command === "set" || words.slice(i).some((w) => w === "set" || w === "edit");
    if (CONFIG.has(command) && sets && words.slice(i).some((w) => /(^|:)registry\b|^replace-registry-host\b|^(user|global)config\b/iu.test(w)))
      return { specs: [], unreadable: "it points npm at another registry or config, so no audited name can be trusted after it" };
    if (command === "audit" && words.slice(i).includes("fix")) return { specs: [], unreadable: "npm audit fix installs releases the lockfile does not hold" };
    // (npm diff --diff=<spec>, npm cache add <spec> and npm publish <spec> fetch what they name, and prepare a git
    // package, running its scripts: each but a local folder or tarball is a package to audit)
    if (command === "diff" || command === "cache" || command === "publish") {
      // (a local folder or tarball: a path, never an address, https://x/y.tgz, or a git remote)
      const localSpec = (w) => (w.includes(":") ? w.startsWith("file:") : /^(\.|\/|~)/u.test(w) || /\.(tgz|tar\.gz)$/iu.test(w));
      const rest = command === "diff" ? [...early, ...words.slice(i)] : words.slice(i), specs = [];
      let adding = command !== "cache";
      for (let k = 0; k < rest.length; k++) {
        const w = rest[k], diff = /^--diff(?:=(.*))?$/u.exec(w);
        if (diff) { const v = diff[1] ?? rest[++k]; if (command === "diff" && v !== undefined && !localSpec(v)) specs.push(v); continue; }
        if (w.startsWith("-")) { if (VALUED.has(w)) k++; continue; }
        if (!adding) { if (w !== "add") break; adding = true; continue; }
        if (command !== "diff" && !localSpec(w)) specs.push(w);
      }
      return { specs };
    }
    // (where npm stands as a command, a word after it that is no npm command cannot be read: a variable, a string
    // built in code; elsewhere, in prose, it is only a word)
    if (atCommand && command !== undefined && !fetching(command) && !NO_FETCH.has(command))
      return { specs: [], unreadable: `npm ${command}: no npm command, so what it runs cannot be read` };
    if (INSTALL.has(command) && command !== "pack" && [...early, ...words.slice(i)].some((w, k, rest) => /^--no-(package-lock|shrinkwrap)$|^--(package-lock|shrinkwrap)=false$/iu.test(w) || (/^--(package-lock|shrinkwrap)$/iu.test(w) && /^false$/iu.test(rest[k + 1] ?? ""))))
      return { specs: [], unreadable: "it installs without the lockfile, so what it installs is not what the lockfile's check read" };
    if (command === undefined || !fetching(command)) return { specs: [] };
    if (UPDATE.has(command)) return { specs: [], unreadable: `npm ${command} fetches the newest release a range allows, which cannot be audited` };
    if (RUN.has(command)) { runs = true; args = [...early, ...words.slice(i)]; } else args = words.slice(i);
    if (LINK.has(command)) linking = true; // (npm link <package> installs it if missing; a folder is linked as it is)
    else if (BY_OTHER_NAME.has(command)) { options(); return words[i] ? { specs: [], unreadable: `npm ${command} fetches a package by another name` } : { specs: [] }; }
    else packs = command === "pack";
  } else return { specs: [] };
  // (npx reads its options up to the command it runs; npm exec reads them, --package among them, up to "--", and
  // those before "exec" too)
  const specs = [];
  let command, called = false;
  for (i = 0; i < args.length; i++) {
    const w = args[i];
    if (w === "--") { if (runs && !npx) { command ??= args[i + 1]; break; } continue; }
    if (w === "-p" || w === "--package") { specs.push(args[++i] ?? ""); continue; }
    if (w.startsWith("--package=") || w.startsWith("-p=")) { specs.push(w.slice(w.indexOf("=") + 1)); continue; }
    // (--no-install is --yes=false; --yes, -y or --yes=<anything but false> installs; the last one given counts)
    const yes = /^(?:--yes|-y)(?:=(.*))?$/u.exec(w), no = /^(?:--no-install|--no|--no-yes)(?:=(.*))?$/u.exec(w);
    if (runs && yes) { local = yes[1] === "false"; continue; }
    if (runs && no) { local = no[1] !== "false"; continue; }
    if (runs && /^(-c|--call)(=|$)/u.test(w)) { called = true; if (!w.includes("=")) i++; continue; } // (the shell line it runs: read as a line of its own)
    if (VALUED.has(w)) { i++; continue; }
    if (w.startsWith("-")) continue;
    if (!runs) { if (!(linking && /^(\.|\/|~|file:)/u.test(w))) specs.push(w); continue; }
    command ??= w;
    if (npx) break;
  }
  if (runs && !specs.length && command !== undefined && !local && !called) specs.push(command);
  // (npx with no package and nothing to run here takes them from elsewhere: a variable, "npx -y" + a package later)
  const asks = args.length > 0 && args.every((w) => /^(--version|-v|--help|-h)$/u.test(w)); // (npx --version)
  if (runs && !specs.length && command === undefined && !called && !asks) return { specs: [], unreadable: "it names nothing to run here, so what it runs comes from elsewhere" };
  return { specs, packs };
}

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
  for (let budget = 4096; budget > 0; ) {
    if (lineStart(k) || "({[=:,".includes(text[k - 1])) return true;
    const q = text[k - 1];
    let start = k - 1;
    if ("'\"`".includes(q)) {
      while (start > 0 && text[start - 1] !== q && text[start - 1] !== "\n" && budget-- > 0) start--;
      if (budget <= 0) return true; // (read no further: it counts)
      if (start === 0 || text[start - 1] !== q) return false;
      start--;
    } else {
      start = k;
      while (!lineStart(start) && !SPACE.has(text[start - 1]) && budget-- > 0) start--;
      if (budget <= 0) return true;
      const w = text.slice(start, k).replace(/^.*[\/\\]/u, "");
      if (STRING_RUNNERS.test(w)) return true;
      if (!w.startsWith("-")) return false;
    }
    k = start;
    while (!lineStart(k) && SPACE.has(text[k - 1]) && budget-- > 0) k--;
  }
  return true;
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
const strings = (v) => (typeof v === "string" ? [v] : v && typeof v === "object" ? Object.values(v).flatMap(strings) : []);
export function commandLines(v) {
  if (!v || typeof v !== "object") return typeof v === "string" ? [v] : [];
  const programs = [], args = [], out = [];
  for (const [k, x] of Object.entries(v)) {
    if (!Array.isArray(v) && PROSE.test(k)) continue;
    const listed = Array.isArray(x) && x.every((y) => typeof y === "string");
    if (!Array.isArray(v) && COMMAND.test(k) && typeof x === "string") programs.push(x);
    else if (!Array.isArray(v) && COMMAND.test(k) && listed) args.push(...x);
    else if (!Array.isArray(v) && COMMAND.test(k)) out.push(...strings(x)); // (package.json's "scripts": every one, a "help" too)
    else out.push(...commandLines(x));
  }
  // (one program with its arguments, as a task or a launch writes them; several, each its own line, as scripts are,
  // each with any arguments beside them)
  // (a line built from an argument list is literal: no shell reads it, so "#" or ">" there is an argument)
  const line = (words) => (args.length ? Object.assign(new String(words.join(" ")), { literal: true }) : words.join(" "));
  // (an argument holding spaces is kept whole for the list's program, and also read as a command line of its own,
  // since a list may hand a shell one: ["bash", "-c", "npx -y x"])
  const listed = args.map(whole), lines = args.filter((a) => /\s/u.test(a));
  if (programs.length === 1) return [line([programs[0], ...listed]), ...lines, ...out];
  return [...programs.map((p) => line([p, ...listed])), ...(args.length ? [line(listed)] : []), ...lines, ...out];
}
