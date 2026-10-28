import type { CaptionAccess } from "./caption-policy";
export type MemberStatus = { access: CaptionAccess; user: {id:string;name:string;email:string}|null;local:boolean };
export class MemberRequestError extends Error { constructor(message:string,public status:number,public code?:string){super(message);} }
export async function memberRequest<T = unknown>(path:string,options:RequestInit={}) : Promise<T> {
  const response=await fetch('/api/membership/'+path,{...options,credentials:'same-origin',cache:'no-store',headers:{...options.body?{'Content-Type':'application/json'}:{},...options.headers}});
  const result=await response.json().catch(()=>({message:'Account services are unavailable. Try again.'}));
  if(!response.ok)throw new MemberRequestError(result.message||'This request could not be completed.',response.status,result.code);
  return result as T;
}
export async function authRequest(path:string,body:Record<string,unknown>) {
  const response=await fetch('/api/auth/'+path,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await response.json().catch(()=>({message:'Account services are unavailable. Try again.'}));
  if(!response.ok)throw new MemberRequestError(response.status===429?'Too many attempts. Please wait a minute and try again.':result.code==='EMAIL_NOT_VERIFIED'?'Verify your email before signing in.':path==='sign-in/email'?'Email or password is incorrect.':result.message||'This request could not be completed.',response.status,result.code);
  return result;
}
