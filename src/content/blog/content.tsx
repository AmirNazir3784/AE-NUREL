import type { ComponentType } from "react";
import AudioToTextArticle, { articleIntroduction, AudioWorkflowVisual } from "./convert-audio-to-text-online-free";
import SubtitleSyncArticle, { articleIntroduction as subtitleSyncIntroduction } from "./fix-subtitles-out-of-sync";
import SubtitleFormatsArticle, { articleIntroduction as subtitleFormatsIntroduction } from "./srt-vs-vtt-subtitle-formats";
import { batchDrafts } from "./batch-drafts";
import { EditorialDraftBody } from "@/components/blog/editorial-draft";

// Register each reviewed local content module once; routes and layouts stay shared.
export const articleContent: Readonly<Record<string, { introduction: string; Body: ComponentType; Visual?: ComponentType }>> = {
  ...Object.fromEntries(batchDrafts.map(article => [`draft-${article.slug}`, {
    introduction: article.introduction,
    Body: function DraftBody() { return <EditorialDraftBody article={article} />; },
  }])),
  "audio-to-text-guide": { introduction: articleIntroduction, Body: AudioToTextArticle, Visual: AudioWorkflowVisual },
  "subtitle-sync-guide": { introduction: subtitleSyncIntroduction, Body: SubtitleSyncArticle },
  "subtitle-formats-guide": { introduction: subtitleFormatsIntroduction, Body: SubtitleFormatsArticle },
};
