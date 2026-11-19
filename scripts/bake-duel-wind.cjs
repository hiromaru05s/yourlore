// Bake the live confrontation rig, then encode the two mirrored GIF directions.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.js node scripts/bake-duel-wind.cjs
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs/promises');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=process.cwd(),origin=process.env.LORE_TEST_ORIGIN||'http://127.0.0.1:5278';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=metal']});
 try{
  const page=await browser.newPage({viewport:{width:896,height:896}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL/.test(m.text()))errors.push(m.text())});
  await page.route('**/wind-baker',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><body style="margin:0;background:transparent"></body>'}));
  await page.goto(origin+'/wind-baker');
  await page.evaluate(async()=>{const {createDuelWind}=await import('/src/ui/opening/windPortraits.ts');window.windBaker=createDuelWind();await window.windBaker.load(['SEEKER_BLUE','NPC_LUMI','NPC_NOEL','NPC_VERA']);});
  for(const [key,avatar] of [['seeker','SEEKER_BLUE'],['lumi','NPC_LUMI'],['noel','NPC_NOEL'],['vera','NPC_VERA']].filter(([key])=>!process.env.WIND_BAKE_KEYS||process.env.WIND_BAKE_KEYS.split(',').includes(key))){
   const frames=path.join(root,'docs/vfx-prototypes/2026-11-18-opening-flame/qa/wind-v5-frames',key);
   await fs.mkdir(frames,{recursive:true});
   for(let i=0;i<48;i++){
    const data=await page.evaluate(({avatar,time})=>{const frame=window.windBaker.frame(avatar,time);if(!(frame instanceof HTMLCanvasElement))throw Error('GPU wind frame unavailable '+avatar);return frame.toDataURL('image/png').split(',')[1]},{avatar,time:i/20});
    await fs.writeFile(path.join(frames,`${String(i).padStart(3,'0')}.png`),Buffer.from(data,'base64'));
   }
   for(const direction of ['right','left']){
    const flip=direction==='left'?',hflip':'';
    const output=path.join(root,`client/public/art/duel-portraits/${['noel','vera'].includes(key)?'wind-npcs-v1':'wind-v5'}/${key}-${direction}.gif`);
    execFileSync('ffmpeg',['-loglevel','error','-y','-framerate','20','-i',frames+'/%03d.png','-filter_complex',`[0:v]scale=768:768:flags=lanczos${flip},split[a][b];[a]palettegen=reserve_transparent=1:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:alpha_threshold=128`,'-loop','0',output],{timeout:120000});
    console.log(output);
   }
  }
  const loops=await page.evaluate(()=>{let result={};for(const avatar of ['SEEKER_BLUE','NPC_LUMI','NPC_NOEL','NPC_VERA']){const a=window.windBaker.frame(avatar,0).toDataURL(),b=window.windBaker.frame(avatar,2.4).toDataURL();result[avatar]=a===b;}window.windBaker.dispose();return result;});
  await fs.writeFile(path.join(root,'docs/vfx-prototypes/2026-11-19-opening-release/bake.json'),JSON.stringify({errors,loopSeamsEqual:loops,frames:48,fps:20,size:768},null,2));
  if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({errors,loopSeamsEqual:loops}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
