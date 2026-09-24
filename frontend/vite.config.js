import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'https://root-forge.vercel.app',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'https://root-forge.vercel.app',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
