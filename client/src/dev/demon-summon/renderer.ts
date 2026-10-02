import {DemonMaterial} from './material';
import {ease,demons,type Demon} from './catalog';
type C=CanvasRenderingContext2D;
const TAU=Math.PI*2;
/** Deterministic geometry: seek, replay and simultaneous comparison use the same clock. */
export class DemonRenderer{
 private material:DemonMaterial|null=null;status='webgl';
 private grain=(()=>{const out=document.createElement('canvas');out.width=192;out.height=256;const c=out.getContext('2d')!,im=c.createImageData(192,256);for(let y=0;y<256;y++)for(let x=0;x<192;x++){const k=(y*192+x)*4,n=Math.sin(x*.087+Math.sin(y*.053)*3)+Math.sin(y*.07+x*.022)*.6+Math.sin(x*.51+y*.22)*.12;const v=Math.max(0,Math.min(255,95+n*35));im.data[k]=v;im.data[k+1]=v;im.data[k+2]=v;im.data[k+3]=255;}c.putImageData(im,0,0);return out;})();
 constructor(){try{this.material=new DemonMaterial();}catch{this.status='fallback';}}
 draw(c:C,face:HTMLCanvasElement,id:Demon,variant:number,ms:number,x:number,y:number,w:number,reduced=false){
 const kind=demons.indexOf(id)*3+variant,t=ms/1000;
 const energy=ease(.22,.9,t)*(1-ease(2.5,3.28,t));
 const unfold=ease(1.65,2.65,t),grow=ease(.6,1.35,t)*(1-ease(2.55,3.2,t));
 const tint=kind<3?'#b197d1':kind<6?'#c693a6':kind<9?'#e26388':'#c3a0de';
 c.save();c.translate(x,y);c.scale(w/180,w/180);
 // Receiver shadow contracts only after the card touches down.
 const lift=reduced?0:18*Math.sin(Math.PI*ease(0,3.05,t));
 const shadow=c.createRadialGradient(0,148,2,0,148,115);shadow.addColorStop(0,`rgba(16,9,25,${.25+energy*.22})`);shadow.addColorStop(1,'rgba(16,9,25,0)');c.save();c.translate(0,145);c.scale(1,.20);c.fillStyle=shadow;c.translate(0,-148);c.fillRect(-130,15,260,270);c.restore();
 c.translate(0,-lift);
 const body=(path:Path2D,brightness=1)=>{c.save();const g=c.createLinearGradient(-100,-150,110,160);g.addColorStop(0,'#100c19');g.addColorStop(.25,kind>=6&&kind<9?'#522332':'#423349');g.addColorStop(.40,'#17131e');g.addColorStop(.55,'#0b0a11');g.addColorStop(.70,'#51415b');g.addColorStop(.78,'#211a2b');g.addColorStop(1,'#100c18');c.fillStyle=g;c.fill(path);c.clip(path);c.save();c.globalCompositeOperation='soft-light';c.globalAlpha*=.72;c.drawImage(this.grain,-190,-230,380,460);c.restore();const rim=c.createLinearGradient(-90,-170,100,150);rim.addColorStop(0,tint);rim.addColorStop(.35,'#48334f');rim.addColorStop(.6,tint);rim.addColorStop(1,'#231929');c.strokeStyle=rim;c.globalAlpha*=.66*brightness;c.lineWidth=2.4;c.stroke(path);c.lineWidth=.65;c.strokeStyle=tint;
 for(let i=0;i<6;i++){c.globalAlpha*=.86;c.beginPath();c.moveTo(-130,-160+i*58);c.bezierCurveTo(40,-180+i*58,-85,-40+i*58,145,25+i*58);c.stroke();}c.restore();};
 const ribbon=(sx:number,sy:number,ex:number,ey:number,bend:number,width:number)=>{const p=new Path2D();p.moveTo(sx,sy);p.bezierCurveTo(sx+bend,sy-70,ex-bend,ey+45,ex,ey);p.bezierCurveTo(ex-bend+width,ey+50,sx+bend+width,sy-60,sx+width,sy+8);p.closePath();body(p);};
 const shapes=(front:boolean)=>{if(grow<.001)return;c.save();c.globalAlpha=energy;
 switch(kind){
 case 0: // Thin incision grows out of the card's vertical fold.
  for(const s of [-1,1])if((s===1)===front){const reach=(18+unfold*78)*grow;const p=new Path2D();p.moveTo(s*4,-143);p.bezierCurveTo(s*reach,-112,s*(reach+25),-35,s*(reach*.55),70);p.quadraticCurveTo(s*5,130,s*2,154);p.bezierCurveTo(s*(reach*.28),45,s*12,-20,s*4,-143);body(p);}
  break;
 case 1: // Viscous lobes remain rooted on the bottom edge.
  for(let i=0;i<5;i++)if((i%2===0)===front){const sx=-70+i*32,ex=sx+Math.sin(i*2+t)*37*grow;const p=new Path2D();p.moveTo(sx,125);p.bezierCurveTo(sx-38*grow,80,ex-21,-85*grow,ex,-135*grow);p.bezierCurveTo(ex+8,-30,sx+30,110,sx+23,132);p.quadraticCurveTo(sx+12,148,sx,125);body(p);}
  break;
 case 2: // Asymmetric wing membranes grow from the two frame rails.
  for(const s of [-1,1])if((s===1)===front){const spread=grow*(1-unfold*.8),root=72*(1-grow*.62),p=new Path2D();p.moveTo(s*root,113);p.bezierCurveTo(s*160*spread,-16,s*151*spread,-135,s*root,-145);p.lineTo(s*(90+60*spread),-72);p.quadraticCurveTo(s*70,-32,s*(95+35*spread),5);p.quadraticCurveTo(s*root,26,s*root,65);p.closePath();body(p);}
  break;
 case 3: // Linked black iron, attached to opposite corners then pulled apart.
  if(front){for(const angle of [-.68,.68]){c.save();c.rotate(angle);const split=ease(1.7,2.35,t)*75;for(let i=-5;i<=5;i++){const xx=i*22+Math.sign(i)*split;const p=new Path2D();p.roundRect(xx-14,-8,27,16,6);p.roundRect(xx-8,-3,15,6,2);c.save();c.scale(grow,1);c.fillStyle='#13101a';c.fill(p,'evenodd');c.strokeStyle=tint;c.lineWidth=.9;c.stroke(p);c.restore();}c.restore();}}
  break;
 case 4: // Thick faceted plates, staggered rows and beveled exposed edges.
  for(let i=0;i<5;i++)if((i%2===0)===front){const sy=-122+i*48,shift=Math.sin(i*2.2)*unfold*58,p=new Path2D();p.moveTo(-82+shift,sy);p.lineTo(62+shift,sy-8*grow);p.lineTo(89+shift,sy+18);p.lineTo(72+shift,sy+37);p.lineTo(-67+shift,sy+45);p.closePath();c.save();c.translate(0,(1-grow)*70);c.scale(grow,grow);body(p);c.restore();}
  break;
 case 5: // Two broad blades shear out of the diagonal surface crease.
  for(const s of [-1,1])if((s===1)===front){c.save();c.rotate(s*(.58+unfold*.65));c.scale(grow,grow);const p=new Path2D();p.moveTo(-14,138);p.lineTo(-28,-42);p.lineTo(0,-190);p.lineTo(21,-25);p.lineTo(8,142);p.closePath();body(p);c.restore();}
  break;
 case 6: // Three torn tongues: tips separate through geometric contraction.
  if(front)for(let i=0;i<3;i++){const sx=-62+i*54,p=new Path2D();p.moveTo(sx-7,130);p.bezierCurveTo(sx-32*grow,50,sx+48*grow,-60,sx+16,-149);p.bezierCurveTo(sx+4,-100,sx+6+unfold*45,45,sx+7,117);p.closePath();body(p);}
  break;
 case 7: // Pulsing sinews with non-uniform front/back tension.
  for(let i=0;i<8;i++)if((i%2===0)===front){const a=i*TAU/8,sx=Math.cos(a)*70,sy=Math.sin(a)*115,pulse=1+Math.sin(t*13+i*.2)*.12;const reach=grow*pulse; ribbon(sx,sy,Math.cos(a+.7)*(85+70*reach),Math.sin(a+.7)*(120+60*reach),Math.sin(a)*75*reach,9+12*grow);}
  break;
 case 8: // Broad flame roots, black cores, hooked tips and narrow red edges.
  for(let i=0;i<7;i++)if((i%2===0)===front){const sx=-82+i*24,height=(100+50*Math.sin(i*3.8+t))*grow,p=new Path2D();p.moveTo(sx,110);p.bezierCurveTo(sx-38,35,sx+35,5-height,sx+14,-75-height);p.quadraticCurveTo(sx+4,-40-height,sx-2,-20);p.bezierCurveTo(sx+46,-60,sx+22,50,sx+19,122);p.closePath();body(p);}
  break;
 case 9: // The card's two door leaves open around the outside frame rails.
  for(const s of [-1,1])if((s===1)===front){const width=72*(1-unfold*.83)*grow,p=new Path2D();p.moveTo(s*88,-140);p.lineTo(s*(88-width),-165);p.lineTo(s*(88-width),155);p.lineTo(s*88,135);p.closePath();body(p);c.save();c.strokeStyle=tint;c.lineWidth=1;c.globalAlpha*=.45;for(let i=0;i<7;i++){c.beginPath();c.moveTo(s*(88-width*.25),-110+i*36);c.lineTo(s*(88-width*.7),-99+i*36);c.lineTo(s*(88-width*.48),-90+i*36);c.stroke();}c.restore();}
  break;
 case 10: // A crown is extruded from the top border; long mantle joins side edges.
  if(!front){const p=new Path2D();p.moveTo(-82,-100);for(let i=0;i<5;i++){const xx=-78+i*39;p.lineTo(xx,-135-(i===2?68:43)*grow);p.lineTo(xx+19,-120);}p.lineTo(82,-100);p.closePath();c.save();c.translate(0,-18*grow);body(p);c.restore();}else for(const s of [-1,1])ribbon(s*73,-115,s*(85+43*grow),132,s*65*grow,17*grow);
  break;
 case 11: // Eclipsed card surface uncoils into thick rotating shadow folds.
  for(let i=0;i<5;i++)if((i%2===0)===front){c.save();c.rotate(i*TAU/5+t*.32);const r=(60+25*unfold)*grow,p=new Path2D();p.moveTo(8,-r*.5);p.bezierCurveTo(100,-r*1.4,135,r*.4,50,r*1.4);p.bezierCurveTo(86,r*.25,60,-r*.3,8,-r*.5);p.closePath();c.scale(grow,grow);body(p);c.restore();}
  break;
 }c.restore();};
 if(!reduced&&this.status==='webgl')shapes(false);
 if(this.material&&!reduced&&this.status==='webgl'){try{c.drawImage(this.material.draw(face,kind,ms,w*2.35*devicePixelRatio),-211.5,-319.5,423,639);}catch{this.status='fallback';}}
 if(reduced||this.status==='fallback'){c.save();c.globalAlpha=reduced?1:.85;c.drawImage(face,-111.6,-161.6,223.2,323.2);c.restore();}
 if(!reduced&&this.status==='webgl')shapes(true);
 // Contact line follows the bottom of the material, then contracts to the card edge.
 const impact=ease(2.82,2.94,t)*(1-ease(3.02,3.46,t));if(impact&&!reduced){c.save();c.translate(0,145);c.scale(1,.13);c.strokeStyle=tint;c.lineWidth=2.5;c.globalAlpha=impact*.7;const span=80+35*ease(2.9,3.2,t);c.beginPath();c.ellipse(0,0,span,16,0,.15,Math.PI-.15);c.stroke();c.restore();}
 c.restore();
 }
 dispose(){this.material?.dispose();this.material=null;}
}
