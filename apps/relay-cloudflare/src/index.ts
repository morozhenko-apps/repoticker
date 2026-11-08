// Operator-owned Cloudflare Worker. No deployment is performed by RepoTicker CI.
import { handleRelayRequest } from "./worker.mjs";
export { RelayHub } from "./hub.mjs";

export default {
  async fetch(request: Request, env: unknown): Promise<Response> {
    return handleRelayRequest(request, env);
  }
};
