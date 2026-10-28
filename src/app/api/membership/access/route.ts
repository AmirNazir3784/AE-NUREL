import { membershipEnabled } from "@/lib/membership-config";
import { captionAccess } from "@/features/membership/caption-policy";
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){
  const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
  if(!membershipEnabled())return Response.json({message:'Account services are unavailable.'},{status:404,headers});
  const anonymous=()=>Response.json({access:captionAccess(false,false),user:null,local:process.env.NODE_ENV==='development'},{headers});
  if(!/\b(?:__Secure-)?better-auth\.session_token=/.test(request.headers.get('cookie')||''))return anonymous();
  try{const {memberFromHeaders,memberService}=await import('@/lib/member-server');const member=await memberFromHeaders(request.headers);if(!member)return anonymous();const service=await memberService();await service.limitOperation(member.id,"api-read",120);return Response.json({access:await service.access(member.id),user:{id:member.id,name:member.name,email:member.email},local:process.env.NODE_ENV==='development'},{headers});}
  catch(error){const issue=error as {status?:number;message?:string};return Response.json({message:issue.status===429?issue.message:'Your account could not be checked. Try again shortly.'},{status:issue.status===429?429:503,headers});}
}
