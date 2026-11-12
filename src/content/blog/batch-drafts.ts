import { subtitleFileDrafts } from "./drafts/subtitle-files.ts";
import { captionCraftDrafts } from "./drafts/caption-craft.ts";
import { audioWorkflowDrafts } from "./drafts/audio-workflows.ts";
import { adobeWorkflowDrafts } from "./drafts/adobe-workflows.ts";
import { resolveCapcutDrafts } from "./drafts/resolve-capcut.ts";
import { youtubeWorkflowDrafts } from "./drafts/youtube-workflows.ts";
import { finalWorkflowDrafts } from "./drafts/podcast-translation-delivery.ts";
import type { EditorialDraft } from "./draft-model.ts";

// Local editorial queue. Registry status remains draft until owner review.
export const batchDrafts: readonly EditorialDraft[] = [...subtitleFileDrafts, ...captionCraftDrafts, ...audioWorkflowDrafts, ...adobeWorkflowDrafts, ...resolveCapcutDrafts, ...youtubeWorkflowDrafts, ...finalWorkflowDrafts];
