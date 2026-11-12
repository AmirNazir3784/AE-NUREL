export type DraftBlock =
  | { type: "p"; text: string }
  | { type: "steps" | "checklist"; items: string[] }
  | { type: "table"; caption: string; headers: string[]; rows: string[][] }
  | { type: "code"; label: string; text: string }
  | { type: "caption-example"; label: string; variants: { label: string; text: string }[] }
  | { type: "note"; title: string; text: string }
  | { type: "decisions"; items: { label: string; action: string; detail: string }[] }
  | { type: "flow"; label: string; items: string[] }
  | { type: "illustration"; name: "portrait" | "clip-timeline" | "translation" }
  | { type: "faq"; items: { question: string; answer: string }[] };

export type EditorialDraft = {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  category: "Audio Transcription" | "Video to Text" | "Auto Captions" | "Subtitle Tutorials" | "Video & Audio Conversion";
  keyword: string;
  intent: string;
  kind: "tutorial" | "comparison" | "troubleshooting" | "workflow" | "reference";
  introduction: string;
  sections: { id: string; title: string; blocks: DraftBlock[] }[];
  relatedSlugs?: string[];
};

export const p = (text: string): DraftBlock => ({ type: "p", text });
export const steps = (...items: string[]): DraftBlock => ({ type: "steps", items });
export const checklist = (...items: string[]): DraftBlock => ({ type: "checklist", items });
export const note = (title: string, text: string): DraftBlock => ({ type: "note", title, text });
export const code = (label: string, text: string): DraftBlock => ({ type: "code", label, text });
export const table = (caption: string, headers: string[], rows: string[][]): DraftBlock => ({ type: "table", caption, headers, rows });
export const flow = (label: string, ...items: string[]): DraftBlock => ({ type: "flow", label, items });
