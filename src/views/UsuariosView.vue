<template>
  <div class="audit-view">

    <!-- Header -->
    <div class="view-header">
      <div>
        <h1 class="view-title">Actividad del sistema</h1>
        <p class="view-sub">Registro de cada acción realizada por los usuarios</p>
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
          <input v-model="filtros.search" placeholder="Buscar usuario, acción, entidad, IP..." @keydown.enter="aplicar" />
          <button v-if="filtros.search" class="clear-btn" @click="filtros.search=''; aplicar()">
            <i class="ti ti-x"></i>
          </button>
        </div>

        <select class="sel" v-model="filtros.action" @change="aplicar">
          <option value="">Todas las acciones</option>
          <option v-for="a in acciones" :key="a" :value="a">{{ a }}</option>
        </select>

        <select class="sel" v-model="filtros.entity" @change="aplicar">
          <option value="">Todos los módulos</option>
          <option v-for="e in entidades" :key="e" :value="e">{{ e }}</option>
        </select>

        <div class="field-inline">
          <label>Desde</label>
          <input type="date" v-model="filtros.date_from" @change="aplicar" />
        </div>

        <div class="field-inline">
          <label>Hasta</label>
          <input type="date" v-model="filtros.date_to" @change="aplicar" />
        </div>

        <select class="sel" v-model="filtros.limit" @change="aplicar">
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>

        <button class="btn-sm" @click="resetFiltros">
          <i class="ti ti-eraser" aria-hidden="true"></i> Limpiar
        </button>
      </div>
    </div>

    <!-- Tabla -->
    <div class="sec">

      <div v-if="loading" class="skeleton-wrap">
        <div class="skeleton-row" v-for="i in 8" :key="i"></div>
      </div>

      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:150px">Fecha</th>
              <th style="width:160px">Usuario</th>
              <th style="width:130px">Acción</th>
              <th style="width:110px">Módulo</th>
              <th style="width:80px">Entidad ID</th>
              <th>Mensaje</th>
              <th style="width:110px">IP</th>
              <th style="width:70px;text-align:center">Detalle</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in rows" :key="r.id" @click="abrirDetalle(r)" style="cursor:pointer">
              <td class="fecha-cell">
                <div>{{ formatFecha(r.created_at) }}</div>
                <div class="hora">{{ formatHora(r.created_at) }}</div>
              </td>
              <td>
                <div class="emp-cell">
                  <div class="emp-av" :style="{ background: getAvatarBg(r.actor_user_id), color: getAvatarColor(r.actor_user_id) }">
                    {{ getInitials(r.actor_name) }}
                  </div>
                  <div>
                    <div class="emp-name">{{ r.actor_name || 'Sistema' }}</div>
                    <div class="emp-id">ID {{ r.actor_user_id }}</div>
                  </div>
                </div>
              </td>
              <td><span class="action-badge" :class="getActionClass(r.action)">{{ r.action }}</span></td>
              <td><span class="entity-badge">{{ r.entity }}</span></td>
              <td class="mono" style="color:var(--tx2)">{{ r.entity_id || '—' }}</td>
              <td class="msg-cell" :title="r.message">{{ r.message || '—' }}</td>
              <td class="mono" style="color:var(--tx2);font-size:11px">{{ r.ip || '—' }}</td>
              <td @click.stop style="text-align:center">
                <button class="icon-btn" @click="abrirDetalle(r)" title="Ver detalle">
                  <i class="ti ti-eye"></i>
                </button>
              </td>
            </tr>
            <tr v-if="!rows.length && !loading">
              <td colspan="8" class="empty-row">
                <i class="ti ti-activity" style="font-size:28px;display:block;margin-bottom:8px;opacity:.3"></i>
                No hay registros de actividad
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div class="pagination-bar">
        <span class="pg-info">
          Mostrando {{ meta.total === 0 ? 0 : (page-1)*filtros.limit+1 }}–{{ Math.min(page*filtros.limit, meta.total) }}
          de {{ meta.total.toLocaleString() }} registros
        </span>
        <div class="pg-btns">
          <button class="pg-btn" :disabled="page===1" @click="goPage(1)">
            <i class="ti ti-chevrons-left" style="font-size:12px"></i>
          </button>
          <button class="pg-btn" :disabled="page===1" @click="goPage(page-1)">
            <i class="ti ti-chevron-left" style="font-size:12px"></i>
          </button>
          <button v-for="p in visiblePages" :key="p" class="pg-btn"
            :class="{ active: p === page }" @click="goPage(p)">{{ p }}</button>
          <button class="pg-btn" :disabled="page>=meta.totalPages" @click="goPage(page+1)">
            <i class="ti ti-chevron-right" style="font-size:12px"></i>
          </button>
          <button class="pg-btn" :disabled="page>=meta.totalPages" @click="goPage(meta.totalPages)">
            <i class="ti ti-chevrons-right" style="font-size:12px"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Modal detalle -->
    <Teleport to="body">
      <div v-if="modalOpen" class="modal-overlay" @click.self="modalOpen = false">
        <div class="modal-box">
          <div class="modal-hdr">
            <div class="modal-icon" :class="getActionClass(selected?.action)">
              <i class="ti ti-activity" aria-hidden="true"></i>
            </div>
            <div>
              <p class="modal-title">{{ selected?.action }}</p>
              <p class="modal-sub">{{ selected?.created_at }} · {{ selected?.actor_name }}</p>
            </div>
            <button class="modal-close" @click="modalOpen = false"><i class="ti ti-x"></i></button>
          </div>

          <div class="modal-body-scroll">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">Usuario</span>
                <span class="detail-val">{{ selected?.actor_name }} (ID: {{ selected?.actor_user_id }})</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Acción</span>
                <span class="detail-val"><span class="action-badge" :class="getActionClass(selected?.action)">{{ selected?.action }}</span></span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Módulo</span>
                <span class="detail-val"><span class="entity-badge">{{ selected?.entity }}</span></span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Entidad ID</span>
                <span class="detail-val mono">{{ selected?.entity_id || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">IP</span>
                <span class="detail-val mono">{{ selected?.ip || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Endpoint</span>
                <span class="detail-val mono" style="font-size:11px">{{ selected?.endpoint || '—' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Método HTTP</span>
                <span class="detail-val"><span class="method-badge" :class="selected?.method?.toLowerCase()">{{ selected?.method }}</span></span>
              </div>
              <div class="detail-item full">
                <span class="detail-label">Mensaje</span>
                <span class="detail-val">{{ selected?.message || '—' }}</span>
              </div>
            </div>

            <!-- Cambios -->
            <template v-if="selected?.changes && Object.keys(selected.changes).length">
              <div class="changes-title">
                <i class="ti ti-git-diff" aria-hidden="true"></i>
                Cambios registrados
              </div>
              <div class="changes-table">
                <div class="changes-hdr">
                  <span>Campo</span>
                  <span>Antes</span>
                  <span>Después</span>
                </div>
                <div class="changes-row" v-for="(val, campo) in selected.changes" :key="campo">
                  <span class="mono" style="font-weight:500">{{ campo }}</span>
                  <span class="mono before">{{ val.antes ?? '—' }}</span>
                  <span class="mono after">{{ val.despues ?? '—' }}</span>
                </div>
              </div>
            </template>
          </div>

          <div class="modal-footer">
            <button class="btn-sm" @click="modalOpen = false">Cerrar</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useUiStore } from '@/stores/ui.js'
import { auditService } from '@/services/audit.service.js'

const ui = useUiStore()

const loading  = ref(true)
const rows     = ref([])
const acciones = ref([])
const entidades = ref([])
const page     = ref(1)
const meta     = reactive({ total: 0, totalPages: 1 })
const modalOpen = ref(false)
const selected  = ref(null)

const filtros = reactive({
  search:    '',
  action:    '',
  entity:    '',
  date_from: '',
  date_to:   '',
  limit:     25,
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
    { label: 'Actividad', to: '/usuarios' }
  ])
  fetchData()
})

async function fetchData() {
  loading.value = true
  try {
    const res = await auditService.getAll({
      search:    filtros.search,
      action:    filtros.action,
      entity:    filtros.entity,
      date_from: filtros.date_from,
      date_to:   filtros.date_to,
      limit:     filtros.limit,
      page:      page.value,
    })

    rows.value          = res.data  || []
    meta.total          = res.meta?.total      || 0
    meta.totalPages     = res.meta?.totalPages || 1
    acciones.value      = res.meta?.filters?.acciones  || acciones.value
    entidades.value     = res.meta?.filters?.entidades || entidades.value

  } catch (err) {
    console.error(err)
    rows.value = []
  } finally {
    loading.value = false
  }
}

function aplicar() { page.value = 1; fetchData() }

function resetFiltros() {
  filtros.search    = ''
  filtros.action    = ''
  filtros.entity    = ''
  filtros.date_from = ''
  filtros.date_to   = ''
  filtros.limit     = 25
  page.value        = 1
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

function abrirDetalle(r) {
  selected.value  = r
  modalOpen.value = true
}

function getActionClass(action = '') {
  const a = action.toLowerCase()
  if (a.includes('login'))   return 'login'
  if (a.includes('logout'))  return 'logout'
  if (a.includes('crear') || a.includes('create') || a.includes('alta')) return 'create'
  if (a.includes('editar') || a.includes('update') || a.includes('actualizar')) return 'update'
  if (a.includes('baja')  || a.includes('delete') || a.includes('eliminar')) return 'delete'
  return 'other'
}

function formatFecha(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatHora(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function getInitials(nombre) {
  if (!nombre) return 'SY'
  return nombre.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase()
}
function getAvatarBg(id)    { return AVATAR_COLORS[Number(id) % AVATAR_COLORS.length].bg }
function getAvatarColor(id) { return AVATAR_COLORS[Number(id) % AVATAR_COLORS.length].color }
</script>

<style scoped>
.audit-view { display: flex; flex-direction: column; gap: 14px; }
.view-header {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
}
.view-title { font-size: 20px; font-weight: 600; color: var(--tx0); }
.view-sub   { font-size: 12px; color: var(--tx2); margin-top: 3px; }

/* Filtros */
.filtros-grid {
  display: flex; align-items: flex-end; gap: 8px;
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
.sel {
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 6px 8px;
  font-size: 12px; color: var(--tx1); outline: none; font-family: inherit;
}
.field-inline { display: flex; flex-direction: column; gap: 3px; }
.field-inline label { font-size: 10px; color: var(--tx2); font-weight: 500; }
.field-inline input {
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 6px 8px;
  font-size: 12px; color: var(--tx0); outline: none; font-family: inherit;
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
  padding: 9px 12px; color: var(--tx0); font-size: 12px;
  border-bottom: 0.5px solid var(--bdr);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
tbody tr { transition: background .12s; }
tbody tr:hover td { background: var(--bg2); }
tbody tr:last-child td { border-bottom: none; }
.mono { font-family: monospace; }
.fecha-cell .hora { font-size: 10px; color: var(--tx2); margin-top: 2px; }
.emp-cell  { display: flex; align-items: center; gap: 7px; }
.emp-av {
  width: 26px; height: 26px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 600; flex-shrink: 0;
}
.emp-name { font-weight: 500; font-size: 12px; }
.emp-id   { font-size: 10px; color: var(--tx2); }
.msg-cell { color: var(--tx1); max-width: 200px; }
.empty-row { text-align: center; color: var(--tx2); padding: 40px; font-size: 13px; }

/* Action badges */
.action-badge {
  display: inline-block; font-size: 10px; padding: 2px 7px;
  border-radius: 4px; font-weight: 600; letter-spacing: .3px;
  text-transform: uppercase; font-family: monospace;
}
.action-badge.login   { background: var(--acc-dim);  color: var(--acc);  }
.action-badge.logout  { background: var(--bg3);       color: var(--tx2);  }
.action-badge.create  { background: var(--grn-dim);   color: var(--grn);  }
.action-badge.update  { background: var(--amb-dim);   color: var(--amb);  }
.action-badge.delete  { background: var(--red-dim);   color: var(--red);  }
.action-badge.other   { background: var(--bg3);       color: var(--tx1);  }

.entity-badge {
  display: inline-block; font-size: 10px; padding: 2px 7px;
  border-radius: 20px; background: var(--bg3); color: var(--tx1); font-weight: 500;
}

.method-badge {
  display: inline-block; font-size: 10px; padding: 2px 7px;
  border-radius: 4px; font-weight: 600; font-family: monospace;
  text-transform: uppercase;
}
.method-badge.get    { background: var(--acc-dim); color: var(--acc); }
.method-badge.post   { background: var(--grn-dim); color: var(--grn); }
.method-badge.put    { background: var(--amb-dim); color: var(--amb); }
.method-badge.patch  { background: var(--amb-dim); color: var(--amb); }
.method-badge.delete { background: var(--red-dim); color: var(--red); }

/* Icon btn */
.icon-btn {
  width: 26px; height: 26px; border-radius: 6px;
  background: var(--bg2); border: 0.5px solid var(--bdr);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--tx2); font-size: 13px; transition: all .15s; margin: 0 auto;
}
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
  height: 48px; background: var(--bg2); border-radius: 8px;
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px;
}
.modal-box {
  background: var(--bg1); border: 0.5px solid var(--bdr2);
  border-radius: 16px; width: 100%; max-width: 600px;
  display: flex; flex-direction: column; overflow: hidden; max-height: 90vh;
}
.modal-hdr {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 18px; border-bottom: 0.5px solid var(--bdr); flex-shrink: 0;
}
.modal-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;
}
.modal-icon.login   { background: var(--acc-dim); color: var(--acc); }
.modal-icon.logout  { background: var(--bg3);      color: var(--tx2); }
.modal-icon.create  { background: var(--grn-dim);  color: var(--grn); }
.modal-icon.update  { background: var(--amb-dim);  color: var(--amb); }
.modal-icon.delete  { background: var(--red-dim);  color: var(--red); }
.modal-icon.other   { background: var(--bg3);      color: var(--tx1); }
.modal-title { font-size: 14px; font-weight: 600; color: var(--tx0); font-family: monospace; }
.modal-sub   { font-size: 11px; color: var(--tx2); margin-top: 2px; }
.modal-close {
  margin-left: auto; width: 28px; height: 28px; border-radius: 6px;
  background: var(--bg3); border: none; cursor: pointer;
  color: var(--tx2); font-size: 16px;
  display: flex; align-items: center; justify-content: center;
}
.modal-body-scroll { flex: 1; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 14px; }
.modal-footer {
  padding: 12px 18px; border-top: 0.5px solid var(--bdr);
  display: flex; justify-content: flex-end; flex-shrink: 0;
}

/* Detail grid */
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-item.full { grid-column: 1 / -1; }
.detail-label { font-size: 10px; color: var(--tx3); text-transform: uppercase; letter-spacing: .7px; }
.detail-val   { font-size: 13px; color: var(--tx0); }

/* Cambios */
.changes-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; font-weight: 500; color: var(--tx1);
  border-top: 0.5px solid var(--bdr); padding-top: 12px;
}
.changes-title i { font-size: 15px; color: var(--acc); }
.changes-table { display: flex; flex-direction: column; gap: 0; border: 0.5px solid var(--bdr2); border-radius: 8px; overflow: hidden; }
.changes-hdr {
  display: grid; grid-template-columns: 1fr 1fr 1fr;
  padding: 6px 10px; background: var(--bg2);
  font-size: 10px; color: var(--tx2); font-weight: 500; text-transform: uppercase; letter-spacing: .7px;
}
.changes-row {
  display: grid; grid-template-columns: 1fr 1fr 1fr;
  padding: 8px 10px; border-top: 0.5px solid var(--bdr); font-size: 12px;
}
.changes-row:hover { background: var(--bg2); }
.before { color: var(--red); }
.after  { color: var(--grn); }

/* Botones */
.btn-sm {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: transparent;
  font-size: 12px; color: var(--tx1); cursor: pointer; transition: all .15s; font-family: inherit;
}
.btn-sm:hover { background: var(--bg3); color: var(--tx0); }

@media (max-width: 768px) {
  .filtros-grid { flex-direction: column; align-items: stretch; }
  .detail-grid  { grid-template-columns: 1fr; }
  .changes-hdr, .changes-row { grid-template-columns: 1fr; }
}
</style>