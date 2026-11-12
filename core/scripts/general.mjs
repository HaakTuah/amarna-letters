// The core's rules fit any project ("Rules are written for any project" in AGENTS.md): fails the floor or a module that
// uses a word true only for some of the projects that take the core, such as one that assumes a game, its players or a
// live site. The words, with what to say instead, are its config's (scripts/general.json), which also names the files
// a word may stand in; a word a project finds untrue for it joins that list. This repository only, run by size.yml.
// Reads only; Node's own modules.
//
//   node scripts/general.mjs scripts/general.json
import fs from "node:fs";
import path from "node:path";

const config = JSON.parse(fs.readFileSync(process.argv[2] ?? "scripts/general.json", "utf8"));
const words = config.words.map(w => ({ re: new RegExp(w.pattern, "iu"), say: w.say }));
const exempt = new Set(config.exempt);
if (!words.length) { console.log("the list of words is empty: the check would pass anything"); process.exit(1); }
const files = config.paths
  .flatMap(dir => fs.readdirSync(dir).filter(f => f.endsWith(".md")).map(f => path.posix.join(dir, f)))
  .filter(f => !exempt.has(f))
  .sort();
if (!files.length) { console.log("no file of the floor or the modules was read: the check would pass anything"); process.exit(1); }

let found = 0;
for (const file of files) {
  fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    for (const { re, say } of words) {
      const hit = line.match(re);
      if (hit) { found++; console.log(`${file}:${i + 1}: "${hit[0]}" fits only some projects; say ${say}`); }
    }
  });
}
console.log(`${files.length} files of the floor and the modules read for ${words.length} words: ${found} found`);
process.exit(found ? 1 : 0);
