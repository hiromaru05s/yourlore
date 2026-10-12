import * as T from 'three';
export const noise=(n:number)=>{const f=Math.sin(n*127.1+91.7)*43758.5453;return f-Math.floor(f);};
export type XY=[number,number];
export function clip(poly:XY[],nx:number,ny:number,c:number):XY[]{const out:XY[]=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=a[0]*nx+a[1]*ny-c,db=b[0]*nx+b[1]*ny-c;if(da<=0)out.push(a);if((da<0)!==(db<0)){const u=da/(da-db);out.push([a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u]);}}return out;}
export function cells(v:number):XY[][]{
 const boundary:XY[]=[[-.48,-.77],[.43,-.78],[.51,-.67],[.50,.70],[.43,.78],[-.43,.78],[-.51,.67],[-.50,-.70]];
 if(v===1){return Array.from({length:7},(_,i)=>clip(clip(boundary,.18,1,-.79+(i+1)*.23),-.18,-1,.79-i*.23));}
 if(v===4){return [-1,1].flatMap(side=>[0,1,2].map(row=>clip(clip(clip(boundary,-side,0,.018),0,1,-.78+(row+1)*.52),0,-1,.78-row*.52)));}
 const seeds:XY[]=v===3?[[0,.04],[-.36,.58],[.21,.68],[.4,.34],[.37,-.27],[.15,-.65],[-.31,-.62],[-.4,-.15]]:Array.from({length:v===5?29:v===2?17:13},(_,i)=>[(noise(i*3+v*51)-.5)*.99,(noise(i*3+19+v*33)-.5)*1.54]);
 return seeds.map((a,i)=>{let p=boundary;seeds.forEach((b,j)=>{if(i!==j)p=clip(p,b[0]-a[0],b[1]-a[1],(b[0]**2+b[1]**2-a[0]**2-a[1]**2)/2);});return p;});
}
/** Chipped, slightly domed faces: radial rings provide actual relief, not a flat noise decal. */
export function rock(outline:XY[],index:number,v:number){
 const poly:XY[]=[];
 for(let j=0;j<outline.length;j++){const a=outline[j],b=outline[(j+1)%outline.length],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.047));for(let k=0;k<steps;k++){const t=k/steps,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,jitter=k===0?0:.004;poly.push([x+Math.sin(x*417+y*293)*jitter,y+Math.cos(x*331-y*211)*jitter]);}}

 const cx=poly.reduce((s,p)=>s+p[0],0)/poly.length,cy=poly.reduce((s,p)=>s+p[1],0)/poly.length;
 const depth=v===1?.038:v===5?.038:.086;const pos:number[]=[],uv:number[]=[],colors:number[]=[],normals:number[]=[];
 const z=(x:number,y:number)=>depth+(v===2?.19:v===3?.12:.065)*Math.max(0,1-(x*x/.32+y*y/.8))+.005*Math.sin(x*49+y*27);
 const vertex=(x:number,y:number,h:number,c:number,smooth=false)=>{const dome=v===2?.19:v===3?.12:.065;const n=new T.Vector3(dome*2*x/.32,dome*2*y/.8,1).normalize();normals.push(...(smooth?n.toArray():[0,0,0]));pos.push(x-cx,y-cy,h);uv.push(x+.5,(y+.79)/1.58);colors.push(c,c,c);};
 const tri=(a:number[],b:number[],c:number[],shade:number,smooth=false)=>{for(const p of[a,b,c])vertex(p[0],p[1],p[2],shade,smooth);};
 for(let j=0;j<poly.length;j++){const a=poly[j],b=poly[(j+1)%poly.length];const ax=cx+(a[0]-cx)*.985,ay=cy+(a[1]-cy)*.985,bx=cx+(b[0]-cx)*.985,by=cy+(b[1]-cy)*.985;
  const ia=[cx+(ax-cx)*.91,cy+(ay-cy)*.91],ib=[cx+(bx-cx)*.91,cy+(by-cy)*.91];const za=z(...ia as XY),zb=z(...ib as XY),edge=.008+noise(index*9+j)*.006;
  tri([cx,cy,z(cx,cy)+.004],[...ia,za],[...ib,zb],.97,true);
  tri([...ia,za],[ax,ay,za-edge],[bx,by,zb-edge],.84);tri([...ia,za],[bx,by,zb-edge],[...ib,zb],.84);
  tri([ax,ay,za-edge],[ax,ay,-.006],[bx,by,-.006],.60);tri([ax,ay,za-edge],[bx,by,-.006],[bx,by,zb-edge],.67);
  tri([cx,cy,-.006],[bx,by,-.006],[ax,ay,-.006],.60);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();const ns=g.getAttribute('normal');for(let i=0;i<ns.count;i++)if(normals[i*3+2])ns.setXYZ(i,normals[i*3],normals[i*3+1],normals[i*3+2]);return {g,cx,cy,depth};
}
export function mineralTexture(kind:'color'|'height'){
 const c=document.createElement('canvas');c.width=1024;c.height=1536;const x=c.getContext('2d')!;
 x.fillStyle=kind==='color'?'#a9a797':'#888888';x.fillRect(0,0,c.width,c.height);
 for(let i=0;i<1300;i++){const px=noise(i+784)*1024,py=noise(i+21)*1536,r=6+noise(i+102)*35;const gr=x.createRadialGradient(px,py,0,px,py,r);gr.addColorStop(0,i%2?'rgba(235,230,211,.19)':'rgba(71,70,62,.14)');gr.addColorStop(1,'rgba(100,100,90,0)');x.fillStyle=gr;x.fillRect(px-r,py-r,r*2,r*2);}

 // Broad sediment bands, fine limestone pores, and a few branching mineral inclusions.
 for(let j=0;j<105;j++){x.beginPath();for(let i=0;i<=60;i++){const px=i*c.width/60,py=j*17+Math.sin(i*.23+j*.43)*13+Math.sin(i*.77+j)*3;i?x.lineTo(px,py):x.moveTo(px,py);}x.lineWidth=1+noise(j)*5;x.strokeStyle=kind==='color'?`rgba(60,64,55,${.02+noise(j+20)*.065})`:`rgba(30,30,30,${.03+noise(j)*.1})`;x.stroke();}
 for(let i=0;i<45000;i++){const px=noise(i+1)*1024,py=noise(i+571)*1536,r=.3+noise(i+139)*1.9;x.fillStyle=i%3?'rgba(248,244,223,.28)':'rgba(34,38,32,.30)';x.fillRect(px,py,r,r*.55);}
 for(let j=0;j<8;j++){x.beginPath();let px=noise(j+110)*1024,py=noise(j+440)*1536;x.moveTo(px,py);for(let i=0;i<14;i++){px+=(noise(i+j*7)-.4)*37;py+=14+noise(i+j)*22;x.lineTo(px,py);}x.strokeStyle=kind==='color'?'rgba(63,67,57,.25)':'rgba(0,0,0,.25)';x.lineWidth=1.3;x.stroke();}
 // Sparse recessed bronze channels laid across the unbroken shell.
 if(kind==='color'){for(const side of[-1,1]){x.strokeStyle='#666451';x.lineWidth=8;x.beginPath();x.moveTo(512+side*320,250);x.lineTo(512+side*320,520);x.lineTo(512+side*205,630);x.lineTo(512+side*205,1150);x.stroke();x.strokeStyle='#b8a77d';x.lineWidth=3;x.stroke();}}
 const t=new T.CanvasTexture(c);t.colorSpace=kind==='color'?T.SRGBColorSpace:T.NoColorSpace;t.anisotropy=4;return t;
}
