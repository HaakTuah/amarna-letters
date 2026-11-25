// A listed plug-in or tool server is held to the pin its own configuration gives, where it gives one in a form read here
// (#352; Claude Code's plug-in and tool-server documentation): a plug-in by its marketplace in "extraKnownMarketplaces",
// a "github" or "git" source at the full commit its "ref" names, or a "settings" source whose entry for it fetches it at
// its "sha" (a "github", "url" or "git-subdir" source) or its exact version (an "npm" source); a tool server of
// `.mcp.json` that npx starts, by the version its package names in its arguments. There the list's version is the pin,
// letter for letter, and a form that takes a pin but names none, or names a range or tag, fails as fetched at no fixed
// version. Elsewhere (a marketplace the project does not declare, a hosted server, another command) whether the listed
// version is the one run stays the review's.
import { exact } from "./exact-versions.mjs";
import { show } from "./agent-tools-entries.mjs";

const COMMIT = /^[0-9a-f]{40}$/u; // (a full commit, as git writes it and Claude Code takes it)
const commit = v => typeof v === "string" && COMMIT.test(v);
// (how a "ref" or "sha" that pins nothing reads: none, a branch or tag, or what is no text at all)
const takes = (v, none) => (v === undefined ? none : typeof v === "string" ? `the branch or tag ${show(v)}` : `the value ${show(v)}, which names no commit`);
// The pins of the plug-ins turned on and the tool servers, by their "kind name" keys, where their configuration gives
// one (pluginPin() and serverPin(), below); `servers` holds each as [key, file, name, its entry].
export function pinsOf(plugins, markets, servers) {
  const pins = new Map();
  for (const name of plugins) { const p = pluginPin(name, markets); if (p) pins.set(`plugin ${name}`, p); }
  for (const [key, file, name, server] of servers) { const p = serverPin(file, name, server); if (p) pins.set(key, p); }
  return pins;
}
// What a plug-in's or tool server's own configuration fixes it at: { pin, where } where it names one exact version or a
// full commit; { loose, where, mend } where it is fetched in a form that takes a pin but names none, or a range or tag;
// null where the configuration names nothing read here, which leaves it to the review. Each also holds `from`, the whole
// configuration it was read from (the marketplace's source, the server's entry), never printed: what makes a breach
// the base held the same one, so that a tool given another source or package is no longer held.
const npmSpec = spec => (typeof spec === "string" ? /^((?:@[^\s/@]+\/)?[^\s/@:]+)(?:@(.*))?$/u.exec(spec) : null);
function npmPin(spec, version, where, field, from) {
  const parts = npmSpec(spec);
  if (!parts) return null; // (a link, a path or a git address: the review's)
  const v = parts[2] ?? version;
  if (exact(v)) return { pin: v, where, from };
  return { from, loose: v === undefined ? "names no version, so the newest is fetched" : `names the version ${show(v)}, which is no one exact version`, where, mend: `write it ${field(parts[1])}` };
}
function pluginPin(name, markets) {
  const at = name.lastIndexOf("@");
  const market = at > 0 ? markets.get(name.slice(at + 1)) : undefined;
  const source = market?.source;
  if (!source || typeof source !== "object") return null;
  const where = `the marketplace ${show(name.slice(at + 1))} in ${market.file}`;
  if (source.source === "github" || source.source === "git") {
    if (commit(source.ref)) return { pin: source.ref, where, from: source };
    return { from: source, loose: `takes ${takes(source.ref, "its repository's default branch")}`, where, mend: `set its "ref" to the full 40-character commit of the marketplace meant` };
  }
  if (source.source !== "settings" || !Array.isArray(source.plugins)) return null;
  const item = source.plugins.find(p => p?.name === name.slice(0, at)), entry = item?.source;
  // (what it was read from: every entry of this plug-in's name, so that adding one is a change, and the marketplace's
  // other fields; not its other plug-ins' entries)
  const from = { market: Object.fromEntries(Object.entries(source).filter(([k]) => k !== "plugins")), items: source.plugins.filter(p => p?.name === name.slice(0, at)) };
  const its = `${where}, by its entry for ${show(name.slice(0, at))},`;
  if (from.items.length > 1) return { from, loose: `holds ${from.items.length} entries for ${show(name.slice(0, at))}, so which one is fetched is not plain`, where, mend: "keep one entry for it, fetched at one commit or exact version" };
  if (["github", "url", "git-subdir"].includes(entry?.source)) {
    if (commit(entry.sha)) return { pin: entry.sha, where: its, from };
    return { from, loose: entry.sha === undefined ? `names no "sha", so it takes ${takes(entry.ref, "the repository's default branch")}` : `gives as its "sha" ${show(entry.sha)}, which is no full commit as git writes one`, where: its, mend: `set the entry's "sha" to the full 40-character commit meant` };
  }
  if (entry?.source === "npm") return npmPin(entry.package, entry.version, its, pkg => `with its "package" as "${pkg}" and its "version" one exact version, such as 1.2.3`, from);
  return null;
}
// (npx's own options, read before the package it runs; one it does not know here leaves the server to the review)
const NPX_FLAGS = new Set(["-y", "--yes", "-q", "--quiet"]);
function serverPin(file, name, server) {
  const args = npxArgs(server);
  if (!args) return null;
  const spec = npxPackage(args);
  if (spec === null) return null;
  return npmPin(spec, undefined, `${file}, in the arguments of ${show(name)},`, pkg => `in those arguments as "${pkg}@" and one exact version, such as ${pkg}@1.2.3`, server);
}
// The arguments npx is given, where a stdio server is started by npx, as on Windows through cmd /c too; else null.
function npxArgs(server) {
  if (!server || typeof server !== "object" || (server.type ?? "stdio") !== "stdio" || typeof server.command !== "string") return null;
  const program = text => String(text).replace(/\\/gu, "/").split("/").pop().toLowerCase().replace(/\.(?:cmd|exe)$/u, "");
  let args = Array.isArray(server.args) ? server.args : [];
  let command = program(server.command);
  if (command === "cmd" && /^\/c$/iu.test(args[0] ?? "")) { command = program(args[1] ?? ""); args = args.slice(2); }
  return command === "npx" && args.every(a => typeof a === "string") ? args : null;
}
// The package npx runs, from its arguments: the one its -p or --package names, else the first after its own options;
// null where it is given two, or an option not read here (the review's).
function npxPackage(args) {
  let spec, i = 0;
  for (; i < args.length; i++) {
    const a = args[i];
    if (NPX_FLAGS.has(a)) continue;
    const named = a === "-p" || a === "--package" || a.startsWith("--package=");
    if (named && spec !== undefined) return null;
    if (named) { spec = a.startsWith("--package=") ? a.slice(10) : args[++i]; continue; }
    if (a === "--") i++;
    else if (a.startsWith("-")) return null;
    break;
  }
  return spec ?? args[i];
}
