import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  base: '/showcase/', // Базовый путь для всех ассетов
  publicDir: false, // Отключаем автоматическое копирование из public
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'public/logo/*',
          dest: 'logo'
        },
        {
          src: 'public/images/*',
          dest: 'images'
        }
      ]
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist/showcase',
    emptyOutDir: true, // Можно очищать, так как теперь отдельная папка
    rollupOptions: {
      input: {
        showcase: path.resolve(__dirname, 'showcase.html'),
      },
      output: {
        entryFileNames: 'assets/showcase-[hash].js',
        chunkFileNames: 'assets/showcase-[hash].js',
        assetFileNames: 'assets/showcase-[hash].[ext]',
      }
    }
  },
  server: {
    port: 5174,
    open: '/showcase.html'
  }
});