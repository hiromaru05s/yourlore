import {surface as capture} from '../dragon-fusion-four/surface';
/** Shader compilation can delay image decoding on a busy review workstation. */
export async function surface(id:string){
  for(let attempt=0;;attempt++){
    try{return await capture(id);}catch(error){
      if(attempt>=2||!(error instanceof Error)||!error.message.includes('Card texture timeout'))throw error;
      await new Promise<void>(resolve=>setTimeout(resolve,150*(attempt+1)));
    }
  }
}
