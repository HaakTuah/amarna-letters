// What one npm or npx command line fetches, for the licence scan (licence-commands.mjs, beside this file, finds the
// lines in a file's text): the packages npx, npm exec, npm install (and its other spellings), npm link, npm pack, npm
// diff, npm cache add and npm publish name, past any redirection, or why that cannot be read (fetched). npx
// --no-install (or --no) never fetches. A word that is no command, straight after an option, is read as that option's
// value. What cannot be read: a variable, npx naming nothing to run here ("npx -y" in a variable), npm init or create,
// which fetch by another name, npm update or npm audit fix, which take the newest a range allows, another registry or
// npm config, npm install without its lockfile, a word that is no npm command where npm stands as one (atCommand).
// Node's own modules only (none).

// npm's commands that fetch a package, by every spelling npm takes; those that fetch nothing new (the lockfile's own,
// or none); and options known to take a value. A word that is no command, straight after an option, is read as that
// option's value, so an option it does not know cannot hide the command after it.
const INSTALL = new Set(["install", "i", "in", "ins", "inst", "insta", "instal", "isnt", "isnta", "isntal", "isntall", "add", "install-test", "it", "pack"]);
const RUN = new Set(["exec", "x"]);
const BY_OTHER_NAME = new Set(["create", "init", "innit"]);
const UPDATE = new Set(["update", "up", "upgrade", "udpate"]);
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

/**
 * What one command line fetches: { specs, unreadable, packs } where specs are the packages written for npx, npm exec,
 * npm install (and its other spellings) or npm pack, unreadable says why a fetch could not be read, and packs that it
 * is npm pack, which only fetches.
 * Others: { specs: [] }.
 */
export function fetched(line, atCommand = false, literal = false) {
  const words = wordsOf(line, literal);
  // (an audited name means the npm registry's package: a command that fetches from elsewhere cannot be audited by it)
  if (/^(npx|npm)$/u.test(words[0] ?? "") && words.some((w) => /^--?(@[^=]*:)?registry\b|^--replace-registry-host\b|^--(user|global)config\b|^npm_config_.*(registry|config)/iu.test(w)))
    return { specs: [], unreadable: "it fetches from another registry than npm's, or reads another npm config that may name one" };
  if (words[0] === "npx") return argSpecs(words.slice(1), { runs: true, npx: true });
  if (words[0] !== "npm") return { specs: [] };
  const plan = npmPlan(words, atCommand);
  return plan.done ?? argSpecs(plan.args, plan);
}

/** The words of a command line, as the shell reads them (a comment, a redirection and the quotes of what it sits in gone). */
function wordsOf(line, literal) {
  const raw = line.trim().split(/\s+/u), quoted = quotedWords(raw);
  const end = literal ? -1 : raw.findIndex((w, k) => !quoted[k] && (w.startsWith("#") || w.startsWith("//")));
  // (then each word loses the quotes, brackets and commas of the string or call it sits in; a "+" between the pieces of
  // a string built in code joins them: npm ' + 'install x)
  const words = unredirected(end < 0 ? raw : raw.slice(0, end), (k) => !literal && !quoted[k] && /^\d*[<>&]/u.test(raw[k] ?? ""), raw)
    .map((w) => w.replace(/^['"`([{]+|['"`),;\]}]+$/gu, "").replaceAll(KEPT, " ")).filter((w) => w && w !== "+");
  if (/^(npx|npm)\.cmd$/iu.test(words[0] ?? "")) words[0] = words[0].slice(0, 3).toLowerCase(); // (Windows' spelling)
  return words;
}

/**
 * Which words stand inside quotes: a comment after the command, and a redirection, ">log", "2> log", "&>log", "<in",
 * with its target wherever it stands, are known by the word as written and only outside quotes: a quoted '#x',
 * "release #1" or '>' is an argument. Quotes are followed twice, a backslash escaping the next character and not,
 * since it may belong to a string around the command ("npm i --cache \"a #c\" x" in code); a word counts as outside
 * only where both readings say so.
 */
function quotedWords(raw) {
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
  const escaped = inside(true), plain = inside(false);
  return raw.map((w, k) => escaped[k] || plain[k]);
}

/** `words` without each redirection (`operator` says which of `raw` begins one) and the target it stands before. */
function unredirected(words, operator, raw) {
  return words.filter((w, k) => !operator(k) && !(operator(k - 1) && /^\d*[<>&]+$/u.test(raw[k - 1])));
}

/**
 * What npm does with its command: the line's result where that is final ({ done }), else the words it takes as
 * arguments, and whether the command runs a program (npm exec), links or packs.
 */
function npmPlan(words, atCommand) {
  const { command, i, early } = npmCommand(words);
  const rest = words.slice(i);
  const refused = npmRefusal(command, rest);
  if (refused) return { done: refused };
  // (npm diff --diff=<spec>, npm cache add <spec> and npm publish <spec> fetch what they name, and prepare a git
  // package, running its scripts: each but a local folder or tarball is a package to audit)
  if (command === "diff" || command === "cache" || command === "publish") return { done: { specs: pathSpecs(command, command === "diff" ? [...early, ...rest] : rest) } };
  const unread = npmUnreadable(command, atCommand, [...early, ...rest]);
  if (unread) return { done: unread };
  if (command === undefined || !fetching(command)) return { done: { specs: [] } };
  if (UPDATE.has(command)) return { done: { specs: [], unreadable: `npm ${command} fetches the newest release a range allows, which cannot be audited` } };
  if (BY_OTHER_NAME.has(command)) return { done: skipOptions(words, i) < words.length ? { specs: [], unreadable: `npm ${command} fetches a package by another name` } : { specs: [] } };
  const runs = RUN.has(command);
  return { args: runs ? [...early, ...rest] : rest, runs, npx: false, linking: LINK.has(command), packs: command === "pack" };
}

const fetching = (w) => INSTALL.has(w) || RUN.has(w) || BY_OTHER_NAME.has(w) || UPDATE.has(w) || LINK.has(w);

/** The index past the options that start `words` at `i`. */
function skipOptions(words, i) {
  while (i < words.length && words[i].startsWith("-")) i += VALUED.has(words[i]) ? 2 : 1;
  return i;
}

/** The npm command in `words`, with the index past it and the options before it. */
function npmCommand(words) {
  // (after npm, its options; a word that is no command, straight after an option, is taken as that option's value)
  let i = 1, command;
  for (let afterOption = false; i < words.length; ) {
    const w = words[i++];
    if (w.startsWith("-")) { if (VALUED.has(w)) i++; afterOption = !VALUED.has(w) && !w.includes("="); continue; }
    if (fetching(w) || NO_FETCH.has(w) || !afterOption) { command = w; break; }
    afterOption = false;
  }
  // (npm reads the options before its command as its config, as it reads those after: npm --diff=x diff)
  return { command, i, early: command === undefined ? [] : words.slice(1, i - 1) };
}

/** Why a command cannot be audited at all, whatever it names, or undefined. */
function npmRefusal(command, rest) {
  // (npm config set registry, and the like, points every later fetch at another registry; npm audit fix installs
  // releases the lockfile does not hold)
  const sets = command === "set" || rest.some((w) => w === "set" || w === "edit");
  if (CONFIG.has(command) && sets && rest.some((w) => /(^|:)registry\b|^replace-registry-host\b|^(user|global)config\b/iu.test(w)))
    return { specs: [], unreadable: "it points npm at another registry or config, so no audited name can be trusted after it" };
  if (command === "audit" && rest.includes("fix")) return { specs: [], unreadable: "npm audit fix installs releases the lockfile does not hold" };
  return undefined;
}

/** Why what npm is asked to fetch cannot be read, or undefined. `all` is the options and words after "npm". */
function npmUnreadable(command, atCommand, all) {
  // (where npm stands as a command, a word after it that is no npm command cannot be read: a variable, a string
  // built in code; elsewhere, in prose, it is only a word)
  if (atCommand && command !== undefined && !fetching(command) && !NO_FETCH.has(command))
    return { specs: [], unreadable: `npm ${command}: no npm command, so what it runs cannot be read` };
  if (INSTALL.has(command) && command !== "pack" && all.some((w, k, rest) => /^--no-(package-lock|shrinkwrap)$|^--(package-lock|shrinkwrap)=false$/iu.test(w) || (/^--(package-lock|shrinkwrap)$/iu.test(w) && /^false$/iu.test(rest[k + 1] ?? ""))))
    return { specs: [], unreadable: "it installs without the lockfile, so what it installs is not what the lockfile's check read" };
  return undefined;
}

/** The packages npm diff, npm cache add and npm publish name in `rest`: not a local folder or tarball. */
function pathSpecs(command, rest) {
  // (a local folder or tarball: a path, never an address, https://x/y.tgz, or a git remote)
  const localSpec = (w) => (w.includes(":") ? w.startsWith("file:") : /^(\.|\/|~)/u.test(w) || /\.(tgz|tar\.gz)$/iu.test(w));
  const specs = [];
  let adding = command !== "cache";
  for (let k = 0; k < rest.length; k++) {
    const w = rest[k], diff = /^--diff(?:=(.*))?$/u.exec(w);
    if (diff) { const v = diff[1] ?? rest[++k]; if (command === "diff" && v !== undefined && !localSpec(v)) specs.push(v); continue; }
    if (w.startsWith("-")) { if (VALUED.has(w)) k++; continue; }
    if (!adding) { if (w !== "add") break; adding = true; continue; }
    if (command !== "diff" && !localSpec(w)) specs.push(w);
  }
  return specs;
}

/**
 * The packages npx, npm exec, npm install (and the like) name in `args`: npx reads its options up to the command it
 * runs; npm exec reads them, --package among them, up to "--", and those before "exec" too. `mode`: whether it runs
 * a program (npx, npm exec) and which, and whether it links or packs.
 */
function argSpecs(args, mode) {
  const found = { specs: [], command: undefined, called: false, local: false };
  for (let i = 0; i < args.length; i++) {
    i = argStep(args, i, mode, found);
    if (i < 0) break;
  }
  const { specs, command, called, local } = found, { runs, packs = false } = mode;
  if (runs && !specs.length && command !== undefined && !local && !called) specs.push(command);
  // (npx with no package and nothing to run here takes them from elsewhere: a variable, "npx -y" + a package later)
  const asks = args.length > 0 && args.every((w) => /^(--version|-v|--help|-h)$/u.test(w)); // (npx --version)
  if (runs && !specs.length && command === undefined && !called && !asks) return { specs: [], unreadable: "it names nothing to run here, so what it runs comes from elsewhere" };
  return { specs, packs };
}

/** Reads the word at `args[i]` into `found`; the index of the last word it took, or -1 where the reading ends. */
function argStep(args, i, { runs, npx, linking }, found) {
  const w = args[i];
  if (w === "--") {
    if (!runs || npx) return i;
    found.command ??= args[i + 1];
    return -1;
  }
  const flagged = packageFlag(args, i, found.specs) ?? (runs ? execFlag(args, i, found) : undefined);
  if (flagged !== undefined) return flagged;
  if (VALUED.has(w)) return i + 1;
  if (w.startsWith("-")) return i;
  if (!runs) {
    if (!(linking && /^(\.|\/|~|file:)/u.test(w))) found.specs.push(w);
    return i;
  }
  found.command ??= w;
  return npx ? -1 : i;
}

/** The index past a --package or -p option at `args[i]`, its package taken into `specs`; undefined if it is none. */
function packageFlag(args, i, specs) {
  const w = args[i];
  if (w === "-p" || w === "--package") { specs.push(args[i + 1] ?? ""); return i + 1; }
  if (w.startsWith("--package=") || w.startsWith("-p=")) { specs.push(w.slice(w.indexOf("=") + 1)); return i; }
  return undefined;
}

/**
 * The index past an option of what runs a program (--yes, --no-install, -c) at `args[i]`, what it says taken into
 * `found`; undefined if it is none. --no-install is --yes=false; --yes, -y or --yes=<anything but false> installs; the
 * last one given counts; -c and --call name the shell line it runs, read as a line of its own.
 */
function execFlag(args, i, found) {
  const w = args[i], yes = /^(?:--yes|-y)(?:=(.*))?$/u.exec(w), no = /^(?:--no-install|--no|--no-yes)(?:=(.*))?$/u.exec(w);
  if (yes) { found.local = yes[1] === "false"; return i; }
  if (no) { found.local = no[1] !== "false"; return i; }
  if (!/^(-c|--call)(=|$)/u.test(w)) return undefined;
  found.called = true;
  return w.includes("=") ? i : i + 1;
}

// (shared with licence-commands.mjs, which reads where a command stands: its options, the list-argument mark)
export { CONFIG, NO_FETCH, RUN, whole };
