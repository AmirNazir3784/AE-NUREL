import { membershipEnabled, ownerTestEnabled } from "@/lib/membership-config";
import { captionAccess } from "@/features/membership/caption-policy";
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){
  const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
  if(!membershipEnabled())return Response.json({message:'Account services are unavailable.'},{status:404,headers});
  const anonymous=async()=>{
    if(!ownerTestEnabled())return Response.json({access:captionAccess(false,false),user:null,local:process.env.NODE_ENV==='development'},{headers});
    const [{memberService},{membershipDatabase},{guestIdentity,guestAccess,ensureGuest}]=await Promise.all([import('@/lib/member-server'),import('../../../../../server/membership/database.mjs'),import('../../../../../server/membership/guest.mjs')]);
    const service=await memberService(),{db,config}=await membershipDatabase(),guest=guestIdentity(request.headers,config,true)!;
    await ensureGuest(db,guest.id);
    await service.limitOperation(guest.id,'api-read',120);
    return Response.json({access:guestAccess(await service.access(guest.id)),user:null,local:false},{headers:{...headers,...guest.cookie?{'Set-Cookie':guest.cookie}:{}}});
  };
  try{if(!/\b(?:__Secure-)?better-auth\.session_token=/.test(request.headers.get('cookie')||''))return await anonymous();const {memberFromHeaders,memberService}=await import('@/lib/member-server');const member=await memberFromHeaders(request.headers);if(!member)return await anonymous();const service=await memberService();await service.limitOperation(member.id,"api-read",120);return Response.json({access:await service.access(member.id),user:{id:member.id,name:member.name,email:member.email},local:process.env.NODE_ENV==='development'},{headers});}
  catch(error){const issue=error as {status?:number;message?:string};return Response.json({message:issue.status===429?issue.message:'Your account could not be checked. Try again shortly.'},{status:issue.status===429?429:503,headers});}
}
