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
  base: '/demo/',
  server: {
    host: true,
    port: 5174,
  },
  build: {
    outDir: 'dist/demo',
    rollupOptions: {
      input: {
        demo: 'demo.html'
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})