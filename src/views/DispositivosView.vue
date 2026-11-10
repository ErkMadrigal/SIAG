<template>
  <div class="dv-view">
    <div class="view-header">
      <div>
        <h1 class="view-title">Dispositivos</h1>
        <p class="view-sub">Celulares y tablets con la app: versión, última conexión, registros pendientes y bloqueo remoto</p>
      </div>
      <div class="tabs-wrap">
        <button class="tab-btn" :class="{ active: tab === 'equipos' }" @click="tab = 'equipos'"><i class="ti ti-device-mobile"></i> Equipos</button>
        <button class="tab-btn" :class="{ active: tab === 'versiones' }" @click="tab = 'versiones'">
          <i class="ti ti-versions"></i> Versiones
        </button>
        <button class="tab-btn" :class="{ active: tab === 'alertas' }" @click="tab = 'alertas'">
          <i class="ti ti-alert-triangle"></i> Alertas
          <span v-if="alertas.length" class="tab-count">{{ alertas.length }}</span>
        </button>
      </div>
      <button class="btn-sm" @click="cargar" title="Recargar"><i class="ti ti-refresh"></i></button>
    </div>

    <div class="kpis">
      <div class="kpi"><span class="kpi-n">{{ resumen.total || 0 }}</span><span class="kpi-l">Equipos</span></div>
      <div class="kpi ok"><span class="kpi-n">{{ resumen.en_linea || 0 }}</span><span class="kpi-l">En línea</span></div>
      <div class="kpi warn"><span class="kpi-n">{{ resumen.sin_sincronizar || 0 }}</span><span class="kpi-l">Sin sincronizar (+3 días)</span></div>
      <div class="kpi info"><span class="kpi-n">{{ resumen.desactualizados || 0 }}</span><span class="kpi-l">Versión vieja</span></div>
      <div class="kpi bad"><span class="kpi-n">{{ resumen.bloqueados || 0 }}</span><span class="kpi-l">Bloqueados</span></div>
      <div class="kpi mute"><span class="kpi-n">{{ resumen.pendientes || 0 }}</span><span class="kpi-l">Registros pendientes</span></div>
    </div>

    <!-- EQUIPOS -->
    <div class="sec" v-show="tab === 'equipos'">
      <div v-if="loading" class="skeleton-wrap"><div class="skeleton-row" v-for="i in 5" :key="i"></div></div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Equipo</th><th>Versión</th><th>Último contacto</th><th>Última sync</th>
              <th style="text-align:center">Empleados</th><th style="text-align:center">Pendientes</th>
              <th style="text-align:center">Estado</th><th style="text-align:center;width:110px">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in equipos" :key="d.id" :class="{ bloq: d.bloqueado == 1 }">
              <td>
                <div v-if="editId === d.id" class="edit-row">
                  <input class="inp" v-model="editNombre" @keyup.enter="guardarNombre(d)" @keyup.esc="editId = null" maxlength="120" autofocus />
                  <button class="icon-btn" @click="guardarNombre(d)"><i class="ti ti-check"></i></button>
                </div>
                <div v-else class="strong">
                  {{ d.nombre || d.modelo || 'Sin nombre' }}
                  <button class="icon-btn mini" title="Renombrar" @click="editId = d.id; editNombre = d.nombre || ''"><i class="ti ti-pencil"></i></button>
                  <div class="sub">{{ d.modelo || '—' }}<template v-if="d.ubicacion"> · {{ d.ubicacion }}</template><template v-if="d.operador"> · {{ d.operador }}</template></div>
                  <div class="sub mono" :title="d.device_id">ID: {{ d.device_id.slice(0, 8) }}…
                    <button class="icon-btn mini" title="Copiar ID completo" @click="copiarId(d.device_id)"><i class="ti ti-copy"></i></button></div>
                </div>
              </td>
              <td>
                {{ d.version_name || '—' }}
                <span v-if="d.desactualizado" class="pill warn" title="Hay una versión más nueva publicada">Vieja</span>
              </td>
              <td>{{ relativo(d.min_sin_contacto) }}</td>
              <td>{{ d.ultima_sync ? fecha(d.ultima_sync) : '—' }}</td>
              <td style="text-align:center">{{ d.empleados_locales }}</td>
              <td style="text-align:center"><span :class="{ 'txt-warn': d.pendientes > 0 }">{{ d.pendientes }}</span></td>
              <td style="text-align:center">
                <span v-if="d.bloqueado == 1" class="pill off">Bloqueado</span>
                <span v-else-if="d.en_linea" class="pill ok">En línea</span>
                <span v-else-if="d.sin_sincronizar" class="pill warn">Sin sincronizar</span>
                <span v-else class="pill mute">Inactivo</span>
              </td>
              <td style="text-align:center">
                <button class="btn-sm" :class="{ danger: d.bloqueado != 1 }" @click="toggleBloqueo(d)">
                  <i class="ti" :class="d.bloqueado == 1 ? 'ti-lock-open' : 'ti-lock'"></i>
                  {{ d.bloqueado == 1 ? 'Desbloquear' : 'Bloquear' }}
                </button>
              </td>
            </tr>
            <tr v-if="!equipos.length"><td colspan="8" class="empty-row">Ningún equipo se ha reportado todavía. Aparecen solos cuando abren la app con la versión nueva.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- VERSIONES (prueba piloto) -->
    <div class="sec" v-show="tab === 'versiones'">
      <div class="toolbar">
        <span class="muted-txt">
          Estable: <b>{{ vers.estable?.versionName || '—' }}</b>
          <template v-if="vers.piloto"> · Piloto: <b>{{ vers.piloto.versionName }}</b>
            ({{ vers.piloto.porcentaje }}% de equipos + {{ vers.piloto.dispositivos }} elegidos)</template>
          <template v-else> · Sin prueba piloto activa</template>
        </span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Versión</th><th style="text-align:center">Equipos</th><th style="text-align:center">Activos hoy</th>
              <th style="text-align:center">Registros</th><th style="text-align:center">Fallos</th>
              <th style="text-align:center">Reconocimiento</th><th style="text-align:center">Pendientes</th></tr>
          </thead>
          <tbody>
            <tr v-for="v in vers.data" :key="v.version_code">
              <td class="strong">{{ v.version_name || '—' }} <small class="sub" style="display:inline">({{ v.version_code }})</small>
                <span v-if="v.rol === 'estable'" class="pill ok">Estable</span>
                <span v-else-if="v.rol === 'piloto'" class="pill warn">Piloto</span>
              </td>
              <td style="text-align:center">{{ v.equipos }}</td>
              <td style="text-align:center">{{ v.activos_hoy }}</td>
              <td style="text-align:center">{{ v.registros }}</td>
              <td style="text-align:center">
                <span v-if="v.pct_fallos === null" class="muted-txt">—</span>
                <span v-else :class="{ 'txt-warn': v.pct_fallos >= 5 }">{{ v.fallos }} ({{ v.pct_fallos }}%)</span>
              </td>
              <td style="text-align:center">{{ v.ms_promedio ? (v.ms_promedio / 1000).toFixed(2) + ' s' : '—' }}</td>
              <td style="text-align:center">{{ v.pendientes }}</td>
            </tr>
            <tr v-if="!vers.data?.length"><td colspan="7" class="empty-row">Aún no hay datos por versión. Aparecen cuando los equipos con la versión nueva se reporten.</td></tr>
          </tbody>
        </table>
      </div>
      <div class="ayuda">
        <b>Cómo hacer una prueba piloto:</b> sube el APK nuevo y agrega un bloque <code>"piloto"</code> a <code>public/app/version.json</code> del backend con
        <code>versionCode</code>, <code>versionName</code>, <code>apk_url</code>, y los equipos elegidos en <code>"dispositivos"</code> (copia el ID de la pestaña Equipos)
        y/o un <code>"porcentaje"</code>. Solo esos equipos verán la actualización. Compara aquí fallos y tiempos contra la estable y, si todo va bien,
        pasa los datos al bloque principal y quita <code>"piloto"</code>.
      </div>
    </div>

    <!-- ALERTAS -->
    <div class="sec" v-show="tab === 'alertas'">
      <div class="toolbar">
        <span class="muted-txt">Revisión de los últimos 7 días</span>
        <label class="umbral">Alertar si un equipo registra a
          <input type="number" min="2" max="100" v-model.number="umbral" @change="cargarAlertas" /> empleados distintos en un día</label>
      </div>
      <div v-if="!alertas.length" class="empty-row"><i class="ti ti-shield-check" style="font-size:30px;color:var(--grn)"></i><br />Sin alertas por ahora</div>
      <div v-for="(a, i) in alertas" :key="i" class="alerta" :class="a.severidad">
        <i class="ti" :class="icono(a.tipo)"></i>
        <div class="a-txt">
          <b>{{ a.titulo }}</b>
          <span>{{ a.detalle }}</span>
        </div>
        <span class="a-fecha">{{ a.fecha ? fecha(a.fecha) : '' }}</span>
        <a v-if="a.latitud && a.longitud && Number(a.latitud) !== 0" class="btn-sm"
           :href="`https://www.google.com/maps?q=${a.latitud},${a.longitud}`" target="_blank" rel="noopener"><i class="ti ti-map-pin"></i> Mapa</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { dispositivosService } from '@/services/dispositivos.service.js'
import { useDialog } from '@/composables/useDialog.js'

const dialog = useDialog()
const tab = ref('equipos')
const loading = ref(true)
const equipos = ref([])
const resumen = ref({})
const alertas = ref([])
const vers = ref({ data: [] })
const umbral = ref(8)
const editId = ref(null)
const editNombre = ref('')

function fecha(f) {
  return new Date(String(f).replace(' ', 'T')).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function relativo(min) {
  if (min === null || min === undefined) return 'Nunca'
  min = Number(min)
  if (min < 2) return 'Ahora'
  if (min < 60) return `hace ${min} min`
  if (min < 1440) return `hace ${Math.floor(min / 60)} h`
  return `hace ${Math.floor(min / 1440)} d`
}
const icono = t => t === 'muchos_empleados' ? 'ti-users-group' : t === 'fuera_de_zona' ? 'ti-map-pin-off' : 'ti-cloud-off'

async function cargarAlertas() {
  try { alertas.value = (await dispositivosService.alertas(umbral.value)).data || [] } catch { alertas.value = [] }
}
async function cargarVersiones() {
  try { vers.value = await dispositivosService.versiones() } catch { vers.value = { data: [] } }
}
async function copiarId(id) {
  try { await navigator.clipboard.writeText(id) } catch { /* sin permiso de portapapeles */ }
}
async function cargar() {
  loading.value = true
  try {
    const r = await dispositivosService.listar()
    equipos.value = r.data || []
    resumen.value = r.resumen || {}
  } catch (e) {
    dialog.alerta({ titulo: 'No se pudo cargar', mensaje: e.response?.data?.message || 'Error al cargar los dispositivos', tipo: 'error' })
  } finally { loading.value = false }
  cargarAlertas()
  cargarVersiones()
}

async function guardarNombre(d) {
  try { await dispositivosService.actualizar(d.id, { nombre: editNombre.value }); d.nombre = editNombre.value.trim() || null; editId.value = null }
  catch (e) { dialog.alerta({ titulo: 'Error', mensaje: e.response?.data?.message || 'No se pudo renombrar', tipo: 'error' }) }
}

async function toggleBloqueo(d) {
  const bloquear = d.bloqueado != 1
  const ok = await dialog.confirmar({
    titulo: bloquear ? 'Bloquear dispositivo' : 'Desbloquear dispositivo',
    tipo: bloquear ? 'peligro' : 'aviso', confirmText: bloquear ? 'Bloquear' : 'Desbloquear',
    mensaje: bloquear
      ? `“${d.nombre || d.modelo || 'Este equipo'}” dejará de poder registrar asistencias en cuanto se conecte (o al siguiente reporte).`
      : 'El equipo volverá a funcionar en cuanto se conecte.',
  })
  if (!ok) return
  try { await dispositivosService.actualizar(d.id, { bloqueado: bloquear }); d.bloqueado = bloquear ? 1 : 0; cargar() }
  catch (e) { dialog.alerta({ titulo: 'Error', mensaje: e.response?.data?.message || 'No se pudo actualizar', tipo: 'error' }) }
}

onMounted(cargar)
</script>

<style scoped>
.dv-view { display: flex; flex-direction: column; gap: 14px; }
.view-header { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; justify-content: space-between; }
.view-title { font-size: 20px; font-weight: 600; color: var(--tx0); }
.view-sub { font-size: 12px; color: var(--tx2); margin-top: 2px; max-width: 560px; }
.tabs-wrap { display: flex; gap: 4px; background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 10px; padding: 4px; }
.tab-btn { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border: none; background: transparent; border-radius: 7px; font-size: 13px; color: var(--tx2); cursor: pointer; font-family: inherit; }
.tab-btn:hover { background: var(--bg2); color: var(--tx0); }
.tab-btn.active { background: var(--acc-dim); color: var(--acc); font-weight: 500; }
.tab-count { background: var(--red); color: #fff; border-radius: 10px; font-size: 10px; padding: 1px 6px; }
.kpis { display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 10px; }
.kpi { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; }
.kpi-n { font-size: 22px; font-weight: 600; color: var(--tx0); } .kpi-l { font-size: 11px; color: var(--tx2); }
.kpi.ok .kpi-n { color: var(--grn); } .kpi.bad .kpi-n { color: var(--red); } .kpi.warn .kpi-n { color: var(--amb); } .kpi.info .kpi-n { color: var(--acc); } .kpi.mute .kpi-n { color: var(--tx2); }
.sec { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 12px; overflow: hidden; }
.toolbar { display: flex; gap: 10px; padding: 12px 14px; align-items: center; flex-wrap: wrap; justify-content: space-between; border-bottom: 0.5px solid var(--bdr); }
.umbral { font-size: 12px; color: var(--tx1); display: flex; align-items: center; gap: 6px; }
.umbral input { width: 56px; background: var(--bg2); border: 0.5px solid var(--bdr2); border-radius: 6px; padding: 4px 6px; color: var(--tx0); font-family: inherit; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 10px 12px; font-size: 11px; color: var(--tx3); font-weight: 500; border-bottom: 0.5px solid var(--bdr); }
td { padding: 10px 12px; color: var(--tx1); border-bottom: 0.5px solid var(--bdr); }
tbody tr:hover { background: var(--bg2); } tr.bloq td { opacity: .65; }
.strong { color: var(--tx0); font-weight: 500; } .sub { font-size: 11px; color: var(--tx3); font-weight: 400; margin-top: 2px; }
.txt-warn { color: var(--amb); font-weight: 600; }
.empty-row { text-align: center; color: var(--tx3); padding: 40px; }
.pill { display: inline-block; font-size: 11px; font-weight: 500; padding: 3px 9px; border-radius: 20px; margin-left: 4px; }
.pill.ok { background: var(--grn-dim); color: var(--grn); } .pill.warn { background: var(--amb-dim); color: var(--amb); }
.pill.off { background: var(--red-dim); color: var(--red); } .pill.mute { background: var(--bg3); color: var(--tx2); }
.edit-row { display: flex; gap: 6px; align-items: center; }
.inp { background: var(--bg2); border: 0.5px solid var(--bdr2); border-radius: 8px; padding: 6px 8px; font-size: 13px; color: var(--tx0); outline: none; font-family: inherit; }
.btn-sm, .icon-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border-radius: 8px; border: 0.5px solid var(--bdr2); background: transparent; font-size: 12px; color: var(--tx1); cursor: pointer; text-decoration: none; font-family: inherit; }
.btn-sm:hover, .icon-btn:hover { background: var(--bg3); color: var(--tx0); } .btn-sm.danger:hover { color: var(--red); }
.icon-btn.mini { padding: 2px 5px; border: none; opacity: .6; } .icon-btn.mini:hover { opacity: 1; }
.skeleton-wrap { padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.skeleton-row { height: 36px; background: var(--bg2); border-radius: 8px; animation: pulse 1.5s ease-in-out infinite; }
.muted-txt { font-size: 12px; color: var(--tx3); }
.mono { font-family: ui-monospace, monospace; }
.ayuda { padding: 12px 14px; font-size: 12px; line-height: 1.55; color: var(--tx2); border-top: 0.5px solid var(--bdr); }
.ayuda code { background: var(--bg2); padding: 1px 5px; border-radius: 4px; color: var(--tx1); }
.alerta { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-bottom: 0.5px solid var(--bdr); }
.alerta > i { font-size: 20px; } .alerta.alta > i { color: var(--red); } .alerta.media > i { color: var(--amb); }
.a-txt { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: 13px; color: var(--tx1); } .a-txt b { color: var(--tx0); font-weight: 600; }
.a-fecha { font-size: 11px; color: var(--tx3); white-space: nowrap; }
@media (max-width: 900px) { .kpis { grid-template-columns: repeat(2, minmax(0,1fr)); } }
</style>
