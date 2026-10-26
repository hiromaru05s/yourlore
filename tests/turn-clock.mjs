import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise real controller methods while keeping visual playback pending. No
// copied timer implementation: a missed state/clock ordering change fails here.
const source=fs.readFileSync('client/src/game/controller.ts','utf8');
const tree=ts.createSourceFile('controller.ts',source,ts.ScriptTarget.Latest,true);
const cls=tree.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='BaseController');
const names=['LOCAL_TURN_SECS','HAND_CAP_BONUS_SECS','applyResult','syncTimer','tickTimer','stopTimer'];
const methods=names.map(name=>cls.members.find(m=>m.name?.getText(tree)===name).getText(tree)).join('\n');
let now=1_000_000,id=0;const intervals=new Map(),banners=[],sounds=[];
const context=vm.createContext({console,Date:{now:()=>now},syncCardEffects(){},syncCardFrames(){},closeOverlay(){},paintTurnUrgency(){},
 document:{querySelector:()=>null,getElementById:()=>null},sfx:name=>sounds.push(name),A:{turnBanner:(...args)=>banners.push(args)},
 clearInterval:key=>intervals.delete(key),window:{setInterval:fn=>{intervals.set(++id,fn);return id;}}});
vm.runInContext(ts.transpileModule(`class BaseController {${methods}};globalThis.Controller=BaseController;`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
const game=(turn,cur,left=50000)=>({turn,cur,over:false,turnLeftMs:left,turnTotalMs:50000,pending:null,players:[{hand:[]},{hand:[]}]});
function fixture(you=0){
 const sent=[],choices=[];
 const c=Object.assign(Object.create(context.Controller.prototype),{
  you,state:game(27,1-you),dead:false,useTurnClock:true,timerKey:'',announcedTimerKey:'',timerLeft:0,timerInt:null,
  turnStartedWall:0,handCapBonusKey:'',presentedHandDiscards:new Set(),queue:Promise.resolve(),fxGen:0,
  openingAbort:{abort(){}},view:{syncTurn(){}},renderTimer(){},
  playResult:()=>new Promise(()=>{}),submit:a=>sent.push(a),onChooseTarget:uid=>choices.push(uid)
 });
 c.syncTimer();return {c,sent,choices};
}
const receive=(c,state)=>c.applyResult({state,events:[]});

for(const you of [0,1]){
 const {c,sent}=fixture(you),oldTick=intervals.get(c.timerInt),beforeBanner=banners.length;
 now+=49000;c.timerLeft=1;
 receive(c,game(28,you));
 assert.equal(c.timerKey,`28:${you}`);assert.equal(c.timerLeft,50);
 assert.equal(c.turnStartedWall,now);assert.equal(banners.length,beforeBanner,'clock receipt must not announce over playback');
 now+=100;oldTick();assert.equal(c.timerLeft,50,'queued old callback cannot even decrement the new clock');
 intervals.get(c.timerInt)();assert.equal(sent.length,0,'fresh turn must not be ended by the old timeout');
 assert.equal(c.timerLeft,49);
 c.syncTimer();c.syncTimer();assert.equal(banners.length,beforeBanner+1,'one deferred announcement');
 now+=50000;c.timerLeft=1;intervals.get(c.timerInt)();assert.equal(sent[0]?.type,'endTurn','real current-turn timeout still ends');
 c.stopTimer();
}
{
 const {c,sent}=fixture();const oldTick=intervals.get(c.timerInt);c.timerLeft=0;now+=50000;
 // Defense if another state path bypasses applyResult.
 c.state=game(28,0);oldTick();assert.equal(c.timerLeft,50);assert.equal(sent.length,0);c.stopTimer();
}
{
 const {c,sent}=fixture();receive(c,game(28,0));const tick=intervals.get(c.timerInt);
 now+=49000;c.timerLeft=1;
 receive(c,game(30,0));tick();assert.equal(c.timerKey,'30:0');assert.equal(c.timerLeft,50);
 assert.equal(sent.length,0,'TIMEWARP-style same player/new turn has its own clock');c.stopTimer();
}
{
 const {c,sent}=fixture();receive(c,game(28,0,4000));now+=5000;
 const pending={...game(28,0,14000),turnTotalMs:60000,pending:{reason:'handCap',allowCancel:false}};
 receive(c,pending);assert.equal(c.timerLeft,14);assert.equal(c.turnTotal,60);
 receive(c,pending);c.syncTimer();assert.equal(c.timerLeft,14,'hand cap bonus is granted once');
 now+=15000;c.timerLeft=1;intervals.get(c.timerInt)();assert.equal(sent[0]?.type,'endTurn','hand-cap timeout fallback remains');c.stopTimer();
}
{
 const {c}=fixture();receive(c,game(28,0));receive(c,game(28,0,3000));assert.equal(c.timerLeft,3,'same-turn reconnect adopts remaining time');
 receive(c,game(28,0,50000));assert.equal(c.timerLeft,3,'stale same-turn snapshot cannot restore time');c.stopTimer();
 const pending={...game(28,0,12000),turnTotalMs:60000,pending:{reason:'handCap'}};
 receive(c,pending);assert.equal(c.timerKey,'','initial/rejoin startup remains deferred until playback');c.syncTimer();
 assert.equal(c.timerLeft,12);assert.equal(c.turnTotal,60,'reconnect includes server bonus without adding twice');c.stopTimer();
}
{
 const {c,sent,choices}=fixture();receive(c,game(28,0));now+=5000;c.timerLeft=1;
 c.state.pending={allowCancel:true};intervals.get(c.timerInt)();assert.equal(choices.length,1);assert.equal(choices[0],null);assert.equal(sent.length,0);c.stopTimer();
}
{
 const {c,sent}=fixture();now+=60000;c.timerLeft=1;intervals.get(c.timerInt)();assert.equal(sent.length,0,'opponent expiry sends no action');c.stopTimer();
 receive(c,game(1,0));assert.equal(c.timerInt,null,'opening receipt does not start a clock');
 c.useTurnClock=false;c.syncTimer();assert.equal(c.timerInt,null,'tutorial clock remains disabled');
 c.useTurnClock=true;c.syncTimer();receive(c,{...game(1,0),over:true});assert.equal(c.timerInt,null,'game over cancels immediately');
}
assert.equal(intervals.size,0);
console.log('PASS turn clock: both sides, queued old callbacks, delayed playback, announcement once, same-player skip, expiry, hand-cap bonus/fallback, reconnect, opening, disabled clock and game over');
