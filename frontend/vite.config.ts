import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // Ensure this matches your Express backend port
        changeOrigin: true,
        secure: false,
      },
    },
  },
});