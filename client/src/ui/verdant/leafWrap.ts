import * as T from 'three';
import {ease,type RichId} from './richCatalog';
const U=24,V=56;
const colors:Record<RichId,[number,number,number]>={ELF:[52,91,28],DARK_ELF:[43,35,49],HIGH_ELF:[107,133,107],ELDER_ELF_KING:[75,89,31],WORLD_TREE:[39,73,27]};
function random(seed:number){let n=seed;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};}
/** A branching vascular network, cuticle variation and a distinct paler underside. */
function leafMaterial(id:RichId,back:boolean){
 const size=768,c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d')!,rand=random(371+id.length),rgb=colors[id],im=x.createImageData(size,size);
 for(let y=0;y<size;y++)for(let xx=0;xx<size;xx++){const u=xx/size,v=y/size,i=(y*size+xx)*4;const mottling=Math.sin(xx*.046+Math.sin(y*.017)*2)*2+Math.sin(y*.039+xx*.02)*2+(rand()-.5)*6,center=Math.exp(-Math.abs(u-.5)*16)*7,edge=-Math.abs(u-.5)*11;for(let k=0;k<3;k++)im.data[i+k]=rgb[k]+mottling+center+edge+(back?(k===2?19:24):0)+Math.sin(v*6)*3;im.data[i+3]=255;}x.putImageData(im,0,0);
 const vein=(points:number[],width:number,alpha:number)=>{x.beginPath();x.moveTo(points[0],points[1]);x.bezierCurveTo(...points.slice(2) as [number,number,number,number,number,number]);x.strokeStyle=`rgba(191,187,104,${alpha})`;x.lineWidth=width;x.stroke();};x.lineCap='round';
 // Veins branch toward the leaf tip; spacing and paired attachment are deliberately unequal.
 for(let j=1;j<15;j++)for(const s of [-1,1]){const yy=48+j*45+(rand()-.5)*17,span=305+rand()*48,end=yy-65-rand()*45;vein([384,yy,384+s*80,yy-7,384+s*230,end+20,384+s*span,end],2.3,.25);for(let k=1;k<7;k++){const t=k/7,bx=384+s*span*t,by=yy+(end-yy)*t;vein([bx,by,bx+s*18,by-11,bx+s*35,by-28,bx+s*48,by-46],.65,.23);vein([bx,by,bx+s*15,by+6,bx+s*37,by+7,bx+s*53,by+4],.5,.12);}}
 vein([384,768,377,540,392,210,384,0],3.4,.32);vein([381,768,375,540,389,210,381,0],1.2,.34);
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
 const bump=map.clone();bump.colorSpace=T.NoColorSpace;bump.needsUpdate=true;
 return new T.MeshPhysicalMaterial({map,bumpMap:bump,bumpScale:back?.055:.035,roughness:back?.83:id==='HIGH_ELF'?.5:.65,metalness:0,clearcoat:back?.02:.13,clearcoatRoughness:.48,side:back?T.BackSide:T.FrontSide});
}
export class LeafWrap{
 readonly group=new T.Group();private placeholder=new T.MeshBasicMaterial();private materials=new Map<RichId,[T.MeshPhysicalMaterial,T.MeshPhysicalMaterial]>();
 private leaves:Array<{geo:T.BufferGeometry;front:T.Mesh;back:T.Mesh}>=[];
 constructor(){
  for(let j=0;j<6;j++){const geo=new T.BufferGeometry(),pos=new Float32Array((U+1)*(V+1)*3),uv=new Float32Array((U+1)*(V+1)*2),idx:number[]=[];
   for(let y=0;y<=V;y++)for(let x=0;x<=U;x++){const i=y*(U+1)+x;uv[i*2]=x/U;uv[i*2+1]=y/V;if(x<U&&y<V)idx.push(i,i+1,i+U+1,i+1,i+U+2,i+U+1);}
   if(j%2===0)for(let k=0;k<idx.length;k+=3)[idx[k+1],idx[k+2]]=[idx[k+2],idx[k+1]];
   geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('uv',new T.BufferAttribute(uv,2));geo.setIndex(idx);const front=new T.Mesh(geo,this.placeholder),back=new T.Mesh(geo,this.placeholder);front.frustumCulled=back.frustumCulled=false;front.castShadow=back.castShadow=true;front.receiveShadow=back.receiveShadow=true;this.group.add(front,back);this.leaves.push({geo,front,back});
  }
 }
 draw(id:RichId,ms:number,height:number){
  this.group.visible=ms>0&&ms<2220;if(!this.group.visible)return;
  let mats=this.materials.get(id);if(!mats){mats=[leafMaterial(id,false),leafMaterial(id,true)];this.materials.set(id,mats);}
  const dark=id==='DARK_ELF',king=id==='ELDER_ELF_KING',tree=id==='WORLD_TREE',high=id==='HIGH_ELF';
  this.leaves.forEach(({geo,front,back},j)=>{
   front.material=mats[0];back.material=mats[1];const s=j%2?1:-1,row=Math.floor(j/2),seed=j*.91;
   const emerge=ease(80+j*24,470+j*24,ms),open=ease(1030+j*58,1850+j*29,ms),retreat=1-ease(1870+j*25,2170+j*9,ms);
   // All six blades overlap the card before they unfold. No detached corner pinwheel.
   const len=(dark?190:king?206:tree?212:200)*(1+.045*Math.sin(seed*3))*emerge*retreat*(1-open*.22),rootX=s*99,rootY=(row-1)*99+(j%2?12:-7),a=geo.attributes.position.array as Float32Array;
   for(let iy=0;iy<=V;iy++)for(let ix=0;ix<=U;ix++){
    const u=ix/U*2-1,v=iy/V,index=(iy*(U+1)+ix)*3,profile=Math.pow(Math.sin(Math.PI*v),.64)*(1+.045*Math.sin(v*13+seed));
    const serration=dark?1+.085*Math.sin(v*80):king?1+.06*Math.cos(v*31):1+.012*Math.sin(v*105+seed);
    const width=(high?82:dark?82:king?96:tree?96:89)*profile*serration*(1+u*.065*Math.sin(seed+v*7));
    // Peel propagates tip-first along the midrib, then the thicker petiole follows.
    const peel=ease(0,1,open*(1.7+.6*v)-.13*(1-v));
    const theta=peel*(dark?2.25:2.04),d=v*len,bulge=Math.sin(v*Math.PI)*(12+(row===1?4:0));
    const cx=rootX-s*d*Math.cos(theta),cy=rootY+(v*v*(26*Math.sin(seed+1)-(row-1)*19))+peel*s*v*22;
    const rib=Math.exp(-Math.abs(u)*30)*.55*profile,pleat=Math.sin(v*87+Math.abs(u)*12)*.16*Math.abs(u)*profile;
    const z=height+4+j*.95+Math.sin(theta)*d+bulge*(1-peel*.3)+u*u*profile*5+rib+pleat;
    a[index]=cx+u*width*.07*Math.sin(v*8+seed);a[index+1]=cy+u*width*emerge*retreat;a[index+2]=z+Math.sin(u*2+v*5+seed)*.55*profile;
   }
   geo.attributes.position.needsUpdate=true;geo.computeVertexNormals();
  });
 }
 dispose(){this.placeholder.dispose();this.leaves.forEach(l=>l.geo.dispose());this.materials.forEach(ms=>ms.forEach(m=>{m.map?.dispose();m.bumpMap?.dispose();m.dispose();}));}
}
