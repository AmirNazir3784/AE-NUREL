"use client";

/* eslint-disable @next/next/no-img-element -- User-selected blob URLs require native image previews. */
import {useEffect,useRef,useState} from "react";
import {imageFilename,imageHeader,IMAGE_LIMITS} from "./image-core";
import type {ImageSettings} from "./image-media";
import styles from "./image-compressor.module.css";

const defaults:ImageSettings={targetKB:20,format:"jpeg",resize:true,maxEdge:4096,matte:"#ffffff"};
type Source={file:File;url:string;width:number;height:number};
type Result={blob:Blob;url:string;width:number;height:number;name:string};
export function ImageCompressor(){
  const [source,setSource]=useState<Source|null>(null),[result,setResult]=useState<Result|null>(null),[settings,setSettings]=useState(defaults);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[status,setStatus]=useState("");
  const input=useRef<HTMLInputElement>(null),abort=useRef<AbortController|null>(null),sequence=useRef(0);
  useEffect(()=>()=>{sequence.current++;abort.current?.abort();},[]);
  useEffect(()=>()=>{if(source)URL.revokeObjectURL(source.url);},[source]);
  useEffect(()=>()=>{if(result)URL.revokeObjectURL(result.url);},[result]);
  function change(patch:Partial<ImageSettings>){setSettings(s=>({...s,...patch}));setResult(null);setError("");setStatus("");}
  async function choose(file?:File){
    if(!file||busy)return;const operation=++sequence.current;setBusy(true);setError("");
    try{if(file.size<1||file.size>IMAGE_LIMITS.bytes||!/\.(jpe?g|png|webp|bmp)$/i.test(file.name))throw new Error("Choose a JPG, PNG, static WebP or BMP up to 50 MB.");const size=imageHeader(await file.arrayBuffer());if(operation!==sequence.current)return;setSource({file,url:URL.createObjectURL(file),...size});setResult(null);setStatus("Image ready. Choose the size and format you need.");}
    catch(e){if(operation===sequence.current)setError((e as Error).message);}finally{if(operation===sequence.current)setBusy(false);}
  }
  async function compress(){
    if(!source||busy)return;const operation=++sequence.current,controller=new AbortController();abort.current=controller;setBusy(true);setResult(null);setError("");setStatus("Preparing image, please wait…");
    try{const {compressImage}=await import("./image-media");const output=await compressImage(source.file,settings,controller.signal,text=>{if(operation===sequence.current)setStatus(text);});if(operation!==sequence.current)return;setResult({...output,url:URL.createObjectURL(output.blob),name:imageFilename(source.file.name,settings.format)});setStatus("Compression complete. Review the image before downloading.");}
    catch(e){if(operation===sequence.current){setStatus("");setError((e as Error).message);}}finally{if(operation===sequence.current){abort.current=null;setBusy(false);}}
  }
  function cancel(){sequence.current++;abort.current?.abort();abort.current=null;setBusy(false);setStatus("Canceled. Your original image is unchanged.");setError("");}
  return <section className={styles.workspace} aria-label="Image compressor workspace" aria-busy={busy}>
    <div className={styles.stage}><div className={styles.top}><h2>Your image</h2><button type="button" disabled={busy} onClick={()=>input.current?.click()}>{source?"Change image":"Choose image"}</button><input ref={input} type="file" accept=".jpg,.jpeg,.png,.webp,.bmp" hidden onChange={e=>{void choose(e.target.files?.[0]);e.target.value="";}} /></div>
      {!source?<div className={styles.empty} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(e.dataTransfer.files.length!==1){setError("Choose one image at a time.");return;}void choose(e.dataTransfer.files[0]);}}><span aria-hidden="true">20<span>KB</span></span><h3>Small file. Clear purpose.</h3><p>Drop a still image here or choose a file.<br />JPG, PNG, WebP or BMP · Up to 50 MB and 40 megapixels.</p><button type="button" disabled={busy} onClick={()=>input.current?.click()}>Select image</button></div>:<>
        <p className={styles.file}>{source.file.name}<span>{source.file.size.toLocaleString("en-US")} bytes</span></p>
        <div className={styles.comparison}><figure><figcaption>Original · {source.width} × {source.height}</figcaption><img src={source.url} alt="Original selected image" /></figure>{result&&<figure><figcaption>Compressed · {result.width} × {result.height}</figcaption><img src={result.url} alt="Compressed image for review" /></figure>}</div>
        {!result&&source.file.size<=settings.targetKB*1000&&<p className={styles.notice}>Your original already fits this budget. <a href={source.url} download={source.file.name}>Download original</a> to preserve its format, dimensions and quality.</p>}
      </>}
      {status&&<p role="status" className={styles.notice}>{status}</p>}{busy&&<button type="button" onClick={cancel}>Cancel processing</button>}{error&&<p role="alert" className={styles.error}>{error}</p>}
      {result&&<div className={styles.result}><h3>Size limit passed.</h3><strong>{result.blob.size.toLocaleString("en-US")} / {Math.floor(settings.targetKB*1000).toLocaleString("en-US")} bytes</strong><p>{result.width} × {result.height} · {settings.format==="jpeg"?"JPEG":"WebP"} · {source&&result.blob.size<source.file.size?`${Math.round((1-result.blob.size/source.file.size)*100)}% smaller`:"Not smaller than the original"}</p>{source&&(result.width!==source.width||result.height!==source.height)&&<p>Dimensions changed. Check your form’s required width and height before submitting.</p>}<a className={styles.download} href={result.url} download={result.name}>Download {settings.format==="jpeg"?"JPEG":"WebP"}</a><p>Inspect small text, faces and signatures. A size check does not guarantee acceptance by a form.</p></div>}
    </div>
    <aside className={styles.settings}><span className={styles.eyebrow}>YOUR FILE BUDGET</span><h2>Fit the form.</h2><fieldset disabled={busy}><legend>Image output settings</legend><label>Target size (KB)<input type="number" min={1} max={1000} step={1} value={settings.targetKB||""} onChange={e=>change({targetKB:e.target.valueAsNumber||0})}/></label><div className={styles.presets}>{[20,50,100,200].map(kb=><button type="button" key={kb} aria-pressed={kb===settings.targetKB} onClick={()=>change({targetKB:kb})}>{kb} KB</button>)}</div><p>1 KB = 1,000 bytes. Output is checked against your budget; no padding is added.</p>
      <label>Output format<select value={settings.format} onChange={e=>change({format:e.target.value as ImageSettings["format"]})}><option value="jpeg">JPEG · common form uploads</option><option value="webp">WebP · supports transparency</option></select></label>
      {settings.format==="jpeg"?<label>Transparent areas become<select value={settings.matte} onChange={e=>change({matte:e.target.value as ImageSettings["matte"]})}><option value="#ffffff">White</option><option value="#000000">Black</option></select></label>:<p>Transparency is retained where present. Confirm your destination accepts WebP.</p>}
      <label className={styles.toggle}><input type="checkbox" checked={settings.resize} onChange={e=>change({resize:e.target.checked})}/>Allow smaller dimensions to fit</label><label>Maximum edge (pixels)<input type="number" min={32} max={16384} value={settings.maxEdge||""} onChange={e=>change({maxEdge:e.target.valueAsNumber||0})}/></label><p>Aspect ratio stays intact. No upscaling. Disable resizing to keep original dimensions; the tool may then be unable to meet a small budget.</p>
      <button className={styles.download} type="button" disabled={!source||settings.targetKB<1||settings.targetKB>1000||!Number.isInteger(settings.targetKB)} onClick={()=>void compress()}>Compress to {settings.targetKB||"…"} KB</button></fieldset><small>Still images only. Animated PNG/WebP and GIF are rejected. Exported copies do not retain original EXIF or other source metadata.</small>
    </aside>
  </section>;
}
