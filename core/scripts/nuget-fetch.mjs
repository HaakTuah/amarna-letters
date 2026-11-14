// The NuGet check's packages, fetched before the restore (.github/workflows/nuget.yml; core archive 201), so that the
// licence of each is read from a file no pull request's build could have written: the restore runs the pull request's
// own build files, which could change anything in the job after it. For every package the lock files the config names
// hold (nuget.mjs, beside this file, reads them), and every tool a manifest of dotnet's names (.config/dotnet-tools.json),
// it fetches the package file from NuGet's own registry, or else from a source the config's "nuget.sources" names
// (an https address of a NuGet v3 feed, or a folder of the project's own), holds a locked package to the content hash
// its lock file names (NuGet's own SHA-512 of the package file, a signed one's read without its signature, as NuGet
// reads it), takes the manifest (.nuspec) out of it, and writes it
// into a folder laid out as a restore lays out its own, with NuGet's record of where it took it from beside it
// (.nupkg.metadata), for `nuget.mjs <config> --packages <that folder> --fetched` to read before the restore begins.
//   It fails a locked package whose file is not what its lock file names (each source tried in turn, as a restore
// tries them), a tool whose manifest names no one exact version, and a package or tool it can find nowhere it may look
// (a source that cannot be read among them, which a restore could not read either). A package that only a source of
// another kind holds (a feed of NuGet's older form) is left to the check after the restore, and said so; a tool, which
// no restore brings, fails there. A tool's file has no content hash to hold it to: it is the one the registry, or the
// first source that holds it, gives. What is wrong with a tool the pull request's base already held at that version,
// never read before this release, is reported and passes (the core's AGENTS.md, "Nothing locks another owner's
// project"). Node's own modules only; the network for the registry and the sources named, eight files at a time. It
// writes only into the folder it is given.
//
//   node core/scripts/nuget-fetch.mjs <config> --into <a folder of its own>
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, posix } from "node:path";
import { inflateRawSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { baseOf, configAt, loadConfig, textAt } from "./licences.mjs";
import { REGISTRY, lockPackages, nugetConfig, sourcesOf, unmarked } from "./nuget.mjs";
import { started } from "./started.mjs";

const FLAT = "https://api.nuget.org/v3-flatcontainer/"; // the registry's own address for package files
const TOOLS = "dotnet-tools.json"; // its name, in any case, in .config/ or in any folder, as dotnet reads it
const isTools = (f) => posix.basename(f).toLowerCase() === TOOLS;
const MANIFEST_MAX = 1 << 24; // the most a manifest is inflated to: a real one is a few KB
const EXACT = /^[0-9]+(\.[0-9]+){1,3}(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/u; // one version, no range
const ID = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,99}$/u;
const shown = (text) => String(text).replace(/[\u0000-\u001f\u007f\u0085\u2028\u2029]/gu, "?");

/** The manifest (.nuspec) at the root of a package file, as text; throws where the file is no package this reads. */
export function nuspecOf(zip) {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]), Math.max(0, zip.length - 22));
  if (end < 0 || zip.length - end > 22 + 65535) throw new Error("no zip's end of directory");
  const entries = zip.readUInt16LE(end + 10), dirAt = zip.readUInt32LE(end + 16);
  if (entries === 0xffff || dirAt === 0xffffffff) throw new Error("a zip of the 64-bit form, which this does not read");
  const found = [];
  for (let at = dirAt, i = 0; i < entries; i++) {
    if (zip.readUInt32LE(at) !== 0x02014b50) throw new Error("a zip whose directory this does not read");
    const method = zip.readUInt16LE(at + 10), size = zip.readUInt32LE(at + 20), nameLen = zip.readUInt16LE(at + 28);
    const extraLen = zip.readUInt16LE(at + 30), commentLen = zip.readUInt16LE(at + 32), local = zip.readUInt32LE(at + 42);
    const name = zip.subarray(at + 46, at + 46 + nameLen).toString("utf8");
    if (!name.includes("/") && name.toLowerCase().endsWith(".nuspec")) found.push({ method, size, local });
    at += 46 + nameLen + extraLen + commentLen;
  }
  if (found.length !== 1) throw new Error(`${found.length} manifests at the package's root, where it holds one`);
  const { method, size, local } = found[0];
  if (zip.readUInt32LE(local) !== 0x04034b50) throw new Error("a zip whose entry this does not read");
  const data = zip.subarray(local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28)).subarray(0, size);
  if (method === 0) return data.toString("utf8");
  if (method === 8) return inflateRawSync(data, { maxOutputLength: MANIFEST_MAX }).toString("utf8");
  throw new Error(`a manifest packed in a way this does not read (method ${method})`);
}

/**
 * The tools a manifest of dotnet's names: { tools: [{ id, version }], failures, failed }, `failed` naming each failure's
 * tool by its id and version as written ({ id, version, failure }).
 */
export function toolsOf(text, at) {
  let manifest;
  try { manifest = JSON.parse(unmarked(text)); } catch { return { tools: [], failures: [`${at} is not JSON`], failed: [] }; }
  const tools = [], failed = [];
  for (const [id, entry] of Object.entries(manifest?.tools ?? {})) {
    if (!ID.test(id)) { failed.push({ id, version: entry?.version, failure: `${at}: ${shown(id)}: no tool id it can read` }); continue; }
    if (typeof entry?.version !== "string" || !EXACT.test(entry.version)) { failed.push({ id, version: entry?.version, failure: `${at}: ${id}: no one exact version (${shown(JSON.stringify(entry?.version))}): name the one version it runs (floor rule 7)` }); continue; }
    tools.push({ id, version: entry.version });
  }
  return { tools, failures: failed.map((f) => f.failure), failed };
}
/** The tools a manifest held at the base, by id@version as written, in lower case; null where none can be read. */
function toolsAt(root, base, f) {
  if (!base) return null;
  try { return new Set(Object.entries(JSON.parse(unmarked(textAt(root, base, f) ?? "{}"))?.tools ?? {}).map(([id, e]) => `${id}@${e?.version}`.toLowerCase())); } catch { return new Set(); }
}
// The text with each part from `open` to the next `close` cut and a space in its place, so that no two halves it
// leaves join into another such part; null where one is never closed.
export function cut(text, open, close) {
  let out = "", at = 0;
  for (let from = text.indexOf(open); from >= 0; from = text.indexOf(open, at)) {
    const to = text.indexOf(close, from + open.length);
    if (to < 0) return null;
    out += `${text.slice(at, from)} `;
    at = to + close.length;
  }
  return out + text.slice(at);
}
// The id and version a package file's manifest names, as NuGet reads them to tell packages apart: one of each, under
// its one metadata part, in the plain form a manifest writes them, its comments cut first; or null, as for a manifest
// with CDATA or a document type, which this does not read.
export function named(nuspec) {
  if (/<!\[CDATA\[|<!DOCTYPE/iu.test(nuspec)) return null;
  const plain = cut(nuspec, "<!--", "-->");
  if (plain === null) return null;
  const parts = [...plain.matchAll(/<metadata\b[^>]*>([\s\S]*?)<\/metadata>/gu)];
  if (parts.length !== 1) return null;
  const ids = [...parts[0][1].matchAll(/<id>([^<>]*)<\/id>/gu)], versions = [...parts[0][1].matchAll(/<version>([^<>]*)<\/version>/gu)];
  return ids.length === 1 && versions.length === 1 ? { id: ids[0][1].trim(), version: versions[0][1].trim() } : null;
}

const sha512 = (bytes) => createHash("sha512").update(bytes).digest("base64");
/**
 * A package file's content hash as NuGet writes it in a lock file: SHA-512 of the file, save that a signed package
 * (one holding .signature.p7s, as every package of NuGet's registry does) is hashed as though that entry were not in
 * it, its other entries' offsets and the directory's counts, size and offset moved to match, as NuGet's own
 * SignedPackageArchiveUtility reads it. Throws where the file is no zip this reads.
 */
export function contentHash(zip) {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]), Math.max(0, zip.length - 22));
  if (end < 0) throw new Error("no zip's end of directory");
  const count = zip.readUInt16LE(end + 10), dirAt = zip.readUInt32LE(end + 16);
  const records = [];
  for (let at = dirAt, i = 0; i < count; i++) {
    if (zip.readUInt32LE(at) !== 0x02014b50) throw new Error("a zip whose directory this does not read");
    const size = 46 + zip.readUInt16LE(at + 28) + zip.readUInt16LE(at + 30) + zip.readUInt16LE(at + 32);
    records.push({ position: at, size, offset: zip.readUInt32LE(at + 42), name: zip.subarray(at + 46, at + 46 + zip.readUInt16LE(at + 28)).toString("utf8") });
    at += size;
  }
  const signature = records.find((r) => r.name === ".signature.p7s");
  if (!signature) return sha512(zip);
  const byOffset = [...records].sort((a, b) => a.offset - b.offset);
  byOffset.forEach((r, i) => { r.entrySize = (byOffset[i + 1]?.offset ?? dirAt) - r.offset; });
  const h = createHash("sha512"), u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; }, u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return b; };
  const rest = byOffset.filter((r) => r !== signature);
  h.update(zip.subarray(0, byOffset[0].offset));
  for (const r of rest) h.update(zip.subarray(r.offset, r.offset + r.entrySize));
  for (const r of rest.sort((a, b) => a.position - b.position)) {
    h.update(zip.subarray(r.position, r.position + 42));
    h.update(u32(r.offset - (r.offset > signature.offset ? signature.entrySize : 0)));
    h.update(zip.subarray(r.position + 46, r.position + r.size));
  }
  h.update(zip.subarray(end, end + 8));
  h.update(u16(zip.readUInt16LE(end + 8) - 1));
  h.update(u16(zip.readUInt16LE(end + 10) - 1));
  h.update(u32(zip.readUInt32LE(end + 12) - signature.size));
  h.update(u32(zip.readUInt32LE(end + 16) - signature.entrySize));
  h.update(zip.subarray(end + 20));
  return h.digest("base64");
}
async function get(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!r.url.startsWith("https://")) throw new Error(`${url}: led to an address that is not https`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}
// Where a v3 feed keeps its package files, from its own index; null where the source is a feed of another form (no
// JSON index, or one with no package files' address). An index that cannot be fetched throws, as it fails a restore.
const feeds = new Map();
function feedOf(source) {
  if (source === REGISTRY) return Promise.resolve(FLAT);
  if (!feeds.has(source)) feeds.set(source, (async () => {
    const got = await get(source);
    if (!got) throw new Error(`${source}: no index there`);
    let index;
    try { index = JSON.parse(got.toString("utf8")); } catch { return null; }
    let base = (index?.resources ?? []).find((r) => typeof r?.["@type"] === "string" && r["@type"].startsWith("PackageBaseAddress/3.0.0"))?.["@id"] ?? null;
    if (typeof base !== "string") return null;
    if (!base.endsWith("/")) base += "/";
    if (!base.startsWith("https://")) throw new Error(`${source}: its package files are at an address that is not https`);
    return base;
  })());
  return feeds.get(source);
}
/** Where a v3 feed whose package files are at `base` keeps one: its id in lower case, its version as NuGet writes one. */
export function fileAddress(base, id, version) {
  const lid = encodeURIComponent(id.toLowerCase()), nv = encodeURIComponent(normal(version.toLowerCase()) ?? version.toLowerCase());
  return `${base}${lid}/${nv}/${lid}.${nv}.nupkg`;
}
// A version as NuGet compares one: three numbers at least, a fourth only where it is not 0, no build metadata, in
// lower case ("1.0" is "1.0.0"), or null where the text is no version.
function normal(version) {
  const m = /^([0-9]+(?:\.[0-9]+){0,3})(-[0-9a-z.-]+)?(?:\+[0-9a-z.-]+)?$/iu.exec(version);
  if (!m) return null;
  const n = m[1].split(".").map((x) => String(Number(x)));
  while (n.length < 3) n.push("0");
  if (n.length === 4 && n[3] === "0") n.pop();
  return `${n.join(".")}${(m[2] ?? "").toLowerCase()}`;
}
// A package's file from one source: its bytes, or null where that source does not hold it, or undefined where the
// source is of a kind this cannot read.
async function fromSource(source, id, version) {
  const lid = id.toLowerCase(), lv = version.toLowerCase(), want = normal(lv);
  if (!source.startsWith("https://")) {
    // (a folder, as NuGet reads one: <id>.<version>.nupkg at its top, or under <id>/<version>/, each name in any case
    // and each version as NuGet compares it; never a .symbols.nupkg)
    const files = (dir) => { try { return readdirSync(dir, { withFileTypes: true }); } catch { return []; } };
    const file = (e) => {
      const n = e.name.toLowerCase();
      return e.isFile() && n.startsWith(`${lid}.`) && n.endsWith(".nupkg") && !n.endsWith(".symbols.nupkg") && normal(n.slice(lid.length + 1, -6)) === want;
    };
    const flat = files(source).find(file);
    if (flat) return readFileSync(join(source, flat.name));
    for (const d of files(source).filter((e) => e.isDirectory() && e.name.toLowerCase() === lid)) {
      for (const v of files(join(source, d.name)).filter((e) => e.isDirectory() && normal(e.name.toLowerCase()) === want)) {
        const nested = files(join(source, d.name, v.name)).find(file);
        if (nested) return readFileSync(join(source, d.name, v.name, nested.name));
      }
    }
    return null;
  }
  const base = await feedOf(source);
  if (!base) return undefined;
  return get(fileAddress(base, id, version));
}

/**
 * Every package and tool, fetched into `into`, read against the pull request's `base` (a commit, or null):
 * { failures, notes, reports, summary }.
 */
export async function fetchAll(config, root, tracked, into, sources = sourcesOf(config, root), { base = null, baseConfig = null } = {}) {
  const { ships, tools: toolLocks } = nugetConfig(config);
  // (a tool counts as the base's only where the base held this config, with the same sources: one a pull request's new
  // source gives, or read by a config the base did not hold, is judged as new)
  let sameSources = base === null;
  try { if (baseConfig) sameSources = sameSources || [...nugetConfig(baseConfig).sources].sort().join("\n") === [...nugetConfig(config).sources].sort().join("\n"); } catch { /* (judged as new) */ }
  const failures = [], notes = [], reports = [], wanted = new Map();
  for (const f of [...ships, ...toolLocks].filter((l) => tracked.includes(l))) {
    const read = lockPackages(readFileSync(join(root, f), "utf8"), f);
    failures.push(...read.failures);
    for (const p of read.packages) wanted.set(`${p.id}@${p.version}`.toLowerCase(), { ...p, from: f });
  }
  for (const f of tracked.filter((t) => !t.startsWith("core/") && isTools(t))) {
    const text = readFileSync(join(root, f), "utf8"), read = toolsOf(text, f), before = toolsAt(root, base, f);
    // (a tool the base held at that version, or a manifest it held as it stands, was never read before this release:
    // what is wrong with it is reported; with no base to read it against, so is everything)
    const same = before === null || (sameSources && textAt(root, base, f) === text);
    const held = (id, version) => same || (sameSources && before.has(`${id}@${version}`.toLowerCase()));
    for (const x of read.failures.filter((x) => !read.failed.some((t) => t.failure === x))) (same ? reports : failures).push(x);
    for (const t of read.failed) (held(t.id, t.version) ? reports : failures).push(t.failure);
    for (const t of read.tools) if (!wanted.has(`${t.id}@${t.version}`.toLowerCase())) wanted.set(`${t.id}@${t.version}`.toLowerCase(), { ...t, from: f, tool: true, held: held(t.id, t.version) });
  }
  // (each package on its own: what failed for a tool the base held is reported instead)
  const one = async (p) => {
    const name = `${p.id}@${p.version} (${p.from})`, out = { failures: [], notes: [], reports: [], fetched: false };
    let bytes = null, taken = null, hashed = null, unread = false, other = null;
    for (const source of sources) {
      let got;
      try { got = await fromSource(source, p.id, p.version); } catch (e) { out.failures.push(`${name}: ${source} could not be read (${shown(e.message)})`); break; }
      if (got === undefined) { unread = true; continue; }
      if (!got) continue;
      let h;
      try { h = contentHash(got); } catch (e) { out.failures.push(`${name}: the file ${source} gives: ${shown(e.message)}`); break; }
      // (a locked package is the file its lock file names: one source's other file leaves the next source to try)
      if (!p.tool && h !== p.contentHash) { other ??= source; continue; }
      bytes = got; taken = source; hashed = h; break;
    }
    if (!bytes && !out.failures.length) {
      if (other) out.failures.push(`${name}: the file ${other} gives is not the one its lock file names by its content hash, and no other source gives that one (floor rule 15)`);
      else if (unread && !p.tool) out.notes.push(`${name}: held by no source this reads before the restore (a feed not of NuGet's v3 form): its licence is read after the restore`);
      else if (unread) out.failures.push(`${name}: a tool held by no source this reads (a feed not of NuGet's v3 form), and no restore brings a tool: take it from a source of NuGet's v3 form`);
      else out.failures.push(`${name}: in neither NuGet's registry nor a source the config names`);
    }
    if (bytes) {
      let nuspec;
      try { nuspec = nuspecOf(bytes); } catch (e) { out.failures.push(`${name}: ${shown(e.message)}`); }
      // (a tool has no content hash: the file is the one its manifest names, by id and version as NuGet compares them)
      const says = nuspec === undefined ? null : named(nuspec);
      if (nuspec !== undefined && p.tool && (!says || says.id.toLowerCase() !== p.id.toLowerCase() || normal(says.version) !== normal(p.version))) {
        out.failures.push(`${name}: the file ${taken} gives names ${says ? `${shown(says.id)}@${shown(says.version)}` : "no one id and version"} in its manifest`);
        nuspec = undefined;
      }
      if (nuspec !== undefined) {
        const dir = join(into, p.id.toLowerCase(), p.version.toLowerCase());
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, `${p.id.toLowerCase()}.nuspec`), nuspec);
        writeFileSync(join(dir, ".nupkg.metadata"), JSON.stringify({ version: 2, contentHash: hashed, source: taken }));
        out.fetched = true;
      }
    }
    if (p.tool && p.held) { out.reports.push(...out.failures.map((f) => `${f} (a tool held before this check read tools: reported, and passes)`)); out.failures = []; }
    return out;
  };
  const list = [...wanted.values()], results = new Array(list.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(8, list.length) }, async () => { while (next < list.length) { const i = next++; results[i] = await one(list[i]); } }));
  let fetched = 0;
  for (const r of results) {
    failures.push(...r.failures); notes.push(...r.notes); reports.push(...r.reports);
    if (r.fetched) fetched++;
  }
  return { failures, notes, reports, summary: `${fetched} of ${wanted.size} NuGet packages and tools fetched before the restore, each held to its lock file's content hash where it has one; ${failures.length} failing` };
}

if (started(import.meta.url)) {
  const args = process.argv.slice(2), at = args.indexOf("--into");
  const fail = (msg) => { console.error(`FAIL: ${shown(msg)}`); process.exit(1); };
  const configPath = args.find((a, i) => !a.startsWith("--") && i !== at + 1), into = at >= 0 ? args[at + 1] : undefined;
  if (!configPath || !into) fail("name the config and a folder of its own: node core/scripts/nuget-fetch.mjs <config> --into <folder>");
  let result;
  try {
    const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: fileURLToPath(new URL(".", import.meta.url)), encoding: "utf8" }).trim();
    const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 }).split("\0").filter(Boolean);
    mkdirSync(into, { recursive: true });
    const base = baseOf(root);
    result = await fetchAll(loadConfig(configPath), root, tracked, into, undefined, { base, baseConfig: configAt(root, base, configPath) });
  } catch (e) { fail(e.message); }
  for (const n of result.notes) console.log(`note ${shown(n)}`);
  for (const r of result.reports) console.log(`REPORT: ${shown(r)}`);
  for (const f of result.failures) console.error(`FAIL: ${shown(f)}`);
  console.log(result.summary);
  process.exit(result.failures.length ? 1 : 0);
}
