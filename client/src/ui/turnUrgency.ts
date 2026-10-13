/** A smooth ramp during the final 25 seconds, independent of total turn length. */
export function turnUrgency(seconds:number,mine:boolean){
 return mine&&Number.isFinite(seconds)?Math.max(0,Math.min(1,(25-seconds)/25)):0;
}
export function paintTurnUrgency(seconds:number,mine:boolean){
 const button=document.getElementById('endBtn');if(!button)return;
 const urgency=turnUrgency(seconds,mine);button.dataset.urgency=String(urgency);
 button.style.setProperty('--turn-urgency',String(urgency));
 button.style.setProperty('--turn-shake',`${.5+urgency*4}px`);
 button.style.setProperty('--turn-pulse',`${1100-urgency*650}ms`);
 button.classList.toggle('turn-urgent',urgency>0);
}
