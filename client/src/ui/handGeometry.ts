export type HandLayout=Map<string,{matrix:DOMMatrix;width:number;height:number}>;
/** Recover the actual affine quad, including scale on the open-hand ancestor.
 * The bounding box locates the quad; it never supplies its rotated dimensions. */
export function handCardMatrix(node:HTMLElement):DOMMatrix {
 const style=getComputedStyle(node),w=parseFloat(style.width)||node.offsetWidth,h=parseFloat(style.height)||node.offsetHeight;
 let linear=new DOMMatrix();
 for(let el:HTMLElement|null=node;el;el=el.parentElement){const transform=getComputedStyle(el).transform;if(transform&&transform!=='none')linear=new DOMMatrix(transform).multiply(linear);}
 linear.m41=linear.m42=linear.m43=0;
 const corners=[[0,0],[w,0],[w,h],[0,h]].map(([x,y])=>linear.transformPoint(new DOMPoint(x,y))),r=node.getBoundingClientRect();
 linear.m41=r.left-Math.min(...corners.map(p=>p.x));linear.m42=r.top-Math.min(...corners.map(p=>p.y));return linear;
}
export function captureHandLayout(hand:HTMLElement|null):HandLayout {
 const result:HandLayout=new Map();if(!hand||typeof DOMMatrix==='undefined')return result;
 [...hand.querySelectorAll<HTMLElement>(':scope > .card,:scope > .card--back')].forEach((node,i)=>{const cs=getComputedStyle(node);result.set(node.dataset.uid||'#'+i,{matrix:handCardMatrix(node),width:parseFloat(cs.width)||node.offsetWidth,height:parseFloat(cs.height)||node.offsetHeight});});return result;
}
export function arrivingHandUids(before:readonly {uid:string}[],after:readonly {uid:string}[],count:number){
 if(count<=0)return [];const old=new Set(before.map(c=>c.uid));return after.filter(c=>!old.has(c.uid)).slice(-Math.max(0,count)).map(c=>c.uid);
}
