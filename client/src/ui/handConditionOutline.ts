/** Trace the union of the actual raster frame and seals, never the inner art aperture. */
type Layer={url:string;x:number;y:number;w:number;h:number};
type Point=[number,number];
export type Outline={d:string;width:number;height:number;bounds:number[];layers:Layer[]};
const cache=new Map<string,Promise<Outline>>();
const images=new Map<string,Promise<HTMLImageElement>>();
function load(url:string){let p=images.get(url);if(!p){p=new Promise<HTMLImageElement>((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('輪郭画像を読み込めません: '+url));im.src=url;});images.set(url,p);}return p;}
function geometry(node:HTMLElement){const scale=200/parseFloat(getComputedStyle(node).width),height=parseFloat(getComputedStyle(node).height)*scale;
 const layers:Layer[]=[];
 for(const el of node.querySelectorAll<HTMLElement>(':scope > .card-frame, :scope > .card-cost > .seal-face, :scope > .ad-atk > .seal-face, :scope > .ad-def > .seal-face')){
 const cs=getComputedStyle(el),url=cs.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];if(!url)continue;
 let x=0,y=0,current:HTMLElement|null=el;
 while(current&&current!==node){const s=getComputedStyle(current);x+=parseFloat(s.left)||0;y+=parseFloat(s.top)||0;current=current.offsetParent as HTMLElement|null;}
 layers.push({url,x:x*scale,y:y*scale,w:parseFloat(cs.width)*scale,h:parseFloat(cs.height)*scale});
 }
 return {layers,height};
}
// Ramer–Douglas–Peucker removes pixel stair-steps without rounding away the seal shapes.
function simplify(points:Point[],epsilon:number):Point[]{if(points.length<3)return points;const a=points[0],b=points[points.length-1],dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;let max=0,index=0;
 for(let i=1;i<points.length-1;i++){const p=points[i],t=den?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)):0,d=Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);if(d>max){max=d;index=i;}}
 return max>epsilon?[...simplify(points.slice(0,index+1),epsilon).slice(0,-1),...simplify(points.slice(index),epsilon)]:[a,b];
}
export function outlineFor(node:HTMLElement){const {layers,height}=geometry(node);const key=JSON.stringify({height:Math.round(height),layers:layers.map(l=>({...l,x:+l.x.toFixed(1),y:+l.y.toFixed(1),w:+l.w.toFixed(1),h:+l.h.toFixed(1)}))});let promise=cache.get(key);
 if(!promise){promise=trace(layers,height);cache.set(key,promise);}return promise;
}
async function trace(layers:Layer[],height:number):Promise<Outline>{
 const resolution=2,pad=24,width=200,W=(width+pad*2)*resolution,H=Math.ceil((height+pad*2)*resolution);
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d',{willReadFrequently:true})!;
 const union=new Uint8Array(W*H);
 for(const layer of layers){ctx.clearRect(0,0,W,H);ctx.drawImage(await load(layer.url),(layer.x+pad)*resolution,(layer.y+pad)*resolution,layer.w*resolution,layer.h*resolution);const data=ctx.getImageData(0,0,W,H).data;
 // Match #celestial-matte: alpha = source alpha × clamp(10(R+G+B) - .65).
 for(let i=0;i<union.length;i++){const k=i*4;const matte=Math.max(0,Math.min(1,(data[k]+data[k+1]+data[k+2])/255*10-.65));if(data[k+3]/255*matte>.4)union[i]=1;}}
 const edge=new Map<number,number[]>(),stride=W+1,inside=(x:number,y:number)=>x>=0&&y>=0&&x<W&&y<H&&union[y*W+x];
 const add=(x:number,y:number,xx:number,yy:number)=>{const k=y*stride+x,n=yy*stride+xx;const arr=edge.get(k);if(arr)arr.push(n);else edge.set(k,[n]);};
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(inside(x,y)){if(!inside(x,y-1))add(x,y,x+1,y);if(!inside(x+1,y))add(x+1,y,x+1,y+1);if(!inside(x,y+1))add(x+1,y+1,x,y+1);if(!inside(x-1,y))add(x,y+1,x,y);}
 let best:Point[]=[],bestArea=0;
 while(edge.size){const start=edge.keys().next().value!;let k=start;const points:Point[]=[];
 for(let n=0;n<W*H;n++){points.push([k%stride,Math.floor(k/stride)]);const choices=edge.get(k);if(!choices)break;const next=choices.pop()!;if(!choices.length)edge.delete(k);k=next;if(k===start)break;}
 let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a[0]*b[1]-b[0]*a[1];}
 if(area>bestArea){bestArea=area;best=points;}
 }
 if(best.length<20)throw Error('カード外周を抽出できません');
 // Rotate the closed contour's start to the highest point, retaining clockwise order.
 let top=0;for(let i=1;i<best.length;i++)if(best[i][1]<best[top][1])top=i;
 best=[...best.slice(top),...best.slice(0,top)];best.push(best[0]);
 const simple=simplify(best,.8).map(([x,y])=>[x/resolution-pad,y/resolution-pad] as Point);
 const xs=simple.map(p=>p[0]),ys=simple.map(p=>p[1]);
 return {d:simple.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')+' Z',width,height,bounds:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)],layers};
}
