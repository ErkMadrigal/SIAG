<!--
  ════════════════════════════════════════════════════════════
  NominaFatigaPanel.vue
  Sub-vista de "Pre-nómina" — calcula el pago a partir de un
  Excel de "FATIGA" subido por la zona (captura manual), en
  lugar de calcular con datos biométricos.

  Se integra como un toggle dentro de PreNomina.vue:
  <NominaFatigaPanel v-if="modo === 'fatiga'" />

  Sigue el mismo sistema de diseño (variables CSS, Tabler icons,
  estructura .sec/.sec-hdr/.sec-body, modales con Teleport).
  ════════════════════════════════════════════════════════════
-->
<template>
  <div class="fatiga-view">

    <!-- Zona de subida — drag & drop -->
    <div class="sec">
      <div class="sec-hdr">
        <i class="ti ti-file-spreadsheet" aria-hidden="true"></i>
        <span>Subir fatiga (Excel)</span>
      </div>
      <div class="sec-body">

        <div
          class="dropzone"
          :class="{ 'is-dragging': isDragging, 'has-file': !!archivo }"
          @dragover.prevent="onDragOver"
          @dragleave.prevent="onDragLeave"
          @drop.prevent="onDrop"
          @click="abrirSelector"
        >
          <input
            ref="inputFile"
            type="file"
            accept=".xlsx,.xls"
            class="hidden-input"
            @change="onFileSelected"
          />

          <template v-if="!archivo">
            <div class="dz-icon">
              <i class="ti ti-cloud-upload" aria-hidden="true"></i>
            </div>
            <p class="dz-title">Arrastra el Excel de fatiga aquí</p>
            <p class="dz-sub">o haz clic para seleccionar — formatos .xlsx, .xls</p>
          </template>

          <template v-else>
            <div class="dz-icon ok">
              <i class="ti ti-file-check" aria-hidden="true"></i>
            </div>
            <p class="dz-title">{{ archivo.name }}</p>
            <p class="dz-sub">{{ formatFileSize(archivo.size) }} — clic para cambiar</p>
            <button class="dz-clear" @click.stop="limpiarArchivo" title="Quitar archivo">
              <i class="ti ti-x" aria-hidden="true"></i>
            </button>
          </template>
        </div>

        <div class="filtros-grid filtros-grid--3">
          <div class="field">
            <label>Nombre de la nómina <span class="req">*</span></label>
            <input type="text" v-model="nombre" placeholder="Ej. IMSS Bienestar 28 al 12 de junio" />
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

        <div v-if="errorMsg" class="alert-warn">
          <i class="ti ti-alert-circle" aria-hidden="true"></i>
          {{ errorMsg }}
        </div>

        <div class="filtros-actions">
          <button
            class="btn-primary-lg"
            :disabled="loading || !archivo || !nombre.trim()"
            @click="procesar"
          >
            <i class="ti ti-loader-2 spin" v-if="loading" aria-hidden="true"></i>
            <i class="ti ti-calculator" v-else aria-hidden="true"></i>
            {{ loading ? 'Procesando…' : 'Procesar nómina' }}
          </button>
        </div>

      </div>
    </div>

    <!-- Listado de nóminas procesadas -->
    <div class="sec">
      <div class="sec-hdr">
        <i class="ti ti-history" aria-hidden="true"></i>
        <span>Nóminas procesadas</span>
        <span class="item-count">{{ nominas.length }}</span>
      </div>

      <div class="table-wrap" v-if="nominas.length">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th style="width:110px">Periodo</th>
              <th style="width:90px;text-align:center">Empleados</th>
              <th style="width:120px;text-align:right">Total a pagar</th>
              <th style="width:110px">Estatus</th>
              <th style="width:140px">Creada</th>
              <th style="width:110px;text-align:center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="n in nominas" :key="n.id">
              <td style="font-weight:500">{{ n.nombre }}</td>
              <td style="color:var(--tx2);font-size:11px">
                {{ n.periodo_inicio || '—' }} → {{ n.periodo_fin || '—' }}
              </td>
              <td style="text-align:center">{{ n.total_empleados }}</td>
              <td style="text-align:right;font-weight:600;color:var(--grn)" class="mono">
                {{ formatMoney(n.total_pagar) }}
              </td>
              <td>
                <span class="estatus-badge" :class="n.estatus">{{ estatusLabel(n.estatus) }}</span>
              </td>
              <td style="color:var(--tx2);font-size:11px">{{ formatFecha(n.created_at) }}</td>
              <td style="text-align:center">
                <button class="icon-btn" @click="verDetalle(n)" title="Ver detalle">
                  <i class="ti ti-eye" aria-hidden="true"></i>
                </button>
                <button
                  v-if="n.estatus === 'aprobada'"
                  class="icon-btn"
                  @click="descargarDispersion(n)"
                  title="Descargar dispersión"
                >
                  <i class="ti ti-download" aria-hidden="true"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-state">
        <i class="ti ti-file-off" aria-hidden="true"></i>
        <p>Aún no has procesado ninguna nómina de fatiga</p>
      </div>
    </div>

    <!-- MODAL DETALLE -->
    <Teleport to="body">
      <div v-if="modalNomina" class="modal-overlay" @click.self="cerrarModal">
        <div class="modal-box xl">
          <div class="modal-hdr">
            <div class="modal-icon"><i class="ti ti-report-money" aria-hidden="true"></i></div>
            <div>
              <p class="modal-title">{{ modalNomina.nombre }}</p>
              <p class="modal-sub">
                {{ modalNomina.total_empleados }} empleados ·
                {{ formatMoney(modalNomina.total_pagar) }} total
              </p>
            </div>
            <button class="modal-close" @click="cerrarModal"><i class="ti ti-x" aria-hidden="true"></i></button>
          </div>

          <div class="modal-resumen">
            <div class="mr-item blue">
              <span class="mr-num">{{ modalDetalle.length }}</span>
              <span>Empleados</span>
            </div>
            <div class="mr-item red">
              <span class="mr-num">{{ sinMatchCount }}</span>
              <span>Sin match CURP</span>
            </div>
            <div class="mr-item total-item">
              <span class="mr-num" style="font-size:17px">{{ formatMoney(modalNomina.total_pagar) }}</span>
              <span>Total</span>
            </div>
          </div>

          <div class="modal-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Empleado (Excel)</th>
                  <th style="width:70px;text-align:center">Match</th>
                  <th style="width:100px">Zona</th>
                  <th style="width:60px">Turno</th>
                  <th style="width:90px;text-align:right">Sueldo</th>
                  <th style="width:90px;text-align:right">Extra</th>
                  <th style="width:90px;text-align:right">Adicional</th>
                  <th style="width:90px;text-align:right">Desc.Faltas</th>
                  <th style="width:90px;text-align:right">Desc.Incid.</th>
                  <th style="width:90px;text-align:right">Otros desc.</th>
                  <th style="width:100px;text-align:right">Total</th>
                  <th style="width:50px;text-align:center">✎</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="d in modalDetalle" :key="d.id" :class="{ 'row-falta': !d.id_empleado }">
                  <td style="font-weight:500">{{ d.nombre_excel }}</td>
                  <td style="text-align:center">
                    <i v-if="d.id_empleado" class="ti ti-check" style="color:var(--grn)"></i>
                    <i v-else class="ti ti-alert-triangle" style="color:var(--red)" title="No se encontró el empleado en el sistema por CURP"></i>
                  </td>
                  <td style="color:var(--tx2);font-size:11px">{{ d.zona || '—' }}</td>
                  <td style="color:var(--tx2);font-size:11px">{{ d.turno || '—' }}</td>
                  <td style="text-align:right" class="mono">{{ formatMoney(d.sueldo_semanal) }}</td>
                  <td style="text-align:right;color:var(--grn)" class="mono">
                    {{ d.tiempo_extra > 0 ? '+' + formatMoney(d.tiempo_extra) : '—' }}
                  </td>
                  <td style="text-align:right" class="mono">
                    <input
                      type="number"
                      class="inline-edit"
                      v-model.number="d.adicional"
                      @change="editarDetalle(d)"
                      step="0.01"
                    />
                  </td>
                  <td style="text-align:right;color:var(--red)" class="mono">
                    {{ d.descuento_faltas > 0 ? '-' + formatMoney(d.descuento_faltas) : '—' }}
                  </td>
                  <td style="text-align:right;color:var(--red)" class="mono">
                    {{ d.descuento_incidencias > 0 ? '-' + formatMoney(d.descuento_incidencias) : '—' }}
                  </td>
                  <td style="text-align:right" class="mono">
                    <input
                      type="number"
                      class="inline-edit"
                      v-model.number="d.otros_descuentos"
                      @change="editarDetalle(d)"
                      step="0.01"
                    />
                  </td>
                  <td style="text-align:right;font-weight:700;color:var(--grn)" class="mono">
                    {{ formatMoney(d.total) }}
                  </td>
                  <td style="text-align:center">
                    <i v-if="d.editado_manualmente" class="ti ti-pencil" style="color:var(--amb)" title="Editado manualmente"></i>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="modal-footer modal-footer--split">
            <div class="footer-left">
              <span v-if="modalNomina.estatus === 'rechazada'" class="estatus-badge rechazada">
                Rechazada: {{ modalNomina.comentario_revision }}
              </span>
            </div>
            <div class="footer-actions">
              <template v-if="modalNomina.estatus === 'borrador' || modalNomina.estatus === 'en_revision'">
                <button class="btn-sm danger" @click="rechazar">
                  <i class="ti ti-x" aria-hidden="true"></i> Rechazar
                </button>
                <button class="btn-primary-lg" @click="aprobar">
                  <i class="ti ti-check" aria-hidden="true"></i> Aprobar nómina
                </button>
              </template>
              <button v-else class="btn-sm" @click="cerrarModal">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUiStore } from '@/stores/ui.js'
import { nominaFatigaService } from '@/services/nominaFatiga.service.js'

const ui = useUiStore()

const archivo       = ref(null)
const isDragging     = ref(false)
const inputFile      = ref(null)
const nombre         = ref('')
const periodoInicio  = ref('')
const periodoFin     = ref('')
const loading        = ref(false)
const errorMsg       = ref('')

const nominas        = ref([])
const modalNomina    = ref(null)
const modalDetalle   = ref([])

onMounted(async () => {
  await cargarNominas()
})

/* ── Drag & drop ──────────────────────────────────────── */
function onDragOver()  { isDragging.value = true }
function onDragLeave() { isDragging.value = false }

function onDrop(e) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) asignarArchivo(file)
}

function abrirSelector() {
  inputFile.value?.click()
}

function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (file) asignarArchivo(file)
}

function asignarArchivo(file) {
  const extOk = /\.(xlsx|xls)$/i.test(file.name)
  if (!extOk) {
    errorMsg.value = 'El archivo debe ser .xlsx o .xls'
    return
  }
  errorMsg.value = ''
  archivo.value  = file
  if (!nombre.value) {
    nombre.value = file.name.replace(/\.(xlsx|xls)$/i, '')
  }
}

function limpiarArchivo() {
  archivo.value = null
  if (inputFile.value) inputFile.value.value = ''
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

/* ── Procesar ──────────────────────────────────────────── */
async function procesar() {
  if (!archivo.value || !nombre.value.trim()) return

  loading.value  = true
  errorMsg.value = ''

  try {
    const formData = new FormData()
    formData.append('archivo', archivo.value)
    formData.append('nombre', nombre.value.trim())
    if (periodoInicio.value) formData.append('periodo_inicio', periodoInicio.value)
    if (periodoFin.value)    formData.append('periodo_fin', periodoFin.value)

    const { data } = await nominaFatigaService.procesar(formData)

    if (data.status === 'ok') {
      limpiarArchivo()
      nombre.value = ''
      periodoInicio.value = ''
      periodoFin.value = ''
      await cargarNominas()

      if (data.data.sin_match_curp > 0) {
        errorMsg.value = `Procesado con ${data.data.sin_match_curp} empleado(s) sin coincidencia de CURP — revísalos en el detalle.`
      }
    }
  } catch (err) {
    errorMsg.value = err?.response?.data?.message || 'Error al procesar el archivo'
  } finally {
    loading.value = false
  }
}

/* ── Listado ───────────────────────────────────────────── */
async function cargarNominas() {
  try {
    const { data } = await nominaFatigaService.listar()
    nominas.value = data.data || []
  } catch (err) {
    console.error(err)
  }
}

/* ── Detalle / modal ───────────────────────────────────── */
const sinMatchCount = computed(() =>
  modalDetalle.value.filter(d => !d.id_empleado).length
)

async function verDetalle(nomina) {
  try {
    const { data } = await nominaFatigaService.detalle(nomina.id)
    modalNomina.value  = data.data.nomina
    modalDetalle.value = data.data.detalle
  } catch (err) {
    console.error(err)
  }
}

function cerrarModal() {
  modalNomina.value  = null
  modalDetalle.value = []
}

async function editarDetalle(d) {
  try {
    await nominaFatigaService.actualizarDetalle(modalNomina.value.id, d.id, {
      adicional: d.adicional || 0,
      otros_descuentos: d.otros_descuentos || 0,
    })
    // Refresca el detalle para traer el total recalculado
    const { data } = await nominaFatigaService.detalle(modalNomina.value.id)
    modalNomina.value  = data.data.nomina
    modalDetalle.value = data.data.detalle
    await cargarNominas()
  } catch (err) {
    console.error(err)
  }
}

async function aprobar() {
  if (!modalNomina.value) return
  try {
    await nominaFatigaService.aprobar(modalNomina.value.id)
    cerrarModal()
    await cargarNominas()
  } catch (err) {
    console.error(err)
  }
}

async function rechazar() {
  if (!modalNomina.value) return
  const comentario = prompt('Motivo del rechazo:')
  if (comentario === null) return
  try {
    await nominaFatigaService.rechazar(modalNomina.value.id, comentario)
    cerrarModal()
    await cargarNominas()
  } catch (err) {
    console.error(err)
  }
}

async function descargarDispersion(nomina) {
  try {
    const response = await nominaFatigaService.dispersion(nomina.id)
    const blob = new Blob([response.data], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `dispersion_${nomina.nombre}.csv`.replace(/\s+/g, '_')
    a.click()
    URL.revokeObjectURL(url)
    await cargarNominas()
  } catch (err) {
    console.error(err)
  }
}

/* ── Helpers ───────────────────────────────────────────── */
function estatusLabel(estatus) {
  const map = {
    borrador: 'Borrador',
    en_revision: 'En revisión',
    aprobada: 'Aprobada',
    rechazada: 'Rechazada',
    dispersada: 'Dispersada',
  }
  return map[estatus] || estatus
}

function formatMoney(v) {
  return Number(v || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function formatFecha(v) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.fatiga-view { display:flex; flex-direction:column; gap:14px; }

.sec { background:var(--bg1); border:0.5px solid var(--bdr); border-radius:12px; overflow:hidden; }
.sec-hdr {
  display:flex; align-items:center; gap:8px;
  padding:12px 16px; border-bottom:0.5px solid var(--bdr);
  font-size:13px; font-weight:500; color:var(--tx0); flex-wrap:wrap;
}
.sec-hdr i  { font-size:16px; color:var(--acc); }
.sec-body   { padding:16px; display:flex; flex-direction:column; gap:14px; }

/* ── Dropzone ──────────────────────────────────────────── */
.dropzone {
  position:relative;
  border:2px dashed var(--bdr2);
  border-radius:12px;
  padding:36px 20px;
  display:flex; flex-direction:column; align-items:center;
  gap:6px; text-align:center;
  cursor:pointer; transition:all .15s;
  background:var(--bg2);
}
.dropzone:hover         { border-color:var(--acc); background:var(--acc-dim); }
.dropzone.is-dragging   { border-color:var(--acc); background:var(--acc-dim); transform:scale(1.01); }
.dropzone.has-file      { border-color:var(--grn); background:rgba(34,201,122,.06); cursor:default; }
.hidden-input           { display:none; }

.dz-icon {
  width:52px; height:52px; border-radius:14px;
  background:var(--acc-dim); color:var(--acc);
  display:flex; align-items:center; justify-content:center;
  font-size:26px; margin-bottom:4px;
}
.dz-icon.ok { background:rgba(34,201,122,.12); color:var(--grn); }
.dz-title   { font-size:14px; font-weight:600; color:var(--tx0); }
.dz-sub     { font-size:12px; color:var(--tx2); }
.dz-clear {
  position:absolute; top:10px; right:10px;
  width:26px; height:26px; border-radius:6px;
  background:var(--bg3); border:0.5px solid var(--bdr);
  color:var(--tx2); cursor:pointer;
  display:flex; align-items:center; justify-content:center; font-size:13px;
}
.dz-clear:hover { background:var(--red-dim); color:var(--red); }

/* ── Filtros / fields ──────────────────────────────────── */
.filtros-grid {
  display:grid;
  grid-template-columns: 1fr 140px 140px;
  gap:12px; align-items:start;
}
.field { display:flex; flex-direction:column; gap:5px; }
label  { font-size:12px; font-weight:500; color:var(--tx1); }
.req   { color:var(--red); }
input[type="text"], input[type="date"], input[type="number"] {
  background:var(--bg2); border:0.5px solid var(--bdr2);
  border-radius:8px; padding:8px 10px;
  font-size:13px; color:var(--tx0); outline:none;
  font-family:inherit; transition:border .15s; width:100%;
}
input:focus { border-color:var(--acc); }

.filtros-actions { display:flex; justify-content:flex-end; gap:8px; }

.alert-warn {
  display:flex; align-items:center; gap:8px;
  padding:10px 14px; border-radius:8px;
  background:var(--amb-dim); border:0.5px solid var(--amb); color:var(--amb); font-size:13px;
}

/* ── Tabla ─────────────────────────────────────────────── */
.table-wrap { overflow-x:auto; }
table { width:100%; border-collapse:collapse; }
th {
  padding:8px 12px; text-align:left;
  font-size:10px; font-weight:500; color:var(--tx2);
  text-transform:uppercase; letter-spacing:.7px;
  border-bottom:0.5px solid var(--bdr); white-space:nowrap;
  position:sticky; top:0; background:var(--bg1); z-index:1;
}
td { padding:9px 12px; font-size:12px; border-bottom:0.5px solid var(--bdr); color:var(--tx0); }
tbody tr { transition:background .1s; }
tbody tr:hover td { background:var(--bg2); }
tbody tr:last-child td { border-bottom:none; }
.mono { font-family:monospace; font-size:11px; }
.row-falta td { background:rgba(240,84,84,.05); }

.item-count { font-size:11px; padding:2px 7px; border-radius:20px; background:var(--acc-dim); color:var(--acc); font-weight:500; }
.icon-btn {
  width:26px; height:26px; border-radius:6px;
  background:var(--bg2); border:0.5px solid var(--bdr);
  display:inline-flex; align-items:center; justify-content:center;
  cursor:pointer; color:var(--acc); font-size:13px; transition:all .15s; margin:0 3px;
}
.icon-btn:hover { background:var(--bg3); }

.inline-edit {
  width:80px; text-align:right;
  background:var(--bg3); border:0.5px solid var(--bdr2);
  border-radius:6px; padding:4px 6px;
  font-size:11px; font-family:monospace; color:var(--tx0);
}
.inline-edit:focus { border-color:var(--acc); }

.estatus-badge {
  font-size:10px; padding:3px 9px; border-radius:20px;
  font-weight:600; text-transform:uppercase; letter-spacing:.4px;
}
.estatus-badge.borrador    { background:var(--bg3);      color:var(--tx2); }
.estatus-badge.en_revision { background:var(--amb-dim);  color:var(--amb); }
.estatus-badge.aprobada    { background:rgba(34,201,122,.12); color:var(--grn); }
.estatus-badge.rechazada   { background:var(--red-dim);  color:var(--red); }
.estatus-badge.dispersada  { background:var(--acc-dim);  color:var(--acc); }

.empty-state {
  display:flex; flex-direction:column; align-items:center; gap:8px;
  padding:40px 20px; color:var(--tx3);
}
.empty-state i { font-size:32px; }
.empty-state p { font-size:13px; }

/* ── Modal ─────────────────────────────────────────────── */
.modal-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,.6);
  z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px;
}
.modal-box {
  background:var(--bg1); border:0.5px solid var(--bdr2);
  border-radius:16px; width:100%; max-width:480px;
  display:flex; flex-direction:column; overflow:hidden; max-height:90vh;
}
.modal-box.xl { max-width:1100px; }
.modal-hdr {
  display:flex; align-items:center; gap:12px;
  padding:14px 18px; border-bottom:0.5px solid var(--bdr); flex-shrink:0;
}
.modal-icon {
  width:34px; height:34px; border-radius:10px;
  background:var(--acc-dim); color:var(--acc);
  display:flex; align-items:center; justify-content:center; font-size:17px; flex-shrink:0;
}
.modal-title { font-size:14px; font-weight:600; color:var(--tx0); }
.modal-sub   { font-size:11px; color:var(--tx2); margin-top:2px; }
.modal-close {
  margin-left:auto; width:28px; height:28px; border-radius:6px;
  background:var(--bg3); border:none; cursor:pointer;
  color:var(--tx2); font-size:16px;
  display:flex; align-items:center; justify-content:center;
}
.modal-resumen { display:flex; border-bottom:0.5px solid var(--bdr); flex-shrink:0; }
.mr-item {
  flex:1; display:flex; flex-direction:column;
  align-items:center; gap:3px; padding:10px;
  font-size:11px; color:var(--tx2); border-right:0.5px solid var(--bdr);
}
.mr-item:last-child { border-right:none; }
.mr-item.blue { color:var(--acc); }
.mr-item.red  { color:var(--red); }
.mr-item.total-item { background:var(--bg2); color:var(--grn); }
.mr-num { font-size:20px; font-weight:700; font-family:monospace; }
.modal-table-wrap { flex:1; overflow:auto; }
.modal-footer {
  padding:12px 18px; border-top:0.5px solid var(--bdr);
  display:flex; justify-content:flex-end; flex-shrink:0;
}
.modal-footer--split { justify-content:space-between; align-items:center; }
.footer-actions { display:flex; gap:8px; }

/* ── Botones ───────────────────────────────────────────── */
.btn-sm {
  display:inline-flex; align-items:center; gap:5px;
  padding:7px 14px; border-radius:8px;
  border:0.5px solid var(--bdr2); background:transparent;
  font-size:12px; color:var(--tx1); cursor:pointer; transition:all .15s; font-family:inherit;
}
.btn-sm:hover  { background:var(--bg3); }
.btn-sm.danger { color:var(--red); border-color:var(--red); }
.btn-sm.danger:hover { background:var(--red-dim); }

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

@media (max-width:900px) {
  .filtros-grid { grid-template-columns:1fr; }
}
</style>