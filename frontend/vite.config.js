import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Send /api/... calls to the Spring Boot backend
    proxy: { '/api': 'http://localhost:8085' },
  },
})
