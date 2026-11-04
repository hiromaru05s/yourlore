import fs from 'node:fs/promises';
import {createServer} from 'vite';
const {chromium}=await import('/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const source=await fs.readFile('tests/tutorial-parts-browser.mjs','utf8');
const fixture=source.split('const fixture=`')[1].split('`;\nconst server=')[0].replace("setLang('ja')","setLang(new URL(location.href).searchParams.get('lang')||'ja')");
const server=await createServer({root:'client',configFile:'client/vite.config.ts',logLevel:'error',plugins:[{name:'review',resolveId(id){if(id==='/@review.js')return '\0review';},load(id){if(id==='\0review')return fixture;},configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url?.startsWith('/review')){res.setHeader('Content-Type','text/html');res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div><script type="module" src="/@review.js"></script></body></html>');}else next();});}}],server:{host:'127.0.0.1',port:5307,strictPort:true,hmr:false}});await server.listen();
const out='docs/releases/2026-11-04-tutorial-guide/visual';await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),reports=[];
try{for(const [width,lang] of [[1280,'ko'],[390,'ko'],[320,'en']]){
 const ctx=await browser.newContext({viewport:{width,height:800},...(width===1280?{recordVideo:{dir:out,size:{width:1280,height:800}}}:{})}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:5307/review?lang='+lang);await p.locator('#continuePart').click();await p.locator('.game-loading').waitFor({state:'hidden',timeout:90000});await p.locator('.tutorial-tour-next:not([disabled])').waitFor({timeout:90000});await p.waitForTimeout(900);
 for(let i=0;i<5;i++){
  await p.screenshot({path:out+'/'+lang+'-'+width+'-step'+i+'.png'});
  reports.push({width,lang,step:i,coach:await p.locator('.tutorial-tour-coach').boundingBox(),target:await p.locator('.tutorial-tour-target').boundingBox(),errors});
  await p.keyboard.press('Enter');await p.waitForTimeout(1000);
 }
 const video=width===1280?p.video():null;await ctx.close();if(video)await video.saveAs(out+'/zeno-flight-1280.webm');
}await fs.writeFile(out+'/report.json',JSON.stringify({sourceRoot:process.cwd(),url:'http://127.0.0.1:5307/review',reports},null,2));}finally{await browser.close();await server.close();}
