import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-npc-rotation-');let mf;
try{
 await build({stdin:{contents:`import {reserveNpcDeck} from './server/src/botRotation';export class Rotation {constructor(state){this.state=state;}fetch(req){return reserveNpcDeck(this.state.storage,req)}}export default{fetch(req,env){return env.ROSTER.get(env.ROSTER.idFromName(req.headers.get('x-player')||'a')).fetch(req)}};`,resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'browser',outfile:dir+'/worker.mjs'});
 const options={name:'lore-npc-rotation-proof',resourcePersistencePath:dir+'/state',modules:true,script:await readFile(dir+'/worker.mjs','utf8'),compatibilityDate:'2026-10-01',compatibilityFlags:['nodejs_compat'],durableObjects:{ROSTER:{className:'Rotation',useSQLite:true}}};
 mf=new Miniflare(convertV4MiniflareOptions(options));
 const request=(id,player='a')=>mf.dispatchFetch('https://test/npc-deck',{method:'POST',headers:{'x-player':player},body:JSON.stringify({difficulty:'hell',requestId:id})}).then(async r=>{assert.equal(r.status,200);return(await r.json()).index;});
 const first=await Promise.all(Array.from({length:7},(_,i)=>request('game-'+i)));assert.equal(new Set(first).size,7,'concurrent starts consume each deck once');
 const same=await Promise.all(Array.from({length:8},()=>request('game-0')));assert(same.every(i=>i===first[0]),'concurrent retries are idempotent');
 await mf.dispose();mf=new Miniflare(convertV4MiniflareOptions(options));
 assert.equal(await request('game-0'),first[0],'receipt survives runtime restart');
 const second=[];for(let i=0;i<7;i++)second.push(await request('next-'+i));assert.equal(new Set(second).size,7);assert.notEqual(await request("third-cycle"),second.at(-1));
 const other=await Promise.all(Array.from({length:7},(_,i)=>request('other-'+i,'b')));assert.equal(new Set(other).size,7,'users have independent rotations');
 console.log('PASS workerd SQLite DO concurrent rotation, retry idempotence, restart persistence and user isolation');
}finally{await mf?.dispose();await rm(dir,{recursive:true,force:true});}
