import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '@/services/auth.service.js'
import router from '@/router/index.js'
import { sesionExpirada } from '@/composables/useInactividad.js'
import axios from 'axios'

export const useAuthStore = defineStore('auth', () => {
  const user         = ref(null)
  const accessToken  = ref(localStorage.getItem('access_token')  || null)
  const refreshToken = ref(localStorage.getItem('refresh_token') || null)

  const isAuthenticated = computed(() => !!accessToken.value)

  // nivel y rol_nivel son el mismo campo — soportamos ambos por si el objeto
  // viene del localStorage (sesión restaurada) o recién del login
  const userRole = computed(() =>
    user.value?.nivel ?? user.value?.rol_nivel ?? null
  )

  const userVistas = computed(() => {
    const nivel = user.value?.nivel ?? user.value?.rol_nivel
    if (nivel === 1) return [
      'dashboard', 'empleados', 'colaboradores', 'biometrico',
      'registros', 'prenomina', 'cargar_nomina', 'altas_bajas',
      'nomina_workflow', 'revisar_nomina', 'dispersar_nomina',   
      'incidencias', 'hospitales', 'catalogos', 'tabulador',
      'usuarios', 'configuracion', 'importaciones', 'fatiga_buscador',
    ]
    return user.value?.vistas || []
  })

  const userName = computed(() => user.value?.nombre || '')

  const userInitials = computed(() => {
    if (!user.value?.nombre) return 'US'
    return user.value.nombre
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase()
  })

  async function login(credentials) {
    const data = await authService.login(credentials)

    sesionExpirada.value = false
    accessToken.value    = data.access_token
    refreshToken.value   = data.refresh_token
    user.value           = data.user

    localStorage.setItem('access_token',  data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    localStorage.setItem('user',          JSON.stringify(data.user))

    return data
  }

  async function logout() {
    try { await authService.logout() } catch {}
    clearSession()
    router.push('/login')
  }

  async function refreshAccessToken() {
    try {
      // Usar axios directo — NO api.js para evitar el interceptor de 401
      const { data } = await axios.post('/api/v1/auth/refresh', {
        refresh_token: refreshToken.value
      }, {
        headers: { 'Content-Type': 'application/json' }
      })

      const newToken   = data.data.tokens?.access_token  || data.data.access_token
      const newRefresh = data.data.tokens?.refresh_token || data.data.refresh_token

      accessToken.value = newToken
      localStorage.setItem('access_token', newToken)

      if (newRefresh) {
        refreshToken.value = newRefresh
        localStorage.setItem('refresh_token', newRefresh)
      }

      return newToken
    } catch {
      // Silencioso — no disparar sesionExpirada aquí
      return null
    }
  }

  function restoreSession() {
    try {
      const savedUser = localStorage.getItem('user')
      if (savedUser && savedUser !== 'undefined') {
        user.value = JSON.parse(savedUser)
      }
    } catch {
      localStorage.removeItem('user')
    }
  }

  function clearSession() {
    user.value         = null
    accessToken.value  = null
    refreshToken.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
  }

  return {
    user, accessToken, refreshToken,
    isAuthenticated, userRole, userVistas,
    userName, userInitials,
    login, logout, refreshAccessToken,
    restoreSession, clearSession,
  }
})