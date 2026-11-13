// Tests of the cap's own check (size.mjs): the cap a version of the file sets, whose comment answers for a raise, and
// what is said of a pull request that raises the cap. Node's own modules only.
//
//   node scripts/size-test.mjs
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CAP, answered, capOf, raised } from "./size.mjs";

let failed = 0, count = 0;
const ok = (cond, what, detail = "") => { count++; if (cond) console.log(`ok   ${what}`); else { failed++; console.error(`FAIL ${what}${detail && `\n     ${detail}`}`); } };
const file = fileURLToPath(new URL("./size.mjs", import.meta.url));
const own = fs.readFileSync(file, "utf8");
const at = kb => `// a comment\nexport const CAP = ${kb} * 1024;\nconst other = 1;\n`;

// the cap a version of the file sets
ok(capOf(own) === CAP && capOf(at(52)) === 52 * 1024 && capOf("const CAP = 44 * 1024;\n") === 44 * 1024 && capOf(at(52).replace(/\n/g, "\r\n")) === 52 * 1024, "the cap is read from the one line that sets it, here and in any version, whichever its line endings");
ok([at(0), at("052"), at("5e1"), at("52.5"), at("-1"), "let CAP = 52 * 1024;\n", "export const CAP = 52*1024;\n", "export const CAP = 53248;\n", `${at(52)}${at(53)}`, "  export const CAP = 52 * 1024;\n", "// export const CAP = 52 * 1024;\n", "", null, undefined].every(t => capOf(t) === null),
  "a line spelled any other way, two such lines, one in a comment, or no text at all gives no cap");

// whose comment answers
const comment = (body, author_association = "OWNER") => ({ body, author_association });
ok(answered([comment("Leanness check: a fresh session read all the rules and found too little room.")]) && answered([[comment("x")], [comment("**Leanness check:** no room", "COLLABORATOR")]]) && answered([comment("Leanness check: found", "MEMBER")]),
  "a comment that opens with the leanness check's answer, from the owner, a member or a collaborator, answers, in a list or a list of pages");
ok(!answered([]) && !answered([comment("About the Leanness check: none yet")]) && !answered([comment(" Leanness check: x")]) && !answered([comment("leanness check: x")]) && !answered([comment("Leanness check")]),
  "one that only speaks of it, or opens any other way, does not");
ok(["NONE", "CONTRIBUTOR", "FIRST_TIME_CONTRIBUTOR", "FIRST_TIMER", "MANNEQUIN", null, 5].every(who => !answered([comment("Leanness check: x", who)])), "nor does anyone else's, whatever it says");
ok(!answered(null) && !answered({}) && !answered("Leanness check: x") && !answered([null, 1, "Leanness check: x", { author_association: "OWNER" }, { body: 5, author_association: "OWNER" }]), "nor a list in any other form, or an entry that is no comment");

// a pull request's raise
const yes = [comment("Leanness check: read whole; too little room.")];
ok(raised(at(52), at(52), []) === null && raised(at(53), at(52), []) === null, "a pull request that leaves the cap, or lowers it, needs no answer");
ok(raised(at(52), at(53), yes) === null, "a raise with its answer passes");
ok(/rises from 53248 to 54272 bytes.*Leanness check:/.test(raised(at(52), at(53), [])) && /Leanness check:/.test(raised(at(52), at(53), [comment("Leanness check: x", "NONE")])), "a raise without one fails, and says what is missing");
ok(/one step of a whole KB/.test(raised(at(52), at(54), yes)) && /one step of a whole KB/.test(raised(at(52), at(60), [])) && raised(at(53), at(54), yes) === null, "a raise of more than one step fails, with its answer or without");
const decoy = `/*\n${at(52)}*/\nexport const CAP = 60*1024;\n`;
ok(capOf(decoy) === 52 * 1024 && /does not set the cap the script runs with/.test(raised(at(52), decoy, yes, 60 * 1024)) && raised(at(52), at(52), [], 52 * 1024) === null, "a line that only looks like the cap's, beside a real one spelled otherwise, is not trusted: the cap the script runs with must be the one its line says");
ok(/cannot be told/.test(raised("no cap here", at(53), yes)) && /cannot be told/.test(raised(null, at(52), yes)) && /not the one line the check reads/.test(raised(at(52), "const CAP = 99 * 1000;", yes)), "where either version's cap cannot be read it fails, answer or no answer: it is never waived");

// the script itself
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "size-test-"));
process.on("exit", () => fs.rmSync(tmp, { recursive: true, force: true }));
const put = (name, text) => { const to = path.join(tmp, name); fs.writeFileSync(to, text); return to; };
const run = (...args) => { const r = spawnSync(process.execPath, [file, ...args], { cwd: path.dirname(path.dirname(file)), encoding: "utf8" }); return { status: r.status, out: r.stdout + r.stderr }; };
const same = put("same.mjs", own), lower = put("lower.mjs", at(CAP / 1024 - 1)), none = put("none.json", "[[]]"), one = put("one.json", JSON.stringify([yes]));
ok(run().status === 0 && /bytes of \d+ \(\d+ files\)/.test(run().out), "with no argument it holds the floor and the modules to the cap, as before");
ok(run("--raise", same, none).status === 0 && run("--raise", same, none).out.includes("the cap is not raised"), "against a base with the same cap it passes with no comment");
ok(run("--raise", lower, none).status === 1 && run("--raise", lower, none).out.includes("Leanness check:") && run("--raise", lower, one).status === 0 && run("--raise", lower, one).out.includes("holds a leanness check's answer"), "against a base with a lower cap it fails without the answer and passes with it");
// (a copy of the script whose real cap is not the one its readable line says, run as itself)
fs.mkdirSync(path.join(tmp, "scripts"));
fs.copyFileSync(path.join(path.dirname(file), "started.mjs"), path.join(tmp, "scripts", "started.mjs"));
fs.writeFileSync(path.join(tmp, "scripts", "size.mjs"), own.replace(/^export const CAP = (\d+) \* 1024;$/m, (line, kb) => `/*\n${line}\n*/\nexport const CAP = ${Number(kb) + 8}*1024;`));
const hidden = spawnSync(process.execPath, [path.join(tmp, "scripts", "size.mjs"), "--raise", same, one], { cwd: tmp, encoding: "utf8" });
ok(hidden.status === 1 && hidden.stderr.includes("does not set the cap the script runs with") && !hidden.stdout.includes("ok"), "run as itself, a script whose real cap hides behind a look-alike line fails the raise check, answer or no answer", hidden.stdout + hidden.stderr);
ok(run("--raise").status === 1 && run("--raise", same).status === 1 && run("--raise", same, path.join(tmp, "missing.json")).status === 1 && run("--raise", same, put("bad.json", "{")).status === 1 && run("--raise", path.join(tmp, "missing.mjs"), one).status === 1,
  "without its two files, or with one it cannot read, it fails");

console.log(failed ? `${failed} of ${count} failed` : `ok   ${count} assertions on the cap's check`);
process.exit(failed ? 1 : 0);
