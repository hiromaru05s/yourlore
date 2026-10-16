/** Keep full-screen summon passes as sharp as the native board on Retina.
 * Limit oversampling to four million pixels; never undersample CSS units. */
export function summonPixelRatio():number {
 return Math.max(1,Math.min(globalThis.devicePixelRatio||1,2,Math.sqrt(4_000_000/(innerWidth*innerHeight))));
}
export function sizeSummonCanvas(canvas:HTMLCanvasElement):void {
 const dpr=summonPixelRatio();canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);
}
export function summonPixelMatrix(matrix:DOMMatrix):DOMMatrix {
 const dpr=summonPixelRatio();return dpr===1?matrix:new DOMMatrix().scale(dpr,dpr,1).multiply(matrix);
}
/** Restore the native printed face after the motion has settled, while the
 * final renderer layer retires. Keep the original visibility for cancellation. */
export function settleSummonFace(source:HTMLElement,layer:HTMLElement,ms:number,end:number):void {
 const t=Math.max(0,Math.min(1,(ms-(end-180))/180));
 if(t>0){source.style.visibility='visible';layer.style.opacity=String(1-t*t*(3-2*t));}
}
