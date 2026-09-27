import {MANA_GAIN_MS,MANA_GAIN_IMPACT_MS,manaGainPose} from './manaGainTiming';
import {mountRiftApertures} from './riftAperture';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {READING_ASSETS,readingScale} from './readingBoardLayout';
import {addCrystalOptics} from './readingCrystalOptics';
/** Geometry-only UI; the original native buttons retain keyboard/game authority. */
export function mountReadingWidgets(root:HTMLElement,scene:T.Scene){
 const group=new T.Group();group.name='Reading board 02 05 06';scene.add(group);
 const apertures=mountRiftApertures(group);let shadowDirty=true;
 const templates:T.Group[]=[];const owned:T.Material[]=[];const geometries:T.BufferGeometry[]=[];
 const manas:Array<{root:T.Group;batches:Record<'ready'|'spent',T.InstancedMesh[]>;key:string;side:string;maximum:number;current:number}>=[];
 let dead=false,ready=false,turn:T.Group|undefined,reroll:T.Group|undefined,turnCap:T.Object3D|undefined,rerollCap:T.Object3D|undefined,arrows:T.Object3D|undefined,enamel:T.MeshStandardMaterial|undefined;
 let hover='',pressed='',last=performance.now(),rerollTime=-10000,turnTime=-10000,animateUntil=0,lastState='',displayEnemy=false;
 const segments:T.Mesh[]=[];const rerollMaterials:Array<{material:T.MeshStandardMaterial;color:T.Color}>=[];
 const lit=new T.MeshStandardMaterial({color:0x3daacb,emissive:0x3ba7cc,emissiveIntensity:.45,metalness:.1,roughness:.32}),dark=new T.MeshStandardMaterial({color:0x10202b,metalness:.2,roughness:.42});owned.push(lit,dark);
 const color=new T.Color();
 function releaseTemplate(object:T.Object3D){
  const geos=new Set<T.BufferGeometry>(),mats=new Set<T.Material>(),maps=new Set<T.Texture>();
  object.traverse(o=>{if(o instanceof T.Mesh){geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){mats.add(m);for(const value of Object.values(m))if(value instanceof T.Texture)maps.add(value);}}});
  geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());maps.forEach(m=>{if(typeof ImageBitmap!=='undefined'&&m.image instanceof ImageBitmap)m.image.close();m.dispose();});
 }
 async function load(name:string){const g=await new GLTFLoader().loadAsync(READING_ASSETS+name);if(dead){releaseTemplate(g.scene);throw new Error('disposed');}templates.push(g.scene);return g.scene;}
 const opticalMaterials:T.MeshPhysicalMaterial[]=[];
 void (async()=>{
  const [tray,counter,jewel,spent,button,timer,refresh,cut]=await Promise.all([
   ...['mana-tray.glb','mana-counter.glb','mana-crystal-ready.glb','mana-crystal-spent.glb','turn-button.glb','timer-inserts.glb','reroll-button.glb'].map(load),
   fetch(READING_ASSETS+'crystal-optics.json').then(r=>r.json())
  ]) as [T.Group,T.Group,T.Group,T.Group,T.Group,T.Group,T.Group,{planes:number[][];center:number[];scale:number}];
  if(dead)return;
  jewel.traverse(o=>{if(o instanceof T.Mesh&&o.material instanceof T.MeshPhysicalMaterial){o.material.color.set('#378bea');o.material.attenuationColor.set('#2373c9');}});
  for(const gem of [jewel,spent])gem.traverse(o=>{if(o instanceof T.Mesh&&o.material instanceof T.MeshPhysicalMaterial&&o.material.transmission>0){addCrystalOptics(o.material,cut);o.material.userData.authoredAttenuation=o.material.attenuationDistance;opticalMaterials.push(o.material);}});
  for(const [side,z] of [['Me',.397],['Opp',-.397]] as const){
   const mana=new T.Group();mana.position.set(-.345,.012,z);group.add(mana);
   const a=tray.clone(true),b=counter.clone(true);a.position.x=.0415;b.position.x=-.132;mana.add(a,b);
   const batches:{ready:T.InstancedMesh[];spent:T.InstancedMesh[]}={ready:[],spent:[]};
   for(const [state,asset] of [['ready',jewel],['spent',spent]] as const){
    asset.updateMatrixWorld(true);asset.traverse(o=>{if(!(o instanceof T.Mesh))return;
     const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);geometries.push(geo);
     const mesh=new T.InstancedMesh(geo,o.material,30);mesh.name=side+' '+state+' '+o.name;mesh.position.x=.0415;mesh.count=0;
     const optical=o.material instanceof T.MeshPhysicalMaterial&&o.material.transmission>0;mesh.castShadow=!optical;mesh.receiveShadow=!optical;
     mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mana.add(mesh);batches[state].push(mesh);
    });
   }
   manas.push({root:mana,batches,key:'',side,maximum:0,current:0});
  }
  turn=button;turn.position.set(.7,.015,0);timer.position.copy(turn.position);group.add(turn,timer);
  turnCap=turn.getObjectByName('PRESS_CAP');turn.traverse(o=>{if(o instanceof T.Mesh&&o.material instanceof T.MeshStandardMaterial&&o.material.name.startsWith('Turn enamel'))enamel=o.material;});
  timer.traverse(o=>{if(o instanceof T.Mesh){o.material=lit;segments.push(o);}});segments.sort((a,b)=>a.userData.segment_index-b.userData.segment_index);
  reroll=refresh;reroll.position.set(-.694,.016,0);group.add(reroll);rerollCap=reroll.getObjectByName('PRESS_CAP');arrows=reroll.getObjectByName('REROLL_ARROWS');
  const unique=new Set<T.MeshStandardMaterial>();reroll.traverse(o=>{if(o instanceof T.Mesh&&o.material instanceof T.MeshStandardMaterial)unique.add(o.material);});unique.forEach(material=>rerollMaterials.push({material,color:material.color.clone()}));
  ready=true;root.dataset.widgetsReady='true';
 })().catch(error=>{if(!dead){console.error('Reading board widgets failed',error);root.dataset.widgetsReady='fallback';ready=true;}});
 const id=(event:Event)=>(event.target as Element)?.closest<HTMLElement>('#endBtn,#refreshBtn')?.id||'';
 const over=(e:Event)=>{const next=id(e);if(next!==hover)animateUntil=performance.now()+500;hover=next;};const down=(e:Event)=>{const target=(e.target as Element)?.closest<HTMLButtonElement>('button');pressed=target&&!target.disabled?id(e):'';animateUntil=performance.now()+500;};
 const up=()=>{pressed='';animateUntil=performance.now()+650;};
 const click=(e:Event)=>{const button=(e.target as Element).closest<HTMLButtonElement>('button');if(button?.disabled)return;const now=performance.now();if(id(e)==='refreshBtn')rerollTime=now;if(id(e)==='endBtn')turnTime=now;animateUntil=now+1000;};
 root.addEventListener('pointerover',over);root.addEventListener('pointerdown',down);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);root.addEventListener('click',click,true);
 function tick(now:number){
  if(dead)return false;const scale=readingScale();group.scale.setScalar(scale);
  const riftChanged=apertures.tick(now);
  if(!ready)return riftChanged;
  const dt=Math.min(.06,(now-last)/1000);last=now;let changed=false;
  for(const material of opticalMaterials)material.attenuationDistance=Number(material.userData.authoredAttenuation)*scale;
  for(const mana of manas){
   const el=root.querySelector<HTMLElement>(`#portrait${mana.side} .pt-mana`);if(!el)continue;
   const start=Number(el.dataset.gainStart??-10000),age=now-start;
   const animating=age>=0&&age<MANA_GAIN_MS;
   const before=animating&&age<MANA_GAIN_IMPACT_MS;
   const targetMaximum=Math.min(30,Math.max(0,Number(el.dataset.maximum)||0));
   const maximum=before?Number(el.dataset.gainFromMax):targetMaximum;
   const current=before?Number(el.dataset.gainFromMana):Math.max(0,Number(el.dataset.mana)||0);
   const gainFrom=Number(el.dataset.gainFromMax??targetMaximum);
   const key=current+':'+maximum,newState=key!==mana.key;
   if(newState){mana.key=key;mana.maximum=maximum;mana.current=current;shadowDirty=true;}
   if(!newState&&!animating)continue;changed=true;if(animating)shadowDirty=true;
   const counts={ready:0,spent:0},matrix=new T.Matrix4(),q=new T.Quaternion();
   const rows=maximum<=10?1:maximum<=20?2:3;
   for(let i=0;i<maximum;i++){
    const small=rows===1?Math.min(1,(.226/maximum-.003)/.02954):rows===2?.57:.46;
    const x=rows===1?(i-(maximum-1)/2)*Math.min(.045,.226/maximum):(i%10-4.5)*.023;
    const z=rows===1?0:(Math.floor(i/10)-(rows-1)/2)*(rows===2?.026:.019);
    const gained=animating&&i>=gainFrom,pose=manaGainPose(age,i-gainFrom,targetMaximum-gainFrom);
    q.setFromAxisAngle(new T.Vector3(0,1,0),gained?pose.glow*.06:0);
    matrix.compose(new T.Vector3(x,.0038*(1-small)+(gained?pose.lift:0),z),q,new T.Vector3().setScalar(small*(gained?Math.max(.0001,pose.scale):1)));
    const state=i<current?'ready':'spent',index=counts[state]++;mana.batches[state].forEach(m=>m.setMatrixAt(index,matrix));
   }
   for(const state of ['ready','spent'] as const)for(const mesh of mana.batches[state]){mesh.count=counts[state];mesh.visible=mesh.count>0;mesh.instanceMatrix.needsUpdate=true;if(mesh.count){mesh.computeBoundingSphere();mesh.computeBoundingBox();}}
   el.dataset.crystalsReady=String(counts.ready);el.dataset.crystalsSpent=String(counts.spent);
  }
  const end=root.querySelector<HTMLButtonElement>('#endBtn'),refresh=root.querySelector<HTMLButtonElement>('#refreshBtn'),enemy=root.dataset.readingTurn!=='player';
  for(const m of rerollMaterials){color.copy(m.color);if(refresh?.disabled){const l=color.r*.2126+color.g*.7152+color.b*.0722;color.lerp(new T.Color(l,l,l),.8).multiplyScalar(.5);}else if(hover==='refreshBtn')color.multiplyScalar(1.12);m.material.color.lerp(color,1-Math.exp(-dt*18));}
  const clock=root.querySelector<HTMLElement>('.mp-clock.show'),remaining=clock?Math.min(1,Number(clock.dataset.remaining)/Math.max(1,Number(clock.dataset.total))):1;
  segments.forEach((mesh,i)=>{mesh.material=i<Math.ceil(remaining*24)?lit:dark;});
  const turnAge=now-turnTime;displayEnemy=enemy;
  color.set(displayEnemy?0x492633:0x133042);if(hover==='endBtn'&&!end?.disabled)color.multiplyScalar(1.18);enamel?.color.lerp(color,1-Math.exp(-dt*18));
  color.set(displayEnemy?0xba6471:0x3daacb);lit.color.copy(color);lit.emissive.copy(color);
  const pressDepth=(age:number)=>age<0||age>=620?0:age<120?Math.sin(age/120*Math.PI/2):age<230?1:(1-(age-230)/390)**2;
  const turnPress=pressDepth(turnAge),rerollPress=pressDepth(now-rerollTime);
  const spin=Math.min(1,Math.max(0,(turnAge-190)/520));const rotation=2*Math.PI*(spin*spin*(3-2*spin));
  if(turnCap){turnCap.position.y=-.006*Math.max(turnPress,pressed==='endBtn'?.7:0);turnCap.rotation.y=rotation;end?.style.setProperty('--cap-press',`${turnCap.position.y*scale}px`);end?.style.setProperty('--cap-turn',`${-rotation}rad`);}
  if(rerollCap){rerollCap.position.y=-.0045*Math.max(rerollPress,pressed==='refreshBtn'?.7:0);if(refresh){refresh.dataset.physicalPhase=now-rerollTime<120?'press':now-rerollTime<620?'spin':'rest';refresh.style.setProperty('--cap-press',`${rerollCap.position.y*scale}px`);}}
  const t=Math.min(1,Math.max(0,(now-rerollTime-120)/500)),target=2*Math.PI*(1-(1-t)**3);if(arrows)arrows.rotation.y=target;
  if(turnPress||rerollPress||pressed)shadowDirty=true;
  if(end){end.dataset.physicalPhase=turnAge<120?'press':turnAge<710?'spin':'rest';const label=end.querySelector<HTMLElement>('.end-turn-label');if(label){label.style.opacity='1';const text=displayEnemy?'ENEMY\nTURN':'END\nTURN';if(label.textContent!==text)label.textContent=text;}}
  if(end)end.dataset.turnColor=displayEnemy?'red':'blue';
  group.visible=true;

  const state=`${enemy}:${end?.disabled}:${refresh?.disabled}`;
  if(state!==lastState){animateUntil=now+500;lastState=state;}
  return riftChanged||changed||now<animateUntil||t<1;
 }
 return {tick,takeShadowUpdate(){const value=shadowDirty;shadowDirty=false;return value;},warm(render:()=>void){
  const wasVisible=group.visible,rerollVisible=reroll?.visible;
  const saved=manas.flatMap(m=>Object.values(m.batches).flat().map(mesh=>({mesh,count:mesh.count,visible:mesh.visible})));
  group.visible=true;if(reroll)reroll.visible=true;
  for(const {mesh,count} of saved){if(!count){mesh.setMatrixAt(0,new T.Matrix4());mesh.instanceMatrix.needsUpdate=true;mesh.count=1;}mesh.visible=true;}
  try{render();}finally{group.visible=wasVisible;if(reroll)reroll.visible=rerollVisible??true;for(const {mesh,count,visible} of saved){mesh.count=count;mesh.visible=visible;}}
 },setMarketMotion(height:number,z:number,visible:boolean){if(reroll){const s=readingScale();reroll.position.set(-.694,.016+height/s,z/s);reroll.visible=visible;}},get settled(){return ready;},dispose(){if(dead)return;dead=true;root.removeEventListener('pointerover',over);root.removeEventListener('pointerdown',down);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);root.removeEventListener('click',click,true);manas.forEach(m=>Object.values(m.batches).flat().forEach(b=>b.dispose()));geometries.forEach(g=>g.dispose());apertures.dispose();templates.forEach(releaseTemplate);owned.forEach(m=>m.dispose());group.removeFromParent();delete root.dataset.widgetsReady;}};
}
