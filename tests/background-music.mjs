import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { JSDOM } from 'jsdom';
const dir=await mkdtemp(tmpdir()+'/lore-music-');
const dom=new JSDOM('',{url:'https://lore.test',pretendToBeVisual:true});
for(const k of ['window','document','localStorage','Event'])globalThis[k]=dom.window[k];
let now=0,hidden=false,next=0,rejectPlay=false;
Object.defineProperty(document,'hidden',{get:()=>hidden});
const timers=new Map(),tracks=[];
globalThis.performance={now:()=>now};
globalThis.setTimeout=(fn,ms)=>{timers.set(++next,{fn,at:now+ms});return next;};
globalThis.clearTimeout=id=>timers.delete(id);
class Audio extends dom.window.EventTarget {
  paused=true;ended=false;currentTime=0;preload='';plays=[];loads=0;
  constructor(src){super();this.src=src;tracks.push(this);}
  load(){this.loads++;}
  pause(){this.paused=true;}
  removeAttribute(){this.src='';}
  play(){this.plays.push(now);if(rejectPlay)return Promise.reject(Error('Autoplay blocked'));this.paused=false;return Promise.resolve();}
}
globalThis.Audio=Audio;
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const tick=async ms=>{now+=ms;for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.fn();}await flush();};
const event=name=>document.dispatchEvent(new Event(name));
try{
  await build({stdin:{contents:"export * from './client/src/ui/backgroundMusic'; export {setSfxVolume} from './client/src/ui/sound';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:dir+'/module.mjs'});
  const {startBackgroundMusic:start,setSfxVolume:volume}=await import(dir+'/module.mjs');
  const opts={url:'/home.mp3',gain:.5,ready:false,preload:true,startDelayMs:600};
  let stop=start(opts),a=tracks.at(-1);
  assert.equal(a.preload,'auto');assert.equal(a.loads,1);assert.equal(a.plays.length,0);
  await tick(5000);assert.equal(a.plays.length,0,'loading artwork must stay silent');
  event('lore:screen-ready');await tick(300);event('lore:screen-ready');event('pointerdown');
  await tick(299);assert.equal(a.plays.length,0,'gesture cannot skip the pause');
  await tick(1);assert.deepEqual(a.plays,[5600],'ready is a one-shot deadline');
  volume(0);assert(a.paused);volume(.7);await flush();assert(!a.paused);
  hidden=true;event('visibilitychange');assert(a.paused);hidden=false;event('visibilitychange');await flush();assert(!a.paused);
  stop();assert(a.paused);assert.equal(a.src,'');

  stop=start(opts);a=tracks.at(-1);event('lore:screen-ready');await tick(200);stop();await tick(1000);assert.equal(a.plays.length,0,'navigation cancels delayed start');
  const count=tracks.length;volume(0);stop=start(opts);assert.equal(tracks.length,count,'muted startup does not preload');
  event('lore:screen-ready');await tick(1000);volume(.7);await flush();a=tracks.at(-1);assert(!a.paused);stop();

  rejectPlay=true;stop=start({...opts,ready:true});a=tracks.at(-1);await tick(600);assert(a.paused);
  rejectPlay=false;event('pointerdown');await flush();assert(!a.paused,'blocked autoplay retries on the next gesture');stop();

  stop=start({url:'/battle.mp3',gain:.3,gapMs:3000,intro:{url:'/intro.mp3',durationSeconds:6.52}});
  a=tracks.at(-1);await flush();assert.equal(a.src,'/intro.mp3');assert(!a.paused,'battle intro retains immediate start');
  a.dispatchEvent(new Event('ended'));await flush();a=tracks.at(-1);assert.equal(a.src,'/battle.mp3');assert(!a.paused);
  a.paused=true;a.ended=true;a.dispatchEvent(new Event('ended'));await tick(2999);event('pointerdown');assert(a.paused);await tick(1);assert(!a.paused,'battle loop retains three-second gap');stop();
  console.log('PASS music preload, ready deadline, mute/visibility, navigation cancellation, autoplay retry, unchanged battle intro and loop');
}finally{await rm(dir,{recursive:true,force:true});dom.window.close();}
