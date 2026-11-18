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
export function FreeToolsMenu({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const imageTools = tools.filter(tool => tool.group === "Image Tools");
  const captionTools = tools.filter(tool => tool.group === "Caption Generation");
  const count = tools.filter(tool => groups.some(group => group.name === tool.group) || tool.group === "Image Tools" || tool.group === "Caption Generation").length;
  return <NavigationMenu label="Free Tools" className={`aen-free-menu ${styles.menu}`}>
    <div className={styles.intro}><div><strong>Free tools</strong><p>A little help for every part of your edit.</p></div><span>{count} tools</span></div>
    <div className={styles.groups}>
      {groups.map(group => {
        const entries = tools.filter(tool => tool.group === group.name);
        return <div key={group.id} className={`${styles.group} ${group.id === "video" ? styles.video : group.id === "conversion" ? styles.conversion : ""}`}><section aria-labelledby={`free-tools-${group.id}`}>
          <div className={styles.groupHeading}><h2 id={`free-tools-${group.id}`}>{group.name}</h2><span aria-label={`${entries.length} tools`}>{String(entries.length).padStart(2, "0")}</span></div>
          <p className={styles.description}>{group.description}</p>
          <div className={styles.links}>{entries.map(tool => <Link key={tool.href} href={tool.href} title={tool.title} aria-label={tool.title} aria-current={pathname === tool.href ? "page" : undefined} onClick={onNavigate}>
            <ToolIcon name={tool.icon} compact />
            <span className={styles.toolText}><b>{menuNames[tool.href] ?? tool.title}</b></span>
            <Icon name="arrow" size={13} className={styles.linkArrow} />
          </Link>)}</div>
        </section>{group.id === "video" && imageTools.length > 0 && <section className={styles.images} aria-labelledby="free-tools-images"><div className={styles.groupHeading}><h2 id="free-tools-images">Image tools</h2><span aria-label={`${imageTools.length} tools`}>{String(imageTools.length).padStart(2, "0")}</span></div><div className={styles.links}>{imageTools.map(tool => <Link key={tool.href} href={tool.href} title={tool.title} aria-label={tool.title} aria-current={pathname === tool.href ? "page" : undefined} onClick={onNavigate}><ToolIcon name={tool.icon} compact /><span className={styles.toolText}><b>{menuNames[tool.href] ?? tool.title}</b></span><Icon name="arrow" size={13} className={styles.linkArrow} /></Link>)}</div></section>}{group.id === "editing" && captionTools.length > 0 && <section className={styles.images} aria-labelledby="free-tools-captions"><div className={styles.groupHeading}><h2 id="free-tools-captions">Caption generation</h2><span aria-label={`${captionTools.length} tools`}>{String(captionTools.length).padStart(2, "0")}</span></div><div className={styles.links}>{captionTools.map(tool => <Link key={tool.href} href={tool.href} title={tool.title} aria-label={tool.title} aria-current={pathname === tool.href ? "page" : undefined} onClick={onNavigate}><ToolIcon name={tool.icon} compact /><span className={styles.toolText}><b>{tool.title}</b></span><Icon name="arrow" size={13} className={styles.linkArrow} /></Link>)}</div></section>}</div>;
      })}
    </div>
    <div className={`aen-mega-footer ${styles.footer}`}><Link href="/tools" onClick={onNavigate}>Browse all free tools<Icon name="arrow" size={17} /></Link></div>
  </NavigationMenu>;
}
