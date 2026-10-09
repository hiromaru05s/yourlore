import {clamp,ease,pulse,hash,type Anchor,type VisualEntry,type Hit,type Point} from './catalog';
import {Combustion} from './material';
type C=CanvasRenderingContext2D;
const mix=(a:Point,b:Point,u:number):Point=>({x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u});
function path(c:C,points:Point[],color:string,width:number){if(points.length<2)return;c.beginPath();c.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))c.lineTo(p.x,p.y);c.strokeStyle=color;c.lineWidth=width;c.stroke()}
function glow(c:C,p:Point,r:number,color:string,alpha=1,flatten=1){if(r<=0||alpha<=0)return;c.save();c.translate(p.x,p.y);c.scale(1,flatten);c.globalAlpha*=alpha;const g=c.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,color);g.addColorStop(.23,color+'88');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(-r,-r,r*2,r*2);c.restore()}
function metal(c:C,p:Point,r:number,hot=false){const g=c.createRadialGradient(p.x-r*.35,p.y-r*.4,r*.05,p.x,p.y,r);g.addColorStop(0,hot?'#fff7c0':'#c5c9cc');g.addColorStop(.24,hot?'#f3a347':'#535658');g.addColorStop(.57,hot?'#54251c':'#171c22');g.addColorStop(.86,'#0a0d11');g.addColorStop(1,hot?'#ff7236':'#8d8070');c.fillStyle=g;c.beginPath();c.arc(p.x,p.y,r,0,Math.PI*2);c.fill();if(hot){for(let i=0;i<7;i++){const a=i*2.399;path(c,[{x:p.x+Math.cos(a)*r*.2,y:p.y+Math.sin(a)*r*.2},{x:p.x+Math.cos(a+.2)*r*.65,y:p.y+Math.sin(a+.2)*r*.65},{x:p.x+Math.cos(a)*r*.88,y:p.y+Math.sin(a)*r*.88}],'#ffb965',.8)}}}
function magma(c:C,p:Point,r:number,seed:number){
 c.save();c.translate(p.x,p.y);c.rotate(seed*.7);const verts=Array.from({length:13},(_,j)=>{const a=j/13*Math.PI*2,rr=r*(.81+hash(j+seed)*.25);return {x:Math.cos(a)*rr,y:Math.sin(a)*rr}});
 c.beginPath();c.moveTo(verts[0].x,verts[0].y);for(const v of verts)c.lineTo(v.x,v.y);c.closePath();c.fillStyle='#251719';c.fill();c.clip();
 for(let j=0;j<13;j++){const a=verts[j],b=verts[(j+1)%13],center={x:(hash(j+14)-.5)*r*.35,y:(hash(j+21)-.5)*r*.4};c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.lineTo(center.x,center.y);c.closePath();c.fillStyle=['#311d1c','#50302a','#16141a','#382429','#6d3f2c'][j%5];c.fill();}
 for(let j=0;j<5;j++){const v=verts[j*2],v2=verts[(j*2+5)%13],m={x:(v.x+v2.x)*.15+(hash(j+9)-.5)*r*.3,y:(v.y+v2.y)*.1};const points=[v,{x:v.x*.48+r*.11,y:v.y*.56-r*.13},m,{x:v2.x*.55-r*.1,y:v2.y*.55},v2];c.shadowColor='#fb7937';c.shadowBlur=r*.16;path(c,points,'#ff8a3b',Math.max(.8,r*.09));c.shadowBlur=0;path(c,points,'#ffe3a0',Math.max(.35,r*.025));}
 for(let j=0;j<35;j++){c.fillStyle=j%2?'#080d1680':'#b5844650';const x=(hash(j+71)-.5)*r*2,y=(hash(j+33)-.5)*r*2;c.fillRect(x,y,.7+hash(j)*1.3,.5)}c.restore();
}
function debris(c:C,p:Point,w:number,age:number,seed:number,color:string){if(age<0||age>950)return;const u=age/950,fade=1-ease((u-.25)/.75);c.save();c.globalAlpha=fade;for(let j=0;j<24;j++){const a=hash(j+seed)*Math.PI*2,v=w*(.25+hash(j*3+seed)*.85),x=p.x+Math.cos(a)*v*(1-Math.exp(-u*4)),y=p.y+Math.sin(a)*v*.58*u-u*(1-u)*w*.8+u*u*w*.4;c.save();c.translate(x,y);c.rotate(a+u*5);c.fillStyle=j%4===0?'#3d2d26':color;const r=(1.1+hash(j+90)*2.2)*(1-u*.7);c.fillRect(-r,-r*.3,r*2,r*.6);c.restore()}c.restore()}
function fracture(c:C,p:Point,w:number,age:number,color:string){if(age<0||age>950)return;const growth=ease(age/95),fade=1-ease((age-240)/710);c.save();c.globalAlpha=fade*.75;for(let j=0;j<5;j++){const a=j*1.3+hash(j+9)*.6,len=w*(.17+hash(j+44)*.25)*growth;const points=[p];for(let k=1;k<=4;k++){const v=k/4,angle=a+(hash(j*9+k)-.5)*.6;points.push({x:p.x+Math.cos(angle)*len*v,y:p.y+Math.sin(angle)*len*v*.7})}path(c,points,'#42231e',1.8);path(c,points,color,.45);const q=points[2],end={x:q.x+Math.cos(a+.8)*len*.4,y:q.y+Math.sin(a+.8)*len*.25};path(c,[q,end],color,.4)}c.restore()}
function shock(c:C,p:Point,w:number,age:number,color:string){if(age<0||age>420)return;const u=age/420,r=w*(.12+.72*(1-(1-u)**3));c.save();c.globalAlpha=(1-u)*.5;c.translate(p.x,p.y);c.scale(1,.48);for(let j=0;j<4;j++){c.beginPath();c.arc(0,0,r,j*1.7+.2,j*1.7+1.1*(1-u*.8));c.strokeStyle=color;c.lineWidth=(1-u)*2.6;c.stroke()}c.restore()}
function bolt(a:Point,b:Point,seed:number,spread:number,depth=5):Point[]{let points=[a,b];for(let k=0;k<depth;k++){const next:Point[]=[];for(let j=0;j<points.length-1;j++){const x=points[j],y=points[j+1],m=mix(x,y,.43+hash(seed+j+k*8)*.14);m.x+=(hash(seed+j*13+k*11)-.5)*spread/(2**k);m.y+=(hash(seed+j*23+k*17)-.5)*spread*.35/(2**k);next.push(x,m)}next.push(b);points=next}return points}
function electric(c:C,a:Point,b:Point,seed:number,w:number,alpha:number){const points=bolt(a,b,seed,w*1.7);c.save();c.lineJoin='round';c.globalAlpha=alpha;c.shadowBlur=w*.075;c.shadowColor='#9484ff';path(c,points,'#7668db88',w*.048);c.shadowBlur=0;path(c,points,'#c4c5ff',w*.019);path(c,points,'#ffffff',Math.max(.65,w*.006));for(let i=4;i<points.length-4;i+=4){const v=points[i],end={x:v.x+(hash(seed+i)-.5)*w*1.6,y:v.y+w*(.15+hash(i+seed)*.5)};const ps=bolt(v,end,seed+i,w*.5,4);path(c,ps,'#9186e9',w*.009);path(c,ps,'#e3eaff',Math.max(.35,w*.003))}c.restore()}

/** One clock drives source material, flight, contact and target response. */
export class Effects {
 readonly fire=new Combustion();
 render(c:C,e:VisualEntry,t:number,source:Anchor,targets:Anchor[],hits:Hit[],reduced=false){
  if(t<=0||t>=e.duration)return;
  const w=Math.min(170,Math.max(48,source.w)),s={x:source.x,y:source.y-source.h*.12};
  if(reduced){for(const h of hits){const target=targets[h.target];if(target)glow(c,target,target.w*.6,e.accent,pulse(t,h.at-80,h.at,h.at+180)*.5,.6)}return}
  if(!['lightning','berserk'].includes(e.kind))this.fire.update(t);
  const charge=pulse(t,130,780,1350);glow(c,s,w*.85,e.accent,charge*.3,.7);
  if(e.kind==='lightning')this.lightning(c,t,s,targets,hits,w);
  else if(e.kind==='berserk')this.sword(c,t,s,targets[hits[0].target],hits[0],w);
  else if(e.kind==='cannon')this.cannon(c,t,s,targets[hits[0].target],hits[0],w);
  else if(e.kind==='zone')this.zone(c,t,targets,hits,w);
  else this.flames(c,e,t,s,targets,hits,w);
 }
 private detonate(c:C,p:Point,w:number,age:number,seed:number){
  if(age<0||age>1250)return;const u=age/1250;
  glow(c,p,w*(.4+ease(age/120)), '#ffab54',pulse(age,0,38,400)*.7,.7);
  const expansion=.20+.86*(1-Math.exp(-age/150)),erode=1-ease((age-230)/850);
  this.fire.draw(c,2,p.x,p.y-age*.017,w*expansion*1.5,w*expansion*1.35,seed*.7,erode);
  this.fire.draw(c,3,p.x+u*w*.13,p.y-u*w*.26,w*(.55+u*.95),w*(.40+u*.85),seed,pulse(age,120,490,1250)*.65);
  fracture(c,p,w,age,'#ffb35d');shock(c,p,w,age,'#ffbd86');debris(c,p,w,age,seed,'#ffe0a1');
 }
 private flames(c:C,e:VisualEntry,t:number,s:Point,targets:Anchor[],hits:Hit[],w:number){
  // Flames grow from the card's surface before taking the flight silhouette.
  const charge=pulse(t,250,780,1200);if(e.kind!=='meteor')this.fire.draw(c,e.kind==='ball'?0:1,s.x,s.y-w*.18,w*(e.kind==='ball'?.92:.5),w*(e.kind==='ball'?.92:1.3),0,charge);
  else for(let j=0;j<3;j++)this.fire.draw(c,1,s.x+(j-1)*w*.16,s.y-w*.35,w*.42,w*1.45,(j-1)*.15,pulse(t,350+j*80,800+j*80,1380));
  for(const [i,h] of hits.entries()){
   const target=targets[h.target];if(!target)continue;
   const meteor=e.kind==='meteor',arrow=e.kind==='arrow',flight=meteor?700:620,age=t-h.at,u=(t-(h.at-flight))/flight;
   const start=meteor?{x:target.x-w*(1.1+(i%3)*.18),y:Math.max(10,target.y-w*2.7)}:{x:s.x+(arrow?(i-1)*w*.12:0),y:s.y-w*.16};
   const route=(p:number)=>{const q=mix(start,target,p);q.y-=Math.sin(p*Math.PI)*(meteor?w*.1:w*.35);return q};
   if(u>=0&&u<1){const progress=arrow?u*u*.65+u*.35:meteor?u*u*.85+u*.15:u*u*.8+u*.2,p=route(progress),prev=route(Math.max(0,progress-.025)),angle=Math.atan2(p.y-prev.y,p.x-prev.x)+Math.PI/2,scale=w*(arrow?.32:meteor?.57:.85);
    const tail=arrow?1.9:meteor?2.4:1.35;
    for(let j=4;j>=1;j--){const back=route(Math.max(0,progress-j*.035)),f=1-j*.13;this.fire.draw(c,j>2?3:1,back.x,back.y,scale*f,scale*tail,angle,.18+j*.07)}
    glow(c,p,scale*1.1,'#ff9d38',.43,.8);this.fire.draw(c,arrow?1:0,p.x,p.y,scale,scale*(arrow?2.1:1.15),angle,1);
    if(meteor)magma(c,p,scale*.24,i+u*.5);
    if(arrow){c.save();c.translate(p.x,p.y);c.rotate(angle);const g=c.createLinearGradient(0,-scale*.55,0,scale*.7);g.addColorStop(0,'#fff9d4');g.addColorStop(.45,'#ffd286');g.addColorStop(1,'#e95d1000');c.fillStyle=g;c.beginPath();c.moveTo(0,-scale*.6);c.lineTo(scale*.12,-scale*.27);c.lineTo(scale*.025,scale*.7);c.lineTo(-scale*.035,scale*.55);c.lineTo(-scale*.12,-scale*.27);c.closePath();c.fill();c.restore()}
   }
   this.detonate(c,target,w*(arrow?.75:meteor?1:1.35),age,31+i);
  }
 }
 private cannon(c:C,t:number,s:Point,b:Anchor,h:Hit,w:number){
  const start={x:s.x+w*.36,y:s.y+w*.41},aim=Math.atan2(b.y-start.y,b.x-start.x),fired=1030,age=t-fired;
  // Bore flare is anchored on the illustrated brass cannon, followed by recoil.
  if(age>=0&&age<850){const p={x:start.x+Math.cos(aim)*w*.14,y:start.y+Math.sin(aim)*w*.14};this.fire.draw(c,1,p.x,p.y,w*.5,w*.9,aim+Math.PI/2,pulse(age,-1,30,210));for(let j=0;j<3;j++){const d=w*(.10+j*.15)+age*.014;this.fire.draw(c,3,start.x+Math.cos(aim)*d,start.y+Math.sin(aim)*d-age*.02,w*(.48+age*.001),w*(.42+age*.0006),j*.7,pulse(age,j*25,190+j*30,850)*.5)}}
  const u=(t-fired)/(h.at-fired);if(u>=0&&u<1){const p=mix(start,b,u);p.y-=Math.sin(u*Math.PI)*w*.38;
   const points=Array.from({length:12},(_,i)=>{const v=Math.max(0,u-i*.012),q=mix(start,b,v);q.y-=Math.sin(v*Math.PI)*w*.38;return q});path(c,points,'#8a70683a',w*.035);metal(c,p,w*.045);glow(c,p,w*.13,'#ffd8a0',.25)}
  const hitAge=t-h.at;if(hitAge>=0){this.detonate(c,b,w*.92,hitAge,5);if(hitAge<200){c.save();c.globalAlpha=1-hitAge/200;metal(c,b,w*.042);c.restore()}}
 }
 private lightning(c:C,t:number,s:Point,targets:Anchor[],hits:Hit[],w:number){
  const charge=pulse(t,100,750,1150);if(charge>0)for(let j=0;j<3;j++){const a={x:s.x+(hash(j+4)-.5)*w*.65,y:s.y+w*.30},b={x:s.x+(hash(j+14)-.5)*w*.7,y:s.y-w*.46};electric(c,a,b,Math.floor(t/90)+j*30,w*.3,charge*.7)}
  for(const [i,h]of hits.entries()){const b=targets[h.target];if(!b)continue;const age=t-h.at,top={x:b.x-w*.5+hash(i+4)*w,y:Math.max(8,b.y-w*2.75)};
   // The thin stepped leader reaches the card before the heavy return stroke.
   if(age>-190&&age<0){const progress=clamp((age+190)/190);electric(c,top,mix(top,b,progress),77+i,w*.65,progress*.65);glow(c,b,w*.65,'#aaaaff',progress*.25,.45)}
   if(age>=0&&age<430){const flicker=age<75?1:age>115&&age<155?.95:age>215&&age<245?.72:.15*(1-age/430);electric(c,top,b,Math.floor(age/65)*19+i*47,w,flicker);glow(c,b,w*1.05,'#b2c7ff',flicker*.48,.6);
    for(let j=0;j<5;j++){const a=j*1.26,end={x:b.x+Math.cos(a)*w*.6,y:b.y+Math.sin(a)*w*.33};electric(c,b,end,j*9+i,w*.24,flicker*.8)}}
   fracture(c,b,w,age,'#bcbdff');shock(c,b,w,age,'#cbd5ff');debris(c,b,w*.8,age,90+i,'#d0d9ff');
  }
 }
 private sword(c:C,t:number,s:Point,b:Anchor,h:Hit,w:number){
  const age=t-h.at;if(age>=-150&&age<600){const u=clamp((age+150)/420),fade=1-ease((age-160)/440),r=w*(.95+u*.6);c.save();c.translate(b.x,b.y);c.rotate(-.65);c.scale(1,.48);c.globalAlpha=fade;
   // A tapered cutting sheet opens at the leading edge and shreds at its tail.
   // Each section has a different thickness; no closed hoop or uniform ribbon.
   for(let layer=0;layer<3;layer++){
    const start=-2.75+u*.9-layer*.13,length=Math.PI*1.13*ease((age+150)/190),outer:Point[]=[],inner:Point[]=[];
    for(let j=0;j<=64;j++){const v=j/64,a=start+v*length,rr=r*(1-layer*.035),thickness=w*(layer===0?.24:layer===1?.105:.025)*Math.pow(Math.sin(v*Math.PI),1.8)*(1+Math.sin(v*23)*.09);outer.push({x:Math.cos(a)*rr,y:Math.sin(a)*rr});inner.push({x:Math.cos(a)*(rr-thickness),y:Math.sin(a)*(rr-thickness)});}
    const g=c.createLinearGradient(-r,0,r,0);g.addColorStop(0,'#3b142000');g.addColorStop(.28,layer===0?'#53101f':layer===1?'#a94a50':'#ffc8a8');g.addColorStop(.65,layer===0?'#b62f43':layer===1?'#ffc5ac':'#fff4d5');g.addColorStop(1,'#bd576d00');c.fillStyle=g;c.beginPath();c.moveTo(outer[0].x,outer[0].y);for(const p of [...outer,...inner.reverse()])c.lineTo(p.x,p.y);c.closePath();c.fill();
   }
   for(let j=0;j<20;j++){const start=-2.5+u*.9+hash(j+9)*1.1,radius=r*(.85+hash(j+32)*.15);c.beginPath();c.arc(0,0,radius,start,start+.2+hash(j+18)*.4);c.strokeStyle=j%4?'#ffbd9d55':'#fff4dc';c.lineWidth=.3+hash(j)*.5;c.stroke()}
   c.restore();
  }
  if(age>=0&&age<750){const growth=ease(age/55),fade=1-ease((age-260)/490);c.save();c.globalAlpha=fade;const a={x:b.x-w*.39*growth,y:b.y+w*.45*growth},z={x:b.x+w*.36*growth,y:b.y-w*.5*growth};path(c,[a,z],'#2d1423',w*.035);path(c,[a,z],'#fff1d2',w*.008);c.restore();debris(c,b,w*.9,age,44,'#ffe0c1')}
  if(t>800&&t<h.at){const u=clamp((t-800)/(h.at-800));const a=mix(s,b,ease(u));glow(c,a,w*.46,'#db7078',.22,.35)}
 }
 private zone(c:C,t:number,targets:Anchor[],hits:Hit[],w:number){
  const contact=hits[0].at,age=t-contact;
  for(const [i,h]of hits.entries()){const b=targets[h.target];if(!b)continue;
   if(age>-200&&age<1350){const power=pulse(age,-200,110,1350),rise=ease((age+200)/220);glow(c,b,w*.9,'#ed853f',power*.38,.3);for(let j=0;j<3;j++)this.fire.draw(c,1,b.x+(j-1)*w*.22,b.y-w*.25*rise,w*(.68+.10*Math.sin(t*.003+i+j)),w*(1.32+(j%2)*.35+.14*Math.sin(t*.004+i*.9+j)),(j-1)*.09,power*(j===1?1:.75));fracture(c,b,w*.9,age,'#ffc175');debris(c,b,w*.9,age,120+i,'#ffcf83')}
   if(age>500&&age<1700)this.fire.draw(c,3,b.x,b.y-w*.15-(age-500)*.025,w*(1+(age-500)*.0004),w*1.2,0,pulse(age,500,900,1700)*.45);
  }
 }
 dispose(){this.fire.dispose()}
}
