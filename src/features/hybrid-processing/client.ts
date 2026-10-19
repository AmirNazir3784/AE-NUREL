import type { TimedText } from "../local-asr/asr-core.ts";

const api = "/api/dev/hybrid/jobs";
export type HybridTranscript = { words: TimedText[]; duration: number; language: "en" };
export function validateHybridTranscript(value: unknown, duration: number): HybridTranscript {
  const result = value as HybridTranscript;
  if (!result || result.language !== "en" || !Number.isFinite(result.duration) || Math.abs(result.duration - duration) > .15 || !Array.isArray(result.words) || !result.words.length || result.words.length > 10_000) throw new Error("The server returned incomplete captions. No timing was invented.");
  let end = 0;
  for (const word of result.words) {
    if (!word || typeof word.text !== "string" || !word.text.trim() || word.text.length > 2000 || !Array.isArray(word.timestamp) || word.timestamp.length !== 2) throw new Error("The server returned invalid words.");
    const [start, finish] = word.timestamp;
    if (start === null || finish === null || !Number.isFinite(start) || !Number.isFinite(finish) || start < end || finish <= start || finish > duration + .1) throw new Error("The server returned invalid word timing.");
    end = finish;
  }
  return result;
}

/** Same-origin private service only. Credentials and audio are never stored. */
export async function requestHybridTranscript(audio: Blob, duration: number, token: string, signal: AbortSignal, onStage: (stage: string) => void, fetcher: typeof fetch = fetch): Promise<HybridTranscript> {
  if (!token || token.length < 32 || token.length > 256) throw new Error("Enter the private processing access token.");
  if (!Number.isFinite(duration) || duration <= 0 || duration > 60 || !audio.size || audio.size > 8 * 1024 ** 2) throw new Error("Automatic captions support English audio up to 60 seconds and 8 MiB.");
  signal.throwIfAborted();
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(300_000)]), headers = { Authorization: `Bearer ${token}` };
  let id: string | null = null;
  async function json(response: Response) {
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Private processing is unavailable.");
    return data;
  }
  try {
    onStage("Checking private processing");
    const capability = await json(await fetcher(api, { headers, credentials: "omit", cache: "no-store", signal: deadline }));
    if (!capability.transcription || !capability.cacheReady || capability.maxSeconds < duration || !capability.languages?.includes("en")) throw new Error("The private transcription service is not ready for this recording.");
    onStage("Uploading audio");
    const accepted = await json(await fetcher(api, { method: "POST", body: audio, signal: deadline, credentials: "omit", headers: { ...headers, "Content-Type": "audio/wav", "X-Upload-Consent": "yes", "X-Spoken-Language": "en", "X-Subtitle-Language": "same" } }));
    if (typeof accepted.id !== "string" || !/^[a-f0-9-]{36}$/.test(accepted.id)) throw new Error("The server returned an invalid job.");
    id = accepted.id;
    const stages: Record<string, string> = { loading: "Loading transcription model", transcribing: "Transcribing English speech", building: "Preparing captions", stopping: "Stopping processing" };
    while (true) {
      deadline.throwIfAborted();
      const job = await json(await fetcher(`${api}/${id}`, { headers, credentials: "omit", cache: "no-store", signal: deadline }));
      if (["failed", "cancelled"].includes(job.stage)) throw new Error(job.error || "Transcription stopped. Try again.");
      if (job.stage === "complete") return validateHybridTranscript(job.result, duration);
      if (!stages[job.stage]) throw new Error("The server returned an unknown processing state.");
      onStage(stages[job.stage]);
      await new Promise<void>((resolve, reject) => {
        const abort = () => { clearTimeout(timer); reject(deadline.reason); };
        const timer = setTimeout(() => { deadline.removeEventListener("abort", abort); resolve(); }, 1500);
        deadline.addEventListener("abort", abort, { once: true });
      });
    }
  } finally {
    if (id) {
      // Independent deadline: cancellation also has to release server resources.
      const response = await fetcher(`${api}/${id}`, { method: "DELETE", credentials: "omit", headers, signal: AbortSignal.timeout(5000) }).catch(() => null);
      if (!response || !response.ok && response.status !== 404) onStage("Server cleanup could not be confirmed. Its automatic timeout still applies.");
    }
  }
}
