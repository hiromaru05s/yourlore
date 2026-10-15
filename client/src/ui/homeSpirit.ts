import type {App} from '../router';
import {mountManaSpirit} from './manaSpirit';

// One HOME renderer per application. Navigating away suspends every frame but
// keeps its geometry, environment and compiled shaders for an instant return.
const instances=new WeakMap<App,{button:HTMLButtonElement;spirit:ReturnType<typeof mountManaSpirit>}>();
export function mountHomeSpirit(app:App,placeholder:HTMLButtonElement):()=>void {
 let entry=instances.get(app);
 if(!entry){
  entry={button:placeholder,spirit:mountManaSpirit(placeholder.querySelector('.home-spirit-host')!,{home:true,interactive:placeholder})};
  instances.set(app,entry);
 }else{
  entry.button.setAttribute('aria-label',placeholder.getAttribute('aria-label')!);
  placeholder.replaceWith(entry.button);entry.spirit.resume();
 }
 const {button,spirit}=entry;
 return()=>{spirit.suspend();button.remove();};
}

export function releaseHomeSpirit(app:App):void {
 const entry=instances.get(app);if(!entry)return;
 entry.spirit.destroy();entry.button.remove();instances.delete(app);
}
