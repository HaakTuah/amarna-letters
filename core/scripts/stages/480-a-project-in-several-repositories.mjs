// The stage of scripts/steps/480-a-project-in-several-repositories.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import { notTakenWithout, read, write } from "../stage-helpers.mjs";

export default {
  asked: true,
  // (a list of modules written before the module came, which neither takes it nor leaves it out; the mend leaves it out
  // with its reason, as the step words it for a project in one repository)
  stage: dir => write(dir, "core-manifest.md", notTakenWithout(read(dir, "core-manifest.md").replace(/`repositories\.md`, /g, ""), "repositories.md")),
  mend: dir => {
    const manifest = read(dir, "core-manifest.md"), reason = "`repositories.md` (one repository, which no library carries the core into)";
    write(dir, "core-manifest.md", /^Not taken: /m.test(manifest) ? manifest.replace(/^(Not taken: .*?)\.?$/m, `$1, ${reason}.`) : manifest.replace(/^(Floor: .*)$/m, `$1\nNot taken: ${reason}.`));
  },
};
