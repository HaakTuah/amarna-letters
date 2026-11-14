// Tests of the copy of the core's check (.github/workflows/core.yml), its own job run as GitHub runs it for a project
// (workflow-run.mjs, beside this file), so that its shell is tested here before it runs in any project: on a scratch
// project whose copy and calls are as they should be, and on each fault the check names (a default branch of another
// name, a difference from the floor or the review guidelines, a manifest without its one pin or one owner's account, a
// pin off the core's main, a call pinned where its workflow differs or written in another form). The copy's own faults
// (an edit, a file added, a link, a submodule, one whose id is the copy's own tree; the executable bit no difference)
// are pure-sync-test.mjs's, which runs this job on each; a report whose name git quotes is left out here as the copy
// leaves it out, while a top-level name that only ends in a tab and "reports" is kept, as the copy keeps it. A scratch core of two commits on its main and one off it,
// reached through the core's address by a git rewrite, so no call reaches the network. On Linux and on Windows. Git,
// tar, bash and Node's own modules.
//
//   node scripts/core-yml-test.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORE, OWNER } from "./core-address.mjs";
import { checkoutStandIn, scratchEnv } from "./scratch-core.mjs";
import { runWorkflow } from "./workflow-run.mjs";

let failed = 0, count = 0;
const ok = (cond, what, detail = "") => { count++; if (cond) console.log(`ok   ${what}`); else { failed++; console.error(`FAIL ${what}${detail && `\n     ${String(detail).slice(0, 1200).replace(/\n/g, "\n     ")}`}`); } };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "core-yml-test-"));
process.on("exit", () => { try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* (left to the system's own cleaning) */ } });
const slash = p => p.replace(/\\/g, "/");
const theCore = path.join(tmp, "the-core");
const env = scratchEnv(theCore, tmp);
const git = (dir, ...args) => execFileSync("git", args, { cwd: dir, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 }).trim();
const write = (dir, f, text) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), text); };

// the core: A, then B (the core as it stands, its personal-terms workflow changed since A), and a commit off main
fs.cpSync(root, theCore, { recursive: true, filter: src => !["/.git", "/node_modules"].some(x => slash(src).endsWith(x)) });
git(theCore, "init", "-q", "-b", "main");
const terms = fs.readFileSync(path.join(theCore, ".github/workflows/personal-terms.yml"), "utf8");
write(theCore, ".github/workflows/personal-terms.yml", `${terms}# A\n`);
git(theCore, "add", "-A");
git(theCore, "commit", "-q", "-m", "A");
const A = git(theCore, "rev-parse", "HEAD");
write(theCore, ".github/workflows/personal-terms.yml", terms);
git(theCore, "commit", "-q", "-am", "B");
const B = git(theCore, "rev-parse", "HEAD");
const SIDE = git(theCore, "commit-tree", `${B}^{tree}`, "-p", B, "-m", "off main");
// C: a report whose name git quotes (a letter beyond ASCII), in the folder the core keeps to itself
const quoted = `reports/2026-01-01-${String.fromCodePoint(0xf8)}.md`;
write(theCore, quoted, "A report.\n");
git(theCore, "add", "-A");
git(theCore, "commit", "-q", "-m", "C");
const C = git(theCore, "rev-parse", "HEAD");
// D, where a name may hold a tab (not on Windows): a top-level file whose name only ends in a tab and "reports", which
// the copy keeps, as git archive and copy-tree.mjs keep it
const tabbed = process.platform === "win32" ? null : `x\treports`;
if (tabbed) { write(theCore, tabbed, "kept\n"); git(theCore, "add", "-A"); git(theCore, "commit", "-q", "-m", "D"); }
const D = tabbed ? git(theCore, "rev-parse", "HEAD") : null;
const workflow = git(theCore, "show", `${B}:.github/workflows/core.yml`);

const MANIFEST = (pin = B, more = "") => `# Core manifest\n\nCore: ${CORE} at ${pin}, copied whole under core/ (never edited here).\nFloor: whole. Modules: all.\n\n## Slots\n| Slot | Here |\n| --- | --- |\n| *owner's account* | \`${OWNER}\` |\n${more}`;
const CALLS = (terms = B, core = A) => `name: core\non:\n  pull_request:\njobs:\n  core:\n    uses: ${CORE}/.github/workflows/core.yml@${core}\n  terms:\n    uses: ${CORE}/.github/workflows/personal-terms.yml@${terms}\n    secrets: inherit\n`;
let n = 0;
// The check's verdict on a project whose copy is the core at `at` (B unless said), with the files given in place of the
// usual ones.
function check(files = {}, { branch = "main", at = B, without = null } = {}) {
  const dir = path.join(tmp, `project-${++n}`);
  fs.mkdirSync(path.join(dir, "core"), { recursive: true });
  git(dir, "init", "-q", "-b", "main");
  execFileSync("tar", ["-x", "-f", "-", "-C", "core"], { cwd: dir, input: execFileSync("git", ["archive", at], { cwd: theCore, env, maxBuffer: 1 << 28 }) });
  for (const [f, text] of Object.entries({ "core-manifest.md": MANIFEST(), ".github/workflows/core.yml": CALLS(), ...files })) write(dir, f, text);
  if (without) fs.rmSync(path.join(dir, "core", without));
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "a project");
  const github = { event_name: "pull_request", repository: "someone/project", event: { repository: { default_branch: branch, private: false }, pull_request: { base: { sha: "" } } } };
  const [job] = runWorkflow(workflow, { github, base: env, temp: tmp, workspace: () => dir, uses: { "actions/checkout": checkoutStandIn(env, tmp) } });
  return { passed: job.passed, out: job.steps.map(s => s.out).join("") };
}
const passes = (what, ...args) => { const r = check(...args); ok(r.passed, `${what}: passes`, r.out); };
const fails = (what, words, ...args) => { const r = check(...args); ok(!r.passed && r.out.includes(words), `${what}: fails, saying so`, r.out); };

passes("a project whose copy is the core at its pin, each call pinned where its workflow is the same");
fails("a default branch of another name", "The default branch here is trunk", {}, { branch: "trunk" });
fails("a difference from the floor", "names the floor or the review guidelines", { "core-manifest.md": MANIFEST(B, "\n## Differences\n- `core/floor/security.md`, rule 12: main is pushed to here.\n") });
fails("a difference from the review guidelines, under a heading spelt otherwise", "names the floor or the review guidelines", { "core-manifest.md": MANIFEST(B, "\n### DIFFERENCES\n- the Review Guidelines: none here.\n") });
passes("a difference from a module", { "core-manifest.md": MANIFEST(B, "\n## Differences\n- `core/modules/roles.md`, \"The builders\": Codex alone builds here, since no other tool is set up.\n") });
passes("a heading inside a fenced block, and the floor named outside the section", { "core-manifest.md": MANIFEST(B, "\n## Differences\n- `core/modules/roles.md`, \"The builders\": none.\n\n## Notes\nThe floor holds whole.\n\n```\n# Differences\nthe floor\n```\n") });
fails("a manifest without its pin line", "no one \"Core:", { "core-manifest.md": MANIFEST().replace(/^Core: .*\n/m, "") });
fails("a manifest with two", "no one \"Core:", { "core-manifest.md": MANIFEST().replace(/^(Core: .*\n)/m, "$1$1") });
fails("a manifest without the owner's account", "owner's account", { "core-manifest.md": MANIFEST().replace(/^\| \*owner's account\*.*\n/m, "") });
fails("a manifest with the owner's account twice", "owner's account", { "core-manifest.md": MANIFEST().replace(/^(\| \*owner's account\*.*\n)/m, "$1$1") });
fails("an owner's account that is no login", "owner's account", { "core-manifest.md": MANIFEST().replace(`\`${OWNER}\``, "`two words`") });
fails("a pin off the core's main", `the pin ${SIDE} is not a commit of the core's main`, { "core-manifest.md": MANIFEST(SIDE) });
fails("a call pinned where its workflow differs from the core's at the pin", "personal-terms.yml at", { ".github/workflows/core.yml": CALLS(A) });
fails("a call pinned off the core's main", "is not a commit of the core's main", { ".github/workflows/core.yml": CALLS(SIDE) });
fails("a call written in another form", "a call to the core not written", { ".github/workflows/core.yml": CALLS().replace(`core.yml@${A}`, "core.yml@main") });
fails("a call written in other letters, and in another form", "a call to the core not written", { ".github/workflows/core.yml": CALLS().replace(`${CORE}/.github/workflows/core.yml@${A}`, `${CORE.toLowerCase()}/.github/workflows/core.yml@main`) });
fails("a call in a workflow ending .yaml, quoted", `personal-terms.yml: ${SIDE} is not a commit of the core's main`, { ".github/workflows/other.yaml": `on: push\njobs:\n  terms:\n    uses: "${CORE}/.github/workflows/personal-terms.yml@${SIDE}"\n` });
passes("a copy of an older commit of the core's main, each call at it", { "core-manifest.md": MANIFEST(A), ".github/workflows/core.yml": CALLS(A, A) }, { at: A });
fails("a call pinned past the manifest's pin, where its workflow differs from the one at the pin", `personal-terms.yml at ${B} differs`, { "core-manifest.md": MANIFEST(A), ".github/workflows/core.yml": CALLS(B, A) }, { at: A });
passes("a copy of a commit whose report git quotes the name of, the reports left out as the copy leaves them", { "core-manifest.md": MANIFEST(C) }, { at: C });
fails("at that commit, a copy that differs outside the reports", "core/ differs from the core at its pin", { "core-manifest.md": MANIFEST(C), "core/README.md": "edited\n" }, { at: C });
if (D) {
  passes("a copy of a commit with a top-level name that only ends in a tab and \"reports\", which the copy keeps", { "core-manifest.md": MANIFEST(D) }, { at: D });
  fails("and that copy without it", "core/ differs from the core at its pin", { "core-manifest.md": MANIFEST(D) }, { at: D, without: tabbed });
} else console.log("note a name holding a tab cannot be made here (Windows), so that case is not tried");
passes("a call in a comment, which is no call", { ".github/workflows/core.yml": `${CALLS()}# once: ${CORE}/.github/workflows/core.yml@main\n` });

console.log(failed ? `${failed} of ${count} failed` : `ok   ${count} assertions on the copy of the core's check`);
process.exitCode = failed ? 1 : 0;
