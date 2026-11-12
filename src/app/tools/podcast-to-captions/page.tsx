import { notFound } from "next/navigation";
import { PodcastWorkspace } from "@/features/audio-captions/podcast-workspace";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = { ...pageMetadata("Podcast to Captions", "Development preview of the podcast caption workflow.", "/tools/podcast-to-captions"), robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default function PodcastPage() { if (process.env.NODE_ENV !== "development") notFound(); return <PodcastWorkspace />; }
