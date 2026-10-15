// Local-only deterministic QA: real reducer, BaseController and production renderer.
import '../styles/tokens.css';import '../styles/base.css';import '../styles/card.css';import '../styles/game-overlays.css';import '../styles/game.css';import '../styles/screens.css';import '../styles/reading-board.css';import '../styles/presentation.css';
import {BaseController} from '../game/controller';import {createGame,reduce} from '../shared/engine';import {DB} from '../shared/cards';import type {Action,Side,GameState,GameEvent} from '../shared/types';import {setLang} from '../i18n';import {setMyAvatar,setOppAvatar} from '../ui/boardView';import {startBoardLayout} from '../ui/layout';import {waitForDuel} from '../ui/duelReadiness';import {setFxSkip} from '../ui/anim';
setLang('ja');setMyAvatar('SEEKER_BLUE');setOppAvatar('SEEKER_RED');document.body.style.cssText='margin:0;overflow:hidden;background:#eeece5';
const root=document.getElementById('app')!;let events:GameEvent[]=[],busy=false,ready=false,controller:Harness|undefined,stop=()=>{};
class Harness extends BaseController{
 constructor(g:GameState){super(root,0,{onHome(){},onRematch(){}});this.state=g;this.introShown=true;this.view.render(g);this.view.setHandOpen(true);}
 protected get useTurnClock(){return false;}
 protected submit(action:Action){const result=reduce(this.state,action);events=result.events;busy=true;this.applyResult(result);void this.done().finally(()=>{busy=false;});}
 run(){this.submit({type:'play',idx:0});return this.done();}
 done(){return (this as unknown as {queue:Promise<void>}).queue;}
 get snapshot(){return this.state;}
}
async function setup(side:Side=0,scenario='monster',dual=false){controller?.destroy();stop();ready=false;busy=false;events=[];
 const g=createGame({mode:'bot',seed:984,starting:side,p0:{id:'qa-a',name:'YOU'},p1:{id:'qa-b',name:'OPPONENT'}}).state;g.turn=6;g.opening=undefined;g.cur=side;g.phase='main';g.pending=null;
 for(const p of g.players)Object.assign(p,{hp:60,mana:20,maxMana:20,field:[],hand:[],deck:[],discard:[],removed:[],traps:[],enchants:[],quests:[],brand:0,openingDrawReady:false});
 const p=g.players[side],o=g.players[1-side];p.hand=[{...DB[scenario==='guardian'?'TGE3':'TGE2'],uid:'origin-summon'}];p.enchants=Array.from({length:dual?2:1},(_,i)=>({card:{...DB.ORIGIN_RITE,uid:`origin-source-${i}`},turns:99,bornTurn:1}));
 const mon=(id:string,uid:string)=>({...DB[id],uid,exhausted:false,tempAtk:0,atkMod:0,defMod:0,summonedTurn:0});
 if(['monster','guardian','mixed','void','ward'].includes(scenario))o.field=[{...mon(scenario==='ward'?'VAMP1':'M1','origin-target'),...(scenario==='void'?{passive:['void']}:{} )}];
 if(scenario==='ward')p.enchants.push({card:{...DB.VAMP_WARD,uid:'ward'},turns:99,bornTurn:1});
 if(scenario==='spell'||scenario==='exile')o.enchants=[{card:{...DB[scenario==='exile'?'ORIGIN_RITE':'NO_PAIN'],uid:'origin-target'},turns:99,bornTurn:1}];
 if(scenario==='trap'||scenario==='snare')o.traps=[{card:{...(scenario==='snare'?{"id": "NT_SNARE", "t": "trap", "cost": 3, "play": 1, "react": "snare", "name": "덫 속의 덫", "nameJa": "罠の中の罠", "text": "【함정 파괴 반응】자신의 세트 함정을 파괴하는 상대 효과를 무효화하고 상대에게 10 데미지 · 이 함정은 다시 세트된다", "textJa": "【罠破壊に反応】自分のセットトラップを破壊する相手の効果を無効化し、相手に10ダメージ · このトラップは再びセットされる", "nameEn": "Trap Within a Trap", "textEn": "【On Trap Destruction】Negate an enemy effect that destroys your set traps; 10 damage · Re-sets itself"}:{"id": "T1", "t": "trap", "cost": 1, "name": "어튠 무효 장치", "text": "【어튠 반응】주사위를 굴려 3 이상이면 상대의 '어튠'을 무효화, 상대 최대 체력 +5", "react": "attuneJam", "nameJa": "アチューン無効装置", "textJa": "【アチューンに反応】ダイスを振り3以上なら相手の「アチューン」を無効化、相手の最大体力+5", "play": 1, "nameEn": "Attune Jammer", "textEn": "【On Enemy Attune】Roll a die: on 3+, negate the Attune; their max HP +5"}) as import('../shared/types').CardDef,uid:'origin-target'}}];
 controller=new Harness(g);stop=startBoardLayout();await waitForDuel(root);await new Promise(r=>setTimeout(r,150));ready=true;
}
const qa={setup,run:()=>controller!.run(),skip:()=>setFxSkip(true),destroy:()=>{controller?.destroy();stop();},get ready(){return ready},get busy(){return busy},get events(){return events},get state(){return controller?.snapshot}};
Object.assign(window,{originRuntimeQA:qa});void setup();
