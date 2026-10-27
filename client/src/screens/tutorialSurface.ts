import type {App,Screen} from '../router';
import {mountHome} from './home';
import {mountDeck} from './deck';
import {HOME_TOUR,DECK_TOUR,TUTORIAL_PARTS,tutorialPartKey} from '../shared/tutorialParts';
import {TutorialSpotlight} from '../ui/tutorialSpotlight';

const complete=(part:number)=>{try{localStorage.setItem(tutorialPartKey(part),'1');}catch{}};

export function mountTutorialHomePart(app:App):Screen{
 const screen=mountHome(app);
 const tour=new TutorialSpotlight(app.root,HOME_TOUR,{label:TUTORIAL_PARTS[11].title,onComplete:()=>{complete(11);app.tutorialPart(12);},onExit:()=>app.tutorial()});
 return{destroy(){tour.destroy();screen.destroy?.();}};
}

export function mountTutorialDeckPart(app:App):Screen{
 const screen=mountDeck(app);
 const tour=new TutorialSpotlight(app.root,DECK_TOUR,{label:TUTORIAL_PARTS[12].title,onComplete:()=>{complete(12);app.tutorial();},onExit:()=>app.tutorial()});
 return{beforeLeave:()=>screen.beforeLeave?.()??Promise.resolve(true),destroy(){tour.destroy();screen.destroy?.();}};
}
