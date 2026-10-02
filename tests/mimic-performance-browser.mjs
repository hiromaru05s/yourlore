import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {transform} from 'esbuild';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out='docs/performance/2026-10-02';await fs.mkdir(out,{recursive:true});
const server=await createServer({root:'client',configFile:'client/vite.config.ts',logLevel:'error',plugins:[{name:'approved-baseline',resolveId(id){if(id.startsWith('/@before/'))return '\0'+id;},async load(id){if(!id.startsWith('\0/@before/'))return;const file=id.slice('\0/@before/'.length);let source=execFileSync('git',['show','7cc9ed17:client/src/ui/'+file],{encoding:'utf8'});source=source.replace(/(['"])(\.\.?\/[^'"]+)\1/g,(_,q,p)=>{let target=path.posix.normalize(path.posix.join(path.posix.dirname(file),p));if(!target.endsWith('.ts'))target+='.ts';return q+(target.startsWith('mimic/')?'/@before/':'/src/ui/')+target+q;});return(await transform(source,{loader:'ts',format:'esm',target:'es2022'})).code;}}],server:{host:'127.0.0.1',port:5398,strictPort:true,hmr:false}});await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});const p=await browser.newPage({viewport:{width:1280,height:900}});p.setDefaultTimeout(120000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto('http://127.0.0.1:5398/src/dev/mimic-runtime/index.html');await p.waitForFunction(()=>window.mimicQA?.ready);
 const report=await p.evaluate(async()=>{
  const cases=[['MIMIC2','master-tongues','DynamicTongues'],['MIMIC_LORD','family-matter','FamilyMatter'],['AWAKENED_MIMIC','family-matter','FamilyMatter'],['MIMIC_KING','royal-matter','RoyalMatter'],['MIMIC_KING2','royal-matter','RoyalMatter']];
  const report=[];
  for(const [id,file,Class] of cases){
   const Old=(await import(`/@before/mimic/${file}.ts`))[Class],New=(await import(`/src/ui/mimic/${file}.ts`))[Class];
   const variant=id==='MIMIC_LORD'?3:1;const a=new Old(id,variant),b=new New(id,variant);await Promise.all([a.ready,b.ready]);
   const snapshots=[];let maxVertexError=0,maxNormalError=0;
   const capture=(m)=>{m.renderer.render(m.scene,m.camera);const c=document.createElement('canvas');c.width=m.canvas.width;c.height=m.canvas.height;const x=c.getContext('2d');x.drawImage(m.canvas,0,0);return x.getImageData(0,0,c.width,c.height).data;};
   for(const reduced of [false,true])for(const time of [0,640,1000,1400,1800,2200,2700]){
    const gap=100; a.draw(time,gap,reduced);b.draw(time,gap,reduced);
    for(let i=0;i<a.meshes.length;i++)for(const [attribute,kind] of [['position','vertex'],['normal','normal']]){
     const x=a.meshes[i].geometry.getAttribute(attribute),y=b.meshes[i].geometry.getAttribute(attribute);if(!x&&!y)continue;
     for(let j=0;j<x.array.length;j++){const error=Math.abs(x.array[j]-y.array[j]);if(kind==='vertex')maxVertexError=Math.max(maxVertexError,error);else maxNormalError=Math.max(maxNormalError,error);}
    }
    const pa=capture(a),pb=capture(b);let total=0,changed=0,peak=0;for(let i=0;i<pa.length;i++){const d=Math.abs(pa[i]-pb[i]);total+=d;if(d)changed++;peak=Math.max(peak,d);}
    snapshots.push({time,reduced,meanChannelError:total/pa.length,changedChannels:changed/pa.length,maxChannelError:peak,beforeCalls:a.renderer.info.render.calls,afterCalls:b.renderer.info.render.calls,trianglesBefore:a.renderer.info.render.triangles,trianglesAfter:b.renderer.info.render.triangles});
   }
   const times={before:[],after:[]};
   // Same renderer, dimensions, timeline samples and warmed shaders; alternate order.
   for(let pass=0;pass<6;pass++)for(const [name,m]of pass%2?[['after',b],['before',a]]:[['before',a],['after',b]]){
    const start=performance.now();for(let i=0;i<120;i++)m.draw(1000+i*8,100);times[name].push(performance.now()-start);
   }
   report.push({id,maxVertexError,maxNormalError,snapshots,times});a.dispose();b.dispose();
  }
  return report;
 });
 const mouth=await p.evaluate(async()=>{
  const {MimicRig:Old}=await import('/@before/mimic/rig.ts'),{MimicRig:New}=await import('/src/ui/mimic/rig.ts');
  const card=document.querySelector('.zone-mon .card');let cases=0;
  for(const id of ['MIMIC','MIMIC2','MIMIC_LORD','AWAKENED_MIMIC','MIMIC_KING','MIMIC_KING2']){
   const a=new Old(card,id),b=new New(card,id);await Promise.all([a.ready(),b.ready()]);
   for(const reduced of [false,true])for(const time of [0,600,1000,1400,1800,2200,2700]){
    a.draw(time,reduced);b.draw(time,reduced);const x=a.canvas.getContext('2d').getImageData(0,0,480,800).data,y=b.canvas.getContext('2d').getImageData(0,0,480,800).data;
    for(let i=0;i<x.length;i++)if(x[i]!==y[i])throw Error(`Mouth pixels differ: ${id}/${time}/${reduced}`);
    for(const part of ['body','top','bottom','shadow'])if(a[part].style.cssText!==b[part].style.cssText)throw Error(`Pose style differs: ${id}/${part}`);cases++;
   }
   a.dispose();b.dispose();
  }
  return{cases,pixelDifference:0};
 });
 await fs.writeFile(out+'/mimic-parity.json',JSON.stringify({report,mouth,errors},null,2));
 for(const r of report){assert.equal(r.maxVertexError,0,r.id+' vertices');assert.equal(r.maxNormalError,0,r.id+' normals');for(const s of r.snapshots){assert.equal(s.trianglesBefore,s.trianglesAfter,r.id+' triangles');assert(s.maxChannelError<=8&&s.meanChannelError<.00001&&s.changedChannels<.00001,r.id+' pixel error '+JSON.stringify(s));}console.log(r.id,JSON.stringify({peak:Math.max(...r.snapshots.map(s=>s.meanChannelError)),calls:r.snapshots.find(s=>s.time===1400),times:r.times}));}
 assert.deepEqual(errors,[]);
}finally{await browser.close();await server.close();}
