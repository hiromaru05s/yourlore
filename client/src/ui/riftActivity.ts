/** Shared receiving state for hand transfers and simultaneous field destruction. */
const users=new WeakMap<HTMLElement,number>();
export function holdRiftTarget(target:HTMLElement){
 users.set(target,(users.get(target)??0)+1);target.classList.add('is-absorbing');let released=false;
 return()=>{if(released)return;released=true;const left=(users.get(target)??1)-1;if(left>0)users.set(target,left);else{users.delete(target);target.classList.remove('is-absorbing');}};
}
