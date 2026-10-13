import {LibraryScene} from '../../ui/gachaAzure/scene';
const canvas=document.createElement('canvas');document.body.append(canvas);
const controls=document.createElement('nav');controls.style.cssText='position:fixed;bottom:12px;left:12px;display:flex;gap:8px;z-index:2';document.body.append(controls);
const scene=new LibraryScene(canvas);let seconds=6.4;
function render(){scene.resize(innerWidth,innerHeight);scene.render(seconds);}
await scene.ready;
for(const time of [0,3,6.4,6.9,7.4,7.9,8.4,9,10.35,12.4,14.6,17.95]){const b=document.createElement('button');b.textContent=`${time}s`;b.onclick=()=>{seconds=time;render()};controls.append(b)}
addEventListener('resize',render);render();
