import { detectOverlaps, parseOverlapGap, repairOverlaps, serializeOverlapRepair, validateOverlapDocument, type OverlapIssue, type OverlapMode, type OverlapRepair } from "../../lib/subtitle-overlap.ts";
import { exportEditor, type EditorDocument } from "../../lib/subtitle-editor.ts";

export type OverlapSource = { document: EditorDocument; size: number };
export type OverlapSession = { source: OverlapSource | null; issues: OverlapIssue[]; result: OverlapRepair | null; mode: OverlapMode; gap: string; excluded: number[]; busy: boolean; requestId: number; error: string; message: string; downloaded: boolean };
export const initialOverlapSession: OverlapSession = { source: null, issues: [], result: null, mode: "shorten", gap: "0.1", excluded: [], busy: false, requestId: 0, error: "", message: "", downloaded: false };

// The uploaded document is the undo/comparison reference. Once repaired, the
// result is the active document for both analysis and download serialization.
export function activeOverlapDocument(state: OverlapSession): EditorDocument | null {
  return state.result?.document ?? state.source?.document ?? null;
}

export function serializeOverlapSession(state: OverlapSession): string {
  const document = activeOverlapDocument(state);
  if (!document || state.busy || state.error) throw new Error("Choose a file and resolve any errors before downloading.");
  if (state.result && state.source) return serializeOverlapRepair(state.source.document, state.result);
  validateOverlapDocument(document);
  return exportEditor(document, document.format);
}
type Action = { type: "read" | "reset"; id: number } | { type: "ready"; id: number; source: OverlapSource } | { type: "failed" | "upload-error"; id: number; message: string } | { type: "mode"; mode: OverlapMode } | { type: "gap"; value: string } | { type: "exclude"; index: number } | { type: "fix" | "undo" } | { type: "error"; message: string } | { type: "download"; filename: string };
export function overlapSessionReducer(state: OverlapSession, action: Action): OverlapSession {
  switch (action.type) {
    case "reset": return { ...initialOverlapSession, requestId: action.id };
    case "read": return { ...initialOverlapSession, requestId: action.id, busy: true };
    case "upload-error": return { ...initialOverlapSession, requestId: action.id, error: action.message };
    case "ready": return action.id !== state.requestId || !state.busy ? state : { ...initialOverlapSession, requestId: action.id, source: action.source, issues: detectOverlaps(action.source.document) };
    case "failed": return action.id !== state.requestId || !state.busy ? state : { ...state, busy: false, error: action.message };
    case "mode": return { ...state, mode: action.mode, result: null, error: "", message: "", downloaded: false };
    case "gap": return { ...state, gap: action.value, result: null, error: "", message: "", downloaded: false };
    case "exclude": return { ...state, excluded: state.excluded.includes(action.index) ? state.excluded.filter((index) => index !== action.index) : [...state.excluded, action.index], result: null, error: "", message: "", downloaded: false };
    case "fix": {
      if (!state.source || state.busy) return state;
      try { return { ...state, result: repairOverlaps(state.source.document, state.mode, parseOverlapGap(state.gap), state.excluded), error: "", message: "", downloaded: false }; }
      catch (error) { return { ...state, result: null, error: (error as Error).message, message: "", downloaded: false }; }
    }
    case "undo": return { ...state, result: null, error: "", message: "Fixes undone. Original uploaded timing restored.", downloaded: false };
    case "error": return { ...state, error: action.message, result: null, message: "", downloaded: false };
    case "download": return !state.result || state.error || state.busy ? state : { ...state, downloaded: true, message: `Download started: ${action.filename}` };
  }
}
