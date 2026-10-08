import { strToU8, zipSync } from "fflate";
import type { SplitResult } from "./srt-split.ts";

export function createSplitZip(result: SplitResult): ArrayBuffer {
  const files = Object.fromEntries(result.parts.map((part) => [part.filename, strToU8(part.content)]));
  // Stored ZIP entries avoid unnecessary compression work for already small SRT files.
  return new Uint8Array(zipSync(files, { level: 0 })).buffer;
}

export function splitArchiveFilename(sourceName: string): string {
  const stem = sourceName.replace(/^.*[\\/]/, "").replace(/\.srt$/i, "").trim() || "subtitles";
  return `${stem}-parts.zip`;
}
