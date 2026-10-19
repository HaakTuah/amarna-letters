// PreToolUse guard for one agent, a king or a character. Claude Code runs it before every tool call the agent makes.
// It allows exactly two things: reading a *.request.md file, and writing a *.reply.json file, both
// directly inside the agent's own folder. Everything else is blocked (exit code 2), and every attempt
// is logged, allowed or not, to the guard log, which no agent can reach.
//
//   node sim/guard.js <folder> <guard log> <label: the power, or the character's agent type>   (the hook input arrives on stdin as JSON)
const fs = require("fs");
const path = require("path");

const [folderArg, logPath, power] = process.argv.slice(2);
const norm = p => path.resolve(String(p)).replace(/\\/g, "/").toLowerCase();
const folder = norm(folderArg);

let raw = "";
process.stdin.on("data", d => (raw += d));
process.stdin.on("end", () => {
  let input = {};
  try { input = JSON.parse(raw); } catch { /* an unreadable call is blocked below */ }
  const tool = input.tool_name ?? "?";
  const args = input.tool_input ?? {};
  const target = args.file_path ?? args.path ?? args.notebook_path ?? args.pattern ?? args.command ?? args.url ?? "";

  let allowed = false;
  let why = "only Read of a request file and Write of a reply file inside your own folder are allowed";
  if ((tool === "Read" || tool === "Write") && typeof args.file_path === "string" && path.isAbsolute(args.file_path)) {
    const file = norm(args.file_path);
    const inFolder = path.posix.dirname(file) === folder;
    const name = path.posix.basename(file);
    if (!inFolder) why = "that path is outside your folder";
    else if (tool === "Read" && name.endsWith(".request.md")) allowed = true;
    else if (tool === "Write" && name.endsWith(".reply.json")) allowed = true;
    else why = tool === "Read" ? "you may only read request files" : "you may only write reply files";
  } else if (tool === "Read" || tool === "Write") {
    why = "give an absolute path to a file in your folder";
  }

  try {
    fs.appendFileSync(logPath, JSON.stringify({
      at: new Date().toISOString(), power, tool, target: String(target).slice(0, 400), allowed,
      agent: input.agent_type ?? input.agent_id ?? null, session: input.session_id ?? null,
    }) + "\n");
  } catch { /* logging must never let a call through */ }

  if (allowed) process.exit(0);
  process.stderr.write(`Blocked: ${why}.`);
  process.exit(2);
});
