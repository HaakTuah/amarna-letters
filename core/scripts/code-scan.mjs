// The scan of a private project's code (#546; CHOICES.md, "Choice: a private project's code is scanned by Semgrep's
// engine, with the core's own rules"): where the host's CodeQL does not scan the project, which it does only where a
// workflow calls the core's codeql.yml, Semgrep's engine reads the files a pull request changes with the core's own
// rules (code-scan.yml beside this file) and fails a finding the pull request's base did not hold, saying its mend: the
// base's own versions of those files are scanned too, so input the change brings to a sink whose line it leaves as it
// was counts as the change's. A finding the base held is reported and passes (the core's AGENTS.md, "Nothing locks a
// project"). Whether a workflow calls codeql.yml is read from the base's workflows, parsed, so a change cannot switch
// the scan off. A finding the pull request's description lists on a line "Scan false alarm: `<path>:<line>`, <why>"
// passes, said so, for its security review to confirm, as floor rule 9 says of CodeQL's false alarms. With no base, as
// on a push to main, it reads every tracked file of the kinds it reads and reports what it finds.
//   The engine is a tool that only runs, installed before the check and never while it runs (#534, point 5; #654):
// `--install` runs `install.mjs pypi`, which installs the wheel of Semgrep 1.185.0 for this system from the core's
// `.packages/requirements.txt`, PyPI's own lock form, by its SHA-256, into the core's `.packages/pypi/` folder, with pip and no package
// code run; it does so only where the host's CodeQL does not scan the project and, with a base, the change adds or
// alters a file of the kinds the scan reads. The scan runs `semgrep-core` from there under the name `osemgrep`, by which
// it runs as a whole command with no Python. Where the engine is not installed, a copy's scan installs it first, and
// where it cannot, says so as a warning; in the core it fails, saying how to install it (packages.mjs).
// The engine runs with no variable but those a program needs to start and a home
// and temporary folder of its own, so no token reaches it, and with its metrics off; a comment in the code that would
// silence a finding (`nosemgrep`) silences none, and the files are named to it, so no ignore file of the project's
// leaves one out. Each file is handed to the engine past its own limits of size and place, and one it
// did not read whole fails as a finding does, unless the description lists it on a line "Scan unread: `<path>`", which
// excuses only a file the engine did not read, or one with which it gives no answer at all. It
// reads JavaScript and TypeScript, C# and Python; a file that is a link, or leads out of the
// project, is not read, nor the core's copy, whose code the host's CodeQL scans in the core's own public repository.
// Node's own modules, git, and the engine.
//
//   node core/scripts/code-scan.mjs --install [--base <commit>]     before the check, in its job: a step of core.yml
//   node core/scripts/code-scan.mjs [--base <commit>] [--description <file>]
//        (the description from the file, or else from PR_BODY; the engine from the core's .packages/pypi/semgrep/bin)
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORE } from "./core-address.mjs";
import { copyOf } from "./core-path.mjs";
import { leadsOut, logged } from "./guards.mjs";
import { MEND } from "./mend.mjs";
import { started } from "./started.mjs";
import { pypiFile, pypiNotInstalled, pypiUnreached } from "./packages.mjs";
import { parseYaml } from "./parse-yaml.mjs";

// The engine's version, as the core's .packages/requirements.txt names it: the one place it is written.
const VERSION = (() => {
  try { return /^semgrep==(\S+)/mu.exec(fs.readFileSync(new URL("../.packages/requirements.txt", import.meta.url), "utf8"))?.[1]; } catch { return undefined; }
})() ?? "(no version named)";
const KINDS = /\.(?:[cm]?js|jsx|ts|tsx|cs|py)$/u;
const RULES = fileURLToPath(new URL("code-scan.yml", import.meta.url));
const exe = (sys = process.platform) => (sys === "win32" ? ".exe" : "");

/** The variables the engine runs with: what a program needs to start, and a home and temporary folder of its own. */
function engineEnv(home) {
  const env = { HOME: home, USERPROFILE: home, TMPDIR: home, TEMP: home, TMP: home, SEMGREP_SEND_METRICS: "off" };
  for (const name of ["PATH", "Path", "SYSTEMROOT", "SystemRoot", "WINDIR", "LANG"]) if (process.env[name]) env[name] = process.env[name];
  return env;
}

// A call to the core's own codeql.yml, at a full commit: a call to another's, or at a branch, is no scan the core vouches for.
const CODEQL = new RegExp(`^${CORE.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}/\\.github/workflows/codeql\\.yml@[0-9a-f]{40}$`, "iu");

/** Whether a workflow of the project calls the core's codeql.yml, so that the host's CodeQL scans it: read from `base`
 *  where one is given, a commit the change cannot edit, else from the work tree; each workflow parsed, and only a
 *  job's `uses:` counted, so no text elsewhere in a workflow counts as a call. */
export function hostScans(root, base = null) {
  const git = (...a) => execFileSync("git", a, { cwd: root, encoding: "utf8", maxBuffer: 1 << 24, stdio: ["ignore", "pipe", "ignore"] });
  const dir = path.join(root, ".github", "workflows");
  let texts;
  try {
    texts = base
      ? git("ls-tree", "-z", "--name-only", `${base}:.github/workflows`).split("\0").filter(n => /\.ya?ml$/u.test(n)).map(n => git("show", `${base}:.github/workflows/${n}`))
      : fs.readdirSync(dir).filter(n => /\.ya?ml$/u.test(n)).map(n => fs.readFileSync(path.join(dir, n), "utf8"));
  } catch { return false; }
  return texts.some(text => {
    let jobs;
    try { jobs = parseYaml(text)?.jobs; } catch { return false; }
    return Object.values(jobs ?? {}).some(j => typeof j?.uses === "string" && CODEQL.test(j.uses));
  });
}

/** The files the scan reads: with a base, those the change adds or alters, a link made a file among them; else every
 *  tracked one; each of a kind it
 *  reads, a plain file inside the project, and none of the core's copy, which the core's own scan reads. */
export function targets(root, base) {
  const git = (...a) => execFileSync("git", a, { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 }).split("\0").filter(Boolean);
  const listed = base ? git("diff", "--name-only", "-z", "--no-renames", "--diff-filter=AMT", base, "HEAD") : git("ls-files", "-z");
  const copy = copyOf(root);
  return listed.filter(f => KINDS.test(f) && !f.startsWith(copy) && !leadsOut(root, path.join(root, f)) && fs.lstatSync(path.join(root, f), { throwIfNoEntry: false })?.isFile());
}

/** The lines the change adds to each file, from git's diff of that file alone with no context, its name taken
 *  literally (no pattern), so that no name git would quote in a diff's header is read, and no other file's lines are
 *  counted as its own: Map(file → Set(line)). */
export function addedLines(root, base, files) {
  const out = new Map();
  for (const file of files) {
    const diff = execFileSync("git", ["--literal-pathspecs", "diff", "-U0", "--no-renames", "--no-color", "--no-ext-diff", base, "HEAD", "--", file], { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 });
    const lines = new Set();
    for (const hunk of diff.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gmu)) {
      for (let n = Number(hunk[1]), i = 0; i < Number(hunk[2] ?? 1); i++) lines.add(n + i);
    }
    out.set(file, lines);
  }
  return out;
}

/** The findings a description lists as false alarms: Set("<path>:<line>"). */
export function falseAlarms(text) {
  const out = new Set();
  for (const m of String(text ?? "").matchAll(/^[ \t]*(?:[-*][ \t]+)?Scan false alarm:[ \t]*`([^`\r\n]+):(\d+)`/gmu)) out.add(`${m[1]}:${m[2]}`);
  return out;
}

/** Runs the engine on the files, a batch at a time: { findings: [{ file, line, rule, message }], errors }, or
 *  { failed } where it did not run. */
export function runEngine(dir, root, files) {
  const bin = path.join(dir, `semgrep-core${exe()}`);
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "code-scan-"));
  const findings = [], errors = [], scanned = new Set();
  try {
    for (let i = 0; i < files.length; i += 200) {
      const r = spawnSync(bin, ["scan", "--experimental", "--metrics=off", "--disable-version-check", "--disable-nosem", "--max-target-bytes=0", "--timeout", "30", "--json", "-q", "--config", RULES, "--", ...files.slice(i, i + 200)],
        { cwd: root, encoding: "utf8", env: engineEnv(home), maxBuffer: 1 << 30, timeout: 900000, argv0: `osemgrep${exe()}` });
      let out;
      try { out = JSON.parse(r.stdout); } catch { return { failed: `the engine gave no answer it could read (exit ${r.status ?? r.signal ?? r.error?.code}): ${logged(String(r.stderr ?? "").trim().split("\n").pop() ?? "")}` }; }
      readAnswer(out, { findings, errors, scanned });
    }
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
  return { findings, errors, scanned };
}

const plain = p => String(p).replace(/\\/gu, "/").replace(/^\.\//u, "");

/** One answer of the engine's, its findings, the files it scanned and its errors added to those given. */
function readAnswer(out, { findings, errors, scanned }) {
  for (const f of out.results ?? []) findings.push({ file: plain(f.path), line: f.start?.line, from: f.start?.offset, to: f.end?.offset, rule: String(f.check_id).split(".").pop(), message: f.extra?.message ?? "" });
  for (const p of out.paths?.scanned ?? []) scanned.add(plain(p));
  for (const e of out.errors ?? []) errors.push({ path: e.path ? plain(e.path) : null, partial: JSON.stringify(e.type ?? "").includes("PartialParsing"), what: String(e.message ?? e.type ?? "an error").split("\n")[0] });
}

/** The files the engine was given and did not read whole: { file, why } for each one it did not scan, and each it
 *  stopped on (a rule's time run out, a file it could not parse at all); a file it parsed in part is read, and said. */
export function unreadOf(files, { scanned, errors }) {
  const out = [];
  for (const file of files) {
    const stopped = errors.find(e => e.path === file && !e.partial);
    if (!scanned.has(file)) out.push({ file, why: "the engine did not scan it" });
    else if (stopped) out.push({ file, why: `the engine stopped on it: ${logged(stopped.what)}` });
  }
  return out;
}

/** The files a description lists as ones the engine cannot read: Set(path). */
export function unreadListed(text) {
  const out = new Set();
  for (const m of String(text ?? "").matchAll(/^[ \t]*(?:[-*][ \t]+)?Scan unread:[ \t]*`([^`\r\n]+)`/gmu)) out.add(m[1]);
  return out;
}

/** A finding's key: its file, its rule and the code the engine matched (its bytes, from its start to its end), its
 *  spaces made one, so that the same finding is known at the base and at the head wherever it moved, and whatever
 *  else changed on its lines. */
function keyOf(root, f, texts) {
  if (!texts.has(f.file)) { try { texts.set(f.file, fs.readFileSync(path.join(root, f.file))); } catch { texts.set(f.file, Buffer.alloc(0)); } }
  const code = texts.get(f.file).subarray(f.from ?? 0, f.to ?? 0).toString("utf8").replace(/\s+/gu, " ").trim();
  return `${f.file}\0${f.rule}\0${code}`;
}

/** The files the change renames, from git's own reading of renames: Map(new path → its path at the base). */
export function renamedFrom(root, base) {
  const out = new Map();
  const parts = execFileSync("git", ["diff", "-z", "--name-status", "-M", "--diff-filter=R", base, "HEAD"], { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 }).split("\0");
  for (let i = 0; i + 2 < parts.length; i += 3) if (/^R\d*$/u.test(parts[i])) out.set(parts[i + 2], parts[i + 1]);
  return out;
}

/** What stood at the base: of the files given that the base held, by their name there where the change renames them,
 *  the engine's findings, each placed under its name at the head, a count for each key; null where the engine could
 *  not read them. Each is read from git's object, never from the work tree. */
function stoodAt(dir, root, base, files) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "code-scan-base-"));
  const was = renamedFrom(root, base);
  try {
    const held = files.filter(f => {
      let bytes;
      try { bytes = execFileSync("git", ["cat-file", "blob", `${base}:${was.get(f) ?? f}`], { cwd: root, maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }); } catch { return false; }
      fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true });
      fs.writeFileSync(path.join(tmp, f), bytes);
      return true;
    });
    const got = held.length ? runEngine(dir, tmp, held) : { findings: [] };
    if (got.failed) return null;
    const counts = new Map(), texts = new Map();
    for (const f of got.findings) { const k = keyOf(tmp, f, texts); counts.set(k, (counts.get(k) ?? 0) + 1); }
    return counts;
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

/** Each finding's verdict: a line to print, or a failure. With a base, a finding stood where the base held one of the
 *  same key, those on lines the change does not add taking them first; any other is the change's own, and fails unless
 *  the description lists it as a false alarm. */
export function verdicts(findings, { root, base, stood, added, explained }) {
  const lines = [], fails = [], texts = new Map(), left = new Map(stood ?? []);
  const isAdded = f => (added.get(f.file)?.has(f.line) ? 1 : 0);
  for (const f of [...findings].sort((a, b) => isAdded(a) - isAdded(b))) {
    const at = `${logged(f.file)}:${f.line}`, what = `${logged(f.message)} (${logged(f.rule)})`, key = keyOf(root, f, texts);
    if (!base) { lines.push(`- reported: ${at}: ${what}, with no base to read a change against`); continue; }
    if ((left.get(key) ?? 0) > 0) { left.set(key, left.get(key) - 1); lines.push(`- reported, not failed: ${at}: ${what}, which stood before this change`); continue; }
    if (explained.has(`${f.file}:${f.line}`)) { lines.push(`- passed: ${at}: ${what}, listed in the description as a false alarm, for the security review to confirm`); continue; }
    fails.push(`FAIL: ${at}: ${what}, which this change brings (the base held no such finding). ${MEND}change the code so that no input reaches it (a fixed command or its arguments as a list, SQL with parameters, a path checked to stay inside its folder, no eval, no BinaryFormatter or pickle on what comes in); or, where it is a false alarm, add to the pull request's description a line "Scan false alarm: \`${at}\`, <why>" for its security review to confirm (floor rule 9)`);
  }
  return { lines, fails };
}

const UNREAD_MEND = at => `${MEND}mend the file so the engine reads it (one past the engine's 30 seconds for a rule, split; one it cannot parse, made valid), or, where it must stay so, add to the pull request's description a line "Scan unread: \`${at}\`, <why>" for its security review to confirm (floor rule 9)`;

/** The lines for what the engine did not read whole: with a base, each file it did not read fails, unless the
 *  description lists it as unread; a listed file it read whole is said, since the listing excuses nothing there; a
 *  listed file held back (`held`), since the engine gave no answer with it, passes, said so; with no base, each is said. */
export function unreadLines(files, got, { base, listed, held }) {
  const out = unreadOf(files, got).map(u => {
    if (!base) return `- not read: ${logged(u.file)}: ${u.why}`;
    if (listed.has(u.file)) return `- passed: ${logged(u.file)}: ${u.why}, listed in the description as one the engine cannot read, for the security review to confirm`;
    return `FAIL: ${logged(u.file)}: ${u.why}, so a weakness in it would pass unseen. ${UNREAD_MEND(logged(u.file))}`;
  });
  const unread = new Set(unreadOf(files, got).map(u => u.file));
  for (const f of listed) {
    if (held.includes(f)) out.push(`- passed: ${logged(f)}: the engine gave no answer with it, and the description lists it as one the engine cannot read, for the security review to confirm`);
    else if (files.includes(f) && !unread.has(f)) out.push(`- listed as unread, but the engine read it whole: ${logged(f)}; the listing excuses nothing there`);
  }
  return [...out, ...got.errors.filter(e => e.partial).map(e => `- read in part: ${logged(e.path ?? "")}: ${logged(e.what)}`)];
}

/** The engine's answer on the files: every one handed to it; where it gives none and the description lists files as
 *  unread, each listed file is tried alone, and only one with which it still gives no answer is held back, the rest run
 *  again together, a listed one it reads judged as any other. { got, held, read }. `run` is the engine's run. */
export function answer(dir, root, files, listed, run = runEngine) {
  const got = run(dir, root, files);
  if (!got.failed || !listed.size) return { got, held: [], read: files };
  const held = files.filter(f => listed.has(f) && run(dir, root, [f]).failed);
  const read = files.filter(f => !held.includes(f));
  return { got: read.length ? run(dir, root, read) : { findings: [], errors: [], scanned: new Set() }, held, read };
}

/** Why the engine is not installed for this change, or null where it is: the host's CodeQL scans the project, or the
 *  change adds or alters no file of the kinds the scan reads. */
export function installNot(root, base = null) {
  if (hostScans(root, base)) return "a workflow calls the core's codeql.yml, so the host's CodeQL scans this project";
  if (base && !targets(root, base).length) return "the change adds or alters no file of the kinds the scan reads";
  return null;
}

// (the engine's file, in the core's .packages/pypi/)
const engine = () => `semgrep/bin/semgrep-core${exe()}`;

/** The folder of the installed engine; null where it could not be installed, the job's install not reaching the
 *  registry or a copy's own install failing, so that the scan did not run, said as a warning, neither failed nor
 *  passed (#654, point 4; #1093, point 1). */
function engineDir() {
  return pypiUnreached(engine()) ? null : path.dirname(pypiFile(engine()));
}

/** The scan: { lines, failed }, each line to print. */
export function scan(root, { base = null, description = "", dir = null } = {}) {
  if (hostScans(root, base)) return { lines: ["code scan: not run: a workflow calls the core's codeql.yml, so the host's CodeQL scans this project"], failed: false };
  const files = targets(root, base);
  if (!files.length) return { lines: [`code scan: no file of the kinds it reads ${base ? "changed" : "tracked"}`], failed: false };
  dir ??= engineDir();
  if (!dir) return { lines: [`::warning::The code scan did not run: ${pypiNotInstalled(engine())}`], failed: false };
  const listed = base ? unreadListed(description) : new Set();
  const { got, held, read } = answer(dir, root, files, listed);
  if (got.failed) return base
    ? { lines: [`FAIL: code scan: ${got.failed}, on the files this change adds or alters. ${UNREAD_MEND("<path>")}, naming the file it stops on (run the scan on each)`], failed: true }
    : { lines: [`code scan: did not run: ${got.failed}; it decides nothing`], failed: false };
  const stoodRead = base ? stoodAt(dir, root, base, read) : null;
  const stood = base ? stoodRead ?? new Map() : null;
  const { lines, fails } = verdicts(got.findings, { root, base, stood, added: base ? addedLines(root, base, read) : new Map(), explained: falseAlarms(description) });
  if (base && !stoodRead) lines.push("- the engine could not read the base's files, so every finding is counted as this change's own");
  const unread = unreadLines(read, got, { base, listed, held });
  const failing = [...fails, ...unread.filter(l => l.startsWith("FAIL"))];
  lines.push(...unread.filter(l => !l.startsWith("FAIL")));
  lines.unshift(`code scan: Semgrep ${VERSION}, the core's rules, ${read.length} file(s) ${base ? "the change adds or alters" : "tracked"}: ${got.findings.length} finding(s), ${failing.length} failing`);
  return { lines: [...lines, ...failing], failed: failing.length > 0 };
}

if (started(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const base = opt("--base") || null;
  if (args.includes("--install")) {
    const why = installNot(process.cwd(), base);
    if (why) console.log(`semgrep ${VERSION}: not installed: ${why}`);
    else process.exitCode = spawnSync(process.execPath, [fileURLToPath(new URL("install.mjs", import.meta.url)), "pypi"], { stdio: "inherit" }).status ?? 1;
  } else {
    const file = opt("--description");
    const description = file ? fs.readFileSync(file, "utf8") : process.env.PR_BODY ?? "";
    const { lines, failed } = scan(process.cwd(), { base, description });
    for (const l of lines) console.log(l);
    process.exitCode = failed ? 1 : 0;
  }
}
