import { AccessPage } from "@/features/membership/access-page";
import "@/features/membership/membership.css";
export const metadata = { title: "Password Recovery", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default function Page() { return <AccessPage view="recovery" />; }
