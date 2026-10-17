// Event logs live in IndexedDB (the log is the save game and the replay) and can be exported as files.
const DB = "amarna-letters";
const STORE = "logs";

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const result = fn(store);
    t.oncomplete = () => resolve(result && "result" in result ? result.result : undefined);
    t.onerror = () => reject(t.error);
  });
}

export async function saveLog(id, meta, text) {
  try {
    await tx("readwrite", s => s.put({ meta, text, saved: Date.now() }, id));
    return true;
  } catch { return false; }
}

export async function loadLog(id) {
  try {
    const row = await tx("readonly", s => s.get(id));
    return row ? row.text : null;
  } catch { return null; }
}

export async function listLogs() {
  try {
    const db = await open();
    return await new Promise((resolve) => {
      const out = [];
      const req = db.transaction(STORE, "readonly").objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (!c) { out.sort((a, b) => b.saved - a.saved); resolve(out); return; }
        out.push({ id: String(c.key), meta: c.value.meta || "", saved: c.value.saved || 0 });
        c.continue();
      };
      req.onerror = () => resolve(out);
    });
  } catch { return []; }
}

export async function deleteLog(id) {
  try { await tx("readwrite", s => s.delete(id)); return true; } catch { return false; }
}

export function download(filename, text) {
  const blob = new Blob([text], { type: "application/x-ndjson" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// The API key: held in memory by the app, optionally in this tab's session storage. Never localStorage or cookies.
export function getSessionKey() {
  try { return sessionStorage.getItem("amarna-api-key"); } catch { return null; }
}

export function setSessionKey(value) {
  try {
    if (value) sessionStorage.setItem("amarna-api-key", value);
    else sessionStorage.removeItem("amarna-api-key");
  } catch { }
}
