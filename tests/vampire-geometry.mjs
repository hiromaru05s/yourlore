import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'vampire-parity-'));
try{
 for(const [name,source] of [['selected','client/src/ui/vampireSummon/rig.ts'],['preview','client/src/dev/vampire-six/bite-rig.ts'],['selection','client/src/ui/vampireSummon/selection.ts']])await build({entryPoints:[source],outfile:path.join(dir,name+'.mjs'),bundle:true,platform:'node',format:'esm',logLevel:'silent'});
 const {VampireRig}=await import(path.join(dir,'selected.mjs')),{BiteRig,bitePose,bites}=await import(path.join(dir,'preview.mjs')),{VAMPIRE_IDS,isVampire}=await import(path.join(dir,'selection.mjs'));
 assert.equal(VAMPIRE_IDS.length,6);for(const id of VAMPIRE_IDS)assert(isVampire(id));for(const id of [undefined,'VAMP6','ELF','MIMIC'])assert(!isVampire(id));
 const selected=new VampireRig(),preview=new BiteRig();let frames=0;
 const meshes=rig=>{const out=[];rig.group.children[0].traverse(o=>{if(o.isMesh)out.push(o)});return out;};
 for(const id of VAMPIRE_IDS)for(const t of [0,210,650,930,1030,1080,1110,1250,1450,1750,2600]){
  selected.draw(id,0,t,34);preview.draw(id,0,t,34);assert.equal(selected.group.visible,preview.group.visible);assert.equal(selected.pressure,preview.pressure);assert.equal(selected.wound,preview.wound);assert.deepEqual(selected.points.map(p=>p.toArray()),preview.points.map(p=>p.toArray()));assert(selected.lowerClearance>=0);
  const a=meshes(selected),b=meshes(preview);assert.equal(a.length,b.length);
  for(let i=0;i<a.length;i++){assert.deepEqual(a[i].matrixWorld.elements,b[i].matrixWorld.elements);assert.deepEqual(a[i].geometry.getAttribute('position').array,b[i].geometry.getAttribute('position').array);assert.deepEqual(a[i].geometry.getAttribute('color')?.array,b[i].geometry.getAttribute('color')?.array);assert.equal(a[i].material.color.getHex(),b[i].material.color.getHex());}
  if(t<980)for(const [i,row]of selected.group.children[0].children.entries()){const sign=i===0?1:-1,p=row.localToWorld(row.position.clone().set(0,sign*8,6));assert(Math.abs(p.y-sign*136.5)<1e-9,'root stays on frame edge');}
  frames++;
 }
 let prev=0,crossings=0;for(let t=0;t<=2600;t++){const p=bitePose(0,t);assert(p.close>=prev);if(prev<1&&p.close===1)crossings++;prev=p.close;if(t<bites[0].hit)assert.equal(p.pressure,0);}assert.equal(crossings,1);
 selected.draw('VAMP5',0,1110,0);const points=selected.points.map(p=>p.toArray());selected.draw('VAMP5',0,1500,0);assert.deepEqual(selected.points.map(p=>p.toArray()),points,'wounds do not follow dissolving teeth');
 selected.dispose();preview.dispose();assert.equal(selected.group.children.length,0);
 const anim=await readFile('client/src/ui/anim.ts','utf8'),runtime=await readFile('client/src/ui/summon/runtime.ts','utf8');assert(anim.indexOf('heavy&&isVampire')<anim.indexOf('if(heavy){'));assert(anim.includes("if(isVampire(id)){node.style.visibility='hidden';return;}"));assert(runtime.includes('return playVampireSummon(source,options)'));assert(runtime.includes('cancelVampireSummons(root)'));
 console.log(`PASS vampire 01: ${frames} selected/preview mesh parity samples, frame anchors across six cards, one bite, stationary wounds, selection/routing and cleanup`);
}finally{await rm(dir,{recursive:true,force:true});}
