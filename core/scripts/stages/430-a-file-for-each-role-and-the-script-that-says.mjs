// The stage of scripts/steps/430-a-file-for-each-role-and-the-script-that-says.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import { read, write } from "../stage-helpers.mjs";

export default {
  asked: true,
  // (the manifest's "Paths:" line without the roles' folder, and AGENTS.md without the builder's file; the mend adds both)
  stage: dir => {
    write(dir, "core-manifest.md", read(dir, "core-manifest.md").replace(/^(Paths:.*?)roles\/, /m, "$1"));
    write(dir, "AGENTS.md", read(dir, "AGENTS.md").replace(/^@core\/roles\/builder\.md[ \t]*\r?\n/m, ""));
  },
  mend: dir => {
    const manifest = read(dir, "core-manifest.md"), agents = read(dir, "AGENTS.md");
    if (!/^Paths:.*\broles\//m.test(manifest)) write(dir, "core-manifest.md", manifest.replace(/^(Paths:.*?floor\/, (?:modules\/, )?)/m, "$1roles/, "));
    if (!/^@core\/roles\/builder\.md[ \t]*$/m.test(agents)) write(dir, "AGENTS.md", agents.replace(/^(@core\/floor\/security\.md[ \t]*\r?\n)/m, "$1@core/roles/builder.md\n"));
  },
};
