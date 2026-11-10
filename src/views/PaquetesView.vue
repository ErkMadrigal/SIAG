<template>
  <div class="pq-view">
    <div class="view-header">
      <div>
        <h1 class="view-title">Paquetes de empleados</h1>
        <p class="view-sub">Arma un paquete, comparte su código por WhatsApp y en la app se importa con “Importar paquete”</p>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn-primary-lg" @click="abrirNuevo"><i class="ti ti-plus"></i> Nuevo paquete</button>
        <button class="btn-sm" @click="cargar" title="Recargar"><i class="ti ti-refresh"></i></button>
      </div>
    </div>

    <div class="sec">
      <div v-if="loading" class="skeleton-wrap"><div class="skeleton-row" v-for="i in 4" :key="i"></div></div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Paquete</th><th>Código</th>
              <th style="text-align:center">Empleados</th>
              <th>Vence</th>
              <th style="text-align:center">Usos</th>
              <th style="text-align:center">Estado</th>
              <th style="text-align:center;width:170px">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in paquetes" :key="p.id">
              <td class="strong">{{ p.nombre }}<div class="sub">{{ p.creador || '—' }} · {{ fecha(p.created_at) }}</div></td>
              <td><span class="codigo">{{ p.codigo }}</span></td>
              <td style="text-align:center">{{ p.total_empleados }}</td>
              <td>{{ p.expira_at ? fecha(p.expira_at) : 'No vence' }}</td>
              <td style="text-align:center">{{ p.usos }}</td>
              <td style="text-align:center">
                <span class="pill" :class="p.vigente ? 'ok' : (p.vencido && p.activo == 1 ? 'warn' : 'off')">
                  {{ p.activo != 1 ? 'Revocado' : (p.vencido ? 'Vencido' : 'Vigente') }}
                </span>
              </td>
              <td style="text-align:center">
                <template v-if="p.vigente">
                  <button class="icon-btn" title="Copiar código" @click="copiar(p.codigo)"><i class="ti ti-copy"></i></button>
                  <button class="icon-btn" title="Copiar mensaje para WhatsApp" @click="copiar(mensaje(p))"><i class="ti ti-message-share"></i></button>
                  <a class="icon-btn wa" title="Abrir WhatsApp" :href="waLink(p)" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i></a>
                  <button class="icon-btn danger" title="Revocar" @click="revocar(p)"><i class="ti ti-ban"></i></button>
                </template>
              </td>
            </tr>
            <tr v-if="!paquetes.length"><td colspan="7" class="empty-row">Aún no hay paquetes. Crea el primero con “Nuevo paquete”.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <p v-if="aviso" class="toast">{{ aviso }}</p>

    <!-- Nuevo paquete -->
    <Teleport to="body">
      <div v-if="showNuevo" class="modal-overlay" @click.self="cerrarNuevo">
        <div class="modal">
          <div class="modal-hdr">
            <div>
              <h2><i class="ti ti-package"></i> {{ creado ? 'Paquete listo' : 'Nuevo paquete' }}</h2>
              <p>{{ creado ? 'Comparte este código con quien lo va a importar en la app' : 'Elige servicios y/o empleados sueltos' }}</p>
            </div>
            <button class="btn-close" @click="cerrarNuevo"><i class="ti ti-x"></i></button>
          </div>

          <div v-if="creado" class="modal-body listo">
            <div class="codigo-grande">{{ creado.codigo }}</div>
            <p class="muted-txt">{{ mensaje(creado) }}</p>
            <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
              <button class="btn-primary-lg" @click="copiar(creado.codigo)"><i class="ti ti-copy"></i> Copiar código</button>
              <button class="btn-sm" @click="copiar(mensaje(creado))"><i class="ti ti-message-share"></i> Copiar mensaje</button>
              <a class="btn-sm" :href="waLink(creado)" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> WhatsApp</a>
            </div>
          </div>

          <div v-else class="modal-body">
            <label class="lbl">Nombre del paquete</label>
            <input class="inp full" v-model="form.nombre" placeholder="Ej. Nayarit · Guardias" maxlength="120" />

            <label class="lbl">Servicios <span class="hint">(se incluyen todos sus empleados activos con acceso biométrico)</span></label>
            <input class="inp full" v-model="filtroServicio" placeholder="Filtrar servicios..." />
            <div class="lista">
              <label v-for="s in serviciosFiltrados" :key="s.id" class="chk">
                <input type="checkbox" :value="s.id" v-model="form.servicios" />
                <span>{{ s.servicio }}</span>
                <small>{{ s.empleados }} {{ Number(s.empleados) === 1 ? 'empleado' : 'empleados' }}</small>
              </label>
              <div v-if="!serviciosFiltrados.length" class="muted-txt" style="padding:8px">Sin resultados</div>
            </div>

            <label class="lbl">Empleados sueltos <span class="hint">(opcional)</span></label>
            <input class="inp full" v-model="qEmp" @input="buscarEmp" placeholder="Nombre, CURP o número..." />
            <div v-if="resultadosEmp.length" class="lista corta">
              <button v-for="e in resultadosEmp" :key="e.id" class="res" @click="agregarEmp(e)">
                <span>{{ e.nombre }}</span><small>{{ e.ubicacion || '—' }} · {{ e.rostro_enrolado == 1 ? 'con rostro' : 'sin rostro enrolado' }}</small>
              </button>
            </div>
            <div v-if="form.empleadosSel.length" class="chips">
              <span v-for="e in form.empleadosSel" :key="e.id" class="chip">{{ e.nombre }}
                <button @click="quitarEmp(e.id)"><i class="ti ti-x"></i></button></span>
            </div>

            <label class="lbl">Vigencia del código</label>
            <select class="inp" v-model.number="form.dias">
              <option :value="1">1 día</option><option :value="7">7 días</option>
              <option :value="30">30 días</option><option :value="0">Sin vencimiento</option>
            </select>

            <p v-if="error" class="err">{{ error }}</p>
            <div class="modal-ftr">
              <span class="muted-txt">Aprox. {{ totalAprox }} empleados</span>
              <div style="display:flex;gap:8px">
                <button class="btn-sm" @click="cerrarNuevo">Cancelar</button>
                <button class="btn-primary-lg" :disabled="guardando" @click="crear">
                  <i class="ti ti-package"></i> {{ guardando ? 'Creando...' : 'Crear paquete' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { paquetesService } from '@/services/paquetes.service.js'
import { useDialog } from '@/composables/useDialog.js'

const dialog = useDialog()
const loading = ref(true)
const paquetes = ref([])
const aviso = ref('')

const showNuevo = ref(false)
const guardando = ref(false)
const error = ref('')
const creado = ref(null)
const servicios = ref([])
const filtroServicio = ref('')
const qEmp = ref('')
const resultadosEmp = ref([])
const form = reactive({ nombre: '', servicios: [], empleadosSel: [], dias: 7 })
let t = null

const serviciosFiltrados = computed(() => {
  const q = filtroServicio.value.trim().toLowerCase()
  return servicios.value.filter(s => !q || String(s.servicio || '').toLowerCase().includes(q))
})
const totalAprox = computed(() =>
  servicios.value.filter(s => form.servicios.includes(s.id)).reduce((a, s) => a + Number(s.empleados || 0), 0) + form.empleadosSel.length
)

function toast(m) { aviso.value = m; setTimeout(() => (aviso.value = ''), 2500) }
function fecha(f) {
  if (!f) return '—'
  return new Date(String(f).replace(' ', 'T')).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function mensaje(p) {
  return `Para descargar los empleados "${p.nombre}" en la app SIAG: Configuración del dispositivo → Importar paquete → escribe el código ${p.codigo}`
}
function waLink(p) { return 'https://wa.me/?text=' + encodeURIComponent(mensaje(p)) }
async function copiar(txt) {
  try { await navigator.clipboard.writeText(txt); toast('Copiado') }
  catch { toast('No se pudo copiar; selecciónalo manualmente') }
}

async function cargar() {
  loading.value = true
  try { paquetes.value = await paquetesService.listar() }
  catch (e) { dialog.alerta({ titulo: 'No se pudo cargar', mensaje: e.response?.data?.message || 'Error al cargar los paquetes', tipo: 'error' }) }
  finally { loading.value = false }
}

async function abrirNuevo() {
  Object.assign(form, { nombre: '', servicios: [], empleadosSel: [], dias: 7 })
  creado.value = null; error.value = ''; qEmp.value = ''; resultadosEmp.value = []; filtroServicio.value = ''
  showNuevo.value = true
  if (!servicios.value.length) {
    try { servicios.value = await paquetesService.servicios() } catch { /* se muestra vacío */ }
  }
}
function cerrarNuevo() { showNuevo.value = false; if (creado.value) cargar() }

function buscarEmp() {
  clearTimeout(t)
  const q = qEmp.value.trim()
  if (q.length < 2) { resultadosEmp.value = []; return }
  t = setTimeout(async () => {
    try { resultadosEmp.value = await paquetesService.buscarEmpleados(q) } catch { resultadosEmp.value = [] }
  }, 300)
}
function agregarEmp(e) {
  if (!form.empleadosSel.some(x => x.id === e.id)) form.empleadosSel.push({ id: e.id, nombre: e.nombre })
  qEmp.value = ''; resultadosEmp.value = []
}
function quitarEmp(id) { form.empleadosSel = form.empleadosSel.filter(x => x.id !== id) }

async function crear() {
  error.value = ''
  if (!form.nombre.trim()) { error.value = 'Ponle un nombre al paquete'; return }
  if (!form.servicios.length && !form.empleadosSel.length) { error.value = 'Elige al menos un servicio o un empleado'; return }
  guardando.value = true
  try {
    const r = await paquetesService.crear({
      nombre: form.nombre.trim(), servicios: form.servicios,
      empleados: form.empleadosSel.map(e => e.id), dias_vigencia: form.dias,
    })
    creado.value = { codigo: r.codigo, nombre: form.nombre.trim() }
  } catch (e) {
    error.value = e.response?.data?.message || 'No se pudo crear el paquete'
  } finally { guardando.value = false }
}

async function revocar(p) {
  const ok = await dialog.confirmar({
    titulo: 'Revocar paquete', tipo: 'peligro', confirmText: 'Revocar',
    mensaje: `El código ${p.codigo} dejará de funcionar. Los equipos que ya lo importaron conservan sus empleados.`,
  })
  if (!ok) return
  try { await paquetesService.revocar(p.id); toast('Paquete revocado'); cargar() }
  catch (e) { dialog.alerta({ titulo: 'Error', mensaje: e.response?.data?.message || 'No se pudo revocar', tipo: 'error' }) }
}

onMounted(cargar)
</script>

<style scoped>
.pq-view { display: flex; flex-direction: column; gap: 14px; }
.view-header { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; justify-content: space-between; }
.view-title { font-size: 20px; font-weight: 600; color: var(--tx0); }
.view-sub { font-size: 12px; color: var(--tx2); margin-top: 2px; max-width: 620px; }
.sec { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 12px; overflow: hidden; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 10px 12px; font-size: 11px; color: var(--tx3); font-weight: 500; border-bottom: 0.5px solid var(--bdr); }
td { padding: 10px 12px; color: var(--tx1); border-bottom: 0.5px solid var(--bdr); }
tbody tr:hover { background: var(--bg2); }
.strong { color: var(--tx0); font-weight: 500; }
.sub { font-size: 11px; color: var(--tx3); font-weight: 400; margin-top: 2px; }
.empty-row { text-align: center; color: var(--tx3); padding: 40px; }
.codigo { font-family: ui-monospace, monospace; letter-spacing: 1.5px; font-weight: 600; color: var(--acc); background: var(--acc-dim); padding: 3px 9px; border-radius: 6px; }
.pill { display: inline-block; font-size: 11px; font-weight: 500; padding: 3px 9px; border-radius: 20px; }
.pill.ok { background: var(--grn-dim); color: var(--grn); } .pill.warn { background: var(--amb-dim); color: var(--amb); } .pill.off { background: var(--bg3); color: var(--tx2); }
.btn-sm, .icon-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border-radius: 8px; border: 0.5px solid var(--bdr2);
  background: transparent; font-size: 12px; color: var(--tx1); cursor: pointer; text-decoration: none; font-family: inherit; }
.btn-sm:hover, .icon-btn:hover { background: var(--bg3); color: var(--tx0); }
.icon-btn { padding: 5px 8px; margin: 0 2px; } .icon-btn.danger:hover { color: var(--red); } .icon-btn.wa { color: #25d366; }
.btn-primary-lg { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; border: none;
  background: var(--acc); color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; text-decoration: none; }
.btn-primary-lg:disabled { opacity: .6; cursor: not-allowed; }
.skeleton-wrap { padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.skeleton-row { height: 36px; background: var(--bg2); border-radius: 8px; animation: pulse 1.5s ease-in-out infinite; }
.toast { position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%); background: var(--bg1); border: 0.5px solid var(--bdr2);
  padding: 8px 16px; border-radius: 10px; font-size: 13px; color: var(--tx0); z-index: 1100; box-shadow: 0 10px 30px rgba(0,0,0,.35); }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 14px; width: 100%; max-width: 560px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
.modal-hdr { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 20px; border-bottom: 0.5px solid var(--bdr); }
.modal-hdr h2 { font-size: 15px; font-weight: 600; color: var(--tx0); display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.modal-hdr h2 i { color: var(--acc); } .modal-hdr p { font-size: 12px; color: var(--tx2); }
.btn-close { width: 30px; height: 30px; border-radius: 8px; border: 0.5px solid var(--bdr2); background: var(--bg2); color: var(--tx1); cursor: pointer; }
.modal-body { padding: 16px 20px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
.modal-body.listo { align-items: center; text-align: center; gap: 14px; padding: 26px 20px; }
.codigo-grande { font-family: ui-monospace, monospace; font-size: 34px; font-weight: 700; letter-spacing: 6px; color: var(--acc); background: var(--acc-dim); padding: 12px 24px; border-radius: 12px; }
.lbl { font-size: 12px; font-weight: 600; color: var(--tx0); margin-top: 6px; }
.hint { font-weight: 400; color: var(--tx3); }
.inp { background: var(--bg2); border: 0.5px solid var(--bdr2); border-radius: 8px; padding: 8px 10px; font-size: 13px; color: var(--tx0); outline: none; font-family: inherit; }
.inp.full { width: 100%; }
.lista { max-height: 180px; overflow-y: auto; border: 0.5px solid var(--bdr); border-radius: 8px; background: var(--bg2); }
.lista.corta { max-height: 140px; }
.chk { display: flex; align-items: center; gap: 8px; padding: 7px 10px; font-size: 13px; color: var(--tx1); cursor: pointer; border-bottom: 0.5px solid var(--bdr); }
.chk:last-child { border-bottom: none; } .chk:hover { background: var(--bg3); }
.chk span { flex: 1; } .chk small, .res small { color: var(--tx3); font-size: 11px; }
.res { display: flex; justify-content: space-between; gap: 10px; width: 100%; padding: 7px 10px; background: transparent; border: none; border-bottom: 0.5px solid var(--bdr); color: var(--tx1); font-size: 13px; cursor: pointer; text-align: left; font-family: inherit; }
.res:hover { background: var(--bg3); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; background: var(--acc-dim); color: var(--acc); padding: 3px 4px 3px 10px; border-radius: 20px; }
.chip button { border: none; background: transparent; color: inherit; cursor: pointer; display: grid; place-items: center; }
.muted-txt { font-size: 12px; color: var(--tx3); }
.err { color: var(--red); font-size: 12px; }
.modal-ftr { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
</style>
