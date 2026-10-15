const smooth=(a:number,b:number,t:number)=>{const x=Math.min(1,Math.max(0,(t-a)/(b-a)));return x*x*(3-2*x)};
/** Foreground light clears before either the camera or the selected book moves. */
export function introState(seconds:number){
 return {blur:1-smooth(0,.24,seconds),light:smooth(0,.58,seconds),lightAlpha:(1-smooth(.32,.58,seconds)),bookTime:Math.max(0,seconds-.70)/9.40};
}
