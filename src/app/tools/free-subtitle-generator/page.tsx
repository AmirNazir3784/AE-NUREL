import { notFound, redirect } from "next/navigation";
// The audio tool moved to /tools/free-audio-to-text-converter-online.
// This stub keeps old tabs and bookmarks working in development; in
// production the tool stays hidden, exactly as before.
export default function OldAudioToolPage() {
  if (process.env.NODE_ENV === "production") notFound();
  redirect("/tools/free-audio-to-text-converter-online");
}
