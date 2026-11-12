// The check for code nothing uses (the workshop lane; "Keep it lean" in AGENTS.md): every file under src/ that no other
// file imports, and every export that no file imports, found with the TypeScript compiler's own API over the same two
// programs `npm run typecheck` builds. A test file (src/*/test/*.test.ts) is an entry, and so is any file a
// `new URL("./file", import.meta.url)` names. What is reached some other way is listed in scripts/unused-code.json
// with its reason; an entry that no longer needs listing fails too. Run: node scripts/unused-code.mjs [--all]
// (--all also lists the exports that only their own file uses, which are not failures: the finder only fails the ones
// that are not used anywhere, their own file included).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (f) => path.relative(root, f).split(path.sep).join("/");
const allow = JSON.parse(fs.readFileSync(path.join(root, "scripts/unused-code.json"), "utf8"));
const showAll = process.argv.includes("--all");

const isSource = (f) => !f.endsWith(".d.ts") && !f.includes("/node_modules/") && rel(f).startsWith("src/");
const isEntry = (f) => /\/test\/.*\.test\.tsx?$/u.test(f);

const files = new Set(); // every source file of the programs, by relative path
const importedFiles = new Set(); // files some other file imports, re-exports from or names by URL
const usedExports = new Set(); // "file#name" for every export some file imports
const exportsOf = new Map(); // "file#name" -> { file, name, local: whether its own file uses it besides declaring it }

function load(tsconfigPath) {
  const text = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  const cfg = ts.parseJsonConfigFileContent(text.config, ts.sys, path.dirname(tsconfigPath));
  return ts.createProgram({ rootNames: cfg.fileNames, options: cfg.options });
}

function keyOf(symbol) {
  const d = symbol.declarations?.[0];
  return d ? `${rel(d.getSourceFile().fileName)}#${symbol.name}` : null;
}

function examine(program) {
  const checker = program.getTypeChecker();
  const resolve = (symbol) => (symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);
  const moduleFile = (specifier) => {
    const target = checker.getSymbolAtLocation(specifier)?.declarations?.[0];
    return target && ts.isSourceFile(target) ? target : null;
  };
  const useWhole = (sf) => {
    const m = checker.getSymbolAtLocation(sf);
    for (const e of m ? checker.getExportsOfModule(m) : []) usedExports.add(keyOf(resolve(e)));
  };
  const markFile = (sf, from) => {
    if (sf.fileName !== from.fileName && isSource(sf.fileName)) importedFiles.add(rel(sf.fileName));
  };
  for (const sf of program.getSourceFiles()) {
    if (!isSource(sf.fileName)) continue;
    files.add(rel(sf.fileName));
    const visit = (node) => {
      // a Vite import with a query (`./worker.ts?worker&url`) names its file before the "?"
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text.includes("?")) {
        const target = path.resolve(path.dirname(sf.fileName), node.moduleSpecifier.text.split("?")[0]);
        if (isSource(target)) importedFiles.add(rel(target));
      }
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
        const target = moduleFile(node.moduleSpecifier);
        if (target) {
          markFile(target, sf);
          const clause = ts.isImportDeclaration(node) ? node.importClause : null;
          if (clause) {
            if (clause.name) usedExports.add(keyOf(resolve(checker.getSymbolAtLocation(clause.name))));
            const named = clause.namedBindings;
            if (named && ts.isNamedImports(named)) for (const el of named.elements) usedExports.add(keyOf(resolve(checker.getSymbolAtLocation(el.name))));
            if (named && ts.isNamespaceImport(named)) {
              const ns = checker.getSymbolAtLocation(named.name);
              const whole = [];
              const scan = (n) => {
                if (ts.isIdentifier(n) && n !== named.name && checker.getSymbolAtLocation(n) === ns) {
                  const p = n.parent;
                  if (ts.isPropertyAccessExpression(p) && p.expression === n) usedExports.add(keyOf(resolve(checker.getSymbolAtLocation(p.name))));
                  else if (ts.isQualifiedName(p) && p.left === n) usedExports.add(keyOf(resolve(checker.getSymbolAtLocation(p.right))));
                  else whole.push(n);
                }
                ts.forEachChild(n, scan);
              };
              scan(sf);
              if (whole.length) useWhole(target);
            }
          }
          // `export { a } from "./x"` and `export * from "./x"` use the file; what they re-export counts only when imported.
        }
      }
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
        const target = moduleFile(node.arguments[0]);
        if (target) { markFile(target, sf); useWhole(target); }
      }
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
        const target = moduleFile(node.argument.literal);
        if (target) {
          markFile(target, sf);
          if (node.qualifier && ts.isIdentifier(node.qualifier)) usedExports.add(keyOf(resolve(checker.getSymbolAtLocation(node.qualifier))));
          else useWhole(target);
        }
      }
      // new URL("./file.ts", import.meta.url) names a file (a worker, a fixture)
      if (ts.isNewExpression(node) && node.expression.getText(sf) === "URL" && node.arguments?.length === 2 && node.arguments[1].getText(sf) === "import.meta.url" && ts.isStringLiteralLike(node.arguments[0])) {
        const target = path.resolve(path.dirname(sf.fileName), node.arguments[0].text);
        if (isSource(target)) importedFiles.add(rel(target));
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  // the exports each file declares itself, and whether the file uses them beyond declaring them
  for (const sf of program.getSourceFiles()) {
    if (!isSource(sf.fileName)) continue;
    const m = checker.getSymbolAtLocation(sf);
    if (!m) continue;
    for (const e of checker.getExportsOfModule(m)) {
      const s = resolve(e);
      if (s.declarations?.[0]?.getSourceFile() !== sf) continue; // a re-export: its origin is judged where it is declared
      const k = keyOf(s);
      if (exportsOf.has(k)) continue;
      let uses = 0;
      const count = (n) => {
        if (ts.isIdentifier(n) && n.text === s.name) {
          const here = ts.isShorthandPropertyAssignment(n.parent) ? checker.getShorthandAssignmentValueSymbol(n.parent) : checker.getSymbolAtLocation(n);
          if (here && resolve(here) === s && !s.declarations.some((d) => d.name === n || (ts.isExportSpecifier(d) && d === n.parent))) uses++;
        }
        ts.forEachChild(n, count);
      };
      count(sf);
      exportsOf.set(k, { file: rel(sf.fileName), name: s.name, local: uses > 0 });
    }
  }
}

examine(load(path.join(root, "tsconfig.json")));
examine(load(path.join(root, "src/web/tsconfig.json")));

const deadFiles = [...files].filter((f) => !importedFiles.has(f) && !isEntry(f));
const deadExports = [...exportsOf.entries()].filter(([k, e]) => !usedExports.has(k) && !isEntry(e.file));

const problems = [];
const stale = [];
const listedFiles = allow.files ?? {};
const listedExports = allow.exports ?? {};
const seenFiles = new Set();
const seenExports = new Set();
for (const f of deadFiles) {
  if (f in listedFiles) seenFiles.add(f);
  else problems.push(`file nothing imports: ${f}`);
}
const deadFileSet = new Set(deadFiles);
for (const [k, e] of deadExports) {
  if (deadFileSet.has(e.file)) continue; // the file is reported as a whole
  if (k in listedExports) { seenExports.add(k); continue; }
  if (e.local && !showAll) continue;
  problems.push(`${e.local ? "export only its own file uses" : "export nothing uses"}: ${k.replace("#", " ")}`);
}
for (const f of Object.keys(listedFiles)) if (!seenFiles.has(f)) stale.push(`listed file is imported or gone: ${f}`);
for (const k of Object.keys(listedExports)) if (!seenExports.has(k)) stale.push(`listed export is used or gone: ${k}`);

const out = [...problems, ...stale];
if (out.length) {
  console.log(`FAIL: scripts/unused-code.mjs: ${out.length} found (remove them, or list what is reached some other way in scripts/unused-code.json with its reason)`);
  for (const l of out) console.log(`  ${l}`);
  process.exit(1);
}
console.log("unused-code: nothing unused");
