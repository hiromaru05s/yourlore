/** Selected 01: the clutch grips the retained die and reverses its native roll. */
import * as T from 'three';
import {diePose,type DiceStage} from './diceScene';
export function wheelTime(ms:number,signal:AbortSignal,paint:(p:number)=>void):Promise<void>{
  return new Promise((resolve,reject)=>{if(signal.aborted){resolve();return;}let frame=0;const start=performance.now();
    const end=()=>{cancelAnimationFrame(frame);signal.removeEventListener('abort',end);resolve();};
    signal.addEventListener('abort',end,{once:true});
    const tick=(now:number)=>{if(signal.aborted){end();return;}const p=Math.min(1,(now-start)/ms);try{paint(p);}catch(error){end();reject(error);return;}if(p===1)end();else frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);
  });
}
const smooth=(a:number,b:number,p:number)=>{const v=T.MathUtils.clamp((p-a)/(b-a),0,1);return v*v*(3-2*v);};
export async function rewindDice(stage:DiceStage,values:number[]):Promise<void>{
  const gold=new T.MeshStandardMaterial({color:0xcfb77d,metalness:.72,roughness:.26,emissive:0x6b4517,emissiveIntensity:.32});
  const geometry=new T.BoxGeometry(.11,.12,.17),rimGeometry=new T.BoxGeometry(1.23,.055,.065);
  const clutches=stage.dice.map(()=>{const group=new T.Group();
    for(let i=0;i<16;i++){const a=i/16*Math.PI*2,part=new T.Mesh(geometry,gold);part.position.set(Math.cos(a)*.69,0,Math.sin(a)*.69);part.rotation.y=-a;group.add(part);}
    for(let i=0;i<4;i++){const rim=new T.Mesh(rimGeometry,gold);rim.rotation.y=i*Math.PI/2;rim.position.set(i%2?Math.sign(i-2)*.61:0,0,i%2?0:Math.sign(i-1)*.61);group.add(rim);}
    stage.scene.add(group);return group;
  });
  const columns=Math.min(5,values.length),rows=Math.ceil(values.length/columns);
  try{await stage.warm();await wheelTime(1480,stage.signal,p=>{
    const charge=smooth(0,.2,p),rewind=smooth(.26,.94,p);
    stage.dice.forEach((die,i)=>{
      const x=(i%columns-(columns-1)/2)*1.65,z=(Math.floor(i/columns)-(rows-1)/2)*1.55;
      const pose=diePose(1-rewind,values[i],i,stage.entryDistance+Math.abs(x));
      die.position.set(x+pose.x,pose.y,z+.2*rewind*rewind*(i%2?1:-1));die.quaternion.copy(pose.quaternion);
      const clutch=clutches[i];clutch.position.copy(die.position);clutch.quaternion.copy(die.quaternion);clutch.scale.setScalar(.75+.25*charge);clutch.visible=p<.94;
      clutch.children.slice(0,16).forEach((tooth,j)=>tooth.scale.y=1+.45*Math.sin(p*12+j*.5));
    });stage.draw();
  });}finally{clutches.forEach(c=>stage.scene.remove(c));geometry.dispose();rimGeometry.dispose();gold.dispose();}
}
