import './board';
import {cardEl} from '../../ui/cardView';
import {DB} from '../../shared/cards';
import {curseSpell,setFxSkip} from '../../ui/anim';
const button=document.createElement('button');button.textContent='カースをプレイ';button.style.cssText='position:fixed;top:10px;left:10px;z-index:200';document.body.append(button);
const run=async(side:'me'|'opp'='me')=>{setFxSkip(false);await curseSpell({...DB.BLACK_CURSE,uid:'curse-runtime-test'},side,7);};
button.onclick=()=>void run();Object.assign(window,{curseRuntimeTest:{run,cancel:()=>setFxSkip(true),cardEl}});
