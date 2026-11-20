import { membershipEnabled, ownerTestEnabled } from "@/lib/membership-config";
import { memberFromHeaders, memberService } from "@/lib/member-server";
import { validateProject } from "@/features/membership/project-validation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store", "Vary": "Cookie" } });
async function body(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) throw Object.assign(new Error("Send project data as JSON."),{status:415});
  const reader=request.body?.getReader();if(!reader)throw new Error("Send the required information.");
  const parts:Uint8Array[]=[];let length=0;
  for(;;){const next=await reader.read();if(next.done)break;length+=next.value.length;if(length>512*1024){await reader.cancel();throw Object.assign(new Error("Keep project data under 512 KiB."),{status:413});}parts.push(next.value);}
  const bytes=new Uint8Array(length);let cursor=0;for(const part of parts){bytes.set(part,cursor);cursor+=part.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
async function handle(request: Request,context: Context) {
  if(!membershipEnabled())return json({message:"Not found."},404);
  const {path}=await context.params,route=path.join("/");
  try{
    if(request.method!=="GET"){
      const expected=process.env.BETTER_AUTH_URL || (process.env.NODE_ENV==='development'?'http://localhost:3000':'https://aenural.com');
      if(request.headers.get("origin")!==new URL(expected).origin)return json({message:"This request could not be verified."},403);
    }
    if(request.method==='GET'&&route==='pending-verification'){
      const { handlePendingVerificationStatus, checkAnonymousRouteLimit } = await import('../../../../../server/membership/pending-verification.mjs');
      // S5-30: this branch previously had no rate limit of its own.
      // Best-effort per-IP throttle (60/min, only when an IP header
      // is present — no header means no throttle rather than one
      // shared bucket for everyone). The response only ever echoes
      // the caller's own cookie, so the exposure is minor; the
      // throttle is defence-in-depth.
      const clientIp = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
      if (clientIp && !checkAnonymousRouteLimit(`status:${clientIp}`, { max: 60 })) return json({message:"Too many requests. Please wait a minute and try again."},429);
      // Delivery status is reported only for a sign-up-signed cookie
      // (see pending-verification.mjs): the signature is verified with
      // the auth secret, loaded best-effort so a config problem
      // degrades to delivery 'unknown' instead of breaking the
      // endpoint — the email itself is still returned.
      let secret: string | undefined;
      try {
        const { membershipConfig } = await import('../../../../../server/membership/config.mjs');
        secret = membershipConfig()?.secret ?? process.env.BETTER_AUTH_SECRET;
      } catch { secret = process.env.BETTER_AUTH_SECRET; }
      return handlePendingVerificationStatus(request, { secret });
    }
    if(request.method==='POST'&&route==='pending-verification/resend'){
      const { handlePendingVerificationRecovery, checkAnonymousRouteLimit, PENDING_VERIFICATION_RECOVERY_MESSAGE } = await import('../../../../../server/membership/pending-verification.mjs');
      // S5-05/S5-30: the resend route has its own limits now. The
      // per-IP throttle (30/min, only when an IP header is present)
      // is defence-in-depth — the real bound is the per-email resend
      // budget enforced in the recovery handler and the plugin
      // before-hook, because a server-side auth.api call carries no
      // client IP for Better Auth's per-IP limiter. A throttled
      // resend answers the same generic success as a real one, so
      // throttling reveals nothing about the address.
      const clientIp = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
      if (clientIp && !checkAnonymousRouteLimit(`resend:${clientIp}`, { max: 30 })) return json({ success: true, message: PENDING_VERIFICATION_RECOVERY_MESSAGE });
      const { membershipAuth, checkEmailTransportHealth } = await import('../../../../../server/membership/auth.mjs');
      const { membershipDatabase } = await import('../../../../../server/membership/database.mjs');
      const auth = await membershipAuth();
      const { db, config } = await membershipDatabase();
      return handlePendingVerificationRecovery(request, { auth, db, config, checkEmailTransportHealth });
    }
    const member=await memberFromHeaders(request.headers);
    if(!member&&ownerTestEnabled()&&request.method==='POST'&&(route==='jobs'||route==='exports'||path.length===3&&path[0]==='jobs'&&path[2]==='complete')){
      const service=await memberService();
      const [{membershipDatabase},{guestIdentity,guestAccess}]=await Promise.all([import('../../../../../server/membership/database.mjs'),import('../../../../../server/membership/guest.mjs')]);
      const {config}=await membershipDatabase(),guest=guestIdentity(request.headers,config);
      if(!guest)return json({message:'Refresh this page to start your free caption session.'},401);
      await service.limitOperation(guest.id,'api-write',30);
      if(route==='jobs')return json({...await service.reserve(guest.id,await body(request)),access:guestAccess(await service.access(guest.id))});
      if(route==='exports'){await service.activity(guest.id,'export');return json({access:guestAccess(await service.access(guest.id))});}
      await service.complete(guest.id,path[1]);return json({ok:true});
    }
    // The anonymous GET /api/membership/access branch that used to live
    // here was deleted (S5-30): it is unreachable — Next.js serves
    // /api/membership/access from the static route
    // src/app/api/membership/access/route.ts, which takes precedence
    // over this catch-all — and it had no rate limit. Anonymous access
    // is served (and limited, in owner-test mode) by that static route.
    if(!member)return json({message:"Sign in and verify your email to continue.",code:"SIGN_IN_REQUIRED"},401);
    const service=await memberService();
    await service.limitOperation(member.id,request.method==='GET'?'api-read':'api-write',request.method==='GET'?120:30);
    if(request.method==='GET'&&route==='access')return json({access:await service.access(member.id),user:{id:member.id,name:member.name,email:member.email},local:process.env.NODE_ENV==='development'});
    if(request.method==='GET'&&route==='overview')return json(await service.overview(member.id));
    if(request.method==='GET'&&path.length===2&&path[0]==='receipts'){
      const [{paymentConfiguration,createPaymentService},{membershipDatabase}]=await Promise.all([import('../../../../../server/membership/payments.mjs'),import('../../../../../server/membership/database.mjs')]);
      const payment=paymentConfiguration();if(!payment)return json({message:'Purchase receipts are temporarily unavailable.'},503);
      const {db}=await membershipDatabase();const url=await createPaymentService(db,payment).receipt(member.id,path[1]);return new Response(null,{status:303,headers:{Location:url,'Cache-Control':'no-store'}});
    }
    if(request.method==='GET'&&path.length===2&&path[0]==='projects')return json(await service.project(member.id,path[1]));
    if(request.method==='POST'&&route==='jobs')return json({...await service.reserve(member.id,await body(request)),access:await service.access(member.id)});
    if(request.method==='POST'&&path.length===3&&path[0]==='jobs'&&path[2]==='complete'){await service.complete(member.id,path[1]);return json({ok:true});}
    if(request.method==='POST'&&route==='exports'){const access=await service.access(member.id);await service.activity(member.id,'export');return json({access});}
    if((request.method==='POST'&&route==='projects')||(request.method==='PUT'&&path.length===2&&path[0]==='projects')){
      const input=await body(request),access=await service.access(member.id);
      let data;try{data=validateProject(input,access.premium);}catch(error){return json({message:error instanceof Error?error.message:'Invalid project.'},400);}
      return json(await service.saveProject(member.id,data,path[1],input.revision),request.method==='POST'?201:200);
    }
    if(request.method==='DELETE'&&path.length===2&&path[0]==='projects'){await service.deleteProject(member.id,path[1]);return json({ok:true});}
    if(request.method==='POST'&&route==='development-plan'&&process.env.NODE_ENV==='development'){
      const input=await body(request);if(typeof input.premium!=='boolean')return json({message:'Choose a development plan.'},400);
      return json({access:await service.developmentPlan(member.id,input.premium)});
    }
    return json({message:'Not found.'},404);
  }catch(error){
    const issue=error as {status?:number;message?:string;code?:string};
    if(issue.status&&issue.status>=400&&issue.status<500)return json({message:issue.message,code:issue.code},issue.status);
    if(error instanceof SyntaxError)return json({message:'The information could not be read. Try again.'},400);
    // Unexpected (5xx) failures are logged server-side with the error
    // name/code/message only — the client still gets a generic 503.
    // Without this, configuration/startup failures (e.g. a bad
    // BETTER_AUTH_URL or an unreachable database) were invisible in
    // the server log and indistinguishable from a down service.
    console.error('[membership] Membership API failed:', (error as Error)?.name || 'Error', issue?.code || (error as Error)?.message || 'UNKNOWN');
    return json({message:'Account services are temporarily unavailable. Your video is still on your device.'},503);
  }
}
export const GET=handle;export const POST=handle;export const PUT=handle;export const DELETE=handle;

