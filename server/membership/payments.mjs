import { createHmac, createHash, timingSafeEqual, randomUUID } from 'node:crypto';
import { MembershipError } from './service.mjs';

export function paymentConfiguration(env=process.env){
  const required=['LEMONSQUEEZY_API_KEY','LEMONSQUEEZY_STORE_ID','LEMONSQUEEZY_VARIANT_ID','LEMONSQUEEZY_WEBHOOK_SECRET'];
  if(!required.every(key=>env[key]))return null;
  if(!/^\d+$/.test(env.LEMONSQUEEZY_STORE_ID)||!/^\d+$/.test(env.LEMONSQUEEZY_VARIANT_ID)||env.LEMONSQUEEZY_WEBHOOK_SECRET.length<32)throw new Error('Invalid payment configuration.');
  return {apiKey:env.LEMONSQUEEZY_API_KEY,storeId:env.LEMONSQUEEZY_STORE_ID,variantId:env.LEMONSQUEEZY_VARIANT_ID,secret:env.LEMONSQUEEZY_WEBHOOK_SECRET,testMode:env.LEMONSQUEEZY_TEST_MODE==='1',salesEnabled:env.AENURAL_SALES_ENABLED==='1',origin:new URL(env.BETTER_AUTH_URL||'https://aenural.com').origin};
}
export function verifyPaymentSignature(raw,signature,secret){
  if(typeof signature!=='string'||!(/^[a-f0-9]{64}$/i).test(signature))return false;
  return timingSafeEqual(Buffer.from(signature,'hex'),createHmac('sha256',secret).update(raw).digest());
}
export function safeProviderURL(value){
  const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||!(url.hostname==='lemonsqueezy.com'||url.hostname.endsWith('.lemonsqueezy.com')))throw new Error('Unexpected checkout location.');return url.href;
}
export function createPaymentService(db,config,{request=fetch,now=()=>new Date()}={}){
  async function api(path,body){
    const response=await request('https://api.lemonsqueezy.com/v1/'+path,{method:body?'POST':'GET',headers:{Accept:'application/vnd.api+json','Content-Type':'application/vnd.api+json',Authorization:'Bearer '+config.apiKey},...body?{body:JSON.stringify(body)}:{},signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new MembershipError('The payment service is unavailable. Please try again shortly.',503);
    return (await response.json()).data;
  }
  async function checkout(member){
    if(!config.salesEnabled)throw new MembershipError('Purchasing has not opened yet.',503);
    const owned=await db.selectFrom('aenural_orders').select('id').where('owner_id','=',member.id).where('status','=','paid').where('test_mode','=',config.testMode?1:0).executeTakeFirst();
    if(owned)throw new MembershipError('Your package is already active. Open your account to use it.',409,'ALREADY_OWNED');
    const recent=await db.selectFrom('aenural_checkouts').select('id').where('owner_id','=',member.id).where('created_at','>',new Date(now().getTime()-15*60000).toISOString()).execute();
    if(recent.length>=3)throw new MembershipError('Please wait before opening another checkout.',429);
    const variant=await api('variants/'+config.variantId);
    if(variant.attributes.price!==2000||variant.attributes.is_subscription||variant.attributes.is_pay_what_you_want)throw new MembershipError('This package is not configured for its $20 one-time price yet.',503);
    const id=randomUUID();await db.insertInto('aenural_checkouts').values({id,owner_id:member.id,created_at:now().toISOString()}).execute();
    const data=await api('checkouts',{data:{type:'checkouts',attributes:{custom_price:2000,test_mode:config.testMode,checkout_options:{embed:false,discount:false},checkout_data:{email:member.email,custom:{aenural_checkout:id},variant_quantities:[{variant_id:Number(config.variantId),quantity:1}]},product_options:{enabled_variants:[Number(config.variantId)],redirect_url:config.origin+'/account/subscription?purchase=processing',receipt_link_url:config.origin+'/account/billing',receipt_button_text:'Open your AENural account'},expires_at:new Date(now().getTime()+60*60000).toISOString()},relationships:{store:{data:{type:'stores',id:config.storeId}},variant:{data:{type:'variants',id:config.variantId}}}}});
    const url=safeProviderURL(data.attributes.url);
    await db.updateTable('aenural_checkouts').set({provider_id:data.id}).where('id','=',id).execute();return {url,testMode:config.testMode};
  }
  async function webhook(raw,signature){
    if(!verifyPaymentSignature(raw,signature,config.secret))throw new MembershipError('Invalid signature.',401);
    let event;try{event=JSON.parse(raw);}catch{throw new MembershipError('Invalid event.');}
    const name=event.meta?.event_name;if(!['order_created','order_refunded'].includes(name))return {ignored:true};
    const orderId=event.data?.id,checkoutId=event.meta?.custom_data?.aenural_checkout;
    if(typeof orderId!=='string'||!/^\d+$/.test(orderId)||typeof checkoutId!=='string')throw new MembershipError('Unrecognized order.');
    const receipt=createHash('sha256').update(raw).digest('hex');
    if(await db.selectFrom('aenural_webhooks').select('id').where('id','=',receipt).executeTakeFirst())return {duplicate:true};
    const binding=await db.selectFrom('aenural_checkouts').selectAll().where('id','=',checkoutId).executeTakeFirst();
    if(!binding?.provider_id)throw new MembershipError('This checkout is not linked to an AENural account.',400);
    // Read the provider's current order; a stale paid event cannot reinstate a
    // refunded/fraudulent order. Neither email nor a redirect grants access.
    const canonical=await api('orders/'+orderId),attributes=canonical.attributes,item=attributes.first_order_item;
    if(String(attributes.store_id)!==config.storeId||String(item?.variant_id)!==config.variantId||attributes.currency!=='USD'||Boolean(attributes.test_mode)!==config.testMode||item?.price!==2000||attributes.discount_total!==0)throw new MembershipError('Order does not match the configured package.',400);
    const paid=['paid','partial_refund'].includes(attributes.status)&&!attributes.refunded;
    if(!paid&&!['refunded','fraudulent'].includes(attributes.status))return {pending:true};
    const updated=new Date(attributes.updated_at);if(!Number.isFinite(updated.getTime()))throw new MembershipError('Invalid order timestamp.');
    const id='lemon-'+(config.testMode?'test-':'live-')+orderId;
    return db.transaction().execute(async tx=>{
      // Serialize events against their checkout row before checking idempotency.
      await tx.updateTable('aenural_checkouts').set({provider_id:binding.provider_id}).where('id','=',checkoutId).execute();
      if(await tx.selectFrom('aenural_webhooks').select('id').where('id','=',receipt).executeTakeFirst())return {duplicate:true};
      const existing=await tx.selectFrom('aenural_orders').selectAll().where('id','=',id).executeTakeFirst();
      if(existing&&existing.owner_id!==binding.owner_id)throw new MembershipError('Order ownership mismatch.',400);
      const data={status:paid?'paid':'revoked',amount_minor:Number(attributes.total),provider_updated_at:updated.toISOString()};
      if(existing){if(existing.provider_updated_at<=data.provider_updated_at)await tx.updateTable('aenural_orders').set(data).where('id','=',id).execute();}
      else await tx.insertInto('aenural_orders').values({id,owner_id:binding.owner_id,provider:'lemonsqueezy',provider_order_id:orderId,test_mode:config.testMode?1:0,currency:'USD',created_at:new Date(attributes.created_at).toISOString(),...data}).execute();
      await tx.insertInto('aenural_webhooks').values({id:receipt,processed_at:now().toISOString()}).execute();return {ok:true,premium:paid};
    });
  }
  async function receipt(ownerId,id){
    const row=await db.selectFrom('aenural_orders').selectAll().where('id','=',id).where('owner_id','=',ownerId).where('provider','=','lemonsqueezy').where('status','=','paid').where('test_mode','=',config.testMode?1:0).executeTakeFirst();
    if(!row||!/^\d+$/.test(row.provider_order_id))throw new MembershipError('Purchase not found.',404);
    const order=await api('orders/'+row.provider_order_id);return safeProviderURL(order.attributes.urls.receipt);
  }
  return {checkout,webhook,receipt};
}
