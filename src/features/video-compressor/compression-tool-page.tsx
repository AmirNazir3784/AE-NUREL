import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { ToolBenefits, ToolFaq, ToolHero, ToolLayout, RelatedTools } from "@/components/tools/tool-layout";
import { tools } from "@/lib/tools";
import { relevantRoutes } from "@/lib/discovery";
import styles from "./compression-tool-page.module.css";

export function CompressionMark({ label, image = false }: { label: string; image?: boolean }) {
  return <div className={styles.mark} aria-hidden="true"><svg viewBox="0 0 320 140" focusable="false">
    <g className={styles.source}><rect x="25" y="29" width="100" height="76" rx="9" fill="var(--surface)" stroke="var(--border-strong)" />
      {image ? <><circle cx="99" cy="46" r="5" fill="var(--action)" /><path d="m37 89 23-26 18 18 13-13 22 21" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" /></> : <><path d="m65 48 24 19-24 19Z" fill="var(--action)" /><path d="M36 38h78M36 96h78" stroke="var(--border)" strokeWidth="2" strokeDasharray="7 5" /></>}
    </g>
    <path className={styles.arrow} d="M143 67h35m-8-8 8 8-8 8" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <g className={styles.output}><rect x="198" y="40" width="94" height="56" rx="9" fill="var(--surface)" stroke="var(--action)" strokeWidth="1.5" /><text x="245" y="73" textAnchor="middle" fill="var(--orange-ink)" fontFamily="var(--font-platform)" fontSize="15" fontWeight="700">{label}</text><path d="m231 109 8 7 17-17" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></g>
  </svg></div>;
}

export function CompressionToolPage({ name, description, label, image = false, ticks, questions, children }: {
  name: string; description: string; label: string; image?: boolean; ticks: readonly string[];
  questions: readonly (readonly [string, string])[]; children: ReactNode;
}) {
  const tool = tools.find(tool => tool.title === name)!;
  const related = (relevantRoutes[tool.href] ?? []).map(href => tools.find(tool => tool.href === href)!);
  return <ToolLayout title={name} category={image ? "Image Tools" : "Video Tools"} categoryHref={image ? "/tools#image-tools" : "/tools#video-tools"}>
    <ToolHero title={name} description={description} ticks={ticks} chipA={null} chipB={null} chipC={null} art="plain" visual={<CompressionMark label={label} image={image} />} />
    {children}
    <div className={styles.support}><ToolBenefits items={[
      { icon: <Icon name="upload" />, title: image ? "Add your image" : "Add your video", text: "Choose a file or drop it into the tool." },
      { icon: <Icon name="srt-editor" />, title: "Choose your settings", text: image ? "Set the size, format and dimensions." : "Choose the quality, size and sound." },
      { icon: <Icon name="download" />, title: "Preview and download", text: "Check the result. Keep your original." },
    ]} /></div>
    <ToolFaq href={tool.href} items={questions.map(([q, a]) => ({ q, a }))} />
    <RelatedTools title={image ? "More media tools" : "More video tools"} tools={related} />
  </ToolLayout>;
}
