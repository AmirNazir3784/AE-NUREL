import {it} from 'node:test';import assert from 'node:assert/strict';
import {modelPreparation} from '../src/features/local-asr/model-preparation.ts';
it('aggregates concurrent weights, counts cached weights, and does not regress on retry',()=>{
 const p=modelPreparation({'encoder.onnx':100,'decoder.onnx':300});
 assert.deepEqual(p.progress({stage:'download',file:'encoder.onnx',loaded:50,total:100}).preparation,{loaded:50,total:400});
 assert.deepEqual(p.progress({stage:'download',file:'decoder.onnx',loaded:150,total:300}).preparation,{loaded:200,total:400});
 assert.deepEqual(p.progress({stage:'download',file:'encoder.onnx',loaded:0,total:100}).preparation,{loaded:200,total:400});
 p.update('encoder.onnx',100,100);assert.deepEqual(p.progress({stage:'loading'}).preparation,{loaded:250,total:400});
 assert.equal(p.progress({stage:'transcribing'}).preparation,undefined);
});
it('does not invent a denominator before the complete selected inventory is measurable',()=>{
 const p=modelPreparation({'a':undefined,'b':undefined});
 assert.equal(p.progress({stage:'download',file:'a',loaded:5,total:10}).preparation,undefined);
 assert.deepEqual(p.progress({stage:'download',file:'b',loaded:5,total:20}).preparation,{loaded:10,total:30});
 assert.deepEqual(p.progress({stage:'download',file:'supporting-file',loaded:100,total:100}).preparation,{loaded:10,total:30});
});
