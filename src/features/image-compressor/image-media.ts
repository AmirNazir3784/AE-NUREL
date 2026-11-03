import { IMAGE_LIMITS, imageHeader, imageSize, fitImage } from "./image-core";
export type ImageSettings={targetKB:number;format:"jpeg"|"webp";resize:boolean;maxEdge:number;matte:"#ffffff"|"#000000"};
export async function compressImage(file:File,settings:ImageSettings,signal:AbortSignal,progress:(text:string)=>void) {
  if(file.size<1||file.size>IMAGE_LIMITS.bytes)throw new Error("Choose an image between 1 byte and 50 MB.");
  if(!/\.(jpe?g|png|webp|bmp)$/i.test(file.name))throw new Error("Choose a JPG, PNG, static WebP or BMP image.");
  if(!["jpeg","webp"].includes(settings.format)||!["#ffffff","#000000"].includes(settings.matte)||typeof settings.resize!=="boolean")throw new Error("Choose valid output settings.");
  imageHeader(await file.arrayBuffer());signal.throwIfAborted();
  const bitmap=await createImageBitmap(file);
  try {
    signal.throwIfAborted();
    const size=imageSize(bitmap.width,bitmap.height,settings.maxEdge);
    if(!settings.resize&&(size.width!==bitmap.width||size.height!==bitmap.height))throw new Error("Increase Maximum edge to keep the original dimensions, or allow smaller dimensions.");
    const canvas=document.createElement("canvas"),context=canvas.getContext("2d");if(!context)throw new Error("Image encoding is unavailable.");
    const type=`image/${settings.format}`;
    const output=await fitImage(async(width,height,quality)=>{
      signal.throwIfAborted();canvas.width=width;canvas.height=height;
      if(settings.format==="jpeg"){context.fillStyle=settings.matte;context.fillRect(0,0,width,height);}
      context.drawImage(bitmap,0,0,width,height);
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Image encoding failed. Try the other format.")),type,quality));
      if(blob.type!==type)throw new Error("The selected output format is unsupported. Try JPEG.");
      return blob;
    },size.width,size.height,Math.floor(settings.targetKB*1000),settings.resize,signal,progress);
    signal.throwIfAborted();
    const check=await createImageBitmap(output.blob);
    try{if(check.width!==output.width||check.height!==output.height||output.blob.size>Math.floor(settings.targetKB*1000))throw new Error("Output validation failed. No successful download was created.");}finally{check.close();}
    return {...output,sourceWidth:bitmap.width,sourceHeight:bitmap.height};
  } finally {bitmap.close();}
}
