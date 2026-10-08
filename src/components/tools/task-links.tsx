import Link from "next/link";
import { ToolIcon } from "@/components/ui/icon-tile";
import { Icon } from "@/components/ui/icon";
import { tools } from "@/lib/tools";
import { subtitleTasks } from "@/lib/discovery";
export function TaskLinks({ compact = false }: { compact?: boolean }) {
  return <div className="v1-task-grid">{subtitleTasks.filter((_,i) => !compact || [0,1,4,5,6].includes(i)).map((task) => { const tool = tools.find((t) => t.href === task.href)!; return <Link href={task.href} key={task.href}><ToolIcon name={tool.icon} compact /><span>{task.label}</span><Icon name="arrow" size={17} /></Link>; })}</div>;
}
