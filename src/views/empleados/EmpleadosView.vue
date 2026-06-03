<template>
  <div class="empleados-view">

    <!-- Header -->
    <div class="view-header">
      <div>
        <h1 class="view-title">Empleados</h1>
        <p class="view-sub">{{ totalEmpleados.toLocaleString() }} registros en total</p>
      </div>
      <div class="header-actions">
        <button class="btn-sm" @click="exportar">
          <i class="ti ti-download" aria-hidden="true"></i> Exportar
        </button>
        <button class="btn-primary-lg" @click="router.push('/empleados/nuevo')">
          <i class="ti ti-plus" aria-hidden="true"></i> Nuevo empleado
        </button>
      </div>
    </div>
    <div v-if="successMsg" class="alert-success">
      <i class="ti ti-circle-check"></i> {{ successMsg }}
    </div>
    <div v-if="errorMsg" class="alert-error">
      <i class="ti ti-alert-circle"></i> {{ errorMsg }}
    </div>

    <!-- Métricas -->
    <div class="emp-metrics">
      <div class="emc" v-for="m in metricas" :key="m.label" :class="m.color">
        <div class="emc-icon"><i :class="['ti', m.icon]" aria-hidden="true"></i></div>
        <div>
          <div class="emc-val">{{ m.value }}</div>
          <div class="emc-label">{{ m.label }}</div>
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="sec">
      <!-- Barra de herramientas -->
      <div class="toolbar">
        <div class="search-box">
          <i class="ti ti-search" aria-hidden="true"></i>
          <input
            v-model="searchQuery"
            placeholder="Buscar por nombre, CURP..."
            @input="onSearch"
          />
          <button v-if="searchQuery" class="clear-search" @click="clearSearch">
            <i class="ti ti-x"></i>
          </button>
        </div>


        <!-- Filtro ubicación -->
        <div class="ubicacion-wrap">
          <div class="ubicacion-search">
            <i class="ti ti-map-pin" aria-hidden="true"></i>
            <input
              v-model="ubicacionQuery"
              placeholder="Ubicación..."
              @input="onUbicacionSearch"
              @focus="showUbicacionList = true"
              autocomplete="off"
            />
            <button v-if="ubicacionQuery" class="clear-btn" @click="clearUbicacion">
              <i class="ti ti-x"></i>
            </button>
          </div>
          <div v-if="showUbicacionList && ubicacionResultados.length" class="ubicacion-list">
            <div
              v-for="s in ubicacionResultados"
              :key="s.id"
              class="ubicacion-item"
              @mousedown.prevent="selectUbicacion(s)"
            >
              <i class="ti ti-map-pin" aria-hidden="true"></i>
              {{ s.text || s.valor || s.nombre }}
            </div>
          </div>
        </div>
        <div class="toolbar-right">
          <!-- Filtro estatus -->
          <select class="sel" v-model="filtros.status" @change="fetchData(1)">
            <option value="">Todos los estatus</option>
            <option value="1">Activos</option>
            <option value="2">Con permiso</option>
            <option value="0">Bajas</option>
          </select>

          <!-- Filtro puesto -->
          <select class="sel" v-model="filtros.puesto" @change="fetchData(1)">
            <option value="">Todos los puestos</option>
            <option v-for="p in puestos" :key="p.id" :value="p.id">{{ p.valor }}</option>
          </select>

          <!-- Filtro biométrico -->
          <select class="sel" v-model="filtros.biometrico" @change="fetchData(1)">
            <option value="">Acceso biométrico</option>
            <option value="1">Con acceso</option>
            <option value="0">Sin acceso</option>
          </select>

          <!-- Registros por página -->
          <select class="sel" v-model="perPage" @change="fetchData(1)">
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
          </select>

          <button class="btn-sm" @click="resetFiltros">
            <i class="ti ti-refresh" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="skeleton-wrap">
        <div class="skeleton-row" v-for="i in perPage > 10 ? 10 : perPage" :key="i"></div>
      </div>

      <!-- Tabla -->
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:60px">No.</th>
              <th style="width:200px">Empleado</th>
              <th style="width:130px">CURP</th>
              <th style="width:110px">Fecha ingreso</th>
              <th style="width:130px">Puesto</th>
              <th style="width:120px">
                <div style="display:flex;align-items:center;gap:4px">
                  <i class="ti ti-map-pin" style="font-size:13px"></i>
                  Ubicación
                </div>
              </th>
              <th style="width:90px">Estatus</th>
              <!-- NUEVA columna biométrico -->
              <th style="width:110px;text-align:center">
                <div style="display:flex;align-items:center;justify-content:center;gap:4px">
                  <i class="ti ti-fingerprint" style="font-size:13px"></i>
                  Biométrico
                </div>
              </th>
              <th style="width:80px;text-align:right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(emp, i) in empleados"
              :key="emp.id"
              @click="router.push(`/empleados/${emp.id}`)"
            >
              <td class="id-cell">{{ String(emp.id).padStart(6, '0') }}</td>
              <td>
                <div class="emp-cell">
                  <div class="emp-av" :style="{ background: getAvatarBg(i), color: getAvatarColor(i) }">
                    {{ getInitials(emp.nombre) }}
                  </div>
                  <span class="emp-name">{{ emp.nombre }}</span>
                </div>
              </td>
              <td class="mono">{{ emp.curp || '—' }}</td>
              <td style="color:var(--tx2)">{{ formatDate(emp.fecha_efectiva) }}</td>
              <td style="color:var(--tx1)">{{ emp.puesto || '—' }}</td>
              <td style="color:var(--tx2);font-size:12px">
                {{ emp.ubicacion_principal || '—' }}
              </td>
              <td><StatusPill :status="mapEstatus(emp.estatus)" /></td>

              <!-- Toggle biométrico -->
              <td @click.stop style="text-align:center">
                <div class="bio-toggle-wrap">
                  <button
                    class="bio-toggle"
                    :class="{ active: emp.acceso_biometrico == 1, loading: togglingId === emp.id }"
                    :disabled="togglingId === emp.id"
                    @click="toggleBiometrico(emp)"
                    :title="emp.acceso_biometrico == 1 ? 'Revocar acceso biométrico' : 'Habilitar acceso biométrico'"
                  >
                    <span class="bio-track">
                      <span class="bio-thumb">
                        <i v-if="togglingId === emp.id" class="ti ti-loader-2 spin"></i>
                        <i v-else-if="emp.acceso_biometrico == 1" class="ti ti-fingerprint"></i>
                        <i v-else class="ti ti-fingerprint-off"></i>
                      </span>
                    </span>
                    <span class="bio-label">{{ emp.acceso_biometrico == 1 ? 'Activo' : 'Inactivo' }}</span>
                  </button>
                </div>
              </td>

              <td @click.stop>
                <div class="row-actions">
                  <button
                    class="icon-btn"
                    @click="router.push(`/empleados/${emp.id}`)"
                    title="Ver detalle"
                  >
                    <i class="ti ti-eye"></i>
                  </button>
                  <button
                    v-if="emp.estatus !== 0"
                    class="icon-btn"
                    @click="abrirBaja(emp)"
                    title="Dar de baja"
                  >
                    <i class="ti ti-user-off"></i>
                  </button>
                  <button
                    class="icon-btn"
                    @click="abrirIncidencia(emp)"
                    title="Incidencia"
                  >
                    <i class="ti ti-alert-triangle"></i>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!empleados.length && !loading">
              <td colspan="9" class="empty-row">
                <i class="ti ti-users-off" style="font-size:24px;display:block;margin-bottom:8px;opacity:.4"></i>
                No se encontraron empleados
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div class="pagination-bar">
        <span class="pg-info">
          Mostrando {{ ((page - 1) * perPage) + 1 }}–{{ Math.min(page * perPage, totalEmpleados) }}
          de {{ totalEmpleados.toLocaleString() }}
        </span>
        <div class="pg-btns">
          <button class="pg-btn" :disabled="page === 1" @click="fetchData(page - 1)">
            <i class="ti ti-chevron-left" style="font-size:13px"></i>
          </button>
          <button
            v-for="p in visiblePages"
            :key="p"
            class="pg-btn"
            :class="{ active: p === page }"
            @click="fetchData(p)"
          >{{ p }}</button>
          <button class="pg-btn" :disabled="page >= totalPages" @click="fetchData(page + 1)">
            <i class="ti ti-chevron-right" style="font-size:13px"></i>
          </button>
        </div>
      </div>
    </div>

    <ModalBaja
      v-if="modalBaja && empSeleccionado"
      :emp="empSeleccionado"
      @close="modalBaja = false"
      @done="(msg) => { modalBaja = false; fetchData(page) }"
    />

    <ModalIncidencia
      v-if="modalIncidencia && empSeleccionado"
      :emp="empSeleccionado"
      @close="modalIncidencia = false"
      @done="(msg) => { modalIncidencia = false; fetchData(page) }"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui.js'
import { empleadosService } from '@/services/empleados.service.js'
import { catalogosService } from '@/services/catalogos.service.js'
import StatusPill      from '@/components/ui/StatusPill.vue'
import ModalBaja       from '@/components/ui/ModalBaja.vue'
import ModalIncidencia from '@/components/ui/ModalIncidencia.vue'
import api from '@/services/api.js'

const router = useRouter()
const ui     = useUiStore()

const loading         = ref(true)
const empleados       = ref([])
const totalEmpleados  = ref(0)
const completados     = ref(0)
const bajas           = ref(0)
const pendientes      = ref(0)
const page            = ref(1)
const perPage         = ref(10)
const searchQuery     = ref('')
const puestos         = ref([])
const modalBaja       = ref(false)
const modalIncidencia = ref(false)
const empSeleccionado = ref(null)
const togglingId      = ref(null)
const successMsg = ref('')
const errorMsg   = ref('')

const ubicacionQuery      = ref('')
const ubicacionResultados = ref([])
const showUbicacionList   = ref(false)

let ubicacionTimer = null
function onUbicacionSearch() {
  filtros.value.ubicacion = ''
  clearTimeout(ubicacionTimer)
  if (!ubicacionQuery.value.trim() || ubicacionQuery.value.length < 2) {
    ubicacionResultados.value = []
    return
  }
  ubicacionTimer = setTimeout(async () => {
    try {
      const { data } = await api.get('/catalogos/servicios/select', {
        params: { query: ubicacionQuery.value, limit: 10 }
      })
      ubicacionResultados.value = data.data || []
      showUbicacionList.value = true
    } catch { ubicacionResultados.value = [] }
  }, 300)
}

function selectUbicacion(s) {
  filtros.value.ubicacion = s.id
  ubicacionQuery.value    = s.text || s.valor || s.nombre
  showUbicacionList.value = false
  fetchData(1)
}

function clearUbicacion() {
  ubicacionQuery.value      = ''
  filtros.value.ubicacion   = ''
  ubicacionResultados.value = []
  fetchData(1)
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.ubicacion-search') && !e.target.closest('.ubicacion-list')) {
    showUbicacionList.value = false
  }
})

const filtros = ref({
  status:     '',
  puesto:     '',
  biometrico: '',
  ubicacion:   '',
})

let debounceTimer = null

const AVATAR_COLORS = [
  { color: '#4f8ef7', bg: '#1a2d4d' },
  { color: '#22c97a', bg: '#0d2e1f' },
  { color: '#f5a623', bg: '#2e1e06' },
  { color: '#f05454', bg: '#2e1010' },
  { color: '#a855f7', bg: '#2d1b4d' },
]

onMounted(async () => {
  ui.setBreadcrumbs([
    { label: 'Home', to: '/' },
    { label: 'Empleados', to: '/empleados' }
  ])
  await Promise.all([fetchData(1), loadPuestos()])
})

async function fetchData(p = 1) {
  loading.value = true
  page.value = p

  try {
    if (searchQuery.value.trim()) {
      const offset = (p - 1) * perPage.value
      const res = await empleadosService.buscar(searchQuery.value.trim(), perPage.value, offset)
      empleados.value     = res.data  || res.empleados || []
      totalEmpleados.value = res.total || empleados.value.length
    } else {
      const params = {
        page:  p,
        limit: perPage.value,
      }

      if (filtros.value.ubicacion) params.ubicacion = filtros.value.ubicacion
      if (filtros.value.status     !== '') params.status     = filtros.value.status
      if (filtros.value.puesto)            params.puesto     = filtros.value.puesto
      if (filtros.value.biometrico !== '') params.biometrico = filtros.value.biometrico

      const res = await empleadosService.getAll(params)
      empleados.value     = res.empleado?.data             || []
      totalEmpleados.value = res.empleado?.total            || 0
      completados.value   = res.completados?.empleadosTotales || 0
      bajas.value         = res.bajas?.empleadosTotales       || 0
      pendientes.value    = res.pendientes?.empleadosTotales  || 0
    }
  } catch (err) {
    console.error('Error:', err)
  } finally {
    loading.value = false
  }
}

async function loadPuestos() {
  try {
    puestos.value = await catalogosService.getCatalogo(10)
  } catch {}
}

// ── TOGGLE BIOMÉTRICO ────────────────────────────────────────────────
async function toggleBiometrico(emp) {
  if (togglingId.value === emp.id) return

  const nuevoValor  = emp.acceso_biometrico == 1 ? 0 : 1
  const esHabilitar = nuevoValor === 1

  togglingId.value = emp.id
  successMsg.value = ''
  errorMsg.value   = ''

  try {
    await empleadosService.toggleBiometrico(emp.id, nuevoValor)

    const idx = empleados.value.findIndex(e => e.id === emp.id)
    if (idx !== -1) {
      empleados.value[idx] = { ...empleados.value[idx], acceso_biometrico: nuevoValor }
    }

    successMsg.value = esHabilitar
      ? `Acceso biométrico habilitado para ${emp.nombre}`
      : `Acceso biométrico revocado para ${emp.nombre}`

    setTimeout(() => { successMsg.value = '' }, 3500)
  } catch {
    errorMsg.value = 'No se pudo actualizar el acceso biométrico.'
    setTimeout(() => { errorMsg.value = '' }, 3500)
  } finally {
    togglingId.value = null
  }
}

function onSearch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetchData(1), 500)
}

function clearSearch() {
  searchQuery.value = ''
  fetchData(1)
}

function resetFiltros() {
  searchQuery.value   = ''
  ubicacionQuery.value = ''
  filtros.value = { status: '', puesto: '', biometrico: '', ubicacion: '' }
  fetchData(1)
}

function abrirBaja(emp) {
  empSeleccionado.value = {
    id:       emp.id,
    nombre:   emp.nombre,
    initials: getInitials(emp.nombre),
    bg:       getAvatarBg(empleados.value.indexOf(emp)),
    color:    getAvatarColor(empleados.value.indexOf(emp)),
  }
  modalBaja.value = true
}

function abrirIncidencia(emp) {
  empSeleccionado.value = {
    id:       emp.id,
    nombre:   emp.nombre,
    initials: getInitials(emp.nombre),
    bg:       getAvatarBg(empleados.value.indexOf(emp)),
    color:    getAvatarColor(empleados.value.indexOf(emp)),
  }
  modalIncidencia.value = true
}

function exportar() {
  // TODO: exportar
}

const totalPages = computed(() => Math.ceil(totalEmpleados.value / perPage.value))

const visiblePages = computed(() => {
  const total = totalPages.value
  const cur   = page.value
  const pages = []
  let start = Math.max(1, cur - 2)
  let end   = Math.min(total, cur + 2)
  if (end - start < 4) {
    start = Math.max(1, end - 4)
    end   = Math.min(total, start + 4)
  }
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

const metricas = computed(() => [
  { label: 'Total',      icon: 'ti-users',        color: 'blue',  value: totalEmpleados.value.toLocaleString() },
  { label: 'Activos',    icon: 'ti-circle-check', color: 'green', value: completados.value },
  { label: 'Bajas',      icon: 'ti-user-off',     color: 'red',   value: bajas.value },
  { label: 'Pendientes', icon: 'ti-clock',        color: 'amber', value: pendientes.value },
])

function getInitials(nombre) {
  if (!nombre) return 'US'
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}
function getAvatarBg(i)    { return AVATAR_COLORS[i % AVATAR_COLORS.length].bg }
function getAvatarColor(i) { return AVATAR_COLORS[i % AVATAR_COLORS.length].color }
function formatDate(fecha) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' })
}
function mapEstatus(val) {
  const map = { 1: 'activo', 2: 'permiso', 0: 'baja' }
  return map[val] ?? 'activo'
}
</script>

<style scoped>
.empleados-view { display: flex; flex-direction: column; gap: 14px; }

.view-header {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 12px; flex-wrap: wrap;
}
.view-title { font-size: 20px; font-weight: 600; color: var(--tx0); }
.view-sub   { font-size: 12px; color: var(--tx2); margin-top: 3px; }
.header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

.btn-sm {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: transparent;
  font-size: 12px; color: var(--tx1); cursor: pointer;
  transition: all .15s; font-family: inherit;
}
.btn-sm:hover { background: var(--bg3); color: var(--tx0); }
.btn-primary-lg {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 8px; border: none;
  background: var(--acc); font-size: 13px; color: #fff;
  cursor: pointer; transition: background .15s;
  font-family: inherit; font-weight: 500;
}
.btn-primary-lg:hover { background: var(--acc2); }

/* Métricas */
.emp-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.emc {
  background: var(--bg1); border: 0.5px solid var(--bdr);
  border-radius: 12px; padding: 14px 16px;
  display: flex; align-items: center; gap: 12px;
}
.emc-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.emc-val   { font-size: 20px; font-weight: 600; color: var(--tx0); letter-spacing: -0.5px; }
.emc-label { font-size: 11px; color: var(--tx2); margin-top: 2px; }
.emc.blue  .emc-icon { background: var(--acc-dim); color: var(--acc); }
.emc.green .emc-icon { background: var(--grn-dim); color: var(--grn); }
.emc.red   .emc-icon { background: var(--red-dim); color: var(--red); }
.emc.amber .emc-icon { background: var(--amb-dim); color: var(--amb); }

/* Sección tabla */
.sec {
  background: var(--bg1); border: 0.5px solid var(--bdr);
  border-radius: 12px; overflow: hidden;
}
.toolbar {
  padding: 10px 14px; border-bottom: 0.5px solid var(--bdr);
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.search-box {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 6px 10px;
  flex: 1; min-width: 180px; max-width: 320px;
}
.search-box i { font-size: 15px; color: var(--tx2); flex-shrink: 0; }
.search-box input {
  background: transparent; border: none; outline: none;
  font-size: 12px; color: var(--tx0); width: 100%; font-family: inherit;
}
.search-box input::placeholder { color: var(--tx3); }
.clear-search {
  background: none; border: none; cursor: pointer;
  color: var(--tx2); font-size: 14px; padding: 0; display: flex;
}
.toolbar-right { display: flex; align-items: center; gap: 6px; margin-left: auto; flex-wrap: wrap; }
.sel {
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 5px 8px; font-size: 12px;
  color: var(--tx1); outline: none; cursor: pointer; font-family: inherit;
}

/* Tabla */
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th {
  padding: 8px 14px; text-align: left; font-size: 10px;
  font-weight: 500; color: var(--tx2); text-transform: uppercase;
  letter-spacing: .7px; border-bottom: 0.5px solid var(--bdr); white-space: nowrap;
}
td {
  padding: 10px 14px; color: var(--tx0); font-size: 12.5px;
  border-bottom: 0.5px solid var(--bdr);
}
tbody tr { cursor: pointer; transition: background .12s; }
tbody tr:hover td { background: var(--bg2); }
tbody tr:last-child td { border-bottom: none; }

.id-cell { font-family: monospace; font-size: 11px; color: var(--tx2); }
.mono    { font-family: monospace; font-size: 11px; color: var(--tx1); }
.emp-cell { display: flex; align-items: center; gap: 8px; }
.emp-av {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 600; flex-shrink: 0;
}
.emp-name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row-actions { display: flex; gap: 4px; justify-content: flex-end; }
.icon-btn {
  width: 26px; height: 26px; border-radius: 6px;
  background: var(--bg2); border: 0.5px solid var(--bdr);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--tx2); font-size: 13px; transition: all .15s;
}
.icon-btn:hover { background: var(--bg3); color: var(--tx0); }
.empty-row { text-align: center; color: var(--tx2); padding: 40px; font-size: 13px; }

/* ── TOGGLE BIOMÉTRICO ── */
.bio-toggle-wrap { display: flex; justify-content: center; align-items: center; }
.bio-toggle {
  display: flex; align-items: center; gap: 6px;
  background: none; border: none; cursor: pointer;
  padding: 3px; border-radius: 8px;
  transition: opacity .15s;
}
.bio-toggle:disabled { opacity: .5; cursor: not-allowed; }

.bio-track {
  width: 36px; height: 20px; border-radius: 10px;
  background: var(--bdr2);
  border: 0.5px solid var(--bdr2);
  position: relative; transition: background .2s, border-color .2s;
  flex-shrink: 0;
}
.bio-toggle.active .bio-track {
  background: var(--grn, #22c97a);
  border-color: var(--grn, #22c97a);
}

.bio-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 16px; height: 16px; border-radius: 50%;
  background: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; color: var(--tx2);
  transition: transform .2s, color .2s;
  box-shadow: 0 1px 3px rgba(0,0,0,.2);
}
.bio-toggle.active .bio-thumb {
  transform: translateX(16px);
  color: var(--grn, #22c97a);
}

.bio-label {
  font-size: 11px; font-weight: 500;
  color: var(--tx2); min-width: 40px;
  transition: color .2s;
}
.bio-toggle.active .bio-label { color: var(--grn, #22c97a); }

/* Spinner */
.spin { animation: spin .6s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Skeleton */
.skeleton-wrap { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.skeleton-row {
  height: 42px; background: var(--bg2); border-radius: 8px;
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }

/* Paginación */
.pagination-bar {
  padding: 10px 14px; border-top: 0.5px solid var(--bdr);
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 8px;
}
.pg-info { font-size: 11px; color: var(--tx2); }
.pg-btns { display: flex; gap: 3px; }
.pg-btn {
  width: 28px; height: 28px; border-radius: 6px;
  background: transparent; border: 0.5px solid var(--bdr2);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; cursor: pointer; color: var(--tx1);
  transition: all .15s; font-family: inherit;
}
.pg-btn:hover:not(:disabled) { background: var(--bg3); }
.pg-btn.active { background: var(--acc); color: #fff; border-color: var(--acc); }
.pg-btn:disabled { opacity: .4; cursor: not-allowed; }

/* Responsive */
@media (max-width: 768px) {
  .emp-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .search-box  { max-width: 100%; }
  .toolbar     { gap: 6px; }
}

/* Alerts */
.alert-error, .alert-success {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-radius: 10px; font-size: 13px;
}
.alert-error   { background: var(--red-dim); border: 0.5px solid var(--red); color: var(--red); }
.alert-success { background: var(--grn-dim); border: 0.5px solid var(--grn); color: var(--grn); }

.ubicacion-wrap { position: relative; }
.ubicacion-search {
  display: flex; align-items: center; gap: 6px;
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 0 8px; height: 30px;
  transition: border .15s; min-width: 140px;
}
.ubicacion-search:focus-within { border-color: var(--acc); }
.ubicacion-search i { font-size: 14px; color: var(--tx2); flex-shrink: 0; }
.ubicacion-search input {
  background: transparent; border: none; outline: none;
  font-size: 12px; color: var(--tx0); width: 100%; font-family: inherit;
  padding: 0;
}
.ubicacion-search input::placeholder { color: var(--tx3); }
.clear-btn {
  background: none; border: none; cursor: pointer;
  color: var(--tx2); font-size: 13px; padding: 0; display: flex;
}
.ubicacion-list {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--bg1); border: 0.5px solid var(--bdr2);
  border-radius: 8px; max-height: 180px; overflow-y: auto;
  z-index: 200;
}
.ubicacion-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; font-size: 12px; color: var(--tx1);
  cursor: pointer; transition: background .12s;
}
.ubicacion-item:hover { background: var(--bg2); color: var(--tx0); }
.ubicacion-item i { font-size: 13px; color: var(--tx2); }
</style>