// The ways of running sessions (tasks/ways.md, "A way of running sessions has a part of its own"; #397), as a machine
// reads them: each part of that module stands under a heading "## <what the way is>: `<its name>`", and holds, in this
// order, an item for each label of LABELS. Its line "*Installs:*" says "none", "not yet" (with its issue), or each hook
// or setting the way writes into an agent tool's own folder, in backticks as the agent-tools check names it ("hook
// Stop: <its command>"). Read by the agent-tools check (agent-tools.mjs, what a way installs), by the staged cases
// (staged.mjs, the names a run may give) and by the tools' offer (tools-offer.mjs, which fails a part out of form).
// The module beside this file's folder, so a project reads its copy's. Node's own modules only.
//
//   import { readWays, waysOf } from "./ways.mjs";
import fs from "node:fs";

export const MODULE = "tasks/ways.md";
export const LABELS = ["*Task:*", "*State:*", "*Review:*", "*Installs:*", "*Floor:*"];
const HEADING = /^## (.*)$/u, NAMED = /: `([a-z][a-z0-9-]{0,39})`$/u;
const INSTALLS = "*Installs:*";
// (a hook, as the agent-tools check names one: what a way installs is a hook or setting, never a plug-in, tool server
// or skill, which would skip that check's pin of its version)
const TOOL = /^hook \S/u;

// The parts of the module's text: { ways: [{ name, installs, problem? }], problems }, `installs` the keys the part's
// line "*Installs:*" names (an empty list for "none"; null for "not yet", which the check expects nothing of), and
// `problem` what is wrong with that line's form; each problem saying where and its mend.
export function readWays(text) {
  const ways = [], problems = [];
  const lines = String(text ?? "").replace(/\r\n/gu, "\n").split("\n");
  let part = null, item = null;
  const close = () => {
    if (!part) return;
    const order = part.items.map(i => i.label);
    if (LABELS.some(l => !order.includes(l)) || order.some((l, i) => l !== LABELS[i])) {
      problems.push(`${MODULE}: the part \`${part.name}\` holds ${order.length ? order.join(", ") : "none of its labels"}, where each part holds ${LABELS.join(", ")}, once each and in that order. Mend: give the part an item for each label, in that order, each opening "- " and the label`);
    }
    const line = part.items.find(i => i.label === INSTALLS);
    const { installs, problem } = line ? installed(part.name, line.text) : { installs: [] };
    if (problem) problems.push(problem);
    ways.push({ name: part.name, installs, ...(problem ? { problem } : {}) });
  };
  for (const line of lines) {
    const h = HEADING.exec(line);
    if (h) {
      close();
      item = null;
      const name = NAMED.exec(h[1])?.[1];
      if (!name) { part = null; problems.push(`${MODULE}: the heading "${h[1].slice(0, 120)}" names no way. Mend: end it with ": " and the way's name in backticks, lower-case letters, digits and hyphens, as "## The cloud: \`cloud\`"`); continue; }
      if (ways.some(w => w.name === name)) problems.push(`${MODULE}: the way \`${name}\` has two parts. Mend: keep one part for it, or give the other way a name of its own`);
      part = { name, items: [] };
      continue;
    }
    if (!part) continue;
    const label = /^- (\*[^*\n]+:\*)(.*)$/u.exec(line);
    // (an item runs on over the lines indented under it)
    if (label) part.items.push(item = { label: label[1], text: label[2].trim() });
    else if (item && /^ {2}\S/u.test(line)) item.text += ` ${line.trim()}`;
    else item = null;
  }
  close();
  return { ways, problems };
}

// What one line "*Installs:*" names, after its label: { installs } ([] for "none", null for "not yet", else each key in
// backticks), with a `problem` where the line is in none of these forms.
function installed(name, rest) {
  if (/^none\b/u.test(rest)) return { installs: [] };
  if (/^not yet(?:: #\d+)?\b/u.test(rest)) return { installs: null };
  const keys = [...rest.matchAll(/`([^`\n]+)`/gu)].map(m => m[1]);
  if (keys.length && keys.every(k => TOOL.test(k))) return { installs: keys };
  return { installs: [], problem: `${MODULE}: the part \`${name}\`'s line ${INSTALLS} is in no form read here. Mend: write "none", "not yet: #<the issue that reads it>", or each hook or setting the way writes into an agent tool's folder in backticks, as the agent-tools check names it, such as \`hook Stop: <its command>\`` };
}

// The ways as the module beside this script's folder holds them (a project's copy's, in a project), or none, with a
// problem, where it cannot be read.
export function waysOf(read = () => fs.readFileSync(new URL(`../${MODULE}`, import.meta.url), "utf8")) {
  let text;
  try { text = read(); } catch (e) { return { ways: [], problems: [`${MODULE} cannot be read (${String(e.message).split("\n")[0]}). Mend: put the core's ${MODULE} back as the core holds it`] }; }
  return readWays(text);
}
