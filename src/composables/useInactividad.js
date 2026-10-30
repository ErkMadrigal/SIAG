import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useRouter } from 'vue-router'
import { minutosInactividad } from '@/composables/usePrefs.js'

export const sesionExpirada = ref(false)

// Última actividad real del usuario (mouse, teclado, toque, scroll) o de la app (peticiones al API).
let ultimaActividad = Date.now()
export function registrarActividad() { ultimaActividad = Date.now() }

export const SEGUNDOS_AVISO = 60   // el aviso sale 60 s antes de cerrar

export function useInactividad() {
  // Minutos configurables en Configuración (5, 10, 15 o 20; recomendado 10). Se lee en cada revisión.
  const tiempoLogout = () => minutosInactividad() * 60 * 1000
  const auth   = useAuthStore()
  const router = useRouter()

  const mostrarAviso      = ref(false)
  const segundosRestantes = ref(SEGUNDOS_AVISO)

  let ticker = null
  let keepalive = null

  const EVENTOS = ['mousemove', 'mousedown', 'pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart', 'click']

  // Se mide con marcas de tiempo (no con un setTimeout largo) para que no se
  // desfase con pestañas en segundo plano ni con la suspensión del equipo.
  function revisar() {
    if (sesionExpirada.value) return   // ya expiró: el modal pide credenciales ahí mismo
    const idle = Date.now() - ultimaActividad
    if (idle >= tiempoLogout()) {
      mostrarAviso.value = false
      // Se invalidan los tokens pero se conserva el usuario en memoria: así el modal
      // puede pedir la contraseña ahí mismo sin perder lo que había en pantalla.
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      sesionExpirada.value = true
      return
    }
    const restante = Math.ceil((tiempoLogout() - idle) / 1000)
    if (restante <= SEGUNDOS_AVISO) {
      mostrarAviso.value = true
      segundosRestantes.value = restante
    } else if (mostrarAviso.value) {
      mostrarAviso.value = false
    }
  }

  // Mientras el usuario esté activo, mantiene vivo el token para que nunca
  // caduque a media chamba (renueva cuando le queden menos de 5 min).
  async function mantenerToken() {
    if (sesionExpirada.value) return
    if (Date.now() - ultimaActividad >= tiempoLogout()) return
    const token = localStorage.getItem('access_token')
    if (!token) return
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const restanteMin = (payload.exp * 1000 - Date.now()) / 60000
      if (restanteMin < 5) {
        const { refrescarToken } = await import('@/services/api.js')
        await refrescarToken()
      }
    } catch { /* si falla, el interceptor lo reintenta en la próxima petición */ }
  }

  function alActividad() { registrarActividad() }
  function alVolver() { if (!document.hidden) revisar() }

  function continuar() {
    registrarActividad()
    mostrarAviso.value = false
  }

  function detener() {
    clearInterval(ticker); clearInterval(keepalive)
    ticker = keepalive = null
  }

  async function cerrarSesionManual() {
    detener()
    mostrarAviso.value = false
    await auth.logout?.()
    router.push('/login')
  }

  onMounted(() => {
    registrarActividad()
    ticker = setInterval(revisar, 1000)
    keepalive = setInterval(mantenerToken, 60 * 1000)
    EVENTOS.forEach(e => document.addEventListener(e, alActividad, { passive: true, capture: true }))
    document.addEventListener('visibilitychange', alVolver)
  })

  onUnmounted(() => {
    detener()
    EVENTOS.forEach(e => document.removeEventListener(e, alActividad, { capture: true }))
    document.removeEventListener('visibilitychange', alVolver)
  })

  return { mostrarAviso, segundosRestantes, continuar, cerrarSesionManual }
}

export function resetSesionExpirada() {
  sesionExpirada.value = false
}
