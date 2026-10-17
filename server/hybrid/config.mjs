import path from 'node:path';
import {timingSafeEqual,createHash} from 'node:crypto';
export function configuration(environment=process.env){
 if(environment.NODE_ENV!=='development'||environment.AENURAL_HYBRID_ENABLED!=='1')return null;
 const token=environment.AENURAL_HYBRID_DEV_TOKEN,cache=environment.AENURAL_HYBRID_MODEL_CACHE;
 if(!token||token.length<32||token.length>256||!cache||!path.isAbsolute(cache))return null;
 let origin;try{const u=new URL(environment.AENURAL_HYBRID_ORIGIN);if(u.protocol!=='http:'||!['localhost','127.0.0.1'].includes(u.hostname)||u.username||u.password||u.pathname!=='/'||u.search||u.hash)return null;origin=u.origin;}catch{return null;}
 const rss=Number(environment.AENURAL_HYBRID_MAX_RSS_MB),timeout=Number(environment.AENURAL_HYBRID_TIMEOUT_MS??180000);
 if(!Number.isInteger(rss)||rss<1024||rss>4096||!Number.isInteger(timeout)||timeout<1000||timeout>300000)return null;
 const resolved=path.resolve(cache),relative=path.relative(path.resolve('public'),resolved);
 if(!relative.startsWith('..')&&!path.isAbsolute(relative))return null;
 return {token,origin,cache:resolved,rssMB:rss,timeoutMs:timeout};
}
export function authorize(request,config){
 if(!config)return {status:404,error:'Not found.'};
 const url=new URL(request.url);
 const origin=request.headers.get('origin');
 // Next normalizes the internal Request URL to localhost even when the
 // loopback listener is 127.0.0.1. Validate the actual Host, never forwarded
 // headers, together with the explicitly configured browser Origin.
 const host=request.headers.get('host')??url.host;
 if(host!==new URL(config.origin).host||url.protocol!==new URL(config.origin).protocol||origin&&origin!==config.origin||!origin&&!['GET','HEAD'].includes(request.method)||request.headers.get('sec-fetch-site')==='cross-site')return {status:403,error:'This development service accepts same-origin local requests only.'};
 const supplied=Buffer.from(request.headers.get('authorization')??''),expected=Buffer.from('Bearer '+config.token);
 if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return {status:401,error:'Development access is required.'};
 return {owner:createHash('sha256').update(config.token).digest('hex')};
}
