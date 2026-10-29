import { Icon } from "@/components/ui/icon";

export function PrivacyIndicator({ compact = false, message = "Your original file stays unchanged. Download and check your result before leaving." }: { compact?: boolean; message?: string }) {
  return <div className={`privacy-indicator ${compact ? "compact" : ""}`}><Icon name="shield" size={compact ? 16 : 20} />
    <span>{compact ? "Your original file stays unchanged." : message}</span>
  </div>;
}
