// What this session has spent so far, as the one line a PR's description ends with ("Work from main" in
// modules/git.md): the tokens of every answer in Claude Code's own record of the session and of the helpers it
// started, each answer counted once. That record can lose answers while the session goes on, so the script keeps a
// tally of its own beside it, `session-cost/<the session's id>.json` in Claude Code's folder: every answer it has
// counted, by its id, with its four counts and its model's family. Each run adds what the record holds now, and the
// line is the tally's, so it never drops within a session while the tally stands (a tally lost, or answers that came
// and went between two runs, and it is a floor again). Where it cannot tell (another tool, no session id, no record
// and no tally), it prints nothing and exits 0, so no session works this out by hand or writes that it could not. It
// reads the record and writes the tally, nothing else: no prompt, answer or path leaves it, only ids, counts and the
// models' families; a tally no run has touched for 90 days is removed. Node's own modules only.
//
//   node core/scripts/session-cost.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { started } from "./started.mjs";

const FIELDS = ["input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens"];
const FAMILIES = ["fable", "mythos", "opus", "sonnet", "haiku"];

const SESSION = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/u;
const NAMES = FAMILIES.map((name) => name[0].toUpperCase() + name.slice(1));
const DAYS_KEPT = 90;

/** Every answer in the records given (each a transcript's text, one JSON object a line), by its id, its last count
 *  kept: its four counts, and its model's family or "". */
export function answersIn(records) {
  const answers = new Map();
  for (const text of records) {
    for (const row of text.split("\n")) {
      if (!row.includes('"usage"')) continue;
      let message;
      try { message = JSON.parse(row)?.message; } catch { continue; }
      const usage = message?.usage;
      if (typeof message?.id !== "string" || !usage || typeof usage !== "object") continue;
      const model = typeof message.model === "string" ? message.model.toLowerCase() : "";
      answers.set(message.id, [...FIELDS.map((f) => (Number.isSafeInteger(usage[f]) && usage[f] > 0 ? usage[f] : 0)), NAMES[FAMILIES.findIndex((name) => model.includes(name))] ?? ""]);
    }
  }
  return answers;
}

/** A tally's answers, read back from its text: only what has the shape this script writes; anything else is left out. */
export function keptIn(text) {
  const kept = new Map();
  let all;
  try { all = JSON.parse(text); } catch { return kept; }
  if (!all || typeof all !== "object" || Array.isArray(all)) return kept;
  for (const [id, v] of Object.entries(all)) {
    if (Array.isArray(v) && v.length === 5 && v.slice(0, 4).every((n) => Number.isSafeInteger(n) && n >= 0) && (v[4] === "" || NAMES.includes(v[4]))) kept.set(id, v);
  }
  return kept;
}

/** The counts of the records given and of what a tally kept (`kept`): every answer once, the record's count where it
 *  still holds the answer, the tally's where it has lost it. `all` is the tally to keep. */
export function cost(records, kept = new Map()) {
  const all = new Map([...kept, ...answersIn(records)]);
  const sum = Object.fromEntries(FIELDS.map((f) => [f, 0]));
  const families = new Set();
  for (const counts of all.values()) {
    FIELDS.forEach((f, i) => { sum[f] += counts[i]; });
    if (counts[4]) families.add(counts[4]);
  }
  return { answers: all.size, sum, families: [...families].sort(), all };
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
  if (!SESSION.test(session ?? "")) return [];
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

/** A session's tally under Claude Code's folder, or null for a session id of another shape. */
export const tallyOf = (home, session) => (SESSION.test(session ?? "") ? path.join(home, "session-cost", `${session}.json`) : null);

/** A tally's text, or "" where there is none that can be read (or one too large to be this script's). */
export function tallyText(file) {
  try { return fs.statSync(file).size < 1 << 26 ? fs.readFileSync(file, "utf8") : ""; } catch { return ""; }
}

/** Writes the tally whole and in one step (a file beside it, then renamed), and removes what no run has touched for
 *  90 days. What it cannot write, it leaves: the line was printed already. */
export function keep(file, all, now = Date.now()) {
  try {
    const dir = path.dirname(file), part = `${file}.${process.pid}.part`;
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(part, JSON.stringify(Object.fromEntries(all)), { mode: 0o600 });
    fs.renameSync(part, file);
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const at = path.join(dir, entry.name);
      if (entry.isFile() && now - fs.statSync(at).mtimeMs > DAYS_KEPT * 86400000) fs.rmSync(at, { force: true });
    }
  } catch { /* (a line without a tally is the line as it was before this script kept one) */ }
}

if (started(import.meta.url)) {
  try {
    const home = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
    const file = tallyOf(home, process.env.CLAUDE_CODE_SESSION_ID);
    if (file) {
      const counted = cost(records(home, process.env.CLAUDE_CODE_SESSION_ID), keptIn(tallyText(file)));
      const out = line(counted);
      if (out) { console.log(out); keep(file, counted.all); }
    }
  } catch { /* (nothing to say) */ }
}
