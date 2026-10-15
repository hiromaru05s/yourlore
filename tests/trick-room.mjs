import assert from 'node:assert/strict';
import {build} from 'esbuild';import {mkdtemp,rm,readFile} from 'node:fs/promises';import {tmpdir} from 'node:os';
const dir=await mkdtemp(tmpdir()+'/trick-room-');
try{
 await build({stdin:{contents:"export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/ui/trickRoom/changes';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/test.mjs'});
 const {createGame,reduce,DB,createTrickRoomTracker}=await import(dir+'/test.mjs');
 function fixture(player){const g=createGame({mode:'bot',seed:37,starting:player,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=7;g.phase='main';g.cur=player;g.pending=null;
  g.players.forEach((p,i)=>Object.assign(p,{field:[{...DB.M11,uid:`m-${i}`,atk:5,def:9,dmg:3,exhausted:false},{...DB.M4,uid:`equal-${i}`,atk:4,def:4,dmg:0}],hand:[],deck:[],discard:[],enchants:[],traps:[],quests:[],mana:20,maxMana:20,openingDrawReady:false}));
  g.players[player].hand=[{...DB.TRICKROOM,uid:'trick-source'}];return g;}
 for(const player of [0,1]){
  const track=createTrickRoomTracker(),g=fixture(player);assert.equal(track(g).changes.length,0);
  const cast=reduce(g,{type:'play',idx:0}),enter=track(cast.state);assert.equal(enter.entered,true);assert.equal(enter.changes.length,4,'equal stats still communicate the mode swap');assert.equal(enter.changes[0].before.atk,5);assert.equal(enter.changes[0].before.hp,6);assert.equal(enter.changes[0].after.atk,6);assert.equal(enter.changes[0].after.hp,5);assert.equal(enter.changes[0].after.hurt,false);assert.equal(track(cast.state).changes.length,0,'duplicate snapshot');
  const reconnect=createTrickRoomTracker()(cast.state);assert(reconnect.initial&&reconnect.active&&!reconnect.changes.length,'reconnect restores state without replay');
  const one=reduce(cast.state,{type:'endTurn'});assert.equal(track(one.state).changes.length,0);
  one.state.players[one.state.cur].hand=[{...DB.TRICKROOM,uid:'extend'}];one.state.players[one.state.cur].mana=20;
  const extended=reduce(one.state,{type:'play',idx:0});assert.equal(extended.state.trickLeft,2);assert.equal(track(extended.state).changes.length,0,'extension does not exchange twice');
  const later=reduce(extended.state,{type:'endTurn'});track(later.state);const end=reduce(later.state,{type:'endTurn'}),exit=track(end.state);assert(exit.exited);assert.equal(exit.changes.length,4);assert.equal(exit.changes[0].after.atk,5);assert.equal(exit.changes[0].after.hp,6);
 }
 const mutable=fixture(0),track=createTrickRoomTracker();track(mutable);mutable.trickLeft=2;mutable.players[0].field[0].trickSwapped=true;assert.equal(track(mutable).changes.length,1,'in-place mutation');
 mutable.players[0].field.push({...DB.M4,uid:'new',atk:4,def:3,trickSwapped:true});assert.equal(track(mutable).changes.length,0,'new summon is baseline');
 const moved=mutable.players[0].field.shift();moved.trickSwapped=false;mutable.players[1].field.push(moved);assert.equal(track(mutable).changes.length,0,'ownership transfer is baseline');
 mutable.over=true;mutable.players[1].field[0].trickSwapped=true;assert.equal(track(mutable).changes.length,0,'no exchange after match end');
 const board=await readFile('client/src/ui/boardView.ts','utf8'),rise=await readFile('client/src/ui/statRise.ts','utf8');assert(board.includes('this.trickRoom.present(trick)')&&board.includes('this.trickRoom.dispose()'));assert(rise.includes('handled.has(m.uid)'),'ordinary gain/loss effects excluded for selected exchange');
 console.log('PASS Trick Room: real reducer both owners, current HP, equal values, extension, two-turn release, repeat/reconnect, in-place state, summon/transfer/over and runtime ownership');
}finally{await rm(dir,{recursive:true,force:true});}
