import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const temp=await mkdtemp(path.join(tmpdir(),'lore-startup-'));
const dom=new JSDOM('<body></body>',{url:'https://test.yourlore.xyz/'});
for(const key of ['document','window','location','localStorage','MutationObserver'])globalThis[key]=dom.window[key];
Object.defineProperty(globalThis,'navigator',{value:{language:'ja-JP'},configurable:true});
const timer=globalThis.setTimeout;
globalThis.setTimeout=(fn,ms,...args)=>timer(fn,ms===800?15:ms===15000?40:ms,...args);
const sleep=ms=>new Promise(r=>timer(r,ms));
try {
 await build({entryPoints:['client/src/startupLanguage.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'language.mjs')});
 const {startupLanguage}=await import(path.join(temp,'language.mjs'));
 let requests=0,signal;
 globalThis.fetch=(_url,options)=>{requests++;signal=options.signal;return new Promise(()=>{});};
 localStorage.setItem('lore_lang','ko');assert.equal(await startupLanguage(),'ko');assert.equal(requests,0);
 localStorage.clear();assert.equal(await startupLanguage(),'ja');assert(signal.aborted,'abort stalled geography, even if fetch ignores its signal');
 globalThis.fetch=async()=>({ok:true,json:()=>new Promise(()=>{})});assert.equal(await startupLanguage(),'ja','headers without a completed body cannot hold startup');
 globalThis.fetch=async()=>({ok:true,json:async()=>({country:'KR'})});assert.equal(await startupLanguage(),'ko');
 globalThis.fetch=async()=>({ok:false});assert.equal(await startupLanguage(),'ja');
 globalThis.fetch=async()=>{throw Error('offline');};assert.equal(await startupLanguage(),'ja');
 // Startup must distinguish an unavailable session service from a logged-out user.
 await build({stdin:{contents:"export {api} from './client/src/net/api';export {t} from './client/src/i18n';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'api.mjs')});
 const {api,t}=await import(path.join(temp,'api.mjs'));
 globalThis.fetch=async()=>new Response('{"user":null}',{status:200});assert.equal(await api.me({strict:true}),null);
 globalThis.fetch=async()=>new Response('{"error":"unavailable"}',{status:503});await assert.rejects(api.me({strict:true}));assert.equal(await api.me(),null);
 globalThis.fetch=async()=>new Response('{}',{status:200});await assert.rejects(api.me({strict:true}),e=>e.message===t('login.err.generic'));
 globalThis.fetch=(_url,{signal})=>new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true});});
 const session=new AbortController(),pendingSession=api.me({strict:true,signal:session.signal});session.abort();await assert.rejects(pendingSession,/aborted/);
 // Run the actual tiny entry, substituting only the large application dependency.
 globalThis.fetch=async url=>({ok:true,json:async()=>url==='/api/auth/me'?{user:null}:{country:'JP'}});
 let starts=0;globalThis.startStub=async (language,session)=>{starts++;assert.equal(language,'ja');assert.equal(session,null);};
 for(const fail of [false,true]){
  document.body.innerHTML='<section id="startup"><p id="startup-status"></p><a id="startup-reload" href=""></a></section><div id="app"></div>';
  const output=path.join(temp,`boot-${fail}.mjs`);
  await build({entryPoints:['client/src/startup.ts'],bundle:true,platform:'node',format:'esm',outfile:output,plugins:[{name:'app',setup(b){b.onResolve({filter:/^\.\/main$/},()=>({path:'app',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:fail?`throw Error('module download failed');export async function start(){}`:`export const start=globalThis.startStub;`}));}}]});
  const error=console.error;console.error=()=>{};await import(output);await sleep(5);console.error=error;
  assert.equal(!!document.querySelector('#startup'),fail);if(fail){assert.equal(document.querySelector('#startup').dataset.startupError,'true');assert.match(document.querySelector('#startup-status').textContent,/起動できません/);}
 }
 assert.equal(starts,1);
 globalThis.mounts=0;globalThis.disposals=0;
 await build({entryPoints:['client/src/ui/homeAtmosphereLoader.ts'],bundle:true,platform:'node',format:'esm',outfile:path.join(temp,'atmosphere.mjs'),plugins:[{name:'scene',setup(b){b.onResolve({filter:/^\.\/homeAtmosphere$/},()=>({path:'scene',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:`export function mountHomeAtmosphere(host){globalThis.mounts++;if(globalThis.sceneReady)host.dataset.atmosphere='ready';return()=>globalThis.disposals++;}`}));}}]});
 const {loadHomeAtmosphere}=await import(path.join(temp,'atmosphere.mjs'));
 const host=()=>{const el=document.createElement('div');document.body.append(el);return el;};
 const stalled=host(),abort=new AbortController();loadHomeAtmosphere(stalled,abort.signal);await sleep(60);assert.equal(stalled.dataset.atmosphere,'fallback');assert.equal(globalThis.disposals,1);abort.abort();assert.equal(globalThis.disposals,1);
 globalThis.sceneReady=true;const normal=host(),life=new AbortController();loadHomeAtmosphere(normal,life.signal);await sleep(60);assert.equal(normal.dataset.atmosphere,'ready');assert.equal(globalThis.disposals,1,'normal full quality scene is never timed out');life.abort();assert.equal(globalThis.disposals,2);
 const cancelled=host(),cancel=new AbortController();loadHomeAtmosphere(cancelled,cancel.signal);cancel.abort();await sleep(60);assert.equal(globalThis.mounts,2,'cancelled navigation must not mount a late module');
 // An unavailable HTML entry itself still has a visible, native reload link.
 const html=await readFile('client/index.html','utf8');const shell=new JSDOM(html);assert(shell.window.document.querySelector('#startup-status').textContent);assert.equal(shell.window.document.querySelector('#startup-reload').getAttribute('href'),'');shell.window.close();
 console.log('PASS startup: saved language, geo/body timeout, module failure recovery, static recovery shell, bounded background and navigation cleanup');
} finally {globalThis.setTimeout=timer;dom.window.close();await rm(temp,{recursive:true,force:true});}
