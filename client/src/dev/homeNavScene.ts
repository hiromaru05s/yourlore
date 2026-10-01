/** Isolated, dev-only HOME design fixture. Never imported by the game entry. */
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/screens.css';
import '../styles/mobile.css';
import '../styles/lounge.css';
import '../styles/loungeGame.css';
import '../styles/loungeStage.css';
import '../styles/presentation.css';
import './homeNavVariants.css';
import {mountHome} from '../screens/home';
import {mountLounge} from '../ui/lounge';
import {api} from '../net/api';
import {setLang} from '../i18n';
import {homeIcon, type HomeIcon} from '../ui/homeIcons';
import type {App} from '../router';
import {createNavStudy} from './homeNavMotion';

if (import.meta.env.DEV) {
  setLang('ja');
  api.rankMe = async () => ({season:'2026-09',mmr:1184,tier:'gold',wins:12,losses:5,rank:26,peak_mmr:1210});
  const params = new URLSearchParams(location.search);
  const variant = /^[0-5]$/.test(params.get('v') || '') ? params.get('v')! : '1';
  document.documentElement.dataset.navDesign = variant;
  if(params.has('strip')) document.documentElement.classList.add('nav-strip');
  const root = document.querySelector<HTMLElement>('#app')!;
  let study:ReturnType<typeof createNavStudy>|undefined;
  const select = (key:string) => {
    if(study){study.select(key);return;}
    root.querySelectorAll<HTMLButtonElement>('[data-nav]').forEach(button => {
      const active = button.dataset.nav === key;
      if(active) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
      const names:Record<string,HomeIcon> = {home:'home',deck:'deck',cards:'cards',leaderboard:'trophy',friends:'friends',shop:'shop',tutorial:'book'};
      button.querySelector('img')!.outerHTML = homeIcon(names[button.dataset.nav!],active);
    });
  };
  const noop = () => {};
  const app = {root,user:{id:'local-guest-user',email:'preview@example.test',display:'シーカー',avatar:'SEEKER_BLUE',wins:24,losses:10,credits:840},home:()=>select('home'),deck:()=>select('deck'),cards:()=>select('cards'),leaderboard:()=>select('leaderboard'),friends:()=>select('friends'),shop:()=>select('shop'),tutorial:()=>select('tutorial'),profile:noop,settings:noop,rankedLobby:noop,onlineLobby:noop,botGame:noop} as unknown as App;
  const home = mountHome(app);
  mountLounge(app,'home');
  if(variant!=='0') study=createNavStudy(root,variant);
  // Keep the real HOME markup, then release music and subscriptions in this static fixture.
  home.destroy?.();
  root.querySelector('#myTier')!.innerHTML='<span class="tier-chip">GOLD · 1184</span><small>2026-09 · #26</small>';
  root.querySelectorAll<HTMLButtonElement>('.lounge-topbar button, .lounge-content button, .lounge-rail-bottom button').forEach(button=>button.onclick=noop);
  document.title='LORE 下ナビ試作 '+variant;
}
