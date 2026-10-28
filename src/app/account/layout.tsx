import { notFound } from "next/navigation";
import Link from "@/components/site/page-link";
import { accountPreviewAvailable } from "@/lib/account-preview";
import { AccountNavigation } from "@/features/membership/account-navigation";
import { membershipEnabled } from "@/lib/membership-config";
import { requireMember } from "@/lib/member-server";
import "@/features/membership/membership.css";
export const metadata = { title: "Your Account", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Layout({ children }: { children: React.ReactNode }) {
  if (!accountPreviewAvailable()) notFound();
  const connected=membershipEnabled();if(connected)await requireMember();
  return <main id="main-content" className="cm-page cm-account-page">{connected&&process.env.NODE_ENV==='development'&&<div className="cm-account-preview">{connected?'Local development accounts. Package switches here are for testing.':'Account preview. Account services are not connected.'}<Link href="/pricing">Plans &amp; pricing</Link></div>}<div className="cm-account-shell"><AccountNavigation/><section className="cm-account-content">{children}</section></div></main>;
}
