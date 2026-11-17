import {cardName,getLang,t} from '../i18n';
import {MULLIGAN_MS} from '../shared/opening';
import {FRAME_BACK,sleeveUrl} from '../shared/cards';
import type {CardInst} from '../shared/types';
import {cardEl} from './cardView';
import {bindZoom,zoomCard} from './cardInspection';
import {sfx} from './sound';
import {sortedSupplyEntries} from '../shared/cardPresentation';
import '../styles/marketPreview.css';

const copy={
  ja:{market:'マーケット',fixed:'固定マーケット',offer:'提示マーケット',inspect:'カードを選ぶと詳細を表示',ready:'準備完了',help:'引き直すカードを2枚まで選んでください。',keep:'そのまま始める',keepLane:'手札に残す',returnLane:'山札に戻す',waiting:'対戦相手が初手を選んでいます',submitted:'選択を送信中…',confirm:(n:number)=>n+'枚の交換を確定',confirmed:'初手が決まりました',time:'残り時間'},
  en:{market:'Market',fixed:'Fixed market',offer:'Offer market',inspect:'Select a card to inspect it',ready:'Ready',help:'Choose up to two cards to redraw.',keep:'Keep this hand',keepLane:'Keep in hand',returnLane:'Return to deck',waiting:'Your opponent is choosing their hand',submitted:'Submitting hand…',confirm:(n:number)=>'Exchange '+n+(n===1?' card':' cards'),confirmed:'Your opening hand',time:'Time left'},
  ko:{market:'마켓',fixed:'고정 마켓',offer:'제시 마켓',inspect:'카드를 선택해 자세히 보기',ready:'준비 완료',help:'다시 뽑을 카드를 최대 2장 선택하세요.',keep:'그대로 시작',keepLane:'손에 유지',returnLane:'덱으로 반환',waiting:'상대가 시작 패를 고르고 있습니다',submitted:'선택을 보내는 중…',confirm:(n:number)=>n+'장 교환 확정',confirmed:'시작 패가 결정되었습니다',time:'남은 시간'}
};
function element<K extends keyof HTMLElementTagNameMap>(tag:K,cls:string,text?:string){
  const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el;
}
function stage(kind:'market'|'hand',title:string){
  const node=element('section','opening-study '+kind+'-study');
  const head=element('header','study-head'),group=element('div','study-heading');
  group.append(element('h2','study-title',title));
  const clock=element('div','study-clock'),clockValue=element('strong','study-seconds'),clockLabel=element('span','study-clock-label',copy[getLang()].time);
  clock.append(clockValue,clockLabel);head.append(group,clock);
  const content=element('div','study-content'),foot=element('footer','study-foot');
  const status=element('span','study-status'),button=element('button','btn btn-primary study-action');
  button.type='button';status.setAttribute('role','status');foot.append(status,button);node.append(head,content,foot);
  const time=(seconds:number|null,total:number)=>{
    const left=seconds===null?null:Math.max(0,Math.ceil(seconds));
    clockValue.textContent=left===null?'—':String(left).padStart(2,'0');
    clock.style.setProperty('--remaining',(left===null?1:Math.min(1,left/total))*100+'%');
    clock.classList.toggle('running-low',left!==null&&left<=5);
  };
  return {node,content,status,button,time};
}
type Appearance={sleeve?:string|null;frame?:string|null;effect?:string|null};
function dealtCard(c:CardInst,index:number,appearance:Appearance={}){
  const slot=element('div','study-slot'),lift=element('div','study-lift'),leaf=element('div','study-leaf');
  const face=cardEl(c,{fullArt:true,frame:appearance.frame??undefined,effect:appearance.effect??undefined});
  face.tabIndex=0;face.setAttribute('role','button');face.setAttribute('aria-label',cardName(c));
  face.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();face.click();}};
  bindZoom(face,c);
  slot.style.setProperty('--ordinal',String(index));leaf.style.setProperty('--back',`url("${appearance.sleeve?sleeveUrl(appearance.sleeve):FRAME_BACK}")`);
  leaf.append(face);lift.append(leaf);slot.append(lift);return {slot,lift,face};
}

export function buildMarketStudy(market:CardInst[],supply:(CardInst|null)[]|undefined,ready:()=>void){
  const words=copy[getLang()],scene=stage('market',words.market);
  const addRow=(label:string,kind:string,cards:CardInst[])=>{
    const row=element('section','market-row '+kind),title=element('h3','market-row-title',label);
    row.setAttribute('aria-label',label);
    const rack=element('div','study-rack pv-cards');
    cards.forEach((c,i)=>{
      const {slot,face}=dealtCard(c,i);face.onclick=()=>zoomCard(c);rack.append(slot);
    });
    row.append(title,rack);scene.content.append(row);
  };
  addRow(words.fixed,'fixed-market',market);
  if(supply)addRow(words.offer,'offer-market',sortedSupplyEntries(supply).map(entry=>entry.c));
  scene.button.id='pvReady';scene.button.textContent=words.ready;
  scene.button.onclick=()=>{scene.button.disabled=true;scene.button.textContent=t('preview.waiting');ready();};
  const update=(until:number|null)=>{
    const left=until===null?null:(until-Date.now())/1000;
    scene.time(left,15);const msg=left===null?t('preview.waiting'):left<=0?t('preview.starting'):words.inspect;
    if(scene.status.textContent!==msg)scene.status.textContent=msg;
  };
  return {node:scene.node,button:scene.button,update};
}

export function buildHandStudy(pool:CardInst[],confirmed:boolean,select:(uids:string[])=>void,appearance:Appearance){
  const words=copy[getLang()],scene=stage('hand',confirmed?words.confirmed:words.help);
  scene.node.classList.add('opening-hand-picker');scene.node.classList.toggle('is-confirmed',confirmed);
  const count=element('span','return-count');count.setAttribute('aria-live','polite');
  const rail=(name:string,cls:string)=>{
    const row=element('div','study-lane '+cls),label=element('div','lane-title',name),slots=element('div','lane-slots');
    const mark=element('i','lane-mark',cls==='return-lane'?'↻':'◇');mark.setAttribute('aria-hidden','true');label.prepend(mark);
    if(cls==='return-lane')label.append(count);
    row.append(label,slots);scene.content.append(row);return slots;
  };
  const picked:string[]=[],max=Math.min(2,pool.length);
  const docks:HTMLElement[]=[];
  if(!confirmed){
    const back=rail(words.returnLane,'return-lane');
    for(let i=0;i<max;i++){
      const dock=element('div','return-socket');dock.setAttribute('aria-hidden','true');
      dock.append(element('i','return-arrow','↻'));back.append(dock);docks.push(dock);
    }
  }
  const hand=rail(words.keepLane,'keep-lane');hand.classList.add('picker-grid');
  const cards=pool.map((c,i)=>{
    const entry=dealtCard(c,i,appearance);hand.append(entry.slot);
    entry.face.setAttribute('aria-pressed','false');return {...entry,uid:c.uid};
  });
  let locked=confirmed;
  function position(){
    for(const {uid,slot,lift} of cards){
      const target=docks[picked.indexOf(uid)],from=slot.getBoundingClientRect(),to=target?.getBoundingClientRect();
      lift.style.setProperty('--dx',to?(to.left-from.left)+'px':'0px');lift.style.setProperty('--dy',to?(to.top-from.top)+'px':'0px');
    }
  }
  const paint=()=>{
    cards.forEach(({uid,slot,face})=>{
      const chosen=picked.includes(uid);
      slot.classList.toggle('goes-back',chosen);face.classList.toggle('is-picked',chosen);
      face.setAttribute('aria-pressed',String(chosen));
      face.setAttribute('aria-disabled',String(locked||(!chosen&&picked.length>=max)));
    });
    docks.forEach((dock,i)=>dock.classList.toggle('occupied',i<picked.length));
    count.textContent=picked.length+' / '+max;
    scene.button.textContent=picked.length?words.confirm(picked.length):words.keep;
    position();
  };
  cards.forEach(({uid,face})=>{face.onclick=()=>{
    if(locked)return;
    const i=picked.indexOf(uid);
    if(i>=0)picked.splice(i,1);else if(picked.length<max)picked.push(uid);else return;
    sfx('pop');paint();
  };});
  const commit=(uids:string[])=>{
    if(locked)return;locked=true;scene.button.disabled=true;scene.button.textContent=words.submitted;
    scene.node.classList.add('is-submitted');select(uids);
  };
  scene.button.onclick=()=>commit([...picked]);
  scene.node.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.getElementById('zoomOverlay'))commit([]);});
  if(confirmed)scene.status.textContent=words.waiting;else scene.status.remove();
  scene.button.hidden=confirmed;paint();
  const resize=new ResizeObserver(position);resize.observe(scene.content);
  return {node:scene.node,update:(seconds:number)=>scene.time(seconds,MULLIGAN_MS/1000),dispose:()=>resize.disconnect()};
}
