import axios from 'axios'
import { sesionExpirada, registrarActividad } from '@/composables/useInactividad.js'


// — BASE URL ————————————————————————————————
const isProduction = import.meta.env.PROD

const BASE_URL    = isProduction
  ? 'https://serprosep.vinculasag.com/api/v1'
  : '/api/v1'

export const API_BASE = BASE_URL

const REFRESH_URL = isProduction
  ? 'https://serprosep.vinculasag.com/api/v1/auth/refresh'
  : '/api/v1/auth/refresh'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
})

// ── Refresh de token (un solo vuelo: todas las peticiones comparten la misma promesa) ──
let refreshPromise = null

function esFalloDeAutenticacion(err) {
  const st = err?.response?.status
  return st === 400 || st === 401 || st === 403
}

function refrescarToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      // se lee en el momento: otra pestaña pudo haber rotado el refresh_token
      const refreshToken = localStorage.getItem('refresh_token')
      if (!refreshToken) { const e = new Error('Sin refresh token'); e.response = { status: 401 }; throw e }
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
      return newToken
    })().finally(() => { refreshPromise = null })
  }
  return refreshPromise
}
export { refrescarToken }

function dispararSesionExpirada() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  sesionExpirada.value = true
}

// ── REQUEST — Bearer token + refresh proactivo si expira en < 3 min ──
api.interceptors.request.use(
  async (config) => {
    registrarActividad()          // una petición en curso cuenta como actividad
    let token = localStorage.getItem('access_token')
    if (!token) return config

    try {
      const payload     = JSON.parse(atob(token.split('.')[1]))
      const restanteMin = (payload.exp * 1000 - Date.now()) / 1000 / 60
      if (restanteMin < 3) {
        try { token = await refrescarToken() }
        catch (e) {
          // Solo se cierra la sesión si el servidor rechazó el refresh; un corte de red no la mata
          if (esFalloDeAutenticacion(e)) dispararSesionExpirada()
        }
      }
    } catch {}

    config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// ── RESPONSE — refresh reactivo cuando llega 401 ──────────────────────
api.interceptors.response.use(
  (response) => { registrarActividad(); return response },
  async (error) => {
    registrarActividad()
    const original = error.config

    if (error.response?.status === 401 && original && !original._retry) {
      if (original.url?.includes('auth/refresh')) {
        dispararSesionExpirada()
        return Promise.reject(error)
      }
      original._retry = true
      try {
        const newToken = await refrescarToken()
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch (refreshError) {
        if (esFalloDeAutenticacion(refreshError)) dispararSesionExpirada()
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  }
)

export default api