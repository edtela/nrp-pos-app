import { defineConfig } from 'vite';
import linaria from '@linaria/vite';

export default defineConfig({
  plugins: [
    linaria({
      include: ['**/*.ts'],
      babelOptions: {
        presets: ['@babel/preset-typescript']
      }
    })
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  server: {
    port: 5173,
    host: 'localhost'
  }
});