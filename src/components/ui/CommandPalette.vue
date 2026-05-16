<template>
  <Teleport to="body">
    <div class="cmd-overlay" @click.self="ui.closeCmdPalette()">
      <div class="cmd-box">
        <div class="cmd-input-row">
          <i class="ti ti-search" aria-hidden="true"></i>
          <input
            ref="inputRef"
            v-model="query"
            class="cmd-input"
            placeholder="Buscar empleado, módulo, reporte..."
            @keydown.escape="ui.closeCmdPalette()"
            @keydown.down.prevent="moveDown"
            @keydown.up.prevent="moveUp"
            @keydown.enter="selectCurrent"
          />
          <button class="cmd-close" @click="ui.closeCmdPalette()">
            <i class="ti ti-x"></i>
          </button>
        </div>

        <div class="cmd-results" ref="resultsRef">
          <!-- Menú -->
          <template v-if="filteredMenu.length">
            <div class="cmd-group-label">Menú</div>
            <div
              v-for="(item, i) in filteredMenu"
              :key="'m' + i"
              class="cmd-item"
              :class="{ sel: selectedIndex === i }"
              @click="goToRoute(item.path)"
              @mouseenter="selectedIndex = i"
            >
              <i :class="['ti', item.icon]" aria-hidden="true"></i>
              <span>{{ item.label }}</span>
              <span class="cmd-item-sub">{{ item.section }}</span>
            </div>
          </template>

          <div v-if="filteredMenu.length && filteredEmpleados.length" class="cmd-divider"></div>

          <!-- Empleados -->
          <template v-if="filteredEmpleados.length">
            <div class="cmd-group-label">Empleados</div>
            <div
              v-for="(emp, i) in filteredEmpleados"
              :key="'e' + i"
              class="cmd-item"
              :class="{ sel: selectedIndex === filteredMenu.length + i }"
              @click="goToEmpleado(emp)"
              @mouseenter="selectedIndex = filteredMenu.length + i"
            >
              <div class="cmd-av" :style="{ background: emp.bg, color: emp.color }">
                {{ emp.initials }}
              </div>
              <span>{{ emp.nombre }}</span>
              <span class="cmd-item-sub">{{ emp.numero_empleado }}</span>
            </div>
          </template>

          <!-- Sin resultados -->
          <div v-if="!filteredMenu.length && !filteredEmpleados.length && query" class="cmd-empty">
            Sin resultados para "<strong>{{ query }}</strong>"
          </div>

          <!-- Estado inicial -->
          <div v-if="!query" class="cmd-hint">
            <i class="ti ti-keyboard" aria-hidden="true"></i>
            Escribe para buscar módulos o empleados
          </div>
        </div>

        <div class="cmd-footer">
          <span><kbd>↑↓</kbd> Navegar</span>
          <span><kbd>↵</kbd> Seleccionar</span>
          <span><kbd>Esc</kbd> Cerrar</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui.js'
import { useAuthStore } from '@/stores/auth.js'
import { VISTAS_MAP } from '@/router/index.js'
import { empleadosService } from '@/services/empleados.service.js'


const ui     = useUiStore()
const auth   = useAuthStore()
const router = useRouter()

const query         = ref('')
const inputRef      = ref(null)
const selectedIndex = ref(0)
const empleados     = ref([])

const AVATAR_COLORS = [
  { color: '#4f8ef7', bg: '#1a2d4d' },
  { color: '#22c97a', bg: '#0d2e1f' },
  { color: '#f5a623', bg: '#2e1e06' },
  { color: '#f05454', bg: '#2e1010' },
  { color: '#a855f7', bg: '#2d1b4d' },
]

onMounted(() => {
  inputRef.value?.focus()
})

function getInitials(nombre) {
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

const filteredMenu = computed(() => {
  const q = query.value.toLowerCase()
  const vistas = auth.userRole === 1
    ? Object.keys(VISTAS_MAP)
    : auth.userVistas

  return Object.entries(VISTAS_MAP)
    .filter(([key, val]) => {
      if (!vistas.includes(key)) return false
      return val.label.toLowerCase().includes(q) ||
             (val.section || '').toLowerCase().includes(q)
    })
    .map(([key, val]) => ({ ...val, vista: key }))
    .slice(0, 6)
})

const filteredEmpleados = ref([])
let searchTimer = null

watch(query, async (val) => {
  selectedIndex.value = 0
  if (!val.trim()) {
    filteredEmpleados.value = []
    return
  }
  clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    try {
      const res = await empleadosService.buscar(val.trim(), 8, 0)
      const lista = res.data || res.empleados || []
      filteredEmpleados.value = lista.map((e, i) => ({
        ...e,
        initials: getInitials(e.nombre || e.nombre_completo || ''),
        nombre:   e.nombre || e.nombre_completo || '',
        ...AVATAR_COLORS[i % AVATAR_COLORS.length]
      }))
    } catch {
      filteredEmpleados.value = []
    }
  }, 350)
})

watch(query, () => { selectedIndex.value = 0 })

const totalItems = computed(() => filteredMenu.value.length + filteredEmpleados.value.length)

function moveDown() {
  selectedIndex.value = (selectedIndex.value + 1) % (totalItems.value || 1)
}
function moveUp() {
  selectedIndex.value = (selectedIndex.value - 1 + (totalItems.value || 1)) % (totalItems.value || 1)
}
function selectCurrent() {
  if (selectedIndex.value < filteredMenu.value.length) {
    goToRoute(filteredMenu.value[selectedIndex.value].path)
  } else {
    const emp = filteredEmpleados.value[selectedIndex.value - filteredMenu.value.length]
    if (emp) goToEmpleado(emp)
  }
}
function goToRoute(path) {
  router.push(path)
  ui.closeCmdPalette()
}
function goToEmpleado(emp) {
  router.push(`/empleados/${emp.id}`)
  ui.closeCmdPalette()
}
</script>

<style scoped>
.cmd-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
}
.cmd-box {
  background: var(--bg1);
  border: 0.5px solid var(--bdr2);
  border-radius: 16px;
  width: 540px;
  max-height: 480px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.cmd-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 0.5px solid var(--bdr);
}
.cmd-input-row i { font-size: 18px; color: var(--tx2); }
.cmd-input {
  background: transparent;
  border: none;
  outline: none;
  font-size: 15px;
  color: var(--tx0);
  width: 100%;
  font-family: inherit;
}
.cmd-input::placeholder { color: var(--tx3); }
.cmd-close {
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
  flex-shrink: 0;
}
.cmd-results {
  overflow-y: auto;
  padding: 8px;
  flex: 1;
}
.cmd-group-label {
  font-size: 10px;
  color: var(--tx3);
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 8px 10px 4px;
  font-weight: 500;
}
.cmd-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--tx1);
  font-size: 13px;
  transition: background .12s;
}
.cmd-item:hover, .cmd-item.sel {
  background: var(--bg2);
  color: var(--tx0);
}
.cmd-item i { font-size: 17px; width: 20px; text-align: center; flex-shrink: 0; }
.cmd-item-sub { font-size: 11px; color: var(--tx2); margin-left: auto; }
.cmd-av {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}
.cmd-divider { height: 0.5px; background: var(--bdr); margin: 6px 0; }
.cmd-empty {
  padding: 28px;
  text-align: center;
  color: var(--tx2);
  font-size: 13px;
}
.cmd-hint {
  padding: 28px;
  text-align: center;
  color: var(--tx3);
  font-size: 13px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.cmd-hint i { font-size: 24px; }
.cmd-footer {
  padding: 8px 14px;
  border-top: 0.5px solid var(--bdr);
  display: flex;
  gap: 16px;
}
.cmd-footer span { font-size: 11px; color: var(--tx3); display: flex; align-items: center; gap: 4px; }
kbd {
  font-size: 10px;
  background: var(--bg3);
  border: 0.5px solid var(--bdr2);
  border-radius: 4px;
  padding: 1px 5px;
  color: var(--tx2);
  font-family: inherit;
}
</style>