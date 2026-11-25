// The agent-tools list's own entries, and the words that name one: each entry's kind, name, publisher and version read
// for what it must hold (agent-tools.mjs, which reads the list against what is configured).
import { exact } from "./exact-versions.mjs";

const KINDS = { plugin: "the plug-in", server: "the tool server", skill: "the skill", hook: "the hook" };
const PINNED = new Set(["plugin", "server"]); // (the kinds that must give a version: neither is a file of the project's)
// (what an entry's "from" may say of a hook not in the kit's form, as the base held it: that it takes a file of the
// project from the working tree, or, where its command has git show a file of main in a form of its own, from main: a
// mark of what the command names, never that main's copy is what runs, which stays a judgement; #1273)
export const TREE = "the working tree", MAIN = "main";
// (the mark that fits a hook's source, as agent-tools-read.mjs reads it)
export const markOf = source => (source?.main ? MAIN : TREE);
export const show = value => JSON.stringify(value) ?? String(value);
// The list a config holds: { keys, versions, from, problems }, keys the "kind name" of each well-formed entry, versions
// its version by the same key, from the keys of the hooks whose entry says "from" to what it says, "the working tree" or
// "main" (the baseline of those that stood before the check read where a hook's command comes from); null where the
// config holds no "agentTools".
export function listed(config, file) {
  if (!config || !Object.hasOwn(config, "agentTools")) return null;
  const list = config.agentTools, keys = new Set(), versions = new Map(), from = new Map(), problems = [];
  if (!Array.isArray(list)) return { keys, versions, from, problems: [`${file}: "agentTools" is no list. Mend: write it as a list of entries, each { "kind", "name", "publisher", "version" }`] };
  list.forEach((entry, i) => {
    const at = `${file}: "agentTools" entry ${i + 1}${typeof entry?.name === "string" ? ` (${show(entry.name)})` : ""}`;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) { problems.push(`${at} is no entry. Mend: write it as { "kind", "name", "publisher", "version" }`); return; }
    const bad = entryProblems(entry);
    for (const b of bad) problems.push(`${at}: ${b}`);
    if (bad.length) return;
    keys.add(`${entry.kind} ${entry.name}`);
    versions.set(`${entry.kind} ${entry.name}`, entry.version);
    if (Object.hasOwn(entry, "from")) from.set(`${entry.kind} ${entry.name}`, entry.from);
  });
  return { keys, versions, from, problems };
}
// What is wrong with one entry of the list, each with its mend.
function entryProblems(entry) {
  const bad = [], version = entry.version;
  if (!Object.hasOwn(KINDS, entry.kind)) bad.push(`its kind ${show(entry.kind)} is none of ${Object.keys(KINDS).join(", ")}. Mend: write the kind it is`);
  if (typeof entry.name !== "string" || !entry.name.trim()) bad.push(`it names no tool. Mend: write the name it is configured by`);
  if (typeof entry.publisher !== "string" || !entry.publisher.trim()) bad.push(`it names no publisher. Mend: write who publishes it, "this project" for a file of its own`);
  if (version === undefined ? PINNED.has(entry.kind) : !(exact(version) || /^[0-9a-f]{40}$/u.test(version)))
    bad.push(`${version === undefined ? "it gives no version" : `its version ${show(version)} is not one exact version`}. Mend: write the one it is taken at, such as 1.2.3, or the full 40-character commit`);
  if (Object.hasOwn(entry, "from") && (![TREE, MAIN].includes(entry.from) || entry.kind !== "hook"))
    bad.push(`its "from" is ${show(entry.from)}, where only a hook's entry may say "from", and only ${show(TREE)} or ${show(MAIN)}. Mend: take "from" out of the entry`);
  return bad;
}
// A value as JSON with every object's keys in order, so that a hook is the same whichever order its keys are written in.
export const canonical = value => JSON.stringify(value, (_, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v));
export const describe = key => { const at = key.indexOf(" "); return `${KINDS[key.slice(0, at)]} ${show(key.slice(at + 1))}`; };
// A name as a file system that folds case compares it: wholly, so a letter whose upper case is another's ("\u017f" and
// "s") is the same, which lower case alone does not make it; and in one of Unicode's normal forms, NFC, as macOS's
// compares a letter written whole and one written with a joining mark.
export const fold = name => name.normalize("NFC").toUpperCase().toLowerCase().normalize("NFC");
