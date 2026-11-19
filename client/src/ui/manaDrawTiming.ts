export const DRAW_RATE=1.15;
export const DRAW_FLIGHT=1.38/DRAW_RATE,DRAW_GAP=.24/DRAW_RATE;
export const DRAW_WAKE=.29/DRAW_RATE;
export const drawDuration=(count:number)=>DRAW_FLIGHT+(count-1)*DRAW_GAP+.28/DRAW_RATE;
