import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['devicons-react', 'react-icons/lu', 'framer-motion'],
  },
  server: {
    port: 5173,
    host: true,
  },
})
