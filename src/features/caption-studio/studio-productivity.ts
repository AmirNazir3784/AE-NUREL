import { analyzeEditor, visibleCharacterCount, type EditorDocument } from "../../lib/subtitle-editor.ts";
import { currentStudioAlignment, type StudioAlignment, type StudioAlignedCue } from "./studio-alignment.ts";
import { textSeparator } from "../local-asr/text-boundaries.ts";

export function captionReview(document: EditorDocument) {
  return analyzeEditor(document.cues).flatMap((issue,index)=>{
    const cue=document.cues[index],messages=[...issue.errors,...issue.warnings.filter(w=>!w.includes('characters per second')&&!w.includes('readability guide'))];
    if(issue.cps!==null&&issue.cps>20)messages.push(`${issue.cps.toFixed(1)} characters/sec — consider more reading time.`);
    if(cue.text.split(/\r?\n/).some(line=>visibleCharacterCount(line)>42))messages.push("Long line — consider shorter wording or a line break.");
    if(cue.text.split(/\r?\n/).length>2)messages.push("More than two explicit lines — check the preview.");
    return messages.length?[{id:cue.id,index,messages,cps:issue.cps}]:[];
  });
}

/** Reflow only verified model words; never manufacture word timestamps. */
export function regroupStudioCaptions(document:EditorDocument,alignment:StudioAlignment,maxWords:number,id:()=>string) {
  if(!Number.isInteger(maxWords)||maxWords<1||maxWords>12)throw new Error("Choose between 1 and 12 words per caption.");
  const current=currentStudioAlignment(document,alignment),lookup=new Map(current.map(c=>[c.id,c]));
  if(!document.cues.length||document.cues.some(c=>!lookup.has(c.id)))throw new Error("Regrouping needs measured word timing for every caption. Edited or imported cue-only captions cannot be regrouped safely.");
  for(const cue of document.cues){const entry=lookup.get(cue.id)!;let last=0;if(!entry.words.length)throw new Error("A caption is missing measured words. Keep the current grouping.");for(const w of entry.words){if(![w.from,w.to,w.start,w.end].every(Number.isFinite)||!Number.isInteger(w.from)||!Number.isInteger(w.to)||w.from<last||w.to<=w.from||w.to>cue.text.length||cue.text.slice(last,w.from).trim()||w.start<entry.start||w.end>entry.end)throw new Error("The word alignment is incomplete. Keep the current grouping.");last=w.to;}if(cue.text.slice(last).trim())throw new Error("The word alignment is incomplete. Keep the current grouping.");}
  const words=document.cues.flatMap(c=>lookup.get(c.id)!.words.map(w=>({text:c.text.slice(w.from,w.to),start:w.start,end:w.end})));
  if(words.some((w,i)=>!w.text.trim()||!Number.isFinite(w.start)||!Number.isFinite(w.end)||w.end<=w.start||i>0&&w.start<words[i-1].end))throw new Error("These word intervals overlap or are invalid. Keep the current captions and review their timing.");
  const groups:typeof words[]=[];let group:typeof words=[];
  for(const word of words){const previous=group.at(-1);if(group.length&&(group.length>=maxWords||word.start-previous!.end>600||word.end-group[0].start>5000||/[.!?。！？]$/u.test(previous!.text))){groups.push(group);group=[];}group.push(word);}if(group.length)groups.push(group);
  if(groups.length>500)throw new Error("This grouping exceeds the 500-caption limit. Choose more words per caption.");
  const nextAlignment:StudioAlignedCue[]=[],cues=groups.map(group=>{
    let text="";const spans=group.map(word=>{const separator=text?textSeparator(text,word.text):"",from=text.length+separator.length;text+=separator+word.text;return{from,to:text.length,start:word.start,end:word.end};});
    const cue={...document.cues[0],id:id(),identifier:"",text,start:group[0].start,end:group.at(-1)!.end,startDraft:undefined,endDraft:undefined,srtSettings:"",vttSettings:""};
    nextAlignment.push({id:cue.id,text,start:cue.start,end:cue.end,words:spans});return cue;
  });
  return {document:{...document,cues},alignment:nextAlignment};
}

export function adjustTimelineCue(start:number,end:number,delta:number,mode:"move"|"start"|"end",duration:number){
  if(![start,end,delta,duration].every(Number.isFinite)||start<0||end<=start||end>duration)throw new Error("Review this caption's timing before dragging it.");
  const minimum=Math.min(100,end-start);
  if(mode==="move"){const offset=Math.max(-start,Math.min(delta,duration-end));return{start:Math.round(start+offset),end:Math.round(end+offset)};}
  return mode==="start"?{start:Math.round(Math.max(0,Math.min(end-minimum,start+delta))),end}:{start,end:Math.round(Math.min(duration,Math.max(start+minimum,end+delta)))};
}
