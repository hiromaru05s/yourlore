/* Local-only QA with actual screens and synthetic API responses; no mutations reach a server. */
import '../main';
import {App} from '../router';
import {setLang} from '../i18n';
import {confirmDialog, cardPicker, winModal} from '../ui/modal';
import {openTutorialBasics} from '../ui/tutorialBasics';
import {DB} from '../shared/cards';
const q=new URLSearchParams(location.search);
if(!import.meta.env.DEV || !['localhost','127.0.0.1'].includes(location.hostname))throw Error('Local fixture only');
setLang('ja');
const user={id:'ui-qa',email:'fixture@local.test',display:'UI検証シーカー',credits:38250,exp:245,wins:20,losses:10,avatar:'SEEKER_BLUE'};
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
const route=q.get('page')??'home';
switch(route){case'cards':app.cards();break;case'deck':app.deck();break;case'friends':app.friends();break;case'leaderboard':app.leaderboard();break;case'shop':app.shop();break;case'tutorial':app.tutorial();break;case'profile':app.profile();break;case'settings':app.settings();break;case'login':app.user=null;app.login();break;default:app.home();}
if(q.get('popup')==='confirm')void confirmDialog({title:'デッキの変更を保存しますか？',body:'選択したカードでデッキを更新します。',confirm:'保存する',cancel:'戻る'});
if(q.get('popup')==='basics')openTutorialBasics(()=>{},()=>{},true);

if(q.get('popup')==='picker')cardPicker('カードを選択してください',['M1','M2','M3','M4','M5','M6','M7','M8'].map((id,i)=>({...DB[id],uid:'qa-'+i})),()=>{},true,{confirm:true});
if(q.get('popup')==='result')winModal(true,'プレビュー',()=>app.home(),()=>app.home());
