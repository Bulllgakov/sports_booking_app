import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'public/logo',
          dest: '.'
        },
        {
          src: 'public/favicon.svg',
          dest: '.'
        }
      ]
    })
  ],
  base: '/admin/',
  server: {
    host: true, // Слушать на всех интерфейсах
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist/admin'
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})