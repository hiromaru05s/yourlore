import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm,access} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-gacha-cosmetics-');
try{
 await build({stdin:{contents:`export * from './client/src/shared/cosmetics';export * from './client/src/shared/cards';export * from './client/src/shared/gachaCosmetics';export * from './client/src/shared/goldfaultCosmetics';export * from './client/src/shared/amethystCosmetics';export * from './client/src/shared/quietLuxuryCosmetics';export * from './client/src/shared/elfweaveCosmetics';export * from './client/src/shared/mimicCofferCosmetics';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/module.mjs'});
 const {AVAILABLE_GACHA_COSMETICS,sleeveUrl,FRAME_BACK,GACHA_COSMETICS,COSMETICS,SLEEVE_LIST,FURNITURE_LIST,ownedCosmetics,equipmentId,sanitizeDecks,gachaFromUrl,isGoldfaultSleeve,isGoldfaultFurniture,isAmethystSleeve,isAmethystFurniture,quietLuxuryFromUrl,isElfweaveSleeve,isElfweaveFurniture,isCofferSleeve,isCofferFurniture}=await import(dir+'/module.mjs');
 assert(GACHA_COSMETICS.some(c=>c.id==='sleeve:gacha-elfweave'));assert(GACHA_COSMETICS.some(c=>c.id==='furniture:gacha-elfweave'));assert(GACHA_COSMETICS.some(c=>c.id==='sleeve:gacha-amethyst-cleft'));assert(GACHA_COSMETICS.some(c=>c.id==='furniture:gacha-amethyst-cleft'));assert.equal(new Set(COSMETICS.map(c=>c.id)).size,COSMETICS.length);
 for(const c of GACHA_COSMETICS){assert(c.gachaOnly);assert(c.price>0);assert(c.ja&&c.en&&c.ko);await access('client/public'+c.url);assert(gachaFromUrl(c.url)||isGoldfaultSleeve(c.url)||isGoldfaultFurniture(c.url)||isAmethystSleeve(c.url)||isAmethystFurniture(c.url)||quietLuxuryFromUrl(c.url,c.kind)||isElfweaveSleeve(c.url)||isElfweaveFurniture(c.url)||isCofferSleeve(c.url)||isCofferFurniture(c.url),c.id+' must resolve to its runtime family');assert.equal((c.kind==='sleeve'?SLEEVE_LIST:FURNITURE_LIST).some(x=>x.id===c.id),c.kind!=='sleeve');assert(ownedCosmetics(JSON.stringify([c.id])).includes(c.id));assert.equal(equipmentId(c.id,c.kind),c.kind==='sleeve'?'default':c.id);assert.equal(equipmentId(c.id,c.kind==='sleeve'?'furniture':'sleeve'),'default');}
 assert.deepEqual(COSMETICS.filter(c=>c.gachaOnly),GACHA_COSMETICS);
 for(const legacy of ['astral','furniture:astral','nocturne','furniture:nocturne','azure-plume','furniture:azure-plume']){
  assert(!ownedCosmetics(JSON.stringify([legacy])).includes(legacy));assert.equal(equipmentId(legacy,'sleeve'),'default');assert.equal(equipmentId(legacy,'furniture'),'default');
  const slot=sanitizeDecks({list:[{sleeve:legacy,furniture:legacy}]}).list[0];assert.equal(slot.sleeve,'default');assert.equal(slot.furniture,'default');
 }
 // Old equipped sleeves fall back without losing ownership or changing furniture.
 for(const sleeve of GACHA_COSMETICS.filter(c=>c.kind==='sleeve'))for(const furniture of GACHA_COSMETICS.filter(c=>c.kind==='furniture')){
  const decks=sanitizeDecks({active:0,list:[{cards:[],watch:[],sleeve:sleeve.id,furniture:furniture.id}]});
  assert.equal(decks.list[0].sleeve,'default');assert.equal(sleeveUrl(sleeve.id),FRAME_BACK);assert.equal(decks.list[0].furniture,furniture.id);
 }
 assert.deepEqual(SLEEVE_LIST.map(s=>s.id),['default']);
 assert.deepEqual(AVAILABLE_GACHA_COSMETICS,GACHA_COSMETICS.filter(c=>c.kind!=='sleeve'));
 assert(AVAILABLE_GACHA_COSMETICS.length>0);
 assert.equal(gachaFromUrl('/frames/sleeve_default.webp'),undefined);
 console.log('PASS: unique gacha-only rewards, complete assets/locales, ownership, wrong-kind rejection, disabled sleeves preserved in inventory, default fallback, active reward pool');
}finally{await rm(dir,{recursive:true,force:true});}
