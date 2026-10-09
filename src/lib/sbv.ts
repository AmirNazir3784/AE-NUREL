import { MAX_TIMESTAMP_MS } from "./srt.ts";
import { MAX_EDITOR_CUES } from "./subtitle-editor.ts";
import type { ConversionCue } from "./subtitle-conversion.ts";

// YouTube's basic SubViewer dialect: H:MM:SS.mmm,H:MM:SS.mmm.
// https://support.google.com/youtube/answer/2734698
export function parseSbvTime(value: string): number {
  const match = /^(\d{1,2}):([0-5]\d):([0-5]\d)\.(\d{3})$/.exec(value);
  if (!match) throw new Error("Use SBV times such as 0:01:23.450, with minutes and seconds from 00 to 59.");
  const ms = Number(match[1]) * 3600000 + Number(match[2]) * 60000 + Number(match[3]) * 1000 + Number(match[4]);
  if (ms > MAX_TIMESTAMP_MS) throw new Error("The SBV time is outside the supported timeline.");
  return ms;
}
export function formatSbvTime(ms: number): string {
  if (!Number.isSafeInteger(ms) || ms < 0 || ms > MAX_TIMESTAMP_MS) throw new Error("The subtitle time is outside the supported SBV timeline.");
  return Math.floor(ms / 3600000) + ":" + String(Math.floor(ms / 60000) % 60).padStart(2, "0") + ":" + String(Math.floor(ms / 1000) % 60).padStart(2, "0") + "." + String(ms % 1000).padStart(3, "0");
}
export function parseSbv(source: string): ConversionCue[] {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!text) throw new Error("This SBV file is empty. Choose a file with caption cues.");
  if (text.includes("\0")) throw new Error("This SBV file contains unreadable characters.");
  const blocks = text.split(/\n(?:[ \t]*\n)+/);
  if (blocks.length > MAX_EDITOR_CUES) throw new Error("Use no more than 10,000 subtitle cues. Split this file first.");
  return blocks.map((block, index) => {
    const lines = block.split("\n"), timing = lines.shift()!.trim();
    const match = /^(\S+),[ \t]*(\S+)$/.exec(timing);
    if (!match) throw new Error("Cue " + (index + 1) + " needs an SBV timing line such as 0:00:01.000,0:00:03.500.");
    let start: number, end: number;
    try { start = parseSbvTime(match[1]); end = parseSbvTime(match[2]); }
    catch (error) { throw new Error("Cue " + (index + 1) + ": " + (error as Error).message); }
    if (end <= start) throw new Error("Cue " + (index + 1) + " needs an end later than its start.");
    if (lines.some(line => /^\s*\d+:\d{2}:\d{2}\.\d+,\s*\d+:\d{2}:\d{2}\.\d+\s*$/.test(line))) throw new Error("Cue " + (index + 1) + " contains another timing line. Separate captions with a blank line.");
    const caption = lines.join("\n").trimEnd();
    if (!caption.trim()) throw new Error("Cue " + (index + 1) + " has no subtitle text.");
    return { start, end, text: caption };
  });
}
