import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {build} from 'esbuild';
const built=await build({entryPoints:['client/src/ui/manaRupture/impactSound.ts'],bundle:true,write:false,format:'esm',metafile:true});
assert(!Object.keys(built.metafile.inputs).some(p=>p.includes('/dev/')),'production sound cannot depend on audition code');
const {ruptureImpactSamples}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
for(const rate of [44100,48000]){const a=ruptureImpactSamples(rate);assert.strictEqual(a,ruptureImpactSamples(rate));assert.equal(a.length,Math.ceil(rate*2.35));assert(a.every(v=>Number.isFinite(v)&&Math.abs(v)<.881));assert.equal(a[0],0);assert.equal(a.at(-1),0);}
const a=ruptureImpactSamples(48000),wav=await fs.readFile('docs/releases/2026-11-19-defeat-mana-rise/approved-sound-1.wav');
assert.equal(wav.readUInt32LE(24),48000);assert.equal(wav.length,44+2*(a.length+7200));
for(let i=0;i<a.length;i++)assert.equal(wav.readInt16LE(44+(7200+i)*2),Math.round(a[i]*32767)||0,'must reproduce selected option 1');
console.log('PASS approved option 1 matches every saved WAV sample; 44.1/48 kHz, cache, no clipping, production-only dependency graph.');
