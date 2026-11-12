// The cap on the core's rules (README.md, "Two layers"): the floor and the modules together stay under it, so a new
// rule replaces text rather than adding to it (core archive 134). Run from this repository's root; Node's own modules
// only.
import fs from "node:fs";
import path from "node:path";

const CAP = 47 * 1024;
const files = ["floor", "modules"].flatMap(dir =>
  fs.readdirSync(dir).filter(f => f.endsWith(".md")).map(f => path.join(dir, f)));
const total = files.reduce((sum, f) => sum + fs.statSync(f).size, 0);
console.log(`floor/ and modules/: ${total} bytes of ${CAP} (${files.length} files)`);
if (total > CAP) {
  console.error("FAIL: over the cap; a new rule must replace text, not add to it.");
  process.exitCode = 1;
}
