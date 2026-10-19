// The script players' worker: the game's own .NET code in a runtime of its own, off the page's thread. It answers one
// request at a time, in the order they come (see Services/ScriptWorker.cs); the page passes JSON text in and out.
let host = null;
let current = null;
const ended = new Set();
const queue = [];
let scheduled = false;

// A listener, not self.onmessage: the runtime's loader takes a worker with onmessage set for one of its own threads,
// and would then wait for a main runtime that does not exist.
self.addEventListener("message", e => {
    const m = e.data;
    if (m.type === "boot") boot(m.dotnet);
    else if (m.type === "begin") newest(m.game);
    else if (m.type === "ask") { queue.push(m); schedule(); }
});

function newest(game) {
    if (current !== null && current !== game) ended.add(current);
    current = game;
}

async function boot(url) {
    try {
        const t0 = performance.now();
        const { dotnet } = await import(url);
        const runtime = await dotnet.create();
        const exports = await runtime.getAssemblyExports(runtime.getConfig().mainAssemblyName);
        host = exports.Amarna.Web.Services.ScriptWorkerExports;
        host.WarmUp();
        const ms = performance.now() - t0;
        slower(ms);
        self.postMessage({ type: "ready", ms, slowdown: self.__amarnaSlowdown || 1 });
        schedule();
    } catch (err) {
        self.postMessage({ type: "failed", error: String(err?.message || err) });
    }
}

// One request per task, so that a newer game's "begin" is seen between requests.
function schedule() {
    if (scheduled || !host || queue.length === 0) return;
    scheduled = true;
    setTimeout(() => { scheduled = false; answerOne(); schedule(); }, 0);
}

function answerOne() {
    const m = queue.shift();
    if (!m) return;
    if (ended.has(m.game)) { self.postMessage({ type: "answer", id: m.id, body: "superseded" }); return; }
    if (m.game !== current) newest(m.game);
    const t0 = performance.now();
    let body = null, error = null;
    try { body = host.Answer(m.body); } catch (err) { error = String(err?.message || err); }
    const ms = performance.now() - t0;
    slower(ms);
    self.postMessage({ type: "answer", id: m.id, body, error, ms });
}

// For measurement only. Chrome's CPU throttling does not reach workers, so a profiler emulating a slower phone sets
// self.__amarnaSlowdown (through the DevTools protocol) and the worker waits out the difference after each piece of
// work. It is never set in play.
function slower(ms) {
    const factor = self.__amarnaSlowdown;
    if (!(factor > 1)) return;
    const end = performance.now() + (factor - 1) * ms;
    while (performance.now() < end) { }
}
