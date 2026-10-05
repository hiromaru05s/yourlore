import assert from 'node:assert/strict';import {build} from 'esbuild';import fs from 'node:fs/promises';import os from 'node:os';
const dir=await fs.mkdtemp(os.tmpdir()+'/lore-thickness-');
try{
 await build({stdin:{contents:`export * from './client/src/ui/cardThickness';export {pileCenter,pileFace} from './client/src/ui/readingBoardLayout';export {cardStock,makePile} from './client/src/ui/pileModels';export {createStockGeometry} from './client/src/ui/drawStock';export {PaperCard} from './client/src/ui/paperCard';export {Texture,Box3} from 'three';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/test.mjs'});
 const m=await import(dir+'/test.mjs'),rows=[];const close=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
 for(const scale of [1,3,1]){
  m.setPreviewCardThickness(scale);close(m.STOCK_THICKNESS,.0008/.110*scale);close(m.DRAW_THICKNESS_RATIO,.024*scale);
  const tex=new m.Texture(),stock=m.cardStock(tex),box=new m.Box3().setFromObject(stock);close(box.max.z-box.min.z,m.STOCK_THICKNESS);
  for(const shelf of [false,true])for(const count of [1,4,8,12,40]){
   const pile=m.makePile(count,shelf,tex,tex);close(pile.top.position.y,m.pileCenter(count,shelf));close(m.pileFace(count,shelf),(shelf?.009:.0088)/.110+count*m.STOCK_THICKNESS);
  }
  const geo=m.createStockGeometry(100,156.25);geo.computeBoundingBox();close(geo.boundingBox.max.z-geo.boundingBox.min.z,100*.024*scale);
  const paper=new m.PaperCard({back:{width:2,height:2}},1.5625),pb=new m.Box3().setFromObject(paper.group);close(pb.max.z-pb.min.z,.015*scale);paper.dispose();geo.dispose();
  rows.push({scale,stock:m.STOCK_THICKNESS,draw:m.DRAW_THICKNESS_RATIO,pile8:m.pileFace(8,false)});
 }
 console.log(JSON.stringify({passed:true,rows},null,2));
}finally{await fs.rm(dir,{recursive:true,force:true});}
