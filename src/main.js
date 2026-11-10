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

// PWA: permite instalar el panel como app (solo en producción, con HTTPS)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {})
  })
}
