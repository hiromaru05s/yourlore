import {isMimic} from '../mimic/selection';
import {STANDARD_FX,SPECIAL_FX} from '../animationTempo';
import {sizeSummonPlane} from './quality';
import {isCastle} from '../castleSummon/catalog';
import {playCastleSummon,cancelCastleSummon,cancelCastleSummons} from '../castleSummon/runtime';
import {isPoisonSummon} from '../poisonSummon/selection';
import {playPoisonSummon,cancelPoisonSummon,cancelPoisonSummons} from '../poisonSummon/runtime';
import {isWeaponmaster} from '../weaponmasterSummon/selection';
import {playWeaponmasterSummon,cancelWeaponmasterSummon,cancelWeaponmasterSummons} from '../weaponmasterSummon/runtime';
import {isShieldTitan} from '../shieldTitanSummon/selection';
import {playShieldTitanSummon,cancelShieldTitanSummon,cancelShieldTitanSummons} from '../shieldTitanSummon/runtime';
import {isDungeon} from '../dungeonSummon/selection';
import {playDungeonSummon,cancelDungeonSummon,cancelDungeonSummons} from '../dungeonSummon/runtime';
import {isVampire} from '../vampireSummon/selection';
import {playVampireSummon,cancelVampireSummon,cancelVampireSummons} from '../vampireSummon/runtime';
import {merchantCount,MERCHANT_VARIANT} from '../merchant/selection';
import type {Coins} from '../merchant/coins';
import type {ContactSound} from '../merchant/sound';
import {isAssassin} from '../assassinSummon/selection';
import {playAssassinSummon,cancelAssassinSummon,cancelAssassinSummons} from '../assassinSummon/runtime';
import {isMage} from '../mageSummon/selection';
import {playMageSummon,cancelMageSummon,cancelMageSummons} from '../mageSummon/runtime';
import {isMercenary} from '../mercenarySummon/selection';
import {playMercenarySummon,cancelMercenarySummon,cancelMercenarySummons} from '../mercenarySummon/runtime';
import {isGambler} from '../gamblerSummon/selection';
import {playGamblerSummon,cancelGamblerSummon,cancelGamblerSummons} from '../gamblerSummon/runtime';
import {isHexer} from '../hexerSummon/selection';
import {playHexerSummon,cancelHexerSummon,cancelHexerSummons} from '../hexerSummon/runtime';
import {isChosenHero} from '../chosenSummon/selection';
import {chosenPlacement,playChosenSummon,cancelChosenSummon,cancelChosenSummons} from '../chosenSummon/runtime';
import {boardMatrix,layoutRect,projectedPlacement} from '../boardProjection';
import {Renderer} from './renderer';
import {DURATION,motion,ease} from './catalog';
import {isVerdant} from '../verdant/selection';
import {playVerdant,cancelVerdant,cancelVerdants} from '../verdant/runtime';

/** Approved #3. The same material and timeline power the six-way preview. */
export const SUMMON_VARIANT=2;
const jobs=new Map<HTMLElement,{anchor:HTMLElement;cancel:()=>void}>();
type Options={anchor?:HTMLElement;signal?:AbortSignal;onImpact?:()=>void};
export function summonPlacement(target:HTMLElement,w:number,h:number,ms=0,reduced=false,cardId=target.dataset.cardId){
 if(isCastle(cardId))return projectedPlacement(target,w,h);
 if(isPoisonSummon(cardId))return projectedPlacement(target,w,h);
 if(isWeaponmaster(cardId))return projectedPlacement(target,w,h);
 if(isShieldTitan(cardId))return projectedPlacement(target,w,h);
 if(isDungeon(cardId))return projectedPlacement(target,w,h);
 if(isVampire(cardId))return projectedPlacement(target,w,h);
 if(isAssassin(cardId))return projectedPlacement(target,w,h);
 if(isMage(cardId))return projectedPlacement(target,w,h);
 if(isChosenHero(cardId))return chosenPlacement(target,w,h,ms,reduced);
 if(isMercenary(cardId)||isGambler(cardId)||isHexer(cardId))return projectedPlacement(target,w,h);
 if(isVerdant(cardId))return projectedPlacement(target,w,h);
 const m=motion(SUMMON_VARIANT,ms,reduced),plane=target.closest<HTMLElement>('[data-board-plane]');
 if(!plane)return projectedPlacement(target,w,h).translate(0,-m.lift*w);
 const r=layoutRect(target);
 return boardMatrix(r.left,r.top,(Number(plane.dataset.boardPlane)||0)+m.lift*r.width).scale(r.width/w,r.height/h);
}
export function cancelSummon(source:HTMLElement){cancelCastleSummon(source);cancelPoisonSummon(source);cancelShieldTitanSummon(source);cancelWeaponmasterSummon(source);cancelDungeonSummon(source);cancelVampireSummon(source);jobs.get(source)?.cancel();cancelAssassinSummon(source);cancelMageSummon(source);cancelVerdant(source);cancelChosenSummon(source);cancelHexerSummon(source);cancelGamblerSummon(source);cancelMercenarySummon(source);}
export function cancelSummons(root?:HTMLElement){cancelCastleSummons(root);cancelPoisonSummons(root);cancelShieldTitanSummons(root);cancelWeaponmasterSummons(root);cancelDungeonSummons(root);cancelVampireSummons(root);cancelAssassinSummons(root);cancelMageSummons(root);cancelMercenarySummons(root);cancelGamblerSummons(root);cancelVerdants(root);cancelChosenSummons(root);cancelHexerSummons(root);for(const [source,j] of [...jobs])if(!root||root.contains(source)||root.contains(j.anchor))j.cancel();}

export function playSlateSummon(source:HTMLElement,options:Options={}):Promise<boolean>{
 cancelSummon(source);
 if(isCastle(source.dataset.cardId))return playCastleSummon(source,options);
 if(isPoisonSummon(source.dataset.cardId))return playPoisonSummon(source,options);
 if(isShieldTitan(source.dataset.cardId))return playShieldTitanSummon(source,options);
 if(isWeaponmaster(source.dataset.cardId))return playWeaponmasterSummon(source,options);
 if(isDungeon(source.dataset.cardId))return playDungeonSummon(source,options);
 if(isVampire(source.dataset.cardId))return playVampireSummon(source,options);
 if(isAssassin(source.dataset.cardId))return playAssassinSummon(source,options);
 if(isMage(source.dataset.cardId))return playMageSummon(source,options);
 if(isMercenary(source.dataset.cardId))return playMercenarySummon(source,options);
 if(isGambler(source.dataset.cardId))return playGamblerSummon(source,options);
 if(isHexer(source.dataset.cardId))return playHexerSummon(source,options);
 if(isChosenHero(source.dataset.cardId))return playChosenSummon(source,options);
 if(isVerdant(source.dataset.cardId))return playVerdant(source,source.dataset.cardId,options);
 const anchor=options.anchor??source,coinsCount=merchantCount(source.dataset.cardId),total=coinsCount?3100:DURATION;
 const clock=coinsCount||isMimic(source.dataset.cardId??'')?SPECIAL_FX:STANDARD_FX;
 if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted)return Promise.resolve(false);
 return new Promise(resolve=>{
  const visibility=source.style.visibility,originalTransform=source.style.transform,originalOrigin=source.style.transformOrigin;
  let coins:Coins|undefined,coinSound:ContactSound|undefined;
  const reflections:HTMLElement[]=[];
  let ended=false,frame=0,renderer:Renderer|undefined,host:HTMLElement|undefined,captureHost:HTMLElement|undefined;
  const finish=(complete=false)=>{
   if(ended)return;ended=true;clearTimeout(timeout);cancelAnimationFrame(frame);
   options.signal?.removeEventListener('abort',abort);host?.remove();captureHost?.remove();renderer?.dispose();coins?.dispose();coinSound?.dispose();
   reflections.forEach(n=>n.remove());source.style.visibility=visibility;source.style.transform=originalTransform;source.style.transformOrigin=originalOrigin;jobs.delete(source);resolve(complete);
  };
  const abort=()=>finish(false),timeout=setTimeout(abort,6000);
  jobs.set(source,{anchor,cancel:abort});options.signal?.addEventListener('abort',abort,{once:true});
  void (async()=>{
   const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
   if(reduced){options.onImpact?.();finish(true);return;}
   // The live card is the only printed face. No captured/downsampled replacement.
   const face=document.createElement('canvas');face.width=face.height=1;
   // Preserve the authored surface sweep on the native art and frame. Its mask
   // is the existing print, so reflection cannot create a rectangular backing.
   for(const layer of source.querySelectorAll<HTMLElement>(':scope > .card-art,:scope > .card-frame')){
    const sheen=document.createElement('div');sheen.className='native-summon-reflection';sheen.style.cssText='position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;background:linear-gradient(20deg,transparent 43%,#ccbaa0 49%,#fff9de 50%,#ccbaa0 51%,transparent 57%);background-size:100% 300%;opacity:0';
    if(layer.classList.contains('card-frame')){sheen.style.maskImage=getComputedStyle(layer).backgroundImage;sheen.style.maskSize='100% 100%';}
    layer.append(sheen);reflections.push(sheen);
   }
   if(coinsCount){const [visual,audio]=await Promise.all([import('../merchant/coins'),import('../merchant/sound')]);if(ended)return;coins=new visual.Coins();coinSound=new audio.ContactSound(coinsCount);}
   renderer=new Renderer();
   host=document.createElement('div');host.className='slate-summon';host.setAttribute('aria-hidden','true');
   host.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:136;isolation:isolate';
   const planes=['ground'].map(pass=>{
    const el=document.createElement('div');el.dataset.summonPass=pass;
    el.style.cssText='position:absolute;left:0;top:0;width:180px;height:270px;transform-origin:0 0';
    const canvas=document.createElement('canvas');sizeSummonPlane(canvas,684);
    canvas.style.cssText='position:absolute;left:-252px;top:-207px;width:684px;height:684px';
    el.append(canvas);host!.append(el);return {el,c:canvas.getContext('2d')!,pass:pass as 'ground'|'card'};
   });
   document.body.append(host);source.style.visibility='visible';
   const ground=projectedPlacement(anchor,180,270).toString(),start=clock.now();let impacted=false;
   const tick=(now:number)=>{
    if(ended)return;
    if(!source.isConnected||!anchor.isConnected||document.hidden||options.signal?.aborted){finish();return;}
    const ms=Math.max(0,Math.min(total,now-start));
    const hit=motion(SUMMON_VARIANT,ms).hit,charge=ease(70,hit*.75,ms)*(1-ease(hit+45,hit+350,ms));for(const sheen of reflections){sheen.style.opacity=String(charge*.075);sheen.style.backgroundPosition=`50% ${100-ease(0,hit+180,ms)*100}%`;}
    host!.dataset.time=String(Math.round(ms));host!.dataset.variant=coinsCount?'merchant-03':'slate';if(coinsCount)host!.dataset.coinCount=String(coinsCount);coinSound?.advance(ms);
    if(!impacted&&ms>=790){impacted=true;options.onImpact?.();if(ended)return;}
    for(const {el,c,pass} of planes){
     el.style.transform=pass==='ground'?ground:summonPlacement(anchor,180,270,ms).toString();
     c.clearRect(0,0,684,684);renderer!.draw(c,face,SUMMON_VARIANT,Math.min(DURATION,ms),342,342,180,false,pass,false);if(pass==='ground')coins?.draw(c,MERCHANT_VARIANT,coinsCount,ms,342,342,180,false);
    }
    const w=source.offsetWidth,h=source.offsetHeight;source.style.transformOrigin='0 0';
    let pose=summonPlacement(anchor,w,h,ms);
    const arrival=source.dataset.summonRest==='blocked'?ease(DURATION-180,DURATION,ms):0,scale=motion(SUMMON_VARIANT,Math.min(DURATION,ms)).scale*(1-.018*arrival);
    pose=pose.translate(w/2,h/2+w*.035*arrival).scale(scale).translate(-w/2,-h/2);
    source.style.transform=(source.classList.contains('fx-field-ghost')?pose:projectedPlacement(source,w,h).inverse().multiply(pose)).toString();
    if(ms===total){finish(true);return;}frame=clock.requestFrame(tick);
   };tick(start);
  })().catch(error=>{if(!ended){console.warn('[summon] Native card fallback',error);options.onImpact?.();finish();}});
 });
}
window.addEventListener('resize',()=>cancelSummons());
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelSummons();});
