/* ============================================
   ScaryGamesAI — Performance Entry Loader
   Phase 6: lazy-load + predictive loading
   ============================================ */

(function () {
  const page = (window.location.pathname || '/').toLowerCase();
  const prefetched = new Set();

  const PAGE_HINTS = {
    '/store.html': ['/js/store-system.js'],
    '/challenges.html': ['/js/challenges.js', '/js/challenges-ui.js'],
    '/leaderboards.html': ['/js/leaderboards.js'],
    '/achievements.html': ['/js/achievements.js'],
    '/subscription.html': ['/js/subscription-system.js'],
    '/games.html': ['/js/customizer.js']
  };

  const idle = (cb) => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(cb, { timeout: 1200 });
    } else {
      setTimeout(cb, 250);
    }
  };

  const isConstrainedNetwork = () => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) return false;
    if (connection.saveData) return true;
    return ['slow-2g', '2g'].includes(connection.effectiveType);
  };

  const prefetch = (href, as) => {
    if (!href || prefetched.has(href)) return;
    prefetched.add(href);

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    if (as) link.as = as;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  };

  const warmRoute = (route) => {
    if (!route || isConstrainedNetwork()) return;

    prefetch(route, 'document');

    const hints = PAGE_HINTS[route] || [];
    hints.forEach((asset) => prefetch(asset, 'script'));
  };

  const wireNavigationIntentPredictor = () => {
    const navLinks = document.querySelectorAll('.nav-links a[href], a[data-prefetch="route"]');
    if (!navLinks.length) return;

    const triggerWarmup = (anchor) => {
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      let route;
      try {
        route = new URL(href, window.location.origin).pathname.toLowerCase();
      } catch (_) {
        return;
      }

      if (route === page) return;
      warmRoute(route);
    };

    navLinks.forEach((anchor) => {
      anchor.addEventListener('pointerenter', () => triggerWarmup(anchor), { passive: true });
      anchor.addEventListener('focus', () => triggerWarmup(anchor), { passive: true });
      anchor.addEventListener('touchstart', () => triggerWarmup(anchor), { passive: true, once: true });
    });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            triggerWarmup(entry.target);
            observer.unobserve(entry.target);
          });
        },
        { rootMargin: '160px 0px' }
      );

      navLinks.forEach((anchor) => observer.observe(anchor));
    }
  };

  const loadSharedEnhancements = () => Promise.allSettled([
    import('/js/image-optimizer.js'),
    import('/js/scroll-fx.js'),
    import('/js/adaptive-quality.js'),
    import('/js/transitions.js'),
    import('/js/micro-interactions.js')
  ]);

  const loadStoreEnhancements = () => Promise.allSettled([
    import('/js/image-optimizer.js'),
    import('/js/scroll-fx.js'),
    import('/js/adaptive-quality.js')
  ]);

  const run = () => {
    wireNavigationIntentPredictor();

    if (page.endsWith('/store.html')) {
      return loadStoreEnhancements();
    }

    return loadSharedEnhancements();
  };

  idle(run);
})();
