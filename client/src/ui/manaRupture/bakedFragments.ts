import * as T from 'three';
import {characterAppearance} from '../characterAppearance';
export const SIZE=768;
export const random=(v:number)=>{const x=Math.sin(v*127.1+41.7)*43758.5453;return x-Math.floor(x);};
export const smooth=(a:number,b:number,t:number)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};
export const FRACTURE_CHARACTERS=['SEEKER_HOODED','NPC_LUMI','NPC_NOEL','NPC_VERA','NPC_SION','STORY_SHION','STORY_RENA','STORY_ARIES'] as const;
type GeometryData={position:number[];normal:number[];uv?:number[];index?:number[]};
type PieceData={center:[number,number,number];seed:number;depth:number;leak:[number,number,number]|null;face:GeometryData;wall:GeometryData};
export interface FractureBlueprint{version:1;character:string;side:'me'|'opp';pieces:PieceData[]}
export interface LoadedFracture{key:string;data:FractureBlueprint;cracks:HTMLImageElement;geometry:{face:T.BufferGeometry;wall:T.BufferGeometry}[]}
const cache=new Map<string,Promise<LoadedFracture|null>>();
function geometry(data:GeometryData){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.position,3));g.setAttribute('normal',new T.Float32BufferAttribute(data.normal,3));if(data.uv)g.setAttribute('uv',new T.Float32BufferAttribute(data.uv,2));if(data.index)g.setIndex(data.index);return g;}
/** Prepared offline per character and viewpoint. No pixel scan, triangulation or
 * fracture calculation is reachable from this production module. CPU geometry
 * is shared across plays; each renderer owns only its materials/scene nodes. */
export function loadCharacterFracture(root:HTMLElement):Promise<LoadedFracture|null>{
 const raw=characterAppearance(root.querySelector<HTMLElement>('.pt-ring')?.dataset.avatar).id,character=raw==='STORY_LUCA'?'STORY_SHION':raw;
 if(!(FRACTURE_CHARACTERS as readonly string[]).includes(character))return Promise.resolve(null);
 const side=root.id==='portraitMe'?'me':'opp',key=character+'-'+side;
 let task=cache.get(key);if(!task){task=(async()=>{
  const base='/vfx/character-fractures/v1/'+key;
  const response=await fetch(base+'.json');if(!response.ok)throw Error('Missing character fracture '+key);
  const data=await response.json() as FractureBlueprint;
  if(data.version!==1||data.character!==character||data.side!==side||!data.pieces.length||data.pieces.length>64)throw Error('Invalid character fracture '+key);
  const cracks=new Image();cracks.src=base+'.png';await cracks.decode();
  return {key,data,cracks,geometry:data.pieces.map(p=>({face:geometry(p.face),wall:geometry(p.wall)}))};
 })().catch(error=>{cache.delete(key);console.warn('[character fracture]',error);return null;});cache.set(key,task);}return task;
}
export function fixedFragments(blueprint:LoadedFracture,texture:T.Texture){
 const pieces=blueprint.data.pieces.map((p,i)=>{
  const front=new T.MeshStandardMaterial({map:texture,metalness:.045,roughness:.48,envMapIntensity:.12,emissive:0xffffff,emissiveMap:texture,emissiveIntensity:.55,alphaTest:.08,side:T.FrontSide});
  front.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight=diffuseColor.rgb*(.72+.28*max(0.,dot(normal,normalize(vec3(-.3,.7,1.)))))+min(totalSpecular,vec3(.22))*.18;\n#include <opaque_fragment>');};
  const back=new T.MeshStandardMaterial({map:texture,color:0x16354d,metalness:.55,roughness:.29,alphaTest:.08,side:T.BackSide});
  const edge=new T.MeshStandardMaterial({color:0x6c777e,metalness:.82,roughness:.24,side:T.DoubleSide});
  const node=new T.Group(),center=new T.Vector3(...p.center);node.position.copy(center);
  const faceMesh=new T.Mesh(blueprint.geometry[i].face,front),backMesh=new T.Mesh(blueprint.geometry[i].face,back);backMesh.position.z=-p.depth;node.add(faceMesh,backMesh,new T.Mesh(blueprint.geometry[i].wall,edge));
  return {node,center,seed:p.seed,depth:p.depth,leak:p.leak?new T.Vector3(...p.leak):null,front,back,edge};
 });
 return {pieces,cracks:blueprint.cracks,dispose(){for(const p of pieces){p.front.dispose();p.back.dispose();p.edge.dispose();}}};
}
export type FragmentSet=ReturnType<typeof fixedFragments>;
