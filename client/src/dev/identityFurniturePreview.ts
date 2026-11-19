import './nameplateBoard';
import './identityFurniturePreview.css';
import './buffIconPreview.css';
import {rankEmblem} from '../ui/rankEmblem';
import {projectBoardDOM} from '../ui/boardProjection';
const root=document.getElementById('app')!;
for(const side of ['Me','Opp']){
 const rank=document.createElement('div');rank.className='identity-rank-sample';rank.dataset.side=side;
 rank.setAttribute('aria-label','ランクの配置サンプル');rank.innerHTML=rankEmblem('gold');root.append(rank);
}
projectBoardDOM(root);
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||e.source!==parent)return;
 if(e.data?.type==='identity-samples')root.dataset.insigniaSamples=e.data.show?'on':'off';
 if(e.data?.type==='identity-guides')root.dataset.showAlignment=e.data.show?'true':'false';
});
