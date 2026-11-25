// The stage of scripts/steps/300-the-progress-file-holds-order-only.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import fs from "node:fs";
import { at, read, write } from "../stage-helpers.mjs";

export default {
  // (a progress file past a quarter of the general mark, at the general mark: its first trim is due)
  stage: dir => {
    const m = JSON.parse(read(dir, "checks/sizes.json"));
    write(dir, "docs/PROGRESS.md", `${read(dir, "docs/PROGRESS.md")}\n## Done\n\n${"- A finished entry, kept after it was done.\n".repeat(Math.ceil(m.each / 4 / 40))}`);
    write(dir, "checks/sizes.json", `${JSON.stringify({ ...m, read: { ...m.read, "docs/PROGRESS.md": m.each } }, null, 2)}\n`);
  },
  // (as the step words it: the finished entries taken out, then a mark of its own, below "each", at least its size)
  mend: dir => {
    write(dir, "docs/PROGRESS.md", read(dir, "docs/PROGRESS.md").replace(/\n## Done\n[\s\S]*$/, "\n"));
    const m = JSON.parse(read(dir, "checks/sizes.json"));
    write(dir, "checks/sizes.json", `${JSON.stringify({ ...m, read: { ...m.read, "docs/PROGRESS.md": Math.min(m.each - 1, fs.statSync(at(dir, "docs/PROGRESS.md")).size + 1024) } }, null, 2)}\n`);
  },
};
