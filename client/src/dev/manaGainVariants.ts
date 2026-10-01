import type {FxRect} from '../ui/biblionFx';
import {MANA_GAIN_MS,MANA_GAIN_IMPACT_MS} from '../ui/manaGainTiming';

/** Every study keeps the approved three-stream / refraction / crescent choreography. */
export const MANA_VARIANTS=[
 {id:'refraction',name:'澄光 — 屈折',en:'Crystal refraction',note:'現行の形を磨く。透ける青、二重の反射線、結晶に残る細い輝き。'},
 {id:'flow',name:'水光 — 流体',en:'Liquid light',note:'光の内部を流れるうねり。白い縁が裂けて、三日月と小さな飛沫へ。'},
 {id:'stardust',name:'星光 — 微粒子',en:'Stellar dust',note:'3本の光に微細な粒が追随。着地後、少数の星が時間差でまたたく。'},
 {id:'resonance',name:'共鳴 — 波紋',en:'Layered resonance',note:'集束の芯を強く。三日月に遅れて薄い波紋が広がり、盤面に反射する。'},
 {id:'aurora',name:'薄光 — 光膜',en:'Luminous veil',note:'現行の光を薄い膜で包む。青と淡い紫が重なり、柔らかくほどける。'},
] as const;
export type ManaVariant=typeof MANA_VARIANTS[number]['id'];
export const isManaVariant=(s:string|null):s is ManaVariant=>MANA_VARIANTS.some(v=>v.id===s);

type C=CanvasRenderingContext2D;
type Point=[number,number];
type Profile={body:string;middle:string;edge:string;violet:number;width:number;flow:number;echo:number;dust:number;bloom:number;veil:number};
const profiles:Record<ManaVariant,Profile>={
 refraction:{body:'#1459ab',middle:'#409ddb',edge:'#c8f9ff',violet:0,width:1.05,flow:.2,echo:.12,dust:12,bloom:.58,veil:0},
 flow:{body:'#136dab',middle:'#3bbce4',edge:'#a9fff4',violet:0,width:1.35,flow:1,echo:.18,dust:17,bloom:.7,veil:.08},
 stardust:{body:'#2957b7',middle:'#729eea',edge:'#ebf5ff',violet:.16,width:.88,flow:.15,echo:.08,dust:32,bloom:.9,veil:0},
 resonance:{body:'#195fae',middle:'#56b1ef',edge:'#dcfaff',violet:0,width:1.12,flow:.28,echo:1,dust:14,bloom:.8,veil:0},
 aurora:{body:'#3256b1',middle:'#6e9ee8',edge:'#cffaff',violet:.6,width:1.2,flow:.52,echo:.3,dust:18,bloom:.72,veil:1},
};
const TAU=Math.PI*2, SIZE=512, UNIT=100;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const smooth=(a:number,b:number,t:number)=>{const q=clamp((t-a)/(b-a));return q*q*(3-2*q);};
const random=(i:number)=>{const n=Math.sin(i*127.1+73.7)*43758.5453;return n-Math.floor(n);};
const wave=(x:number,y:number)=>Math.sin(x*5.1+Math.sin(y*2.3))*Math.cos(y*3.4-x*.3)*.52+Math.sin(y*7.2+x*8.3)*.2;
const rgba=(r:number,g:number,b:number,a:number)=>`rgba(${r},${g},${b},${clamp(a)})`;
let bodyCanvas:HTMLCanvasElement|undefined,emissionCanvas:HTMLCanvasElement|undefined,flowTexture:HTMLCanvasElement|undefined;
let body:C|undefined,emission:C|undefined;

/** Small, seeded caustic texture: generated once, no image requests or per-frame pixel uploads. */
function prepare(){
 if(body&&emission&&flowTexture)return;
 bodyCanvas=document.createElement('canvas');emissionCanvas=document.createElement('canvas');
 for(const canvas of [bodyCanvas,emissionCanvas]){canvas.width=canvas.height=SIZE;}
 body=bodyCanvas.getContext('2d')!;emission=emissionCanvas.getContext('2d')!;
 flowTexture=document.createElement('canvas');flowTexture.width=128;flowTexture.height=256;
 const tc=flowTexture.getContext('2d')!,im=tc.createImageData(128,256);
 for(let y=0;y<256;y++)for(let x=0;x<128;x++){
  const u=x/128,v=y/256;
  const warped=u*TAU*3+Math.sin(v*TAU*2)*1.7+Math.sin(v*TAU*5+u*TAU)*.3;
  const ridge=Math.max(0,1-Math.abs(Math.sin(warped))*7)**2;
  const fine=Math.max(0,1-Math.abs(Math.sin(warped*1.7+v*TAU*4))*13);
  const i=(y*128+x)*4;im.data[i]=164;im.data[i+1]=238;im.data[i+2]=255;im.data[i+3]=Math.round((ridge*.65+fine*.18)*180);
 }
 tc.putImageData(im,0,0);
}
function reset(c:C){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,SIZE,SIZE);c.setTransform(UNIT,0,0,UNIT,SIZE/2,SIZE/2);c.globalAlpha=1;c.lineCap='round';c.lineJoin='round';}
function fill(c:C,path:Path2D,color:string|CanvasGradient,alpha=1){c.globalAlpha=clamp(alpha);c.fillStyle=color;c.fill(path);}
function stroke(c:C,path:Path2D,color:string,width:number,alpha=1){c.globalAlpha=clamp(alpha);c.strokeStyle=color;c.lineWidth=width;c.stroke(path);}
function polygon(pts:Point[]){const p=new Path2D();pts.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath();return p;}
function halo(c:C,x:number,y:number,r:number,alpha:number,color:[number,number,number]=[79,167,255]){
 if(r<=0||alpha<=.001)return;
 const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(...color,.6));g.addColorStop(.16,rgba(...color,.28));g.addColorStop(.52,rgba(...color,.09));g.addColorStop(1,rgba(...color,0));
 c.globalAlpha=clamp(alpha);c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
}
function star(c:C,x:number,y:number,size:number,alpha:number,rotation=0){
 if(size<=0||alpha<=.001)return;c.save();c.translate(x,y);c.rotate(rotation);
 fill(c,polygon([[0,-size],[size*.11,-size*.1],[size*.7,0],[size*.11,size*.1],[0,size],[-size*.11,size*.1],[-size*.7,0],[-size*.11,-size*.1]]),'#ecffff',alpha);c.restore();
}
function curve(points:Point[]){const p=new Path2D();points.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));return p;}

/** The original droplet, now shaded through its thickness, with flowing internal caustics. */
function stream(c:C,e:C,pre:number,index:number,profile:Profile,ms:number,minY:number,maxY:number){
 const a=index*TAU/3-.8,rad=1.5*(1-pre)**.65+.05;
 const rotation=a+pre*.7,px=Math.cos(rotation)*rad,py=Math.sin(rotation)*rad*.7-.14;
 let tail=(.8-.55*pre)*(1+profile.veil*.12);
 // The lower stream approaches the viewport edge on the real board. Trim only its far tail.
 const direction=Math.sin(rotation),veilExtension=profile.veil>.3?1.25:1;
 if(direction>.1)tail=Math.min(tail,Math.max(.015,(maxY-py)/direction/veilExtension));
 else if(direction<-.1)tail=Math.min(tail,Math.max(.015,(minY-py)/direction/veilExtension));
 const thick=.13*Math.sin(Math.PI*pre)*profile.width;
 const alpha=Math.sin(Math.PI*pre)**.8;
 if(thick<.001)return;
 for(const ctx of [c,e]){ctx.save();ctx.translate(px,py);ctx.rotate(rotation+Math.PI/2);}
 const shape=new Path2D();
 shape.moveTo(0,-tail);shape.bezierCurveTo(-thick*2,-tail*.35,-thick,tail*.35,0,tail*.5);shape.bezierCurveTo(thick*1.2,tail*.1,thick,-tail*.45,0,-tail);
 const gradient=c.createLinearGradient(-thick*1.35,0,thick*.9,0);
 gradient.addColorStop(0,profile.body);gradient.addColorStop(.27,profile.middle);gradient.addColorStop(.48,'#e5ffff');gradient.addColorStop(.57,'#98e6fa');gradient.addColorStop(.76,profile.middle);gradient.addColorStop(1,profile.body);
 fill(c,shape,gradient,alpha*.94);
 c.save();c.clip(shape);c.globalAlpha=alpha*(.35+profile.flow*.5);
 const shift=(ms/850+index*.19)%1;
 for(let j=-1;j<=1;j++)c.drawImage(flowTexture!,-thick*1.9,(j+shift)*tail*1.6-tail,thick*3.5,tail*1.6);
 // A darker ribbon inside the translucent body separates the bright crest from the bulk.
 const internal=new Path2D();internal.moveTo(-thick*.4,-tail*.8);internal.bezierCurveTo(thick*.6,-tail*.35,-thick*.4,tail*.1,0,tail*.45);
 stroke(c,internal,profile.body,thick*.25,alpha*.62);c.restore();
 // Preserve the original broad white-blue core; fine rims must not hollow the silhouette out.
 const hot=new Path2D();hot.moveTo(0,-tail*.83);hot.bezierCurveTo(-thick*.88,-tail*.31,-thick*.47,tail*.23,0,tail*.44);hot.bezierCurveTo(thick*.55,tail*.08,thick*.42,-tail*.41,0,-tail*.83);
 fill(e,hot,'#bcf6ff',alpha*.61);
 halo(e,0,-tail*.1,tail*.62,alpha*.32,[98,209,255]);
 const rim=new Path2D();rim.moveTo(0,-tail*.95);rim.bezierCurveTo(-thick*1.67,-tail*.34,-thick*.8,tail*.3,0,tail*.49);
 stroke(e,rim,profile.edge,.013,alpha*.95);
 const core=new Path2D();core.moveTo(thick*.1,-tail*.62);core.bezierCurveTo(thick*.44,-tail*.25,thick*.18,tail*.2,0,tail*.48);
 stroke(e,core,'#f0ffff',.018,alpha*.9);
 if(profile.veil){
  const veil=new Path2D();veil.moveTo(0,-tail*1.25);veil.bezierCurveTo(thick*3,-tail*.65,thick*2.1,tail*.1,0,tail*.5);veil.bezierCurveTo(thick*.9,-tail*.1,thick,-tail*.7,0,-tail*1.25);
  fill(c,veil,'#859ce9',alpha*.24*profile.veil);stroke(e,veil,'#aed3ff',.007,alpha*.24*profile.veil);
 }
 for(const ctx of [c,e])ctx.restore();
 // Very short wake, directly attached to each original stream rather than a new orbit.
 const wake:Point[]=[];
 for(let k=0;k<16;k++){const q=k/15,rr=rad+.12+q*(.28+profile.flow*.2),ang=rotation-q*.18;wake.push([Math.cos(ang)*rr,Math.sin(ang)*rr*.7-.14]);}
 stroke(e,curve(wake),profile.edge,.009,alpha*.4);
 if(profile.flow>.7){for(let k=0;k<3;k++){const rr=rad+.17+k*.13,ang=rotation-.12-k*.08,size=.026*(1-pre)*(1-k*.16),dx=Math.cos(ang)*rr,dy=Math.sin(ang)*rr*.7-.14;c.save();c.translate(dx,dy);c.rotate(ang);fill(c,polygon([[size*1.7,0],[0,size],[-size,0],[0,-size]]),profile.middle,alpha*.8);c.restore();star(e,dx,dy,size*.8,alpha*.65);}}
}

/** Three crescents keep their original trajectory. Their rim erodes into separate streaks. */
function crescent(c:C,e:C,t:number,index:number,profile:Profile,ms:number,echo=0){
 const spread=smooth(.47+echo*.07,.96+echo*.01,t),fade=1-spread;
 if(t<.47+echo*.07||fade<.002)return;
 const angle=index*2.094+spread*.3+echo*.23;
 const rx=(.3+spread*.95)*(1+echo*.2),ry=rx*.38;
 const length=(1.6-spread*.18),outer:Point[]=[],inner:Point[]=[],edge:Point[]=[];
 const width=.105*fade*profile.width*(echo?.45:1);
 for(let k=0;k<=48;k++){
  const q=k/48,a=angle+q*length;
  const turbulence=1+profile.flow*.28*wave(q*2+index,ms/950);
  const scallop=1-profile.flow*.34*smooth(.25,.9,spread)*(.5+.5*Math.sin(q*32+index));
  const thickness=width*Math.sin(q*Math.PI)**.8*turbulence*scallop;
  outer.push([Math.cos(a)*(rx+thickness),Math.sin(a)*(ry+thickness*.55)]);
  inner.push([Math.cos(a)*rx,Math.sin(a)*ry]);
  edge.push([Math.cos(a)*(rx+thickness*.83),Math.sin(a)*(ry+thickness*.46)]);
 }
 const shape=polygon([...outer,...inner.reverse()]);
 const g=c.createLinearGradient(-rx,-ry,rx,ry);g.addColorStop(0,profile.body);g.addColorStop(.4,profile.middle);g.addColorStop(.6,profile.edge);g.addColorStop(1,profile.middle);
 fill(c,shape,g,fade*(echo?.33:.86));
 c.save();c.clip(shape);c.globalAlpha=fade*.65;
 const shift=(ms/1300+index*.3)%1;
 for(let j=-1;j<=1;j++)c.drawImage(flowTexture!,-rx*1.3+(j+shift)*rx*2.6,-ry*1.6,rx*2.6,ry*3.2);
 c.restore();
 // Broken bright edges feel liquid; gaps grow over time rather than fading a rigid ring.
 for(let j=0;j<4;j++){
  const begin=Math.round(j*12+spread*3),end=Math.min(48,begin+Math.round(11-spread*5));
  stroke(e,curve(edge.slice(begin,end)),profile.edge,.008+fade*.005,fade*(echo?.35:.82));
 }
 if(profile.violet){stroke(e,curve(inner.slice(9,37)),'#baabff',.008,fade*profile.violet*.75);}
}
function dust(c:C,e:C,t:number,profile:Profile){
 const spread=smooth(.47,.98,t),fade=1-spread;
 for(let j=0;j<profile.dust;j++){
  const a=j*2.399,delay=j<9?0:random(j)*.065,q=smooth(.47+delay,.98,t);
  if(t<.47+delay)continue;
  const rad=.35+q*(.55+(j%3)*.2),px=Math.cos(a)*rad,py=Math.sin(a)*rad*.5-q*.4;
  const original=j<9,sz=(original?.045:.012+random(j+8)*.012)*(1-q);
  const alpha=fade*(original?.8:.62)*(j%4===0?.7+.3*Math.sin(t*36+j):1);
  c.save();c.translate(px,py);c.rotate(q*(random(j)-.5));
  fill(c,polygon([[0,-sz*2],[sz,0],[0,sz],[-sz*.5,0]]),j%3?'#72c4f7':'#dcf8ff',alpha);c.restore();
  if(j%3===0){
   const flicker=Math.exp(-(((q-(.22+random(j)*.5))/.12)**2));
   star(e,px,py,sz*(2+flicker*2),alpha*(.3+flicker));
  }else{
   const p=new Path2D();p.moveTo(px,py);p.lineTo(px-Math.cos(a)*sz*1.7,py-Math.sin(a)*sz*.8);
   stroke(e,p,'#c2edff',.006,alpha*.6);
  }
 }
 // Stellar study: fine motes run along the same three incoming directions.
 if(profile.dust>24&&t<.48){
  const pre=t/.48;
  for(let j=0;j<18;j++){
   const lag=(j%6)*.033,q=clamp(pre-lag),lane=Math.floor(j/6),a=lane*TAU/3-.8+q*.7,rad=1.5*(1-q)**.65+.05;
   const alpha=Math.sin(pre*Math.PI)*(.3+.7*q),size=.012+random(j)*.015;
   star(e,Math.cos(a)*rad,Math.sin(a)*rad*.7-.14,size,alpha);
   if(j%5===0)halo(e,Math.cos(a)*rad,Math.sin(a)*rad*.7-.14,.07,alpha*.2);
  }
 }
}
function impact(c:C,e:C,t:number,ms:number,profile:Profile){
 const flash=Math.exp(-(((t-.48)/.07)**2));
 if(flash>.002){
  // Keep the approved broad, blue-white impact; refinement must not weaken its contrast.
  const glow=c.createRadialGradient(0,0,0,0,0,1);
  glow.addColorStop(0,'#e2fbff');glow.addColorStop(.22,'#69cbff88');glow.addColorStop(1,'#328ce800');
  c.globalAlpha=flash*.92;c.fillStyle=glow;c.fillRect(-1,-1,2,2);
  halo(e,0,0,.6,flash*.5);
  const peak=polygon([[0,-.7],[.07,-.06],[.62,0],[.07,.06],[0,.7],[-.07,.06],[-.62,0],[-.07,-.06]]);
  fill(e,peak,'#edffff',flash);
  star(e,0,0,.24*flash,flash*.5,Math.PI/4);
  if(profile.echo>.5){
   stroke(e,curve([[-.94,0],[-.64,-.009],[.64,.009],[.94,0]]),'#adf2ff',.008,flash*.28);
  }
  // A tiny faceted core, never a replacement mana crystal.
  fill(e,polygon([[0,-.065],[.045,0],[0,.065],[-.045,0]]),'#ffffff',flash);
 }
 const q=clamp((ms-MANA_GAIN_IMPACT_MS)/600),pulse=Math.sin(q*Math.PI)*(1-q);
 if(ms>MANA_GAIN_IMPACT_MS){
  // Glints sweep across the actual receiving tray after its physical crystals appear.
  for(let j=0;j<5;j++){
   const phase=q-j*.065,shimmer=Math.exp(-(((phase-.23)/.115)**2));
   star(e,(j-2)*.35,-.035,.085*shimmer,shimmer*.8);
  }
  c.save();c.scale(1,.2);halo(c,0,.05,1.3,pulse*.28);c.restore();
 }
}
function echoes(c:C,e:C,t:number,profile:Profile,ms:number){
 if(t<.48)return;
 if(profile.echo>.4){for(let layer=1;layer<=2;layer++)for(let j=0;j<3;j++)crescent(c,e,t,j,profile,ms,layer);}
 if(profile.veil){
  const p=smooth(.48,.98,t),fade=(1-p)**1.7;
  for(let j=0;j<3;j++){
   const a=j*TAU/3+.2,pts:Point[]=[];
   for(let k=0;k<=32;k++){const v=k/32,ang=a+v*1.45,r=.25+p*.95;pts.push([Math.cos(ang)*r,Math.sin(ang)*r*.38-(.06+Math.sin(v*Math.PI)*.24)*fade]);}
   for(let k=32;k>=0;k--){const v=k/32,ang=a+v*1.45,r=.25+p*.95;pts.push([Math.cos(ang)*r,Math.sin(ang)*r*.38]);}
   const path=polygon(pts),g=c.createLinearGradient(0,-.4,0,.4);g.addColorStop(0,'#b5a0f340');g.addColorStop(.5,'#7ed6f055');g.addColorStop(1,'#4475bd00');
   fill(c,path,g,fade*.75);
  }
 }
}

/** Reusable local layers: sharp colored body + isolated emission + two optical bloom scales. */
export function drawRichManaGain(c:C,r:FxRect,age:number,variant:ManaVariant){
 const ms=age*1000;if(ms<=0||ms>=MANA_GAIN_MS)return;
 prepare();const b=body!,e=emission!,profile=profiles[variant];reset(b);reset(e);
 const u=Math.max(12,Math.min(64,r.height*1.65)),x=r.left+r.width*.64,y=r.top+r.height*.52,size=SIZE/UNIT*u;
 const transform=c.getTransform(),scaleY=transform.d||1;
 const minY=((0-transform.f)/scaleY-y)/u+.06,maxY=((c.canvas.height-transform.f)/scaleY-y)/u-.06;
 const t=ms<=MANA_GAIN_IMPACT_MS?ms/MANA_GAIN_IMPACT_MS*.48:.48+(ms-MANA_GAIN_IMPACT_MS)/(MANA_GAIN_MS-MANA_GAIN_IMPACT_MS)*.52;
 const pre=clamp(t/.48),spread=smooth(.47,.96,t);
 // Soft light is kept beneath the sharply drawn surface; no full-screen flash.
 const env=t<.48?Math.sin(pre*Math.PI)*.23:(1-spread)*.2;
 b.save();b.scale(1,.38);halo(b,0,0,1.35,env);b.restore();
 if(t<.48)for(let j=0;j<3;j++)stream(b,e,pre,j,profile,ms,minY,maxY);
 for(let j=0;j<3;j++)crescent(b,e,t,j,profile,ms);
 echoes(b,e,t,profile,ms);dust(b,e,t,profile);impact(b,e,t,ms,profile);
 c.save();c.globalCompositeOperation='source-over';c.globalAlpha=1;
 c.drawImage(bodyCanvas!,x-size/2,y-size/2,size,size);
 c.globalCompositeOperation='screen';
 c.filter=`blur(${Math.max(.5,u*.09)}px)`;c.globalAlpha=profile.bloom*.58;c.drawImage(emissionCanvas!,x-size/2,y-size/2,size,size);
 c.filter=`blur(${Math.max(.3,u*.022)}px)`;c.globalAlpha=profile.bloom*.68;c.drawImage(emissionCanvas!,x-size/2,y-size/2,size,size);
 c.filter='none';c.globalAlpha=.95;c.drawImage(emissionCanvas!,x-size/2,y-size/2,size,size);
 c.restore();
}
