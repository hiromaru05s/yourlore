import {ease} from './kinematics';
export const DURATION=17.95;
/** Compress the old 1.5–3.0 second selection beat into 0.45 seconds. */
export const storyTime=(seconds:number)=>seconds+1.05*ease(1.5,1.95,seconds);
export function playbackTime(story:number){
 let lo=0,hi=19;for(let i=0;i<40;i++){const mid=(lo+hi)/2;if(storyTime(mid)<story)lo=mid;else hi=mid;}return (lo+hi)/2;
}
