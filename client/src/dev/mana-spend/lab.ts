import type {GameState} from '../../shared/types';
import {buyCost,marketStockOf} from '../../shared/engine';
import {buyReveal} from '../../ui/anim';
import {setReadout,spend} from '../../ui/manaSpend';
import './style.css';

export function mountSpendLab(g:GameState,resetBoard:()=>void){
  document.title='マナ消費プレビュー · LORE';
  const panel=document.createElement('section');
  panel.className='spend-panel';panel.ariaLabel='マナ消費プレビュー';
  panel.innerHTML='<button data-mode="normal" data-primary>通常消費 · 2マナ</button><button data-mode="purchase">購入 · 3マナ</button><select aria-label="支払う側"><option value="0">自分</option><option value="1">相手</option></select><button data-speed aria-label="再生速度">1×</button>';
  const app=document.getElementById('app')!,modes=panel.querySelectorAll<HTMLButtonElement>('[data-mode]');
  const sideSelect=panel.querySelector('select')!,speed=panel.querySelector<HTMLButtonElement>('[data-speed]')!;
  const controller=new AbortController();
  let busy=false,rate=1,used=false;
  speed.onclick=()=>{rate=rate===1?.5:1;speed.textContent=rate+'×';};
  app.inert=true;
  document.body.append(panel);
  async function run(purchase:boolean){
    if(busy||controller.signal.aborted)return;
    used=true;busy=true;
    modes.forEach(b=>b.disabled=true);sideSelect.disabled=speed.disabled=true;
    try{
      resetBoard();
      const side=Number(sideSelect.value) as 0|1;
      const tray=app.querySelector<HTMLElement>(`#portrait${side?'Opp':'Me'} .pt-mana`)!;
      const slot=g.market.findIndex(c=>!c.quick&&buyCost(g.players[side],c)===3);
      const source=purchase?app.querySelector<HTMLElement>('#fixedMarket')!.children[slot] as HTMLElement:null;
      const count=purchase?buyCost(g.players[side],g.market[slot]):2;
      setReadout(tray,6);
      await new Promise(r=>setTimeout(r,300));
      await spend(tray,side,count,source,rate,controller.signal);
      if(source&&!controller.signal.aborted&&!document.hidden){
        await buyReveal(g.market[slot],side?'opp':'me',source.getBoundingClientRect(),source,marketStockOf(g,slot)-1,0);
      }
    }finally{busy=false;modes.forEach(b=>b.disabled=false);sideSelect.disabled=speed.disabled=false;}
  }
  for(const b of modes)b.onclick=()=>void run(b.dataset.mode==='purchase');
  const poll=window.setInterval(()=>{
    if(app.dataset.sceneReady!=='true'&&app.dataset.tableState!=='fallback')return;
    clearInterval(poll);
    if(!used&&!document.hidden&&!new URLSearchParams(location.search).has('manual'))void run(false);
  },200);
  window.addEventListener('pagehide',()=>{clearInterval(poll);controller.abort();panel.remove();app.inert=false;},{once:true});
}
