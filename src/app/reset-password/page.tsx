import { notFound } from "next/navigation";
import { membershipEnabled } from "@/lib/membership-config";
import { EmailActions } from "@/features/membership/email-actions";
import "@/features/membership/membership.css";
export const metadata={title:'Reset Password',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export const dynamic='force-dynamic';
export default function Page(){if(!membershipEnabled())notFound();return <main id="main-content" className="cm-page cm-access-page"><section className="cm-access-card" style={{maxWidth:460,margin:'auto'}}><h1 style={{fontSize:32}}>Back to creating.</h1><p>Choose a new password for your AENural account.</p><EmailActions reset/></section></main>;}
