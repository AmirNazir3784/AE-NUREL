"use client";
import { useReducer, useRef } from "react";
import { validateConversionFile, type ConversionResult } from "@/lib/subtitle-conversion";
import { conversionReducer, initialConversion } from "./conversion-session";
export function useConversion(extensions: readonly string[], reader: (file: Pick<File, "name" | "size">, bytes: ArrayBuffer) => ConversionResult) {
  const [state, dispatch] = useReducer(conversionReducer, initialConversion);
  const request = useRef(0);
  async function readFile(file: File) {
    const id = ++request.current;
    dispatch({ type: "read", id });
    try {
      validateConversionFile(file, extensions);
      const bytes = await file.arrayBuffer();
      if (request.current !== id) return;
      const result = reader(file, bytes);
      dispatch({ type: "ready", id, file: { name: file.name, size: file.size }, result });
    } catch (error) {
      dispatch({ type: "failed", id, message: error instanceof Error ? error.message : "This file could not be converted. Choose it again." });
    }
  }
  function reject(message: string) {
    const id = ++request.current;
    dispatch({ type: "reset", id }); dispatch({ type: "failed", id, message });
  }
  function reset() {
    dispatch({ type: "reset", id: ++request.current });
  }
  function feedback(message: string, error = false) { dispatch({ type: "feedback", id: state.id, message, error }); }
  return { state, readFile, reject, reset, feedback };
}
export type ConversionSession = ReturnType<typeof useConversion>;
