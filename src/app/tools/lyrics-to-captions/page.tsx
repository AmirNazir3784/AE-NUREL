import { notFound } from "next/navigation";
import { AudioCaptionWorkspace } from "@/features/audio-captions/podcast-workspace";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = { ...pageMetadata("Lyrics to Captions", "Development preview of the lyrics caption workflow.", "/tools/lyrics-to-captions"), robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default function LyricsPage() { if (process.env.NODE_ENV !== "development") notFound(); return <AudioCaptionWorkspace kind="lyrics" />; }
