import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {preview} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'/Users/hiromaru05s/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const assets=JSON.parse(await fs.readFile('docs/performance/2026-10-12/lossless-assets.json'));
const server=await preview({root:'client',configFile:'client/vite.config.ts',preview:{port:5626,host:'127.0.0.1',strictPort:true}});const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();await page.route('**/pixel-fixture',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));await page.goto('http://127.0.0.1:5626/pixel-fixture');const results=[];
 for(const asset of assets){const result=await page.evaluate(async a=>{
  const canvas=document.createElement('canvas');canvas.width=a.width;canvas.height=a.height;const c=canvas.getContext('2d',{willReadFrequently:true});
  const read=async url=>{const img=new Image();img.src=url;await img.decode();c.clearRect(0,0,a.width,a.height);c.drawImage(img,0,0);return c.getImageData(0,0,a.width,a.height).data;};
  const before=await read(a.source),after=await read(a.target);let differences=0;for(let i=0;i<before.length;i++)if(before[i]!==after[i])differences++;canvas.width=canvas.height=0;return{source:a.source,pixels:a.width*a.height,rgbaDifferences:differences};
 },asset);assert.equal(result.rgbaDifferences,0,result.source);results.push(result);}
 await fs.writeFile('docs/performance/2026-10-12/browser-pixels.json',JSON.stringify(results,null,2));console.log('PASS: all six full-resolution PNG/WebP pairs render identical RGBA in Chrome');
}finally{await browser.close();await new Promise(r=>server.httpServer.close(r));}
