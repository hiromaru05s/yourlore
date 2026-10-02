const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.basename(__dirname)==='source'?path.resolve(__dirname,'..'):path.resolve(__dirname,'../../docs/3d-assets/2026-09-20-blender-deck-place');
const validator=require(process.env.GLTF_VALIDATOR_PATH||'/tmp/lore-mana-validator/node_modules/gltf-validator');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const validation={};
 for(const name of ['deck-place.glb','deck-place-lod1.glb']){
  const bytes=fs.readFileSync(path.join(base,'web',name));const result=await validator.validateBytes(new Uint8Array(bytes),{uri:name});validation[name]=result;
  assert.equal(result.issues.numErrors,0,`${name} glTF errors`);assert.equal(result.issues.numWarnings,0,`${name} glTF warnings`);
  const jsonLength=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+jsonLength).toString());
  assert(gltf.nodes.some(n=>n.name==='CARD_CONTACT'));assert(gltf.nodes.some(n=>n.name==='DRAW_ORIGIN'));
  assert(!gltf.nodes.some(n=>/reference|studio|camera|light/i.test(n.name||'')),'Reference content leaked into prop GLB');
 }
 fs.writeFileSync(path.join(base,'checks/gltf-validation.json'),JSON.stringify(validation,null,2));
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 try{
  await page.goto('http://127.0.0.1:6203/web/');await page.waitForFunction(()=>window.deckQA?.ready);await page.locator('#loading').waitFor({state:'hidden'});
  const report={errors,states:[],viewports:[],surface:await page.evaluate(async()=>{
   const THREE=await import('three'),a=window.deckInspector;
   const bounds=new THREE.Box3().setFromObject(a.primary),size=bounds.getSize(new THREE.Vector3());
   return {min:bounds.min.toArray(),max:bounds.max.toArray(),size:size.toArray()};
  })};
  for(const [i,value] of [.136,.0088,.198].entries())assert(Math.abs(report.surface.size[i]-value)<.000015,'Web dimensions differ from authored dimensions');
  for(const n of [0,1,20,40]){
   await page.locator(`[data-count="${n}"]`).click();const state=await page.evaluate(()=>{const a=window.deckInspector;return {count:window.deckQA.count,first:a.stacks[0].edges.count,secondVisible:a.stacks[1].root.visible};});
   assert.equal(state.first,n);assert.equal(state.secondVisible,false);report.states.push(state);
  }
  await page.locator('[data-count="0"]').click();await page.screenshot({path:path.join(base,'checks/web-empty-1920.png')});
  await page.locator('[data-count="20"]').click();await page.locator('[data-view="side"]').click();await page.screenshot({path:path.join(base,'checks/web-side-1920.png')});
  for(const vp of [{width:1920,height:1080},{width:1280,height:720},{width:390,height:844}]){
   await page.setViewportSize(vp);
   for(const view of ['detail','board']){
    await page.locator(`[data-view="${view}"]`).click();await page.waitForFunction(()=>window.deckQA.view===document.querySelector('[data-view][aria-pressed="true"]').dataset.view);
    const state=await page.evaluate(async()=>{const THREE=await import('three'),a=window.deckInspector,onBoard=window.deckQA.view==='board';a.scene.updateMatrixWorld(true);a.camera.updateMatrixWorld(true);
     const box=new THREE.Box3().setFromObject(onBoard?a.board:a.primary),ndc=[];
     for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])ndc.push(new THREE.Vector3(x,y,z).project(a.camera).toArray());
     return {ndc,secondVisible:a.secondary.visible,cardsVisible:a.stacks[1].root.visible,deckPositions:[a.primary.position.toArray(),a.secondary.position.toArray()],orientation:[a.primary.quaternion.toArray(),a.secondary.quaternion.toArray()]};
    });
    assert(state.ndc.every(p=>Math.abs(p[0])<1&&Math.abs(p[1])<1),'Model clips viewport');
    if(view==='board'){assert(state.secondVisible&&state.cardsVisible);assert.deepEqual(state.deckPositions,[[.54,0,.245],[.54,0,-.245]]);assert.deepEqual(state.orientation[0],state.orientation[1]);}
    report.viewports.push({viewport:vp,view,...state});await page.screenshot({path:path.join(base,`checks/web-${view}-${vp.width}.png`)});
   }
  }
  assert.deepEqual(errors,[]);report.passed=true;fs.writeFileSync(path.join(base,'checks/browser-validation.json'),JSON.stringify(report,null,2));console.log('VALIDATION_PASSED',JSON.stringify({models:Object.keys(validation),viewports:report.viewports.length,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
