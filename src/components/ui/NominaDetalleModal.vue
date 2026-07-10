<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('cerrar')">
      <div class="modal-nomina">

        <div class="mn-header">
          <div>
            <p class="mn-title">Resumen de nómina</p>
            <p class="mn-sub" v-if="nomina">
              <div v-if="nomina?.cargas?.length > 1" class="mn-cargas-lista">
                <span v-for="c in nomina.cargas" :key="c.id" class="deducc-pill">
                  {{ c.nombre_carga }}: {{ c.total_empleados }}
                  <i v-if="c.estatus === 'completa'" class="ti ti-check" style="color:var(--grn)"></i>
                  <i v-else class="ti ti-loader-2 spin" style="color:var(--acc)"></i>
                </span>
              </div>
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

          <div class="mn-filtros-divider"></div>

          <div class="mn-chips-group">
            <button type="button" class="chip-check" :class="{ active: soloNuevos }" @click="soloNuevos = !soloNuevos">
              <span class="chip-check-box"><i class="ti ti-check" v-if="soloNuevos"></i></span>
              Solo nuevos
            </button>
            <button type="button" class="chip-check" :class="{ active: soloSinMatch }" @click="soloSinMatch = !soloSinMatch">
              <span class="chip-check-box"><i class="ti ti-check" v-if="soloSinMatch"></i></span>
              Sin match
            </button>
          </div>
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
                <th class="th-grupo th-perc" colspan="8">PERCEPCIONES</th>
                <th class="th-grupo th-ded"  colspan="5">DEDUCCIONES</th>
                <th class="th-grupo th-tot"  colspan="2">TOTALES</th>
              </tr>
              <tr>
                <th class="text-left">Empleado</th>
                <th class="text-left">Zona</th>
                <th title="Nuevo ingreso este periodo">★</th>
                <th title="Sueldo base quincenal">Sueldo</th>
                <th title="Tiempo extra (24E/12E)">Extra</th>
                <th title="Monto adicional capturado en el Excel">Adicional</th>
                <th title="Festivos trabajados + Dobletes">Fest/Dob</th>
                <th title="Descuento por faltas">Faltas</th>
                <th title="FONACOT">FONACOT</th>
                <th title="INFONAVIT">INFONAVIT</th>
                <th title="Pensión alimenticia">Pensión</th>
                <th title="Otros descuentos">Otros</th>
                <th title="Total neto a pagar (pre-nómina)" class="col-total">Neto pagar</th>
                <th title="Bono del tabulador">Bono</th>
                <th title="Comentarios del Excel">Comentarios</th>

              </tr>
            </thead>
            <tbody>
              <tr v-if="detallesFiltrados.length === 0"><td colspan="14" class="sin-resultados">Sin resultados</td></tr>
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
                <td class="mono grn">{{ d.adicional > 0 ? '+'+fmt(d.adicional) : '—' }}</td>
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
                <td class="col-comentarios" style="text-align:left; font-size:11px; color:var(--tx2); max-width:200px;">
                  {{ d.comentarios || '—' }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="mn-footer">
                <td colspan="3"><strong>TOTALES</strong></td>
                <td class="mono">{{ fmt(sumaCol('sueldo_semanal')) }}</td>
                <td class="mono grn">+{{ fmt(sumaCol('tiempo_extra')) }}</td>
                <td class="mono grn">+{{ fmt(sumaCol('adicional')) }}</td>
                <td class="mono grn">+{{ fmt(sumaCol('monto_festivos') + sumaCol('monto_dobletes')) }}</td>
                <td class="mono red">-{{ fmt(sumaCol('descuento_faltas')) }}</td>
                <td class="mono red">-{{ fmt(sumaCol('desc_fonacot')) }}</td>
                <td class="mono red">-{{ fmt(sumaCol('desc_infonavit')) }}</td>
                <td class="mono red">-{{ fmt(sumaCol('desc_pension')) }}</td>
                <td class="mono red">-{{ fmt(sumaCol('otros_descuentos')) }}</td>
                <td class="mono grn col-total">{{ fmt(sumaCol('total')) }}</td>
                <td class="mono grn">+{{ fmt(sumaCol('bono')) }}</td>
                <td></td>

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
          <div class="mn-footer-actions">
            <button v-if="nomina?.estatus === 'borrador'" class="btn-outline-danger" @click="mostrarConfirmarCancelar = true">
              <i class="ti ti-trash"></i> Cancelar nómina
            </button>
            <button class="btn-ghost" @click="exportarExcel" :disabled="exportando">
              <i class="ti ti-loader-2 spin" v-if="exportando"></i>
              <i class="ti ti-file-spreadsheet" v-else></i>
              {{ exportando ? 'Generando...' : 'Exportar Excel' }}
            </button>
            <button v-if="nomina?.estatus === 'borrador'" class="btn-primary-lg" @click="mostrarConfirmarAprobar = true">
              <i class="ti ti-check"></i> Aprobar nómina
            </button>
            <button v-if="nomina?.estatus === 'aprobada'" class="btn-primary-lg" @click="mostrarDispersion = true">
              <i class="ti ti-cash"></i> Dispersar
            </button>
            <button class="btn-ghost" @click="$emit('cerrar')">Cerrar</button>
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

  <Teleport to="body">
    <div v-if="mostrarConfirmarAprobar" class="modal-overlay" @click.self="mostrarConfirmarAprobar = false">
      <div class="confirm-modal confirm-modal--warning">
        <div class="cm-icon"><i class="ti ti-lock"></i></div>
        <p class="cm-title">Aprobar "{{ nomina?.nombre }}"</p>
        <p class="cm-sub">
          Una vez aprobada, <strong>ya no podrás agregar más cargas ni pre-nóminas</strong> a este lote.
          Cualquier fatiga adicional tendrá que procesarse como un lote aparte.
        </p>
        <div class="cm-actions">
          <button class="cm-btn cm-btn--ghost" @click="mostrarConfirmarAprobar = false" :disabled="aprobando">Cancelar</button>
          <button class="cm-btn cm-btn--primary" @click="aprobar" :disabled="aprobando">
            {{ aprobando ? 'Aprobando...' : 'Sí, aprobar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
  <div v-if="mostrarConfirmarCancelar" class="modal-overlay" @click.self="mostrarConfirmarCancelar = false">
    <div class="confirm-modal confirm-modal--danger">
      <div class="cm-icon"><i class="ti ti-trash"></i></div>
      <p class="cm-title">Cancelar "{{ nomina?.nombre }}"</p>
      <p class="cm-sub">
        Se marcará como <strong>rechazada</strong> y desaparecerá del flujo de revisión.
        Esta acción no se puede deshacer.
      </p>
      <textarea
        v-model="motivoCancelar"
        placeholder="Motivo de la cancelación (opcional)..."
        class="cm-textarea"
        rows="3"
      ></textarea>
      <div class="cm-actions">
        <button class="cm-btn cm-btn--ghost" @click="mostrarConfirmarCancelar = false" :disabled="cancelando">Volver</button>
        <button class="cm-btn cm-btn--danger" @click="cancelarNomina" :disabled="cancelando">
          {{ cancelando ? 'Cancelando...' : 'Sí, cancelar' }}
        </button>
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

const mostrarConfirmarAprobar = ref(false)


const detallesFiltrados = computed(() => {
  let lista = detalleNomina.value
  if (filtroNombre.value) lista = lista.filter(d => d.nombre_excel?.toLowerCase().includes(filtroNombre.value.toLowerCase()))
  if (filtroZona.value)   lista = lista.filter(d => d.zona === filtroZona.value)
  if (soloNuevos.value)   lista = lista.filter(d => d.es_nuevo == 1)
  if (soloSinMatch.value) lista = lista.filter(d => !d.id_empleado)
  return lista
})

const mostrarConfirmarCancelar = ref(false)
const motivoCancelar = ref('')
const cancelando = ref(false)

const exportando = ref(false)

async function exportarExcel() {
  exportando.value = true
  try {
    const response = await api.get(`/nomina-fatiga/${props.idNomina}/exportar-xlsx`, {
      responseType: 'blob',
    })
    const disposition = response.headers['content-disposition'] || ''
    const match = disposition.match(/filename="(.+)"/)
    const nombreArchivo = match ? match[1] : `nomina_${props.idNomina}.xlsx`

    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', nombreArchivo)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Error exportando:', err)
  } finally {
    exportando.value = false
  }
}

async function cancelarNomina() {
  cancelando.value = true
  try {
    await api.post(`/nomina-fatiga/${props.idNomina}/rechazar`, { comentario: motivoCancelar.value })
    mostrarConfirmarCancelar.value = false
    emit('actualizado')
    emit('cerrar')
  } catch (err) {
    console.error('Error cancelando:', err)
  } finally {
    cancelando.value = false
  }
}

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
    mostrarConfirmarAprobar.value = false
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
.mn-sub   { font-size:12px; color:var(--tx2); margin-top:4px; }
.mn-sub .grn { color:var(--grn); }

.mn-filtros {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-bottom: 0.5px solid var(--bdr);
  flex-wrap: wrap;
}

.mn-filtros-divider {
  width: 1px;
  height: 22px;
  background: var(--bdr2);
  margin: 0 4px;
}

.mn-chips-group {
  display: flex;
  gap: 8px;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-top: 0.5px solid var(--bdr);
  background: var(--bg2);
}

.mn-footer-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.badge-estatus {
  font-size: 10px; padding: 2px 8px; border-radius: 20px; font-weight: 600;
  text-transform: uppercase; margin-left: 6px;
}
.badge-borrador   { background: var(--bg3); color: var(--tx2); }
.badge-aprobada   { background: rgba(34,201,122,.15); color: var(--grn); }
.badge-rechazada  { background: var(--red-dim); color: var(--red); }
.badge-dispersada { background: var(--acc-dim); color: var(--acc); }

.chip-check {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 14px 7px 9px; border-radius: 20px;
  border: 1px solid var(--bdr2); background: var(--bg2);
  color: var(--tx1); font-size: 12px; cursor: pointer;
  font-family: inherit; white-space: nowrap; transition: all .15s;
}
.chip-check:hover { border-color: var(--acc); color: var(--tx0); }
.chip-check.active { background: var(--acc-dim); border-color: var(--acc); color: var(--acc); font-weight: 500; }
.chip-check-box {
  width: 16px; height: 16px; border-radius: 5px;
  border: 1.5px solid var(--bdr2); background: var(--bg1);
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; flex-shrink: 0; transition: all .15s;
}
.chip-check.active .chip-check-box {
  background: var(--acc); border-color: var(--acc); color: #fff;
}

.btn-outline-danger {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 16px; border-radius: 9px;
  border: 1px solid var(--red); background: transparent;
  color: var(--red); font-size: 13px; font-weight: 500;
  cursor: pointer; font-family: inherit; transition: all .15s;
}
.btn-outline-danger:hover { background: var(--red-dim); }

.btn-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 16px; border-radius: 9px;
  border: 1px solid var(--bdr2); background: var(--bg1);
  color: var(--tx1); font-size: 13px; font-weight: 500;
  cursor: pointer; font-family: inherit; transition: all .15s;
}
.btn-ghost:hover { background: var(--bg3); color: var(--tx0); }

.btn-primary-lg {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 18px; border-radius: 9px; border: none;
  background: var(--acc); font-size: 13px; color: #fff;
  cursor: pointer; font-family: inherit; font-weight: 500;
  transition: background .15s;
}
.btn-primary-lg:hover:not(:disabled) { background: var(--acc2); }
.btn-primary-lg:disabled { opacity: .6; cursor: not-allowed; }
</style>