import type { TimedText } from "./asr-core.ts";
export const CHECKPOINT_TTL = 24 * 60 * 60 * 1000;
export type SubtitleCheckpoint = { key: string; expires: number; duration: number; language: string; completed: number; words: TimedText[] };
type Stored = { key: string; expires: number; value: unknown };
export interface CheckpointStore {
  load(key: string): Promise<SubtitleCheckpoint | undefined>;
  save(value: SubtitleCheckpoint): Promise<void>;
  translation(key: string, language: string, cue: string): Promise<string | undefined>;
  saveTranslation(key: string, language: string, cue: string, text: string): Promise<void>;
  clear(): Promise<void>;
}
const DB_NAME = "aenural-subtitle-jobs-v1";
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("records", { keyPath: "key" });
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
async function record(key: string, value?: Stored): Promise<Stored | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("records", "readwrite"), store = tx.objectStore("records");
      const request = value ? store.put(value) : store.get(key);
      let found: Stored | undefined;
      request.onsuccess = () => { if (!value) { found = request.result; if (found && found.expires <= Date.now()) { store.delete(key); found = undefined; } } };
      tx.oncomplete = () => resolve(found); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error ?? new Error("Checkpoint write aborted."));
    });
  } finally { db.close(); }
}
export async function cleanSubtitleCheckpoints(all = false) {
  const db = await database();
  try { await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("records", "readwrite"), store = tx.objectStore("records");
    if (all) store.clear();
    else { const cursor = store.openCursor(); cursor.onsuccess = () => { const item = cursor.result; if (!item) return; if ((item.value as Stored).expires <= Date.now()) item.delete(); item.continue(); }; }
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  }); } finally { db.close(); }
}
export const browserCheckpoints: CheckpointStore = {
  async load(key) { return (await record(key))?.value as SubtitleCheckpoint | undefined; },
  async save(value) { await record(value.key, { key: value.key, expires: value.expires, value }); },
  async translation(key, language, cue) { return (await record(`${key}/${language}/${cue}`))?.value as string | undefined; },
  async saveTranslation(key, language, cue, text) { const id = `${key}/${language}/${cue}`; await record(id, { key: id, expires: Date.now() + CHECKPOINT_TTL, value: text }); },
  async clear() { await cleanSubtitleCheckpoints(true); },
};
// SHA-256 over ordered hashes of fixed-size blocks: bounded memory, full file
// coverage. A changed middle section cannot accidentally reuse an old job.
export async function subtitleFileKey(file: Blob, signal: AbortSignal, report?: (done: number, total: number) => void) {
  const hashes: Uint8Array<ArrayBuffer>[] = [];
  for (let offset = 0; offset < file.size; offset += 4 * 1024 ** 2) {
    signal.throwIfAborted();
    hashes.push(new Uint8Array(await crypto.subtle.digest("SHA-256", await file.slice(offset, offset + 4 * 1024 ** 2).arrayBuffer())));
    report?.(Math.min(file.size, offset + 4 * 1024 ** 2), file.size);
  }
  signal.throwIfAborted();
  const combined = new Uint8Array(hashes.length * 32); hashes.forEach((hash, index) => combined.set(hash, index * 32));
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", combined))].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
