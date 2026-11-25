// Which of the core's checks that read a project's code found nothing there they could read (#459, point 2): the shape
// check (shape.mjs), where the manifest turns it off (`none`, with the owner's reason; offBy), its config is missing or
// its "code" and "tests" name no file of a language its readers know (shape-readers.mjs, LANGUAGES), listed by the shape
// check's own lister (codeListed) so that the two cannot drift; and the strength of the tests (strength.mjs), where the
// manifest names no mutation tool, or `none`, or Stryker from a folder that holds no lock file to install it from
// (mutation-tools.mjs, folderOf), or the shape check's config, whose files it measures, is missing or names none it
// measures (measuredCode, its own lister). Each comes with the rules it holds, as scripts/holders/ says (one fact,
// one place), so that a report can say those rules are held by nothing there: a check that passes on nothing makes its
// rule look held. A check that holds no rule of the modules the project takes is not named. It fails nothing (AGENTS.md
// of the core, "Nothing locks a project"); the sync's report (steps.mjs) and a project's state report
// (state-report.mjs) say it. Reads only; Node's own modules and git, through shape.mjs.
import { copyOf } from "./core-path.mjs";
import { holders } from "./holders.mjs";
import { ROOT, takenRules } from "./rules.mjs";
import { LANGUAGES } from "./shape-readers.mjs";
import { folderOf } from "./mutation-tools.mjs";
import { codeListed, offBy, parseConfig, where } from "./shape.mjs";
import { measuredCode, toolOf } from "./strength.mjs";

// The rules each of the core's scripts holds, by its path under scripts/, as scripts/holders/ names them: those of the
// modules a project takes alone, its manifest's text `manifest` (rules.mjs, takenRules).
function rulesHeldBy(manifest) {
  const h = holders(ROOT), by = new Map();
  const takes = new Set(takenRules(h.rules, manifest).map(r => r.key));
  for (const [key, list] of h.by) if (takes.has(key)) for (const x of list) if (x.kind === "check") by.set(x.by, [...(by.get(x.by) ?? []), key]);
  return by;
}

// How many files a lister gives, or null where git refuses its pathspecs (one that leaves the project): the check then
// fails, as no check that passes on nothing (that its failure says no mend yet is #924).
const count = list => { try { return list().length; } catch { return null; } };

// Why the shape check read nothing, or null where it read something; the third, its config as readNothing reads it.
function shapeWhy(manifest, root, { at, text, config }) {
  const off = offBy(manifest);
  if (off) return `the manifest's *shape check* is \`none\`, which turns it off: ${off}`;
  if (text === null) return `the project holds no \`${at}\`, the check's config`;
  if (config && count(() => codeListed(config, root)) === 0) return `\`${at}\` names under "code" and "tests" no file the check's readers know (${LANGUAGES.join(", ")})`;
  return null;
}

// Why the tests' strength read nothing, or null where it measured something.
function strengthWhy(manifest, root, read, { at, text, config }) {
  const tool = toolOf(manifest), folder = tool?.command ? folderOf(tool.command) : null;
  if (tool === null) return "the manifest names no *mutation tool*";
  if (tool.none !== undefined) return "the manifest's *mutation tool* is `none`";
  if (folder && read(`${folder}/package-lock.json`) === null) return `the manifest's *mutation tool* runs Stryker from \`${folder}\`, which holds no lock file to install it from, so no job installs it and the check says it did not measure`;
  if (text === null) return `the measure waits for \`${at}\`, the shape check's config, whose files it measures`;
  if (config && count(() => measuredCode(config, root)) === 0) return `\`${at}\` names under "code" no file it measures: none that is no test, in a language the core knows by its ending`;
  return null;
}

// Each check that read nothing in the project at `root` (its manifest's text `manifest`, a file read by `read`, null
// where there is none): [{ script, check, holds, why }], `script` its path in the core (scripts/shape.mjs), `check` the
// same as the project calls it (by its copy's path), `holds` the rules it holds.
export function readNothing(root, manifest, read) {
  const at = where(manifest), text = read(at);
  let config = null;
  if (text !== null) try { config = parseConfig(text, at); } catch { /* (a config the check cannot read fails the check itself, with its mend: it is no check that passes on nothing) */ }
  const seen = { at, text, config };
  const found = [["scripts/shape.mjs", shapeWhy(manifest, root, seen)], ["scripts/strength.mjs", strengthWhy(manifest, root, read, seen)]]
    .filter(([, why]) => why !== null).map(([script, why]) => ({ script, why }));
  if (!found.length) return [];
  const held = rulesHeldBy(manifest), copy = copyOf(root);
  return found.map(f => ({ ...f, check: `${copy}${f.script}`, holds: held.get(f.script) ?? [] })).filter(f => f.holds.length);
}

// The lines a report gives of them, or none where every such check read something; `found` is null where which read
// nothing could not be read (`why`, what went wrong); `copy`, the path of the core's copy.
export function saidOf(found, copy = copyOf(), why = "") {
  if (found === null) return [`Which checks read nothing here could not be read (${why}): read \`${copy}scripts/read-nothing.mjs\` against the project; until then no rule of the core's here is known to be held by a check that read something.`];
  return found.length ? [
    `Checks that read nothing here (\`${copy}scripts/read-nothing.mjs\`): each passes on nothing, so the rules it holds are held by nothing here; it fails nothing, and a project in a language its readers do not know reports it to the core (\`${copy}README.md\`, "Reporting to the core").`,
    ...found.map(f => `- \`${f.check}\`: ${f.why}. It holds ${f.holds.length === 1 ? "the rule" : `${f.holds.length} rules`}: ${f.holds.map(k => `\`${k}\``).join("; ")}.`),
  ] : [];
}
