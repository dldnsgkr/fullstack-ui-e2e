import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite builds the React frontend into dist/. The production server
// (server/index.js) serves that folder together with the /api routes.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      // During frontend development, forward API calls to the Node server.
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
