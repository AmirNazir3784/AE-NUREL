import styles from "./editorial-draft.module.css";

export function EditorialIllustration({ name }: { name: "portrait" | "clip-timeline" | "translation" }) {
  if (name === "portrait") return <figure className={styles.illustration} tabIndex={0} aria-label="Original illustration; scroll horizontally on a narrow screen">
    <svg viewBox="0 0 720 440" role="img" aria-label="Original portrait layout sketch: a subject area, a name card and caption space need separate review; platform controls may occupy the bottom or side.">
      <rect x="28" y="20" width="225" height="400" rx="16" fill="var(--nav-bg)" stroke="var(--border-strong)" />
      <rect x="78" y="70" width="125" height="160" rx="28" fill="var(--accent-soft)" stroke="var(--accent)" />
      <text x="140" y="150" textAnchor="middle" fill="var(--accent)">Subject area</text>
      <rect x="50" y="248" width="180" height="42" rx="6" fill="var(--action)" /><text x="140" y="274" textAnchor="middle" fill="var(--on-action)">Name card</text>
      <rect x="50" y="310" width="180" height="54" rx="6" fill="var(--surface)" stroke="var(--accent)" /><text x="140" y="342" textAnchor="middle" fill="var(--foreground)">Caption test</text>
      <path d="M253 150H300M253 270H300M253 340H300" stroke="var(--accent)" fill="none" />
      <text x="320" y="146" fill="var(--foreground)">Keep essential action visible</text><text x="320" y="176" fill="var(--muted)">Check the whole shot, not a still.</text>
      <text x="320" y="266" fill="var(--foreground)">Separate titles from dialogue</text><text x="320" y="296" fill="var(--muted)">Review both when they coincide.</text>
      <text x="320" y="346" fill="var(--foreground)">Test the longest caption</text><text x="320" y="376" fill="var(--muted)">Check actual platform overlays.</text>
    </svg><figcaption>Original layout sketch. The regions illustrate a review process; they are not measured platform safe areas.</figcaption>
  </figure>;
  if (name === "clip-timeline") return <figure className={styles.illustration} tabIndex={0} aria-label="Original illustration; scroll horizontally on a narrow screen">
    <svg viewBox="0 0 760 260" role="img" aria-label="Illustrative episode-to-clip timeline: a clip begins at episode time 12 minutes 30 seconds; a cue at 12 minutes 32.5 seconds becomes 2.5 seconds in the clip.">
      <text x="24" y="36" fill="var(--foreground)">Episode reference</text><path d="M24 90H730" stroke="var(--border-strong)" strokeWidth="3" />
      <rect x="260" y="66" width="440" height="48" rx="8" fill="var(--accent-soft)" stroke="var(--accent)" /><text x="280" y="96" fill="var(--accent)">Selected excerpt</text>
      <path d="M260 48V140M440 56V142" stroke="var(--accent)" strokeDasharray="5 5" />
      <text x="242" y="160" textAnchor="end" fill="var(--muted)">12:30.000</text><text x="454" y="160" fill="var(--muted)">Cue: 12:32.500</text>
      <text x="24" y="220" fill="var(--foreground)">Clip time</text><path d="M260 210H730" stroke="var(--border-strong)" strokeWidth="3" />
      <circle cx="260" cy="210" r="6" fill="var(--action)" /><circle cx="440" cy="210" r="6" fill="var(--accent)" />
      <text x="260" y="246" textAnchor="middle" fill="var(--muted)">0.000</text><text x="440" y="246" textAnchor="middle" fill="var(--accent)">Cue: 2.500</text>
    </svg><figcaption>Original timing illustration; schematic spacing. Subtract the actual clip in-point once for a continuous, unchanged-speed excerpt.</figcaption>
  </figure>;
  return <figure className={styles.illustration} tabIndex={0} aria-label="Original illustration; scroll horizontally on a narrow screen">
    <svg viewBox="0 0 760 250" role="img" aria-label="Original translation review diagram: one reviewed source and glossary feed separate language, timing and export checks before delivery.">
      <rect x="20" y="70" width="190" height="100" rx="12" fill="var(--accent-soft)" stroke="var(--accent)" /><text x="115" y="112" textAnchor="middle" fill="var(--foreground)">Reviewed source</text><text x="115" y="143" textAnchor="middle" fill="var(--muted)">+ verified glossary</text>
      <path d="M210 120H260M260 40V200M260 40H300M260 120H300M260 200H300" stroke="var(--accent)" fill="none" />
      {[['Language meaning',24],['Caption timing',104],['Usable export',184]].map(([label,y])=><g key={label}><rect x="300" y={Number(y)} width="225" height="48" rx="8" fill="var(--surface)" stroke="var(--border-strong)" /><text x="412" y={Number(y)+30} textAnchor="middle" fill="var(--foreground)">{label}</text></g>)}
      <path d="M525 48H570V208H525M570 128H610" stroke="var(--accent)" fill="none" /><text x="625" y="135" fill="var(--accent)">Review</text>
    </svg><figcaption>Original review framework: preserved timestamps are one check, alongside language meaning and a usable export.</figcaption>
  </figure>;
}
