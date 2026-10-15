/** One daylight sample shared by the HOME background and its cached 3D guide.
 * Background owns time/occlusion; the guide only reads it. Tutorial lighting is separate. */
export const homeDaylight={time:0,sun:.75};
const readyListeners=new Set<()=>void>();
/** Redraw a frozen guide once when late-loaded background textures establish daylight. */
export function onHomeDaylightReady(callback:()=>void):()=>void {readyListeners.add(callback);return()=>{readyListeners.delete(callback);};}
export function announceHomeDaylightReady():void {for(const callback of readyListeners)callback();}
