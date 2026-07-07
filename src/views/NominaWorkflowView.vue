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

    <div v-else class="kanban">
      <!-- Columna 1: Cargar -->
      <div class="kanban-col" v-if="tieneAcceso('cargar_nomina')">
        <div class="kanban-col-hdr">
          <i class="ti ti-upload"></i>
          <span>Cargar</span>
        </div>
        <div class="kanban-col-body">
          <router-link :to="{ name: 'cargar-nomina' }" class="kanban-card kanban-card--accion">
            <i class="ti ti-file-plus"></i>
            <span>Cargar nueva plantilla</span>
          </router-link>
        </div>
      </div>

      <!-- Columna 2: Revisar / Aprobar (estatus = borrador) -->
      <div class="kanban-col" v-if="tieneAcceso('revisar_nomina')">
        <div class="kanban-col-hdr">
          <i class="ti ti-clipboard-check"></i>
          <span>Por revisar</span>
          <span class="kanban-count">{{ porRevisar.length }}</span>
        </div>
        <div class="kanban-col-body">
          <p v-if="porRevisar.length === 0" class="kanban-empty">No hay nóminas pendientes</p>
          <div v-for="n in porRevisar" :key="n.id" class="kanban-card" @click="idSeleccionado = n.id">
            <p class="kc-nombre">{{ n.nombre }}</p>
            <p class="kc-sub muted">{{ n.periodo_inicio }} → {{ n.periodo_fin }}</p>
            <p class="kc-total mono">{{ formatMoney(n.total_pagar) }}</p>
            <p class="kc-emp muted">{{ n.total_empleados }} empleados</p>
          </div>
        </div>
      </div>

      <!-- Columna 3: Dispersar (estatus = aprobada) -->
      <div class="kanban-col" v-if="tieneAcceso('dispersar_nomina')">
        <div class="kanban-col-hdr">
          <i class="ti ti-cash"></i>
          <span>Por dispersar</span>
          <span class="kanban-count">{{ porDispersar.length }}</span>
        </div>
        <div class="kanban-col-body">
          <p v-if="porDispersar.length === 0" class="kanban-empty">No hay nóminas aprobadas</p>
          <div v-for="n in porDispersar" :key="n.id" class="kanban-card kanban-card--aprobada" @click="idSeleccionado = n.id">
            <p class="kc-nombre">{{ n.nombre }}</p>
            <p class="kc-sub muted">{{ n.periodo_inicio }} → {{ n.periodo_fin }}</p>
            <p class="kc-total mono grn">{{ formatMoney(n.total_pagar) }}</p>
            <p class="kc-emp muted">{{ n.total_empleados }} empleados</p>
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
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api.js'
import NominaDetalleModal from '@/components/ui/NominaDetalleModal.vue'
import { useAuthStore } from '@/stores/auth.js'

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

.kanban { display:grid; grid-template-columns:repeat(3, 1fr); gap:14px; align-items:start; }
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

.kanban-card {
  background:var(--bg2); border:0.5px solid var(--bdr2); border-radius:10px;
  padding:12px; cursor:pointer; transition:all .15s; text-decoration:none; display:block;
}
.kanban-card:hover { border-color:var(--acc); background:var(--acc-dim); }
.kanban-card--aprobada { border-left:3px solid var(--grn); }
.kanban-card--accion {
  display:flex; align-items:center; justify-content:center; gap:8px;
  color:var(--acc); font-weight:500; font-size:13px; padding:20px;
  border:1.5px dashed var(--bdr2);
}
.kanban-card--accion:hover { border-color:var(--acc); background:var(--acc-dim); }
.kc-nombre { font-size:13px; font-weight:600; color:var(--tx0); margin-bottom:4px; }
.kc-sub { font-size:11px; margin-bottom:6px; }
.kc-total { font-size:14px; font-weight:600; }
.kc-emp { font-size:11px; margin-top:4px; }

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
</style>