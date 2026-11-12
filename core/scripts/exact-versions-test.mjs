#!/usr/bin/env node
// Tests of exact-versions.mjs: each case a made-up project in memory (a lock file and its package lists), never a real
// one. Run: node scripts/exact-versions-test.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { check } from "./exact-versions.mjs";

let failed = 0;
const reader = (files) => (p) => { if (!Object.hasOwn(files, p)) throw new Error(`no such file: ${p}`); return files[p]; };
const project = (lists, packages, at = "") => {
  const files = { [`${at}package-lock.json`]: JSON.stringify({ lockfileVersion: 3, packages }) };
  for (const [folder, list] of Object.entries(lists)) files[`${at}${folder}package.json`] = JSON.stringify(list);
  return check(`${at}package-lock.json`, reader(files));
};
function expect(name, problems, wanted) {
  const ok = wanted === 0 ? problems.length === 0 : problems.length === wanted.length && wanted.every((w, i) => problems[i].includes(w));
  if (!ok) { failed++; console.error(`FAIL ${name}: ${JSON.stringify(problems)}`); }
}
const one = (spec, version = "1.2.3", extra = {}) => project({ "": { dependencies: { a: spec } } }, { "": { dependencies: { a: spec } }, "node_modules/a": { version, ...extra } });

expect("an exact version passes", one("1.2.3"), 0);
expect("a pre-release and a build after it pass", one("1.2.3-rc.1+build.5", "1.2.3-rc.1+build.5"), 0);
expect("a caret range fails", one("^1.2.3"), ['"a": "^1.2.3" is not one exact version']);
expect("a tilde range fails", one("~1.2.3"), ["is not one exact version"]);
expect("a star fails", one("*"), ["is not one exact version"]);
expect("a tag fails", one("latest"), ["is not one exact version"]);
expect("a text shaped like a version that npm reads as a tag fails", one("1.2.3-rc..1", "2.0.0"), ["is not one exact version"]);
expect("a version with a v before it fails", one("v1.2.3"), ["is not one exact version"]);
expect("a version with an equals sign fails", one("=1.2.3"), ["is not one exact version"]);
expect("a version with a space fails", one(" 1.2.3"), ["is not one exact version"]);
expect("a version of two numbers fails", one("1.2", "1.2.0"), ["is not one exact version"]);
expect("a number with a nought before it fails", one("1.02.3", "1.2.3"), ["is not one exact version"]);
expect("a number too large for npm to read as one fails though the lock file says the same", one("9007199254740992.0.0", "9007199254740992.0.0"), ["is not one exact version"]);
expect("a version that ends as a packed file's name does fails, as npm reads it as a file", one("1.2.3+a.tgz", "1.2.3+a.tgz"), ["is not one exact version"]);
expect("so does one that ends so in its pre-release, in capitals", one("1.2.3-a.TAR.GZ", "1.2.3-a.TAR.GZ"), ["is not one exact version"]);
expect("and one with any letter between its tar and its gz", one("1.2.3+a.tar-gz", "1.2.3+a.tar-gz"), ["is not one exact version"]);
expect("a number of fifteen digits passes", one("1.999999999999999.0", "1.999999999999999.0"), 0);
expect("a version longer than any real one fails", one(`1.2.3-${"a".repeat(300)}`, `1.2.3-${"a".repeat(300)}`), ["is not one exact version"]);
expect("an alias fails", one("npm:b@1.2.3"), ["is not one exact version"]);
expect("a git address fails", one("git+https://example.invalid/a.git#abc#def"), ["is not one exact version"]);
expect("a web address fails", one("https://example.invalid/a-1.2.3.tgz"), ["is not one exact version"]);
expect("a path fails", one("file:../a"), ["is not one exact version"]);
expect("a version that is no text fails", project({ "": { dependencies: { a: 1 } } }, { "": {}, "node_modules/a": { version: "1" } }), ["is not one exact version"]);
// A lock file edited by hand so that its entry says what the list says: the first test does not ask the lock file.
expect("a range fails though the lock file is made to say the same", one("^1.2.3", "^1.2.3"), ["is not one exact version"]);
expect("a tag fails though the lock file is made to say the same", one("latest", "latest"), ["is not one exact version"]);
expect("a star fails though the lock file is made to say the same", one("*", "*"), ["is not one exact version"]);
expect("a link to a folder outside the project's own packages fails", one("*", "1.2.3", { link: true, resolved: "../elsewhere" }), ["is not one exact version"]);
expect("a link to a folder above the project fails though the lock file lists it", project({ "": { dependencies: { a: "*" } } }, { "": {}, "node_modules/a": { link: true, resolved: "../up" }, "../up": {} }), ["is not one exact version", "no folder of the project's"]);
expect("a package whose folder is written the way another system writes one fails", project({ "": {} }, { "": {}, "..\\up": {}, "C:/up": {} }), ["no folder of the project's", "no folder of the project's"]);
expect("a package whose folder starts at the disk's root fails", project({ "": {} }, { "": {}, "/etc": {} }), ["no folder of the project's"]);
expect("another exact version than the lock file's fails", one("1.2.4"), ['is not the version the lock file installs ("1.2.3")']);
expect("a lock file entry that is nothing fails", project({ "": { dependencies: { a: "1.2.3" } } }, { "": {}, "node_modules/a": null }), ["is not the version the lock file installs"]);
expect("a lock file entry that is a text fails", project({ "": { dependencies: { a: "1.2.3" } } }, { "": {}, "node_modules/a": "1.2.3" }), ["is not the version the lock file installs"]);
expect("a dependency the lock file lacks fails", project({ "": { devDependencies: { a: "1.2.3" } } }, { "": {} }), ['"a": "1.2.3" is not in package-lock.json']);
expect("an optional dependency the lock file lacks passes at one exact version", project({ "": { optionalDependencies: { a: "1.2.3" } } }, { "": {} }), 0);
expect("a peer dependency the lock file lacks fails at a range", project({ "": { peerDependencies: { a: "^1.2.3" } } }, { "": {} }), ["is not one exact version"]);
expect("an optional dependency at a range fails where the lock file has it", project({ "": { optionalDependencies: { a: "^1.2.3" } } }, { "": {}, "node_modules/a": { version: "1.2.3" } }), ["is not one exact version"]);
expect("every kind is read", project({ "": { dependencies: { a: "^1" }, devDependencies: { b: "^1" }, optionalDependencies: { c: "^1" }, peerDependencies: { d: "^1" } } },
  { "": {}, "node_modules/a": { version: "1.0.0" }, "node_modules/b": { version: "1.0.0" }, "node_modules/c": { version: "1.0.0" }, "node_modules/d": { version: "1.0.0" } }), ['"a"', '"b"', '"c"', '"d"']);
expect("a list that is no list fails", project({ "": { dependencies: ["a"] } }, { "": {} }), ['"dependencies" is no list']);
const printed = project({ "": { dependencies: { "a\n::error::x": "^1\n::error::y" } } }, { "": {} });
expect("a name and a version are printed on one line", printed, ["is not one exact version"]);
if (printed.some((line) => line.includes("\n"))) { failed++; console.error("FAIL a name with a line break in it breaks the line it is printed on"); }

// The root's overrides.
const overridden = (overrides) => project({ "": { dependencies: { a: "1.2.3" }, overrides } }, { "": {}, "node_modules/a": { version: "1.2.3" } });
expect("an override at one exact version passes", overridden({ b: "2.0.0" }), 0);
expect("an override that points to a dependency of the root's passes", overridden({ b: "$a" }), 0);
expect("an override that points to nothing the root lists fails", overridden({ b: "$c" }), ['overrides "b": "$c" is not one exact version']);
expect("an override that points to a name the root lists twice, once at a star, fails", project({ "": { dependencies: { "@own/w": "*" }, devDependencies: { "@own/w": "1.0.0" }, overrides: { b: "$@own/w" } }, "src/w/": {} },
  { "": {}, "src/w": {}, "node_modules/@own/w": { link: true, resolved: "src/w" } }), ['overrides "b": "$@own/w" is not one exact version']);
expect("an override that points to a workspace asked for by a star fails", project({ "": { dependencies: { "@own/w": "*" }, overrides: { b: "$@own/w" } }, "src/w/": {} },
  { "": {}, "src/w": {}, "node_modules/@own/w": { link: true, resolved: "src/w" } }), ['overrides "b": "$@own/w" is not one exact version']);
expect("an override with a number too large for npm to read as one fails", overridden({ b: "9007199254740992.0.0" }), ['overrides "b": "9007199254740992.0.0" is not one exact version']);
expect("an override at a range fails", overridden({ b: "^2.0.0" }), ['overrides "b": "^2.0.0" is not one exact version']);
expect("an override inside another is read", overridden({ "b@1": { ".": "2.0.0", c: "latest" } }), ['overrides "b@1 > c": "latest" is not one exact version']);
expect("a key that picks among versions, its value left unsaid, fails: npm would take the pick as the value", overridden({ "b@^1": {} }), ['overrides "b@^1": a key that picks among versions needs its value said']);
expect("so does one with a scope before its name", overridden({ "@s/b@^1": { c: "2.0.0" } }), ['overrides "@s/b@^1": a key that picks']);
expect("a key that picks among versions passes with its value said as a text", overridden({ "b@^1": "2.0.0", "@s/b@1.x": "3.0.0" }), 0);
expect("and with its value said as the dot of its list", overridden({ "b@^1": { ".": "2.0.0", c: "4.0.0" } }), 0);
expect("a key with a scope and no pick needs no value", overridden({ "@s/b": { c: "4.0.0" } }), 0);
expect("a dot that holds a list fails", overridden({ b: { ".": { c: "1.0.0" } } }), ['overrides "b > .": {"c":"1.0.0"} is not one exact version']);
expect("an empty value fails", overridden({ b: "" }), ['overrides "b": "" is not one exact version']);
expect("an override that is no text and no list fails", overridden({ b: 2 }), ['overrides "b": 2 is not one exact version']);
expect("overrides in a workspace, which npm does not read, are not held", project({ "": {}, "src/web/": { overrides: { b: "^2" } } }, { "": {}, "src/web": {} }), 0);

// Workspaces: the root and two of its own packages, one of which asks for the other and for its own copy of a package.
const workspaces = (webAsks, webCopy) => project(
  { "": { devDependencies: { tool: "2.0.0" } }, "src/engine/": {}, "src/web/": { dependencies: { "@own/engine": "*", lib: webAsks } } },
  { "": {}, "src/engine": {}, "src/web": {}, "node_modules/@own/engine": { link: true, resolved: "src/engine" }, "node_modules/@own/web": { link: true, resolved: "src/web" },
    "node_modules/tool": { version: "2.0.0" }, "node_modules/lib": { version: "1.0.0" }, ...(webCopy ? { "src/web/node_modules/lib": { version: webCopy } } : {}) });
expect("a workspace asked for by a star passes, and the hoisted version is the one compared", workspaces("1.0.0"), 0);
expect("a workspace's own copy is the one compared", workspaces("3.0.0", "3.0.0"), 0);
expect("the hoisted version does not pass where a workspace has its own copy", workspaces("1.0.0", "3.0.0"), ['("3.0.0")']);
expect("a workspace's range fails", workspaces("^1.0.0"), ['src/web/package.json: dependencies "lib"']);
expect("a folder whose name only holds the letters node_modules is one of the project's own",
  project({ "": {}, "node_modules_tools/": { dependencies: { a: "^1" } } }, { "": {}, "node_modules_tools": {}, "node_modules/a": { version: "1.0.0" } }), ["node_modules_tools/package.json"]);
expect("a lock file in a folder reads the lists beside it", project({ "": { dependencies: { a: "^1" } } }, { "": {}, "node_modules/a": { version: "1.0.0" } }, "tools/"), ["tools/package.json"]);

// What cannot be read.
expect("a root entry marked as a link is read all the same", project({ "": { dependencies: { a: "file:a.tgz" } } }, { "": { link: true }, "node_modules/a": { version: "1.2.3" } }), ["is not one exact version"]);
expect("so is a workspace's entry marked as a link", project({ "": {}, "src/web/": { dependencies: { a: "^1" } } }, { "": {}, "src/web": { link: true }, "node_modules/a": { version: "1.0.0" } }), ["src/web/package.json"]);
expect("a lock file with no entry for the root fails, and the root's list is not read", check("package-lock.json", reader({ "package-lock.json": JSON.stringify({ lockfileVersion: 3, packages: { "node_modules/a": { version: "1.2.3" } } }), "package.json": JSON.stringify({ dependencies: { a: "file:a.tgz" } }) })), ["holds no entry for the project's own root"]);
expect("a lock file that is no JSON fails", check("package-lock.json", reader({ "package-lock.json": "{" })), ["cannot be read as JSON"]);
expect("a lock file that is missing fails", check("package-lock.json", reader({})), ["cannot be read as JSON"]);
expect("an old lock file with no packages fails", check("package-lock.json", reader({ "package-lock.json": JSON.stringify({ lockfileVersion: 1, dependencies: {} }) })), ['holds no "packages"']);
expect("a package list that is missing fails", check("package-lock.json", reader({ "package-lock.json": JSON.stringify({ packages: { "": {} } }) })), ["package.json: cannot be read as JSON"]);
expect("a name that is also a key of every object is not found by mistake", project({ "": { dependencies: { constructor: "1.0.0" } } }, { "": {} }), ['"constructor": "1.0.0" is not in']);

// Run as a project runs it: from its root, with the licence check's config, on files on disk.
function run(spec) {
  const dir = mkdtempSync(join(tmpdir(), "exact-versions-"));
  try {
    mkdirSync(join(dir, "tools"));
    writeFileSync(join(dir, "licences.json"), JSON.stringify({ lockfiles: ["tools/package-lock.json"] }));
    writeFileSync(join(dir, "tools", "package.json"), JSON.stringify({ devDependencies: { a: spec } }));
    writeFileSync(join(dir, "tools", "package-lock.json"), JSON.stringify({ lockfileVersion: 3, packages: { "": {}, "node_modules/a": { version: "1.2.3" } } }));
    try { execFileSync(process.execPath, [fileURLToPath(new URL("./exact-versions.mjs", import.meta.url)), "licences.json"], { cwd: dir, stdio: "pipe" }); return 0; } catch (e) { return e.status; }
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
if (run("1.2.3") !== 0) { failed++; console.error("FAIL run from a project's root: an exact version does not pass"); }
if (run("^1.2.3") !== 1) { failed++; console.error("FAIL run from a project's root: a range does not fail"); }

console.log(failed ? `${failed} FAILED` : "ok   the exact-versions check tells every case apart");
process.exit(failed ? 1 : 0);
