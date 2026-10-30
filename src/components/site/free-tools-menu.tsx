import Link from "@/components/site/page-link";
import { Icon } from "@/components/ui/icon";
import { ToolIcon } from "@/components/ui/icon-tile";
import { tools } from "@/lib/tools";
import { menuNames } from "@/lib/discovery";
import { NavigationMenu } from "./navigation-menu";
import styles from "./free-tools-menu.module.css";

const groups = [
  { name: "Video Tools", id: "video", description: "Shape your footage." },
  { name: "Timing & Editing", id: "editing", description: "Edit the words. Get in sync." },
  { name: "Format Conversion", id: "conversion", description: "The right format for your next step." },
] as const;
const videoNotes: Record<string, string> = {
  "/tools/video-compressor": "Reduce video file size",
  "/tools/video-cropper": "Reframe your video",
  "/tools/free-green-screen-remover": "Replace a solid-colour background",
};

export function FreeToolsMenu({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const count = tools.filter(tool => groups.some(group => group.name === tool.group)).length;
  return <NavigationMenu label="Free Tools" className={`aen-free-menu ${styles.menu}`}>
    <div className={styles.intro}><div><strong>Free tools</strong><p>A little help for every part of your edit.</p></div><span>{count} tools</span></div>
    <div className={styles.groups}>
      {groups.map(group => {
        const entries = tools.filter(tool => tool.group === group.name);
        return <section key={group.id} className={`${styles.group} ${group.id === "video" ? styles.video : group.id === "conversion" ? styles.conversion : ""}`} aria-labelledby={`free-tools-${group.id}`}>
          <div className={styles.groupHeading}><h2 id={`free-tools-${group.id}`}>{group.name}</h2><span aria-label={`${entries.length} tools`}>{String(entries.length).padStart(2, "0")}</span></div>
          <p className={styles.description}>{group.description}</p>
          <div className={styles.links}>{entries.map(tool => <Link key={tool.href} href={tool.href} title={tool.title} aria-label={tool.title} aria-current={pathname === tool.href ? "page" : undefined} onClick={onNavigate}>
            <ToolIcon name={tool.icon} compact />
            <span className={styles.toolText}><b>{menuNames[tool.href] ?? tool.title}</b>{group.id === "video" && <small>{videoNotes[tool.href]}</small>}</span>
            <Icon name="arrow" size={13} className={styles.linkArrow} />
          </Link>)}</div>
        </section>;
      })}
    </div>
    <div className={`aen-mega-footer ${styles.footer}`}><Link href="/tools" onClick={onNavigate}>Browse all free tools<Icon name="arrow" size={17} /></Link></div>
  </NavigationMenu>;
}
