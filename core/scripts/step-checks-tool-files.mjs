// What the step of the agent tools' files reads: whether what the copies and pointer checks hold against there is
// listed (steps.mjs, beside this file, holds the steps, and step-checks.mjs the words they share). Each piece takes
// the project as steps.mjs's `project` reads it and returns the mend, or null where the step is done; a step names the
// ones it needs, none runs by itself. It reads only. Node's own modules and git only.
import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { leadsOut } from "./guards.mjs";
import { READ_MOST } from "./own-files.mjs";
import { FOLDERS, TOOL_FILES, ruleFiles } from "./rule-files.mjs";
import { Unread, copyAt } from "./workflow-calls.mjs";
import { copiesConfig } from "./check-configs.mjs";
import { shown } from "./step-checks.mjs";

// Whether what the copies and pointer checks hold against in an agent tool's files is listed (#405; AGENTS.md of the
// core, "Nothing locks a project": no old breach goes unlisted): each copy there in the copies check's baseline, which
// `--tools` writes, and each broken pointer there named here, at every sync, until it is gone, as the workflow check's
// old keys are. Each read from the project's own copy of its check, run with no base, where it notes every one it
// holds and fails none; null where nothing is left to list.
// Both checks read only the files git tracks, as the work tree holds them (a tracked link, what it leads to), and the
// copies check its config and baseline besides: where none of the files they read changed since the last reading in
// this process, that reading's answer stands, so the two runs are made once for each state of the project (a sync reads
// it once; a test, many times). A tracked file the checks do not read is in the state by its name and mode alone, so a change to
// a workflow, a config of another check or a file of the project's code that neither check reads asks no new run.
const listedBefore = new Map();

export function toolFilesListed(p) {
  const { config, key } = toolFilesState(p);
  if (!listedBefore.has(key)) listedBefore.set(key, toolFilesRead(p, config));
  return listedBefore.get(key);
}

// The project's state as the two checks read it: its copies config and a digest of the state, the cache's key.
export function toolFilesState(p) {
  const config = copiesConfig(p);
  if (!p.safe(config)) throw new Unread(`the copies check's config \`${shown(config)}\` is no regular file of the project's own of at most ${READ_MOST} bytes`);
  const git = args => execFileSync("git", args, { cwd: p.root, encoding: "utf8", maxBuffer: 1 << 28 });
  let baseline = null;
  try { baseline = JSON.parse(p.read(config) ?? "")?.baseline; } catch { /* (its own run says what of the config it cannot read) */ }
  const entries = git(["ls-files", "-s", "-z"]).split("\0").filter(Boolean), at = e => e.slice(e.indexOf("\t") + 1);
  const read = filesRead(p, config, entries.map(at), git);
  // (a plain file the checks do not read counts by its name and mode alone; a link, a submodule, and a file they may read, by what it holds)
  const state = crypto.createHash("sha256").update(entries.map(e => !read || read.has(at(e)) || !/^100(644|755) /.test(e) ? e : `${e.slice(0, 6)}\t${at(e)}`).join("\0"));
  const linked = new Set(entries.filter(e => e.startsWith("160000 ")).map(at)); // (a submodule's own changes, as the key held them before)
  const changed = git(["ls-files", "-m", "-z"]).split("\0").filter(f => f && (!read || read.has(f) || linked.has(f)));
  for (const f of [...changed, config, typeof baseline === "string" ? baseline : null]) if (f) state.update(`\0${f}\0${p.read(f) ?? ""}`);
  for (const f of entries.filter(e => e.startsWith("120000 ")).map(at)) state.update(`\0${f}\0${leadsTo(p, f)}`);
  return { config, key: `${p.root}\0${state.digest("hex")}` };
}

// What a tracked link leads to, a file git does not track among them, as the checks read it through the link: only where
// they would, a regular file of at most READ_MOST bytes inside the project; anything else, a device, a pipe, a folder or
// a file outside, is never opened, and counts as nothing.
function leadsTo(p, f) {
  const to = path.join(p.root, f);
  try { if (!leadsOut(p.root, to)) { const stat = fs.statSync(to); if (stat.isFile() && stat.size <= READ_MOST) return fs.readFileSync(to, "utf8"); } } catch { /* (a link to nothing) */ }
  return "";
}

// The tracked files the two checks can read, as a set of paths; null where that cannot be told, which counts every file as read.
// The copies check reads the files the config's "code" and "prose" name, the project's rule files and its agent tools'
// files (rule-files.mjs; the rule files are pathspecs where SECURITY.md writes a glob), the config and its baseline; the
// pointer check each rule file and each Markdown file a pointer in one leads to, the names of every file tracked, and,
// through core-path.mjs, the manifest; both run the copy of the core's own scripts, and git reads .gitattributes and .gitmodules.
function filesRead(p, config, tracked, git) {
  try {
    const parsed = JSON.parse(p.read(config) ?? ""), names = v => (Array.isArray(v) ? v.filter(x => typeof x === "string" && x) : []);
    // (each list as copies.mjs lists it, by itself: a ":!" leaves out only what its own list read)
    const ls = specs => (specs.length ? git(["ls-files", "-z", "--", ...specs]).split("\0") : []);
    const rules = ruleFiles(p.read, dir => tracked.filter(f => (f === dir || f.startsWith(`${dir}/`)) && !leadsOut(p.root, path.join(p.root, f))), { tools: true });
    const tools = tracked.filter(f => TOOL_FILES.includes(f) || FOLDERS.some(dir => f === dir || f.startsWith(`${dir}/`)));
    const named = new Set([config, parsed.baseline, ...rules, ...tools, ...ls(names(parsed.code)), ...ls([...names(parsed.prose), ...(parsed.proseFromSecurity === true ? rules : [])])]);
    return new Set(tracked.filter(f => named.has(f) || f.startsWith(copyAt(p)) || /\.md$/iu.test(f) || /(^|\/)(core-manifest\.md|\.gitattributes|\.gitmodules)$/u.test(f)));
  } catch { return null; }
}

export function toolFilesRead(p, config) {
  const run = (script, args, env) => {
    const at = path.join(p.root, copyAt(p), "scripts", script);
    if (!fs.existsSync(at)) throw new Unread(`no copy of ${script} to run`);
    const r = spawnSync(process.execPath, [at, ...args], { cwd: p.root, encoding: "utf8", maxBuffer: 1 << 28, env: { ...process.env, ...env } });
    return { status: r.status, out: `${r.stdout}`, err: `${r.stderr}`, error: r.error };
  };
  // (a run that never reached its verdict read nothing: reported as not read, never as done)
  const copies = run("copies.mjs", [config], { COPIES_BASE: "" });
  if (copies.error || !(/^ok {3}no new copies/m.test(copies.out) || /^FAIL: (a new copy|.* lists \d+ windows that are gone)/m.test(copies.err))) throw new Unread(`the copies check did not run to its verdict on ${shown(config)}`);
  const pointers = run("pointers.mjs", [], { POINTERS_BASE: "" });
  if (pointers.error || !(/^ok {3}\d+ pointers/m.test(pointers.out) || /^FAIL: a broken pointer: /m.test(pointers.err))) throw new Unread("the pointer check did not run to its verdict");
  const asks = [];
  if (/^note an old copy in an agent tool's file, not yet in the baseline: /m.test(copies.out)) asks.push(`run \`node core/scripts/copies.mjs ${shown(config)} --tools\`, which lists in the copies check's baseline each copy an agent tool's files held before the check read them, and commit the baseline`);
  const broken = [...pointers.out.matchAll(/^note a broken pointer in an agent tool's file: (.*?) \(with no base to read against/gm)].map(m => shown(m[1]));
  if (broken.length) asks.push(`point each pointer in an agent tool's file that leads nowhere at the file, heading or numbered point that holds what it means, or take it out where that is gone: ${broken.join("; ")}`);
  return asks.length ? `In a pull request of its own, ${asks.join("; and, in another, ")}. Until then what the pull request's base held there is noted, never failed.` : null;
}
