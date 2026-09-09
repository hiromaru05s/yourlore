import * as T from 'three';
import { CARD_PADDING, type CardSurface } from './cardSurface';

const clamp = (v:number) => Math.max(0,Math.min(1,v));
const smooth = (a:number,b:number,t:number) => { const s=clamp((t-a)/(b-a)); return s*s*(3-2*s); };

/** One shared motion vocabulary: peel, carry, settle. Curvature is radians per
 * card width; circular bending preserves paper length instead of stretching it. */
export function drawPose(t:number, reveal:boolean) {
  t=clamp(t);
  const carry=smooth(.08,.88,t), peel=Math.sin(Math.PI*smooth(0,.62,t));
  const settle=t>.72 ? Math.sin((t-.72)/.28*Math.PI*2)*Math.pow(1-smooth(.72,1,t),2) : 0;
  return {
    travel:carry,
    lift:Math.sin(Math.PI*smooth(0,1,t)),
    bend:.56*peel + .12*settle,
    twist:.11*Math.sin(Math.PI*t)*Math.sin(Math.PI*2*t),
    rx:-.27*Math.sin(Math.PI*t),
    ry:reveal ? Math.PI*(1-smooth(.12,.78,t)) : Math.PI,
    rz:-.14*Math.sin(Math.PI*t)+.035*settle,
  };
}

export function bendPoint(x:number,y:number,z:number,curvature:number,twist:number): [number,number,number] {
  const pivot=.3, d=y-pivot, theta=curvature*d;
  const by=Math.abs(curvature)<1e-6 ? y : pivot+Math.sin(theta)/curvature;
  const bz=Math.abs(curvature)<1e-6 ? 0 : (1-Math.cos(theta))/curvature;
  const angle=twist*y;
  return [x*Math.cos(angle)+z*Math.sin(angle),by-z*Math.sin(theta),bz-x*Math.sin(angle)+z*Math.cos(angle)*Math.cos(theta)];
}

/** Reusable card, with independent front/back, paper edge and a subdivided
 * surface. Geometry is generated here; no Blender file or per-card model. */
export class PaperCard {
  readonly group=new T.Group();
  private parts: { mesh:T.Mesh; rest:Float32Array }[]=[];
  private textures:T.Texture[]=[];
  constructor(surface:CardSurface, ratio:number) {
    const texture=(source:HTMLCanvasElement) => {
      const map=new T.CanvasTexture(source);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;
      this.textures.push(map);return map;
    };
    const pw=1+CARD_PADDING*2, ph=ratio+CARD_PADDING*2;
    const add=(geometry:T.BufferGeometry, material:T.Material) => {
      (geometry.getAttribute('position') as T.BufferAttribute).setUsage(T.DynamicDrawUsage);
      const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;
      this.parts.push({mesh,rest:new Float32Array(geometry.getAttribute('position').array)});this.group.add(mesh);return mesh;
    };
    const mat=(map:T.Texture,side:T.Side) => new T.MeshBasicMaterial({map,side,transparent:true,alphaTest:.025,toneMapped:false});
    const front=new T.PlaneGeometry(pw,ph,24,40);front.translate(0,0,.0075);
    add(front,mat(texture(surface.face ?? surface.back),T.FrontSide));
    const back=new T.PlaneGeometry(pw,ph,24,40);back.translate(0,0,-.0075);
    // Looking at the reverse must not mirror sleeve lettering.
    const uv=back.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i));
    add(back,mat(texture(surface.back),T.BackSide));
    // Thin rounded stock, inset beneath the ornamental frame. Faces are drawn
    // separately; only the exposed paper edge is geometry here.
    const outline:T.Vector2[]=[];
    const radius=.045, hw=.475, hh=ratio/2-.045;
    for(let corner=0;corner<4;corner++){
      const cx=corner===0||corner===3?hw-radius:-hw+radius;
      const cy=corner<2?hh-radius:-hh+radius;
      for(let i=0;i<=16;i++){
        const a=(corner*90+i*90/16)*Math.PI/180;
        outline.push(new T.Vector2(cx+Math.cos(a)*radius,cy+Math.sin(a)*radius));
      }
    }
    const vertices:number[]=[],indices:number[]=[];
    // Subdivide straight edge spans as well, so the edge follows the surface bend.
    const perimeter:T.Vector2[]=[];
    outline.forEach((p,i)=>{const q=outline[(i+1)%outline.length],steps=Math.max(1,Math.ceil(p.distanceTo(q)/.04));for(let j=0;j<steps;j++)perimeter.push(p.clone().lerp(q,j/steps));});
    perimeter.forEach(p=>vertices.push(p.x,p.y,-.0075,p.x,p.y,.0075));
    for(let i=0;i<perimeter.length;i++){const a=i*2,b=((i+1)%perimeter.length)*2;indices.push(a,b,a+1,b,b+1,a+1);}
    const edge=new T.BufferGeometry();edge.setAttribute('position',new T.Float32BufferAttribute(vertices,3));edge.setIndex(indices);edge.computeVertexNormals();
    add(edge,new T.MeshStandardMaterial({color:0xd3c5a7,roughness:.85,side:T.DoubleSide}));
    this.group.name='paper-card';
  }
  deform(curvature:number,twist:number):void {
    this.deformWith((x,y,z)=>bendPoint(x,y,z,curvature,twist));
  }
  deformWith(map:(x:number,y:number,z:number)=>[number,number,number]):void {
    for(const {mesh,rest} of this.parts){
      const p=mesh.geometry.getAttribute('position');
      for(let i=0;i<p.count;i++)p.setXYZ(i,...map(rest[i*3],rest[i*3+1],rest[i*3+2]));
      p.needsUpdate=true;mesh.geometry.computeVertexNormals();
    }
  }
  dispose():void {
    this.parts.forEach(({mesh})=>{mesh.geometry.dispose();(mesh.material as T.Material).dispose();});
    this.textures.forEach(t=>t.dispose());this.group.removeFromParent();
  }
}
