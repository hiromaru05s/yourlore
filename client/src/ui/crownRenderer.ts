/** Approved shatter-five 01 (2026-09-29). Keep its surface, timing and seeded physics together. */
export type Side='me'|'opp';
export type Id='crown';
export interface Anchor{x:number;y:number;width:number;height:number}
export const DURATION=5400,HIT_POINT=1180,IMPACT=1580;
export const variants=[
 {id:'crown',name:'圧壊の王冠',en:'PRESSURE / BURST',description:'全面へ圧力が溜まり、中央から不均一に破断。大きい面と細片が別々の弧で散り、卓へ着地する。',peak:1920},
] as const;
type C=CanvasRenderingContext2D;type P={x:number;y:number};
const N=768,TAU=Math.PI*2;
export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const smooth=(a:number,b:number,t:number)=>{const f=clamp((t-a)/(b-a));return f*f*(3-2*f);};
const rand=(n:number)=>{const r=Math.sin(n*127.1+53.71)*43758.5453;return r-Math.floor(r);};
function canvas(w=N,h=N){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function path(c:C,p:P[]){c.beginPath();p.forEach((v,i)=>i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.closePath();}
function half(poly:P[],a:P,b:P){const nx=b.x-a.x,ny=b.y-a.y,k=(b.x*b.x+b.y*b.y-a.x*a.x-a.y*a.y)/2,out:P[]=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],dp=p.x*nx+p.y*ny-k,dq=q.x*nx+q.y*ny-k;if(dp<=0)out.push(p);if((dp<=0)!==(dq<=0)){const f=dp/(dp-dq);out.push({x:p.x+(q.x-p.x)*f,y:p.y+(q.y-p.y)*f});}}return out;}
function polygons(mode:number){const sites:P[]=[];const count=[50,55,30,72,47][mode];for(let i=0;i<count;i++){
 // Irregular spacing, including a finer lower band for all three counters. No regular checkerboard.
 let best={x:0,y:0},score=-1;for(let k=0;k<8;k++){const v={x:rand(i*37+k*3+mode*1000)*N,y:rand(i*37+k*3+1+mode*1000)*N};if(i>count*.72)v.y=N*(.64+rand(i*57+k)*.33);const d=sites.length?Math.min(...sites.map(p=>Math.hypot(p.x-v.x,p.y-v.y))):1;if(d>score){score=d;best=v;}}sites.push(best);
 }return sites.map(s=>{let poly:P[]=[{x:0,y:0},{x:N,y:0},{x:N,y:N},{x:0,y:N}];for(const b of sites)if(s!==b&&poly.length)poly=half(poly,s,b);return poly;});}
interface Piece{tile:HTMLCanvasElement;edge:HTMLCanvasElement;back:HTMLCanvasElement;poly:P[];x:number;y:number;left:number;top:number;seed:number;mass:number;radius:number}
interface Surface{full:HTMLCanvasElement;defeated:HTMLCanvasElement;detail:HTMLCanvasElement;pieces:Record<Id,Piece[]>}
interface Pose{x:number;y:number;groundX:number;groundY:number;height:number;rotation:number;tilt:number;erosion:number;contact:number;age:number;hit:number}
export class CrownRenderer{
 surfaces:Partial<Record<Side,Surface>>={};private scratch=canvas();
 setSurface(side:Side,full:HTMLCanvasElement,defeated=full){const pieces={} as Record<Id,Piece[]>;
  for(const [mode,v] of variants.entries()){pieces[v.id]=polygons(mode).map((poly,i)=>{const left=Math.max(0,Math.floor(Math.min(...poly.map(p=>p.x)))-2),top=Math.max(0,Math.floor(Math.min(...poly.map(p=>p.y)))-2),right=Math.min(N,Math.ceil(Math.max(...poly.map(p=>p.x)))+2),bottom=Math.min(N,Math.ceil(Math.max(...poly.map(p=>p.y)))+2);if(right<=left||bottom<=top)return null;
    const tile=canvas(right-left,bottom-top),c=tile.getContext('2d')!;c.translate(-left,-top);path(c,poly);c.clip();c.drawImage(defeated,0,0);const pixels=c.getImageData(0,0,tile.width,tile.height).data;let area=0;for(let j=3;j<pixels.length;j+=4)area+=pixels[j]/255;if(area<12)return null;
    const edge=canvas(tile.width,tile.height),ec=edge.getContext('2d')!;ec.translate(-left,-top);path(ec,poly);ec.strokeStyle='#fff0be';ec.lineWidth=3.3;ec.stroke();ec.globalCompositeOperation='destination-in';ec.drawImage(defeated,0,0);
    const back=canvas(tile.width,tile.height),bc=back.getContext('2d')!;bc.drawImage(tile,0,0);bc.globalCompositeOperation='source-in';bc.fillStyle='#273344';bc.fillRect(0,0,back.width,back.height);
    return {tile,edge,back,poly,x:(left+right)/2,y:(top+bottom)/2,left,top,seed:rand(i+mode*333+77),mass:Math.sqrt(area)/N,radius:Math.hypot((left+right)/2/N-.5,(top+bottom)/2/N-.46)};
   }).filter((p):p is Piece=>!!p);}
  const detail=canvas(),dc=detail.getContext('2d')!,src=full.getContext('2d')!.getImageData(0,0,N,N).data,out=dc.createImageData(N,N);for(let y=1;y<N-1;y++)for(let x=1;x<N-1;x++){const i=(y*N+x)*4,contrast=Math.abs(src[i]-src[i+4])+Math.abs(src[i+1]-src[i+N*4+1]);out.data[i]=255;out.data[i+1]=225;out.data[i+2]=163;out.data[i+3]=src[i+3]*clamp(contrast/140)*.8;}dc.putImageData(out,0,0);this.surfaces[side]={full,defeated,detail,pieces};
 }
 delay(_id:Id,p:Piece){return p.seed*.065;}
 // One physics path for both player viewpoints, in source-relative physical units.
 pose(id:Id,p:Piece,t:number):Pose{
  const px=p.x/N-.5,py=p.y/N-.5,age=Math.max(0,(t-IMPACT)/1000-this.delay(id,p)),seed=p.seed,mode=variants.findIndex(v=>v.id===id),g=[3.25,3.15,3.8,3.4,3.2][mode],floor=Math.max(.43+(seed-.5)*.035,py+.012);
  const z0=Math.max(.005,floor-py),radius=Math.hypot(px,py)||.1,ux=px/radius;
  let vx=ux*(.25+seed*.62),vd=(rand(seed*1000)-.5)*.27,up=.5+seed*.65,spin=(seed-.5)*6;
  // Upper fragments cannot launch beyond the original top silhouette. Same rule on both sides.
  spin*=.45+.55*smooth(-.35,-.08,py);
  up=Math.min(up,Math.sqrt(2*g*Math.max(.002,(py+.46)*.24)));
  const hit=(up+Math.sqrt(up*up+2*g*z0))/g,flight=Math.min(age,hit),after=Math.max(0,age-hit),drag=.8,travel=(1-Math.exp(-flight*drag))/drag;
  const slide=(1-Math.exp(-after*5))/5*Math.exp(-hit*drag);const x=px+vx*(travel+slide),depth=vd*(travel+slide),groundY=floor+depth*.14;
  let height=z0+up*flight-.5*g*flight*flight;const restitution=.055+(1-clamp(p.mass*7))*.075,bounce=(g*hit-up)*restitution,bounceEnd=2*bounce/g;
  if(age>=hit)height=after<bounceEnd?bounce*after-.5*g*after*after:0;
  const contact=age>=hit?after:-1,land=smooth(0,.10,after),airSpin=spin*flight,rotation=age<hit?airSpin:airSpin+spin*Math.exp(-hit*.3)*(1-Math.exp(-after*7))/7;
  const airTilt=1-smooth(0,.22,age)*(.20+.25*Math.sin(age*4+seed*6)**2),tilt=age<hit?airTilt:airTilt*(1-land)+(.20+seed*.09)*land;
  // Unequal lifetimes; erosion begins only after contact and a brief rest.
  const erosion=smooth(hit+.28+seed*.16,hit+1.02+seed*.3,age);
  return {x,y:groundY-Math.max(0,height),groundX:x,groundY,height:Math.max(0,height),rotation,tilt,erosion,contact,age,hit};
 }
 private charge(c:C,s:Surface,id:Id,t:number){const stage=smooth(160,1200,t),stress=smooth(740,1420,t),hold=smooth(1390,1500,t),pulse=(.5+.5*Math.sin(t*.011))*stage*(1-hold);c.save();c.translate(Math.sin(t*.044)*stress*(1-hold)*6.5,0);c.scale(1-stress*.04,1+stress*.009);c.filter=`brightness(${1-stress*.17}) saturate(${1-stress*.08})`;c.drawImage(t>=HIT_POINT?s.defeated:s.full,-N/2,-N/2);c.filter='none';
  const sc=this.scratch.getContext('2d')!;sc.reset();sc.drawImage(s.detail,0,0);sc.globalCompositeOperation='source-in';const sweep=(t/1350)*N,g=sc.createLinearGradient(0,sweep-N*.35,0,sweep+N*.12);g.addColorStop(0,'#eebc6400');g.addColorStop(.6,'#eebc64bb');g.addColorStop(.82,'#fff4ce');g.addColorStop(1,'#eebc6400');sc.fillStyle=g;sc.fillRect(0,0,N,N);sc.globalCompositeOperation='source-over';c.save();c.globalAlpha=stage*.85;c.drawImage(this.scratch,-N/2,-N/2);c.restore();
  // Cracks reveal outward from the pressure source, following the actual partitions.
  sc.clearRect(0,0,N,N);const origin={x:N*.5,y:N*.46};
  for(const p of s.pieces[id]){const dist=Math.hypot(p.x-origin.x,p.y-origin.y)/N,ink=smooth(370+dist*520,830+dist*500,t);if(!ink)continue;sc.save();sc.globalAlpha=ink;path(sc,p.poly);sc.strokeStyle='#271f24';sc.lineWidth=6.5+stress*2;sc.stroke();path(sc,p.poly);sc.strokeStyle='#c39453';sc.lineWidth=3.8;sc.stroke();sc.strokeStyle='#fff2c8';sc.globalAlpha=ink*(.30+stress*.6+pulse*.12);sc.lineWidth=1.5;sc.stroke();sc.restore();}
  sc.globalCompositeOperation='destination-in';sc.drawImage(s.full,0,0);sc.globalCompositeOperation='source-over';c.drawImage(this.scratch,-N/2,-N/2);
  // A final source-masked surge precedes a quiet, still 80 ms hold.
  const flash=Math.exp(-(((t-1290)/65)**2))*.18;c.save();c.globalAlpha=flash;c.globalCompositeOperation='screen';c.drawImage(s.detail,-N/2,-N/2);c.restore();c.restore();
 }
 private piece(c:C,p:Piece,q:Pose,t:number){if(q.erosion>=1)return;const alpha=1-smooth(.82,1,q.erosion);
  // Ground shadow is spatially separated from the airborne fragment; it sharpens on contact.
  c.save();c.translate(q.groundX*N,q.groundY*N+4);c.scale(1,.20);c.globalAlpha=alpha*(.09+.23*(1-clamp(q.height/.6)));c.fillStyle='#162333';c.filter=`blur(${2+q.height*12}px)`;c.beginPath();c.ellipse(0,0,p.tile.width*.44*(1+q.height*.25),p.tile.height*.28,0,0,TAU);c.fill();c.restore();
  c.save();c.translate(q.x*N,q.y*N);c.rotate(q.rotation);c.scale(1,q.tilt);const dx=p.left-p.x,dy=p.top-p.y;
  if(q.erosion>0){path(c,[{x:dx,y:dy},{x:dx+p.tile.width,y:dy},...Array.from({length:17},(_,i)=>({x:dx+p.tile.width*(1-i/16),y:dy+p.tile.height*(1-q.erosion)+Math.sin(i*1.8+p.seed*13)*7*Math.sin(q.erosion*Math.PI)}))]);c.clip();}
  c.globalAlpha=alpha;const depth=2.6+Math.sin(q.rotation)*1.2;c.drawImage(p.back,dx+depth,dy+depth);c.drawImage(p.tile,dx,dy);
  c.globalAlpha=alpha*(.18+Math.exp(-q.age*5)*.75+Math.max(0,Math.sin(q.rotation+q.age*2))*.13);c.drawImage(p.edge,dx,dy);c.restore();
  // Small split dust shapes occur at each actual collision, with no universal impact plane freeze.
  if(q.contact>=0&&q.contact<.30){const f=q.contact/.30;c.save();c.translate(q.groundX*N,q.groundY*N);c.globalAlpha=(1-f)*.22;c.fillStyle='#aa9577';for(const sign of [-1,1]){c.beginPath();c.ellipse(sign*f*22,-Math.sin(f*Math.PI)*5,4+f*7,2+f*3,sign*.3,0,TAU);c.ellipse(sign*f*22,-Math.sin(f*Math.PI)*5-2,3+f*6,1+f*2,0,0,TAU);c.fill('evenodd');}c.restore();}
  void t;
 }
 draw(c:C,w:number,h:number,id:Id,t:number,loser:Side,anchors:Record<Side,Anchor>,reduced=false,withResult=true){c.clearRect(0,0,w,h);if(t<=0)return;const a=anchors[loser],s=this.surfaces[loser];if(!s)return;
  if(!reduced){c.save();c.translate(a.x,a.y);c.scale(a.width/N,a.height/N);
   if(t<=IMPACT)this.charge(c,s,id,t);else{const pieces=[...s.pieces[id]].sort((p,q)=>this.pose(id,p,t).groundY-this.pose(id,q,t).groundY);for(const p of pieces){const q=this.pose(id,p,t);this.piece(c,p,q,t);}
    const impact=smooth(IMPACT,IMPACT+20,t)*(1-smooth(IMPACT+25,IMPACT+105,t));if(impact){c.save();c.globalAlpha=impact*.45;c.globalCompositeOperation='screen';c.drawImage(s.detail,-N/2,-N/2);c.restore();}}
   c.restore();const win:Side=loser==='me'?'opp':'me',b=anchors[win],sw=this.surfaces[win],pulse=smooth(3000,3220,t)*(1-smooth(3300,3740,t));if(sw&&pulse){c.save();c.globalAlpha=pulse*.12;c.filter='brightness(1.7)';c.drawImage(sw.full,b.x-b.width/2,b.y-b.height/2,b.width,b.height);c.restore();}
  }
  if(withResult)this.result(c,w,h,loser==='opp',reduced?1:smooth(3700,4070,t));
 }
 private result(c:C,w:number,h:number,won:boolean,alpha:number){if(!alpha)return;c.save();c.globalAlpha=alpha;const x=w/2,y=h*.51,span=Math.min(w*.32,165),size=Math.min(29,w*.055),g=c.createLinearGradient(x-span,0,x+span,0);g.addColorStop(0,'#13202b00');g.addColorStop(.2,'#13202bdd');g.addColorStop(.8,'#13202bdd');g.addColorStop(1,'#13202b00');c.fillStyle=g;c.fillRect(x-span,y-size,span*2,size*1.8);c.fillStyle=won?'#ead3a1':'#cbd7e4';c.textAlign='center';c.font=`${size}px Georgia,serif`;c.fillText(won?'VICTORY':'DEFEAT',x,y);c.fillStyle='#d3d5d8';c.font='10px sans-serif';c.fillText(won?'勝 利':'敗 北',x,y+size*.55);c.restore();}
}
