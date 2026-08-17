import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tracewoodBackendPlugin } from './src/vitePlugin.js';

export default defineConfig({
  plugins: [
    react(),
    tracewoodBackendPlugin()
  ],
  server: {
    port: 5173,
    host: true
  }
});
