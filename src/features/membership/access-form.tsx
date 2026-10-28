"use client";
import { useState, type FormEvent } from "react";
import Link from "@/components/site/page-link";
import { Icon } from "@/components/ui/icon";
import { validateAuthPreview, type AuthView, type AuthErrors } from "@/components/site/auth-preview-validation";
import type { PaidProduct } from "./plans";
import { authRequest } from "./member-client";

export function AccessForm({ view, product, connected = false }: { view: AuthView; product?: PaidProduct; connected?: boolean }) {
  const [fields, setFields] = useState({ name: "", email: "", password: "", confirmation: "" }), [errors, setErrors] = useState<AuthErrors>({}), [notice, setNotice] = useState(""), [visible, setVisible] = useState(false);
  const suffix = product ? `?product=${product}` : "";
  const [pending,setPending]=useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const checked = validateAuthPreview(view, fields); setErrors(checked); setNotice("");
    const first = Object.keys(checked)[0]; if (first) { event.currentTarget.querySelector<HTMLInputElement>(`[data-field="${first}"]`)?.focus(); return; }
    if(connected){
      if(pending)return;setPending(true);
      try{
        if(view==='recovery'){await authRequest('request-password-reset',{email:fields.email.trim(),redirectTo:location.origin+'/reset-password'});setNotice('If an account matches that email, you will receive a password-reset link.');}
        else if(view==='signup'){await authRequest('sign-up/email',{name:fields.name.trim(),email:fields.email.trim(),password:fields.password,callbackURL:location.origin+'/sign-in'+suffix});setFields({name:'',email:'',password:'',confirmation:''});location.assign(new URL('/verify-email'+suffix,location.origin).href);}
        else{await authRequest('sign-in/email',{email:fields.email.trim(),password:fields.password});setFields({name:'',email:'',password:'',confirmation:''});location.assign(new URL(product?'/checkout?product='+product:'/account',location.origin).href);}
      }catch(failure){setNotice(failure instanceof Error?failure.message:'Please try again.');}
      finally{setPending(false);}return;
    }
    setFields({ name: "", email: "", password: "", confirmation: "" }); setNotice("Account sign-in is currently unavailable. Nothing was sent or saved. You can continue using the caption tools without an account.");
  }
  // Preview fields have no names, so a pre-hydration native submission cannot
  // serialize sample credentials into a URL or request body.
  function field(key: keyof typeof fields, label: string, type: string) { return <label>{label}<input data-field={key} value={fields[key]} type={type} disabled={pending} autoComplete={connected ? key==='email'?'email':key==='name'?'name':view==='login'?'current-password':'new-password' : key === "password" || key === "confirmation" ? "new-password" : "off"} maxLength={key === "email" ? 254 : key === "name" ? 80 : 128} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `access-${key}-error` : undefined} onChange={event => { setFields(previous => ({ ...previous, [key]: event.target.value })); setErrors(previous => ({ ...previous, [key]: undefined })); setNotice(""); }} />{errors[key] && <span id={`access-${key}-error`} className="cm-field-error">{errors[key]}</span>}</label>; }
  return <><form className="cm-access-form" method="post" autoComplete="off" noValidate onSubmit={submit}>
    {view === "signup" && field("name", "Your name", "text")}{field("email", "Email address", "email")}
    {view !== "recovery" && <><div className="cm-password-label">{field("password", "Password", visible ? "text" : "password")}<button type="button" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(previous => !previous)}>{visible ? "Hide" : "Show"}</button></div>{view === "signup" && field("confirmation", "Confirm password", visible ? "text" : "password")}</>}
    {view === "login" && <Link className="cm-forgot" href="/forgot-password">Forgot password?</Link>}
    <button type="submit" className="aen-btn aen-btn-primary" disabled={pending}>{pending?'Please wait…':view === "signup" ? "Create account" : view === "recovery" ? "Send recovery link" : "Sign in"}<Icon name="arrow" size={16} /></button>
    {notice && <p className="cm-form-notice" role="status">{notice}</p>}{Object.values(errors).some(Boolean) && <p className="sr-only" role="alert">Please check the highlighted fields.</p>}
  </form><p className="cm-access-switch">{view === "signup" ? <>Already have an account? <Link href={`/sign-in${suffix}`}>Sign in</Link></> : view === "recovery" ? <Link href={`/sign-in${suffix}`}>Back to sign in</Link> : <>New to AENural? <Link href={`/sign-up${suffix}`}>Create an account</Link></>}</p><Link className="cm-text-link" href="/account">Your account workspace <Icon name="arrow" size={15} /></Link></>;
}
