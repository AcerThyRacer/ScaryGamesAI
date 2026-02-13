const { defineConfig } = require('vite');
const { resolve } = require('path');

module.exports = defineConfig({
  build: {
    target: 'es2019',
    sourcemap: process.env.SOURCE_MAPS === 'true',
    cssCodeSplit: true,
    minify: 'esbuild',
    manifest: true,
    reportCompressedSize: true,
    modulePreload: {
      polyfill: true
    },
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        games: resolve(__dirname, 'games.html'),
        challenges: resolve(__dirname, 'challenges.html'),
        achievements: resolve(__dirname, 'achievements.html'),
        leaderboards: resolve(__dirname, 'leaderboards.html'),
        store: resolve(__dirname, 'store.html'),
        subscription: resolve(__dirname, 'subscription.html')
      },
      output: {
        entryFileNames: 'assets/js/[name]-[hash].js',
        chunkFileNames: 'assets/js/chunks/[name]-[hash].js',
        assetFileNames: ({ name }) => {
          if (!name) return 'assets/[name]-[hash][extname]';
          if (name.endsWith('.css')) return 'assets/css/[name]-[hash][extname]';
          if (/\.(png|jpe?g|gif|svg|webp|avif|ico)$/.test(name)) return 'assets/img/[name]-[hash][extname]';
          if (/\.(woff2?|ttf|otf)$/.test(name)) return 'assets/fonts/[name]-[hash][extname]';
          return 'assets/[name]-[hash][extname]';
        },
        manualChunks(id) {
          // Separate Three.js for better caching (it's large ~600KB)
          if (id.includes('/node_modules/three')) return 'three';
          // Separate Stripe for payment pages only
          if (id.includes('/node_modules/stripe')) return 'stripe';
          // Other vendor dependencies
          if (id.includes('/node_modules/')) return 'vendor';

          if (id.includes('/js/page-shell') || id.includes('/js/perf-entry')) return 'shell';
          if (id.includes('/js/main.js')) return 'main';

          if (id.includes('/games/the-abyss/js/engine/')) return 'game-abyss-engine';
          if (id.includes('/games/the-abyss/js/')) return 'game-the-abyss';

          const gameMatch = id.match(/\/games\/([^/]+)\//);
          if (gameMatch && gameMatch[1]) {
            return `game-${gameMatch[1]}`;
          }

          if (id.includes('/js/adaptive-quality') || id.includes('/js/transitions') || id.includes('/js/scroll-fx') || id.includes('/js/micro-interactions')) {
            return 'runtime-effects';
          }

          if (id.includes('/js/challenges') || id.includes('/js/leaderboards') || id.includes('/js/achievements') || id.includes('/js/store-system') || id.includes('/js/subscription-system')) {
            return 'features';
          }
        }
      }
    }
  }
});
