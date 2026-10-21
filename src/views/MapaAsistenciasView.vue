<template>
  <div class="mapa-view">
    <div class="view-header">
      <div>
        <h1 class="view-title">Mapa de asistencias</h1>
        <p class="view-sub">Servicios que ya tomaron asistencia el día seleccionado</p>
      </div>
      <div class="hdr-acts">
        <input type="date" v-model="fecha" class="inp" @change="cargar" />
        <button class="btn-sm" @click="cargar" title="Recargar"><i class="ti ti-refresh"></i></button>
      </div>
    </div>

    <div class="kpis">
      <div class="kpi"><span class="kpi-n">{{ visibles.length }}</span><span class="kpi-l">Servicios</span></div>
      <div class="kpi ok"><span class="kpi-n">{{ conAsistencia }}</span><span class="kpi-l">Con asistencia</span></div>
      <div class="kpi bad"><span class="kpi-n">{{ visibles.length - conAsistencia }}</span><span class="kpi-l">Sin asistencia</span></div>
      <div class="kpi info"><span class="kpi-n">{{ totalEntradas }}</span><span class="kpi-l">Entradas</span></div>
      <div class="kpi mute"><span class="kpi-n">{{ totalSalidas }}</span><span class="kpi-l">Salidas</span></div>
    </div>

    <div class="toolbar">
      <div class="search-box">
        <i class="ti ti-search"></i>
        <input v-model="q" placeholder="Buscar servicio..." />
        <button v-if="q" class="clear-btn" @click="q = ''"><i class="ti ti-x"></i></button>
      </div>
      <div class="chips">
        <button class="chip" :class="{ on: estado === 'todos' }" @click="estado = 'todos'">Todos</button>
        <button class="chip" :class="{ on: estado === 'con' }" @click="estado = 'con'">Con asistencia</button>
        <button class="chip" :class="{ on: estado === 'sin' }" @click="estado = 'sin'">Sin asistencia</button>
        <label class="chip chk"><input type="checkbox" v-model="soloCdmx" /> Solo CDMX</label>
      </div>
    </div>

    <div class="map-wrap">
      <div ref="mapEl" class="map"></div>
      <div v-if="errorMapa" class="map-error"><i class="ti ti-wifi-off"></i> {{ errorMapa }}</div>
      <div class="map-legend">
        <span><i class="dot ok"></i> Con asistencia</span>
        <span><i class="dot warn"></i> Parcial (menos que elementos)</span>
        <span><i class="dot bad"></i> Sin asistencia</span>
      </div>
    </div>

    <!-- Modal: empleados del servicio -->
    <Teleport to="body">
      <div v-if="modal" class="mdl-ov" @click.self="modal = null">
        <div class="mdl">
          <div class="mdl-h">
            <div>
              <strong>{{ modal.servicio }}</strong>
              <span>{{ fecha }} · {{ empleadosModal.length }} empleado{{ empleadosModal.length === 1 ? '' : 's' }}</span>
            </div>
            <button class="mdl-x" @click="modal = null"><i class="ti ti-x"></i></button>
          </div>
          <div v-if="cargandoModal" class="mdl-empty">Cargando...</div>
          <div v-else-if="!empleadosModal.length" class="mdl-empty">Nadie ha registrado asistencia en este servicio</div>
          <div v-else class="mdl-list">
            <div v-for="e in empleadosModal" :key="e.id" class="mdl-row">
              <img v-if="e.fotos" :src="e.fotos" class="mdl-av" alt="" @error="e.fotos = ''" />
              <div v-else class="mdl-av ph">{{ iniciales(e.nombre) }}</div>
              <div class="mdl-info">
                <span class="mdl-n">{{ e.nombre }}</span>
                <span class="mdl-id">No. {{ String(e.id).padStart(6, '0') }}</span>
              </div>
              <div class="mdl-t">
                <span class="t in"><i class="ti ti-login"></i> {{ e.entrada ? String(e.entrada).slice(0, 5) : '—' }}</span>
                <span class="t out"><i class="ti ti-logout"></i> {{ e.salida ? String(e.salida).slice(0, 5) : '—' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useUiStore } from '@/stores/ui.js'
import { mapaAsistenciasService } from '@/services/mapaAsistencias.service.js'
import { cargarLeaflet } from '@/composables/useLeaflet.js'

const ui = useUiStore()

const hoyMx = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date())
const fecha   = ref(hoyMx())
const servicios = ref([])
const q       = ref('')
const estado  = ref('todos')
const soloCdmx = ref(true)
const errorMapa = ref('')
const mapEl   = ref(null)
const modal = ref(null)
const empleadosModal = ref([])
const cargandoModal = ref(false)

const iniciales = n => String(n || '').split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || '??'

async function abrirServicio(s) {
  modal.value = s; empleadosModal.value = []; cargandoModal.value = true
  try { empleadosModal.value = await mapaAsistenciasService.getEmpleados(s.id, fecha.value) }
  catch { empleadosModal.value = [] }
  finally { cargandoModal.value = false }
}

let L = null, map = null, capa = null

// Caja aproximada de la CDMX
const enCdmx = s => s.latitud >= 19.04 && s.latitud <= 19.60 && s.longitud >= -99.37 && s.longitud <= -98.94

const visibles = computed(() => {
  const t = q.value.trim().toLowerCase()
  return servicios.value.filter(s => {
    if (soloCdmx.value && !enCdmx(s)) return false
    if (t && !String(s.servicio || '').toLowerCase().includes(t)) return false
    const con = s.entradas > 0
    if (estado.value === 'con' && !con) return false
    if (estado.value === 'sin' && con) return false
    return true
  })
})
const conAsistencia = computed(() => visibles.value.filter(s => s.entradas > 0).length)
const totalEntradas = computed(() => visibles.value.reduce((a, s) => a + s.entradas, 0))
const totalSalidas  = computed(() => visibles.value.reduce((a, s) => a + s.salidas, 0))

function color(s) {
  if (s.entradas <= 0) return '#f05454'
  if (s.elementos && s.entradas < s.elementos) return '#f5a623'
  return '#22c97a'
}

async function cargar() {
  try {
    const r = await mapaAsistenciasService.getServicios(fecha.value)
    servicios.value = (r.data || []).map(s => ({
      ...s, latitud: Number(s.latitud), longitud: Number(s.longitud),
      entradas: Number(s.entradas), salidas: Number(s.salidas), elementos: s.elementos ? Number(s.elementos) : 0,
    }))
  } catch (e) {
    errorMapa.value = e.response?.data?.message || 'No se pudieron cargar los servicios'
  }
}

async function iniciarMapa() {
  try {
    L = await cargarLeaflet()
    await nextTick()
    map = L.map(mapEl.value).setView([19.4326, -99.1332], 11)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map)
    capa = L.layerGroup().addTo(map)
    pintar(true)
  } catch (e) { errorMapa.value = e.message }
}

function pintar(ajustar = false) {
  if (!map || !capa) return
  capa.clearLayers()
  const pts = []
  visibles.value.forEach(s => {
    const ll = [s.latitud, s.longitud]
    pts.push(ll)
    const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
    L.circleMarker(ll, { radius: 8, color: '#fff', weight: 2, fillColor: color(s), fillOpacity: 0.95 })
      .bindTooltip(`${esc(s.servicio)} · ${s.entradas} entrada${s.entradas === 1 ? '' : 's'} / ${s.salidas} salida${s.salidas === 1 ? '' : 's'}`)
      .on('click', () => abrirServicio(s))
      .addTo(capa)
  })
  if (ajustar && pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 14 })
}

watch(visibles, () => pintar(true))

onMounted(async () => {
  ui.setBreadcrumbs([{ label: 'Home', to: '/' }, { label: 'Mapa de asistencias', to: '/mapa-asistencias' }])
  await cargar()
  await iniciarMapa()
})
onBeforeUnmount(() => { if (map) map.remove(); map = null })
</script>

<style scoped>
.mapa-view { display: flex; flex-direction: column; gap: 14px; }
.view-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.view-title { margin: 0; font-size: 20px; color: var(--tx0); }
.view-sub { margin: 2px 0 0; font-size: 12px; color: var(--tx2); }
.hdr-acts { display: flex; gap: 8px; align-items: center; }
.inp { background: var(--bg2); border: 0.5px solid var(--bdr2); color: var(--tx0); border-radius: 9px; padding: 8px 10px; font-family: inherit; }
.btn-sm { width: 36px; height: 36px; border-radius: 9px; border: 0.5px solid var(--bdr2); background: var(--bg2); color: var(--tx0); cursor: pointer; }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px; }
.kpi { background: var(--bg1); border: 0.5px solid var(--bdr2); border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; }
.kpi-n { font-size: 22px; font-weight: 700; color: var(--tx0); }
.kpi-l { font-size: 11px; color: var(--tx2); }
.kpi.ok .kpi-n { color: #22c97a; } .kpi.bad .kpi-n { color: #f05454; } .kpi.info .kpi-n { color: #4f8ef7; }
.toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.search-box { display: flex; align-items: center; gap: 8px; background: var(--bg2); border: 0.5px solid var(--bdr2); border-radius: 9px; padding: 0 10px; flex: 1; min-width: 200px; }
.search-box input { flex: 1; background: transparent; border: none; outline: none; color: var(--tx0); padding: 9px 0; font-family: inherit; }
.clear-btn { background: none; border: none; color: var(--tx2); cursor: pointer; }
.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { padding: 7px 12px; border-radius: 20px; border: 0.5px solid var(--bdr2); background: var(--bg2); color: var(--tx0); font-size: 12px; cursor: pointer; font-family: inherit; }
.chip.on { background: var(--acc, #4f8ef7); border-color: var(--acc, #4f8ef7); color: #fff; }
.chip.chk { display: inline-flex; gap: 6px; align-items: center; }
.map-wrap { position: relative; border-radius: 14px; overflow: hidden; border: 0.5px solid var(--bdr2); }
.map { height: calc(100vh - 360px); min-height: 380px; }
.map-error { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(0,0,0,.6); color: #fff; }
.map-legend { position: absolute; left: 10px; bottom: 10px; z-index: 500; background: rgba(15,20,35,.88); color: #fff; padding: 8px 12px; border-radius: 10px; font-size: 11px; display: flex; flex-direction: column; gap: 4px; }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
.dot.ok { background: #22c97a; } .dot.warn { background: #f5a623; } .dot.bad { background: #f05454; }
.mdl-ov { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.6); display: grid; place-items: center; padding: 16px; }
.mdl { width: 100%; max-width: 520px; max-height: 80vh; display: flex; flex-direction: column; background: var(--bg1); border: 0.5px solid var(--bdr2); border-radius: 16px; color: var(--tx0); }
.mdl-h { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; padding: 16px 18px; border-bottom: 0.5px solid var(--bdr2); }
.mdl-h strong { display: block; font-size: 15px; } .mdl-h span { font-size: 12px; color: var(--tx2); }
.mdl-x { background: none; border: none; color: var(--tx2); font-size: 18px; cursor: pointer; }
.mdl-empty { padding: 30px; text-align: center; color: var(--tx2); font-size: 13px; }
.mdl-list { overflow: auto; padding: 6px 10px 12px; }
.mdl-row { display: flex; align-items: center; gap: 10px; padding: 9px 8px; border-bottom: 0.5px solid var(--bdr2); }
.mdl-av { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; flex: none; }
.mdl-av.ph { display: grid; place-items: center; background: var(--bg2); font-size: 12px; font-weight: 700; }
.mdl-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.mdl-n { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .mdl-id { font-size: 11px; color: var(--tx2); }
.mdl-t { display: flex; flex-direction: column; gap: 2px; font-size: 12px; font-variant-numeric: tabular-nums; }
.t.in { color: #22c97a; } .t.out { color: #f5a623; }
</style>
