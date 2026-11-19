import type {Anchor} from './crownRenderer';
const claspUrl=new URL('./curseSeal/clasp.webp',import.meta.url).href;
const SIZE=768;
const images=new Map<string,Promise<HTMLImageElement>>();
function image(url:string):Promise<HTMLImageElement>{let pending=images.get(url);if(!pending){pending=new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>{images.delete(url);reject(new Error('Outcome image unavailable'));};im.src=url;});images.set(url,pending);}return pending;}
function cssUrl(value:string):string|null{return value.match(/url\(["']?([^"')]+)["']?\)/)?.[1]??null;}
function portraitRect(root:HTMLElement){const n=root.querySelector<HTMLElement>('.pt-ring')!;const r=n.getBoundingClientRect(),s=getComputedStyle(n,'::after'),width=parseFloat(s.width)||r.width,height=parseFloat(s.height)||r.height;return {x:r.left+(parseFloat(s.left)||0)+width/2,y:r.top+(parseFloat(s.top)||0)+height/2,width,height};}
export function outcomeParts(root:HTMLElement):HTMLElement[]{return [...root.querySelectorAll<HTMLElement>('.pt-ring,.pt-vitals,.pt-resources')];}
export function outcomeAnchor(root:HTMLElement,characterOnly=false):Anchor {
 const p=portraitRect(root);if(characterOnly){const size=Math.max(p.width,p.height)+4;return {x:p.x,y:p.y,width:size,height:size};}
 const rs=[...root.querySelectorAll('.pt-hp,.pt-shield,.pt-dew,.pt-brand,.pt-curse-seals:not([hidden])')].map(n=>n.getBoundingClientRect());
 const left=Math.min(p.x-p.width/2,...rs.map(r=>r.left))-2,right=Math.max(p.x+p.width/2,...rs.map(r=>r.right))+2,top=Math.min(p.y-p.height/2,...rs.map(r=>r.top))-2,bottom=Math.max(p.y+p.height/2,...rs.map(r=>r.bottom))+2,size=Math.max(right-left,bottom-top);
 return {x:(left+right)/2,y:(top+bottom)/2,width:size,height:size};
}
/** Capture displayed values verbatim. Surrender/turn-limit wins must not invent HP damage. */
export async function captureOutcomeSurface(root:HTMLElement,signal:AbortSignal,characterOnly=false):Promise<HTMLCanvasElement|null>{
 const ring=root.querySelector<HTMLElement>('.pt-ring'),av=root.querySelector<HTMLElement>('.avatar');if(!ring||!av)return null;
 const frameUrl=cssUrl(getComputedStyle(ring,'::after').backgroundImage),maskUrl=cssUrl(getComputedStyle(av).maskImage);
 const counters=characterOnly?[]:[...root.querySelectorAll<HTMLElement>('.pt-hp,.pt-shield,.pt-dew,.pt-brand,.pt-curse-seals:not([hidden])')];
 const urls=counters.map(n=>n.classList.contains('pt-curse-seals')?claspUrl:cssUrl(getComputedStyle(n).backgroundImage));
 if(!frameUrl||!maskUrl||urls.some(u=>!u))return null;
 const [frame,mask,...icons]=await Promise.all([frameUrl,maskUrl,...urls as string[]].map(image));
 if(signal.aborted||!root.isConnected)return null;
 // The adopted idle image covers a hidden fallback canvas. Capture the displayed
 // image, not the first canvas in the avatar (which may be a different pose/crop).
 const live=[...av.querySelectorAll<HTMLImageElement>('img')].find(im=>!im.hidden&&im.complete&&im.naturalWidth>0&&getComputedStyle(im).display!=='none'&&Number(getComputedStyle(im).opacity)>0);
 const fallback=av.querySelector<HTMLCanvasElement>('canvas.seeker-motion');
 const source=live??fallback;
 if(!source || (!live&&(!fallback?.width||!fallback.dataset.frame)))return null;
 const a=outcomeAnchor(root,characterOnly),pr=portraitRect(root),r=av.getBoundingClientRect();if(a.width<=0||a.height<=0)return null;
 const k=SIZE/a.width,point=(x:number,y:number)=>({x:(x-a.x+a.width/2)*k,y:(y-a.y+a.height/2)*k});
 const full=document.createElement('canvas'),face=document.createElement('canvas');full.width=full.height=face.width=face.height=SIZE;
 const c=full.getContext('2d')!,f=face.getContext('2d')!,v=point(r.left,r.top),q=point(pr.x-pr.width/2,pr.y-pr.height/2);
 f.fillStyle=getComputedStyle(av).backgroundColor;f.fillRect(v.x,v.y,r.width*k,r.height*k);
 // Keep the actual element box and CSS object-fit. In particular, a square
 // character inside a wide avatar must retain its square, centered footprint.
 const bounds=source.getBoundingClientRect(),style=getComputedStyle(source),pos=style.objectPosition.split(' ');
 const naturalWidth=live?live.naturalWidth:fallback!.width,naturalHeight=live?live.naturalHeight:fallback!.height;
 const fit=style.objectFit,ratio=fit==='cover'?Math.max(bounds.width/naturalWidth,bounds.height/naturalHeight):Math.min(bounds.width/naturalWidth,bounds.height/naturalHeight);
 const width=fit==='fill'?bounds.width:naturalWidth*ratio,height=fit==='fill'?bounds.height:naturalHeight*ratio;
 const fraction=(value:string|undefined)=>value==='left'||value==='top'?0:value==='right'||value==='bottom'?1:value==='center'||!value?.endsWith('%')? .5:parseFloat(value)/100;
 const x=bounds.left+(bounds.width-width)*fraction(pos[0]),y=bounds.top+(bounds.height-height)*fraction(pos[1]),p=point(x,y);
 f.save();f.beginPath();f.rect(v.x,v.y,r.width*k,r.height*k);f.clip();f.drawImage(source,p.x,p.y,width*k,height*k);f.restore();
 f.globalCompositeOperation='destination-in';f.drawImage(mask,v.x,v.y,r.width*k,r.height*k);c.drawImage(face,0,0);c.drawImage(frame,q.x,q.y,pr.width*k,pr.height*k);
 counters.forEach((el,i)=>{const b=el.querySelector<HTMLElement>('b');if(!b)return;const r=el.getBoundingClientRect(),br=b.getBoundingClientRect(),style=getComputedStyle(b),q=point(r.left,r.top),text=point(br.left+br.width/2,br.top+br.height/2);if(el.classList.contains('pt-curse-seals')){
   const film=el.querySelector('canvas');
   if(film){const f=film.getBoundingClientRect(),pos=point(f.left,f.top);c.drawImage(film,pos.x,pos.y,f.width*k,f.height*k);}
   else {const im=icons[i],fit=Math.min(r.width/im.naturalWidth,r.height/im.naturalHeight),w=im.naturalWidth*fit,h=im.naturalHeight*fit;c.drawImage(im,q.x+(r.width-w)*k/2,q.y+(r.height-h)*k/2,w*k,h*k);}
  }else c.drawImage(icons[i],q.x,q.y,r.width*k,r.height*k);
  c.save();c.globalAlpha=Number(style.opacity)||0;c.fillStyle=style.color;c.font=`${style.fontWeight} ${parseFloat(style.fontSize)*k}px ${style.fontFamily}`;c.textAlign='center';c.textBaseline='middle';c.shadowColor='#000b';c.shadowBlur=2*k;c.shadowOffsetY=k;c.fillText(b.textContent??'',text.x,text.y+parseFloat(style.fontSize)*k*.055);c.restore();});
 return full;
}

/** Fixed-fracture source: no resource icons, digits, name or mana. */
export const captureCharacterSurface=(root:HTMLElement,signal:AbortSignal)=>captureOutcomeSurface(root,signal,true);
export const characterAnchor=(root:HTMLElement)=>outcomeAnchor(root,true);
