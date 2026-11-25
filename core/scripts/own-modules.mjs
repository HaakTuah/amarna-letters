// The core takes its own modules (AGENTS.md, "The core abides by its own rules"; core archive 213; #255): each file of
// roles/shared/, tasks/ and tools/ is named in the section of the core's AGENTS.md that says what this repository takes, read there at the
// start of every task or when needed, or is listed under that section's "Not taken" with the reason it cannot apply to
// a repository of rules and scripts. It fails a module the section names nowhere, a name there that is no module, a
// module listed as not taken with no reason or in no form it can read, and one both listed so and named elsewhere in
// the section. Whether a reason holds stays with the reviews. This repository only: no project runs it, though
// manifest-reads.mjs, beside this file, reads this section's list with it. Its tests workflow runs it on every pull
// request here and every push to main (.github/workflows/tests.yml). It checks the repository it lies in, from any
// directory; Node's own modules only.
//
//   node scripts/own-modules.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MODULES } from "./reading.mjs";
import { started } from "./started.mjs";

export const SECTION = "## The core this repository takes";
const NOT_TAKEN = /^Not taken\b/u;
const AT = MODULES.map(d => d.replace("/", "\\/")).join("|");
const NAMED = new RegExp(`(?:^@|\`)((?:${AT})\\/[^\`\\s/]+\\.md)`, "gmu");
const BULLET = new RegExp(`^- \`((?:${AT})\\/[^\`\\s/]+\\.md)\`:(.*)$`, "u");

// What AGENTS.md (its text) says of the modules this repository takes: the section's lines, the modules it names as
// taken (where it is read), the "Not taken" list with each reason, and what is wrong with the list's form. `error`
// says the section is missing.
export function readSection(agents) {
  const lines = String(agents).split(/\r?\n/u);
  const start = lines.indexOf(SECTION);
  if (start < 0) return { error: `AGENTS.md has no section "${SECTION.slice(3)}", which names the modules this repository takes. Mend: put the section back, naming each module of modules/ or listing it under "Not taken" with its reason` };
  let end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
  if (end < 0) end = lines.length;
  const section = lines.slice(start + 1, end);
  const found = [];
  // the "Not taken" list: the bullets right after its line, each `modules/<name>`: its reason, a reason going on in
  // lines indented by two spaces
  const notTaken = new Map(), inList = new Set();
  const head = section.findIndex(l => NOT_TAKEN.test(l));
  if (head >= 0) {
    let i = head + 1;
    while (i < section.length && section[i].trim() === "") i++;
    let current = null;
    for (; i < section.length && (section[i].startsWith("- ") || (current !== null && section[i].startsWith("  "))); i++) {
      inList.add(i);
      if (section[i].startsWith("  ")) { notTaken.set(current, `${notTaken.get(current)} ${section[i].trim()}`); continue; }
      const m = BULLET.exec(section[i]);
      if (!m) { found.push(`AGENTS.md, "Not taken": "${section[i]}" is not in the form it reads. Mend: write it - \`<its folder>/<name>.md\`: <the reason>`); current = null; continue; }
      if (notTaken.has(m[1])) found.push(`AGENTS.md, "Not taken": ${m[1]} is listed twice. Mend: keep one of its lines, with its reason`);
      current = m[1];
      notTaken.set(current, m[2].trim());
    }
  }
  const taken = new Set();
  section.forEach((l, i) => { if (!inList.has(i)) for (const m of l.matchAll(NAMED)) taken.add(m[1]); });
  return { section, taken, notTaken, found };
}

// What is wrong, one line each, with how AGENTS.md (its text) holds the modules (their file names): an empty list where
// nothing is.
export function faults(agents, modules) {
  const { error, taken, notTaken, found } = readSection(agents);
  if (error) return [error];
  const all = new Set(modules);
  // (a manifest takes or leaves out a module by its file's name alone, so a name stands in one folder of the modules)
  const byName = new Map();
  for (const m of [...all].sort()) byName.set(path.posix.basename(m), [...(byName.get(path.posix.basename(m)) ?? []), m]);
  for (const [name, at] of byName) if (at.length > 1) found.push(`${name} stands in ${at.length} folders of the modules (${at.join(", ")}), and a manifest names a module by its file's name alone. Mend: give one of them a name of its own, or join the two`);
  for (const name of [...taken, ...notTaken.keys()].filter(n => !all.has(n)).sort()) {
    found.push(`AGENTS.md, "${SECTION.slice(3)}", names ${name}, which is no module of the core. Mend: correct the name, or take it out where the module is gone`);
  }
  for (const name of [...all].sort()) {
    if (notTaken.has(name)) {
      if (notTaken.get(name) === "") found.push(`AGENTS.md, "Not taken": ${name} has no reason. Mend: give why it cannot apply to a repository of rules and scripts, or take it`);
      if (taken.has(name)) found.push(`AGENTS.md, "${SECTION.slice(3)}": ${name} is both taken and listed as not taken. Mend: keep one`);
    } else if (!taken.has(name)) {
      found.push(`${name} is neither taken nor given a reason. Mend: name it in AGENTS.md, "${SECTION.slice(3)}", where it is read, or list it there under "Not taken" with why it cannot apply here`);
    }
  }
  return found;
}

// What the check prints and exits with, read from the core's own AGENTS.md and modules where `root` stands:
// { status, out, err } (the lines for stdout and stderr).
export function report(root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")) {
  let agents, modules;
  try {
    agents = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
    modules = MODULES.flatMap(d => fs.readdirSync(path.join(root, d)).filter(f => f.endsWith(".md")).map(f => `${d}/${f}`));
  } catch (e) {
    return { status: 1, out: [], err: [`FAIL: AGENTS.md or a folder of the modules could not be read (${e.message}). Mend: run it from a clone of the core, where both stand`] };
  }
  const found = faults(agents, modules);
  if (found.length) return { status: 1, out: [], err: found.map(f => `FAIL: ${f}`) };
  return { status: 0, out: [`each of the ${modules.length} modules is taken here, or given its reason`], err: [] };
}

function main() {
  const { status, out, err } = report();
  for (const line of err) console.error(line);
  for (const line of out) console.log(line);
  return status;
}

if (started(import.meta.url)) process.exitCode = main();
