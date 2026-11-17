import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.LORE_TEST_OUT||'/tmp/lore-reading-parity';await fs.mkdir(out,{recursive:true});
const names=JSON.parse(await fs.readFile('docs/performance/2026-11-18/lossless-assets.json','utf8')).models.map(x=>x.name);
const fixture=`import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
const renderer=new T.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});renderer.setSize(640,480);renderer.setClearColor(0x566172);document.body.append(renderer.domElement);
const scene=new T.Scene(),room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromScene(room);scene.environment=env.texture;
const light=new T.DirectionalLight(0xffffff,2);light.position.set(3,6,4);scene.add(light,new T.AmbientLight(0xffffff,.5));
const camera=new T.PerspectiveCamera(40,640/480,.001,1000),loader=new GLTFLoader();
const gl=renderer.getContext(),read=()=>{renderer.render(scene,camera);const data=new Uint8Array(640*480*4);gl.readPixels(0,0,640,480,gl.RGBA,gl.UNSIGNED_BYTE,data);return data;};
window.compareModel=async name=>{
 const before=(await loader.loadAsync('/models/reading-board/v1/'+name)).scene,after=(await loader.loadAsync('/models/reading-board/v2-shared/'+name)).scene,control=(await loader.loadAsync('/models/reading-board/v1/'+name)).scene;
 const box=new T.Box3().setFromObject(before),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),radius=Math.max(size.x,size.y,size.z);
 camera.position.copy(center).add(new T.Vector3(radius*.9,radius*1.2,radius*1.6));camera.lookAt(center);camera.updateProjectionMatrix();
 scene.add(before);read();const a=read(),beforeImage=renderer.domElement.toDataURL('image/png');scene.remove(before);scene.add(after);read();const b=read(),afterImage=renderer.domElement.toDataURL('image/png');scene.remove(after);
 scene.add(control);read();const reference=read();scene.remove(control);let controlDifference=0,controlMaxDelta=0;for(let i=0;i<a.length;i++)if(a[i]!==reference[i]){controlDifference++;controlMaxDelta=Math.max(controlMaxDelta,Math.abs(a[i]-reference[i]));}
 let different=0,maxDelta=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i]){different++;maxDelta=Math.max(maxDelta,Math.abs(a[i]-b[i]));}
 for(const model of [before,after,control])model.traverse(o=>{o.geometry?.dispose();for(const m of (Array.isArray(o.material)?o.material:o.material?[o.material]:[])){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}});
 return {name,different,maxDelta,controlDifference,controlMaxDelta,beforeImage,afterImage};
};window.ready=true;`;
const server=await createServer({root:'client',configFile:'client/vite.config.ts',logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false},plugins:[{name:'lossless-model-parity',resolveId(id){if(id==='/@model-parity.js')return '\0model-parity';},load(id){if(id==='\0model-parity')return fixture;},configureServer(s){s.middlewares.use('/model-parity',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<link rel="icon" href="data:,"><body style="margin:0"><script type="module" src="/@model-parity.js"></script>');});}}]});
await server.listen();const browser=await chromium.launch({channel:'chrome',headless:true}),report=[];
try{const p=await browser.newPage();p.on('console',m=>{if(m.type()==='error')console.error('BROWSER',m.text())});p.on('response',r=>{if(r.status()>=400)console.error('HTTP',r.status(),r.url())});p.setDefaultTimeout(120000);await p.goto('http://127.0.0.1:'+server.httpServer.address().port+'/model-parity');await p.waitForFunction(()=>window.ready);
 for(const name of names){const {beforeImage,afterImage,...r}=await p.evaluate(name=>window.compareModel(name),name);report.push(r);if(r.different||['board.glb','market.glb','shelf.glb'].includes(name))for(const [label,data]of Object.entries({before:beforeImage,after:afterImage}))await fs.writeFile(out+'/'+name+'-'+label+'.png',Buffer.from(data.split(',')[1],'base64'));console.log(r);assert(r.different<=r.controlDifference,name+' differs no more than reloading the original');}
}finally{await fs.writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();await server.close();}
