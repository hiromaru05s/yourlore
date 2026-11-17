// Seconds of visible, unobscured screen time. Hidden tabs and dialogs do not
// accrue a backlog of gestures to replay when the player returns.
const GESTURE_SECONDS = 3.8;
const smooth = (value:number) => {
  const x=Math.min(1,Math.max(0,value));
  return x*x*(3-2*x);
};

export function createSingleIdleMotion(random:()=>number=Math.random) {
  let time=0,blinkAt=2.6+random()*3,gestureCheckAt=11+random()*5;
  let gestureAt:number|undefined;
  return {
    advance(delta:number) {
      time+=Math.max(0,delta);
      let blink=0;
      if(time>=blinkAt){
        const age=time-blinkAt;
        blink=smooth(age/.10)*(1-smooth((age-.16)/.15));
        if(age>=.31)blinkAt=time+2.6+random()*3.5;
      }
      if(time>=gestureCheckAt){
        if(gestureAt===undefined && random()<.35)gestureAt=time;
        gestureCheckAt=time+11+random()*5;
      }
      const age=gestureAt===undefined ? -1 : time-gestureAt;
      const gesture=age<0 ? 0 : smooth(age/1.25)*(1-smooth((age-2.15)/1.65));
      if(age>=GESTURE_SECONDS)gestureAt=undefined;
      return {time,blink,gesture};
    },
  };
}
