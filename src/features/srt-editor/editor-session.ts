import { emptyEditor, updateEditorCue, type EditorDocument } from "../../lib/subtitle-editor.ts";

export const MAX_EDITOR_HISTORY = 50;
export type EditorSession = { document: EditorDocument | null; saved: EditorDocument | null; past: EditorDocument[]; future: EditorDocument[]; pendingBase: EditorDocument | null; busy: boolean; requestId: number; error: string; notice: string; noticeTone: "info" | "warning" | "success"; exported: boolean };
export const initialEditorSession: EditorSession = { document: null, saved: null, past: [], future: [], pendingBase: null, busy: false, requestId: 0, error: "", notice: "", noticeTone: "info", exported: false };
type Action =
  | { type: "read"; id: number }
  | { type: "loaded"; id: number; document: EditorDocument }
  | { type: "failed"; id: number; message: string }
  | { type: "scratch"; id: number }
  | { type: "reset"; id: number }
  | { type: "draft"; id: string; field: "text" | "start" | "end"; value: string }
  | { type: "commit" }
  | { type: "apply"; document: EditorDocument; notice?: string; tone?: EditorSession["noticeTone"] }
  | { type: "undo" | "redo" }
  | { type: "error"; message: string }
  | { type: "exported"; filename: string };

function commit(state: EditorSession): EditorSession {
  if (!state.pendingBase) return state;
  return { ...state, past: [...state.past, state.pendingBase].slice(-MAX_EDITOR_HISTORY), pendingBase: null };
}
export function editorIsDirty(state: EditorSession): boolean { return !!state.document && state.document !== state.saved; }
export function editorSessionReducer(state: EditorSession, action: Action): EditorSession {
  switch (action.type) {
    case "read": return { ...commit(state), busy: true, requestId: action.id, error: "", notice: "" };
    case "loaded": return action.id !== state.requestId || !state.busy ? state : { ...initialEditorSession, requestId: action.id, document: action.document, saved: action.document };
    case "failed": return action.id !== state.requestId || !state.busy ? state : { ...state, busy: false, error: action.message };
    case "scratch": { const document = emptyEditor(); return { ...initialEditorSession, requestId: action.id, document, saved: document }; }
    case "reset": return { ...initialEditorSession, requestId: action.id };
    case "draft": {
      if (!state.document || state.busy) return state;
      const document = updateEditorCue(state.document, action.id, action.field, action.value);
      return document === state.document ? state : { ...state, document, pendingBase: state.pendingBase ?? state.document, future: [], error: "", notice: "", exported: false };
    }
    case "commit": return commit(state);
    case "apply": {
      if (state.busy || !state.document) return state;
      const base = commit(state);
      if (base.document === action.document) return { ...base, notice: action.notice ?? "", noticeTone: action.tone ?? "info", error: "" };
      return { ...base, document: action.document, past: [...base.past, base.document!].slice(-MAX_EDITOR_HISTORY), future: [], pendingBase: null, error: "", notice: action.notice ?? "", noticeTone: action.tone ?? "info", exported: false };
    }
    case "undo": {
      if (state.busy) return state;
      const base = commit(state), document = base.past.at(-1);
      return !document || !base.document ? base : { ...base, document, past: base.past.slice(0, -1), future: [base.document, ...base.future].slice(0, MAX_EDITOR_HISTORY), error: "", notice: "Change undone.", noticeTone: "info", exported: false };
    }
    case "redo": {
      if (state.busy || state.pendingBase || !state.document || !state.future.length) return state;
      return { ...state, document: state.future[0], past: [...state.past, state.document].slice(-MAX_EDITOR_HISTORY), future: state.future.slice(1), error: "", notice: "Change restored.", noticeTone: "info", exported: false };
    }
    case "error": return { ...state, error: action.message, notice: "" };
    case "exported": return { ...commit(state), saved: state.document, error: "", notice: `Download started: ${action.filename}`, noticeTone: "success", exported: true };
  }
}
