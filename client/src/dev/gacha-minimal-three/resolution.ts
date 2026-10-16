/** Parent CSS magnification is invisible to the iframe's devicePixelRatio.
 * Budget the source raster against the final displayed size, not the unzoomed
 * board. Keep four coverage samples even when the pixel ceiling is reached. */
export function previewPixelRatio(width:number,height:number,zoom:number,dpr:number){
 const density=Math.max(1,Math.min(dpr||1,2));
 const desired=Math.max(2,density*Math.max(1,zoom)*1.15);
 const budget=zoom>1?12_000_000:6_000_000;
 return Math.min(6,desired,Math.sqrt(budget/Math.max(1,width*height)));
}
