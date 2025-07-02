import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['aws-sdk'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  define: {
    global: 'globalThis',
    'process.env': '{}',
    'process.browser': true,
  },
  resolve: {
    alias: {
      './runtimeConfig': './runtimeConfig.browser',
    },
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
      exclude: ['aws-sdk'],
    },
    rollupOptions: {
      external: ['aws-sdk'],
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
        }
      },
    },
    sourcemap: false,
    minify: 'terser',
    target: 'es2015',
    chunkSizeWarningLimit: 3500,
  },
});