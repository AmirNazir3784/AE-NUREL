import type { AsrProgress } from "./asr-core.ts";

// Tracks the selected model's complete weight inventory, including cache hits.
// Concurrent files and retried ranges cannot move the preparation bar backwards.
// This measures resource preparation only, never inference or the whole job.
export function modelPreparation(files: Readonly<Record<string, number | undefined>>) {
  const sizes = new Map(Object.entries(files)), loaded = new Map<string, number>();
  function update(file: string, bytes: number, total?: number) {
    if (!sizes.has(file) || !Number.isFinite(bytes) || bytes < 0) return;
    if (total !== undefined && Number.isFinite(total) && total > 0) sizes.set(file, total);
    loaded.set(file, Math.max(loaded.get(file) ?? 0, Math.min(bytes, sizes.get(file) ?? bytes)));
  }
  return {
    update,
    progress(value: AsrProgress): AsrProgress {
      if (value.file && value.loaded !== undefined) update(value.file, value.loaded, value.total);
      if (!["loading", "download", "detecting"].includes(value.stage) || [...sizes.values()].some(n => n === undefined)) return value;
      const total = [...sizes.values()].reduce<number>((sum, n) => sum + (n ?? 0), 0);
      if (!total) return value;
      return { ...value, preparation: { loaded: [...sizes.keys()].reduce((sum, name) => sum + (loaded.get(name) ?? 0), 0), total } };
    },
  };
}
