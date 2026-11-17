import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,rm} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const dir=await mkdtemp('/tmp/lore-lobby-lifecycle-'),dom=new JSDOM('<body></body>');
for(const key of ['window','document'])globalThis[key]=dom.window[key];
const sockets=[];globalThis.__lobbySockets=sockets;
const stubs={
 '../net/socket':`export class Sock {constructor(path,handlers){this.handlers=handlers;this.sent=[];globalThis.__lobbySockets.push(this);}send(m){this.sent.push(m);}close(){this.handlers.onClose?.();}}`,
 '../ui/homeIcons':`export const homeIcon=()=>'';`,
 '../ui/loungeText':`export const loungeText=x=>x;`,
 '../i18n':`export const t=x=>x;export const onLangChange=()=>()=>{};`,
 '../ui/sound':`export const sfx=()=>{};`,
 './lazyGame':`export const warmGame=async()=>{};`,
};
try{
 await build({entryPoints:['client/src/screens/lobby.ts'],bundle:true,platform:'node',format:'esm',outfile:dir+'/lobby.mjs',plugins:[{name:'boundaries',setup(b){b.onResolve({filter:/.*/},a=>a.path in stubs?{path:a.path,namespace:'stub'}:undefined);b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:stubs[a.path]}));}}]});
 const {mountLobby}=await import(dir+'/lobby.mjs');let entries=0;
 const mount=()=>mountLobby({root:document.body,user:{deck:[]},onlineGame(){entries++;}});
 const screen=mount();await Promise.resolve();const socket=sockets.at(-1);screen.destroy();
 socket.handlers.onMessage({type:'matched',roomId:'late',you:0,oppName:'old'});
 await new Promise(r=>setTimeout(r,650));assert.equal(entries,0,'late matches must not pull a departed user into a game');
 document.body.replaceChildren();const second=mount();await Promise.resolve();const current=sockets.at(-1);
 current.handlers.onMessage({type:'matched',roomId:'valid',you:0,oppName:'current'});
 current.handlers.onMessage({type:'matched',roomId:'duplicate',you:0,oppName:'duplicate'});
 await new Promise(r=>setTimeout(r,650));second.destroy();assert.equal(entries,1,'duplicate matched frames navigate only once');
 console.log('PASS cancelled/destroyed lobby ignores late matches; matching is single-use');
}finally{dom.window.close();delete globalThis.__lobbySockets;await rm(dir,{recursive:true,force:true});}
