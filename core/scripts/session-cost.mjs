// What this session has spent so far, as the one line a PR's description ends with ("Work from main" in
// modules/git.md): the tokens of every answer in Claude Code's own record of the session and of the helpers it
// started, each answer counted once. Where it cannot tell (another tool, no session id, no record), it prints nothing
// and exits 0, so no session works this out by hand or writes that it could not. It reads the record and nothing else:
// no prompt, answer or path leaves it, only counts and the models' families. Node's own modules only.
//
//   node core/scripts/session-cost.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FIELDS = ["input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens"];
const FAMILIES = ["fable", "mythos", "opus", "sonnet", "haiku"];

/** The counts of the records given (each a transcript's text, one JSON object a line): every answer once, by its id. */
export function cost(records) {
  const answers = new Map();
  for (const text of records) {
    for (const row of text.split("\n")) {
      if (!row.includes('"usage"')) continue;
      let message;
      try { message = JSON.parse(row)?.message; } catch { continue; }
      const usage = message?.usage;
      if (typeof message?.id !== "string" || !usage || typeof usage !== "object") continue;
      answers.set(message.id, { model: typeof message.model === "string" ? message.model : "", usage });
    }
  }
  const sum = Object.fromEntries(FIELDS.map((f) => [f, 0]));
  const families = new Set();
  for (const { model, usage } of answers.values()) {
    for (const f of FIELDS) if (Number.isSafeInteger(usage[f]) && usage[f] > 0) sum[f] += usage[f];
    const family = FAMILIES.find((name) => model.toLowerCase().includes(name));
    if (family) families.add(family[0].toUpperCase() + family.slice(1));
  }
  return { answers: answers.size, sum, families: [...families].sort() };
}

/** The line for a PR's description, or "" where there is nothing to say. */
export function line({ answers, sum, families }) {
  if (!answers) return "";
  const n = (value) => value.toLocaleString("en-US");
  return `Session so far: ${n(answers)} answers${families.length ? ` (${families.join(", ")})` : ""}; tokens in ${n(sum.input_tokens)}, ` +
    `cache written ${n(sum.cache_creation_input_tokens)}, cache read ${n(sum.cache_read_input_tokens)}, out ${n(sum.output_tokens)}.`;
}

/** The records of a session under Claude Code's folder: its own, and those of the helpers it started. */
export function records(home, session) {
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/u.test(session ?? "")) return [];
  const projects = path.join(home, "projects");
  const found = [];
  const walk = (dir, depth) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const at = path.join(dir, entry.name);
      if (entry.isDirectory() && depth < 3) walk(at, depth + 1);
      else if (entry.isFile() && entry.name.endsWith(".jsonl")) found.push(fs.readFileSync(at, "utf8"));
    }
  };
  let folders = [];
  try { folders = fs.readdirSync(projects, { withFileTypes: true }).filter((e) => e.isDirectory()); } catch { return []; }
  for (const folder of folders) {
    const own = path.join(projects, folder.name, `${session}.jsonl`);
    try { if (fs.statSync(own).isFile()) found.push(fs.readFileSync(own, "utf8")); } catch { /* (not this project's) */ }
    try { walk(path.join(projects, folder.name, session), 0); } catch { /* (no helpers) */ }
  }
  return found;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const home = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
    const out = line(cost(records(home, process.env.CLAUDE_CODE_SESSION_ID)));
    if (out) console.log(out);
  } catch { /* (nothing to say) */ }
}
