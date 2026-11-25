// The parser's own thread (parser.mjs, beside this file): it loads the parser once, then for each call runs the named
// export of a reader's module with the parser's parse, and answers with its result, waking the thread that waits.
// Node's own modules, and the installed packages.
import { workerData } from "node:worker_threads";
import { load } from "./parser.mjs";

const { port, signal } = workerData;
const loading = load();

// (`loading` is awaited apart, so that its failure is told from the reader's: "load" or "read", parser.mjs's kinds)
loading.catch(() => {});
port.on("message", async ({ url, name, args }) => {
  let reply;
  try {
    const { parse } = await loading;
    try {
      const read = (await import(url))[name];
      reply = { result: read(parse, ...args) };
    } catch (e) { reply = { error: String(e?.message ?? e), kind: "read" }; }
  } catch (e) {
    reply = { error: String(e?.message ?? e), kind: "load" };
  }
  port.postMessage(reply);
  Atomics.store(signal, 0, 1);
  Atomics.notify(signal, 0);
});
