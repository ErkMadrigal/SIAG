<template>
  <Teleport to="body">
    <div class="met-overlay" @click.self="ui.closeMetodos()">
      <div class="met-panel">
        <div class="met-hdr">
          <span class="met-title">Métodos</span>
          <button class="met-close" @click="ui.closeMetodos()">
            <i class="ti ti-x"></i>
          </button>
        </div>
        <div class="met-grid">
          <div
            v-for="item in metodos"
            :key="item.label"
            class="met-item"
            @click="item.action"
          >
            <div class="met-icon" :style="{ background: item.bg }">
              <i :class="['ti', item.icon]" :style="{ color: item.color }"></i>
            </div>
            <span class="met-label">{{ item.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { useUiStore } from '@/stores/ui.js'
import { useRouter }  from 'vue-router'

const ui     = useUiStore()
const router = useRouter()

const metodos = [
  { label: 'Control área',   icon: 'ti-cpu',          color: '#22c97a', bg: '#0d2e1f', action: () => { router.push('/control-area'); ui.closeMetodos() } },
  { label: 'Actividades',    icon: 'ti-activity',      color: '#4f8ef7', bg: '#1a2d4d', action: () => { router.push('/actividades'); ui.closeMetodos() } },
  { label: 'Exportaciones',  icon: 'ti-cloud-download', color: '#4f8ef7', bg: '#1a2d4d', action: () => {} },
  { label: 'Importaciones',  icon: 'ti-cloud-upload',   color: '#4f8ef7', bg: '#1a2d4d', action: () => { router.push('/importaciones'); ui.closeMetodos() } },
  { label: 'Usuarios',       icon: 'ti-users-group',    color: '#4f8ef7', bg: '#1a2d4d', action: () => { router.push('/colaboradores'); ui.closeMetodos() } },
  { label: 'Configuración',  icon: 'ti-settings',       color: '#f5a623', bg: '#2e1e06', action: () => { router.push('/configuracion'); ui.closeMetodos() } },
  
]
</script>

<style scoped>
.met-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 9998;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
}
.met-panel {
  background: var(--bg1);
  width: 260px;
  height: 100%;
  border-left: 0.5px solid var(--bdr2);
  padding: 16px;
  overflow-y: auto;
}
.met-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 0.5px solid var(--bdr);
}
.met-title { font-size: 14px; font-weight: 500; color: var(--tx0); }
.met-close {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: var(--bg3);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--tx2);
  font-size: 16px;
}
.met-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.met-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  border-radius: 12px;
  border: 0.5px solid var(--bdr2);
  cursor: pointer;
  transition: all .15s;
  background: var(--bg2);
}
.met-item:hover {
  background: var(--bg3);
  border-color: var(--acc);
}
.met-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.met-label { font-size: 11px; color: var(--tx1); text-align: center; font-weight: 500; }
</style>