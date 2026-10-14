/** Machined metal, hollow optical glass and granular sand. No image impostor. */
import * as T from 'three';

export interface Hourglass { object:T.Group; vessel:T.Group; cage:T.Group; upper:T.Mesh; lower:T.Mesh; stream:T.Mesh; animate(time:number,release:number,hold:boolean):void; dispose():void; }
function grainMap(metal=false):T.CanvasTexture {
  const c=document.createElement('canvas'),size=metal?512:128;c.width=c.height=size;const ctx=c.getContext('2d')!;
  const p=ctx.createImageData(size,size);let seed=7319;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const n=(seed>>>16)/65535,v=metal?110+32*Math.sin(y*1.37)+n*40:110+n*135;
    const i=(y*size+x)*4;p.data[i]=v;p.data[i+1]=metal?v:v*.91;p.data[i+2]=metal?v:v*.74;p.data[i+3]=255;
  }
  ctx.putImageData(p,0,0);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(1,metal?5:1);t.colorSpace=T.SRGBColorSpace;return t;
}
function lathe(points:number[][],segments=96){return new T.LatheGeometry(points.map(([r,y])=>new T.Vector2(r,y)),segments);}
function tube(points:T.Vector3[],radius:number){return new T.TubeGeometry(new T.CatmullRomCurve3(points),96,radius,8,false);}

export function makeHourglass():Hourglass {
  const object=new T.Group(),vessel=new T.Group(),cage=new T.Group();object.add(cage,vessel);
  const textures=[grainMap(true),grainMap(false)];
  const metal=new T.MeshPhysicalMaterial({color:0x9b6738,metalness:1,roughness:.26,roughnessMap:textures[0],bumpMap:textures[0],bumpScale:.008,clearcoat:.3,clearcoatRoughness:.22});
  const dark=new T.MeshStandardMaterial({color:0x161518,metalness:.72,roughness:.29});
  const edge=new T.MeshStandardMaterial({color:0xe5c580,metalness:1,roughness:.18});
  const glass=new T.MeshPhysicalMaterial({color:0xffffff,metalness:0,roughness:.009,transmission:1,opacity:1,ior:1.46,thickness:.045,attenuationColor:0xc4e6ec,attenuationDistance:8,envMapIntensity:.65,dispersion:.08,side:T.FrontSide});
  const sand=new T.MeshStandardMaterial({color:0xe5c58b,map:textures[1],roughness:.94,bumpMap:textures[1],bumpScale:.023,metalness:.06});
  const jewel=new T.MeshPhysicalMaterial({color:0x727fc9,metalness:.25,roughness:.12,transmission:.35,thickness:.15,ior:1.7,clearcoat:1});
  const add=(parent:T.Group,g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0)=>{const mesh=new T.Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  const torus=(parent:T.Group,r:number,t:number,y:number,m:T.Material=edge)=>{const o=add(parent,new T.TorusGeometry(r,t,8,96),m,0,y);o.rotation.x=Math.PI/2;return o;};
  // The lathe closes over the lip and returns down the inner surface. Wall thickness is real geometry.
  const outer=[[.39,-1.07],[.48,-1.035],[.535,-.93],[.556,-.76],[.535,-.58],[.44,-.39],[.255,-.21],[.08,-.075],[.047,0],[.08,.075],[.255,.21],[.44,.39],[.535,.58],[.556,.76],[.535,.93],[.48,1.035],[.39,1.07]];
  const wall=[...outer,...outer.slice().reverse().map(([r,y])=>[Math.max(.024,r-.026),y])];wall.push(outer[0]);
  add(vessel,lathe(wall,128),glass);
  for(const sign of [-1,1]){
    const cap=new T.Group();cap.position.y=sign*1.12;cap.rotation.z=sign<0?Math.PI:0;vessel.add(cap);
    add(cap,lathe([[0,0],[.48,0],[.55,.022],[.565,.045],[.615,.055],[.636,.09],[.636,.115],[.61,.136],[.61,.155],[.57,.185],[0,.185]]),metal);
    torus(cap,.63,.013,.103);torus(cap,.605,.008,.145);torus(cap,.55,.018,.031,dark);
    add(cap,new T.CylinderGeometry(.51,.51,.025,96),dark,0,.188);
    torus(cap,.51,.009,.208);torus(cap,.38,.006,.203);torus(cap,.18,.007,.207);
    add(cap,new T.SphereGeometry(.112,24,12),jewel,0,.206).scale.set(1,.32,1);
    for(let j=0;j<48;j++){
      const a=j*Math.PI/24;const tick=add(cap,new T.BoxGeometry(j%4===0?.028:.013,.006,j%4===0?.083:.03),j%4===0?edge:dark,Math.cos(a)*.565,.17,Math.sin(a)*.565);tick.rotation.y=-a+Math.PI/2;
    }
    for(let j=0;j<6;j++){
      const a=j*Math.PI/3;add(cap,new T.CylinderGeometry(.022,.024,.017,12),edge,Math.cos(a)*.456,.211,Math.sin(a)*.456);
      const slit=add(cap,new T.BoxGeometry(.03,.003,.004),dark,Math.cos(a)*.456,.221,Math.sin(a)*.456);slit.rotation.y=a;
    }
  }
  const upper=add(vessel,lathe([[0,.055],[.023,.055],[.063,.13],[.225,.255],[.405,.435],[.49,.60],[.502,.69],[.38,.692],[.20,.683],[.06,.635],[.009,.57],[0,.57]]),sand);
  const lower=add(vessel,lathe([[0,-1.05],[.39,-1.05],[.48,-.99],[.513,-.90],[.42,-.886],[.25,-.78],[.04,-.64],[0,-.627]]),sand);
  const streamMat=new T.ShaderMaterial({uniforms:{uTime:{value:0},uReverse:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;uniform float uTime;uniform float uReverse;void main(){float n=fract(sin(dot(floor(vUv*vec2(7.,120.))+vec2(0.,floor(uTime*90.)*(1.-2.*uReverse)),vec2(12.9898,78.233)))*43758.5453);gl_FragColor=vec4(mix(vec3(.45,.29,.11),vec3(.94,.83,.54),n),.9);}`,transparent:true});
  const stream=add(vessel,new T.CylinderGeometry(.013,.02,.78,12,64,true),streamMat,0,-.32);
    for(let j=0;j<3;j++){
      const pts=Array.from({length:100},(_,i)=>{const t=i/99,a=t*Math.PI*1.1+j*Math.PI*2/3;return new T.Vector3(Math.cos(a)*(.61+.16*Math.sin(t*Math.PI)),t*2.44-1.22,Math.sin(a)*(.61+.16*Math.sin(t*Math.PI)));});
      add(vessel,tube(pts,.035),metal);
      add(vessel,tube(pts.map(p=>p.clone().multiply(new T.Vector3(1.04,1,1.04))),.008),edge);
    }
    const crest=add(cage,new T.TorusGeometry(.77,.027,10,100),dark,0,1.39);crest.rotation.x=Math.PI/2;
  return {object,vessel,cage,upper,lower,stream,
    animate(time,release,hold){
      streamMat.uniforms.uTime.value=time;streamMat.uniforms.uReverse.value=1;
      // In the reserved state time has stopped: no sand drains during the user's turn.
      stream.visible=!hold;upper.scale.y=1-(hold?0:Math.min(.11,time*.012));lower.scale.y=1+(hold?0:Math.min(.04,time*.004));
      vessel.rotation.y=-time*.35-release*Math.PI*2;cage.rotation.y=time*.18;
    },
    dispose(){const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();object.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());},
  };
}
