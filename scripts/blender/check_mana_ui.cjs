// Checks exported asset data and real WebGL state, not source-script text.
const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const validator=require(process.env.GLTF_VALIDATOR_MODULE||'/tmp/lore-mana-validator/node_modules/gltf-validator');
const OUT=process.env.MANA_OUT||path.resolve('docs/3d-assets/2026-09-20-blender-mana-ui');
const URL=process.env.MANA_URL||'http://127.0.0.1:6202/web/';
(async()=>{
 const report={date:new Date().toISOString(),glbs:[],statesTested:0,viewports:[],errors:[]};
 for(const file of fs.readdirSync(path.join(OUT,'web')).filter(n=>n.endsWith('.glb'))){
  const bytes=fs.readFileSync(path.join(OUT,'web',file));const r=await validator.validateBytes(new Uint8Array(bytes),{uri:file,maxIssues:1000});
  fs.writeFileSync(path.join(OUT,'checks',file+'.validation.json'),JSON.stringify(r,null,2));
  assert.equal(r.issues.numErrors,0,file);assert.equal(r.issues.numWarnings,0,file);
  const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));assert(!doc.images?.length,'Mana modules require no bitmap texture dependencies.');
  if(file==='mana-assembly.glb'){
   const slots=doc.nodes.filter(n=>n.extras?.role==='mana_slot');assert.equal(slots.length,20);
   assert.equal(doc.nodes.filter(n=>n.extras?.role==='dynamic_text').length,1);
   assert.deepEqual(slots.map(n=>n.extras.slot).sort((a,b)=>a-b),Array.from({length:20},(_,i)=>i+1));
  }
  if(file.startsWith('mana-crystal-')){
   const optical=doc.materials.filter(m=>m.extensions?.KHR_materials_transmission);
   assert.equal(optical.length,1,'Every cut uses one optical material, not painted facet colors.');
   assert(optical[0].extensions.KHR_materials_volume.thicknessFactor>0);
   assert(optical[0].extensions.KHR_materials_ior.ior>1.7);
   assert.equal(optical[0].pbrMetallicRoughness.metallicFactor,0);
  }
  report.glbs.push({file,bytes:bytes.length,errors:r.issues.numErrors,warnings:r.issues.numWarnings});
 }
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});
 await page.goto(URL);await page.waitForFunction(()=>window.manaQA?.ready,{timeout:90000});
 const checks=await page.evaluate(async()=>{
  const {primary:p,setMana,assets}=window.manaInspector;const results=[];
  const ready=[],spent=[];assets.ready.updateMatrixWorld(true);assets.spent.updateMatrixWorld(true);
  for(const [root,array] of [[assets.ready,ready],[assets.spent,spent]])root.traverse(o=>{if(o.isMesh)array.push(Array.from(o.geometry.attributes.position.array));});
  const geometrySame=JSON.stringify(ready)===JSON.stringify(spent);
  for(let max=0;max<=20;max++)for(let current=0;current<=max;current++){
   const s=setMana(current,max),boxes=s.positions.map(q=>({x0:q.x-.02954*q.scale/2,x1:q.x+.02954*q.scale/2,z0:q.z-.0422*q.scale/2,z1:q.z+.0422*q.scale/2}));
   const inside=boxes.every(b=>b.x0>=-.118-1e-7&&b.x1<=.118+1e-7&&b.z0>=-.026-1e-7&&b.z1<=.026+1e-7);
   const overlap=boxes.some((a,i)=>boxes.some((b,j)=>i<j&&a.x0<b.x1&&a.x1>b.x0&&a.z0<b.z1&&a.z1>b.z0));
   const counts={ready:p.batches.ready.map(m=>m.count),spent:p.batches.spent.map(m=>m.count)};
   results.push({current,max,inside,overlap,counts});
  }
  let rejected=0;for(const args of [[-1,4],[5,4],[1,21],[0,-1],[1.5,4],[1,1.5]])try{setMana(...args)}catch{rejected++}
  setMana(16,20);
  const c=p.text.material.map.image,g=c.getContext('2d'),data=g.getImageData(0,0,c.width,c.height).data;
  let ink={x0:c.width,y0:c.height,x1:0,y1:0};
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>0){ink.x0=Math.min(ink.x0,x);ink.y0=Math.min(ink.y0,y);ink.x1=Math.max(ink.x1,x);ink.y1=Math.max(ink.y1,y);}
  const cornersClear=[0,c.width-1,(c.height-1)*c.width,c.width*c.height-1].every(i=>data[i*4+3]===0);
  return {geometrySame,states:results,rejected,cornersClear,ink,texture:[c.width,c.height],bounds:{min:p.bounds().min.toArray(),max:p.bounds().max.toArray()}};
 });
 assert(checks.geometrySame,'Spent and available crystals must have identical geometry.');
 assert(checks.states.every(s=>s.inside&&!s.overlap&&s.counts.ready.every(c=>c===s.current)&&s.counts.spent.every(c=>c===s.max-s.current)),'Every resource state must fit and match visible gem counts.');
 assert.equal(checks.rejected,6);assert(checks.cornersClear);assert(checks.ink.x0>0&&checks.ink.y0>0&&checks.ink.x1<1023&&checks.ink.y1<511);
 assert(Math.abs((checks.bounds.max[0]-checks.bounds.min[0])-.350)<.0005);
 report.statesTested=checks.states.length;report.layout=checks;
 await page.locator('#empty').click();
 report.empty=await page.evaluate(()=>{const {primary:p,secondary:s}=window.manaInspector;return window.manaQA.empty&&!p.crystals.visible&&!p.text.visible&&!s.crystals.visible&&!s.text.visible&&p.tray.visible&&p.counter.visible});
 assert(report.empty,'Frame-only mode must hide both crystals and numbers on both sides.');
 await page.screenshot({path:path.join(OUT,'renders','08-empty-web.png')});
 await page.locator('[data-view="gem"]').click();
 report.optics=await page.evaluate(()=>{const {primary:p,renderer:r}=window.manaInspector;return {visible:p.crystals.visible,cut:p.batches.ready.find(m=>m.material.transmission>0).material.userData.opticalCut,programs:r.info.programs.map(p=>({runnable:p.diagnostics?.runnable??true}))}});
 assert(report.optics.visible&&report.optics.cut.planes>30&&report.optics.cut.bounces===6);
 assert(report.optics.programs.every(p=>p.runnable));
 await page.screenshot({path:path.join(OUT,'renders','web-crystal-detail.png')});
 await page.locator('[data-view="detail"]').click();
 for(const preset of [[1,1],[4,4],[7,10],[10,11],[16,20],[0,20]]){
  await page.evaluate(([c,m])=>window.manaInspector.setMana(c,m),preset);
  await page.screenshot({path:path.join(OUT,'renders',`web-mana-${preset[0]}-${preset[1]}.png`)});
 }
 await page.evaluate(()=>window.manaInspector.setMana(16,20));
 for(const view of ['detail','top','side','parts']){await page.locator(`[data-view="${view}"]`).click();await page.screenshot({path:path.join(OUT,'renders',`web-${view}.png`)});}
 for(const [width,height] of [[1920,1080],[1280,720],[1814,1274],[390,844]]){
  await page.setViewportSize({width,height});await page.locator('[data-view="board"]').click();
  const projection=await page.evaluate(()=>{
   const {primary:p,secondary:s,camera:c,renderer:r}=window.manaInspector;
   function rect(part){part.root.updateMatrixWorld(true);const box=part.bounds(),v=box.min.clone();let min=[1,1],max=[-1,-1];
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){v.set(x,y,z).project(c);min=[Math.min(min[0],v.x),Math.min(min[1],v.y)];max=[Math.max(max[0],v.x),Math.max(max[1],v.y)];}
    return {worldWidth:box.max.x-box.min.x,worldDepth:box.max.z-box.min.z,widthPx:(max[0]-min[0])*innerWidth/2,heightPx:(max[1]-min[1])*innerHeight/2,inside:min.every(n=>n>=-1)&&max.every(n=>n<=1)};}
   return {opponent:rect(p),player:rect(s),calls:r.info.render.calls};
  });
  assert(projection.opponent.inside&&projection.player.inside);assert(Math.abs(projection.opponent.worldWidth-projection.player.worldWidth)<1e-7);
  report.viewports.push({width,height,...projection});
  await page.screenshot({path:path.join(OUT,'renders',`web-board-${width}x${height}.png`)});
 }
 for(const [width,height] of [[1920,1080],[1280,720]]){
  await page.setViewportSize({width,height});await page.locator('[data-view="board"]').click();
  await page.evaluate(()=>{const {camera:c}=window.manaInspector;c.position.set(0,2.25738*Math.cos(Math.PI/10),2.25738*Math.sin(Math.PI/10));c.lookAt(0,0,0)});
  await page.screenshot({path:path.join(OUT,'renders',`runtime-game-${width}x${height}.png`)});
 }
 await page.setViewportSize({width:1920,height:1080});await page.locator('[data-view="board"]').click();
 await page.screenshot({path:path.join(OUT,'renders','web-board.png')});
 assert.equal(report.errors.length,0,report.errors.join('\n'));report.passed=true;
 fs.writeFileSync(path.join(OUT,'checks','webgl.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({passed:true,states:report.statesTested,glbs:report.glbs,viewports:report.viewports},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
