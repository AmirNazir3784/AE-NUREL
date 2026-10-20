/** Source-based, non-destructive editing math. Times are decimal seconds. */
export type ClaimKind = 'audio' | 'video' | 'both';
export type Repair =
  | { mode: 'none' }
  | { mode: 'mute' }
  | { mode: 'lower-volume'; volume: number }
  | { mode: 'replace-audio'; assetId: string; volume: number }
  | { mode: 'remove' }
  | { mode: 'replace-video'; assetId: string; replacementDuration: number };
export type Claim = { id: string; start: number; end: number; kind: ClaimKind; repair: Repair };
export type Slice = { source: 'original' | 'replacement'; sourceStart: number; sourceEnd: number; outputStart: number; outputEnd: number; claimId: string | null; repair: Repair };
export type Timeline = { duration: number; claims: Claim[]; slices: Slice[] };
export type EditProject = { duration: number; claims: Claim[] };
const EPS = 1e-7;

export function parseEditTime(value: string): number {
  const parts = value.trim().split(':');
  if (!parts.length || parts.length > 3 || parts.some(part => !/^\d+(?:\.\d{1,3})?$/.test(part))) throw new Error('Enter seconds, M:SS, or H:MM:SS.');
  const numbers = parts.map(Number);
  if (parts.length > 1 && numbers.at(-1)! >= 60 || parts.length === 3 && numbers[1] >= 60) throw new Error('Seconds and minutes must be below 60.');
  const valueSeconds = numbers.reduce((acc, part) => acc * 60 + part, 0);
  if (!Number.isFinite(valueSeconds)) throw new Error('Invalid timestamp.');
  return valueSeconds;
}
export function formatEditTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Invalid timestamp.');
  const millis = Math.round(seconds * 1000);
  const h = Math.floor(millis / 3600000), m = Math.floor(millis % 3600000 / 60000), s = Math.floor(millis % 60000 / 1000), ms = millis % 1000;
  return (h ? \`\${h}:\` + String(m).padStart(2, '0') + ':' : \`\${m}:\`) + String(s).padStart(2, '0') + (ms ? '.' + String(ms).padStart(3, '0') : '');
}
function validRepair(repair: Repair, kind: ClaimKind) {
  if (repair.mode === 'lower-volume' || repair.mode === 'replace-audio') {
    if (!Number.isFinite(repair.volume) || repair.volume < 0 || repair.volume > 1) throw new Error('Volume must be between 0 and 1.');
  }
  if ((repair.mode === 'replace-audio' || repair.mode === 'replace-video') && !repair.assetId.trim()) throw new Error('Choose a replacement media file.');
  if (repair.mode === 'replace-video' && (!Number.isFinite(repair.replacementDuration) || repair.replacementDuration <= 0)) throw new Error('Replacement must have a positive duration.');
  if (kind === 'audio' && repair.mode === 'replace-video') throw new Error('Video replacement requires a video claim.');
  if (kind === 'video' && ['mute', 'lower-volume', 'replace-audio'].includes(repair.mode)) throw new Error('Audio fixes require an audio or combined claim.');
}
export function validateClaim(claim: Claim, duration: number, except: readonly Claim[] = []): Claim {
  if (!claim.id?.trim()) throw new Error('A claim identifier is required.');
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Choose a valid source video.');
  if (!Number.isFinite(claim.start) || !Number.isFinite(claim.end) || claim.start < 0 || claim.end <= claim.start || claim.end > duration + EPS) throw new Error('Claim start must precede end and remain inside the source video.');
  if (!['audio', 'video', 'both'].includes(claim.kind)) throw new Error('Choose Audio, Video, or Both.');
  validRepair(claim.repair, claim.kind);
  if (except.some(other => other.id !== claim.id && claim.start < other.end - EPS && other.start < claim.end - EPS)) throw new Error('Claim ranges overlap. Edit the existing range instead.');
  if (except.some(other => other.id === claim.id)) throw new Error('Duplicate claim identifier.');
  return { ...claim, repair: { ...claim.repair } };
}
export function addClaim(project: EditProject, claim: Claim): EditProject {
  return { ...project, claims: [...project.claims, validateClaim(claim, project.duration, project.claims)].sort((a, b) => a.start - b.start || a.end - b.end) };
}
export function updateClaim(project: EditProject, claim: Claim): EditProject {
  if (!project.claims.some(other => other.id === claim.id)) throw new Error('Claim not found.');
  return { ...project, claims: [...project.claims.filter(other => other.id !== claim.id), validateClaim(claim, project.duration, project.claims.filter(other => other.id !== claim.id))].sort((a, b) => a.start - b.start) };
}
export function removeClaim(project: EditProject, id: string): EditProject {
  return { ...project, claims: project.claims.filter(claim => claim.id !== id) };
}
export function buildTimeline(project: EditProject): Timeline {
  if (!Number.isFinite(project.duration) || project.duration <= 0) throw new Error('Source video duration must be positive.');
  const claims = [...project.claims].sort((a, b) => a.start - b.start);
  claims.forEach((claim, index) => validateClaim(claim, project.duration, claims.filter((_, i) => i !== index)));
  const slices: Slice[] = []; let sourcePosition = 0, outputPosition = 0;
  const append = (from: number, to: number, claimId: string | null, repair: Repair) => {
    if (to - from <= EPS || repair.mode === 'remove') return;
    const length = repair.mode === 'replace-video' ? repair.replacementDuration : to - from;
    slices.push({ source: repair.mode === 'replace-video' ? 'replacement' : 'original', sourceStart: repair.mode === 'replace-video' ? 0 : from, sourceEnd: repair.mode === 'replace-video' ? length : to, outputStart: outputPosition, outputEnd: outputPosition + length, claimId, repair: { ...repair } });
    outputPosition += length;
  };
  for (const claim of claims) {
    append(sourcePosition, claim.start, null, { mode: 'none' });
    append(claim.start, claim.end, claim.id, claim.repair);
    sourcePosition = claim.end;
  }
  append(sourcePosition, project.duration, null, { mode: 'none' });
  if (outputPosition <= EPS) throw new Error('The edits remove the entire video. Keep at least one section.');
  return { duration: outputPosition, claims, slices };
}
export function outputToSource(timeline: Timeline, outputTime: number): { source: Slice['source']; time: number; claimId: string | null } {
  if (!Number.isFinite(outputTime) || outputTime < 0 || outputTime > timeline.duration + EPS) throw new Error('Position outside edited timeline.');
  const slice = timeline.slices.find(part => outputTime < part.outputEnd - EPS) ?? timeline.slices.at(-1);
  if (!slice) throw new Error('No playable segments.');
  return { source: slice.source, time: slice.sourceStart + Math.min(outputTime - slice.outputStart, slice.outputEnd - slice.outputStart), claimId: slice.claimId };
}
export function sourceToOutput(timeline: Timeline, sourceTime: number): number | null {
  if (!Number.isFinite(sourceTime) || sourceTime < 0) throw new Error('Invalid source position.');
  const slice = timeline.slices.find(part => part.source === 'original' && sourceTime >= part.sourceStart - EPS && sourceTime < part.sourceEnd - EPS);
  return slice ? slice.outputStart + sourceTime - slice.sourceStart : null;
}
export type History = { past: EditProject[]; present: EditProject; future: EditProject[] };
export function newHistory(duration: number): History { return { past: [], present: { duration, claims: [] }, future: [] }; }
export function applyEdit(history: History, next: EditProject): History {
  if (next === history.present) return history;
  buildTimeline(next);
  return { past: [...history.past.slice(-49), history.present], present: next, future: [] };
}
export function undoEdit(history: History): History {
  if (!history.past.length) return history;
  return { past: history.past.slice(0, -1), present: history.past.at(-1)!, future: [history.present, ...history.future] };
}
export function redoEdit(history: History): History {
  if (!history.future.length) return history;
  return { past: [...history.past, history.present], present: history.future[0], future: history.future.slice(1) };
}
