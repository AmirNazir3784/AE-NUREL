import { membershipEnabled } from "@/lib/membership-config";
export const runtime='nodejs';export const dynamic='force-dynamic';
// Step 5 (S5-31): modest per-IP cap on the webhook, checked BEFORE the
// payment config is loaded or the database pool is opened, so a flood of
// invalid-signature POSTs cannot add app/DB load. 60/min/IP is far above
// Lemon Squeezy's legitimate retry rate (a handful of retries per event).
// The HMAC signature stays the authentication — NO Origin check here:
// Lemon Squeezy posts cross-origin by design.
// This is a coarse, in-memory, single-process load guard (same shape as
// the OTP delivery tracker), not an auth control: the client IP comes
// from x-real-ip / x-forwarded-for, whose trusted value is still
// unconfirmed with Hostinger (S5-01), so a spoofed header can only move
// the caller into a different bucket, never past the signature check.
const WEBHOOK_LIMIT_PER_MINUTE=60;
const WEBHOOK_WINDOW_MS=60000;
const webhookHits=new Map<string,{count:number;resetAt:number}>();
function webhookRateLimited(request:Request){
  const forwarded=request.headers.get('x-forwarded-for');
  const ip=request.headers.get('x-real-ip')?.trim()||(forwarded?forwarded.split(',')[0].trim():'')||'unknown';
  const now=Date.now();
  if(webhookHits.size>1000)for(const [key,value]of webhookHits)if(now>=value.resetAt)webhookHits.delete(key);
  const entry=webhookHits.get(ip);
  if(!entry||now>=entry.resetAt){webhookHits.set(ip,{count:1,resetAt:now+WEBHOOK_WINDOW_MS});return false;}
  entry.count+=1;
  return entry.count>WEBHOOK_LIMIT_PER_MINUTE;
}
export async function POST(request:Request){
  if(!membershipEnabled())return new Response(null,{status:404});
  if(webhookRateLimited(request))return new Response(null,{status:429,headers:{'Cache-Control':'no-store','Retry-After':'60'}});
  try{
    const [{paymentConfiguration,createPaymentService},{membershipDatabase}]=await Promise.all([import('../../../../../server/membership/payments.mjs'),import('../../../../../server/membership/database.mjs')]);
    const config=paymentConfiguration();if(!config)return new Response(null,{status:503});
    const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400});const chunks:Uint8Array[]=[];let size=0;
    for(;;){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>131072){await reader.cancel();return new Response(null,{status:413});}chunks.push(next.value);}
    const raw=Buffer.concat(chunks),{db}=await membershipDatabase();return Response.json(await createPaymentService(db,config).webhook(raw,request.headers.get('x-signature')),{headers:{'Cache-Control':'no-store'}});
  }catch(error){const e=error as {status?:number};return new Response(null,{status:e.status||503});}
}
