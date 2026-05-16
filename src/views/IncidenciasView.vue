<template>
  <div class="inc-view">

    <!-- Header -->
    <div class="view-header">
      <div>
        <h1 class="view-title">Incidencias</h1>
        <p class="view-sub" v-if="rows.length">{{ rows.length }} registros cargados</p>
      </div>
      <div class="tabs-wrap">
        <button class="tab-btn" :class="{ active: estadoFiltro === 'pendiente' }" @click="cambiarEstado('pendiente')">
          <i class="ti ti-clock"></i> Pendientes
        </button>
        <button class="tab-btn" :class="{ active: estadoFiltro === 'aprobada' }" @click="cambiarEstado('aprobada')">
          <i class="ti ti-check"></i> Aprobadas
        </button>
        <button class="tab-btn" :class="{ active: estadoFiltro === 'rechazada' }" @click="cambiarEstado('rechazada')">
          <i class="ti ti-x"></i> Rechazadas
        </button>
        <button class="tab-btn" :class="{ active: estadoFiltro === 'todas' }" @click="cambiarEstado('todas')">
          <i class="ti ti-list"></i> Todas
        </button>
      </div>
      <button class="btn-sm" @click="loadData">
        <i class="ti ti-refresh"></i>
      </button>
    </div>

    <!-- Toolbar -->
    <div class="sec">
      <div class="toolbar">
        <div class="search-box">
          <i class="ti ti-search" aria-hidden="true"></i>
          <input
            v-model="searchQuery"
            placeholder="Buscar por nombre, RFC, CURP, tipo..."
            @input="page = 1"
          />
          <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''; page = 1">
            <i class="ti ti-x"></i>
          </button>
        </div>
        <div class="toolbar-right">
          <select class="sel" v-model="perPage" @change="page = 1">
            <option :value="10">10</option>
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </div>
      </div>

      <!-- Skeleton -->
      <div v-if="loading" class="skeleton-wrap">
        <div class="skeleton-row" v-for="i in 6" :key="i"></div>
      </div>

      <!-- Tabla -->
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:100px">No. Emp.</th>
              <th style="width:200px">Empleado</th>
              <th style="width:120px">RFC</th>
              <th style="width:150px">CURP</th>
              <th style="width:180px">Tipo</th>
              <th style="width:200px">Descripción</th>
              <th style="width:110px">Fecha inicio</th>
              <th style="width:110px">Fecha fin</th>
              <th style="width:80px;text-align:center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in paginatedRows" :key="i" @click="abrirModal(r)" style="cursor:pointer">
              <td class="mono">{{ String(r.id_empleado || '').padStart(6,'0') }}</td>
              <td>
                <div class="emp-cell">
                  <div class="emp-av" :style="{ background: getAvatarBg(i), color: getAvatarColor(i) }">
                    {{ getInitials(r.nombre) }}
                  </div>
                  <span class="emp-name" :title="r.nombre">{{ r.nombre }}</span>
                </div>
              </td>
              <td class="mono small">{{ r.rfc || '—' }}</td>
              <td class="mono small">{{ r.curp || '—' }}</td>
              <td>
                <span class="tipo-pill">{{ r.valor || '—' }}</span>
              </td>
              <td class="desc-cell" :title="r.descripcion">{{ r.descripcion || '—' }}</td>
              <td style="color:var(--tx2)">{{ r.fecha_inicio || '—' }}</td>
              <td style="color:var(--tx2)">{{ r.fecha_final || '—' }}</td>
              <td @click.stop style="text-align:center">
                <button class="icon-btn accent" @click="abrirModal(r)" title="Revisar">
                  <i class="ti ti-eye"></i>
                </button>
              </td>
            </tr>
            <tr v-if="!paginatedRows.length && !loading">
              <td colspan="9" class="empty-row">
                <i class="ti ti-alert-triangle" style="font-size:24px;display:block;margin-bottom:8px;opacity:.3"></i>
                No hay incidencias registradas
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div class="pagination-bar">
        <span class="pg-info">
          Mostrando {{ filteredRows.length ? (page-1)*perPage+1 : 0 }}–{{ Math.min(page*perPage, filteredRows.length) }}
          de {{ filteredRows.length }}
        </span>
        <div class="pg-btns">
          <button class="pg-btn" :disabled="page===1" @click="page=1">
            <i class="ti ti-chevrons-left" style="font-size:12px"></i>
          </button>
          <button class="pg-btn" :disabled="page===1" @click="page--">
            <i class="ti ti-chevron-left" style="font-size:12px"></i>
          </button>
          <button
            v-for="p in visiblePages" :key="p"
            class="pg-btn" :class="{ active: p === page }"
            @click="page = p"
          >{{ p }}</button>
          <button class="pg-btn" :disabled="page>=totalPages" @click="page++">
            <i class="ti ti-chevron-right" style="font-size:12px"></i>
          </button>
          <button class="pg-btn" :disabled="page>=totalPages" @click="page=totalPages">
            <i class="ti ti-chevrons-right" style="font-size:12px"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL -->
    <Teleport to="body">
      <div v-if="modalOpen" class="modal-overlay" @click.self="cerrarModal">
        <div class="modal-box">

          <!-- Header -->
          <div class="modal-hdr">
            <div class="emp-av lg" :style="{ background: getAvatarBg(0), color: getAvatarColor(0) }">
              {{ getInitials(selected?.nombre) }}
            </div>
            <div>
              <p class="modal-title">{{ selected?.nombre }}</p>
              <p class="modal-sub">
                No. {{ String(selected?.id_empleado || '').padStart(6,'0') }} ·
                {{ selected?.valor }}
              </p>
            </div>
            <button class="modal-close" @click="cerrarModal"><i class="ti ti-x"></i></button>
          </div>

          <!-- Info incidencia -->
          <div class="modal-info">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">RFC</span>
                <span class="info-val mono">{{ selected?.rfc || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">CURP</span>
                <span class="info-val mono">{{ selected?.curp || '—' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Tipo</span>
                <span class="info-val"><span class="tipo-pill">{{ selected?.valor }}</span></span>
              </div>
              <div class="info-item">
                <span class="info-label">Periodo</span>
                <span class="info-val">{{ selected?.fecha_inicio }} → {{ selected?.fecha_final }}</span>
              </div>
              <div class="info-item full">
                <span class="info-label">Descripción</span>
                <span class="info-val">{{ selected?.descripcion || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Comprobante -->
          <div class="comprobante-section">
            <div class="comp-hdr">
              <i class="ti ti-paperclip" aria-hidden="true"></i>
              <span>Comprobante</span>
              <button
                v-if="selected?.comprobante_ruta && !mostrarComp"
                class="btn-sm" @click="mostrarComp = true"
              >
                <i class="ti ti-eye" aria-hidden="true"></i> Ver comprobante
              </button>
              <button v-if="mostrarComp" class="btn-sm" @click="mostrarComp = false">
                <i class="ti ti-eye-off" aria-hidden="true"></i> Ocultar
              </button>
            </div>

            <div v-if="!selected?.comprobante_ruta" class="comp-empty">
              <i class="ti ti-file-off" aria-hidden="true"></i>
              Sin comprobante adjunto
            </div>

            <div v-else-if="mostrarComp" class="comp-preview">
              <!-- Imagen -->
              <template v-if="isImage(selected.comprobante_ruta)">
                <img :src="getComprobanteUrl(selected.comprobante_ruta)" class="comp-img" />
                <button class="btn-sm mt-8" @click="abrirEnNuevaTab(selected.comprobante_ruta)">
                  <i class="ti ti-external-link" aria-hidden="true"></i> Abrir imagen
                </button>
              </template>
              <!-- PDF -->
              <template v-else-if="isPdf(selected.comprobante_ruta)">
                <iframe :src="getComprobanteUrl(selected.comprobante_ruta)" class="comp-iframe"></iframe>
                <button class="btn-sm mt-8" @click="abrirEnNuevaTab(selected.comprobante_ruta)">
                  <i class="ti ti-external-link" aria-hidden="true"></i> Abrir PDF
                </button>
              </template>
              <!-- Otro -->
              <template v-else>
                <div class="comp-other">
                  <i class="ti ti-file" aria-hidden="true"></i>
                  <span>{{ selected?.comprobante_nombre_original || 'Archivo adjunto' }}</span>
                  <button class="btn-sm" @click="abrirEnNuevaTab(selected.comprobante_ruta)">
                    <i class="ti ti-download" aria-hidden="true"></i> Descargar
                  </button>
                </div>
              </template>
            </div>
          </div>

          <!-- Comentario -->
          <div class="comentario-section">
            <label>Comentario <span style="color:var(--tx3);font-size:11px">(opcional)</span></label>
            <textarea v-model="comentario" rows="3" placeholder="Motivo / observación..."></textarea>
          </div>

          <!-- Alert resultado -->
          <div v-if="resultMsg" class="result-msg" :class="resultType">
            <i :class="['ti', resultType === 'ok' ? 'ti-circle-check' : 'ti-alert-circle']"></i>
            {{ resultMsg }}
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button class="btn-sm" :disabled="procesando !== ''" @click="cerrarModal">Cerrar</button>
            <template v-if="selected?.activo == 0">
              <button class="btn-danger" :disabled="procesando !== ''" @click="setDecision('rechazar')">
                <i class="ti ti-loader-2 spin" v-if="procesando === 'rechazar'"></i>
                <i class="ti ti-x" v-else></i> Rechazar
              </button>
              <button class="btn-success" :disabled="procesando !== ''" @click="setDecision('aprobar')">
                <i class="ti ti-loader-2 spin" v-if="procesando === 'aprobar'"></i>
                <i class="ti ti-check" v-else></i> Aprobar
              </button>
            </template>
            <span v-else class="estado-badge" :class="selected?.activo == 1 ? 'aprobada' : 'rechazada'">
              {{ selected?.activo == 1 ? '✓ Aprobada' : '✗ Rechazada' }}
            </span>
          </div>

        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUiStore } from '@/stores/ui.js'
import { incidenciasService } from '@/services/incidencias.service.js'

const ui = useUiStore()

const loading     = ref(true)
const rows        = ref([])
const searchQuery = ref('')
const page        = ref(1)
const perPage     = ref(25)
const modalOpen   = ref(false)
const selected    = ref(null)
const comentario  = ref('')
const mostrarComp = ref(false)
const procesando  = ref('')
const resultMsg   = ref('')
const resultType  = ref('ok')
const estadoFiltro = ref('pendiente')


const BASE_URL = 'http://localhost/SkyNet-SIA/public/'

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
    { label: 'Incidencias', to: '/incidencias' }
  ])
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    rows.value = await incidenciasService.getAll(estadoFiltro.value)
  } catch (err) {
    console.error(err)
    rows.value = []
  } finally {
    loading.value = false }
}

async function cambiarEstado(estado) {
  estadoFiltro.value = estado
  await loadData()
}

const filteredRows = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return rows.value
  return rows.value.filter(r =>
    [r.nombre, r.rfc, r.curp, r.valor, r.descripcion]
      .map(v => String(v ?? '').toLowerCase())
      .some(v => v.includes(q))
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / perPage.value)))

const visiblePages = computed(() => {
  const total = totalPages.value
  const cur   = page.value
  let start   = Math.max(1, cur - 2)
  let end     = Math.min(total, start + 4)
  start       = Math.max(1, end - 4)
  const pages = []
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

const paginatedRows = computed(() => {
  const start = (page.value - 1) * perPage.value
  return filteredRows.value.slice(start, start + perPage.value)
})

function abrirModal(r) {
  console.log('procesando antes:', JSON.stringify(procesando.value))
  selected.value    = r
  comentario.value  = ''
  mostrarComp.value = false
  resultMsg.value   = ''
  procesando.value  = ''
  console.log('procesando después:', JSON.stringify(procesando.value))
  modalOpen.value   = true
}

function cerrarModal() {
  modalOpen.value = false
  selected.value  = null
}

async function setDecision(tipo) {
  if (!selected.value) return
  procesando.value = tipo
  resultMsg.value  = ''
  try {
    const res = tipo === 'aprobar'
      ? await incidenciasService.aprobar(selected.value.id, comentario.value)
      : await incidenciasService.rechazar(selected.value.id, comentario.value)

    resultType.value = 'ok'
    resultMsg.value  = res?.message || res?.mensaje || `Incidencia ${tipo === 'aprobar' ? 'aprobada' : 'rechazada'} correctamente`
    await loadData()
    setTimeout(() => cerrarModal(), 1200)
  } catch (err) {
    resultType.value = 'err'
    resultMsg.value  = err.response?.data?.message || `Error al ${tipo} la incidencia`
  } finally {
    procesando.value = ''
  }
}

function getComprobanteUrl(ruta) {
  if (!ruta) return ''
  if (ruta.startsWith('http')) return ruta
  return BASE_URL + ruta.replace(/^\/+/, '')
}

function isImage(ruta = '') {
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(ruta.split('?')[0])
}

function isPdf(ruta = '') {
  return /\.pdf$/i.test(ruta.split('?')[0])
}

function abrirEnNuevaTab(ruta) {
  window.open(getComprobanteUrl(ruta), '_blank', 'noopener')
}

function getInitials(nombre) {
  if (!nombre) return 'US'
  return nombre.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase()
}
function getAvatarBg(i)    { return AVATAR_COLORS[i % AVATAR_COLORS.length].bg }
function getAvatarColor(i) { return AVATAR_COLORS[i % AVATAR_COLORS.length].color }
</script>

<style scoped>
.inc-view { display: flex; flex-direction: column; gap: 14px; }

.view-header {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
}
.view-title { font-size: 20px; font-weight: 600; color: var(--tx0); }
.view-sub   { font-size: 12px; color: var(--tx2); margin-top: 3px; }

/* Toolbar */
.toolbar {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-bottom: 0.5px solid var(--bdr); flex-wrap: wrap;
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
.toolbar-right { margin-left: auto; }
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
  padding: 8px 12px; text-align: left;
  font-size: 10px; font-weight: 500; color: var(--tx2);
  text-transform: uppercase; letter-spacing: .7px;
  border-bottom: 0.5px solid var(--bdr); white-space: nowrap;
}
td {
  padding: 9px 12px; color: var(--tx0); font-size: 12.5px;
  border-bottom: 0.5px solid var(--bdr);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
tbody tr:hover td { background: var(--bg2); }
tbody tr:last-child td { border-bottom: none; }
.mono  { font-family: monospace; }
.small { font-size: 11px; }
.emp-cell { display: flex; align-items: center; gap: 8px; }
.emp-av {
  width: 26px; height: 26px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 600; flex-shrink: 0;
}
.emp-av.lg { width: 38px; height: 38px; font-size: 14px; flex-shrink: 0; }
.emp-name {
  font-weight: 500; overflow: hidden;
  text-overflow: ellipsis; max-width: 140px;
}
.desc-cell { color: var(--tx2); font-size: 12px; }
.empty-row { text-align: center; color: var(--tx2); padding: 40px; font-size: 13px; }

.tipo-pill {
  display: inline-block; font-size: 11px; padding: 3px 8px;
  border-radius: 20px; background: var(--amb-dim); color: var(--amb); font-weight: 500;
}

/* Icon btn */
.icon-btn {
  width: 28px; height: 28px; border-radius: 6px;
  background: var(--bg2); border: 0.5px solid var(--bdr);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--tx2); font-size: 14px; transition: all .15s;
  margin: 0 auto;
}
.icon-btn.accent { color: var(--acc); }
.icon-btn:hover { background: var(--bg3); color: var(--tx0); }

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

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  z-index: 99998;
  display: flex; align-items: center; justify-content: center; padding: 16px;
  isolation: isolate;
}
.modal-box {
  background: var(--bg1); border: 0.5px solid var(--bdr2);
  border-radius: 16px; width: 100%; max-width: 560px;
  display: flex; flex-direction: column; overflow: hidden; max-height: 90vh;
  position: relative;
  z-index: 99999;
}
.modal-hdr {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 18px; border-bottom: 0.5px solid var(--bdr); flex-shrink: 0;
}
.modal-title { font-size: 14px; font-weight: 600; color: var(--tx0); }
.modal-sub   { font-size: 11px; color: var(--tx2); margin-top: 2px; }
.modal-close {
  margin-left: auto; width: 28px; height: 28px; border-radius: 6px;
  background: var(--bg3); border: none; cursor: pointer;
  color: var(--tx2); font-size: 16px;
  display: flex; align-items: center; justify-content: center;
}

/* Info grid */
.modal-info { padding: 14px 18px; border-bottom: 0.5px solid var(--bdr); flex-shrink: 0; }
.info-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
}
.info-item { display: flex; flex-direction: column; gap: 3px; }
.info-item.full { grid-column: 1 / -1; }
.info-label { font-size: 10px; color: var(--tx3); text-transform: uppercase; letter-spacing: .7px; }
.info-val { font-size: 13px; color: var(--tx0); }

/* Comprobante */
.comprobante-section {
  border-bottom: 0.5px solid var(--bdr); flex-shrink: 0;
}
.comp-hdr {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 18px; font-size: 13px; font-weight: 500; color: var(--tx1);
}
.comp-hdr i { font-size: 15px; color: var(--acc); }
.comp-hdr .btn-sm { margin-left: auto; }
.comp-empty {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 18px; font-size: 12px; color: var(--tx3);
}
.comp-empty i { font-size: 18px; }
.comp-preview { padding: 0 18px 14px; display: flex; flex-direction: column; gap: 8px; }
.comp-img {
  width: 100%; max-height: 300px; object-fit: contain;
  border-radius: 8px; border: 0.5px solid var(--bdr2);
}
.comp-iframe {
  width: 100%; height: 320px; border: 0.5px solid var(--bdr2);
  border-radius: 8px;
}
.comp-other {
  display: flex; align-items: center; gap: 10px;
  padding: 12px; background: var(--bg2); border-radius: 8px; font-size: 13px; color: var(--tx1);
}
.comp-other i { font-size: 20px; color: var(--acc); }
.mt-8 { margin-top: 8px; }

/* Comentario */
.comentario-section { padding: 12px 18px; border-bottom: 0.5px solid var(--bdr); flex-shrink: 0; }
.comentario-section label { font-size: 12px; font-weight: 500; color: var(--tx1); display: block; margin-bottom: 6px; }
textarea {
  width: 100%; background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 8px 12px; font-size: 13px; color: var(--tx0);
  outline: none; font-family: inherit; resize: vertical; min-height: 70px;
}
textarea:focus { border-color: var(--acc); }

/* Result */
.result-msg {
  display: flex; align-items: center; gap: 8px;
  margin: 0 18px; padding: 10px 14px; border-radius: 8px; font-size: 13px; flex-shrink: 0;
}
.result-msg.ok  { background: var(--grn-dim); color: var(--grn); border: 0.5px solid var(--grn); }
.result-msg.err { background: var(--red-dim); color: var(--red); border: 0.5px solid var(--red); }

/* Footer */
.modal-footer {
  padding: 14px 18px; border-top: 0.5px solid var(--bdr);
  display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0;
}
.btn-sm {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: transparent;
  font-size: 12px; color: var(--tx1); cursor: pointer;
  transition: all .15s; font-family: inherit;
}
.btn-sm:hover:not(:disabled) { background: var(--bg3); }
.btn-danger {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 8px; border: none;
  background: var(--red); font-size: 13px; color: #fff;
  cursor: pointer; font-family: inherit; font-weight: 500; transition: opacity .15s;
}
.btn-danger:hover:not(:disabled) { opacity: .85; }
.btn-success {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 8px; border: none;
  background: var(--grn); font-size: 13px; color: #fff;
  cursor: pointer; font-family: inherit; font-weight: 500; transition: opacity .15s;
}
.btn-success:hover:not(:disabled) { opacity: .85; }
.btn-danger:disabled, .btn-success:disabled, .btn-sm:disabled { opacity: .5; cursor: not-allowed; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin .8s linear infinite; }

@media (max-width: 768px) {
  .info-grid { grid-template-columns: 1fr; }
  .toolbar { flex-direction: column; align-items: stretch; }
}

.tabs-wrap { display: flex; gap: 4px; }
.tab-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: var(--bg2);
  font-size: 12px; color: var(--tx2); cursor: pointer;
  transition: all .15s; font-family: inherit;
}
.tab-btn:hover { background: var(--bg3); color: var(--tx0); }
.tab-btn.active { background: var(--acc-dim); color: var(--acc); border-color: var(--acc); }
</style>