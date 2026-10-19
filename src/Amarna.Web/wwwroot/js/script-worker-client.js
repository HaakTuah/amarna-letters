// The page's side of the script players' worker (see Services/ScriptWorker.cs). The worker runs the game's own .NET
// code in a second runtime, booted from the files the page has already downloaded, and answers one request at a time.
let worker = null;
let ready = null;
let stopped = null;
const pending = new Map();
let nextId = 1;

// For measurement only: how long the worker took to start, the requests it answered and the time it spent on them.
const stats = (globalThis.amarnaScriptWorker = { bootMs: 0, asks: 0, busyMs: 0, slowdown: 1 });

// The runtime's loader, under the fingerprinted name the page's import map gives it (workers do not see import maps).
function dotnetUrl() {
    try {
        const map = JSON.parse(document.querySelector('script[type="importmap"]')?.textContent || "{}");
        const mapped = map.imports?.["./_framework/dotnet.js"];
        if (mapped) return new URL(mapped, document.baseURI).href;
    } catch { }
    return new URL("_framework/dotnet.js", document.baseURI).href;
}

function stop(reason) {
    stopped ??= reason || "the worker stopped";
    for (const p of pending.values()) p.reject(new Error(stopped));
    pending.clear();
    try { worker?.terminate(); } catch { }
}

// Starts the worker once; true when its runtime is ready, false if it cannot start.
export function start() {
    ready ??= new Promise(resolve => {
        try {
            worker = new Worker(new URL("script-worker.js", import.meta.url), { type: "module", name: "script-players" });
        } catch (err) {
            stop(String(err?.message || err));
            resolve(false);
            return;
        }
        worker.onmessage = e => {
            const m = e.data;
            if (m.type === "ready") {
                stats.bootMs = m.ms;
                stats.slowdown = m.slowdown;
                resolve(true);
            } else if (m.type === "failed") {
                console.warn("The script players think in the page: their worker could not start.", m.error);
                stop(m.error);
                resolve(false);
            } else if (m.type === "answer") {
                const p = pending.get(m.id);
                if (!p) return;
                pending.delete(m.id);
                if (m.ms) { stats.asks++; stats.busyMs += m.ms; }
                if (m.error) p.reject(new Error(m.error)); else p.resolve(m.body);
            }
        };
        worker.onerror = e => {
            e.preventDefault?.();
            stop(e.message || "the worker stopped");
            resolve(false);
        };
        // A worker that has not started in two minutes is given up, and the page plays instead of waiting on it.
        setTimeout(() => {
            if (stats.bootMs || stopped) return;
            stop("it did not start within two minutes");
            resolve(false);
        }, 120000);
        worker.postMessage({ type: "boot", dotnet: dotnetUrl() });
    });
    return ready;
}

// A new game begins: requests still queued for earlier games are answered "superseded" without being worked out.
export function begin(game) {
    worker?.postMessage({ type: "begin", game });
}

// One request (JSON text, passed through untouched); resolves with the reply's text, rejects if the worker has stopped.
export function ask(game, body) {
    return new Promise((resolve, reject) => {
        if (stopped || !worker) { reject(new Error(stopped || "no worker")); return; }
        const id = nextId++;
        pending.set(id, { resolve, reject });
        worker.postMessage({ type: "ask", id, game, body });
    });
}
