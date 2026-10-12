import {W,H,N,purchaseAirField,buildPurchaseAirFields,type AirField} from './purchaseAirFields';
export {purchaseAirDensity,buildPurchaseAirFields} from './purchaseAirFields';
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
let cachedFields:AirField[]|undefined;
/** Pure, immutable fields survive a rematch; each effect still owns its canvas. */
export class PurchaseAirWake {
 private fields:AirField[];
 private patch=document.createElement('canvas');
 private image=new ImageData(W,H);
 constructor(fields=cachedFields??buildPurchaseAirFields()){
  this.fields=fields;this.patch.width=W;this.patch.height=H;
 }
 static async prepare(signal:AbortSignal):Promise<PurchaseAirWake|undefined>{
  if(signal.aborted)return;
  if(cachedFields)return new PurchaseAirWake(cachedFields);
  let fields:AirField[]|undefined;
  try{
   fields=await new Promise<AirField[]|undefined>((resolve,reject)=>{
    const worker=new Worker(new URL('./purchaseAir.worker.ts',import.meta.url),{type:'module'});
    const finish=()=>{worker.terminate();signal.removeEventListener('abort',cancel);};
    const cancel=()=>{finish();resolve(undefined);};
    worker.onmessage=event=>{finish();resolve(event.data);};
    worker.onerror=event=>{event.preventDefault();finish();reject(Error('Air worker unavailable'));};
    worker.onmessageerror=()=>{finish();reject(Error('Invalid air fields'));};
    signal.addEventListener('abort',cancel,{once:true});
    if(signal.aborted)cancel();else worker.postMessage(null);
   });
  }catch{
   // CSP/older browsers keep the exact calculation, yielding between frames.
   fields=[];for(let f=0;f<N&&!signal.aborted;f++){await new Promise<void>(r=>setTimeout(r,0));if(!signal.aborted)fields.push(purchaseAirField(f));}
  }
  if(signal.aborted||!fields)return;
  cachedFields=fields;return new PurchaseAirWake(fields);
 }

 draw(c:CanvasRenderingContext2D,x:number,y:number,angle:number,size:number,age:number,strength:number,dissolve:number){
  if(strength<=0||!this.fields.length)return;
  const f=this.fields[Math.floor(Math.max(0,age)/34)%N],out=this.image.data;
  for(let k=0;k<W*H;k++){
   const i=k*4,d=clamp((f.density[k]-dissolve*.7)/(1-dissolve*.7)),lit=f.light[k]>.51;
   out[i]=lit?226:67;out[i+1]=lit?236:89;out[i+2]=lit?242:105;
   out[i+3]=d<.012?0:Math.round(d*(lit?.42:.30)*strength*255);
  }
  this.patch.getContext('2d')!.putImageData(this.image,0,0);
  const r=size*.41;c.save();c.translate(x,y);c.rotate(angle);c.drawImage(this.patch,-3.9*r,-1.65*r,5.5*r,3.3*r);c.restore();
 }
 dispose(){this.fields=[];this.patch.width=this.patch.height=0;}
}
