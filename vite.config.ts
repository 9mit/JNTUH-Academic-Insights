import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/fetch': 'http://localhost:8000',
      '/analyze': 'http://localhost:8000',
      '/predict': 'http://localhost:8000',
      '/notes': 'http://localhost:8000',
    }
  }
})
