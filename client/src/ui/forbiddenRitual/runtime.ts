import {FRAME_BACK} from '../../shared/cards';
import {captureCardSurface,CARD_PADDING} from '../cardSurface';
import {DURATION,type Rect} from './model';
import {createRenderer} from './renderer';

/** Approved revision 3 / 03: three counter-rotating seals and one shared summon. */
export const FORBIDDEN_RITUAL_SELECTION='spiral-blood-pact-03';
const jobs=new Map<HTMLElement,()=>void>();
export function cancelForbiddenRituals(){for(const cancel of [...jobs.values()])cancel();}
export function playForbiddenRitual(source:HTMLElement,targets:HTMLElement[],side:'me'|'opp',signal?:AbortSignal):Promise<boolean>{
 jobs.get(source)?.();
 if(signal?.aborted||document.hidden||!source.isConnected||!targets.length)return Promise.resolve(false);
 if(matchMedia('(prefers-reduced-motion:reduce)').matches)return Promise.resolve(true);
 return new Promise(resolve=>{
  let ended=false,raf=0,renderer:ReturnType<typeof createRenderer>|undefined,host:HTMLElement|undefined,captureHost:HTMLElement|undefined;
  const previous=source.style.visibility;
  const finish=(completed=false)=>{
   if(ended)return;ended=true;cancelAnimationFrame(raf);clearTimeout(timer);signal?.removeEventListener('abort',cancel);
   window.removeEventListener('resize',cancel);document.removeEventListener('visibilitychange',cancel);window.removeEventListener('pagehide',cancel);
   renderer?.dispose();host?.remove();captureHost?.remove();source.style.visibility=previous;jobs.delete(source);resolve(completed);
  };
  const cancel=()=>finish(false),timer=setTimeout(cancel,DURATION+5000);
  jobs.set(source,cancel);signal?.addEventListener('abort',cancel,{once:true});window.addEventListener('resize',cancel);document.addEventListener('visibilitychange',cancel);window.addEventListener('pagehide',cancel);
  void (async()=>{
   captureHost=document.createElement('div');captureHost.className='game';captureHost.style.cssText='position:fixed;left:-4000px;top:0;pointer-events:none';document.body.append(captureHost);
   const faces:HTMLCanvasElement[]=[];
   for(const node of [source,...targets]){
    if(ended)return;
    const copy=node.cloneNode(true) as HTMLElement;copy.removeAttribute('id');copy.removeAttribute('data-uid');copy.classList.remove('fx-card-flight','fx-field-ghost','cast-reveal');
    const originalWidth=node.offsetWidth||180;
    copy.querySelectorAll<HTMLElement>('[style]').forEach(el=>{if(el.style.fontSize.endsWith('px'))el.style.fontSize=`${parseFloat(el.style.fontSize)*180/originalWidth}px`;});
    copy.style.cssText='position:relative;width:180px;height:270px;--cw:180px;--ch:270px;transform:none;opacity:1;visibility:visible';captureHost.append(copy);
    const surface=await captureCardSurface(copy,FRAME_BACK,true,false);copy.remove();if(ended)return;if(!surface.face)throw Error('Missing public ritual card face');
    const c=document.createElement('canvas');c.width=384;c.height=576;const pad=surface.face.width*CARD_PADDING/(1+CARD_PADDING*2);
    c.getContext('2d')!.drawImage(surface.face,pad,pad,surface.face.width-2*pad,surface.face.height-2*pad,0,0,c.width,c.height);faces.push(c);
   }
   captureHost.remove();captureHost=undefined;if(ended||signal?.aborted)return;
   renderer=createRenderer(faces);host=document.createElement('div');host.className='forbidden-ritual';host.dataset.selection=FORBIDDEN_RITUAL_SELECTION;host.setAttribute('aria-hidden','true');host.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:138';host.append(renderer.canvas);document.body.append(host);
   const rect=(node:HTMLElement):Rect=>{const r=node.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height};};
   const from=rect(source),to=targets.map(rect);if(!from.w||to.some(r=>!r.w)){finish();return;}
   source.style.visibility='hidden';const start=performance.now();
   const tick=(now:number)=>{
    if(ended)return;if(signal?.aborted||document.hidden||!source.isConnected||targets.some(n=>!n.isConnected)){finish();return;}
    const time=Math.max(0,Math.min(DURATION,now-start));host!.dataset.time=String(Math.round(time));
    try{renderer!.draw({time,side:side==='me'?0:1,source:from,targets:to,width:innerWidth,height:innerHeight});}catch{finish();return;}
    if(time>=DURATION){finish(true);return;}raf=requestAnimationFrame(tick);
   };tick(start);
  })().catch(()=>finish(false));
 });
}
