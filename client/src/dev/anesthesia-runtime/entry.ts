import '../../styles/tokens.css';import '../../styles/base.css';import '../../styles/card.css';import '../../styles/passives.css';import '../../styles/game-overlays.css';import '../../styles/game.css';import '../../styles/screens.css';import '../../styles/reading-board.css';import '../../styles/presentation.css';
import {BaseController} from '../../game/controller';import {createGame,reduce} from '../../shared/engine';import {DB} from '../../shared/cards';import {startBoardLayout} from '../../ui/layout';import {setLang} from '../../i18n';import {setMyAvatar,setOppAvatar} from '../../ui/boardView';import {waitForDuel} from '../../ui/duelReadiness';import type {Action,Side} from '../../shared/types';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');
const root=document.getElementById('app')!;
class TestController extends BaseController{
 protected get useTurnClock(){return false;}
 submit(a:Action){this.applyResult(reduce(this.state,a));}
 show(side:Side){const g=createGame({mode:'online',seed:913,starting:side,p0:{id:'a',name:'YOU'},p1:{id:'b',name:'OPP'}}).state;g.turn=5;g.cur=side;g.phase='main';g.pending=null;
  for(const [s,p]of g.players.entries())Object.assign(p,{hp:30,hand:s===side?[{...DB.ANESTHESIA,uid:'cast'},{...DB.M1,uid:'late'}]:[],deck:[],discard:[],removed:[],traps:[],enchants:[],quests:[],mana:20,maxMana:20,openingDrawReady:false,field:['M1','M4','SOLDIER2'].slice(0,s===side?3:1).map((id,i)=>({...DB[id],uid:`target-${s}-${i}`,dmg:0,atkMod:0,defMod:0,tempAtk:0,exhausted:false,summonedTurn:0}))});this.state=g;void this.view.render(g);}
 snapshot(){return this.state;}
 reconnect(){void this.view.render(structuredClone(this.state));}
}
let ctl=new TestController(root,0,{onHome(){},onRematch(){}});ctl.show(0);const stop=startBoardLayout();
const panel=document.createElement('div');panel.style.cssText='position:fixed;bottom:4px;left:4px;z-index:10000;background:#101a2ced;padding:8px;color:white;display:flex;gap:8px;flex-wrap:wrap;font-size:12px';panel.innerHTML='<button data-action="cast">発動</button><button data-action="late">追加召喚</button><button data-action="rerender">再描画</button><button data-action="end">ターン終了</button><button data-action="opponent">相手から開始</button><button data-action="reset">リセット</button><button data-action="destroy">破棄</button><output>準備中</output>';document.body.append(panel);
const status=panel.querySelector('output')!;
for(const button of panel.querySelectorAll<HTMLButtonElement>('button'))button.onclick=async()=>{status.textContent='再生中';const action=button.dataset.action;
 if(action==='reset'||action==='opponent'){ctl.destroy();ctl=new TestController(root,0,{onHome(){},onRematch(){}});ctl.show(action==='opponent'?1:0);}
 else if(action==='destroy')ctl.destroy();else if(action==='rerender')ctl.reconnect();else if(action==='end')ctl.submit({type:'endTurn'});else{const uid=action==='cast'?'cast':'late',g=ctl.snapshot(),idx=g.players[g.cur].hand.findIndex(c=>c.uid===uid);if(idx>=0)ctl.submit({type:'play',idx});}
 await (ctl as unknown as {queue:Promise<void>}).queue;status.textContent='完了';};
void waitForDuel(root).then(()=>status.textContent='準備完了');window.addEventListener('pagehide',()=>{ctl.destroy();stop();},{once:true});
