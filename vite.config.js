/**
 * Vite Configuration for ScaryGamesAI Platform
 * Phase 1: Performance & Foundation Excellence
 * 
 * Features:
 * - Code splitting per game
 * - Tree-shaking for Three.js
 * - Dynamic imports
 * - Asset optimization
 */

import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  root: '.',
  base: '/',
  
  build: {
    // Output directory
    outDir: 'dist',
    
    // Generate sourcemaps for production
    sourcemap: true,
    
    // Minify with esbuild (faster than terser)
    minify: 'esbuild',
    
    // Target modern browsers
    target: 'es2020',
    
    // Rollup options for code splitting
    rollupOptions: {
      input: {
        // Main entry points
        main: resolve(__dirname, 'index.html'),
        // Individual games (code-split)
        hellaphobia: resolve(__dirname, 'games/hellaphobia/hellaphobia.html'),
        backroomsPacman: resolve(__dirname, 'games/backrooms-pacman/backrooms-pacman.html'),
        caribbeanConquest: resolve(__dirname, 'games/caribbean-conquest/index.html'),
        abyss: resolve(__dirname, 'games/the-abyss/the-abyss.html'),
        subliminalSpaces: resolve(__dirname, 'games/subliminal-spaces/subliminal-spaces.html')
      },
      
      output: {
        // Split vendor chunks
        manualChunks: {
          three: ['three'],
          threeAddons: ['three/examples/jsm/controls/OrbitControls.js']
        },
        
        // Chunk file naming
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: ({ name }) => {
          if (/\.(png|jpe?g|svg|gif|webp)$/i.test(name ?? '')) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/\.css$/i.test(name ?? '')) {
            return 'assets/css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    
    // Chunk size warning limit
    chunkSizeWarningLimit: 500, // KB
    
    // Assets inline limit
    assetsInlineLimit: 4096, // 4KB
    
    // Compress with brotli
    cssCodeSplit: true
  },
  
  optimizeDeps: {
    // Pre-bundle Three.js
    include: ['three'],
    
    // Exclude large dependencies
    exclude: ['@ffmpeg/ffmpeg']
  },
  
  server: {
    port: 3000,
    open: true,
    cors: true,
    
    // Proxy API requests
    proxy: {
      '/api': {
        target: 'http://localhost:9999',
        changeOrigin: true
      }
    }
  },
  
  plugins: [
    // Copy static assets
    viteStaticCopy({
      targets: [
        {
          src: 'games/*/assets/**/*',
          dest: 'games'
        },
        {
          src: 'core/**/*.{js,json}',
          dest: 'core'
        },
        {
          src: 'api/**/*.js',
          dest: 'api'
        }
      ]
    })
  ],
  
  // Performance optimizations
  esbuild: {
    // Drop console in production
    drop: process.env.NODE_ENV === 'production' ? ['console'] : [],
    
    // Legal comments only
    legalComments: 'external',
    
    // Tree shaking
    treeShaking: true
  },
  
  // CSS processing
  css: {
    devSourcemap: true,
    
    // PostCSS plugins
    postcss: {
      plugins: [
        {
          postcssPlugin: 'internal:charset-removal',
          AtRule: {
            charset: (atRule) => {
              if (atRule.name === 'charset') {
                atRule.remove();
              }
            }
          }
        }
      ]
    }
  },
  
  // Worker configuration
  worker: {
    format: 'es'
  },
  
  // Assets
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.hdr', '**/*.exr']
});
