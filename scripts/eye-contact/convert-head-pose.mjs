// Intel Open Model Zoo head-pose-estimation-adas-0001, Apache-2.0.
// Convert the official FP32 IR's standard inference operators to ONNX.
import { readFileSync, writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import schema from '../../node_modules/onnxruntime-web/lib/onnxjs/ort-schema/protobuf/onnx.js';
const xml = new JSDOM(readFileSync('artifacts/eye-contact/head-pose.xml','utf8'),{contentType:'text/xml'}).window.document;
const binary=readFileSync('artifacts/eye-contact/head-pose.bin');
const layers=[...xml.querySelectorAll('net > layers > layer')], edges=[...xml.querySelectorAll('net > edges > edge')];
const nodes=[],initializer=[],input=[],output=[],names=new Map();
const dimensions=port=>[...port.querySelectorAll(':scope > dim')].map(n=>Number(n.textContent));
const info=(name,dims)=>({name,type:{tensorType:{elemType:1,shape:{dim:dims.map(dimValue=>({dimValue}))}}}});
const numbers=value=>value.split(',').map(Number);
const attribute=(name,value)=>typeof value==='string'?{name,type:3,s:Buffer.from(value)}:Array.isArray(value)?{name,type:7,ints:value}:{name,type:2,i:value};
for(const layer of layers){
 const id=layer.id,type=layer.getAttribute('type'),name=layer.getAttribute('name'),data=layer.querySelector(':scope > data');
 const ports=[...layer.querySelectorAll(':scope > output > port')];
 const outputs=ports.map(port=>{const key=`${id}:${port.id}`,value=type==='Parameter'?name:key;names.set(key,value);return value});
 const incoming=edges.filter(edge=>edge.getAttribute('to-layer')===id).sort((a,b)=>Number(a.getAttribute('to-port'))-Number(b.getAttribute('to-port')));
 const inputs=incoming.map(edge=>{const value=names.get(`${edge.getAttribute('from-layer')}:${edge.getAttribute('from-port')}`);if(!value)throw Error('Unsorted graph edge');return value});
 if(type==='Parameter'){input.push(info(name,dimensions(ports[0])));continue}
 if(type==='Const'){
  const dims=data.getAttribute('shape')?numbers(data.getAttribute('shape')):[],dtype={f32:1,i64:7,i32:6}[data.getAttribute('element_type')],offset=Number(data.getAttribute('offset')),size=Number(data.getAttribute('size'));
  if(!dtype||offset<0||offset+size>binary.length)throw Error('Unsupported constant');
  initializer.push({name:outputs[0],dims,dataType:dtype,rawData:binary.subarray(offset,offset+size)});continue;
 }
 if(type==='Result'){nodes.push({opType:'Identity',input:inputs,output:[name]});output.push(info(name,dimensions(layer.querySelector(':scope > input > port'))));continue}
 let op={Subtract:'Sub',Multiply:'Mul',Add:'Add',Convolution:'Conv',ReLU:'Relu',MaxPool:'MaxPool',Reshape:'Reshape',MatMul:'MatMul'}[type];
 if(!op)throw Error('Unsupported operator '+type);
 const attrs={};
 if(type==='Convolution'||type==='MaxPool'){
  for(const [ir,onnx] of [['strides','strides'],['dilations','dilations']])if(data.hasAttribute(ir))attrs[onnx]=numbers(data.getAttribute(ir));
  attrs.pads=[...numbers(data.getAttribute('pads_begin')),...numbers(data.getAttribute('pads_end'))];
  if(type==='MaxPool'){attrs.kernel_shape=numbers(data.getAttribute('kernel'));attrs.ceil_mode=Number(data.getAttribute('rounding_type')==='ceil')}
 }
 if(type==='MatMul')for(const [index,flag] of [[0,'transpose_a'],[1,'transpose_b']])if(data.getAttribute(flag)==='true'){
  const inputPort=[...layer.querySelectorAll(':scope > input > port')][index],rank=dimensions(inputPort).length,perm=Array.from({length:rank},(_,i)=>i);[perm[rank-1],perm[rank-2]]=[perm[rank-2],perm[rank-1]];
  const transposed=`transpose_${id}_${index}`;nodes.push({opType:'Transpose',input:[inputs[index]],output:[transposed],attribute:[attribute('perm',perm)]});inputs[index]=transposed;
 }
 nodes.push({opType:op,input:inputs,output:outputs,attribute:Object.entries(attrs).map(([k,v])=>attribute(k,v))});
}
const model={irVersion:8,opsetImport:[{domain:'',version:13}],producerName:'AENural Intel IR converter',graph:{name:'Intel head pose',node:nodes,initializer,input,output}};
const error=schema.onnx.ModelProto.verify(model);if(error)throw Error(error);
const encoded=schema.onnx.ModelProto.encode(model).finish();
writeFileSync('public/models/eye-contact/head-pose.onnx',encoded);console.log('Head pose ONNX:',encoded.length,'bytes',output.map(o=>o.name));
