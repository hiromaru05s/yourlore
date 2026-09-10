// Geometry tests run without a GPU. Browser tests exercise the real draw path.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const temp=await mkdtemp(path.join(tmpdir(),'paper-card-'));
try {
  await build({entryPoints:['client/src/ui/paperCard.ts'],bundle:true,format:'esm',platform:'node',outfile:path.join(temp,'paper.mjs')});
  const {drawPose,bendPoint}=await import(path.join(temp,'paper.mjs'));
  // Exact flat endpoints avoid a visible jump when the live DOM card takes over.
  for(const t of [0,1]) {
    const p=drawPose(t,true);
    assert(Math.abs(p.bend)<1e-8);assert(Math.abs(p.twist)<1e-8);
    assert(Math.abs(p.lift)<1e-8);assert(Math.abs(p.rx)<1e-8);assert(Math.abs(p.rz)<1e-8);
  }
  assert.equal(drawPose(1,true).ry,0);
  for(let i=0;i<=100;i++) {
    const p=drawPose(i/100,false);assert.equal(p.ry,Math.PI,'opponent face must never turn toward the camera');
    assert(Object.values(p).every(Number.isFinite));
    assert(p.travel>=0 && p.travel<=1);
  }
  assert(drawPose(.25,true).bend>.35);
  assert(drawPose(.4,true).ry<0,"right edge turns toward the viewer");
  for(const point of [[0,0,0],[.5,.78,.0025],[-.5,-.78,-.0025]])assert.deepEqual(bendPoint(...point,0,0),point);
  // A strip bent to a circular arc preserves length, unlike a scaled wave.
  let length=0,previous=bendPoint(0,-.78,0,.6,0);
  for(let i=1;i<=1000;i++) {
    const p=bendPoint(0,-.78+1.56*i/1000,0,.6,0);
    length+=Math.hypot(...p.map((v,j)=>v-previous[j]));previous=p;
  }
  assert(Math.abs(length-1.56)<1e-5);
  console.log('Paper card: flat landing, private back, finite motion, length-preserving bend passed.');
} finally {await rm(temp,{recursive:true,force:true});}
