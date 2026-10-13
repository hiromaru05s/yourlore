import {projectedPlacement} from '../boardProjection';
/** Include responsive scaling outside the projected board tree. */
export function voidPlacement(anchor:HTMLElement){
 const base=projectedPlacement(anchor,180,270),points=[[0,0],[180,0],[180,270],[0,270]].map(([x,y])=>{const p=base.transformPoint(new DOMPoint(x,y));return{x:p.x/p.w,y:p.y/p.w};});
 const left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),bottom=Math.max(...points.map(p=>p.y)),actual=anchor.getBoundingClientRect();
 if(right<=left||bottom<=top||actual.width<=0||actual.height<=0)throw Error('Void summon anchor has no area');
 return new DOMMatrix().translate(actual.left,actual.top).scale(actual.width/(right-left),actual.height/(bottom-top)).translate(-left,-top).multiply(base);
}
