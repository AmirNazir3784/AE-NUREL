import { serializeVttConversion, type VttConversion } from "../../lib/srt-to-vtt.ts";

export type ConversionSession = { conversion: VttConversion | null; size: number; busy: boolean; requestId: number; error: string; downloaded: boolean };
export const initialConversionSession: ConversionSession = { conversion: null, size: 0, busy: false, requestId: 0, error: "", downloaded: false };
type Action = { type: "read" | "reset"; id: number } | { type: "ready"; id: number; conversion: VttConversion; size: number } | { type: "failed" | "rejected"; id: number; message: string } | { type: "download" } | { type: "error"; message: string };

export function conversionSessionReducer(state: ConversionSession, action: Action): ConversionSession {
  switch (action.type) {
    case "read": return { ...initialConversionSession, busy: true, requestId: action.id };
    case "reset": return { ...initialConversionSession, requestId: action.id };
    case "rejected": return { ...initialConversionSession, requestId: action.id, error: action.message };
    case "ready": return action.id === state.requestId && state.busy ? { ...initialConversionSession, requestId: action.id, conversion: action.conversion, size: action.size } : state;
    case "failed": return action.id === state.requestId && state.busy ? { ...state, conversion: null, size: 0, busy: false, error: action.message } : state;
    case "error": return { ...state, error: action.message, downloaded: false };
    case "download": return !state.conversion || state.busy || state.error ? state : { ...state, downloaded: true };
  }
}

// The download button calls this with the current session, never the source file.
export function serializeConversionSession(state: ConversionSession): string {
  if (!state.conversion || state.busy || state.error) throw new Error("Choose a valid SRT file before downloading.");
  return serializeVttConversion(state.conversion);
}
