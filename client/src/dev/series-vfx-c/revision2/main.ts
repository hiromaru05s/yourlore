import '../../../styles/tokens.css';import '../../../styles/base.css';import '../../../styles/card.css';import '../../../styles/game-overlays.css';import '../../../styles/game.css';import '../../../styles/screens.css';import '../../../styles/reading-board.css';import '../../../styles/presentation.css';
import './style.css';
import {GameView,setMyAvatar,setOppAvatar} from '../../../ui/boardView';
import {createGame} from '../../../shared/engine';
import {DB,STARTERS} from '../../../shared/cards';
import {startBoardLayout} from '../../../ui/layout';
import {waitForDuel} from '../../../ui/duelReadiness';
import {setLang} from '../../../i18n';
import {attackStrike,setFxSkip} from '../../../ui/anim';
import {attackPlan,attackPose,drawAttackVisual} from '../../../ui/attackVisual';
import {projectedPlacement} from '../../../ui/boardProjection';
import {passiveIcon} from '../../../ui/passiveIcon';
import {heartArt,claspArt,groundArt} from './art';
import type {CardInst,FieldMon} from '../../../shared/types';
const params=new URLSearchParams(location.search),DURATION=3500,CONTACT=1900,ATTACK=1560;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));const ease=(x:number)=>{x=clamp(x);return x*x*(3-2*x)};
setLang('ja');
if(params.get('stage')!=='r2'){
 document.body.className='r2-shell';
 document.getElementById('app')!.innerHTML=`<header class="r2-panel"><div class="r2-title"><span>LORE / C · REVISION 2</span><h1>気合 — 同じ場に踏みとどまる</h1><small>R2 未承認　｜　<a href="?r1=1">R1 旧不採用案</a></small></div><div class="r2-actions"><div class="r2-direction"><button id="heart" class="selected">① 心印の脈動</button><button id="clasp">② 綴じ金の踏ん張り</button></div><div class="r2-play"><button id="play">▶ 通常速度で再生</button><button id="reset">リセット</button><select id="side" aria-label="対象陣営"><option value="0">自分側</option><option value="1">相手側</option></select></div><div class="r2-frames"><button data-ms="1630">予兆</button><button data-ms="2420">耐久のピーク</button><button data-ms="3020">収束</button><label><input id="baseline" type="checkbox">通常攻撃のみ</label><label><input id="reduced" type="checkbox">動き低減</label></div></div><p id="meaning">付与 → 通常攻撃2を受ける → 気合1を消費し体力1で生存。確定cueの比較局面。</p></header><iframe title="R2 気合の実盤面" src="/series-vfx-c.html?stage=r2"></iframe><div class="r2-status"><b id="phase">盤面準備中</b><span id="clock">0.00 s</span></div>`;
 document.querySelectorAll('button').forEach(b=>b.disabled=true);
 const frame=document.querySelector('iframe')!,get=(id:string)=>document.getElementById(id)!;let api:any,variant=0;
 const apply=()=>{if(!api)return;api.load(variant,+((get('side') as HTMLSelectElement).value));get('heart').classList.toggle('selected',variant===0);get('clasp').classList.toggle('selected',variant===1)};
 get('heart').onclick=()=>{variant=0;apply()};get('clasp').onclick=()=>{variant=1;apply()};get('side').onchange=apply;get('play').onclick=()=>api?.play();get('reset').onclick=()=>api?.reset();document.querySelectorAll<HTMLButtonElement>('[data-ms]').forEach(b=>b.onclick=()=>api?.seek(+b.dataset.ms!));get('baseline').onchange=()=>api?.baseline((get('baseline') as HTMLInputElement).checked);get('reduced').onchange=()=>api?.reduced((get('reduced') as HTMLInputElement).checked);
 const bind=async()=>{api=(frame.contentWindow as any).seriesCR2;if(!api)return;await api.ready;apply();document.querySelectorAll('button').forEach(b=>b.disabled=false);(window as any).seriesCR2=api};frame.onload=()=>{void bind()};
 window.addEventListener('message',e=>{if(e.source!==frame.contentWindow)return;if(e.data?.type==='r2-ready'){void bind();return}if(e.data?.type!=='r2-clock')return;get('phase').textContent=e.data.phase;get('clock').textContent=(e.data.ms/1000).toFixed(2)+' s'});
}else{
 document.body.className='r2-stage';setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
 const g=createGame({mode:'bot',seed:734,starting:0,p0:{id:'r2-self',name:'シーカー'},p1:{id:'r2-opp',name:'相手'}}).state;g.turn=4;g.pending=null;g.opening=undefined;
 const defs={...DB,...STARTERS},card=(id:string,uid:string):CardInst=>({...defs[id],uid}),mon=(id:string,uid:string):FieldMon=>({...card(id,uid),exhausted:false,summonedTurn:0,tempAtk:0,atkMod:0,defMod:0,dmg:0,guts:0});
 const noop=()=>{},view=new GameView(document.getElementById('app')!,0,{onPlay:noop,onBlockedPlay:noop,onAttack:noop,onBlockedAttack:noop,onReorder:noop,onChooseTarget:noop,onBuyMarket:noop,onBuySupply:noop,onRefresh:noop,onEndTurn:noop,onSurrender:noop}),stopLayout=startBoardLayout();
 let target:HTMLElement,source:HTMLElement,overlay:HTMLElement,ground:HTMLElement,shadow:HTMLElement,variant=0,side=0,ms=0,raf=0,start=0,playing=false,attackStarted=false,actualContact:number|null=null,epoch=0,alive=true,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches,renderedPhase=-1,baselineOnly=false;
 let staticAttack:HTMLElement|null=null;const attackCanvas=document.createElement('canvas');attackCanvas.className='r2-attack-canvas';document.body.append(attackCanvas);
 function fixture(){for(const [i,p] of g.players.entries()){p.openingDrawReady=false;p.hp=30;p.mana=8;p.maxMana=12;p.enchants=[];p.traps=[];p.quests=[];p.removed=[];p.discard=[card('STARTER_MANA',`shelf-${i}`)];p.hand=[card('STARTER_CHEST',`hand-${i}`),card('STARTER_TRASH',`cull-${i}`)];p.field=[mon(i===side?'GOLEM1':'SOLDIER2',i===side?'guts-subject':'guts-attacker'),mon('ELF',`neighbor-left-${i}`),mon('INFKNIGHT',`neighbor-right-${i}`),mon('SOLDIER2',`neighbor-fourth-${i}`)];}view.render(g);view.setHandOpen(false);document.querySelector('.help-callout')?.remove();target=document.querySelector('[data-uid="guts-subject"]')!;source=document.querySelector('[data-uid="guts-attacker"]')!;target.classList.add('r2-subject');overlay=document.createElement('div');overlay.className='r2-material';overlay.innerHTML=variant===0?heartArt():claspArt();target.append(overlay);ground=document.createElement('div');ground.className='r2-ground';ground.innerHTML=groundArt;target.parentElement!.append(ground);shadow=document.createElement('div');shadow.className='r2-card-shadow';target.parentElement!.append(shadow);renderedPhase=-1;}
 function visibility(el:Element|null,n:number){if(el)(el as SVGElement).style.opacity=String(clamp(n))}
 function transform(el:Element|null,t:string){if(el)(el as SVGElement).style.transform=t}
 function effects(t:number,contact=CONTACT){
  const grant=ease(t/300)*(1-ease((t-750)/450)),charge=ease((t-220)/580),age=t-contact,hit=age>=0&&age<1400?1:0,recoil=hit?ease(age/60)*(1-ease((age-240)/720)):0,braced=hit?ease((age-180)/220)*(1-ease((age-670)/650)):0,settled=ease((age-670)/650);
  overlay.style.visibility=baselineOnly?'hidden':'';ground.style.visibility=baselineOnly?'hidden':'';shadow.style.visibility=baselineOnly?'hidden':'';
  const hold=t>750&&age<0?1:0,sideSign=side===0?1:-1;
  // Only translation and rigid tilt of the real native card: it never disappears or becomes a mesh.
  target.style.translate=reduced||baselineOnly?'':`${(variant===0?-.035:.022)*target.offsetWidth*recoil}px ${sideSign*target.offsetWidth*(variant===0?.19:.12)*recoil}px`;
  target.style.rotate=reduced||baselineOnly?'':`${sideSign*(variant===0?-2.8:1.6)*recoil}deg`;target.style.transformOrigin=side===0?'50% 86%':'50% 14%';
  target.dataset.r2Cue=age<0?'granted':'lethal-survival';
  const offset=target.offsetLeft,top=target.offsetTop,w=target.offsetWidth,h=target.offsetHeight;
  ground.style.cssText=`left:${offset-w*.13}px;top:${top+h*.57}px;width:${w*1.26}px;height:${w*.63}px`;shadow.style.cssText=`left:${offset+w*.06}px;top:${top+h*.68}px;width:${w*.88}px;height:${w*.16}px;opacity:${.15+braced*.17}`;
  visibility(ground.querySelector('.contact-shadow'),braced);visibility(ground.querySelector('.ground-shear'),variant===1?braced*.9:braced*.3);visibility(ground.querySelector('.ground-fragments'),variant===1?braced*(1-ease(age/500)):0);
  transform(ground.querySelector('.ground-shear'),`translateY(${reduced?0:ease(age/500)*4}px) scaleX(${1+ease(age/500)*.15})`);
  if(variant===0){
   const beat=age<0?Math.sin(clamp(t/900)*Math.PI):Math.sin(clamp((age-140)/580)*Math.PI)*.85;
   const heart=overlay.querySelector('.heart-relief');visibility(heart,(grant*.88+hold*.38+braced)*(1-settled));transform(heart,`translate(${recoil*1.5}px,${recoil*4}px) scale(${1+braced*.28+beat*.06},${1+braced*.28-beat*.05})`);
   visibility(overlay.querySelector('.core-light'),(grant*.55+hold*.25+braced)*(1-settled));transform(overlay.querySelector('.core-light'),`scale(${1+braced*.3})`);
   visibility(overlay.querySelector('.pulse-veins'),(grant*.45+braced*.8)*(1-settled));
   visibility(overlay.querySelector('.resist-cut'),0);transform(overlay.querySelector('.resist-cut'),`translateY(${-ease(age/400)*14}px) scale(${1+ease(age/400)*.23})`);
  }else{
   const presence=charge*(1-settled),spread=(1-ease((t-180)/450))*24;
   visibility(overlay.querySelector('.clasp-left'),presence);visibility(overlay.querySelector('.clasp-right'),presence*.94);
   transform(overlay.querySelector('.clasp-left'),`translate(${-spread+recoil*2}px,${recoil*7}px) rotate(${-recoil*5}deg)`);
   transform(overlay.querySelector('.clasp-right'),`translate(${spread-recoil*3}px,${recoil*4}px) rotate(${recoil*3}deg)`);
   visibility(overlay.querySelector('.metal-stress'),grant*.4+braced*.95);
  }
  const state=t<700?0:age<0?1:2;if(state!==renderedPhase){renderedPhase=state;const status=target.querySelector('.card-status')!;status.querySelector('[data-psv="guts"]')?.remove();status.insertAdjacentHTML('beforeend',passiveIcon('guts',{count:state===1?1:0,granted:state>0}));target.querySelector('.ad-def .seal-value')!.textContent=state===2?'1':String(defs.GOLEM1.def);}
  target.querySelector<HTMLElement>('[data-psv="guts"]')!.style.filter='';
  const phase=t<700?'気合を付与':age<0?'気合1 — 同じ場で攻撃を待つ':age<450?'致命傷を耐える — 気合1を消費':age<1100?'踏みとどまり、体力1で生存':'収束 — カードは同じ場に残る';
  parent.postMessage({type:'r2-clock',ms:t,phase},location.origin);
 }
 function cleanStatic(){staticAttack?.remove();staticAttack=null;source.style.visibility='';attackCanvas.getContext('2d')!.clearRect(0,0,attackCanvas.width,attackCanvas.height)}
 function paintStaticAttack(t:number){cleanStatic();const age=t-ATTACK;if(age<0||age>=880||reduced)return;target.style.translate='';target.style.rotate='';const from=source.getBoundingClientRect(),to=target.getBoundingClientRect(),plan=attackPlan(from,to),pose=attackPose(plan,age),w=source.offsetWidth,h=source.offsetHeight;
  staticAttack=source.cloneNode(true) as HTMLElement;staticAttack.removeAttribute('data-uid');staticAttack.classList.add('fx-card-flight');staticAttack.style.cssText=`position:fixed;left:0;top:0;width:${w}px;height:${h}px;--cw:${w}px;--ch:${h}px;transform-origin:0 0;pointer-events:none;z-index:125;visibility:visible`;staticAttack.style.transform=new DOMMatrix().translate(pose.x,pose.y).rotate(pose.turn).scale(pose.scale).translate(-plan.origin.x,-plan.origin.y).multiply(projectedPlacement(source,w,h)).toString();document.body.append(staticAttack);source.style.visibility='hidden';const dpr=Math.min(devicePixelRatio,2);attackCanvas.width=innerWidth*dpr;attackCanvas.height=innerHeight*dpr;const c=attackCanvas.getContext('2d')!;c.scale(dpr,dpr);drawAttackVisual(c,from,to,age/1000);
 }
 function stop(){epoch++;playing=false;cancelAnimationFrame(raf);setFxSkip(true);cleanStatic();target?.getAnimations().forEach(a=>a.cancel());setFxSkip(false)}
 function seek(t:number){stop();ms=t;paintStaticAttack(t);effects(t)}
 function reset(){stop();ms=0;actualContact=null;attackStarted=false;effects(0)}
 function load(v:number,s=0){stop();variant=v;side=s;ground?.remove();shadow?.remove();fixture();ms=0;effects(0)}
 function play(){reset();playing=true;start=performance.now();const seq=epoch;
  const tick=(now:number)=>{if(!playing||seq!==epoch||!alive)return;ms=Math.min(DURATION,now-start);if(!attackStarted&&ms>=ATTACK){attackStarted=true;if(reduced){actualContact=CONTACT;}else void attackStrike('guts-attacker','guts-subject',side===0?'me':'opp',()=>{if(seq!==epoch)return;actualContact=performance.now()-start;if(!baselineOnly)target.getAnimations().forEach(a=>a.cancel());}).catch(console.error)}effects(ms,actualContact??(attackStarted?Number.POSITIVE_INFINITY:CONTACT));if(ms>=DURATION){playing=false;return}raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);
 }
 function dispose(){if(!alive)return;stop();alive=false;attackCanvas.remove();ground?.remove();shadow?.remove();stopLayout();view.destroy();window.removeEventListener('pagehide',dispose);document.removeEventListener('visibilitychange',onHidden);window.removeEventListener('resize',onResize)}
 function onHidden(){if(document.hidden)reset()}function onResize(){reset()}
 fixture();const ready=(async()=>{await waitForDuel(document.getElementById('app')!);await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));effects(0)})();
 (window as any).seriesCR2={ready,load,play,reset,seek,baseline:(v:boolean)=>{baselineOnly=v;seek(ms)},reduced:(v:boolean)=>{reduced=v;seek(ms)},dispose,snapshot:()=>({variant,side,baselineOnly,ms,playing,actualContact,uid:target.dataset.uid,visible:getComputedStyle(target).visibility,hp:target.querySelector('.ad-def .seal-value')?.textContent,guts:target.querySelector('[data-psv="guts"] b')?.textContent??'0'})};
 void ready.then(()=>parent.postMessage({type:'r2-ready'},location.origin));window.addEventListener('pagehide',dispose);document.addEventListener('visibilitychange',onHidden);window.addEventListener('resize',onResize);
}
