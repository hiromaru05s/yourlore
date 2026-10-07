import {at,smooth,type P,type Quad} from './catalog';
/** A short compression, a 65–85 ms held breath, then accelerating internal expansion. */
export function pressureState(mode:number,t:number){
 const start=[.63,.64,.64,.63,.64][mode],hold=smooth(.27,.46,t)*(1-smooth(start,start+.10,t)),release=smooth(start,1,t);
 return{hold,release,coat:smooth(.04,.41,t),light:smooth(.25,.58,t)*.40+release*.60};
}
export function pressurePoint(source:Quad,w:number,mode:number,t:number,x:number,y:number):P{
 const {hold,release}=pressureState(mode,t),u=x-.5,z=y-.5;
 let cx=.5,cy=.5;if(mode===0){cx=.47;cy=.44;}if(mode===2){cx=.44;cy=.42;}
 const dome=Math.exp(-(((x-cx)/.43)**2+((y-cy)/.54)**2)*1.2),tension=release*release;
 let dx=-u*.026*hold,dy=-z*.018*hold;
 // Internal doming exceeds edge motion: the face bows rather than scaling as a flat rectangle.
 dx+=(x-cx)*(.055+.24*dome)*tension;dy+=(y-cy)*(.035+.17*dome)*tension;
 if(mode===1){dx=dx*1.24-z*.035*release;dy=dy*.82+u*.035*release;}
 if(mode===2){const fold=Math.sin((y+x*.3-t*1.2)*Math.PI);dx+=z*.07*tension;dy-=u*.06*tension+fold*.022*smooth(.12,.65,t);}
 if(mode===3){dx*=1.20;dy*=1.16;}
 if(mode===4){dx+=Math.sin(y*Math.PI*2)*.065*tension;dy+=Math.sin(x*Math.PI*2)*.035*tension;}
 const p=at(source,x+dx,y+dy);return{x:p.x,y:p.y-w*(.015*smooth(.10,.45,t)+.055*dome*tension)};
}
