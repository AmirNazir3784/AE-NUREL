import { notFound } from "next/navigation";
import { accountPreviewAvailable } from "@/lib/account-preview";
import { pageMetadata } from "@/lib/site-metadata";
import { PricingPage } from "@/features/membership/pricing-page";
import { membershipEnabled } from "@/lib/membership-config";
import "@/features/membership/membership.css";
export const metadata = { ...pageMetadata("Plans & Pricing", "Compare AENural Free with the $20 one-time Source Window package, including premium Auto Caption Generator features.", "/pricing"), robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default function Page() { if (!accountPreviewAvailable()) notFound(); return <PricingPage openAccess={!membershipEnabled()} />; }
