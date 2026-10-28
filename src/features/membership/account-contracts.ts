import type { StudioStyle } from "../caption-studio/studio-core";
import type { EditorDocument } from "@/lib/subtitle-editor";
import type { StudioAlignment } from "../caption-studio/studio-alignment";

// Future server records. Original media, blobs, object URLs and card details do
// not belong in these records. Ownership must come from an authenticated session.
export type SavedCaptionProject = {
  schemaVersion: 1; id: string; ownerId: string; title: string;
  tool: "auto-caption-generator"; createdAt: string; updatedAt: string;
  source: { filename: string; durationSeconds: number; width: number; height: number; fingerprint?: string };
  captions: EditorDocument; style: StudioStyle; alignment: StudioAlignment;
};
export type AccountPlanRecord = { plan: "free" | "source-window"; status: "inactive" | "active" | "revoked"; purchasedAt: string | null };
export type ToolUseRecord = { id: string; ownerId: string; toolId: string; projectId: string | null; action: "transcribe" | "edit" | "export"; occurredAt: string };
export type InvoiceRecord = { id: string; amountMinor: number; currency: string; status: "open" | "paid" | "void"; issuedAt: string };
export interface AccountRepository {
  plan(ownerId: string): Promise<AccountPlanRecord | null>;
  projects(ownerId: string): Promise<SavedCaptionProject[]>;
  activity(ownerId: string): Promise<ToolUseRecord[]>;
  invoices(ownerId: string): Promise<InvoiceRecord[]>;
}
