// The inventory of the core's parts (INVENTORY.md; #534, point 4), read whole: INVENTORY.md holds what it says of
// itself and its headings, and under each heading that lists parts a line naming the folder of inventory/ that holds
// them, a file a part, read in the order of their names, so that two pull requests that add a part never edit the same
// lines (#750, point 1). A new part takes a name between those it stands between; two that take one number are read
// by the rest of the name. This repository only; no project calls it. Reads only; Node's own modules.
//
//   node scripts/inventory.mjs     the inventory whole, as one text, its parts in place
import fs from "node:fs";
import path from "node:path";
import { started } from "./started.mjs";

export const FILE = "INVENTORY.md";
const POINTER = /^Its parts stand in `(inventory\/[a-z0-9-]+)\/`, a file each, read in the order of their names\.$/u;

// The parts a folder of inventory/ holds, in order: [{ file, text }], each text without its last line ending.
export function partsIn(root, folder) {
  const at = path.join(root, folder);
  const names = fs.existsSync(at) ? fs.readdirSync(at, { withFileTypes: true }).filter(e => e.isFile() && e.name.endsWith(".md")).map(e => e.name).sort() : [];
  return names.map(f => ({ file: `${folder}/${f}`, text: fs.readFileSync(path.join(at, f), "utf8").replace(/\r?\n$/u, "") }));
}

// The inventory whole, at `root`: INVENTORY.md with each line that names a folder replaced by its parts.
export function whole(root = ".") {
  const text = fs.readFileSync(path.join(root, FILE), "utf8");
  return text.split("\n").map(line => {
    const m = POINTER.exec(line.replace(/\r$/u, ""));
    return m ? partsIn(root, m[1]).map(p => p.text).join("\n") : line;
  }).join("\n");
}

// The folders INVENTORY.md names, in order.
export const folders = (root = ".") => fs.readFileSync(path.join(root, FILE), "utf8").split("\n").map(l => POINTER.exec(l.replace(/\r$/u, ""))?.[1]).filter(Boolean);

if (started(import.meta.url)) process.stdout.write(whole());
