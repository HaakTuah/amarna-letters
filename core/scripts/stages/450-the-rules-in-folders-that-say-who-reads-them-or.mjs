// The stage of scripts/steps/450-the-rules-in-folders-that-say-who-reads-them-or.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import path from "node:path";
import { MOVED_GLOB, MOVED_GLOBS, moved, project } from "../steps.mjs";
import { at, read, write } from "../stage-helpers.mjs";

export default {
  asked: true,
  // (a rule file that names the core's files where they stood, two of them now one file that its core's part pulls in, and a rule that left its file for another, the
  // copies config with the old folder's pattern alone, the manifest's line with the old folders, and a dated record
  // that names an old path and is left as it stands; the mend names each by the path the step words)
  stage: dir => {
    // (outside the core's part, which the one process writes and the step never reads: #1272, point 1)
    write(dir, "AGENTS.md", `${read(dir, "AGENTS.md").replace("core/tools/other-builders.md", "core/modules/other-builders.md")}\nRead too:\n\n@core/modules/work-flow.md\n@core/modules/git.md\n\nWho builds: \`core/modules/roles.md\`, "The builders".\n`);
    // (a dated record of the project's own, which names an old path and stays as it stands)
    write(dir, "docs/records/2026-01-05.md", "# 5 January 2026\n\nRead that day: `core/modules/git.md`.\n");
    write(dir, "core-manifest.md", read(dir, "core-manifest.md").replace(/^(Paths:.*?)tasks\/, tools\/, /m, "$1"));
    write(dir, "checks/copies.json", read(dir, "checks/copies.json").split(`${MOVED_GLOB}, ${MOVED_GLOBS}`).join(MOVED_GLOB));
    // (the size marks reading the two old paths that now lead to one file, under "read": #1247, point 4)
    write(dir, "checks/sizes.json", read(dir, "checks/sizes.json").replace('"core/roles/shared/work-flow.md": 20480', '"core/modules/work-flow.md": 20480,\n    "core/modules/git.md": 20480'));
  },
  mend: dir => {
    const map = moved(at(dir, "core")), names = Object.keys(map).sort((a, b) => b.length - a.length);
    // (what a file at an old path says stands elsewhere than the rest of it is named there first, as the step words it)
    const apart = Object.entries(moved.apart(at(dir, "core"))).flatMap(([old, parts]) => parts.map(a => [`\`core/${old}\`, "${a.lead}"`, `\`core/${a.to}\`, "${a.lead}"`]));
    for (const f of project(dir).files.filter(f => !f.startsWith("core/") && /\.(?:md|json|ya?ml|mjs|cjs|js|ts|sh|txt|toml)$/.test(f))) {
      if (f.startsWith("docs/records/")) continue;
      const text = read(dir, f), next = names.reduce((t, old) => t.split(`core/${old}`).join(`core/${map[old].endsWith("/") ? `${map[old]}input.md` : map[old]}`), apart.reduce((t, [was, now]) => t.split(was).join(now), text)).split(`${MOVED_GLOB}, ${MOVED_GLOBS}`).join(MOVED_GLOB).split(MOVED_GLOB).join(`${MOVED_GLOB}, ${MOVED_GLOBS}`);
      // (a line that now pulls in a file a line above pulls in already goes)
      const lines = next.split("\n").filter((l, i, all) => !(all.indexOf(l) < i && /^(@|#\[\[file:)/.test(l))).join("\n");
      // (and the size marks naming that file once)
      const once = f === "checks/sizes.json" && lines !== text ? `${JSON.stringify(JSON.parse(lines), null, 2)}\n` : lines;
      if (once !== text) write(dir, f, once);
    }
    const manifest = read(dir, "core-manifest.md"), want = /^Paths: .*$/m.exec(read(dir, "core/setup/template/core-manifest.md.tmpl"))[0];
    if (!/^Paths:.*\btasks\/.*\btools\//m.test(manifest)) write(dir, "core-manifest.md", manifest.replace(/^Paths: .*$/m, want));
  },
};
