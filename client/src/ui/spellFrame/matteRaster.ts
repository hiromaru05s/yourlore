/** The original celestial-matte alpha transfer, at the caller's full resolution. */
export function rasterMatte<C extends HTMLCanvasElement|OffscreenCanvas>(image:CanvasImageSource,width:number,height:number,canvas:()=>C):C{
 const c=canvas();c.width=Math.ceil(width);c.height=Math.ceil(height);
 const ctx=c.getContext('2d') as CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D;
 ctx.drawImage(image,0,0,c.width,c.height);const pixels=ctx.getImageData(0,0,c.width,c.height);
 for(let i=0;i<pixels.data.length;i+=4){const a=Math.min(1,Math.max(0,(pixels.data[i]+pixels.data[i+1]+pixels.data[i+2])/255*10-.65));pixels.data[i+3]*=a;}
 ctx.putImageData(pixels,0,0);return c;
}
