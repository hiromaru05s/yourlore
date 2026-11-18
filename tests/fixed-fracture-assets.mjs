import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {build} from 'esbuild';import {createHash} from 'node:crypto';
const dir='client/public/vfx/character-fractures/v1',manifest=JSON.parse(await fs.readFile(dir+'/manifest.json','utf8'));
assert.equal(manifest.items.length,16);const distinct=new Set();
for(const item of manifest.items){const raw=await fs.readFile(dir+'/'+item.key+'.json'),data=JSON.parse(raw);assert.equal(createHash('sha256').update(raw).digest('hex'),item.sha256);assert.equal(data.character+'-'+data.side,item.key);assert(data.pieces.length>0&&data.pieces.length<=64);distinct.add(data.pieces[0].seed);
 for(const piece of data.pieces)for(const g of [piece.face,piece.wall]){assert.equal(g.position.length,g.normal.length);assert(g.position.every(Number.isFinite));assert(g.normal.every(Number.isFinite));if(g.index)assert(g.index.every(i=>i>=0&&i<g.position.length/3));}
}
assert.equal(distinct.size,8,'each character has an authored fixed partition');
const graph=await build({entryPoints:['client/src/ui/manaRupture/renderer.ts'],bundle:true,write:false,format:'esm',platform:'browser',metafile:true,loader:{'.webp':'dataurl','.css':'empty'}});
assert(!Object.keys(graph.metafile.inputs).some(p=>p.endsWith('manaRupture/fragments.ts')),'runtime must not include the procedural fracture builder');
const result=await build({entryPoints:['client/src/ui/manaRupture/timing.ts'],bundle:true,write:false,format:'esm'});const timing=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
assert.equal(Math.hypot(...Object.values(timing.ruptureShake(1040))),0,'quiet hold before burst');for(const t of [1200,1600,2200,2500]){const shake=timing.ruptureShake(t);assert(Math.hypot(shake.x,shake.y)>0);assert(Math.abs(shake.x)<1&&Math.abs(shake.y)<.5);}
assert.equal(Math.hypot(...Object.values(timing.ruptureShake(2580))),0);assert.equal(timing.ruptureDistance(1079),0);assert(timing.ruptureDistance(1180)>timing.ruptureDistance(1080));
console.log('PASS 16 baked assets, 8 character patterns, valid fixed geometry, no runtime fracture builder, pre-burst hold and 1.5s subtle aftershake.');

assert.equal(timing.counterFracturePhase(859),'intact');assert.equal(timing.counterFracturePhase(860),'cracked');assert.equal(timing.counterFracturePhase(1079),'cracked');assert.equal(timing.counterFracturePhase(1080),'gone');

// The long boom must finish before the presentation closes its audio context.
const audioBuild=await build({entryPoints:['client/src/ui/manaRupture/impactSound.ts'],bundle:true,write:false,format:'esm'});
const {ruptureImpactSamples}=await import('data:text/javascript;base64,'+Buffer.from(audioBuild.outputFiles[0].text).toString('base64'));
for(const rate of [44100,48000]){const samples=ruptureImpactSamples(rate);assert.equal(samples,ruptureImpactSamples(rate));assert(samples.every(n=>Number.isFinite(n)&&Math.abs(n)<=.901));assert.equal(samples[0],0);assert.equal(samples.at(-1),0);assert(samples.length/rate+timing.BURST/1000<3.55);const tail=samples.slice(rate*.7,rate*1.5);assert(Math.sqrt(tail.reduce((n,v)=>n+v*v,0)/tail.length)>.015,'audible low resonance');}
console.log('PASS cached impact waveform at 44.1/48 kHz, non-clipping, resonance and complete tail before teardown.');
