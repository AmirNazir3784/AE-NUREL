import type { CaptionAccess } from "./caption-policy";
export type MemberStatus = { access: CaptionAccess; user: {id:string;name:string;email:string}|null;local:boolean };
export type PendingVerification = { email: string | null; maskedEmail: string | null; delivery: OtpDeliveryStatus };
// Delivery status of the last OTP send for the pending address, recorded
// server-side by the app's own sendVerificationOTP callback (Better Auth
// 1.7.14 swallows send failures and answers success — see
// server/membership/otp-delivery.mjs). 'sent' means the code left the
// server, 'failed' means the send threw, 'unknown' means no send was
// attempted for this address or the record expired. Never carries an
// error code, provider detail or the OTP itself.
export type OtpDeliveryStatus = "sent" | "failed" | "unknown";
export class MemberRequestError extends Error { constructor(message:string,public status:number,public code?:string){super(message);} }
export async function memberRequest<T = unknown>(path:string,options:RequestInit={}) : Promise<T> {
  const response=await fetch('/api/membership/'+path,{...options,credentials:'same-origin',cache:'no-store',headers:{...options.body?{'Content-Type':'application/json'}:{},...options.headers}});
  const result=await response.json().catch(()=>({message:'Account services are unavailable. Try again.'}));
  if(!response.ok)throw new MemberRequestError(result.message||'This request could not be completed.',response.status,result.code);
  return result as T;
}
export async function pendingVerification(): Promise<PendingVerification> {
  const result = await memberRequest<PendingVerification>("pending-verification");
  const delivery: OtpDeliveryStatus = result.delivery === "sent" || result.delivery === "failed" ? result.delivery : "unknown";
  return { email: result.email ?? null, maskedEmail: result.maskedEmail ?? null, delivery };
}
export async function requestVerificationRecovery(email: string): Promise<{ success: boolean; message: string }> {
  // POST /api/membership/pending-verification/resend — server re-sends a code only
  // for an unverified account and answers generically in every case, so this
  // cannot be used to enumerate accounts. Never calls the OTP send endpoint directly.
  return memberRequest<{ success: boolean; message: string }>("pending-verification/resend", {
    method: "POST",
    body: JSON.stringify({ email: email.trim() }),
  });
}
export async function authRequest(path:string,body:Record<string,unknown>) {
  const response=await fetch('/api/auth/'+path,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await response.json().catch(()=>({message:'Account services are unavailable. Try again.'}));
  if(!response.ok)throw new MemberRequestError(response.status===429?'Too many attempts. Please wait a minute and try again.':result.code==='EMAIL_NOT_VERIFIED'?'Verify your email before signing in.':path==='sign-in/email'?'Email or password is incorrect.':result.message||'This request could not be completed.',response.status,result.code);
  return result;
}
