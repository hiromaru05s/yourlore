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
/** Convert viewport poses into transforms on the card in its hand slot. */
export function handSlotSpace(node:HTMLElement){
  const style=getComputedStyle(node),w=parseFloat(style.width),h=parseFloat(style.height);
  const [ox,oy]=style.transformOrigin.split(' ').map(parseFloat);
  const rest=handCardMatrix(node);
  const around=new DOMMatrix().translate(ox,oy);
  const local=style.transform==='none'?new DOMMatrix():new DOMMatrix(style.transform);
  const toLocal=local.multiply(around.inverse()).multiply(rest.inverse());
  const transform=(pose:DOMMatrix)=>toLocal.multiply(pose).multiply(around).toString();
  return {w,h,rest,transform};
}

/** The new fan is already laid out. Hold surviving cards at their last visible
 * pose while the pile projection, card frames and flight renderer get ready. */
export function holdDrawHand(cards:HTMLElement[],incoming:HTMLElement[],previous?:HandLayout){
 // Read every slot before starting an animation on any of its siblings.
 const poses=(previous?.size?cards:[]).flatMap((node,i)=>{
  const old=previous?.get(node.dataset.uid||'#'+i);
  if(!old||incoming.includes(node))return [];
  const {w,h,transform}=handSlotSpace(node);
  if(!(w>0&&h>0))return [];
  const pose=transform(old.matrix.scale(old.width/w,old.height/h));
  // A running CSS left transition must not move the pinned transform.
  const css=getComputedStyle(node);
  return [{node,key:{transform:pose,left:css.left,top:css.top}}];
 });
 const holds=poses.map(({node,key})=>node.animate([key,key],{duration:1,fill:'both'}));
 return ()=>{for(const hold of holds)hold.cancel();holds.length=0;};
}

export function captureHandLayout(hand:HTMLElement|null):HandLayout {
 const result:HandLayout=new Map();if(!hand||typeof DOMMatrix==='undefined')return result;
 [...hand.querySelectorAll<HTMLElement>(':scope > .card,:scope > .card--back')].forEach((node,i)=>{const cs=getComputedStyle(node);result.set(node.dataset.uid||'#'+i,{matrix:handCardMatrix(node),width:parseFloat(cs.width)||node.offsetWidth,height:parseFloat(cs.height)||node.offsetHeight});});return result;
}
export function arrivingHandUids(before:readonly {uid:string}[],after:readonly {uid:string}[],count:number){
 if(count<=0)return [];const old=new Set(before.map(c=>c.uid));return after.filter(c=>!old.has(c.uid)).slice(-Math.max(0,count)).map(c=>c.uid);
}
