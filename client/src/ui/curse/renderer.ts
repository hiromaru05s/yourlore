import {createWebGLRenderer} from '../webglRenderer';
import * as T from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {Skin} from './skin';
import {curseMaterial,mistMaterial,skullMaterial} from './occult-material';
import {DURATION,SPELL_LAND,birth,arrival,ease,mix,stateAt,type Rect,type Options} from './model';
export function createRenderer(faces:HTMLCanvasElement[],skullImage:HTMLImageElement){
 const gl=createWebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
 gl.setPixelRatio(1);gl.outputColorSpace=T.SRGBColorSpace;gl.toneMapping=T.ACESFilmicToneMapping;gl.toneMappingExposure=.95;
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-5,5,3,-3,.1,70),env=new RoomEnvironment(),pm=new T.PMREMGenerator(gl),rt=pm.fromScene(env,.04);scene.environment=rt.texture;env.dispose();pm.dispose();
 const maps=faces.map(f=>{const m=new T.CanvasTexture(f);m.colorSpace=T.SRGBColorSpace;return m;});
 const skullMap=new T.Texture(skullImage);skullMap.colorSpace=T.SRGBColorSpace;skullMap.needsUpdate=true;
 scene.add(new T.AmbientLight(0xd8cdea,.9));const light=new T.DirectionalLight(0xeee5dc,1.25);light.position.set(-3,4,9);scene.add(light);
 const sourceMat=new T.MeshBasicMaterial({map:maps[0],toneMapped:false,side:T.DoubleSide,transparent:true,alphaTest:.02}),source=new Skin(sourceMat,5,8,.025);scene.add(source.mesh);
 const baseMat=new T.MeshBasicMaterial({map:maps[2],transparent:true,alphaTest:.02}),base=new Skin(baseMat,1,1,.02);scene.add(base.mesh);
 const cards=Array.from({length:5},(_,i)=>{const m=curseMaterial(maps[1],i),skin=new Skin(m.mat,8,12,.018);skin.mesh.renderOrder=10+i;scene.add(skin.mesh);return{m,skin};});
 const skullMat=skullMaterial(skullMap),skull=new T.Mesh(new T.PlaneGeometry(1,1),skullMat);skull.renderOrder=20;scene.add(skull);
 const mists=Array.from({length:8},(_,i)=>{const mat=mistMaterial();mat.uniforms.seed.value=i*1.7;const mesh=new T.Mesh(new T.PlaneGeometry(1,1),mat);mesh.renderOrder=i<5?8:2;scene.add(mesh);return{mat,mesh};});
 const tetherMat=new T.MeshBasicMaterial({color:0x2a1137,transparent:true,opacity:.6,side:T.DoubleSide,depthWrite:false}),tether=new Skin(tetherMat,28,4,.002);scene.add(tether.mesh);tether.mesh.renderOrder=1;
 const flat=(s:Skin,r:Rect,z=.1,angle=0,curve=0)=>s.update((u,v)=>{const x=(u-.5)*r.w,y=(v-.5)*r.h;return [r.x+Math.cos(angle)*x-Math.sin(angle)*y,r.y+Math.sin(angle)*x+Math.cos(angle)*y,z+Math.sin(v*Math.PI)*curve];});
 const blend=(a:Rect,b:Rect,f:number):Rect=>({x:mix(a.x,b.x,f),y:mix(a.y,b.y,f),w:mix(a.w,b.w,f),h:mix(a.h,b.h,f)});
 let dead=false,lost=false;
 gl.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;});gl.domElement.addEventListener('webglcontextrestored',()=>lost=false);
 function draw(canvas:HTMLCanvasElement,o:Options){
  if(dead)return;const c=canvas.getContext('2d')!,dpr=o.pixelRatio??1,w=canvas.width/dpr,h=canvas.height/dpr;if(!w||!h)return;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);if(lost)throw Error('描画を再読み込みしてください');
  let S:Rect,R:Rect,P:Rect,G:Rect;
  const cv=(r:Rect):Rect=>({x:(r.x-w/2)/100,y:(h/2-r.y)/100,w:r.w/100,h:r.h/100});
  if(o.board){S=cv(o.board.source);R=cv(o.board.target);P=cv(o.board.played??{x:w*.5,y:h*.6,w:100,h:150});G=cv(o.board.ownGrave??o.board.source);scene.background=null;}
  else{const sign=o.side?-1:1;S={x:-w/330,y:-h/400*sign,w:w/800,h:w/530};R={x:w/380,y:h/650*sign,w:w/1050,h:w/700};P={x:-w/900,y:0,w:w/640,h:w/426};G={...S,x:S.x+.6};scene.background=new T.Color(o.dark?0x17121e:0xe4e1dc);}
  camera.left=-w/200;camera.right=w/200;camera.top=h/200;camera.bottom=-h/200;camera.position.set(0,0,25);camera.lookAt(0,0,0);camera.updateProjectionMatrix();
  const t=o.ms,v=o.variant,st=stateAt(o),U=Math.max(.20,Math.min(1.1,R.w,(R.x+w/200-.08)/1.95,(w/200-R.x-.08)/1.95)),active=t>0&&t<DURATION;
  base.mesh.visible=!o.board;baseMat.map=maps[stateAt(o).deposited?1:2];flat(base,R);
  source.mesh.visible=!o.hideSource&&(o.board?t>0&&t<SPELL_LAND:t<SPELL_LAND);
  const lift=ease(t,0,620),toDiscard=ease(t,1220,SPELL_LAND);let played=blend(blend(S,P,lift),G,toDiscard);
  if(o.reduced)played=t<700?S:G;
  flat(source,played,.3);
  const skullSize=Math.max(.40,Math.min(U*2.15,(h/200-Math.abs(R.y)) * 1.8,(R.x+w/200)*1.7,(w/200-R.x)*1.7));
  const skullY=R.y,mouthY=skullY-skullSize*.27;
  const bloom=ease(t,1390,2050),out=ease(t,4700,5570),skullStrength=(o.skullOpacity??.45)*bloom*(1-out);
  skull.visible=active&&skullStrength>0;skull.position.set(R.x,skullY,.80+(o.reduced?0:Math.sin(t*.0016)*.035));skull.scale.set(skullSize*(1+ease(t,1500,2200)*.025),skullSize,1);
  // Keep the apparition over the graveyard in X/Y; float only along Z.
  canvas.dataset.skull=JSON.stringify({x:R.x*100+w/2,y:h/2-skullY*100,z:skull.position.z,size:skullSize*100,visible:skull.visible,opacity:skullStrength});
  skullMat.uniforms.alpha.value=skullStrength;skullMat.uniforms.clock.value=t/1000;skullMat.uniforms.dissolve.value=out*.98;
  mists.forEach(m=>m.mesh.visible=false);
  function mist(i:number,x:number,y:number,mw:number,mh:number,a:number,ang=0){const m=mists[i];m.mesh.visible=active&&a>.002&&!o.reduced;m.mesh.position.set(x,y,.15);m.mesh.scale.set(mw,mh,1);m.mesh.rotation.z=ang;m.mat.uniforms.alpha.value=a;m.mat.uniforms.clock.value=t/1000;}
  mist(5,R.x,R.y,U*2.45,U*1.7,bloom*(1-ease(t,4620,5460))*.52);
  mist(6,R.x,mouthY,U*1.8,U*1.4,bloom*(1-out)*.23);
  // A single attached shadow carries the spell's intent from its revealed surface to the graveyard.
  const front=ease(t,920,1530),back=ease(t,1370,1930);tether.mesh.visible=active&&!o.reduced&&front>back;
  if(tether.mesh.visible){const dx=R.x-P.x,dy=mouthY-P.y,len=Math.hypot(dx,dy)||1;tetherMat.opacity=.36*(1-ease(t,1710,1930));tether.update((u,ww)=>{const f=mix(back,front,u),width=Math.sin(u*Math.PI)*U*.08;return[P.x+dx*f-dy/len*(ww-.5)*width,P.y+dy*f+dx/len*(ww-.5)*width,.18];});}
  for(let i=0;i<5;i++){
   const b=birth(v,i),a=arrival(v,i),born=ease(t,b,b+430),land=ease(t,a-470,a),k=i-2;let x=R.x,y=R.y,angle=0,curl=0,cw=U*.82,ch=U*1.23;
   if(v===0){const fan=ease(t,b,b+660);x=R.x+k*U*.71*fan;y=R.y+U*(-.12+(1-Math.abs(k)/3)*.16)*fan;angle=-k*.16*(1-land);curl=.10*U*(1-land);}
   if(v===1){const fall=ease(t,b+140,a);x=R.x+Math.sin(fall*Math.PI)*(i%2?1:-1)*U*.33;y=mix(mouthY-U*.02,R.y,fall);angle=Math.sin(fall*Math.PI)*(i%2?.16:-.16);curl=Math.sin(fall*Math.PI)*U*.2;}
   if(v===2){x=R.x+(i<3?i-1:(i-3.5))*.72*U;y=R.y+U*(i<3?.03:-.72);angle=(i%2?-.04:.04)*(1-land);cw=U*.63;ch=U*.945;curl=Math.sin(born*Math.PI)*U*.16;}
   if(v===3){const rise=ease(t,b,b+540);x=R.x+U*.10*i*rise;y=R.y+U*(-.60+i*.12*rise);cw=U*.86;ch=U*1.25;angle=(.06+i*.016)*(1-land);curl=U*.025*Math.sin(t*.003+i);}
   if(o.reduced){x=R.x+k*U*.38;y=R.y+U*.9;angle=curl=0;}
   const beforeLand={x,y};x=mix(x,R.x,land);y=mix(y,R.y,land);cw=mix(cw,R.w,land);ch=mix(ch,R.h,land);
   const {skin,m}=cards[i];skin.mesh.visible=t>=b&&t<a; m.uniforms.birth.value=born;m.uniforms.clock.value=t/1000;m.uniforms.heat.value=1-land*.7;m.uniforms.mode.value=v;
   if(skin.mesh.visible){
    if(v===2&&!o.reduced&&born<1){const gap=(1-born)*U*.47;skin.update((u,vv)=>[x+(u-.5)*cw+Math.sign(u-.5)*gap,y+(vv-.5)*ch,.25+i*.009+Math.sin(vv*Math.PI)*curl]);}
    else flat(skin,{x,y,w:cw,h:ch},.25+i*.009,angle,curl);
   }
   const puff=ease(t,b-100,b+280)*(1-ease(t,a-100,a+160));
   mist(i,x,y,cw*1.55,ch*1.4,puff*.65,angle);
   // The seam remains attached to its own card surface; no decorative floating particles.
   if(v===2&&t>=b&&t<b+430){const spread=(1-born)*U*.62;mist(i,beforeLand.x+spread*(i%2?1:-1),beforeLand.y,cw*1.8,ch*1.15,puff*.7);}
   if(t>=a&&t<a+190){const hit=1-ease(t,a,a+190);mist(i,R.x,R.y,R.w*(1+hit*.7),R.h*(1+hit*.25),hit*.43);}
  }
  if(gl.getPixelRatio()!==dpr)gl.setPixelRatio(dpr);if(gl.domElement.width!==Math.floor(w*dpr)||gl.domElement.height!==Math.floor(h*dpr))gl.setSize(w,h,false);gl.render(scene,camera);c.drawImage(gl.domElement,0,0,w,h);
  if(!o.board){c.fillStyle=o.dark?'#d9c6dc':'#453a49';c.font=`${Math.max(11,w*.017)}px sans-serif`;c.textAlign='left';c.fillText('手札 → カースをプレイ',w*.04,h*.92);c.textAlign='right';c.fillText(`${o.side?'自分':'相手'}の墓地  ${st.graveyard} 枚`,w*.96,h*.92);}
 }
 return{draw,dispose(){if(dead)return;dead=true;scene.traverse(obj=>{if(obj instanceof T.Mesh)obj.geometry.dispose();});[sourceMat,baseMat,skullMat,tetherMat,...cards.map(c=>c.m.mat),...mists.map(m=>m.mat)].forEach(m=>m.dispose());maps.forEach(m=>m.dispose());skullMap.dispose();rt.dispose();gl.dispose();gl.forceContextLoss();},get memory(){return gl.info.memory;}};
}
