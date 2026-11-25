// Where each hook's command comes from (#407; floor rule 3, what an agent tool starts by itself runs from its copy on
// `main`): a hook of any tool read here, and each setting by which a tool runs a command of its own (Claude Code's
// apiKeyHelper, statusLine and the like; Codex's notify and its model providers' token commands), read as a hook, runs
// its copy on main only where each command it may run, Codex's for Windows among them, is the starter kit's form
// (hook-source.mjs), which fetches its script from main, and the file it fetches is no link (for a core a library
// carries, the file of the library's commit main pins, whose own path is no link either); any other fails, since nothing
// shows it does not run the working tree's copy, which the branch it runs on can change. One that stood before is listed
// in the baseline, its entry saying "from": "the working tree", and noted; the baseline only shrinks: a new hook marked
// so fails, and so does a mark taken out while its hook stands, or a mark on a hook in the kit's form.
import { fetchedBy, fetchesMain, libraryOf } from "./hook-source.mjs";
import { show, canonical, fold } from "./agent-tools-entries.mjs";

// (the starter kit's hooks: each file it writes in a project, by the template it writes it from, beside this copy)
// (the mend of a hook that takes a file from the working tree)
const HOW = "write its command in the starter kit's form, as setup/claude-settings.json.tmpl does: bash -c 'f=$(git -C \"${CLAUDE_PROJECT_DIR:-.}\" --no-replace-objects show refs/remotes/origin/main:<the file> 2>/dev/null) || exit 0; bash -c \"$f\"', which runs the copy on main";
export const SERVERS = "each tool server's name to its settings";
// The tool servers of one file's "mcpServers" (or Codex's "mcp_servers"), into configured()'s `state`, each named
// with its tool before it where it is not Claude Code's, as "Kiro docs"; one name configured in two files is refused,
// since the list could not say which of the two it holds.
export function addServers(state, file, servers, tool) {
  if (!servers || typeof servers !== "object" || Array.isArray(servers)) return;
  for (const [name, server] of Object.entries(servers)) {
    const key = `server ${tool}${name}`, there = state.tools.get(key);
    if (there !== undefined && there !== file) { state.flag(`${file}: the tool server ${show(tool + name)} is configured in ${there} too, so the list cannot say which it holds. Mend: give one of the two another name, or take one out`, file); continue; }
    state.tools.set(key, file);
    // (a server is its whole entry: its command, arguments, address and all, so one the pull request changes is another)
    state.add(key, canonical(["server", file, name, server ?? null]));
    state.servers.push([key, file, name, server]);
    // (a remote server's command that prints its headers, which Claude Code runs by itself as it connects: read as a hook)
    if (server?.headersHelper !== undefined) readHelper(state, file, `mcpServers.${name}.headersHelper`, server.headersHelper);
  }
}
// What one hook of these runs: { runs, whether it is a command hook; text, its name's command; commands, each command
// it may run }, the command Codex runs on Windows in its place among them ("commandWindows", or "command_windows" in
// TOML), whatever the hook's type, each held to the kit's form and named, so its entry in the list reads otherwise than
// the kit's.
const WINDOWS = ["commandWindows", "command_windows"];
function commandsOf(hook) {
  const runs = hook?.type === "command" && typeof hook.command === "string";
  const windows = WINDOWS.filter(k => hook && typeof hook === "object" && Object.hasOwn(hook, k)).map(k => hook[k]);
  if (!runs) return { runs, text: JSON.stringify(hook), commands: windows };
  return { runs, text: `${hook.command}${windows.length ? ` (Windows: ${windows.map(String).join(", ")})` : ""}`, commands: [hook.command, ...windows] };
}
// The hooks one settings file configures, into configured()'s `state`: Claude Code's, or, with `tool`, another tool's
// written the same way (Codex's).
export function readHooks(state, file, settings, tool = "") {
  const all = settings?.hooks;
  for (const [event, groups] of Object.entries(all && typeof all === "object" && !Array.isArray(all) ? all : {})) {
    for (const group of Array.isArray(groups) ? groups : []) {
      const matcher = typeof group?.matcher === "string" && group.matcher ? group.matcher : "";
      for (const hook of Array.isArray(group?.hooks) ? group.hooks : []) addHook(state, file, { tool, event, matcher, given: group?.matcher, hook, ...commandsOf(hook) });
    }
  }
}
// One hook, into configured()'s `state`: its name, as the list writes it, `tool`, `event`, `matcher` and `text`; its
// id, all of it; and the files of the project its `commands` take from the working tree.
export function addHook(state, file, { tool, event, matcher, given = matcher, hook, runs, text, commands, setting = false }) {
  const name = `hook ${tool ? `${tool} ` : ""}${event}${matcher ? ` ${matcher}` : ""}: ${text}`;
  // (Claude Code's hooks keep the id they had before other tools were read, so a base read by an older copy is the same;
  // a setting's is of its own kind, so a hook under an event of a setting's name is never read as the setting it names)
  const id = canonical(setting ? ["setting", tool, event, hook] : tool ? ["hook", tool, event, given ?? "", hook] : ["hook", event, given ?? "", hook]);
  // (a hook's name is its event, matcher and command, split at the first ": ": a matcher holding one would let two
  // hooks share a name)
  if (matcher.includes(": ") && !state.clashed.has(`matcher ${file} ${event} ${matcher}`)) {
    state.clashed.add(`matcher ${file} ${event} ${matcher}`);
    state.flag(`${file}: the ${show(event)} hooks' matcher ${show(matcher)} holds ": ", which a hook's name splits at. Mend: write the matcher without it, as a pattern that matches the same tools`, file);
  }
  // (a command and a hook of another type whose text reads as that command share a name, and the list could not tell
  // them apart; two command hooks of one command, a timeout apart, are one name for the list, each kept)
  const kinds = state.shapes.get(name) ?? new Set();
  kinds.add(runs);
  if (kinds.size > 1 && !state.clashed.has(name)) { state.clashed.add(name); state.flag(`${file}: a command and a hook of another type share the name ${show(name.slice(5))}. Mend: give the one a command of its own, or take one out`, file); }
  state.shapes.set(name, kinds);
  state.add(name, id);
  state.tools.set(name, file);
  // (the starter kit's own hooks too: they are in its form, and what they fetch must be no link, as any hook's)
  readSource(state, name, commands);
}
// The settings by which Claude Code runs a command of its own, not as a hook: each read as a hook is, named by its key, so
// one not in the starter kit's form is held as a hook is (floor rule 3), and each is listed as one; a value of another
// shape than Claude Code takes is refused.
const COMMANDS = ["apiKeyHelper", "awsAuthRefresh", "awsCredentialExport", "gcpAuthRefresh", "otelHeadersHelper", "statusLine", "fileSuggestion"];
// A command a tool runs by itself, written as one text, read as a hook is, as a setting; any other shape refused.
function readHelper(state, file, key, value) {
  if (typeof value !== "string") return void state.flag(`${file}: "${key}" is no command. Mend: write it as one text, as Claude Code takes it`, file);
  addHook(state, file, { tool: "", event: key, matcher: "", hook: value, runs: true, text: value, commands: [value], setting: true });
}
// What no starter kit writes, given as a command so it is never read as the kit's form, and its failure's mend.
export const NO_KIT = "(no form of the starter kit's)", NO_KIT_WHY = "is of a kind no starter kit writes", NOT_KIT_WHY = "is not in the starter kit's form";
const NO_KIT_HOW = "take it out of the project's files, the owner setting it in the tool's own configuration on the machine where it is wanted; or move what it runs into a hook of .claude/settings.json in the starter kit's form";
// A marketplace that runs a command by itself, to print the headers it is fetched with, or as a plug-in's source: read
// whole, as a setting no starter kit writes, so one the pull request adds or changes is new.
export function readMarkets(state, file, settings) {
  const declared = settings?.extraKnownMarketplaces;
  if (!declared || typeof declared !== "object" || Array.isArray(declared)) return;
  const runs = v => Array.isArray(v) ? v.some(runs) : v && typeof v === "object" && Object.entries(v).some(([k, w]) => fold(k) === "headershelper" || (k === "source" && w === "command") || runs(w));
  for (const [name, m] of Object.entries(declared)) if (runs(m)) addHook(state, file, { tool: "", event: `extraKnownMarketplaces.${name}`, matcher: "", hook: m, runs: true, text: "a command it runs", commands: [NO_KIT], setting: true });
}
// What a skill's, a subagent's or a command's frontmatter may have Claude Code run: its hooks, and a subagent's tool
// servers. The frontmatter is split from the file as Claude Code splits it, and held whole, as a setting no starter kit
// writes, unless it is a plain mapping of simple keys at its top, none of them "hooks" or "mcpServers" in any case or
// spelling, and no longer than FRONT_MAX: one in any other form may hold them in a way this check does not read.
const FRONT = /^\uFEFF?---\s*\n([\s\S]*?)---\s*\n?/u, FRONT_MAX = 1 << 16, SIMPLE = /^([A-Za-z0-9_-]+):(?:[ \t].*)?$/u;
export function readFrontmatter(state, file, text) {
  const front = FRONT.exec(text ?? "")?.[1];
  if (front === undefined) return;
  // (split at every line break a YAML reader takes, a lone carriage return's among them; only a space or a tab indents, so
  // a line led by any other blank is read at the top, where it is no simple key)
  const lines = front.split(/\r\n?|\n/u), top = lines.filter(l => l.trim() && !/^[ \t]*#/u.test(l) && !/^[ \t]/u.test(l));
  const plain = front.length <= FRONT_MAX && !/^[ \t]/u.test(lines.find(l => l.trim() && !/^[ \t]*#/u.test(l)) ?? "") && top.every(l => SIMPLE.test(l));
  // (its hooks, its tool servers, and the tools it lets run without asking, under any key that folds to theirs)
  const runs = top.some(l => ["hooks", "mcpservers", "allowedtools"].includes(fold(SIMPLE.exec(l)?.[1] ?? "").replace(/[_-]/gu, "")));
  if (!plain || runs) addHook(state, file, { tool: "", event: `${file} frontmatter`, matcher: "", hook: front, runs: true, text: "what it may run", commands: [NO_KIT], setting: true });
  // (and a permission mode of a subagent's own but the default, which lets it run what it would ask about)
  // (each key that folds to it, whichever one a reader keeps: all must be exactly "permissionMode: default")
  const modes = top.map(l => SIMPLE.exec(l)).filter(m => m && fold(m[1]).replace(/[_-]/gu, "") === "permissionmode");
  const values = modes.map(m => `${m[1]}: ${m[0].slice(m[0].indexOf(":") + 1).replace(/\s#.*$/u, "").trim().replace(/^["']|["']$/gu, "")}`);
  if (values.some(v => v !== "permissionMode: default")) addHook(state, file, { tool: "", event: `${file} permissionMode`, matcher: "", hook: front, runs: true, text: values.join(", "), commands: [NO_KIT], setting: true });
}
// A skill's or a command's body that runs a command where it is invoked (`!` and a command in backquotes, or a block
// opened by three backquotes and `!`, anywhere in the text, as Claude Code finds it): the whole text read as a setting no starter kit writes, so one the pull request
// adds or changes is new.
const SHELL = /!`|(?:```|~~~)[ \t]*!/u;
export function readShell(state, file, text) {
  if (text !== null && SHELL.test(text)) addHook(state, file, { tool: "", event: `${file} shell`, matcher: "", hook: text, runs: true, text: "the commands its text runs", commands: [NO_KIT], setting: true });
}
export function readCommands(state, file, settings) {
  for (const key of COMMANDS) {
    const value = settings?.[key];
    if (value === undefined || value === null) continue;
    const command = typeof value === "string" ? value : value?.type === "command" && typeof value.command === "string" ? value.command : null;
    if (command === null) { state.flag(`${file}: "${key}" is neither a command nor { "type": "command", "command" }. Mend: write it as Claude Code takes it`, file); continue; }
    addHook(state, file, { tool: "", event: key, matcher: "", hook: value, runs: true, text: command, commands: [command], setting: true });
  }
}
// Each hook with a command that is not the starter kit's form, into `state.sources` as { why, how, main }, why nothing
// shows it runs its copy on main (hook-source.mjs), its mend, and whether each command it may run fetches a file from
// main all the same, which the mark of its entry follows ("from": "main", else "the working tree"); so too where the
// file the kit's form fetches the project holds as a link (`linked`), whose target's name main gives in the script's
// place, a file the branch can change, and where a library's commit main pins holds the file it reads there as anything
// but a plain file (`inLibrary`: git prints a link's target, which bash then runs). Where the library's objects are not
// at hand, the file is not read: said, never failed.
function readSource(state, name, commands) {
  const main = commands.every(fetchesMain);
  for (const command of commands) {
    const at = fetchedBy(command);
    if (command === NO_KIT) return void state.sources.set(name, { why: NO_KIT_WHY, how: NO_KIT_HOW });
    if (at === null) return void state.sources.set(name, { why: NOT_KIT_WHY, how: HOW, main });
    // (the command in the kit's form already, its mend is the fetched file's)
    if (state.linked(at)) return void state.sources.set(name, { why: `fetches ${show(at)} from main, which the project holds as no plain file (a link, a folder or a submodule), so main gives no script but what git prints of it`, how: `make ${show(at)} a plain file committed in the project, the script itself in place of the link, folder or submodule, so main gives it`, main });
    const from = libraryOf(command), held = from && state.inLibrary(from.library, from.rest);
    if (held === "link") return void state.sources.set(name, { why: `reads ${show(from.rest)} from the library ${show(from.library)}, which this project commits as a link, so the folder it leads to is the branch's to choose, not the submodule main pins`, how: `commit ${show(from.library)} as the submodule that carries the core (git submodule add), never as a link`, main });
    if (held === "other") return void state.sources.set(name, { why: `reads ${show(from.rest)} from the commit of ${show(from.library)} that main pins, which holds it as no plain file (a link, a folder or a submodule), so what runs is what git prints of it`, how: `make ${show(from.rest)} a plain file committed in ${show(from.library)}, the script itself in place of the link, folder or submodule, and pin that commit`, main });
    if (held === "unread") state.notRead.add(`${name}: the file ${show(from.rest)} of the commit of ${show(from.library)} that main pins was not read, since the submodule's repository is not at hand here, so whether it is a plain file is not known. To mend: bring it in (git submodule update --init ${from.library}), a submodule named as its path (git submodule add --name ${from.library}), which a hook reads it by`);
  }
}
