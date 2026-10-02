import {cardStatus} from './cardState';
import type {Board} from './board';
import {defs} from './catalog';
import {passiveIcon} from '../../../ui/passiveIcon';
import {relief,engraving,arrowMark,slash,pulse,smooth} from './paint';
export function golem(b:Board,key:string,t:number):boolean{
 if(!['S08','A037','A038','A054','A122'].includes(key))return false;
 const id=b.cardId,v=b.variant,source=b.source(),p=b.g.players[b.side],own=b.subject(),enemy=b.subject(1-b.side);
 const field=p.field.map((m:any)=>({m,e:b.el(m.uid)}));
 const coat=(e:HTMLElement,a:number,age=t)=>b.local(e,c=>{relief(c,v?'metal':'stone',age,a,v);engraving(c,age,a*.55,v)});
 const guts=(e:HTMLElement,n:number)=>{const status=cardStatus(e);if(!status)return;status.querySelector('[data-psv="guts"]')?.remove();status.insertAdjacentHTML('beforeend',passiveIcon('guts',{count:n,granted:true}));};
 const add=(e:HTMLElement,n:number,at=1400)=>{coat(e,pulse(t,at-550,at,at+1300),t-at+550);guts(e,t<at?Number(p.field.find((m:any)=>m.uid===e.dataset.uid)?.guts??0):n);};
 const burst=key==='A122'||id==='MIND_BURST';
 if(burst){let sum=0;const spell=b.el('r3-burst')??source;coat(spell,pulse(t,600,1700,2700));for(const {m,e} of field){const count=m.guts??0;sum+=count;guts(e,t>=1800?0:count);coat(e,pulse(t,300,900,1850));if(count)slash(b.ctx,b.point(e),b.point(spell),(t-1000)/800,e.offsetWidth*.55,v);}
  slash(b.ctx,b.point(spell),b.point(b.player(1-b.side)),(t-1950)/850,55,v);if(t>=2800)document.getElementById(b.side?'hp-me':'hp-opp')!.textContent=String(40-sum*4);b.sceneLabel=t<1800?'場の気合カウンターを集積':`全て消費 → ${sum}×4ダメージ`;return true;
 }
 if(key==='A038'){
  const count=p.field[0].guts??1;if(t<900)guts(own,count);if(t>=900&&t<1780)b.attack(enemy,own,t-900);const hit=pulse(t,1240,1340,2100);b.pose(own,hit*(v?3:-3),hit*own.offsetWidth*.15*(b.side?-1:1),hit*(v?2:-2));coat(own,pulse(t,1280,1800,3000),t-1250);guts(own,t>=1400?Math.max(0,count+(id==='NWL3'?1:0)-1):count+(id==='NWL3'&&t>=1250?1:0));if(t>=1400)b.stat(own,'def',1);b.sceneLabel=t<1400?'致命傷を受ける':'気合1個消費 → 体力1で生存';return true;
 }
 if(key==='A054'||key==='S08'&&(b.trigger==='hit'||b.trigger==='ally-death')){
  const initial=p.field[0].guts??1;if(id==='GOLEM2'){const ally=b.el(`r3-other-${b.side}-3`);if(ally)coat(ally,pulse(t,300,1000,1500));for(const {m,e} of field)if(m.aura==='leaderGolem')add(e,(m.guts??0)+1,1700);b.sceneLabel=t<1500?'味方が倒れる':'リーダーゴーレムの気合+1';}
  else{if(t>=600&&t<1480)b.attack(enemy,own,t-600);add(own,initial+1,1300);if(t>=1000)b.damage(own,1);b.sceneLabel=t<1300?'攻撃を受ける':'守護者の気合+1';}return true;
 }
 if(id==='AEM'){for(const {e} of field.slice(0,2)){coat(e,pulse(t,350,1300,2450));b.local(e,c=>arrowMark(c,18,122,pulse(t,1100,1700,2300),true,false,v));if(t>1700)b.stat(e,'atk',b.base(e,'atk')+7);}b.sceneLabel='異なるゴーレムを確認 → 2体の攻撃力+7';return true;}
 if(id==='KNIGHT_TEACH'){for(const {m,e} of field)add(e,(m.guts??0)+(m.passive?.includes('guts')||m.passivesG?.includes('guts')?3:1),1450);b.sceneLabel='気合のない味方は1個、既に持つ味方は3個補充';return true;}
 if(id==='VITAL4'){for(const {m,e} of field)if(['SOLDIER2','INFKNIGHT'].includes(m.id))add(e,1);b.sceneLabel='兵士と騎士に気合を付与';return true;}
 if(defs[id]?.t==='mon'){
  const enabled=id!=='GOLEM3'||b.condition,q=1-smooth((t-100)/(id==='GOLEM3'?1600:1200));if(!enabled)source.style.visibility='hidden';else{b.pose(source,q*source.offsetWidth*(v?-.18:.15),q*source.offsetHeight*(b.side?-1:1),q*(v?-5:3));coat(source,pulse(t,200,1400,3200));}
  if(id==='GOLEM1')add(source,1,1000);
  if(id==='NGA3')add(source,b.condition?4:1,1700);
  if(id==='M10'&&t>=1800&&b.condition){b.player(b.side).querySelector('.pt-mana-max')!.textContent='/13';}
  if(id==='MANA_GIANT'&&b.trigger==='turn-start'){coat(source,pulse(t,700,1700,2900));if(b.condition&&t>=2100)document.getElementById(b.side?'hp-opp':'hp-me')!.textContent='50';b.sceneLabel=b.condition?'他のゴーレム2種 → 自分の体力+10':'条件未達 → 回復なし';}
  else b.sceneLabel=!enabled?'他のゴーレムがないため召喚不可':id==='NGA3'?b.condition?'召喚 → 気合1個＋追加3個':'他のゴーレムなし → 気合1個':'ゴーレム召喚 → 石／留め具が噛み合う';
 }
 return true;
}
