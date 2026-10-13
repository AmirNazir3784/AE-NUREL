// Check research provenance and missing-result honesty, without running either model.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='artifacts/translation-engine-feasibility';
const read=async filename=>JSON.parse(await fs.readFile(filename,'utf8'));
const cases=await read('scripts/translation-engine-feasibility/cases.json');
const rows=await read(root+'/side-by-side.json');
const evidence=await read(root+'/evidence.json');
const previous=await read('artifacts/local-subtitle-quality/integrity-repair.json');
const metadata=await read(root+'/model-metadata.json');
assert.equal(cases.length,24);
assert.equal(new Set(cases.map(test=>test.id)).size,24);
assert.equal(rows.length,48);
assert.equal(new Set(rows.map(row=>row.id+':'+row.target_language)).size,48);
assert.equal(rows.filter(row=>row.m2m100_output!==null).length,6);
assert.equal(rows.filter(row=>row.indictrans2_output!==null).length,0);
for(const row of rows){
 assert.equal(row.source_language,'en');
 assert.ok(['ur','hi'].includes(row.target_language));
 assert.equal(row.source_text,cases.find(test=>test.id===row.id).source);
 assert.match(row.indictrans2_status,/initialization failed/);
 assert.match(row.confidence_requires_native_review,/unknown/);
 if(row.m2m100_output!==null){
  const prior=previous.find(test=>test.id===row.m2m100_evidence&&test.target===row.target_language);
  assert.ok(prior,'Reused output must have exact source provenance');
  assert.ok(prior.units.some(unit=>unit.source===row.source_text&&unit.raw===row.m2m100_output));
 }
}
assert.equal(metadata.sha,'1eaa43a3fb76f382f1b22c76e56f6ab4926ad68b');
assert.equal(evidence.alternative_revision,metadata.sha);
assert.equal(evidence.m2m100.revision,'9c374f0b7aca709787cea97b047bfbbd1559d177');
assert.equal(evidence.completed_comparative_pairs,0);
assert.equal(evidence.onnx_weight_graph_bytes,281559812);
assert.equal(evidence.minimal_inference_asset_bytes,309337666);
assert.equal(evidence.native_attempt.status,'initialization_failed');
assert.equal(evidence.native_attempt.error_type,'ModuleNotFoundError');
assert.equal(evidence.native_attempt.error,"No module named 'IndicTransToolkit'");
assert.deepEqual(evidence.native_attempt.outputs,[]);
const helper=await fs.readFile(root+'/indictrans2/translate.py');
assert.equal(createHash('sha256').update(helper).digest('hex'),evidence.native_attempt.helper_sha256);
for(const file of evidence.successfully_downloaded_files){
 const data=await fs.readFile(root+'/indictrans2/'+file.name);
 assert.equal(data.length,file.bytes);
 assert.equal(createHash('sha256').update(data).digest('hex'),file.sha256);
}
const csv=await fs.readFile(root+'/side-by-side.csv','utf8');
assert.equal(csv.charCodeAt(0),0xFEFF);
assert.ok(csv.includes('"critical_meaning_error"'));
assert.ok(csv.includes('"confidence_requires_native_review"'));
console.log('Verified 24 cases / 48 planned pairs / 6 exact baseline outputs / 0 alternative outputs; pins, downloaded asset hashes and initialization failure preserved.');
