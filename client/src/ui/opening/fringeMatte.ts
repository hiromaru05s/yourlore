/** A fixed, connected matte for Lumi's forehead locks. Never re-segment moving frames. */
export function createFringeLayers(image:HTMLImageElement){
 const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
 const g=canvas.getContext('2d',{willReadFrequently:true})!;g.drawImage(image,0,0);
 const {width:w,height:h}=canvas,rgba=g.getImageData(0,0,w,h);
 const source=new Uint8ClampedArray(rgba.data);
 const x0=Math.floor(w*.65),x1=Math.ceil(w*.855),y0=Math.floor(h*.085),y1=Math.ceil(h*.33);
 const candidate=new Uint8Array(w*h),grown=new Uint8Array(w*h),closed=new Uint8Array(w*h),selected=new Uint8Array(w*h);
 const lockOutline=new Path2D('M 815 105 L 1050 105 C 1060 240 1040 310 1000 352 C 978 382 950 405 908 407 L 907 377 L 910 347 C 923 312 945 280 940 245 L 815 245 Z');
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
  if(!g.isPointInPath(lockOutline,x*1254/w,y*1254/h))continue;
  const i=(y*w+x)*4,r=rgba.data[i]/255,b=rgba.data[i+2]/255,v=rgba.data[i+1]/255;
  candidate[y*w+x]=Number(r>.26&&b>.085&&v<.65&&r>v*1.12&&r<v*1.92+.02&&v<b*1.85+.025);
 }
 // Close one-pixel gaps in painted highlights; seed-connectivity excludes brows and irises.
 for(let y=y0+1;y<y1-1;y++)for(let x=x0+1;x<x1-1;x++){
  let value=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)value|=candidate[(y+dy)*w+x+dx];grown[y*w+x]=value;
 }
 for(let y=y0+2;y<y1-2;y++)for(let x=x0+2;x<x1-2;x++){
  let value=1;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)value&=grown[(y+dy)*w+x+dx];closed[y*w+x]=value;
 }
 const queue:number[]=[];
 const seed=Math.round(h*.16)*w+Math.round(w*.78);
 if(closed[seed]){queue.push(seed);selected[seed]=1;}
 for(let n=0;n<queue.length;n++){const p=queue[n];for(const d of [-w-1,-w,-w+1,-1,1,w-1,w,w+1]){const q=p+d;if(closed[q]&&!selected[q]){selected[q]=1;queue.push(q);}}}
 // Fill tiny enclosed paint pinholes only, never the forehead or eye openings.
 const visited=new Uint8Array(w*h);
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
  const start=y*w+x;if(selected[start]||visited[start])continue;
  const hole=[start];visited[start]=1;let open=false;
  for(let n=0;n<hole.length;n++){const p=hole[n],px=p%w,py=Math.floor(p/w);if(px===x0||px===x1-1||py===y0||py===y1-1)open=true;
   for(const d of [-w,-1,1,w]){const q=p+d,qx=q%w,qy=Math.floor(q/w);if(qx>=x0&&qx<x1&&qy>=y0&&qy<y1&&!visited[q]&&!selected[q]){visited[q]=1;hole.push(q);}}
  }
  if(!open&&hole.length<=12)for(const p of hole)selected[p]=1;
 }
 const foreground=document.createElement('canvas');foreground.width=w;foreground.height=h;
 const fg=foreground.getContext('2d')!,paint=fg.createImageData(w,h);
 rgba.data.fill(0);
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
  let coverage=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)coverage+=selected[(y+dy)*w+x+dx]||0;
  const i=(y*w+x)*4;rgba.data[i]=Math.round(coverage/9*255);rgba.data[i+1]=coverage?255:0;rgba.data[i+3]=255;
  if(coverage){
   // Edge RGB comes from the nearest actual hair pixel, never the pale skin beneath it.
   let best=Infinity,nearest=y*w+x;
   for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
    const q=(y+dy)*w+x+dx,dist=dx*dx+dy*dy;
    if(candidate[q]&&selected[q]&&dist<best){best=dist;nearest=q;}
   }
   if(best<Infinity){paint.data[i]=source[nearest*4];paint.data[i+1]=source[nearest*4+1];paint.data[i+2]=source[nearest*4+2];paint.data[i+3]=rgba.data[i];}
  }
 }
 g.putImageData(rgba,0,0);fg.putImageData(paint,0,0);return {matte:canvas,foreground};
}
export const createFringeMatte=(image:HTMLImageElement)=>createFringeLayers(image).matte;
