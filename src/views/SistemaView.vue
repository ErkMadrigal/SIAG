<template>
  <div class="sv">
    <div class="view-header">
      <div>
        <h1 class="view-title">Sistema</h1>
        <p class="view-sub">Versión de la app publicada y tareas programadas (crons). Se actualiza sola cada 30 segundos.</p>
      </div>
      <div class="hdr-r">
        <span v-if="est" class="muted-txt"><i class="ti ti-clock"></i> Hora del servidor: {{ hora(est.hora_servidor) }}</span>
        <button class="btn-sm" @click="cargar" title="Recargar"><i class="ti ti-refresh" :class="{ spin: cargando }"></i></button>
      </div>
    </div>

    <p v-if="error" class="aviso"><i class="ti ti-alert-triangle"></i> {{ error }}</p>

    <!-- VERSIÓN DE LA APP -->
    <div class="sec">
      <div class="sec-hdr"><i class="ti ti-device-mobile"></i><span>Versión de la app publicada</span></div>
      <div v-if="!est" class="pad muted-txt">Cargando…</div>
      <div v-else-if="!est.version.publicada" class="pad"><span class="pill bad">Sin versión publicada</span> <span class="muted-txt">{{ est.version.error || 'No existe public/app/version.json' }}</span></div>
      <div v-else class="ver">
        <div class="ver-big">
          <span class="ver-n">v{{ est.version.versionName }}</span>
          <span class="ver-c">código {{ est.version.versionCode }}</span>
        </div>
        <div class="ver-info">
          <div class="chips">
            <span class="pill" :class="est.version.apk_disponible === true ? 'ok' : est.version.apk_disponible === false ? 'bad' : 'mute'">
              <i class="ti" :class="est.version.apk_disponible === true ? 'ti-circle-check' : est.version.apk_disponible === false ? 'ti-alert-circle' : 'ti-help'"></i>
              {{ est.version.apk_disponible === true ? 'APK descargable' : est.version.apk_disponible === false ? 'El APK no se encuentra (404)' : 'No se pudo verificar el APK' }}
            </span>
            <span class="pill mute">{{ mb(est.version.tamano) }}</span>
            <span class="pill" :class="est.version.obligatoria ? 'warn' : 'mute'">{{ est.version.obligatoria ? 'Obligatoria' : 'Opcional' }}</span>
          </div>
          <p class="muted-txt">Publicada en el servidor: {{ hora(est.version.actualizado_en) }}</p>
          <p class="notas" v-if="est.version.notas">{{ est.version.notas }}</p>
          <a v-if="est.version.apk_url" :href="est.version.apk_url" target="_blank" rel="noopener" class="btn-sm"><i class="ti ti-download"></i> Probar descarga</a>
        </div>
      </div>
    </div>

    <!-- TAREAS PROGRAMADAS -->
    <div class="sec">
      <div class="sec-hdr"><i class="ti ti-clock-play"></i><span>Tareas programadas (crons)</span></div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Tarea</th><th>Programación</th><th>Última ejecución</th><th>Próxima ejecución</th><th style="text-align:center">Estado</th></tr>
          </thead>
          <tbody>
            <tr v-if="!est"><td colspan="5" class="empty-row">Cargando…</td></tr>
            <tr v-for="t in est?.tareas" :key="t.clave">
              <td><div class="strong">{{ t.nombre }}</div><div class="sub">{{ t.detalle }}</div></td>
              <td>{{ t.programacion }}</td>
              <td>
                <template v-if="t.ultima">
                  <div class="strong">{{ hace(t.ultima.hace_min) }}</div>
                  <div class="sub">{{ hora(t.ultima.fecha) }} · {{ t.ultima.detalle }}</div>
                </template>
                <span v-else class="muted-txt">Aún no se ha ejecutado</span>
              </td>
              <td>
                <template v-if="t.proxima">
                  <div class="strong">{{ enMin(t.proxima_en_min) }}</div>
                  <div class="sub">{{ hora(t.proxima) }}</div>
                </template>
                <span v-else class="muted-txt">—</span>
              </td>
              <td style="text-align:center">
                <span class="pill" :class="clase(t.estado)">{{ etiqueta(t.estado) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="ayuda">
        La programación real vive en el cPanel del servidor del backend (Cron Jobs); aquí se muestra cuándo corrió por última vez y cuándo le toca.
        Si una tarea aparece <b>atrasada</b> o <b>sin ejecutar</b>, revisa que el cron exista en cPanel y que la clave del comando coincida con <code>CRON_KEY</code> del <code>.env</code>.
        Las horas se muestran en horario de México.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { sistemaService } from '@/services/sistema.service.js'

const est = ref(null)
const error = ref('')
const cargando = ref(false)
let timer = null

async function cargar() {
  cargando.value = true
  try { est.value = await sistemaService.estado(); error.value = '' }
  catch (e) { error.value = e?.response?.data?.message || 'No se pudo cargar el estado del sistema' }
  finally { cargando.value = false }
}

function hora(f) {
  if (!f) return '—'
  return new Date(String(f).replace(' ', 'T')).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}
function mb(b) { return b ? (b / 1048576).toFixed(1) + ' MB' : 'Sin tamaño' }
function hace(min) {
  if (min < 1) return 'Hace menos de 1 min'
  if (min < 60) return `Hace ${min} min`
  const h = Math.floor(min / 60)
  return h < 24 ? `Hace ${h} h ${min % 60} min` : `Hace ${Math.floor(h / 24)} d`
}
function enMin(min) {
  if (min === null || min === undefined) return '—'
  if (min <= 1) return 'En menos de 1 min'
  if (min < 60) return `En ${min} min`
  const h = Math.floor(min / 60)
  return `En ${h} h ${min % 60} min`
}
const clase = e => ({ ok: 'ok', atrasado: 'warn', error: 'bad', nunca: 'mute' }[e] || 'mute')
const etiqueta = e => ({ ok: 'Al corriente', atrasado: 'Atrasada', error: 'Con error', nunca: 'Sin ejecutar' }[e] || e)

onMounted(() => { cargar(); timer = setInterval(cargar, 30000) })
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.sv { display: flex; flex-direction: column; gap: 14px; }
.view-header { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; justify-content: space-between; }
.view-title { font-size: 20px; font-weight: 600; color: var(--tx0); margin: 0; }
.view-sub { font-size: 12px; color: var(--tx2); margin: 2px 0 0; max-width: 560px; }
.hdr-r { display: flex; align-items: center; gap: 10px; }
.sec { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 12px; overflow: hidden; }
.sec-hdr { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-bottom: 0.5px solid var(--bdr); font-size: 13px; font-weight: 600; color: var(--tx0); }
.pad { padding: 16px; }
.ver { display: flex; gap: 22px; padding: 18px 16px; flex-wrap: wrap; align-items: center; }
.ver-big { display: flex; flex-direction: column; min-width: 140px; }
.ver-n { font-size: 34px; font-weight: 700; color: var(--acc); line-height: 1.1; }
.ver-c { font-size: 12px; color: var(--tx2); }
.ver-info { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 240px; }
.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.notas { margin: 0; font-size: 13px; color: var(--tx1); line-height: 1.5; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: left; padding: 10px 14px; font-size: 11px; color: var(--tx3); font-weight: 500; border-bottom: 0.5px solid var(--bdr); }
td { padding: 11px 14px; color: var(--tx1); border-bottom: 0.5px solid var(--bdr); vertical-align: top; }
.strong { color: var(--tx0); font-weight: 500; } .sub { font-size: 11px; color: var(--tx3); margin-top: 2px; }
.empty-row { text-align: center; color: var(--tx3); padding: 30px; }
.pill { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 20px; }
.pill.ok { background: var(--grn-dim); color: var(--grn); } .pill.warn { background: var(--amb-dim); color: var(--amb); }
.pill.bad { background: var(--red-dim); color: var(--red); } .pill.mute { background: var(--bg3); color: var(--tx2); }
.btn-sm { display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border-radius: 8px; border: 0.5px solid var(--bdr2); background: transparent; font-size: 12px; color: var(--tx1); cursor: pointer; text-decoration: none; font-family: inherit; width: fit-content; }
.btn-sm:hover { background: var(--bg3); color: var(--tx0); }
.muted-txt { font-size: 12px; color: var(--tx3); margin: 0; }
.aviso { color: var(--amb); font-size: 12px; margin: 0; }
.ayuda { padding: 12px 16px; font-size: 12px; line-height: 1.55; color: var(--tx2); border-top: 0.5px solid var(--bdr); margin: 0; }
.ayuda code { background: var(--bg2); padding: 1px 5px; border-radius: 4px; color: var(--tx1); }
.spin { animation: sv-spin .8s linear infinite; } @keyframes sv-spin { to { transform: rotate(360deg); } }
</style>
