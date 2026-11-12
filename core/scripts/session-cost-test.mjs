// Tests of the session's cost line (session-cost.mjs): what it counts, what it leaves out, and that it says nothing
// where it cannot tell. In a scratch folder shaped as Claude Code keeps its records. Node's own modules only.
//
//   node scripts/session-cost-test.mjs
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cost, line, records } from "./session-cost.mjs";

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

console.log(failed ? `${failed} of ${count} failed` : `ok   ${count} assertions on the session's cost line`);
process.exitCode = failed ? 1 : 0;
