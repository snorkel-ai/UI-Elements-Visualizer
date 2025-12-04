import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  // Use BASE_URL env var if set, otherwise default based on NODE_ENV
  base: process.env.BASE_URL || (process.env.NODE_ENV === 'production' ? '/UI-Elements-Visualizer/' : '/'),
  server: {
    port: 3006,
    strictPort: false, // Automatically use next available port if 3006 is taken
  },
})
