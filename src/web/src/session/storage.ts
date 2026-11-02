/**
 * Event logs live in IndexedDB (the log is the save game and the replay), in the page and in the engine's worker alike;
 * beside them, the batches a game in the background still has out, so a game opened again collects their answers.
 */
import type { BatchStore } from "@amarna/llm";

const DB = "amarna-letters";
const STORE = "logs";
const BATCHES = "batches";

export interface SavedLog {
  id: string;
  meta: string;
  saved: number;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = () => {
      for (const name of [STORE, BATCHES]) if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void, store = STORE): Promise<T | undefined> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = () => reject(t.error);
  });
}

export async function saveLog(id: string, meta: string, text: string): Promise<boolean> {
  try {
    await tx("readwrite", (s) => s.put({ meta, text, saved: Date.now() }, id));
    return true;
  } catch {
    return false;
  }
}

export async function loadLog(id: string): Promise<string | null> {
  try {
    const row = (await tx("readonly", (s) => s.get(id))) as { text?: string } | undefined;
    return row?.text ?? null;
  } catch {
    return null;
  }
}

export async function listLogs(): Promise<SavedLog[]> {
  try {
    const db = await open();
    return await new Promise((resolve) => {
      const out: SavedLog[] = [];
      const req = db.transaction(STORE, "readonly").objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (!c) {
          out.sort((a, b) => b.saved - a.saved);
          resolve(out);
          return;
        }
        const v = c.value as { meta?: string; saved?: number };
        out.push({ id: String(c.key), meta: v.meta ?? "", saved: v.saved ?? 0 });
        c.continue();
      };
      req.onerror = () => resolve(out);
    });
  } catch {
    return [];
  }
}

export async function deleteLog(id: string): Promise<void> {
  try {
    await tx("readwrite", (s) => s.delete(id));
  } catch {
    /* nothing to delete */
  }
}

/**
 * The batches sent, by the ids of their requests (no key and nothing of the account: only the batch's own id), kept
 * while the service keeps their answers (29 days) and then forgotten.
 */
const BatchDays = 29;
export const savedBatches: BatchStore = {
  async find(request) {
    const row = (await tx("readonly", (s) => s.get(request), BATCHES)) as { batch: string; at: number } | undefined;
    return row !== undefined && Date.now() - row.at < BatchDays * 86_400_000 ? row.batch : null;
  },
  async keep(batch, requests) {
    const now = Date.now();
    await tx(
      "readwrite",
      (s) => {
        for (const r of requests) s.put({ batch, at: now }, r);
        const old = s.openCursor();
        old.onsuccess = () => {
          const c = old.result;
          if (c === null) return;
          if (now - ((c.value as { at?: number }).at ?? 0) >= BatchDays * 86_400_000) c.delete();
          c.continue();
        };
      },
      BATCHES,
    );
  },
};

export function download(filename: string, text: string): void {
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
export function getSessionKey(): string | null {
  try {
    return sessionStorage.getItem("amarna-api-key");
  } catch {
    return null;
  }
}

export function setSessionKey(value: string | null): void {
  try {
    if (value) sessionStorage.setItem("amarna-api-key", value);
    else sessionStorage.removeItem("amarna-api-key");
  } catch {
    /* storage refused */
  }
}
