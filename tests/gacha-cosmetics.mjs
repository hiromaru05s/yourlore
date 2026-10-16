import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm,access} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-gacha-cosmetics-');
try{
 await build({stdin:{contents:`export * from './client/src/shared/cosmetics';export * from './client/src/shared/cards';export * from './client/src/shared/gachaCosmetics';export * from './client/src/shared/goldfaultCosmetics';export * from './client/src/shared/amethystCosmetics';export * from './client/src/shared/quietLuxuryCosmetics';export * from './client/src/shared/elfweaveCosmetics';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/module.mjs'});
 const {GACHA_COSMETICS,COSMETICS,SLEEVE_LIST,FURNITURE_LIST,ownedCosmetics,equipmentId,sanitizeDecks,gachaFromUrl,isGoldfaultSleeve,isGoldfaultFurniture,isAmethystSleeve,isAmethystFurniture,quietLuxuryFromUrl,isElfweaveSleeve,isElfweaveFurniture}=await import(dir+'/module.mjs');
 assert(GACHA_COSMETICS.some(c=>c.id==='sleeve:gacha-elfweave'));assert(GACHA_COSMETICS.some(c=>c.id==='furniture:gacha-elfweave'));assert(GACHA_COSMETICS.some(c=>c.id==='sleeve:gacha-amethyst-cleft'));assert(GACHA_COSMETICS.some(c=>c.id==='furniture:gacha-amethyst-cleft'));assert.equal(new Set(COSMETICS.map(c=>c.id)).size,COSMETICS.length);
 for(const c of GACHA_COSMETICS){assert(c.gachaOnly);assert(c.price>0);assert(c.ja&&c.en&&c.ko);await access('client/public'+c.url);assert(gachaFromUrl(c.url)||isGoldfaultSleeve(c.url)||isGoldfaultFurniture(c.url)||isAmethystSleeve(c.url)||isAmethystFurniture(c.url)||quietLuxuryFromUrl(c.url,c.kind)||isElfweaveSleeve(c.url)||isElfweaveFurniture(c.url));assert((c.kind==='sleeve'?SLEEVE_LIST:FURNITURE_LIST).some(x=>x.id===c.id));assert(ownedCosmetics(JSON.stringify([c.id])).includes(c.id));assert.equal(equipmentId(c.id,c.kind),c.id);assert.equal(equipmentId(c.id,c.kind==='sleeve'?'furniture':'sleeve'),'default');}
 // Cross-theme combinations survive the same serializer used by actual decks.
 for(const sleeve of GACHA_COSMETICS.filter(c=>c.kind==='sleeve'))for(const furniture of GACHA_COSMETICS.filter(c=>c.kind==='furniture')){
  const decks=sanitizeDecks({active:0,list:[{cards:[],watch:[],sleeve:sleeve.id,furniture:furniture.id}]});
  assert.equal(decks.list[0].sleeve,sleeve.id);assert.equal(decks.list[0].furniture,furniture.id);
 }
 assert.equal(gachaFromUrl('/frames/sleeve_default.webp'),undefined);
 console.log('PASS: unique gacha-only rewards, complete assets/locales, ownership, wrong-kind rejection, independent equipment combinations');
}finally{await rm(dir,{recursive:true,force:true});}
