import type { ComponentType } from "react";
import AudioToTextArticle, { articleIntroduction, AudioWorkflowVisual } from "./convert-audio-to-text-online-free";

// Register each reviewed local content module once; routes and layouts stay shared.
export const articleContent: Readonly<Record<string, { introduction: string; Body: ComponentType; Visual?: ComponentType }>> = {
  "audio-to-text-guide": { introduction: articleIntroduction, Body: AudioToTextArticle, Visual: AudioWorkflowVisual },
};
