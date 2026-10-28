import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createServer} from 'vite';
const fixture=`
import '/src/main.ts';
import {App} from '/src/router.ts';
import {TutorialPartController} from '/src/game/tutorialParts.ts';
import {TUTORIAL_PARTS} from '/src/shared/tutorialParts.ts';
import {mountTutorial} from '/src/screens/tutorial.ts';
import {startBoardLayout} from '/src/ui/layout.ts';
import {mountLounge} from '/src/ui/lounge.ts';
import {setLang} from '/src/i18n.ts';
import {api} from '/src/net/api.ts';
import {botActions,actionChangesState} from '/src/shared/botActions.ts';
import {tutorialActionAllowed} from '/src/shared/tutorialLesson.ts';
import {reduce} from '/src/shared/engine.ts';
setLang('ja');localStorage.setItem('lore_help_callout_seen',new Date().toISOString().slice(0,10));
api.rankMe=async()=>null;api.profile=async()=>({self:true,display:'QA',stats_public:true});
const root=document.querySelector('#app'),app=new App(root);app.user={id:'local-guest-user',display:'QA',credits:0};
let ctrl,screen,layout,lounge,part=-1;
const clear=()=>{screen?.destroy?.();screen=null;layout?.();layout=null;ctrl?.destroy();ctrl=null;lounge?.();lounge=null;root.replaceChildren();root.className='';};
app.tutorial=()=>{clear();part=-1;screen=mountTutorial(app);lounge=mountLounge(app,'tutorial');};
app.tutorialPart=i=>{clear();part=i;const host=document.createElement('div');root.append(host);ctrl=new TutorialPartController(host,{onHome:()=>app.tutorial(),onRematch:()=>app.tutorialPart(i)},i,n=>n<TUTORIAL_PARTS.length?app.tutorialPart(n):app.tutorial(),app.user.id);layout=startBoardLayout();};
app.tutorial();
`;
const server=await createServer({root:'client',configFile:'client/vite.config.ts',logLevel:'error',plugins:[{name:'parts-fixture',resolveId(id){if(id==='/@parts-fixture.js')return '\0parts';},load(id){if(id==='\0parts')return fixture;},configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url==='/parts-qa'){res.setHeader('Content-Type','text/html');res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div><script type="module" src="/@parts-fixture.js"></script></body></html>');}else next();});}}],server:{host:'127.0.0.1',port:5299,strictPort:true,hmr:false}});await server.listen();

// Optional browser regression (not part of the fast production suite).
// Every move goes through rendered controls; no controller/state injection.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const out='docs/qa/tutorial-basics-browser';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const width of [1280,1024]){
  const context=await browser.newContext({viewport:{width,height:800}}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:5299/parts-qa');
  await p.locator('#continuePart').click();await p.locator('.game-loading').waitFor({state:'hidden'});
  let inspectedDuringPlay=false;
  for(let moves=0;moves<100&&!await p.locator('.tutorial-basics-clear').count();moves++){
   const layer=p.locator('.tutorial-part-tour'),index=await layer.getAttribute('data-step'),action=await layer.getAttribute('data-action');
   const target=p.locator('.tutorial-tour-target');
   if(action==='next')await p.locator('.tutorial-tour-next:not([disabled])').click();
   else if(action==='inspect')await target.click({button:'right'});
   else if(action==='click')await target.click();
   else{
    if(!inspectedDuringPlay&&await target.evaluate(e=>!!e.closest('#hand'))){
     await target.click({button:'right'});
     const modal=p.locator('#zoomOverlay .zoom-wrap');
     await modal.waitFor({state:'visible'});
     await p.waitForFunction(()=>{
      const modal=document.querySelector('#zoomOverlay .zoom-wrap')?.getBoundingClientRect(),ring=document.querySelector('.tutorial-tour-ring')?.getBoundingClientRect();
      return modal&&ring&&['left','top','right','bottom'].every(side=>Math.abs(modal[side]-ring[side])<=6);
     });
     await p.screenshot({path:out+'/inspection-during-play-'+width+'.png'});
     await p.locator('#zoomOverlay .inspect-close').press('Escape');inspectedDuringPlay=true;
    }
    const source=p.locator('.tutorial-action-guide:not([hidden]) .tutorial-action-ring');await source.waitFor({state:'visible'});
    const a=await source.boundingBox(),drop=p.locator('.tutorial-action-guide:not([hidden]) .tutorial-drop-ring:not([hidden])');
    if(await drop.count()){
     const b=await drop.boundingBox();await p.mouse.move(a.x+a.width/2,a.y+a.height/2);await p.mouse.down();await p.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:16});await p.mouse.up();
     const choice=p.locator('.cast-review');
     if(await choice.count()){await choice.locator('[data-choice]').click();await choice.locator('.btn-gold').click();}
    }else if(await target.evaluate(e=>!!e.closest('#fixedMarket,#supplyMarket')))await target.dblclick();
    else await target.click();
   }
   await p.waitForFunction(i=>!document.querySelector('.tutorial-part-tour')||document.querySelector('.tutorial-part-tour').dataset.step!==i,index,{timeout:20000});
  }
  assert(await p.locator('.tutorial-basics-clear').isVisible(),'tutorial completes');assert.equal(errors.length,0,errors.join('\n'));
  await p.screenshot({path:out+'/complete-'+width+'.png'});await context.close();
 }
 console.log('PASS basic tutorial browser: complete visible-control walkthrough at 1280 and 1024');
}finally{await browser.close();await server.close();}
