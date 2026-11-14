// Tests of copy-tree.mjs, the tree a project's copy of the core must be, and how two copies are compared (the purity
// check of a sync PR rests on it: pure-sync.mjs; core.yml compares the same way). In a scratch repository, against
// what `git archive` itself makes, as sync.mjs makes a copy; on Linux and on Windows. Git, tar and Node's own modules
// only.
//
//   node scripts/copy-tree-test.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { copyTree, coreIsFolder, entries } from "./copy-tree.mjs";

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

// how two copies are compared (core.yml compares the same way): by git's object ids and types, the executable bit aside
const blob = git(core, "hash-object", "-w", "floor/rules.md");
const treeOf = (...lines) => execFileSync("git", ["mktree", "--missing"], { cwd: core, input: lines.map((l) => `${l}\n`).join(""), encoding: "utf8" }).trim();
const plain = treeOf(`100644 blob ${blob}\trun.sh`);
ok(entries(treeOf(`100755 blob ${blob}\trun.sh`), core) === entries(plain, core), "a file the copy records 100644 where the core's is 100755 is the same file: the executable bit is no difference");
ok(entries(treeOf(`120000 blob ${blob}\trun.sh`), core) !== entries(plain, core), "a link in its place is not");
ok(entries(treeOf(`160000 commit ${modes}\trun.sh`), core) !== entries(plain, core), "nor a submodule");
ok(entries(treeOf(`100644 blob ${git(core, "hash-object", "-w", "reports/one.md")}\trun.sh`), core) !== entries(plain, core), "nor a file of other content");
ok(entries(treeOf(`100644 blob ${blob}\trun.sh`, `100644 blob ${blob}\textra.md`), core) !== entries(plain, core), "nor a copy with a file more");
// (a name holding a line's end and what looks like a second entry is one entry, quoted, never two)
const two = treeOf(`100644 blob ${blob}\ta.md`, `100644 blob ${blob}\tb.md`);
const one = execFileSync("git", ["mktree", "-z", "--missing"], { cwd: core, input: `100644 blob ${blob}\ta.md\n100644 blob ${blob}\tb.md\0`, encoding: "utf8" }).trim();
ok(entries(one, core) !== entries(two, core) && entries(one, core).split("\n").length === 1, "a name that reads as two entries is one, quoted as git quotes it", entries(one, core));

// whether core/ is a folder: never a submodule's pointer, even one whose id names a tree
// (built through an index of its own, which takes a submodule's pointer to any id, as a pushed commit can hold one)
const folder = (mode, id) => {
  const env = { ...process.env, GIT_INDEX_FILE: path.join(tmp, `index-${++n}`) };
  execFileSync("git", ["update-index", "--add", "--cacheinfo", `${mode},${id},core`], { cwd: core, env });
  const top = execFileSync("git", ["write-tree", "--missing-ok"], { cwd: core, env, encoding: "utf8" }).trim();
  return coreIsFolder(git(core, "commit-tree", top, "-m", "probe"), core);
};
const inner = treeOf(`100644 blob ${blob}\trun.sh`);
ok(coreIsFolder(git(core, "commit-tree", treeOf(`040000 tree ${inner}\tcore`), "-m", "folder"), core), "core/ as a folder is one");
ok(!folder("160000", inner), "a submodule's pointer named core, whose id is a tree, is none");
ok(!folder("100644", blob) && !folder("120000", blob), "nor a file or a link named core");
ok(!coreIsFolder(git(core, "commit-tree", plain, "-m", "none"), core), "nor a commit with no core at all");

console.log(failed ? `${failed} of ${count} failed` : `all ${count} passed`);
process.exit(failed ? 1 : 0);
