import {DB,STARTERS} from '../shared/cards';
import {cardName} from '../i18n';
import type {PurchaseStats} from '../shared/rankedProfile';
import {artUrl} from './cardArt';
import {loungeText as L} from './loungeText';
let tooltipId=0;
export function purchaseCards(stats:PurchaseStats|undefined,details=false):HTMLElement {
  const list=document.createElement('div');list.className=details?'purchase-cards purchase-cards-detail':'purchase-cards';
  list.setAttribute('aria-label',L('購入率TOP5','Top 5 purchased cards','구매율 TOP 5'));
  const cards=(stats?.cards??[]).filter(c=>DB[c.id]??STARTERS[c.id]);
  for(let i=0;i<5;i++){
    const entry=cards[i],def=entry&&(DB[entry.id]??STARTERS[entry.id]);
    const item=document.createElement('div');item.className='purchase-card-item';
    const circle=document.createElement('span');circle.className='purchase-card-icon';
    if(entry&&def){
      const name=cardName({...def,uid:`purchase-${entry.id}`}),id=`purchase-card-tip-${++tooltipId}`;
      circle.tabIndex=0;circle.setAttribute('role','img');circle.setAttribute('aria-label',name);circle.setAttribute('aria-describedby',id);
      const img=document.createElement('img');img.src=artUrl.xs(entry.id);img.alt='';img.loading='lazy';
      const tip=document.createElement('span');tip.id=id;tip.className='purchase-card-tooltip';tip.setAttribute('role','tooltip');tip.textContent=name;
      circle.append(img,tip);
      if(details){const label=document.createElement('span');label.className='purchase-card-label';label.textContent=name;const rate=document.createElement('b');rate.textContent=`${Math.round(entry.rate*100)}%`;item.append(label,rate);}
    }else{
      circle.classList.add('is-empty');circle.textContent='—';circle.setAttribute('role','img');circle.setAttribute('aria-label',L('データなし','No data','데이터 없음'));
      if(details){const label=document.createElement('span');label.className='purchase-card-label';label.textContent=L('データなし','No data','데이터 없음');item.append(label);}
    }
    item.prepend(circle);list.append(item);
  }
  return list;
}
