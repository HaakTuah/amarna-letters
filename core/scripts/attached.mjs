// One verdict (#1081): whether a project holds the core whole and wired, read by what already reads each part, each
// through its own script and none written twice: the copy against its pin (copy-tree.mjs, as core.yml compares it), the
// pointers (pointers.mjs), the steps (steps.mjs), the comparison with a fresh start (fresh.mjs), the checks that read
// nothing (read-nothing.mjs, through steps.mjs), the manifest against the modules (manifest-reads.mjs) and, on a sync's
// branch, whether the sync is pure (pure-sync.mjs, run from the core's side as its merger runs it: the release it moves
// to, or the core's main). It prints one line first, `attached: yes`, or `attached: no` with how many things stand in
// the way, then each with its mend; a step only the project's owner can take, and a rule file's wording beside a fresh
// start, are listed apart, advised, standing in the way of nothing; and what it could not read, and the checks that
// read nothing here, it says, counted neither way. It
// reports and fails nothing (AGENTS.md of the core, "Nothing locks a project"), and each part keeps its own check where
// it stands. The sync prints its line at its end (sync.mjs, beside this file). Reads only, and writes nothing in the
// project. Git, tar, gh where pure-sync.mjs asks whose account holds the repository, and
// Node's own modules.
//
//   node core/scripts/attached.mjs                    from a project's root: the line, then what stands in the way
//   node core/scripts/attached.mjs --line             the line alone
//   node core/scripts/attached.mjs --fetched <dir>    with the core already fetched into the bare repository <dir>
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { copyTree } from "./copy-tree.mjs";
import { CORE } from "./core-address.mjs";
import { MANIFEST, readCore } from "./core-path.mjs";
import { differences, fresh, kind } from "./fresh.mjs";
import { projectNotes } from "./manifest-reads.mjs";
import { saidOf } from "./read-nothing.mjs";
import { fetchCore, followsOf, hostSaid, inBare, past, releasesIn, untar } from "./releases.mjs";
import { started } from "./started.mjs";
import { plain } from "./step-checks.mjs";
import { notDone, project } from "./steps.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const git = (root, args, env = process.env, input) => execFileSync("git", args, { cwd: root, env, input, encoding: "utf8", stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"], maxBuffer: 1 << 28 }).trim();
const firstLine = text => String(text ?? "").trim().split("\n").filter(Boolean).at(-1) ?? "it said nothing";

// The copy's entries as they stand in the working folder, as a commit of it would hold them, by path from the copy:
// each tracked or new file not ignored, its blob's id as git would store it (hash-object, which writes nothing, runs
// the same filters a commit does: line endings above all), every file's mode 100644 as copy-tree.mjs says.
function working(root, at) {
  const out = new Map(), files = [];
  const listed = git(root, ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", at.slice(0, -1)]).split("\0").filter(Boolean);
  const staged = new Map(git(root, ["ls-files", "-z", "-s", "--", at.slice(0, -1)]).split("\0").filter(Boolean).map(e => [e.slice(e.indexOf("\t") + 1), e.split(" ")]));
  for (const f of new Set(listed)) {
    let stat;
    try { stat = fs.lstatSync(path.join(root, f)); } catch { continue; } // (a tracked file taken away: missing)
    const key = f.slice(at.length);
    if (stat.isSymbolicLink()) out.set(key, `120000 blob ${git(root, ["hash-object", "--no-filters", "--stdin"], process.env, fs.readlinkSync(path.join(root, f)))}`);
    else if (stat.isFile()) files.push(f);
    else if (staged.get(f)?.[0] === "160000") out.set(key, `160000 commit ${staged.get(f)[1]}`);
  }
  // (a name with a line's end in it cannot be given one to a line: hashed alone)
  const plainNames = files.filter(f => !/[\r\n]/u.test(f));
  const ids = plainNames.length ? git(root, ["hash-object", "--stdin-paths"], process.env, `${plainNames.join("\n")}\n`).split("\n") : [];
  plainNames.forEach((f, i) => out.set(f.slice(at.length), `100644 blob ${ids[i]}`));
  for (const f of files.filter(f => /[\r\n]/u.test(f))) out.set(f.slice(at.length), `100644 blob ${git(root, ["hash-object", "--", f])}`);
  return out;
}

// The core's tree at the pin, as the copy must be (copy-tree.mjs), by the same keys.
const pinned = (pin, bare) => new Map(inBare(bare, ["ls-tree", "-r", "-z", "--full-tree", copyTree(pin, bare)], { maxBuffer: 1 << 26 }).split("\0").filter(Boolean)
  .map(e => [e.slice(e.indexOf("\t") + 1), e.slice(0, e.indexOf("\t")).replace(/^100755 blob /u, "100644 blob ")]));

// The copy against its pin: in the way where the line is wrong, the pin is no commit of the core's main, or the copy
// differs from the core's tree there, entry by entry by git's ids and types as copy-tree.mjs compares (and says why).
function copyAgainstPin(root, bare, why, said) {
  const line = readCore(fs.readFileSync(path.join(root, MANIFEST), "utf8"));
  if (line.wrong) return said.way("the manifest", line.wrong);
  if (line.form === "carried") return said.unread("the copy", `the core is carried by ${line.library}, whose own repository holds it to its pin (core.yml there)`);
  if (!bare) return said.unread("the copy", `the core could not be fetched${why}, so the copy was not compared with it`);
  if (!past(line.pin, "refs/heads/main", bare)) return said.way("the copy", `${MANIFEST} pins ${line.pin}, which is no commit of the core's main. Mend: sync to a commit of it, \`node ${line.path}scripts/sync.mjs\``);
  if (!fs.existsSync(path.join(root, line.path))) return said.way("the copy", `${line.path} is not there. Mend: run the sync from a clone of the core (\`node <the clone>/scripts/sync.mjs\`), which writes the copy whole at the manifest's pin`);
  const want = pinned(line.pin, bare), have = working(root, line.path);
  const off = [...new Set([...want.keys(), ...have.keys()])].filter(f => want.get(f) !== have.get(f)).sort()
    .map(f => `${line.path}${f} ${!have.has(f) ? "is missing" : !want.has(f) ? "is not the core's" : "is changed"}`);
  if (!off.length) return true;
  said.way("the copy", `${line.path} differs from the core at its pin ${line.pin.slice(0, 7)}: ${off.slice(0, 10).join("; ")}${off.length > 10 ? `; and ${off.length - 10} more` : ""}. Mend: take back each change to the copy (\`git checkout HEAD -- ${line.path}\` where the last commit holds it whole), or delete ${line.path} and run the sync from a clone of the core (\`node <the clone>/scripts/sync.mjs\`), which writes it whole at the pin; a change the project needs goes to the core as an issue`);
}

// The pointers, as pointers.mjs reads them in a project: each that fails, and each it lists as leading nowhere. (The
// copy's pointers.mjs runs only where this script is that copy's, or the copy was found whole at its pin: one run from
// a clone never runs a copy that was changed.)
function pointers(root, at, whole, said) {
  const real = f => { try { return fs.realpathSync(f); } catch { return null; } };
  if (!whole && real(HERE) !== real(path.join(root, at, "scripts"))) return said.unread("the pointers", `${at} was not found whole at its pin, and this script is not that copy's, so its pointers.mjs was not run`);
  const r = spawnSync(process.execPath, [path.join(root, at, "scripts", "pointers.mjs")], { cwd: root, env: { ...process.env, POINTERS_BASE: "" }, encoding: "utf8", timeout: 600000, maxBuffer: 1 << 26 });
  const lines = `${r.stdout ?? ""}\n${r.stderr ?? ""}`.split("\n").map(l => l.replace(/^::warning::/u, ""));
  const notRun = lines.find(l => l.startsWith("The pointer check did not run:"));
  if (notRun) return said.unread("the pointers", notRun);
  const fails = lines.filter(l => l.startsWith("FAIL: "));
  if (r.status !== 0 && !fails.length) return said.unread("the pointers", `${at}scripts/pointers.mjs stopped: ${firstLine(r.stderr || r.stdout)}`);
  for (const l of fails) said.way("a pointer", l.slice("FAIL: ".length));
  for (const l of lines.filter(l => /^note a broken pointer in an agent tool's file: |^note .*\(read, and not found: /u.test(l)))
    said.way("a pointer", `${l.slice("note ".length).replace(/ \((the pull request's base held it|with no base to read against)[^)]*\)$/u, "")}. Mend: point it at the file, heading or numbered point that holds what it means, or take it out where that is gone`);
}

// The steps not done (steps.mjs): the owner's advised, one whose check could not read the project not counted; and the
// checks that read nothing here (read-nothing.mjs), said and not counted.
function steps(root, said) {
  const missed = notDone(root);
  for (const m of missed) {
    if (m.owner) said.owner(`${m.lead}: ${m.mend}`);
    else if (m.unread) said.unread(`the step "${m.lead}"`, m.mend);
    else said.way(`the step "${m.lead}"`, m.mend);
  }
  if (missed.unread?.length) said.unread("the steps", `files past what a step reads, which a step may have read as missing: ${missed.unread.join(", ")}`);
  if (missed.nothing === null) said.unread("the checks that read nothing", missed.nothingWhy);
  else for (const l of saidOf(missed.nothing ?? [], missed.copy).filter(l => l.startsWith("- "))) said.nothing(l.slice(2));
}

// The differences from a fresh start (fresh.mjs), each one the manifest does not declare: what wires the core counts.
function freshStart(root, said) {
  const p = project(root), k = kind(p);
  if (k.unread) return said.unread("a fresh start", `not compared, since ${k.unread}`);
  for (const d of differences(p, fresh(p, undefined, { k }))) {
    // (one it could not compare, its packages not installed say, it names so: not read, counted neither way)
    if (/^[^:]*\bnot (compared|read)\b/u.test(d)) said.unread("a fresh start", d);
    // (the wording of a rule file, the manifest or an issue form, its rows and paragraphs, which an earlier kit wrote
    // otherwise and the project keeps as its own: advised, counted neither way; a file, a workflow's or the hooks' line
    // and a config's key wire the core, and count)
    else if (/: (lacks the (row|paragraph) |still holds )/u.test(d) && !/: lacks .*\bthe (line|key) /u.test(d)) said.wording(d);
    else said.way("beside a fresh start", `${d}. Mend: make it as the starter kit writes it, or declare it in ${MANIFEST}'s "Differences", on the owner's word, by a line that quotes the file's path`);
  }
}

// Whether the head is a sync's: a branch whose manifest pins another commit than the project's main does.
function syncBranch(root) {
  const pinAt = rev => { try { return readCore(git(root, ["show", `${rev}:${MANIFEST}`])).pin ?? null; } catch { return null; } };
  const main = ["refs/heads/main", "refs/remotes/origin/main"].find(ref => { try { git(root, ["rev-parse", "--verify", "-q", ref]); return true; } catch { return false; } });
  if (!main) return null;
  const head = pinAt("HEAD"), base = pinAt(main);
  return head && base && head !== base && git(root, ["rev-parse", "HEAD"]) !== git(root, ["rev-parse", main]) ? { pin: head, main } : null;
}

// The commit of the core whose pure-sync.mjs reads the sync moving to `pin`: the release it moves to, where the project
// follows the releases, or the core's main, where it follows main, as pure-sync.mjs's header says; null, said, where
// none may run. (Only what the project's main follows runs: where that cannot be read, or the sync's branch changes it,
// nothing, and a project that follows the releases never runs the core's main, whose newest commit may be no release;
// a commit past the newest release, as a trial syncs to, is said and counted neither way.)
export function sideOf(root, at, bare, { pin, main }, said) {
  const host = hostSaid(() => {}), of = rev => followsOf(git(root, ["show", `${rev}:${MANIFEST}`]), host);
  const follows = of(main);
  if (follows !== null && of("HEAD") !== follows) return said.way("the sync", `it changes what the project follows (${MANIFEST}'s row *follows*), which a sync does not, so pure-sync.mjs was not run. Mend: keep the row as main holds it, and change it in a pull request of its own, on the owner's word`), null;
  if (follows === null) return said.unread("the sync", "whether the project follows the core's main or its releases could not be read (its manifest's row *follows*, or whose account holds it), so pure-sync.mjs was not run"), null;
  if (follows === "main") return inBare(bare, ["rev-parse", "refs/heads/main"]).trim();
  const releases = releasesIn(bare);
  if (releases.some(r => r.sha === pin)) return pin;
  // (a commit of main past the newest release is the one a release's trial syncs to, before it is cut: #1245, point 7)
  if (past(pin, "refs/heads/main", bare) && (!releases.length || past(releases[0].sha, pin, bare))) return said.unread("the sync", `it moves the copy to ${pin.slice(0, 7)}, a commit of the core's main past its newest release, not yet a release: in a release's trial on a copy of a project (the core's AGENTS.md, "Each release is tried on a real project first") nothing is to be done; elsewhere, sync to the newest release, \`node ${at}scripts/sync.mjs\` with no commit named. pure-sync.mjs was not run`), null;
  return said.way("the sync", `it moves the copy to ${pin.slice(0, 7)}, which is no release of the core, and the project follows the releases. Mend: sync to the newest release, \`node ${at}scripts/sync.mjs\` with no commit named`), null;
}

// The core at `side`, unpacked into `dir`, its packages those of the copy where the two lock files are the same, else
// installed by its own install script. (The copy's installed files are the branch's, so what it then finds is a report,
// never floor rule 8's proof, which pure-sync.mjs gives run from the core's own checkout.)
function unpack(root, at, bare, side, dir) {
  fs.mkdirSync(dir);
  untar(dir, inBare(bare, ["archive", side], { encoding: "buffer", maxBuffer: 1 << 28 }));
  for (const install of [".packages", ".packages/parser"]) {
    const lock = f => { try { return fs.readFileSync(path.join(f, install, "package-lock.json"), "utf8"); } catch { return null; } };
    const mine = path.join(root, at, install, "node_modules");
    if (lock(dir) !== null && lock(dir) === lock(path.join(root, at)) && fs.existsSync(mine)) fs.symlinkSync(mine, path.join(dir, install, "node_modules"), "junction");
  }
  if (!fs.existsSync(path.join(dir, ".packages", "node_modules"))) spawnSync(process.execPath, [path.join(dir, "scripts", "install.mjs"), "all"], { encoding: "utf8", timeout: 600000 });
}

// On a sync's branch, pure-sync.mjs from the core's side (sideOf), each line it finds not pure in the way.
function pureSync(root, at, bare, why, tmp, said) {
  const sync = syncBranch(root);
  if (!sync) return;
  if (!bare) return said.unread("the sync", `the core could not be fetched${why}, so pure-sync.mjs was not run from the core's side`);
  const side = sideOf(root, at, bare, sync, said);
  if (!side) return;
  const dir = path.join(tmp, "side");
  unpack(root, at, bare, side, dir);
  const r = spawnSync(process.execPath, [path.join(dir, "scripts", "pure-sync.mjs")], { cwd: root, encoding: "utf8", timeout: 600000, maxBuffer: 1 << 26 });
  if (r.status === 0) return;
  const notPure = String(r.stdout ?? "").split("\n").filter(l => l.startsWith("  NOT PURE ")).map(l => l.slice("  NOT PURE ".length));
  if (!notPure.length) return said.unread("the sync", `pure-sync.mjs from the core's side stopped: ${plain(firstLine(r.stderr || r.stdout), root)}`);
  for (const f of notPure) said.way("the sync", `not pure: ${f}. Mend: take out of the sync's pull request what is not the copy, its pins or what the one process writes, and make it in a pull request of its own`);
}

// Each part read, none stopping another: a part that throws is said not read.
export function attached(root, { fetched = null } = {}) {
  const found = { way: [], owner: [], wording: [], unread: [], nothing: [] };
  const said = {
    way: (part, what) => { found.way.push(`${part}: ${what}`); },
    owner: what => { found.owner.push(what); },
    wording: what => { found.wording.push(what); },
    unread: (part, what) => { found.unread.push(`${part}: ${what}`); },
    nothing: what => { found.nothing.push(what); },
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "core-attached-"));
  try {
    // (one already fetched is read where it stands: nothing here writes to it)
    let bare = fetched ?? path.join(tmp, "core"), why = "";
    if (!fetched) { try { fs.mkdirSync(bare); fetchCore(bare); } catch (e) { bare = null; why = ` (${plain(firstLine(e.stderr || e.message), root)})`; } }
    const at = readCore(fs.readFileSync(path.join(root, MANIFEST), "utf8")).path ?? "core/";
    let whole = false;
    const parts = [["the copy", () => { whole = copyAgainstPin(root, bare, why, said) === true; }], ["the pointers", () => pointers(root, at, whole, said)], ["the steps", () => steps(root, said)],
      ["a fresh start", () => freshStart(root, said)], ["the manifest", () => projectNotes(root, path.join(root, at)).forEach(n => said.way("the manifest", n))],
      ["the sync", () => pureSync(root, at, bare, why, tmp, said)]];
    for (const [part, read] of parts) { try { read(); } catch (e) { said.unread(part, `it could not be read (${plain(firstLine(e.message), root)})`); } }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return found;
}

export function verdict(found) {
  return found.way.length ? `attached: no, ${found.way.length} thing${found.way.length === 1 ? "" : "s"} in the way` : "attached: yes";
}

export function report(found) {
  const list = (head, items) => (items.length ? [head, ...items.map(i => `- ${i}`)] : []);
  return [verdict(found),
    ...list("In the way, each with its mend:", found.way),
    ...list("The owner's to take, advised, in the way of nothing:", found.owner),
    ...list("Wording beside a fresh start, the project's own to bring to the starter kit's or declare, advised, in the way of nothing:", found.wording),
    ...list(`Not read, so counted neither way (${CORE}'s checks that read them say why where they run):`, found.unread),
    ...list("Read nothing here, so the rules they hold are held by nothing here, counted neither way:", found.nothing)].join("\n");
}

if (started(import.meta.url)) {
  const at = process.argv.indexOf("--fetched");
  try {
    const found = attached(process.cwd(), { fetched: at < 0 ? null : path.resolve(process.argv[at + 1]) });
    console.log(process.argv.includes("--line") ? verdict(found) : report(found));
  } catch (e) {
    console.error(`FAIL: whether the core is attached could not be read (${plain(e.message)}). Mend: run it from the project's root, beside ${MANIFEST}, as node ${path.relative(process.cwd(), HERE) || "."}/attached.mjs`);
    process.exitCode = 1;
  }
}
