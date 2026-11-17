import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const dir=await mkdtemp('/tmp/lore-shop-sync-');
const dom=new JSDOM('<body><main></main></body>',{url:'https://local/'});
for(const key of ['document','window','location','localStorage','HTMLElement'])globalThis[key]=dom.window[key];
const stubs={
 './gachaRewardStage':'export const mountRewardGallery=()=>()=>{};',
 './gachaCinematic':'export const openGachaCinematic=()=>()=>{};export const prepareGachaCinematic=async()=>{};',
 './shopRewardPreview':'export const sample=()=>"";export const shopLineup=()=>"";export const shopRewardCategoryName=x=>x;export const mountShopRewardPreviews=()=>()=>{};',
};
try{
 await build({entryPoints:['client/src/ui/shopGacha.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/shop.mjs',loader:{'.css':'empty'},plugins:[{name:'art-boundaries',setup(b){b.onResolve({filter:/.*/},a=>a.path in stubs?{path:a.path,namespace:'stub'}:undefined);b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:stubs[a.path]}));}}]});
 const {mountShopGacha}=await import(dir+'/shop.mjs');
 const host=document.querySelector('main'),draw=async()=>{};
 const mounted=mountShopGacha(host,{credits:0,draw});
 const one=host.querySelector('[data-pull="1"]'),ten=host.querySelector('[data-pull="10"]');
 assert(one.disabled&&ten.disabled);mounted.update(1000,draw);assert(!one.disabled&&!ten.disabled,'fresh balance enables previously unaffordable draws');
 mounted.update(100,draw);assert(!one.disabled&&ten.disabled,'spending elsewhere updates both affordability checks');
 mounted.update(1000,undefined);assert(one.disabled&&ten.disabled,'refresh or another purchase blocks drawing');
 mounted.update(1000,draw);assert(!one.disabled&&!ten.disabled);
 assert.equal(host.querySelector('[data-pull="1"]'),one,'refresh preserves the mounted interface');
 mounted();mounted.update(1000,draw);assert.equal(host.children.length,0);
 console.log('PASS fresh balances and busy state update gacha without remounting or losing results');
}finally{dom.window.close();await rm(dir,{recursive:true,force:true});}
