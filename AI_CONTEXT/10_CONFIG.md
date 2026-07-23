# 10_CONFIG.md


==================================================
ARCHIVO: src\App.vue
==================================================

<template>
  <RouterView />
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useUiStore } from '@/stores/ui.js'

const auth = useAuthStore()
const ui   = useUiStore()

onMounted(() => {
  if (auth.accessToken && !auth.user) {
    auth.restoreSession()
  }
})
</script>

==================================================
ARCHIVO: src\main.js
==================================================

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router/index.js'
import App from './App.vue'
import './assets/main.css'
import './assets/modales.css'


const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

==================================================
ARCHIVO: vite.config.js
==================================================

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