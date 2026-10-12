import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/screens.css';
import '../styles/lounge.css';
import '../styles/loungeGame.css';
import '../styles/loungeStage.css';
import '../styles/presentation.css';
import '../styles/menuApproved.css';
import '../styles/menuWorkspace.css';
import { mountLounge } from '../ui/lounge';
import { mountShop } from '../screens/shop';
import { api } from '../net/api';
import { setLang } from '../i18n';
import type { App, Screen } from '../router';
import type { GachaVariant } from '../ui/shopGacha';
import './gachaThree.css';

if(import.meta.env.DEV) {
  // This fixture never authenticates or sends purchase requests.
  setLang('ja');
  const params = new URLSearchParams(location.search);
  let variant = Math.max(1,Math.min(3,Number(params.get('v'))||1)) as GachaVariant;
  let credits = 2400;
  const root = document.querySelector<HTMLElement>('#app')!;
  const controls = document.querySelector<HTMLElement>('#gacha-lab-controls')!;
  const labels = ['蒼銀の大型バナー','白亜の展示室','深紅の三連展示'];
  let screen: Screen | undefined, stopLounge: (()=>void) | undefined;
  api.profile = async () => ({id:'gacha-preview',display:'シーカー',avatar:null,badge:null,created_at:0,self:true,credits,sleeves:['default'],furnitures:[]});
  api.buySleeve = async () => {throw new Error('プレビューでは購入できません。')};
  const app = {root,user:{id:'gacha-preview',display:'シーカー',email:'',wins:12,losses:3,credits,avatar:null},home:()=>notice(),deck:()=>notice(),cards:()=>notice(),leaderboard:()=>notice(),friends:()=>notice(),shop:()=>paint(),tutorial:()=>notice(),settings:()=>notice(),profile:()=>notice()} as unknown as App;
  let noticeTimer = 0;
  function notice(){const t=document.querySelector<HTMLElement>('#gacha-lab-notice')!;t.textContent='ショップ内のガチャを比較するプレビューです。';clearTimeout(noticeTimer);noticeTimer=window.setTimeout(()=>t.textContent='',2500)}
  function paint(){
    screen?.destroy?.();stopLounge?.();root.replaceChildren();
    app.user!.credits=credits;
    screen=mountShop(app,{gachaVariant:variant});stopLounge=mountLounge(app,'shop');
    controls.innerHTML=`<div class="gacha-lab-title"><b>GACHA STUDY</b><span>3つの構図 / FEプレビュー</span></div><div class="gacha-lab-switch" role="group" aria-label="デザイン案">${labels.map((label,i)=>`<button data-variant="${i+1}" aria-pressed="${variant===i+1}"><small>0${i+1}</small><span>${label}</span></button>`).join('')}</div><label class="gacha-lab-balance">所持 <select aria-label="所持シャード"><option value="2400" ${credits===2400?'selected':''}>2,400</option><option value="100" ${credits===100?'selected':''}>100</option><option value="0" ${credits===0?'selected':''}>0</option></select></label><span id="gacha-lab-notice" role="status"></span>`;
    controls.querySelectorAll<HTMLButtonElement>('[data-variant]').forEach(b=>b.onclick=()=>{variant=Number(b.dataset.variant) as GachaVariant;const url=new URL(location.href);url.searchParams.set('v',String(variant));history.replaceState(null,'',url);paint();controls.querySelector<HTMLButtonElement>(`[data-variant="${variant}"]`)?.focus({preventScroll:true})});
    controls.querySelector('select')!.onchange=e=>{credits=Number((e.target as HTMLSelectElement).value);paint()};
    document.title=`LORE / 0${variant} ${labels[variant-1]}`;
  }
  paint();
  window.addEventListener('pagehide',()=>{screen?.destroy?.();stopLounge?.();clearTimeout(noticeTimer)});
}
