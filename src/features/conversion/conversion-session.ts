import type { ConversionResult } from "../../lib/subtitle-conversion.ts";
export type ConversionState = { id: number; file: { name: string; size: number } | null; result: ConversionResult | null; busy: boolean; error: string; message: string };
export type ConversionAction =
  | { type: "read"; id: number }
  | { type: "reset"; id: number }
  | { type: "ready"; id: number; file: { name: string; size: number }; result: ConversionResult }
  | { type: "failed"; id: number; message: string }
  | { type: "feedback"; id: number; message: string; error?: boolean };
export const initialConversion: ConversionState = { id: 0, file: null, result: null, busy: false, error: "", message: "" };
export function conversionReducer(state: ConversionState, action: ConversionAction): ConversionState {
  if (action.type === "read" || action.type === "reset") return { ...initialConversion, id: action.id, busy: action.type === "read" };
  if (action.id !== state.id) return state;
  if (action.type === "ready") return { ...state, file: action.file, result: action.result, busy: false };
  if (action.type === "failed") return { ...initialConversion, id: state.id, error: action.message };
  return { ...state, error: action.error ? action.message : "", message: action.error ? "" : action.message };
}
