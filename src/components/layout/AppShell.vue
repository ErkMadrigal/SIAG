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
        <RouterView />
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
import { useRouter } from 'vue-router'

const ui   = useUiStore()
const auth = useAuthStore()
const router = useRouter()
const { mostrarAviso, segundosRestantes, continuar, cerrarSesionManual } = useInactividad()

const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth <= 768
  // En móvil el sidebar arranca cerrado
  if (isMobile.value) ui.sidebarOpen = false
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})
onUnmounted(() => window.removeEventListener('resize', checkMobile))

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