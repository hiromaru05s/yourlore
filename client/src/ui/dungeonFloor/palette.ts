import * as T from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
export type Palette=ReturnType<typeof materials>;
function texture(kind:'ivory'|'wood'|'stone'|'metal'){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d')!;let seed=741;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const base=kind==='ivory'?[168,151,113]:kind==='wood'?[55,35,22]:kind==='stone'?[70,76,65]:[139,108,52];const d=c.createImageData(256,256);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const n=(rand()-.5)*26+Math.sin(x*.11+Math.sin(y*.029)*2)*(kind==='wood'?15:3);const i=(y*256+x)*4;d.data[i]=base[0]+n;d.data[i+1]=base[1]+n;d.data[i+2]=base[2]+n;d.data[i+3]=255;}c.putImageData(d,0,0);
 c.lineWidth=kind==='ivory'?1.2:.6;for(let i=0;i<170;i++){let x=rand()*256,y=rand()*256;c.strokeStyle=kind==='ivory'?'#34402b88':kind==='metal'?'#36362266':'#101a1666';c.beginPath();c.moveTo(x,y);for(let j=0;j<5;j++){x+=(rand()-.45)*(kind==='wood'?3:14);y+=rand()*12;c.lineTo(x,y);}c.stroke();}
 if(kind==='ivory'){for(let i=0;i<40;i++){c.fillStyle=i%2?'#5b614548':'#362e2044';c.beginPath();c.ellipse(rand()*256,rand()*256,3+rand()*18,1+rand()*5,rand()*6,0,Math.PI*2);c.fill();}}const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=4;return tex;
}
export function materials(){const ivory=texture('ivory'),wood=texture('wood'),stone=texture('stone'),metal=texture('metal');const loader=new T.TextureLoader(),brass=loader.load('/art/vfx/mimic-family/engraved-brass.webp'),mouth=loader.load('/art/vfx/mimic-cavity-r3/02-moist-cheeks.webp');for(const map of [brass,mouth]){map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;}return {
 ivory:new T.MeshStandardMaterial({map:ivory,bumpMap:ivory,bumpScale:.025,roughness:.7,color:0xe5d9b2}),
 wood:new T.MeshStandardMaterial({map:wood,bumpMap:wood,bumpScale:.045,roughness:.86}),
 brass:new T.MeshStandardMaterial({map:brass,bumpMap:metal,bumpScale:.018,metalness:.78,roughness:.4,color:0xd9c59b}),
 iron:new T.MeshStandardMaterial({color:0x242c29,metalness:.82,roughness:.42}),
 stone:new T.MeshStandardMaterial({map:stone,bumpMap:stone,bumpScale:.1,roughness:.96}),
 tooth:new T.MeshStandardMaterial({color:0xe3d2b0,bumpMap:ivory,bumpScale:.006,roughness:.46,metalness:.03}),
 flesh:new T.MeshPhysicalMaterial({color:0xc08c85,map:mouth,bumpMap:mouth,bumpScale:.05,roughness:.68,clearcoat:.18,clearcoatRoughness:.45,envMapIntensity:.18}),
 tongue:new T.MeshPhysicalMaterial({color:0x782c34,bumpMap:mouth,bumpScale:.012,roughness:.43,clearcoat:.45,clearcoatRoughness:.24}),
 cavity:new T.MeshStandardMaterial({color:0x09080a,roughness:.92}),
 blue:new T.MeshStandardMaterial({color:0x102e3b,metalness:.3,roughness:.5}),
 };}
export function box(parent:T.Object3D,w:number,h:number,d:number,mat:T.Material,x=0,y=0,z=0,round=.035){const m=new T.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(round,w/4,h/4,d/4)),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}