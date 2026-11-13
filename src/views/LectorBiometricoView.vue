<template>
  <div class="lb">
    <div class="view-header">
      <div>
        <h1 class="view-title">Lector biométrico</h1>
        <p class="view-sub">Importa el CSV del lector, asigna a cada empleado su número de biométrico y consulta los movimientos del día.</p>
      </div>
      <div class="tabs-wrap">
        <button class="tab-btn" :class="{ active: tab === 'movimientos' }" @click="tab = 'movimientos'"><i class="ti ti-list-details"></i> Movimientos</button>
        <button class="tab-btn" :class="{ active: tab === 'asignacion' }" @click="abrirAsignacion">
          <i class="ti ti-user-check"></i> Asignación
          <span v-if="sinAsignar" class="tab-count">{{ sinAsignar }}</span>
        </button>
        <button class="tab-btn" :class="{ active: tab === 'importar' }" @click="tab = 'importar'"><i class="ti ti-upload"></i> Importar</button>
      </div>
    </div>

    <div class="kpis" v-if="resumen">
      <div class="kpi"><span class="kpi-n">{{ num(resumen.totales.marcaciones) }}</span><span class="kpi-l">Marcaciones</span></div>
      <div class="kpi info"><span class="kpi-n">{{ num(resumen.totales.personas) }}</span><span class="kpi-l">Números distintos</span></div>
      <div class="kpi ok"><span class="kpi-n">{{ num(resumen.totales.asignadas) }}</span><span class="kpi-l">Asignados a un empleado</span></div>
      <div class="kpi warn"><span class="kpi-n">{{ num(sinAsignar) }}</span><span class="kpi-l">Sin asignar</span></div>
      <div class="kpi bad"><span class="kpi-n">{{ num(resumen.totales.no_reconocidas) }}</span><span class="kpi-l">Rostros no reconocidos</span></div>
      <div class="kpi mute"><span class="kpi-n kpi-sm">{{ rango }}</span><span class="kpi-l">Periodo cargado</span></div>
    </div>

    <p v-if="error" class="aviso"><i class="ti ti-alert-triangle"></i> {{ error }}</p>

    <!-- ═════════ MOVIMIENTOS ═════════ -->
    <div class="sec" v-show="tab === 'movimientos'">
      <div class="toolbar">
        <div class="fecha-nav">
          <button class="btn-sm" :disabled="!fechaAnterior" @click="irFecha(fechaAnterior)" title="Día anterior"><i class="ti ti-chevron-left"></i></button>
          <input type="date" class="inp" v-model="fecha" @change="cargarMovimientos" />
          <button class="btn-sm" :disabled="!fechaSiguiente" @click="irFecha(fechaSiguiente)" title="Día siguiente"><i class="ti ti-chevron-right"></i></button>
          <span class="muted-txt" v-if="fecha">{{ diaTexto }}</span>
        </div>
        <div class="filtros">
          <input class="inp" v-model="qMov" placeholder="Buscar nombre, No. empleado o biométrico" @input="debounce(cargarMovimientos)" />
          <label class="chk"><input type="checkbox" v-model="soloSinAsignar" @change="cargarMovimientos" /> Solo sin asignar</label>
        </div>
      </div>

      <div v-if="cargandoMov" class="skeleton-wrap"><div class="skeleton-row" v-for="i in 5" :key="i"></div></div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Biométrico</th><th>Empleado</th><th>Marcaciones del día</th>
              <th style="text-align:center">1ª</th><th style="text-align:center">Última</th>
              <th style="text-align:center">App (entrada / salida)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!movs.length"><td colspan="6" class="empty-row">{{ resumen?.totales?.marcaciones ? 'Sin movimientos ese día' : 'Aún no hay datos: importa el CSV en la pestaña Importar' }}</td></tr>
            <tr v-for="m in movs" :key="m.id_biometrico + '-' + (m.id_empleado || 0)" :class="{ nr: !m.reconocido }">
              <td class="mono">{{ m.reconocido ? m.id_biometrico : '—' }}</td>
              <td>
                <template v-if="!m.reconocido"><span class="pill bad">Rostro no reconocido</span></template>
                <template v-else-if="m.id_empleado">
                  <div class="strong">{{ m.empleado }}</div>
                  <div class="sub">No. {{ m.numero }} · lector: {{ m.nombre_lector }}</div>
                </template>
                <template v-else>
                  <div class="strong">{{ m.nombre_lector }}</div>
                  <span class="pill warn">Sin asignar</span>
                </template>
              </td>
              <td>
                <span v-for="h in m.horas" :key="h" class="hora">{{ h.slice(0, 8) }}</span>
                <span class="sub" style="margin-left:4px">({{ m.marcaciones }})</span>
              </td>
              <td style="text-align:center" class="mono">{{ m.primera ? m.primera.slice(0, 5) : '—' }}</td>
              <td style="text-align:center" class="mono">{{ m.ultima && m.marcaciones > 1 ? m.ultima.slice(0, 5) : '—' }}</td>
              <td style="text-align:center">
                <template v-if="m.id_empleado">
                  <span class="mono">{{ m.app_entrada ? m.app_entrada.slice(0, 5) : '—' }}</span> /
                  <span class="mono">{{ m.app_salida ? m.app_salida.slice(0, 5) : '—' }}</span>
                </template>
                <span v-else class="muted-txt">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="ayuda">Cada fila es una persona; las horas son todas las veces que pasó por el lector ese día. La columna <b>App</b> muestra su primera entrada y última salida registradas en la app para comparar (solo si ya tiene su número asignado).</p>
    </div>

    <!-- ═════════ ASIGNACIÓN ═════════ -->
    <div v-show="tab === 'asignacion'" class="col">
      <div class="sec">
        <div class="sec-hdr"><i class="ti ti-file-spreadsheet"></i><span>Asignar con un archivo</span></div>
        <div class="pad">
          <p class="muted-txt">Dos columnas por fila: <b>No. de empleado</b> y <b>número del biométrico</b> (con o sin encabezado). Acepta CSV o texto separado por coma, punto y coma o tabulador. Puedes pegar el contenido o subir el archivo.</p>
          <textarea class="area" rows="5" v-model="textoMasivo" spellcheck="false" placeholder="000178,24970157&#10;000245,24970353"></textarea>
          <div class="fila-btn">
            <label class="btn-sm"><i class="ti ti-upload"></i> Subir archivo CSV
              <input type="file" accept=".csv,.txt,text/csv,text/plain" hidden @change="leerArchivoMasivo" />
            </label>
            <span class="muted-txt">{{ filasMasivo.length }} fila(s) detectada(s)</span>
            <button class="btn-sm main" :disabled="!filasMasivo.length || asignandoMasivo" @click="aplicarMasivo">
              <i class="ti ti-check"></i> {{ asignandoMasivo ? 'Asignando…' : 'Aplicar asignación' }}
            </button>
          </div>
          <div v-if="resMasivo" class="resultado" :class="{ ok: !resMasivo.total_errores }">
            <b>{{ resMasivo.asignados }}</b> asignado(s)<span v-if="resMasivo.total_errores"> · <b>{{ resMasivo.total_errores }}</b> con problema</span>
            <ul v-if="resMasivo.errores.length"><li v-for="(e, i) in resMasivo.errores" :key="i">{{ e }}</li></ul>
          </div>
        </div>
      </div>

      <div class="sec">
        <div class="toolbar">
          <div class="filtros">
            <input class="inp" v-model="qPer" placeholder="Buscar nombre del lector o empleado" @input="debounce(cargarPersonas)" />
            <label class="chk"><input type="checkbox" v-model="perSinAsignar" @change="cargarPersonas" /> Solo sin asignar</label>
          </div>
          <span class="muted-txt">{{ personas.length }} número(s)</span>
        </div>
        <div v-if="cargandoPer" class="skeleton-wrap"><div class="skeleton-row" v-for="i in 5" :key="i"></div></div>
        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr><th>Biométrico</th><th>Nombre en el lector</th><th style="text-align:center">Marcaciones</th><th>Empleado asignado</th><th style="width:210px"></th></tr>
            </thead>
            <tbody>
              <tr v-if="!personas.length"><td colspan="5" class="empty-row">Sin resultados</td></tr>
              <template v-for="p in personas" :key="p.id_biometrico">
                <tr>
                  <td class="mono">{{ p.id_biometrico }}</td>
                  <td><div class="strong">{{ p.nombre_lector }}</div><div class="sub">{{ p.desde }} → {{ p.hasta }}</div></td>
                  <td style="text-align:center">{{ num(p.marcaciones) }}</td>
                  <td>
                    <template v-if="p.id_empleado"><div class="strong">{{ p.empleado }}</div><div class="sub">No. {{ p.numero }}</div></template>
                    <span v-else class="pill warn">Sin asignar</span>
                  </td>
                  <td style="text-align:right">
                    <button class="btn-sm" @click="abrirBuscador(p)"><i class="ti" :class="p.id_empleado ? 'ti-replace' : 'ti-user-plus'"></i> {{ p.id_empleado ? 'Cambiar' : 'Asignar' }}</button>
                    <button v-if="p.id_empleado" class="btn-sm danger" @click="quitar(p)" title="Quitar asignación"><i class="ti ti-unlink"></i></button>
                  </td>
                </tr>
                <tr v-if="editando === p.id_biometrico" class="fila-busca">
                  <td colspan="5">
                    <div class="busca">
                      <i class="ti ti-search"></i>
                      <input class="inp" v-model="qEmp" ref="inputEmp" placeholder="Número de empleado, nombre o CURP…" @input="buscarEmpleado" autocomplete="off" />
                      <button class="btn-sm" @click="editando = null">Cancelar</button>
                    </div>
                    <div v-if="qEmp.trim().length >= 2" class="lista">
                      <div v-if="buscandoEmp" class="item muted">Buscando…</div>
                      <div v-else-if="!resEmp.length" class="item muted">Sin resultados</div>
                      <button v-for="r in resEmp" :key="r.id" class="item" @click="asignar(p, r)">
                        <span><b>{{ String(r.id).padStart(6, '0') }}</b> · {{ r.nombre }}</span>
                        <small v-if="r.id_biometrico && r.id_biometrico !== p.id_biometrico" class="warn">ya tiene el biométrico {{ r.id_biometrico }} (se reemplaza)</small>
                        <small v-else>{{ r.curp }}</small>
                      </button>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ═════════ IMPORTAR ═════════ -->
    <div v-show="tab === 'importar'" class="col">
      <div class="sec">
        <div class="sec-hdr"><i class="ti ti-upload"></i><span>Importar CSV del lector</span></div>
        <div class="pad">
          <label class="drop" :class="{ over: arrastrando }" @dragover.prevent="arrastrando = true" @dragleave="arrastrando = false" @drop.prevent="soltar">
            <i class="ti ti-file-upload"></i>
            <strong>{{ archivo ? archivo.name : 'Arrastra el CSV aquí o haz clic para elegirlo' }}</strong>
            <small>{{ archivo ? (archivo.size / 1024).toFixed(0) + ' KB' : 'Formato: número, nombre, fecha, hora, tipo, método, resultado' }}</small>
            <input type="file" accept=".csv,.txt,text/csv,text/plain" hidden @change="elegirArchivo" />
          </label>
          <div class="fila-btn">
            <button class="btn-sm main" :disabled="!archivo || importando" @click="importar"><i class="ti ti-database-import"></i> {{ importando ? 'Importando…' : 'Importar' }}</button>
            <button class="btn-sm" v-if="archivo && !importando" @click="archivo = null; resImport = null">Quitar</button>
            <span class="muted-txt">Si subes el mismo archivo otra vez (o uno que se traslape), los repetidos se omiten solos.</span>
          </div>
          <div v-if="resImport" class="resultado ok">
            Importado: <b>{{ num(resImport.nuevas) }}</b> marcaciones nuevas, <b>{{ num(resImport.duplicadas) }}</b> ya existían<span v-if="resImport.invalidas">, <b>{{ resImport.invalidas }}</b> filas inválidas</span>.
            <div class="sub">Periodo {{ resImport.desde }} → {{ resImport.hasta }} · {{ resImport.personas }} personas · {{ resImport.sin_asignar }} sin asignar a un empleado</div>
          </div>
        </div>
      </div>

      <div class="sec" v-if="resumen?.lotes?.length">
        <div class="sec-hdr"><i class="ti ti-history"></i><span>Últimas importaciones</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Archivo</th><th>Periodo</th><th style="text-align:center">Filas</th><th style="text-align:center">Nuevas</th><th style="text-align:center">Repetidas</th><th>Cuándo</th></tr></thead>
            <tbody>
              <tr v-for="l in resumen.lotes" :key="l.id">
                <td class="strong">{{ l.archivo }}</td><td>{{ l.desde }} → {{ l.hasta }}</td>
                <td style="text-align:center">{{ num(l.filas) }}</td><td style="text-align:center">{{ num(l.nuevas) }}</td><td style="text-align:center">{{ num(l.duplicadas) }}</td>
                <td>{{ cuando(l.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { lectorBiometricoService as api } from '@/services/lectorBiometrico.service.js'
import { useDialog } from '@/composables/useDialog.js'

const dialog = useDialog()
const tab = ref('movimientos')
const resumen = ref(null)
const error = ref('')

const num = n => Number(n || 0).toLocaleString('es-MX')
const cuando = f => new Date(String(f).replace(' ', 'T')).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const sinAsignar = computed(() => resumen.value ? Math.max(0, resumen.value.totales.personas - resumen.value.totales.asignadas) : 0)
const rango = computed(() => resumen.value?.totales?.desde ? `${resumen.value.totales.desde.slice(5)} → ${resumen.value.totales.hasta.slice(5)}` : '—')

let timer = null
function debounce(fn) { clearTimeout(timer); timer = setTimeout(fn, 300) }
function msgErr(e, def) { return e?.response?.data?.message || def }

async function cargarResumen() {
  try {
    resumen.value = await api.resumen()
    error.value = ''
    if (!fecha.value && resumen.value.fechas.length) { fecha.value = resumen.value.fechas[0].fecha; cargarMovimientos() }
  } catch (e) { error.value = msgErr(e, 'No se pudo cargar el resumen') }
}

/* ── Movimientos ── */
const fecha = ref('')
const qMov = ref('')
const soloSinAsignar = ref(false)
const movs = ref([])
const cargandoMov = ref(false)

const fechasConDatos = computed(() => (resumen.value?.fechas || []).map(f => f.fecha).sort())
const fechaAnterior = computed(() => { const l = fechasConDatos.value.filter(f => f < fecha.value); return l.length ? l[l.length - 1] : '' })
const fechaSiguiente = computed(() => fechasConDatos.value.find(f => f > fecha.value) || '')
const diaTexto = computed(() => fecha.value ? new Date(fecha.value + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }) : '')
function irFecha(f) { fecha.value = f; cargarMovimientos() }

async function cargarMovimientos() {
  if (!fecha.value) return
  cargandoMov.value = true
  try { movs.value = await api.movimientos({ fecha: fecha.value, q: qMov.value.trim(), sin_asignar: soloSinAsignar.value ? 1 : 0 }) }
  catch (e) { error.value = msgErr(e, 'No se pudieron cargar los movimientos'); movs.value = [] }
  finally { cargandoMov.value = false }
}

/* ── Asignación ── */
const personas = ref([])
const qPer = ref('')
const perSinAsignar = ref(false)
const cargandoPer = ref(false)
const editando = ref(null)
const qEmp = ref('')
const resEmp = ref([])
const buscandoEmp = ref(false)
const inputEmp = ref(null)

function abrirAsignacion() { tab.value = 'asignacion'; cargarPersonas() }

async function cargarPersonas() {
  cargandoPer.value = true
  try { personas.value = await api.personas({ q: qPer.value.trim(), sin_asignar: perSinAsignar.value ? 1 : 0 }) }
  catch (e) { error.value = msgErr(e, 'No se pudo cargar la lista'); personas.value = [] }
  finally { cargandoPer.value = false }
}

function abrirBuscador(p) {
  editando.value = p.id_biometrico; qEmp.value = ''; resEmp.value = []
  nextTick(() => { const el = Array.isArray(inputEmp.value) ? inputEmp.value[0] : inputEmp.value; el?.focus() })
}
function buscarEmpleado() {
  clearTimeout(timer)
  if (qEmp.value.trim().length < 2) { resEmp.value = []; return }
  timer = setTimeout(async () => {
    buscandoEmp.value = true
    try { resEmp.value = await api.empleados(qEmp.value.trim()) } catch { resEmp.value = [] } finally { buscandoEmp.value = false }
  }, 300)
}
async function asignar(p, emp) {
  try {
    await api.asignar(p.id_biometrico, emp.id)
    editando.value = null
    await Promise.all([cargarPersonas(), cargarResumen()])
    if (fecha.value) cargarMovimientos()
  } catch (e) { error.value = msgErr(e, 'Error al asignar') }
}
async function quitar(p) {
  const ok = await dialog.confirmar({ titulo: 'Quitar asignación', mensaje: `El biométrico ${p.id_biometrico} dejará de estar ligado a ${p.empleado}.`, tipo: 'aviso', confirmText: 'Quitar' })
  if (!ok) return
  try { await api.asignar(p.id_biometrico, null); await Promise.all([cargarPersonas(), cargarResumen()]); if (fecha.value) cargarMovimientos() }
  catch (e) { error.value = msgErr(e, 'No se pudo quitar') }
}

/* ── Asignación por archivo ── */
const textoMasivo = ref('')
const asignandoMasivo = ref(false)
const resMasivo = ref(null)
const filasMasivo = computed(() => {
  const out = []
  for (const linea of textoMasivo.value.split(/\r?\n/)) {
    const c = linea.split(/[,;\t]/).map(x => x.trim().replace(/^"|"$/g, ''))
    if (c.length < 2) continue
    const emp = c[0].replace(/\D/g, ''), bio = c[1].replace(/\D/g, '')
    if (!emp || !bio) continue            // encabezados y líneas sin números se ignoran
    out.push({ id_empleado: emp, id_biometrico: bio })
  }
  return out
})
function leerArchivoMasivo(e) {
  const f = e.target.files?.[0]; if (!f) return
  const r = new FileReader()
  r.onload = () => { textoMasivo.value = String(r.result || '') }
  r.readAsText(f, 'utf-8')
  e.target.value = ''
}
async function aplicarMasivo() {
  const ok = await dialog.confirmar({ titulo: 'Asignar biométricos', mensaje: `Se asignarán ${filasMasivo.value.length} número(s) a sus empleados. Si un número o un empleado ya tenía otro, se reemplaza.`, tipo: 'aviso', confirmText: 'Aplicar' })
  if (!ok) return
  asignandoMasivo.value = true; resMasivo.value = null
  try {
    resMasivo.value = await api.asignarMasivo(filasMasivo.value)
    await Promise.all([cargarPersonas(), cargarResumen()])
    if (fecha.value) cargarMovimientos()
  } catch (e) { error.value = msgErr(e, 'No se pudo aplicar la asignación') }
  finally { asignandoMasivo.value = false }
}

/* ── Importar ── */
const archivo = ref(null)
const arrastrando = ref(false)
const importando = ref(false)
const resImport = ref(null)
function elegirArchivo(e) { archivo.value = e.target.files?.[0] || null; resImport.value = null }
function soltar(e) { arrastrando.value = false; archivo.value = e.dataTransfer?.files?.[0] || null; resImport.value = null }
async function importar() {
  if (!archivo.value) return
  importando.value = true; resImport.value = null; error.value = ''
  try {
    resImport.value = await api.importar(archivo.value)
    archivo.value = null
    await cargarResumen()
    if (resImport.value?.hasta) { fecha.value = resImport.value.hasta; cargarMovimientos() }
  } catch (e) { error.value = msgErr(e, 'No se pudo importar el archivo') }
  finally { importando.value = false }
}

onMounted(cargarResumen)
</script>

<style scoped>
.lb { display: flex; flex-direction: column; gap: 14px; }
.col { display: flex; flex-direction: column; gap: 14px; }
.view-header { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; justify-content: space-between; }
.view-title { font-size: 20px; font-weight: 600; color: var(--tx0); margin: 0; }
.view-sub { font-size: 12px; color: var(--tx2); margin: 2px 0 0; max-width: 560px; }
.tabs-wrap { display: flex; gap: 4px; background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 10px; padding: 4px; }
.tab-btn { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border: none; background: transparent; border-radius: 7px; font-size: 13px; color: var(--tx2); cursor: pointer; font-family: inherit; }
.tab-btn:hover { background: var(--bg2); color: var(--tx0); }
.tab-btn.active { background: var(--acc-dim); color: var(--acc); font-weight: 500; }
.tab-count { background: var(--amb); color: #fff; border-radius: 10px; font-size: 10px; padding: 1px 6px; }
.kpis { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; }
.kpi { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; }
.kpi-n { font-size: 22px; font-weight: 600; color: var(--tx0); } .kpi-sm { font-size: 15px; padding-top: 6px; } .kpi-l { font-size: 11px; color: var(--tx2); }
.kpi.ok .kpi-n { color: var(--grn); } .kpi.bad .kpi-n { color: var(--red); } .kpi.warn .kpi-n { color: var(--amb); } .kpi.info .kpi-n { color: var(--acc); } .kpi.mute .kpi-n { color: var(--tx1); }
.sec { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 12px; overflow: hidden; }
.sec-hdr { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 0.5px solid var(--bdr); font-size: 13px; font-weight: 600; color: var(--tx0); }
.pad { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.toolbar { display: flex; gap: 10px; padding: 12px 14px; align-items: center; flex-wrap: wrap; justify-content: space-between; border-bottom: 0.5px solid var(--bdr); }
.fecha-nav, .filtros { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.chk { font-size: 12px; color: var(--tx1); display: flex; align-items: center; gap: 5px; cursor: pointer; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 10px 12px; font-size: 11px; color: var(--tx3); font-weight: 500; border-bottom: 0.5px solid var(--bdr); }
td { padding: 10px 12px; color: var(--tx1); border-bottom: 0.5px solid var(--bdr); vertical-align: middle; }
tbody tr:hover { background: var(--bg2); } tr.nr td { opacity: .7; }
.strong { color: var(--tx0); font-weight: 500; } .sub { font-size: 11px; color: var(--tx3); margin-top: 2px; }
.mono { font-family: ui-monospace, monospace; }
.hora { display: inline-block; font-family: ui-monospace, monospace; font-size: 11.5px; background: var(--bg3); color: var(--tx1); padding: 2px 7px; border-radius: 6px; margin: 1px 3px 1px 0; }
.empty-row { text-align: center; color: var(--tx3); padding: 36px; }
.pill { display: inline-block; font-size: 11px; font-weight: 500; padding: 3px 9px; border-radius: 20px; }
.pill.warn { background: var(--amb-dim); color: var(--amb); } .pill.bad { background: var(--red-dim); color: var(--red); }
.inp { background: var(--bg2); border: 0.5px solid var(--bdr2); border-radius: 8px; padding: 7px 9px; font-size: 13px; color: var(--tx0); outline: none; font-family: inherit; min-width: 190px; }
.area { width: 100%; box-sizing: border-box; background: var(--bg2); border: 0.5px solid var(--bdr2); color: var(--tx0); border-radius: 10px; padding: 10px; font-family: ui-monospace, monospace; font-size: 12.5px; resize: vertical; }
.btn-sm { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 8px; border: 0.5px solid var(--bdr2); background: transparent; font-size: 12px; color: var(--tx1); cursor: pointer; font-family: inherit; }
.btn-sm:hover:not(:disabled) { background: var(--bg3); color: var(--tx0); } .btn-sm:disabled { opacity: .5; cursor: not-allowed; }
.btn-sm.main { background: var(--acc); border-color: var(--acc); color: #fff; } .btn-sm.danger:hover { color: var(--red); }
.fila-btn { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.muted-txt { font-size: 12px; color: var(--tx3); margin: 0; }
.aviso { color: var(--amb); font-size: 12px; margin: 0; }
.ayuda { padding: 12px 16px; font-size: 12px; line-height: 1.55; color: var(--tx2); border-top: 0.5px solid var(--bdr); margin: 0; }
.resultado { font-size: 13px; color: var(--tx1); background: var(--amb-dim); border-radius: 10px; padding: 10px 12px; } .resultado.ok { background: var(--grn-dim); }
.resultado ul { margin: 6px 0 0; padding-left: 18px; font-size: 12px; color: var(--tx1); }
.drop { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 28px; border: 1.5px dashed var(--bdr2); border-radius: 12px; cursor: pointer; text-align: center; color: var(--tx1); }
.drop i { font-size: 30px; color: var(--acc); } .drop small { color: var(--tx3); } .drop.over, .drop:hover { border-color: var(--acc); background: var(--bg2); }
.fila-busca td { background: var(--bg2); }
.busca { display: flex; align-items: center; gap: 8px; } .busca .inp { flex: 1; }
.lista { margin-top: 8px; border: 0.5px solid var(--bdr2); border-radius: 9px; background: var(--bg1); max-height: 240px; overflow: auto; }
.item { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; width: 100%; text-align: left; padding: 9px 12px; background: none; border: none; border-bottom: 0.5px solid var(--bdr2); color: var(--tx0); font-size: 13px; cursor: pointer; font-family: inherit; }
.item:hover { background: var(--bg2); } .item.muted { color: var(--tx2); cursor: default; } .item small { color: var(--tx2); font-size: 11px; } .item small.warn { color: var(--amb); }
.skeleton-wrap { padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.skeleton-row { height: 36px; background: var(--bg2); border-radius: 8px; animation: pulse 1.5s ease-in-out infinite; }
@media (max-width: 900px) { .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
