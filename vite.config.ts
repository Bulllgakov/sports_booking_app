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
        },
        {
          src: 'public/robots.txt',
          dest: '../'
        },
        {
          src: 'public/sitemap.xml',
          dest: '../'
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
    outDir: 'dist/admin',
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage']
        }
      }
    },
    sourcemap: false,
    minify: 'esbuild'
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})