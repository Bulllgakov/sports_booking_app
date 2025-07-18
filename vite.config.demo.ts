import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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