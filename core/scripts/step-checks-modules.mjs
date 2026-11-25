// What the steps of the modules a project takes read and write (#1094): the modules its manifest's list neither takes
// nor leaves out, each placed from what is read exactly (manifest-reads.mjs, `factsOf` and `placeOf`), and the line
// "Modules to confirm:" that asks the owner once where a module's taking is a choice. The steps of the sync notes 160,
// 470, 480 and 500 name the modules they place, written by step-writers.mjs's `writePlaced`; that of 23 November 2026,
// the confirmation. It reads only. Node's own modules only.
import { GAME_ROWS } from "./init.mjs";
import { oneLine } from "./guards.mjs";
import { CONFIRM, factsOf, heldIn, listOf, moduleNames, modulesOf, placed, toConfirm, toPlace } from "./manifest-reads.mjs";
import { HERE, shown } from "./step-checks.mjs";
import { movedModules } from "./step-checks-moved.mjs";
import { Unread } from "./workflow-calls.mjs";

const MANIFEST = "core-manifest.md";
// Each name of the "Modules:" list, as written (`raw`), that is no module of `known` and that the core moved (`movedTo`):
// { raw, name, to (the path its text went to), module (the module that holds it now, or null where it went to a file no
// project takes as a module, a role's), out (that module stands on the line "Not taken:", where the owner left it) }
// (#1259, point 1).
function movedOn(manifest, known, movedTo) {
  const at = String(manifest).split(/\r?\n/u).find(l => /\bModules:/u.test(l)), list = at === undefined ? null : listOf(at), { notTaken } = modulesOf(manifest);
  return (list?.items ?? []).filter(i => i.name && !known.includes(i.name) && Object.hasOwn(movedTo, i.name)).map(i => {
    const module = heldIn(movedTo[i.name], known);
    return { raw: i.raw.trim(), name: i.name, to: movedTo[i.name], module, out: module !== null && notTaken.has(module) };
  });
}
// The manifest with each name of `moved` (movedOn) on its "Modules:" list put as the module its text went to, in the
// list's own form, or taken out where it went to no module, that module stands there already or the line "Not taken:"
// names it; the rest as it stood.
function unmoved(manifest, moved) {
  if (!moved.length) return manifest;
  const eol = /\r\n/u.test(manifest) ? "\r\n" : "\n", lines = String(manifest).split(/\r?\n/u);
  const at = lines.findIndex(l => /\bModules:/u.test(l)), { head, tail, ticks, items } = listOf(lines[at]);
  const byName = new Map(moved.map(m => [m.name, m])), has = new Set(items.filter(i => !byName.has(i.name)).map(i => i.name)), raws = [];
  for (const i of items) {
    const m = byName.get(i.name);
    if (!m) { raws.push(i.raw.trim()); continue; }
    if (!m.module || m.out || has.has(m.module)) continue;
    has.add(m.module);
    raws.push(/\.md$/u.test(i.raw.trim()) ? m.module : m.module.replace(/\.md$/u, ""));
  }
  lines[at] = `${head}${raws.map(r => ticks ? `\`${r}\`` : r).join(", ")}${tail}`;
  return lines.join(eol);
}
// The names of the manifest's "Modules:" list that the core moved out of its modules (`movedOn`),
// which the step that places every module (no `only`) brings to where their text went (#1259, point 1).
const movedIn = (p, known = moduleNames(HERE)) => movedOn(p.manifest, known, movedModules());
// The modules of the core this script stands in (`only` of them, where given; those of `except` left aside) the project's
// manifest neither takes nor leaves out, each with its place, read with each name the core moved where its text went;
// Unread where its "Modules:" line cannot be read, naming each name on it that is no module.
export function places(p, { only = null, except = [] } = {}) {
  const facts = factsOf({ manifest: p.manifest, files: p.files, gameSlots: GAME_ROWS.map(([slot]) => slot) });
  const known = moduleNames(HERE), manifest = unmoved(p.manifest, movedIn(p, known));
  const left = toPlace(manifest, known.filter(n => !except.includes(n)), facts, only, known);
  if (left === null) {
    const { line, unknown } = modulesOf(p.manifest, known, movedModules());
    const none = unknown.length ? ` (${unknown.map(n => `\`${shown(n)}\``).join(", ")} ${unknown.length > 1 ? "are" : "is"} no module of the core)` : "";
    throw new Unread(line ? `the "Modules:" line of \`${MANIFEST}\` ("${line.slice(0, 120)}") is neither "all" nor a list of the core's modules${none}, each by its name, parted by commas` : `\`${MANIFEST}\` has no "Modules:" line to read`);
  }
  return left;
}
// The manifest as the step's writer writes it: each name the core moved brought to where its text went (by the step
// that places every module alone), then each module placed.
export function rewritten(p, opts = {}) {
  const left = places(p, opts), manifest = opts.only ? p.manifest : unmoved(p.manifest, movedIn(p));
  return left.length ? placed(manifest, left) : manifest;
}
export const named = list => list.map(p => `\`${shown(p.name)}\``).join(", ");
// A step's check: null where it places nothing and brings no moved name over; else its mend, which `node
// core/scripts/steps.mjs --write` makes.
export const placing = opts => p => {
  const left = places(p, opts), moved = opts.only ? [] : movedIn(p);
  if (!left.length && !moved.length) return null;
  const take = left.filter(l => l.take && !l.choice), out = left.filter(l => !l.take), chosen = left.filter(l => l.choice);
  const line = /^.*\bModules:.*$/mu.exec(rewritten(p, opts))?.[0] ?? "";
  return [`In one small pull request, bring the "Modules:" list of \`${MANIFEST}\` to the core's modules as \`node core/scripts/steps.mjs --write\` writes it:`,
    moved.length && `${moved.map(m => `\`${shown(m.raw)}\` is no module of the core now: its text moved to \`core/${shown(m.to)}\`${!m.module ? ", a file no project takes as a module, so the name goes" : m.out ? `, and \`${shown(m.module)}\` stands on the line "Not taken:", so the name goes` : `, so \`${shown(m.module)}\` takes its place`}`).join("; ")};`,
    left.length && "place each module the list neither takes nor leaves out:",
    take.length && `add ${named(take)} to the "Modules:" list, which what the project holds calls for (${take.map(l => `${l.name}: ${l.why}`).join("; ")});`,
    out.length && `add ${out.map(l => `\`${l.name}\` (${l.why})`).join(", ")} to the line "Not taken:";`,
    chosen.length && `add ${named(chosen)} to the "Modules:" list, as the starter kit takes them, and to the line "${CONFIRM}", which asks the owner once whether each fits.`,
    moved.length && `The line then reads "${oneLine(line)}".`]
    .filter(Boolean).join(" ");
};
// The confirmation's check: null where the manifest has no line "Modules to confirm:" or it names none.
export const confirmed = p => {
  const asked = [...toConfirm(p.manifest)].sort();
  return !asked.length ? null : `The owner confirms that ${asked.map(n => `\`${shown(n)}\``).join(", ")}, taken as the starter kit takes them, fit the project; meanwhile each binds, and nothing waits. Then, in one small pull request, a session moves each the owner leaves out from the "Modules:" list of \`${MANIFEST}\` to its line "Not taken:" with the owner's reason, and takes the line "${CONFIRM}" out.`;
};
