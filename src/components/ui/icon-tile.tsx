import { Icon, type IconName } from "./icon";
import { productIcons, type IconTone, type ProductIconName } from "@/lib/icons";

export function IconTile({ name, level = "feature", tone, compact = false, className = "" }: {
  name: IconName;
  level?: "product" | "feature";
  tone?: IconTone;
  compact?: boolean;
  className?: string;
}) {
  const color = tone ?? (level === "product" && name in productIcons ? productIcons[name as ProductIconName].tone : "soft");
  return <span aria-hidden="true" className={`icon-tile icon-tile-${level} icon-tone-${color}${compact ? " icon-tile-compact" : ""} ${className}`}>
    <Icon name={name} size={compact ? 20 : level === "product" ? 26 : 20} />
  </span>;
}

export function ToolIcon({ name, compact = false, className }: { name: ProductIconName; compact?: boolean; className?: string }) {
  return <IconTile name={name} level="product" compact={compact} className={className} />;
}
