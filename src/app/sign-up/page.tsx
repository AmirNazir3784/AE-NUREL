import { AccessPage } from "@/features/membership/access-page";
import { purchaseProduct } from "@/features/membership/plans";
import "@/features/membership/membership.css";
export const metadata = { title: "Create an Account", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ product?: string }> }) { const p = purchaseProduct((await searchParams).product); return <AccessPage view="signup" product={p?.id} />; }
