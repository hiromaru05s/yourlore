import {approvedExtinction,isExtinction,type Family} from './catalog';
import {Renderer,loadAssets,type Assets} from './renderer';

type Side = 'me' | 'opp';
type Job = {done:Promise<void>;finish:()=>void};
const jobs = new Map<string,Job>();
let assets:Promise<Assets>|undefined;
let renderer:Renderer|undefined;
const load = () => assets ??= loadAssets().catch(error => {assets=undefined;throw error;});
export function warmStatusExtinctions():void {void load().catch(()=>{});}
export function cancelStatusExtinctions():void {for(const job of [...jobs.values()])job.finish();}
export function disposeStatusExtinctions():void {cancelStatusExtinctions();renderer?.dispose();renderer=undefined;}

/** The engine has already committed zero. Keep only its old public badge until its material is gone. */
export function playStatusExtinction(side:Side,resource:Family,before:number,after:number):Promise<void> {
  if(!isExtinction(before,after))return Promise.resolve();
  const key=side+resource,existing=jobs.get(key);
  if(existing)return existing.done;
  const target=document.querySelector<HTMLElement>(`#${side==='me'?'portraitMe':'portraitOpp'} .pt-${resource}`);
  if(!target)return Promise.resolve();
  if(document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches){target.remove();return Promise.resolve();}
  const study=approvedExtinction(resource);
  let resolve!:()=>void;
  const done=new Promise<void>(r=>resolve=r);
  let ended=false,frame=0,host:HTMLCanvasElement|undefined;
  const finish=()=>{
    if(ended)return;ended=true;clearTimeout(timeout);cancelAnimationFrame(frame);
    host?.remove();target.remove();jobs.delete(key);resolve();
  };
  // A failed image or suspended GPU must never hold up the controller's event queue.
  const timeout=setTimeout(finish,study.duration+1800);
  jobs.set(key,{done,finish});
  void load().then(images=>{
    if(ended)return;
    if(!target.isConnected||document.hidden){finish();return;}
    const rect=target.getBoundingClientRect();
    if(rect.width<1||rect.height<1){finish();return;}
    let material:Renderer|undefined;
    try {material=renderer??=new Renderer(images);} catch { /* The native face below provides a short fallback. */ }
    host=document.createElement('canvas');host.className='status-extinction';host.dataset.variant=study.id;host.dataset.side=side;
    host.dataset.resource=resource;host.dataset.before=String(before);host.dataset.fallback=String(!material);host.setAttribute('aria-hidden','true');
    host.style.cssText='position:fixed;pointer-events:none;z-index:172';
    const extent=Math.max(rect.width,rect.height)*1.9,dpr=Math.min(2,devicePixelRatio||1);
    host.width=host.height=Math.ceil(extent*dpr);host.style.width=host.style.height=extent+'px';
    const c=host.getContext('2d');if(!c){finish();return;}
    document.body.append(host);
    const readout=target.querySelector('b'),style=readout?getComputedStyle(readout):undefined;
    const native=()=>{
      c.drawImage(images[resource],(extent-rect.width)/2,(extent-rect.height)/2,rect.width,rect.height);
      c.font=style?`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`:'600 16px serif';
      c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff8e7';c.shadowColor='#000b';c.shadowBlur=2;
      c.fillText(String(before),extent/2,extent/2+rect.height*(resource==='shield'?-.04:resource==='dew'?.035:0));c.shadowBlur=0;
    };
    // First frame is painted before suppressing the native face: no missing-frame flash.
    const start=performance.now(),duration=material?study.duration:160;
    const tick=(now:number)=>{
      if(ended)return;
      if(!target.isConnected||document.hidden){finish();return;}
      const ms=Math.min(duration,now-start),r=target.getBoundingClientRect();
      if(r.width<1||r.height<1){finish();return;}
      host!.style.left=r.x+r.width/2-extent/2+'px';host!.style.top=r.y+r.height/2-extent/2+'px';
      try {
        c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,extent,extent);
        if(material)material.draw(c,study,ms,extent/2,extent/2,r.width,r.height,before);
        else {c.save();c.globalAlpha=1-ms/duration;native();c.restore();}
        target.style.visibility='hidden';host!.dataset.time=String(Math.round(ms));
        if(ms>=duration)finish();else frame=requestAnimationFrame(tick);
      } catch {finish();}
    };
    tick(start);
  }).catch(finish);
  return done;
}

if(typeof window!=='undefined'){
  window.addEventListener('resize',cancelStatusExtinctions);
  window.addEventListener('pagehide',disposeStatusExtinctions);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelStatusExtinctions();});
}
