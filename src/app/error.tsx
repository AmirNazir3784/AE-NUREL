"use client";
import Link from "@/components/site/page-link";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main id="main-content" className="container v1-recovery"><h1>Something went wrong</h1><p>Try again, or return to the tools. Keep your original subtitle file handy.</p><div><button type="button" className="button button-primary" onClick={reset}>Try again</button><Link href="/tools" className="button button-secondary">Browse all tools</Link></div></main>; }
