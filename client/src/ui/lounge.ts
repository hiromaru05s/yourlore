import {loadHomeAtmosphere} from './homeAtmosphereLoader';
import '../styles/playerExperience.css';
import '../styles/loungeHorizon.css';
import '../styles/loungeSelectedMenu.css';
import '../styles/loungeSupport.css';
import '../styles/homeDuelInk.css';
import '../styles/homeAtmosphere.css';
import '../styles/menuReadability.css';
import '../styles/homeViewport.css';
import '../styles/homeFiligree.css';
import '../styles/loungeLayout.css';
import {loungeNavGlyph,loungeUtilityGlyph} from './loungeNavGlyphs';
import {mountFriendBadge} from './friendBadge';
import {mountLoungeNavMotion} from './loungeNavMotion';
import type { App } from '../router';
import { t, esc, onLangChange } from '../i18n';
import { homeIcon } from './homeIcons';
import { avatarHtml } from './social';
import { seekerLevel } from './seekerLevel';
import { showInquiryModal, showInviteModal } from '../screens/home';
import { mountHomeSound } from './homeSound';

export type LoungePage = 'home'|'single'|'cardHub'|'deck'|'cards'|'leaderboard'|'friends'|'shop'|'tutorial'|'profile'|'lobby'|'login';


const lastLoungePage=new WeakMap<App,string>();

/** Shared navigation around the existing screen, preserving its live handlers. */
export function mountLounge(app: App, page: LoungePage, finishEntrance?: () => void): () => void {
  const lifecycle=new AbortController();
  document.body.classList.add('lounge-active');
  const content = document.createElement('main'); content.className='lounge-content'; content.id='loungeContent';
  content.append(...Array.from(app.root.childNodes));
  const shell=document.createElement('div'); shell.className=`lounge-shell lounge-${page}${page==='login'?'':' horizon-nav selected-menu'}`;
  if (finishEntrance) shell.classList.add('home-return-visit');
  const tab = page==='cardHub'||page==='deck' ? 'cards' : page==='tutorial'?'single':page;
  const nav: [LoungePage | 'single', string, (()=>void)?][] = [
    ['home','home.title',()=>app.home()],['single','home.bot.title',()=>app.single()],
    ['cards','home.nav.cards',()=>app.cardHub()],['leaderboard','home.nav.ranking',()=>app.leaderboard()],
    ['friends','friends.title',()=>app.friends()],['shop','shop.title',()=>app.shop()],
  ];
  const phoneHome = matchMedia('(max-width:850px) and (min-height:501px)');
  const dailyReward=content.querySelector<HTMLElement>('#dailyReward');
  const gifts=content.querySelector<HTMLButtonElement>('#homeGifts');
  const friendBadge=mountFriendBadge(app,shell,page!=='friends'&&page!=='login');
  let stopNavMotion: (()=>void)|undefined;
  let stopHomeSound: (()=>void)|undefined;
  const profileContents = () => {
    const user=app.user;
    const experience=seekerLevel(user?.exp??0);
    return `${avatarHtml(user?.avatar,user?.display??'P',38)}<span><b>${esc(user?.display??'PLAYER')}</b><small class="lounge-experience" aria-label="${esc(t('home.seekerLevel'))}">Lv.${experience.level}${experience.max?" MAX":` · ${experience.progress}/100 EXP`}</small></span>`;
  };
  const paint=()=>{
    stopNavMotion?.();
    stopHomeSound?.();
    const user=app.user;
    shell.querySelectorAll(':scope > .lounge-rail, :scope > .lounge-topbar').forEach(n=>n.remove());
    if(page==='login') return;
    const rail=document.createElement('aside'); rail.className='lounge-rail'; rail.id='loungeNavigation';
    const navButtons=nav.map(([key,label,go],index)=>{
      const glyph=loungeNavGlyph(index);
      if (!go) return `<button type="button" data-nav="${key}" disabled aria-label="${esc(t(label))}">${glyph}<span aria-hidden="true"></span></button>`;
      return `<button type="button" data-nav="${key}" ${key===tab?'aria-current="page"':''}>${glyph}<span>${t(label)}</span></button>`;
    }).join('');
    rail.innerHTML=`<nav aria-label="${esc(t('home.navigation'))}">${navButtons}</nav><div class="lounge-rail-bottom" id="loungeUtilities"><button data-utility-settings>${loungeUtilityGlyph('settings')}<span>${t('home.settings')}</span></button><button data-invite>${loungeUtilityGlyph('invite')}<span>${t('invite.title')}</span></button><button data-inquiry>${loungeUtilityGlyph('inquiry')}<span>${t('home.inquiry.title')}</span></button></div>`;
    const top=document.createElement('header'); top.className='lounge-topbar';
    top.innerHTML=`<button class="lounge-brand" data-home aria-label="LORE HOME"><img src="/art/brand/lore-logo-transparent.webp" alt="LORE"></button><button class="lounge-menu" aria-controls="loungeUtilities" aria-expanded="${shell.classList.contains('is-menu-open')}" aria-label="${esc(t('home.navigation'))}"><span class="menu-stroke" aria-hidden="true"></span><span class="menu-stroke" aria-hidden="true"></span></button><span class="lounge-location">${page==='single'?t('home.bot.title'):page==='profile'?t('profile.title'):page==='lobby'?t('mode.ranked'):t(page==='deck'?'home.nav.deck':nav.find(n=>n[0]===tab)?.[1]??'home.title')}</span><button class="lounge-user" data-profile title="${esc(t('home.levelRule'))}">${profileContents()}</button><button class="lounge-balance" data-shop>${homeIcon('shard')}<span><small>${t('home.shards')}</small><b>${(user?.credits??0).toLocaleString()}</b></span></button>`;
    shell.prepend(rail,top);
    // Keep the same profile container on every route; HOME adds sound and quests.
    {
      const profile=top.querySelector<HTMLButtonElement>('[data-profile]')!;
      const seeker=document.createElement('div');seeker.className='lounge-seeker';
      profile.replaceWith(seeker);seeker.append(profile);
      if(page==='home'){
        stopHomeSound=mountHomeSound(seeker);
        if(dailyReward){
          const host=phoneHome.matches?content.querySelector('.lounge-home-screen'):seeker;
          host?.append(dailyReward);
        }
      }
    }
    // Reserve the same gift slot on other pages so the logo and balance stay put.
    const actions=document.createElement('div');actions.className='lounge-header-actions';
    const giftSlot=gifts??document.createElement('span');
    if(!gifts){giftSlot.className='gift-mail';giftSlot.style.visibility='hidden';giftSlot.setAttribute('aria-hidden','true');}
    actions.append(giftSlot,top.querySelector('[data-shop]')!,top.querySelector('.lounge-menu')!);
    top.append(actions);
    stopNavMotion=mountLoungeNavMotion(rail.querySelector('nav')!,lastLoungePage.get(app));
    lastLoungePage.set(app,tab);
    friendBadge.paint();
    top.querySelector<HTMLButtonElement>('[data-home]')!.onclick=()=>app.home();
    nav.forEach(([key,,go])=>{if(go) rail.querySelector<HTMLButtonElement>(`[data-nav="${key}"]`)!.onclick=go;});
    rail.querySelector<HTMLButtonElement>('[data-utility-settings]')!.onclick=()=>app.settings();
    rail.querySelector<HTMLButtonElement>('[data-invite]')!.onclick=()=>void showInviteModal(lifecycle.signal);
    rail.querySelector<HTMLButtonElement>('[data-inquiry]')!.onclick=showInquiryModal;
    top.querySelector<HTMLButtonElement>('[data-profile]')!.onclick=()=>app.profile();
    top.querySelector<HTMLButtonElement>('[data-shop]')!.onclick=()=>app.shop();
    top.querySelector<HTMLButtonElement>('.lounge-menu')!.onclick=e=>{const on=shell.classList.toggle('is-menu-open');(e.currentTarget as HTMLElement).setAttribute('aria-expanded',String(on));};
  };
  let atmosphere: HTMLElement | undefined;
  if(page==='home'){atmosphere=document.createElement('div');atmosphere.className='lounge-atmosphere living-home';atmosphere.dataset.atmosphere='loading';atmosphere.setAttribute('aria-hidden','true');shell.append(atmosphere);}
  shell.append(content); app.root.append(shell); paint();
  const companion=content.querySelector<HTMLElement>('.home-companion');
  const homeScreen=content.querySelector('.lounge-home-screen');
  // Portrait HOME keeps quests after the play panel in the scrolling content.
  // Reparent the existing node so progress, handlers and refreshes stay intact.
  const layoutHome = () => {
    if (!homeScreen || !companion) return;
    const stage = phoneHome.matches ? homeScreen : shell;
    if (companion.parentElement !== stage) stage.prepend(companion);
    const quests = phoneHome.matches ? homeScreen : shell.querySelector('.lounge-seeker');
    if (dailyReward && quests && dailyReward.parentElement !== quests) quests.append(dailyReward);
  };
  layoutHome();
  const startSceneEffects = () => {
    finishEntrance?.();
    if (atmosphere && !lifecycle.signal.aborted) loadHomeAtmosphere(atmosphere,lifecycle.signal);
  };
  if (finishEntrance && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    revealHomeControls(shell, companion?.querySelector('img'), lifecycle.signal, startSceneEffects);
  } else startSceneEffects();
  if (companion) phoneHome.addEventListener('change',layoutHome,{signal:lifecycle.signal});
  const off=onLangChange(paint);
  // Account refreshes can arrive during the entrance. Keep the moving header
  // and dock mounted, including the focused button and the nav indicator.
  const updateUser = () => {
    const profile = shell.querySelector<HTMLButtonElement>('[data-profile]');
    const balance = shell.querySelector<HTMLElement>('.lounge-balance b');
    if (!profile || !balance) return;
    profile.innerHTML = profileContents();
    balance.textContent = (app.user?.credits ?? 0).toLocaleString();
  };
  document.addEventListener('lore:user',updateUser);
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
  const observer=new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n instanceof Element&&(n.matches('.overlay')||n.querySelector('.overlay')))))enhance();});observer.observe(document.body,{childList:true,subtree:true});enhance();
  const keyboard=(e:KeyboardEvent)=>{
    const ovs=Array.from(document.querySelectorAll<HTMLElement>('.overlay'));const ov=ovs.at(-1);
    if(!ov){if(e.key==='Escape'){shell.classList.remove('is-menu-open');shell.querySelector('.lounge-menu')?.setAttribute('aria-expanded','false');}return;}
    if(e.key==='Escape'){
      const close=ov.querySelector<HTMLButtonElement>('[id$="Cancel"],[id$="Close"],#wchNo,#chNo,#inqOk,.modal-row .btn-ghost');
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
  return ()=>{friendBadge.destroy();lifecycle.abort();stopNavMotion?.();stopHomeSound?.();off();document.removeEventListener("lore:user",updateUser);observer.disconnect();document.removeEventListener('keydown',keyboard);document.body.classList.remove('lounge-active');document.querySelectorAll('.overlay').forEach(n=>n.remove());};
}

function revealHomeControls(shell: HTMLElement, portrait: HTMLImageElement | null | undefined, signal: AbortSignal, onFinish: () => void) {
  shell.dataset.homeReturn = 'scene';
  let frame = 0;
  let started = false;
  let finishTimer = 0;
  const finish = () => {
    if (!shell.dataset.homeReturn) return;
    delete shell.dataset.homeReturn;
    clearTimeout(finishTimer);
    onFinish();
  };
  const show = () => {
    if (started || signal.aborted) return;
    started = true;
    clearTimeout(deadline);
    // Give the decoded painting a presented frame before moving the UI.
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        shell.dataset.homeReturn = 'controls';
        // Also release the scene if the system changes its motion preference mid-entrance.
        finishTimer = window.setTimeout(finish, 750);
      });
    });
  };
  // A broken or stalled portrait must never strand navigation.
  shell.addEventListener('animationend', event => {
    if (event.animationName === 'home-controls-arrive' && event.target === shell.querySelector('.lounge-rail')) {
      finish();
    }
  }, {signal});
  const deadline = window.setTimeout(show, 650);
  if (portrait) void portrait.decode().then(show, show);
  else show();
  signal.addEventListener('abort', () => { clearTimeout(deadline); cancelAnimationFrame(frame); finish(); }, {once:true});
}
