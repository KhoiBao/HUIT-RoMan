/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Test nghiệp vụ bám giờ Việt Nam (backend gửi UTC); CI runner mặc định là UTC.
    env: { TZ: 'Asia/Ho_Chi_Minh' },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5056',
        changeOrigin: true,
      },
      '/hubs': {
        target: 'http://localhost:5056',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
