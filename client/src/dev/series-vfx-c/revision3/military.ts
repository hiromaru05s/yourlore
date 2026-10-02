import {cardStatus} from './cardState';
import type {Board} from './board';
import {passiveIcon} from '../../../ui/passiveIcon';
import {castleSurface,relief,engraving,arrowMark,line,polygon,smooth,pulse} from './paint';
export function military(b:Board,key:string,t:number):boolean{
 const id=b.cardId,v=b.variant,p=b.g.players[b.side],source=b.source(),own=b.subject(),enemy=b.subject(1-b.side);
 const merc=key==='S22'||key==='A129';
 if(!merc&&!['S21','A001','A007','A012','A034','A126','A127','A128','intercept','budget','castle-reward','town-reward'].includes(key))return false;
 const field=p.field.map((m:any)=>b.el(m.uid)).filter(Boolean) as HTMLElement[];
 const uid=(i:number)=>b.el(i?`r3-other-${b.side}-${i}`:`r3-subject-${b.side}`);
 const panel=(e:HTMLElement,a:number,age=t)=>b.local(e,c=>{
  if(e===own&&id==='CASTLE'){castleSurface(c,age,a,v);return;}
  if(merc){relief(c,v?'tags':'wax',age,a,v);engraving(c,age,a*.42,v);return;}
  c.save();c.globalAlpha=a;const q=smooth(age/620);
  for(const sign of [-1,1]){c.save();c.translate(50+sign*29,34);
   if(v){const unfold=smooth(age/700),w=10*unfold;polygon(c,[[0,0],[sign*w,5],[sign*(w+Math.sin(age*.005)*2),70],[-sign*3,86]],'#415674','#d4c39e');for(let j=0;j<9;j++)line(c,[[0,8+j*7],[sign*w,11+j*7]],j%2?'#7f8e9d':'#2b3d54',.5);line(c,[[0,1],[-sign*2,82]],'#e4d1a1',.9);}
   else {c.translate(sign*(1-q)*17,0);c.rotate(sign*(1-q)*.3);for(let j=0;j<4;j++){const y=j*19;polygon(c,[[0,y],[sign*9,y+4],[sign*7,y+18],[-sign*3,y+13]],j%2?'#53616a':'#75858b','#d1bb8f');line(c,[[0,y],[sign*9,y+4],[sign*7,y+18]],'#ebd7ad',.65);c.fillStyle='#c1a470';c.fillRect(sign*3,y+6,1.5,1.5)}}c.restore();
  }c.restore();
 });
 const spawn=(e:HTMLElement,start:number,enabled=true)=>{if(!e)return;if(!enabled||t<start){e.style.visibility='hidden';return;}if(b.nativeDone.has(e.dataset.uid??''))return;
  const age=t-start,q=1-smooth(age/900);b.pose(e,q*e.offsetWidth*(v?-.2:.16),q*e.offsetHeight*(b.side?-1:1),q*(v?-5:3));panel(e,pulse(age,0,600,1550),age);
 };
 const dieCoat=(e:HTMLElement,start:number)=>panel(e,pulse(t,start-650,start-80,start+180),t-start+650);
 const count=(e:HTMLElement,n:number)=>{if(!e)return;const band=cardStatus(e);if(!band)return;let label=band.querySelector<HTMLElement>('.r3-counter');if(!label){label=document.createElement('span');label.className='ec ec-d r3-counter';band.append(label)}label.textContent=`カウント ${n}`;};
 const dice=(n:number,start:number,face=b.condition?5:2)=>{const casino=field.find(e=>p.field.find((m:any)=>m.uid===e.dataset.uid)?.id==='CASINO')??source;panel(casino,pulse(t,start-220,start+300,start+1250),t-start+220);b.local(casino,c=>{const a=pulse(t,start,start+260,start+1150);c.save();c.globalAlpha=a;for(let j=0;j<n;j++){const x=19+j%5*13,y=56+Math.floor(j/5)*19,roll=1-smooth((t-start-j*25)/420);c.save();c.translate(x+5,y+5);c.rotate(roll*(j%2?1:-1)*.65);polygon(c,[[-5,-6],[6,-5],[6,6],[-5,7]],'#cbb998','#334348');c.fillStyle='#263639';for(let k=0;k<face;k++)c.fillRect(-3+(k%2)*5,-3+Math.floor(k/2)*3,1.4,1.4);c.restore()}c.restore()});};
 const buff=(e:HTMLElement,kind:'atk'|'def',n:number,start:number)=>{if(!e)return;b.local(e,c=>arrowMark(c,kind==='atk'?18:82,122,pulse(t,start-450,start,start+600),n>0,kind==='def',v));if(t>=start)b.stat(e,kind,b.base(e,kind)+n);};
 panel(source,pulse(t,150,900,2300));
 if(merc){
  const art=id==='MERC_ART',startTurn=b.trigger==='turn-start',countPer=startTurn||id==='MERCENARY'?1:2,repeats=art?2:1,first=art?1:0;
  if(!art&&!startTurn)spawn(source,100);if(art)spawn(own,550);
  for(let round=0;round<repeats;round++){
   for(let j=0;j<countPer;j++)spawn(uid(first+1+round*countPer+j),1000+round*1450+j*330);
   if(b.condition)dice(id==='MERCENARY'?3:id==='MERC_LEADER'||art?5:10,1450+round*1450);
  }
  if(art){for(const e of [own,uid(1)]){buff(e,'atk',3,3200);buff(e,'def',3,3270)}}
  b.sceneLabel=startTurn?'自分のターン開始 → 兵士召喚':art?'傭兵の効果を2回発動':t<1000?'契約 → 傭兵召喚':'兵士召喚 → カジノのダイス';return true;
 }
 if(key==='A128'){const knight=uid(0),cavalry=uid(1);dieCoat(knight,1350);spawn(cavalry,1650);b.sceneLabel=t<1350?'騎士を選択':'騎士がシェルフへ → 騎馬兵召喚';return true;}
 if(key==='A012'||key==='A007'){
  const enabled=id!=='QUICK_MUSTER'||b.condition;for(let j=0;j<3;j++){spawn(uid(j),450+j*430,enabled);if(key==='A012')dieCoat(uid(j),3500);}
  b.sceneLabel=!enabled?'城がないため購入不可':t<3000?'3体を順番に召喚':key==='A012'?'相手ターン終了 → 3体をシェルフへ':'召喚完了';return true;
 }
 if(key==='A034'||key==='S21'&&id==='CASTLE'&&b.trigger==='block'){
  count(own,t<1600?2:1);panel(own,pulse(t,700,1500,2400));if(t>=1100&&t<1850)b.attack(enemy,own,t-1100);b.sceneLabel=t<1600?'攻撃を受け止める':'城のカウンター1個を消費 → ダメージ無効';return true;
 }
 if(key==='A126'){
  if(id==='LAND_GRANT'){spawn(uid(1),1500,b.condition);b.sceneLabel=b.condition?'城を確認 → 貴族を選択して召喚':'城がないため発動不可';}
  else{panel(own,pulse(t,800,1650,3000),t-800);count(own,t>=1800&&b.condition?7:2);b.sceneLabel=b.condition?'城を増築 → カウンター+5':'城がないため発動不可';}return true;
 }
 if(key==='A127'){for(const e of b.targets())dieCoat(e,2450);if(t>3000&&b.condition){let badge=b.player(1-b.side).querySelector<HTMLElement>('.r3-brand');if(!badge){badge=document.createElement('span');badge.className='r3-brand';badge.style.cssText='position:absolute;right:0;bottom:20%;font-size:12px;color:#e5b091;background:#342629;padding:3px';b.player(1-b.side).append(badge)}badge.textContent='烙印 3';}b.sceneLabel=b.condition?'相手の城 → 全体破壊 → 烙印3':'相手の城がないため発動不可';return true;}
 if(key==='intercept'){spawn(uid(1),850);spawn(uid(2),1850,b.condition);b.sceneLabel=b.condition?'砲撃兵 → 城／兵士を確認 → 大砲兵':'砲撃兵を召喚';return true;}
 if(key==='budget'){dice(1,550,b.condition?4:1);spawn(uid(0),1550,b.condition);b.sceneLabel=b.condition?'ダイス4 → 兵士召喚':'ダイス1 → 召喚なし';return true;}
 if(key==='castle-reward'){for(let j=0;j<3;j++)spawn(uid(j),1600+j*450,b.condition);b.sceneLabel=t<1400?'城の継続 8 → 9ターン':b.condition?'条件達成 → 騎士3体召喚':'城の不在で継続が途切れる';return true;}
 if(key==='town-reward'){spawn(uid(0),400);spawn(uid(1),1250);const wine=b.el('r3-town-wine');if(wine){wine.style.visibility=t<2050||!b.condition?'hidden':b.nativeDone.has('r3-town-wine')?'hidden':'';panel(wine,pulse(t,2050,2400,2800),t-2050);}const reward=b.el('r3-reward');spawn(reward,2950,b.condition);b.sceneLabel=t<1100?'兵士召喚を達成':t<1900?'カジノ召喚を達成':t<2800?'ワイン発動を達成':b.condition?'街づくり達成 → 支配を手札へ':'未達成 → 報酬なし';return true;}
 if(key==='A001'){spawn(source,180);b.sceneLabel='カードの表面から部材を起こして召喚';return true;}
 if(id==='GM6_8'&&b.trigger==='death'){dieCoat(source,1350);spawn(uid(1),1700);b.sceneLabel=t<1350?'将兵が致命傷を受ける':'将兵がシェルフへ → 兵士召喚';return true;}
 if(id==='GM6_7'&&b.trigger==='enemy-summon'){spawn(enemy,200);dice(1,1100,b.condition?5:2);spawn(uid(1),2100,b.condition);b.sceneLabel=b.condition?'相手召喚 → ダイス5 → 騎士召喚':'相手召喚 → ダイス2 → 召喚なし';return true;}
 spawn(source,150);
 if(id==='CASTLE'){count(source,t<900?0:t<2100?2:b.trigger==='ally-summon'?3:2);if(b.trigger==='ally-summon')spawn(uid(1),1600);}
 if(id==='M11'){spawn(uid(3),1700,b.condition);if(!b.condition)uid(2).style.visibility='hidden';}
 if(id==='GM6_7')spawn(uid(1),1700);
 if(id==='ELITE'){spawn(uid(1),1500,b.condition);spawn(uid(2),1950,b.condition);}
 if(id==='GM5_2'){spawn(uid(1),1550);buff(uid(1),'def',2,2600);}
 if(id==='HORDE')for(const e of field.slice(1))if(['INFKNIGHT','SOLDIER2'].includes(p.field.find((m:any)=>m.uid===e.dataset.uid)?.id))buff(e,'atk',4,2200);
 if(id==='VITAL4'&&t>=1900)for(const e of field.slice(1))if(['INFKNIGHT','SOLDIER2'].includes(p.field.find((m:any)=>m.uid===e.dataset.uid)?.id)){const band=cardStatus(e);if(band&&!band.querySelector('[data-psv="guts"]'))band.insertAdjacentHTML('beforeend',passiveIcon('guts',{count:1,granted:true}));panel(e,pulse(t,1650,2200,3200),t-1650);}
 b.sceneLabel=id==='M11'?!b.condition?'味方が不足 → 騎士召喚なし':'味方2体を確認 → 騎士召喚':id==='ELITE'?!b.condition?'デッキ構成11枚以上 → 追加召喚なし':'デッキ構成10枚以下 → 兵士2体召喚':id==='GM6_8'?'将兵召喚（死亡時効果は場面を切替）':'召喚 → 能力を反映';return true;
}
