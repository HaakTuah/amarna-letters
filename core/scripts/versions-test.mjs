// Checks the versions check (versions.mjs, beside this file), offline: an entry finds exactly one version in its file,
// one that finds none or reaches outside the project fails, and the release it would ask for is the newest stable one
// old enough (invented release times). Run by the core's tests workflow (.github/workflows/tests.yml).
//
//   node scripts/versions-test.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { current, newest, issue, pypiTimes } from "./versions.mjs";

let failed = 0;
const ok = (cond, what) => { console.log(`${cond ? "ok  " : "FAIL"} ${what}`); if (!cond) failed++; };
const root = fs.mkdtempSync(path.join(os.tmpdir(), "versions-test-"));
fs.writeFileSync(path.join(root, "pin.txt"), "loads mossgrip@1.5.4 here\n");
const throws = f => { try { f(); return false; } catch { return true; } };

const entry = { name: "mossgrip", file: "pin.txt", pattern: "mossgrip@(\\d+\\.\\d+\\.\\d+)", days: 14, how: "Bump it." };
const [e] = current([entry], root);
ok(e.version === "1.5.4", "an entry finds the one version in its file");
ok(throws(() => current([{ ...entry, pattern: "barkbite@(\\d+\\.\\d+\\.\\d+)" }], root)), "an entry whose pattern finds no version fails, so a moved version is never silently skipped");
const outside = fs.mkdtempSync(path.join(os.tmpdir(), "versions-outside-"));
fs.writeFileSync(path.join(outside, "pin.txt"), "loads mossgrip@1.5.4 here\n");
ok(throws(() => current([{ ...entry, file: path.relative(root, path.join(outside, "pin.txt")) }], root)), "an entry's file outside the project fails");
fs.writeFileSync(path.join(root, "..pin.txt"), "loads mossgrip@1.5.4 here\n");
ok(current([{ ...entry, file: "..pin.txt" }], root).length === 1, "a file whose name only starts with two dots is inside");
ok(throws(() => current([{ ...entry, days: undefined }], root)) && throws(() => current([{ ...entry, days: 3 }], root)), "an entry without a wait of a week or more fails (floor rule 7)");
ok(throws(() => current([{ ...entry, how: "" }], root)), "an entry without what to do fails");
const core = fileURLToPath(new URL("..", import.meta.url));
ok(current(JSON.parse(fs.readFileSync(path.join(core, ".github/versions.json"), "utf8")).entries, core).length > 0, "the core's own entries each find one version, with their wait and what to do");

const now = Date.parse("2026-11-02T00:00:00Z"), ago = d => new Date(now - d * 864e5).toISOString();
const times = { created: ago(900), modified: ago(1), "1.4.0": ago(400), "1.5.4": ago(300), "1.5.10": ago(30), "2.0.0": ago(20), "2.1.0": ago(10), "2.2.0-rc.1": ago(30) };
ok(newest(times, { days: 7, version: "1.5.4" }, now) === "2.1.0", "the newest stable release a week old, numbers compared as numbers");
ok(newest(times, { days: 14, version: "1.5.4" }, now) === "2.0.0", "a script waits two weeks: one out ten days is not yet asked for");
ok(newest(times, { days: 7, sameMajor: true, version: "1.5.4" }, now) === "1.5.10", "within the same major when asked: 1.5.10 above 1.5.4, not 2.x");
ok(newest({ "1.0.0": ago(2) }, { days: 7, version: "1.0.0" }, now) === null, "nothing old enough, nothing asked for");
const i = issue({ name: "mossgrip", file: "pin.txt", version: "1.5.4", days: 14, how: "Bump it." }, "2.0.0", "tools/versions.json");
ok(i.title.startsWith(i.key) && /\*\*Describe the solution you'd like\*\*\nBump it\./.test(i.body), "an issue's title starts with its key (so one already open is found) and its body has the template's headings");

const py = { name: "mossgrip", registry: "pypi", file: "pin.txt", pattern: "mossgrip==(\\d+\\.\\d+\\.\\d+)", days: 7, how: "Bump it." };
fs.writeFileSync(path.join(root, "pin.txt"), "needs mossgrip==1.5.4\n");
ok(current([py], root)[0].version === "1.5.4", "a PyPI entry finds its version too");
ok(throws(() => current([{ ...py, registry: "cdn" }], root)) && throws(() => current([{ ...py, registry: "__proto__" }], root)) && throws(() => current([{ ...py, registry: ["pypi"] }], root))
  && throws(() => current([{ ...py, name: "moss grip" }], root)), "an unknown registry, or a name it cannot hold, fails");
const pypi = { releases: { "1.5.4": [{ upload_time_iso_8601: ago(300) }], "2.0.0": [{ upload_time_iso_8601: ago(20), yanked: true }],
  "2.0.1": [{ upload_time_iso_8601: ago(9) }, { upload_time_iso_8601: ago(12) }], "2.1.0": [], "2.2.0": [{ upload_time_iso_8601: 0 }] } };
const pt = pypiTimes(pypi);
ok(!("2.0.0" in pt) && !("2.1.0" in pt) && !("2.2.0" in pt) && pt["2.0.1"] === ago(12), "PyPI's times: a withdrawn, empty or undated release left out, a release dated by its first upload");
ok(throws(() => pypiTimes({})) && throws(() => pypiTimes({ releases: {} })) && throws(() => pypiTimes({ releases: { "1.0.0": [{ uploaded: ago(9) }] } })),
  "an answer that lists or dates no release fails, never read as up to date");
ok(newest({ "1.5.4": ago(300), "2.0": ago(30) }, { days: 7, version: "1.5.4" }, now) === "2.0", "a two-part release, as PyPI has, counts");
ok(newest({ "1.5.4": ago(300), "1234567890.0.0": ago(30) }, { days: 7, version: "1.5.4" }, now) === "1.5.4", "a number too long to compare exactly is no release");
ok(newest(pt, { days: 10, version: "1.5.4" }, now) === "2.0.1", "and the newest old enough taken from them as from npm's");
ok(/pypi\.org\/project\/mossgrip\/2\.0\.1\//.test(issue({ ...py, version: "1.5.4" }, "2.0.1", "x.json").body), "a PyPI release's issue links its PyPI page");
for (const d of [root, outside]) fs.rmSync(d, { recursive: true, force: true });
if (failed) process.exit(1);
