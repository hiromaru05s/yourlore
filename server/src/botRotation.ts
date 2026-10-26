import { botNpc } from '../../client/src/shared/botNpcs';
import { nextNpcDeck, type BotRotation } from '../../client/src/shared/botRotation';
import { BOT_REWARDS } from '../../client/src/shared/progression';
import type { BotDifficulty } from '../../client/src/shared/bot';
/** Internal, per-user/per-difficulty DO. No browser route forwards this endpoint. */
export async function reserveNpcDeck(storage: DurableObjectStorage, req: Request): Promise<Response> {
  if(req.method!=='POST')return new Response('method not allowed',{status:405});
  const body=await req.json() as {difficulty?:unknown;requestId?:unknown};
  if(typeof body.difficulty!=='string'||!Object.hasOwn(BOT_REWARDS,body.difficulty)||typeof body.requestId!=='string'||!/^[A-Za-z0-9-]{1,80}$/.test(body.requestId))return new Response('invalid rotation',{status:400});
  const npc=botNpc(body.difficulty as BotDifficulty),requestId=body.requestId;
  const index=await storage.transaction(async tx=>{
    const saved=await tx.get<{rotation:BotRotation;receipts:{id:string;index:number}[]}>('npc-rotation');
    const receipt=saved?.receipts.find(x=>x.id===requestId);
    if(receipt)return receipt.index;
    const next=nextNpcDeck(npc,saved?.rotation);
    await tx.put('npc-rotation',{rotation:next.rotation,receipts:[...(saved?.receipts??[]),{id:requestId,index:next.index}].slice(-16)});
    return next.index;
  });
  return Response.json({index});
}
