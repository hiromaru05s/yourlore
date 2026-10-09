import * as T from 'three';
import {ease,CONTACT,type RichId} from './richCatalog';
const TAU=Math.PI*2,NX=12,NY=40;
const palette:Record<RichId,[string,string,string]>={ELF:['#31562d','#789348','#55452f'],DARK_ELF:['#302a3b','#77707c','#403438'],HIGH_ELF:['#728b75','#b7c6a1','#797567'],ELDER_ELF_KING:['#43502c','#a29b53','#514330'],WORLD_TREE:['#3d502d','#83934d','#534132']};
function rand(seed:number){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function texture(id:RichId,bark=false){const c=document.createElement('canvas');c.width=512;c.height=1024;const x=c.getContext('2d')!,r=rand(74),p=palette[id];x.fillStyle=bark?p[2]:p[0];x.fillRect(0,0,512,1024);
 for(let i=0;i<18000;i++){const xx=r()*512,yy=r()*1024;x.fillStyle=`rgba(${r()>.5?'219,225,171':'9,19,14'},${.015+r()*.07})`;x.fillRect(xx,yy,bark?1+r()*3:1+r()*6,bark?15+r()*52:1+r()*5);}
 x.lineCap='round';if(bark){for(let j=0;j<70;j++){const xx=j*8;x.strokeStyle=j%3?'#252b2080':'#a3946755';x.lineWidth=.7+r()*2;x.beginPath();x.moveTo(xx,0);for(let y=0;y<=1024;y+=16)x.lineTo(xx+Math.sin(y*.008+j)*7+Math.sin(y*.04+j)*2,y);x.stroke();}}
 else{const vein=(pts:number[],width:number,alpha:number)=>{x.beginPath();x.moveTo(pts[0],pts[1]);x.bezierCurveTo(...pts.slice(2) as [number,number,number,number,number,number]);x.strokeStyle=p[1];x.globalAlpha=alpha;x.lineWidth=width;x.stroke();};for(let j=0;j<19;j++)for(const s of [-1,1]){const y=55+j*52+r()*14;vein([256,y,256+s*55,y-12,256+s*140,y-54,256+s*252,y-104],1.4,.37);for(let k=1;k<6;k++){const xx=256+s*k*39,yy=y-k*16;vein([xx,yy,xx+s*12,yy-8,xx+s*20,yy-29,xx+s*28,yy-42],.6,.24);}}vein([256,1024,249,740,262,310,256,0],3,.5);}
 x.globalAlpha=1;const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t;}
type Surface={mesh:T.Mesh<T.BufferGeometry,T.MeshPhysicalMaterial>;geo:T.BufferGeometry};
/** Four material mechanisms. Every surface remains the same object across release and contact. */
export class OrganicStudies{
 readonly group=new T.Group();private leaves:Surface[]=[];private tubes:Surface[]=[];private mats=new Map<string,T.MeshPhysicalMaterial>();private used=0;private tubeUsed=0;private id:RichId='ELF';private placeholder=new T.MeshPhysicalMaterial();
 constructor(){for(let j=0;j<112;j++){const geo=new T.PlaneGeometry(1,1,NX,NY);const mesh=new T.Mesh(geo,this.placeholder);mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;this.leaves.push({mesh,geo});this.group.add(mesh);}for(let j=0;j<48;j++){const geo=new T.PlaneGeometry(1,1,6,40),mesh=new T.Mesh(geo,this.placeholder);mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;this.tubes.push({geo,mesh});this.group.add(mesh);}}
 private mat(bark=false){const key=this.id+String(bark);let m=this.mats.get(key);if(!m){const map=texture(this.id,bark),bump=map.clone();bump.colorSpace=T.NoColorSpace;bump.needsUpdate=true;m=new T.MeshPhysicalMaterial({map,bumpMap:bump,bumpScale:bark?.65:.12,roughness:bark?.94:this.id==='HIGH_ELF'?.56:.72,clearcoat:bark?0:.08,clearcoatRoughness:.65,side:T.DoubleSide});this.mats.set(key,m);}return m;}
 private sheet(fn:(u:number,t:number)=>[number,number,number],bark=false){const item=this.leaves[this.used++];if(!item)return;item.mesh.visible=true;item.mesh.material=this.mat(bark);const a=item.geo.attributes.position;for(let y=0;y<=NY;y++)for(let x=0;x<=NX;x++){const p=fn(x/NX*2-1,y/NY);a.setXYZ(y*(NX+1)+x,...p);}a.needsUpdate=true;item.geo.computeVertexNormals();}
 private tube(fn:(t:number)=>[number,number,number],radius:number){if(radius<.03)return;const item=this.tubes[this.tubeUsed++];if(!item)return;item.mesh.visible=true;item.mesh.material=this.mat(true);const a=item.geo.attributes.position;for(let y=0;y<=40;y++){const t=y/40,p=fn(t),next=fn(Math.min(1,t+.002)),prev=fn(Math.max(0,t-.002)),dx=next[0]-prev[0],dy=next[1]-prev[1],d=Math.hypot(dx,dy)||1;for(let x=0;x<=6;x++){const angle=x/6*TAU,r=radius*Math.pow(1-t,.65)+.12;a.setXYZ(y*7+x,p[0]-dy/d*Math.cos(angle)*r,p[1]+dx/d*Math.cos(angle)*r,p[2]+Math.sin(angle)*r);}}a.needsUpdate=true;item.geo.computeVertexNormals();}
 private leaf(root:[number,number,number],angle:number,length:number,width:number,bend:number,seed:number,life=1){const dark=this.id==='DARK_ELF',king=this.id==='ELDER_ELF_KING',high=this.id==='HIGH_ELF';this.sheet((u,t)=>{const a=bend*t,l=length*life,along=Math.abs(bend)>.01?Math.sin(a)/bend*l:t*l,up=Math.abs(bend)>.01?(1-Math.cos(a))/bend*l:0;const profile=Math.pow(Math.sin(Math.PI*t),dark?.9:.7)*(king?1+.13*Math.sin(t*29):1+.025*Math.sin(t*97+seed));const across=u*width*life*profile*(1+.065*u*Math.sin(t*7+seed))*(high?.83:1);return[root[0]+Math.sin(angle)*along+Math.cos(angle)*across,root[1]+Math.cos(angle)*along-Math.sin(angle)*across,root[2]+up+Math.abs(u)**1.5*width*.14*profile*life+Math.sin(t*47+seed)*Math.abs(u)*.3];});}
 draw(id:RichId,v:number,ms:number,h:number){this.id=id;this.used=this.tubeUsed=0;this.leaves.forEach(l=>l.mesh.visible=false);this.tubes.forEach(l=>l.mesh.visible=false);this.group.visible=ms>0&&ms<3900;if(!this.group.visible)return;
  const grow=ease(40,480,ms),age=Math.max(0,ms-CONTACT),settle=ease(0,400,age),end=1-ease(2920,3850,ms),life=grow*end;
  if(v===0)this.laminar(ms,h,life,age);
  if(v===1)this.bark(ms,h,life,settle);
  if(v===2)this.fern(ms,h,life,age);
  if(v===3)this.roots(ms,h,life,age);
 }
 private laminar(ms:number,h:number,life:number,age:number){
  // Unequal lanceolate blades, bending progressively from their tips; broad axes never fan from a central point.
  for(let j=0;j<3;j++){const s=j===1?1:-1,oy=(j-1)*84,peel=ease(1000+j*125,1920+j*60,ms),slip=ease(1650,2390+j*20,ms),ripple=Math.sin(age*.018-j)*Math.exp(-age/170)*ease(0,70,age);const root:[number,number,number]=[s*(85+slip*39),oy,h*(1-slip)+4+j*1.7];const len=(j===1?207:194)*life*(1-slip*.63),width=(j===1?73:65)*life*(1-slip*.45);this.leaf(root,-s*Math.PI/2+s*peel*Math.PI,len,width,.12+peel*2.65-slip*2.25+ripple*.12,j+2);}
 }
 private bark(ms:number,h:number,life:number,settle:number){
  for(let j=0;j<5;j++){const s=j<2?-1:j>2?1:-1,peel=ease(1000+j*75,1920+j*35,ms),slip=ease(1650,2390,ms),x=(j-2)*39+s*slip*(112-Math.abs(j-2)*32);this.sheet((u,t)=>{const profile=.73+.27*Math.sin(t*Math.PI),w=(20+3*Math.sin(t*7+j)+1.3*Math.sin(t*47+j))*life*profile;const length=(261+j%3*9)*life*(1-slip*.63),y=(t-.5)*length+((j%3)-1)*64*slip+Math.sin(u*14+j)*2.1;const arch=Math.sin(t*Math.PI)*(9+peel*23)*(1-slip*.88);const twist=u*w*Math.sin(peel*1.9+s*t*.4);const roll=Math.max(0,t-.64)**2*peel*160*(1-slip*.5);return[x+u*w*(1-slip*.23)+Math.sin(t*6+j)*4,y,h*(1-slip)+4+j*.7+arch+twist*(1-slip)+Math.abs(u)*1.7+Math.sin(u*38+t*5+j)*.65+roll-settle*1.5];},true);}
 }
 private fern(ms:number,h:number,life:number,age:number){
  for(let j=0;j<4;j++){const s=j%2?1:-1,baseY=j<2?-122:119,peel=ease(950+j*105,1890+j*45,ms),slip=ease(1710,2410,ms),baseX=s*(77+slip*28),direction=j<2?1:-1,len=(j<2?215:184)*life;
   const spine=(t:number):[number,number,number]=>[baseX-s*Math.sin(Math.PI*t*.8)*46*(1-peel)+s*peel*t*36,baseY+direction*t*len,h*(1-slip)+4+Math.sin(t*Math.PI)*(15+peel*33)*(1-slip*.88)+Math.sin(t*9-age*.012)*Math.exp(-age/210)*ease(0,70,age)*2];this.tube(spine,1.6*life);
   for(let k=1;k<=11;k++){const t=k/12,p=spine(t),local=ease(0,1,peel*1.4-t*.3);for(const side of [-1,1]){const angle=side*Math.PI/2+direction*.5;this.leaf(p,angle,(30+17*Math.sin(t*Math.PI))*(1-t*.36)*life,7*(1-t*.5),.1+(1-local)*1.6,k+j*17,1);}}
  }
 }
 private roots(ms:number,h:number,life:number,age:number){
  const heavy=this.id==='WORLD_TREE'||this.id==='ELDER_ELF_KING',slip=ease(1640,2360,ms);
  for(let j=0;j<6;j++){const s=j%2?1:-1,yy=(Math.floor(j/2)-1)*97+(j%2?23:-13),peel=ease(1000+j*67,1860+j*30,ms),reach=(175-peel*114)*life;
   const path=(t:number):[number,number,number]=>[s*(94+slip*10)-s*t*reach*(1-peel*1.75)+Math.sin(t*11+j)*3*life,yy+Math.sin(t*4.5+j)*29*life+(j%2?1:-1)*t*t*37*life,h*(1-slip)+4+Math.sin(t*Math.PI)*(10+peel*27)*(1-slip*.8)+Math.sin(t*9-age*.017)*ease(0,50,age)*Math.exp(-age/180)*2];this.tube(path,(heavy?5.4:3.4)*life);
   for(let k=1;k<=3;k++){const t=k/4,p=path(t);const branch=(u:number):[number,number,number]=>[p[0]-s*u*29*life+Math.sin(u*3)*4*life,p[1]+(k%2?1:-1)*u*31*life,p[2]+Math.sin(u*Math.PI)*3*life];this.tube(branch,(heavy?1.6:1)*life);if(k!==2)this.leaf(p,s*Math.PI/2+(k%2?-.7:.7),35*life,13*life,.24+peel*.7,j+k);}
  }
 }
 dispose(){this.leaves.forEach(x=>x.geo.dispose());this.tubes.forEach(x=>x.geo.dispose());this.placeholder.dispose();this.mats.forEach(m=>{m.map?.dispose();m.bumpMap?.dispose();m.dispose();});}
}
