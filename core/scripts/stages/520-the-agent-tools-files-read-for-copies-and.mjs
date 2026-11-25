// The stage of scripts/steps/520-the-agent-tools-files-read-for-copies-and.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { at, read, write, STAGED, copies } from "../stage-helpers.mjs";

export default {
  asked: true,
  // (a rule file of Antigravity's that repeats a line of AGENTS.md and points at a file that is not there; the mend,
  // as the step words it, points it at one that is, then lists the copies with --tools, the starter kit's entry
  // files' among them where the baseline was written before the check read them)
  stage: dir => {
    const line = read(dir, "AGENTS.md").split(/\r?\n/).filter(l => !/^[#@|]/.test(l) && !l.includes("](") && l.split(/\s+/).length >= 14).sort((a, b) => b.length - a.length)[0];
    write(dir, STAGED, `# Staged\n\n${line}\n\nAs \`docs/staged-nowhere.md\` says.\n`);
    spawnSync("git", ["add", STAGED], { cwd: dir });
  },
  after: dir => {
    spawnSync("git", ["rm", "-q", "-f", "--cached", "--ignore-unmatch", STAGED], { cwd: dir });
    fs.rmSync(at(dir, STAGED), { force: true });
    copies(dir, "--write");
  },
  mend: dir => {
    if (fs.existsSync(at(dir, STAGED))) {
      write(dir, STAGED, read(dir, STAGED).replace("docs/staged-nowhere.md", "AGENTS.md"));
      spawnSync("git", ["add", STAGED], { cwd: dir });
    }
    copies(dir, "--tools");
  },
};
