export const DURATION=6200;
export type Rect={x:number;y:number;w:number;h:number};
export type Frame={time:number;side:number;source:Rect;targets:Rect[];width:number;height:number};
export const progress=(t:number,a:number,b:number)=>Math.max(0,Math.min(1,(t-a)/(b-a)));
export const smooth=(v:number)=>v*v*(3-2*v);
export const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
