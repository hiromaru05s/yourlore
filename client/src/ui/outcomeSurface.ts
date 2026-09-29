import type {Anchor} from './crownRenderer';
const SIZE=768;
const images=new Map<string,Promise<HTMLImageElement>>();
function image(url:string):Promise<HTMLImageElement>{let pending=images.get(url);if(!pending){pending=new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>{images.delete(url);reject(new Error('Outcome image unavailable'));};im.src=url;});images.set(url,pending);}return pending;}
function cssUrl(value:string):string|null{return value.match(/url\(["']?([^"')]+)["']?\)/)?.[1]??null;}
function portraitRect(root:HTMLElement){const n=root.querySelector<HTMLElement>('.pt-ring')!;const r=n.getBoundingClientRect(),s=getComputedStyle(n,'::after'),width=parseFloat(s.width)||r.width,height=parseFloat(s.height)||r.height;return {x:r.left+(parseFloat(s.left)||0)+width/2,y:r.top+(parseFloat(s.top)||0)+height/2,width,height};}
export function outcomeParts(root:HTMLElement):HTMLElement[]{return [...root.querySelectorAll<HTMLElement>('.pt-ring,.pt-vitals,.pt-resources')];}
export function outcomeAnchor(root:HTMLElement):Anchor {
 const p=portraitRect(root),rs=[...root.querySelectorAll('.pt-hp,.pt-shield,.pt-dew')].map(n=>n.getBoundingClientRect());
 const left=Math.min(p.x-p.width/2,...rs.map(r=>r.left))-2,right=Math.max(p.x+p.width/2,...rs.map(r=>r.right))+2,top=Math.min(p.y-p.height/2,...rs.map(r=>r.top))-2,bottom=Math.max(p.y+p.height/2,...rs.map(r=>r.bottom))+2,size=Math.max(right-left,bottom-top);
 return {x:(left+right)/2,y:(top+bottom)/2,width:size,height:size};
}
/** Capture displayed values verbatim. Surrender/turn-limit wins must not invent HP damage. */
export async function captureOutcomeSurface(root:HTMLElement,signal:AbortSignal):Promise<HTMLCanvasElement|null>{
 const ring=root.querySelector<HTMLElement>('.pt-ring'),av=root.querySelector<HTMLElement>('.avatar');if(!ring||!av)return null;
 const frameUrl=cssUrl(getComputedStyle(ring,'::after').backgroundImage),maskUrl=cssUrl(getComputedStyle(av).maskImage);
 const counters=[...root.querySelectorAll<HTMLElement>('.pt-hp,.pt-shield,.pt-dew')];
 const urls=counters.map(n=>cssUrl(getComputedStyle(n).backgroundImage));
 if(!frameUrl||!maskUrl||urls.some(u=>!u))return null;
 const [frame,mask,...icons]=await Promise.all([frameUrl,maskUrl,...urls as string[]].map(image));
 if(signal.aborted||!root.isConnected)return null;
 const source=av.querySelector<HTMLCanvasElement>('canvas');if(!source?.width||!source.dataset.frame)return null;
 const a=outcomeAnchor(root),pr=portraitRect(root),r=av.getBoundingClientRect();if(a.width<=0||a.height<=0)return null;
 const k=SIZE/a.width,point=(x:number,y:number)=>({x:(x-a.x+a.width/2)*k,y:(y-a.y+a.height/2)*k});
 const full=document.createElement('canvas'),face=document.createElement('canvas');full.width=full.height=face.width=face.height=SIZE;
 const c=full.getContext('2d')!,f=face.getContext('2d')!,v=point(r.left,r.top),q=point(pr.x-pr.width/2,pr.y-pr.height/2);
 f.fillStyle=getComputedStyle(av).backgroundColor;f.fillRect(v.x,v.y,r.width*k,r.height*k);f.drawImage(source,v.x,v.y,r.width*k,r.height*k);f.globalCompositeOperation='destination-in';f.drawImage(mask,v.x,v.y,r.width*k,r.height*k);c.drawImage(face,0,0);c.drawImage(frame,q.x,q.y,pr.width*k,pr.height*k);
 counters.forEach((el,i)=>{const b=el.querySelector<HTMLElement>('b');if(!b)return;const r=el.getBoundingClientRect(),br=b.getBoundingClientRect(),style=getComputedStyle(b),q=point(r.left,r.top),text=point(br.left+br.width/2,br.top+br.height/2);c.drawImage(icons[i],q.x,q.y,r.width*k,r.height*k);c.save();c.fillStyle=style.color;c.font=`${style.fontWeight} ${parseFloat(style.fontSize)*k}px ${style.fontFamily}`;c.textAlign='center';c.textBaseline='middle';c.shadowColor='#000b';c.shadowBlur=2*k;c.shadowOffsetY=k;c.fillText(b.textContent??'',text.x,text.y+parseFloat(style.fontSize)*k*.055);c.restore();});
 return full;
}
