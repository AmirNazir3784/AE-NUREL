import { notFound } from "next/navigation";
import { CaptionStudio } from "@/features/caption-studio/caption-studio";
export const metadata = { title: "Auto Caption Generator", robots: { index: false, follow: false } };
export default function AutoCaptionGeneratorPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <main id="main-content" className="aen-wrap"><CaptionStudio /></main>;
}
