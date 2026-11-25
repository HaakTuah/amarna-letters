// The text of git's blobs by their ids, read in one batch for the copies check (copies.mjs, #434): each of a megabyte
// or less that holds no NUL byte, so that a binary or a large file, and a pull request of many files, costs no more
// than two git processes and what they read. A read git fails, or an answer that does not parse to its end, comes back
// as the failure to print, with its mend, never as an empty answer: a follow switched off without a word would pass
// every narrowing it is there to stop. The runner is git's own unless a test hands it another. Node's own modules only.
import { execFileSync } from "node:child_process";

export const BLOB_MAX = 1 << 20;
const gitRun = (args, ids) => execFileSync("git", args, { input: Buffer.from(`${ids.join("\n")}\n`), maxBuffer: 1 << 30, stdio: ["pipe", "pipe", "pipe"] });
const unread = why => `git could not read the text of the files this change adds or changes (${why}), so whether a file the base's config read moved out of what it reads cannot be told. Mend: run the check again; where it fails the same way, the change's added and changed files are too much to read at once, so split it into pull requests that each change fewer`;

// { text: a Map of each blob's id to its text } or { failure: the line to fail with }.
export function readBlobs(ids, run = gitRun) {
  const text = new Map(), want = [...new Set(ids)].filter(Boolean);
  if (!want.length) return { text };
  const ask = (args, list) => {
    try { const got = run(args, list); return { got: Buffer.isBuffer(got) ? got : Buffer.from(got) }; }
    catch (e) { return { failure: unread(String(e.stderr || e.code || e.message).trim().split(/\r?\n/u)[0]) }; }
  };
  const checked = ask(["cat-file", "--batch-check"], want);
  if (checked.failure) return checked;
  const small = checked.got.toString("utf8").split("\n").map(l => l.split(" "))
    .filter(([, type, size]) => type === "blob" && Number(size) <= BLOB_MAX).map(([id]) => id);
  if (!small.length) return { text };
  const read = ask(["cat-file", "--batch"], small);
  if (read.failure) return read;
  const all = read.got;
  let at = 0;
  while (at < all.length) {
    const end = all.indexOf(10, at), [id, type, size] = all.subarray(at, end).toString("utf8").split(" "), n = Number(size);
    if (end < 0 || type !== "blob" || !Number.isInteger(n) || end + 1 + n >= all.length) break;
    const body = all.subarray(end + 1, end + 1 + n);
    if (!body.includes(0)) text.set(id, body.toString("utf8"));
    at = end + 1 + n + 1;
  }
  return at === all.length ? { text } : { failure: unread(`its answer did not parse to its end, at byte ${at} of ${all.length}`) };
}
