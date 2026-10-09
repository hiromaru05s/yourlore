import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const dir = await mkdtemp(path.join(tmpdir(), 'lore-v57-'));
try {
  await build({stdin:{contents:"export * from './client/src/shared/cards'; export * from './client/src/shared/engine'; export * from './client/src/shared/bot'; export * from './server/src/gameInput';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(dir,'game.mjs')});
  const E = await import(path.join(dir,'game.mjs'));
  const {DB, STARTERS, createGame, reduce, resolveTurnTimeout, berserkTargets, monsterCanAttack, playCost, candidates} = E;
  let seq=0, cases=0;
  const card=id=>({...structuredClone(DB[id]??STARTERS[id]),uid:`v57-${++seq}`});
  const mon=(id,extra={})=>({...card(id),exhausted:false,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0,...extra});
  const fresh=(seed=17)=>{const g=createGame({mode:'online',seed,starting:0,p0:{id:'a',name:'A'},p1:{id:'b',name:'B'}}).state;for(const p of g.players)Object.assign(p,{hand:[],deck:[],discard:[],removed:[],field:[],enchants:[],traps:[],quests:[],hp:1000,dew:0,shield:0,mana:30,maxMana:30,uses:{},usesTurn:{}});g.pending=null;g.turn=3;g.phase='main';g.rng=seed;return g;};
  const play=(g,id)=>{g.players[g.cur].hand.push(card(id));return reduce(g,{type:'play',idx:g.players[g.cur].hand.length-1});};
  const test=(name,fn)=>{fn();cases++;console.log('PASS',name);};
  test('catalog, costs and reviewed text',()=>{
    assert.equal(E.BALANCE_VERSION,'v57');
    for(const [id,atk,hp] of [['M11',4,3],['NGA3',3,1],['ELITE',3,3],['GM6_8',12,1],['NGA4',7,1]])assert.deepEqual([DB[id].atk,DB[id].def],[atk,hp]);
    assert.equal(playCost(card('ACID_RAIN')),4);assert.equal(DB.ACID_RAIN.cost,2);
    assert.equal(DB.NGA4.mult,2);assert.equal(DB.VITAL3.onSummon,undefined);
    assert(DB.NGA4.textJa.includes('両プレイヤー'));assert(!DB.VITAL3.textJa.includes('召喚時'));
  });
  test('Mercenary Leader summons one; art doubles to two',()=>{
    for(const art of [false,true]){let g=fresh();if(art)g.players[0].enchants=[{card:card('MERC_ART'),turns:99}];g=play(g,'MERC_LEADER').state;assert.equal(g.players[0].field.filter(m=>m.id==='SOLDIER2').length,art?2:1);}
  });
  for(const ally of ['CASTLE','SOLDIER2','INFKNIGHT','GUNNER','HEAVY_GUNNER',null,'M11','GOLEM1'])test('General summon condition '+ally,()=>{
    let g=fresh();if(ally)g.players[0].field=[mon(ally)];const before=g.players[0].field.filter(m=>m.id==='INFKNIGHT').length;
    if(ally==='CASTLE'){const c=card('GM6_7');c.cost=4;g.players[0].hand=[c];g=reduce(g,{type:'play',idx:0}).state;}else g=play(g,'GM6_7').state;assert.equal(g.players[0].field.filter(m=>m.id==='INFKNIGHT').length-before,['CASTLE','SOLDIER2','INFKNIGHT','GUNNER','HEAVY_GUNNER'].includes(ally)?2:0);
  });
  test('General checks own field and respects capacity',()=>{
    let g=fresh();g.players[1].field=[mon('CASTLE')];g=play(g,'GM6_7').state;assert.equal(g.players[0].field.length,1);
    g=fresh();g.players[0].field=Array.from({length:5},()=>mon('SOLDIER2'));g=play(g,'GM6_7').state;assert.equal(g.players[0].field.length,7);assert.equal(g.players[0].field.filter(m=>m.id==='INFKNIGHT').length,1);
  });
  test('Castle still blocks the normal cost-six General summon',()=>{
    const g=fresh();g.players[0].field=[mon('CASTLE')];
    const r=play(g,'GM6_7');assert.equal(r.state.players[0].field.length,1);
    assert(E.playBlockReason(g,0,card('GM6_7')));
  });
  test('General reacts on exactly six: 600 seeded summons, all six faces',()=>{
    const faces=new Set();let six=0;
    for(let seed=1;seed<=600;seed++){let g=fresh(seed);g.players[1].field=[mon('GM6_7')];const r=play(g,'M1'),rolls=r.events.filter(e=>e.type==='dice'&&e.source.id==='GM6_7');assert.equal(rolls.length,1);const face=rolls[0].rolls[0];faces.add(face);if(face===6)six++;assert.equal(r.state.players[1].field.filter(m=>m.id==='SOLDIER2').length,face===6?1:0);assert(!r.state.players[1].field.some(m=>m.id==='INFKNIGHT'));}
    assert.equal(faces.size,6);assert(six>50&&six<150);
  });
  test('General also rolls for effect summons; opposing Generals terminate at field limits',()=>{
    let g=fresh();g.players[1].field=[mon('GM6_7')];const r=play(g,'MERC_LEADER');assert.equal(r.events.filter(e=>e.type==='dice'&&e.source.id==='GM6_7').length,2);
    for(let seed=1;seed<=200;seed++){g=fresh(seed);g.players[0].field=[mon('GM6_7')];g.players[1].field=[mon('GM6_7')];const r=play(g,'MERC_LEADER');assert(r.events.length<500);assert(r.state.players.every(p=>p.field.length<=7));}
  });
  test('Warlord threshold excludes itself',()=>{for(const n of [0,1,2,3]){let g=fresh();g.players[0].field=Array.from({length:n},()=>mon('SOLDIER2'));g=play(g,'M11').state;assert.equal(g.players[0].field.filter(m=>m.id==='INFKNIGHT').length,n===3?1:0);}});
  test('Warrior Golem adds one conditional counter to initial Guts',()=>{for(const ally of [null,'M1','GOLEM1']){let g=fresh();if(ally)g.players[0].field=[mon(ally)];g=play(g,'NGA3').state;assert.equal(g.players[0].field.at(-1).guts,ally==='GOLEM1'?2:1);}});
  test('Elite nine/ten composition boundary includes hand, deck, graveyard, field',()=>{for(const zone of ['hand','deck','discard','field'])for(const n of [9,10]){let g=fresh();const p=g.players[0];p.deck=Array.from({length:n-2},()=>card('STARTER_TRASH'));if(zone==='field')p.field=[mon('M1')];else p[zone].push(card('M1'));g=play(g,'ELITE').state;assert.equal(g.players[0].field.filter(m=>m.id==='SOLDIER2').length,n===9?2:0,zone+' '+n);}});
  test('Keeper loses summon healing and retains card-play Dew',()=>{let g=play(fresh(),'VITAL3').state;assert.equal(g.players[0].hp,1000);assert.equal(g.players[0].dew,0);g=play(g,'WORLD_CARE').state;assert.equal(g.players[0].dew,1);});
  test('Acid Rain costs four to activate',()=>{for(const mana of [3,4]){const g=fresh();g.players[0].mana=mana;const r=play(g,'ACID_RAIN');assert.equal(r.state.players[0].enchants.length,mana===4?1:0);assert.equal(r.state.players[0].mana,mana===4?0:3);}});
  test('Acid Rain checks every Decay kill: 600 seeds, exact four-plus boundary',()=>{
    const faces=new Set();
    for(let seed=1;seed<=600;seed++){let g=fresh(seed);g.players[0].enchants=[{card:card('ACID_RAIN'),turns:99}];g.players[1].field=[mon('M1',{decayCnt:2})];const r=play(g,'RUST_SLUG');const rolls=r.events.filter(e=>e.type==='dice'&&e.source.id==='ACID_RAIN');assert.equal(rolls.length,1);const face=rolls[0].rolls[0];faces.add(face);assert.equal(r.state.players[1].brand??0,face>=4?1:0);}
    assert.equal(faces.size,6);
  });
  test('Acid Rain never rolls for ordinary combat destruction',()=>{let g=fresh();g.players[0].enchants=[{card:card('ACID_RAIN'),turns:99}];g.players[0].field=[mon('M1',{atk:10})];g.players[1].field=[mon('SOLDIER2')];let r=reduce(g,{type:'attack',uid:g.players[0].field[0].uid});r=reduce(r.state,{type:'chooseTarget',uid:g.players[1].field[0].uid});assert(!r.events.some(e=>e.type==='dice'&&e.source.id==='ACID_RAIN'));assert.equal(r.state.players[1].brand??0,0);});
  test('Berserk pool includes both players and both fields, excludes itself',()=>{const g=fresh(),m=mon('NGA4');g.players[0].field=[m,mon('M1')];g.players[1].field=[mon('M2')];assert.equal(berserkTargets(g,g.players[0],m).length,4);assert(!berserkTargets(g,g.players[0],m).some(t=>t.uid===m.uid));g.players[0].noDirectTurn=true;assert.equal(berserkTargets(g,g.players[0],m).length,2);});
  test('Berserk does not bypass Noble Lord target restrictions',()=>{const g=fresh(),m=mon('NGA4');g.players[0].field=[m];g.players[1].field=[mon('TAR5')];assert.equal(g.players[1].field[0].aura,'eliteGuard');assert.deepEqual(berserkTargets(g,g.players[0],m),[{player:0,uid:null}]);});
  test('Berserk samples all four targets approximately uniformly: 2400 seeds',()=>{
    const counts=[0,0,0,0];
    for(let seed=1;seed<=2400;seed++){let g=fresh(seed),m=mon('NGA4');g.players[0].field=[m,mon('M1',{def:100,passive:[]})];g.players[1].field=[mon('M2',{def:100,passive:[]})];const before=structuredClone(g);const r=reduce(g,{type:'attack',uid:m.uid});assert.deepEqual(g,before);const e=r.events.find(e=>e.type==='attack');assert(e);counts[e.targetUid?(e.targetPlayer===0?0:1):(e.targetPlayer===0?2:3)]++;assert.equal(r.state.players[0].field[0].attacksUsed,1);}
    for(const n of counts)assert(n>480&&n<720,JSON.stringify(counts));console.log('Target sample counts',counts);
  });
  test('Ending turn consumes both attacks and respects prior attacks',()=>{for(const used of [0,1,2]){const g=fresh(),m=mon('NGA4',{attacksUsed:used,exhausted:used===2});g.players[0].field=[m];const r=reduce(g,{type:'endTurn'});assert.equal(r.events.filter(e=>e.type==='attack').length,2-used);assert.equal(r.state.turn,4);}});
  test('Both sides, deterministic replay, serialization and server timeout',()=>{for(const side of [0,1]){const g=fresh();g.cur=side;g.players[side].field=[mon('NGA4')];const a=reduce(g,{type:'endTurn'}),b=resolveTurnTimeout(JSON.parse(JSON.stringify(g)));assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));assert.equal(a.state.cur,1-side);assert.equal(a.events.filter(e=>e.type==='attack').length,2);}});
  test('Attack prohibitions allow ending without deadlock or attack events',()=>{
    for(const blocked of ['zero','exhausted','noAttack','glass','highCost','majesty','noTargets']){
      const g=fresh(),m=mon('NGA4');g.players[0].field=[m];
      if(blocked==='zero')m.atk=0;if(blocked==='exhausted')m.exhausted=true;
      if(blocked==='noAttack')g.players[0].enchants=[{card:{...card('ACID_RAIN'),ench:'noAttack'},turns:99}];
      if(blocked==='glass')g.players[0].enchants=[{card:card('GLASS_BAN'),turns:99}];
      if(blocked==='highCost')g.players[0].noHighAtkTurn=true;
      if(blocked==='majesty'){m.summonedTurn=g.turn;g.players[1].field=[mon('TDE4')];}
      if(blocked==='noTargets')g.players[0].noDirectTurn=true;
      assert(!monsterCanAttack(g,g.players[0],m),blocked);assert(!candidates(g).some(a=>a.type==='attack'),blocked);
      const r=resolveTurnTimeout(g);assert.equal(r.events.filter(e=>e.type==='attack').length,0,blocked);assert.equal(r.state.turn,4,blocked);
    }
  });
  test('Self player damage uses shields and can lose the game',()=>{
    let hits=0;
    for(let seed=1;seed<=100;seed++){const g=fresh(seed),m=mon('NGA4');g.players[0].field=[m];g.players[0].shield=5;const r=reduce(g,{type:'attack',uid:m.uid});const a=r.events.find(e=>e.type==='attack');if(a.targetPlayer!==0)continue;hits++;assert.equal(r.state.players[0].hp,998);assert.equal(r.state.players[0].shield,0);assert.equal(a.contactDamage,2);g.players[0].hp=2;g.players[0].shield=0;const lethal=reduce(g,{type:'endTurn'});assert(lethal.state.over);assert.equal(lethal.state.winner,1);assert.equal(lethal.state.turn,3);}
    assert(hits>30);
  });
  test('World Tree choices resume forced attacks; timeout declines and ends exactly once',()=>{
    for(let seed=1;seed<=100;seed++){
      const g=fresh(seed);g.players[0].field=[mon('NGA4'),mon('WORLD_TREE',{def:100,passive:[]})];g.players[0].dew=2;
      const r=reduce(g,{type:'endTurn'});assert(r.state.pending);assert.equal(r.state.endingTurn.turn,3);
      const resumed=resolveTurnTimeout(JSON.parse(JSON.stringify(r.state)));assert.equal(resumed.state.turn,4);assert.equal(resumed.state.pending,null);assert.equal(resumed.state.endingTurn,undefined);
      const timeout=resolveTurnTimeout(g);assert.equal(timeout.state.turn,4);assert.equal(timeout.state.pending,null);
      assert.equal(timeout.state.players[0].dew,2);
    }
  });
  test('Opposing World Tree may respond to a forced attack',()=>{
    let responses=0;
    for(let seed=1;seed<=100;seed++){
      const g=fresh(seed);g.players[0].field=[mon('NGA4')];g.players[1].field=[mon('WORLD_TREE',{def:100})];g.players[1].dew=2;
      const r=reduce(g,{type:'endTurn'});
      if(r.state.pending?.reason==='WORLD_TREE_DEFEND'){responses++;assert.equal(r.state.pending.owner,1);const resumed=resolveTurnTimeout(r.state);assert.equal(resumed.state.turn,4);assert.equal(resumed.state.pending,null);}
      const timed=resolveTurnTimeout(g);assert.equal(timed.state.turn,4);assert.equal(timed.state.pending,null);
    }
    assert(responses>20);
  });
  test('Counterattack can destroy a mandatory attacker and stop its remaining attacks',()=>{
    let counters=0;
    for(let seed=1;seed<=100;seed++){const g=fresh(seed);g.players[0].field=[mon('NGA4')];g.players[1].field=[mon('INFKNIGHT',{def:100})];const r=reduce(g,{type:'endTurn'});if(r.state.players[0].field.length===0){counters++;assert(r.events.filter(e=>e.type==='attack').length<=2);assert.equal(r.state.turn,4);}}
    assert(counters>20);
  });
  console.log(`PASS ${cases} v57 suites, including 4000+ seeded interaction checks`);
} finally { await rm(dir,{recursive:true,force:true}); }
