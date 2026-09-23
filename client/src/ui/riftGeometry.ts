import {RIFT_OUTLINE} from './riftOutline';
/** Projection of the entire through-cut, including the underside, rather than
 * a flat almond placed at the ornament anchor above the table. */
export const RIFT_DEPTHS=[-.044,0,.018] as const;
export const riftOutline=()=>RIFT_OUTLINE;
export function convexCover(points:{x:number;y:number}[]){
 const sorted=[...points].sort((a,b)=>a.x-b.x||a.y-b.y),cross=(a:typeof points[0],b:typeof a,c:typeof a)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const half=(xs:typeof points)=>{const result:typeof points=[];for(const p of xs){while(result.length>1&&cross(result[result.length-2],result[result.length-1],p)<=0)result.pop();result.push(p);}return result.slice(0,-1);};
 return [...half(sorted),...half([...sorted].reverse())];
}
