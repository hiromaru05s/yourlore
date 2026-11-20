import assert from 'node:assert/strict';
import sharp from 'sharp';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'lore-pile-stock-'));
try{
 await build({stdin:{contents:"export {makePile} from './client/src/ui/pileModels';export {Texture,Box3} from 'three';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'pile.mjs')});
 const {data,info}=await sharp('client/public/frames/sleeve_default.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let left=info.width,right=0,top=info.height,bottom=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>128){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 const width=(right+1-left)/info.width,depth=(bottom-top)/info.height/.64;
 const {makePile,Texture,Box3}=await import(path.join(dir,'pile.mjs'));const sleeve=new Texture();
 for(const n of [0,1,2,12,40]){
  const shelf=makePile(n,true,sleeve);shelf.cards.traverse(node=>assert(!['stock-front','stock-back'].includes(node.name),'native public shelf has paper edges only'));
  if(n){const box=new Box3().setFromObject(shelf.cards);assert(Math.abs(box.max.x-box.min.x-width)<2/info.width,`paper width follows authored sleeve alpha: ${box.max.x-box.min.x} vs ${width}`);assert(Math.abs(box.max.z-box.min.z-depth)<2/info.height/.64,'paper height follows authored sleeve alpha');}
  const deck=makePile(n,false,sleeve);assert.equal(deck.cards.children.filter(c=>c.getObjectByName('stock-front')&&c.getObjectByName('stock-back')).length,Math.min(n,1));
 }
 console.log('PASS: empty/1/2/12/40-card shelf has only frame-shaped paper edges; private deck sleeves preserved');
}finally{await rm(dir,{recursive:true,force:true});}
