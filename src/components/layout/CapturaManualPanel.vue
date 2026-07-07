<!--
  ════════════════════════════════════════════════════════════
  Captura manual de asistencia/fatiga — tercer modo dentro de
  PrenominaView.vue, junto a "Por biométrico" y "Por fatiga (Excel)".

  Flujo:
    1. Define cuántos días tiene el periodo (15, 16, 7, etc.)
    2. Busca y agrega empleados uno por uno
    3. Por cada empleado elige su servicio y captura día por día
       con un <select> (D, 24, 12, F, I, PCS, PSS, A, B, V, 24E, 12E)
    4. Botón "rellenar patrón" para alternar 2 valores rápido en toda la fila
    5. Guarda → llama a /nomina-fatiga/procesar-asistencia con JSON
       (mismo backend que el .xlsm, mismo cálculo de tabulador)
  ════════════════════════════════════════════════════════════
-->
<template>
  <div class="captura-view">

    <!-- Configuración del periodo -->
    <div v-if="borradorRestaurado" class="aviso-borrador">
      <i class="ti ti-device-floppy" aria-hidden="true"></i>
      Se restauró tu captura anterior automáticamente
      <button class="aviso-cerrar" @click="borradorRestaurado = false">
        <i class="ti ti-x" aria-hidden="true"></i>
      </button>
    </div>

    <div class="sec">
      <div class="sec-hdr">
        <i class="ti ti-calendar-stats" aria-hidden="true"></i>
        <span>Configuración del periodo</span>
      </div>
      <div class="sec-body">
        <div class="filtros-grid filtros-grid--4">
          <div class="field">
            <label>Nombre de la nómina <span class="req">*</span></label>
            <input type="text" v-model="nombreNomina" placeholder="Ej. Nómina manual Q1 julio" />
          </div>
          <div class="field">
            <label>Días del periodo <span class="req">*</span></label>
            <input
              type="number"
              v-model.number="totalDias"
              min="1" max="31"
              @change="ajustarColumnasDias"
            />
          </div>
          <div class="field">
            <label>Periodo inicio</label>
            <input type="date" v-model="periodoInicio" />
          </div>
          <div class="field">
            <label>Periodo fin</label>
            <input type="date" v-model="periodoFin" />
          </div>
        </div>
      </div>
    </div>

    <!-- Buscador de empleados -->
    <div class="sec">
      <div class="sec-hdr">
        <i class="ti ti-user-plus" aria-hidden="true"></i>
        <span>Agregar empleado</span>
      </div>
      <div class="sec-body">
        <div class="buscador-wrap" ref="buscadorWrapRef">
          <div class="input-icon-wrap">
            <i class="ti ti-search" aria-hidden="true"></i>
            <input
              type="text"
              v-model="buscarTexto"
              placeholder="Buscar por nombre, CURP o RFC…"
              @input="onBuscarInput"
            />
          </div>
        </div>
        <Teleport to="body">
          <div
            v-if="resultadosBusqueda.length"
            class="resultados-dropdown resultados-dropdown--fixed"
            :style="dropdownPos"
          >
            <div
              v-for="emp in resultadosBusqueda"
              :key="emp.id"
              class="resultado-item"
              @click="agregarEmpleado(emp)"
            >
              <div class="resultado-nombre">
                {{ formatIdEmpleado(emp.id) }} — {{ emp.nombreCompleto || emp.nombre }}
              </div>
              <div class="resultado-sub">{{ emp.curp }} · {{ emp.puesto || 'Sin puesto' }}</div>
            </div>
          </div>
        </Teleport>
      </div>
    </div>

    <!-- Tabla de captura -->
    <div class="sec" v-if="filas.length">
      <div class="sec-hdr">
        <i class="ti ti-table" aria-hidden="true"></i>
        <span>Captura de asistencia</span>
        <span class="item-count">{{ filas.length }} empleados</span>
      </div>

      <div class="table-wrap captura-table-wrap">
        <table class="captura-table">
          <thead>
            <tr>
              <th class="col-sticky col-empleado">Empleado</th>
              <th class="col-sticky col-servicio">Servicio</th>
              <th v-for="d in totalDias" :key="d" class="col-dia">{{ d }}</th>
              <th class="col-money">Adicional</th>
              <th class="col-money">Otros Desc.</th>
              <th class="col-comment">Comentarios</th>
              <th class="col-acciones"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(fila, idx) in filas" :key="fila._key">
              <td class="col-sticky col-empleado">
                <div class="emp-cell">
                  <span class="emp-nombre">{{ formatIdEmpleado(fila.id_empleado) }} — {{ fila.nombre }}</span>
                  <button class="btn-rellenar" @click="abrirRellenoPatron(idx)" title="Rellenar patrón">
                    <i class="ti ti-wand" aria-hidden="true"></i>
                  </button>
                </div>
              </td>
              <td class="col-sticky col-servicio">
                <select v-model="fila.id_servicio" class="sel-servicio">
                  <option value="">— Selecciona —</option>
                  <option v-for="s in servicios" :key="s.id" :value="s.id">{{ s.servicio }}</option>
                </select>
              </td>
              <td v-for="d in totalDias" :key="d" class="col-dia">
                <select v-model="fila.dias[d]" class="sel-dia" :class="claseColorDia(fila.dias[d])">
                  <option value="">—</option>
                  <option v-for="c in CODIGOS" :key="c.valor" :value="c.valor">{{ c.valor }}</option>
                </select>
              </td>
              <td class="col-money">
                <input type="number" v-model.number="fila.adicional" step="0.01" class="inp-money" />
              </td>
              <td class="col-money">
                <input type="number" v-model.number="fila.otros_descuentos" step="0.01" class="inp-money" />
              </td>
              <td class="col-comment">
                <input type="text" v-model="fila.comentarios" class="inp-comment" />
              </td>
              <td class="col-acciones">
                <button class="icon-btn danger" @click="quitarFila(idx)" title="Quitar">
                  <i class="ti ti-trash" aria-hidden="true"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Leyenda de códigos -->
      <div class="leyenda">
        <span class="leyenda-title">Claves:</span>
        <span v-for="c in CODIGOS" :key="c.valor" class="leyenda-item" :class="claseColorDia(c.valor)">
          {{ c.valor }} = {{ c.label }}
        </span>
      </div>

      <div v-if="errorMsg" class="alert-warn">
        <i class="ti ti-alert-circle" aria-hidden="true"></i>
        {{ errorMsg }}
      </div>

      <div class="filtros-actions">
        <button class="btn-sm" @click="limpiarTodo" :disabled="loading">
          <i class="ti ti-eraser" aria-hidden="true"></i> Limpiar todo
        </button>
        <button
          class="btn-primary-lg"
          :disabled="loading || !nombreNomina.trim() || !filas.length"
          @click="guardarYCalcular"
        >
          <i class="ti ti-loader-2 spin" v-if="loading" aria-hidden="true"></i>
          <i class="ti ti-calculator" v-else aria-hidden="true"></i>
          {{ loading ? 'Procesando…' : 'Guardar y calcular nómina' }}
        </button>
      </div>
    </div>

    <div v-else class="empty-state">
      <i class="ti ti-users" aria-hidden="true"></i>
      <p>Busca y agrega empleados arriba para comenzar la captura</p>
    </div>

    <!-- MODAL: rellenar patrón -->
    <Teleport to="body">
      <div v-if="modalPatron !== null" class="modal-overlay" @click.self="modalPatron = null">
        <div class="modal-box">
          <div class="modal-hdr">
            <div class="modal-icon"><i class="ti ti-wand" aria-hidden="true"></i></div>
            <div>
              <p class="modal-title">Rellenar patrón</p>
              <p class="modal-sub">{{ filas[modalPatron]?.nombre }}</p>
            </div>
            <button class="modal-close" @click="modalPatron = null"><i class="ti ti-x" aria-hidden="true"></i></button>
          </div>

          <div class="modal-body-patron">
            <div class="field">
              <label>Patrón a repetir (ej. D,24 alterna descanso/trabajo)</label>
              <div class="patron-inputs">
                <select v-model="patronValores[0]" class="sel-dia">
                  <option value="">—</option>
                  <option v-for="c in CODIGOS" :key="c.valor" :value="c.valor">{{ c.valor }}</option>
                </select>
                <select v-model="patronValores[1]" class="sel-dia">
                  <option value="">—</option>
                  <option v-for="c in CODIGOS" :key="c.valor" :value="c.valor">{{ c.valor }}</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label>Día inicial del patrón</label>
              <input type="number" v-model.number="patronDiaInicio" min="1" :max="totalDias" />
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-sm" @click="modalPatron = null">Cancelar</button>
            <button class="btn-primary-lg" @click="aplicarPatron">
              <i class="ti ti-check" aria-hidden="true"></i> Aplicar
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import api from '@/services/api.js'
import { nominaFatigaService } from '@/services/Nominafatiga.service.js'

const emit = defineEmits(['procesado'])

const CODIGOS = [
  { valor: 'D',   label: 'Descanso' },
  { valor: '24',  label: 'Turno 24x24' },
  { valor: '12',  label: 'Turno 12x12' },
  { valor: 'F',   label: 'Falta' },
  { valor: 'I',   label: 'Incapacidad' },
  { valor: 'PCS', label: 'Permiso con goce' },
  { valor: 'PSS', label: 'Permiso sin goce' },
  { valor: 'A',   label: 'Alta' },
  { valor: 'B',   label: 'Baja' },
  { valor: 'V',   label: 'Vacaciones' },
  { valor: '24E', label: 'Extra 24h' },
  { valor: '12E', label: 'Extra 12h' },
]

const nombreNomina   = ref('')
const totalDias      = ref(15)
const periodoInicio  = ref('')
const periodoFin     = ref('')
const loading        = ref(false)
const errorMsg        = ref('')

const servicios       = ref([])
const buscarTexto      = ref('')
const resultadosBusqueda = ref([])
const filas            = ref([])
const modalPatron       = ref(null)
const patronValores     = ref(['', ''])
const patronDiaInicio   = ref(1)
const buscadorWrapRef   = ref(null)
const dropdownPos       = ref({})
const borradorRestaurado = ref(false)

function actualizarPosicionDropdown() {
  const el = buscadorWrapRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  dropdownPos.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  }
}

let buscarTimeout = null
let filaKeyCounter = 0

onMounted(async () => {
  await cargarServicios()
  restaurarEstado()
})

/* ── Persistencia en localStorage ──────────────────────── */
const STORAGE_KEY = 'captura_manual_nomina_borrador'

function guardarEstado() {
  try {
    const payload = {
      nombreNomina: nombreNomina.value,
      totalDias: totalDias.value,
      periodoInicio: periodoInicio.value,
      periodoFin: periodoFin.value,
      filas: filas.value,
      _filaKeyCounter: filaKeyCounter,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (e) {
    console.warn('No se pudo guardar el borrador:', e)
  }
}

function restaurarEstado() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    nombreNomina.value  = data.nombreNomina || ''
    totalDias.value     = data.totalDias || 15
    periodoInicio.value = data.periodoInicio || ''
    periodoFin.value    = data.periodoFin || ''
    filas.value         = data.filas || []
    filaKeyCounter      = data._filaKeyCounter || filas.value.length
    if (filas.value.length || nombreNomina.value) {
      borradorRestaurado.value = true
    }
  } catch (e) {
    console.warn('No se pudo restaurar el borrador:', e)
    localStorage.removeItem(STORAGE_KEY)
  }
}

function limpiarBorradorGuardado() {
  localStorage.removeItem(STORAGE_KEY)
}

// Autoguardar en cualquier cambio relevante (debounced ligero vía watch + deep)
watch(
  [nombreNomina, totalDias, periodoInicio, periodoFin, filas],
  () => { guardarEstado() },
  { deep: true }
)

async function cargarServicios() {
  try {
    const { data } = await api.get('/catalogos/servicios')
    servicios.value = data.data || []
  } catch (err) {
    console.error(err)
  }
}

function onBuscarInput() {
  clearTimeout(buscarTimeout)
  if (!buscarTexto.value.trim() || buscarTexto.value.trim().length < 2) {
    resultadosBusqueda.value = []
    return
  }
  buscarTimeout = setTimeout(async () => {
    try {
      const { data } = await api.get('/empleados/buscar', { params: { search: buscarTexto.value.trim(), limit: 8 } })
      resultadosBusqueda.value = (data.data || []).slice(0, 8)
      if (resultadosBusqueda.value.length) {
        await nextTick()
        actualizarPosicionDropdown()
      }
    } catch (err) {
      console.error(err)
      resultadosBusqueda.value = []
    }
  }, 300)
}

function agregarEmpleado(emp) {
  const nombreCompleto = emp.nombreCompleto || emp.nombre || ''
  if (filas.value.some(f => f.id_empleado === emp.id)) {
    errorMsg.value = `${nombreCompleto} ya está en la lista`
    return
  }
  filaKeyCounter++
  filas.value.push({
    _key: filaKeyCounter,
    id_empleado: emp.id,
    nombre: nombreCompleto,
    id_servicio: '',
    servicio: '',
    dias: {},
    adicional: 0,
    otros_descuentos: 0,
    comentarios: '',
  })
  buscarTexto.value = ''
  resultadosBusqueda.value = []
  errorMsg.value = ''
}

function formatIdEmpleado(id) {
  return String(id).padStart(6, '0')
}

function quitarFila(idx) {
  filas.value.splice(idx, 1)
}

function ajustarColumnasDias() {
  // Las filas existentes conservan los días ya capturados;
  // los selects simplemente generan/ocultan columnas según totalDias.
}

function abrirRellenoPatron(idx) {
  modalPatron.value = idx
  patronValores.value = ['', '']
  patronDiaInicio.value = 1
}

function aplicarPatron() {
  if (modalPatron.value === null) return
  const fila = filas.value[modalPatron.value]
  const [v1, v2] = patronValores.value
  if (!v1 && !v2) { modalPatron.value = null; return }

  let toggle = 0
  for (let d = patronDiaInicio.value; d <= totalDias.value; d++) {
    fila.dias[d] = toggle === 0 ? v1 : (v2 || v1)
    toggle = 1 - toggle
  }
  modalPatron.value = null
}

function claseColorDia(codigo) {
  const map = {
    'D': 'dia-descanso', '24': 'dia-trabajo', '12': 'dia-trabajo',
    'F': 'dia-falta', 'I': 'dia-incapacidad',
    'PCS': 'dia-permiso-con', 'PSS': 'dia-permiso-sin',
    'A': 'dia-alta', 'B': 'dia-baja', 'V': 'dia-vacaciones',
    '24E': 'dia-extra', '12E': 'dia-extra',
  }
  return map[codigo] || ''
}

function limpiarTodo() {
  filas.value = []
  nombreNomina.value = ''
  periodoInicio.value = ''
  periodoFin.value = ''
  errorMsg.value = ''
  limpiarBorradorGuardado()
}

async function guardarYCalcular() {
  if (!nombreNomina.value.trim() || !filas.value.length) return

  const sinServicio = filas.value.filter(f => !f.id_servicio)
  if (sinServicio.length) {
    errorMsg.value = `Falta seleccionar servicio para: ${sinServicio.map(f => f.nombre).join(', ')}`
    return
  }

  loading.value = true
  errorMsg.value = ''

  try {
    const payloadFilas = filas.value.map(f => ({
      nombre: f.nombre,
      id_empleado: f.id_empleado,
      servicio: servicios.value.find(s => s.id === f.id_servicio)?.servicio || '',
      id_servicio: f.id_servicio,
      dias: f.dias,
      adicional: f.adicional || 0,
      otros_descuentos: f.otros_descuentos || 0,
      comentarios: f.comentarios || '',
    }))

    const formData = new FormData()
    formData.append('nombre', nombreNomina.value.trim())
    if (periodoInicio.value) formData.append('periodo_inicio', periodoInicio.value)
    if (periodoFin.value)    formData.append('periodo_fin', periodoFin.value)
    formData.append('filas', JSON.stringify(payloadFilas))

    const { data } = await api.post('/nomina-fatiga/procesar-asistencia', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    if (data.status === 'ok') {
      limpiarTodo()
      emit('procesado', data.data)
    }
  } catch (err) {
    errorMsg.value = err?.response?.data?.message || 'Error al procesar la nómina'
  } finally {
    loading.value = false
  }
}

defineExpose({ limpiarTodo })
</script>

<style scoped>
.captura-view { display:flex; flex-direction:column; gap:14px; }

.aviso-borrador {
  display:flex; align-items:center; gap:8px;
  padding:10px 14px; border-radius:8px;
  background:var(--acc-dim); border:0.5px solid var(--acc); color:var(--acc); font-size:13px;
}
.aviso-borrador i:first-child { font-size:15px; }
.aviso-cerrar {
  margin-left:auto; width:22px; height:22px; border-radius:6px;
  background:transparent; border:none; color:var(--acc); cursor:pointer;
  display:flex; align-items:center; justify-content:center; font-size:13px;
}
.aviso-cerrar:hover { background:rgba(255,255,255,.1); }

.sec { background:var(--bg1); border:0.5px solid var(--bdr); border-radius:12px; overflow:hidden; }
.sec-hdr {
  display:flex; align-items:center; gap:8px;
  padding:12px 16px; border-bottom:0.5px solid var(--bdr);
  font-size:13px; font-weight:500; color:var(--tx0); flex-wrap:wrap;
}
.sec-hdr i { font-size:16px; color:var(--acc); }
.sec-body { padding:16px; display:flex; flex-direction:column; gap:14px; }

.filtros-grid { display:grid; gap:12px; align-items:start; }
.filtros-grid--4 { grid-template-columns: 2fr 1fr 1fr 1fr; }

.field { display:flex; flex-direction:column; gap:5px; }
label { font-size:12px; font-weight:500; color:var(--tx1); }
.req { color:var(--red); }
input[type="text"], input[type="date"], input[type="number"], select {
  background:var(--bg2); border:0.5px solid var(--bdr2);
  border-radius:8px; padding:8px 10px;
  font-size:13px; color:var(--tx0); outline:none;
  font-family:inherit; transition:border .15s; width:100%;
}
input:focus, select:focus { border-color:var(--acc); }

/* Buscador */
.buscador-wrap { position:relative; }
.input-icon-wrap { position:relative; display:flex; align-items:center; }
.input-icon-wrap i {
  position:absolute; left:12px; color:var(--tx3); font-size:15px; pointer-events:none;
}
.input-icon-wrap input { padding-left:36px; }

.resultados-dropdown {
  background:var(--bg2); border:0.5px solid var(--bdr2); border-radius:10px;
  box-shadow:0 8px 24px rgba(0,0,0,.5); z-index:9998; overflow-y:auto; max-height:320px;
}
.resultados-dropdown--fixed {
  /* posición real inyectada vía :style con coords del input */
}
.resultado-item { padding:10px 14px; cursor:pointer; transition:background .1s; }
.resultado-item:hover { background:var(--bg3); }
.resultado-nombre { font-size:13px; font-weight:600; color:var(--tx0); }
.resultado-sub { font-size:11px; color:var(--tx2); margin-top:2px; }

/* Tabla captura */
.captura-table-wrap { overflow:auto; max-height:600px; }
.captura-table { width:100%; border-collapse:collapse; }
.captura-table th {
  padding:8px 6px; text-align:center;
  font-size:10px; font-weight:600; color:var(--tx2);
  text-transform:uppercase; letter-spacing:.5px;
  border-bottom:0.5px solid var(--bdr); white-space:nowrap;
  position:sticky; top:0; background:var(--bg1); z-index:2;
}
.captura-table td {
  padding:5px 4px; font-size:12px; border-bottom:0.5px solid var(--bdr); color:var(--tx0); text-align:center;
}
.col-sticky { position:sticky; left:0; background:var(--bg1); z-index:1; text-align:left; }
.col-empleado { left:0; min-width:160px; }
.col-servicio { left:160px; min-width:150px; }
.col-dia { min-width:62px; }
.col-money { min-width:90px; }
.col-comment { min-width:140px; }
.col-acciones { min-width:40px; }

.emp-cell { display:flex; align-items:center; justify-content:space-between; gap:6px; padding:0 8px; }
.emp-nombre { font-size:12px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:120px; }
.btn-rellenar {
  width:22px; height:22px; border-radius:6px; flex-shrink:0;
  background:var(--acc-dim); border:none; color:var(--acc);
  display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:12px;
}
.btn-rellenar:hover { background:var(--acc); color:#fff; }

.sel-servicio { font-size:11px; padding:5px 6px; }
.sel-dia {
  font-size:11px; padding:4px 2px; text-align:center; font-weight:700;
  width:100%; min-width:54px;
}
.sel-dia option, .sel-servicio option { background:var(--bg1); color:var(--tx0); }

.dia-descanso     { background:rgba(255,255,255,.06); }
.dia-trabajo       { background:rgba(79,142,247,.12); color:#7eb5f7; }
.dia-falta          { background:rgba(240,84,84,.18); color:#ff8a8a; }
.dia-incapacidad    { background:rgba(148,163,184,.18); color:#cbd5e1; }
.dia-permiso-con    { background:rgba(245,166,35,.14); color:#f5cb80; }
.dia-permiso-sin    { background:rgba(245,166,35,.28); color:#f5a623; }
.dia-alta           { background:rgba(34,201,122,.18); color:#6ee7a8; }
.dia-baja           { background:rgba(240,84,84,.28); color:#ff6b6b; }
.dia-vacaciones     { background:rgba(34,150,80,.22); color:#5fd28a; }
.dia-extra          { background:rgba(34,211,238,.18); color:#67e8f9; }

.inp-money { font-size:11px; padding:5px 6px; text-align:right; font-family:monospace; }
.inp-comment { font-size:11px; padding:5px 6px; }

.icon-btn {
  width:26px; height:26px; border-radius:6px;
  background:var(--bg2); border:0.5px solid var(--bdr);
  display:inline-flex; align-items:center; justify-content:center;
  cursor:pointer; color:var(--acc); font-size:13px; transition:all .15s;
}
.icon-btn.danger { color:var(--red); }
.icon-btn.danger:hover { background:var(--red-dim); }

/* Leyenda */
.leyenda {
  display:flex; align-items:center; gap:8px; flex-wrap:wrap;
  padding:10px 16px; border-top:0.5px solid var(--bdr); font-size:11px;
}
.leyenda-title { color:var(--tx2); font-weight:600; }
.leyenda-item { padding:2px 8px; border-radius:6px; font-weight:600; }

.alert-warn {
  margin:0 16px;
  display:flex; align-items:center; gap:8px;
  padding:10px 14px; border-radius:8px;
  background:var(--amb-dim); border:0.5px solid var(--amb); color:var(--amb); font-size:13px;
}

.filtros-actions { display:flex; justify-content:flex-end; gap:8px; padding:0 16px 16px; }
.item-count { font-size:11px; padding:2px 7px; border-radius:20px; background:var(--acc-dim); color:var(--acc); font-weight:500; }

.empty-state {
  display:flex; flex-direction:column; align-items:center; gap:8px;
  padding:40px 20px; color:var(--tx3);
}
.empty-state i { font-size:32px; }
.empty-state p { font-size:13px; }

/* Botones */
.btn-sm {
  display:inline-flex; align-items:center; gap:5px;
  padding:7px 14px; border-radius:8px;
  border:0.5px solid var(--bdr2); background:transparent;
  font-size:12px; color:var(--tx1); cursor:pointer; transition:all .15s; font-family:inherit;
}
.btn-sm:hover { background:var(--bg3); }
.btn-primary-lg {
  display:inline-flex; align-items:center; gap:6px;
  padding:8px 18px; border-radius:8px; border:none;
  background:var(--acc); font-size:13px; color:#fff;
  cursor:pointer; font-family:inherit; font-weight:500; transition:background .15s;
}
.btn-primary-lg:hover:not(:disabled) { background:var(--acc2); }
.btn-primary-lg:disabled { opacity:.6; cursor:not-allowed; }

@keyframes spin { to { transform:rotate(360deg); } }
.spin { display:inline-block; animation:spin .8s linear infinite; }

/* Modal patrón */
.modal-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,.6);
  z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px;
}
.modal-box {
  background:var(--bg1); border:0.5px solid var(--bdr2);
  border-radius:16px; width:100%; max-width:380px;
  display:flex; flex-direction:column; overflow:hidden;
}
.modal-hdr {
  display:flex; align-items:center; gap:12px;
  padding:14px 18px; border-bottom:0.5px solid var(--bdr);
}
.modal-icon {
  width:34px; height:34px; border-radius:10px;
  background:var(--acc-dim); color:var(--acc);
  display:flex; align-items:center; justify-content:center; font-size:17px; flex-shrink:0;
}
.modal-title { font-size:14px; font-weight:600; color:var(--tx0); }
.modal-sub { font-size:11px; color:var(--tx2); margin-top:2px; }
.modal-close {
  margin-left:auto; width:28px; height:28px; border-radius:6px;
  background:var(--bg3); border:none; cursor:pointer;
  color:var(--tx2); font-size:16px;
  display:flex; align-items:center; justify-content:center;
}
.modal-body-patron { padding:16px 18px; display:flex; flex-direction:column; gap:14px; }
.patron-inputs { display:flex; gap:8px; }
.modal-footer {
  padding:12px 18px; border-top:0.5px solid var(--bdr);
  display:flex; justify-content:flex-end; gap:8px;
}

@media (max-width:900px) {
  .filtros-grid--4 { grid-template-columns: 1fr 1fr; }
}
</style>