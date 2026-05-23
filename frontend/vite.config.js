import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to Django in development
      '/api': {
        target     : 'http://localhost:8000',
        changeOrigin: true,
      },
      '/media': {
        target     : 'http://localhost:8000',
        changeOrigin: true,
      },
      // Proxy WebSocket
      '/ws': {
        target : 'ws://localhost:8000',
        ws     : true,
      },
    },
  },
  build: {
    outDir    : 'dist',
    sourcemap : false,
    // Split vendor chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor : ['react', 'react-dom'],
          router : ['react-router-dom'],
        },
      },
    },
  },
})