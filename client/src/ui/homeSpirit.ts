import type {App} from '../router';
import {createHomeZenoFlight} from './homeZenoFlight';
import {mountManaSpirit} from './manaSpirit';

// One HOME renderer per application. Navigating away suspends every frame but
// keeps its geometry, environment and compiled shaders for an instant return.
const instances=new WeakMap<App,{button:HTMLButtonElement;spirit:ReturnType<typeof mountManaSpirit>;flight:ReturnType<typeof createHomeZenoFlight>}>();
export function mountHomeSpirit(app:App,placeholder:HTMLButtonElement):()=>void {
 let entry=instances.get(app);
 if(!entry){
  const spirit=mountManaSpirit(placeholder.querySelector('.home-spirit-host')!,{
    home:true,interactive:placeholder,onActivate:greet=>flight.activate(greet),
  });
  const flight=createHomeZenoFlight(placeholder,spirit.setFlightView);
  entry={button:placeholder,spirit,flight};
  instances.set(app,entry);
 }else{
  entry.button.setAttribute('aria-label',placeholder.getAttribute('aria-label')!);
  placeholder.replaceWith(entry.button);entry.spirit.resume();
 }
 const {button,spirit,flight}=entry;
 return()=>{spirit.suspend();flight.reset();button.remove();};
}

export function releaseHomeSpirit(app:App):void {
 const entry=instances.get(app);if(!entry)return;
 entry.flight.destroy();entry.spirit.destroy();entry.button.remove();instances.delete(app);
}
