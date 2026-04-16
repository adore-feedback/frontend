import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Expanded proxy configuration for better reliability with DELETE requests
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        // If your backend routes ALREADY start with /api, we don't rewrite.
        // If your backend routes start directly with /forms, uncomment the line below:
        // rewrite: (path) => path.replace(/^\/api/, '')
      },
    },
  },
})