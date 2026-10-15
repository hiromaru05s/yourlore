import {sfx,warmSounds} from '../sound';
import {coinContacts} from './physics';
import {MERCHANT_VARIANT} from './selection';
/** Physical contacts share the game audio bus and lifetime of their visual. */
export class ContactSound {
 private controller=new AbortController();
 private last=0;
 constructor(private count:number,private black=false){void warmSounds(['coinLand']);}
 advance(ms:number){
  for(const e of coinContacts(MERCHANT_VARIANT,this.count,this.black))if(e.ms>this.last&&e.ms<=ms&&ms-this.last<200){
   sfx('coinLand',{signal:this.controller.signal,gain:Math.min(this.black?.19:.34,.035+e.speed*(this.black?.043:.088)),rate:(this.black?.72:1.31)+(e.i*.137%.25),pan:Math.max(-.7,Math.min(.7,e.x*.55))});
  }
  this.last=ms;
 }
 dispose(){this.controller.abort();}
}
