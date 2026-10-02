import { DB, STARTERS } from '../../shared/cards';
import type { Scene } from './catalog';

/** Deterministic presentation fixtures, not a replacement for engine.reduce.
 * Caller restores the arranged baseline before every applyStage, including seeks.
 * A focus spell is a public, enlarged effect source in GameView's field rail;
 * its real persistent copy is placed in enchants when its effect needs one.
 * previewB contains labels/choice outcomes only; it never activates game overlays. */
const def = (id:string):any => (DB as any)[id] ?? (STARTERS as any)[id];
const make = (id:string,uid:string):any => {
  if (!def(id)) throw new Error(`B fixture: unknown card ${id}`);
  const c = {...structuredClone(def(id)),uid,exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0};
  if(c.hatchTurns){c.hatch=c.hatchTurns;c.dur=c.hatchDur;}
  return c;
};
const focus = (p:any,s:number)=>p.field.find((m:any)=>m.uid===`focus-${s}`);
const ally = (p:any,s:number)=>p.field.find((m:any)=>m.uid===`ally-${s}`);
const set = (p:any,s:number,id:string,slot='focus')=>{
  const uid=`${slot}-${s}`, c=make(id,uid), i=p.field.findIndex((m:any)=>m.uid===uid);
  if(i<0)p.field.push(c);else p.field[i]=c;
  return c;
};
const give = (p:any,id:string,uid:string)=>p.hand.push(make(id,uid));
const add = (p:any,id:string,uid:string)=>{const c=make(id,uid);p.field.push(c);return c;};
const enchant = (p:any,id:string,uid:string,cnt=0,turns?:number)=>{
  let e=p.enchants.find((e:any)=>e.card.id===id);
  if(!e){e={card:make(id,uid),turns:turns??def(id).val??99,bornTurn:3,cnt};p.enchants.push(e);}
  return e;
};
const leave = (p:any,uid:string,rift=false)=>{
  const c=p.field.find((m:any)=>m.uid===uid);if(!c)return;
  p.field=p.field.filter((m:any)=>m.uid!==uid);(rift?p.removed:p.discard).push(c);
};
const wipe = (p:any)=>{p.discard.push(...p.field,...p.enchants.map((e:any)=>e.card),...p.traps.map((t:any)=>t.card),...(p.quests??[]).map((q:any)=>q.card));p.field=[];p.enchants=[];p.traps=[];p.quests=[];};
const damage=(p:any,n:number)=>{const absorbed=Math.min(p.shield??0,n);p.shield=(p.shield??0)-absorbed;p.hp-=n-absorbed;};
const buff=(m:any,a:number,h:number)=>{if(m){m.atkMod+=a;m.defMod+=h;}};
const draw=(p:any,n:number)=>{for(let i=0;i<n;i++)if(p.deck.length)p.hand.push(p.deck.shift());};
const info=(g:any,text:string)=>{g.previewB={...(g.previewB??{}),phase:text};};
const supply=(p:any,s:number,fresh=false)=>{p.supply=(fresh?['VITAL2','HPS_SCALE','MERCH2','GRAPE2']:['M1','M2','M4','M5']).map((id,i)=>make(id,`supply-${s}-${fresh?'new':'old'}-${i}`));};
const nativeEnchantment=(p:any,id:string,s:number)=>enchant(p,id,`persistent-${s}-${id}`);
const eggs=['TGE1','DRAGON_EGG','BEAST_EGG'];
const dragons=['D_BLACK','D_RED','D_BLUE'];
const origins=['TGE2','TGE3','TGE4','TGE5','TGE6','TGE7'];
const dewSources=['NOURISHING_RAIN','WORLD_CARE','WORLD_HEART','WORLD_TREE','VITAL2','VITAL3','ELF_HAVEN','ELF','DARK_ELF','HIGH_ELF','ELDER_ELF_KING','PRIEST','HIGH_PRIEST','DESERTIFICATION'];

export function arrange(g:any,scene:Scene,chosen:string,side:number):void {
  const p=g.players[side],o=g.players[1-side];
  g.cur=side;g.over=false;g.winner=null;g.pending=null;g.phase='main';
  for(const [s,q] of g.players.entries()){
    q.removed=[];q.enchants=[];q.quests=[];q.traps=[];q.dew=0;q.shield=0;q.brand=0;q.refreshTokens=0;q.freeBuysTurn=0;q.tribesFired=[];
    q.bonusDrawPerm=0;q.uses={};q.buysTurn={};q.playsTurn=0;q.mana=8;q.maxMana=12;q.hp=s===side?26:60;
    q.expansion={turn:g.turn,extraDraw:0,firePlayed:[],fireDiscount:0,dominion:0};
    q.deck=['M3','TGE2','GRAPE','TGE4','MERCH1','WINE'].map((id,i)=>make(id,`deck-${s}-${i}`));
    q.discard=[make('TGE3',`shelf-${s}`)];q.hand=[make('STARTER_CHEST',`hand-${s}`),make('STARTER_MANA',`mana-${s}`)];
    q.field=[make(s===side?chosen:'M4',`focus-${s}`),make('M5',`ally-${s}`),make('M2',`third-${s}`)];
    supply(q,s);
  }
  g.market=['M1','M2','M3','M4','M5','MERCH1','GRAPE2'].map((id,i)=>make(id,`market-${i}`));g.marketStock=Array(7).fill(3);
  g.previewB={scene:scene.id,chosen,side,phase:'発生元・対象を配置',simulated:true};
  // Context makes each chosen card's condition explicit without executing unrelated triggers.
  if(scene.family==='origin'){set(p,side,'TGE2','ally');set(p,side,'TGE3','third');}
  if(scene.family==='elf'||scene.family==='tree'){
    p.dew=chosen==='ELDER_ELF_KING'?12:chosen==='HIGH_ELF'?10:chosen==='WORLD_TREE'?8:4;
    enchant(p,'WORLD_SEED',`context-tree-${side}`);
    if(chosen==='DARK_ELF')set(p,side,'MERCENARY','ally');
  }
  if(chosen==='D_BLACK')o.removed=['STARTER_TRASH','M1','M2'].map((id,i)=>make(id,`enemy-rift-${i}`));
  if(chosen==='DARK_ELF'||chosen==='HIGH_ELF')o.shield=12;
  if(chosen==='ELF')focus(o,1-side).atkMod=7;
  if(chosen==='TPO5')set(o,1-side,'M7');
  if(chosen==='WORLD_BLESS')give(p,'HALF_ELF',`blessing-condition-${side}`);
  if(chosen==='RICH_HABIT')for(let i=0;i<4;i++)give(p,'GRAPE',`rich-hand-${side}-${i}`);
  if(chosen==='ELDER_ELF_KING')enchant(o,'KIN_CALL',`enemy-permanent-${side}`);
  if(chosen==='GM6_0'||scene.id==='A112')set(p,side,chosen==='ANTIQUE_DK'||chosen==='INFKNIGHT'?'INFKNIGHT':'SOLDIER2','ally');
  if(chosen==='LAND_GRANT')set(p,side,'CASTLE','third');
  if(chosen==='ORIGIN_MIMIC'){set(p,side,'MIMIC','ally');p.discard.push(make('MIMIC2','shelf-mimic'));p.removed.push(make('MIMIC','rift-mimic'));}
  if(['BREWING','FARM_KEEPER'].includes(chosen)||['A131','A132'].includes(scene.id)){
    enchant(p,'BREWING',`brewing-${side}`,0,1);give(p,'GRAPE',`grape-${side}`);give(p,'GRAPE2',`grape2-${side}`);
  }
  if(chosen==='WINE_COLLECTOR'){give(p,'WINE',`wine-one-${side}`);give(p,'WINE',`wine-two-${side}`);}
  if(['GUILD_CO','SLUM','MERCH1','MERCH2'].includes(chosen)||scene.id==='A130')enchant(p,'GUILD_CO',`guild-${side}`,19);
  if(chosen==='ANCIENT_CIV'||scene.id==='A133')enchant(p,'ANCIENT_CIV',`civilization-${side}`,0,99).bornTurn=g.turn-9;
  if(['INCUBATOR','INCUBATOR_S','EGG_MASTER'].includes(chosen))set(p,side,'BEAST_EGG','ally');
  if(chosen==='EGG_HUNTER')set(o,1-side,'DRAGON_EGG');
  if(chosen==='PRIEST'||chosen==='HIGH_PRIEST')p.dew=0;
  if(chosen==='SHIELD_TITAN')p.previousOpponentShieldPeak=20;
  if(chosen==='SELECTED_SHIELD'||chosen==='SELECTED_SWORD')p.removed=Array.from({length:5},(_,i)=>make('STARTER_TRASH',`cull-${side}-${i}`));
  switch(scene.id){
    case 'A006':set(p,side,chosen==='VAMP_PACT'?'VAMP_PACT':'BUDGET');break;
    case 'A008':set(p,side,'GENESIS_SONG');set(p,side,'M5','ally');set(p,side,'M2','third');break;
    case 'A010':set(p,side,'TPO3');break;
    case 'A016':set(p,side,'TPO1');set(o,1-side,'M2');break;
    case 'A047':if(chosen!=='ND5')focus(p,side).passive=(focus(p,side).passive??[]).filter((x:string)=>x!=='aura');break;
    case 'A053':if(chosen==='GUILD_CO')enchant(p,chosen,`counter-${side}`,19);else if(chosen==='M9')p.refreshTokens=0;else focus(p,side).gcount=chosen==='CASINO'?11:chosen==='CASTLE'?1:2;break;
    case 'A064':p.field.forEach((m:any)=>m.dmg=Math.min(2,(m.def??1)-1));o.field.forEach((m:any)=>m.dmg=Math.min(2,(m.def??1)-1));break;
    case 'A065':if(chosen==='HERMIT')p.field=p.field.filter((m:any)=>m.t!=='mon');if(chosen==='MEDITATE')p.maxMana=11;break;
    case 'A061':if(chosen==='TGE7')mDisableAura(p,side);if(chosen==='PACK_INSTINCT'){set(p,side,'M4','ally');set(p,side,'M4','third');}break;
    case 'A075':if(chosen==='TGE7'){set(p,side,'TGE2','ally');set(p,side,'TGE3','third');}else if(chosen==='GEM_RAIN'){set(p,side,'MIMIC','ally');ally(p,side).atkMod=3;enchant(p,chosen,`rain-${side}`);}else {ally(p,side).tempAtk=chosen==='SELECTED_SWORD'?5:3;}break;
    case 'A105':case 'A106':if(chosen==='EGG_HUNTER')set(p,side,'DRAGON_EGG','ally');break;
    case 'A107':set(p,side,['INCUBATOR','INCUBATOR_S','EGG_MASTER'].includes(chosen)?chosen:'INCUBATOR');set(p,side,'DRAGON_EGG','ally');break;
    case 'A108':set(p,side,'TGE1');focus(p,side).hatch=1;break;
    case 'A109':set(p,side,'DRAGON_EGG');focus(p,side).hatch=1;break;
    case 'A110':set(p,side,'BEAST_EGG');focus(p,side).hatch=1;break;
    case 'A111':o.removed=['STARTER_TRASH','M1','M2'].map((id,i)=>make(id,`enemy-rift-${i}`));break;
    case 'A112':set(p,side,'GM6_0');break;
    case 'A123':p.dew=12;set(p,side,'ELDER_ELF_KING');enchant(o,'KIN_CALL',`wipe-enchant-${side}`);break;
    case 'A124':p.dew=8;set(p,side,'WORLD_TREE');break;
    case 'A125':set(p,side,'HALF_ELF');enchant(p,'WORLD_SEED',`tree-condition-${side}`);break;
    case 'A131':if(chosen!=='WINE_COLLECTOR')set(p,side,'BREWING');break;
    case 'A132':set(p,side,'FARM_KEEPER');break;
    case 'A133':set(p,side,'ANCIENT_CIV');break;
    case 'A137':set(p,side,'TPO2');break;
    case 'A138':set(p,side,'TGE5');o.field=o.field.slice(0,1);break;
    case 'A146':g.market[0]=make(chosen,'market-0');break;
    case 'A147':p.refreshTokens=1;break;
    case 'A148':g.marketStock[0]=1;break;
    case 'A151':if(chosen==='ELF_HAVEN')enchant(p,chosen,`haven-${side}`);if(['KIN_CALL','TRIBE_PACT'].includes(chosen)){enchant(p,chosen,`discount-${side}`);set(p,side,'TGE2','ally');}break;
    case 'A165':p.field=[make('TPO1',`focus-${side}`),make('TPO2',`ally-${side}`)];break;
    case 'A166':p.field=[make('TAR1',`focus-${side}`),make('TAR2',`ally-${side}`)];break;
    case 'A170':case 'A171':case 'A172':case 'A173':{
      const n={A170:2,A171:3,A172:4,A173:6}[scene.id]!;
      p.field=Array.from({length:n},(_,i)=>make(`TGE${i+1}`,i===0?`focus-${side}`:i===1?`ally-${side}`:i===2?`third-${side}`:`synergy-${side}-${i}`));
      p.tribesFired=[2,3,4].filter(x=>x<n).map(x=>`시초:${x}`);break;
    }
    case 'A181':p.quests=[{card:make('Q_TOWN',`town-${side}`),progress:0,townSeen:[],startedTurn:g.turn}];break;
    case 'N001':p.dew=4;o.dew=7;if(chosen==='WORLD_TREE')p.dew=8;if(chosen==='HIGH_ELF')p.dew=10;if(chosen==='ELDER_ELF_KING')p.dew=12;if(chosen==='DARK_ELF')o.shield=6;break;
    case 'N002':p.dew=chosen==='HIGH_ELF'?10:0;p.shield=0;o.shield=chosen==='SPEAR_AND_SHIELD'?1:12;if(chosen==='BLACKSMITH'){enchant(p,chosen,`smith-${side}`);set(p,side,'PRIEST','ally');}if(chosen==='DEFENSIVE_STANCE'||chosen==='IRON_WALL'){set(p,side,'GOLEM1','ally');set(p,side,'GOLEM2','third');}break;
  }
}

function mDisableAura(p:any,s:number){const m=focus(p,s);if(m)m.aura=undefined;}

function hatch(g:any,p:any,o:any,s:number,result:string,stage:number){
  const m=focus(p,s);if(stage===1){m.hatch=0;return;}
  p.removed.push({...m});set(p,s,result);
  if(stage>=3)cardEffect(g,p,o,s,result,3);
}
function guild(p:any,s:number,amount:number,stage:number){
  const e=enchant(p,'GUILD_CO',`guild-${s}`,19);e.cnt+=amount;
  if(stage>=3)while(e.cnt>=20){e.cnt-=20;give(p,'DARK_MERCHANT',`merchant-reward-${s}-${p.hand.length}`);}
}
function wineCollector(p:any,s:number,stage:number){
  if(stage<2)return;const wines=p.hand.filter((c:any)=>c.id==='WINE').slice(0,2);
  if(wines.length!==2)return;
  p.hand=p.hand.filter((c:any)=>!wines.includes(c));p.removed.push(...wines);
  if(stage>=3){give(p,'DARK_MERCHANT',`wine-trade-${s}`);leave(p,`focus-${s}`,true);}
}
function ferment(p:any,s:number,stage:number){
  const e=enchant(p,'BREWING',`brewing-${s}`,0,1);
  if(stage>=1){const grapes=p.hand.filter((c:any)=>c.id==='GRAPE'||c.id==='GRAPE2');p.hand=p.hand.filter((c:any)=>!grapes.includes(c));p.discard.push(...grapes);e.cnt=grapes.reduce((n:number,c:any)=>n+(c.id==='GRAPE2'?3:1),e.cnt??0);}
  if(stage>=2)e.turns=0;
  if(stage>=3){for(let i=0;i<e.cnt;i++)give(p,'WINE',`wine-${s}-${i}`);p.enchants=p.enchants.filter((x:any)=>x!==e);p.discard.push(e.card);}
}
function dragon(p:any,o:any,id:string,stage:number){
  if(stage<2)return;
  if(id==='D_BLACK'){o.field.forEach((m:any)=>m.defMod-=3);for(const m of [...o.field])if((m.def??0)+m.defMod-(m.dmg??0)<=0)leave(o,m.uid);if(stage>=3)o.discard.push(...o.removed.splice(0,8));}
  if(id==='D_RED')damage(o,15);
  if(id==='D_BLUE')p.hp+=20;
}
function shield(g:any,p:any,o:any,_s:number,id:string,stage:number){
  if(['ARMOR_BREAK','SPEAR_AND_SHIELD','HIGH_ELF'].includes(id)){
    if(stage>=2){const before=o.shield;if(id==='ARMOR_BREAK'){o.shield=Math.max(0,before-9);if(before>=10)o.brand++;}else if(id==='HIGH_ELF'||before<p.field.reduce((n:number,m:any)=>n+(m.atk??0)+m.atkMod,0))o.shield=0;if(id==='HIGH_ELF')p.dew*=2;}return;
  }
  const amounts:any={APPRENTICE_ARMORER:4,VETERAN_ARMORER:10,SALLY_WEAPONMASTER:30,PRIEST:6,HIGH_PRIEST:9,BLACKSMITH:12,SHIELD_TITAN:10,SELECTED_SHIELD:5,DEFENSIVE_STANCE:7,IRON_WALL:12};
  const amount=amounts[id]??6;
  if(stage>=1){p.shield=amount;p.shieldExpiresTurn=g.turn+1;p.shieldOpponentPeak=amount;if(id==='PRIEST')p.dew+=2;if(id==='HIGH_PRIEST')p.dew+=3;if(id==='BLACKSMITH')p.dew+=2;}
  if(stage>=2)damage(p,4);
  if(stage>=3){p.previousOpponentShieldPeak=amount;p.shield=0;delete p.shieldExpiresTurn;}
}
function dew(g:any,p:any,o:any,s:number,id:string,stage:number){
  // Baseline resource recovery deliberately precedes turn-start resource grants.
  const before=p.dew;
  if(stage>=1)p.hp+=before*(id==='WORLD_TREE'||id==='ELF'?2:1);
  if(stage<2)return;
  const gains:any={NOURISHING_RAIN:1,WORLD_CARE:1,WORLD_HEART:2,WORLD_TREE:3,VITAL2:1,VITAL3:1,ELF_HAVEN:1,ELF:2,PRIEST:2,HIGH_PRIEST:3};
  if(id==='DESERTIFICATION')o.dew=0;
  else if(id==='DARK_ELF'){p.dew-=4;if(o.shield>0)damage(o,10);}
  else if(id==='HIGH_ELF'){p.dew*=2;o.shield=0;}
  else if(id==='ELDER_ELF_KING'){p.dew*=3;wipe(o);}
  else p.dew+=gains[id]??0;
  if(id==='WORLD_HEART')p.hp+=2;
  if(id==='VITAL2')p.hp+=3;
  if(id==='VITAL3')p.hp+=5;
  if(id==='PRIEST')p.shield+=6;
  if(id==='HIGH_PRIEST')p.shield+=9;
  if(stage>=3&&id==='WORLD_TREE'){p.dew--;buff(ally(p,s),6,0);}
  info(g,`保有雫${before}で開始時回復 → ${id==='DESERTIFICATION'?'相手の雫を0':`雫${p.dew}`}（回復そのものは雫を消費しない）`);
}

/** Card-specific series branches. Every S selection either has an explicit effect
 * below or is a vanilla body/passive reveal; no random effect is invented. */
function cardEffect(g:any,p:any,o:any,s:number,id:string,stage:number){
  const m=focus(p,s),a=ally(p,s);if(stage<2)return;
  switch(id){
    case 'HALF_ELF':nativeEnchantment(p,'WORLD_CARE',s);if(stage>=3)p.dew++;break;
    case 'ELF':p.dew+=2;leave(o,`focus-${1-s}`);break;
    case 'DARK_ELF':p.dew-=4;if(o.shield>0)damage(o,10);break;
    case 'HIGH_ELF':if(stage>=2){const cards=o.hand.filter((c:any)=>!c.passive?.includes('relic')).slice(0,3);o.hand=o.hand.filter((c:any)=>!cards.includes(c));o.removed.push(...cards);}if(stage>=3){o.shield=0;p.dew*=2;}break;
    case 'ELDER_ELF_KING':wipe(o);if(stage>=3)p.dew*=3;break;
    case 'ELF_HAVEN':nativeEnchantment(p,id,s);p.freeBuysTurn=1;p.dew++;p.discard.push(make('WORLD_HEART',`free-world-${s}`));break;
    case 'WORLD_TREE':p.hp+=p.dew*2;if(stage>=3)p.dew+=3;break;
    case 'WORLD_CARE':nativeEnchantment(p,id,s);p.dew++;break;
    case 'WORLD_HEART':nativeEnchantment(p,id,s);p.dew+=2;p.hp+=2;break;
    case 'WORLD_SEED':nativeEnchantment(p,id,s);p.maxMana++;break;
    case 'WORLD_BLESS':nativeEnchantment(p,id,s);p.maxMana+=4;break;
    case 'QUICK_WORLD':nativeEnchantment(p,'WORLD_HEART',s);if(stage>=3){p.dew+=2;p.hp+=2;}break;
    case 'VITAL2':p.hp+=3;if(stage>=3)p.dew++;break;
    case 'VITAL3':p.hp+=5;if(stage>=3){p.dew++;nativeEnchantment(p,'WORLD_CARE',s);}break;
    case 'GM6_0':case 'DRAGON_RIDER':case 'ANTIQUE_DK':{
      if(id!=='GM6_0')break;
      leave(p,`ally-${s}`);leave(p,`focus-${s}`);if(stage>=3)set(p,s,'DRAGON_RIDER');break;
    }
    case 'M7':leave(o,`focus-${1-s}`);m.attacksUsed=1;m.exhausted=false;break;
    case 'GM5_3':damage(o,3);break;
    case 'DRAGON_EGG':hatch(g,p,o,s,'D_RED',stage);break;
    case 'BEAST_EGG':hatch(g,p,o,s,'DIVINE',stage);break;
    case 'TGE1':hatch(g,p,o,s,'TGE2',stage);break;
    case 'D_BLACK':case 'D_RED':case 'D_BLUE':dragon(p,o,id,stage);break;
    case 'DIVINE':p.maxMana+=15;p.bonusDrawPerm++;if(stage>=3)for(const foe of [...o.field].slice(0,3))leave(o,foe.uid);break;
    case 'EGG_HUNTER':{const egg=focus(o,1-s);if(egg){egg.dur-=6;if(egg.dur<=0)leave(o,egg.uid);}break;}
    case 'EGG_MASTER':for(const egg of p.field)if(egg.hatch!=null)egg.dur+=5;break;
    case 'INCUBATOR':case 'INCUBATOR_S':if(a)a.hatch=Math.max(0,a.hatch-def(id).val);break;
    case 'ANCIENT_CIV':p.maxMana--;if(stage>=3){give(p,'DRAGON_EGG',`excavated-${s}`);p.enchants=p.enchants.filter((e:any)=>e.card.id!==id);leave(p,`focus-${s}`);}break;
    case 'TGE2':buff(a,2,0);break;
    case 'TGE3':damage(p,3);break;
    case 'TGE4':o.brand++;p.onceUsed=['TGE4'];break;
    case 'TGE5':nativeEnchantment(p,'ORIGIN_RITE',s);break;
    case 'TGE6':draw(p,1);if(stage>=3){p.mana-=5;p.discard.push(make('TGE5',`giant-trade-${s}`));}break;
    case 'TGE7':break; // Real effAtk/effDef reads its existing originLord aura.
    case 'ORIGIN_MIMIC':buff(m,6,6);break;
    case 'GENESIS_SONG':{const one=p.deck.find((c:any)=>c.id==='TGE2'),two=p.discard.find((c:any)=>c.id==='TGE3');if(one){p.deck=p.deck.filter((c:any)=>c!==one);add(p,'TGE2',`song-deck-${s}`);}if(stage>=3&&two){p.discard=p.discard.filter((c:any)=>c!==two);add(p,'TGE3',`song-shelf-${s}`);}break;}
    case 'GENESIS_MAGIC':p.field.filter((c:any)=>c.tribe==='시초').forEach((c:any)=>buff(c,5,5));break;
    case 'ORIGIN_RITE':nativeEnchantment(p,id,s);add(p,'TGE2',`rite-trigger-${s}`);leave(o,`focus-${1-s}`);break;
    case 'TPO1':{const target=focus(o,1-s);if(target){o.field=o.field.filter((c:any)=>c!==target);o.hand.push(target);}break;}
    case 'TPO2':{const victim=focus(o,1-s);if(victim){buff(m,victim.cost,victim.cost);leave(o,victim.uid);}break;}
    case 'TPO3':{const victim=focus(o,1-s);if(victim){leave(o,victim.uid);if(stage>=3)add(p,victim.id,`copy-${s}`);}break;}
    case 'TPO5':leave(o,`focus-${1-s}`);if(stage>=3)p.maxMana++;break;
    case 'TAR1':draw(p,1);break;
    case 'TAR2':case 'TAR3':case 'TAR5':break; // Existing data owns attack restriction/counter/majesty.
    case 'LAND_GRANT':add(p,'TAR2',`land-grant-${s}`);break;
    case 'GUILD_CO':guild(p,s,1,stage);break;
    case 'SLUM':guild(p,s,5,stage);break;
    case 'MERCH1':case 'MERCH2':guild(p,s,def(id).val,stage);break;
    case 'DARK_MERCHANT':p.mana-=4;p.discard.push(make('ELF',`market-acquired-${s}`));break;
    case 'MARKET_CRISIS':g.market=['MERCH1','VITAL2','HPS_SCALE','GRAPE2','TGE2','M7','TAR3'].map((id,i)=>make(id,`renewed-${i}`));g.marketStock=Array(7).fill(3);break;
    case 'S5':o.supplyShrink=1;o.refreshBlockNext=true;if(stage>=3){o.refreshBlockTurn=true;o.refreshBlockNext=false;o.supply=o.supply.slice(0,2);}break;
    case 'NMD4':p.mana-=def('MERCH1').cost;p.discard.push(make('MERCH1',`history-buy-${s}`));break;
    case 'M9':p.refreshTokens=1;if(stage>=3){p.refreshTokens=0;supply(p,s,true);}break;
    case 'BUYOUT':p.buysTurn={MERCH1:2};p.maxMana++;break;
    case 'RICH_HABIT':nativeEnchantment(p,id,s);p.hp+=6;p.maxMana++;break;
    case 'DOMINION':draw(p,3);p.expansion.dominion=3;p.maxMana++;o.maxMana--;break;
    case 'GRAPE':case 'GRAPE2':p.hp+=def(id).val;break;
    case 'WINE':draw(p,def(id).val2);p.hp+=def(id).val;break;
    case 'BREWING':ferment(p,s,stage);break;
    case 'FARM_KEEPER':add(p,'TOKEN00',`farm-one-${s}`);add(p,'TOKEN00',`farm-two-${s}`);break;
    case 'TOKEN00':break;
    case 'SCARECROW':for(let i=0;i<3;i++)add(p,'TOKEN00',`scarecrow-${s}-${i}`);break;
    case 'WINE_COLLECTOR':wineCollector(p,s,stage);break;
    default:info(g,`召喚・常在表示：${def(id)?.nameJa??id}`);
  }
}

export function applyStage(g:any,scene:Scene,chosen:string,side:number,stage:number):void {
  stage=Math.max(0,Math.min(3,Math.floor(stage)));
  const p=g.players[side],o=g.players[1-side],m=focus(p,side),a=ally(p,side);
  info(g,describeStage(scene,chosen,stage));g.previewB.stage=stage;
  if(stage===0)return;
  if(scene.id.startsWith('S')){cardEffect(g,p,o,side,chosen,stage);return;}
  switch(scene.id){
    case 'A006':if(stage>=2){if(chosen==='VAMP_PACT')damage(p,6);if(stage>=3)add(p,chosen==='VAMP_PACT'?'VAMP1':'SOLDIER2',`effect-summon-${side}`);}break;
    case 'A008':cardEffect(g,p,o,side,'GENESIS_SONG',stage);break;
    case 'A010':cardEffect(g,p,o,side,'TPO3',stage);break;
    case 'A016':cardEffect(g,p,o,side,'TPO1',stage);break;
    case 'A047':if(stage>=1)for(const c of chosen==='ND5'?p.field:[m])c.passivesG=[...(c.passivesG??[]),'aura'];if(stage>=3)for(const c of p.field)c.passivesG=[];break;
    case 'A053':if(chosen==='GUILD_CO')guild(p,side,1,stage);else if(chosen==='M9'){p.refreshTokens=stage===3?0:1;if(stage===3)supply(p,side,true);}else{m.gcount+=1;if(stage>=3){if(chosen==='CASTLE')m.gcount--;if(chosen==='GUILD_HALL'){m.gcount-=3;damage(o,14);}if(chosen==='CASINO'){m.gcount-=12;damage(o,30);}}}break;
    case 'A060':if(stage>=2){if(chosen==='HPS_OATH')p.field.filter((c:any)=>c.t==='mon').forEach((c:any)=>buff(c,0,def(chosen).val));else buff(a,0,def(chosen).val2);}break;
    case 'A061':if(stage>=2){if(chosen==='TGE7'){m.aura=def('TGE7').aura;break;}if(chosen==='GENESIS_MAGIC')cardEffect(g,p,o,side,chosen,stage);else if(chosen==='PACK_INSTINCT')p.field.filter((c:any)=>c.id==='M4').forEach((c:any)=>buff(c,2,2));else buff(a,def(chosen).val2,def(chosen).val2);}break;
    case 'A064':if(stage>=2){for(const q of [p,o])for(const c of q.field)if(c.hatch==null)c.dmg=0;p.hp+=5;}break;
    case 'A065':if(stage>=2){if(chosen==='MEDITATE'){p.hp=40;p.brand++;}else if(chosen==='HERMIT'){p.hp=55;p.uses.HERMIT=1;}else if(chosen==='BLOOD_JOY'){damage(p,6);p.hp+=12;o.hp+=12;}else p.hp+=def(chosen).val;}break;
    case 'A072':if(stage>=1){if(chosen==='ELF_HAVEN')nativeEnchantment(p,chosen,side);if(chosen==='FIRE_ART')p.expansion.fireDiscount=2;if(chosen==='DOMINION')p.expansion.dominion=3;if(chosen==='QUICK_GRIMOIRE')p.spellDiscountTurn=1;}if(stage>=3){p.expansion.fireDiscount=0;p.expansion.dominion=0;p.spellDiscountTurn=0;if(chosen==='FIRE_MASTER')leave(p,`focus-${side}`);if(chosen==='ELF_HAVEN')p.freeBuysTurn=3;}break;
    case 'A075':if(stage>=2){if(chosen==='TGE7')leave(p,`focus-${side}`);else if(chosen==='GEM_RAIN'){p.enchants=[];a.atkMod-=3;}else a.tempAtk=0;}break;
    case 'A105':{const egg=eggs.includes(chosen)?m:a;if(egg?.hatch!=null)egg.hatch=Math.max(0,egg.hatch-stage);break;}
    case 'A106':{const egg=chosen==='EGG_HUNTER'?a:m;if(egg){egg.dur=stage===1?Math.max(0,egg.dur-1):0;if(stage>=3)leave(p,egg.uid);}break;}
    case 'A107':if(stage>=2){if(chosen==='EGG_MASTER'){for(const e of p.field)if(e.hatch!=null)e.dur+=5;}else if(a)a.hatch=Math.max(0,a.hatch-(def(chosen)?.val??5));}break;
    case 'A108':hatch(g,p,o,side,origins.includes(chosen)?chosen:'TGE2',stage);break;
    case 'A109':hatch(g,p,o,side,dragons.includes(chosen)?chosen:'D_RED',stage);break;
    case 'A110':hatch(g,p,o,side,'DIVINE',stage);break;
    case 'A111':dragon(p,o,chosen,stage);break;
    case 'A112':if(stage>=2){leave(p,`focus-${side}`);leave(p,`ally-${side}`);if(stage>=3)set(p,side,chosen==='ANTIQUE_DK'||chosen==='INFKNIGHT'?'ANTIQUE_DK':'DRAGON_RIDER');}break;
    case 'A123':cardEffect(g,p,o,side,'ELDER_ELF_KING',stage);break;
    case 'A124':if(stage>=1)p.hp+=16;if(stage>=2)p.dew+=3;if(stage>=3){p.dew--;buff(a,6,0);}break;
    case 'A125':cardEffect(g,p,o,side,'HALF_ELF',stage);break;
    case 'A130':guild(p,side,chosen==='MERCH1'?3:chosen==='MERCH2'?8:chosen==='SLUM'?5:1,stage);break;
    case 'A131':if(chosen==='WINE_COLLECTOR')wineCollector(p,side,stage);else ferment(p,side,stage);break;
    case 'A132':if(stage>=2)cardEffect(g,p,o,side,'FARM_KEEPER',stage);break;
    case 'A133':if(stage>=2){p.maxMana--;if(stage>=3){give(p,chosen==='BEAST_EGG'?'BEAST_EGG':'DRAGON_EGG',`excavation-${side}`);p.enchants=p.enchants.filter((e:any)=>e.card.id!=='ANCIENT_CIV');leave(p,`focus-${side}`);}}break;
    case 'A137':cardEffect(g,p,o,side,'TPO2',stage);break;
    case 'A138':nativeEnchantment(p,'ORIGIN_RITE',side);if(stage>=2){add(p,'TGE2',`rite-summon-${side}`);leave(o,`focus-${1-side}`);}if(stage>=3){add(p,'TGE2',`rite-summon-2-${side}`);o.brand++;}break;
    case 'A146':if(stage>=2){p.mana-=def(chosen).cost;p.discard.push(make(chosen,`bought-${side}`));g.marketStock[0]--;}break;
    case 'A147':if(stage>=2){p.refreshTokens=0;supply(p,side,true);}break;
    case 'A148':if(stage>=2){cardEffect(g,p,o,side,'MARKET_CRISIS',stage);g.marketStock[0]=0;}if(stage>=3){g.marketStock[0]=3;g.market[0]=make('HPS_GRAFT','restocked-one');}break;
    case 'A149':if(stage===1){o.supplyShrink=1;o.refreshBlockNext=true;}if(stage===2){o.supply=o.supply.slice(0,2);o.refreshBlockTurn=true;o.refreshBlockNext=false;}if(stage===3){o.refreshBlockTurn=false;o.supplyShrink=0;supply(o,1-side,true);}break;
    case 'A150':if(stage>=2){const id=chosen==='TGE6'?'TGE5':chosen==='GUILD_HQ'?'ASSASSIN1':chosen==='NMD4'?'MERCH1':'ELF';p.mana-=def(id).cost;p.discard.push(make(id,`special-buy-${side}`));}break;
    case 'A151':if(chosen==='M9'){p.refreshTokens=stage>=2?0:1;if(stage>=2)supply(p,side,true);}else if(chosen==='ELF_HAVEN'){p.freeBuysTurn=stage;for(let i=0;i<stage;i++)p.discard.push(make('WORLD_SEED',`free-buy-${side}-${i}`));p.dew+=stage;}else if(stage>=2){const cost=Math.max(1,def('TGE3').cost-(chosen==='KIN_CALL'?2:1));p.mana-=cost;p.discard.push(make('TGE3',`discounted-${side}`));}break;
    case 'A165':if(stage>=2){damage(o,18);p.tribesFired=['포식:2'];}break;
    case 'A166':if(stage>=2){o.maxMana=Math.max(1,o.maxMana-2);p.tribesFired=['귀족:2'];}break;
    case 'A170':case 'A171':case 'A172':if(stage>=2){const entry:any={A170:[2,15],A171:[3,40],A172:[4,70]};const [n,hp]=entry[scene.id];p.hp+=hp;p.tribesFired.push(`시초:${n}`);}break;
    case 'A173':if(stage>=2){p.tribesFired.push('시초:6');g.previewB.victoryCandidate=side;info(g,'始原6種成立：既存勝利演出への接続点（プレビューでは決着画面を起動しない）');}break;
    case 'A181':{const q=p.quests[0];q.townSeen=['soldier','casino','wine'].slice(0,stage);q.progress=stage;if(stage>=1)add(p,'SOLDIER2',`town-soldier-${side}`);if(stage>=2)add(o,'CASINO',`town-casino-${side}`);if(stage>=3){p.discard.push(make('WINE',`town-wine-${side}`));p.hp+=6;draw(p,1);give(p,'DOMINION',`town-reward-${side}`);p.discard.push(q.card);p.quests=[];}break;}
    case 'N001':dew(g,p,o,side,dewSources.includes(chosen)?chosen:'NOURISHING_RAIN',stage);break;
    case 'N002':shield(g,p,o,side,chosen,stage);break;
    default:throw new Error(`B choreography missing ${scene.id}`);
  }
}

export function describeStage(scene:Scene,chosen:string,stage:number):string {
  const title=def(chosen)?.nameJa??chosen;
  const special:Record<string,string[]>={
    A105:['卵の残り孵化ターンと耐久を分けて表示','両者のターン開始で残り時間-1','残り時間の更新','所有者のターンに0なら孵化へ'],
    A106:['卵と攻撃元を配置','殻への命中・耐久減少','耐久が尽きる','卵破壊：孵化しない'],
    A107:['孵化器／孵化マスターと卵','発動元から卵へ伝達',chosen==='EGG_MASTER'?'耐久+5':'残り孵化ターンを短縮','孵化時間と耐久を別々に保持'],
    A124:['雫8を保持','保有雫8×2で体力16回復','世界樹が雫3を追加','雫1消費・攻撃力+6を永続保持（防御時は体力+6）'],
    A131:['ぶどうと醸造を準備','ぶどう1・高級ぶどう3で仕込む','熟成期間満了','カウンター数のワインを手札へ'],
    N001:['開始前の雫を保持','保有していた雫で回復','選択カードの効果で獲得／消費','残る雫と回復結果を保持'],
    N002:['獲得元とシーカー','シールド獲得・倍率適用','4ダメージを吸収、残量を保持','相手ターン終了：残量消失'],
    A173:['異なる始原6種を配置','6種の接続','特殊勝利条件成立','既存勝利演出への接続点だけ確認'],
    A181:['城下町の条件を0/3から開始','兵士召喚を記録','カジノ召喚を記録','ワイン発動を記録・支配を手札へ'],
  };
  if(scene.id==='A131'&&chosen==='WINE_COLLECTOR')return `${title}：${['ワイン2枚を手札に準備','交換の発動元を示す','ワイン2枚をリフトへ','闇商人を手札へ・本体もリフトへ'][stage]}`;
  if(special[scene.id])return `${title}：${special[scene.id][stage]}`;
  return `${title}：${['発生元・対象・条件を配置','予兆・効果源の活性化','対象へ効果が到着','結果を保持／効果固有の後処理'][stage]} — ${scene.stages}`;
}
