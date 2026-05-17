<template>
  <div class="shell">
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

async function irLogin() {
  sesionExpirada.value = false  // ocultar modal
  auth.clearSession()           // limpiar token → isAuthenticated = false
  await router.push('/login')   // guard ahora deja pasar
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
@media (max-width: 768px) {
  .shell-content { padding: 10px; }
}
</style>