import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-charts': ['recharts'],
          'vendor-xlsx': ['xlsx'],
          'vendor-motion': ['framer-motion'],
          'vendor-ui': ['react', 'react-dom', 'react-hot-toast', 'lucide-react'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/fetch': 'http://127.0.0.1:8000',
      '/analyze': 'http://127.0.0.1:8000',
      '/predict': 'http://127.0.0.1:8000',
      '/notes': 'http://127.0.0.1:8000',
    }
  },
  preview: {
    proxy: {
      '/fetch': 'http://127.0.0.1:8000',
      '/analyze': 'http://127.0.0.1:8000',
      '/predict': 'http://127.0.0.1:8000',
      '/notes': 'http://127.0.0.1:8000',
    }
  }
})

