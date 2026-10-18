// Explicitly unavailable: never acknowledge GitHub webhook delivery without validation and persistence.
export default {
  async fetch(_request: Request): Promise<Response> {
    return new Response("RepoTicker relay is not implemented", {
      status: 501,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
};
