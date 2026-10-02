export type Surface={card:HTMLElement;node:HTMLElement;img:HTMLImageElement;canvas:HTMLCanvasElement;ctx:CanvasRenderingContext2D;w:number;h:number;x:number;y:number;iw:number;ih:number;previousOpacity:string;previousRotate:string;previousTranslate:string;frozen?:HTMLImageElement};
export function attach(card:HTMLElement):Surface{
 const node=card.querySelector<HTMLElement>('.card-art')!,img=node.querySelector<HTMLImageElement>('img')!,w=node.clientWidth,h=node.clientHeight;
 const canvas=document.createElement('canvas');canvas.className='b-r3-material';canvas.width=Math.ceil(w*3);canvas.height=Math.ceil(h*3);canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2';node.append(canvas);
 const iw=img.clientWidth,ih=img.clientHeight,x=img.offsetLeft,y=img.offsetTop,previousOpacity=img.style.opacity;img.style.opacity='0';
 return {card,node,img,canvas,ctx:canvas.getContext('2d')!,w,h,x,y,iw,ih,previousOpacity,previousRotate:card.style.rotate,previousTranslate:card.style.translate};
}
export function dispose(s:Surface){s.img.style.opacity=s.previousOpacity;s.card.style.rotate=s.previousRotate;s.card.style.translate=s.previousTranslate;s.frozen?.remove();s.canvas.remove();}
/** The shared destroy actor clones DOM, not canvas pixels. Keep a decoded
 * snapshot in the same artwork coordinates before handing it the source. */
export async function freezeSurface(s:Surface){
 if(s.frozen)return;
 const frozen=new Image();frozen.src=s.canvas.toDataURL('image/png');frozen.className='b-r3-frozen-material';frozen.dataset.materialOrigin=s.card.dataset.uid||'';
 frozen.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;object-fit:fill;opacity:1;transition:none;pointer-events:none;z-index:2';
 await frozen.decode();if(!s.canvas.isConnected)return;
 s.node.append(frozen);s.canvas.style.display='none';s.frozen=frozen;
}
export const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export const smooth=(a:number,b:number,n:number)=>{const p=clamp((n-a)/(b-a));return p*p*(3-2*p);};
export function begin(s:Surface){const c=s.ctx;c.setTransform(3,0,0,3,0,0);c.clearRect(0,0,s.w,s.h);c.save();c.beginPath();c.rect(s.x,s.y,s.iw,s.ih);c.clip();c.translate(s.x,s.y);c.scale(s.iw,s.ih);return c;}
export function native(s:Surface,c=s.ctx){const z=Math.max(s.iw/s.img.naturalWidth,s.ih/s.img.naturalHeight),w=s.img.naturalWidth*z,h=s.img.naturalHeight*z;c.drawImage(s.img,(s.iw-w)*.5/s.iw,(s.ih-h)*.22/s.ih,w/s.iw,h/s.ih);}
export function plane(s:Surface,path:Path2D,dx=0,dy=0,rotation=0,sx=1,sy=1,pivot:[number,number]=[.5,.5]){const c=s.ctx;c.save();c.translate(pivot[0]+dx,pivot[1]+dy);c.rotate(rotation);c.scale(sx,sy);c.translate(-pivot[0],-pivot[1]);c.clip(path);native(s);c.restore();}
export function line(c:CanvasRenderingContext2D,path:Path2D,width:number,color:string,alpha=1){c.save();c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=width;c.stroke(path);c.restore();}
export function tint(c:CanvasRenderingContext2D,path:Path2D,color:string,alpha:number){c.save();c.globalCompositeOperation='multiply';c.globalAlpha=alpha;c.fillStyle=color;c.fill(path);c.restore();}
