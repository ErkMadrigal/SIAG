<template>
  <div class="workflow-view">
    <div class="view-header">
      <div>
        <h1 class="view-title">Flujo de nómina</h1>
        <p class="view-sub">Cargar → Revisar/Aprobar → Dispersar</p>
      </div>
    </div>

    <div v-if="cargando" class="loading-box">
      <i class="ti ti-loader-2 spin"></i> Cargando nóminas...
    </div>

    <div v-else class="kanban-wrap">
      <!-- Botón compacto de Cargar -->
      <router-link
        v-if="tieneAcceso('cargar_nomina')"
        :to="{ name: 'cargar-nomina' }"
        class="btn-cargar-compacto"
      >
        <div class="bcc-icon"><i class="ti ti-cloud-upload"></i></div>
        <div class="bcc-text">
          <p class="bcc-title">Cargar nueva plantilla</p>
          <p class="bcc-sub">Sube un .xlsm de Altas, Bajas y Asistencia</p>
        </div>
        <i class="ti ti-chevron-right bcc-arrow"></i>
      </router-link>

      <div class="kanban">
        <!-- Columna: Revisar / Aprobar (estatus = borrador) -->
        <div class="kanban-col" v-if="tieneAcceso('revisar_nomina')">
          <div class="kanban-col-hdr">
            <i class="ti ti-clipboard-check"></i>
            <span>Por revisar</span>
            <span class="kanban-count">{{ porRevisar.length }}</span>
          </div>
          <div class="kanban-col-body">
            <p v-if="porRevisar.length === 0" class="kanban-empty">No hay nóminas pendientes</p>
            <div v-for="n in porRevisar" :key="n.id" class="lote-card">
              <div class="lote-card-top" @click="idSeleccionado = n.id">
                <p class="lc-nombre">{{ n.nombre }}</p>
                <p class="lc-periodo">{{ n.periodo_inicio }} → {{ n.periodo_fin }}</p>
              </div>
              <div class="lote-card-cargas" v-if="n.cargas?.length">
                <span v-for="c in n.cargas" :key="c.id" class="lote-badge" :class="'lote-badge--'+c.estatus">
                  {{ c.nombre_carga }}
                  <i v-if="c.estatus === 'completa'" class="ti ti-check"></i>
                  <i v-else class="ti ti-loader-2 spin"></i>
                </span>
              </div>
              <div class="lote-card-bottom">
                <div>
                  <p class="lc-total">{{ formatMoney(n.total_pagar) }}</p>
                  <p class="lc-emp">{{ n.total_empleados }} empleados</p>
                </div>
                <div class="lote-card-actions">
                  <button class="lc-btn lc-btn--add" title="Agregar otra carga a este lote" @click.stop="irACargarEnLote(n.id)">
                    <i class="ti ti-plus"></i>
                  </button>
                  <button class="lc-btn lc-btn--ver" title="Revisar" @click.stop="idSeleccionado = n.id">
                    <i class="ti ti-eye"></i>
                  </button>
                  <button class="lc-btn lc-btn--rechazar" title="Rechazar lote" @click.stop="confirmarRechazo(n)">
                    <i class="ti ti-x"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Columna: Por dispersar (estatus = aprobada) -->
        <div class="kanban-col" v-if="tieneAcceso('dispersar_nomina')">
          <div class="kanban-col-hdr">
            <i class="ti ti-cash"></i>
            <span>Por dispersar</span>
            <span class="kanban-count">{{ porDispersar.length }}</span>
          </div>
          <div class="kanban-col-body">
            <p v-if="porDispersar.length === 0" class="kanban-empty">No hay nóminas aprobadas</p>
            <div v-for="n in porDispersar" :key="n.id" class="lote-card lote-card--aprobada" @click="idSeleccionado = n.id">
              <div class="lote-card-top">
                <p class="lc-nombre">{{ n.nombre }}</p>
                <p class="lc-periodo">{{ n.periodo_inicio }} → {{ n.periodo_fin }}</p>
              </div>
              <div class="lote-card-cargas" v-if="n.cargas?.length">
                <span v-for="c in n.cargas" :key="c.id" class="lote-badge lote-badge--completa">
                  {{ c.nombre_carga }} <i class="ti ti-check"></i>
                </span>
              </div>
              <div class="lote-card-bottom">
                <div>
                  <p class="lc-total lc-total--grn">{{ formatMoney(n.total_pagar) }}</p>
                  <p class="lc-emp">{{ n.total_empleados }} empleados</p>
                </div>
                <button class="lc-btn lc-btn--ver"><i class="ti ti-eye"></i></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sin ningún acceso -->
      <p v-if="!tieneAcceso('cargar_nomina') && !tieneAcceso('revisar_nomina') && !tieneAcceso('dispersar_nomina')" class="kanban-empty">
        No tienes acceso a ninguna etapa del flujo de nómina.
      </p>
    </div>

    <!-- Tabla de ya dispersadas, aparte, siempre visible abajo -->
    <div class="sec-dispersadas" v-if="tieneAcceso('revisar_nomina') || tieneAcceso('dispersar_nomina')">
      <div class="sec-dispersadas-hdr" @click="mostrarDispersadas = !mostrarDispersadas">
        <i class="ti ti-check" style="color:var(--grn)"></i>
        <span>Nóminas ya dispersadas</span>
        <span class="kanban-count">{{ dispersadas.length }}</span>
        <i :class="['ti', mostrarDispersadas ? 'ti-chevron-up' : 'ti-chevron-down']" style="margin-left:auto"></i>
      </div>

      <table v-if="mostrarDispersadas" class="tabla-dispersadas">
        <thead>
          <tr>
            <th class="text-left">Nombre</th>
            <th class="text-left">Periodo</th>
            <th>Empleados</th>
            <th>Total dispersado</th>
            <th>Fecha dispersión</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="dispersadas.length === 0">
            <td colspan="6" class="sin-resultados">Aún no hay nóminas dispersadas</td>
          </tr>
          <tr v-for="n in dispersadas" :key="n.id">
            <td class="col-nombre">{{ n.nombre }}</td>
            <td class="muted">{{ n.periodo_inicio }} → {{ n.periodo_fin }}</td>
            <td class="center mono">{{ n.total_empleados }}</td>
            <td class="mono grn">{{ formatMoney(n.total_pagar) }}</td>
            <td class="center muted">{{ formatFecha(n.dispersado_at) }}</td>
            <td class="center">
              <button class="btn-sm" @click="idSeleccionado = n.id">
                <i class="ti ti-eye"></i> Ver
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <NominaDetalleModal
      v-if="idSeleccionado"
      :id-nomina="idSeleccionado"
      @cerrar="idSeleccionado = null"
      @actualizado="cargarNominas"
    />
  </div>

  <Teleport to="body">
    <div v-if="loteARechazar" class="modal-overlay" @click.self="loteARechazar = null">
      <div class="confirm-modal confirm-modal--danger">
        <div class="cm-icon"><i class="ti ti-alert-triangle"></i></div>
        <p class="cm-title">Rechazar nómina</p>
        <p class="cm-sub">
          <strong>{{ loteARechazar.nombre }}</strong> quedará marcada como rechazada.
          Esta acción no se puede deshacer.
        </p>
        <textarea
          v-model="motivoRechazo"
          placeholder="Motivo del rechazo (opcional)..."
          class="cm-textarea"
          rows="3"
        ></textarea>
        <div class="cm-actions">
          <button class="cm-btn cm-btn--ghost" @click="loteARechazar = null" :disabled="rechazando">Cancelar</button>
          <button class="cm-btn cm-btn--danger" @click="ejecutarRechazo" :disabled="rechazando">
            {{ rechazando ? 'Rechazando...' : 'Sí, rechazar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api.js'
import NominaDetalleModal from '@/components/ui/NominaDetalleModal.vue'
import { useAuthStore } from '@/stores/auth.js'
import { useRouter } from 'vue-router'
const router = useRouter()

const auth = useAuthStore()

function tieneAcceso(vista) {
  if (auth.user?.rol === 'superadmin') return true
  return auth.userVistas?.includes(vista) ?? false
}

const nominas          = ref([])
const cargando         = ref(false)
const idSeleccionado   = ref(null)
const mostrarDispersadas = ref(false)

const porRevisar   = computed(() => nominas.value.filter(n => n.estatus === 'borrador'))
const porDispersar = computed(() => nominas.value.filter(n => n.estatus === 'aprobada'))
const dispersadas  = computed(() => nominas.value.filter(n => n.estatus === 'dispersada'))

const loteARechazar = ref(null)
const motivoRechazo  = ref('')
const rechazando     = ref(false)

function irACargarEnLote(idNomina) {
  router.push({ name: 'cargar-nomina', query: { id_nomina: idNomina } })
}

function confirmarRechazo(nomina) {
  loteARechazar.value = nomina
  motivoRechazo.value = ''
}

async function ejecutarRechazo() {
  if (!loteARechazar.value) return
  rechazando.value = true
  try {
    await api.post(`/nomina-fatiga/${loteARechazar.value.id}/rechazar`, { comentario: motivoRechazo.value })
    loteARechazar.value = null
    await cargarNominas()
  } catch (err) {
    console.error('Error rechazando:', err)
  } finally {
    rechazando.value = false
  }
}

async function cargarNominas() {
  cargando.value = true
  try {
    const { data } = await api.get('/nomina-fatiga')
    nominas.value = data.data || []
  } catch (err) {
    console.error('Error cargando nóminas:', err)
  } finally {
    cargando.value = false
  }
}

function formatMoney(v) {
  return Number(v || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}
function formatFecha(v) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

onMounted(cargarNominas)
</script>

<style scoped>
.workflow-view { display:flex; flex-direction:column; gap:18px; }
.view-header { display:flex; align-items:center; justify-content:space-between; }
.view-title { font-size:20px; font-weight:600; color:var(--tx0); }
.view-sub { font-size:12px; color:var(--tx2); margin-top:3px; }

.loading-box { display:flex; align-items:center; gap:8px; padding:40px; justify-content:center; color:var(--tx2); }

.kanban-wrap { display:flex; flex-direction:column; gap:14px; }

.btn-cargar-compacto {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-radius: 12px;
  border: 1.5px dashed var(--bdr2); background: var(--bg1);
  text-decoration: none; transition: all .18s;
}
.btn-cargar-compacto:hover {
  border-color: var(--acc); background: var(--acc-dim);
}
.bcc-icon {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  background: var(--acc-dim); color: var(--acc);
  display: flex; align-items: center; justify-content: center; font-size: 18px;
  transition: all .18s;
}
.btn-cargar-compacto:hover .bcc-icon { background: var(--acc); color: #fff; }
.bcc-text { flex: 1; }
.bcc-title { font-size: 13px; font-weight: 600; color: var(--tx0); }
.bcc-sub { font-size: 11px; color: var(--tx2); margin-top: 2px; }
.bcc-arrow { color: var(--tx2); font-size: 16px; transition: transform .18s; }
.btn-cargar-compacto:hover .bcc-arrow { transform: translateX(3px); color: var(--acc); }

.kanban { display:grid; grid-template-columns:1fr 1fr; gap:14px; align-items:start; }
.kanban-col {
  background:var(--bg1); border:0.5px solid var(--bdr); border-radius:12px;
  display:flex; flex-direction:column; min-height:200px;
}
.kanban-col-hdr {
  display:flex; align-items:center; gap:8px; padding:12px 14px;
  border-bottom:0.5px solid var(--bdr); font-size:13px; font-weight:600; color:var(--tx0);
}
.kanban-col-hdr i { color:var(--acc); font-size:16px; }
.kanban-count {
  margin-left:auto; background:var(--bg3); color:var(--tx2);
  font-size:11px; font-weight:600; padding:2px 8px; border-radius:20px;
}
.kanban-col-body { padding:12px; display:flex; flex-direction:column; gap:10px; }
.kanban-empty { text-align:center; color:var(--tx2); font-size:12px; padding:16px 0; }

.sec-dispersadas { background:var(--bg1); border:0.5px solid var(--bdr); border-radius:12px; overflow:hidden; }
.sec-dispersadas-hdr {
  display:flex; align-items:center; gap:8px; padding:14px 16px; cursor:pointer;
  font-size:13px; font-weight:600; color:var(--tx0);
}
.tabla-dispersadas { width:100%; border-collapse:collapse; }
.tabla-dispersadas th {
  background:var(--bg2); color:var(--tx2); font-size:11px; text-transform:uppercase;
  padding:8px 14px; text-align:center; border-top:0.5px solid var(--bdr); border-bottom:0.5px solid var(--bdr);
}
.tabla-dispersadas td { padding:9px 14px; border-bottom:0.5px solid var(--bdr); text-align:center; font-size:13px; color:var(--tx0); }
.text-left, .col-nombre { text-align:left !important; }
.center { text-align:center !important; }
.mono { font-family:monospace; }
.grn { color:var(--grn); }
.muted { opacity:.6; font-size:12px; }
.sin-resultados { text-align:center; padding:20px; color:var(--tx2); }

.btn-sm {
  display:inline-flex; align-items:center; gap:5px; padding:6px 12px; border-radius:8px;
  border:0.5px solid var(--bdr2); background:transparent; font-size:12px; color:var(--tx1);
  cursor:pointer; font-family:inherit; transition:all .15s;
}
.btn-sm:hover { background:var(--bg3); }

@keyframes spin { to { transform:rotate(360deg); } }
.spin { display:inline-block; animation:spin .8s linear infinite; }

@media (max-width:900px) {
  .kanban { grid-template-columns:1fr; }
}

.lote-card {
  background:linear-gradient(180deg, var(--bg2), var(--bg1));
  border:0.5px solid var(--bdr2); border-radius:12px;
  overflow:hidden; cursor:pointer; transition:all .18s;
}
.lote-card:hover { border-color:var(--acc); box-shadow:0 4px 16px rgba(0,0,0,.25); transform:translateY(-1px); }
.lote-card--aprobada { border-left:3px solid var(--grn); }

.lote-card-top { padding:14px 14px 6px; }
.lc-nombre { font-size:13.5px; font-weight:600; color:var(--tx0); }
.lc-periodo { font-size:11px; color:var(--tx2); margin-top:3px; }

.lote-card-cargas {
  display:flex; flex-wrap:wrap; gap:5px; padding:0 14px 10px;
}
.lote-badge {
  display:inline-flex; align-items:center; gap:4px;
  font-size:10px; padding:3px 8px; border-radius:20px;
  background:var(--bg3); color:var(--tx2); border:0.5px solid var(--bdr2);
}
.lote-badge--completa { background:rgba(34,201,122,.1); color:var(--grn); border-color:var(--grn); }
.lote-badge--procesando { background:var(--acc-dim); color:var(--acc); border-color:var(--acc); }
.lote-badge i { font-size:10px; }

.lote-card-bottom {
  display:flex; align-items:flex-end; justify-content:space-between;
  padding:10px 14px 14px; border-top:0.5px solid var(--bdr);
  background:rgba(0,0,0,.15);
}
.lc-total { font-size:15px; font-weight:700; color:var(--tx0); font-family:monospace; }
.lc-total--grn { color:var(--grn); }
.lc-emp { font-size:10.5px; color:var(--tx2); margin-top:2px; }

.lote-card-actions { display:flex; gap:5px; }
.lc-btn {
  width:28px; height:28px; border-radius:7px; border:0.5px solid var(--bdr2);
  background:var(--bg2); color:var(--tx2); cursor:pointer;
  display:flex; align-items:center; justify-content:center; font-size:13px;
  transition:all .15s;
}
.lc-btn--add:hover { background:var(--acc-dim); color:var(--acc); border-color:var(--acc); }
.lc-btn--ver:hover { background:var(--bg3); color:var(--tx0); }
.lc-btn--rechazar:hover { background:var(--red-dim); color:var(--red); border-color:var(--red); }
</style>