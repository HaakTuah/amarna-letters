// The parser the core reads other publishers' languages with (CHOICES.md, "one parser, tree-sitter"; #529):
// web-tree-sitter, and one grammar for each language a reader built on it reads, each a package of the core's lock file
// at one exact version in the parser's own lock file, installed from the registry into .packages/parser/node_modules/ only
// where a job names it (install.mjs parser, or all; packages.mjs; #654, #719). Each
// file is read from there and handed to the parser as bytes, so nothing is fetched or built while a file is read.
// A grammar comes only with the reader that needs it: C#'s, for all the shape check's reader of C# reads
// (csharp-tree.mjs); bash's, for the commands of a workflow's step, which the steps read (bash-commands.mjs);
// JavaScript's, TypeScript's and TSX's, for the functions of JavaScript and TypeScript the shape check and the measures
// find (javascript-functions.mjs); Python's, for the functions, imports and tokens of Python the shape check reads
// (python-tree.mjs).
//
// The parser starts only where a file is read with it, so that a script that reads none, as most that load the shape
// check's readers, pays nothing for it: in a worker thread of its own (parser-worker.mjs), which the reader's call
// waits on, so that the readers stay synchronous as the scripts that call them are. Node's own modules, and the
// installed packages.
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { MessageChannel, Worker, receiveMessageOnPort } from "node:worker_threads";
import { installed, installedFile, unreached } from "./packages.mjs";

// Each language read, by the name a reader asks for, and its grammar's package and file.
const GRAMMARS = {
  csharp: ["tree-sitter-c-sharp", "tree-sitter-c_sharp.wasm"], bash: ["tree-sitter-bash", "tree-sitter-bash.wasm"],
  javascript: ["tree-sitter-javascript", "tree-sitter-javascript.wasm"],
  typescript: ["tree-sitter-typescript", "tree-sitter-typescript.wasm"], tsx: ["tree-sitter-typescript", "tree-sitter-tsx.wasm"],
  python: ["tree-sitter-python", "tree-sitter-python.wasm"],
};
// Whether the parser or the grammar of `language` could not be installed (packages.mjs, unreached()): the registry not
// answering, or, in a project's own job, its install failing where the copy ran it (#1093, point 1): its reader then
// reads no file of it, and the check that runs it says so as a warning, failing nothing by that alone (#654, point 4).
export const unreachedFor = language => ["web-tree-sitter", GRAMMARS[language][0]].some(unreached);
const bytes = (name, rel) => fs.readFileSync(installedFile(name, rel));
// (how long a call waits on the worker: a file the parser takes longer on is one its reader cannot follow)
const WAIT = 120000;

/** A call the parser's thread could not answer: `kind` "load" where the parser or a grammar could not be loaded from
 *  the core's install, "read" where the file at hand could not be read with it (an error, or no answer in WAIT). */
export class ParserFailed extends Error {
  constructor(message, kind) { super(message); this.kind = kind; }
}

/** The parser loaded, in the thread that calls this: { parse(language, text, budget) }, a tree its caller frees with
 *  tree.delete() once read, its memory the parser's own, or null where a budget was given and the parse ran past it.
 *  Used by the worker. */
export async function load() {
  const { default: TreeSitter } = await import(pathToFileURL(installedFile("web-tree-sitter", "web-tree-sitter.cjs")).href);
  const { Parser, Language } = TreeSitter;
  await Parser.init({ wasmBinary: bytes("web-tree-sitter", "web-tree-sitter.wasm") });
  const languages = new Map();
  for (const [name, [pkg, file]] of Object.entries(GRAMMARS)) languages.set(name, await Language.load(bytes(pkg, file)));
  // (one parser for each language, kept for the thread's life: a reader that reads many short texts, as the steps of
  // a workflow, pays for none but the first)
  const parsers = new Map();
  return {
    // (with `budget`, in milliseconds, a parse that runs past it is stopped and gives null, so that a reader of short
    // texts is never held by one the grammar recovers from slowly)
    parse(language, text, budget = null) {
      const grammar = languages.get(language);
      if (!grammar) throw new Error(`No grammar for ${language} is installed. Mend: add its package to the core's .packages/package.json at one exact version with the reader that needs it, write its entry in .packages/package-lock.json by npm's own install there, and name it in GRAMMARS in scripts/parser.mjs`);
      if (!parsers.has(language)) { const parser = new Parser(); parser.setLanguage(grammar); parsers.set(language, parser); }
      const parser = parsers.get(language);
      if (budget === null) return parser.parse(text);
      const until = performance.now() + budget;
      const tree = parser.parse(text, null, { progressCallback: () => performance.now() > until });
      if (!tree) parser.reset();
      return tree;
    },
  };
}

let bridge = null;
function start() {
  // (asked here, on the main thread, so that a copy whose parser's packages are not installed installs them before the
  // thread reads them: the thread itself never installs; packages.mjs, #1093, point 1)
  installed("web-tree-sitter");
  const { port1, port2 } = new MessageChannel(), signal = new Int32Array(new SharedArrayBuffer(4));
  // (the thread takes the process's flags but --input-type, which Node refuses for a module file: a script run with -e and
  // it would start a thread that dies at once, and every file read wait out WAIT and be lost)
  const execArgv = process.execArgv.filter(a => !/^--input-type(?:=|$)/u.test(a));
  const worker = new Worker(new URL("./parser-worker.mjs", import.meta.url), { workerData: { port: port2, signal }, transferList: [port2], execArgv });
  // (neither keeps the process alive once its own work is done)
  worker.unref();
  port1.unref();
  return { port: port1, signal, worker };
}

/** The export `name` of the module at `url` (a reader's own, beside this file), called in the parser's thread as
 *  name(parse, ...args), and its result, which must be data that can be copied; the call waits for it. */
export function inParser(url, name, ...args) {
  bridge ??= start();
  Atomics.store(bridge.signal, 0, 0);
  bridge.port.postMessage({ url, name, args });
  if (Atomics.wait(bridge.signal, 0, 0, WAIT) === "timed-out") {
    // (the thread still works on it: it goes, and the next call starts another, so that no answer reaches a later call)
    bridge.worker.terminate();
    bridge = null;
    throw new ParserFailed(`the parser gave no answer in ${WAIT / 1000} s`, "read");
  }
  const reply = receiveMessageOnPort(bridge.port)?.message;
  if (!reply) throw new ParserFailed("the parser's thread answered nothing", "load");
  if (reply.error !== undefined) throw new ParserFailed(reply.error, reply.kind);
  return reply.result;
}
