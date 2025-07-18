import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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