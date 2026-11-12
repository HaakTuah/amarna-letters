// Tests of copy-tree.mjs, the tree a project's copy of the core must be (the purity check of a sync PR rests on it:
// pure-sync.mjs). In a scratch repository, against what `git archive` itself makes, as sync.mjs makes a copy; on Linux
// and on Windows. Git, tar and Node's own modules only.
//
//   node scripts/copy-tree-test.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { copyTree } from "./copy-tree.mjs";

let failed = 0, count = 0;
const ok = (cond, what, detail = "") => { count++; if (cond) console.log(`ok   ${what}`); else { failed++; console.error(`FAIL ${what}${detail && `\n     ${detail}`}`); } };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "copy-tree-test-"));
process.on("exit", () => fs.rmSync(tmp, { recursive: true, force: true }));
// (git's own variables that point at a repository are left out, so every call lands in the scratch one)
const outer = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^GIT_(DIR|WORK_TREE|INDEX_FILE|OBJECT_DIRECTORY|COMMON_DIR)$/i.test(name)));
// (copy-tree.mjs calls git with this process's own variables, so they are set here, not handed to each call)
for (const name of Object.keys(process.env)) if (!(name in outer)) delete process.env[name];
Object.assign(process.env, { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.invalid", GIT_CONFIG_GLOBAL: path.join(tmp, "none"), GIT_CONFIG_NOSYSTEM: "1" });
const git = (dir, ...args) => execFileSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const core = path.join(tmp, "core");
const write = (file, text) => { fs.mkdirSync(path.dirname(path.join(core, file)), { recursive: true }); fs.writeFileSync(path.join(core, file), text); };
// a commit of the scratch core whose .gitattributes is `attributes`
let n = 0;
const commit = (attributes) => {
  write(".gitattributes", attributes);
  git(core, "add", "-A");
  git(core, "commit", "-q", "-m", `commit ${++n}`);
  return git(core, "rev-parse", "HEAD");
};
// the tree of the copy `git archive` makes of a commit, as the sync script makes it
const archived = (pin) => {
  const out = fs.mkdtempSync(path.join(tmp, "copy-"));
  git(out, "init", "-q");
  // ("-f -": Windows' own tar reads a tape drive unless told to read its input)
  execFileSync("tar", ["-x", "-f", "-"], { cwd: out, input: execFileSync("git", ["archive", pin], { cwd: core, maxBuffer: 1 << 26 }) });
  git(out, "add", "-A");
  return git(out, "write-tree");
};
const whole = (pin) => git(core, "rev-parse", `${pin}^{tree}`);
const paths = (tree) => git(core, "ls-tree", "-r", "--name-only", tree).split("\n");

git(tmp, "init", "-q", "-b", "main", core);
write("floor/rules.md", "rules\n");
write("floor/reports/nested.md", "a folder of that name deeper down stays\n");
write("reportsx/near.md", "a name that only starts the same stays\n");
write("reports/one.md", "the core's own\n");
write("reports/deep/two.md", "the core's own\n");

const before = commit("* -text\n");
ok(copyTree(before, core) === whole(before), "a pin from before the line: the whole tree");
ok(archived(before) === whole(before), "  and that is what git archive copies");

const pin = commit("* -text\n/reports export-ignore\n");
const tree = copyTree(pin, core);
ok(tree === archived(pin), "a pin with the line: exactly the tree git archive copies", `${tree} against ${archived(pin)}`);
ok(tree !== whole(pin), "  which is not the whole tree");
ok(!paths(tree).some((p) => p.startsWith("reports/")), "  the folder at the top is out");
ok(["floor/reports/nested.md", "reportsx/near.md", ".gitattributes"].every((p) => paths(tree).includes(p)), "  a folder of that name deeper down, a name that starts the same and .gitattributes stay");

// any other spelling of the line: the whole tree, so only a copy that still holds the folder can equal it
for (const [what, attributes] of [
  ["two spaces", "/reports  export-ignore\n"],
  ["a tab", "/reports\texport-ignore\n"],
  ["a space before it", " /reports export-ignore\n"],
  ["a space after it", "/reports export-ignore \n"],
  ["another attribute beside it", "/reports export-ignore -text\n"],
  ["no leading slash", "reports export-ignore\n"],
  ["a trailing slash", "/reports/ export-ignore\n"],
  ["another folder", "/floor export-ignore\n"],
  ["a Windows line ending", "/reports export-ignore\r\n"],
]) {
  const other = commit(`* -text\n${attributes}`);
  ok(copyTree(other, core) === whole(other), `the line with ${what}: the whole tree`);
}

// modes and kinds of entry come through as they are: an executable file and a link, written to the index alone
git(core, "update-index", "--add", "--cacheinfo", `100755,${git(core, "hash-object", "-w", "floor/rules.md")},scripts/run.sh`);
git(core, "update-index", "--add", "--cacheinfo", `120000,${git(core, "hash-object", "-w", "floor/rules.md")},link`);
write(".gitattributes", "* -text\n/reports export-ignore\n");
git(core, "add", ".gitattributes");
git(core, "commit", "-q", "-m", "modes");
const modes = git(core, "rev-parse", "HEAD");
const listed = (rev) => git(core, "ls-tree", "-r", rev).split("\n");
ok(JSON.stringify(listed(copyTree(modes, core))) === JSON.stringify(listed(modes).filter((line) => !line.split("\t")[1].startsWith("reports/"))),
  "an executable file and a link keep their modes; every entry but the folder's is the pin's own");

console.log(failed ? `${failed} of ${count} failed` : `all ${count} passed`);
process.exit(failed ? 1 : 0);
