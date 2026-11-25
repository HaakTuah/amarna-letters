// What Codex configures (#407): its hooks, in `.codex/hooks.json` and inline in `.codex/config.toml`, the program
// config.toml's "notify" starts, its tool servers there, and the variables its shell environment policy sets (the KEPT
// lists below), each named with "Codex" first; toml.mjs reads the TOML.
import { parseToml, TomlUnreached } from "./toml.mjs";
import { readHooks, addHook, NO_KIT, addServers, SERVERS } from "./agent-tools-read.mjs";

// What Codex configures in the project (tools/codex.md; its pages on hooks and on its config, read on 16 November
// 2026): the hooks of .codex/hooks.json, and those written inline in .codex/config.toml under "hooks", both as Claude
// Code's are, each named "Codex <event> <matcher>: <command>"; config.toml's "notify", the program Codex starts at
// each turn's end, as the hook "Codex notify: <its words>"; and config.toml's "mcp_servers", as "Codex <name>".
// A program's words as the one command a shell would run them as: a word that needs no quote as written and any other
// single-quoted, so a fetch keeps its context, the kit's form given as bash, -c and its script reads as the kit's, and
// "scripts/my hook.py" stays one path.
const shellWords = words => words.map(w => (/^[\w./:@%+,=-]+$/u.test(w) ? w : `'${w.replace(/'/gu, "'\\''")}'`)).join(" ");
export function readCodex(state, json, read) {
  const hooksFile = json(".codex/hooks.json");
  state.entries(".codex/hooks.json", "hooks", hooksFile?.hooks, "each event to its hooks");
  readHooks(state, ".codex/hooks.json", hooksFile, "Codex");
  const text = read(".codex/config.toml");
  if (text === null) return;
  let config;
  try { config = parseToml(text); } catch (e) {
    // (left unread where the TOML package could not be installed, the registry not answering: never a problem of the file)
    if (e instanceof TomlUnreached) { state.unread.add(".codex/config.toml"); return; }
    const problem = `.codex/config.toml cannot be read as TOML (${e.message}). Mend: correct it to TOML, as Codex reads it`;
    state.flag(problem, ".codex/config.toml", text);
    return;
  }
  state.entries(".codex/config.toml", "hooks", config.hooks, "each event to its hooks");
  readHooks(state, ".codex/config.toml", config, "Codex");
  const notify = config.notify;
  if (Array.isArray(notify) && notify.length && notify.every(w => typeof w === "string")) {
    // (its words are a program and its arguments, each one whole, read as shellWords reads them)
    addHook(state, ".codex/config.toml", { tool: "Codex", event: "notify", matcher: "", hook: notify, runs: true, text: notify.join(" "), commands: [shellWords(notify)] });
  }
  // (a model provider, which says where Codex sends a key and which commands it runs by itself to print one: read whole
  // as a setting no starter kit writes, so one the pull request adds or changes is new, its commands named as notify's)
  for (const [id, provider] of Object.entries(state.entries(".codex/config.toml", "model_providers", config.model_providers, "each provider's id to its settings"))) {
    const words = [provider?.auth, provider?.gateway_oauth?.credential_export].filter(part => part?.command !== undefined).map(part => [part.command, ...(Array.isArray(part.args) ? part.args : [])]);
    if (!words.flat().every(w => typeof w === "string")) { state.flag(`.codex/config.toml: "model_providers.${id}" holds a command or arguments that are no text. Mend: write them as Codex takes them`, ".codex/config.toml"); continue; }
    addHook(state, ".codex/config.toml", { tool: "Codex", event: `model_providers.${id}`, matcher: "", hook: provider ?? null, runs: true, text: words.length ? words.map(w => w.join(" ")).join("; ") : "its settings", commands: [NO_KIT, ...words.map(shellWords)], setting: true });
  }
  addServers(state, ".codex/config.toml", state.entries(".codex/config.toml", "mcp_servers", config.mcp_servers, SERVERS), "Codex ");
  const policy = state.entries(".codex/config.toml", "shell_environment_policy", config.shell_environment_policy, "its settings");
  readEnv(state, ".codex/config.toml", "shell_environment_policy.set", policy.set);
  // (and each profile's, which replaces it where the profile is chosen)
  for (const [name, profile] of Object.entries(state.entries(".codex/config.toml", "profiles", config.profiles, "each profile's name to its settings"))) {
    const its = state.entries(".codex/config.toml", `profiles.${name}`, profile, "its settings");
    readEnv(state, ".codex/config.toml", `profiles.${name}.shell_environment_policy.set`, state.entries(".codex/config.toml", `profiles.${name}.shell_environment_policy`, its.shell_environment_policy, "its settings").set);
  }
}
// The variables a tool's settings may set for the programs it starts, each named whole and kept for its reason: any
// other may change how a program a hook runs starts (a shell, git, ssh, Node, the system's loader) or where the tool
// itself finds what it runs (its plug-ins, its shell), so that main's copy is not all it runs (floor rule 3), or where
// it sends the owner's sign-in (floor rule 18), and no list of such names can be shown whole, so the variables kept are
// listed instead, as plain names; a name of other letters is none of them.
const KEPT = [
  // (the models Claude Code asks for, by name: it alone reads them; not where it sends its requests or with what)
  /^(?:ANTHROPIC_MODEL|ANTHROPIC_SMALL_FAST_MODEL|ANTHROPIC_DEFAULT_(?:OPUS|SONNET|HAIKU|FABLE)_MODEL)$/iu,
  // (Claude Code's limits, timeouts and effort: how long or how much, never what runs)
  /^(?:MAX_THINKING_TOKENS|MCP_TIMEOUT|MCP_TOOL_TIMEOUT|API_TIMEOUT_MS|BASH_DEFAULT_TIMEOUT_MS|BASH_MAX_TIMEOUT_MS|BASH_MAX_OUTPUT_LENGTH|CLAUDE_CODE_MAX_OUTPUT_TOKENS|CLAUDE_CODE_EFFORT_LEVEL)$/iu,
  // (switches that turn a report or a call that is not needed off)
  /^(?:DISABLE_TELEMETRY|DISABLE_ERROR_REPORTING|CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC|DO_NOT_TRACK)$/iu,
  // (switches programs read for their output or time zone, never to find what to run)
  /^(?:CI|TZ|NO_COLOR|FORCE_COLOR)$/iu,
];
const kept = name => /^[A-Za-z_][A-Za-z0-9_]*$/u.test(name) && KEPT.some(k => k.test(name));
// Each such variable a tool's setting `key` in `file` sets, as a problem with the entry's own text, so one the base held
// is noted while that entry stands, whatever else of the file changes.
export function readEnv(state, file, key, env) {
  for (const [name, value] of Object.entries(state.entries(file, key, env, "each variable's name to its value"))) {
    if (kept(name)) continue;
    const problem = `${file}: "${key}" sets the variable "${name}", which is none of those a tool's settings may set (the agent-tools check's KEPT): another may change how the programs a hook runs start, so nothing shows a hook runs main's copy alone (floor rule 3). Mend: take it out of "${key}", in this pull request; where a tool needs it, the owner sets it on the machine, or, where it is a tool's own setting that no program a hook runs reads, its name joins KEPT with its reason`;
    state.problems.push(problem);
    state.texts.set(problem, `${file}\0${key}\0${name}\0${JSON.stringify(value)}`);
    state.baselined.add(problem);
  }
}
