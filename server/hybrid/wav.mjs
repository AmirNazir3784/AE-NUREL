// Bounded PCM validation shared by the upload gate and the isolated CPU worker.
export const MAX_UPLOAD_BYTES=8*1024**2, MAX_SECONDS=60;
export function inspectWav(bytes){
 const fail=()=>{throw Error('Choose an intact 16-bit PCM WAV, mono/stereo at 8–48 kHz, up to 60 seconds and 8 MiB.');};
 if(bytes.length<44||bytes.length>MAX_UPLOAD_BYTES||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE'||bytes.readUInt32LE(4)+8!==bytes.length)fail();
 let at=12,format,data;
 while(at+8<=bytes.length){
  const tag=bytes.toString('ascii',at,at+4),size=bytes.readUInt32LE(at+4),end=at+8+size;
  if(end>bytes.length||end<at)fail();
  if(tag==='fmt '){if(format||size<16)fail();format={encoding:bytes.readUInt16LE(at+8),channels:bytes.readUInt16LE(at+10),rate:bytes.readUInt32LE(at+12),byteRate:bytes.readUInt32LE(at+16),align:bytes.readUInt16LE(at+20),bits:bytes.readUInt16LE(at+22)};}
  if(tag==='data'){if(data||!format)fail();data={offset:at+8,bytes:size};}
  at=end+(size%2);
 }
 if(at!==bytes.length||!format||!data?.bytes||format.encoding!==1||format.bits!==16||![1,2].includes(format.channels)||format.rate<8000||format.rate>48000||format.align!==format.channels*2||format.byteRate!==format.rate*format.align||data.bytes%format.align)fail();
 const duration=data.bytes/format.byteRate;if(!Number.isFinite(duration)||duration<=0||duration>MAX_SECONDS)fail();
 return {...format,...data,duration};
}
