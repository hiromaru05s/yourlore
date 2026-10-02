import {normalPose,masterPose,familyPose,royalPose,ease} from './motion';
import {selected,clock,type MimicId} from './selection';
type Rect=[number,number,number,number];
type Matter={canvas:HTMLCanvasElement;ready:Promise<void>;draw(time:number,gap:number,reduced:boolean):void;dispose():void};
const atlases={ivory:{file:'01-reference-ivory',upper:[59,107,1136,230] as Rect,lower:[53,449,1146,205] as Rect,tongue:[397,701,466,513] as Rect},fangs:{file:'04-predator-fangs',upper:[50,84,1152,265] as Rect,lower:[74,415,1104,230] as Rect,tongue:[417,671,421,527] as Rect}};
const images=new Map<string,Promise<HTMLImageElement>>();
function image(src:string){let pending=images.get(src);if(!pending){const img=new Image();img.src=src;pending=img.decode().then(()=>img).catch(e=>{images.delete(src);throw e;});images.set(src,pending);}return pending;}
export class MimicRig {
 readonly node=document.createElement('div');private body=document.createElement('div');private top=document.createElement('div');private bottom=document.createElement('div');private canvas=document.createElement('canvas');private shadow=document.createElement('div');private foils:HTMLElement[]=[];
 private disposed=false;
 private cavity?:HTMLImageElement;private teeth?:HTMLImageElement;
 private get atlas(){return this.id==='MIMIC'||this.id==='MIMIC_LORD'?atlases.ivory:atlases.fangs;}
 constructor(card:HTMLElement,readonly id:MimicId,private matter?:Matter){
  this.node.className='mimic-summon-rig';this.node.style.cssText='position:fixed;left:0;top:0;width:180px;height:280px;transform-origin:0 0;pointer-events:none;z-index:180;';
  this.body.style.cssText='position:absolute;inset:0;transform-origin:50% 55%;';
  this.shadow.style.cssText='position:absolute;left:8px;top:271px;width:164px;height:15px;background:radial-gradient(ellipse,#0c080c66,transparent 70%);transform-origin:center;';
  this.canvas.width=480;this.canvas.height=800;this.canvas.style.cssText='position:absolute;width:240px;height:400px;left:-30px;top:-60px;z-index:0';
  for(const [half,lower]of [[this.top,false],[this.bottom,true]]as const){
   // Leave the original cost/stat badges outside the card rectangle intact.
   half.style.cssText=`position:absolute;left:-16px;top:${lower?140:-16}px;width:212px;height:156px;overflow:hidden;transform-origin:106px ${lower?0:156}px;z-index:2;`;
   const face=card.cloneNode(true)as HTMLElement;face.removeAttribute('data-uid');face.style.cssText=`position:absolute;left:16px;top:${lower?-140:16}px;margin:0;width:180px;height:280px;--cw:180px;--ch:280px;opacity:1;visibility:visible;transform:none;transition:none;animation:none;pointer-events:none;`;
   face.querySelectorAll('[data-uid]').forEach(n=>n.removeAttribute('data-uid'));half.append(face);
  }
  this.body.append(this.canvas,this.top,this.bottom);if(matter)this.body.append(matter.canvas);this.node.append(this.shadow,this.body);
  this.node.dataset.card=id;this.node.dataset.variant=String(selected[id].variant);
  if(id==='MIMIC_KING'||id==='MIMIC_KING2')for(const half of [this.top,this.bottom]){
   const foil=document.createElement('div');foil.style.cssText='position:absolute;inset:8px 16px 0;background:url(/art/vfx/mimic-family/engraved-brass.png) center/180px 180px;mix-blend-mode:screen;opacity:0;pointer-events:none;border:1px solid #e8c076;box-shadow:inset 0 0 8px #ffc76577;';half.append(foil);this.foils.push(foil);
  }
 }

 async ready(){
  const [cavity,teeth]=await Promise.all([image('/art/vfx/mimic-cavity-r3/02-moist-cheeks.png'),image(`/art/vfx/mimic-mouth-r2/${this.atlas.file}.png`),this.matter?.ready,...[...this.node.querySelectorAll('img')].map(i=>i.decode().catch(()=>{}))]);this.cavity=cavity;this.teeth=teeth;
 }
 private pose(time:number,reduced:boolean){
  const t=clock(time,this.id),id=this.id;
  const p=id==='MIMIC'?normalPose(t,reduced):id==='MIMIC2'?masterPose(t,reduced):id==='MIMIC_LORD'||id==='AWAKENED_MIMIC'?familyPose(t,id,reduced):royalPose(t,id,reduced);
  return {...p,light:'light' in p?p.light:0};
 }
 draw(time:number,reduced=false){
  const p=this.pose(time,reduced),t=clock(time,this.id);this.node.dataset.open=String(p.open);
  this.body.style.transform=`translate(${p.dx}px,${p.dy}px) rotate(${p.tilt}deg) scale(${p.scale},${p.scale*p.squash})`;
  this.top.style.transform=`translateY(${-p.gap*p.upper}px) rotate(${p.topAngle}deg) scaleY(${1-p.open*.08})`;
  this.bottom.style.transform=`translateY(${p.gap*(1-p.upper)}px) rotate(${p.bottomAngle}deg) scaleY(${1-p.open*.035})`;
  const normal=this.id==='MIMIC';this.shadow.style.transform=`scale(${1+p.open*(normal?.22:.27)},${1-p.open*(normal?.25:.28)})`;this.shadow.style.opacity=String(.5+p.open*(normal?.2:.22));
  this.paintMouth(time,reduced,p);this.matter?.draw(t,p.gap,reduced);
  for(const [i,foil]of this.foils.entries()){const sweep=(t-510)/1500*240-i*30;foil.style.opacity=String(p.light*(reduced?.3:.6));foil.style.maskImage=`linear-gradient(115deg,transparent ${sweep-60}%,#000 ${sweep-30}%,#000 ${sweep}%,transparent ${sweep+40}%)`;}
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.matter?.dispose();this.node.remove();}
 private paintMouth(time:number,reduced:boolean,p:ReturnType<MimicRig['pose']>){
  const c=this.canvas.getContext('2d')!,a=this.atlas,image=this.teeth!;
  c.setTransform(2,0,0,2,60,120);c.clearRect(-30,-60,240,400);if(p.gap<.05||!image.complete)return;
  const topAngle=p.topAngle*Math.PI/180,bottomAngle=p.bottomAngle*Math.PI/180;
  const topCos=Math.cos(topAngle),topSin=Math.sin(topAngle),bottomCos=Math.cos(bottomAngle),bottomSin=Math.sin(bottomAngle);
  const edge=(x:number,upper:boolean)=>({x:90+(x-90)*(upper?topCos:bottomCos),y:140+(upper?-p.gap*p.upper:p.gap*(1-p.upper))+(x-90)*(upper?topSin:bottomSin)});
  const tl=edge(3,true),tr=edge(177,true),bl=edge(3,false),br=edge(177,false),mid=(tl.y+tr.y+bl.y+br.y)/4;
  // Preserve the approved aperture silhouette; only its interior paint changes.
  c.save();c.beginPath();c.moveTo(tl.x,tl.y);c.lineTo(tr.x,tr.y);c.bezierCurveTo(170,mid-5,170,mid+7,br.x,br.y);c.lineTo(bl.x,bl.y);c.bezierCurveTo(9,mid+7,9,mid-5,tl.x,tl.y);c.closePath();
   // The existing aperture is unchanged. Warp the painted interior with both jaw edges.
   c.clip();
   const texture=this.cavity!,strips=90;
   for(let i=0;i<strips;i++){
    const x=i*180/strips,w=180/strips;
    const top=edge(x,true),bottom=edge(x,false),nextTop=edge(x+w,true),nextBottom=edge(x+w,false);
    const upperY=Math.min(top.y,nextTop.y)-2,lowerY=Math.max(bottom.y,nextBottom.y)+2;
    c.drawImage(texture,i*texture.width/strips,0,texture.width/strips,texture.height,x-.3,upperY,w+.6,Math.max(.1,lowerY-upperY));
   }
   if(p.light>0){
    const light=c.createRadialGradient(90,mid,3,90,mid,95);light.addColorStop(0,`rgba(239,153,51,${p.light*.4})`);light.addColorStop(.4,`rgba(143,65,18,${p.light*.25})`);light.addColorStop(1,'rgba(70,20,0,0)');c.globalCompositeOperation='screen';c.fillStyle=light;c.fillRect(0,0,180,320);c.globalCompositeOperation='source-over';
   }
   c.globalAlpha=p.open;
  if(this.id==='MIMIC'){
   const np=normalPose(time,reduced),tongueWidth=37,tongueTop=mid+p.gap*.035-Math.sin(ease(1060,1500,time)*Math.PI)*np.roar*4;
   const tongueBottom=br.y+12,tongueHeight=Math.max(1,tongueBottom-tongueTop);
   c.save();c.translate(90,tongueBottom);c.scale(1,-1);c.drawImage(image,...a.tongue,-tongueWidth,0,tongueWidth*2,tongueHeight);c.restore();
  }
  // Each gum-and-fang strip is rigidly attached to its original jaw seam.
  for(const upper of [true,false]){
   const rect=upper?a.upper:a.lower,angle=(upper?p.topAngle:p.bottomAngle)*Math.PI/180;
   const naturalHeight=180*rect[3]/rect[2]*(this.id==='MIMIC'||this.id==='MIMIC_LORD'?1:1.1);
   c.save();c.translate(90,140+(upper?-p.gap*p.upper:p.gap*(1-p.upper)));c.rotate(angle);
   c.drawImage(image,...rect,-90,upper?-7:-naturalHeight+7,180,naturalHeight);
   c.restore();
   const left=edge(0,upper),right=edge(180,upper);c.beginPath();c.moveTo(left.x,left.y);c.lineTo(right.x,right.y);c.strokeStyle='#382718';c.lineWidth=3;c.stroke();c.strokeStyle='#ccac70';c.lineWidth=.8;c.stroke();
   for(const x of [7,173]){const q=edge(x,upper);c.fillStyle='#e4c38e';c.fillRect(q.x-1,q.y-1,2,2);}
  }
  c.restore();
 }
}

export async function createRig(card:HTMLElement,id:MimicId,signal:AbortSignal){
 let matter:Matter|undefined;
 if(id==='MIMIC2'){const {DynamicTongues}=await import('./master-tongues');if(signal.aborted)return null;matter=new DynamicTongues();}
 if(id==='MIMIC_LORD'||id==='AWAKENED_MIMIC'){const {FamilyMatter}=await import('./family-matter');if(signal.aborted)return null;matter=new FamilyMatter(id,selected[id].variant);}
 if(id==='MIMIC_KING'||id==='MIMIC_KING2'){const {RoyalMatter}=await import('./royal-matter');if(signal.aborted)return null;matter=new RoyalMatter(id);}
 // Observe readiness failures even if cancellation wins before the caller awaits ready().
 void matter?.ready.catch(()=>{});
 try{return new MimicRig(card,id,matter);}catch(error){matter?.dispose();throw error;}
}
