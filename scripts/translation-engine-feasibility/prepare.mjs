// Isolated public-asset acquisition. Never sends evaluation text or credentials.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
const root=path.resolve('artifacts/translation-engine-feasibility');
const model='hari31416/indictrans2-en-indic-dist-200M-ONNX-int8';
await fs.mkdir(root,{recursive:true});
async function download(url,destination,size,sha){
 try{const existing=await fs.readFile(destination);if((!size||existing.length===size)&&(!sha||createHash('sha256').update(existing).digest('hex')===sha))return {cached:true,bytes:existing.length};}catch{}
 const response=await fetch(url,{signal:AbortSignal.timeout(600000)});
 if(!response.ok)throw Error(response.status+' '+url);
 await fs.mkdir(path.dirname(destination),{recursive:true});
 const partial=destination+'.partial',file=(await import('node:fs')).createWriteStream(partial);
 const start=performance.now();await pipeline(Readable.fromWeb(response.body),file);
 const data=await fs.readFile(partial);
 if(size&&data.length!==size)throw Error('Incorrect byte length: '+destination);
 const hash=createHash('sha256').update(data).digest('hex');
 if(sha&&sha!==hash)throw Error('Incorrect asset hash: '+destination);
 await fs.rename(partial,destination);return {cached:false,bytes:data.length,sha256:hash,ms:performance.now()-start};
}
if(process.argv[2]==='inspect'){
 const before=path.join(root,'worktree-before.json');
 try{await fs.access(before);}catch{
  const entries=[];
  async function walk(directory){for(const entry of await fs.readdir(directory,{withFileTypes:true})){const filename=path.join(directory,entry.name);if(entry.isDirectory())await walk(filename);else entries.push({filename,sha256:createHash('sha256').update(await fs.readFile(filename)).digest('hex')});}}
  for(const directory of ['src','public','tests','docs','scripts'])await walk(directory);
  await fs.writeFile(before,JSON.stringify(entries,null,2));
 }
 const response=await fetch('https://huggingface.co/api/models/'+model+'?blobs=true');
 if(!response.ok)throw Error('Metadata HTTP '+response.status);
 const metadata=await response.json();await fs.writeFile(path.join(root,'model-metadata.json'),JSON.stringify(metadata,null,2));
 console.log(JSON.stringify({model,revision:metadata.sha,files:metadata.siblings.map(f=>({name:f.rfilename,bytes:f.size}))},null,2));
 for(const file of metadata.siblings.filter(f=>f.size<2000000&&!f.rfilename.includes('/'))){
  await download(`https://huggingface.co/${model}/resolve/${metadata.sha}/${file.rfilename}`,path.join(root,'indictrans2',file.rfilename),file.size,file.lfs?.sha256);
 }
}else if(process.argv[2]==='weights'){
 const metadata=JSON.parse(await fs.readFile(path.join(root,'model-metadata.json'),'utf8'));
 const files=metadata.siblings.filter(f=>/\.onnx(?:\.data)?$/.test(f.rfilename));
 const total=files.reduce((sum,f)=>sum+f.size,0);if(total>650000000)throw Error('Research download cap exceeded: '+total);
 const report=[];
 for(const file of files){const result=await download(`https://huggingface.co/${model}/resolve/${metadata.sha}/${file.rfilename}`,path.join(root,'indictrans2',file.rfilename),file.size,file.lfs?.sha256);report.push({file:file.rfilename,...result});console.log(JSON.stringify(report.at(-1)));await fs.writeFile(path.join(root,'downloads.json'),JSON.stringify(report,null,2));}
}else if(process.argv[2]==='python'){
 console.log(await download('https://www.python.org/ftp/python/3.12.10/python-3.12.10-embed-amd64.zip',path.join(root,'python.zip')));
 console.log(await download('https://bootstrap.pypa.io/get-pip.py',path.join(root,'get-pip.py')));
}else if(process.argv[2]==='unchanged'){
 const entries=JSON.parse(await fs.readFile(path.join(root,'worktree-before.json'),'utf8'));
 const changed=[];for(const entry of entries)if(createHash('sha256').update(await fs.readFile(entry.filename)).digest('hex')!==entry.sha256)changed.push(entry.filename);
 console.log(JSON.stringify({existingFilesChecked:entries.length,changed},null,2));if(changed.length)process.exitCode=1;
}else throw Error('Use inspect, weights, python or unchanged.');
