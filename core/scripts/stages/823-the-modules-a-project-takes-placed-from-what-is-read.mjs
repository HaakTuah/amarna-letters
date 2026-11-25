// The stage of scripts/steps/823-the-modules-a-project-takes-placed-from-what-is-read.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import { read, write } from "../stage-helpers.mjs";
import s160 from "../steps/160-the-modules-a-project-takes.mjs";
import s470 from "../steps/470-how-done-will-be-judged.mjs";
import s480 from "../steps/480-a-project-in-several-repositories.mjs";
import s500 from "../steps/500-milestones-named-in-order.mjs";

export default {
  // (asked once a writer of the module lines took one by choice, as at the sync after the core gained one)
  asked: true,
  // (and reported once one of these, the writers of the module lines, wrote, where it took one by choice)
  written: [s160, s470, s480, s500].map(s => s.lead),
  // (a module taken by choice and asked of the owner, in a paragraph of its own, as the steps that place the modules
  // write it; the mend is the owner's answer that it fits: the line taken out)
  stage: dir => write(dir, "core-manifest.md", read(dir, "core-manifest.md").replace(/^(Floor: .*(?:\r?\n.+)*)/m, "$1\n\nModules to confirm: `planning.md`.")),
  mend: dir => write(dir, "core-manifest.md", read(dir, "core-manifest.md").replace(/\r?\n\r?\nModules to confirm: [^\r\n]*/u, "")),
};
