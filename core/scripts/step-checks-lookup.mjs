// What a job runs before the lookup, with nothing of the pull request's before it, as the step of
// setup/sync-notes/540-a-new-package-looked-up.md reads it (steps.mjs, beside this file, holds the steps, and
// step-checks.mjs the words they share). It reads only. Node's own modules only.
import path from "node:path";

// A config as a step names it, from the folder the step runs in, so that one name in two folders is two configs.
export const placed = (cfg, dir) => (typeof cfg === "string" && dir && !path.posix.isAbsolute(cfg) ? path.posix.normalize(path.posix.join(dir, cfg)) : cfg);

// Whether a counted lookup step runs the lookup, given `flag`, with the config `at.cfg` the check's step gives; a config
// named by a variable is matched only where both steps give that variable the same value (or neither sets it), one
// an action's input names, where its caller gave none, is matched by none, and a lookup counts only where it is a step
// that may stand before the lookup itself (beforeLookup: the runner's node running the copy's own script from the
// project's root, nothing hidden), and every step before it in its job is one too, so nothing the pull request holds
// has run before it. npm's lookup counts too where it is the licence check's own (#1093, point 2), in a job whose
// checkout holds the pull request's base, without which that check looks up nothing.
export const lookupOf = (st, flag, copy, at, job) => {
  if (/\$\{\{\s*inputs\./u.test(at.cfg ?? "") || !beforeLookup(st, copy)) return false;
  const i = job.steps.indexOf(st);
  if (i < 0 || !job.steps.slice(0, i).every(x => beforeLookup(x, copy))) return false;
  const by = lookupBy(st, flag, copy, job);
  if (!by || placed(configOf(st.cmds[0], by, copy), st.dir) !== at.cfg) return false;
  const name = /\$\{?(\w+)|%(\w+)%/u.exec(at.cfg ?? "");
  return !name || st.env[name[1] ?? name[2]] === at.step.env[name[1] ?? name[2]];
};

// The script of the copy's by which a counted step runs the lookup, given `flag`, or null: the lookup itself, or npm's
// by the licence check, in a job whose checkout holds the pull request's base.
const lookupBy = (st, flag, copy, job) => (!st.counts ? null : looksUp(st.cmds[0], flag, copy) ? "lookup.mjs"
  : flag === false && job.deep && licencesLookUp(st.cmds[0], copy) ? "licences.mjs" : null);

// Where a lookup stands, as the step's mend says it (beforeLookup).
export const FIRST = copy => `with nothing before it in its job but the checkout, \`setup-\` actions and the core's lookup, exact-versions, licence, agent-tools and install scripts, each run as \`node ${copy}scripts/<name>.mjs\` from the project's root under bash (named, or on GitHub's own Linux or macOS runner) in a job with no container or services, with no env but a variable its config is named by, each setup action given only its version, its cache, if named, turned off (\`package-manager-cache: false\`, or in \`setup-dotnet\` \`cache: false\`), so that nothing of the pull request's (\`npm\`, \`dotnet\`, a build script, a local action, \`${copy}scripts/nuget.mjs\`) has run before it`;

// Whether a step may stand before a lookup: checkout or a setup action, or a run, by the runner's own `node`, from the
// project's root, of one of the core's scripts that only read (BEFORE_LOOKUP), named by the copy's own path, with nothing
// hidden (hides). Anything else (dotnet under any spelling, npm, a build script, make, a local action, a script of the
// core's that restores or runs the project's tests) may run the pull request's own files, which could change what the
// lookup reads or the lookup itself: an allow-list, not a search for a build.
// (and the install of the core's own packages from its lock file, which runs none of their code: #654)
const BEFORE_LOOKUP = ["lookup.mjs", "exact-versions.mjs", "licences.mjs", "agent-tools.mjs", "install.mjs"];

const beforeLookup = (st, copy) => (st.uses ? st.plain && /^actions\/(?:checkout|setup-[\w-]+)@/u.test(st.uses)
  : !st.hidden && (st.dir === undefined || st.dir === ".") && st.cmds.length > 0 && st.cmds.every(c => c.length > 1
    && /^node(?:\.exe)?$/iu.test(c[0].text) && BEFORE_LOOKUP.some(n => c[1].text === `${copy}scripts/${n}` || c[1].text === `./${copy}scripts/${n}`)));

// Whether a command names the script `name` of the copy at `copy` (the manifest's path, core/ by default), and, given
// `flag`, with that flag (true) or without it (false).
export const running = (words, name, flag, copy = "core/") => words.some(w => new RegExp(`(?:^|/)${copy.replace(/[\\^$.*+?()[\]{}|]/gu, "\\$&")}scripts/${name.replace(".", "\\.")}$`, "u").test(w.text))
  && (flag === undefined || words.some(w => w.text === "--nuget") === flag);

// The config a command gives the copy's script `name`: its first argument after the script that is no flag.
export const configOf = (words, name, copy) => {
  const at = words.findIndex(w => running([w], name, undefined, copy));
  return at < 0 ? null : words.slice(at + 1).find(w => !w.text.startsWith("--"))?.text ?? null;
};

// Whether a command runs the lookup itself: node, then the copy's script.
export const looksUp = (words, flag, copy) => /(?:^|[\\/])node(?:\.exe)?$/iu.test(words[0]?.text ?? "") && words.length > 1 && running([words[1]], "lookup.mjs", undefined, copy) && running(words, "lookup.mjs", flag, copy);

// Whether a command runs the licence check, which looks up npm's new packages itself: node, then the copy's script,
// not for the dependency review's lists (--action).
const licencesLookUp = (words, copy) => /(?:^|[\\/])node(?:\.exe)?$/iu.test(words[0]?.text ?? "") && words.length > 1 && running([words[1]], "licences.mjs", undefined, copy) && !words.some(w => w.text === "--action");
