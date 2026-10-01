/* Offline glTF/schema and handoff checks. UI smoke checks are documented separately. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.basename(__dirname)==='source'?path.resolve(__dirname,'..'):path.resolve(__dirname,'../../docs/3d-assets/2026-09-21-blender-turn-button');
const validator=require(process.env.GLTF_VALIDATOR_PATH||'/tmp/lore-mana-validator/node_modules/gltf-validator');
(async()=>{
 const results={};
 for(const name of ['turn-button.glb','turn-button-lod1.glb','timer-inserts.glb']){
  const bytes=fs.readFileSync(path.join(base,'web',name));const result=await validator.validateBytes(new Uint8Array(bytes),{uri:name});results[name]=result;
  assert.equal(result.issues.numErrors,0,name+' errors');assert.equal(result.issues.numWarnings,0,name+' warnings');
  const n=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+n).toString());
  if(name.startsWith('turn-button')){
   const cap=doc.nodes.find(n=>n.name==='PRESS_CAP'),label=doc.nodes.find(n=>n.name==='LABEL_SURFACE');
   assert(cap&&label,'Required reusable animation/label nodes');assert.equal(cap.extras.press_travel_m,.0015);
   assert(cap.children.some(i=>doc.nodes[i]===label),'Label follows cap');
  }else assert.equal(doc.nodes.filter(n=>Number.isInteger(n.extras?.segment_index)).length,24);
  assert(!doc.nodes.some(n=>/\b(preview|studio|camera|light)\b/i.test(n.name||'')),'Preview geometry leaked into runtime GLB');
 }
 const fit=JSON.parse(fs.readFileSync(path.join(base,'checks/assembled-fit.json')));assert(fit.passed);
 const geometry=JSON.parse(fs.readFileSync(path.join(base,'checks/geometry.json')));for(const v of Object.values(geometry))assert.equal(v.nonmanifold_edges,0);
 fs.writeFileSync(path.join(base,'checks/gltf-validation.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({passed:true,models:Object.fromEntries(Object.entries(results).map(([n,r])=>[n,{errors:r.issues.numErrors,warnings:r.issues.numWarnings,infos:r.issues.numInfos}]))}));
})().catch(e=>{console.error(e);process.exitCode=1;});
