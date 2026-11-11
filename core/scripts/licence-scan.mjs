// The licence check's scan (floor rule 10, in floor/topics.md beside this folder): nothing a project uses is left out
// of its audit, so the check (licences.mjs, beside this file, which runs this when its config has "scan") holds
// everything to its list, not only what a lockfile names. It reads the project's tracked files (git ls-files), but
// what "skip" names and, in a project, its copy of the core, which the core's own scan audits (.github/licences.json
// in the core). An entry covers a file by its "name" (the file's path) or its "files" (paths, or folders ending in
// "/"). It needs:
//   - each lockfile the config's "lockfiles" names, and each package.json with dependencies beside one of them or a
//     workspace of one, so the check reads every package any of them installs;
//   - an entry for each action a workflow or action file uses (`uses:`), but the owner's own (HaakTuah/, the core's
//     workflows among them) and the project's (./), by its name (owner/repo), at whatever version it is pinned to;
//   - an entry for each package a command fetches (licence-commands.mjs, beside this file, reads them: npx, npm exec,
//     npm install, npm link and npm pack, in any workflow, script or tool, a file with no extension read as a shell
//     script, the parts of a page or component that run, any command in a JSON or TOML file), written
//     name@exact.version and audited at that version, one entry for each version used, so an update is audited again,
//     with what it pulls in. A fetch it cannot read fails, but npm pack's, which runs nothing it fetches, and another
//     fetcher's (curl, wget, pip, pnpm, yarn, bun, playwright install, git clone and the like): each of those passes
//     only in a file an entry's "files" names, that entry its hand audit;
//   - an entry covering each script in a language it cannot read (Python, Ruby, PowerShell and the like): the entries
//     of what it uses;
//   - an entry covering each file but prose (Markdown, text) carrying a licence notice, code in any language or a text
//     asset (an SVG), and each font, image, sound, video, model or data file, and each binary file whatever its name;
//   - what lies under "served" but not "tools" reaches users, so every entry covering it there ships.
// The owner's own work (kind "own") covers only files it names one by one, never a file carrying someone's licence
// notice, an action or a package. Each "files" path, and each path of "scan", must name a tracked file or a folder
// holding one, so none is left covering nothing (or, misspelt, missing what it meant).
//
// The config's "scan" names "served", the folders (each ending in "/", or "" for the whole repository) whose files
// reach users ([] if none); "tools", the folders within them whose files do not; and "skip", the folders or files
// left out. Node's own modules only.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { OTHER_FETCHER, commandLines, commands, fetched } from "./licence-commands.mjs";

const OWN = "HaakTuah/";
const SHELL = /\.(ya?ml|sh|bash|zsh|fish|mk|toml|envrc)$|(^|\/)(Dockerfile[^/]*|Makefile|GNUmakefile|\.envrc)$/iu;
const JS = /\.([cm]?[jt]sx?)$/iu;
const WEB = /\.(html?|vue|svelte|astro)$/iu; // (pages and components: the parts that run, executable() below)
const YAML = /\.ya?ml$/iu;
const OTHER_LANGUAGE = /\.(py|pyw|rb|ps1|psm1|bat|cmd|pl|pm|php|lua|r|jl|tcl|vbs|groovy|gradle|kts)$/iu;
const CODE = /\.(html?|[cm]?[jt]sx?|css|scss|sass|less|vue|svelte|astro)$/iu;
const ASSET = new RegExp(
  "\\.(png|jpe?g|gif|webp|avif|jxl|heic|ico|bmp|tiff?|svg|psd|xcf|woff2?|ttf|otf|eot|mp3|ogg|oga|opus|wav|flac|m4a|aac|aiff?|mid|midi|" +
    "webm|mp4|mov|ogv|glb|gltf|fbx|blend|stl|wasm|pdf|csv|tsv|geojson|topojson|parquet|sqlite|db)$",
  "iu",
);
const PROSE_FILE = /\.(md|markdown|txt|rst|adoc)$/iu;
const NOTICE = /\/\*!|@license|SPDX-License-Identifier|Copyright\s+(\(c\)|©|\d{4})|Permission is hereby granted|Licensed under the/iu;
const EXACT = /^((?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*)@(\d+\.\d+\.\d+)$/iu;
const LOCKFILE = /(^|\/)(package-lock|npm-shrinkwrap)\.json$/u;
/**
 * An opening tag's attributes ([name, value] pairs) and the index of the ">" that ends it, from `at` just after its
 * name, read by the states HTML's tokenizer reads them in: a value is quoted only where it starts with its quote, an
 * unquoted one runs to a space or ">" whatever it holds (x=a="b>), and a name may hold quotes ("type=json is no type).
 * `end` is -1 where the tag has none.
 */
const HTML_SPACE = /[\t\n\f\r ]/u; // (HTML's whitespace, ASCII only: a no-break space is part of a name or value)
function attributesOf(text, at) {
  const attributes = [];
  let state = "before", name = "", value = "", quote = "";
  const done = () => { if (name) attributes.push([name, value]); name = value = ""; };
  for (let k = at; k < text.length; k++) {
    const ch = text[k], space = HTML_SPACE.test(ch);
    if (state === "quoted") { if (ch === quote) { state = "before"; done(); } else value += ch; continue; }
    if (state === "unquoted") { if (space || ch === ">") { done(); state = "before"; if (ch === ">") return { attributes, end: k }; } else value += ch; continue; }
    if (ch === ">") { done(); return { attributes, end: k }; }
    if (state === "value") { if (ch === '"' || ch === "'") { quote = ch; state = "quoted"; } else if (!space) { value = ch; state = "unquoted"; } continue; }
    if (state === "name") { if (ch === "=") state = "value"; else if (space) state = "after"; else if (ch === "/") { done(); state = "before"; } else name += ch; continue; }
    if (state === "after") { if (ch === "=") { state = "value"; continue; } if (space) continue; done(); state = "before"; }
    if (space || ch === "/") continue;
    name = ch; state = "name"; // ("before": a name starts, "=" itself among what may start one)
  }
  return { attributes, end: -1 };
}

/**
 * The parts of a page or component that run, read so as to fail closed rather than to match HTML's parser case by case:
 * every script element's tag and body wherever "<script" stands (in a comment, an attribute's value or a textarea too),
 * to the first "</script" that ends its name, or to the file's end where the body holds "<!--" (as HTML may read it on)
 * or the tag has no end, but a script of data or a template by its own type attribute (JSON-LD, an import map,
 * text/template); every event handler and bound attribute (onclick, @click, :value, v-if, x-data, quoted or not) and
 * javascript: address anywhere; an Astro component's frontmatter; and, but in a plain page, every expression in braces
 * (Vue's, Svelte's, Astro's, a style block's rules among them), each brace read to its match. Text outside these runs
 * nothing, so a page showing a command in its text fetches nothing.
 */
function executable(text, f) {
  const lower = text.toLowerCase(), parts = [];
  if (/\.astro$/iu.test(f)) { const front = /^\s*---\r?\n([\s\S]*?)(?:\r?\n---|$)/u.exec(text); if (front) parts.push(front[1]); }
  const ends = (k, length) => !/[^\t\n\f\r />]/u.test(lower[k + length] ?? ">"); // (a tag's name ends there)
  const closes = [];
  for (let k = lower.indexOf("</script"); k >= 0; k = lower.indexOf("</script", k + 8)) if (ends(k, 8)) closes.push(k);
  for (let k = lower.indexOf("<script"), covered = 0, c = 0; k >= 0; k = lower.indexOf("<script", k + 7)) {
    if (k < covered || !ends(k, 7)) continue; // (one inside a body or tag already read is part of it)
    const tag = attributesOf(text, k + 7);
    if (tag.end < 0) { parts.push(text.slice(k + 7)); break; }
    parts.push(text.slice(k + 7, tag.end)); // (its tag too: one that is only text may span a script that runs)
    while (c < closes.length && closes[c] <= tag.end) c++;
    let stop = c < closes.length ? closes[c] : text.length;
    // (a script that runs is read, to the file's end where it holds "<!--", and covers what it read; one of data covers
    // only its own tag, since it may be only text, in a comment or a value, before a script that runs)
    const type = tag.attributes.find(([n]) => n.toLowerCase() === "type")?.[1] ?? "";
    if (/json|template|importmap|speculationrules|^text\/(html|plain|markdown)$/iu.test(type.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/gu, ""))) covered = tag.end + 1;
    else {
      if (text.slice(tag.end + 1, stop).includes("<!--")) stop = text.length;
      parts.push(text.slice(tag.end + 1, stop));
      covered = stop;
    }
  }
  for (const m of text.matchAll(/\s(?:on[\w-]+|@[\w.:-]+|:[\w.:-]+|v-[\w.:-]+|x-[\w.:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/giu)) parts.push(m[1] ?? m[2] ?? m[3]);
  for (const m of text.matchAll(/javascript:([^"'<>]*)/giu)) parts.push(m[1]);
  if (!/\.html?$/iu.test(f)) {
    let depth = 0, start = 0;
    for (let k = 0; k < text.length; k++) {
      if (text[k] === "{" && depth++ === 0) start = k;
      else if (text[k] === "}" && depth > 0 && --depth === 0) parts.push(text.slice(start, k + 1));
    }
    if (depth > 0) parts.push(text.slice(start));
  }
  return parts.join("\n");
}

/** The failures of the scan of the project at `root`, against its audit's `entries` (read from `auditPath`). */
export function scan(settings, root, entries, auditPath, lockfiles = []) {
  const failures = [];
  const fail = (m) => { if (!failures.includes(m)) failures.push(m); };
  const holds = (p, f) => typeof p === "string" && (p === "" || p === f || (p.endsWith("/") && f.startsWith(p)));
  const under = (f, paths) => (paths ?? []).some((p) => holds(p, f));
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 << 20 });
  const tracked = git("ls-files", "-z").split("\0").filter(Boolean);
  const project = tracked.includes("core-manifest.md"); // (a project, whose copy of the core the core audits)
  const files = tracked.filter((f) => !(project && f.startsWith("core/")) && !under(f, settings.skip));
  const binary = new Set(git("ls-files", "--eol", "-z").split("\0").filter((l) => /^i\/-text\s/u.test(l)).map((l) => l.slice(l.indexOf("\t") + 1)));
  const served = (f) => under(f, settings.served) && !under(f, settings.tools);
  const covers = (e, f) => e.name === f || (Array.isArray(e.files) && e.files.some((p) => p !== "" && holds(p, f)));
  const covering = (f) => entries.filter((e) => covers(e, f));
  const need = (name, where, version) => {
    const named = entries.filter((e) => e.name === name && e.kind !== "own");
    if (!named.length) fail(`${name} (${where}) is not in ${auditPath}`);
    else if (version && !named.some((e) => e.version === version)) fail(`${name}@${version} (${where}) is audited at ${named.map((e) => e.version ?? "no version").join(", ")}: audit the new version, and what it pulls in`);
  };
  const needFile = (f, what, { own = true } = {}) => {
    const by = covering(f).filter((e) => own || e.kind !== "own");
    if (!by.length) fail(`${f} (${what}) is not in ${auditPath}${own ? "" : ", by an entry not the owner's own"}`);
    else if (served(f) && !by.every((e) => e.ships === true)) fail(`${f} (${what}) reaches users, so every entry covering it ships`);
  };
  const byHand = (f) => covering(f).some((e) => e.kind !== "own");
  const fetches = (text, f, literal = false) => {
    for (const line of commands(text, JS.test(f) || WEB.test(f), literal)) {
      const { specs, unreadable, packs } = fetched(String(line), line.atCommand === true, literal || line.literal === true);
      const where = `${f}, ${line.trim().replaceAll("\u0000", " ").slice(0, 120)}`;
      if (unreadable) fail(`${where}: ${unreadable}, which cannot be audited (fetch it as npx -p <name>@<exact version>)`);
      for (const spec of specs) {
        const exact = EXACT.exec(spec);
        if (exact) need(exact[1], where, exact[2]);
        else if (!(packs && byHand(f))) fail(`${where}: ${spec} cannot be audited (only name@exact.version${packs ? `, unless an entry's "files" names ${f}` : ""})`);
      }
    }
    if (/\bnpm_config_(@[\w-]+:)?registry\b|\bnpm_config_replace_registry_host\b|\bnpm_config_(user|global)config\b/iu.test(text)) fail(`${f}: it points npm at another registry than npm's, so no audited name can be trusted there`);
    if (/\bnpm_config_(package_lock|shrinkwrap)\b/iu.test(text)) fail(`${f}: it installs without the lockfile, so what it installs is not what the lockfile's check read`);
    if (OTHER_FETCHER.test(text) && !byHand(f)) fail(`${f}: ${OTHER_FETCHER.exec(text)[0]} fetches what no entry's "files" says (name ${f} in the entry that audits it)`);
  };

  for (const key of ["served", "tools", "skip"]) for (const p of settings[key] ?? []) if (p !== "" && !tracked.some((f) => holds(p, f))) fail(`the config's "scan.${key}": ${p} names no tracked file (a folder ends in "/")`);
  for (const e of entries) {
    if (e.files !== undefined && (!Array.isArray(e.files) || e.files.some((p) => typeof p !== "string" || !p))) { fail(`${auditPath}: ${e.name}: "files" is not a list of paths`); continue; }
    if (e.version !== undefined && typeof e.version !== "string") fail(`${auditPath}: ${e.name}: "version" is not text`);
    if (e.kind === "own" && (e.version !== undefined || (e.files ?? []).some((p) => p.endsWith("/")))) fail(`${auditPath}: ${e.name}: the owner's own work names its files one by one, with no version`);
    for (const p of e.files ?? []) if (!tracked.some((f) => holds(p, f))) fail(`${auditPath}: ${e.name}: ${p} names no tracked file`);
    const shipped = files.find((f) => served(f) && covers(e, f));
    if (shipped && e.ships !== true) fail(`${auditPath}: ${e.name}: it covers ${shipped}, which reaches users, so it ships`);
  }
  const locks = lockfiles.map((l) => ({ dir: posix.dirname(l) === "." ? "" : `${posix.dirname(l)}/`, packages: JSON.parse(readFileSync(join(root, l), "utf8")).packages ?? {} }));
  for (const f of files) {
    if (LOCKFILE.test(f) && !lockfiles.includes(f)) fail(`${f} installs packages the config's "lockfiles" does not name, so nothing checks their licences`);
    const text = binary.has(f) ? "" : readFileSync(join(root, f), "utf8");
    // (a file with no extension, a hook or a script, is read by its #! line: as shell or JavaScript, or as a language the
    // scan cannot read; with none, as shell)
    const bare = !binary.has(f) && !/.\.\w+$/u.test(posix.basename(f)); // (".envrc" and the like have none either)
    const interpreter = bare && text.startsWith("#!") ? /^#!\s*\S*?(?:env\s+(?:-\S+\s+)*)?([\w.-]+)/u.exec(text.split("\n")[0].replace(/^#!\s*\S*\//u, "#!"))?.[1] ?? "" : "";
    const other = OTHER_LANGUAGE.test(f) || (bare && interpreter && !/^(sh|bash|dash|zsh|ksh|node|deno|bun|tsx|ts-node)$/u.test(interpreter));
    const runs = !other && (SHELL.test(f) || JS.test(f) || WEB.test(f) || bare);
    if (runs) {
      // (a line that is only a comment fetches nothing; a comment after code stays, since a # or // in a string is none)
      const comment = JS.test(f) || WEB.test(f) ? /^\s*\/\/.*$/u : /^\s*#.*$/u;
      const src = (WEB.test(f) ? executable(text, f) : text).split("\n").map((l) => l.replace(comment, "")).join("\n");
      if (YAML.test(f)) {
        for (const m of src.matchAll(/(?:^|[\s{,])['"]?uses['"]?\s*:\s*['"]?([^\s'",}]+)/gu)) {
          const used = m[1];
          if (used.startsWith("./") || used.startsWith(OWN)) continue;
          need(used.startsWith("docker://") ? used.split("@")[0] : used.split("@")[0].split("/").slice(0, 2).join("/"), f);
        }
      }
      fetches(src, f);
    } else if (/\.json[c5]?$/u.test(f) && f !== auditPath && !LOCKFILE.test(f)) {
      let json;
      try { json = JSON.parse(text); } catch {
        // (a config with comments, as jsconfig.json and the like may hold: read whole, but a package.json must parse)
        if (posix.basename(f) === "package.json") fail(`${f} cannot be read as JSON, so the commands in it cannot be scanned`);
        else fetches(text.split("\n").map((l) => l.replace(/^\s*\/\/.*$/u, "")).join("\n"), f);
      }
      if (json !== undefined) {
        for (const line of commandLines(json)) fetches(String(line), f, line.literal === true);
        const deps = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"].some((k) => Object.keys(json?.[k] ?? {}).length);
        if (posix.basename(f) === "package.json" && deps && !locks.some(({ dir, packages }) => f.startsWith(dir) && packages[posix.dirname(f.slice(dir.length)).replace(/^\.$/u, "")]))
          fail(`${f} has dependencies no lockfile the config names installs, so nothing checks their licences`);
      }
    } else if (other) {
      if (!byHand(f)) fail(`${f} is in a language the scan cannot read: name it in the "files" of the entries of what it uses`);
      else if (served(f) && !covering(f).every((e) => e.ships === true)) fail(`${f} (a script in a language the scan cannot read) reaches users, so every entry covering it ships`);
    }
    // (a notice in any file but prose, the notices a project writes itself among them: code copied in, in any language)
    if (!binary.has(f) && !PROSE_FILE.test(f) && NOTICE.test(text)) needFile(f, "a file carrying a licence notice", { own: false });
    if (ASSET.test(f) || binary.has(f)) needFile(f, binary.has(f) && !ASSET.test(f) ? "a binary file" : "a font, image, sound, video, model or data file");
  }
  return { failures, scanned: files.length };
}
