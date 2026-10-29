"use client";
import { useState, type ComponentType } from "react";
import { FileUpload } from "@/components/tools/file-upload";
import { Icon } from "@/components/ui/icon";
import { validateStudioFile } from "./studio-limits";

type EditorProps = { transcriptionAvailable?: boolean; embedded?: boolean; initialFile?: File; accessEnabled?:boolean; initialProjectId?:string };
export function CaptionEntry({ transcriptionAvailable,projectId,accessEnabled=true }: { transcriptionAvailable: boolean;projectId?:string;accessEnabled?:boolean }) {
  const [Editor, setEditor] = useState<ComponentType<EditorProps> | null>(null);
  const [file, setFile] = useState<File>(), [loading, setLoading] = useState(false), [error, setError] = useState("");
  async function openVideo(video: File) {
    if (loading) return;
    setLoading(true); setError("");
    try {
      const { CaptionStudio } = await import("./caption-studio");
      setFile(video); setEditor(() => CaptionStudio);
    } catch { setError("The editor could not load. Check your connection and choose your video again."); }
    finally { setLoading(false); }
  }
  if (Editor) return <Editor embedded transcriptionAvailable={transcriptionAvailable} initialFile={file} accessEnabled={accessEnabled} initialProjectId={accessEnabled?projectId:undefined} />;
  return <section className="cap-entry" aria-label="Caption Studio" data-empty="true">
    {accessEnabled&&projectId&&<p>Choose the original video to reopen your saved caption project.</p>}
    <FileUpload accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm" title="Start with your video" description="MP4, MOV or WebM with a codec your browser can decode." buttonLabel="Choose video" hint={accessEnabled?"Free: 60 seconds · Package: 2 minutes · 200 MiB · 1080p":"Up to 2 minutes · 200 MiB · 1080p"} busy={loading} validateFile={validateStudioFile} onFile={video => void openVideo(video)} onError={setError} />
    {loading && <p role="status">Opening your video editor…</p>}{error && <p role="alert">{error}</p>}
    <div className="cap-entry-localSetupNote"><Icon name="volume" size={16} /><p>Generate captions when you’re ready, then review and edit the result.</p></div>
  </section>;
}
