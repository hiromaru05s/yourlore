import {cardName,getLang,t} from '../i18n';
import {MULLIGAN_MS} from '../shared/opening';
import {FRAME_BACK,sleeveUrl} from '../shared/cards';
import type {CardInst,GameState,Side} from '../shared/types';
import {cardEl} from './cardView';
import {bindZoom,zoomCard} from './cardInspection';
import {sfx} from './sound';
import {sortedSupplyEntries} from '../shared/cardPresentation';
import '../styles/marketPreview.css';

const copy={
  ja:{viewMarket:'マーケットを見る',backToHand:'初手交換に戻る',market:'マーケット',fixed:'固定マーケット',offer:'提示マーケット',inspect:'カードを選ぶと詳細を表示',ready:'準備完了',help:'タップかドラッグで、引き直すカードを2枚まで選択',keep:'そのまま始める',keepLane:'手札に残す',returnLane:'山札に戻す',waiting:'対戦相手が初手を選んでいます',submitted:'選択を送信中…',confirm:(n:number)=>n+'枚の交換を確定',confirmed:'初手が決まりました',time:'残り時間'},
  en:{viewMarket:'View market',backToHand:'Back to hand',market:'Market',fixed:'Fixed market',offer:'Offer market',inspect:'Select a card to inspect it',ready:'Ready',help:'Tap or drag up to two cards to redraw.',keep:'Keep this hand',keepLane:'Keep in hand',returnLane:'Return to deck',waiting:'Your opponent is choosing their hand',submitted:'Submitting hand…',confirm:(n:number)=>'Exchange '+n+(n===1?' card':' cards'),confirmed:'Your opening hand',time:'Time left'},
  ko:{viewMarket:'마켓 보기',backToHand:'시작 패로 돌아가기',market:'마켓',fixed:'고정 마켓',offer:'제시 마켓',inspect:'카드를 선택해 자세히 보기',ready:'준비 완료',help:'탭하거나 드래그해 다시 뽑을 카드를 최대 2장 선택하세요.',keep:'그대로 시작',keepLane:'손에 유지',returnLane:'덱으로 반환',waiting:'상대가 시작 패를 고르고 있습니다',submitted:'선택을 보내는 중…',confirm:(n:number)=>n+'장 교환 확정',confirmed:'시작 패가 결정되었습니다',time:'남은 시간'}
};
function element<K extends keyof HTMLElementTagNameMap>(tag:K,cls:string,text?:string){
  const el=document.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el;
}
function stage(kind:'market'|'hand',title:string){
  const node=element('section','opening-study '+kind+'-study');
  const head=element('header','study-head'),group=element('div','study-heading');
  const heading=element('h2','study-title',title);group.append(heading);
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
  return {node,content,status,button,time,foot,heading};
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

export function buildHandStudy(state:GameState,you:Side,select:(uids:string[])=>void){
  const pool=state.players[you].hand,confirmed=!!state.mulligan?.[you];
  const appearance={sleeve:state.sleeves?.[you],frame:state.frames?.[you],effect:state.effects?.[you]};
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
  function toggleCard(uid:string){
    if(locked)return;
    const i=picked.indexOf(uid);
    if(i>=0)picked.splice(i,1);else if(picked.length<max)picked.push(uid);else return;
    sfx('pop');paint();
  }

  type HandCard=(typeof cards)[number];
  type Drag={card:HandCard;id:number;x:number;y:number;offsetX:number;offsetY:number;lane:HTMLElement;moving:boolean};
  let drag:Drag|null=null;
  function overLane(lane:HTMLElement,e:PointerEvent){
    const bounds=lane.getBoundingClientRect();
    return e.clientX>=bounds.left&&e.clientX<=bounds.right&&e.clientY>=bounds.top&&e.clientY<=bounds.bottom;
  }
  function endDrag(){
    if(!drag)return;
    const {card,id,lane}=drag;
    drag=null;
    lane.classList.remove('drop-hover');
    card.slot.classList.remove('is-dragging');
    card.lift.style.removeProperty('transform');
    if(card.face.hasPointerCapture(id))card.face.releasePointerCapture(id);
  }
  for(const card of cards){
    const {face,uid}=card;
    let suppressClick=false;
    face.onclick=e=>{if(!suppressClick||e.detail===0)toggleCard(uid);};
    face.ondragstart=e=>e.preventDefault();
    face.onpointerdown=e=>{
      if(!e.isPrimary||e.button!==0||drag)return;
      suppressClick=false;
      if(locked||face.getAttribute('aria-disabled')==='true')return;
      const chosen=picked.includes(uid);
      const lane=scene.content.querySelector<HTMLElement>(chosen?'.keep-lane':'.return-lane')!;
      const offset=new DOMMatrixReadOnly(getComputedStyle(card.lift).transform);
      drag={card,id:e.pointerId,x:e.clientX,y:e.clientY,offsetX:offset.m41,offsetY:offset.m42,lane,moving:false};
      face.setPointerCapture(e.pointerId);
    };
    face.onpointermove=e=>{
      if(!drag||drag.card!==card||drag.id!==e.pointerId)return;
      const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
      if(!drag.moving){
        if(Math.max(Math.abs(dx),Math.abs(dy))<=(e.pointerType==='touch'?12:5))return;
        suppressClick=true;
        if(document.getElementById('zoomOverlay')){endDrag();return;}
        drag.moving=true;
        card.slot.classList.add('is-dragging');
      }
      card.lift.style.transform=`translate(${drag.offsetX+dx}px,${drag.offsetY+dy}px)`;
      drag.lane.classList.toggle('drop-hover',overLane(drag.lane,e));
    };
    face.onpointerup=e=>{
      if(!drag||drag.card!==card||drag.id!==e.pointerId)return;
      const accept=drag.moving&&overLane(drag.lane,e);
      endDrag();
      if(accept)toggleCard(uid);
    };
    face.onpointercancel=face.onlostpointercapture=e=>{
      if(drag?.card===card&&drag.id===e.pointerId)endDrag();
    };
  }
  const commit=(uids:string[])=>{
    if(locked)return;endDrag();locked=true;scene.button.disabled=true;scene.button.textContent=words.submitted;
    scene.node.classList.add('is-submitted');select(uids);
  };
  scene.button.onclick=()=>commit([...picked]);
  const toggle=element('button','btn btn-ghost hand-market-toggle',words.viewMarket);
  toggle.type='button';toggle.setAttribute('aria-expanded','true');scene.foot.prepend(toggle);
  const inspection=element('div','hand-market-inspection');
  inspection.setAttribute('role','group');inspection.setAttribute('aria-label',words.market);
  inspection.hidden=true;scene.node.append(inspection);
  const publicCards=new Map([...state.market,...state.players[state.cur].supply].flatMap(c=>c?[[c.uid,c] as const]:[]));
  const targets=new Map<string,HTMLButtonElement>();
  // Only market cards receive inspection targets. The surrounding modal keeps gameplay input locked.
  function alignMarket(){
    const visible=new Set<string>();
    for(const source of document.querySelectorAll<HTMLElement>('#fixedMarket .card[data-uid],#supplyMarket .card[data-uid]')){
      const uid=source.dataset.uid!,card=publicCards.get(uid);
      if(!card)continue;
      visible.add(uid);
      let target=targets.get(uid);
      if(!target){
        target=element('button','market-inspect-target');
        target.type='button';target.setAttribute('aria-label',cardName(card));target.onclick=()=>zoomCard(card);
        inspection.append(target);targets.set(uid,target);
      }
      const r=source.getBoundingClientRect();
      target.hidden=!r.width||!r.height;
      Object.assign(target.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
    }
    for(const [uid,target] of targets)if(!visible.has(uid))target.hidden=true;
  }
  function showMarket(open:boolean){
    endDrag();
    scene.node.classList.toggle('viewing-board',open);inspection.hidden=!open;
    scene.content.hidden=open;scene.button.hidden=open||confirmed;
    scene.heading.textContent=open?words.market:confirmed?words.confirmed:words.help;
    toggle.textContent=open?words.backToHand:words.viewMarket;toggle.setAttribute('aria-expanded',String(!open));
    if(open)alignMarket();else position();
    toggle.focus({preventScroll:true});
  }
  toggle.onclick=()=>showMarket(inspection.hidden);
  scene.node.addEventListener('keydown',e=>{
    if(e.key!=='Escape'||document.getElementById('zoomOverlay'))return;
    e.preventDefault();showMarket(inspection.hidden);
  });
  if(confirmed)scene.status.textContent=words.waiting;else scene.status.remove();
  scene.button.hidden=confirmed;paint();
  const resize=new ResizeObserver(()=>{if(inspection.hidden)position();else alignMarket();});
  resize.observe(scene.node);resize.observe(scene.content);
  return {node:scene.node,update:(seconds:number)=>{scene.time(seconds,MULLIGAN_MS/1000);if(!inspection.hidden)alignMarket();},dispose:()=>{endDrag();resize.disconnect();}};
}
