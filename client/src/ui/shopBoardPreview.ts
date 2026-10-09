import type {Cosmetic} from '../shared/cosmetics';
import {esc,getLang} from '../i18n';
import {loungeText} from './loungeText';

/** A read-only board inside the shop. Closing releases its entire scene. */
export function openShopBoardPreview(item:Cosmetic):()=>void {
  const focusBefore=document.activeElement as HTMLElement|null;
  const dialog=document.createElement('dialog');dialog.className='shop-board-dialog';
  dialog.setAttribute('aria-labelledby','shopBoardTitle');
  const label=loungeText('実盤面で見る','View on board','보드에서 보기');
  dialog.innerHTML=`<header><div><small>${label}</small><h2 id="shopBoardTitle">${esc(item[getLang()])}</h2></div><button class="btn" data-close autofocus>${loungeText('ショップへ戻る','Back to shop','상점으로 돌아가기')} ×</button></header>
    <div class="shop-board-tools" role="group" aria-label="${esc(label)}">${[['all',loungeText('盤面全体','Full board','전체 보드')],['deck',loungeText('デッキ置き場','Deck holder','덱 받침')],['grave',loungeText('墓地','Graveyard','묘지')]].map(([id,text])=>`<button class="btn" data-view="${id}" aria-pressed="${id==='all'}">${text}</button>`).join('')}</div>
    <div class="shop-board-stage"><iframe tabindex="-1" title="${esc(label+' — '+item[getLang()])}"></iframe><p role="status">${loungeText('盤面を準備しています…','Preparing the board…','보드 준비 중…')}</p></div>
    <p class="shop-board-note">${loungeText('選択した外観を自分側に表示しています。装備の変更はデッキ構成から。','Previewing this cosmetic on your side. Equip it in the deck builder.','선택한 외관을 내 쪽에 표시합니다. 장착은 덱 구성에서 가능합니다.')}</p>`;
  const frame=dialog.querySelector('iframe')!,stage=dialog.querySelector<HTMLElement>('.shop-board-stage')!,status=stage.querySelector('p')!;
  let view='all',closed=false,ready=false,check:ReturnType<typeof setTimeout>|undefined;
  const position=()=>{
    const w=stage.clientWidth,h=stage.clientHeight,base=Math.min(w/1280,h/720);
    let scale=base,x=640,y=360;
    if(view!=='all'){
      const pile=frame.contentDocument?.getElementById(view==='deck'?'pile-myDeck':'pile-myDisc');
      if(pile){const r=pile.getBoundingClientRect();scale=Math.min(w/(r.width*2.6),h/(r.height*2.6),3);x=r.left+r.width/2;y=r.top+r.height/2;}
    }
    frame.style.transform=`translate(${w/2-x*scale}px,${h/2-y*scale}px) scale(${scale})`;
  };
  const cleanup=()=>{if(closed)return;closed=true;clearTimeout(timeout);clearTimeout(check);resize.disconnect();window.removeEventListener('message',message);dialog.close();frame.src='about:blank';dialog.remove();if(focusBefore?.isConnected)focusBefore.focus({preventScroll:true});};
  const sceneReady=()=>{
    if(closed)return;
    if(frame.contentDocument?.querySelector('[data-scene-ready="true"]')){ready=true;status.hidden=true;clearTimeout(timeout);position();}
    else check=setTimeout(sceneReady,100);
  };
  const message=(event:MessageEvent)=>{
    if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
    if(event.data?.type==='atelier-ready')sceneReady();
    if(event.data?.type==='atelier-applied')position();
  };
  const timeout=setTimeout(()=>{if(!ready){clearTimeout(check);status.textContent=loungeText('盤面を読み込めませんでした。閉じて、もう一度お試しください。','Could not load the board. Close and try again.','보드를 불러오지 못했습니다. 닫고 다시 시도해 주세요.');}},45000);
  dialog.querySelector<HTMLButtonElement>('[data-close]')!.onclick=cleanup;
  dialog.addEventListener('cancel',event=>{event.preventDefault();cleanup();});
  dialog.addEventListener('click',event=>{if(event.target===dialog)cleanup();});
  dialog.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button=>button.onclick=()=>{
    view=button.dataset.view!;dialog.querySelectorAll<HTMLElement>('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));position();
  });
  const resize=new ResizeObserver(position);window.addEventListener('message',message);
  document.body.append(dialog);dialog.showModal();resize.observe(stage);
  frame.src=`/cosmetic-studio.html?board=1&runtime=1&shopItem=${encodeURIComponent(item.id)}&lang=${getLang()}`;
  return cleanup;
}
