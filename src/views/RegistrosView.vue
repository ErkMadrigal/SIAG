<template>
  <div class="bio-view">

    <!-- Header -->
    <div class="view-header">
      <div>
        <h1 class="view-title">Registros biométricos</h1>
        <p class="view-sub" v-if="meta.total">{{ meta.total.toLocaleString() }} registros en total</p>
      </div>
      <button class="btn-sm" @click="fetchData">
        <i class="ti ti-refresh" aria-hidden="true"></i> Recargar
      </button>
    </div>

    <!-- Filtros -->
    <div class="sec">
      <div class="filtros-grid">
        <div class="search-box">
          <i class="ti ti-search" aria-hidden="true"></i>
          <input
            v-model="filtros.search"
            placeholder="Buscar empleado, capturista, servicio..."
            @keydown.enter="aplicarFiltros"
          />
          <button v-if="filtros.search" class="clear-btn" @click="filtros.search = ''; aplicarFiltros()">
            <i class="ti ti-x"></i>
          </button>
        </div>

        <div class="field-inline">
          <label>Desde</label>
          <input type="date" v-model="filtros.date_from" />
        </div>

        <div class="field-inline">
          <label>Hasta</label>
          <input type="date" v-model="filtros.date_to" />
        </div>

        <select class="sel" v-model="filtros.pageSize" @change="aplicarFiltros">
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>

        <button class="btn-primary-lg" @click="aplicarFiltros">
          <i class="ti ti-filter" aria-hidden="true"></i> Aplicar
        </button>
      </div>
    </div>

    <!-- Tabla -->
    <div class="sec">

      <!-- Skeleton -->
      <div v-if="loading" class="skeleton-wrap">
        <div class="skeleton-row" v-for="i in filtros.pageSize > 10 ? 10 : filtros.pageSize" :key="i"></div>
      </div>

      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:200px">Empleado</th>
              <th style="width:150px">Fecha</th>
              <th style="width:180px">Servicio</th>
              <th style="width:150px">Capturista</th>
              <th style="width:100px">Estado</th>
              <th style="width:80px;text-align:center">Ubicación</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in registros" :key="i">
              <td>
                <div class="emp-cell">
                  <div class="emp-av" :style="{ background: getAvatarBg(i), color: getAvatarColor(i) }">
                    {{ getInitials(r.empleado) }}
                  </div>
                  <span class="emp-name">{{ r.empleado }}</span>
                </div>
              </td>
              <td style="color:var(--tx2);font-size:12px">{{ r.fecha }}</td>
              <td style="color:var(--tx1)">{{ r.servicio || '—' }}</td>
              <td style="color:var(--tx2)">{{ r.capturista || '—' }}</td>
              <td>
                <span class="estado-pill" :class="r.estado?.toLowerCase()">
                  <span class="dot"></span>
                  {{ r.estado }}
                </span>
              </td>
              <td style="text-align:center">
                <button
                  class="icon-btn"
                  :class="{ disabled: !r.maps_embed }"
                  :disabled="!r.maps_embed"
                  @click="abrirMapa(r)"
                  title="Ver ubicación"
                >
                  <i class="ti ti-map-pin" :style="{ color: r.maps_embed ? 'var(--acc)' : 'var(--tx3)' }"></i>
                </button>
              </td>
            </tr>
            <tr v-if="!registros.length">
              <td colspan="6" class="empty-row">
                <i class="ti ti-fingerprint" style="font-size:28px;display:block;margin-bottom:8px;opacity:.3"></i>
                No hay registros biométricos
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div class="pagination-bar">
        <span class="pg-info">
          Mostrando {{ meta.total === 0 ? 0 : (page - 1) * filtros.pageSize + 1 }}–{{ Math.min(page * filtros.pageSize, meta.total) }}
          de {{ meta.total.toLocaleString() }}
        </span>
        <div class="pg-btns">
          <button class="pg-btn" :disabled="page === 1" @click="goPage(1)">
            <i class="ti ti-chevrons-left" style="font-size:12px"></i>
          </button>
          <button class="pg-btn" :disabled="page === 1" @click="goPage(page - 1)">
            <i class="ti ti-chevron-left" style="font-size:12px"></i>
          </button>
          <button
            v-for="p in visiblePages" :key="p"
            class="pg-btn" :class="{ active: p === page }"
            @click="goPage(p)"
          >{{ p }}</button>
          <button class="pg-btn" :disabled="page >= meta.totalPages" @click="goPage(page + 1)">
            <i class="ti ti-chevron-right" style="font-size:12px"></i>
          </button>
          <button class="pg-btn" :disabled="page >= meta.totalPages" @click="goPage(meta.totalPages)">
            <i class="ti ti-chevrons-right" style="font-size:12px"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Mapa -->
    <Teleport to="body">
      <div v-if="mapaOpen" class="modal-overlay" @click.self="cerrarMapa">
        <div class="mapa-box">
          <div class="mapa-hdr">
            <div class="mapa-hdr-info">
              <i class="ti ti-map-pin" style="color:var(--acc);font-size:18px" aria-hidden="true"></i>
              <div>
                <p class="mapa-title">{{ mapaData?.empleado }}</p>
                <p class="mapa-sub">{{ mapaData?.fecha }} · {{ mapaData?.servicio }}</p>
              </div>
            </div>
            <button class="modal-close" @click="cerrarMapa"><i class="ti ti-x"></i></button>
          </div>
          <div class="mapa-body">
            <iframe
              v-if="mapaData?.maps_embed"
              :src="mapaData.maps_embed"
              class="mapa-iframe"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
            <div class="mapa-footer">
                <span class="estado-pill" :class="mapaData?.estado?.toLowerCase()">
                    <span class="dot"></span>{{ mapaData?.estado }}
                </span>
                <button
                    v-if="mapaData?.maps_url"
                    class="btn-primary-lg"
                    @click="abrirEnMaps"
                >
                    <i class="ti ti-external-link" aria-hidden="true"></i>
                    Abrir en Google Maps
                </button>
            </div>

        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useUiStore } from '@/stores/ui.js'
import { biometricoService } from '@/services/biometrico.service.js'

const ui = useUiStore()

const loading   = ref(true)
const registros = ref([])
const page      = ref(1)
const meta      = reactive({ total: 0, totalPages: 1, pageSize: 25 })
const mapaOpen  = ref(false)
const mapaData  = ref(null)

const filtros = reactive({
  search:    '',
  date_from: '',
  date_to:   '',
  pageSize:  25,
})

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
    { label: 'Biométrico', to: '/biometrico' }
  ])
  fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    const res = await biometricoService.getRegistros({
      search:    filtros.search,
      date_from: filtros.date_from,
      date_to:   filtros.date_to,
      page:      page.value,
      pageSize:  filtros.pageSize,
    })

    registros.value   = res.data  || []
    meta.total        = res.meta?.total      || 0
    meta.totalPages   = res.meta?.totalPages || 1
    meta.pageSize     = res.meta?.pageSize   || filtros.pageSize

  } catch (err) {
    console.error('Error biométrico:', err)
    registros.value = []
  } finally {
    loading.value = false
  }
}

function aplicarFiltros() {
  page.value = 1
  fetchData()
}

function goPage(p) {
  if (p < 1 || p > meta.totalPages) return
  page.value = p
  fetchData()
}

const visiblePages = computed(() => {
  const total = meta.totalPages
  const cur   = page.value
  let start   = Math.max(1, cur - 2)
  let end     = Math.min(total, start + 4)
  start       = Math.max(1, end - 4)
  const pages = []
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

function abrirMapa(r) {
  if (!r.maps_embed) return
  mapaData.value = r
  mapaOpen.value = true
}

function cerrarMapa() {
  mapaOpen.value = false
  setTimeout(() => mapaData.value = null, 200)
}

function getInitials(nombre) {
  if (!nombre) return '??'
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}
function abrirEnMaps() {
  if (mapaData.value?.maps_url) {
    window.open(mapaData.value.maps_url, '_blank', 'noopener')
  }
}
function getAvatarBg(i)    { return AVATAR_COLORS[i % AVATAR_COLORS.length].bg }
function getAvatarColor(i) { return AVATAR_COLORS[i % AVATAR_COLORS.length].color }
</script>

<style scoped>
.bio-view { display: flex; flex-direction: column; gap: 14px; }

.view-header {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
}
.view-title { font-size: 20px; font-weight: 600; color: var(--tx0); }
.view-sub   { font-size: 12px; color: var(--tx2); margin-top: 3px; }

/* Filtros */
.filtros-grid {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; flex-wrap: wrap;
}
.search-box {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 6px 10px; flex: 1; min-width: 200px;
}
.search-box i { font-size: 15px; color: var(--tx2); flex-shrink: 0; }
.search-box input {
  background: transparent; border: none; outline: none;
  font-size: 12px; color: var(--tx0); width: 100%; font-family: inherit;
}
.search-box input::placeholder { color: var(--tx3); }
.clear-btn {
  background: none; border: none; cursor: pointer;
  color: var(--tx2); font-size: 14px; padding: 0; display: flex;
}
.field-inline {
  display: flex; flex-direction: column; gap: 3px;
}
.field-inline label { font-size: 10px; color: var(--tx2); font-weight: 500; }
.field-inline input {
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 6px 10px;
  font-size: 12px; color: var(--tx0); outline: none; font-family: inherit;
}
.field-inline input:focus { border-color: var(--acc); }
.sel {
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 6px 8px;
  font-size: 12px; color: var(--tx1); outline: none; font-family: inherit;
}

/* Sección */
.sec { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 12px; overflow: hidden; }

/* Tabla */
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th {
  padding: 8px 14px; text-align: left;
  font-size: 10px; font-weight: 500; color: var(--tx2);
  text-transform: uppercase; letter-spacing: .7px;
  border-bottom: 0.5px solid var(--bdr); white-space: nowrap;
}
td {
  padding: 10px 14px; color: var(--tx0);
  font-size: 12.5px; border-bottom: 0.5px solid var(--bdr);
}
tbody tr { transition: background .12s; }
tbody tr:hover td { background: var(--bg2); }
tbody tr:last-child td { border-bottom: none; }
.emp-cell { display: flex; align-items: center; gap: 8px; }
.emp-av {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 600; flex-shrink: 0;
}
.emp-name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.empty-row { text-align: center; color: var(--tx2); padding: 40px; font-size: 13px; }

/* Estado pill */
.estado-pill {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; padding: 3px 9px; border-radius: 20px; font-weight: 500;
}
.dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.estado-pill.entrada { background: var(--grn-dim); color: var(--grn); }
.estado-pill.salida  { background: var(--red-dim);  color: var(--red);  }
.estado-pill.pendiente { background: var(--amb-dim); color: var(--amb); }

/* Icon btn */
.icon-btn {
  width: 28px; height: 28px; border-radius: 6px;
  background: var(--bg2); border: 0.5px solid var(--bdr);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--tx2); font-size: 14px; transition: all .15s;
  margin: 0 auto;
}
.icon-btn:hover:not(.disabled) { background: var(--bg3); }
.icon-btn.disabled { opacity: .4; cursor: not-allowed; }

/* Paginación */
.pagination-bar {
  padding: 10px 14px; border-top: 0.5px solid var(--bdr);
  display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;
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

/* Skeleton */
.skeleton-wrap { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.skeleton-row {
  height: 42px; background: var(--bg2); border-radius: 8px;
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }

/* Modal Mapa */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px;
}
.mapa-box {
  background: var(--bg1); border: 0.5px solid var(--bdr2);
  border-radius: 16px; width: 100%; max-width: 680px;
  display: flex; flex-direction: column; overflow: hidden; max-height: 90vh;
}
.mapa-hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 0.5px solid var(--bdr); flex-shrink: 0;
}
.mapa-hdr-info { display: flex; align-items: center; gap: 10px; }
.mapa-title { font-size: 14px; font-weight: 500; color: var(--tx0); }
.mapa-sub   { font-size: 11px; color: var(--tx2); margin-top: 2px; }
.modal-close {
  width: 28px; height: 28px; border-radius: 6px;
  background: var(--bg3); border: none; cursor: pointer;
  color: var(--tx2); font-size: 16px;
  display: flex; align-items: center; justify-content: center;
}
.mapa-body { flex: 1; overflow: hidden; min-height: 380px; }
.mapa-iframe { width: 100%; height: 100%; min-height: 380px; border: none; display: block; }
.mapa-footer {
  padding: 12px 16px; border-top: 0.5px solid var(--bdr);
  display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
}

/* Botones */
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
  cursor: pointer; font-family: inherit; font-weight: 500;
  transition: background .15s;
}
.btn-primary-lg:hover { background: var(--acc2); }

@media (max-width: 768px) {
  .filtros-grid { flex-direction: column; align-items: stretch; }
  .field-inline { flex-direction: row; align-items: center; gap: 8px; }
}
</style>