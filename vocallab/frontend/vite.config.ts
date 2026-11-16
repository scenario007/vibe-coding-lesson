import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

const port = Number(process.env.VOCALLAB_FRONTEND_PORT ?? 5188)
const proxy = { '/api': { target: process.env.VOCALLAB_API_URL ?? 'http://127.0.0.1:8818', changeOrigin: false } }

export default defineConfig({
  plugins: [react(), tailwind()],
  server: { host: '127.0.0.1', port, strictPort: true, proxy },
  preview: { host: '127.0.0.1', port, strictPort: true, proxy },
  esbuild: { keepNames: true },
  build: { minify: 'esbuild' },
})
