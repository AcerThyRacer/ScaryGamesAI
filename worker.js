// Cloudflare Worker entry point
// Static assets from ./dist are served automatically via [assets] config.
// This worker handles requests that don't match static assets.

const FALLBACK_API_ORIGIN = 'https://scarygames.ai';

function normalizeOrigin(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function resolveApiOrigin(env, requestUrl) {
  const explicitOrigin = normalizeOrigin(env?.API_ORIGIN || env?.BACKEND_ORIGIN || '');
  if (explicitOrigin) return explicitOrigin;

  const host = requestUrl.hostname.toLowerCase();
  if (host === 'scarygaming.com' || host === 'www.scarygaming.com') {
    return FALLBACK_API_ORIGIN;
  }
  return null;
}

function jsonError(status, code, message) {
  return new Response(
    JSON.stringify({ success: false, error: { code, message } }),
    {
      status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store'
      }
    }
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      const apiOrigin = resolveApiOrigin(env, url);
      if (!apiOrigin || apiOrigin === url.origin) {
        return jsonError(503, 'API_ORIGIN_NOT_CONFIGURED', 'API backend is not configured.');
      }

      const targetUrl = `${apiOrigin}${url.pathname}${url.search}`;
      const proxyRequest = new Request(targetUrl, request);
      proxyRequest.headers.set('x-forwarded-host', url.host);
      proxyRequest.headers.set('x-forwarded-proto', url.protocol.replace(':', ''));

      try {
        const upstream = await fetch(proxyRequest);

        // Cloudflare returns 530 when the upstream origin is misconfigured/unreachable (often DNS/origin issues).
        // Surface a consistent JSON error so clients don't attempt to parse an HTML error page.
        if (upstream.status === 530) {
          return jsonError(502, 'API_UPSTREAM_530', 'API backend is unreachable.');
        }

        return new Response(upstream.body, {
          status: upstream.status,
          statusText: upstream.statusText,
          headers: upstream.headers
        });
      } catch {
        return jsonError(502, 'API_UPSTREAM_UNREACHABLE', 'API backend is unreachable.');
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};
