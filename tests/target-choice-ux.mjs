import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
const dir=await mkdtemp('/tmp/lore-target-ux-');
try {
 await build({stdin:{contents:`export * from './client/src/shared/cards';export * from './client/src/shared/engine';export * from './client/src/shared/playIntent';export * from './client/src/shared/protocol';export {greedyDecide} from './client/src/shared/bot';export * from './server/src/gameInput';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/e.mjs'});
 const E=await import(dir+'/e.mjs');let seq=0,count=0;
 const card=id=>({...structuredClone(E.DB[id]??E.STARTERS[id]),uid:'ux-'+(++seq)});
 const mon=id=>({...card(id),dmg:0,tempAtk:0,atkMod:0,defMod:0,exhausted:false,summonedTurn:0});
 const fresh=()=>{const g=E.createGame({mode:'online',seed:41,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;g.turn=3;g.pending=null;for(const p of g.players)Object.assign(p,{hp:100,mana:30,maxMana:30,shield:0,dew:0,hand:[],deck:[],discard:[],field:[],enchants:[],traps:[],quests:[],removed:[],exile:[],uses:{},usesTurn:{},playsTurn:0});return g;};
 const step=(g,a)=>E.reduce(g,a).state;
 const reviewed=(g,c,targets)=>E.reduce(g,{type:'play',idx:g.players[g.cur].hand.findIndex(h=>h.uid===c.uid),sourceUid:c.uid,...(targets===undefined?{}:{targets})});
 const check=(label,fn)=>{fn();count++;console.log('PASS',label);};
 const culls=n=>Array.from({length:n},()=>card('STARTER_TRASH'));
 for(const owner of [0,1])for(const n of [0,1,4])check(`Sword either-side choice, exact amount and casting-turn expiry (${owner}/${n})`,()=>{
  let g=fresh();g.cur=owner;g.players[owner].removed=culls(n);g.players[1-owner].field=[mon('M1')];const target=g.players[1-owner].field[0];target.tempAtk=2;const c=card('SELECTED_SWORD');g.players[owner].hand=[c];
  assert(E.playIntent(g,owner,c).pool.some(m=>m.uid===target.uid));
  g=reviewed(g,c,[target.uid]).state;assert.equal(g.pending,null);assert.equal(g.players[1-owner].field[0].tempAtk,n+2);assert.equal(g.players[owner].mana,29);assert.equal(g.players[owner].removed.at(-1).id,c.id);
  g=step(g,{type:'endTurn'});assert.equal(g.players[1-owner].field[0].tempAtk,2,'only this cast bonus expires');
 });
 check('Sword empty board / enemy Aura / invalid target rejected before costs',()=>{
  for(const scenario of ['empty','aura','bogus','zero']){let g=fresh();const c=card('SELECTED_SWORD');g.players[0].hand=[c];if(scenario!=='empty'){const m=mon('M1');if(scenario==='aura')m.passive=['aura'];g.players[1].field=[m];}
   const before=structuredClone(g);const uid=g.players[1].field[0]?.uid??'missing';const r=reviewed(g,c,scenario==='zero'?[]:[scenario==='bogus'?'fake':uid]);assert.deepEqual(r.state,before);assert.deepEqual(r.events,[]);
  }
 });
 check('Legacy Sword choice may be declined; timeout never buffs enemy; bot chooses ally',()=>{
  let g=fresh();g.players[0].removed=culls(4);g.players[1].field=[mon('M1')];g.players[0].hand=[card('SELECTED_SWORD')];g=step(g,{type:'play',idx:0});assert(g.pending.allowCancel);const stopped=E.resolveTurnTimeout(g).state;assert.equal(stopped.players[1].field[0].tempAtk,0);assert.equal(stopped.cur,1);
  assert.equal(E.greedyDecide(g).uid,null);g=step(g,{type:'pick',uid:null});assert.equal(g.pending,null);
 });
 check('Preview is pure, hides traps, canonicalizes deck order, never exposes draw or RNG',()=>{
  const g=fresh();g.players[0].deck=[card('M2'),card('M1')];g.players[1].traps=[{card:{...card('M1'),t:'trap',react:'secret'}}];
  const before=structuredClone(g);const plan=E.playIntent(g,0,{...card('S15'),act:'destroyTrap'});assert(plan.pool.every(c=>c.id==='HIDDEN'&&c.text==='?'&&!c.react));
  const seek=E.playIntent(g,0,card('S6'));assert.deepEqual(seek.pool.map(c=>c.id),['M1','M2']);assert.deepEqual(g,before);
 });
 check('Stale source / forged / duplicate selections cannot spend or trigger effects',()=>{
  const g=fresh();const c=card('DOUBLE_EXEC');g.players[0].hand=[c];g.players[1].field=[mon('M1'),mon('M2')];
  for(const a of [{type:'play',idx:0,sourceUid:'stale',targets:[g.players[1].field[0].uid]},{type:'play',idx:0,sourceUid:c.uid,targets:['fake']},{type:'play',idx:0,sourceUid:c.uid,targets:[g.players[1].field[0].uid,g.players[1].field[0].uid]}])assert.deepEqual(E.reduce(g,a),{state:g,events:[]});
  for(const targets of [true,{},[null],Array(100).fill('uid')])assert(!E.isClientMessage({type:'action',action:{type:'play',idx:0,sourceUid:c.uid,targets}}));
 });
 check('Optional zero targets is an explicit cast; mandatory Sword is not',()=>{
  const g=fresh();const c=card('S15');g.players[0].hand=[c];g.players[0].field=[mon('M1')];const r=reviewed(g,c,[]).state;assert.equal(r.pending,null);assert.equal(r.players[0].field.length,1);assert.equal(r.players[0].hand.length,0);
 });
 check('Automatic removals stay automatic and risky instead of promising selectable targets',()=>{for(const id of ['WALLBREAK1','SNIPE1']){const g=fresh(),c=card(id);assert.equal(E.playIntent(g,0,c),null);assert(E.needsCastReview(g,0,c));}});
 check('FIRE_BALL lethal self-cost cannot be undone by the preselected enemy target',()=>{let g=fresh();g.players[0].hp=1;const c=card('FIRE_BALL');g.players[0].hand=[c];const r=reviewed(g,c,['player-1']);assert(r.state.over);assert.equal(r.state.winner,1);assert.equal(r.state.players[1].hp,100);assert.equal(r.state.players[0].hand.length,0);});
 check('Invalid own-monster picks preserve the choice and S3 cannot target a tribe',()=>{
  let g=fresh();g.players[0].field=[mon('M1'),mon('TGE3')];g.players[0].hand=[card('S3')];g=step(g,{type:'play',idx:0});
  const before=structuredClone(g.pending);g=step(g,{type:'pick',uid:'not-a-monster'});assert.deepEqual(g.pending,before);
  g=step(g,{type:'pick',uid:g.players[0].field[1].uid});assert.deepEqual(g.pending,before);assert.equal(g.players[0].field[1].atkMod,0);
  g=step(g,{type:'pick',uid:g.players[0].field[0].uid});assert.equal(g.pending,null);assert.equal(g.players[0].field[0].atkMod,3);
 });
 check('Auto-target preview matches actual victim, including own-side and ties',()=>{
  for(const id of ['WALLBREAK1','SNIPE1'])for(const own of [false,true]){
   let g=fresh();const m=mon('M1');m.atk=1;m.def=2;g.players[own?0:1].field=[m];const c=card(id);g.players[0].hand=[c];
   assert.equal(E.automaticCastTargets(g,0,c)[0].uid,m.uid);g=step(g,{type:'play',idx:0});assert(!g.players[own?0:1].field.some(x=>x.uid===m.uid));
  }
 });
 check('Rune echo keeps its second Sword choice instead of silently cancelling it',()=>{
  let g=fresh();g.players[0].removed=culls(4);g.players[0].field=[mon('M1')];g.players[0].enchants=[{card:card('RUNE3'),turns:99,bornTurn:0}];const c=card('SELECTED_SWORD');g.players[0].hand=[c];const uid=g.players[0].field[0].uid;
  g=reviewed(g,c,[uid]).state;assert.equal(g.players[0].field[0].tempAtk,4);assert.equal(g.pending.reason,'SELECTED_SWORD');g=step(g,{type:'pick',uid});assert.equal(g.players[0].field[0].tempAtk,8);assert.equal(g.players[0].mana,29);
 });
 check('Zero shield and risky summon/chest/global effects are reviewed',()=>{const g=fresh();for(const id of ['SELECTED_SHIELD','M5','TGE3','VOID_APOSTLE','STARTER_CHEST','MAGMA_RAIN','HANDRESET','BLOOD_JOY','TRIAL_AREA'])assert(E.needsCastReview(g,0,card(id)),id);assert(!E.needsCastReview(g,0,card('STARTER_TRASH')));});
 // Every metadata-driven preselection must resolve exactly like the original
 // engine's explicit choices. This catches custom IDs overriding legacy act keys.
 let plans=0;
 for(const c0 of Object.values(E.DB)){
  let g=fresh();g.players[0].field=[mon('M1'),mon('M2'),mon('GOLEM1'),mon('GOLEM2'),mon('VAMP5'),mon('INFKNIGHT')];g.players[1].field=[mon('M1'),mon('M2')];g.players[0].field[0].hatch=5;
  g.players[0].deck=[card('GOLEM1'),card('GOLEM2'),card('M3')];g.players[0].discard=[card('M1')];g.players[0].removed=culls(4);g.players[0].enchants=[{card:card('BLACKSMITH'),turns:99,bornTurn:0}];g.players[1].enchants=[{card:card('WORLD_CARE'),turns:99,bornTurn:0}];const c=card(c0.id);g.players[0].hand=[c,card('M2')];
  const plan=E.playIntent(g,0,c);if(!plan||!plan.pool.length||E.playBlockReason(g,0,c))continue;
  const uids=plan.pool.slice(0,Math.max(1,plan.min)).map(c=>c.uid);const actual=reviewed(g,c,uids).state;
  let expected=step(g,{type:'play',idx:0});assert(expected.pending?.reason===plan.reason || c.id==='BLOOD_SECRET',`${c.id}: preview ${plan.reason}, actual ${expected.pending?.reason}`);
  for(const uid of uids)if(expected.pending?.reason===plan.reason)expected=step(expected,{type:'pick',uid});
  if(expected.pending?.reason===plan.reason&&expected.pending.allowCancel)expected=step(expected,{type:'pick',uid:null});
  assert.deepEqual(actual,expected,c.id);plans++;
 }
 console.log(`PASS ${count} safety scenarios + ${plans} catalog target-plan parity cases`);
} finally {await rm(dir,{recursive:true,force:true});}
