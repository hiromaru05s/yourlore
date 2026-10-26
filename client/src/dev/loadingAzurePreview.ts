/* Local-only QA with actual screens and synthetic API responses; no mutations reach a server. */
import '../main';
import {App} from '../router';
import {setLang} from '../i18n';
if(!import.meta.env.DEV || !['localhost','127.0.0.1'].includes(location.hostname))throw Error('Local fixture only');
setLang('ja');
const user={id:'ui-qa',email:'fixture@local.test',display:'SEEKER',credits:38250,exp:245,wins:20,losses:10,avatar:'SEEKER_BLUE'};
const nativeFetch=window.fetch.bind(window);
window.fetch=async(input,init)=>{
 const url=new URL(input instanceof Request?input.url:String(input),location.href);
 if(url.pathname.startsWith('/api/')){
  let data:unknown={ok:true,credits:user.credits,starterCards:{},effects:[],cosmetics:[],keys:[],entries:[],friends:[],incoming:[],outgoing:[],challenges:[],gifts:[],items:[],pendingCount:0,pendingAmount:0,unreadCount:0};
  if(url.pathname==='/api/auth/me')data={user};
  if(url.pathname==='/api/geo')data={country:'JP'};
  if(url.pathname==='/api/rank/me')data={rating:{season:'2026-10',mmr:1018,rank:1,tier:'iron',wins:20,losses:10}};
  if(url.pathname==='/api/rank/leaderboard')data={season:'2026-10',entries:[]};
  if(url.pathname==='/api/rewards/tutorial')data={keys:[],credits:user.credits,offered:true};
  if(url.pathname==='/api/social/profile')data={profile:{...user,self:true,created_at:Date.now(),stats_public:true,sleeves:['default'],furnitures:['default'],recent:[]}};
  if(url.pathname==='/api/rewards/progression')data={credits:user.credits,resetsAt:Date.now()+86400000,daily:{quest:{kind:'heal',reward:300,target:40},progress:12,claimed:false},bot:{},online:0,ranked:0};
  return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
 }
 return nativeFetch(input,init);
};
const app=new App(document.querySelector<HTMLElement>('#app')!);app.user=user;
const {mountHome}=await import('../screens/home');
const {mountLounge}=await import('../ui/lounge');
mountHome(app);mountLounge(app,'home');

const {coverScreen}=await import('../ui/assetReadiness');
const controls=document.createElement('aside');controls.id='qa-controls';
controls.style.cssText='position:fixed;right:10px;top:10px;z-index:2147483647;display:flex;gap:8px;padding:8px;background:#0b2038cc;color:#fff;font:12px sans-serif';
controls.innerHTML='<button id="qa-start">再生</button><button id="qa-complete">ロード完了</button><button id="qa-cancel">中断</button><output id="qa-result">ロード待機</output>';
document.body.append(controls);
let gate:ReturnType<typeof coverScreen>|undefined;
const result=controls.querySelector('output')!;
const begin=()=>{gate?.cancel();gate=coverScreen(app.root,true,true);result.textContent='ロード待機';};
controls.querySelector<HTMLButtonElement>('#qa-start')!.onclick=begin;
controls.querySelector<HTMLButtonElement>('#qa-complete')!.onclick=async()=>{result.textContent='実データ準備 → 入場';const current=gate;const success=await current?.ready();if(current===gate)result.textContent=success?'HOME表示・操作可能':'中断・操作可能';};
controls.querySelector<HTMLButtonElement>('#qa-cancel')!.onclick=()=>{gate?.cancel();result.textContent='中断・操作可能';};
begin();
