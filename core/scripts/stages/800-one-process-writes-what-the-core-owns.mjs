// The stage of scripts/steps/800-one-process-writes-what-the-core-owns.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import { BEGIN, END } from "../core-owned.mjs";
import { read, write } from "../stage-helpers.mjs";

export default {
  // (AGENTS.md as a kit from before the process wrote it, its run of import lines with no mark; the mend, as the process
  // writes it, holds that run between the core's two marks again)
  // (either line end: a project held as Windows holds it has CRLF; #1083)
  stage: dir => write(dir, "AGENTS.md", [BEGIN, END].reduce((t, m) => t.replace(`${m}\r\n`, "").replace(`${m}\n`, ""), read(dir, "AGENTS.md"))),
  mend: dir => { const t = read(dir, "AGENTS.md"), eol = t.includes("\r\n") ? "\r\n" : "\n"; write(dir, "AGENTS.md", t.replace(/^(@core-manifest\.md\r?\n(?:@.*\r?\n)*)/mu, `${BEGIN}${eol}$1${END}${eol}`)); },
};
