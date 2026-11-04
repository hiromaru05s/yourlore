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
const out=process.env.TUTORIAL_QA_DIR||'docs/qa/tutorial-basics-browser';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const width of (process.env.TUTORIAL_WIDTHS||'1280,1024').split(',').map(Number)){
  const context=await browser.newContext({viewport:{width,height:800}}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:5299/parts-qa');
  await p.locator('#continuePart').click();await p.locator('.game-loading').waitFor({state:'hidden'});
  let inspectedDuringPlay=false;
  for(let moves=0;moves<100&&!await p.locator('.tutorial-basics-clear').count();moves++){
   const layer=p.locator('.tutorial-part-tour'),{index,action}=await layer.evaluate(e=>({index:e.dataset.step,action:e.dataset.action}));
   console.log(width,index,action);
   const target=p.locator('.tutorial-tour-target');
   if(action==='next'){
    await p.waitForFunction(i=>document.querySelector('.tutorial-part-tour')?.dataset.step!==i||!!document.querySelector('.tutorial-tour-next:not([disabled])'),index);
    if(await layer.getAttribute('data-step')!==index)continue;
    assert.match(await p.locator('.tutorial-enter-hint').innerText(),/Enter/);
    if(index==='0'){
     await p.waitForTimeout(800);await p.screenshot({path:out+'/goal-'+width+'.png'});
     await p.keyboard.down('Enter');await p.keyboard.down('Enter');await p.keyboard.up('Enter');
     assert.equal(await layer.getAttribute('data-step'),'1','held Enter advances exactly once');
     await p.waitForTimeout(800);await p.screenshot({path:out+'/self-'+width+'.png'});
    }else await p.keyboard.press('Enter');
   }
   else if(action==='inspect'){
    await p.keyboard.press('Enter');assert.equal(await layer.getAttribute('data-step'),index,'Enter cannot skip inspection');
    await target.click({button:'right'});
   }
   else if(action==='click'){
    await p.keyboard.press('Enter');assert.equal(await layer.getAttribute('data-step'),index,'Enter cannot skip required click');
    await target.click();
   }
   else{
    if(index==='11'){await p.keyboard.press('Enter');assert.equal(await layer.getAttribute('data-step'),index,'Enter cannot skip the summon');}
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
    const source=p.locator('.tutorial-action-guide:not([hidden]) .tutorial-action-ring');
    await p.waitForFunction(i=>document.querySelector('.tutorial-part-tour')?.dataset.step!==i||document.querySelector('.tutorial-action-guide:not([hidden]) .tutorial-action-ring')?.getBoundingClientRect().width>0,index);
    if(await layer.getAttribute('data-step')!==index)continue;
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
