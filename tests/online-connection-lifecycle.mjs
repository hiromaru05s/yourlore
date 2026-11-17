import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const dir=await mkdtemp('/tmp/lore-online-lifecycle-');
const dom=new JSDOM('<body></body>');
for(const key of ['document','window'])globalThis[key]=dom.window[key];
const sockets=[];globalThis.__auditSockets=sockets;
const stubs={
 './controller':`export class BaseController {constructor(){this.state={turn:3,cur:0};this.exits={};this.clocks=0;}receiveTurnClock(){this.clocks++;}banner(){}destroy(){this.dead=true;}}`,
 '../net/socket':`export class Sock {constructor(path,handlers){this.handlers=handlers;this.sent=[];globalThis.__auditSockets.push(this);}send(m){this.sent.push(m);}close(){this.closed=true;this.handlers.onClose?.();}}`,
 '../net/api':'export const api={};',
 '../ui/boardView':'export const setOppAvatar=()=>{};',
 '../ui/modal':'export const closeOverlay=()=>{};export const noticeModal=()=>{};export const marketPreview=()=>{};',
 '../net/resume':'export const clearActiveGame=()=>{};export const touchActiveGame=()=>{};',
 '../ui/anim':'export const eventBanner=async()=>{};',
 '../i18n':'export const t=x=>x;',
};
try{
 await build({entryPoints:['client/src/game/online.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/online.mjs',plugins:[{name:'boundaries',setup(b){b.onResolve({filter:/.*/},a=>a.path in stubs?{path:a.path,namespace:'stub'}:undefined);b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:stubs[a.path]}));}}]});
 const {OnlineController}=await import(dir+'/online.mjs');
 const c=new OnlineController(document.body,0,'test',{}),old=sockets.at(-1);
 c.connect();const current=sockets.at(-1);
 old.handlers.onMessage({type:'turnClock'});assert.equal(c.clocks,0,'superseded socket cannot change the active clock');
 c.started=true;c.connected=true;
 const now=Date.now,setTimer=globalThis.setTimeout;let clock=10000;Date.now=()=>clock;
 const timers=[];globalThis.setTimeout=(fn,ms)=>{timers.push({fn,ms});return 1;};
 try{c.submit({type:'play',idx:0});clock+=3000;c.submit({type:'play',idx:0});assert.equal(current.sent.filter(m=>m.type==='action').length,1,'a slow echo must never replay a shifted hand index');}finally{Date.now=now;globalThis.setTimeout=setTimer;}
 globalThis.setTimeout=(fn,ms)=>{timers.push({fn,ms});return 1;};
 try {timers.find(t=>t.ms===8000).fn();assert.equal(current.closed,true,'missing action echo forces resynchronization');assert.equal(c.connected,false);c.submit({type:'play',idx:0});assert.equal(current.sent.filter(m=>m.type==='action').length,1,'disconnected clients cannot replay an action');}finally{globalThis.setTimeout=setTimer;}
 c.destroy();current.handlers.onMessage({type:'turnClock'});assert.equal(c.clocks,0,'destroyed controller ignores late messages');
 console.log('PASS superseded/destroyed sockets cannot mutate the game; slow echoes cannot double-play an index');
}finally{dom.window.close();delete globalThis.__auditSockets;await rm(dir,{recursive:true,force:true});}
