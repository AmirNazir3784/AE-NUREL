export function SubtitleConversionIllustration() {
  return <figure className="aen-feature-visual aen-conversion-visual" aria-label="Convert SRT subtitles to VTT">
    <svg viewBox="0 0 600 360" role="img" aria-labelledby="subtitle-conversion-title">
      <title id="subtitle-conversion-title">SRT to VTT subtitle conversion</title>
      <rect x="40" y="72" width="196" height="216" rx="18" fill="var(--surface)" stroke="var(--border-strong)" />
      <rect x="364" y="72" width="196" height="216" rx="18" fill="var(--surface)" stroke="var(--border-strong)" />
      <path d="M40 90a18 18 0 0 1 18-18h160a18 18 0 0 1 18 18v38H40Z" fill="var(--action)" fillOpacity=".12" />
      <path d="M364 90a18 18 0 0 1 18-18h160a18 18 0 0 1 18 18v38H364Z" fill="var(--accent)" fillOpacity=".12" />
      <g fontFamily="var(--font-heading)" fontWeight="700" fontSize="25"><text x="62" y="110" fill="var(--action)">SRT</text><text x="386" y="110" fill="var(--accent)">VTT</text></g>
      <g fontFamily="monospace" fontSize="15" fill="var(--muted)"><text x="62" y="163">00:00:01,000</text><text x="386" y="163">00:00:01.000</text></g>
      <g stroke="var(--muted)" strokeWidth="6" strokeLinecap="round" opacity=".4"><path d="M64 195h146M64 215h112M64 247h146M388 195h146M388 215h112M388 247h146" /></g>
      <circle cx="300" cy="180" r="30" fill="var(--accent)" fillOpacity=".1" />
      <path d="M284 180h30m-10-10 10 10-10 10" fill="none" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </figure>;
}
