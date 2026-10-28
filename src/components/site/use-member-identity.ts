"use client";
import { useEffect,useState } from "react";
export function useMemberIdentity(enabled:boolean){
  const [identity,setIdentity]=useState({signedIn:false,unavailable:false});
  useEffect(()=>{if(!enabled)return;const abort=new AbortController();let running=false;
    async function refresh(){if(running)return;running=true;try{const response=await fetch('/api/membership/access',{cache:'no-store',credentials:'same-origin',signal:abort.signal});if(!response.ok)throw new Error('Unavailable');const result=await response.json();if(!abort.signal.aborted)setIdentity({signedIn:!!result.user,unavailable:false});}catch{if(!abort.signal.aborted)setIdentity(previous=>({...previous,unavailable:true}));}finally{running=false;}}
    void refresh();window.addEventListener('focus',refresh);return()=>{abort.abort();window.removeEventListener('focus',refresh);};
  },[enabled]);return identity;
}
