import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useRouter } from 'vue-router'

export const sesionExpirada = ref(false)

export function useInactividad({
  TIEMPO_AVISO  = 27 * 60 * 1000,
  TIEMPO_LOGOUT = 30 * 60 * 1000,
} = {}) {
  const auth   = useAuthStore()
  const router = useRouter()

  const mostrarAviso      = ref(false)
  const segundosRestantes = ref(180)

  let timerAviso  = null
  let timerLogout = null
  let timerCuenta = null

  const EVENTOS = ['mousemove','mousedown','keydown','scroll','touchstart','click']

  function resetTimers() {
    clearTimeout(timerAviso)
    clearTimeout(timerLogout)
    clearInterval(timerCuenta)
    mostrarAviso.value      = false
    segundosRestantes.value = 180

    timerAviso = setTimeout(() => {
      mostrarAviso.value      = true
      segundosRestantes.value = 180

      timerCuenta = setInterval(() => {
        segundosRestantes.value--
        if (segundosRestantes.value <= 0) clearInterval(timerCuenta)
      }, 1000)
    }, TIEMPO_AVISO)

    timerLogout = setTimeout(async () => {
      clearInterval(timerCuenta)
      mostrarAviso.value = false
      auth.clearSession?.()      
      sesionExpirada.value = true
    }, TIEMPO_LOGOUT)
  }

  function continuar() {
    resetTimers()
  }

  async function cerrarSesionManual() {
    clearTimeout(timerAviso)
    clearTimeout(timerLogout)
    clearInterval(timerCuenta)
    mostrarAviso.value = false
    await auth.logout?.()
    router.push('/login')
  }

  onMounted(() => {
    resetTimers()
    EVENTOS.forEach(e => document.addEventListener(e, resetTimers, { passive: true }))
  })

  onUnmounted(() => {
    clearTimeout(timerAviso)
    clearTimeout(timerLogout)
    clearInterval(timerCuenta)
    EVENTOS.forEach(e => document.removeEventListener(e, resetTimers))
  })

  return { mostrarAviso, segundosRestantes, continuar, cerrarSesionManual }
}

export function resetSesionExpirada() {
  sesionExpirada.value = false
}