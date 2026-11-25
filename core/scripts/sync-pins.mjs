// The pins a sync moves before the steps' writers run (sync.mjs, beside this file): the manifest's `Core:` line and the
// commit of each call to one of the core's workflows, the only ones pure-sync.mjs lets a sync move. A file changed in
// those alone is let through to the writers (step-writers.mjs, `held`; #1094 for the manifest, #1248, point 4 for a
// workflow), and its pins, read before the writers' writes are set aside (steps.mjs, `setAside`), are put back after,
// so the sync's own move stays in its pull request. Node's own modules and git only.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CORE_SOURCE as A } from "./core-address.mjs";
import { readCore } from "./core-path.mjs";
import { WORKFLOW } from "./power.mjs";

export const MANIFEST = "core-manifest.md";
// (the manifest's first `Core:` line alone, as pure-sync.mjs reads its pin; each call to the core's workflows)
const PIN_LINE = /^Core: .*$/mu;
// (any case, as GitHub reads a call's address, and as pure-sync.mjs reads it)
const CALL = new RegExp(`(?<![\\w./-])(${A}\\/\\.github\\/workflows\\/[\\w.-]+@)([0-9a-f]{40})(?![\\w./-])`, "giu");
// The form of the pins `f` may hold, or null where a sync moves none in it.
const pinsIn = f => f === MANIFEST ? PIN_LINE : WORKFLOW.test(f) ? CALL : null;
const lf = t => t.replace(/\r\n/gu, "\n"), all = (t, re) => re.global ? [...t.matchAll(re)] : [re.exec(t)].filter(Boolean);

// Whether `f`, in the project at `root`, differs from its last commit, in the index and in the tree, in its pins alone
// (line ends read as one, as git with core.autocrlf writes a tree the blob holds with LF alone).
export function pinsOnly(root, f) {
  const re = pinsIn(f);
  if (!re) return false;
  const at = rev => { try { return execFileSync("git", ["show", `${rev}:${f}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch { return null; } };
  let tree = null;
  try { tree = fs.readFileSync(path.join(root, f), "utf8"); } catch { /* gone or no file: not its pins alone */ }
  const head = at("HEAD"), but = t => lf(t).replace(re, (m, call) => f === MANIFEST ? "" : call);
  return head !== null && [at(""), tree].every(t => t !== null && but(t) === but(head));
}

// The pins of each of `files` that holds any, as they stand in the tree of the project at `root`: { file: [pin, …] }.
export function pinsOf(root, files) {
  const out = {};
  for (const f of files) {
    const re = pinsIn(f), at = path.join(root, f);
    if (re && fs.existsSync(at)) out[f] = all(fs.readFileSync(at, "utf8"), re).map(m => m[0]);
  }
  return out;
}

// Each file's pins put back where `pinsOf` read them, in their order, once its writes were set aside; a file whose
// count of pins changed meanwhile is left as it stands, since which pin is which can no longer be told, and returned.
export function pinsBack(root, pins) {
  const left = [];
  for (const [f, list] of Object.entries(pins)) {
    const at = path.join(root, f);
    if (!fs.existsSync(at)) continue;
    const text = fs.readFileSync(at, "utf8");
    if (all(text, pinsIn(f)).length !== list.length) { left.push(f); continue; }
    let i = 0;
    const next = text.replace(pinsIn(f), () => list[i++]);
    if (next !== text) fs.writeFileSync(at, next);
  }
  return left;
}

// The stash a run of the writers at a sync sets its writes aside in (steps.mjs, `setAside`), named ASIDE, the pin the
// manifest names and the time, so that a sync run again, at the same pin too, leaves stashes whose names differ, and its
// report says which to pop (#1264, point 1).
export const ASIDE = "the steps' writes (#1091)";
export const asideName = (root, at = new Date()) => {
  let pin = null;
  try { pin = readCore(fs.readFileSync(path.join(root, MANIFEST), "utf8")).pin ?? null; } catch { /* (no manifest to read: the time alone) */ }
  return `${ASIDE}${pin ? ` at ${pin.slice(0, 7)}` : ""}, ${at.toISOString()}`;
};
export const stashed = (root, files, name) => () => execFileSync("git", ["--literal-pathspecs", "stash", "push", "--include-untracked", "--quiet", "-m", name, "--", ...files], { cwd: root, stdio: ["ignore", "ignore", "pipe"] });
