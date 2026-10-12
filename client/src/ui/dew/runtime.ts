import {Glass} from './glass';
import {t} from '../../i18n';

export const DEW_DURATION=1450,DEW_CONTACT=1120;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(a:number,b:number,v:number)=>{const q=clamp((v-a)/(b-a));return q*q*(3-2*q)};
const jobs=new Map<string,()=>void>();
let image:Promise<HTMLImageElement>|undefined;
function icon(){return image??=new Promise<HTMLImageElement>((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>{image=undefined;reject(Error('Dew icon unavailable'))};im.src='/art/biblion/modular/dew-ui.webp'});}
export function warmDewGrant(){void icon().catch(()=>{});}
export function cancelDewGrants(){for(const finish of [...jobs.values()])finish();}

/** Public presentation only. The reducer has already committed the exact resource value. */
export function playDewGrant(side:'me'|'opp',before:number,after:number,source?:HTMLElement):Promise<void>{
 if(after<=before)return Promise.resolve();jobs.get(side)?.();
 const portrait=document.getElementById(side==='me'?'portraitMe':'portraitOpp');if(!portrait)return Promise.resolve();
 let resources=portrait.querySelector<HTMLElement>('.pt-resources');
 if(!resources){resources=document.createElement('span');resources.className='pt-resources';portrait.append(resources);const ring=portrait.querySelector<HTMLElement>('.pt-ring');if(ring&&portrait.closest('.reading-board'))for(const key of ['left','top','width','height'] as const)resources.style[key]=ring.style[key];}
 let badge=resources.querySelector<HTMLElement>('.pt-dew');
 if(!badge){badge=document.createElement('span');badge.className='pt-dew';badge.setAttribute('role','img');const b=document.createElement('b');b.id='dew-'+side;b.setAttribute('aria-hidden','true');badge.append(b);resources.append(badge);}
 const target=badge,number=target.querySelector('b')!,opacity=target.style.opacity;
 const update=(n:number)=>{number.textContent=n?String(n):'';target.style.setProperty('--resource-number-scale',String(Math.min(.14,.32/String(n).length)));target.setAttribute('aria-label',`${t('game.dew')} ${n}`);target.title=t('game.dewTip');};
 update(before);if(before===0)target.style.opacity='0';
 if(document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches){target.style.opacity=opacity;update(after);return Promise.resolve();}
 return new Promise(resolve=>{
  let ended=false,raf=0,glass:Glass|undefined,host:HTMLCanvasElement|undefined,reaction:Animation|undefined,contact=false;
  const finish=()=>{if(ended)return;ended=true;clearTimeout(timeout);cancelAnimationFrame(raf);reaction?.cancel();host?.remove();glass?.dispose();target.style.opacity=opacity;update(after);if(jobs.get(side)===finish)jobs.delete(side);resolve();};
  const timeout=setTimeout(finish,DEW_DURATION+2500);jobs.set(side,finish);
  void icon().then(dew=>{
   if(ended||!target.isConnected){finish();return;}
   glass=new Glass();if(!glass.gl){finish();return;}
   const dpr=Math.min(2,devicePixelRatio||1);host=document.createElement('canvas');host.className='dew-grant';host.dataset.variant='T2';host.dataset.side=side;host.dataset.source=source?.dataset.uid??'';host.setAttribute('aria-hidden','true');host.width=Math.ceil(innerWidth*dpr);host.height=Math.ceil(innerHeight*dpr);host.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:171';document.body.append(host);
   const c=host.getContext('2d')!,bg=document.createElement('canvas');bg.width=bg.height=256;const b=bg.getContext('2d')!;
   // Only already-public board/revealed images. Never inspect a concealed hand or deck.
   const faces=[...document.querySelectorAll<HTMLImageElement>('.zone-mon .card-art img,.zone-buff .card-art img,.cast-reveal .card-art img,.fx-field-ghost .card-art img')];
   const sourceArt=source?.querySelector<HTMLImageElement>('.card-art img');if(sourceArt&&!faces.includes(sourceArt))faces.push(sourceArt);
   const portraits=[...document.querySelectorAll<HTMLCanvasElement>('.seeker-motion')];
   const start=performance.now();
   const tick=(now:number)=>{if(ended)return;try{
    if(!target.isConnected||document.hidden){finish();return;}
    const ms=Math.min(DEW_DURATION,now-start),r=target.getBoundingClientRect();if(r.width<1){finish();return;}
    const to={x:r.x+r.width*.5,y:r.y+r.height*.5},from=source?.isConnected?source.getBoundingClientRect():null;
    // Without a surviving public origin, condense adjacent to this portrait only.
    const origin=from&&from.width>0?{x:from.x+from.width*.62,y:from.y+from.height*.40}:{x:to.x-r.width*.8,y:to.y+(side==='me'?-1:1)*r.height*1.7};
    const u=smooth(170,DEW_CONTACT-95,ms),arc=Math.min(86,Math.max(22,Math.hypot(to.x-origin.x,to.y-origin.y)*.22));
    const x=origin.x+(to.x-origin.x)*u,y=origin.y+(to.y-origin.y)*u-Math.sin(Math.PI*u)*arc;
    const extent=r.width*(1.35+.26*Math.sin(Math.PI*u))*smooth(0,180,ms)*(1-smooth(DEW_CONTACT-95,DEW_CONTACT+90,ms));
    c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,innerWidth,innerHeight);
    // A short wet highlight is anchored inside the source face, ending as the liquid leaves.
    if(from&&ms<330){const a=Math.sin(Math.PI*clamp(ms/330))*.18;c.save();c.beginPath();c.ellipse(origin.x,origin.y,from.width*.27,from.height*.16,-.25,0,Math.PI*2);c.clip();const sheen=c.createLinearGradient(from.left,from.top,from.right,from.bottom);sheen.addColorStop(0,'#d6ffe800');sheen.addColorStop(.5,`rgba(181,239,214,${a})`);sheen.addColorStop(1,'#4f9f8300');c.fillStyle=sheen;c.fillRect(from.left,from.top,from.width,from.height);c.restore();}
    if(extent>.4){
     b.setTransform(1,0,0,1,0,0);b.fillStyle='#e8e5de';b.fillRect(0,0,256,256);b.setTransform(256/extent,0,0,256/extent,128-x*256/extent,128-y*256/extent);
     const intersects=(box:DOMRect)=>box.right>x-extent*.5&&box.left<x+extent*.5&&box.bottom>y-extent*.5&&box.top<y+extent*.5;
     for(const im of faces){if(!im.isConnected||!im.complete||!im.naturalWidth)continue;const box=im.getBoundingClientRect();if(intersects(box))b.drawImage(im,box.x,box.y,box.width,box.height);}
     for(const cv of portraits){const box=cv.getBoundingClientRect();if(cv.width&&cv.height&&intersects(box))b.drawImage(cv,box.x,box.y,box.width,box.height);}
     if(before>0||contact)b.drawImage(dew,r.x,r.y,r.width,r.height);
     const liquid=glass!.draw(bg,128,128,256,0,ms/720,false,Math.max(128,Math.min(256,extent*dpr*2)),1);
     if(!liquid){finish();return;}c.drawImage(liquid,x-extent/2,y-extent/2,extent,extent);
    }
    if(ms>=DEW_CONTACT&&!contact){contact=true;target.style.opacity=opacity;update(after);reaction=target.animate([{filter:'brightness(1)',transform:'scale(1)'},{filter:'brightness(1.16)',transform:'scale(1.065)'},{filter:'brightness(1)',transform:'scale(1)'}],{duration:290,easing:'ease-out'});}
    host!.dataset.time=String(Math.round(ms));host!.dataset.contact=String(contact);
    if(ms>=DEW_DURATION)finish();else raf=requestAnimationFrame(tick);
   }catch{finish();}};tick(start);
  }).catch(finish);
 });
}
if(typeof window!=='undefined'){window.addEventListener('resize',cancelDewGrants);window.addEventListener('pagehide',cancelDewGrants);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelDewGrants();});}
