import type { AsrProgress } from "../local-asr/asr-core";

// Report percentages only when transferred bytes or completed speech contexts
// are known. Initialization and inference within a section are indeterminate.
export type GenerationDisplay = { value: number | null; preparationValue: number | null; kind: "model" | "sections" | "working"; detail: string; title: string; button: string; phase: 0 | 1 | 2 };
export function captionGenerationDisplay(progress: AsrProgress | null): GenerationDisplay {
  const display = generationMeasurement(progress);
  const phase = progress?.stage === "building" ? 2 : progress?.stage === "transcribing" || progress?.stage === "translating" ? 1 : 0;
  const title = phase === 2 ? "Preparing your captions for editing..." : phase === 1 ? "Recognizing speech in your video..." : "Preparing your AI captions...";
  const button = title;
  const measured = progress?.preparation;
  const preparationValue = measured && Number.isFinite(measured.loaded) && Number.isFinite(measured.total) && measured.total > 0 && measured.loaded >= 0 && measured.loaded <= measured.total ? Math.floor(measured.loaded / measured.total * 100) : null;
  return { ...display, preparationValue, title, button, phase };
}

function generationMeasurement(progress: AsrProgress | null): Pick<GenerationDisplay, "value" | "kind" | "detail"> {
  if (progress?.stage === "download") {
    const { loaded, total } = progress;
    if (loaded !== undefined && Number.isFinite(loaded) && loaded >= 0) {
      const amount = (loaded / 1_000_000).toFixed(1);
      if (total !== undefined && Number.isFinite(total) && total > 0) {
        const percent = Math.max(0, Math.min(100, Math.floor(loaded / total * 100)));
        return { value: percent, kind: "model", detail: amount + " of " + (total / 1_000_000).toFixed(1) + " MB of the current model file downloaded. More files and caption processing may follow." };
      }
      return { value: null, kind: "model", detail: amount + " MB of the current model file downloaded. The total size is not available." };
    }
    return { value: null, kind: "model", detail: "Downloading speech model. The file size is not available yet." };
  }
  if (progress?.stage === "transcribing") {
    const { completed, sections } = progress;
    if (completed !== undefined && sections !== undefined && Number.isInteger(completed) && Number.isInteger(sections) && sections > 1 && completed >= 0 && completed <= sections) {
      return { value: Math.floor(completed / sections * 100), kind: "sections", detail: completed + " of " + sections + " speech sections completed. This measures finished sections, not time remaining." };
    }
    return { value: null, kind: "working", detail: "Recognizing speech and word timings. The model cannot report an exact percentage for the current section." };
  }
  const hints: Partial<Record<AsrProgress["stage"], string>> = {
    preparing: "Preparing the audio from your video.",
    loading: "Initializing the speech model. The first run can take several minutes, even after downloading.",
    detecting: "Finding speech in your recording.",
    building: "Turning recognized words into editable captions.",
    translating: "Processing recognized text.",
  };
  return { value: null, kind: "working", detail: progress ? hints[progress.stage] ?? "Working on captions." : "Preparing your video for caption generation." };
}
