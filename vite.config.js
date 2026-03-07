import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { fileURLToPath, URL } from 'url';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  root: '.',
  
  server: {
    port: 5173,
    host: true,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      },
      '/assets': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: 'esbuild',
    target: 'es2022', // Updated to ES2022 for modern browsers
    cssMinify: 'lightningcss', // 10x faster CSS minification
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        games: fileURLToPath(new URL('./games.html', import.meta.url)),
        achievements: fileURLToPath(new URL('./achievements.html', import.meta.url)),
        challenges: fileURLToPath(new URL('./challenges.html', import.meta.url)),
        subscription: fileURLToPath(new URL('./subscription.html', import.meta.url)),
        store: fileURLToPath(new URL('./store.html', import.meta.url)),
        marketplace: fileURLToPath(new URL('./marketplace.html', import.meta.url)),
        leaderboards: fileURLToPath(new URL('./leaderboards.html', import.meta.url)),
        'custom-games': fileURLToPath(new URL('./custom-games.html', import.meta.url)),
        'ollama-builder': fileURLToPath(new URL('./ollama-builder.html', import.meta.url))
      },
      output: {
        manualChunks: (id) => {
          // Vendor chunks for node_modules
          if (id.includes('node_modules')) {
            if (id.includes('three')) return 'vendor-three';
            if (id.includes('socket.io')) return 'vendor-socket';
            return 'vendor';
          }
          // Core engine shared chunk
          if (id.includes('/core/renderer/') || id.includes('/core/audio/') || id.includes('/core/ai/')) {
            return 'core-engine';
          }
          // Game-specific chunks
          if (id.includes('/games/')) {
            const gameName = id.split('/')[2];
            return `game-${gameName}`;
          }
          // Platform systems
          if (id.includes('/js/')) {
            return 'platform-systems';
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 500
  },
  
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'games/*',
          dest: 'games'
        },
        {
          src: 'assets/*',
          dest: 'assets'
        },
        {
          src: 'css/*',
          dest: 'css'
        }
      ]
    }),
    // Bundle visualization for performance analysis
    visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true
    })
  ],
  
  optimizeDeps: {
    include: ['three', 'socket.io-client'],
    exclude: ['games']
  },
  
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    legalComments: 'none',
    target: 'es2022'
  },
  
  css: {
    devSourcemap: true
  },
  
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./core', import.meta.url)),
      '@games': fileURLToPath(new URL('./games', import.meta.url)),
      '@js': fileURLToPath(new URL('./js', import.meta.url)),
      '@css': fileURLToPath(new URL('./css', import.meta.url)),
      '@assets': fileURLToPath(new URL('./assets', import.meta.url))
    }
  },
  
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.VERSION': JSON.stringify('2.0.0')
  },
  
  worker: {
    format: 'es'
  },
  
  preview: {
    port: 4173,
    host: true
  }
});
