import type { SrtDocument } from "../../lib/srt.ts";
import type { SplitMethod, TimestampMode } from "../../lib/srt-split.ts";

export type SplitUpload = { name: string; size: number; document: SrtDocument };
export type SplitSession = { source: SplitUpload | null; requestId: number; busy: boolean; method: SplitMethod; values: Record<SplitMethod, string>; timestamps: TimestampMode; error: string; message: string; downloadedAll: boolean };
export const initialSplitSession: SplitSession = { source: null, requestId: 0, busy: false, method: "parts", values: { parts: "2", cues: "100", time: "10" }, timestamps: "original", error: "", message: "", downloadedAll: false };
type Action =
  | { type: "read"; id: number }
  | { type: "ready"; id: number; source: SplitUpload }
  | { type: "failed"; id: number; message: string }
  | { type: "method"; method: SplitMethod }
  | { type: "value"; value: string }
  | { type: "timestamps"; timestamps: TimestampMode }
  | { type: "error"; message: string }
  | { type: "download"; filename: string; all?: boolean }
  | { type: "reset"; id: number };

export function splitSessionReducer(state: SplitSession, action: Action): SplitSession {
  switch (action.type) {
    case "reset": return { ...initialSplitSession, values: { ...initialSplitSession.values }, requestId: action.id };
    case "read": return { ...state, source: null, requestId: action.id, busy: true, error: "", message: "", downloadedAll: false };
    case "ready": return state.requestId !== action.id || !state.busy ? state : { ...initialSplitSession, values: { ...initialSplitSession.values }, requestId: action.id, source: action.source };
    case "failed": return state.requestId !== action.id || !state.busy ? state : { ...state, busy: false, error: action.message };
    case "method": return { ...state, method: action.method, error: "", message: "", downloadedAll: false };
    case "value": return { ...state, values: { ...state.values, [state.method]: action.value }, error: "", message: "", downloadedAll: false };
    case "timestamps": return { ...state, timestamps: action.timestamps, error: "", message: "", downloadedAll: false };
    case "error": return { ...state, error: action.message, message: "", downloadedAll: false };
    case "download": return { ...state, error: "", message: `Download started: ${action.filename}`, downloadedAll: state.downloadedAll || !!action.all };
  }
}
