import {rasterMatte} from './matteRaster';
import {rasterFrameMask} from './raster';
self.onmessage=(event:MessageEvent<{id:number;image:ImageBitmap;artPath?:string;seals:number[][];matte?:{width:number;height:number}}>)=>{
 const {id,image,artPath,seals}=event.data;
 try{
  if(!event.data.matte&&!('filter' in new OffscreenCanvas(1,1).getContext('2d')!))throw Error('Worker canvas filter unavailable');
  const canvas=event.data.matte?rasterMatte(image,event.data.matte.width,event.data.matte.height,()=>new OffscreenCanvas(1,1)):rasterFrameMask(image,artPath,seals,()=>new OffscreenCanvas(1,1));
  const bitmap=canvas.transferToImageBitmap();
  self.postMessage({id,bitmap},{transfer:[bitmap]});
 }catch(error){self.postMessage({id,error:String(error)});}finally{image.close();}
};
