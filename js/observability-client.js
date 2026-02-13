(function () {
  function boolFromEnv(value, fallback) {
    if (value == null || value === '') return fallback;
    return String(value).toLowerCase() === 'true';
  }

  function readMeta(name) {
    const el = document.querySelector('meta[name="' + name + '"]');
    return el ? String(el.getAttribute('content') || '').trim() : '';
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-observability-src="' + src + '"]');
      if (existing) {
        if (window.Sentry) resolve();
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.observabilitySrc = src;
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.appendChild(script);
    });
  }

  function initSentryBrowser() {
    const dsn = readMeta('sentry-dsn') || (window.__SGAI_ENV__ && window.__SGAI_ENV__.SENTRY_DSN) || '';
    if (!dsn) return;

    const enabled = boolFromEnv(readMeta('sentry-enabled') || 'true', true);
    if (!enabled) return;

    const release = readMeta('app-release') || 'web-dev';
    const environment = readMeta('app-environment') || 'development';

    loadScript('https://browser.sentry-cdn.com/8.37.1/bundle.tracing.min.js')
      .then(() => {
        if (!window.Sentry || typeof window.Sentry.init !== 'function') return;

        window.Sentry.init({
          dsn: dsn,
          release: release,
          environment: environment,
          tracesSampleRate: Number(readMeta('sentry-traces-sample-rate') || 0.1)
        });
      })
      .catch(() => {
        // Non-fatal in static frontend mode.
      });
  }

  function init() {
    initSentryBrowser();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
