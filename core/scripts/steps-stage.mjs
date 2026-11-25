// For the tests alone (tests/steps-test.mjs and tests/upgrade-test.mjs): for each step steps.mjs reads with a
// check, how a project that missed it holds it (`stage`, written into the project at `dir`) and its mend as the step
// words it (`mend`), so that a test can take a step out of a synced project, see the sync report exactly that, and
// see the mend as written make it done. A step with a check and no stage fails steps-test.mjs. One marked
// `asked` is a step a project that changed nothing of its own still has to do once a sync brings it (a check's own
// list to write): upgrade-test.mjs sees it reported after the sync, alone, and done by its mend. `after`, where a stage
// has one, takes out what its mend leaves that a later stage would read again. `last`, where a stage has it, puts the
// stage after all others, for a mend that reads what the others' mends write.
// Each stage stands in a file of its own in stages/ beside this file, named as the file of its step in steps/ is
// (#750, point 1; #841), and is read in the order of the steps' names.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { STEPS } from "./steps.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const STAGE_FILES = fs.readdirSync(path.join(HERE, "stages")).filter(f => f.endsWith(".mjs")).sort();
const STEP_FILES = fs.readdirSync(path.join(HERE, "steps")).filter(f => f.endsWith(".mjs")).sort();

const loaded = await Promise.all(STEP_FILES.filter(f => STAGE_FILES.includes(f)).map(async f => ({
  lead: STEPS[STEP_FILES.indexOf(f)].lead,
  stage: (await import(pathToFileURL(path.join(HERE, "stages", f)).href)).default,
})));
export const STAGES = Object.fromEntries([...loaded.filter(s => !s.stage.last), ...loaded.filter(s => s.stage.last)].map(s => [s.lead, s.stage]));
