import {PurchaseAirWake} from './purchaseAir';
/** User-selected 03: production optical crystal and alternating air wake. */
export type ManaRect=Pick<DOMRect,'left'|'top'|'width'|'height'>;
export const MANA_PURCHASE_DURATION=.94;
export const MANA_PURCHASE_CONTACT_MS=620;
export const PURCHASE_CRYSTAL_SCALE=1.2;
export const PURCHASE_CRYSTAL_ATLAS='/vfx/purchase-air/crystal-72.png';
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{x=clamp(x);return x*x*(3-2*x);};
const ease=(a:number,b:number,x:number)=>smooth((x-a)/(b-a));
export const manaTravelProgress=(u:number)=>Math.pow(clamp(u),1.55);
export const manaTravelSpeed=(u:number)=>1.55*Math.pow(clamp(u),.55);
type C=CanvasRenderingContext2D;
let atlas:HTMLImageElement|null=null,air:PurchaseAirWake|null=null,loading:Promise<boolean>|null=null,generation=0;
let cancelLoad:(()=>void)|null=null;
/** Shared lossless atlas is decoded during board preparation; no live WebGL work. */
export function prepareManaPurchase():Promise<boolean>{
 if(atlas&&air)return Promise.resolve(true);
 if(loading)return loading;
 if(typeof Image==='undefined')return Promise.resolve(false);
 const token=generation;
 loading=new Promise<boolean>(resolve=>{
  const image=new Image();let settled=false;
  const finish=(ok:boolean)=>{if(settled)return;settled=true;clearTimeout(timer);image.onload=image.onerror=null;if(token===generation){cancelLoad=null;if(ok){atlas=image;air=new PurchaseAirWake();}}resolve(ok&&token===generation);};
  const timer=setTimeout(()=>finish(false),4500);
  cancelLoad=()=>{finish(false);image.removeAttribute('src');};
  image.onload=()=>{if(image.naturalWidth!==3840||image.naturalHeight!==1920){finish(false);return;}void image.decode().then(()=>finish(true),()=>finish(false));};
  image.onerror=()=>finish(false);image.src=PURCHASE_CRYSTAL_ATLAS;
 }).finally(()=>{if(token===generation)loading=null;});
 return loading;
}
export function disposeManaPurchase(){generation++;cancelLoad?.();cancelLoad=null;loading=null;atlas=null;air?.dispose();air=null;}
export function manaPaymentPoint(from:ManaRect,to:ManaRect,q:number,lane=0){
 const t=clamp(q),x=from.left+from.width/2,y=from.top+from.height/2;
 const tx=to.left+to.width*.25,ty=to.top+to.height*.2;
 const dx=tx-x,dy=ty-y,d=Math.hypot(dx,dy)||1,bend=Math.sin(t*Math.PI)*(Math.min(46,d*.13)+lane*9);
 return {x:x+dx*t-dy/d*bend,y:y+dy*t+dx/d*bend};
}
function shine(c:C,x:number,y:number,r:number,strength:number){if(r<=0||strength<=0)return;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(192,227,255,${strength})`);g.addColorStop(.16,`rgba(105,161,219,${strength*.25})`);g.addColorStop(1,'rgba(83,144,202,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
export function drawManaPurchase(c:C,from:ManaRect,to:ManaRect,age:number){
 if(age<0||age>=MANA_PURCHASE_DURATION||!atlas||!air)return;
 const t=age*1000,w=to.width,size=w*.37*PURCHASE_CRYSTAL_SCALE,target={x:to.left+w*.25,y:to.top+to.height*.2};
 c.save();c.globalAlpha=1;
 for(let i=0;i<3;i++){
  const elapsed=t-i*75;if(elapsed<0||elapsed>730)continue;
  const u=clamp(elapsed/620),q=manaTravelProgress(u),p=manaPaymentPoint(from,to,q,i-1),a=manaPaymentPoint(from,to,Math.max(0,q-.006),i-1),b=manaPaymentPoint(from,to,Math.min(1,q+.006),i-1);
  const release=ease(620,730,elapsed),strength=ease(20,105,elapsed)*(1-release)*(.28+.72*manaTravelSpeed(u)/1.55);
  air.draw(c,p.x,p.y,Math.atan2(b.y-a.y,b.x-a.x),size,elapsed,strength,release);
  if(u<1){
   const diameter=size*(1-ease(.90,1,u)),turn=.16+u*1.3+i*.19,index=((Math.round(turn/Math.PI/2*72)%72)+72)%72;
   c.save();c.translate(p.x,p.y);c.rotate(-.2+u*.65);c.drawImage(atlas,index%12*320,Math.floor(index/12)*320,320,320,-diameter/2,-diameter/2,diameter,diameter);c.restore();
  }
  if(u>.90&&elapsed<670)shine(c,target.x,target.y,w*.12,Math.sin(ease(558,670,elapsed)*Math.PI)*.22);
 }
 // A small contact reflection stays attached to the purchased face until it lifts.
 const amount=ease(610,730,t);shine(c,target.x,target.y,w*26/180,amount*.38);
 if(amount>0)for(let i=0;i<3;i++){const p=ease(610+i*60,940+i*15,t);c.strokeStyle=`rgba(181,216,240,${amount*.62})`;c.lineWidth=(1-i*.2)*w/180;c.beginPath();c.moveTo(to.left+w*23/180,to.top+to.height*28/270);c.lineTo(to.left+w*23/180,to.top+to.height*(28+210*p)/270);c.stroke();}
 c.restore();
}
