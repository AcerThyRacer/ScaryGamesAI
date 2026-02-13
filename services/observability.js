/**
 * Observability bootstrap:
 * - Optional Sentry backend integration
 * - Optional OpenTelemetry SDK bootstrap
 * - CloudWatch EMF request metrics
 */

const crypto = require('crypto');

function safeRequire(moduleName) {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(moduleName);
  } catch (error) {
    return null;
  }
}

const Sentry = safeRequire('@sentry/node');
const { NodeSDK } = safeRequire('@opentelemetry/sdk-node') || {};
const { getNodeAutoInstrumentations } = safeRequire('@opentelemetry/auto-instrumentations-node') || {};
const { OTLPTraceExporter } = safeRequire('@opentelemetry/exporter-trace-otlp-http') || {};

let otelSdk = null;
let sentryEnabled = false;

function isTruthy(value, fallback = false) {
  if (value == null) return fallback;
  return String(value).toLowerCase() === 'true';
}

function currentEnvironment() {
  return process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
}

function currentRelease() {
  return process.env.APP_RELEASE || process.env.GITHUB_SHA || process.env.npm_package_version || 'dev';
}

function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || !Sentry || typeof Sentry.init !== 'function') return;

  Sentry.init({
    dsn,
    environment: currentEnvironment(),
    release: currentRelease(),
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1)
  });

  sentryEnabled = true;
}

function initOpenTelemetry() {
  const enabled = isTruthy(process.env.OTEL_ENABLED, false);
  if (!enabled) return;
  if (!NodeSDK || !getNodeAutoInstrumentations) return;

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '';
  const traceExporter = endpoint && OTLPTraceExporter
    ? new OTLPTraceExporter({ url: endpoint })
    : undefined;

  otelSdk = new NodeSDK({
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations()]
  });

  Promise.resolve(otelSdk.start()).catch(() => {
    // Non-fatal: API continues without OTEL export.
  });
}

function emitCloudWatchMetric({ req, statusCode, durationMs }) {
  const emit = isTruthy(process.env.CLOUDWATCH_EMF_ENABLED, true);
  if (!emit) return;

  const namespace = process.env.CLOUDWATCH_METRIC_NAMESPACE || 'ScaryGamesAI/API';
  const route = req.route?.path || req.path || 'unknown';
  const environment = currentEnvironment();

  const payload = {
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [
        {
          Namespace: namespace,
          Dimensions: [['Environment', 'Route', 'Method']],
          Metrics: [
            { Name: 'RequestCount', Unit: 'Count' },
            { Name: 'ErrorCount', Unit: 'Count' },
            { Name: 'LatencyMs', Unit: 'Milliseconds' }
          ]
        }
      ]
    },
    Environment: environment,
    Route: String(route),
    Method: req.method,
    RequestCount: 1,
    ErrorCount: statusCode >= 500 ? 1 : 0,
    LatencyMs: Number(durationMs.toFixed(2))
  };

  // Structured JSON for CloudWatch Logs EMF extraction.
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
}

function httpMetricsMiddleware() {
  return (req, res, next) => {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1e6;
      emitCloudWatchMetric({ req, statusCode: res.statusCode, durationMs });
    });

    next();
  };
}

function captureException(error, context = {}) {
  if (sentryEnabled && Sentry && typeof Sentry.captureException === 'function') {
    Sentry.withScope((scope) => {
      if (context.tags && typeof context.tags === 'object') {
        Object.entries(context.tags).forEach(([k, v]) => scope.setTag(k, String(v)));
      }

      if (context.extra && typeof context.extra === 'object') {
        Object.entries(context.extra).forEach(([k, v]) => scope.setExtra(k, v));
      }

      Sentry.captureException(error);
    });
  }
}

function hashIdentifier(value) {
  if (value == null || value === '') return null;
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}

function sanitizeFields(input) {
  const source = input && typeof input === 'object' ? input : {};
  const out = {};
  const sensitiveRe = /(authorization|token|secret|password|cookie|session|email)/i;
  const pseudonymizeRe = /(userid|user_id|ip|ipaddress|ip_address)/i;

  for (const [key, value] of Object.entries(source)) {
    if (value == null) {
      out[key] = value;
      continue;
    }

    if (sensitiveRe.test(key)) {
      out[key] = '[redacted]';
      continue;
    }

    if (pseudonymizeRe.test(key)) {
      out[key] = hashIdentifier(value);
      continue;
    }

    if (typeof value === 'string') {
      out[key] = value.length > 200 ? `${value.slice(0, 200)}…` : value;
      continue;
    }

    out[key] = value;
  }

  return out;
}

function parseSampleRate(raw, fallback) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;
  return parsed;
}

function shouldEmit({ sampleRate = 1, force = false }) {
  if (force) return true;
  if (sampleRate >= 1) return true;
  if (sampleRate <= 0) return false;
  return Math.random() <= sampleRate;
}

function emitStructuredEvent(kind, event, fields = {}, options = {}) {
  if (!isTruthy(process.env.OBS_STRUCTURED_LOGS_ENABLED, true)) return;

  const sampleRate = parseSampleRate(options.sampleRate, 1);
  const force = options.force === true;
  if (!shouldEmit({ sampleRate, force })) return;

  const payload = {
    ts: new Date().toISOString(),
    kind,
    event,
    environment: currentEnvironment(),
    release: currentRelease(),
    fields: sanitizeFields(fields)
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
}

function recordSecurityEvent(event, fields = {}, options = {}) {
  const sampleRate = parseSampleRate(
    options.sampleRate != null ? options.sampleRate : process.env.OBS_SECURITY_SAMPLE_RATE,
    0.15
  );

  emitStructuredEvent('security', event, fields, {
    sampleRate,
    force: options.force === true
  });
}

function recordPerfEvent(event, fields = {}, options = {}) {
  const sampleRate = parseSampleRate(
    options.sampleRate != null ? options.sampleRate : process.env.OBS_PERF_SAMPLE_RATE,
    0.1
  );

  const slowMs = Number(process.env.OBS_SLOW_REQUEST_MS || 750);
  const durationMs = Number(fields.durationMs || 0);
  const force = options.force === true || (Number.isFinite(slowMs) && durationMs >= slowMs);

  emitStructuredEvent('performance', event, fields, {
    sampleRate,
    force
  });
}

function shutdown() {
  if (!otelSdk || typeof otelSdk.shutdown !== 'function') return Promise.resolve();
  return Promise.resolve(otelSdk.shutdown()).catch(() => {});
}

function init() {
  initSentry();
  initOpenTelemetry();
}

module.exports = {
  init,
  shutdown,
  httpMetricsMiddleware,
  captureException,
  recordSecurityEvent,
  recordPerfEvent
};
