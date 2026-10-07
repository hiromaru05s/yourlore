import {GrantMaterial,approvedGrant} from './material';
import {Surface} from './surface';
import {transferLight} from './light';
import {t} from '../../i18n';
type Resource='shield'|'brand';
const paths={shield:'/art/biblion/modular/shield-ui.webp',brand:'/art/biblion/modular/brand-seal-ui.png'};
const images=new Map<Resource,Promise<HTMLImageElement>>();
const load=(resource:Resource)=>{let p=images.get(resource);if(!p){p=new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>{images.delete(resource);reject(Error('Status material unavailable'));};image.src=paths[resource];});images.set(resource,p);}return p;};
const jobs=new Set<()=>void>();
export const cancelStatusGrants=()=>{for(const end of [...jobs])end();};
export function warmStatusGrants(){void Promise.all([load('shield'),load('brand')]).catch(()=>{});}
/** Values are presentation-only: the synchronous reducer already owns the authoritative state. */
export function playStatusGrant(side:'me'|'opp',resource:Resource,before:number,after:number,source?:HTMLElement):Promise<void>{
 if(after<=before)return Promise.resolve();
 const portrait=document.querySelector<HTMLElement>(`#${side==='me'?'portraitMe':'portraitOpp'}`);
 if(!portrait)return Promise.resolve();
 let resources=portrait.querySelector<HTMLElement>('.pt-resources');
 if(!resources){
  resources=document.createElement('span');resources.className='pt-resources';portrait.append(resources);
  // The table uses display:contents portraits. Newly created counters need the same
  // viewport mount as the existing ring, before the next full board layout pass.
  const ring=portrait.querySelector<HTMLElement>('.pt-ring');
  if(ring&&portrait.closest('.reading-board'))for(const key of ['left','top','width','height'] as const)resources.style[key]=ring.style[key];
 }
 let badge=resources.querySelector<HTMLElement>(`.pt-${resource}`);
 if(!badge){badge=document.createElement('span');badge.className=`pt-${resource}`;badge.setAttribute('role','img');const b=document.createElement('b');b.id=`${resource}-${side}`;b.setAttribute('aria-hidden','true');badge.append(b);resources.append(badge);}
 const target=badge,number=badge.querySelector('b')!,background=target.style.backgroundImage,readout=number.style.visibility;
 const update=(n:number)=>{number.textContent=n?String(n):'';target.style.setProperty('--resource-number-scale',String(Math.min(.14,.32/String(n).length)));target.setAttribute('aria-label',`${t(resource==='shield'?'game.shield':'game.brand')} ${n}`);target.title=resource==='shield'?t('game.shieldTip'):t('game.brandTip').replace('{n}',String(n));};
 update(before);
 if(before===0)target.style.backgroundImage='none';
 if(document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches){target.style.backgroundImage=background;update(after);return Promise.resolve();}
 const study=approvedGrant(resource,before);
 return new Promise(resolve=>{
  let ended=false,frame=0,host:HTMLCanvasElement|undefined,flight:HTMLCanvasElement|undefined,surface:Surface|undefined;
  const finish=()=>{if(ended)return;ended=true;clearTimeout(timeout);cancelAnimationFrame(frame);host?.remove();flight?.remove();surface?.dispose();target.style.backgroundImage=background;number.style.visibility=readout;update(after);jobs.delete(finish);resolve();};
  const timeout=setTimeout(finish,study.duration+2500);jobs.add(finish);
  void load(resource).then(image=>{
   if(ended||!target.isConnected){finish();return;}
   const rect=target.getBoundingClientRect(),size=Math.min(rect.width,rect.height);if(size<1){finish();return;}
   surface=new Surface();const material=new GrantMaterial(image,surface);
   host=document.createElement('canvas');host.className='status-grant';host.dataset.variant=study.id;host.dataset.side=side;host.setAttribute('aria-hidden','true');
   const px=Math.min(3,devicePixelRatio||1),extent=Math.max(rect.width,rect.height)*1.6;host.width=host.height=Math.ceil(extent*px);
   host.style.cssText=`position:fixed;pointer-events:none;z-index:170;left:${rect.x+rect.width/2-extent/2}px;top:${rect.y+rect.height/2-extent/2}px;width:${extent}px;height:${extent}px`;
   const c=host.getContext('2d')!;document.body.append(host);
   // Keep the native readout above the material in the same canvas; restore it on every exit.
   number.style.visibility='hidden';
   let from:DOMRect|undefined=source?.isConnected?source.getBoundingClientRect():undefined;
   if(from&&from.width>0){flight=document.createElement('canvas');flight.className='status-grant-flight';flight.setAttribute('aria-hidden','true');flight.width=Math.ceil(innerWidth*px);flight.height=Math.ceil(innerHeight*px);flight.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:169';document.body.append(flight);}
   target.style.backgroundImage='none';const start=performance.now();let committed=false;
   const labelStyle=getComputedStyle(number),labelY=extent/2+(resource==='shield'?-.04*rect.height:0);
   let labelFont=`${labelStyle.fontWeight} ${labelStyle.fontSize} ${labelStyle.fontFamily}`;
   const tick=(now:number)=>{
    if(ended)return;if(!target.isConnected||document.hidden){finish();return;}
    const ms=Math.min(study.duration,now-start);
    try{
     c.setTransform(px,0,0,px,0,0);c.clearRect(0,0,extent,extent);c.save();c.translate(extent/2,extent/2);c.scale(rect.width/200,rect.height/200);material.draw(c,study,ms);c.restore();
     if(ms>=study.contact&&!committed){update(after);committed=true;const style=getComputedStyle(number);labelFont=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;}
     const n=ms>=study.contact?after:before;if(n){c.font=labelFont;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fffaf0';c.shadowColor='#060913';c.shadowBlur=2*px;c.fillText(String(n),extent/2,labelY);c.shadowBlur=0;}
     host!.dataset.time=String(Math.round(ms));
     if(flight&&from){const f=flight.getContext('2d')!;f.setTransform(px,0,0,px,0,0);f.clearRect(0,0,innerWidth,innerHeight);transferLight(f,ms/study.duration,[from.x+from.width/2,from.y+from.height/2],[rect.x+rect.width/2,rect.y+rect.height/2],resource==='brand',Math.max(.5,size/139));}
     if(ms>=study.duration)finish();else frame=requestAnimationFrame(tick);
    }catch{finish();}
   };frame=requestAnimationFrame(tick);
  }).catch(finish);
 });
}
window.addEventListener('resize',cancelStatusGrants);
window.addEventListener('pagehide',cancelStatusGrants);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelStatusGrants();});
