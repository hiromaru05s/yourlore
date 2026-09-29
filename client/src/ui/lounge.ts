import '../styles/loungeHorizon.css';
import '../styles/loungeSelectedMenu.css';
import {loungeNavGlyph} from './loungeNavGlyphs';
import {mountLoungeNavMotion} from './loungeNavMotion';
import type { App } from '../router';
import { t, esc, onLangChange } from '../i18n';
import { homeIcon, type HomeIcon } from './homeIcons';
import { avatarHtml } from './social';
import { seekerLevel } from './seekerLevel';
import { showInquiryModal, showInviteModal } from '../screens/home';

export type LoungePage = 'home'|'deck'|'cards'|'leaderboard'|'friends'|'shop'|'tutorial'|'profile'|'lobby'|'login';


const lastLoungePage=new WeakMap<App,string>();

/** Shared navigation around the existing screen, preserving its live handlers. */
export function mountLounge(app: App, page: LoungePage): () => void {
  document.body.classList.add('lounge-active');
  const content = document.createElement('main'); content.className='lounge-content'; content.id='loungeContent';
  content.append(...Array.from(app.root.childNodes));
  const shell=document.createElement('div'); shell.className=`lounge-shell lounge-${page}${page==='login'?'':' horizon-nav selected-menu'}`;
  const nav: [LoungePage, HomeIcon, string, ()=>void][] = [
    ['home','home','home.title',()=>app.home()],['deck','deck','home.nav.deck',()=>app.deck()],
    ['cards','cards','home.nav.cards',()=>app.cards()],['leaderboard','trophy','home.nav.ranking',()=>app.leaderboard()],
    ['friends','friends','friends.title',()=>app.friends()],['shop','shop','shop.title',()=>app.shop()],
    ['tutorial','book','home.nav.guide',()=>app.tutorial()],
  ];
  let stopNavMotion: (()=>void)|undefined;
  const paint=()=>{
    stopNavMotion?.();
    const user=app.user;
    shell.querySelectorAll(':scope > .lounge-rail, :scope > .lounge-topbar').forEach(n=>n.remove());
    if(page==='login') return;
    const rail=document.createElement('aside'); rail.className='lounge-rail'; rail.id='loungeNavigation';
    rail.innerHTML=`<nav aria-label="${esc(t('home.navigation'))}">${nav.map(([key,,label],index)=>`<button data-nav="${key}" ${key===page?'aria-current="page"':''}>${loungeNavGlyph(index)}<span>${t(label)}</span></button>`).join('')}</nav><div class="lounge-rail-bottom" id="loungeUtilities"><button data-utility-settings>${homeIcon('settings')}<span>${t('home.settings')}</span></button><button data-invite>${homeIcon('gift')}<span>${t('invite.title')}</span></button><button data-inquiry>${homeIcon('mail')}<span>${t('home.inquiry.title')}</span></button></div>`;
    const top=document.createElement('header'); top.className='lounge-topbar';
    top.innerHTML=`<button class="lounge-brand" data-home aria-label="LORE HOME"><img src="/art/brand/lore-logo-transparent.webp" alt="LORE"></button><button class="lounge-menu" aria-controls="loungeUtilities" aria-expanded="${shell.classList.contains('is-menu-open')}" aria-label="${esc(t('home.navigation'))}"><span class="menu-stroke" aria-hidden="true"></span><span class="menu-stroke" aria-hidden="true"></span></button><span class="lounge-location">${page==='profile'?t('profile.title'):page==='lobby'?t('mode.ranked'):t(nav.find(n=>n[0]===page)?.[2]??'home.title')}</span><button class="lounge-user" data-profile>${avatarHtml(user?.avatar,user?.display??'P',38)}<span><b>${esc(user?.display??'PLAYER')}</b><small>${t('home.seekerLevel')} ${seekerLevel(user?.wins??0,user?.losses??0).level}</small></span></button><button class="lounge-balance" data-shop><span class="balance-glyph" aria-hidden="true">◇</span><span><small>${t('home.shards')}</small><b>${(user?.credits??0).toLocaleString()}</b></span></button>`;
    shell.prepend(rail,top);
    stopNavMotion=mountLoungeNavMotion(rail.querySelector('nav')!,lastLoungePage.get(app));
    lastLoungePage.set(app,page);
    top.querySelector<HTMLButtonElement>('[data-home]')!.onclick=()=>app.home();
    nav.forEach(([key,,,go])=>{rail.querySelector<HTMLButtonElement>(`[data-nav="${key}"]`)!.onclick=go;});
    rail.querySelector<HTMLButtonElement>('[data-utility-settings]')!.onclick=()=>app.settings();
    rail.querySelector<HTMLButtonElement>('[data-invite]')!.onclick=()=>void showInviteModal();
    rail.querySelector<HTMLButtonElement>('[data-inquiry]')!.onclick=showInquiryModal;
    top.querySelector<HTMLButtonElement>('[data-profile]')!.onclick=()=>app.profile();
    top.querySelector<HTMLButtonElement>('[data-shop]')!.onclick=()=>app.shop();
    top.querySelector<HTMLButtonElement>('.lounge-menu')!.onclick=e=>{const on=shell.classList.toggle('is-menu-open');(e.currentTarget as HTMLElement).setAttribute('aria-expanded',String(on));};
  };
  if(page==='home'){const atmosphere=document.createElement('div');atmosphere.className='lounge-atmosphere';atmosphere.setAttribute('aria-hidden','true');atmosphere.innerHTML=Array.from({length:14},(_,i)=>`<i style="--x:${(i*37)%100}%;--y:${(i*23)%90+5}%;--d:${7+i%5}s;--delay:-${i*.8}s"></i>`).join('');shell.append(atmosphere);}
  shell.append(content); app.root.append(shell); paint();
  const off=onLangChange(paint);
  document.addEventListener('lore:user',paint);
  // All existing dialogs share keyboard/focus behavior without duplicating network flows.
  const seen=new WeakSet<HTMLElement>(); const previous=new Map<HTMLElement,HTMLElement|null>();
  const enhance=()=>{
    document.querySelectorAll<HTMLElement>('.overlay').forEach(ov=>{
      if(seen.has(ov))return; seen.add(ov); previous.set(ov,document.activeElement as HTMLElement);
      const box=ov.querySelector<HTMLElement>('.modal'); if(!box)return;
      box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
      const heading=box.querySelector('h2');if(heading)box.setAttribute('aria-label',heading.textContent??'LORE');
      box.querySelector<HTMLElement>('input,button,select,textarea')?.focus();
    });
    previous.forEach((el,ov)=>{if(!ov.isConnected){if(el?.isConnected)el.focus();previous.delete(ov);}});
  };
  const observer=new MutationObserver(enhance);observer.observe(document.body,{childList:true,subtree:true});enhance();
  const keyboard=(e:KeyboardEvent)=>{
    const ovs=Array.from(document.querySelectorAll<HTMLElement>('.overlay'));const ov=ovs.at(-1);
    if(!ov){if(e.key==='Escape'){shell.classList.remove('is-menu-open');shell.querySelector('.lounge-menu')?.setAttribute('aria-expanded','false');}return;}
    if(e.key==='Escape'){
      const close=ov.querySelector<HTMLButtonElement>('[id$="Cancel"],[id$="Close"],#wchNo,#chNo,.modal-row .btn-ghost');
      if(close){e.preventDefault();close.click();}return;
    }
    if(e.key==='Tab'){
      const f=Array.from(ov.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea,select,[tabindex="0"],a[href]')).filter(n=>n.getClientRects().length);
      if(!f.length)return;const first=f[0],last=f[f.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  };
  document.addEventListener('keydown',keyboard);
  return ()=>{stopNavMotion?.();off();document.removeEventListener("lore:user",paint);observer.disconnect();document.removeEventListener('keydown',keyboard);document.body.classList.remove('lounge-active');document.querySelectorAll('.overlay').forEach(n=>n.remove());};
}
