import {acquireDustMaterial} from './material';
import {clamp,ease,motion,designs,DURATION} from './catalog';
import {dustTexture,dustPose} from '../impactDust';
import {drawContactDust} from '../monster/renderer';
type C=CanvasRenderingContext2D;
export type Pass='all'|'ground'|'card';
const rand=(i:number)=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
/** Orthographic review camera. X/Y is the tabletop; Z is height normal to it. */
export const REVIEW_PLANE={angle:-14*Math.PI/180,compression:.58};
export class Renderer{
 private relief=new Map<HTMLCanvasElement,HTMLCanvasElement>();private dust=acquireDustMaterial();private original:ReturnType<typeof dustTexture>|undefined;private tinted:HTMLCanvasElement[]=[];
 private prepareLegacyDust(){if(this.original)return;this.original=dustTexture();for(const color of ['#b4a38a','#8c7c65']){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d')!;x.drawImage(this.original.image as HTMLCanvasElement,0,0);x.globalCompositeOperation='source-in';x.fillStyle=color;x.fillRect(0,0,128,128);this.tinted.push(c);}}
 /** Board callers render independent ground/card planes, then project the card's Z height with boardMatrix. */
 draw(c:C,face:HTMLCanvasElement,v:number,ms:number,x:number,y:number,w:number,reduced=false,pass:Pass='all',studio=true){
  const baseline=v>5,m=motion(baseline?1:v,ms,reduced);if(baseline){m.hit=506;m.lift=reduced?0:.34*(1-ease(33,506,ms));}
  const age=(ms-m.hit)/1000;
  const plane=(height=0)=>{c.save();c.translate(x,y-(studio?height*w*Math.sqrt(1-REVIEW_PLANE.compression**2):0));c.scale(w,w);if(studio){const a=REVIEW_PLANE.angle,k=REVIEW_PLANE.compression;c.transform(Math.cos(a),Math.sin(a)*k,-Math.sin(a),Math.cos(a)*k,0,0);}};
  if(pass!=='card'){
   plane();
   // A rectangular shadow is the projection of the entire face, directly below it.
   c.save();c.globalAlpha=.13+.15*(1-clamp(m.lift/.7));c.fillStyle='#252927';c.shadowColor='#252927';c.shadowBlur=w*(.012+m.lift*.14);c.beginPath();c.roundRect(-.49,-.74,.98,1.48,.045);c.fill();c.restore();
   if(studio){c.save();c.strokeStyle='#8b938347';c.lineWidth=.005;c.setLineDash([.025,.035]);c.strokeRect(-.51,-.76,1.02,1.52);c.restore();}
   if(!reduced&&!baseline&&age>=0&&ms<DURATION){c.drawImage(this.dust.material.draw(v,age,false,Math.min(480,w*2.5)),-1.9,-1.9,3.8,3.8);this.fragments(c,v,age,false);this.fragments(c,v,age,true);}
   if(!reduced&&baseline&&age>=0&&age<1.9){this.prepareLegacyDust();for(let i=0;i<64;i++){const p=dustPose(age/1.9,i,true,100);if(p.opacity<=0)continue;c.save();c.translate(p.x/100,.75-p.y/100);c.rotate(p.rotation);c.globalAlpha=p.opacity;if(i<32)c.drawImage(this.tinted[i%3?0:1],-p.size/200,-p.size*.72/200,p.size/100,p.size*.72/100);else{c.fillStyle='#8c785b';c.fillRect(-p.size/200,-p.size/200,p.size/100,p.size/100);}c.restore();}}
   if(v===7&&!reduced){for(const layer of ['rear','front'] as const)drawContactDust(c,{x:0,y:0,w:1,h:1.5},'B',ms/1500,layer);}
   c.restore();
  }
  if(pass!=='ground'){
   plane(m.lift);c.scale(m.scale,m.scale);
  c.drawImage(face,-.62,-.87,1.24,1.74);
  if(!baseline&&!reduced){
   let relief=this.relief.get(face);
   if(!relief){relief=document.createElement('canvas');relief.width=face.width;relief.height=face.height;const rc=relief.getContext('2d')!;rc.drawImage(face,0,0);const pixels=rc.getImageData(0,0,relief.width,relief.height),src=new Uint8ClampedArray(pixels.data),ww=relief.width;for(let y=1;y<relief.height-1;y++)for(let x=1;x<ww-1;x++){const i=(y*ww+x)*4;let edge=0;for(let j=0;j<3;j++)edge+=Math.abs(src[i+j-4]-src[i+j+4])+Math.abs(src[i+j-ww*4]-src[i+j+ww*4]);pixels.data[i]=236;pixels.data[i+1]=224;pixels.data[i+2]=197;pixels.data[i+3]=Math.min(src[i+3],edge*.45);}rc.putImageData(pixels,0,0);this.relief.set(face,relief);}
   const gleam=ease(100,m.hit*.8,ms)*(1-ease(m.hit+50,m.hit+320,ms));c.save();c.globalCompositeOperation='screen';c.globalAlpha=gleam*(v===3?.62:v===5?.45:.21);c.drawImage(relief,-.62,-.87,1.24,1.74);c.restore();
  }
  if(!reduced&&!baseline){
   // A narrow reflection travels across the captured illustration and carved frame.
   const charge=ease(70,m.hit*.75,ms)*(1-ease(m.hit+45,m.hit+350,ms));
   if(charge>0){c.save();c.globalCompositeOperation='screen';c.globalAlpha=charge*(v===3?.23:v===5?.18:.075);const yy=-.9+ease(0,m.hit+180,ms)*1.8;const g=c.createLinearGradient(-.5,yy-.3,.5,yy+.3);g.addColorStop(0,'transparent');g.addColorStop(.45,designs[v].color);g.addColorStop(.50,'#fff9de');g.addColorStop(.55,designs[v].color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(-.46,-.68,.92,1.36);c.restore();}
  }
   c.restore();
  }
 }
 private fragments(c:C,v:number,t:number,front:boolean){if(t<0||t>1.4)return;
  const count=v===2?18:v===5?22:v===3?10:28;
  for(let i=0;i<count;i++){const seed=rand(i+4),edge=i%4,s=edge%2?1:-1,along=rand(i+80)-.5;if((edge===3)!==front)continue;
   const a=clamp((t-seed*.04)/(v===3?1.05:.75+seed*.35));if(a<=0||a>=1)continue;const go=1-(1-a)**3;
   const distance=go*(v===4?.46:.12+seed*.25);const px=edge<2?s*(.50+distance):along*.9,py=edge<2?along*1.38:s*(.75+distance);
   const size=(v===2?.018+seed*.032:v===5?.012+seed*.025:.003+seed*.007)*(1-ease(.48,1,a));
   c.save();c.translate(px,py);c.rotate(i+a*3*s);c.globalAlpha=(1-ease(.25,1,a))*.85;
   if(v===3){const len=.24*Math.sin(a*Math.PI);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-s*len,-.05,-s*len*.6,.045,-s*len*1.3,.015);c.bezierCurveTo(-s*len*.5,.02,-s*len*.6,-.02,0,0);c.fillStyle='#b4a27e';c.fill();c.strokeStyle='#eee1b8';c.lineWidth=.002;c.stroke();}
   else{c.beginPath();c.moveTo(-size,0);c.lineTo(size*.3,-size*.65);c.lineTo(size,size*.17);c.lineTo(-size*.2,size*.65);c.closePath();c.fillStyle=v===5?'#94b6bf':v===2?'#726453':'#a89577';c.fill();if(v===2||v===5){c.beginPath();c.moveTo(-size,0);c.lineTo(size*.3,-size*.65);c.lineTo(size*.25,size*.12);c.closePath();c.fillStyle=v===5?'#eafaff':'#ccbaa0';c.fill();}}
   c.restore();
  }
 }
 dispose(){this.dust.release();this.original?.dispose();this.tinted=[];this.relief.clear();}
}
