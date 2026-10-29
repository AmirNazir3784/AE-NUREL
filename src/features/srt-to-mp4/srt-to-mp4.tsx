"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileUpload } from "@/components/tools/file-upload";
import { DownloadButton } from "@/components/tools/download-button";
import { StatusMessage } from "@/components/ui/status-message";
import { useConversion } from "@/features/conversion/use-conversion";
import { ConversionNotices } from "@/features/conversion/conversion-controls";
import { validateConversionFile } from "@/lib/subtitle-conversion";
import { openSrtForMp4, prepareSubtitleVideo, type VideoSettings } from "@/lib/subtitle-video";
type RenderedVideo = { id: number; bytes: ArrayBuffer; url: string; playable: boolean };
export function SrtToMp4Converter() {
  const tool = useConversion(["srt"], openSrtForMp4), result = tool.state.result;
  const [settings, setSettings] = useState<VideoSettings>({ resolution: "480", background: "black" });
  const [video, setVideo] = useState<RenderedVideo | null>(null), [busy, setBusy] = useState(false), [percent, setPercent] = useState(0);
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  const operation = useRef(0), controller = useRef<AbortController | null>(null);
  const plan = useMemo(() => result ? prepareSubtitleVideo(result.content) : null, [result]);
  useEffect(() => () => { operation.current++; controller.current?.abort(); }, []);
  const videoUrl = video?.url;
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);
  function clearVideo() { operation.current++; controller.current?.abort(); setVideo(null); setBusy(false); setPercent(0); setError(""); setMessage(""); }
  function reset() { clearVideo(); tool.reset(); setSettings({ resolution: "480", background: "black" }); }
  async function render() {
    if (!plan || busy) return;
    clearVideo(); const id = ++operation.current, abort = new AbortController(); controller.current = abort; setBusy(true);
    try {
      const { renderMp4 } = await import("./render-mp4");
      const bytes = await renderMp4(plan, settings, abort.signal, value => { if (id === operation.current) setPercent(value); });
      if (id !== operation.current) return;
      setVideo({ id, bytes, url: URL.createObjectURL(new Blob([bytes], { type: "video/mp4" })), playable: false });
    } catch (reason) { if (id === operation.current && !abort.signal.aborted) setError(reason instanceof Error ? reason.message : "MP4 rendering failed. Try again."); }
    finally { if (id === operation.current) setBusy(false); }
  }
  return <div className="aen-file-converter"><section className="aen-conversion-panel aen-video-converter" aria-label="SRT caption video rendering">
    {busy ? <div><strong>{tool.state.file?.name}</strong><p>Rendering your caption video…</p></div> : <FileUpload accept=".srt" title="Add your SRT file" description="Create a silent caption video." buttonLabel="Choose SRT file" hint="SRT · up to 10 MB · 500 cues · 2-minute timeline" filename={tool.state.file?.name} detail={result ? result.cueCount + " cues · Ready to render" : undefined} busy={tool.state.busy} validateFile={file => validateConversionFile(file, ["srt"])} onFile={file => { clearVideo(); tool.readFile(file); }} onError={text => { clearVideo(); tool.reject(text); }} />}
    <p className="aen-local-note">Your original file stays unchanged. No signup required.</p>
    {plan && <><p>{(plan.durationMs / 1000).toFixed(3)} seconds · From zero to the last cue’s end · No audio</p>
      <div className="aen-video-settings"><label>Resolution<select value={settings.resolution} disabled={busy} onChange={event => { clearVideo(); setSettings({ ...settings, resolution: event.target.value as VideoSettings["resolution"] }); }}><option value="480">480p · 854 × 480</option><option value="720">720p · 1280 × 720</option></select></label>
      <label>Background<select value={settings.background} disabled={busy} onChange={event => { clearVideo(); setSettings({ ...settings, background: event.target.value as VideoSettings["background"] }); }}><option value="black">Black with white text</option><option value="white">White with dark text</option></select></label></div></>}
    <ConversionNotices tool={tool} />
    {error && <StatusMessage tone="error">{error}</StatusMessage>}
    
    {busy && <div role="status"><label htmlFor="mp4-progress">Rendering MP4 · {percent}%</label><progress id="mp4-progress" max={100} value={percent} /><p>Keep this tab open. You can cancel rendering.</p></div>}
    {plan && !busy && <button className="button button-primary" type="button" onClick={render}>{video ? "Render again" : "Render MP4"}</button>}
    {video && <div className="aen-conversion-ready"><h2 role="status">{video.playable ? "MP4 ready" : "Checking video playback…"}</h2>
      <video controls playsInline preload="auto" aria-label="Rendered subtitle MP4" src={video.url} onLoadedData={event => {
        if (video.id !== operation.current) return;
        const player = event.currentTarget;
        if (!plan || !Number.isFinite(player.duration) || Math.abs(player.duration - plan.durationMs / 1000) > .05 || !player.videoWidth) { setError("The rendered video could not be validated. Try rendering again."); setVideo(null); return; }
        setVideo(current => current?.url === video.url ? { ...current, playable: true } : current);
      }} onError={() => { if (video.id !== operation.current) return; setError("This browser could not play the rendered MP4. Try rendering again in an updated browser."); setVideo(null); }} />
      {video.playable && result && <DownloadButton content={video.bytes} filename={result.filename} mimeType="video/mp4" label="Download MP4" onDownloaded={() => setMessage("Download started: " + result.filename)} onError={setError} />}
    </div>}
    {(result || busy || tool.state.error) && <div className="aen-conversion-reset"><button className="text-button" type="button" onClick={event => { const container = event.currentTarget.closest(".aen-file-converter"); reset(); requestAnimationFrame(() => container?.querySelector<HTMLButtonElement>(".upload-zone button")?.focus()); }}>{busy ? "Cancel and start over" : "Start over"}</button></div>}
  </section></div>;
}
