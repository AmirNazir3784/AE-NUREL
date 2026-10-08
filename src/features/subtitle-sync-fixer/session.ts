import { fixSubtitleSync, initialSyncPoints, parseSyncPoints, SyncValidationError, type SyncField, type SyncPoint, type SyncResult } from "../../lib/subtitle-sync.ts";
import type { EditorDocument } from "../../lib/subtitle-editor.ts";

export type SyncSource = { document: EditorDocument; size: number };
export type SyncSession = { source: SyncSource | null; points: [SyncPoint, SyncPoint]; result: SyncResult | null; busy: boolean; requestId: number; error: string; fields: Partial<Record<SyncField, string>>; message: string; downloaded: boolean };
export const initialSyncSession: SyncSession = { source: null, points: [{ current: "", correct: "", cueId: "" }, { current: "", correct: "", cueId: "" }], result: null, busy: false, requestId: 0, error: "", fields: {}, message: "", downloaded: false };
type Action =
  | { type: "read" | "reset"; id: number }
  | { type: "ready"; id: number; source: SyncSource }
  | { type: "failed"; id: number; message: string }
  | { type: "point"; index: 0 | 1; field: "current" | "correct"; value: string }
  | { type: "cue"; index: 0 | 1; cueId: string; current: string }
  | { type: "fix" }
  | { type: "error"; message: string }
  | { type: "download"; filename: string };
export function syncSessionReducer(state: SyncSession, action: Action): SyncSession {
  switch (action.type) {
    case "reset": return { ...initialSyncSession, requestId: action.id };
    // Discard the old points/output immediately, even while replacement is reading.
    case "read": return { ...initialSyncSession, busy: true, requestId: action.id };
    case "ready": return action.id !== state.requestId || !state.busy ? state : { ...initialSyncSession, requestId: action.id, source: action.source, points: initialSyncPoints(action.source.document) };
    case "failed": return action.id !== state.requestId || !state.busy ? state : { ...state, busy: false, error: action.message };
    case "point":
    case "cue": {
      if (!state.source || state.busy) return state;
      const points: [SyncPoint, SyncPoint] = [...state.points];
      points[action.index] = action.type === "cue" ? { current: action.current, correct: "", cueId: action.cueId } : { ...points[action.index], [action.field]: action.value, ...(action.field === "current" ? { cueId: "" } : {}) };
      return { ...state, points, result: null, fields: {}, error: "", message: "", downloaded: false };
    }
    case "fix": {
      if (!state.source || state.busy) return state;
      try { return { ...state, result: fixSubtitleSync(state.source.document, parseSyncPoints(state.points, state.source.document.format)), error: "", fields: {}, message: "", downloaded: false }; }
      catch (error) { return { ...state, result: null, error: (error as Error).message, fields: error instanceof SyncValidationError ? error.fields : {}, message: "", downloaded: false }; }
    }
    case "error": return { ...state, error: action.message, result: null, message: "", downloaded: false };
    case "download": return !state.result || state.busy || state.error ? state : { ...state, downloaded: true, message: `Download started: ${action.filename}` };
  }
}
