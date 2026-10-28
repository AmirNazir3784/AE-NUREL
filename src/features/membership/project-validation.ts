import { parseStudioStyle, studioIssues, type StudioStyle } from "../caption-studio/studio-core";
import type { EditorDocument, EditorCue } from "@/lib/subtitle-editor";
import { currentStudioAlignment, type StudioAlignment } from "../caption-studio/studio-alignment";
import { FREE_CAPTION_PRESETS } from "./caption-policy";
import { STUDIO_PRESETS } from "../caption-studio/studio-core";

export function accessibleStyle(style: StudioStyle, premium: boolean): StudioStyle {
  if (premium) return style;
  const base=STUDIO_PRESETS.find(p=>p.preset===style.preset&&FREE_CAPTION_PRESETS.includes(p.preset as typeof FREE_CAPTION_PRESETS[number]))||STUDIO_PRESETS[0];
  return {...base,preset:base.preset,font:["Inter","Sora","Arial"].includes(style.font)?style.font:"Inter",size:style.size,color:style.color,highlight:style.highlight,position:style.position,x:style.x,y:style.y,align:style.align,background:style.background,animation:"none",wordHighlight:false,wordBackground:false};
}
export function validateProject(input: unknown,premium:boolean) {
  const fail=():never=>{throw new Error("This project data is invalid. Reopen your video and save again.");};
  if(!input||typeof input!=="object")return fail();
  const raw=input as Record<string,unknown>,source=raw.source as Record<string,unknown>,captions=raw.captions as EditorDocument;
  if(raw.schemaVersion!==1||typeof raw.title!=="string"||!raw.title.trim()||raw.title.length>100||!source||typeof source.filename!=="string"||source.filename.length>240)return fail();
  if(typeof source.durationSeconds!=="number"||!Number.isFinite(source.durationSeconds)||source.durationSeconds<=0||source.durationSeconds>120||typeof source.width!=="number"||typeof source.height!=="number"||!Number.isInteger(source.width)||!Number.isInteger(source.height)||source.width<1||source.height<1||source.width*source.height>1920*1080)return fail();
  if(!captions||!Array.isArray(captions.cues)||captions.cues.length>500||!['srt','vtt'].includes(captions.format))return fail();
  const ids=new Set<string>();
  const cues=captions.cues.map((cue):EditorCue=>{
    if(!cue||typeof cue.id!=="string"||cue.id.length>100||ids.has(cue.id)||typeof cue.text!=="string"||cue.text.length>2000||!Number.isSafeInteger(cue.start)||!Number.isSafeInteger(cue.end))return fail();
    ids.add(cue.id);return {id:cue.id,text:cue.text,start:cue.start,end:cue.end,srtSettings:typeof cue.srtSettings==='string'?cue.srtSettings.slice(0,256):'',vttSettings:typeof cue.vttSettings==='string'?cue.vttSettings.slice(0,256):'',identifier:typeof cue.identifier==='string'?cue.identifier.slice(0,256):''};
  });
  const document:EditorDocument={filename:typeof captions.filename==='string'?captions.filename.slice(0,240):'captions.srt',format:captions.format,cues,lineEnding:'\n',vttHeader:'WEBVTT',vttBlocks:[]};
  if(studioIssues(document,source.durationSeconds).length)return fail();
  const style=accessibleStyle(parseStudioStyle(JSON.stringify({version:1,style:raw.style})),premium);
  let alignment:StudioAlignment=[];
  if(Array.isArray(raw.alignment)&&raw.alignment.length<=500){
    const valid=raw.alignment.every(entry=>entry&&typeof entry.id==='string'&&typeof entry.text==='string'&&entry.text.length<=2000&&Number.isSafeInteger(entry.start)&&Number.isSafeInteger(entry.end)&&Array.isArray(entry.words)&&entry.words.length<=2000&&entry.words.every((word:Record<string,number>)=>['from','to','start','end'].every(key=>Number.isSafeInteger(word[key]))&&word.from>=0&&word.to>word.from&&word.to<=entry.text.length&&word.start>=entry.start&&word.end>word.start&&word.end<=entry.end));
    if(valid)alignment=currentStudioAlignment(document,raw.alignment);
  }
  const fingerprint=typeof source.fingerprint==='string'&&/^[a-f0-9]{64}$/.test(source.fingerprint)?source.fingerprint:undefined;
  return {schemaVersion:1 as const,title:raw.title.trim(),source:{filename:source.filename.replace(/[\\/\x00-\x1f]/g,'_'),durationSeconds:source.durationSeconds,width:source.width,height:source.height,...fingerprint?{fingerprint}:{}},captions:document,style,alignment};
}
export type CaptionProjectData = ReturnType<typeof validateProject>;
