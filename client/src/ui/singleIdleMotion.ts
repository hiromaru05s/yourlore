// Seconds of visible, unobscured screen time. Hidden tabs and dialogs do not
// accrue a backlog of gestures to replay when the player returns.
const GESTURE_SECONDS = 4.25;
const smooth = (value:number) => {
  const x=Math.min(1,Math.max(0,value));
  return x*x*(3-2*x);
};

export function createSingleIdleMotion(random:()=>number=Math.random) {
  let time=0,blinkAt=2.4+random()*2.8,gestureCheckAt=6+random()*4;
  let gestureAt:number|undefined;
  return {
    advance(delta:number) {
      time+=Math.max(0,delta);
      let blink=0;
      if(time>=blinkAt){
        const age=time-blinkAt;
        blink=smooth(age/.12)*(1-smooth((age-.165)/.18));
        if(age>=.345)blinkAt=time+2.8+random()*3;
      }
      if(time>=gestureCheckAt){
        if(gestureAt===undefined && random()<.65)gestureAt=time;
        gestureCheckAt=time+12+random()*6;
      }
      const age=gestureAt===undefined ? -1 : time-gestureAt;
      const gesture=age<0 ? 0 : smooth(age/1.6)*(1-smooth((age-2.25)/2));
      if(age>=GESTURE_SECONDS)gestureAt=undefined;
      return {time,blink,gesture};
    },
  };
}
