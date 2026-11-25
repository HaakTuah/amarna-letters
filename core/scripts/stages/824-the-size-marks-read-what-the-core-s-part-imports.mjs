// The stage of scripts/steps/824-the-size-marks-read-what-the-core-s-part-imports.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import { read, write } from "../stage-helpers.mjs";

// (two files the part imports: the builder's role, which a kit from before the role files did not name, and the floor,
// which no other stage takes out of the part, so the step is reported where another takes the role's import out)
const FILES = ["core/roles/builder.md", "core/floor/security.md"];

export default {
  // (asked of every project whose marks predate the role files the core's part imports, which a sync does not write)
  asked: true,
  // (the size marks of a project whose kit predates the role files, those files not under "read"; the mend names each
  // there at the marks' "each", as the step words it)
  stage: dir => {
    const m = JSON.parse(read(dir, "checks/sizes.json")), rest = Object.fromEntries(Object.entries(m.read).filter(([f]) => !FILES.includes(f)));
    write(dir, "checks/sizes.json", `${JSON.stringify({ ...m, read: rest }, null, 2)}\n`);
  },
  mend: dir => {
    const m = JSON.parse(read(dir, "checks/sizes.json"));
    write(dir, "checks/sizes.json", `${JSON.stringify({ ...m, read: { ...m.read, ...Object.fromEntries(FILES.map(f => [f, m.each])) } }, null, 2)}\n`);
  },
};
