import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/site-metadata";
import { EyeContact } from "@/features/eye-contact/eye-contact";
export const metadata = { ...pageMetadata("AI Eye Contact — Development Preview", "Preview subtle gaze corrections for talking-head videos.", "/tools/ai-eye-contact"), robots: { index: false, follow: false } };
export default function EyeContactPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <EyeContact />;
}
