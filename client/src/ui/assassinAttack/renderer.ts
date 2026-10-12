import {IAI,clamp,ease,lerp,type Point} from './model';
type C=CanvasRenderingContext2D;
export type Geometry={matrix:DOMMatrix;source:DOMRect;target:DOMRect;side:number};
const center=(r:DOMRect):Point=>({x:r.x+r.width/2,y:r.y+r.height/2});
const point=(x:number,y:number):Point=>({x,y});
function poly(c:C,ps:Point[],fill:string){if(!ps.length)return;c.beginPath();ps.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fillStyle=fill;c.fill();}
function line(c:C,ps:Point[],stroke:string,width:number){if(ps.length<2)return;c.beginPath();ps.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
/** An authored cutting plane: dark face, narrow metal bevel, one bright cutting edge. */
function blade(c:C,ps:Point[],width:number,color:string){
 if(ps.length<2||width<.02)return;const outer:Point[]=[],inner:Point[]=[];
 ps.forEach((p,i)=>{const prev=ps[Math.max(0,i-1)],next=ps[Math.min(ps.length-1,i+1)],dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1,t=i/(ps.length-1),w=width*Math.pow(Math.sin(Math.PI*t),.65);outer.push(point(p.x-dy/len*w,p.y+dx/len*w));inner.push(point(p.x+dy/len*w*.28,p.y-dx/len*w*.28));});
 poly(c,[...outer,...inner.slice().reverse()],'#0c1422ed');
 const bevel=outer.map((p,i)=>point(lerp(p.x,ps[i].x,.34),lerp(p.y,ps[i].y,.34)));
 poly(c,[...outer,...bevel.slice().reverse()],color);
 line(c,outer,'#fcffff',Math.max(.65,width*.075));
 line(c,inner,'#657885',Math.max(.5,width*.025));
}
function path(a:Point,b:Point,bend:number,lo=0,hi=1):Point[]{const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;return Array.from({length:33},(_,i)=>{const t=lerp(lo,hi,i/32),f=Math.sin(Math.PI*t)*bend;return point(lerp(a.x,b.x,t)-dy/l*f,lerp(a.y,b.y,t)+dx/l*f);});}
function triangle(c:C,img:HTMLCanvasElement,uv:Point[],p:Point[]){
 const [a,b,d]=uv,[x,y,z]=p,den=a.x*(b.y-d.y)+b.x*(d.y-a.y)+d.x*(a.y-b.y);if(Math.abs(den)<.001)return;
 const aa=(x.x*(b.y-d.y)+y.x*(d.y-a.y)+z.x*(a.y-b.y))/den,bb=(x.y*(b.y-d.y)+y.y*(d.y-a.y)+z.y*(a.y-b.y))/den;
 const cc=(x.x*(d.x-b.x)+y.x*(a.x-d.x)+z.x*(b.x-a.x))/den,dd=(x.y*(d.x-b.x)+y.y*(a.x-d.x)+z.y*(b.x-a.x))/den;
 const ee=(x.x*(b.x*d.y-d.x*b.y)+y.x*(d.x*a.y-a.x*d.y)+z.x*(a.x*b.y-b.x*a.y))/den,ff=(x.y*(b.x*d.y-d.x*b.y)+y.y*(d.x*a.y-a.x*d.y)+z.y*(a.x*b.y-b.x*a.y))/den;
 c.save();const center={x:(x.x+y.x+z.x)/3,y:(x.y+y.y+z.y)/3};c.beginPath();p.forEach((q,i)=>{const dx=q.x-center.x,dy=q.y-center.y,len=Math.hypot(dx,dy)||1,px=q.x+dx/len*.35,py=q.y+dy/len*.35;i?c.lineTo(px,py):c.moveTo(px,py);});c.closePath();c.clip();c.transform(aa,bb,cc,dd,ee,ff);c.drawImage(img,0,0);c.restore();
}
export class AssassinRenderer{
 private texture=document.createElement('canvas');
 constructor(readonly face:HTMLCanvasElement){this.texture.width=face.width;this.texture.height=face.height;}
 private material(charge:number,compression:number,color:string){
  const c=this.texture.getContext('2d')!,w=this.texture.width,h=this.texture.height;
  c.clearRect(0,0,w,h);c.drawImage(this.face,0,0);c.globalCompositeOperation='source-atop';
  c.fillStyle=`rgba(10,17,27,${charge*.38+compression*.4})`;c.fillRect(0,0,w,h);
  // A moving narrow highlight reveals the actual engraved border and illustration.
  const x=w*(.08+charge*.82),gr=c.createLinearGradient(x-w*.07,0,x+w*.035,h*.02);
  gr.addColorStop(0,'#d9f4ff00');gr.addColorStop(.7,color);gr.addColorStop(1,'#d9f4ff00');
  c.globalAlpha=charge*.62;c.fillStyle=gr;c.fillRect(0,0,w,h);c.globalAlpha=1;c.globalCompositeOperation='source-over';
 }
 private card(c:C,g:Geometry,t:number){
  const d=IAI,a=center(g.source),u=g.source.width,sg=g.side===0?1:-1,returning=t>=d.returnAt;
  if(t>=d.vanish&&t<d.returnAt)return;
  const charge=ease(0,d.vanish-65,t),q=returning?1-ease(d.returnAt,d.returnEnd,t):ease(d.vanish-65,d.vanish,t);
  if(q>=.999)return;
  this.material(returning?(1-ease(d.returnAt,d.returnEnd+45,t))*.4:charge,q,d.color);
  const mesh=(s:number,w:number)=>{
   const p=g.matrix.transformPoint(new DOMPoint(s*180,w*270));let x=p.x/p.w-a.x,y=p.y/p.w-a.y;
   const anticipation=charge*(1-q)*(returning?0:1);
   x=x*(1-q)+sg*u*.42*q+(w-.5)*u*q*.45;y=y*(1-q*.3)+u*.045*anticipation;
   if(returning){x-=sg*u*.20*q;y+=u*.08*q;}return point(a.x+x,a.y+y);
  };
  for(let j=0;j<14;j++)for(let i=0;i<4;i++){
   const uv=[point(i/4,j/14),point((i+1)/4,j/14),point((i+1)/4,(j+1)/14),point(i/4,(j+1)/14)],ps=uv.map(p=>mesh(p.x,p.y)),src=uv.map(p=>point(p.x*this.texture.width,p.y*this.texture.height));
   triangle(c,this.texture,[src[0],src[1],src[2]],[ps[0],ps[1],ps[2]]);triangle(c,this.texture,[src[0],src[2],src[3]],[ps[0],ps[2],ps[3]]);
  }
  if(q>.12)line(c,[mesh(.08,.08),mesh(.92,.08),mesh(.92,.92)],d.color,.8*(1-q));
 }
 private departure(c:C,g:Geometry,t:number){
  const d=IAI,a=center(g.source),u=g.source.width,sg=g.side===0?1:-1,returning=t>=d.returnAt;
  const age=t-(returning?d.returnAt:d.vanish-35),life=returning?170:145;if(age<0||age>life)return;
  const p=clamp(age/life),head=ease(0,.4,p),tail=ease(.2,1,p),span=u*(returning?-.75:1)*sg;
  c.save();c.globalAlpha=(1-tail)*.78;blade(c,path(point(a.x-span*.35,a.y),point(a.x+span,a.y),0,tail,head),u*.075*(1-p),d.color);c.restore();
 }
 private approach(c:C,g:Geometry,t:number){
  const d=IAI,a=center(g.source),b=center(g.target),u=g.source.width,sg=g.side===0?1:-1,start=d.contact-50,p=clamp((t-start)/50);
  if(t<start||t>=d.contact)return;
  c.save();c.globalAlpha=.45;blade(c,path(point(b.x-sg*u*1.15,b.y+u*.45),b,0,Math.max(0,p-.6),p),u*.04,d.color);c.restore();
  if(p<.4){c.save();c.globalAlpha=(1-p/.4)*.3;line(c,[a,point(a.x+sg*u*.45,a.y-u*.2)],d.color,1);c.restore();}
 }
 private cut(c:C,g:Geometry,t:number){
  const d=IAI,age=t-d.contact;if(age<0||age>340)return;
  const b=center(g.target),u=Math.max(g.source.width,g.target.width*.65),sg=g.side===0?1:-1;
  const head=.12+.88*ease(0,45,age),tail=ease(110,325,age),width=1-ease(100,330,age);
  c.save();c.translate(b.x,b.y);c.scale(sg,sg);c.rotate(-.12);
  blade(c,path(point(-u*1.12,u*.035),point(u*1.13,-u*.035),-u*.045,tail,Math.max(tail,head)),u*.125*width,d.color);
  if(age<150){c.globalAlpha=(1-ease(65,150,age))*.55;line(c,[point(-u*.9,u*.06),point(u*1.06,-u*.06)],'#fff',1);c.globalAlpha=1;}
  const punch=(1-ease(30,110,age))*ease(0,12,age);if(punch>0){c.globalAlpha=punch;poly(c,[point(-u*.20,0),point(0,-u*.095),point(u*.36,0),point(0,u*.045)],'#f5fbfc');}c.restore();
 }
 draw(c:C,g:Geometry,t:number,reduced=false,paintCard=true){
  const d=IAI;if(t<=0||t>=d.duration)return;
  if(reduced){if(t>=d.contact&&t<d.contact+160){const b=center(g.target),u=g.source.width;c.save();c.globalAlpha=.8;line(c,[point(b.x-u*.3,b.y+u*.12),point(b.x+u*.3,b.y-u*.12)],'#233748',2);c.restore();}return;}
  if(paintCard)this.card(c,g,t);this.departure(c,g,t);this.approach(c,g,t);this.cut(c,g,t);
 }
 dispose(){this.texture.width=this.texture.height=1;}
}
