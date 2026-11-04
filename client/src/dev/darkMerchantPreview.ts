// Local preview: actual controller, reducer, board and shared UI from main.
import '../styles/fonts.css';
import '../styles/reading-board.css';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/card.css';
import '../styles/game-overlays.css';
import '../styles/game.css';
import '../styles/dice.css';
import '../styles/screens.css';
import '../styles/mobile.css';
import '../styles/duel-opening.css';
import '../styles/lounge.css';
import '../styles/loungeGame.css';
import '../styles/loungeStage.css';
import '../styles/presentation.css';
import '../styles/popupSilver.css';
import '../styles/defaultUI.css';
import '../styles/defaultButtons.css';
import { BaseController } from '../game/controller';
import { createGame, reduce } from '../shared/engine';
import { DB } from '../shared/cards';
import type { Action, CardInst, GameState } from '../shared/types';
import { setLang } from '../i18n';
import { setMyAvatar, setOppAvatar } from '../ui/boardView';
import { startBoardLayout } from '../ui/layout';
import { closeOverlay } from '../ui/modal';

const language = new URLSearchParams(location.search).get('lang');
setLang(language === 'en' || language === 'ko' ? language : 'ja');
setMyAvatar('SEEKER_BLUE');
setOppAvatar('SEEKER_RED');
class MerchantPreview extends BaseController {
  actions: Action[] = [];
  protected get useTurnClock(): boolean { return false; }
  protected submit(action: Action): void {
    this.actions.push(action);
    this.applyResult(reduce(this.state, action), false);
  }
  get snapshot(): GameState { return this.state; }
  open(mana = 10): void {
    closeOverlay();
    const g = createGame({ mode:'bot', seed:71, starting:0, p0:{id:'preview-self',name:'YOU'}, p1:{id:'preview-opp',name:'OPPONENT'} }).state;
    g.turn = 3;
    g.phase = 'main';
    g.pending = null;
    g.players.forEach(p => { p.openingDrawReady = false; p.mana = mana; p.maxMana = mana; });
    const merchant: CardInst = {...DB.DARK_MERCHANT, uid:'preview-dark-merchant'};
    g.players[0].hand = [merchant];
    this.actions = [];
    this.introShown = true;
    this.applyResult(reduce(g, {type:'play',idx:0,sourceUid:merchant.uid}), false);
  }
}
const preview = new MerchantPreview(document.getElementById('app')!, 0, {onHome:()=>preview.open(),onRematch:()=>preview.open()});
startBoardLayout();
preview.open();
const restart = document.createElement('button');
restart.className = 'btn';
restart.textContent = '闇商人をもう一度開く';
restart.style.cssText = 'position:fixed;top:10px;left:10px;z-index:100';
restart.onclick = () => preview.open();
document.body.append(restart);
Object.assign(window, {merchantPreview:preview});
