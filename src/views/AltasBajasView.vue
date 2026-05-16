<template>
  <div class="ab-view">

    <!-- Header -->
    <div class="view-header">
      <div>
        <h1 class="view-title">Altas y Bajas</h1>
        <p class="view-sub">Movimientos de personal por periodo</p>
      </div>

      <!-- Filtro fechas -->
      <div class="filtro-fechas">
        <div class="field-inline">
          <label>Fecha inicio</label>
          <input type="date" v-model="fechaInicio" />
        </div>
        <div class="field-inline">
          <label>Fecha fin</label>
          <input type="date" v-model="fechaFin" />
        </div>
        <button class="btn-primary-lg" @click="buscar" :disabled="loading">
          <i class="ti ti-loader-2 spin" v-if="loading" aria-hidden="true"></i>
          <i class="ti ti-search" v-else aria-hidden="true"></i>
          Buscar
        </button>
      </div>
    </div>

    <!-- Alert error -->
    <div v-if="errorMsg" class="alert-error">
      <i class="ti ti-alert-circle" aria-hidden="true"></i>
      {{ errorMsg }}
    </div>

    <!-- Tabs -->
    <div class="tabs-wrap">
      <div class="tabs-bar">
        <button
          class="tab-btn"
          :class="{ active: tab === 'altas' }"
          @click="tab = 'altas'"
        >
          <i class="ti ti-trending-up" aria-hidden="true"></i>
          Altas
          <span class="tab-count" v-if="altas.length">{{ altas.length }}</span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: tab === 'bajas' }"
          @click="tab = 'bajas'"
        >
          <i class="ti ti-trending-down" aria-hidden="true"></i>
          Bajas
          <span class="tab-count red" v-if="bajas.length">{{ bajas.length }}</span>
        </button>
      </div>

      <div class="tabs-actions">
        <span class="periodo-label" v-if="periodoLabel">{{ periodoLabel }}</span>
        <button class="btn-sm" @click="exportarXlsx" :disabled="!currentData.length">
          <i class="ti ti-file-spreadsheet" aria-hidden="true"></i>
          Exportar XLSX
        </button>
      </div>
    </div>

    <!-- Tabla Altas -->
    <div v-if="tab === 'altas'" class="sec">
      <div class="sec-meta">
        <span>{{ altas.length }} registros</span>
        <div class="search-box">
          <i class="ti ti-search" aria-hidden="true"></i>
          <input v-model="searchAltas" placeholder="Filtrar por nombre, CURP..." />
          <button v-if="searchAltas" class="clear-btn" @click="searchAltas = ''">
            <i class="ti ti-x"></i>
          </button>
        </div>
      </div>

      <div v-if="loading" class="skeleton-wrap">
        <div class="skeleton-row" v-for="i in 6" :key="i"></div>
      </div>

      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:80px">No.</th>
              <th style="width:250px">Nombre</th>
              <th style="width:160px">CURP</th>
              <th style="width:120px">RFC</th>
              <th style="width:110px">NSS</th>
              <th style="width:90px">CP Fiscal</th>
              <th style="width:110px">Fecha alta</th>
              <th style="width:110px">Turno</th>
              <th style="width:140px">Puesto</th>
              <th style="width:110px">Periodicidad</th>
              <th style="width:100px">Tipo sangre</th>
              <th style="width:110px">Escolaridad</th>
              <th style="width:110px">Parentesco</th>
              <th style="width:160px">Emergencia</th>
              <th style="width:120px">Tel emergencia</th>
              <th style="width:90px">Estatus</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in filteredAltas" :key="i">
              <td class="mono">{{ String(r.noEmpleado || '').padStart(6,'0') }}</td>
              <td>
                <div class="emp-cell">
                  <div class="emp-av" :style="{ background: getAvatarBg(i), color: getAvatarColor(i) }">
                    {{ getInitials(r.nombreCompleto) }}
                  </div>
                  <span class="emp-name" :title="r.nombreCompleto">{{ r.nombreCompleto }}</span>

                </div>
              </td>
              <td class="mono small">{{ r.curp || '—' }}</td>
              <td class="mono small">{{ r.rfc || '—' }}</td>
              <td class="mono small">{{ r.nss || '—' }}</td>
              <td class="mono small">{{ r.CP_fiscal || '—' }}</td>
              <td style="color:var(--tx2)">{{ r.fecha_efectiva || '—' }}</td>
              <td style="color:var(--tx1)">{{ r.turno || '—' }}</td>
              <td style="color:var(--tx1)">{{ r.puesto || '—' }}</td>
              <td style="color:var(--tx2)">{{ r.periodicidad || '—' }}</td>
              <td style="color:var(--tx2)">{{ r.tipoSangre || '—' }}</td>
              <td style="color:var(--tx2)">{{ r.escolaridad || '—' }}</td>
              <td style="color:var(--tx2)">{{ r.parentesco || '—' }}</td>
              <td style="color:var(--tx1)">{{ r.nombreEmergencia || '—' }}</td>
              <td style="color:var(--tx2)">{{ r.telefonoEmergencia || '—' }}</td>
              <td>
                <span class="pill" :class="r.estatus == 1 ? 'activo' : 'baja'">
                  <span class="dot"></span>
                  {{ r.estatus == 1 ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
            </tr>
            <tr v-if="!filteredAltas.length">
              <td colspan="16" class="empty-row">
                <i class="ti ti-trending-up" style="font-size:24px;display:block;margin-bottom:8px;opacity:.3"></i>
                No hay altas en el periodo seleccionado
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tabla Bajas -->
    <div v-if="tab === 'bajas'" class="sec">
      <div class="sec-meta">
        <span>{{ bajas.length }} registros</span>
        <div class="search-box">
          <i class="ti ti-search" aria-hidden="true"></i>
          <input v-model="searchBajas" placeholder="Filtrar por nombre, CURP..." />
          <button v-if="searchBajas" class="clear-btn" @click="searchBajas = ''">
            <i class="ti ti-x"></i>
          </button>
        </div>
      </div>

      <div v-if="loading" class="skeleton-wrap">
        <div class="skeleton-row" v-for="i in 6" :key="i"></div>
      </div>

      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:80px">No.</th>
              <th style="width:250px">Nombre</th>
              <th style="width:160px">CURP</th>
              <th style="width:120px">RFC</th>
              <th style="width:110px">NSS</th>
              <th style="width:90px">CP Fiscal</th>
              <th style="width:110px">Fecha alta</th>
              <th style="width:110px">Turno</th>
              <th style="width:140px">Puesto</th>
              <th style="width:110px">Periodicidad</th>
              <th style="width:100px">Tipo sangre</th>
              <th style="width:110px">Escolaridad</th>
              <th style="width:140px">Motivo baja</th>
              <th style="width:100px">Finiquito</th>
              <th style="width:110px">Fecha baja</th>
              <th style="width:160px">Nota</th>
              <th style="width:100px">Estatus</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in filteredBajas" :key="i">
              <td class="mono">{{ String(r.noEmpleado || '').padStart(6,'0') }}</td>
              <td>
                <div class="emp-cell">
                  <div class="emp-av" :style="{ background: getAvatarBg(i), color: getAvatarColor(i) }">
                    {{ getInitials(r.nombreCompleto) }}
                  </div>
                  <span class="emp-name" :title="r.nombreCompleto">{{ r.nombreCompleto }}</span>

                </div>
              </td>
              <td class="mono small">{{ r.curp || '—' }}</td>
              <td class="mono small">{{ r.rfc || '—' }}</td>
              <td class="mono small">{{ r.nss || '—' }}</td>
              <td class="mono small">{{ r.CP_fiscal || '—' }}</td>
              <td style="color:var(--tx2)">{{ r.fecha_efectiva || '—' }}</td>
              <td style="color:var(--tx1)">{{ r.turno || '—' }}</td>
              <td style="color:var(--tx1)">{{ r.puesto || '—' }}</td>
              <td style="color:var(--tx2)">{{ r.periodicidad || '—' }}</td>
              <td style="color:var(--tx2)">{{ r.tipoSangre || '—' }}</td>
              <td style="color:var(--tx2)">{{ r.escolaridad || '—' }}</td>
              <td style="color:var(--tx2)">{{ r.motivoBaja || '—' }}</td>
              <td style="color:var(--tx2)">{{ r.finiquito || '—' }}</td>
              <td style="color:var(--red)">{{ r.fechaBaja || '—' }}</td>
              <td style="color:var(--tx2);font-size:11px">{{ r.nota || '—' }}</td>
              <td>
                <span class="pill baja">
                  <span class="dot"></span>{{ r.status || 'Baja' }}
                </span>
              </td>
            </tr>
            <tr v-if="!filteredBajas.length">
              <td colspan="17" class="empty-row">
                <i class="ti ti-trending-down" style="font-size:24px;display:block;margin-bottom:8px;opacity:.3"></i>
                No hay bajas en el periodo seleccionado
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUiStore } from '@/stores/ui.js'
import { reportesService } from '@/services/reportes.service.js'

const ui = useUiStore()

const loading      = ref(false)
const errorMsg     = ref('')
const tab          = ref('altas')
const altas        = ref([])
const bajas        = ref([])
const searchAltas  = ref('')
const searchBajas  = ref('')
const periodoLabel = ref('')

// Mes actual por defecto
const hoy   = new Date()
const first = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
const last  = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)

const fechaInicio = ref(formatDate(first))
const fechaFin    = ref(formatDate(last))

const AVATAR_COLORS = [
  { color: '#4f8ef7', bg: '#1a2d4d' },
  { color: '#22c97a', bg: '#0d2e1f' },
  { color: '#f5a623', bg: '#2e1e06' },
  { color: '#f05454', bg: '#2e1010' },
  { color: '#a855f7', bg: '#2d1b4d' },
]

onMounted(() => {
  ui.setBreadcrumbs([
    { label: 'Home', to: '/' },
    { label: 'Altas y Bajas', to: '/altas-bajas' }
  ])
  buscar()
})

async function buscar() {
  if (!fechaInicio.value || !fechaFin.value) {
    errorMsg.value = 'Selecciona ambas fechas'
    return
  }
  if (fechaInicio.value > fechaFin.value) {
    errorMsg.value = 'La fecha inicio no puede ser mayor a la fecha fin'
    return
  }

  errorMsg.value = ''
  loading.value  = true

  try {
    const [resAltas, resBajas] = await Promise.all([
      reportesService.getAltas(fechaInicio.value, fechaFin.value),
      reportesService.getBajas(fechaInicio.value, fechaFin.value),
    ])
    altas.value = resAltas
    bajas.value = resBajas
    periodoLabel.value = `${fechaInicio.value} → ${fechaFin.value}`
  } catch (err) {
    errorMsg.value = err.response?.data?.message || 'Error al obtener los reportes'
  } finally {
    loading.value = false
  }
}

const currentData = computed(() => tab.value === 'altas' ? altas.value : bajas.value)

const filteredAltas = computed(() => {
  const q = searchAltas.value.toLowerCase().trim()
  if (!q) return altas.value
  return altas.value.filter(r =>
    (r.nombreCompleto || '').toLowerCase().includes(q) ||
    (r.curp || '').toLowerCase().includes(q) ||
    (r.rfc || '').toLowerCase().includes(q) ||
    (r.puesto || '').toLowerCase().includes(q)
  )
})

const filteredBajas = computed(() => {
  const q = searchBajas.value.toLowerCase().trim()
  if (!q) return bajas.value
  return bajas.value.filter(r =>
    (r.nombreCompleto || '').toLowerCase().includes(q) ||
    (r.curp || '').toLowerCase().includes(q) ||
    (r.rfc || '').toLowerCase().includes(q) ||
    (r.motivoBaja || '').toLowerCase().includes(q)
  )
})

async function exportarXlsx() {
  const data     = currentData.value
  const nombre   = tab.value === 'altas' ? 'altas' : 'bajas'
  const filename = `reporte_${nombre}_${fechaInicio.value}_${fechaFin.value}.xlsx`

  try {
    const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm')
    const ws   = XLSX.utils.json_to_sheet(data)
    const wb   = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, nombre)
    XLSX.writeFile(wb, filename)
  } catch {
    // Fallback — descarga CSV
    const headers = Object.keys(data[0] || {}).join(',')
    const rows    = data.map(r => Object.values(r).map(v => `"${v}"`).join(','))
    const csv     = [headers, ...rows].join('\n')
    const blob    = new Blob([csv], { type: 'text/csv' })
    const url     = URL.createObjectURL(blob)
    const a       = document.createElement('a')
    a.href        = url
    a.download    = filename.replace('.xlsx', '.csv')
    a.click()
    URL.revokeObjectURL(url)
  }
}

function formatDate(d) {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function getInitials(nombre) {
  if (!nombre) return 'US'
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}
function getAvatarBg(i)    { return AVATAR_COLORS[i % AVATAR_COLORS.length].bg }
function getAvatarColor(i) { return AVATAR_COLORS[i % AVATAR_COLORS.length].color }
</script>

<style scoped>
.emp-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
  position: relative;
  cursor: default;
}

.emp-name::after {
  content: attr(title);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  background: var(--bg0);
  color: var(--tx0);
  border: 0.5px solid var(--bdr2);
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 400;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity .15s, transform .15s;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0,0,0,.3);
}

.emp-name:hover::after {
  opacity: 1;
  transform: translateY(0);
}
td {
  padding: 9px 12px; color: var(--tx0);
  font-size: 12px; border-bottom: 0.5px solid var(--bdr);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.emp-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}

.ab-view { display: flex; flex-direction: column; gap: 14px; }

.view-header {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 12px; flex-wrap: wrap;
}
.view-title { font-size: 20px; font-weight: 600; color: var(--tx0); }
.view-sub   { font-size: 12px; color: var(--tx2); margin-top: 3px; }

/* Filtro fechas */
.filtro-fechas {
  display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap;
}
.field-inline { display: flex; flex-direction: column; gap: 4px; }
.field-inline label { font-size: 11px; color: var(--tx2); font-weight: 500; }
.field-inline input {
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 7px 10px;
  font-size: 12px; color: var(--tx0); outline: none; font-family: inherit;
}
.field-inline input:focus { border-color: var(--acc); }

/* Tabs */
.tabs-wrap {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--bg1); border: 0.5px solid var(--bdr);
  border-radius: 12px; padding: 8px 12px; gap: 10px; flex-wrap: wrap;
}
.tabs-bar { display: flex; gap: 4px; }
.tab-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 8px; border: none;
  background: transparent; font-size: 13px; color: var(--tx2);
  cursor: pointer; transition: all .15s; font-family: inherit;
}
.tab-btn:hover  { background: var(--bg2); color: var(--tx0); }
.tab-btn.active { background: var(--acc-dim); color: var(--acc); font-weight: 500; }
.tab-btn i      { font-size: 15px; }
.tab-count {
  font-size: 10px; padding: 2px 6px; border-radius: 20px;
  background: var(--acc); color: #fff; min-width: 18px; text-align: center;
}
.tab-count.red { background: var(--red); }
.tabs-actions { display: flex; align-items: center; gap: 10px; }
.periodo-label { font-size: 11px; color: var(--tx2); }

/* Alert */
.alert-error {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; background: var(--red-dim);
  border: 0.5px solid var(--red); border-radius: 8px;
  color: var(--red); font-size: 13px;
}

/* Sección */
.sec { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 12px; overflow: hidden; }
.sec-meta {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; border-bottom: 0.5px solid var(--bdr);
  font-size: 12px; color: var(--tx2); gap: 10px; flex-wrap: wrap;
}

/* Search */
.search-box {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 5px 10px;
}
.search-box i { font-size: 14px; color: var(--tx2); flex-shrink: 0; }
.search-box input {
  background: transparent; border: none; outline: none;
  font-size: 12px; color: var(--tx0); font-family: inherit; width: 200px;
}
.search-box input::placeholder { color: var(--tx3); }
.clear-btn {
  background: none; border: none; cursor: pointer;
  color: var(--tx2); font-size: 13px; padding: 0; display: flex;
}

/* Tabla */
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th {
  padding: 8px 12px; text-align: left;
  font-size: 10px; font-weight: 500; color: var(--tx2);
  text-transform: uppercase; letter-spacing: .7px;
  border-bottom: 0.5px solid var(--bdr); white-space: nowrap;
}
td {
  padding: 9px 12px; color: var(--tx0);
  font-size: 12px; border-bottom: 0.5px solid var(--bdr);
  white-space: nowrap;
}
tbody tr { transition: background .12s; }
tbody tr:hover td { background: var(--bg2); }
tbody tr:last-child td { border-bottom: none; }
.mono  { font-family: monospace; }
.small { font-size: 11px; }
.emp-cell { display: flex; align-items: center; gap: 7px; }
.emp-av {
  width: 26px; height: 26px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 600; flex-shrink: 0;
}
.emp-name { font-weight: 500; }
.empty-row { text-align: center; color: var(--tx2); padding: 40px; font-size: 13px; }

/* Pills */
.pill {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; padding: 3px 8px; border-radius: 20px; font-weight: 500;
}
.dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.pill.activo { background: var(--grn-dim); color: var(--grn); }
.pill.baja   { background: var(--red-dim); color: var(--red); }

/* Skeleton */
.skeleton-wrap { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.skeleton-row {
  height: 40px; background: var(--bg2); border-radius: 8px;
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }

/* Botones */
.btn-sm {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: transparent;
  font-size: 12px; color: var(--tx1); cursor: pointer;
  transition: all .15s; font-family: inherit;
}
.btn-sm:hover:not(:disabled) { background: var(--bg3); color: var(--tx0); }
.btn-sm:disabled { opacity: .5; cursor: not-allowed; }
.btn-primary-lg {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 8px; border: none;
  background: var(--acc); font-size: 13px; color: #fff;
  cursor: pointer; font-family: inherit; font-weight: 500;
  transition: background .15s;
}
.btn-primary-lg:hover:not(:disabled) { background: var(--acc2); }
.btn-primary-lg:disabled { opacity: .6; cursor: not-allowed; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin .8s linear infinite; }

@media (max-width: 768px) {
  .view-header { flex-direction: column; }
  .filtro-fechas { width: 100%; }
  .field-inline input { width: 100%; }
}
</style>