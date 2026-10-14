import {ease,mix,SPELL_LAND,type Layout,type Rect} from './model';
export function sourcePose(layout:Layout,ms:number):Rect {
 const blend=(a:Rect,b:Rect,t:number):Rect=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t),w:mix(a.w,b.w,t),h:mix(a.h,b.h,t)});
 const held=layout.played??layout.source;
 return blend(blend(layout.source,held,ease(ms,0,620)),layout.ownGrave??layout.source,ease(ms,1220,SPELL_LAND));
}
/** Keep the native frame, alpha masks and text: no raster crop, lighting or color conversion. */
export function placeSource(node:HTMLElement,layout:Layout,ms:number):void {
 const p=sourcePose(layout,ms),base=layout.played??layout.source;
 node.hidden=ms<=0||ms>=SPELL_LAND;
 node.style.cssText=`visibility:${node.hidden?'hidden':'visible'};position:fixed;left:${p.x-p.w/2}px;top:${p.y-p.h/2}px;width:${base.w}px;height:${base.h}px;--cw:${base.w}px;--ch:${base.h}px;margin:0;pointer-events:none;z-index:146;transform-origin:0 0;transform:scale(${p.w/base.w},${p.h/base.h});transition:none;filter:none;opacity:1;overflow:visible`;
}
