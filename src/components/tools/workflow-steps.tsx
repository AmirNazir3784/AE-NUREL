import { Icon } from "@/components/ui/icon";

export function WorkflowSteps({ labels, hasFiles, ready, downloaded, label }: {
  labels: readonly [string, string, string]; hasFiles: boolean; ready: boolean; downloaded: boolean; label: string;
}) {
  const active = !hasFiles ? 0 : ready ? 2 : 1;
  return <ol className="workflow-steps" aria-label={label}>{labels.map((text, index) => {
    const status = downloaded || index < active ? "complete" : index === active ? "active" : "pending";
    return <li key={text} className={`step-${status}`} aria-current={status === "active" ? "step" : undefined}>
      <span aria-hidden="true">{status === "complete" ? <Icon name="check" size={14} /> : index + 1}</span>
      <span className="step-label">{text}<span className="sr-only"> — {status === "pending" ? "not yet ready" : status}</span></span>
      {index < 2 && <span className="step-line" aria-hidden="true" />}
    </li>;
  })}</ol>;
}
