export function MediaToolVisual({ kind }: { kind: "crop" | "key" }) {
  return <div className="aen-hero-merge" aria-hidden="true"><svg viewBox="0 0 320 140" focusable="false">
    {kind === "crop" ? <>
      <rect x="35" y="25" width="250" height="92" rx="8" fill="var(--surface)" stroke="var(--border-strong)" />
      <path d="m48 102 55-48 40 33 38-23 54 38" fill="none" stroke="var(--accent)" strokeWidth="2" opacity=".5" />
      <circle cx="250" cy="45" r="7" fill="var(--action)" opacity=".6" />
      <rect x="113" y="15" width="94" height="112" rx="5" fill="var(--accent-soft)" stroke="var(--action)" strokeWidth="2" />
      <path d="M144 17v108m31-108v108M115 52h90m-90 37h90" stroke="var(--border-strong)" strokeDasharray="4 4" />
      <path d="M107 31V11h20m66 0h20v20m0 80v20h-20m-66 0h-20v-20" fill="none" stroke="var(--action)" strokeWidth="3" strokeLinecap="round" />
    </> : <>
      <rect x="29" y="29" width="105" height="78" rx="9" fill="var(--accent-soft)" stroke="var(--accent)" />
      <path d="m69 48 25 20-25 20Z" fill="var(--accent)" />
      <path d="M150 68h29m-8-8 8 8-8 8" fill="none" stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="196" y="29" width="95" height="78" rx="9" fill="var(--surface)" stroke="var(--action)" />
      <path d="M202 48h83m-83 20h83m-83 20h83m-63-53v66m21-66v66m21-66v66" stroke="var(--border)" strokeWidth="2" />
      <path d="m231 48 25 20-25 20Z" fill="var(--action)" />
    </>}
  </svg></div>;
}
