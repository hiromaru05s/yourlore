import assert from 'node:assert/strict';
import { build } from 'esbuild';
import * as T from 'three';
const bundle=await build({entryPoints:['client/src/dev/spirit-rabbit/rig.ts'],bundle:true,format:'esm',platform:'node',write:false});
const {buildMoonRabbit,rabbitGesture}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const base={mood:'idle',elapsed:0,x:0,y:0,yaw:0,roll:0,pitch:0,fin:0,finPitch:0,eye:1,smile:0,yawn:0};
const idle=Array.from({length:120},(_,i)=>rabbitGesture(base,i/30).earLeft);
assert.ok(Math.max(...idle)-Math.min(...idle)>.06,'idle ears must move');
const joy=Array.from({length:150},(_,i)=>rabbitGesture({...base,mood:'flutter',elapsed:i/30},i/30).leftHand);
assert.ok(Math.max(...joy)-Math.min(...joy)>.9,'joy must have legible hand flaps');
assert.ok(rabbitGesture({...base,mood:'sleepy',elapsed:3},3).droop>.99);
assert.equal(rabbitGesture({...base,mood:'sleepy',elapsed:7},7).droop,0);
const body=new T.Group(),material=new T.MeshStandardMaterial(),rig=buildMoonRabbit(body,material);
const ear=body.getObjectByName('rabbit-ear-left').children[0].geometry;
const y=()=>{const a=ear.attributes.position;return Array.from({length:a.count},(_,i)=>a.getY(i));};
rig.update(base,0,0);const restHeight=Math.max(...y());const root=Array.from(ear.attributes.position.array.slice(0,3));
for(let i=0;i<180;i++)rig.update({...base,mood:'sleepy',elapsed:i/60},1/60,i/60);
assert.ok(Math.max(...y())<restHeight-.20,'sleepy ears must bend down, not merely rotate a tiny amount');
assert.ok(Math.abs(ear.attributes.position.getY(0)-root[1])<.08,'ear roots stay attached');
for(let i=0;i<360;i++){
 rig.update({...base,mood:'flutter',elapsed:i/60},1/60,i/60);
 body.traverse(o=>{if(o.isMesh){for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));}});
}
const count=body.children.length;for(let i=0;i<300;i++)rig.update(base,1/60,i/60);assert.equal(body.children.length,count,'animation must reuse geometry');
console.log('PASS idle sway, visible hand flaps, sleepy ear bend, attached roots, finite geometry and stable mesh count');
