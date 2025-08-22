import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    rollupOptions: {
      input: {
        ssg: resolve(__dirname, 'index-ssg.html'),
        dynamic: resolve(__dirname, 'index-dyn.html')
      }
    }
  }
});