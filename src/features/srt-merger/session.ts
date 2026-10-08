import type { SrtDocument } from "../../lib/srt.ts";

export type MergeFile = { id: number; name: string; size: number } & (
  | { status: "reading" }
  | { status: "ready"; document: SrtDocument }
  | { status: "invalid"; error: string }
);
export type MergeSession = { files: MergeFile[]; gap: string; error: string; downloaded: boolean };
export const initialMergeSession: MergeSession = { files: [], gap: "0", error: "", downloaded: false };
type Action =
  | { type: "add"; files: MergeFile[] }
  | { type: "replace"; id: number; file: MergeFile }
  | { type: "resolve"; file: MergeFile }
  | { type: "remove"; id: number }
  | { type: "move"; id: number; direction: -1 | 1 }
  | { type: "reorder"; source: number; target: number }
  | { type: "gap"; value: string }
  | { type: "error"; message: string }
  | { type: "dismiss-error" }
  | { type: "download" }
  | { type: "reset" };

export function mergeSessionReducer(state: MergeSession, action: Action): MergeSession {
  if (action.type === "reset") return initialMergeSession;
  if (action.type === "download") return { ...state, downloaded: true, error: "" };
  if (action.type === "error") return { ...state, error: action.message, downloaded: false };
  if (action.type === "dismiss-error") return { ...state, error: "" };
  if (action.type === "gap") return { ...state, gap: action.value, downloaded: false };
  let files = state.files;
  if (action.type === "add") files = [...files, ...action.files];
  if (action.type === "replace") files = files.map((file) => file.id === action.id ? action.file : file);
  if (action.type === "resolve") {
    // A removed/replaced file or an old read after reset must never reappear.
    if (!files.some((file) => file.id === action.file.id && file.status === "reading")) return state;
    files = files.map((file) => file.id === action.file.id ? action.file : file);
  }
  if (action.type === "remove") files = files.filter((file) => file.id !== action.id);
  if (action.type === "move" || action.type === "reorder") {
    const source = files.findIndex((file) => file.id === (action.type === "move" ? action.id : action.source));
    const target = action.type === "move" ? source + action.direction : files.findIndex((file) => file.id === action.target);
    if (source < 0 || target < 0 || target >= files.length || source === target) return state;
    files = [...files];
    const [moved] = files.splice(source, 1);
    files.splice(target, 0, moved);
  }
  return { ...state, files, error: "", downloaded: false };
}
