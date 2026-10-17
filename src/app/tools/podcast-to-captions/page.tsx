import { notFound } from "next/navigation";

// Retired duplicate customer route. Shared speech/model/editor modules are retained.
export const metadata = { robots: { index: false, follow: false } };
export default function RetiredCaptionPage() { notFound(); }
