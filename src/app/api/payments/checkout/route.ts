import { membershipEnabled } from "@/lib/membership-config";
import { memberFromHeaders,memberService } from "@/lib/member-server";
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(request:Request){
  if(!membershipEnabled())return new Response(null,{status:404});
  const [{paymentConfiguration,createPaymentService},{membershipDatabase}]=await Promise.all([import('../../../../../server/membership/payments.mjs'),import('../../../../../server/membership/database.mjs')]);
  try{const config=paymentConfiguration();if(!config)return Response.json({message:'Purchasing will open after payment setup is complete.'},{status:503});
    if(request.headers.get('origin')!==config.origin)return new Response(null,{status:403});
    const member=await memberFromHeaders(request.headers);if(!member)return Response.json({message:'Sign in and verify your email before purchasing.'},{status:401});
    const service=await memberService();await service.limitOperation(member.id,'checkout',3,15*60000);
    const {db}=await membershipDatabase();return Response.json(await createPaymentService(db,config).checkout(member),{headers:{'Cache-Control':'no-store'}});
  }catch(error){const e=error as {status?:number;message?:string};return Response.json({message:e.status?e.message:'Checkout is temporarily unavailable.'},{status:e.status||503,headers:{'Cache-Control':'no-store'}});}
}
