import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lore-home-spirit-'));
const dom=new JSDOM('<body><main></main></body>');let creates=0,suspends=0,resumes=0,destroys=0;
globalThis.__mount=()=>{creates++;return {suspend(){suspends++;},resume(){resumes++;},destroy(){destroys++;}};};
try{
 await build({entryPoints:['client/src/ui/homeSpirit.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/module.mjs',plugins:[{name:'spirit',setup(b){b.onResolve({filter:/manaSpirit$/},()=>({path:'spirit',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const mountManaSpirit=(...args)=>globalThis.__mount(...args);'}));}}]});
 const {mountHomeSpirit,releaseHomeSpirit}=await import(dir+'/module.mjs'),app={};const root=dom.window.document.querySelector('main');
 const placeholder=label=>{const e=dom.window.document.createElement('button');e.setAttribute('aria-label',label);e.innerHTML='<span class="home-spirit-host"></span>';root.append(e);return e;};
 const original=placeholder('Zeno'),leave=mountHomeSpirit(app,original);leave();assert.equal(original.isConnected,false);assert.equal(suspends,1);
 const leave2=mountHomeSpirit(app,placeholder('ゼノ'));assert.equal(root.firstChild,original);assert.equal(original.getAttribute('aria-label'),'ゼノ');assert.equal(creates,1);assert.equal(resumes,1);
 leave2();releaseHomeSpirit(app);assert.equal(destroys,1);
 mountHomeSpirit(app,placeholder('Zeno'));assert.equal(creates,2,'Logout releases the retained GPU scene');releaseHomeSpirit(app);assert.equal(destroys,2);
 console.log('PASS: HOME GPU scene reused across navigation, paused offscreen, localized on return, and disposed at logout');
}finally{delete globalThis.__mount;dom.window.close();await fs.rm(dir,{recursive:true,force:true});}
