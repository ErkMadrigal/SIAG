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
    currentPage, breadcrumbs,
    toggleTheme, toggleSidebar,
    openCmdPalette, closeCmdPalette,
    openMetodos, closeMetodos,
    setBreadcrumbs, closeSidebar  
  }
})