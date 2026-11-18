// Local workerd latency evidence, not production CPU billing or a worst-case bound.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {mkdtemp,rm,readFile,writeFile,mkdir} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import path from 'node:path';
const dir=await mkdtemp('/tmp/lore-bot-runtime-'),out=path.resolve(process.argv[2]);let mf;
try{
 await build({stdin:{resolveDir:process.cwd(),contents:`import {botDecide} from './client/src/shared/bot';import {reduce,createGame} from './client/src/shared/engine';import {DB,STARTERS} from './client/src/shared/cards';import {actionChangesState} from './client/src/shared/botActions';
 export default {async fetch(req){let {g,tier,nodeLimit,dense}=await req.json();
 if(dense){g=createGame({mode:'bot',seed:42,starting:0,p0:{id:'a',name:'a'},p1:{id:'b',name:'b'}}).state;let serial=0;const card=id=>({...DB[id]??STARTERS[id],uid:'dense-'+serial++});g.cur=0;g.turn=55;g.pending=null;g.market=['MERCENARY','M4','NOURISHING_RAIN','MEDITATE'].map(card);g.marketStock=[3,3,3,3];
 for(const p of g.players){Object.assign(p,{hp:60,mana:10,maxMana:10,dew:6,hand:['M4','STARTER_MANA','NOURISHING_RAIN','STARTER_CHEST','GOBLIN'].map(card),deck:Array.from({length:30},(_,i)=>card(['S13','M4','STARTER_TRASH'][i%3])),discard:[],supply:[],quests:[],traps:[],exile:[],removed:[],field:Array.from({length:7},(_,i)=>({...card(i<4?'MINI_SPIRIT':'M4'),dmg:0,atkMod:2,defMod:3,tempAtk:0,exhausted:false,summonedTurn:0})),enchants:['BLOOD_RITE','WEAKEN_ALL'].map(id=>({card:card(id),bornTurn:1,turns:99}))});}}
 const before=JSON.stringify(g),action=botDecide(g,tier,undefined,nodeLimit);return Response.json({action,advanced:actionChangesState(g,reduce(g,action).state),pure:before===JSON.stringify(g),turn:g.turn,fields:g.players.map(p=>p.field.length),cycle:g.players.map(p=>p.hand.length+p.deck.length+p.discard.length)});}};`},bundle:true,format:'esm',platform:'browser',outfile:dir+'/worker.mjs'});
 mf=new Miniflare(convertV4MiniflareOptions({name:'lore-bot-runtime-proof',modules:true,script:await readFile(dir+'/worker.mjs','utf8'),compatibilityDate:'2024-11-01',compatibilityFlags:['nodejs_compat']}));
 const heavy=JSON.parse(gunzipSync(await readFile('docs/bot-strength/2026-10-27/evidence/cpu-heavy-state.json.gz')));
 heavy.players[heavy.cur].hand=heavy.players[heavy.cur].hand.filter(c=>!['destroyMon','destroyEnch'].includes(c.act));
 const rows=[];
 for(const input of [{name:'historical-heavy-filtered',g:heavy,tier:'hard'},{name:'dense-late-current-cards',dense:true,tier:'hard'},{name:'historical-clock-pressure',g:heavy,tier:'normal',nodeLimit:500}]){
  const start=performance.now(),response=await mf.dispatchFetch('https://test/decision',{method:'POST',body:JSON.stringify(input)}),body=await response.json(),hostWallMs=performance.now()-start;
  assert.equal(response.status,200);assert(body.advanced&&body.pure);const row={name:input.name,tier:input.tier,nodeLimit:input.nodeLimit??null,hostWallMs,...body};rows.push(row);console.log(JSON.stringify(row));
 }
 await mkdir(path.dirname(out),{recursive:true});await writeFile(out,JSON.stringify({runtime:'local workerd',compatibilityDate:'2024-11-01',scope:'Host elapsed time in three fixtures; not production CPU billing, not a maximum latency guarantee. The dense fixture is synthetic and uses current card definitions.',rows},null,2)+'\n');
}finally{await mf?.dispose();await rm(dir,{recursive:true,force:true});}
