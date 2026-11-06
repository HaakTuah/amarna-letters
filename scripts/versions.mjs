// The versions Dependabot cannot see (.github/versions.json), checked against the newest releases. Run as
// `node scripts/versions.mjs [body-file]`: it prints one line a version, and when one is behind writes the body of the
// enhancement issue to body-file, for the monthly workflow (.github/workflows/versions.yml) to open or update. Exits 0
// whether or not one is behind, 2 when a version cannot be read. Node's own modules only, so it needs no install.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const VERSION = /^v?(\d+)\.(\d+)\.(\d+)$/u;

/** A version's parts, or null if it is not a plain x.y.z (or a bare major, as in a workflow's node-version). */
function parts(text) {
  if (/^\d+$/u.test(text)) return [Number(text)];
  const m = VERSION.exec(text);
  return m ? m.slice(1, 4).map(Number) : null;
}

/** Below in the first part that differs, comparing only as many parts as `a` has. */
function below(a, b) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}

/** Every value the entry's pattern captures, in the file or in every .yml of the folder it names. */
function written(entry) {
  const path = join(root, entry.where);
  const files = entry.where.endsWith("/")
    ? readdirSync(path).filter((f) => f.endsWith(".yml")).map((f) => join(path, f))
    : [path];
  const pattern = new RegExp(entry.pattern, "gmu");
  return files.flatMap((f) => [...readFileSync(f, "utf8").matchAll(pattern)].map((m) => m[1]));
}

/**
 * Node's releases from nodejs.org, kept only where they read as its index writes them: the version x.y.z, and `lts`
 * either false or the line's codename (a word, such as "Lithium"). Anything else is left out, never guessed at.
 */
async function nodeReleases() {
  const res = await fetch("https://nodejs.org/dist/index.json");
  if (!res.ok) throw new Error(`nodejs.org answered ${res.status}`);
  const list = await res.json();
  if (!Array.isArray(list)) throw new Error("nodejs.org's index is not a list");
  const lts = (v) => v === false || (typeof v === "string" && /^[A-Z][a-z]+$/u.test(v));
  return list
    .filter((r) => typeof r?.version === "string" && VERSION.test(r.version) && lts(r.lts))
    .map((r) => ({ version: parts(r.version), lts: r.lts !== false }));
}

/** The newest version to move to: a newer long-term-support major, else (for an exact pin) the newest of its own. */
function newest(current, releases) {
  const newer = (a, b) => (below(a.version, b.version) ? b : a);
  const lts = releases.filter((r) => r.lts).reduce(newer);
  if (current[0] < lts.version[0]) return lts.version;
  if (current.length === 1) return null;
  const own = releases.filter((r) => r.version[0] === current[0]).reduce(newer, { version: current });
  return below(current, own.version) ? own.version : null;
}

const { versions } = JSON.parse(readFileSync(join(root, ".github/versions.json"), "utf8"));
const sources = { node: nodeReleases };
const fetched = {};
const behind = [];
let unreadable = false;
for (const entry of versions) {
  const found = [...new Set(written(entry))];
  if (found.length !== 1 || !parts(found[0])) {
    console.log(`${entry.what}: cannot read one version where it is written (found ${found.join(", ") || "none"})`);
    unreadable = true;
    continue;
  }
  fetched[entry.source] ??= await sources[entry.source]();
  const current = parts(found[0]);
  const target = newest(current, fetched[entry.source]);
  console.log(`${entry.what}: ${found[0]}${target ? `, behind ${target.join(".")}` : ", current"}`);
  if (target) behind.push({ ...entry, current: found[0], target: target.join(".") });
}

const out = process.argv[2];
if (out && behind.length) {
  const lines = behind.map((b) => `- **${b.what}:** ${b.current}, the newest is ${b.target}. ${b.move}`);
  writeFileSync(
    out,
    [
      "**Is your feature request related to a problem? Please describe.**",
      "Versions Dependabot cannot see have fallen behind (`.github/versions.json`):",
      "",
      ...lines,
      "",
      "**Describe the solution you'd like**",
      "Move each as its line says, in one pull request, with the full suites.",
      "",
      "**Describe alternatives you've considered**",
      "Leaving one behind, with the reason said here.",
      "",
      "**Why it matters, and a rough cost**",
      "Security fixes and long-term support reach the build only when its versions move. A small lane.",
      "",
      "**Additional context**",
      "Opened or updated by the monthly check, `.github/workflows/versions.yml` (`scripts/versions.mjs`).",
      "",
    ].join("\n"),
  );
}
process.exit(unreadable ? 2 : 0);
