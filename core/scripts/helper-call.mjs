// The helper hook ("Pass both model and effort" in modules/claude.md), for Claude Code in every project that takes the
// core: before a helper starts through the Agent tool (once named Task), it refuses a call that asks for the effort
// max, or that names no model or no effort, and says what to pass. A left-out effort falls to the app's default, which
// may be higher, and a left-out model to the caller's own: both are spent without anyone having chosen them.
// A fork goes on whatever its call says: Claude Code ignores both fields on one, which runs on its caller's model and
// effort. A helper of a type the project defines itself goes on without the fields, since a model or effort named in
// the call would overrule its definition's, but not with the effort max, which is refused on every call but a fork's:
// a caller can always ask for less. Max is judged from the call alone, before any step that can fail. A project keeps
// each definition as .claude/agents/<name>.md, the file named as its `name:` line says, holding its model and its
// effort: the hook only looks whether a file of that name is there, comparing the type with the names it finds (never
// making a path of it), and what the file holds is the review's of the PR that changes it.
// It never traps a session (as work-saved.sh lets a second stop through): a call refused for a field left out goes on
// when it is made again with the same prompt in the same session, so a caller that cannot pass the field (an older
// Claude Code, a model fixed by a setting, a type defined elsewhere) loses one call and no more. An empty file in the
// temp folder keeps the count, named by a hash of the session and the prompt: the refusal makes it, the call made again
// takes it away and goes on. Whatever stands at that name counts as the mark and is only taken away, never opened or
// written through; and the refusal stands only where its mark was made, so whatever the hook cannot read or do lets
// the call through. There is no clock, which could make every repeat look late: a mark waits for its call however long
// that takes, so one left by a call that was mended rather than made again lets one later lapse with that same prompt,
// in that session, through without a reminder (the mark stays, empty, until then or until the temp folder is cleared).
// It holds a habit, not a floor rule, and judges nothing else: which model and effort fit which role stays with the
// table in modules/claude.md. A helper started another way (a workflow script's own agents, a skill that forks, a
// session started from a shell) never passes this hook.
// Exit 0 lets the call go on; exit 2 refuses it, the reason on stderr, which Claude Code shows the caller. Claude Code
// passes an effort on a helper's call from 2.1.292 on. Run by a PreToolUse hook in .claude/settings.json with the
// matcher "Agent|Task", from the copy merged into main (README.md, "How a project takes the core", point 5); its
// command is COMMAND below, which the test runs whole. Node's own modules.
//
//   node core/scripts/helper-call.mjs --command     prints the hook's command as .claude/settings.json holds it (JSON)
//   echo '{"session_id":"s1","tool_name":"Agent","tool_input":{"prompt":"p","model":"sonnet","effort":"medium"}}' | node core/scripts/helper-call.mjs
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

// The hook's command, one line: main's copy of this script, given to node as text; where main holds none yet, or there
// is no repository, the call goes on (as with work-saved.sh).
export const COMMAND = `bash -c 'f=$(git -C "\${CLAUDE_PROJECT_DIR:-.}" --no-replace-objects show refs/remotes/origin/main:core/scripts/helper-call.mjs 2>/dev/null) || exit 0; node --input-type=module -e "$f"'`;

// Whether the project defines this type of helper itself: a file `<type>.md` among the names in its .claude/agents. A
// folder that is there but cannot be read counts as defining it, since the hook cannot tell.
export function defines(project, type) {
  if (typeof type !== "string") return false;
  try { return fs.readdirSync(path.join(project, ".claude", "agents")).includes(`${type}.md`); }
  catch (error) { return error?.code !== "ENOENT"; }
}

const whyMax = `This helper's call asks for the effort max: never max, and above high only for escalation ` +
  `(the core's modules/claude.md, "Pass both model and effort"). Ask for less.`;
const whyLacking = lacks => `This helper's call names no ${lacks.join(" and no ")}: pass both, by the table in ` +
  `the core's modules/claude.md ("Pass both model and effort"). Where the tool takes no such field here, or the ` +
  `helper's type sets its own, the call made again with the same prompt goes on.`;

// Why the hook refuses the call it is given (Claude Code's JSON for a hook, as text), or null where the call goes on.
// own(type): whether the project defines that type. first(input): whether this is the call's first try, asked last and
// only of a call that lacks a field (firstTry below). Whatever fails or throws lets the call go on; the effort max is
// judged before any step that can.
export function refusal(text, own = () => false, first = () => true) {
  try {
    const input = JSON.parse(text), call = input?.tool_input;
    if (!["Agent", "Task"].includes(input?.tool_name) || typeof call !== "object" || !call || Array.isArray(call)) {
      return null;
    }
    if (call.subagent_type === "fork") return null;
    if (typeof call.effort === "string" && call.effort.trim().toLowerCase() === "max") return whyMax;
    const lacks = ["model", "effort"].filter(key => typeof call[key] !== "string" || call[key].trim() === "");
    if (!lacks.length || own(call.subagent_type)) return null;
    return first(input) ? whyLacking(lacks) : null;
  } catch { return null; }
}

// Whether this is the call's first try in its session, as far as the hook can keep count: true only where its mark is
// made now, so the call made again will find it; false where something stood at the mark's name (taken away now: this
// is the call made again), or where no mark can be named or made, since nothing could then let the call through again.
// The name holds only a hash; whatever stands there is removed, never followed or opened, and a mark is only made new.
export function firstTry(input, dir = os.tmpdir()) {
  const session = input?.session_id, prompt = input?.tool_input?.prompt;
  if (typeof session !== "string" || typeof prompt !== "string") return false;
  const hash = createHash("sha256").update(JSON.stringify([session, prompt])).digest("hex").slice(0, 32);
  const mark = path.join(dir, `helper-call-${hash}`);
  try { fs.unlinkSync(mark); return false; } catch (error) { if (error?.code !== "ENOENT") return false; }
  try { fs.writeFileSync(mark, "", { flag: "wx" }); return true; } catch { return false; }
}

// Run as a program (also when node is given this text itself, with no file: the hook runs main's copy that way). The
// exit code is set rather than exited with, so the reason reaches stderr whole.
if (!process.argv[1] || import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === "--command") console.log(JSON.stringify(COMMAND));
  else {
    let why = null;
    const own = type => defines(process.env.CLAUDE_PROJECT_DIR || process.cwd(), type);
    try { why = refusal(fs.readFileSync(0, "utf8"), own, firstTry); } catch { /* no input to read: the call goes on */ }
    if (why) { console.error(why); process.exitCode = 2; }
  }
}
