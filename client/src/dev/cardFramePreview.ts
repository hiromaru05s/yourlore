import '../styles/card.css';
import {setLang} from '../i18n';
setLang('ja');
import {cardEl} from '../ui/cardView';
import {DB,FRAME_BACK,sanitizeDecks} from '../shared/cards';
import {COSMETICS} from '../shared/cosmetics';
import {renderDeckAppearance} from '../ui/deckAppearance';
const host=document.querySelector('#faces')!;
for(const [title,id] of [['モンスター','M1'],['魔法','S8'],['クエスト（変更なし）','Q_RIFT'],['裏面','back']]){
 const box=document.createElement('section');box.className='sample';
 const heading=document.createElement('h2');heading.textContent=title;box.append(heading);
 if(id==='back'){const image=new Image();image.src=FRAME_BACK;image.alt='デフォルトの裏面';box.append(image);}
 else box.append(cardEl({...DB[id],uid:'frame-preview-'+id},{size:'mkt'}));
 host.append(box);
}
// Include every historical cosmetic in this fixture's inventory, proving owned
// disabled sleeves cannot reappear in the actual deck picker.
const deck=sanitizeDecks({list:[{sleeve:'sleeve:gacha-elfweave'}]}).list[0];
renderDeckAppearance(document.querySelector('#picker')!,{group:'sleeve',deck,name:'装備の確認',owned:new Set(['default',...COSMETICS.map(c=>c.id)]),error:false,onPick:()=>{},onShop:()=>{location.href='/';},onRetry:()=>{}});
