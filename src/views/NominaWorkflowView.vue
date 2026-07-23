<!--
  NominaFatigaWorkflowView.vue

  Tu vista de "Flujo de nómina" (Cargar → Revisar/Aprobar → Dispersar),
  con selección masiva agregada en la columna "Por revisar": antes había
  que aprobar/rechazar una por una con los botones de cada tarjeta -- con
  un chingo de nóminas por cancelar eso es una tortura. Ahora cada
  tarjeta trae un checkbox, aparece una barra de acciones masivas cuando
  hay algo seleccionado, y un solo modal de confirmación dispara
  Aprobar/Cancelar sobre todas las seleccionadas (reutiliza los mismos
  endpoints /aprobar y /rechazar que ya usabas uno por uno, nada más en
  loop -- ver ejecutarMasivo()).

  OJO: para "Aprobar" asumí que el endpoint es
  POST /nomina-fatiga/{id}/aprobar (mismo patrón que tu /rechazar, que sí
  confirmé porque ya lo tenías funcionando). Si tu endpoint real de
  aprobar se llama distinto, dime y cambio esa sola línea.
-->
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
            <label v-if="porRevisar.length" class="kanban-select-all">
              <input type="checkbox" :checked="todosSeleccionados" @change="toggleSeleccionarTodos" />
              Todos
            </label>
          </div>

          <!-- Barra de acciones masivas -- solo aparece con algo seleccionado -->
          <div v-if="hayAlgunaSeleccionada" class="kanban-bulk-bar">
            <span class="kbb-count">{{ seleccionados.size }} seleccionada{{ seleccionados.size === 1 ? '' : 's' }}</span>
            <div class="kanban-bulk-actions">
              <button class="btn-sm btn-sm--grn" @click="abrirMasivo('aprobar')">
                <i class="ti ti-check" aria-hidden="true"></i> Aprobar
              </button>
              <button class="btn-sm btn-sm--red" @click="abrirMasivo('rechazar')">
                <i class="ti ti-x" aria-hidden="true"></i> Cancelar
              </button>
              <button class="btn-sm" @click="limpiarSeleccion">Deseleccionar</button>
            </div>
          </div>

          <div class="kanban-col-body">
            <p v-if="porRevisar.length === 0" class="kanban-empty">No hay nóminas pendientes</p>
            <div
              v-for="n in porRevisar"
              :key="n.id"
              class="lote-card"
              :class="{ 'lote-card--seleccionada': seleccionados.has(n.id) }"
            >
              <div class="lote-card-top">
                <label class="lote-checkbox" @click.stop title="Seleccionar para acción masiva">
                  <input type="checkbox" :checked="seleccionados.has(n.id)" @change="toggleSeleccion(n.id)" />
                </label>
                <div class="lote-card-toptext" @click="idSeleccionado = n.id">
                  <p class="lc-nombre">{{ n.nombre }}</p>
                  <p class="lc-periodo">{{ n.periodo_inicio }} → {{ n.periodo_fin }}</p>
                </div>
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

  <!-- Modal de rechazo individual (como ya lo tenías) -->
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

  <!-- Modal de acción masiva -- Aprobar/Cancelar sobre todas las
       seleccionadas de "Por revisar". Reutiliza los mismos endpoints
       individuales en loop (ver ejecutarMasivo) y muestra progreso. -->
  <Teleport to="body">
    <div v-if="accionMasiva" class="modal-overlay" @click.self="!procesandoMasivo && cerrarModalMasivo()">
      <div class="confirm-modal" :class="{ 'confirm-modal--danger': accionMasiva === 'rechazar' }">
        <div class="cm-icon" :class="{ 'cm-icon--ok': accionMasiva === 'aprobar' }">
          <i :class="accionMasiva === 'aprobar' ? 'ti ti-circle-check' : 'ti ti-alert-triangle'"></i>
        </div>
        <p class="cm-title">
          {{ accionMasiva === 'aprobar' ? 'Aprobar nóminas seleccionadas' : 'Rechazar nóminas seleccionadas' }}
        </p>
        <p class="cm-sub">
          Vas a {{ accionMasiva === 'aprobar' ? 'aprobar' : 'rechazar' }}
          <strong>{{ seleccionados.size }}</strong> nómina{{ seleccionados.size === 1 ? '' : 's' }}.
          Esta acción no se puede deshacer.
        </p>

        <textarea
          v-if="accionMasiva === 'rechazar'"
          v-model="motivoRechazoMasivo"
          placeholder="Motivo del rechazo (opcional, aplica a todas)..."
          class="cm-textarea"
          rows="3"
          :disabled="procesandoMasivo"
        ></textarea>

        <div v-if="procesandoMasivo" class="masivo-progreso">
          <div class="chunk-bar-wrap">
            <div class="chunk-bar"><div class="chunk-fill" :style="{ width: pctMasivo + '%' }"></div></div>
            <span class="chunk-pct">{{ progresoMasivo.hecho }}/{{ progresoMasivo.total }}</span>
          </div>
        </div>

        <div v-if="!procesandoMasivo && erroresMasivo.length" class="alert-warn" style="text-align:left">
          <i class="ti ti-alert-circle"></i>
          No se pudo con: {{ erroresMasivo.join(', ') }}
        </div>

        <div class="cm-actions">
          <button class="cm-btn cm-btn--ghost" @click="cerrarModalMasivo" :disabled="procesandoMasivo">
            {{ erroresMasivo.length ? 'Cerrar' : 'Cancelar' }}
          </button>
          <button
            class="cm-btn"
            :class="accionMasiva === 'rechazar' ? 'cm-btn--danger' : 'cm-btn--ok'"
            @click="ejecutarMasivo"
            :disabled="procesandoMasivo"
          >
            {{ procesandoMasivo ? 'Procesando...' : (erroresMasivo.length ? 'Reintentar' : ('Sí, ' + (accionMasiva === 'aprobar' ? 'aprobar' : 'rechazar'))) }}
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

/* ── Selección masiva -- "Por revisar" ───────────────────────────
   Antes había que aprobar/rechazar una por una. Con esto se marcan
   varias con checkbox y se disparan en lote. */
const seleccionados = ref(new Set())
const hayAlgunaSeleccionada = computed(() => seleccionados.value.size > 0)
const todosSeleccionados = computed(() =>
  porRevisar.value.length > 0 && porRevisar.value.every(n => seleccionados.value.has(n.id))
)

function toggleSeleccion(id) {
  const s = new Set(seleccionados.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  seleccionados.value = s
}
function toggleSeleccionarTodos() {
  seleccionados.value = todosSeleccionados.value
    ? new Set()
    : new Set(porRevisar.value.map(n => n.id))
}
function limpiarSeleccion() {
  seleccionados.value = new Set()
}

const accionMasiva      = ref(null) // 'aprobar' | 'rechazar' | null
const motivoRechazoMasivo = ref('')
const procesandoMasivo  = ref(false)
const progresoMasivo    = ref({ hecho: 0, total: 0 })
const erroresMasivo     = ref([])

const pctMasivo = computed(() =>
  progresoMasivo.value.total ? Math.round((progresoMasivo.value.hecho / progresoMasivo.value.total) * 100) : 0
)

function abrirMasivo(accion) {
  accionMasiva.value = accion
  motivoRechazoMasivo.value = ''
  erroresMasivo.value = []
  progresoMasivo.value = { hecho: 0, total: 0 }
}
function cerrarModalMasivo() {
  accionMasiva.value = null
  erroresMasivo.value = []
}

async function ejecutarMasivo() {
  if (!accionMasiva.value) return
  const ids = Array.from(seleccionados.value)
  if (!ids.length) return

  procesandoMasivo.value = true
  progresoMasivo.value = { hecho: 0, total: ids.length }
  const erroresNuevos = []

  // Uno por uno (no en paralelo) para no saturar al backend y para poder
  // mostrar el progreso real -- igual que el loop de cálculo por chunks
  // en la carga de plantilla.
  for (const id of ids) {
    try {
      if (accionMasiva.value === 'aprobar') {
        // OJO: no tengo confirmado el nombre exacto de este endpoint --
        // asumí el mismo patrón que /rechazar (que sí es real). Si tu
        // ruta de aprobar es distinta, ajusta esta línea.
        await api.post(`/nomina-fatiga/${id}/aprobar`)
      } else {
        await api.post(`/nomina-fatiga/${id}/rechazar`, { comentario: motivoRechazoMasivo.value })
      }
    } catch (err) {
      const nom = nominas.value.find(n => n.id === id)
      erroresNuevos.push(nom?.nombre || `#${id}`)
      console.error(`[workflow] error en ${accionMasiva.value} masivo, id ${id}:`, err?.response?.data || err)
    } finally {
      progresoMasivo.value.hecho++
    }
  }

  erroresMasivo.value = erroresNuevos
  procesandoMasivo.value = false
  await cargarNominas()

  if (erroresNuevos.length === 0) {
    // todo salió bien -- limpia selección y cierra el modal solo
    limpiarSeleccion()
    accionMasiva.value = null
  } else {
    // deja el modal abierto mostrando cuáles fallaron; las que sí
    // salieron bien ya no están en "Por revisar" así que la selección
    // se autolimpia sola en el siguiente toggle
    limpiarSeleccion()
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
.kanban-select-all {
  display:flex; align-items:center; gap:5px;
  font-size:11px; color:var(--tx2); cursor:pointer; font-weight:500;
}
.kanban-select-all input { width:14px; height:14px; cursor:pointer; accent-color:var(--acc); }
.kanban-col-body { padding:12px; display:flex; flex-direction:column; gap:10px; }
.kanban-empty { text-align:center; color:var(--tx2); font-size:12px; padding:16px 0; }

/* Barra de acciones masivas */
.kanban-bulk-bar {
  display:flex; align-items:center; justify-content:space-between; gap:10px;
  padding:9px 14px; background:var(--acc-dim); border-bottom:0.5px solid var(--acc);
  flex-wrap:wrap;
}
.kbb-count { font-size:12px; font-weight:600; color:var(--acc); }
.kanban-bulk-actions { display:flex; gap:6px; flex-wrap:wrap; }
.btn-sm--grn { border-color:var(--grn); color:var(--grn); }
.btn-sm--grn:hover { background:rgba(34,201,122,.14); }
.btn-sm--red { border-color:var(--red); color:var(--red); }
.btn-sm--red:hover { background:var(--red-dim); }

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
.lote-card--seleccionada { border-color:var(--acc); box-shadow:0 0 0 1px var(--acc); }

.lote-card-top { padding:14px 14px 6px; display:flex; align-items:flex-start; gap:10px; }
.lote-card-toptext { flex:1; min-width:0; cursor:pointer; }
.lote-checkbox { display:flex; align-items:center; padding-top:2px; cursor:pointer; flex-shrink:0; }
.lote-checkbox input { width:16px; height:16px; cursor:pointer; accent-color:var(--acc); }
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

/* ── Modal de acción masiva ──────────────────────────────────────
   .confirm-modal / .cm-* ya existen globalmente en tu app (los usa el
   modal de rechazo individual). Nada más agrego el color "ok" para el
   ícono y el botón cuando la acción es Aprobar, y la barra de progreso
   (reusa .chunk-bar-wrap/.chunk-bar/.chunk-fill/.chunk-pct que ya tienes
   en la vista de cargar plantilla -- si esas clases viven ahí y no son
   globales, cópialas a tu CSS global o dime y te las mando aparte). */
.cm-icon--ok { color:var(--grn); }
.cm-btn--ok { background:var(--grn); border-color:var(--grn); color:#fff; }
.cm-btn--ok:hover:not(:disabled) { opacity:.9; }
.masivo-progreso { width:100%; }
.chunk-bar-wrap { display:flex; align-items:center; gap:8px; width:100%; }
.chunk-bar { flex:1; height:6px; background:var(--bg3); border-radius:6px; overflow:hidden; }
.chunk-fill {
  height:100%; border-radius:6px;
  background:linear-gradient(90deg, var(--acc), var(--acc2, var(--acc)));
  transition:width .3s ease;
}
.chunk-pct { font-size:11px; color:var(--acc); font-weight:600; min-width:36px; text-align:right; }
</style>