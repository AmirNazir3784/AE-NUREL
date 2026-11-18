import { pageMetadata } from "@/lib/site-metadata";
import { EyeContact } from "@/features/eye-contact/eye-contact";
import { ToolHero, ToolLayout } from "@/components/tools/tool-layout";
export const metadata = pageMetadata("AI Eye Contact — Gaze Correction for Video", "Adjust eye contact in talking-head videos. Compare the original, refine your gaze and export MP4 or WebM.", "/tools/ai-eye-contact");
export default function EyeContactPage() {
  return <ToolLayout title="AI Eye Contact" category="Video Tools" categoryHref="/tools#video-tools"><ToolHero title="AI Eye Contact" description="Adjust your gaze, compare the result and export your video." ticks={["Automatic + fine-tuning", "MP4 or WebM", "Original resolution"]} chipA={null} chipB={null} chipC={null} art="plain" visual={<div className="aen-hero-merge" aria-hidden="true"><svg viewBox="0 0 320 140"><path d="M48 70q46-58 92 0-46 58-92 0Zm132 0q46-58 92 0-46 58-92 0Z" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2"/><circle cx="86" cy="72" r="15" fill="var(--accent)"/><circle cx="226" cy="70" r="15" fill="var(--action)"/><path d="M147 70h26m-7-7 7 7-7 7" fill="none" stroke="var(--muted)" strokeWidth="2"/></svg></div>} /><EyeContact /></ToolLayout>;
}
