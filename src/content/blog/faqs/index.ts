import { subtitleFileQuestions } from "./subtitle-files.ts";
import { captionCraftQuestions } from "./caption-craft.ts";
import { audioWorkflowQuestions } from "./audio-workflows.ts";
import { adobeWorkflowQuestions } from "./adobe-workflows.ts";
import { resolveCapcutQuestions } from "./resolve-capcut.ts";
import { youtubeWorkflowQuestions } from "./youtube-workflows.ts";
import { finalWorkflowQuestions } from "./podcast-translation-delivery.ts";
import type { ArticleQuestionSet } from "./model.ts";

export const articleQuestionSets: readonly ArticleQuestionSet[] = [
  ...subtitleFileQuestions, ...captionCraftQuestions, ...audioWorkflowQuestions,
  ...adobeWorkflowQuestions, ...resolveCapcutQuestions,
  ...youtubeWorkflowQuestions, ...finalWorkflowQuestions,
];
const bySlug = new Map(articleQuestionSets.map(set => [set.slug, set]));
export const questionsForSlug = (slug: string) => bySlug.get(slug);
