import { Icon } from "@/components/ui/icon";

export function PrivacyIndicator({ compact = false, message = "Your file is processed locally in your browser and is not uploaded to our servers." }: { compact?: boolean; message?: string }) {
  return <div className={`privacy-indicator ${compact ? "compact" : ""}`}><Icon name="shield" size={compact ? 16 : 20} />
    <span>{compact ? "Private by design. Processed on your device." : message}</span>
  </div>;
}
