import { notFound } from "next/navigation";
import { PodcastWorkspace } from "@/features/audio-captions/podcast-workspace";

export const metadata = { title: "Podcast to Captions", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default function PodcastPage() { if (process.env.NODE_ENV !== "development") notFound(); return <PodcastWorkspace />; }
