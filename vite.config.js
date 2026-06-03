import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const isProduction = process.env.NODE_ENV === 'production'

export default defineConfig({
  plugins: [vue()],
  base: isProduction ? '/SIAG/' : '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost/SkyNet-SIA/public',
        changeOrigin: true,
        rewrite: (path) => path
      }
    }
  }
})