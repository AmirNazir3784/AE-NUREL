"use client";
import { useState, type ComponentType } from "react";
import { FileUpload } from "@/components/tools/file-upload";
import { Icon } from "@/components/ui/icon";
import { validateStudioFile } from "./studio-limits";

type EditorProps = { transcriptionAvailable?: boolean; embedded?: boolean; initialFile?: File; accessEnabled?:boolean; freeFeatures?:boolean; initialProjectId?:string; workflow?: "captions" | "burn" };
export function CaptionEntry({ transcriptionAvailable,projectId,accessEnabled=true,freeFeatures=false,workflow="captions" }: { transcriptionAvailable: boolean;projectId?:string;accessEnabled?:boolean;freeFeatures?:boolean;workflow?: "captions" | "burn" }) {
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
  if (Editor) return <Editor embedded transcriptionAvailable={transcriptionAvailable} initialFile={file} accessEnabled={accessEnabled} freeFeatures={freeFeatures} initialProjectId={accessEnabled?projectId:undefined} workflow={workflow} />;
  return <section className="cap-entry" aria-label="Caption Studio" data-empty="true">
    {accessEnabled&&projectId&&<p>Choose the original video to reopen your saved caption project.</p>}
    <FileUpload accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm" title="Start with your video" description="MP4, MOV or WebM with a codec your browser can decode." buttonLabel="Choose video" hint={accessEnabled&&!freeFeatures?"Free: 60 seconds · Package: 2 minutes · 200 MiB · 4K":"Up to 2 minutes · 200 MiB · 4K"} busy={loading} validateFile={validateStudioFile} onFile={video => void openVideo(video)} onError={setError} />
    {loading && <p role="status">Opening your video editor…</p>}{error && <p role="alert">{error}</p>}
    <div className="cap-entry-localSetupNote"><Icon name={workflow==="burn"?"subtitle":"volume"} size={16} /><p>{workflow==="burn"?"Next, import your SRT or VTT. Review the text and timing before burning it into your video.":"Generate captions when you’re ready, then review and edit the result."}</p></div>
  </section>;
}
