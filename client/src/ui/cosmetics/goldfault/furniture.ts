import * as T from 'three';
interface Sculpture {group:T.Group;tick:(t:number,activity?:number)=>void;dispose:()=>void;}

type Point = [number, number];
/** Cut stone, recessed molten-gold joints and a chased metal binding.
 * All animation belongs to the inlay material; the card contact plane stays fixed. */
export function goldfaultFurniture(grave:boolean):Sculpture {
 const group=new T.Group();group.name=grave?'goldfault-grave':'goldfault-deck';
 const clock={value:0},materials=new Set<T.Material>(),geometries=new Set<T.BufferGeometry>();
 const w=grave?1.43:1.26,h=grave?1.97:1.88,iw=w-.25,ih=h-.27;
 const own=<M extends T.Material>(m:M):M=>{materials.add(m);return m;};
 const stone=own(new T.MeshPhysicalMaterial({color:'#09111e',metalness:.18,roughness:.25,clearcoat:.65,clearcoatRoughness:.18}));
 const shadow=own(new T.MeshStandardMaterial({color:'#050a12',roughness:.52,metalness:.15}));
 const bronze=own(new T.MeshStandardMaterial({color:'#6d4925',metalness:.85,roughness:.34}));
 const gold=own(new T.MeshStandardMaterial({color:'#b58946',metalness:.84,roughness:.28}));
 const fine=own(new T.MeshStandardMaterial({color:'#e4c787',metalness:.78,roughness:.25}));
 const liquid=own(new T.MeshStandardMaterial({color:'#c99a50',metalness:.72,roughness:.22,emissive:'#ba6e17',emissiveIntensity:.08}));
 // The moving highlight is confined to the actual, continuous gold channel.
 liquid.onBeforeCompile=s=>{
  s.uniforms.goldfaultTime=clock;
  s.vertexShader='varying vec3 stonePosition;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nstonePosition=position;');
  s.fragmentShader='uniform float goldfaultTime;varying vec3 stonePosition;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   float phase=stonePosition.z*.63+stonePosition.x*.19-goldfaultTime/12.;
   float flow=pow(.5+.5*cos(6.283185*phase),24.);
   totalEmissiveRadiance+=vec3(.65,.31,.065)*flow*.48;`);
 };
 liquid.customProgramCacheKey=()=> 'goldfault-furniture-inlay-r2';
 function mesh(geometry:T.BufferGeometry,material:T.Material|T.Material[]) {
  // Fine inlays use their physical relief instead of coarse board-scale
  // self shadows. The whole object still casts its contact shadow.
  geometries.add(geometry);const m=new T.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=false;group.add(m);return m;
 }
 function outline(width:number,height:number,cut:number):Point[]{const x=width/2,z=height/2;return[[-x+cut,-z],[x-cut,-z],[x,-z+cut],[x,z-cut],[x-cut,z],[-x+cut,z],[-x,z-cut],[-x,-z+cut]];}
 function shape(points:Point[]){return new T.Shape(points.map(([x,z])=>new T.Vector2(x,-z)));}
 function solid(points:Point[],base:number,depth:number,mat:T.Material|T.Material[],bevel=.003){
  const geo=new T.ExtrudeGeometry(shape(points),{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,steps:1,curveSegments:1});geo.rotateX(-Math.PI/2);geo.translate(0,base,0);return mesh(geo,mat);
 }
 function band(outer:Point[],inner:Point[],base:number,depth:number,mat:T.Material,bevel=.002){
  const s=shape(outer);s.holes.push(new T.Path(inner.map(([x,z])=>new T.Vector2(x,-z))));
  const geo=new T.ExtrudeGeometry(s,{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,steps:1,curveSegments:1});geo.rotateX(-Math.PI/2);geo.translate(0,base,0);return mesh(geo,mat);
 }
 function stroke(points:Point[],y:number,radius:number,mat:T.Material,closed=false){
  const p=closed?[...points,points[0]]:points;
  // Straight, angular cuts; no softened noodle-like veins.
  const path=new T.CurvePath<T.Vector3>();for(let i=1;i<p.length;i++)path.add(new T.LineCurve3(new T.Vector3(p[i-1][0],y,p[i-1][1]),new T.Vector3(p[i][0],y,p[i][1])));
  return mesh(new T.TubeGeometry(path,Math.max(2,p.length*3),radius,5,false),mat);
 }
 // Stepped, chamfered plinth. Gold is a thin binding, not a thick yellow slab.
 solid(outline(w,h,.12),.008,.027,shadow,.005);
 solid(outline(w-.015,h-.015,.115),.036,.008,bronze,.003);
 band(outline(w-.035,h-.035,.11),outline(iw+.012,ih+.012,.07),.046,.026,stone,.006);
 band(outline(w-.055,h-.055,.105),outline(w-.083,h-.083,.098),.073,.006,gold);
 band(outline(w-.095,h-.095,.094),outline(iw+.025,ih+.025,.075),.070,.020,stone,.004);
 stroke(outline(iw+.032,ih+.032,.075),.087,.0034,fine,true);
 // Solid recessed floor and fitted polygonal obsidian slabs. Their highest
 // points stay below .08 (the existing runtime card support plane).
 solid(outline(iw,ih,.07),.047,.016,bronze,.002);
 const pts:Record<string,Point>={A:[-.82,-1],B:[.82,-1],C:[1,-.82],D:[1,.82],E:[.82,1],F:[-.82,1],G:[-1,.82],H:[-1,-.82],L:[-1,-.18],R:[1,.24],P:[-.25,-.52],Q:[.43,-.30],U:[-.08,.03],S:[.39,.43],V:[-.37,.58],N:[.17,1]};
 const point=(key:string):Point=>[pts[key][0]*iw/2,pts[key][1]*ih/2];
 const cells=['ABQP','BCRQ','APLH','PQUVL','QRSU','RDENS','USNV','VNFGL'];
 const colors=['#1d2a3b','#101927','#080f1a','#172131','#0b1321','#1e2a3b','#111b2b','#0c1524'];
 cells.forEach((keys,i)=>{
  const polygon=[...keys].map(point),center=polygon.reduce((s,p)=>[s[0]+p[0]/polygon.length,s[1]+p[1]/polygon.length] as Point,[0,0] as Point);
  const inset=polygon.map(p=>{const dx=center[0]-p[0],dz=center[1]-p[1],len=Math.hypot(dx,dz);return[p[0]+dx/len*.005,p[1]+dz/len*.005] as Point;});
  const face=own(stone.clone());face.color.set(colors[i]);face.roughness=.24+i%3*.035;
  face.onBeforeCompile=s=>{
   s.uniforms.goldfaultTime=clock;
   s.vertexShader='varying vec3 facetPosition;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfacetPosition=position;');
   s.fragmentShader='varying vec3 facetPosition;uniform float goldfaultTime;\n'+s.fragmentShader;
   s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float slope=facetPosition.x*${(i%2?-.45:.4).toFixed(2)}+facetPosition.z*.25;
    diffuseColor.rgb*=.8+smoothstep(-.8,.8,slope)*.55;
    float sheen=pow(max(0.,1.-abs(facetPosition.z*.7+facetPosition.x*.25-sin(goldfaultTime*.523599+${i.toFixed(1)})*.7)*2.),8.);
    diffuseColor.rgb+=vec3(.012,.018,.025)*sheen;
   `);
  };
  face.customProgramCacheKey=()=>`goldfault-facet-r2-${i}`;
  solid(inset,.065,.008,[face,stone],.0018);
 });
 // Shared boundaries only: every branch meets another joint or the inner rim.
 // Derive internal edges from the fitted cells to keep the gold/material join exact.
 const edgeCounts=new Map<string,{a:string;b:string;n:number}>();
 for(const keys of cells)for(let i=0;i<keys.length;i++){const a=keys[i],b=keys[(i+1)%keys.length],id=[a,b].sort().join('');const e=edgeCounts.get(id);if(e)e.n++;else edgeCounts.set(id,{a,b,n:1});}
 for(const {a,b,n} of edgeCounts.values())if(n===2)stroke([point(a),point(b)],.073,.004,liquid);
 // Chased line-work is cut into the frame; scale is large enough to survive a
 // normal board view and finer strokes become visible when inspecting it.
 for(const side of [-1,1]){
  const x=side*(w/2-.081);
  stroke([[x,-h/2+.18],[x,h/2-.18]],.092,.0022,gold);
  for(let j=0;j<25;j++){const z=-h/2+.20+j*(h-.40)/24;stroke([[x-side*.018,z-.010],[x+side*.018,z+.010]],.092,.0012,bronze);}
 }
 // Four beveled corner clasps replace twelve identical pebble blocks.
 for(const sx of [-1,1])for(const sz of [-1,1]){
  const x=w/2,z=h/2;
  const clasp:Point[]=[[x-.20,z-.025],[x-.11,z-.025],[x-.025,z-.11],[x-.025,z-.23],[x-.082,z-.23],[x-.082,z-.14],[x-.14,z-.082],[x-.20,z-.082]].map(([a,b])=>[a*sx,b*sz]);
  solid(clasp,.084,.020,bronze,.003);
  stroke([[sx*(x-.18),sz*(z-.049)],[sx*(x-.12),sz*(z-.049)],[sx*(x-.049),sz*(z-.12)],[sx*(x-.049),sz*(z-.20)]],.108,.0035,fine);
 }
 // Paired small cut-stone seals continue the sleeve's angular vocabulary.
 for(const end of [-1,1]){
  const z=end*(h/2-.077),diamond:Point[]=[[-.082,z],[0,z-.030],[.082,z],[0,z+.030]];
  solid(diamond,.089,.008,gold,.0015);
  solid(diamond.map(([x,p])=>[x*.72,z+(p-z)*.63] as Point),.099,.006,stone,.001);
  for(const side of [-1,1])stroke([[side*.11,z],[side*(w/2-.24),z]],.093,.0025,gold);
 }
 // Inset center is deliberately fixed; the molten seam and the narrow stone
 // reflection travel together without shifting the resting cards or emitting particles.
 group.userData.contactHeight=.077;
 return {group,tick(t){clock.value=t;},dispose(){group.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
