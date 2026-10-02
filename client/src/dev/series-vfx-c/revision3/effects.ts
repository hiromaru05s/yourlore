import {cardStatus} from './cardState';
import {golem} from './golem';
import {military} from './military';
import {passiveIcon} from '../../../ui/passiveIcon';
import type {Board} from './board';
import {defs} from './catalog';
import {sat,smooth,pulse,relief,weapon,hotSurface,flame,line,polygon,arrowMark,slash,engraving,attuneSurface,castleSurface,fracture} from './paint';
export function additional(b:Board,m:string,t:number){if(military(b,m,t)||golem(b,m,t))return;const source=b.source(),v=b.variant,c=b.ctx,id=b.cardId,own=b.subject()??source,enemy=b.subject(1-b.side),targets=b.targets(),sourcePoint=b.point(source);const local=(e:HTMLElement,fn:(k:CanvasRenderingContext2D)=>void)=>b.local(e,fn);
 const material=(e:HTMLElement,kind:string,a:number,offset=0)=>local(e,k=>{const uid=e.dataset.uid,def=b.g.players.flatMap((p:any)=>p.field).find((m:any)=>m.uid===uid);if(def?.id==='CASTLE')castleSurface(k,t-offset,a,v);else relief(k,kind,t-offset,a,v)});
 const pose=(e:HTMLElement,start=250,duration=1100)=>{const q=1-smooth((t-start)/duration),w=e.offsetWidth;b.pose(e,q*w*(v?-.3:.25),q*e.offsetHeight*(b.side?-1:1),q*(v?-5:4));};
 const crest=(e:HTMLElement,amount:number)=>local(e,k=>{const mon=b.g.players.flatMap((p:any)=>p.field).find((x:any)=>x.uid===e.dataset.uid);weapon(k,mon?.id??id,t-800,amount,v)});
 const bolt=(from:HTMLElement,to:HTMLElement,start:number,duration=600)=>slash(c,b.point(from),b.point(to),(t-start)/duration,Math.max(25,from.getBoundingClientRect().width),v);
 const rebound=(e:HTMLElement,hit:number,force=1)=>{const a=pulse(t,hit,hit+65,hit+520)*force;b.pose(e,(v?1:-1)*a*3,a*7*(b.side?-1:1),a*(v?1.4:-2));};
 const change=(e:HTMLElement,kind:'atk'|'def',amount:number,at=1700)=>{const up=amount>0,a=pulse(t,at-600,at-80,at+480);local(e,k=>{engraving(k,t,a*.5,v);arrowMark(k,kind==='atk'?18:82,122-22*smooth((t-at+550)/650),a*.75,up,kind==='def',v)});if(t>=at)b.stat(e,kind,b.base(e,kind)+amount)};
 const mana=(n:number,current:number,maximum:number,at=1700)=>{const el=b.player(n).querySelector<HTMLElement>('.pt-mana');if(!el)return;const p=b.point(el),s=sourcePoint,u=sat((t-600)/1000);if(t>=600&&t<1900){c.save();c.translate(s.x+(p.x-s.x)*smooth(u),s.y+(p.y-s.y)*smooth(u));c.scale(.35,.35);relief(c,v?'crystal':'metal',t-600,pulse(t,600,1100,1900),v);c.restore()}if(t>=at){const max=el.querySelector('.pt-mana-max'),read=el.querySelector('.mana-readout b');if(max)max.textContent='/'+maximum;if(read)read.textContent=String(current)}local(source,k=>engraving(k,t,pulse(t,150,750,1800),v));};
 if(m==='S06'||['A067','A068','A069','A070'].includes(m)){
  local(source,k=>attuneSurface(k,t,pulse(t,100,1100,2700),v));
  const negative=m==='A068'||id==='AHEUK',who=id==='AHEUK'||id==='CASINO'||m==='A070'?1-b.side:b.side,delta=negative?(id==='AHEUK'&&b.condition?-2:-1):1;
  if(id==='AJIN'){local(source,k=>{const a=pulse(t,350,850,1700);k.globalAlpha=a;polygon(k,[[38,63],[62,63],[62,87],[38,87]],'#c7d0b5','#304952');k.fillStyle='#304952';for(const [x,y] of (b.condition?[[44,69],[56,69],[44,81],[56,81]]:[[50,75]]))k.fillRect(x-1,y-1,2,2)})}
  if(m==='A069'){mana(who,t<2700?Math.max(0,9-defs[id].cost):12,12,1300)}else if(m==='A070'){mana(who,11,12,2700);b.sceneLabel=t<2700?'ダイス3 → 次のターンのマナ-1':'相手の次ターン → 使用可能マナ11/12';}else if(id==='TDE1'){mana(who,9,t<3300?11:12,1600);b.sceneLabel=t<3300?'最大マナ-1を5ターン維持':'自分の5ターン経過 → 最大マナ復元';}else if(id==='CASINO'){if(b.condition)mana(who,3,3);b.sceneLabel=b.condition?'ダイス6 → 相手の最大マナ3':'ダイス2 → 最大マナ変化なし';}else if(id==='TDE4')mana(who,3,3);else if(id!=='M10'||b.condition)mana(who,9,12+delta);
  if(id==='QUICK_ATTUNE'&&t>=1800){document.getElementById(b.side?'hp-opp':'hp-me')!.textContent='42'}
  return;
 }
 if(m==='S08'){
  if(defs[id].t==='mon'){pose(source,100,id==='GOLEM3'||id==='MANA_GIANT'?1650:1200);material(source,v?'metal':'stone',pulse(t,350,1500,3300));local(source,k=>engraving(k,t,pulse(t,1000,1750,2800)*.8,v));}
  else if(id==='AEM')for(const e of [own,...b.targets(true).filter(e=>e.dataset.uid?.includes(`-${b.side}-`)).slice(0,1)])change(e,'atk',7);
  else if(id==='MIND_BURST')additional(b,'A122',t);else additional(b,'A037',t);return;
 }
 if(['intercept','budget','castle-reward','town-reward','sorter-summon','quick-sort'].includes(m)){
  if(m==='sorter-summon'){pose(source,200,1200);crest(source,pulse(t,500,1500,3000));return}
  if(m==='quick-sort'){if(!b.condition){b.sceneLabel='除外カルが10枚未満 → 購入不可';return;}crest(source,pulse(t,200,1000,2100));bolt(source,enemy,1550);local(enemy,k=>engraving(k,t,pulse(t,1900,2250,2650),v));if(t>2800)enemy.style.visibility='hidden';return}
  if(m==='town-reward'){material(source,v?'tags':'wax',pulse(t,200,1100,3300));local(source,k=>{for(let j=0;j<3;j++){k.globalAlpha=smooth((t-500-j*550)/250);polygon(k,[[24+j*20,100],[30+j*20,91],[36+j*20,100],[30+j*20,109]],'#536e75','#dccca1')}});const reward=b.el('r3-reward');if(reward){reward.style.visibility=t<2900?'hidden':'';if(t>=2900)pose(reward,2900,800)}return}
  const troops=b.g.players[b.side].field.map((x:any)=>b.el(x.uid));
  const active=m==='intercept'?troops.slice(1,b.condition?3:2):m==='budget'?troops.slice(0,b.condition?1:0):troops.slice(0,3);
  material(source,v?'banner':'shield',pulse(t,200,1000,2200));
  for(const [j,e] of active.entries()){pose(e,900+j*400,1000);material(e,v?'banner':'shield',pulse(t,750+j*400,1600+j*400,3300),j*400)}
  if(m==='budget'){local(source,k=>{k.globalAlpha=pulse(t,250,850,1550);polygon(k,[[38,62],[63,62],[63,86],[38,86]],'#c4b498','#3f4440');k.fillStyle='#353b3b';for(let j=0;j<(b.condition?4:1);j++)k.fillRect(43+j%2*11,68+Math.floor(j/2)*10,2,2)});if(!b.condition)troops[0].style.visibility='hidden'}
  return;
 }
 if(m==='S21'||m==='S22'||m==='A001'||m==='A007'||m==='A012'||m==='A128'||m==='A129'){
  const merc=m==='S22'||m==='A129',kind=merc?(v?'tags':'wax'):(v?'banner':id==='CASTLE'?'stone':'shield');
  const troopCount=m==='A007'?3:merc?(id==='MERC_ART'?4:id==='MERCENARY'?1:2):m==='A012'?2:1;
  const troops=b.g.players[b.side].field.map((m:any)=>b.el(m.uid)).filter(Boolean).slice(0,troopCount+(merc?1:0));
  troops.forEach((e:HTMLElement,j:number)=>{pose(e,250+j*430,1000);material(e,kind,pulse(t,150+j*430,1100+j*430,3000+j*180),j*430);if(t<j*430)e.style.visibility='hidden'});
  const followers=b.g.players[b.side].field.slice(1).map((m:any)=>b.el(m.uid));
  if(['M11','GM6_7','ELITE','GM5_2','GM6_8'].includes(id))for(const [j,e] of followers.slice(0,id==='ELITE'?2:1).entries()){if(t<1700+j*350)e.style.visibility='hidden';else {pose(e,1700+j*350,900);material(e,v?'banner':'shield',pulse(t,1700+j*350,2300+j*350,3500));}}
  if(id==='HORDE')for(const e of followers)change(e,'atk',4,2200);if(id==='GM5_2')for(const e of followers.slice(0,1))change(e,'def',2,2800);
  if(id==='VITAL4'&&t>1900)for(const e of followers){const status=cardStatus(e);if(status&&!status.querySelector('[data-psv="guts"]'))status.insertAdjacentHTML('beforeend',passiveIcon('guts',{count:1,granted:true}));material(e,v?'banner':'shield',pulse(t,1700,2200,3200))}
  if(id==='MERC_ART'){change(own,'atk',3,3400);change(own,'def',3,3500)}

  if(m==='A012'&&t>3000)troops.forEach((e:HTMLElement,j:number)=>{local(e,k=>{const a=pulse(t,3000+j*100,3300+j*100,3700+j*100);engraving(k,t,a,v)});if(t>3900)e.style.visibility='hidden'});
  if(merc&&b.condition&&t>2600){local(source,k=>{const a=pulse(t,2600,3000,3900);k.globalAlpha=a;for(let j=0;j<(id==='MERC_MASTER'?10:id==='MERC_LEADER'?5:3);j++){const x=20+j%5*13,y=54+Math.floor(j/5)*18;polygon(k,[[x,y],[x+10,y-1],[x+10,y+10],[x,y+11]],'#c2b38b','#39392f');k.fillStyle='#283336';for(let n=0;n<(j%3)+2;n++)k.fillRect(x+2+(n%2)*5,y+2+Math.floor(n/2)*5,1.6,1.6)}})}
  return;
 }
 if(['chosen-select','A104'].includes(m)){
  if(!b.condition){for(const e of b.g.players[b.side].field.map((x:any)=>b.el(x.uid)))e.style.visibility='hidden';b.sceneLabel='除外カルが8枚未満 → 召喚なし';return;}material(source,v?'stone':'tags',pulse(t,200,850,2000));for(const [j,e] of b.g.players[b.side].field.map((x:any)=>b.el(x.uid)).entries()){local(e,k=>weapon(k,['CHOSEN_KNIGHT','CHOSEN_MAGE','CHOSEN_ARCHER','CHOSEN_ROGUE'][j%4],t,pulse(t,250+j*120,800+j*100,1500),v))}if(t>1250)for(const e of b.g.players[b.side].field.slice(1).map((x:any)=>b.el(x.uid)))e.style.visibility='hidden';pose(own,1250,1250);crest(own,pulse(t,1000,1900,3300));return;
 }
 if(['A101','A102','A103','A174','chosen-win','chosen-heal','chosen-cull'].includes(m)){
  const rift=document.getElementById(b.side?'rift-opp':'rift-me')??source,rp=b.point(rift),p=b.point(own),u=sat((t-450)/1000);
  if(t>450&&t<2200){c.save();c.globalAlpha=pulse(t,450,1400,2200);for(let j=0;j<3;j++){const a={x:rp.x,y:rp.y+j*3},z={x:p.x,y:p.y+j*4};slash(c,a,z,u,36,v)}c.restore()}
  crest(own,pulse(t,750,1600,2900));
  if(m==='A101'||m==='A102'){const number=document.querySelector(`#rift-${b.side?'opp':'me'} .rift-label b`);if(number)number.textContent=String(t>=1850?b.g.players[b.side].removed.length+(m==='A102'&&b.nativeDone.has('cull-two')?0:b.condition?2:-2):b.g.players[b.side].removed.length);const delta=m==='A101'&&!b.condition?-1:1;change(own,'atk',(id.includes('ARCHER')||id.includes('ROGUE')?2:1)*delta,1850);if(!id.includes('ARCHER')&&!id.includes('ROGUE'))change(own,'def',delta,1900);if(m==='A102'){bolt(own,enemy,2300);if(b.nativeDone.has('cull-two')){b.stat(own,'atk',b.base(own,'atk'));b.stat(own,'def',b.base(own,'def'));}}b.sceneLabel=m==='A101'&&!b.condition?'除外カルが2枚減少 → 連動値が戻る':'除外カル2枚増加 → 職別の能力値が上昇';}
  if(m==='A103'){bolt(own,b.player(1-b.side),2100);if(t>2700)document.getElementById(b.side?'hp-me':'hp-opp')!.textContent='32'}
  if(m==='chosen-heal'&&t>2100)document.getElementById(b.side?'hp-opp':'hp-me')!.textContent='48';
  if(m==='A174'||m==='chosen-win'){b.sceneLabel=b.condition?'除外カル25枚 → 選ばれし領域の勝利':'除外カル24枚 → 勝利条件未達';if(!b.condition)return;for(const e of b.targets(true))crest(e,pulse(t,1300,2200,3700));}
  return;
 }
 if(['A037','A038','A054','A122'].includes(m)){
  const consumed=m==='A038'||m==='A122',a=pulse(t,200,900,consumed?1900:3400),e=defs[id].t==='mon'?source:own;
  material(e,v?'metal':'stone',a);local(e,k=>engraving(k,t,a,v));
  if(m==='A054'){bolt(enemy,e,800);material(e,v?'metal':'stone',pulse(t,1600,2100,3400));}
  if(consumed){const r=pulse(t,1800,1880,2600);b.pose(e,r*(v?2:-3),r*e.offsetWidth*.17*(b.side?-1:1),r*(v?1.5:-2.5));material(e,v?'metal':'stone',pulse(t,1950,2400,3300));if(t>1800&&m==='A038')b.stat(e,'def',1);if(m==='A122'){bolt(e,b.player(1-b.side),2200);if(t>2800)document.getElementById(b.side?'hp-me':'hp-opp')!.textContent='28'}}
  const affected=m==='A037'&&id==='KNIGHT_TEACH'?b.g.players[b.side].field.map((x:any)=>b.el(x.uid)):[e];for(const card of affected){const status=cardStatus(card);if(status){status.querySelector('[data-psv="guts"]')?.remove();status.insertAdjacentHTML('beforeend',passiveIcon('guts',{count:t<900?0:consumed&&t>=1800?0:m==='A054'?1:3,granted:true}))}}return;
 }
 if(['A059','A062','A063','A074','A076'].includes(m)){
  const allies=b.g.players[b.side].field.map((m:any)=>b.el(m.uid));
  const es=['WEAKEN_ALL','TRICKROOM','SHATTER','LAWLESS'].includes(id)?b.targets(true):m==='A059'?(['S7','ADVANCE'].includes(id)?allies:[own]):id==='D_BLACK'?targets:[enemy];
  for(const e of es){if(m==='A074'){if(t<3300){change(e,'atk',b.base(e,'def')-b.base(e,'atk'));change(e,'def',b.base(e,'atk')-b.base(e,'def'),1900)}else {local(e,k=>{arrowMark(k,18,125,pulse(t,3300,3500,4000),true,false,v);arrowMark(k,82,125,pulse(t,3300,3500,4000),true,true,v)})}}
   else if(m==='A063'){if(id==='SHATTER'&&t>500)document.getElementById(b.side?'hp-opp':'hp-me')!.textContent='35';change(e,'def',['SHATTER','LAWLESS'].includes(id)?1-b.base(e,'def'):id==='D_BLACK'?-3:-2)}
   else if(m==='A062')change(e,'atk',id==='DUNGEON'?1-b.base(e,'atk'):id==='M12'?-1:-2);
   else if(m==='A059'){const eid=b.g.players[b.side].field.find((x:any)=>x.uid===e.dataset.uid)?.id;const amount=id==='ADVANCE'?(['SOLDIER2','INFKNIGHT','CAVALRY'].includes(eid)?3:2):Number(defs[id].val??3);if(!['S7','GS5_4'].includes(id)||t<3500)change(e,'atk',amount);}
  }
  if(m==='A076'){const spell=b.el('r3-amplifier-spell')??source,target=b.targetKind==='player'?b.player(1-b.side):enemy;material(source,v?'metal':'shield',pulse(t,400,1000,2300));bolt(spell,target,1400);if(id==='D_RED'||id==='SLAY_ART'&&b.targetKind==='player')bolt(source,b.player(1-b.side),2250);if(t>2000){const direct=b.targetKind==='player',base=id==='DOUBLE_UP'?12:6;if(direct)document.getElementById(b.side?'hp-me':'hp-opp')!.textContent=String(40-base-(t>2850&&id!=='DOUBLE_UP'?3:0));else {b.damage(enemy,base);if(t>2850&&id==='D_RED')document.getElementById(b.side?'hp-me':'hp-opp')!.textContent='37';}document.getElementById(b.side?'hp-opp':'hp-me')!.textContent=String(40-(id==='DOUBLE_UP'?4:id==='SLAY_ART'?5:2));}b.sceneLabel=id==='DOUBLE_UP'?'魔法のダメージを2倍':id==='D_RED'?'魔法命中 → 相手プレイヤーへ追加3':'プレイヤー被ダメージ → 追加3';}return;
 }
 if(m==='A090'){
  b.targets(true).forEach((e,j)=>{const p=b.point(e),hit=1550+j*60,a=pulse(t,hit,hit+160,hit+850);rebound(e,hit,1.2);local(e,k=>{if(id==='MAGMA_RAIN')hotSurface(k,t,a,v);else {for(let n=0;n<4;n++){const x=20+n*18;line(k,[[x,120],[x+9,96],[x-4,82],[x+8,52]],v?'#6a6057':'#514331',a*2.2)}}});if(id==='MAGMA_RAIN'&&t>hit-500&&t<hit){c.save();flame(c,p.x+20*(1-sat((t-hit+500)/500)),p.y-130*(1-sat((t-hit+500)/500)),.45,t,v);c.restore()}if(t>=hit){if(id==='SHATTER')b.stat(e,'def',1);else b.damage(e,id==='MAGMA_RAIN'?6:4)}});if(id==='SHATTER'&&t>500)document.getElementById(b.side?'hp-opp':'hp-me')!.textContent='35';return;
 }
 if(['A034','A126','A127'].includes(m)){
  material(source,v?'banner':'stone',pulse(t,200,1200,3000));if(m==='A034'){bolt(enemy,source,800);material(source,v?'banner':'shield',pulse(t,1200,1500,2500));}else if(m==='A126'){for(const e of [own,enemy])material(e,v?'banner':'stone',pulse(t,1100,1900,3300));}else b.targets().forEach((e,j)=>{material(e,v?'banner':'shield',pulse(t,900+j*130,1500+j*130,2300+j*130));if(t>2600)e.style.visibility='hidden'});return;
 }
 if(m==='A036'){
  material(source,v?'metal':'stone',pulse(t,200,900,1900));const target=b.targetKind==='player'?b.player(1-b.side):enemy,sp=b.point(source),tp=b.point(target),u=sat((t-1300)/620);rebound(source,1300,-.7);
  if(t>1300&&t<1920){c.save();c.translate(sp.x+(tp.x-sp.x)*u,sp.y+(tp.y-sp.y)*u-Math.sin(u*Math.PI)*50);c.rotate(u*5);const r=Math.max(3,source.offsetWidth*.1);polygon(c,[[-r,0],[-r*.5,-r],[r*.8,-r*.7],[r,r*.4],[0,r]],v?'#687682':'#494949','#edcf94');line(c,[[-r*.5,-r],[0,r]],'#c4a269',1);c.restore()}
  if(t>1920){rebound(target,1920);material(target,v?'metal':'stone',pulse(t,1920,2030,2600)*.7);const damage=id==='HEAVY_GUNNER'?2:1;if(target.matches('.card'))b.damage(target,damage);else document.getElementById(b.side?'hp-me':'hp-opp')!.textContent=String(40-damage)}return;
 }
 if(m==='A049'||m==='A050'){
  const taunt=m==='A049',target=taunt&&!b.condition?b.el(`r3-other-${b.side}-1`):own;
  material(own,taunt?(v?'banner':'shield'):(v?'tags':'metal'),pulse(t,100,900,1800));
  if(t>=800){const status=cardStatus(own);if(status&&!status.querySelector(`[data-psv="${taunt?'taunt':'evade'}"]`))status.insertAdjacentHTML('beforeend',passiveIcon(taunt?'taunt':'evade',{granted:true}));if(taunt)b.stat(own,'def',b.base(own,'def')+12);}
  local(own,k=>{k.globalAlpha=pulse(t,900,1300,1900);polygon(k,[[42,59],[58,59],[58,76],[42,76]],'#d8c7a4','#34474c');k.fillStyle='#34474c';for(let j=0;j<(b.condition?5:2);j++)k.fillRect(45+j%2*7,63+Math.floor(j/2)*4,2,2)});
  if(t>=1500&&t<2380)b.attack(enemy,target,t-1500);
  const dodge=pulse(t,1720,1840,2540);if(!taunt&&b.condition)b.pose(own,dodge*own.offsetWidth*(v?.5:-.45),0,dodge*(v?4:-3));else if(t>=1840)b.stat(target,'def',b.base(target,'def')+(taunt&&b.condition?12:0)-b.base(enemy,'atk'));
  b.sceneLabel=taunt?b.condition?'体力+12・挑発 → ダイス成功で攻撃を肩代わり':'体力+12・挑発 → ダイス失敗で元の対象へ':b.condition?'回避付与 → ダイス5 → 攻撃無効':'回避付与 → ダイス2 → 被弾';return;
 }
 if(m==='A162'){
  targets.forEach((e,j)=>local(e,k=>{const a=pulse(t,300,750,1450);k.globalAlpha=a;for(const y of [30,120])line(k,[[14,y+8],[14,y],[25,y]],'#e3c98f',1.5);if(j===0&&t>1100&&b.condition)relief(k,v?'metal':'shield',t,pulse(t,1100,1550,2400),v)}));if(b.condition)bolt(source,enemy,1900);b.sceneLabel=b.condition?'候補を示す → 対象確定 → 発動':'対象選択をキャンセル';return;
 }
 // Attack-specific sequence: separate strike ownership, contact and follow-through.
 const direct=['A024','A026'].includes(m),target=m==='A025'?own:direct?b.player(m==='A026'?b.side:1-b.side):m==='A032'&&b.condition?b.el(`r3-other-${b.side}-1`):enemy;
 const attacker=m==='A025'||m==='A026'?enemy:own,hit=1750,second=['A028','A029','A030'].includes(m)?2800:0;
 material(attacker,v?'metal':'shield',pulse(t,180,800,1400));b.attack(attacker,target,t-(hit-340));rebound(target,hit);if(t>=hit){if(target.matches('.card'))b.damage(target,b.base(attacker,'atk'));else document.getElementById((m==='A026'?1-b.side:b.side)?'hp-me':'hp-opp')!.textContent=String(40-b.base(attacker,'atk'))}
 if(second){const counter=m==='A030',secondTarget=m==='A029'?b.el(`r3-other-${1-b.side}-1`):target;b.attack(counter?target:attacker,counter?attacker:secondTarget,t-second);rebound(counter?attacker:secondTarget,second+340);if(t>=second+340){const first=b.base(attacker,'atk'),damage=counter?Math.ceil(b.base(target,'atk')/2):id==='DRAGON_RIDER'?Math.floor(first/2):first;b.damage(counter?attacker:secondTarget,(counter||m==='A029'?0:first)+damage)}}
 if(m==='A027'){bolt(enemy,b.player(1-b.side),2000);if(t>=2300)document.getElementById(b.side?'hp-me':'hp-opp')!.textContent=String(40-Math.max(0,b.base(attacker,'atk')-b.base(enemy,'def')));b.sceneLabel='モンスターの体力を超えた分がプレイヤーへ貫通';}
 if(m==='A031')local(attacker,k=>{const a=pulse(t,1850,2100,2650);k.globalAlpha=a;line(k,[[20,100],[76,45]],'#d3c6a7',2);line(k,[[23,103],[79,48]],'#4c606d',1)});
 if(m==='A036'){material(source,v?'metal':'stone',pulse(t,300,950,1800));bolt(source,enemy,1200);rebound(source,1200,-.6)}
 if(['A013','A027','A029'].includes(m)||m==='A033'&&b.condition){local(enemy,k=>{fracture(k,t,pulse(t,1700,2140,2800),v)});if(t>2700)enemy.style.visibility='hidden'}
}
