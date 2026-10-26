/** Temporary legacy class implementation used during the authorized reset.
 * Never receives DB bindings or performs settlement. A subsequent migration
 * deletes the entire old namespace, including objects that never wake up. */
export class RetiredUserData {
  private readonly ready: Promise<void>;
  constructor(private readonly state: DurableObjectState) {
    this.ready=state.blockConcurrencyWhile(()=>this.clear());
  }
  private async clear():Promise<void> {
    for(const ws of this.state.getWebSockets())try{ws.close(1012,'user data reset');}catch{}
    await this.state.storage.deleteAlarm();
    await this.state.storage.deleteAll();
  }
  async fetch():Promise<Response>{await this.ready;return new Response('retired',{status:410});}
  async alarm():Promise<void>{await this.ready;await this.clear();}
  async webSocketMessage(ws:WebSocket):Promise<void>{await this.ready;try{ws.close(1012,'user data reset');}catch{}}
  webSocketClose():void{}
  webSocketError(ws:WebSocket):void{try{ws.close(1012,'user data reset');}catch{}}
}
