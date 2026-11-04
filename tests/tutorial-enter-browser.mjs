import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const fixture=`
import {TutorialSpotlight} from '/src/ui/tutorialSpotlight.ts';
import {setLang} from '/src/i18n.ts';
import '/src/styles/defaultButtons.css';
setLang(new URL(location.href).searchParams.get('lang')||'ja');
const c={ja:'ここを見てね。',en:'Look here.',ko:'여기를 봐 줘.'};
const root=document.querySelector('main');
const steps=[
 {selector:'#a',title:c,body:c},
 {selector:'#b',title:c,body:c},
 {selector:'#a',title:c,body:c,action:'click'},
 {selector:'#input',title:c,body:c,enableOn:{selector:'#input',event:'input'}},
 {selector:'#a',title:c,body:c,suspendForDialog:true},
 {selector:'#b',title:c,body:c},
];
let tour;const mount=i=>tour=new TutorialSpotlight(root,steps,{label:c,startIndex:i,onStep(){},previousStep:i=>i-1,rewind:i=>{tour.destroy();mount(i);},onExit(){},onComplete(){window.complete=true;}});mount(0);
window.openDialog=()=>document.querySelector('dialog').showModal();
window.dispose=()=>tour.destroy();
`;
const html='<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#304152}button,input{font-size:16px}#a{position:fixed;top:20px;left:20px;width:70px;height:55px}#b{position:fixed;right:20px;bottom:20px;width:70px;height:55px}#input{position:fixed;left:20px;top:45%;width:130px}</style></head><body><main><button id="a">A</button><button id="b">B</button><input id="input" aria-label="Input"><dialog><input aria-label="Dialog input"><button onclick="this.closest(\'dialog\').close()">Close</button></dialog></main><script type="module" src="/@enter.js"></script></body></html>';
const server=await createServer({root:'client',configFile:'client/vite.config.ts',logLevel:'error',plugins:[{name:'enter-fixture',resolveId(id){if(id==='/@enter.js')return '\0enter';},load(id){if(id==='\0enter')return fixture;},configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url?.startsWith('/enter-qa')){res.setHeader('Content-Type','text/html');res.end(html);}else next();});}}],server:{host:'127.0.0.1',port:0,hmr:false}});await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true}),out=process.env.TUTORIAL_QA_DIR||'docs/releases/2026-11-04-tutorial-guide/keyboard';await fs.mkdir(out,{recursive:true});
const results=[];
try{
 for(const [width,lang,reduced] of [[1280,'ja',false],[1024,'ko',false],[390,'en',false],[390,'ko',true]]){
  const context=await browser.newContext({viewport:{width,height:800},reducedMotion:reduced?'reduce':'no-preference'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(server.resolvedUrls.local[0]+'enter-qa?lang='+lang);
  const layer=page.locator('.tutorial-part-tour'),next=page.locator('.tutorial-tour-next');await next.waitFor();await page.waitForTimeout(800);
  const step=()=>layer.getAttribute('data-step');
  await page.locator('.tutorial-tour-bubble p').click();assert.equal(await step(),'0','bubble click cannot advance');
  await page.mouse.move(0,0);
  await page.evaluate(()=>{document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true}));});assert.equal(await step(),'0','IME confirmation cannot advance');
  await page.keyboard.press('Control+Enter');assert.equal(await step(),'0','modified Enter cannot advance');
  await page.evaluate(()=>{
   window.samples=[];const start=performance.now();
   const sample=()=>{const el=document.querySelector('.tutorial-tour-coach'),b=el.getBoundingClientRect();window.samples.push({t:performance.now()-start,x:b.x,y:b.y,step:document.querySelector('.tutorial-part-tour').dataset.step});if(performance.now()-start<850)requestAnimationFrame(sample);};sample();
  });
  await page.keyboard.down('Enter');await page.keyboard.down('Enter');await page.keyboard.up('Enter');assert.equal(await step(),'1','held Enter advances once');await page.waitForTimeout(900);
  const samples=await page.evaluate(()=>window.samples),moving=samples.filter(s=>s.step==='1'),first=moving[0],last=moving.at(-1),distance=p=>Math.hypot(p.x-last.x,p.y-last.y);
  if(!reduced){assert(distance(first)>30,'companion travels to the new target');const early=moving.find(s=>s.t-first.t>=180),late=moving.find(s=>s.t-first.t>=380);assert(distance(early)<distance(first)*.35,'fast initial travel');assert(distance(late)<distance(early),'arrival decelerates');}else assert(distance(first)<1,'reduced motion places directly');
  const bounds=await page.locator('.tutorial-tour-coach').boundingBox();assert(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=801,'coach stays in viewport');
  await page.screenshot({path:out+'/'+lang+'-'+width+'-'+reduced+'.png'});
  await page.locator('.tutorial-tour-back').focus();await page.keyboard.press('Enter');assert.equal(await step(),'0','focused Back keeps native keyboard behavior');
  await page.keyboard.press('Enter');assert.equal(await step(),'1');await page.keyboard.press('Enter');assert.equal(await step(),'2');
  await page.keyboard.press('Enter');assert.equal(await step(),'2','required action cannot be skipped');
  await page.locator('#a').click();await page.waitForFunction(()=>document.querySelector('.tutorial-part-tour').dataset.step==='3');assert(await next.isDisabled());
  await page.keyboard.press('Enter');assert.equal(await step(),'3','locked message cannot advance');
  await page.locator('#input').fill('hello');await page.keyboard.press('Enter');assert.equal(await step(),'3','editing input owns Enter');
  await page.locator('#input').evaluate(e=>e.blur());await page.keyboard.press('Enter');assert.equal(await step(),'4');
  await page.evaluate(()=>window.openDialog());await page.keyboard.press('Enter');assert.equal(await step(),'4','dialog owns Enter');await page.locator('dialog button').click();
  await page.keyboard.press('Enter');assert.equal(await step(),'5');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(50);
  assert.equal(await page.locator('.tutorial-tour-coach').evaluate(e=>e.getAnimations().filter(a=>a.playState==='running').length),0);
  await page.keyboard.press('Enter');assert(await page.evaluate(()=>window.complete));assert.equal(await layer.count(),0);assert.equal(await page.locator('.tutorial-action-guide').count(),0);
  await page.keyboard.press('Enter');assert.deepEqual(errors,[]);
  results.push({width,lang,reduced,samples,errors});await context.close();
 }
 await fs.writeFile(out+'/report.json',JSON.stringify(results,null,2));console.log('PASS Enter, repeat/IME/modifier/input/dialog guards, required actions, Back, cleanup, easing and reduced motion in ja/en/ko at 1280/1024/390');
}finally{await browser.close();await server.close();}
