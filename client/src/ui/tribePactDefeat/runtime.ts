import './style.css';
import type {TribePactDefeat} from '../../shared/types';
import {getLang} from '../../i18n';
import {captureQuestTile} from '../cardSurface';
import {projectedPlacement} from '../boardProjection';
import {PACT_DURATION,smooth,PactMaterial} from './material';
import {sfx} from '../sound';
type Side='me'|'opp';
const copy=()=>getLang()==='ja'?{name:'多種族契約',title:'契約不履行',condition:'45ターン到達 · 種族シナジー未達成',me:'あなたの敗北',opp:'相手の敗北'}:getLang()==='ko'?{name:'다종족 계약',title:'계약 불이행',condition:'45턴 도달 · 종족 시너지 미발동',me:'당신의 패배',opp:'상대의 패배'}:{name:'Multi-Tribe Pact',title:'CONTRACT BROKEN',condition:'Turn 45 reached · No tribe synergy activated',me:'YOU LOSE',opp:'OPPONENT LOSES'};
export function tribePactVerdict(side:Side):string {const c=copy();return `${c.name} — ${c.title} · ${c[side]}`;}
let cancelActive:(()=>void)|undefined;
export function cancelTribePactDefeat(){cancelActive?.();}
/** An authoritative win cause is the only trigger. Never infer defeat from logs or HP. */
export async function playTribePactDefeat(cause:TribePactDefeat,side:Side):Promise<void>{
 cancelActive?.();if(document.hidden)return;
 const source=[...document.querySelectorAll<HTMLElement>('.buff-icon[data-uid]')].find(n=>n.dataset.uid===cause.uid)??null;
 const target=document.getElementById(side==='me'?'portraitMe':'portraitOpp');
 const host=document.createElement('div');host.className='pact-defeat';host.dataset.side=side;host.dataset.phase='preparing';host.setAttribute('role','status');host.setAttribute('aria-live','assertive');
 const c=copy();host.setAttribute('aria-label',`${tribePactVerdict(side)}. ${c.condition}`);
 const shade=document.createElement('div');shade.className='pact-defeat__shade';
 const words=document.createElement('div');words.className='pact-defeat__words';
 for(const [kind,text] of [['name',c.name],['title',c.title],['condition',c.condition],['verdict',c[side]]]){const el=document.createElement('div');el.className=`pact-defeat__${kind}`;el.textContent=text;words.append(el);}
 const contact=document.createElement('div');contact.className='pact-defeat__contact';
 host.append(shade,contact,words);document.body.append(host);
 const motion=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,timer=0,ended=false,material:PactMaterial|undefined,ghost:HTMLElement|undefined,resolve!:()=>void;
 const original=source?.style.visibility??'';const done=new Promise<void>(r=>resolve=r);
 const finish=()=>{if(ended)return;ended=true;cancelAnimationFrame(frame);clearTimeout(timer);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',finish);motion.removeEventListener('change',finish);if(source)source.style.visibility=original;ghost?.remove();material?.dispose();host.remove();if(cancelActive===finish)cancelActive=undefined;resolve();};
 const hidden=()=>{if(document.hidden)finish();};cancelActive=finish;
 document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',finish,{once:true});motion.addEventListener('change',finish,{once:true});timer=window.setTimeout(finish,9000);
 const fallback=()=>{host.dataset.phase='static';shade.style.opacity='.6';clearTimeout(timer);timer=window.setTimeout(finish,1800);};
 try{
  if(motion.matches||!source||!target||!source.offsetWidth||!source.offsetHeight){fallback();return await done;}
  // Capture native flat layout before projecting the same face into screen space.
  ghost=document.createElement('div');ghost.className='game';
  ghost.style.cssText='position:fixed;left:-4000px;top:0;visibility:hidden;pointer-events:none;transform:none';
  const tile=source.cloneNode(true) as HTMLElement;
  // The phone's compressed rail can be only 5px wide, with a 10px minimum
  // label. Unfold to the native 4:5 spell face before rasterizing: magnifying
  // that compressed layout would stretch the art and inflate its cost seal.
  tile.style.cssText='position:relative;width:160px;height:200px;transform:none;translate:none';
  for(const layer of tile.querySelectorAll<HTMLElement>('.buff-frame,.buff-art'))
   layer.style.cssText='position:absolute;inset:0;width:100%;height:100%;'+(layer.getAttribute('style')?.match(/background-image:[^;]+/)?.[0]??'');
  const cost=tile.querySelector<HTMLElement>('.buff-cost')!;
  cost.style.cssText='left:-6%;top:-2%;width:26%;height:20.8%;font-size:50px;line-height:1';
  const span=cost.querySelector<HTMLElement>('span');if(span)span.style.fontSize='inherit';
  const originals=[...source.querySelectorAll<HTMLCanvasElement>('canvas')],copies=[...tile.querySelectorAll<HTMLCanvasElement>('canvas')];
  originals.forEach((from,i)=>{const to=copies[i];to.width=from.width;to.height=from.height;to.style.width='100%';to.style.height='100%';if(from.width&&from.height)to.getContext('2d')?.drawImage(from,0,0);});
  ghost.append(tile);document.body.append(ghost);
  const face=await Promise.race([captureQuestTile(tile),done.then(()=>null)]);
  if(ended)return;if(!face){fallback();return await done;}
  material=new PactMaterial(face);ghost.remove();ghost=undefined;
  const canvas=material.canvas;canvas.className='pact-defeat__canvas';canvas.setAttribute('aria-hidden','true');host.insertBefore(canvas,words);
  const startMatrix=projectedPlacement(source,300,300*material.ratio).translate(150,150*material.ratio).toFloat64Array();
  source.style.visibility='hidden';const start=performance.now();let struck=false;host.dataset.phase='playing';
  clearTimeout(timer);timer=window.setTimeout(finish,PACT_DURATION+200);
  const draw=(now:number)=>{if(ended)return;if(!source.isConnected||!target.isConnected){finish();return;}
   const t=Math.min(PACT_DURATION,now-start),rise=smooth(0,1050,t),travel=smooth(3350,4200,t),size=Math.min(270,innerWidth*.55,innerHeight*(innerHeight<560?.27:.37));
   host.dataset.time=String(Math.round(t));host.dataset.phase=t<1550?'reveal':t<2200?'breach':t<3350?'tear':t<4250?'judgment':'verdict';
   const tr=(target.querySelector('.pt-ring')??target).getBoundingClientRect(),tx=tr.left+tr.width/2,ty=tr.top+tr.height/2;
   const x=innerWidth*.5+(tx-innerWidth*.5)*travel,y=innerHeight*.36+(ty-innerHeight*.36)*travel;
   const scale=size/300*(1-travel*.88),end=new DOMMatrix().translate(x,y).rotate(-3*(1-travel)).scale(scale).toFloat64Array();
   const matrix=new DOMMatrix(Array.from(startMatrix,(v,i)=>v+(end[i]-v)*rise));
   canvas.style.transform=matrix.translate(-326.087,-326.087).toString();
   canvas.style.opacity=String(1-smooth(4130,4340,t));material!.draw(t);
   shade.style.opacity=String(smooth(100,1100,t)*.85);words.style.opacity=String(smooth(1380,1800,t));
   contact.style.cssText=`left:${tr.left-4}px;top:${tr.top-4}px;width:${tr.width+8}px;height:${tr.height+8}px;opacity:${smooth(4120,4250,t)*(1-smooth(4370,4770,t))}`;
   if(t>=1910&&!struck){struck=true;sfx('death');}
   if(t>=PACT_DURATION)finish();else frame=requestAnimationFrame(draw);
  };draw(start);await done;
 }catch(error){console.warn('[tribe pact defeat]',error);if(!ended){if(source)source.style.visibility=original;material?.dispose();material=undefined;host.querySelector('canvas')?.remove();fallback();await done;}}
 finally{finish();}
}
