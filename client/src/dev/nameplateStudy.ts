import './nameplateBoard';
import './nameplateStudy.css';
const looks=['brass','ivory','leather'] as const;
function select(value:string|null){
 const look=looks.find(x=>x===value)??'brass';
 document.documentElement.dataset.nameplateLook=look;
 parent.postMessage({type:'nameplate-look',look},location.origin);
}
select(new URLSearchParams(location.search).get('look'));
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.type==='nameplate-select')select(e.data.look);});
window.addEventListener('keydown',e=>{const index=['1','2','3'].indexOf(e.key);if(index>=0)select(looks[index]);});
