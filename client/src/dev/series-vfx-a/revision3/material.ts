import {stateMaterial} from './state-material';
import {regionalMaterial} from './regions';
import {assassinMaterial} from './assassin';
import {entries} from './catalog';
import {bloodMaterial} from './blood';
import {theme} from './catalog';
export const W=720,H=660;
export const ease=(a:number,b:number,t:number)=>{const q=Math.max(0,Math.min(1,(t-a)/(b-a)));return q*q*(3-2*q);};
const anchors:Record<string,[number,number]>={BLACK_CURSE:[.50,.45],BLACK_REVERSE:[.50,.49],BLACK_INFINITY:[.51,.46],BLACK_NOVA:[.50,.47],BLACK_ELSA:[.67,.26],BLACK_ALICE:[.60,.49],SOUL_HARVEST:[.51,.49],QUICK_CURSE:[.52,.57],NHEX:[.54,.49],HEXER1:[.66,.48],HEXER2:[.52,.49],HEXER3:[.58,.46],HEXER4:[.33,.28],CURSE:[.52,.60],QUICK_GRIMOIRE:[.52,.60]};
function polygon(c:CanvasRenderingContext2D,points:number[][]){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
function ribbon(c:CanvasRenderingContext2D,x:number,y:number,ex:number,ey:number,width:number,bend:number,alpha:number,linen:boolean){
 const dx=ex-x,dy=ey-y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,mx=(x+ex)/2+nx*bend,my=(y+ey)/2+ny*bend;
 c.save();c.globalAlpha=alpha;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(mx+nx*width,my+ny*width,ex,ey);c.quadraticCurveTo(mx-nx*width*.38,my-ny*width*.38,x,y);c.closePath();
 const g=c.createLinearGradient(mx-nx*width,my-ny*width,mx+nx*width,my+ny*width);g.addColorStop(0,linen?'#262124':'#100c1e');g.addColorStop(.34,linen?'#81756a':'#332542');g.addColorStop(.58,linen?'#c3b8a0':'#735975');g.addColorStop(.64,linen?'#dfd1b2':'#bda2bb');g.addColorStop(.70,linen?'#736558':'#443245');g.addColorStop(1,linen?'#342c2b':'#170f26');c.fillStyle=g;c.fill();c.clip();
 for(let i=1;i<22;i++){const u=i/22;const px=(1-u)*(1-u)*x+2*(1-u)*u*mx+u*u*ex,py=(1-u)*(1-u)*y+2*(1-u)*u*my+u*u*ey;c.beginPath();c.moveTo(px-nx*width*.3,py-ny*width*.3);c.lineTo(px+nx*width*.3,py+ny*width*.3);c.strokeStyle=linen?'#272029a0':'#d1afce50';c.lineWidth=linen?2:1;c.stroke();}c.restore();
}
/** The source image remains the material; geometry is confined to its illustrated aperture. */
export function paint(out:HTMLCanvasElement,img:HTMLImageElement,id:string,variant:1|2,ms:number,reduced=false,cue=''){
 if(out.width!==W)out.width=W;if(out.height!==H)out.height=H;
 const c=out.getContext('2d')!;c.clearRect(0,0,W,H);c.drawImage(img,0,0,W,H);if(reduced||ms<=420||ms>=2800)return;
 const t=(ms-420)/2380,p=ease(0,.22,t)*(1-ease(.60,1,t));const anchor=anchors[id]||[.5,.5];const x=anchor[0]*W,y=anchor[1]*H;
 if(['A022','A048','A055','A056','A057','A071','A073','A077','A078','A081','A082','A083','A084','A161','A163'].includes(cue)){stateMaterial(c,img,variant,t,W,H);return;}
 if(entries.find(e=>e.id==='S01')!.cards.includes(id)){assassinMaterial(c,img,id,variant,t,W,H);return;}
 if(entries.filter(e=>['S17','S20','S28','S29'].includes(e.id)).some(e=>e.cards.includes(id))){regionalMaterial(c,img,id,variant,t,W,H);return;}
 if(id.startsWith('VAMP')||id.startsWith('BLOOD')){bloodMaterial(c,img,id,variant,t);return;}
 if(!entries.filter(e=>e.id.startsWith('S')).some(e=>e.cards.includes(id))){regionalMaterial(c,img,id,variant,t,W,H);return;}
 if(theme(id)==='black'){
 if(variant===1){
 // Hinged black mirror facets carry the actual pictured geometry. The narrow
 // hinge remains attached while its reflected image compresses and returns.
 for(let i=0;i<4;i++){
 const angle=i*Math.PI/2-.7,delayed=ease(.04+i*.035,.32+i*.035,t)*(1-ease(.51+i*.035,.96,t));const r=(id.includes('ELSA')||id.includes('ALICE')?130:230)*delayed;
 const ux=Math.cos(angle),uy=Math.sin(angle),nx=-uy,ny=ux;const points=[[x,y],[x+ux*r+nx*r*.35,y+uy*r+ny*r*.35],[x+ux*r*1.18,y+uy*r*1.18],[x+ux*r*.40-nx*r*.24,y+uy*r*.40-ny*r*.24]];
 c.save();polygon(c,points);c.clip();c.fillStyle='#100e1eee';c.fillRect(0,0,W,H);const fold=.38+.62*(1-Math.sin(delayed*Math.PI*.85));c.translate(x,y);c.rotate(angle);c.scale(fold,1);c.rotate(-angle);c.translate(-x,-y);c.filter='contrast(1.12) brightness(.73)';c.drawImage(img,0,0,W,H);c.restore();
 c.save();polygon(c,points);c.strokeStyle=`rgba(210,196,219,${delayed*.76})`;c.lineWidth=1.6;c.stroke();c.beginPath();c.moveTo(x,y);c.lineTo(points[2][0],points[2][1]);c.strokeStyle='#211428';c.lineWidth=3.5;c.stroke();c.restore();
 }
 }else{
 // Broad ink membranes grow from the source's black ornament, curl, and
 // return point-first. The art remains legible between independent lobes.
 for(let i=0;i<5;i++){const a=i*1.27-.8;const q=ease(i*.024,.30+i*.024,t)*(1-ease(.51+i*.04,.98,t));const r=(id.includes('ELSA')?150:270)*q;const ex=x+Math.cos(a+.4*q)*r,ey=y+Math.sin(a+.4*q)*r;ribbon(c,x,y,ex,ey,58*q,42*Math.sin(q*3+i),q*.91,false);}
 c.save();c.globalCompositeOperation='soft-light';c.fillStyle=`rgba(203,177,207,${p*.24})`;c.beginPath();c.ellipse(x,y,72*p,120*p,-.4,0,Math.PI*2);c.fill();c.restore();
 }
 }else if(variant===1){
 // Frayed votive fabric unfolds sequentially from the registered staff/hand;
 // multiple large folds and short cross-seams retain their woven structure.
 for(let i=0;i<3;i++){const q=ease(.02+i*.06,.28+i*.06,t)*(1-ease(.56+i*.03,.96,t));const ex=x+(-1+i)*175*q,ey=y+(110+i*60)*q;ribbon(c,x,y,ex,ey,(34+i*7)*q,Math.sin(t*6+i)*55*q,q*.87,true);
 for(let k=0;k<4;k++){ribbon(c,ex,ey,ex+(k-1.5)*13*q,ey+(28+(k%2)*17)*q,2.6*q,4,q*.8,true);}}
 }else{
 // Tension comes from two opposite ends: the strands build a woven patch,
 // pull its actual source texture, then unpick in the opposite order.
 const q=ease(.05,.37,t)*(1-ease(.63,1,t));const size=126*q;c.save();c.beginPath();c.moveTo(x,y-size);c.quadraticCurveTo(x+size*.4,y,x+size,y+size*.5);c.lineTo(x,y+size);c.quadraticCurveTo(x-size*.4,y,x-size,y-size*.5);c.closePath();c.clip();c.translate(x,y);c.scale(1+.065*q,1-.07*q);c.translate(-x,-y);c.filter='sepia(.25) contrast(1.22) brightness(.78)';c.drawImage(img,0,0,W,H);c.restore();
 for(let i=0;i<9;i++){const k=ease(i*.018,.30+i*.018,t)*(1-ease(.53+i*.024,.98,t));const offset=(i-4)*16*k;const spread=180*k;ribbon(c,x-spread,y+offset,x+spread,y-offset,3.3*k,Math.sin(t*5+i)*12*k,k*.95,false);ribbon(c,x+offset,y-spread*.75,x-offset,y+spread*.75,2.5*k,Math.cos(t*5+i)*13*k,k*.91,true);}
 }
}
export class Surface{
 readonly canvas=document.createElement('canvas');private img:HTMLImageElement;
 constructor(readonly node:HTMLElement){this.img=node.querySelector<HTMLImageElement>('.card-art img')!;if(!this.img)throw Error('card art absent');this.canvas.className='a3-material';this.canvas.style.cssText='position:absolute;pointer-events:none;z-index:3';this.img.parentElement!.append(this.canvas);}
 draw(src:HTMLCanvasElement){const s=getComputedStyle(this.img),w=this.img.offsetWidth,h=this.img.offsetHeight;for(const k of ['left','top','width','height','borderRadius']as const)this.canvas.style[k]=s[k];this.canvas.width=Math.max(1,Math.round(w*2));this.canvas.height=Math.max(1,Math.round(h*2));const c=this.canvas.getContext('2d')!,cw=this.canvas.width,ch=this.canvas.height,scale=Math.max(cw/src.width,ch/src.height),pos=s.objectPosition.split(' ').map(Number.parseFloat);c.clearRect(0,0,cw,ch);c.drawImage(src,(cw-src.width*scale)*(pos[0]/100),(ch-src.height*scale)*(pos[1]/100),src.width*scale,src.height*scale);}
 dispose(){this.canvas.remove();}
}
