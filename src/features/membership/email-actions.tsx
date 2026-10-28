"use client";
import { useState, type FormEvent } from "react";
import { authRequest } from "./member-client";
export function EmailActions({reset=false}:{reset?:boolean}){
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[notice,setNotice]=useState(''),[pending,setPending]=useState(false),[done,setDone]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(pending)return;setNotice('');
    if(reset&&(password.length<12||password.length>128||password!==confirmation)){setNotice('Use 12–128 characters and make sure both passwords match.');return;}
    setPending(true);try{
      if(reset){const token=new URLSearchParams(location.search).get('token');if(!token||token.length>1024)throw new Error('This reset link is invalid. Request a new one.');await authRequest('reset-password',{newPassword:password,token});setPassword('');setConfirmation('');history.replaceState(null,'','/reset-password');setDone(true);setNotice('Your password has been reset. Sign in with your new password.');}
      else{await authRequest('send-verification-email',{email:email.trim(),callbackURL:location.origin+'/sign-in'});setNotice('If your account needs verification, a new link will be sent. Check your inbox.');}
    }catch(error){setNotice(error instanceof Error?error.message:'The link could not be processed. Request a new one.');}finally{setPending(false);}
  }
  return <form className="cm-access-form" onSubmit={submit}>{!done&&(reset?<><label>New password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} required disabled={pending}/></label><label>Confirm new password<input type="password" autoComplete="new-password" maxLength={128} value={confirmation} onChange={e=>setConfirmation(e.target.value)} required disabled={pending}/></label></>:<label>Email address<input type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} required disabled={pending}/></label>)}{!done&&<button className="aen-btn aen-btn-primary" disabled={pending}>{pending?'Please wait…':reset?'Reset password':'Resend verification link'}</button>}{notice&&<p role="status" className="cm-form-notice">{notice}</p>}{done&&<a href="/sign-in" className="cm-text-link">Sign in →</a>}{reset&&!done&&<a href="/forgot-password" className="cm-text-link">Request a new reset link</a>}</form>;
}
