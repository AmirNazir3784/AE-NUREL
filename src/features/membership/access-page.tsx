import { notFound } from "next/navigation";
import { PricingLink } from "@/components/site/pricing-link";
import Link from "@/components/site/page-link";
import { Icon } from "@/components/ui/icon";
import { accountPreviewAvailable } from "@/lib/account-preview";
import { AccessForm } from "./access-form";
import type { PaidProduct } from "./plans";
import { membershipEnabled, ownerTestEnabled } from "@/lib/membership-config";
import { EmailVerificationForm } from "./email-verification-form";

export function AccessPage({ view, product }: { view: "login" | "signup" | "recovery" | "verification"; product?: PaidProduct }) {
  if (!accountPreviewAvailable()) notFound();
  // Three states (Phase 4, see server/membership/activation.mjs):
  // enabled -> the working form; owner-only -> login only, public
  // registration/recovery replaced by a notice; disabled -> NO form at
  // all (the fields and submit button below are not rendered, so the
  // page can never pretend a sign-up or sign-in will work).
  const connected=membershipEnabled();
  const ownerOnly=ownerTestEnabled();
  const text = { login: ["Welcome back.", "Your projects and creative tools, in one place."], signup: ["Make room for your next idea.", "A free account will connect your projects, caption allowance and membership."], recovery: ["Back to creating.", "Request a secure link to choose a new password."], verification: ["One more step.", "Enter the 6-digit code we sent to your email address."] }[view];
  return <main id="main-content" className="cm-page cm-access-page"><div className="cm-access-layout"><section className="cm-access-intro"><PricingLink href="/pricing" className="cm-text-link">← Plans &amp; pricing</PricingLink><h1>{text[0]}</h1><p>{text[1]}</p><div className="cm-access-benefits"><div><Icon name="file" size={23} /><span>Keep your caption projects together.</span></div><div><Icon name="clock" size={23} /><span>Return to your recent tool activity.</span></div><div><Icon name="shield" size={23} /><span>Review your package access and purchases clearly.</span></div></div><p className="cm-access-local">Your original videos stay on your device. Saved projects will contain captions, settings and a source-file reference.</p></section><section className="cm-access-card">{!connected && <div className="cm-access-notice"><Icon name="info" size={18} /><p>Account sign-in is unavailable right now. You can still use the caption tools without an account.</p></div>}{product && <p className="cm-selected-plan">Selected product: <strong>Source Window + Captions</strong></p>}<h2>{!connected && !ownerOnly && view !== "verification" ? "Accounts unavailable" : view === "signup" ? "Create your account" : view === "recovery" ? "Reset your password" : view === "verification" ? "Verify your email" : "Sign in to AENural"}</h2>{!connected && !ownerOnly && view !== "verification" ? <div><div className="cm-access-notice"><Icon name="info" size={18} /><p>Account sign-in is unavailable right now. Nothing was sent or saved.</p></div><p>You can still use the caption tools without an account — your videos stay on your device.</p><p><Link className="aen-btn aen-btn-primary" href="/tools/auto-caption-generator">Use the free caption tools <Icon name="arrow" size={16} /></Link></p><p><Link className="cm-text-link" href="/pricing">Compare plans <Icon name="arrow" size={15} /></Link></p></div> : ownerOnly&&view!=="login"?<p>Public registration and email recovery are unavailable. <Link href="/sign-in">Owner sign in</Link> or <Link href="/tools/auto-caption-generator">use free captions</Link>.</p>:view === "verification" ? connected ? <EmailVerificationForm connected={connected} /> : <div className="cm-verification"><Icon name="shield" size={42} /><p>Email verification is currently unavailable. You can still use the caption tools without an account.</p><button disabled className="aen-btn aen-btn-primary">Resend verification code</button><Link href="/sign-in" className="cm-text-link">Back to sign in <Icon name="arrow" size={16} /></Link></div> : <AccessForm view={view} product={product} connected={connected} ownerOnly={ownerOnly} />}</section></div></main>;
}
