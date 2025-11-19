import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  base: process.env.NODE_ENV === 'production' ? '/UI-Elements-Visualizer/' : '/',
  server: {
    port: 5174,
  },
})
