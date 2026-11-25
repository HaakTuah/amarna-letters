// What it reads as configured, in the files at the project's root that git does not ignore: `.claude/settings.json` and,
// where it is committed, `.claude/settings.local.json`, each hook by its event, matcher and command ("Stop: bash -c
// '...'") and each plug-in their "enabledPlugins" turn on ("name@marketplace"); `.mcp.json`, each tool server of its
// "mcpServers"; and `.claude/skills/`, each folder holding a SKILL.md; and what Kiro and Codex configure (#407), each
// named with its tool first: Kiro's hooks, in each JSON file directly under `.kiro/hooks` ("Kiro Stop: <command>"), and
// its tool servers in `.kiro/settings/mcp.json` ("Kiro <name>"); Codex's hooks in `.codex/hooks.json` and inline in
// `.codex/config.toml` ("Codex Stop: <command>"), the program config.toml's "notify" starts ("Codex notify: <its
// words>"), and its tool servers there ("Codex <name>"; toml.mjs reads it). What a person or a machine configures
// outside the repository is no file of the project's (floor rule 18); another tool's settings (Kiro's agents under
// `.kiro/agents`, say, or the plug-ins and marketplaces a Codex config names), and where a plug-in's marketplace or a
// tool server's command points, are the review's. Claude Code's, and the dispatch to Kiro's and Codex's, are read here.
import { parseBounded, DEEPEST } from "./guards.mjs";
import { readHooks, readCommands, readMarkets, addHook, NO_KIT, addServers, SERVERS, readFrontmatter, readShell } from "./agent-tools-read.mjs";
import { readEnv, readCodex } from "./agent-tools-codex.mjs";
import { canonical } from "./agent-tools-entries.mjs";
import { readKiro } from "./agent-tools-kiro.mjs";
import { pinsOf } from "./agent-tools-pins.mjs";

// The tools a project's files configure, as "kind name" keys, each with the file that configures it; the problems met
// reading them; `sources`, each hook that does not run its copy on main, with why (readSource()). `read(file)` gives a
// file's text or null; `skills()` the names of the folders under .claude/skills/ that hold a SKILL.md; `files(dir)` the
// names in a folder of the project (here .kiro/hooks); `linked(path)` whether the project, or main, holds a path as a
// link; `inLibrary(library, path)` what the commit that main pins of a library holds at a path of it: "file", "other"
// (a link, a folder or a submodule's entry) or "unread" (its objects are not at hand), null where no library is pinned.
export function configured(read, skills, files = () => [], linked = () => false, markdown = () => [], inLibrary = () => null) {
  // (each tool's name, as the list writes it, and what it is: for a hook its tool, event, matcher and the whole hook,
  // its type, command, timeout and all, which is what the kit's hooks and the base's are compared by)
  // (`texts`: each problem met reading a file, with that file's text, so one the base held as it stands can be told)
  // (`baselined`: those a project may hold, noted where there is no base to read against, as a pin is)
  const tools = new Map(), ids = new Map(), problems = [], sources = new Map(), servers = [], texts = new Map(), baselined = new Set(), unread = new Set(), notRead = new Set();
  const flag = (problem, file, text = read(file)) => { problems.push(problem); texts.set(problem, `${file}\0${text}`); };
  const add = (name, id) => ids.set(name, (ids.get(name) ?? new Set()).add(id));
  const state = { tools, problems, texts, baselined, flag, add, shapes: new Map(), clashed: new Set(), sources, servers, linked, unread, notRead, inLibrary };
  const json = file => {
    const text = read(file);
    if (text === null) return null;
    try { const v = parseBounded(text); if (v && typeof v === "object" && !Array.isArray(v)) return v; } catch { /* (below) */ }
    const problem = `${file} cannot be read as a JSON object, nested no deeper than ${DEEPEST} objects and lists. Mend: correct it to JSON, as the tool that reads it takes it`;
    flag(problem, file, text);
    return null;
  };
  // (a list, or any other value that is no object, is refused as the wrong shape, never read by its indexes; here and in
  // Kiro's and Codex's files, as `state.entries`)
  const entries = (file, key, v, form) => {
    if (v === undefined || v === null) return {};
    if (typeof v === "object" && !Array.isArray(v)) return v;
    flag(`${file}: "${key}" is not ${file.endsWith(".toml") ? "a TOML table" : "a JSON object"}. Mend: write it as one, of ${form}, as the tool that reads it takes it`, file);
    return {};
  };
  state.entries = entries;
  const markets = new Map(), plugins = [];
  for (const file of [".claude/settings.json", ".claude/settings.local.json"]) {
    const settings = json(file);
    declaredMarkets(settings, file, markets);
    readHooks(state, file, settings);
    readEnv(state, file, "env", settings?.env);
    readCommands(state, file, settings);
    readMarkets(state, file, settings);
    // (and a permission mode that lets Claude Code run all without asking, as a setting no starter kit writes)
    if (settings?.permissions?.defaultMode === "bypassPermissions") addHook(state, file, { tool: "", event: "permissions.defaultMode", matcher: "", hook: settings.permissions.defaultMode, runs: true, text: "bypassPermissions", commands: [NO_KIT], setting: true });
    for (const [name, on] of Object.entries(entries(file, "enabledPlugins", settings?.enabledPlugins, "each plug-in's \"name@marketplace\" to true"))) if (on) { tools.set(`plugin ${name}`, file); plugins.push(name); }
  }
  // (a plug-in is what its name and its marketplace's declared source make it, so one fetched from elsewhere is another;
  // of a marketplace of the "settings" kind, its own fields and this plug-in's entries alone, as pluginPin() reads it)
  for (const name of plugins) add(`plugin ${name}`, canonical(["plugin", name, marketOf(name, markets)]));
  addServers(state, ".mcp.json", entries(".mcp.json", "mcpServers", json(".mcp.json")?.mcpServers, SERVERS), "");
  for (const name of skills()) { tools.set(`skill ${name}`, `.claude/skills/${name}/SKILL.md`); add(`skill ${name}`, `skill ${name}`); readFrontmatter(state, `.claude/skills/${name}/SKILL.md`, read(`.claude/skills/${name}/SKILL.md`)); readShell(state, `.claude/skills/${name}/SKILL.md`, read(`.claude/skills/${name}/SKILL.md`)); }
  for (const file of markdown()) { readFrontmatter(state, file, read(file)); if (/^\.claude\/commands\//iu.test(file.normalize("NFC"))) readShell(state, file, read(file)); }
  readKiro(state, json, files);
  readCodex(state, json, read);
  return { tools, ids, problems, texts, baselined, sources, unread, notRead, pins: pinsOf(plugins, markets, servers) };
}
// What a plug-in's marketplace declares of it, for its id: the source, or of a "settings" source its own fields and the
// entries of this plug-in's name.
function marketOf(name, markets) {
  const at = name.lastIndexOf("@");
  if (at <= 0) return null; // (a plug-in named with no marketplace, as pluginPin() reads it)
  const source = markets.get(name.slice(at + 1))?.source ?? null;
  if (source?.source !== "settings" || !Array.isArray(source.plugins)) return source;
  return { market: Object.fromEntries(Object.entries(source).filter(([k]) => k !== "plugins")), items: source.plugins.filter(p => p?.name === name.slice(0, at)) };
}
// The marketplaces one settings file declares, each by its name with its source and file, into `markets`: read
// settings.json then settings.local.json, so the second's stand above the first's, as Claude Code reads them.
function declaredMarkets(settings, file, markets) {
  const declared = settings?.extraKnownMarketplaces;
  if (!declared || typeof declared !== "object" || Array.isArray(declared)) return;
  for (const [name, m] of Object.entries(declared)) markets.set(name, { source: m?.source, file });
}
