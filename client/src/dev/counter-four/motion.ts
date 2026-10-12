import {attackPlan,attackPose,drawAttackVisual} from '../../ui/attackVisual';
import type {AttackPlan,AttackRect} from '../../ui/attackVisual';
import {PREP,TOTAL,ease,envelope} from './catalog';
import {Renderer} from './renderer';
export function pose(plan:AttackPlan,v:number,t:number,reduced=false){
 const base={x:plan.origin.x,y:plan.origin.y,scale:1,turn:0,phase:'待機'};
 if(t<=0||t>=TOTAL)return base;
 if(reduced)return {...base,phase:t<PREP?'反撃の予兆':t<950?'返撃':'待機'};
 if(t>=PREP)return attackPose(plan,Math.min(880,t-PREP+180));
 const end=attackPose(plan,180),u=ease(0,PREP,t),a=envelope(v,t),side=plan.ny<0?1:-1;
 let cross=0,turn=0,lift=0;
 if(v===0){lift=-plan.u*.045*a;turn=1.8*a;}
 if(v===1){cross=plan.u*.14*a;turn=-7*a*side;}
 if(v===2){lift=plan.u*.025*Math.sin(t/95)*a;turn=.7*a;}
 if(v===3){lift=plan.u*.045*a;turn=-1*a;}
 return{x:plan.origin.x+(end.x-plan.origin.x)*u-plan.ny*cross,y:plan.origin.y+(end.y-plan.origin.y)*u+plan.nx*cross+lift,scale:1+(end.scale-1)*u,turn:end.turn*u+turn,phase:t<180?'受け止め':t<490?'溜め': '切り返し'};
}
export function scene(c:CanvasRenderingContext2D,renderer:Renderer,face:HTMLCanvasElement,v:number,t:number,width:number,height:number,reduced:boolean,chain:boolean,dark:boolean){
 c.clearRect(0,0,width,height);c.fillStyle=dark?'#272f34':'#f7f4eb';c.fillRect(0,0,width,height);
 const w=Math.min(width*.37,chain?112:156),h=w/ .64,cy=chain?height*.64:height*.51;
 const from:AttackRect={left:width/2-w/2,top:cy-h/2,width:w,height:h};
 const tw=w*.64,th=tw/.64,to:AttackRect={left:width/2-tw/2,top:18,width:tw,height:th};
 const plan=attackPlan(from,to),p=pose(plan,v,t,reduced);
 // One physical tabletop, with the light kept local to the source card.
 c.save();c.strokeStyle=dark?'#45484b':'#d1cec3';c.lineWidth=.75;c.beginPath();c.roundRect(width*.12,10,width*.76,height-20,8);c.stroke();c.restore();
 if(chain){c.save();c.globalAlpha=.44;const targetY=to.top+th/2+(t>=860&&t<990&&!reduced?-5*Math.sin((t-860)/130*Math.PI):0);renderer.draw(c,face,v,0,to.left+tw/2,targetY,tw,true);c.restore();}
 c.save();c.translate(p.x,p.y);c.rotate(p.turn*Math.PI/180);c.scale(p.scale,p.scale);renderer.draw(c,face,v,t<PREP?t:0,0,0,w,reduced);c.restore();
 if(chain&&t>=PREP&&t<1400&&!reduced)drawAttackVisual(c,from,to,(t-PREP+180)/1000);
 if(reduced&&t>=PREP&&t<1000){c.strokeStyle='#c5a560';c.lineWidth=2;c.beginPath();c.moveTo(width/2,cy-h/2);c.lineTo(width/2,to.top+th);c.stroke();}
}
