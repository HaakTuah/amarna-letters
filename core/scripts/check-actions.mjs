// The actions check.mjs stands in for, as a step of a workflow it runs from plain git uses them (tasks/hosts.md, "One
// layer knows no host"): actions/checkout, the job's own checkout being its scratch clone and the core fetched from its
// address, and actions/setup-node, which installs nothing, the steps running under the machine's own Node, and says so
// where the step asks another (#1245, points 4 and 5). Any other action is the host's own, not run and said so. Git and
// Node's own modules.
import fs from "node:fs";
import path from "node:path";
import { CORE } from "./core-address.mjs";

// The handlers for workflow-run.mjs's `uses`, by action: `git(cwd, ...args)` runs git, `say(text)` prints a line, and
// `tmp` is the check's scratch folder.
export function standIns({ git, say, tmp }) {
  return new Proxy({ "actions/checkout": checkout(git, tmp), "actions/setup-node": setupNode(say) }, { get: (known, action) => known[action] ?? (() => false) });
}

// The commit a ref names in a job's clone, as actions/checkout reads it: a full commit's id, or a ref written whole
// (refs/…, fetched from the clone's origin, which holds the change's branches and its pull request's refs), as it is;
// any other name a branch of the origin.
function commitOf(git, ws, ref) {
  if (/^[0-9a-f]{40}$/iu.test(ref)) return ref;
  if (ref.startsWith("refs/")) { git(ws, "fetch", "-q", "origin", ref); return git(ws, "rev-parse", "FETCH_HEAD"); }
  return git(ws, "rev-parse", `origin/${ref}`);
}

// The stand-in for actions/checkout: the job's own checkout is the scratch clone; the core is fetched from its address.
function checkout(git, tmp) {
  return (w, ws) => {
    if (!w.repository) { if (w.ref) git(ws, "checkout", "-q", "--detach", commitOf(git, ws, w.ref)); return; }
    if (w.repository.toLowerCase() !== CORE.toLowerCase()) throw new Error(`a checkout of another repository than the core: ${w.repository}`);
    const to = path.resolve(ws, w.path || ".");
    if (to === ws || !to.startsWith(ws + path.sep)) throw new Error(`a checkout into ${w.path || "."}, which is not a folder inside the job's own`);
    git(tmp, "clone", "-q", "--no-checkout", `https://github.com/${CORE}`, to);
    git(to, "checkout", "-q", "--detach", w.ref || "main");
  };
}

// The Node a setup-node step asks, as it names it (`node-version`, or the file `node-version-file` names in the job's
// folder), without a leading "v": "" where it names none, or its file cannot be read.
function asked(w, ws) {
  if (w["node-version"]) return String(w["node-version"]).trim().replace(/^v/u, "");
  if (!w["node-version-file"]) return "";
  try { return fs.readFileSync(path.join(ws, w["node-version-file"]), "utf8").trim().split(/\s/u)[0].replace(/^v/u, ""); } catch { return ""; }
}

// Whether the machine's Node, `have` (its version without "v"), is the one `want` names: each part it names the same
// (22, 22.x and 22.11.0 name parts), "*" or "x" any; null where `want` is no version (lts/*, latest), which this cannot tell.
export function sameNode(want, have) {
  const parts = want.split(".");
  if (!parts.every(p => /^(\d+|x|\*)$/u.test(p))) return null;
  const mine = have.split(".");
  return parts.every((p, i) => p === "x" || p === "*" || p === mine[i]);
}

// The stand-in for actions/setup-node: it installs nothing, so where the step asks a Node other than the machine's, it
// says once, before that job's verdict, that a verdict may differ for that alone.
function setupNode(say) {
  const told = new Set();
  return (w, ws) => {
    const want = asked(w, ws), have = process.versions.node;
    if (!want || told.has(want)) return;
    told.add(want);
    const same = sameNode(want, have);
    if (same === false) say(`note a step asks Node ${want} (actions/setup-node), and this machine runs Node ${have}, under which its steps run here: a verdict may differ from the host's for that alone`);
    if (same === null) say(`note a step asks Node ${want} (actions/setup-node), which this check cannot match against this machine's Node ${have}, under which its steps run here: a verdict may differ from the host's for that alone`);
  };
}
