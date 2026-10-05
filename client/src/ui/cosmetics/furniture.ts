import * as T from 'three';
import type {AtelierTheme} from '../../shared/atelierThemes';
/** Replaceable outer casing. Card slots and the original contact plane stay fixed.
 * All dimensions here are in card widths, converted to the GLB's metre space. */
export function dressFurniture(model:T.Group,theme:AtelierTheme,shelf:boolean){
 const shell=new T.Group();shell.name='atelier-casing-'+theme.id;shell.scale.setScalar(.110);model.add(shell);
 shell.position.y=shelf?.027:0;
 const x=shelf?.75:.625,z=shelf?1.05:.92;
 const body=new T.MeshPhysicalMaterial({color:theme.body,metalness:.08,roughness:theme.surface==='leather'?.74:.3,clearcoat:theme.surface==='porcelain'||theme.surface==='lacquer'?.85:.25,clearcoatRoughness:.12});
 const metal=new T.MeshStandardMaterial({color:theme.metal,metalness:.84,roughness:.26});
 const inset=new T.MeshPhysicalMaterial({color:theme.accent,metalness:.2,roughness:.17,clearcoat:1,clearcoatRoughness:.09,transmission:theme.id==='tidal'?.28:theme.id==='amber'?.18:0,thickness:.06,ior:1.46,attenuationColor:new T.Color(theme.accent),attenuationDistance:.5,iridescence:theme.id==='porcelain'?.45:0});
 const plate=(points:number[][],height:number,mat:T.Material,y=.08)=>{const shape=new T.Shape(points.map(p=>new T.Vector2(p[0],p[1]))),geo=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:true,bevelSize:.009,bevelThickness:.006,bevelSegments:2,steps:1,curveSegments:8});geo.rotateX(-Math.PI/2);const mesh=new T.Mesh(geo,mat);mesh.position.y=y;mesh.castShadow=true;mesh.receiveShadow=true;shell.add(mesh);return mesh;};
 const rail=(points:T.Vector3[],radius:number,mat:T.Material)=>{const mesh=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),32,radius,6,false),mat);mesh.castShadow=true;mesh.receiveShadow=true;shell.add(mesh);};
 for(const side of [-1,1]){
  if(theme.id==='tidal'){
   for(const offset of [0,.045])rail(Array.from({length:13},(_,i)=>{const p=i/12;return new T.Vector3(side*(x+offset+.027*Math.sin(p*Math.PI*3)),.10+.018*Math.sin(p*Math.PI*2),-z+p*z*2);}),offset? .013:.025,offset?metal:inset);
  }else if(theme.id==='porcelain'){
   for(const k of [-1,0,1]){const points=Array.from({length:20},(_,i)=>{const a=i/20*Math.PI*2;return[side*x+.075*Math.cos(a)*Math.sin(a*.5),k*.48+.30*Math.sin(a)];});plate(points,.028,body,.10);}
   rail([new T.Vector3(side*x,.15,-z),new T.Vector3(side*(x-.025),.12,0),new T.Vector3(side*x,.15,z)],.011,metal);
  }else if(theme.id==='garnet'){
   for(let i=0;i<3;i++){const a=-.72+i*.46;plate([[side*(x-.04),a],[side*(x+.085),a-.13],[side*(x+.06),a+.29],[side*(x-.045),a+.49]],.025,i===1?metal:body,.09+i*.004);}
  }else if(theme.id==='verdigris'){
   rail([new T.Vector3(side*x,.13,-z),new T.Vector3(side*(x+.035),.14,0),new T.Vector3(side*x,.13,z)],.024,body);
   for(let i=0;i<5;i++){const a=-.7+i*.32;plate([[side*x,a-.12],[side*(x+.075),a],[side*x,a+.16],[side*(x-.033),a]],.014,metal,.135);}
  }else if(theme.id==='amber'){
   for(const end of [-1,1])plate([[side*(x-.04),end*(z-.23)],[side*(x+.065),end*(z-.20)],[side*(x+.065),end*z],[side*(x-.08),end*z]],.045,inset,.11);
   rail([new T.Vector3(side*x,.105,-z),new T.Vector3(side*x,.105,z)],.018,metal);
  }else if(theme.id==='nocturne'){
   plate([[side*(x-.025),-z],[side*(x+.035),-z+.10],[side*(x+.035),z-.1],[side*(x-.025),z]],.015,metal,.095);
   for(const end of [-1,1])plate([[side*(x-.09),end*z],[side*(x+.075),end*z],[side*(x+.075),end*(z-.18)]],.035,body,.115);
  }else{
   for(let i=0;i<4;i++){const a=-z+i*z*.5;plate([[side*(x-.03),a+.02],[side*(x+.065),a+.065],[side*(x+.045),a+z*.46],[side*(x-.045),a+z*.48]],.028,body,.095);}
   const vein=theme.id==='silverflow'?metal:inset;
   rail(Array.from({length:9},(_,i)=>new T.Vector3(side*(x+.014*Math.sin(i*2.3)),.139,-z+.03+i*(z*2-.06)/8)),.012,vein);
  }
 }
 // Short end caps are visible even with a full stack and on the occupied shelf.
 if(!['tidal','porcelain','garnet'].includes(theme.id))for(const end of [-1,1]){const w=.16;plate([[-w,end*z],[0,end*(z+.045)],[w,end*z],[w*.7,end*(z-.065)],[-w*.7,end*(z-.065)]],.02,metal,.09);}
}
