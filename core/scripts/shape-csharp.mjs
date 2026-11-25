// The shape check's reader of C# (shape.mjs and shape-readers.mjs, beside this file; #354): a file's functions, its
// using directives, the namespaces and types it declares and its tokens, for the runs of the clock, each read on the
// parser the core installs (csharp-tree.mjs, which says how; #529, and #530's item 6); where each using directive
// leads among the project's files; and the packages the project declares. It never runs the code. Node's own modules,
// and the parser's installed packages.
//
// What a file takes from another is read from its using directives alone: `using N;` takes every file that declares the
// namespace N; `using static N.T;` and an alias, the files that declare the type T in N. What a file sees by its own
// namespace, and a name written out in full, it takes without a directive, and the reader does not read.
import path from "node:path";
import { append, holdsUnder, nameTree } from "./code-shape.mjs";
import { csharpTree } from "./csharp-tree.mjs";
import { unreachedFor } from "./parser.mjs";

// The clock and randomness a system of rules may not take for itself (shape.mjs, "clock"): each a run of tokens.
export const OWN = [
  ...[["DateTime", "Now"], ["DateTime", "UtcNow"], ["DateTime", "Today"], ["DateTimeOffset", "Now"], ["DateTimeOffset", "UtcNow"],
    ["Environment", "TickCount"], ["Environment", "TickCount64"], ["Stopwatch", "GetTimestamp"], ["Stopwatch", "StartNew"],
    ["Random", "Shared"], ["Guid", "NewGuid"], ["TimeProvider", "System"], ["RandomNumberGenerator", "GetBytes"], ["RandomNumberGenerator", "GetInt32"]]
    .map(([a, b]) => ({ run: [a, ".", b], what: `${a}.${b}` })),
  { run: ["new", "Random", "("], what: "new Random(" },
];

// A file read (csharp-tree.mjs, which says how each part is read): { functions (null where the parser cannot read the
// file whole; none where it could not be installed, the registry not answering in a project's pull request, which the
// shape check says: shape-readers.mjs, unreachedReaders), usings: [{ target, static, alias }] (null where they cannot
// be told: the parser could not be installed, or could not read the file in time), namespaces, types, toks, comments:
// [{ line, text }] }.
export function readCsharp(src) {
  if (unreachedFor("csharp")) return { functions: [], usings: null, namespaces: [], types: [], toks: [], comments: [] };
  return csharpTree(src) ?? { functions: null, usings: null, namespaces: [], types: [], toks: [], comments: [] };
}

// Where the project's C# declares each namespace and type: { namespaces, types }, each a Map of a name to its files.
export function csharpIndex(readings) {
  const namespaces = new Map(), types = new Map();
  for (const [file, r] of readings) {
    for (const n of r.namespaces) append(namespaces, n, file);
    for (const t of r.types) append(types, t, file);
  }
  return { namespaces, types, under: nameTree(namespaces.keys()) };
}

// Where a using directive leads: { to: [files] } where the project declares what it names, else { outside: its name }.
export function resolveCsharp(u, index) {
  const name = u.target;
  if (!u.static && !u.alias && index.namespaces.has(name)) return { to: index.namespaces.get(name) };
  const found = index.namespaces.get(name) ?? index.types.get(name);
  if (found) return { to: found };
  // (a namespace that only holds the project's own namespaces leads to no file, and nowhere outside either)
  if (holdsUnder(index.under, name)) return { to: [] };
  return { outside: name };
}

// The packages the project's own .csproj files reference: { ships, declared }, each a Set of package ids; one marked
// PrivateAssets="all" (an analyzer, a build tool) is declared and not shipped.
export function csharpPackages(texts) {
  const ships = new Set(), declared = new Set();
  for (const [file, text] of Object.entries(texts)) {
    if (path.posix.extname(file) !== ".csproj") continue;
    // (each reference read up to the next, by indexOf alone, so that no file makes the reading slower than its length)
    for (const part of text.split("<PackageReference").slice(1)) {
      const end = part.indexOf(">"), attributes = end < 0 ? part : part.slice(0, end);
      const body = attributes.endsWith("/") ? "" : part.slice(end + 1, Math.max(0, part.indexOf("</PackageReference>")));
      const id = /\b(?:Include|Update)\s*=\s*"([^"]+)"/u.exec(attributes)?.[1];
      if (!id || !/^\s/u.test(part)) continue;
      declared.add(id);
      if (!/PrivateAssets\s*=\s*"all"/iu.test(attributes) && !/<PrivateAssets>\s*all\s*<\/PrivateAssets>/iu.test(body)) ships.add(id);
    }
  }
  return { ships, declared };
}
