import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/tmp/lore-opening-tools/node_modules/playwright/index.mjs');
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();
const origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5260';
try{
 await page.goto(origin+'/turn-light-lab.html');await page.waitForSelector('#lab[data-ready=true]');
 const results=await page.evaluate(async()=>{
  const source=await fetch('/src/dev/turnLightLab.ts').then(r=>r.text());const dependencies=[...source.matchAll(/from "([^"]+)"/g)].map(m=>m[1]);
  const T=await import(dependencies.find(p=>p.includes('/three.js?')));
  const {GLTFLoader}=await import(dependencies.find(p=>p.includes('GLTFLoader')));
  const {RoomEnvironment}=await import(dependencies.find(p=>p.includes('RoomEnvironment')));
  const {createTurnLights}=await import(dependencies.find(p=>p.includes('turnLightEffects')));
  const renderer=new T.WebGLRenderer({alpha:true,antialias:false,preserveDrawingBuffer:true});renderer.setSize(256,256);renderer.toneMapping=T.AgXToneMapping;
  const scene=new T.Scene(),camera=new T.OrthographicCamera(-.085,.085,.085,-.085,.01,2);camera.position.set(0,.25,.12);camera.lookAt(0,0,0);
  const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.55;
  const key=new T.DirectionalLight(0xffeed9,2.3);key.position.set(-.1,.3,.2);const fill=new T.DirectionalLight(0xc4daff,.7);fill.position.set(.2,.2,-.1);scene.add(key,fill);
  const loader=new GLTFLoader(),button=await loader.loadAsync('/models/reading-board/v1/turn-button.glb'),timer=await loader.loadAsync('/models/reading-board/v1/timer-inserts.glb');scene.add(button.scene,timer.scene);
  const segments=[];timer.scene.traverse(o=>{if(o.isMesh)segments.push(o);});
  const socket=new T.Mesh(new T.CylinderGeometry(.065,.066,.009,96),new T.MeshStandardMaterial({color:0x263645,metalness:.65,roughness:.3}));socket.position.y=-.001;scene.add(socket);
  const cached=new T.WebGLRenderTarget(256,256,{type:T.HalfFloatType});cached.texture.colorSpace=T.LinearSRGBColorSpace;
  const outputScene=new T.Scene(),outputCamera=new T.OrthographicCamera(-1,1,1,-1,0,1),material=new T.MeshBasicMaterial({map:cached.texture,toneMapped:true,transparent:true,blending:T.NoBlending,depthTest:false,depthWrite:false}),quad=new T.Mesh(new T.PlaneGeometry(2,2),material);outputScene.add(quad);
  const pixels=()=>{const bytes=new Uint8Array(256*256*4);renderer.getContext().readPixels(0,0,256,256,renderer.getContext().RGBA,renderer.getContext().UNSIGNED_BYTE,bytes);return bytes;};
  const results=[];
  for(const view of [.085,.25])for(const id of ['porcelain','inscription','prism'])for(const active of [true,false]){
   camera.left=-view;camera.right=view;camera.top=view;camera.bottom=-view;camera.updateProjectionMatrix();
   const state={now:1234,active,enemy:!active,remaining:64/90,hover:false,pressed:false,reduced:false};
   const direct=createTurnLights(button.scene,segments,()=>id);direct.update(state);renderer.setRenderTarget(null);renderer.autoClear=true;renderer.render(scene,camera);const reference=pixels();direct.dispose();
   const board=createTurnLights(button.scene,segments,()=>id,scene);board.update(state);renderer.setRenderTarget(cached);renderer.clear();renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.autoClear=false;renderer.render(outputScene,outputCamera);board.renderDisplay(renderer,camera);const actual=pixels();board.dispose();
   let sum=0,max=0,bad=0;for(let i=0;i<actual.length;i++){const d=Math.abs(actual[i]-reference[i]);sum+=d;max=Math.max(max,d);if(d>3)bad++;}
   results.push({view,variant:id,active,meanChannelError:sum/actual.length,maxChannelError:max,channelsOver3:bad/actual.length});
  }
  scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});cached.dispose();quad.geometry.dispose();material.dispose();environment.dispose();pmrem.dispose();room.dispose();renderer.dispose();return results;
 });
 for(const r of results){assert(r.meanChannelError<.001,JSON.stringify(r));assert(r.maxChannelError<=1,JSON.stringify(r));}
 await fs.writeFile(process.env.LORE_TEST_REPORT||'docs/vfx-prototypes/2026-09-29-turn-light/qa/color-parity.json',JSON.stringify({method:'Identical geometry, lights, camera, phase, state and 64/90 timer. Direct gallery render vs cached-board presentation plus isolated display pass. RGBA readback at 256 square, full and cropped viewports.',results},null,2));console.log('PASS color parity',results);
}finally{await browser.close();}
