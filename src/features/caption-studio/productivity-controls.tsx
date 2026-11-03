"use client";
import {useMemo,useState} from "react";
import {replaceEditorText,type EditorDocument} from "@/lib/subtitle-editor";
import {currentStudioAlignment,type StudioAlignment} from "./studio-alignment";
import {captionReview,regroupStudioCaptions} from "./studio-productivity";
import styles from "./studio-productivity.module.css";

export function ProductivityControls({document,alignment,busy,onApply,onSelect,makeId}:{document:EditorDocument;alignment:StudioAlignment;busy:boolean;onApply:(document:EditorDocument,alignment?:StudioAlignment)=>void;onSelect:(id:string)=>void;makeId:()=>string}){
  const [find,setFind]=useState(""),[replacement,setReplacement]=useState(""),[message,setMessage]=useState(""),[words,setWords]=useState(4);
  const review=useMemo(()=>captionReview(document),[document]);
  const replacementPreview=useMemo(()=>{if(!find)return null;const result=replaceEditorText(document,find,replacement,true);return result.document.cues.some(c=>c.text.length>2000)?{...result,error:"Replacement would exceed 2,000 characters in a caption."}:{...result,error:""};},[document,find,replacement]);
  const canRegroup=currentStudioAlignment(document,alignment).length===document.cues.length;
  return <div className={styles.tools}>
    <details><summary>Find &amp; replace</summary><fieldset disabled={busy}><legend>Batch text correction</legend><label>Find exact text<input value={find} maxLength={2000} onChange={e=>{setFind(e.target.value);setMessage("");}}/></label><label>Replace with<input value={replacement} maxLength={2000} onChange={e=>{setReplacement(e.target.value);setMessage("");}}/></label><p>{replacementPreview?.count??0} matches · case-sensitive · literal text</p>{replacementPreview?.error&&<p role="alert">{replacementPreview.error}</p>}<button type="button" disabled={!replacementPreview?.count||!!replacementPreview.error} onClick={()=>{if(replacementPreview){onApply(replacementPreview.document);setMessage(`Replaced ${replacementPreview.count} matches. Undo restores the previous captions.`);}}}>Replace all matches</button><p>Timing stays unchanged. Text edits pause word highlighting for affected captions; Undo restores it.</p></fieldset></details>
    <details><summary>Caption review <span>{review.length}</span></summary><p>Suggestions, not universal delivery rules. No automatic wording or timing changes.</p>{review.length?<ul className={styles.review}>{review.map(item=><li key={item.id}><button type="button" disabled={busy} onClick={()=>onSelect(item.id)}>Caption {item.index+1}</button><ul>{item.messages.map(text=><li key={text}>{text}</li>)}</ul></li>)}</ul>:<p>No reading-speed, line-length or timing issues found by these checks.</p>}</details>
    <details><summary>Regroup timed words</summary><fieldset disabled={busy||!canRegroup}><legend>Caption length</legend><label>Maximum words per caption<select value={words} onChange={e=>setWords(Number(e.target.value))}>{[1,2,3,4,5,6,8,10,12].map(n=><option key={n} value={n}>{n} words</option>)}</select></label><button type="button" onClick={()=>{try{const next=regroupStudioCaptions(document,alignment,words,makeId);onApply(next.document,next.alignment);setMessage(`Regrouped into ${next.document.cues.length} captions using measured timing. Undo is available.`);}catch(e){setMessage((e as Error).message);}}}>Regroup captions</button></fieldset><p>{canRegroup?"Keeps measured word intervals and punctuation, with breaks at sentence endings and pauses. Does not transcribe again. Replaces cue-level placement settings; your caption style stays selected.":"Requires measured word timing for every caption. Imported subtitles and edited cues are kept unchanged; no timing is guessed."}</p></details>
    {message&&<p role="status">{message}</p>}
  </div>;
}
