import type { ComponentType } from "react";
import AudioToTextArticle, { articleIntroduction, AudioWorkflowVisual } from "./convert-audio-to-text-online-free";
import SubtitleSyncArticle, { articleIntroduction as subtitleSyncIntroduction } from "./fix-subtitles-out-of-sync";

// Register each reviewed local content module once; routes and layouts stay shared.
export const articleContent: Readonly<Record<string, { introduction: string; Body: ComponentType; Visual?: ComponentType }>> = {
  "audio-to-text-guide": { introduction: articleIntroduction, Body: AudioToTextArticle, Visual: AudioWorkflowVisual },
  "subtitle-sync-guide": { introduction: subtitleSyncIntroduction, Body: SubtitleSyncArticle },
};
