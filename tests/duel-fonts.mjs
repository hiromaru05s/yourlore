import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const dir=await mkdtemp(path.join(tmpdir(),'lore-duel-fonts-'));
let language='ja',offline=true;const calls=[];
globalThis.__fontLanguage=()=>language;
globalThis.document={fonts:{load:async(font,text)=>{calls.push({font,text});if(offline)throw Error('font offline');return [];}}};
try{
 await build({entryPoints:['client/src/ui/duelFonts.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/fonts.mjs',plugins:[{name:'locale',setup(b){b.onResolve({filter:/i18n$/},()=>({path:'locale',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const getLang=()=>globalThis.__fontLanguage();export const localizedInterfaceText=()=>"対戦";'}));}}]});
 const {prepareDuelFonts}=await import(dir+'/fonts.mjs');await assert.rejects(prepareDuelFonts(),/font offline/);offline=false;await prepareDuelFonts();const count=calls.length;await prepareDuelFonts();assert.equal(calls.length,count,'Successful preparation is reusable');assert(calls.some(c=>c.font.includes('Shippori')&&c.text.length>100));language='en';await prepareDuelFonts();assert(calls.slice(count).some(c=>c.font.includes('Alegreya')));assert(!calls.slice(count).some(c=>c.font.includes('Shippori')),'Only the selected language is prepared');
 console.log('PASS locale glyph selection, retry after font failure, completed reuse, language changes');
}finally{delete globalThis.__fontLanguage;delete globalThis.document;await rm(dir,{recursive:true,force:true});}
