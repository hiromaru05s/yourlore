import * as T from 'three';
import {loadReadingModel} from './readingModel';
import {identityNameplatePose} from './identityFurnitureLayout';
import {identityRailLayout,RAIL} from './identityRailLayout';
import {readingScale} from './readingBoardLayout';
/** Blender-authored add-on sharing the actual mana tray's materials, light and depth. */
export function mountIdentityFurniture(root:HTMLElement,parent:T.Group){
 const group=new T.Group();group.name='Identity furniture';parent.add(group);
 let ready=false,dirty=false,dead=false,template:T.Group|undefined,lastSamples='';
 const sampleMedals:T.Object3D[]=[];
 const aligned=root.dataset.alignedRail==='true',instances:Array<{side:'Me'|'Opp';model:T.Group}>=[];
 let lastViewport='';
 const url=aligned?'/models/reading-board/identity-aligned-1120/identity-addon.glb':'/models/reading-board/identity-11120/identity-addon.glb';
 function placeModels(){
  const rail=aligned?identityRailLayout(readingScale()):undefined;
  for(const {side,model} of instances){
   const plate=model.getObjectByName('NAMEPLATE_FRAME'),pose=rail?.[side].name??identityNameplatePose(side);
   model.position.x=rail?RAIL.manaX:-.345;
   model.position.z=rail?.[side].manaZ??(side==='Me'?.397:-.397);
   if(plate){plate.position.set(.0415,pose.centerY,pose.centerZ);plate.rotation.x=pose.radians;plate.scale.z=rail?rail.nameDepth/RAIL.nameDepth:1;}
   const badge=model.getObjectByName('RANK_AND_MEDAL_FRAME');
   if(rail&&badge){badge.position.set(RAIL.badgeX,0,rail[side].badgeCenterZ);badge.scale.z=rail[side].badgeScaleZ;const medal=model.getObjectByName('MEDAL_SAMPLE');if(medal)medal.scale.z=1/badge.scale.z;}
  }
  dirty=true;
 }
 const release=(object:T.Object3D)=>{const geos=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();object.traverse(o=>{if(o instanceof T.Mesh){geos.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});geos.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());};
 void loadReadingModel(url).then(g=>{
  if(dead){release(g.scene);return;}template=g.scene;
  for(const [side,z] of [['Me',.397],['Opp',-.397]] as const){
   const model=template.clone(true);model.name=`Identity ${side}`;model.position.set(-.345,.012,z);
   instances.push({side,model});
   model.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});
   const medal=model.getObjectByName('MEDAL_SAMPLE');if(medal)sampleMedals.push(medal);
   group.add(model);
  }
  placeModels();
  root.dataset.identityFurnitureReady='true';root.dataset.identityModel=url;
  ready=true;dirty=true;
 }).catch(error=>{if(!dead){console.error('Identity furniture',error);root.dataset.identityFurnitureReady='error';ready=true;}});
 return {get settled(){return ready;},tick(){
  const viewport=`${innerWidth}:${innerHeight}`;if(ready&&viewport!==lastViewport){lastViewport=viewport;placeModels();}
  const samples=root.dataset.insigniaSamples??'off';
  if(ready&&samples!==lastSamples){sampleMedals.forEach(m=>m.visible=samples==='on');lastSamples=samples;dirty=true;}
  const changed=dirty;dirty=false;return changed;
 },dispose(){dead=true;group.removeFromParent();if(template)release(template);delete root.dataset.identityFurnitureReady;delete root.dataset.identityModel;}};
}
