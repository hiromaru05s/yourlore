import * as T from 'three';
export const bronze=new T.MeshStandardMaterial({color:0x926333,metalness:.78,roughness:.32});
export const gold=new T.MeshStandardMaterial({color:0xe2c386,metalness:.72,roughness:.24});
export const iron=new T.MeshStandardMaterial({color:0x344549,metalness:.7,roughness:.39});
export const enamel=new T.MeshStandardMaterial({color:0x277d75,metalness:.48,roughness:.28});
export const bone=new T.MeshStandardMaterial({color:0xebe0c5,metalness:.3,roughness:.32});
export const ember=new T.MeshBasicMaterial({color:0xffc37c});
export function mesh(g:T.BufferGeometry,m:T.Material,parent:T.Object3D,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
export function plate(points:number[][],depth:number,mat:T.Material,parent:T.Object3D){const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return mesh(new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:1.1,bevelThickness:.8,curveSegments:10}),mat,parent);}
export function tube(points:number[][],radius:number,mat:T.Material,parent:T.Object3D){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p as [number,number,number])));return mesh(new T.TubeGeometry(curve,Math.max(12,points.length*5),radius,7,false),mat,parent);}
export function horn(points:number[][],radius:number,mat:T.Material,parent:T.Object3D){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p as [number,number,number])));const g=new T.BufferGeometry(),pos:number[]=[],ind:number[]=[];const frames=curve.computeFrenetFrames(20,false);for(let j=0;j<=20;j++){const p=curve.getPoint(j/20),r=radius*Math.pow(1-j/20,.75)+.04;for(let k=0;k<8;k++){const a=k/8*Math.PI*2;const q=p.clone().addScaledVector(frames.normals[j],Math.cos(a)*r).addScaledVector(frames.binormals[j],Math.sin(a)*r);pos.push(q.x,q.y,q.z);if(j<20){const n=j*8+k,m=j*8+(k+1)%8;ind.push(n,m,n+8,m,m+8,n+8);}}}g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(ind);g.computeVertexNormals();return mesh(g,mat,parent);}
/** Authored anatomical silhouette: brow, separate jaw, swept horns, eye sockets, teeth. */
export function dragonHead(){const root=new T.Group();const skull=mesh(new T.SphereGeometry(14,12,8),enamel,root,0,0,0);skull.scale.set(1,.8,.7);const snout=plate([[-10,-2],[-7,-26],[0,-31],[8,-26],[10,-2]],9,enamel,root);snout.position.z=-3;
 plate([[-9,-8],[-8,-25],[0,-29],[8,-25],[9,-8]],3,iron,root).position.z=-9;
 for(const s of [-1,1]){horn([[s*9,4,1],[s*15,15,7],[s*20,25,13],[s*16,35,15]],5,bone,root);horn([[s*11,-1,-3],[s*23,6,0],[s*27,17,3]],3,bronze,root);
 const brow=mesh(new T.BoxGeometry(10,5,5),bronze,root,s*10,-7,7);brow.rotation.z=s*.34;
 const eye=mesh(new T.SphereGeometry(2,10,6),ember,root,s*10,-9,8);eye.scale.set(1.5,.55,.5);
 for(let j=0;j<4;j++)horn([[s*8,-10-j*4,-2],[s*7,-11-j*4,-7]],1.4,bone,root);}
 for(let j=0;j<4;j++){const scale=plate([[-4,0],[0,6],[4,0],[0,-7]],2,bronze,root);scale.position.set(0,8-j*7,10-j*.5);}
 return root;}
/** Finger bones with scalloped membrane, not a generic triangle or wing decal. */
export function wing(side:number){const root=new T.Group(),mem=new T.Shape();mem.moveTo(0,0);mem.bezierCurveTo(30,48,72,100,143,108);mem.bezierCurveTo(132,77,121,66,123,28);mem.quadraticCurveTo(92,60,84,-9);mem.quadraticCurveTo(57,22,47,-37);mem.quadraticCurveTo(24,-9,0,-56);mem.lineTo(0,0);
 const membrane=mesh(new T.ExtrudeGeometry(mem,{depth:1.2,bevelEnabled:true,bevelSize:.5,bevelThickness:.5,bevelSegments:1,curveSegments:20}),new T.MeshStandardMaterial({color:0x185b58,metalness:.35,roughness:.42,side:T.DoubleSide}),root);
 membrane.position.z=1;
 const ends=[[143,108],[123,28],[84,-9],[47,-37],[0,-56]];
 for(const [i,[x,y]]of ends.entries()){tube([[0,-4,4],[33,39,8],[x*.74,y*.76,6],[x,y,3]],i===0?3.2:1.45,i===0?bronze:gold,root);}
 tube([[0,0,5],[35,57,7],[82,90,5],[143,108,3]],3.2,bronze,root);
 for(let i=0;i<9;i++){const scale=plate([[-4,0],[0,7],[5,1],[0,-5]],1.3,i%2?bronze:enamel,root);scale.position.set(4+i*5,8+i*7,6);scale.rotation.z=-.5;}
 root.scale.x=side;return root;}
export function lance(){const root=new T.Group();tube([[0,-102,0],[0,64,0]],2.6,bronze,root);plate([[0,109],[-10,65],[0,72],[10,65]],4,bone,root);tube([[-16,61,1],[0,57,2],[16,61,1]],2,gold,root);for(let j=0;j<8;j++){const m=mesh(new T.TorusGeometry(3,.8,5,10),iron,root,0,-40+j*5,0);m.rotation.x=Math.PI/2;}return root;}
export function breastplate(){const root=new T.Group();plate([[-27,28],[-13,39],[0,28],[13,39],[27,28],[22,-16],[0,-35],[-22,-16]],5,iron,root);plate([[-20,22],[0,13],[20,22],[16,-11],[0,-26],[-16,-11]],3,bone,root).position.z=6;tube([[0,24,10],[0,0,12],[0,-27,9]],1.5,gold,root);for(const s of [-1,1]){const p=plate([[0,0],[s*24,-1],[s*31,-16],[s*4,-13]],4,bronze,root);p.position.set(s*22,25,3);tube([[s*6,16,10],[s*13,3,10],[s*8,-13,10]],1,gold,root);}return root;}
export function disposeTree(root:T.Object3D){const gs=new Set<T.BufferGeometry>(),ms=new Set<T.Material>();root.traverse(o=>{if(o instanceof T.Mesh){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());root.clear();}
