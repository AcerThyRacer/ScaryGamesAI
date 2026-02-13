/**
 * API version detection and compatibility headers.
 */

function resolveApiVersion(req) {
  if (req.baseUrl.startsWith('/api/v2')) return 'v2';
  if (req.baseUrl.startsWith('/api/v1')) return 'v1';
  return 'v1';
}

function apiVersionMiddleware(req, res, next) {
  const version = resolveApiVersion(req);
  req.apiVersion = version;

  res.setHeader('X-API-Version', version);

  if (version === 'v1') {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', 'Wed, 31 Dec 2026 23:59:59 GMT');
    res.setHeader('Link', '</api/v2>; rel="successor-version"');
  }

  return next();
}

module.exports = {
  apiVersionMiddleware,
  resolveApiVersion
};
