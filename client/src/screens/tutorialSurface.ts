import type {App,Screen} from '../router';
import {mountHome} from './home';
import {mountDeck} from './deck';
import {mountCards} from './cards';
import {HOME_TOUR,DECK_TOUR,CARDS_TOUR,TUTORIAL_PARTS,tutorialPartKey} from '../shared/tutorialParts';
import {TutorialSpotlight} from '../ui/tutorialSpotlight';

const complete=(part:number,app:App)=>{try{localStorage.setItem(tutorialPartKey(part,app.user?.id),'1');}catch{}};
export function mountTutorialHomePart(app:App):Screen{
 const screen=mountHome(app);
 const tour=new TutorialSpotlight(app.root,HOME_TOUR,{label:TUTORIAL_PARTS[11].title,onComplete:()=>{complete(11,app);app.tutorialPart(12);},onExit:()=>app.tutorial()});
 return{destroy(){tour.destroy();screen.destroy?.();}};
}
export function mountTutorialDeckPart(app:App):Screen{
 const screen=mountDeck(app);
 const tour=new TutorialSpotlight(app.root,DECK_TOUR,{label:TUTORIAL_PARTS[12].title,onComplete:()=>app.tutorialCards(),onExit:()=>app.tutorial()});
 return{beforeLeave:()=>screen.beforeLeave?.()??Promise.resolve(true),destroy(){tour.destroy();screen.destroy?.();}};
}
export function mountTutorialCardsPart(app:App):Screen{
 const screen=mountCards(app);
 const tour=new TutorialSpotlight(app.root,CARDS_TOUR,{label:TUTORIAL_PARTS[12].title,onComplete:()=>{complete(12,app);app.tutorial();},onExit:()=>app.tutorial()});
 return{destroy(){tour.destroy();screen.destroy?.();}};
}
