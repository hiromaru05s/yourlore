import {build} from 'esbuild';
import fs from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
const repo=new URL('../../../../',import.meta.url),out=new URL('docs/vfx-prototypes/2026-10-12-vampire-fang-anatomy-r6/qa/',repo);
await fs.mkdir(out,{recursive:true});const bundle=new URL('rig.mjs',out);
await build({entryPoints:[fileURLToPath(new URL('bite-rig.ts',import.meta.url))],outfile:fileURLToPath(bundle),bundle:true,platform:'node',format:'esm',logLevel:'silent'});
const {BiteRig,bitePose,bites}=await import(pathToFileURL(fileURLToPath(bundle)).href);
const rig=new BiteRig(),checks=[],models=[];const check=(ok,msg)=>{if(!ok)throw Error(msg);checks.push(msg);};
for(let v=0;v<6;v++){
 let prev=0,crossings=0;for(let t=0;t<=2600;t+=5){const p=bitePose(v,t);check(p.close>=prev,`${v}: monotonic closure ${t}`);if(prev<1&&p.close===1)crossings++;prev=p.close;}
 check(crossings===1,`${v}: exactly one bite`);check(bitePose(v,bites[v].hit-1).pressure===0,`${v}: contact before pressure`);
 for(const id of ['VAMP1','VAMP2','VAMP3','VAMP4','VAMP5','VAMP_BUTLER'])for(const t of [0,210,650,930,bites[v].hit+30,1450,1750,2600]){rig.draw(id,v,t,34);check(Number.isFinite(rig.lowerClearance)&&rig.lowerClearance>=0,`${id}/${v}/${t}: clearance`);for(const c of rig.points)check(Number.isFinite(c.x)&&Number.isFinite(c.y),`${id}/${v}/${t}: contact finite`);}
 rig.draw('VAMP5',v,bites[v].hit+30,34);const points=rig.points.map(p=>[p.x,p.y]);rig.draw('VAMP5',v,1500,34);check(rig.points.every((p,i)=>Math.abs(p.x-points[i][0])+Math.abs(p.y-points[i][1])<.001),`${v}: wounds stay at contact during erosion`);
 for(const time of [930,bites[v].hit+30]){rig.draw('VAMP5',v,time,0);rig.group.updateWorldMatrix(true,true);const meshes=[];rig.group.children[v].traverse(o=>{if(!o.isMesh)return;const a=o.geometry.getAttribute('position'),color=o.geometry.getAttribute('color'),p=[];const matrix=o.matrixWorld.elements;for(let k=0;k<a.count;k++){const x=a.getX(k),y=a.getY(k),z=a.getZ(k);p.push([matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12],matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13],matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14]]);}check(p.every(v=>v.every(Number.isFinite)),`${v}/${time}: finite exported mesh`);meshes.push({vertices:p,indices:Array.from(o.geometry.index?.array||Array.from({length:a.count},(_,i)=>i)),colors:color?Array.from(color.array):null,color:o.material.color.toArray(),roughness:o.material.roughness??1,unlit:o.material.isMeshBasicMaterial||false});});models.push({variant:v,time,meshes});}
}
rig.dispose();await fs.writeFile(new URL('geometry.json',out),JSON.stringify(models));await fs.writeFile(new URL('geometry-report.json',out),JSON.stringify({checks:checks.length,errors:[],scope:'Node: geometry, timing and contact stability only; no browser or board verification',variants:6,cards:6},null,2));console.log(JSON.stringify({checks:checks.length,errors:[],models:models.length}));await fs.unlink(bundle);
