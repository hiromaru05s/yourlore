/** Card-edge contact, deliberate anticipation and a torn, cel-shaded impact. */
export type AttackRect=Pick<DOMRect,'left'|'top'|'width'|'height'>;
export const ATTACK_CONTACT_MS=340;
export const ATTACK_DURATION_MS=880;
export const ATTACK_LAUNCH_MS=180;
const sat=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number)=>{v=sat(v);return v*v*(3-2*v);};
const out=(v:number)=>1-(1-sat(v))**3;
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export function attackPlan(from:AttackRect,to:AttackRect){
 const origin={x:from.left+from.width/2,y:from.top+from.height/2};
 const target={x:to.left+to.width/2,y:to.top+to.height/2};
 const dx=target.x-origin.x,dy=target.y-origin.y,d=Math.hypot(dx,dy);
 const nx=d>1e-5?dx/d:0,ny=d>1e-5?dy/d:-1,u=Math.max(26,Math.min(160,from.width));
 const radius=(r:AttackRect)=>Math.min(Math.abs(nx)>.001?r.width/2/Math.abs(nx):Infinity,Math.abs(ny)>.001?r.height/2/Math.abs(ny):Infinity);
 const targetRadius=radius(to),attackerRadius=radius(from)*1.025;
 const travel=Math.max(0,d-targetRadius-attackerRadius+u*.025);
 return {origin,target,nx,ny,u,travel,contact:{x:target.x-nx*targetRadius,y:target.y-ny*targetRadius},wind:Math.min(24,u*.32),lift:Math.min(15,u*.2)};
}
export type AttackPlan=ReturnType<typeof attackPlan>;
/** Pose and drawer share this clock, including the 55ms contact hold. */
export function attackPose(plan:AttackPlan,ms:number){
 const {origin,nx,ny,travel,wind,lift}=plan;
 let along=0,up=0,scale=1,turn=0;
 if(ms<180){const q=smooth(ms/180);along=-wind*q;up=lift*q;scale=1+.075*q;turn=-3.5*q;}
 else if(ms<340){const q=sat((ms-180)/160)**2.6;along=mix(-wind,travel,q);up=lift*(1-q);scale=mix(1.075,1.025,q);turn=mix(-3.5,1.4,q);}
 else if(ms<395){along=travel;scale=1.025;turn=1.4;}
 else if(ms<475){const q=out((ms-395)/80);along=travel-wind*.6*q;up=lift*.32*q;scale=mix(1.025,1.055,q);turn=mix(1.4,-1.6,q);}
 else if(ms<795){const q=smooth((ms-475)/320);along=mix(travel-wind*.6,-wind*.12,q);up=lift*.32*(1-q);scale=mix(1.055,.99,q);turn=-1.6*(1-q);}
 else {const q=out((ms-795)/85);along=-wind*.12*(1-q);scale=mix(.99,1,q);}
 const side=nx<-.08?-1:1;
 return {x:origin.x+nx*along,y:origin.y+ny*along-up,scale,turn:turn*side,
  phase:ms<180?'構え':ms<340?'踏み込み':ms<395?'命中':ms<475?'反動':ms<795?'戻り':'着地'};
}
type C=CanvasRenderingContext2D;
function polygon(c:C,points:number[][],color:string){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();}
/** A filled crescent which opens into separate tapered pieces. */
function arc(c:C,r:number,angle:number,span:number,width:number,color:string){
 const outer:number[][]=[],inner:number[][]=[];
 for(let i=0;i<=18;i++){const q=i/18,a=angle+q*span,w=Math.sin(q*Math.PI)**.6*(.72+.55*q)*width;outer.push([Math.cos(a)*(r+w),Math.sin(a)*(r+w)]);inner.unshift([Math.cos(a)*r,Math.sin(a)*r]);}
 polygon(c,[...outer,...inner],color);
}
export function drawAttackImpact(c:C,plan:AttackPlan,ageMs:number){
 if(ageMs<0||ageMs>=520)return;
 const p=ageMs/520,u=Math.min(64,plan.u),r=u*(.22+1.0*out(p/.38)),fade=1-smooth((p-.57)/.43);
 c.save();c.translate(plan.contact.x,plan.contact.y);c.rotate(Math.atan2(plan.ny,plan.nx));c.globalAlpha=fade;
 // The silhouette is hollow from the beginning: the card remains the dominant shape.
 if(p<.18){
  const open=out(p/.18),outer:number[][]=[],inner:number[][]=[];
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2,tip=i%3===0?1.15:i%2?.64:.83;
   outer.push([Math.cos(a)*r*tip*.66,Math.sin(a)*r*tip]);
   inner.unshift([Math.cos(a)*r*open*.74*.66,Math.sin(a)*r*open*.74]);}
  polygon(c,[...outer,...inner],'#a58351');
  c.save();c.scale(.79,.82);polygon(c,[...outer,...inner],'#fff0ce');c.restore();
 }
 // Asymmetric arcs split, thin and retract; there is no soft glowing disk.
 const tear=smooth((p-.18)/.73);
 c.save();c.scale(.66,1);
 for(let side=0;side<2;side++)for(let part=0;part<3;part++){
  const angle=side*Math.PI-1.02+part*.75+tear*.15;
  const span=[.84,.52,.66][part]*(1-tear*.90),width=u*[.19,.13,.095][part]*(1-tear);
  arc(c,r,angle,span,width,'#927044');
  arc(c,r+u*.018,angle+.035,span*.90,width*.48,'#ffedc5');
 }
 c.restore();
 for(let i=0;i<6;i++){
  const a=(i/6)*Math.PI*2+.24,d=u*(.23+.84*out(p)),s=u*(i%2?.036:.055)*(1-p);
  c.save();c.translate(Math.cos(a)*d*.6,Math.sin(a)*d);c.rotate(a+p*1.6);
  polygon(c,[[-s*.3,-s],[s*.7,-s*.5],[s*.3,s],[-s*.7,s*.4]],i%2?'#c4ac7d':'#fff0cd');c.restore();
 }
 c.restore();
}
export function drawAttackVisual(c:C,from:AttackRect,to:AttackRect,age:number){
 const ms=age*1000;if(ms<0||ms>=ATTACK_DURATION_MS)return;
 const plan=attackPlan(from,to),pose=attackPose(plan,ms),{nx,ny,u}=plan;
 c.save();
 // A compact moving shadow anchors the lifted physical card to the tabletop.
 c.globalAlpha=.16*Math.sin(Math.min(1,ms/ATTACK_DURATION_MS)*Math.PI);
 c.fillStyle='#34404b';c.beginPath();c.ellipse(pose.x+3,pose.y+u*.24,u*.4,u*.15,0,0,Math.PI*2);c.fill();
 if(ms>180&&ms<400){
  const q=sat((ms-180)/160),fade=1-smooth((ms-340)/60),tail=Math.min(plan.travel*.5,u*1.45)*Math.sin(q*Math.PI*.68);
  c.globalAlpha=fade;c.translate(pose.x,pose.y);c.rotate(Math.atan2(ny,nx));
  for(let i=0;i<2;i++){
   const y=(i?1:-1)*u*.24,w=u*(i?.055:.085),front=-u*.23;
   polygon(c,[[front,y],[-tail-u*.5,y-w*.5],[-tail*.7-u*.5,y+w*.25],[front-u*.08,y+w]],'#668393');
   polygon(c,[[front-u*.08,y],[-tail*.75-u*.4,y-w*.23],[front-u*.12,y+w*.38]],'#eaf3ee');
  }
 }
 c.restore();drawAttackImpact(c,plan,ms-ATTACK_CONTACT_MS);
}
