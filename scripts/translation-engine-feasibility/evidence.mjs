// Consolidate observed local evidence. Never infer missing outputs or score translations.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root='artifacts/translation-engine-feasibility';
const cases=JSON.parse(await fs.readFile('scripts/translation-engine-feasibility/cases.json','utf8'));
const previous=JSON.parse(await fs.readFile('artifacts/local-subtitle-quality/integrity-repair.json','utf8'));
const baseline=previous.flatMap(test=>test.units.map(unit=>({...unit,target:test.target,caseId:test.id}))).filter(unit=>unit.target==='ur');
const metadata=JSON.parse(await fs.readFile(root+'/model-metadata.json','utf8'));
const smoke=JSON.parse(await fs.readFile(root+'/native-smoke.json','utf8'));
const rows=cases.flatMap(test=>['ur','hi'].map(target=>{
 const found=baseline.find(unit=>unit.source===test.source&&unit.target===target);
 return {id:test.id,category:test.category,source_text:test.source,source_language:'en',target_language:target,
  m2m100_output:found?.raw??null,indictrans2_output:null,
  m2m100_status:found?'reused exact-input pinned-model output':'not rerun: alternative failed initialization',
  indictrans2_status:'not run: initialization failed before model loading',
  critical_meaning_error:'not comparatively evaluated',omitted_information:'not comparatively evaluated',
  pronoun_gender_error:'not comparatively evaluated',negation_error:'not comparatively evaluated',technical_terminology_error:'not comparatively evaluated',
  naturalness_observation:'no alternative output; requires human review',reviewer_notes:test.review,
  confidence_requires_native_review:'comparative quality unknown; native review required',
  ...(found?{m2m100_previous_inference_ms:found.ms,m2m100_evidence:found.caseId}:{}),
 };
}));
await fs.writeFile(root+'/side-by-side.json',JSON.stringify(rows,null,2));
const headers=['id','category','source_text','source_language','target_language','m2m100_output','indictrans2_output','m2m100_status','indictrans2_status','critical_meaning_error','omitted_information','pronoun_gender_error','negation_error','technical_terminology_error','naturalness_observation','reviewer_notes','confidence_requires_native_review'];
const quote=value=>'"'+String(value??'').replaceAll('"','""')+'"';
await fs.writeFile(root+'/side-by-side.csv','\uFEFF'+[headers,...rows.map(row=>headers.map(header=>row[header]))].map(row=>row.map(quote).join(',')).join('\r\n')+'\r\n');
const sourceDictionary=JSON.parse(await fs.readFile(root+'/indictrans2/dict.SRC.json','utf8'));
const weights=metadata.siblings.filter(file=>/\.onnx(?:\.data)?$/.test(file.rfilename));
const requiredNames=[...weights.map(file=>file.rfilename),'tokenizer_src.json','tokenizer_tgt.json','tokenizer_meta.json','config.json','generation_config.json'];
const required=metadata.siblings.filter(file=>requiredNames.includes(file.rfilename));
const localFiles=[];
for(const entry of await fs.readdir(root+'/indictrans2',{withFileTypes:true})){
 const name=entry.name;if(!entry.isFile()||name.endsWith('.partial'))continue;
 const data=await fs.readFile(path.join(root,'indictrans2',name));
 localFiles.push({name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
}
const priorM2M=JSON.parse(await fs.readFile('artifacts/local-subtitle-quality/m2m-reproduced.json','utf8'));
const reusedTimes=rows.flatMap(row=>row.m2m100_previous_inference_ms===undefined?[]:[row.m2m100_previous_inference_ms]).sort((a,b)=>a-b);
const summary={date:'2026-10-12',decision:'REJECT',decision_scope:'Current documented native Windows path and integration recommendation; not a conclusion about unmeasured IndicTrans2 translation quality.',
 source_examples:cases.length,planned_pairs:rows.length,completed_comparative_pairs:0,reused_m2m100_outputs:rows.filter(row=>row.m2m100_output!==null).length,
 alternative_model:metadata.id,alternative_revision:metadata.sha,license_metadata:metadata.cardData?.license,
 supported_target_dictionary_ids:{urd_Arab:sourceDictionary.urd_Arab,hin_Deva:sourceDictionary.hin_Deva},
 onnx_weight_graph_bytes:weights.reduce((sum,file)=>sum+file.size,0),minimal_inference_asset_bytes:required.reduce((sum,file)=>sum+file.size,0),asset_sizes_basis:'Pinned Hub metadata, not a completed model download or browser measurement',
 successfully_downloaded_repository_bytes:localFiles.reduce((sum,file)=>sum+file.bytes,0),successfully_downloaded_files:localFiles,
 native_attempt:smoke,browser_smoke:'not attempted: native quality advantage could not be established',
 m2m100:{model:priorM2M.model,revision:priorM2M.revision,settings:'Current shared helper: native CPU q8, deterministic greedy, max_new_tokens 512, explicit language tokens, no forced EOS; exact-input outputs reused from integrity-repair.json.',weight_bytes:631984548,reused_inference_ms:{min:reusedTimes[0],max:reusedTimes.at(-1),median:(reusedTimes[2]+reusedTimes[3])/2},historical_load_ms:priorM2M.loadMs,historical_rss_after_run_bytes:priorM2M.memory.rss,measurement_note:'Reused observations from prior runs; not fresh controlled paired timings or peak-memory measurements.'},
 hardware:{cpu:os.cpus()[0].model,threads:os.cpus().length,physical_ram_bytes:os.totalmem()},
 no_quality_claim:'No comparative improvements, regressions, win rates or native naturalness can be inferred without alternative outputs.'};
await fs.writeFile(root+'/evidence.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify({...summary,successfully_downloaded_files:undefined,native_attempt:{status:smoke.status,error:smoke.error,attempt_ms:smoke.attempt_ms,process_peak_working_set_bytes:smoke.process_peak_working_set_bytes}},null,2));
