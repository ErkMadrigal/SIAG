import axios from 'axios'
import { sesionExpirada } from '@/composables/useInactividad.js'

// ── BASE URL ──────────────────────────────────────────────────────────
// PRODUCCIÓN
// const BASE_URL   = 'https://serprosep.vinculasag.com/api/v1'
// const REFRESH_URL = 'https://serprosep.vinculasag.com/api/v1/auth/refresh'

// LOCAL (descomentar para pruebas locales y comentar las de arriba)
const BASE_URL    = '/api/v1'
const REFRESH_URL = '/api/v1/auth/refresh'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
})

let isRefreshing = false
let failedQueue  = []

function processQueue(error, token = null) {
  failedQueue.forEach(prom => {
    error ? prom.reject(error) : prom.resolve(token)
  })
  failedQueue = []
}

function dispararSesionExpirada() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  sesionExpirada.value = true
}

// ── REQUEST — Bearer token + refresh proactivo si expira en < 3 min ──
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('access_token')
    if (!token) return config

    config.headers.Authorization = `Bearer ${token}`

    try {
      const payload     = JSON.parse(atob(token.split('.')[1]))
      const restanteMin = (payload.exp * 1000 - Date.now()) / 1000 / 60

      if (restanteMin < 3 && restanteMin > 0 && !isRefreshing) {
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken) {
          isRefreshing = true
          try {
            const { data } = await axios.post(
              REFRESH_URL,
              { refresh_token: refreshToken },
              { headers: { 'Content-Type': 'application/json' } }
            )
            const newToken   = data.data.tokens?.access_token || data.data.access_token
            const newRefresh = data.data.tokens?.refresh_token || data.data.refresh_token

            localStorage.setItem('access_token', newToken)
            if (newRefresh) localStorage.setItem('refresh_token', newRefresh)

            config.headers.Authorization = `Bearer ${newToken}`
            processQueue(null, newToken)
          } catch (e) {
            processQueue(e, null)
            dispararSesionExpirada()
          } finally {
            isRefreshing = false
          }
        }
      }
    } catch {}

    return config
  },
  (error) => Promise.reject(error)
)

// ── RESPONSE — refresh reactivo cuando llega 401 ──────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {

      // Si el refresh en sí da 401, sesión definitivamente expirada
      if (original.url?.includes('auth/refresh')) {
        dispararSesionExpirada()
        return Promise.reject(error)
      }

      // Si ya hay un refresh en curso, encolar
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        }).catch(err => Promise.reject(err))
      }

      original._retry = true
      isRefreshing    = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) {
          dispararSesionExpirada()
          return Promise.reject(error)
        }

        const { data } = await axios.post(
          REFRESH_URL,
          { refresh_token: refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        )

        const newToken   = data.data.tokens?.access_token || data.data.access_token
        const newRefresh = data.data.tokens?.refresh_token || data.data.refresh_token

        localStorage.setItem('access_token', newToken)
        if (newRefresh) localStorage.setItem('refresh_token', newRefresh)

        api.defaults.headers.common.Authorization = `Bearer ${newToken}`
        original.headers.Authorization            = `Bearer ${newToken}`

        processQueue(null, newToken)
        return api(original)

      } catch (refreshError) {
        processQueue(refreshError, null)
        dispararSesionExpirada()
        return Promise.reject(refreshError)

      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api