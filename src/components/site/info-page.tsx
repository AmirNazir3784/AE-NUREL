import Link from "@/components/site/page-link";
import type { ReactNode } from "react";
export function InfoPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) { return <main id="main-content" className="container v1-info-page"><nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span aria-current="page">{title}</span></nav><header className="v1-page-intro"><h1>{title}</h1><p>{intro}</p></header><div className="v1-prose">{children}</div></main>; }
