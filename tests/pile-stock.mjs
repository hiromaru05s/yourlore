import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'lore-pile-stock-'));
try{
 await build({stdin:{contents:"export {makePile} from './client/src/ui/pileModels';export {Texture,Box3} from 'three';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'pile.mjs')});
 const {makePile,Texture,Box3}=await import(path.join(dir,'pile.mjs'));const sleeve=new Texture();
 for(const n of [0,1,2,12,40]){
  const shelf=makePile(n,true,sleeve);shelf.cards.traverse(node=>assert(!['stock-front','stock-back'].includes(node.name),'native public shelf has paper edges only'));
  if(n){const box=new Box3().setFromObject(shelf.cards);assert(box.max.x-box.min.x<.95);assert(box.max.z-box.min.z<1.5);}
  const deck=makePile(n,false,sleeve);assert.equal(deck.cards.children.filter(c=>c.getObjectByName('stock-front')&&c.getObjectByName('stock-back')).length,Math.min(n,20));
 }
 console.log('PASS: empty/1/2/12/40-card shelf has only inset paper edges; private deck sleeves preserved');
}finally{await rm(dir,{recursive:true,force:true});}
