/** Deterministic card trajectories. Coordinates are in the current home viewport. */
export const clamp=(v:number)=>Math.max(0,Math.min(1,v));
export const ease=(a:number,b:number,t:number)=>{const p=clamp((t-a)/(b-a));return p*p*(3-2*p);};
export const out=(a:number,b:number,t:number)=>1-(1-clamp((t-a)/(b-a)))**3;
export function cardPose(variant:number,i:number,t:number,w:number,h:number,dock:{x:number;y:number;width:number}){
 const n=i-3,side=Math.sign(n),spread=out(.57,1.48,t),step=Math.min(w*.115,140);
 let x=n*step*spread,y=Math.abs(n)*h*.022*spread,rz=n*10*spread,ry=-n*3*spread,rx=8*(1-spread),scale=1+.22*spread,opacity=1;
 const f=ease(1.62+Math.abs(n)*.035,3.12+Math.abs(n)*.035,t);
 if(variant===0){x+=n*w*.21*f;y-=h*1.15*f;rz+=n*18*f;ry+=64*f;scale-=.18*f;}
 if(variant===1){x+=side*w*.88*f;y-=h*(n===0?1.2:.11)*f;rz+=side*26*f;ry+=side*42*f;}
 if(variant===2){const q=ease(1.42+i*.1,2.56+i*.1,t);x+=w*.36*q;y-=h*1.2*q;rz+=38*q;ry+=58*q;scale-=.18*q;}
 if(variant===3){const q=ease(1.52+Math.abs(n)*.085,2.95+Math.abs(n)*.085,t);ry+=((i%2)*2-1)*168*q;x+=side*w*.74*q;y-=h*(n===0?1.2:.24)*q;rz+=side*18*q;}
 if(variant===4){const q=ease(1.5+i*.025,3.1+i*.025,t);x+=w*(.35*Math.sin(q*Math.PI*.75)+q*.7);y-=h*(.12*Math.sin(q*Math.PI)+q*.92);rz+=q*70;ry+=q*30;}
 if(variant===5){const a=out(.75,1.6,t),q=ease(1.7,3.1,t);x=side*(w*.24+Math.abs(n)*w*.065)*a*(1+q*2.9);y=(Math.abs(n)-2)*h*.11*a-h*q*(n===0?1.25:.15);ry=side*(-33*a+23*q);rz=side*8*a;scale=1+.15*a+q*1.2;}
 if(variant===6){const gather=ease(1.45,2.08,t),q=ease(2.12,3.27,t);x*=1-gather;y*=1-gather;rz*=1-gather;ry*=1-gather;x-=w*1.1*q;y-=h*.25*q;ry+=q*105;rz-=q*18;scale+=gather*.08+q*.85;}
 if(variant===7){const q=ease(1.62+i*.04,2.83+i*.04,t);x=x*(1-q)+(dock.x-w/2+(i-3)*4)*q;y=y*(1-q)+(dock.y-h*.5)*q;rz=rz*(1-q)+(-8+i*2)*q;ry*=1-q;rx*=1-q;scale=scale*(1-q)+(dock.width/180)*q;opacity=1-ease(2.97+i*.04,3.1+i*.04,t);}
 return {x,y,rz,ry,rx,scale,opacity,spread};
}
