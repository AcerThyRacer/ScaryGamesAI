// Cloudflare Worker entry point
// Static assets from ./dist are served automatically via [assets] config
// This worker handles any requests that don't match a static asset

export default {
  async fetch(request, env) {
    // All static assets are served automatically by the assets configuration
    // This fetch handler is called for any requests not matched by static assets
    return new Response("Not Found", { status: 404 });
  },
};
