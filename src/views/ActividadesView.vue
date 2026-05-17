<template>
  <div class="act-wrap">

    <!-- Header -->
    <div class="act-header">
      <div class="act-header-left">
        <h2 class="act-title">Mis actividades</h2>
        <span class="act-sub">Historial de acciones realizadas en el sistema</span>
      </div>
      <div class="act-header-right">
        <!-- Filtro por acción -->
        <select class="act-select" v-model="filtroAccion" @change="fetchData(true)">
          <option value="">Todas las acciones</option>
          <option v-for="a in acciones" :key="a" :value="a">{{ labelAccion(a) }}</option>
        </select>
        <button class="btn-refresh" @click="fetchData(true)" :disabled="loading">
          <i class="ti ti-refresh" :class="{ spin: loading }"></i>
        </button>
      </div>
    </div>

    <!-- Loading inicial -->
    <div v-if="loading && !actividades.length" class="act-loading">
      <div class="skel-item" v-for="i in 5" :key="i">
        <div class="skel-dot"></div>
        <div class="skel-body">
          <div class="skel-line w60"></div>
          <div class="skel-line w40"></div>
        </div>
      </div>
    </div>

    <!-- Sin datos -->
    <div v-else-if="!loading && !actividades.length" class="act-empty">
      <i class="ti ti-timeline"></i>
      <p>Sin actividad registrada</p>
    </div>

    <!-- Timeline agrupada por día -->
    <div v-else class="timeline">
      <template v-for="(grupo, fecha) in actividadesAgrupadas" :key="fecha">

        <!-- Separador de fecha -->
        <div class="tl-date-sep">
          <span class="tl-date-label">{{ formatFechaGrupo(fecha) }}</span>
        </div>

        <!-- Eventos del día -->
        <div class="tl-group">
          <div
            v-for="item in grupo"
            :key="item.id"
            class="tl-item"
          >
            <!-- Línea y dot -->
            <div class="tl-left">
              <div class="tl-dot" :class="colorAccion(item.action)"></div>
              <div class="tl-line"></div>
            </div>

            <!-- Contenido -->
            <div class="tl-content">
              <div class="tl-top">
                <span class="tl-action" :class="colorAccion(item.action)">
                  <i :class="['ti', iconAccion(item.action)]"></i>
                  {{ labelAccion(item.action) }}
                </span>
                <span class="tl-entity">{{ labelEntidad(item.entity) }}</span>
                <span class="tl-hora">{{ formatHora(item.created_at) }}</span>
              </div>
              <div class="tl-msg">{{ item.message }}</div>
              <div class="tl-meta">
                <span v-if="item.ip" class="tl-meta-item">
                  <i class="ti ti-map-pin"></i> {{ item.ip }}
                </span>
                <span v-if="item.method" class="tl-meta-item">
                  <i class="ti ti-code"></i> {{ item.method }}
                </span>
              </div>
            </div>
          </div>
        </div>

      </template>

      <!-- Cargar más -->
      <div class="act-more">
        <button
          v-if="hayMas"
          class="btn-more"
          @click="cargarMas"
          :disabled="loadingMas"
        >
          <i v-if="loadingMas" class="ti ti-loader-2 spin"></i>
          <i v-else class="ti ti-arrow-down"></i>
          {{ loadingMas ? 'Cargando...' : 'Cargar más' }}
        </button>
        <span v-else-if="actividades.length" class="act-fin">
          Has llegado al final · {{ actividades.length }} actividades
        </span>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth.js'
import { useUiStore }   from '@/stores/ui.js'
import api from '@/services/api.js'

const auth = useAuthStore()
const ui   = useUiStore()

const actividades  = ref([])
const acciones     = ref([])
const filtroAccion = ref('')
const loading      = ref(true)
const loadingMas   = ref(false)
const pagina       = ref(1)
const totalPaginas = ref(1)
const LIMIT        = 20

const hayMas = computed(() => pagina.value < totalPaginas.value)

// Agrupar por fecha (YYYY-MM-DD)
const actividadesAgrupadas = computed(() => {
  const grupos = {}
  actividades.value.forEach(item => {
    const fecha = item.created_at.split(' ')[0]
    if (!grupos[fecha]) grupos[fecha] = []
    grupos[fecha].push(item)
  })
  return grupos
})

onMounted(() => {
  ui.setBreadcrumbs([
    { label: 'Home', to: '/' },
    { label: 'Actividades', to: '/actividades' },
  ])
  fetchData(true)
})

async function fetchData(reset = false) {
  if (reset) {
    pagina.value     = 1
    actividades.value = []
  }
  loading.value = true
  try {
    const { data } = await api.get('/audit-log', {
      params: {
        actor_user_id: auth.user?.id,  // solo mis actividades
        action:        filtroAccion.value || '',
        limit:         LIMIT,
        page:          pagina.value,
      }
    })
    const lista = data.data || []
    actividades.value = reset ? lista : [...actividades.value, ...lista]
    totalPaginas.value = data.meta?.totalPages || 1

    // Cargar catálogo de acciones solo la primera vez
    if (acciones.value.length === 0 && data.meta?.filters?.acciones) {
      acciones.value = data.meta.filters.acciones
    }
  } catch (err) {
    console.error('fetchActividades:', err)
  } finally {
    loading.value = false
  }
}

async function cargarMas() {
  if (!hayMas.value || loadingMas.value) return
  loadingMas.value = true
  pagina.value++
  try {
    const { data } = await api.get('/audit-log', {
      params: {
        actor_user_id: auth.user?.id,
        action:        filtroAccion.value || '',
        limit:         LIMIT,
        page:          pagina.value,
      }
    })
    actividades.value = [...actividades.value, ...(data.data || [])]
    totalPaginas.value = data.meta?.totalPages || 1
  } catch (err) {
    console.error('cargarMas:', err)
    pagina.value--
  } finally {
    loadingMas.value = false
  }
}

// ── Helpers de display ────────────────────────────────

function labelAccion(action) {
  const map = {
    LOGIN:               'Inicio de sesión',
    LOGOUT:              'Cierre de sesión',
    CREATE:              'Creación',
    UPDATE:              'Actualización',
    DELETE_LOGIC:        'Eliminación',
    APPROVE:             'Aprobación',
    APROBAR_INCIDENCIA:  'Aprobó incidencia',
    CREAR_INCIDENCIA:    'Creó incidencia',
    BIOMETRICO_ENTRADA:  'Entrada biométrica',
    RESET_PASSWORD:      'Reset de contraseña',
    CAMBIO_PASSWORD:     'Cambio de contraseña',
    UPDATE_PERFIL:       'Actualización de perfil',
    SET_ROLES:           'Asignación de roles',
    CREAR_USUARIO_SISTEMA: 'Creó usuario',
    TOGGLE_ESTATUS_USUARIO: 'Cambio de estatus',
  }
  return map[action] || action
}

function iconAccion(action) {
  const map = {
    LOGIN:               'ti-login',
    LOGOUT:              'ti-logout',
    CREATE:              'ti-plus',
    UPDATE:              'ti-edit',
    DELETE_LOGIC:        'ti-trash',
    APPROVE:             'ti-circle-check',
    APROBAR_INCIDENCIA:  'ti-circle-check',
    CREAR_INCIDENCIA:    'ti-alert-triangle',
    BIOMETRICO_ENTRADA:  'ti-fingerprint',
    RESET_PASSWORD:      'ti-key',
    CAMBIO_PASSWORD:     'ti-shield-lock',
    UPDATE_PERFIL:       'ti-user-edit',
    SET_ROLES:           'ti-shield',
  }
  return map[action] || 'ti-activity'
}

function colorAccion(action) {
  if (['LOGIN', 'CREATE', 'APPROVE', 'APROBAR_INCIDENCIA', 'CREAR_USUARIO_SISTEMA'].includes(action)) return 'green'
  if (['UPDATE', 'UPDATE_PERFIL', 'SET_ROLES', 'CAMBIO_PASSWORD', 'RESET_PASSWORD'].includes(action)) return 'blue'
  if (['DELETE_LOGIC', 'LOGOUT', 'TOGGLE_ESTATUS_USUARIO'].includes(action)) return 'red'
  if (['CREAR_INCIDENCIA', 'BIOMETRICO_ENTRADA'].includes(action)) return 'amber'
  return 'gray'
}

function labelEntidad(entity) {
  const map = {
    usuario:     'Usuario',
    usuarios:    'Usuarios',
    empleados:   'Empleados',
    incidencias: 'Incidencias',
    asistencias: 'Asistencias',
    foto:        'Foto',
  }
  return map[entity] || entity
}

function formatFechaGrupo(fecha) {
  const hoy  = new Date().toISOString().split('T')[0]
  const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (fecha === hoy)  return 'Hoy'
  if (fecha === ayer) return 'Ayer'
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
}

function formatHora(datetime) {
  return new Date(datetime).toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit'
  })
}
</script>

<style scoped>
.act-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 760px;
  margin: 0 auto;
}

/* ── Header ── */
.act-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.act-title { font-size: 18px; font-weight: 600; color: var(--tx0); letter-spacing: -.3px; }
.act-sub   { font-size: 12px; color: var(--tx2); margin-top: 3px; display: block; }
.act-header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.act-select {
  background: var(--bg1);
  border: 0.5px solid var(--bdr2);
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 12px;
  color: var(--tx1);
  font-family: inherit;
  outline: none;
  cursor: pointer;
  transition: border .15s;
}
.act-select:focus { border-color: var(--acc); }

.btn-refresh {
  width: 32px; height: 32px;
  border-radius: 8px;
  background: var(--bg1);
  border: 0.5px solid var(--bdr2);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--tx2); font-size: 16px;
  transition: all .15s;
}
.btn-refresh:hover { background: var(--bg2); color: var(--tx0); }
.btn-refresh:disabled { opacity: .5; cursor: not-allowed; }

/* ── Timeline ── */
.timeline { display: flex; flex-direction: column; gap: 0; }

.tl-date-sep {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 0 8px;
}
.tl-date-sep::after {
  content: '';
  flex: 1;
  height: 0.5px;
  background: var(--bdr);
}
.tl-date-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--tx2);
  text-transform: uppercase;
  letter-spacing: .8px;
  white-space: nowrap;
}

.tl-group {
  display: flex;
  flex-direction: column;
  background: var(--bg1);
  border: 0.5px solid var(--bdr);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 10px;
}

.tl-item {
  display: flex;
  gap: 0;
  padding: 0;
  transition: background .12s;
}
.tl-item:hover { background: var(--bg2); }
.tl-item:not(:last-child) { border-bottom: 0.5px solid var(--bdr); }

/* Dot y línea */
.tl-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0 0 20px;
  width: 36px;
  flex-shrink: 0;
}
.tl-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 3px;
}
.tl-dot.green { background: var(--grn); box-shadow: 0 0 6px var(--grn); }
.tl-dot.blue  { background: var(--acc); box-shadow: 0 0 6px var(--acc); }
.tl-dot.red   { background: var(--red); box-shadow: 0 0 6px var(--red); }
.tl-dot.amber { background: var(--amb); box-shadow: 0 0 6px var(--amb); }
.tl-dot.gray  { background: var(--tx3); }
.tl-line {
  width: 1px;
  flex: 1;
  background: var(--bdr);
  margin-top: 6px;
}
.tl-item:last-child .tl-line { display: none; }

/* Contenido */
.tl-content {
  flex: 1;
  padding: 14px 16px 14px 12px;
  min-width: 0;
}
.tl-top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}
.tl-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
}
.tl-action i { font-size: 13px; }
.tl-action.green { color: var(--grn); }
.tl-action.blue  { color: var(--acc); }
.tl-action.red   { color: var(--red); }
.tl-action.amber { color: var(--amb); }
.tl-action.gray  { color: var(--tx2); }

.tl-entity {
  font-size: 11px;
  color: var(--tx2);
  background: var(--bg3);
  padding: 2px 8px;
  border-radius: 20px;
}
.tl-hora {
  font-size: 11px;
  color: var(--tx3);
  margin-left: auto;
  white-space: nowrap;
}
.tl-msg {
  font-size: 13px;
  color: var(--tx1);
  line-height: 1.4;
}
.tl-meta {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  flex-wrap: wrap;
}
.tl-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--tx3);
}
.tl-meta-item i { font-size: 12px; }

/* ── Loading skeleton ── */
.act-loading { display: flex; flex-direction: column; gap: 8px; }
.skel-item {
  display: flex; gap: 12px; align-items: flex-start;
  background: var(--bg1); border: 0.5px solid var(--bdr);
  border-radius: 12px; padding: 16px;
  animation: pulse 1.5s ease-in-out infinite;
}
.skel-dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--bg3); flex-shrink: 0; margin-top: 4px;
}
.skel-body { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.skel-line {
  height: 10px; background: var(--bg3); border-radius: 4px;
}
.skel-line.w60 { width: 60%; }
.skel-line.w40 { width: 40%; }

/* ── Empty ── */
.act-empty {
  display: flex; flex-direction: column;
  align-items: center; gap: 8px;
  padding: 60px 20px;
  background: var(--bg1);
  border: 0.5px solid var(--bdr);
  border-radius: 12px;
}
.act-empty i { font-size: 40px; color: var(--tx3); }
.act-empty p { font-size: 14px; color: var(--tx2); }

/* ── Cargar más ── */
.act-more { display: flex; justify-content: center; padding: 8px 0 4px; }
.btn-more {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 20px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: var(--bg1);
  font-size: 12px; color: var(--tx1); cursor: pointer;
  font-family: inherit; transition: all .15s;
}
.btn-more:hover { background: var(--bg2); color: var(--tx0); }
.btn-more:disabled { opacity: .5; cursor: not-allowed; }
.act-fin { font-size: 11px; color: var(--tx3); padding: 8px 0; }

/* ── Animaciones ── */
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
@keyframes spin  { to { transform: rotate(360deg); } }
.spin { animation: spin .7s linear infinite; display: inline-block; }
</style>