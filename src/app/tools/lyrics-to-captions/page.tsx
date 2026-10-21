import { notFound } from "next/navigation";
import { AudioCaptionWorkspace } from "@/features/audio-captions/podcast-workspace";
export const metadata = { title: "Lyrics to Captions", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default function LyricsPage() { if (process.env.NODE_ENV !== "development") notFound(); return <AudioCaptionWorkspace kind="lyrics" />; }
