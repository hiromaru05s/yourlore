// Package Blender outputs without editing reference artwork or runtime code.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const root=path.resolve(__dirname,'../..'),doc=path.join(root,'docs/3d-assets/2026-09-09-blender-deck-holder'),out=path.join(root,'client/public/models/cosmetics/deck_holder_biblion_ivory/v1');
(async()=>{
 await sharp(path.join(doc,'preview.png')).resize(512,512,{fit:'contain',background:'#d5d9df'}).webp({quality:90}).toFile(path.join(out,'preview.webp'));
 for(const side of ['self','opponent'])await sharp(path.join(doc,`fallback-${side}.png`)).webp({quality:92,alphaQuality:100}).toFile(path.join(out,`fallback-${side}.webp`));
 const files={};
 for(const [role,file] of Object.entries({preview:'preview.webp',fallbackSelf:'fallback-self.webp',fallbackOpponent:'fallback-opponent.webp',model:'model.glb',modelLow:'model-low.glb'})){
  const b=fs.readFileSync(path.join(out,file));files[role]={path:file,sha256:crypto.createHash('sha256').update(b).digest('hex'),bytes:b.length};
 }
 const asset={specVersion:1,assetId:'deck_holder_biblion_ivory',version:1,status:'draft',category:'deck_holder',grade:'sculpted',collectionId:'biblion_ivory',modelKey:'deck_ivory_plinth_v1',anchor:'deck_mount',files,preset:{id:'none',periodSeconds:6,strength:0,color:'#ffffff'},clips:[],sourceNote:'Original procedural Blender geometry and texture graphics, matching the local LORE ivory field palette. Source: docs/3d-assets/2026-09-09-blender-deck-holder. No external purchased mesh. Reference cards use existing LORE sleeve art and are not exported. Geometry and export validated; runtime/shop/device QA pending.'};
 fs.writeFileSync(path.join(out,'asset.json'),JSON.stringify(asset,null,2)+'\n');
 console.log('Packaged deck holder asset and image hashes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
