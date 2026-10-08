import type { ReactNode } from "react";
import { Icon } from "./icon";

export function StatusMessage({ tone = "info", children, id }: { tone?: "info" | "error" | "success" | "warning"; children: ReactNode; id?: string }) {
  return <div id={id} className={`status-message status-${tone}`} role={tone === "error" ? "alert" : "status"} aria-atomic="true">
    <Icon name={tone === "success" ? "check" : tone === "error" ? "close" : tone === "warning" ? "warning" : "info"} size={18} /><div>{children}</div>
  </div>;
}
