import type { AsrProgress, AsrResult } from "./asr-core.ts";

export type AsrStage = "idle" | "checking" | "ready" | "loading" | "download" | "detecting" | "transcribing" | "complete" | "cancelled";
export type AsrSession = { id: number; stage: AsrStage; filename: string; duration: number; progress: AsrProgress | null; result: AsrResult | null; error: string; warnings: string[]; notice: string };
export const initialAsrSession: AsrSession = { id: 0, stage: "idle", filename: "", duration: 0, progress: null, result: null, error: "", warnings: [], notice: "" };
type Action = { type: "check" | "generate" | "cancel" | "reset"; id: number } | { type: "ready"; id: number; filename: string; duration: number } | { type: "progress"; id: number; progress: AsrProgress } | { type: "complete"; id: number; result: AsrResult } | { type: "failed"; id: number; message: string } | { type: "notice" | "error"; message: string };
export function asrBusy(session: AsrSession) { return ["checking", "loading", "download", "detecting", "transcribing"].includes(session.stage); }
export function asrSessionReducer(state: AsrSession, action: Action): AsrSession {
  if ("id" in action && !["check", "generate", "cancel", "reset"].includes(action.type) && action.id !== state.id) return state;
  switch (action.type) {
    case "check": return { ...state, id: action.id, stage: "checking", error: "", notice: "", progress: null };
    case "generate": return { ...state, id: action.id, stage: "loading", error: "", notice: "", warnings: [], progress: null };
    case "ready": return { ...initialAsrSession, id: action.id, stage: "ready", filename: action.filename, duration: action.duration };
    case "progress": return !asrBusy(state) ? state : { ...state, stage: action.progress.stage, progress: action.progress, warnings: action.progress.warning ? [...new Set([...state.warnings, action.progress.warning])] : state.warnings };
    case "complete": return !asrBusy(state) ? state : { ...state, stage: "complete", result: action.result, progress: null, notice: action.result.chunks.length ? "Draft captions are ready. Review the text and timing before downloading." : "No speech detected. No subtitles were invented." };
    case "failed": return { ...state, stage: state.filename ? "ready" : "idle", error: action.message, progress: null };
    case "cancel": return { ...state, id: action.id, stage: "cancelled", progress: null, notice: "Cancelled. You can replace the recording or try again.", error: "" };
    case "reset": return { ...initialAsrSession, id: action.id };
    case "error": return { ...state, error: action.message };
    case "notice": return { ...state, notice: action.message, error: "" };
  }
}
