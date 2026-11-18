/** Offline asset authoring. Run against the native board fixture on local Vite. */
const {chromium}=await import(process.env.LORE_PLAYWRIGHT??'/tmp/lore-defeat-preview-tools/node_modules/playwright-core/index.mjs');
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const origin=process.env.LORE_TEST_ORIGIN??'http://127.0.0.1:5538';
const out='client/public/vfx/character-fractures/v1';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal']});
const manifest=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 await page.goto(origin+'/outcome-lab.html');await page.waitForFunction(()=>window.outcomeLab?.ready,null,{timeout:120000});
 const characters=await page.evaluate(async()=>[...(await import('/src/ui/manaRupture/bakedFragments.ts')).FRACTURE_CHARACTERS]);
 for(const character of characters){
  const results=await page.evaluate(async character=>{
   const {captureCharacterSurface}=await import('/src/ui/outcomeSurface.ts'),{fractureSurface}=await import('/src/ui/manaRupture/fragments.ts'),T=await import('/node_modules/.vite/deps/three.js');
   window.outcomeLab.setCharacters(character,character);
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   await Promise.all([...document.querySelectorAll('.portrait .avatar img')].map(im=>im.decode().catch(()=>{})));
   const seed=[...character].reduce((v,c)=>(v*31+c.charCodeAt(0))%100003,19);
   const attr=(g,name)=>{const a=g.getAttribute(name);return a?Array.from(a.array,n=>Math.round(n*1e6)/1e6):undefined;};
   const geometry=g=>({position:attr(g,'position'),normal:attr(g,'normal'),uv:attr(g,'uv'),index:g.index?Array.from(g.index.array):undefined});
   const result=[];
   for(const side of ['me','opp']){
    const root=document.querySelector(side==='me'?'#portraitMe':'#portraitOpp'),surface=await captureCharacterSurface(root,new AbortController().signal);if(!surface)throw Error('Missing surface '+character+' '+side);
    const texture=new T.CanvasTexture(surface),begin=performance.now(),set=fractureSurface(surface,texture,seed);
    const data={version:1,character,side,pieces:set.pieces.map(p=>({center:p.center.toArray(),seed:p.seed,depth:p.depth,leak:p.leak?.toArray()??null,face:geometry(p.node.children[0].geometry),wall:geometry(p.node.children[2].geometry)}))};
    result.push({data,cracks:set.cracks.toDataURL('image/png').split(',')[1],source:surface.toDataURL('image/png').split(',')[1],bakeMs:performance.now()-begin});set.dispose();texture.dispose();
   }return result;
  },character);
  for(const {data,cracks,source,bakeMs} of results){const key=character+'-'+data.side,json=JSON.stringify(data);await writeFile(out+'/'+key+'.json',json);await writeFile(out+'/'+key+'.png',Buffer.from(cracks,'base64'));manifest.push({key,pieces:data.pieces.length,bytes:Buffer.byteLength(json),sha256:createHash('sha256').update(json).digest('hex'),surfaceHash:createHash('sha256').update(source).digest('hex'),bakeMs});}
  console.log(character,results.map(r=>r.data.pieces.length));
 }
 await writeFile(out+'/manifest.json',JSON.stringify({version:1,sourceCommit:'e5a8c53fd',generator:'scripts/bake-character-fractures.mjs',items:manifest},null,2));
}finally{await browser.close();}
