<script setup>
import { useDialog } from '@/composables/useDialog.js'
const dialog = useDialog()
// Expediente digital (datos bancarios): sube un estado de cuenta (PDF o foto),
// extrae CLABE/titular, lo guarda en el servidor como evidencia y le pasa la
// CLABE al formulario del perfil.
import { ref, onMounted } from 'vue'
import { empleadosService } from '@/services/empleados.service.js'
import { catalogosService } from '@/services/catalogos.service.js'
import { extraerDatosEstadoCuenta, coincideTitular } from '@/composables/useExtraerEstadoCuenta.js'

const props = defineProps({
  idEmpleado:     { type: [Number, String], required: true },
  nombreEmpleado: { type: String, default: '' },
})
const emit = defineEmits(['usar-clabe'])

const docs      = ref([])
const cargando  = ref(false)
const abierto   = ref(false)
const fase      = ref('elegir')      // elegir | leyendo | resultado
const progreso  = ref('')
const error     = ref('')
const archivo   = ref(null)
const inputRef  = ref(null)
const datos     = ref({ clabe: null, nombre: null, banco: null, coincide: null })
const guardando = ref(false)

async function cargarDocs() {
  cargando.value = true
  try { docs.value = await empleadosService.getDocumentos(props.idEmpleado) }
  catch { docs.value = [] }
  finally { cargando.value = false }
}
onMounted(cargarDocs)

function abrirModal() {
  abierto.value = true; fase.value = 'elegir'; error.value = ''; archivo.value = null
  datos.value = { clabe: null, nombre: null, banco: null, coincide: null }
}

async function onArchivo(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  const ok = f.type === 'application/pdf' || f.type === 'image/jpeg' || f.type === 'image/png' || /\.pdf$/i.test(f.name)
  if (!ok) { error.value = 'Sube un PDF o una imagen JPG/PNG'; return }
  if (f.size > 10 * 1024 * 1024) { error.value = 'El archivo supera 10 MB'; return }

  error.value = ''; archivo.value = f; fase.value = 'leyendo'
  try {
    const r = await extraerDatosEstadoCuenta(f, m => { progreso.value = m })
    let banco = null
    if (r.clabe) {
      try { const b = await catalogosService.getInstitucionBancaria(r.clabe.slice(0, 3)); banco = b?.valor || null } catch {}
    }
    datos.value = { clabe: r.clabe, nombre: r.nombre, banco, coincide: coincideTitular(r.nombre, props.nombreEmpleado) }
    fase.value = 'resultado'
  } catch (err) {
    console.error(err)
    error.value = 'No se pudo leer el documento. Aun así puedes guardarlo en el expediente.'
    datos.value = { clabe: null, nombre: null, banco: null, coincide: null }
    fase.value = 'resultado'
  }
}

async function guardar(usarClabe) {
  guardando.value = true; error.value = ''
  try {
    const fd = new FormData()
    fd.append('archivo', archivo.value)
    fd.append('tipo', 'estado_cuenta')
    if (datos.value.clabe)  fd.append('clabe_detectada', datos.value.clabe)
    if (datos.value.nombre) fd.append('titular_detectado', datos.value.nombre)
    if (datos.value.banco)  fd.append('banco_detectado', datos.value.banco)
    if (datos.value.coincide !== null) fd.append('coincide_titular', datos.value.coincide ? '1' : '0')
    await empleadosService.subirDocumento(props.idEmpleado, fd)
    if (usarClabe && datos.value.clabe) emit('usar-clabe', datos.value.clabe)
    abierto.value = false
    await cargarDocs()
  } catch (err) {
    error.value = err.response?.data?.message || 'No se pudo guardar el documento'
  } finally { guardando.value = false }
}

async function ver(d) {
  try { await empleadosService.abrirDocumento(d.id) }
  catch { error.value = 'No se pudo abrir el documento' }
}
const TIPOS = { estado_cuenta: 'Estado de cuenta', identificacion: 'Identificación', comprobante_domicilio: 'Comprobante de domicilio', otro: 'Otro' }
async function aprobar(d) {
  try { await empleadosService.aprobarDocumento(d.id); await cargarDocs() }
  catch (err) { error.value = err.response?.data?.message || 'No se pudo aprobar' }
}
async function rechazar(d) {
  const motivo = prompt('Motivo del rechazo (opcional):', '')
  if (motivo === null) return
  try { await empleadosService.rechazarDocumento(d.id, motivo); await cargarDocs() }
  catch (err) { error.value = err.response?.data?.message || 'No se pudo rechazar' }
}
async function eliminar(d) {
  if (!(await dialog.confirmar({ titulo: 'Quitar documento', mensaje: `¿Quitar "${d.nombre_original}" del expediente?`, tipo: 'peligro', confirmText: 'Quitar' }))) return
  try { await empleadosService.eliminarDocumento(d.id); await cargarDocs() }
  catch (err) { error.value = err.response?.data?.message || 'No se pudo eliminar' }
}

const fmtFecha = f => f ? new Date(String(f).replace(' ', 'T')).toLocaleDateString('es-MX') : ''
const fmtKB = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'
</script>

<template>
  <div class="exp">
    <div class="exp-hdr">
      <div>
        <strong><i class="ti ti-folder"></i> Expediente digital</strong>
        <span>Estado de cuenta y documentos del empleado (los del kiosko requieren aprobación)</span>
      </div>
      <button class="exp-btn main" @click="abrirModal"><i class="ti ti-file-upload"></i> Cargar estado de cuenta</button>
    </div>

    <p v-if="error && !abierto" class="exp-err">{{ error }}</p>

    <div v-if="cargando" class="exp-vacio">Cargando...</div>
    <div v-else-if="!docs.length" class="exp-vacio">Sin documentos en el expediente</div>
    <div v-else class="exp-lista">
      <div v-for="d in docs" :key="d.id" class="exp-doc">
        <div class="exp-ico"><i class="ti" :class="d.mime === 'application/pdf' ? 'ti-file-type-pdf' : 'ti-photo'"></i></div>
        <div class="exp-info">
          <span class="exp-nombre">{{ d.nombre_original }}</span>
          <span class="exp-tag" :class="d.estado === 'aprobado' ? 'ok' : 'warn'" style="margin-top:0">
            {{ TIPOS[d.tipo] || d.tipo }} · {{ d.estado === 'pendiente' ? 'Pendiente de aprobación' : d.estado === 'rechazado' ? 'Rechazado' : 'Aprobado' }}
          </span>
          <span v-if="d.estado === 'rechazado' && d.motivo_rechazo" class="exp-meta">Motivo: {{ d.motivo_rechazo }}</span>
          <span class="exp-meta">
            {{ fmtFecha(d.created_at) }} · {{ fmtKB(d.tamano) }}<template v-if="d.subido_por"> · {{ d.subido_por }}</template>
          </span>
          <span v-if="d.clabe_detectada" class="exp-meta">
            CLABE {{ d.clabe_detectada }}<template v-if="d.banco_detectado"> · {{ d.banco_detectado }}</template>
          </span>
          <span v-if="d.coincide_titular !== null && d.coincide_titular !== undefined" class="exp-tag" :class="Number(d.coincide_titular) ? 'ok' : 'warn'">
            <i class="ti" :class="Number(d.coincide_titular) ? 'ti-circle-check' : 'ti-alert-triangle'"></i>
            {{ Number(d.coincide_titular) ? 'Titular coincide' : 'Titular no coincide' }}
          </span>
        </div>
        <div class="exp-acts">
          <button class="exp-btn" @click="ver(d)"><i class="ti ti-eye"></i> Ver</button>
          <template v-if="d.estado !== 'aprobado'">
            <button class="exp-btn main" @click="aprobar(d)"><i class="ti ti-check"></i> Aprobar</button>
          </template>
          <button v-if="d.estado === 'pendiente'" class="exp-btn danger" @click="rechazar(d)"><i class="ti ti-x"></i> Rechazar</button>
          <button class="exp-btn danger" @click="eliminar(d)"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    </div>

    <!-- Modal de carga -->
    <Teleport to="body">
      <div v-if="abierto" class="exp-overlay" @click.self="!guardando && (abierto = false)">
        <div class="exp-modal">
          <div class="exp-mhdr">
            <strong>Cargar estado de cuenta</strong>
            <button class="exp-x" @click="abierto = false"><i class="ti ti-x"></i></button>
          </div>

          <div v-if="fase === 'elegir'" class="exp-drop" @click="inputRef.click()">
            <i class="ti ti-cloud-upload" style="font-size:38px;color:var(--acc)"></i>
            <p><strong>Elige un PDF o una foto</strong></p>
            <small>Se leerá la CLABE y el titular, y el archivo quedará guardado como evidencia</small>
            <input ref="inputRef" type="file" accept="application/pdf,image/jpeg,image/png" hidden @change="onArchivo" />
          </div>

          <div v-else-if="fase === 'leyendo'" class="exp-leyendo">
            <i class="ti ti-loader-2 exp-spin"></i>
            <p>{{ progreso || 'Procesando...' }}</p>
          </div>

          <div v-else class="exp-res">
            <div class="exp-fila"><span>CLABE</span><b>{{ datos.clabe || 'No detectada' }}</b></div>
            <div class="exp-fila"><span>Banco</span><b>{{ datos.banco || 'No detectado' }}</b></div>
            <div class="exp-fila"><span>Titular</span><b>{{ datos.nombre || 'No detectado' }}</b></div>

            <p v-if="datos.coincide === false" class="exp-aviso warn">
              <i class="ti ti-alert-triangle"></i> El titular del documento no parece coincidir con {{ nombreEmpleado }}. Revísalo antes de usar la CLABE.
            </p>
            <p v-else-if="datos.coincide === true" class="exp-aviso ok">
              <i class="ti ti-circle-check"></i> El titular coincide con el empleado.
            </p>
            <p v-if="!datos.clabe" class="exp-aviso warn">
              <i class="ti ti-alert-triangle"></i> No se pudo detectar la CLABE; captúrala a mano en el formulario.
            </p>
            <p v-if="error" class="exp-err">{{ error }}</p>

            <div class="exp-footer">
              <button class="exp-btn" :disabled="guardando" @click="fase = 'elegir'">Elegir otro</button>
              <button class="exp-btn" :disabled="guardando" @click="guardar(false)">Solo guardar en expediente</button>
              <button v-if="datos.clabe" class="exp-btn main" :disabled="guardando" @click="guardar(true)">
                <i class="ti ti-check"></i> Guardar y usar CLABE
              </button>
            </div>
          </div>
          <p v-if="error && fase !== 'resultado'" class="exp-err" style="margin-top:10px">{{ error }}</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.exp { margin-top: 18px; padding-top: 16px; border-top: 0.5px solid var(--bdr2); }
.exp-hdr { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.exp-hdr strong { display: block; font-size: 14px; color: var(--tx0); }
.exp-hdr span { font-size: 12px; color: var(--tx2); }
.exp-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 9px; cursor: pointer;
  font-size: 12px; font-weight: 600; font-family: inherit; background: var(--bg2); color: var(--tx0); border: 0.5px solid var(--bdr2); }
.exp-btn.main { background: var(--acc, #4f8ef7); border-color: var(--acc, #4f8ef7); color: #fff; }
.exp-btn.danger { color: #f05454; }
.exp-btn:disabled { opacity: .55; cursor: not-allowed; }
.exp-vacio { font-size: 12px; color: var(--tx2); padding: 14px; text-align: center; border: 1px dashed var(--bdr2); border-radius: 10px; }
.exp-lista { display: flex; flex-direction: column; gap: 8px; }
.exp-doc { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 0.5px solid var(--bdr2); border-radius: 10px; background: var(--bg2); }
.exp-ico { font-size: 26px; color: var(--acc); }
.exp-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.exp-nombre { font-size: 13px; font-weight: 600; color: var(--tx0); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.exp-meta { font-size: 11px; color: var(--tx2); }
.exp-tag { align-self: flex-start; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; margin-top: 2px; }
.exp-tag.ok { background: rgba(34,201,122,.14); color: #22c97a; }
.exp-tag.warn { background: rgba(245,166,35,.14); color: #f5a623; }
.exp-acts { display: flex; gap: 6px; }
.exp-err { color: #f05454; font-size: 12px; margin: 8px 0 0; }

.exp-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.6); display: grid; place-items: center; padding: 16px; }
.exp-modal { width: 100%; max-width: 480px; background: var(--bg1); border: 0.5px solid var(--bdr2); border-radius: 16px; padding: 18px; color: var(--tx0); }
.exp-mhdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; font-size: 15px; }
.exp-x { background: none; border: none; color: var(--tx2); font-size: 18px; cursor: pointer; }
.exp-drop { border: 1.5px dashed var(--bdr2); border-radius: 14px; padding: 28px 16px; text-align: center; cursor: pointer; }
.exp-drop:hover { border-color: var(--acc); }
.exp-drop p { margin: 8px 0 2px; }
.exp-drop small { color: var(--tx2); font-size: 12px; }
.exp-leyendo { text-align: center; padding: 30px 10px; color: var(--tx2); font-size: 13px; }
.exp-spin { font-size: 34px; color: var(--acc); animation: exp-rot 1s linear infinite; }
@keyframes exp-rot { to { transform: rotate(360deg); } }
.exp-fila { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 0.5px solid var(--bdr2); font-size: 13px; }
.exp-fila span { color: var(--tx2); }
.exp-fila b { text-align: right; word-break: break-all; }
.exp-aviso { font-size: 12px; margin: 10px 0 0; display: flex; gap: 6px; align-items: flex-start; }
.exp-aviso.warn { color: #f5a623; }
.exp-aviso.ok { color: #22c97a; }
.exp-footer { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; margin-top: 16px; }
</style>
