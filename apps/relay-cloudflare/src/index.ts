// Operator-owned Cloudflare Worker; RepoTicker CI never deploys it.
import { DurableObject } from "cloudflare:workers";
import { handleRelayRequest } from "./worker.mjs";
import { RelayHubController } from "./hub.mjs";

export class RelayHub extends DurableObject {
  private hub: any;
  constructor(ctx: DurableObjectState, env: any) {
    super(ctx, env);
    this.hub = new RelayHubController(ctx, env);
  }
  fetch(request: Request): Promise<Response> { return this.hub.fetch(request); }
  webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): void {
    this.hub.webSocketMessage(socket, message);
  }
  webSocketClose(socket: WebSocket, code: number, reason: string): void {
    this.hub.webSocketClose(socket, code, reason);
  }
}

export default {
  fetch(request: Request, env: any): Promise<Response> {
    return handleRelayRequest(request, env);
  }
};
