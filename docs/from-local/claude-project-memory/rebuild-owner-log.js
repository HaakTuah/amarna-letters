// Rebuilds owner-messages-log.md: every message the owner typed in the amarna-letters project, word for word,
// oldest first, from Claude Code's own session files. Run:  node rebuild-owner-log.js
//
// Sources: the top-level session files (*.jsonl) of every project folder for this repository, that is
// ~/.claude/projects/C--Users-Perry-source-repos-amarna-letters and its worktree folders
// (C--Users-Perry-source-repos-amarna-letters--claude-worktrees-*). Subagent transcripts are not read.
// It reads only these folders and writes only next to itself (this project's memory folder).
//
// Kept: messages whose origin is the human owner (app context inside <system-reminder> blocks is removed), the
// owner's answers to questions, plan approvals, and the slash commands the owner ran. Left out: tool output,
// task notifications, messages from other sessions, conversation summaries.

const fs = require("fs");
const path = require("path");
const os = require("os");

const projects = path.join(os.homedir(), ".claude", "projects");
const prefix = "C--Users-Perry-source-repos-amarna-letters";
const out = path.join(__dirname, "owner-messages-log.md");

const folders = fs.readdirSync(projects).filter(d => d === prefix || d.startsWith(prefix + "--claude-worktrees-"));
const entries = [];

for (const folder of folders) {
  const dir = path.join(projects, folder);
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith(".jsonl"))) {
    const session = file.slice(0, 8);
    const where = folder === prefix ? "main checkout" : "worktree " + folder.slice(prefix.length + "--claude-worktrees-".length);
    const toolNames = {};
    let last = null;
    for (const line of fs.readFileSync(path.join(dir, file), "utf8").split("\n")) {
      if (!line.trim()) continue;
      let o;
      try { o = JSON.parse(line); } catch { continue; }
      if (o.isSidechain) continue;
      if (o.type === "assistant")
        for (const b of o.message?.content ?? []) if (b.type === "tool_use") toolNames[b.id] = b.name;
      if (o.type !== "user") continue;
      const c = o.message?.content;

      // A slash command the owner ran is recorded as a meta message right after the message it came with.
      if (o.isMeta) {
        const text = typeof c === "string" ? c : Array.isArray(c) ? c.map(x => x.text ?? "").join("") : "";
        const name = /<command-name>([^<]*)<\/command-name>/.exec(text);
        if (name) {
          const args = /<command-args>([\s\S]*?)<\/command-args>/.exec(text);
          const ran = `[ran /${name[1].replace(/^\//, "")}${args && args[1].trim() ? " " + args[1].trim() : ""}]`;
          if (last && last.session === session && Date.parse(o.timestamp) - Date.parse(last.time) < 60_000) last.extra.push(ran);
          else entries.push(last = { time: o.timestamp, session, where, text: ran, extra: [] });
        }
        continue;
      }

      // The owner's answers to questions and plan approvals come back as tool results.
      if (Array.isArray(c) && c.some(x => x.type === "tool_result")) {
        for (const b of c) {
          if (b.type !== "tool_result") continue;
          const name = toolNames[b.tool_use_id] ?? "";
          const text = typeof b.content === "string" ? b.content : (b.content ?? []).map(x => x.text ?? "").join("");
          if (name === "AskUserQuestion" && text.startsWith("Your questions have been answered"))
            entries.push(last = { time: o.timestamp, session, where, text: "[answered questions] " + text.replace(/\s*You can now continue[\s\S]*$/, ""), extra: [] });
          else if (name === "ExitPlanMode" && /approved your plan/.test(text))
            entries.push(last = { time: o.timestamp, session, where, text: "[approved the plan]", extra: [] });
          else if (/doesn't want to proceed|user said:/i.test(text) && /The user/.test(text))
            entries.push(last = { time: o.timestamp, session, where, text: "[declined a step] " + text, extra: [] });
        }
        continue;
      }

      if (o.origin?.kind !== "human") continue;
      let text = typeof c === "string" ? c
        : Array.isArray(c) ? c.map(x => x.type === "text" ? x.text : x.type === "image" ? "[picture]" : `[${x.type}]`).join("\n") : "";
      text = text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "")
        .replace(/<pasted_content id="[^"]*">/g, "[Pasted text]")
        .replace(/<\/pasted_content id="[^"]*">|<\/pasted_content>/g, "[End of pasted text]")
        .trim();
      if (!text) continue;
      entries.push(last = { time: o.timestamp, session, where, text, extra: [] });
    }
  }
}

entries.sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
const fence = t => "`".repeat(Math.max(3, ...[...t.matchAll(/`+/g)].map(m => m[0].length + 1)));
const lines = [
  "# Owner's messages in the amarna-letters project, word for word",
  "",
  `Rebuilt ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC by rebuild-owner-log.js from Claude Code's session files. ${entries.length} entries, oldest first.`,
  "Each message is exactly as typed (pasted text is marked [Pasted text] ... [End of pasted text]; app context added to a message is left out).",
  "Bracketed entries are not typed text: answers chosen in a question box, a plan approved, a slash command run.",
  "",
];
entries.forEach((e, i) => {
  const body = e.text + (e.extra.length ? "\n" + e.extra.join("\n") : "");
  const f = fence(body);
  lines.push(`## ${i + 1}. ${e.time.slice(0, 16).replace("T", " ")} UTC (session ${e.session}, ${e.where})`, "", f + "text", body, f, "");
});
fs.writeFileSync(out, lines.join("\n"));
console.log(`${entries.length} entries written to ${out}`);
