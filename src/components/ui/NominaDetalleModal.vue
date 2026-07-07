<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('cerrar')">
      <div class="modal-nomina">

        <div class="mn-header">
          <div>
            <p class="mn-title">Resumen de nómina</p>
            <p class="mn-sub" v-if="nomina">
              {{ nomina.nombre }} ·
              {{ nomina.periodo_inicio }} → {{ nomina.periodo_fin || 'sin fecha fin' }} ·
              <strong>{{ detalleNomina.length }}</strong> empleados ·
              Total: <span class="grn">{{ formatMoney(nomina.total_pagar) }}</span>
              · <span :class="'badge-estatus badge-' + nomina.estatus">{{ nomina.estatus }}</span>
            </p>
          </div>
          <button class="mn-close" @click="$emit('cerrar')"><i class="ti ti-x"></i></button>
        </div>

        <div class="mn-filtros">
          <input v-model="filtroNombre" placeholder="Buscar empleado..." class="mn-search" />
          <select v-model="filtroZona" class="mn-select">
            <option value="">Todas las zonas</option>
            <option v-for="z in zonasUnicas" :key="z" :value="z">{{ z }}</option>
          </select>
          <label class="mn-toggle"><input type="checkbox" v-model="soloNuevos" /> Solo nuevos</label>
          <label class="mn-toggle"><input type="checkbox" v-model="soloSinMatch" /> Sin match</label>
        </div>

        <div class="mn-tabla-wrap">
          <div v-if="cargando" class="mn-loading">
            <i class="ti ti-loader-2 spin"></i> Cargando detalle...
          </div>

          <div class="mn-tabs">
            <button :class="['mn-tab', tabActiva === 'prenomina' && 'active']" @click="tabActiva = 'prenomina'">
              <i class="ti ti-calculator"></i> Pre-nómina
            </button>
            <button :class="['mn-tab', tabActiva === 'fiscal' && 'active']" @click="tabActiva = 'fiscal'">
              <i class="ti ti-building-government"></i> Nómina fiscal
            </button>
          </div>

          <!-- TAB PRE-NÓMINA -->
          <table v-if="tabActiva === 'prenomina'" class="mn-tabla">
            <thead>
              <tr>
                <th class="th-grupo th-perc" colspan="6">PERCEPCIONES</th>
                <th class="th-grupo th-ded"  colspan="5">DEDUCCIONES</th>
                <th class="th-grupo th-tot"  colspan="2">TOTALES</th>
              </tr>
              <tr>
                <th class="text-left">Empleado</th>
                <th class="text-left">Zona</th>
                <th>★</th>
                <th>Sueldo</th>
                <th>Extra</th>
                <th>Fest/Dob</th>
                <th>Faltas</th>
                <th>FONACOT</th>
                <th>INFONAVIT</th>
                <th>Pensión</th>
                <th>Otros</th>
                <th class="col-total">Neto pagar</th>
                <th>Bono</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="detallesFiltrados.length === 0"><td colspan="13" class="sin-resultados">Sin resultados</td></tr>
              <tr v-for="d in detallesFiltrados" :key="d.id"
                :class="{ 'row-nuevo': d.es_nuevo==1, 'row-sin-match': !d.id_empleado }">
                <td class="col-nombre">
                  <span class="badge-nuevo" v-if="d.es_nuevo==1">NUEVO</span>
                  <span class="badge-warn" v-if="!d.id_empleado">SIN ID</span>
                  {{ d.nombre_excel }}
                </td>
                <td class="col-zona">{{ d.zona || '—' }}</td>
                <td class="center">
                  <i v-if="d.es_nuevo==1" class="ti ti-star-filled" style="color:var(--amb)"></i>
                  <span v-else class="muted">—</span>
                </td>
                <td class="mono">{{ fmt(d.sueldo_semanal) }}</td>
                <td class="mono grn">{{ d.tiempo_extra > 0 ? '+'+fmt(d.tiempo_extra) : '—' }}</td>
                <td class="mono grn">
                  <span v-if="d.monto_festivos > 0 || d.monto_dobletes > 0">
                    +{{ fmt((+d.monto_festivos||0) + (+d.monto_dobletes||0)) }}
                  </span>
                  <span v-else class="muted">—</span>
                </td>
                <td class="mono red">{{ d.descuento_faltas > 0 ? '-'+fmt(d.descuento_faltas) : '—' }}</td>
                <td class="mono red">{{ d.desc_fonacot > 0 ? '-'+fmt(d.desc_fonacot) : '—' }}</td>
                <td class="mono red">{{ d.desc_infonavit > 0 ? '-'+fmt(d.desc_infonavit) : '—' }}</td>
                <td class="mono red">{{ d.desc_pension > 0 ? '-'+fmt(d.desc_pension) : '—' }}</td>
                <td class="mono red">{{ d.otros_descuentos > 0 ? '-'+fmt(d.otros_descuentos) : '—' }}</td>
                <td class="mono col-total" :class="d.total > 0 ? 'grn' : 'red'">{{ fmt(d.total) }}</td>
                <td class="mono grn" style="font-size:11px">{{ d.bono > 0 ? '+'+fmt(d.bono) : '—' }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="mn-footer">
                <td colspan="3"><strong>TOTALES</strong></td>
                <td class="mono">{{ fmt(sumaCol('sueldo_semanal')) }}</td>
                <td class="mono grn">+{{ fmt(sumaCol('tiempo_extra')) }}</td>
                <td class="mono grn">+{{ fmt(sumaCol('monto_festivos') + sumaCol('monto_dobletes')) }}</td>
                <td class="mono red">-{{ fmt(sumaCol('descuento_faltas')) }}</td>
                <td class="mono red">-{{ fmt(sumaCol('desc_fonacot')) }}</td>
                <td class="mono red">-{{ fmt(sumaCol('desc_infonavit')) }}</td>
                <td class="mono red">-{{ fmt(sumaCol('desc_pension')) }}</td>
                <td class="mono red">-{{ fmt(sumaCol('otros_descuentos')) }}</td>
                <td class="mono grn col-total">{{ fmt(sumaCol('total')) }}</td>
                <td class="mono grn">+{{ fmt(sumaCol('bono')) }}</td>
              </tr>
            </tfoot>
          </table>

          <!-- TAB FISCAL -->
          <table v-else-if="tabActiva === 'fiscal'" class="mn-tabla mn-tabla-fiscal">
            <thead>
              <tr>
                <th class="th-grupo th-base" colspan="5">BASE</th>
                <th class="th-grupo th-ded"  colspan="7">DEDUCCIONES FISCALES</th>
                <th class="th-grupo th-tot"  colspan="3">DISPERSIÓN</th>
              </tr>
              <tr>
                <th class="text-left sticky-col">Empleado</th>
                <th>Días Lab.</th>
                <th>SD</th>
                <th>SDI</th>
                <th>Ingreso Q</th>
                <th>ISR antes Subs.</th>
                <th>IMSS</th>
                <th>INFONAVIT</th>
                <th>FONACOT</th>
                <th>Pensión</th>
                <th>Subs. Empleo</th>
                <th>ISR neto</th>
                <th class="col-fiscal">Neto Fiscal</th>
                <th style="color:var(--amb)">IAS</th>
                <th class="col-total">Total Disp.</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="detallesFiltrados.length === 0"><td colspan="15" class="sin-resultados">Sin resultados</td></tr>
              <tr v-for="d in detallesFiltrados" :key="d.id"
                :class="{ 'row-nuevo': d.es_nuevo==1, 'row-sin-match': !d.id_empleado }">
                <td class="col-nombre sticky-col">
                  <span class="badge-nuevo" v-if="d.es_nuevo==1">NUEVO</span>
                  <span class="badge-warn" v-if="!d.id_empleado">SIN ID</span>
                  {{ d.nombre_excel }}
                </td>
                <td class="mono center">{{ d.dias_pagados ?? 15 }}</td>
                <td class="mono">{{ d.sd ? fmt(d.sd) : '—' }}</td>
                <td class="mono">{{ d.sdi ? fmt(d.sdi) : '—' }}</td>
                <td class="mono">{{ d.ingreso_quincenal ? fmt(d.ingreso_quincenal) : '—' }}</td>
                <td class="mono red">{{ d.isr_bruto > 0 ? fmt(d.isr_bruto) : '—' }}</td>
                <td class="mono red">{{ d.imss_obrero > 0 ? fmt(d.imss_obrero) : '—' }}</td>
                <td class="mono red">{{ d.desc_infonavit > 0 ? fmt(d.desc_infonavit) : '—' }}</td>
                <td class="mono red">{{ d.desc_fonacot > 0 ? fmt(d.desc_fonacot) : '—' }}</td>
                <td class="mono red">{{ d.desc_pension > 0 ? fmt(d.desc_pension) : '—' }}</td>
                <td class="mono grn">{{ d.subsidio_empleo > 0 ? fmt(d.subsidio_empleo) : '—' }}</td>
                <td class="mono red">{{ d.isr_neto > 0 ? fmt(d.isr_neto) : '—' }}</td>
                <td class="mono col-fiscal">{{ d.neto_fiscal ? fmt(d.neto_fiscal) : '—' }}</td>
                <td class="mono" style="color:var(--amb)">{{ d.ias > 0 ? fmt(d.ias) : '—' }}</td>
                <td class="mono col-total grn">{{ d.total_dispersion ? fmt(d.total_dispersion) : fmt(d.total) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="mn-footer">
                <td class="sticky-col" colspan="2"><strong>TOTALES</strong></td>
                <td colspan="2"></td>
                <td class="mono">{{ fmt(sumaCol('ingreso_quincenal')) }}</td>
                <td class="mono red">{{ fmt(sumaCol('isr_bruto')) }}</td>
                <td class="mono red">{{ fmt(sumaCol('imss_obrero')) }}</td>
                <td class="mono red">{{ fmt(sumaCol('desc_infonavit')) }}</td>
                <td class="mono red">{{ fmt(sumaCol('desc_fonacot')) }}</td>
                <td class="mono red">{{ fmt(sumaCol('desc_pension')) }}</td>
                <td class="mono grn">{{ fmt(sumaCol('subsidio_empleo')) }}</td>
                <td class="mono red">{{ fmt(sumaCol('isr_neto')) }}</td>
                <td class="mono col-fiscal">{{ fmt(sumaCol('neto_fiscal')) }}</td>
                <td class="mono" style="color:var(--amb)">{{ fmt(sumaCol('ias')) }}</td>
                <td class="mono grn col-total">{{ fmt(sumaCol('total_dispersion') || sumaCol('total')) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="mn-footer-bar">
          <span class="muted" style="font-size:12px">
            Mostrando {{ detallesFiltrados.length }} de {{ detalleNomina.length }} empleados
          </span>
          <div style="display:flex; gap:8px;">
            <button v-if="nomina?.estatus === 'borrador'" class="btn-primary-lg" @click="aprobar" :disabled="aprobando">
              <i class="ti ti-check"></i> {{ aprobando ? 'Aprobando...' : 'Aprobar nómina' }}
            </button>
            <button v-if="nomina?.estatus === 'aprobada'" class="btn-primary-lg" @click="mostrarDispersion = true">
              <i class="ti ti-cash"></i> Dispersar
            </button>
            <button class="btn-sm" @click="$emit('cerrar')">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div v-if="mostrarDispersion" class="modal-overlay" @click.self="mostrarDispersion = false">
      <div class="modal-nomina" style="max-width:480px; max-height:none;">
        <div class="mn-header">
          <p class="mn-title">Dispersión</p>
          <button class="mn-close" @click="mostrarDispersion = false"><i class="ti ti-x"></i></button>
        </div>
        <div style="padding: 0 20px 20px;">
          <DispersionModal :nomina="nomina" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api.js'
import DispersionModal from './DispersionModal.vue'

const props = defineProps({
  idNomina: { type: [Number, String], required: true },
})
const emit = defineEmits(['cerrar', 'actualizado'])

const nomina         = ref(null)
const detalleNomina  = ref([])
const cargando       = ref(false)
const aprobando      = ref(false)
const mostrarDispersion = ref(false)

const filtroNombre  = ref('')
const filtroZona    = ref('')
const soloNuevos    = ref(false)
const soloSinMatch  = ref(false)
const tabActiva     = ref('prenomina')

const zonasUnicas = computed(() =>
  [...new Set(detalleNomina.value.map(d => d.zona).filter(Boolean))].sort()
)

const detallesFiltrados = computed(() => {
  let lista = detalleNomina.value
  if (filtroNombre.value) lista = lista.filter(d => d.nombre_excel?.toLowerCase().includes(filtroNombre.value.toLowerCase()))
  if (filtroZona.value)   lista = lista.filter(d => d.zona === filtroZona.value)
  if (soloNuevos.value)   lista = lista.filter(d => d.es_nuevo == 1)
  if (soloSinMatch.value) lista = lista.filter(d => !d.id_empleado)
  return lista
})

function sumaCol(col) {
  return detallesFiltrados.value.reduce((s, d) => s + (parseFloat(d[col]) || 0), 0)
}

async function cargar() {
  cargando.value = true
  try {
    const { data } = await api.get(`/nomina-fatiga/${props.idNomina}`)
    nomina.value        = data.data?.nomina || null
    detalleNomina.value = data.data?.detalle || []
  } catch (err) {
    console.error('Error cargando nómina:', err)
  } finally {
    cargando.value = false
  }
}

async function aprobar() {
  aprobando.value = true
  try {
    await api.post(`/nomina-fatiga/${props.idNomina}/aprobar`)
    await cargar()
    emit('actualizado')
  } catch (err) {
    console.error('Error aprobando:', err)
  } finally {
    aprobando.value = false
  }
}

function fmt(v) {
  return Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatMoney(v) {
  return Number(v || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

onMounted(cargar)
</script>

<style scoped>
.modal-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,.6);
  display:flex; align-items:center; justify-content:center;
  z-index:1000; padding:16px;
}
.modal-nomina {
  background:var(--bg1); border:0.5px solid var(--bdr);
  border-radius:16px; width:100%; max-width:1200px;
  max-height:90vh; display:flex; flex-direction:column;
  overflow:hidden;
}
.mn-header {
  display:flex; align-items:flex-start; justify-content:space-between;
  padding:18px 20px; border-bottom:0.5px solid var(--bdr); gap:12px;
}
.mn-title { font-size:16px; font-weight:600; color:var(--tx0); }
.mn-sub   { font-size:12px; color:var(--tx2); margin-top:4px; }
.mn-sub .grn { color:var(--grn); }
.mn-close {
  width:30px; height:30px; border-radius:8px; border:none;
  background:var(--bg3); color:var(--tx2); cursor:pointer;
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
.mn-close:hover { background:var(--red-dim); color:var(--red); }

.mn-filtros {
  display:flex; align-items:center; gap:10px; padding:12px 20px;
  border-bottom:0.5px solid var(--bdr); flex-wrap:wrap;
}
.mn-search {
  flex:1; min-width:200px; padding:7px 12px; border-radius:8px;
  border:0.5px solid var(--bdr2); background:var(--bg2);
  color:var(--tx0); font-size:13px; font-family:inherit; outline:none;
}
.mn-search:focus { border-color:var(--acc); }
.mn-select {
  padding:7px 10px; border-radius:8px; border:0.5px solid var(--bdr2);
  background:var(--bg2); color:var(--tx0); font-size:12px;
  font-family:inherit; cursor:pointer; outline:none;
}
.mn-toggle {
  display:flex; align-items:center; gap:5px;
  font-size:12px; color:var(--tx1); cursor:pointer; white-space:nowrap;
}

.mn-tabla-wrap { overflow:auto; flex:1; }
.mn-loading {
  display:flex; align-items:center; justify-content:center;
  gap:8px; padding:40px; color:var(--tx2); font-size:13px;
}
.mn-tabs {
  display:flex; gap:4px; padding:10px 16px;
  border-bottom:0.5px solid var(--bdr); background:var(--bg2);
}
.mn-tab {
  display:inline-flex; align-items:center; gap:5px;
  padding:6px 14px; border-radius:8px; border:none;
  background:transparent; color:var(--tx2);
  font-size:12px; cursor:pointer; font-family:inherit; transition:all .15s;
}
.mn-tab:hover { background:var(--bg3); color:var(--tx0); }
.mn-tab.active { background:var(--acc-dim); color:var(--acc); font-weight:500; }
.mn-tab i { font-size:14px; }

.mn-tabla { width:100%; border-collapse:collapse; font-size:12px; }
.mn-tabla th {
  background:var(--bg2); color:var(--tx2); font-weight:500;
  padding:8px 10px; text-align:right; white-space:nowrap;
  border-bottom:0.5px solid var(--bdr); position:sticky; top:0;
}
.mn-tabla th:first-child,
.mn-tabla th:nth-child(2) { text-align:left; }
.mn-tabla td {
  padding:7px 10px; border-bottom:0.5px solid var(--bdr);
  text-align:right; color:var(--tx0);
}
.mn-tabla td:first-child,
.mn-tabla td:nth-child(2) { text-align:left; }
.mn-tabla tbody tr:hover { background:var(--bg2); }

.th-grupo {
  font-size:10px; font-weight:700; text-transform:uppercase;
  letter-spacing:.5px; padding:5px 8px; border-bottom:0.5px solid var(--bdr);
}
.th-perc { background:rgba(34,201,122,.08); color:var(--grn); }
.th-ded  { background:rgba(255,80,80,.08);  color:var(--red); }
.th-tot  { background:var(--acc-dim); color:var(--acc); }
.th-base { background:var(--bg3); color:var(--tx2); }

.text-left { text-align:left !important; }
.center { text-align:center !important; }
.sin-resultados { text-align:center; padding:24px; color:var(--tx2); }

.col-nombre { min-width:180px; max-width:220px; }
.col-zona   { max-width:160px; font-size:11px; color:var(--tx2); }
.col-total  { font-weight:600; }
.mono { font-family:monospace; font-size:11px; }
.grn  { color:var(--grn); }
.red  { color:var(--red); }
.muted { opacity:.5; }

.badge-nuevo {
  display:inline-block; font-size:9px; padding:1px 5px;
  border-radius:4px; background:rgba(255,180,0,.15);
  color:var(--amb); font-weight:600; margin-right:4px; vertical-align:middle;
}
.badge-warn {
  display:inline-block; font-size:9px; padding:1px 5px;
  border-radius:4px; background:var(--red-dim);
  color:var(--red); font-weight:600; margin-right:4px; vertical-align:middle;
}

.row-nuevo    { background:rgba(255,180,0,.04); }
.row-sin-match { background:rgba(255,80,80,.05); }

.sticky-col {
  position:sticky; left:0; background:var(--bg1); z-index:2;
  border-right:0.5px solid var(--bdr);
}
.mn-tabla tbody tr:hover .sticky-col { background:var(--bg2); }
.col-fiscal {
  font-weight:600; color:var(--tx0);
  border-left:1px solid var(--bdr);
  border-right:1px solid var(--bdr);
}
.mn-tabla-fiscal { min-width:1400px; }

.mn-tabla tfoot tr.mn-footer td {
  background:var(--bg2); font-weight:600;
  border-top:1.5px solid var(--bdr); position:sticky; bottom:0;
}

.mn-footer-bar {
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 20px; border-top:0.5px solid var(--bdr);
}

.badge-estatus {
  font-size: 10px; padding: 2px 8px; border-radius: 20px; font-weight: 600;
  text-transform: uppercase; margin-left: 6px;
}
.badge-borrador   { background: var(--bg3); color: var(--tx2); }
.badge-aprobada   { background: rgba(34,201,122,.15); color: var(--grn); }
.badge-rechazada  { background: var(--red-dim); color: var(--red); }
.badge-dispersada { background: var(--acc-dim); color: var(--acc); }
</style>