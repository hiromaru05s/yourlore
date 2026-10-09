import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lore-mana-exits-'));
try{
 await build({entryPoints:['client/src/game/shelfExits.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/exits.mjs'});
 const {persistentShelfExits}=await import(dir+'/exits.mjs');
 const card=(uid,id='E3')=>({uid,id});
 const player=()=>({enchants:[],quests:[],discard:[],hand:[],removed:[]});
 const before={players:[player(),player()]},after={players:[player(),player()]};
 before.players[0].enchants=[{card:card('own-a')},{card:card('own-b')},{card:card('exiled')},{card:card('bounced')},{card:card('stays')}];
 before.players[1].enchants=[{card:card('opp-a')},{card:card('event')}];
 before.players[1].quests=[{card:card('quest','Q_CASTLE')}];
 after.players[0].discard=[card('own-b'),card('own-a')];
 after.players[0].removed=[card('exiled')];after.players[0].hand=[card('bounced')];after.players[0].enchants=[{card:card('stays')}];
 after.players[1].discard=[card('opp-a'),card('event'),card('quest','Q_CASTLE')];
 const exits=persistentShelfExits(before,after,[{type:'destroy',player:1,uid:'event',id:'E3'}]);
 assert.deepEqual(exits.map(x=>[x.player,x.card.uid]),[[0,'own-a'],[0,'own-b'],[1,'opp-a'],[1,'quest']]);
 assert.deepEqual(persistentShelfExits(after,after,[]),[],'repeated state must not replay');
 const transferred=structuredClone(after);transferred.players[0].discard=[];transferred.players[1].enchants.push({card:card('own-a')});
 assert(!persistentShelfExits(before,transferred,[]).some(x=>x.card.uid==='own-a'),'ownership transfer is not a Shelf exit');
 const catalog=await fs.readFile('client/src/ui/manaDestruction/catalog.ts','utf8');
 assert.equal((catalog.match(/name:'/g)||[]).length,1,'only the approved option ships');
 assert.match(catalog,/name:'脈光の覚醒'.*duration:1510,breakAt:440,joinAt:870,arriveAt:1190/);
 console.log('PASS public persistent Shelf exits: both owners, same-ID distinct UIDs, quest, expiry, exile, bounce, transfer, deduplication, selected timing');
}finally{await fs.rm(dir,{recursive:true,force:true});}
