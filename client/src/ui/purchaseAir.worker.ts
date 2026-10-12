import {buildPurchaseAirFields} from './purchaseAirFields';
const scope=globalThis as unknown as {onmessage:()=>void;postMessage:(data:ReturnType<typeof buildPurchaseAirFields>,transfer:ArrayBuffer[])=>void};
scope.onmessage=()=>{const fields=buildPurchaseAirFields();scope.postMessage(fields,fields.flatMap(f=>[f.density.buffer,f.light.buffer] as ArrayBuffer[]));};
