// What Kiro configures (#407): each hook in a JSON file directly under `.kiro/hooks`, and its tool servers in
// `.kiro/settings/mcp.json`, each named with "Kiro" first.
import { addHook, addServers, SERVERS } from "./agent-tools-read.mjs";

// What Kiro configures in the project (tools/kiro.md; kiro.dev, its pages on hooks and on tool servers, read on 16
// November 2026): each JSON file directly under .kiro/hooks, { "version", "hooks": [ { "name", "trigger", "matcher",
// "action": { "type", "command" }, "timeout", "confirm" } ] }, a command hook named by its trigger, matcher and command,
// as "Kiro Stop: <command>"; and the tool servers of .kiro/settings/mcp.json's "mcpServers", as "Kiro <name>".
export function readKiro(state, json, files) {
  for (const name of files(".kiro/hooks").filter(n => n.endsWith(".json")).sort()) {
    const file = `.kiro/hooks/${name}`, hooks = json(file)?.hooks;
    // (and a "hooks" that is no list is refused as the wrong shape, as the readers of Claude Code's files refuse theirs)
    if (hooks !== undefined && hooks !== null && !Array.isArray(hooks)) state.flag(`${file}: "hooks" is not a JSON list. Mend: write it as one, of each hook's settings, as Kiro reads it`, file);
    for (const hook of Array.isArray(hooks) ? hooks : []) {
      const action = hook?.action, runs = action?.type === "command" && typeof action.command === "string";
      const confirm = hook?.confirm, options = Array.isArray(confirm?.options) ? confirm.options : [];
      const commands = [runs ? action.command : null, confirm?.confirmCommand, ...options.map(o => o?.run)].filter(c => typeof c === "string");
      const matcher = typeof hook?.matcher === "string" && hook.matcher ? hook.matcher : "";
      addHook(state, file, { tool: "Kiro", event: String(hook?.trigger), matcher, hook, runs, text: runs ? action.command : JSON.stringify(hook), commands });
    }
  }
  addServers(state, ".kiro/settings/mcp.json", state.entries(".kiro/settings/mcp.json", "mcpServers", json(".kiro/settings/mcp.json")?.mcpServers, SERVERS), "Kiro ");
}
