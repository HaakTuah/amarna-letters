// The form a records file takes where its records stand in a folder (#870; split from choices.mjs, #992), for the
// core's own, whose test (tests/choices-folder-test.mjs) is its one caller. git is not used; Node's own modules.
import fs from "node:fs";
import path from "node:path";
import { MEND } from "./mend.mjs";
import { MOST, POINTER, plain } from "./choices-records.mjs";

// The form a records file takes where its records stand in a folder (#870), for the core's own, whose test runs it: the
// file holds no record itself, and the folder it names holds a file for each record, named NNN-<name>.md, whose first
// line is that record's heading and that holds no other. { faults } at `root` for the file `file`, each a line that says
// the mend; none where the file names no folder (a project's records may stand whole).
export const PART = /^\d{3}-[a-z0-9-]+\.md$/u;
export function folderFaults(file, root = ".") {
  const text = fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/gu, "\n");
  const folders = [...new Set(text.split("\n").map(l => POINTER.exec(l)?.[1]).filter(Boolean))]; // (a folder two lines name is one, as records() reads it)
  if (!folders.length) return [];
  const faults = [];
  let total = Buffer.byteLength(text), over = false;
  for (const m of text.matchAll(/^## Choice: (.+)$/gmu)) faults.push(`FAIL: \`${file}\` holds the record "${plain(m[1])}" itself. ${MEND}move it, byte for byte, into a file of its own in \`${folders[0]}/\`, named NNN-<name>.md to stand in order between its neighbours, as AGENTS.md, "A record pull requests add to is a folder of one file per entry", says.`);
  for (const folder of folders) {
    let entries = [];
    // (no link is followed, as records() follows none: a folder that is one is no folder of the records)
    const plainFolder = folder.split("/").every((_, i, at) => { try { const st = fs.lstatSync(path.join(root, ...at.slice(0, i + 1))); return !st.isSymbolicLink() && (i < at.length - 1 || st.isDirectory()); } catch { return false; } });
    let listed = plainFolder;
    try { if (plainFolder) entries = fs.readdirSync(path.join(root, folder), { withFileTypes: true }); } catch { listed = false; }
    if (!plainFolder) faults.push(`FAIL: \`${file}\` names \`${folder}/\`, which is no folder here. ${MEND}make the folder, a file for each record in it, or take the line that names it out of \`${file}\`.`);
    else if (!listed) faults.push(`FAIL: \`${file}\` names \`${folder}/\`, which is there but cannot be listed. ${MEND}give the session's account the right to read and list \`${folder}/\`, or take the line that names it out of \`${file}\` where the folder is not to be read.`);
    for (const e of entries) {
      const at = `${folder}/${e.name}`;
      if (!e.isFile() || !PART.test(e.name)) { faults.push(`FAIL: \`${at}\` is no file of a record named NNN-<name>.md. ${MEND}rename it so, to stand in order between its neighbours, or take it out of \`${folder}/\`.`); continue; }
      if (over) continue; // (the size was said once; the readers read no more of the folder)
      if ((total += fs.statSync(path.join(root, at)).size) > MOST) { over = true; faults.push(`FAIL: \`${at}\` takes \`${file}\` with its folder past ${MOST} bytes. ${MEND}keep the file and the folder together under that size, which is the most the readers read: shorten a record, or move what is not a record out.`); continue; }
      const body = fs.readFileSync(path.join(root, at), "utf8").replace(/\r\n/gu, "\n");
      const heads = [...body.matchAll(/^## Choice: /gmu)].length;
      if (!body.startsWith("## Choice: ") || heads !== 1) faults.push(`FAIL: \`${at}\` holds ${heads} records and does not open with a record's heading "## Choice: ". ${MEND}make it one record from its heading on, and each other record a file of its own.`);
    }
  }
  return faults;
}
