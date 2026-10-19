/** Match the native board density, including Retina and high-density phones. */
export function summonPixelRatio():number {
 return Math.max(1,globalThis.devicePixelRatio||1);
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

/** Rasterize local planes at display density while retaining authored CSS coordinates. */
export function sizeSummonPlane(canvas:HTMLCanvasElement,width:number,height=width):void {
 const dpr=summonPixelRatio();canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(height*dpr);
 canvas.getContext('2d')!.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);
}
