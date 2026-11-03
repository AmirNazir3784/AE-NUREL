export const IMAGE_LIMITS = { bytes: 50_000_000, pixels: 40_000_000, edge: 16_384 } as const;
export function validateImageDimensions(width: number, height: number) {
  if (![width,height].every(Number.isSafeInteger) || width < 1 || height < 1 || width * height > IMAGE_LIMITS.pixels || Math.max(width,height) > IMAGE_LIMITS.edge) throw new Error("Choose an image up to 40 megapixels and 16,384 pixels per side.");
}
export function imageHeader(buffer: ArrayBuffer) {
  const b=new Uint8Array(buffer), v=new DataView(buffer), text=(n:number,len:number)=>String.fromCharCode(...b.slice(n,n+len));
  let width=0,height=0;
  if(b.length>=24 && b[0]===137 && text(1,3)==="PNG") {
    width=v.getUint32(16);height=v.getUint32(20);
    for(let n=8;n+12<=b.length;){const size=v.getUint32(n);if(text(n+4,4)==="acTL")throw new Error("Choose a still image. Animated PNG is not supported.");if(size>b.length-n-12)throw new Error("This PNG is incomplete.");n+=size+12;}
  } else if(b.length>=4&&b[0]===255&&b[1]===216) {
    let n=2;
    while(n+4<=b.length){if(b[n++]!==255)break;while(b[n]===255)n++;const marker=b[n++];if(marker===217||marker===218)break;if(marker===1||marker>=208&&marker<=215)continue;const len=v.getUint16(n);if(len<2||n+len>b.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&len>=7){height=v.getUint16(n+3);width=v.getUint16(n+5);break;}n+=len;}
  } else if(b.length>=30&&text(0,4)==="RIFF"&&text(8,4)==="WEBP") {
    for(let n=12;n+8<=b.length;){const type=text(n,4),size=v.getUint32(n+4,true),p=n+8;if(size>b.length-p)throw new Error("This WebP is incomplete.");if(type==="ANIM"||type==="ANMF")throw new Error("Choose a still image. Animated WebP is not supported.");if(type==="VP8X"&&size>=10){if(b[p]&2)throw new Error("Choose a still image. Animated WebP is not supported.");width=1+b[p+4]+(b[p+5]<<8)+(b[p+6]<<16);height=1+b[p+7]+(b[p+8]<<8)+(b[p+9]<<16);}if(type==="VP8 "&&size>=10&&!width){width=v.getUint16(p+6,true)&16383;height=v.getUint16(p+8,true)&16383;}if(type==="VP8L"&&size>=5&&!width){const bits=v.getUint32(p+1,true);width=1+(bits&16383);height=1+((bits>>>14)&16383);}n=p+size+(size%2);}
  } else if(b.length>=26&&text(0,2)==="BM") {const dib=v.getUint32(14,true);if(dib>=40){width=v.getInt32(18,true);height=Math.abs(v.getInt32(22,true));}else if(dib===12){width=v.getUint16(18,true);height=v.getUint16(20,true);}}
  else throw new Error("Choose a valid JPG, PNG, static WebP or BMP image. Renaming an extension does not convert the file.");
  validateImageDimensions(width,height);return {width,height};
}
export function imageSize(width:number,height:number,maxEdge:number) {
  if(!Number.isInteger(maxEdge)||maxEdge<32||maxEdge>16_384)throw new Error("Maximum edge must be between 32 and 16,384 pixels.");
  const scale=Math.min(1,maxEdge/Math.max(width,height));return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
export function imageFilename(name:string,format:"jpeg"|"webp") {return `${name.replace(/\.[^.]+$/," ").trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g,"_").slice(0,120)||"image"}-compressed.${format==="jpeg"?"jpg":"webp"}`;}
export async function fitImage(encode:(width:number,height:number,quality:number)=>Promise<Blob>, width:number,height:number,target:number,resize:boolean,signal:AbortSignal,progress:(text:string)=>void) {
  validateImageDimensions(width,height);
  if(!Number.isInteger(target)||target<1000||target>1_000_000)throw new Error("Choose a size budget between 1 and 1,000 KB.");
  const originalWidth=width,originalHeight=height;
  let scale=1;
  for(let pass=0;pass<24;pass++) {
    signal.throwIfAborted();progress(`Compressing, please wait… Checking ${width} × ${height}`);
    const high=await encode(width,height,.95);signal.throwIfAborted();
    if(high.size<=target)return {blob:high,width,height};
    const minimumQuality=resize?.45:.08;
    let best=await encode(width,height,minimumQuality);signal.throwIfAborted();
    if(best.size<=target){let low=minimumQuality,upper=.95;for(let i=0;i<7;i++){signal.throwIfAborted();const q=(low+upper)/2,candidate=await encode(width,height,q);signal.throwIfAborted();if(candidate.size<=target){best=candidate;low=q;}else upper=q;}return {blob:best,width,height};}
    if(!resize||Math.max(width,height)<=32)throw new Error("This image cannot fit the budget at these dimensions. Allow smaller dimensions, increase the budget, or crop the original first.");
    scale*=.8;width=Math.max(1,Math.round(originalWidth*scale));height=Math.max(1,Math.round(originalHeight*scale));
  }
  throw new Error("The image could not fit this budget. Try a smaller source or a larger target.");
}
