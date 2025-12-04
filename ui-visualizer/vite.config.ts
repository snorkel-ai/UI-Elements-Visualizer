import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  // Use BASE_URL env var if set, otherwise use root for now
  // This makes it work on the random preview URL that serves from root
  // TODO: Once GitHub Pages uses proper URL, change back to '/UI-Elements-Visualizer/'
  base: process.env.BASE_URL || '/',
  server: {
    port: 3006,
    strictPort: false, // Automatically use next available port if 3006 is taken
  },
})
