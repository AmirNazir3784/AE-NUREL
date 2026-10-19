// Exact crop of the existing official N emblem; no redrawing or recoloring.
// The full header/footer artwork and user-supplied original remain untouched.
import sharp from 'sharp';
import {writeFile} from 'node:fs/promises';
const source='public/branding/aenural-official-logo-transparent.png';
const metadata=await sharp(source).metadata();
if(metadata.width!==1000||metadata.height!==1000)throw Error('Review official emblem crop before generating icons from a different source.');
const {data,info}=await sharp(source).extract({left:640,top:394,width:212,height:212}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
// Keep the connected N-emblem pixels, excluding disconnected pieces of the
// neighboring orange brackets. Preserve every retained source RGBA value.
const kept=new Uint8Array(info.width*info.height),pending=[106*info.width+106];
while(pending.length){const i=pending.pop();if(kept[i]||!data[i*4+3])continue;kept[i]=1;const x=i%info.width,y=Math.floor(i/info.width);if(x)pending.push(i-1);if(x+1<info.width)pending.push(i+1);if(y)pending.push(i-info.width);if(y+1<info.height)pending.push(i+info.width);}
for(let i=0;i<kept.length;i++)if(!kept[i])data.fill(0,i*4,i*4+4);
const emblem=await sharp(data,{raw:info}).png().toBuffer();
async function png(size){return sharp(emblem).resize(size-8,size-8).extend({top:4,bottom:4,left:4,right:4,background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();}
for(const size of [96,180,192])await writeFile(`public/branding/aenural-icon-${size}.png`,await png(size));
const sizes=[32,48,96],images=await Promise.all(sizes.map(png));
const directory=Buffer.alloc(6+16*images.length);directory.writeUInt16LE(1,2);directory.writeUInt16LE(images.length,4);
let offset=directory.length;
for(let i=0;i<images.length;i++){const position=6+i*16;directory[position]=sizes[i];directory[position+1]=sizes[i];directory.writeUInt16LE(1,position+4);directory.writeUInt16LE(32,position+6);directory.writeUInt32LE(images[i].length,position+8);directory.writeUInt32LE(offset,position+12);offset+=images[i].length;}
await writeFile('public/favicon.ico',Buffer.concat([directory,...images]));
console.log('Official emblem icons: ICO 32/48/96; PNG 96/180/192. Original logo unchanged.');
