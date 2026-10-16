import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();await page.route('**/amethyst-asset-generator',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));await page.goto((process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5635')+'/amethyst-asset-generator');
 const images=await page.evaluate(async()=>{
  const T=await import('/node_modules/.vite/deps/three.js');
  const {sleeveArt}=await import('/src/ui/cosmetics/amethyst/art.ts');
  const {amethystFurniture}=await import('/src/ui/cosmetics/amethyst/furniture.ts');
  const art=sleeveArt();art.paint(1.5);const sleeve=art.canvas.toDataURL('image/png');art.dispose();
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(1280,800);renderer.toneMapping=T.AgXToneMapping;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1.6,.01,100);camera.position.set(0,4.5,4.9);camera.lookAt(0,0,0);
  const {RoomEnvironment}=await import('/node_modules/.vite/deps/three_examples_jsm_environments_RoomEnvironment__js.js');
  const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),env=pmrem.fromScene(room,.04);scene.environment=env.texture;scene.environmentIntensity=.55;
  const key=new T.DirectionalLight('#ffeed9',2.3);key.position.set(-3,6,4);scene.add(key);const fill=new T.DirectionalLight('#c4daff',.7);fill.position.set(4,3,-3);scene.add(fill);
  const objects=[amethystFurniture(false),amethystFurniture(true)];objects.forEach((o,i)=>{o.tick(1.5);o.group.position.x=i?1.03:-1.03;scene.add(o.group);});renderer.render(scene,camera);const furniture=renderer.domElement.toDataURL('image/png');objects.forEach(o=>o.dispose());env.dispose();room.dispose();pmrem.dispose();renderer.dispose();return {sleeve,furniture};
 });
 const out='client/public/cosmetics/amethyst-cleft-v1';await fs.mkdir(out,{recursive:true});for(const [key,data]of Object.entries(images))await fs.writeFile(out+'/'+key+'.png',Buffer.from(data.split(',')[1],'base64'));console.log('Authored sleeve and furniture snapshots saved.');
}finally{await browser.close();}
