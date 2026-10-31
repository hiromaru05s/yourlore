import assert from 'node:assert/strict';import {build} from 'esbuild';import fs from 'node:fs/promises';
const dir=await fs.mkdtemp('/tmp/lore-language-test-');
try{
 await build({stdin:{contents:`export * from './client/src/shared/engine';export * from './client/src/shared/cards';export * from './client/src/shared/pendingText';export {logToEn} from './client/src/shared/logEn';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/engine.mjs',logLevel:'silent'});
 const E=await import(dir+'/engine.mjs');let seq=0,checks=0;const card=id=>({...structuredClone(E.DB[id]??E.STARTERS[id]),uid:'lang-'+(++seq)}),mon=id=>({...card(id),dmg:0,exhausted:false,atkMod:0,defMod:0,tempAtk:0,summonedTurn:0}),ench=id=>({card:card(id),turns:99,bornTurn:0});
 const fresh=()=>{const g=E.createGame({mode:'online',seed:41,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;for(const p of g.players)Object.assign(p,{hp:100,mana:30,maxMana:30,dew:20,shield:0,hand:[],deck:[],discard:[],field:[],traps:[],enchants:[],quests:[],removed:[],uses:{},usesTurn:{},playsTurn:0});g.turn=3;g.pending=null;return g;};
 const step=(g,a)=>E.reduce(g,a).state,play=(g,id)=>{g.players[g.cur].hand.push(card(id));return E.reduce(g,{type:'play',idx:g.players[g.cur].hand.length-1});};
 const foreign=(raw,l)=>{const s=raw.replace(/<b class="log-card"[^>]*>.*?<\/b>/g,'CARD');return l==='en'?/[가-힣ぁ-んァ-ヶ一-龯]/.test(s):l==='ko'?/[ぁ-んァ-ヶ一-龯]/.test(s):/[가-힣]/.test(s);};
 function test(name,fn){fn();checks++;console.log('PASS',name);}
 const pending=(reason,data={},allowCancel=false)=>({kind:'cardChoice',reason,hint:'誤った日本語',hintJa:'잘못된 한국어',allowCancel,data});
 test('every authored choice has three independent locales and current data',()=>{
  for(const reason of [...Object.keys(E.CHOICE_TEXT),...E.DYNAMIC_CHOICE_REASONS])for(const lang of ['ja','ko','en'])for(const data of [{val:1,count:1,shield:4,buff:1,amount:2,left:2},{val:2,count:2,shield:30,buff:4,amount:8,left:1,maxCost:8,anySide:true,noMon:true,first:'x'}]){
   const text=E.pendingText(pending(reason,data,true),lang);assert(!foreign(text,lang),reason+lang+text);assert(!/undefined|NaN/.test(text));
  }
  for(const reason of ['ELF_DESTROY','QUICK_SORT','destroyMon','destroyEnch','bloodSecret','STABLE'])assert(!/return|hand/i.test(E.pendingText(pending(reason,{val:1}),'en')),reason);
  assert.match(E.pendingText(pending('bounceLow'),'en'),/return.*hand/);assert.match(E.pendingText(pending('recall'),'en'),/graveyard.*hand/);assert.match(E.pendingText(pending('exilePick'),'en'),/graveyard.*Rift/);
 });
 test('real Armorer choices expose matching numbers in all languages',()=>{
  for(const id of ['APPRENTICE_ARMORER','VETERAN_ARMORER','SALLY_WEAPONMASTER']){let g=fresh();g.players[0].field=[mon('M1')];g=play(g,id).state;assert.equal(g.pending.reason,'ARMORER_MODE');
   for(const lang of ['ja','ko','en']){assert(!foreign(E.pendingText(g.pending,lang),lang));for(const c of E.effectChoices(g)){const text=c[{ja:'textJa',ko:'text',en:'textEn'}[lang]];assert(!foreign(text,lang));assert(text.includes(String(c.uid==='shield'?g.pending.data.shield:g.pending.data.buff)));}}
   const h=step(g,{type:'pick',uid:'shield'});assert.equal(h.players[0].shield,g.pending.data.shield);
   const b=step(g,{type:'pick',uid:'buff'});assert.equal(b.pending.reason,'ARMORER_TARGET');assert.match(E.pendingText(b.pending,'en'),/other monsters?/);
  }
 });
 test('Elf destroys rather than returning a target to hand',()=>{let g=fresh();g.players[1].field=[{...mon('M1'),atk:9}];const uid=g.players[1].field[0].uid;g=play(g,'ELF').state;assert.equal(g.pending.reason,'ELF_DESTROY');assert.match(E.pendingText(g.pending,'en'),/destroy/);g=step(g,{type:'pick',uid});assert(!g.players[1].field.length);assert(g.players[1].discard.some(c=>c.uid===uid));assert(!g.players[1].hand.length);});
 for(const owner of [0,1])test(`Rich Habit: opponent destruction sets exactly 3, current mana respects the new cap (${owner})`,()=>{
  let g=fresh();g.cur=1-owner;g.players[owner].maxMana=12;g.players[owner].mana=9;const e=ench('RICH_HABIT');g.players[owner].enchants=[e];g=play(g,'DISARM1').state;assert.equal(g.pending.reason,'destroyEnch');const r=E.reduce(g,{type:'pick',uid:e.card.uid});assert.equal(r.state.players[owner].maxMana,3);assert.equal(r.state.players[owner].mana,3);assert.equal(r.state.players[1-owner].maxMana,30);assert(r.state.players[owner].discard.some(c=>c.uid===e.card.uid));assert(r.events.some(e=>e.type==='log'&&/set your max mana to 3/.test(e.htmlEn??'')));
 });
 test('own destruction does not trigger Rich Habit',()=>{let g=fresh();const e=ench('RICH_HABIT');g.players[0].enchants=[e];g.players[1].enchants=[ench('E1')];g=play(g,'DISARM1').state;g=step(g,{type:'pick',uid:e.card.uid});assert.equal(g.players[0].maxMana,30);});
 test('opponent destruction followed by exile still triggers; pure exile does not',()=>{
  let g=fresh();g.players[1].enchants=[ench('RICH_HABIT')];g=play(g,'DISARM3').state;assert.equal(g.players[1].maxMana,3);assert(g.players[1].removed.some(c=>c.id==='RICH_HABIT'));
  g=fresh();const e=ench('RICH_HABIT');g.players[1].enchants=[e];g.pending=pending('RIFT_MATTER',{left:1});g.pending.owner=0;g=step(g,{type:'pick',uid:e.card.uid});assert.equal(g.players[1].maxMana,30);assert(g.players[1].removed.some(c=>c.uid===e.card.uid));
 });
 test('a defending opponent’s trap triggers Rich Habit during its owner’s turn',()=>{
  let g=fresh();const a=mon('M1');g.players[0].field=[a];g.players[0].enchants=[ench('RICH_HABIT')];g.players[1].traps=[{card:{...card('S1'),t:'trap',react:'guardWipe',val:2}}];g=step(g,{type:'attack',uid:a.uid});assert.equal(g.players[0].maxMana,3);assert.equal(g.players[1].maxMana,30);
 });
 test('original turn-start healing is restored alongside the destruction drawback',()=>{
  let g=fresh();g.players[0].enchants=[ench('RICH_HABIT')];g.players[0].deck=Array.from({length:12},()=>card('M1'));const control=structuredClone(g);control.players[0].enchants=[];
  const advance=s=>step(step(s,{type:'endTurn'}),{type:'endTurn'});g=advance(g);const other=advance(control);assert.equal(g.players[0].hp,other.players[0].hp+(g.players[0].hand.length>=4?6:0));assert.equal(g.players[0].maxMana,other.players[0].maxMana+(g.players[0].hand.length>=6?1:0));
 });
 test('every card and common rejection stays in its selected language',()=>{
  for(const c of Object.values({...E.DB,...E.STARTERS}))for(const lang of ['ja','ko','en'])assert(!foreign(c[{ja:'textJa',ko:'text',en:'textEn'}[lang]]??'',lang),c.id+lang);
  for(const c of Object.values(E.DB)){const g=fresh();g.players[0].hand=[{...c,uid:'probe'}];const b=E.playBlockReason(g,0,g.players[0].hand[0]);if(b)for(const lang of ['ja','ko','en'])assert(!foreign(b[lang],lang),c.id+lang+b[lang]);}
 });
 console.log('PASS',checks,'language and Rich Habit scenario groups');
}finally{await fs.rm(dir,{recursive:true,force:true});}
