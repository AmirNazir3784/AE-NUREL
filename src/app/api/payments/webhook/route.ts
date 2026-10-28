import { membershipEnabled } from "@/lib/membership-config";
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(request:Request){
  if(!membershipEnabled())return new Response(null,{status:404});
  try{
    const [{paymentConfiguration,createPaymentService},{membershipDatabase}]=await Promise.all([import('../../../../../server/membership/payments.mjs'),import('../../../../../server/membership/database.mjs')]);
    const config=paymentConfiguration();if(!config)return new Response(null,{status:503});
    const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400});const chunks:Uint8Array[]=[];let size=0;
    for(;;){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>131072){await reader.cancel();return new Response(null,{status:413});}chunks.push(next.value);}
    const raw=Buffer.concat(chunks),{db}=await membershipDatabase();return Response.json(await createPaymentService(db,config).webhook(raw,request.headers.get('x-signature')),{headers:{'Cache-Control':'no-store'}});
  }catch(error){const e=error as {status?:number};return new Response(null,{status:e.status||503});}
}
