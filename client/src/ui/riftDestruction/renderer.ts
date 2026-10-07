import {RiftGPU} from './gpu';
import {FlowRenderer,smooth,clamp,type P} from './flow';
import {riftTrailPosition} from '../riftTransmute';
export const DURATION=2400;
export type Variant='bevel';
export const variants=[
 {id:'bevel',name:'銀刻の黒曜',en:'05 / OBSIDIAN',description:'深い黒い芯に、銀の刻印と磨かれた断面。面の曲がりに合わせて反射と陰影が変わる。',look:'彫り込まれた秘文・細い銀縁・黒い奥行き。'},
] satisfies {id:Variant;name:string;en:string;description:string;look:string}[];
export const state=(ms:number,_v?:Variant)=>({lift:smooth(500,1000,ms),phase:ms<150?0:ms<440?1:ms<1190?2:ms<1970?3:4});
type C=CanvasRenderingContext2D;
interface Options{heightRatio?:number;part?:'source'|'transfer';lift?:number;ground?:boolean;light?:boolean;receiver?:boolean;project?:(x:number,y:number)=>P;}
let gpu:RiftGPU|undefined,users=0,idle:ReturnType<typeof setTimeout>|undefined;
const flow=new FlowRenderer();
export function acquireObsidian(face:HTMLCanvasElement){
 clearTimeout(idle);gpu??=new RiftGPU();users++;const material=gpu;let released=false;
 return{renderer:new RiftRenderer(),release(){if(released)return;released=true;material.forgetFace(face);if(--users===0)idle=setTimeout(()=>{gpu?.dispose();gpu=undefined;},30000);}};
}
export function obsidianResourceState(){return{users,allocated:!!gpu};}
export class RiftRenderer{
 draw(c:C,face:HTMLCanvasElement,v:Variant,source:P,sink:P,u:number,ms:number,o:Options={}){
  if(ms>=DURATION||!c.canvas.width||!c.canvas.height||u<=0||!Number.isFinite(u))return;
  const lift=(o.lift??u*.2)*state(ms).lift,p={x:source.x,y:source.y-lift},index=variants.findIndex(x=>x.id===v);
  if(ms>=440)flow.draw(c,face,p,sink,u,ms+400,{part:o.part,lift:0,ground:o.ground,heightRatio:o.heightRatio,surface:false,trail:false});
  if((ms<1590&&o.part==='transfer')||(ms>=1590&&o.part==='source')||ms>=1970)return;
  {
   gpu??=new RiftGPU();const transform=c.getTransform(),scale=Math.hypot(transform.a,transform.b)||1;
   const surface=gpu.draw(face,ms,index,o.heightRatio??1.5,u*scale);
   c.save();
   if(ms<1590)c.translate(p.x,p.y);
   else{const t=clamp((ms-1590)/380)**1.6,center=riftTrailPosition(p,sink,t),previous=riftTrailPosition(p,sink,Math.max(0,t-.002));c.translate(center.x,center.y);c.rotate(Math.atan2(center.y-previous.y,center.x-previous.x));}
   c.drawImage(surface.canvas,0,0,surface.width,surface.height,-u*1.4,-u*1.7,u*2.8,u*3.4);c.restore();
  }
 }
}
