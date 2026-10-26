import * as T from 'three';
export const SIZE=768;
export type P={x:number;y:number};
export const random=(v:number)=>{const x=Math.sin(v*127.1+41.7)*43758.5453;return x-Math.floor(x);};
export const smooth=(a:number,b:number,t:number)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};
function half(poly:P[],a:P,b:P){const nx=b.x-a.x,ny=b.y-a.y,k=(b.x*b.x+b.y*b.y-a.x*a.x-a.y*a.y)/2,out:P[]=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],d=p.x*nx+p.y*ny-k,e=q.x*nx+q.y*ny-k;if(d<=0)out.push(p);if((d<=0)!==(e<=0)){const f=d/(d-e);out.push({x:p.x+(q.x-p.x)*f,y:p.y+(q.y-p.y)*f});}}return out;}
function perimeter(poly:P[]):P[]{const out:P[]=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],flip=a.x<b.x||a.x===b.x&&a.y<b.y,p=flip?a:b,q=flip?b:a,dx=q.x-p.x,dy=q.y-p.y,length=Math.hypot(dx,dy)||1,n=(random(p.x*.017+p.y*.031+q.x*.051+q.y*.013)-.5)*Math.min(13,length*.16);out.push(a,{x:(a.x+b.x)/2-dy/length*n,y:(a.y+b.y)/2+dx/length*n});}return out;}
function inside(p:P,poly:P[]){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}
export interface Fragment{node:T.Group;center:T.Vector3;poly:P[];seed:number;depth:number;leak:T.Vector3|null;front:T.MeshStandardMaterial;back:T.MeshStandardMaterial;edge:T.MeshStandardMaterial}
export interface FragmentSet{pieces:Fragment[];cracks:HTMLCanvasElement;dispose():void}
/** Textured faces plus real side walls clipped to the native artwork's alpha silhouette. */
export function fractureSurface(source:HTMLCanvasElement,texture:T.Texture):FragmentSet{
 const src=source.getContext('2d')!.getImageData(0,0,SIZE,SIZE).data;
 const alpha=(x:number,y:number)=>x<0||y<0||x>=SIZE||y>=SIZE?0:src[(Math.floor(y)*SIZE+Math.floor(x))*4+3];
 const sites:P[]=[{x:SIZE*.48,y:SIZE*.43}];for(let i=1;i<64;i++){let best={x:0,y:0},score=-1;for(let j=0;j<9;j++){const p={x:random(i*71+j*7)*SIZE,y:random(i*71+j*7+2)*SIZE},s=Math.min(...sites.map(q=>Math.hypot(p.x-q.x,p.y-q.y)));if(s>score){score=s;best=p;}}sites.push(best);}
 // The native alpha boundary also gets side walls; no rectangular invisible backing slab.
 const silhouette:[P,P][]=[];const step=4;for(let y=0;y<SIZE;y+=step)for(let x=0;x<SIZE;x+=step){if(alpha(x+2,y+2)<90)continue;if(alpha(x-2,y+2)<90)silhouette.push([{x,y},{x,y:y+step}]);if(alpha(x+6,y+2)<90)silhouette.push([{x:x+step,y:y+step},{x:x+step,y}]);if(alpha(x+2,y-2)<90)silhouette.push([{x:x+step,y},{x,y}]);if(alpha(x+2,y+6)<90)silhouette.push([{x,y:y+step},{x:x+step,y:y+step}]);}
 const cracks=document.createElement('canvas');cracks.width=cracks.height=SIZE;const cc=cracks.getContext('2d')!;
 const pieces:Fragment[]=[];
 for(const [i,site] of sites.entries()){
  let poly:P[]=[{x:0,y:0},{x:SIZE,y:0},{x:SIZE,y:SIZE},{x:0,y:SIZE}];for(const other of sites)if(other!==site&&poly.length)poly=half(poly,site,other);if(poly.length<3)continue;poly=perimeter(poly);
  let area=0;for(let y=Math.floor(Math.min(...poly.map(p=>p.y)));y<Math.max(...poly.map(p=>p.y));y+=5)for(let x=Math.floor(Math.min(...poly.map(p=>p.x)));x<Math.max(...poly.map(p=>p.x));x+=5)if(alpha(x,y)>90&&inside({x,y},poly))area++;if(area<3)continue;
  const center=new T.Vector3(poly.reduce((v,p)=>v+p.x/SIZE-.5,0)/poly.length,poly.reduce((v,p)=>v+.5-p.y/SIZE,0)/poly.length,0),seed=random(i+19),depth=.014+seed*.022;
  const shape=new T.Shape();poly.forEach((p,j)=>{const x=p.x/SIZE-.5-center.x,y=.5-p.y/SIZE-center.y;j?shape.lineTo(x,y):shape.moveTo(x,y);});shape.closePath();
  const faceGeo=new T.ShapeGeometry(shape),uv=faceGeo.getAttribute('uv'),pos=faceGeo.getAttribute('position');for(let j=0;j<uv.count;j++)uv.setXY(j,pos.getX(j)+center.x+.5,pos.getY(j)+center.y+.5);
  const front=new T.MeshStandardMaterial({map:texture,metalness:.045,roughness:.48,envMapIntensity:.12,emissive:0xffffff,emissiveMap:texture,emissiveIntensity:.55,alphaTest:.08,side:T.FrontSide});
  // Preserve the painted face's exposure while physical cut edges carry strong reflections.
  front.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight=diffuseColor.rgb*(.72+.28*max(0.,dot(normal,normalize(vec3(-.3,.7,1.)))))+min(totalSpecular,vec3(.22))*.18;\n#include <opaque_fragment>');};
  const back=new T.MeshStandardMaterial({map:texture,color:0x16354d,metalness:.55,roughness:.29,alphaTest:.08,side:T.BackSide});
  const edge=new T.MeshStandardMaterial({color:0x6c777e,metalness:.82,roughness:.24,side:T.DoubleSide});
  const node=new T.Group();node.position.copy(center);const frontMesh=new T.Mesh(faceGeo,front),backMesh=new T.Mesh(faceGeo,back);backMesh.position.z=-depth;node.add(frontMesh,backMesh);
  const walls:number[]=[],normals:number[]=[];
  const wall=(a:P,b:P)=>{const ax=a.x/SIZE-.5-center.x,ay=.5-a.y/SIZE-center.y,bx=b.x/SIZE-.5-center.x,by=.5-b.y/SIZE-center.y,dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy)||1;walls.push(ax,ay,0,bx,by,0,ax,ay,-depth,bx,by,0,bx,by,-depth,ax,ay,-depth);for(let n=0;n<6;n++)normals.push(-dy/len,dx/len,0);};
  for(let j=0;j<poly.length;j++){const a=poly[j],b=poly[(j+1)%poly.length],steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/4);for(let k=0;k<steps;k++){const x=a.x+(b.x-a.x)*(k+.5)/steps,y=a.y+(b.y-a.y)*(k+.5)/steps;if(alpha(x,y)<90)continue;wall({x:a.x+(b.x-a.x)*k/steps,y:a.y+(b.y-a.y)*k/steps},{x:a.x+(b.x-a.x)*(k+1)/steps,y:a.y+(b.y-a.y)*(k+1)/steps});}}
  for(const [a,b] of silhouette)if(inside({x:(a.x+b.x)/2,y:(a.y+b.y)/2},poly))wall(a,b);
  const wallGeo=new T.BufferGeometry();wallGeo.setAttribute('position',new T.Float32BufferAttribute(walls,3));wallGeo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));node.add(new T.Mesh(wallGeo,edge));
  const leak=poly.find((p,j)=>j%2===1&&alpha(p.x,p.y)>160);
  pieces.push({node,center,poly,seed,depth,front,back,edge,leak:leak?new T.Vector3(leak.x/SIZE-.5-center.x,.5-leak.y/SIZE-center.y,.008):null});
  cc.beginPath();poly.forEach((p,j)=>j?cc.lineTo(p.x,p.y):cc.moveTo(p.x,p.y));cc.closePath();for(const [width,gray] of [[11,25],[7,68],[4,140],[1.4,255]]){cc.strokeStyle=`rgb(${gray},${gray},${gray})`;cc.lineWidth=width;cc.stroke();}
 }
 cc.globalCompositeOperation='destination-in';cc.drawImage(source,0,0);
 return {pieces,cracks,dispose(){for(const p of pieces){p.node.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});p.front.dispose();p.back.dispose();p.edge.dispose();}cracks.width=cracks.height=1;}};
}
