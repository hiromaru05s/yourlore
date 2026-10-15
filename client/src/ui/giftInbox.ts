import type {App} from '../router';
import {api} from '../net/api';
import {esc,getLang} from '../i18n';
import {loungeText as L} from './loungeText';
import type {GiftInbox,GiftItem} from '../shared/gifts';
import '../styles/giftInbox.css';
const ART='/art/lounge/gifts/courier.png';
const title=()=>L('プレゼント','Gifts','선물');
const shard=()=>L('無償シャード','Free Shards','무료 샤드');
const date=(ms:number)=>new Date(ms).toLocaleString(getLang()==='ja'?'ja-JP':getLang()==='ko'?'ko-KR':'en-US',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
export function mountGiftInbox(app:App,button:HTMLButtonElement):()=>void {
 const account=app.user?.id,guest=!account||account==='local-guest-user';
 let data:GiftInbox|undefined,dead=false,failed=false,serial=0,controller:AbortController|undefined;
 let dialog:HTMLDialogElement|null=null,selected='',history=false,busy=false,message='',error='';
 const pending=(g:GiftItem)=>!g.claimedAt&&g.expiresAt>(data?.now??Date.now());
 const paintButton=()=>{
  if(dead)return;const n=data?.pendingCount??0;
  button.setAttribute('aria-label',title()+(data?L(`、未受取${n}件`,`, ${n} unclaimed`,` 미수령 ${n}개`):''));
  button.innerHTML=`<span class="gift-courier-art"><img src="${ART}" alt="" draggable="false">${n?`<span class="gift-courier-count">${n>99?'99+':n}</span>`:''}</span><span class="gift-courier-label"><strong>${title()}</strong><small>${guest?L('ログインして確認','Log in to view','로그인 후 확인'):data?n?L(`未受取 ${n}件`,`${n} unclaimed`,`미수령 ${n}개`):L('届けものはありません','No new gifts','새 선물이 없습니다'):failed?L('開いて再読み込み','Open to retry','열어서 다시 시도'):L('確認中…','Checking…','확인 중…')}</small></span>`;
 };
 const close=()=>{dialog?.close();dialog?.remove();dialog=null;if(button.isConnected)button.focus();};
 const load=async()=>{
  if(dead||guest||busy)return;const request=++serial;controller?.abort();controller=new AbortController();
  try{const next=await api.gifts(controller.signal);if(dead||request!==serial||app.user?.id!==account)return;data=next;failed=false;error='';paintButton();if(dialog)paintDialog();}
  catch{if(dead||request!==serial)return;failed=true;error=L('取得できませんでした。再読み込みしてください。','Could not load gifts. Please retry.','선물을 불러오지 못했습니다. 다시 시도해 주세요.');paintButton();if(dialog)paintDialog();}
 };
 const select=async(id:string)=>{
  selected=id;const g=data?.items.find(g=>g.id===id);if(g&&!g.readAt){g.readAt=Date.now();void api.readGift(id).catch(()=>{if(g)g.readAt=null;});}paintDialog();
 };
 const claim=async(all:boolean)=>{
  if(busy||!data)return;busy=true;error='';message='';controller?.abort();++serial;paintDialog();
  try{
   const receipt=await api.claimGifts(all?undefined:selected);
   if(dead||app.user?.id!==account)return;
   if(app.user){app.user.credits=receipt.credits;document.dispatchEvent(new Event('lore:user'));document.dispatchEvent(new Event('lore:rewards'));}
   message=receipt.amount?L(`${receipt.amount.toLocaleString()} シャードを受け取りました`,`${receipt.amount.toLocaleString()} Shards received`,`${receipt.amount.toLocaleString()} 샤드를 받았습니다`):L('受取済み、または期限切れです','Already claimed or expired','이미 수령했거나 기간이 만료되었습니다');
   data=await api.gifts();failed=false;
  }catch{error=L('受取結果を確認できませんでした。再読み込みして確認してください。','Could not confirm receipt. Reload to check its status.','수령 결과를 확인하지 못했습니다. 새로고침하여 확인해 주세요.');failed=true;}
  finally{busy=false;if(!dead&&app.user?.id===account){paintButton();if(dialog){paintDialog();dialog.querySelector<HTMLButtonElement>('[data-claim]:not(:disabled),[data-close]')?.focus();}}}
 };
 const paintDialog=()=>{
  if(!dialog)return;const previous=dialog.querySelector<HTMLElement>(':focus'),focusKey=previous?.getAttribute('data-letter'),focusTab=previous?.getAttribute('data-tab');
  const items=data?.items.filter(g=>history?!pending(g):pending(g))??[];
  if(!items.some(g=>g.id===selected))selected=items[0]?.id??'';
  const g=items.find(g=>g.id===selected);
  dialog.innerHTML=`<header class="gift-heading"><img src="${ART}" alt=""><div><small>FROM BIBLION</small><h2 id="giftInboxTitle">${title()}</h2><p>${L('ビブリオンからの届けもの','Deliveries from Biblion','비블리온에서 온 선물')}</p></div><button data-close aria-label="${esc(L('閉じる','Close','닫기'))}">×</button></header><div class="gift-tabs" role="group" aria-label="${title()}"><button data-tab="pending" aria-pressed="${!history}">${L('未受取','Unclaimed','미수령')} <span>${data?.pendingCount??'—'}</span></button><button data-tab="history" aria-pressed="${history}">${L('履歴','History','내역')}</button><button data-reload ${busy?'disabled':''}>${L('再読み込み','Refresh','새로고침')}</button></div><div class="gift-content ${g?'':'gift-no-items'}">${!data?`<p class="gift-loading">${failed?esc(error):L('読み込み中…','Loading…','불러오는 중…')}</p>`:g?`<div class="gift-list">${items.map(item=>`<button data-letter="${esc(item.id)}" aria-pressed="${selected===item.id}" ${busy?'disabled':''}><small>${date(item.createdAt)} ${!item.readAt&&!item.claimedAt?'<b>NEW</b>':''}</small><strong>${esc(item.title)}</strong><span><img src="/art/lounge/icons/shard-simple-v1.png" alt="">${item.amount.toLocaleString()}<small>${item.claimedAt?L('受取済み','Received','수령 완료'):!pending(item)?L('期限切れ','Expired','기간 만료'):shard()}</small></span></button>`).join('')}</div><section class="gift-detail"><small>${L('差出人 · LORE運営','From · LORE team','보낸 사람 · LORE 운영팀')}</small><h3>${esc(g.title)}</h3><p>${esc(g.body)}</p><div class="gift-reward"><img src="/art/lounge/icons/shard-simple-v1.png" alt=""><div><small>${shard()}</small><strong>${g.amount.toLocaleString()}</strong></div></div><p class="gift-expiry">${L('受取期限','Claim by','수령 기한')} ${date(g.expiresAt)}</p><button data-claim ${busy||!pending(g)?'disabled':''}>${busy?L('確認中…','Please wait…','확인 중…'):g.claimedAt?L('受取済み','Received','수령 완료'):!pending(g)?L('期限切れ','Expired','기간 만료'):L('受け取る','Receive','받기')} <span>→</span></button></section>`:`<div class="gift-empty"><img src="${ART}" alt=""><h3>${history?L('履歴はまだありません','No history yet','아직 내역이 없습니다'):L('届けものはありません','No new gifts','새 선물이 없습니다')}</h3><p>${history?L('受け取ったプレゼントはこちらに表示されます。','Received gifts appear here.','받은 선물이 여기에 표시됩니다.'):L('次の届けものをお待ちください。','Your next delivery will appear here.','다음 선물을 기다려 주세요.')}</p></div>`}</div><footer class="gift-footer"><span role="status" aria-live="polite" class="${error?'gift-error':''}">${esc(error||message||L('お知らせとシャードをお届けします','News and Shards from the LORE team','소식과 샤드를 전해드립니다'))}</span><button data-all ${busy||!data?.pendingCount||history?'disabled':''}>${L('一括で受け取る','Receive all','모두 받기')} <span>${(data?.pendingAmount??0).toLocaleString()} ◇</span></button></footer>`;
  dialog.querySelector<HTMLButtonElement>('[data-close]')!.onclick=close;
  dialog.querySelector<HTMLButtonElement>('[data-reload]')!.onclick=()=>void load();
  dialog.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(b=>b.onclick=()=>{history=b.dataset.tab==='history';paintDialog();dialog?.querySelector<HTMLButtonElement>(`[data-tab="${b.dataset.tab}"]`)?.focus();});
  dialog.querySelectorAll<HTMLButtonElement>('[data-letter]').forEach(b=>b.onclick=()=>{void select(b.dataset.letter!);dialog?.querySelectorAll<HTMLButtonElement>('[data-letter]').forEach(x=>{if(x.dataset.letter===selected)x.focus();});});
  dialog.querySelector<HTMLButtonElement>('[data-claim]')?.addEventListener('click',()=>void claim(false));
  dialog.querySelector<HTMLButtonElement>('[data-all]')!.onclick=()=>void claim(true);
  if(focusKey)dialog.querySelectorAll<HTMLButtonElement>('[data-letter]').forEach(x=>{if(x.dataset.letter===focusKey)x.focus();});
  else if(focusTab)dialog.querySelector<HTMLButtonElement>(`[data-tab="${focusTab}"]`)?.focus();
 };
 button.onclick=()=>{
  if(guest){app.login();return;}if(dialog)return;
  history=false;message='';dialog=document.createElement('dialog');dialog.className='gift-inbox';dialog.setAttribute('aria-labelledby','giftInboxTitle');document.body.append(dialog);paintDialog();dialog.showModal();dialog.querySelector<HTMLButtonElement>('[data-close]')?.focus();
  dialog.oncancel=e=>{e.preventDefault();close();};dialog.onclick=e=>{if(e.target===dialog){const r=dialog!.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}};void load();
 };
 const refresh=()=>{if(!document.hidden)void load();};
 window.addEventListener('focus',refresh);document.addEventListener('lore:gifts',refresh);
 const timer=window.setInterval(refresh,60000);paintButton();void load();
 return()=>{dead=true;controller?.abort();clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('lore:gifts',refresh);dialog?.close();dialog?.remove();dialog=null;button.onclick=null;};
}
