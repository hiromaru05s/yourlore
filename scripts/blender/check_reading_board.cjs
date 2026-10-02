// Integration-level asset check: load the shipped GLBs in an actual WebGL renderer.
const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const OUT=process.env.BOARD_OUT||path.resolve('docs/3d-assets/2026-09-15-blender-reading-board');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(process.env.BOARD_URL||'http://127.0.0.1:6197');await page.waitForFunction(()=>window.boardQA?.ready,{timeout:90000});
 const report={testedAt:new Date().toISOString(),engine:await browser.version(),levels:[],resolutions:[],errors};
 for(const level of ['lod0','lod1']){
  if(level==='lod1'){await page.selectOption('#lod',level);await page.waitForFunction(l=>window.boardQA?.level===l,level,{timeout:90000});}
  const data=await page.evaluate(()=>{
   const i=window.boardInspector,m=i.model,qa=structuredClone(window.boardQA),holes=[i.ray(.725,.245),i.ray(.725,-.245),i.ray(.70,0)];
   const anchors=[];m.traverse(o=>{if(o.userData.role==='attachment_anchor')anchors.push({name:o.name,position:o.position.toArray(),id:o.userData.anchor_name})});
   const supports=qa.proxyPositions.map(p=>{const hit=i.ray(p.x,p.z)[0];return {x:p.x,z:p.z,requestedHeight:p.y,actualTop:hit?.y,clearance:hit?p.y-hit.y:null}});
   return {qa,holes,anchors,supports};
  });
  assert(data.qa.triangles<(level==='lod0'?80000:25000),'triangle budget');assert.equal(data.qa.meshes,6);
  assert.equal(data.anchors.length,26,'26 stable attachment anchors');assert(data.anchors.every(a=>a.name==='ANCHOR_'+a.id),'stable anchor names');
  assert(data.holes.every(h=>h.length===0),'all three sockets must remain through-holes');
  assert(data.supports.every(h=>h.clearance!==null&&h.clearance>=-.0003&&h.clearance<.004),'card support height');
  assert(data.qa.bounds.max[0]-data.qa.bounds.min[0]<1.602);assert(data.qa.bounds.max[2]-data.qa.bounds.min[2]<.952);
  report.levels.push(data);
 }
 await page.selectOption('#lod','lod0');await page.waitForFunction(()=>window.boardQA.level==='lod0');
 for(const [width,height] of [[1920,1080],[1280,720],[1814,1274]]){
  await page.setViewportSize({width,height});await page.locator('[data-view="game"]').click();
  const layout=await page.evaluate(()=>{
   const i=window.boardInspector,c=i.camera,r=i.renderer;const clone=c.position.clone();
   const a=clone.clone().set(-.055,.016,0).project(c),b=clone.clone().set(.055,.016,0).project(c);
   return {distance:c.position.length(),centerCardWidthPx:(b.x-a.x)*innerWidth/2,viewport:[innerWidth,innerHeight],calls:r.info.render.calls};
  });report.resolutions.push(layout);
  await page.screenshot({path:path.join(OUT,'renders',`web-${width}x${height}.png`)});
 }
 await page.setViewportSize({width:1920,height:1080});await page.locator('[data-view="game"]').click();await page.locator('#cards').click();
 await page.screenshot({path:path.join(OUT,'renders','10-layout-capacity.png')});await page.locator('#cards').click();
 for(const v of ['angle','right','under']){await page.locator(`[data-view="${v}"]`).click();await page.screenshot({path:path.join(OUT,'renders',`web-${v}.png`)});}
 await page.locator('#wire').click();await page.screenshot({path:path.join(OUT,'renders','11-web-wireframe.png')});
 assert(errors.length===0,errors.join('\n'));report.passed=true;
 fs.writeFileSync(path.join(OUT,'checks','webgl-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,levels:report.levels.map(x=>({level:x.qa.level,triangles:x.qa.triangles,anchors:x.anchors.length})),resolutions:report.resolutions}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
