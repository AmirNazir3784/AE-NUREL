import type { SrtDocument } from "@/lib/srt";

export type UploadedFile = { name: string; size: number; document: SrtDocument };
export type ToolSession = {
  uploaded: UploadedFile | null;
  value: string;
  busy: boolean;
  fileError: string;
  downloadMessage: string;
};

export const initialSession: ToolSession = {
  uploaded: null,
  value: "0",
  busy: false,
  fileError: "",
  downloadMessage: "",
};

type SessionAction =
  | { type: "upload-started" }
  | { type: "upload-succeeded"; uploaded: UploadedFile }
  | { type: "upload-failed"; message: string }
  | { type: "offset-changed"; value: string }
  | { type: "download-started"; message: string }
  | { type: "error"; message: string }
  | { type: "reset" };

export function sessionReducer(state: ToolSession, action: SessionAction): ToolSession {
  switch (action.type) {
    case "upload-started":
      return { ...state, busy: true, fileError: "", downloadMessage: "" };
    case "upload-succeeded":
      // A new file starts a fresh session in one update, including a valid zero offset.
      return { ...initialSession, uploaded: action.uploaded };
    case "upload-failed":
      return { ...state, busy: false, fileError: action.message, downloadMessage: "" };
    case "offset-changed":
      return { ...state, value: action.value, downloadMessage: "" };
    case "download-started":
      return { ...state, fileError: "", downloadMessage: action.message };
    case "error":
      return { ...state, fileError: action.message, downloadMessage: "" };
    case "reset":
      return { ...initialSession };
  }
}

export type StepState = "active" | "complete" | "pending";

export function getStepProgress({ hasFile, busy, outputReady, downloaded }: {
  hasFile: boolean;
  busy: boolean;
  outputReady: boolean;
  downloaded: boolean;
}): [StepState, StepState, StepState] {
  if (!hasFile || busy) return ["active", "pending", "pending"];
  if (!outputReady) return ["complete", "active", "pending"];
  return ["complete", "complete", downloaded ? "complete" : "active"];
}
