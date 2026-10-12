import {getLang} from '../../i18n';
import {decayStateDescription} from '../../shared/cardPresentation';
import {Material,TILE_W,TILE_H} from './material';
import type {Request} from './material';
import {decayFace} from './surface';
export const DECAY_COUNTER_DURATION=2100,DECAY_COUNTER_CONTACT=1680;
type Job={node:HTMLElement;canvas:HTMLCanvasElement;face:HTMLCanvasElement|null;badge:HTMLElement;start:number;before:number;after:number;count:number;finish:(ok:boolean)=>void};
const jobs=new Map<HTMLElement,Job>();
let material:Material|null=null,raf=0,idle:ReturnType<typeof setTimeout>|undefined;
function setCount(badge:HTMLElement,count:number){
 const lang=getLang();badge.textContent=`${lang==='ja'?'腐敗':lang==='en'?'Decay':'부패'} ${count}/3`;
 badge.title=decayStateDescription(count,lang);badge.setAttribute('aria-label',badge.title);badge.style.visibility=count?'visible':'hidden';
}
function stopRenderer(){if(raf)cancelAnimationFrame(raf);raf=0;clearTimeout(idle);material?.dispose();material=null;}
/** Explicit teardown for skip, root removal and tests. The authoritative count still settles. */
export function cancelDecayCounters(root?:HTMLElement){for(const job of [...jobs.values()])if(!root||root===job.node||root.contains(job.node))job.finish(false);if(!jobs.size)stopRenderer();}
function tick(now:number){
 raf=0;const ready:Array<{job:Job;request:Request}>=[];
 for(const job of [...jobs.values()]){
  if(!job.node.isConnected){job.finish(false);continue;}
  if(!job.face)continue;
  if(!job.start)job.start=now;
  const ms=now-job.start,phase=Math.min(1,ms/DECAY_COUNTER_DURATION);
  if(ms>=DECAY_COUNTER_DURATION){job.finish(true);continue;}
  const count=ms<DECAY_COUNTER_CONTACT?job.before:job.after;
  if(count!==job.count){setCount(job.badge,count);job.count=count;}
  const pulse=Math.sin(Math.min(1,Math.max(0,(ms-DECAY_COUNTER_CONTACT)/230))*Math.PI);
  job.badge.style.transform=`scale(${1+pulse*.12})`;job.badge.style.filter=pulse>0?`brightness(${1+pulse*.65})`:'';
  let x=0,y=0,node:HTMLElement|null=job.badge;while(node&&node!==job.node){x+=node.offsetLeft;y+=node.offsetTop;node=node.offsetParent as HTMLElement|null;}
  const anchor:[number,number]=[(x+job.badge.offsetWidth/2)/job.node.offsetWidth,(y+job.badge.offsetHeight/2)/job.node.offsetHeight];
  if(!anchor.every(Number.isFinite)){job.finish(false);continue;}
  job.canvas.dataset.phase=phase.toFixed(3);
  ready.push({job,request:{phase,anchor,face:job.face}});
 }
 try{
  if(ready.length&&!material)material=new Material();
  // One context and one atlas for simultaneous targets, in batches of four.
  for(let i=0;i<ready.length;i+=4){const batch=ready.slice(i,i+4),atlas=material?.drawBatch(batch.map(x=>x.request));if(!atlas)throw new Error('Decay surface lost');
   batch.forEach(({job},index)=>{const ctx=job.canvas.getContext('2d')!;ctx.clearRect(0,0,TILE_W,TILE_H);ctx.drawImage(atlas,index*TILE_W,0,TILE_W,TILE_H,0,0,TILE_W,TILE_H);});
  }
 }catch{for(const {job}of ready)job.finish(false);stopRenderer();}
 if(jobs.size)raf=requestAnimationFrame(tick);
}
export function playDecayCounter(node:HTMLElement,before:number,after:number,opt:{signal?:AbortSignal}={}):Promise<boolean>{
 if(!node.isConnected||opt.signal?.aborted||!Number.isFinite(before)||!Number.isFinite(after)||after<=before)return Promise.resolve(false);
 jobs.get(node)?.finish(false);clearTimeout(idle);
 return new Promise(resolve=>{
  const capture=new AbortController();
  const canvas=document.createElement('canvas');canvas.width=TILE_W;canvas.height=TILE_H;canvas.className='decay-counter-surface';canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:3;pointer-events:none';
  let band=node.querySelector<HTMLElement>('.card-status');if(!band){band=document.createElement('div');band.className='card-status';node.append(band);}
  let badge=band.querySelector<HTMLElement>('.ec-decay-state');if(!badge){badge=document.createElement('span');badge.className='ec ec-decay-state';badge.dataset.status='decay';band.append(badge);}
  const priorBadge=badge.style.cssText;
  const labels=Array.from(node.querySelectorAll<HTMLElement>('.card-name,.card-status,.card-cost,.ad-atk,.ad-def,.badge')).map(el=>({el,z:el.style.zIndex}));
  labels.forEach(({el})=>el.style.zIndex='9');node.append(canvas);setCount(badge,before);
  let done=false,timer:ReturnType<typeof setTimeout>;
  const cancel=()=>finish(false);
  const finish=(ok:boolean)=>{
   if(done)return;done=true;clearTimeout(timer);capture.abort();opt.signal?.removeEventListener('abort',cancel);
   window.removeEventListener('resize',cancel);window.removeEventListener('pagehide',cancel);document.removeEventListener('visibilitychange',cancel);
   canvas.remove();labels.forEach(({el,z})=>el.style.zIndex=z);badge!.style.cssText=priorBadge;setCount(badge!,after);
   jobs.delete(node);resolve(ok);
   if(!jobs.size){if(raf)cancelAnimationFrame(raf);raf=0;idle=setTimeout(stopRenderer,15000);}
  };
  const job:Job={node,canvas,face:null,badge,start:0,before,after,count:before,finish};jobs.set(node,job);
  opt.signal?.addEventListener('abort',cancel,{once:true});window.addEventListener('resize',cancel);window.addEventListener('pagehide',cancel);document.addEventListener('visibilitychange',cancel);
  timer=setTimeout(cancel,5500);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish(true);return;}
  void decayFace(node,capture.signal).then(face=>{if(done)return;job.face=face;if(!raf)raf=requestAnimationFrame(tick);},()=>finish(false));
 });
}
