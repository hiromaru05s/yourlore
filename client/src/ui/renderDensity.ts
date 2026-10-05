export function renderQuality(){try{return localStorage.getItem('lore-render-quality')==='economy'?'economy':'balanced';}catch{return 'balanced';}}
export function setRenderQuality(value:string){try{localStorage.setItem('lore-render-quality',value==='economy'?'economy':'balanced');}catch{}}
/** Cached board raster budget and moving-overlay budget are separate. Crisp
 * balances retina output with a 6MP/half-float cache ceiling; legacy is available
 * for controlled comparisons and lower-power devices. */
export function boardPixelRatio(width:number,height:number,dpr=devicePixelRatio||1){
 const quality=renderQuality();
 const legacy=quality==='economy',cap=legacy?1.5:2,budget=legacy?2600000:6000000;
 return Math.min(dpr,cap,Math.sqrt(budget/Math.max(1,width*height)));
}
export function flightPixelRatio(dpr=devicePixelRatio||1){return Math.min(dpr,renderQuality()==='economy'?1.5:2,Math.sqrt((renderQuality()==='economy'?2600000:4200000)/Math.max(1,innerWidth*innerHeight)));}
