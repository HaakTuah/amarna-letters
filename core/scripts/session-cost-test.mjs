// Tests of the session's cost line (session-cost.mjs): what it counts, what it leaves out, that it says nothing where
// it cannot tell, and that its own tally keeps the line from dropping when the record loses answers. In a scratch
// folder shaped as Claude Code keeps its records. Node's own modules only.
//
//   node scripts/session-cost-test.mjs
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cost, keep, keptIn, line, records, tallyOf } from "./session-cost.mjs";

let failed = 0, count = 0;
const ok = (cond, what, detail = "") => { count++; if (cond) console.log(`ok   ${what}`); else { failed++; console.error(`FAIL ${what}${detail && `\n     ${detail}`}`); } };
const answer = (id, model, usage) => JSON.stringify({ type: "assistant", message: { id, model, usage } });
const usage = (i, w, r, o) => ({ input_tokens: i, cache_creation_input_tokens: w, cache_read_input_tokens: r, output_tokens: o });

const own = [answer("a1", "claude-opus-9", usage(10, 100, 1000, 5)), answer("a1", "claude-opus-9", usage(10, 100, 1000, 7)),
  '{"type":"user","message":{"content":"a line about \\"usage\\" that is no answer"}}', "not json at all \"usage\"",
  answer("a2", "claude-opus-9", usage(1, 0, 2000, 3))].join("\n");
const helper = [answer("h1", "claude-haiku-9", usage(2, 20, 0, 1)), answer("h2", "some-other-model", { input_tokens: -5, output_tokens: "many" })].join("\n");
let c = cost([own, helper]);
ok(c.answers === 4 && c.sum.input_tokens === 13 && c.sum.cache_creation_input_tokens === 120 && c.sum.cache_read_input_tokens === 3000 && c.sum.output_tokens === 11,
  "every answer once, by its id, its last count kept; a helper's added; a count that is no whole number above zero left out", JSON.stringify(c));
ok(c.families.join() === "Haiku,Opus", "models by family alone, a model of no known family unnamed", c.families.join());
ok(line(c) === "Session so far: 4 answers (Haiku, Opus); tokens in 13, cache written 120, cache read 3,000, out 11.", "the line", line(c));
ok(line(cost([])) === "" && line(cost(["{}\n"])) === "", "nothing to say where there is no answer");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "session-cost-test-"));
process.on("exit", () => fs.rmSync(tmp, { recursive: true, force: true }));
const session = "01234567-89ab-cdef-0123-456789abcdef", other = "11111111-2222-3333-4444-555555555555";
const project = path.join(tmp, "projects", "-some-folder");
fs.mkdirSync(path.join(project, session, "subagents"), { recursive: true });
fs.writeFileSync(path.join(project, `${session}.jsonl`), own);
fs.writeFileSync(path.join(project, session, "subagents", "agent-1.jsonl"), helper);
fs.writeFileSync(path.join(project, session, "subagents", "agent-1.meta.json"), "{}");
fs.writeFileSync(path.join(project, `${other}.jsonl`), answer("x1", "claude-opus-9", usage(999, 999, 999, 999)));
ok(records(tmp, session).length === 2 && line(cost(records(tmp, session))) === line(c), "a session's own record and its helpers', and no other session's");
ok(records(tmp, "../../etc").length === 0 && records(tmp, undefined).length === 0 && records(path.join(tmp, "nowhere"), session).length === 0, "a session id of another shape, none, or no folder: no record");

const script = fileURLToPath(new URL("./session-cost.mjs", import.meta.url));
const run = (env) => spawnSync(process.execPath, [script], { encoding: "utf8", env: { PATH: process.env.PATH, ...env } });
let r = run({ CLAUDE_CONFIG_DIR: tmp, CLAUDE_CODE_SESSION_ID: session });
ok(r.status === 0 && r.stdout.trim() === line(c) && !r.stderr, "as a program: the line, and nothing else", `${r.status} ${r.stdout} ${r.stderr}`);
r = run({ CLAUDE_CONFIG_DIR: tmp });
ok(r.status === 0 && r.stdout === "" && r.stderr === "", "with no session id it prints nothing and exits 0");
r = run({ CLAUDE_CONFIG_DIR: path.join(tmp, "nowhere"), CLAUDE_CODE_SESSION_ID: session });
ok(r.status === 0 && r.stdout === "" && r.stderr === "", "with no record it prints nothing and exits 0");

// The tally: what the record loses stays counted, and what it still holds is counted as it stands now.
const lost = cost([answer("a2", "claude-opus-9", usage(1, 0, 2000, 9))], c.all);
ok(lost.answers === 4 && lost.sum.output_tokens === 17 && lost.sum.input_tokens === 13 && lost.families.join() === "Haiku,Opus",
  "an answer the record has lost stays in the count, and one it still holds is counted as it now stands", JSON.stringify(lost.sum));
const junk = keptIn(JSON.stringify({ a1: [1, 2, 3, 4, "Opus"], b: [1, 2, 3, "4", ""], c: [1, 2, 3, -4, ""], d: [1, 2, 3, 4, "Other"], e: [1, 2, 3], f: "x", g: [1.5, 2, 3, 4, ""] }));
const odd = cost([], keptIn('{"__proto__":[9,8,7,6,""],"a1":[1,2,3,4,"Opus"]}'));
ok(odd.answers === 2 && odd.sum.output_tokens === 10 && Object.keys(JSON.parse(JSON.stringify(Object.fromEntries(odd.all)))).length === 2, "an id of any spelling is an id, and nothing more");
ok(junk.size === 1 && junk.get("a1")[4] === "Opus" && keptIn("not json").size === 0 && keptIn("[1]").size === 0 && keptIn("null").size === 0,
  "a tally is read back only where it has the shape the script writes", JSON.stringify([...junk]));
ok(tallyOf(tmp, "../../etc") === null && tallyOf(tmp, undefined) === null && tallyOf(tmp, session) === path.join(tmp, "session-cost", `${session}.json`), "a tally only for a session id of the one shape, in its own folder");

const tally = tallyOf(tmp, session), at = { CLAUDE_CONFIG_DIR: tmp, CLAUDE_CODE_SESSION_ID: session };
const written = JSON.parse(fs.readFileSync(tally, "utf8"));
ok(JSON.stringify(written) === JSON.stringify({ a1: [10, 100, 1000, 7, "Opus"], a2: [1, 0, 2000, 3, "Opus"], h1: [2, 20, 0, 1, "Haiku"], h2: [0, 0, 0, 0, ""] }),
  "the tally holds ids, counts and families, and nothing else", JSON.stringify(written));
ok(process.platform === "win32" || (fs.statSync(tally).mode & 0o077) === 0, "the tally is the user's alone to read");
fs.writeFileSync(path.join(project, `${session}.jsonl`), answer("a2", "claude-opus-9", usage(1, 0, 2000, 3)));
fs.rmSync(path.join(project, session), { recursive: true });
r = run(at);
ok(r.stdout.trim() === line(c), "a record that lost answers: the line does not drop", r.stdout);
fs.appendFileSync(path.join(project, `${session}.jsonl`), `\n${answer("a3", "claude-sonnet-9", usage(5, 0, 0, 2))}`);
r = run(at);
ok(r.stdout.trim() === "Session so far: 5 answers (Haiku, Opus, Sonnet); tokens in 18, cache written 120, cache read 3,000, out 13.", "a new answer after the loss: the line rises from where it stood", r.stdout);
fs.rmSync(path.join(project, `${session}.jsonl`));
r = run(at);
ok(/^Session so far: 5 answers/.test(r.stdout), "no record left and a tally: the tally's line", r.stdout);
fs.writeFileSync(tally, "{ not a tally");
fs.writeFileSync(path.join(project, `${session}.jsonl`), own);
r = run(at);
ok(r.stdout.trim() === "Session so far: 2 answers (Opus); tokens in 11, cache written 100, cache read 3,000, out 10." && Object.keys(JSON.parse(fs.readFileSync(tally, "utf8"))).length === 2,
  "a tally that cannot be read: the record's line, and a tally written anew", r.stdout);
const old = path.join(tmp, "session-cost", `${other}.json`), fresh = path.join(tmp, "session-cost", "22222222-2222-3333-4444-555555555555.json");
fs.writeFileSync(old, "{}"); fs.writeFileSync(fresh, "{}");
fs.utimesSync(old, new Date(Date.now() - 91 * 86400000), new Date(Date.now() - 91 * 86400000));
keep(tally, c.all);
ok(!fs.existsSync(old) && fs.existsSync(fresh) && fs.existsSync(tally) && fs.readdirSync(path.dirname(tally)).every((name) => name.endsWith(".json")), "a tally no run has touched for 90 days goes, a newer one stays, and no part of a write is left");
const blocked = path.join(tmp, "blocked");
fs.mkdirSync(path.join(blocked, "projects", "-f"), { recursive: true });
fs.writeFileSync(path.join(blocked, "projects", "-f", `${session}.jsonl`), own);
fs.writeFileSync(path.join(blocked, "session-cost"), "a file where the tallies' folder would be");
r = run({ CLAUDE_CONFIG_DIR: blocked, CLAUDE_CODE_SESSION_ID: session });
ok(r.status === 0 && /^Session so far: 2 answers/.test(r.stdout) && !r.stderr, "where the tally cannot be written, the line all the same, and no word of it", `${r.status} ${r.stdout} ${r.stderr}`);

console.log(failed ? `${failed} of ${count} failed` : `ok   ${count} assertions on the session's cost line`);
process.exitCode = failed ? 1 : 0;
