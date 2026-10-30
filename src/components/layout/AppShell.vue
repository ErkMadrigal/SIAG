<template>
  <div class="shell">
    <!-- Overlay móvil -->
    <div
      v-if="ui.sidebarOpen && isMobile"
      class="sidebar-overlay"
      @click="ui.closeSidebar()"
    />
    <Sidebar />
    <div class="shell-main">
      <TopBar />
      <main class="shell-content">
        <!-- key por :id => al pasar de /empleados/1 a /empleados/2 se recarga el detalle -->
        <RouterView v-slot="{ Component, route }">
          <component :is="Component" :key="(route.params.id ?? route.name) + '-' + ui.refreshKey" />
        </RouterView>
      </main>
    </div>
    <CommandPalette v-if="ui.cmdPaletteOpen" />
    <MetodosPanel   v-if="ui.metodosPanelOpen" />
    <AvisoInactividad
      :segundos="segundosRestantes"
      :mostrar-aviso="mostrarAviso"
      :expirada="sesionExpirada"
      @continuar="continuar"
      @salir="cerrarSesionManual"
      @relogin="irLogin"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useUiStore }   from '@/stores/ui.js'
import { useAuthStore } from '@/stores/auth.js'
import Sidebar          from './Sidebar.vue'
import TopBar           from './TopBar.vue'
import CommandPalette   from '@/components/ui/CommandPalette.vue'
import MetodosPanel     from '@/components/ui/MetodosPanel.vue'
import AvisoInactividad from '@/components/ui/AvisoInactividad.vue'
import { useInactividad, sesionExpirada } from '@/composables/useInactividad.js'
import { useRouter, useRoute } from 'vue-router'
import { AUTO_REFRESH_MS, autoRefreshActivo } from '@/composables/usePrefs.js'

const ui   = useUiStore()
const auth = useAuthStore()
const router = useRouter()
const route  = useRoute()
const { mostrarAviso, segundosRestantes, continuar, cerrarSesionManual } = useInactividad()

const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth <= 768
  // En móvil el sidebar arranca cerrado
  if (isMobile.value) ui.sidebarOpen = false
}

// Actualización automática cada 3 min de la vista actual. Se omite si el usuario está
// escribiendo, hay un modal abierto o la pantalla es de captura (para no perder datos).
let autoTimer = null
function autoRefrescar() {
  if (!autoRefreshActivo() || document.hidden || sesionExpirada.value) return
  if (route.meta?.noAutoRefresh) return
  const el = document.activeElement
  if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return
  if (document.querySelector('.modal-overlay, .pa-overlay, .ar-overlay, .dlg-overlay, .enr-overlay')) return
  ui.refrescar()
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  autoTimer = setInterval(autoRefrescar, AUTO_REFRESH_MS)
})
onUnmounted(() => { window.removeEventListener('resize', checkMobile); clearInterval(autoTimer) })

async function irLogin() {
  sesionExpirada.value = false
  auth.clearSession()
  await router.push('/login')
}
</script>

<style scoped>
.shell {
  display: flex; height: 100vh;
  background: var(--bg0); overflow: hidden;
}
.shell-main {
  flex: 1; display: flex; flex-direction: column; overflow: hidden;
}
.shell-content {
  flex: 1; overflow-y: auto; padding: 16px;
}
.sidebar-overlay {
  display: none;
}
@media (max-width: 768px) {
  .shell-content { padding: 10px; }
  .sidebar-overlay {
    display: block;
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 99;
  }
}
</style>