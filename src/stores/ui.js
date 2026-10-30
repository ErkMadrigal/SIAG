import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { usePreferredDark } from '@vueuse/core'

export const useUiStore = defineStore('ui', () => {
  const prefersDark   = usePreferredDark()
  const isDark        = ref(localStorage.getItem('theme') === 'light' ? false : true)
  const sidebarOpen = ref(window.innerWidth > 768)
  const cmdPaletteOpen = ref(false)
  const metodosPanelOpen = ref(false)
  const currentPage   = ref('Dashboard')
  const breadcrumbs   = ref([{ label: 'Home', to: '/' }])

  // Refresco de la vista actual (botón manual y automático cada 3 min)
  const refreshKey = ref(0)
  const refrescando = ref(false)
  const ultimaActualizacion = ref(Date.now())
  function refrescar() {
    refrescando.value = true
    refreshKey.value++
    ultimaActualizacion.value = Date.now()
    setTimeout(() => { refrescando.value = false }, 900)
  }

  watch(isDark, (val) => {
    const html = document.documentElement
    if (val) {
      html.classList.remove('light')
    } else {
      html.classList.add('light')
    }
    localStorage.setItem('theme', val ? 'dark' : 'light')
  }, { immediate: true })

  function toggleTheme() {
    isDark.value = !isDark.value
  }

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function openCmdPalette() {
    cmdPaletteOpen.value = true
  }

  function closeCmdPalette() {
    cmdPaletteOpen.value = false
  }

  function openMetodos() {
    metodosPanelOpen.value = true
  }

  function closeMetodos() {
    metodosPanelOpen.value = false
  }

  function setBreadcrumbs(crumbs) {
    breadcrumbs.value = crumbs
  }

  function closeSidebar() {
    sidebarOpen.value = false
  }

  return {
    isDark, sidebarOpen, cmdPaletteOpen, metodosPanelOpen,
    currentPage, breadcrumbs, refreshKey, refrescando, ultimaActualizacion, refrescar,
    toggleTheme, toggleSidebar,
    openCmdPalette, closeCmdPalette,
    openMetodos, closeMetodos,
    setBreadcrumbs, closeSidebar  
  }
})