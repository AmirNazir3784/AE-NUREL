const samples = ["A little less friction.", "More time to create."];

function SubtitlePanel({ format, x, y }: { format: "SRT" | "VTT"; x: number; y: number }) {
  const vtt = format === "VTT", ink = vtt ? "var(--accent)" : "var(--orange-ink)";
  return <g transform={`translate(${x} ${y})`} className="aen-conversion-panel">
    <rect width="256" height="260" rx="14" fill="var(--surface)" stroke="var(--border-strong)" />
    <path d="M14 0h228a14 14 0 0 1 14 14v32H0V14A14 14 0 0 1 14 0Z" fill="var(--surface-soft)" />
    <path d="M0 46h256" stroke="var(--border)" />
    <g fill="none" stroke={ink} strokeWidth="1.5" strokeLinejoin="round"><path d="M18 14h9l5 5v14H18Z" /><path d="M27 14v6h5M21 25h8m-8 4h6" /></g>
    <text x="42" y="28" fontSize="12" fontWeight="600" fill="var(--foreground)">{vtt ? "captions.vtt" : "source.srt"}</text>
    <rect x="194" y="13" width="44" height="21" rx="6" fill={ink} fillOpacity=".1" />
    <text x="216" y="27" textAnchor="middle" fontSize="10" fontWeight="700" fill={ink}>{format}</text>
    {vtt && <text x="18" y="71" fontFamily="monospace" fontSize="10" fontWeight="700" fill={ink}>WEBVTT</text>}
    {samples.map((text, index) => <g key={text} transform={`translate(18 ${vtt ? 91 + index * 66 : 72 + index * 76})`}>
      {!vtt && <text fontFamily="monospace" fontSize="10" fill={ink}>{index + 1}</text>}
      <text y={vtt ? 0 : 17} fontFamily="monospace" fontSize="9" fill="var(--muted)">{index ? (vtt ? "00:00:04.000 --> 00:00:06.000" : "00:00:04,000 --> 00:00:06,000") : (vtt ? "00:00:01.000 --> 00:00:03.500" : "00:00:01,000 --> 00:00:03,500")}</text>
      <text y={vtt ? 23 : 40} fontSize="12" fill="var(--foreground)">{text}</text>
    </g>)}
    <path d="M18 229h220" stroke="var(--border)" />
    <g fill={ink} fillOpacity=".2"><rect x="18" y="240" width="68" height="4" rx="2" /><rect x="96" y="240" width="54" height="4" rx="2" /></g>
    {vtt && <path d="m224 241 4 4 8-8" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
  </g>;
}

export function SubtitleConversionIllustration() {
  return <figure className="aen-feature-visual aen-conversion-visual" aria-label="Convert SRT subtitles to VTT">
    <svg viewBox="0 0 640 368" role="img" aria-labelledby="subtitle-conversion-title subtitle-conversion-description" fontFamily="var(--font-platform)">
      <title id="subtitle-conversion-title">SRT to VTT subtitle conversion</title>
      <desc id="subtitle-conversion-description">Two subtitle documents show the same captions and times, with comma milliseconds in SRT and period milliseconds in WebVTT.</desc>
      <rect width="640" height="368" rx="28" fill="var(--accent)" fillOpacity=".035" />
      <path d="M48 334h96M496 34h96" stroke="var(--border-strong)" />
      <SubtitlePanel format="SRT" x={18} y={34} />
      <path d="M274 164h26q20 0 20 20v6q0 20 20 20h26" fill="none" stroke="var(--accent)" strokeOpacity=".25" strokeWidth="2" />
      <circle cx="320" cy="187" r="21" fill="var(--surface)" stroke="var(--border-strong)" />
      <path d="M311 187h18m-6-6 6 6-6 6" stroke="var(--accent)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <SubtitlePanel format="VTT" x={366} y={74} />
    </svg>
  </figure>;
}
