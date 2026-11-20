import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-default-sleeve-');
try {
 await build({entryPoints:['server/src/social.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/social.mjs'});
 const {handleSocial}=await import(dir+'/social.mjs');
 const env={DB:{prepare(){throw Error('Unavailable sleeves must be rejected before database access');}}};
 for(const path of ['/social/me','/social/buy-sleeve','/social/buy-cosmetic']){
  const body=path==='/social/me'?{sleeve:'sleeve:gacha-elfweave'}:{id:'sleeve:gacha-elfweave'};
  const response=await handleSocial(env,new Request('https://local.test'+path,{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json'}}),path,{id:'test'});
  assert.equal(response.status,400,path);assert((await response.json()).error);
 }
 console.log('PASS: non-default sleeve equip and purchase rejected without any database mutation');
}finally{await rm(dir,{recursive:true,force:true});}
