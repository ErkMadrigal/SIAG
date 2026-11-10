<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="modal">
        <div class="modal-hdr">
          <div>
            <h2><i class="ti ti-map-2"></i> Historial de ubicación</h2>
            <p>{{ nombre }}</p>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <select class="sel" v-model.number="dias" @change="cargar">
              <option :value="7">Últimos 7 días</option>
              <option :value="30">Últimos 30 días</option>
              <option :value="90">Últimos 90 días</option>
              <option :value="180">Últimos 180 días</option>
            </select>
            <button class="btn-close" @click="$emit('close')"><i class="ti ti-x"></i></button>
          </div>
        </div>

        <div class="modal-body">
          <div v-if="loading" class="muted-txt" style="padding:30px;text-align:center">Cargando...</div>
          <template v-else>
            <div v-if="datos?.varios_puestos" class="aviso">
              <i class="ti ti-alert-triangle"></i>
              Checó en <b>{{ datos.servicios_distintos }}</b> servicios distintos en este periodo.
            </div>

            <div class="map-box">
              <div ref="mapEl" class="map"></div>
              <div v-if="errorMapa" class="map-error"><i class="ti ti-wifi-off"></i> {{ errorMapa }}</div>
            </div>

            <table v-if="datos?.servicios?.length">
              <thead><tr><th>Servicio</th><th style="text-align:center">Registros</th><th style="text-align:center">Días</th><th>Primera</th><th>Última</th></tr></thead>
              <tbody>
                <tr v-for="(s, i) in datos.servicios" :key="i">
                  <td class="strong">{{ s.servicio || 'Sin servicio cercano' }}</td>
                  <td style="text-align:center">{{ s.registros }}</td>
                  <td style="text-align:center">{{ s.dias }}</td>
                  <td>{{ s.primera }}</td><td>{{ s.ultima }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="muted-txt" style="text-align:center;padding:16px">Sin registros en este periodo</p>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { empleadosService } from '@/services/empleados.service.js'
import { cargarLeaflet } from '@/composables/useLeaflet.js'

const props = defineProps({ empleadoId: { type: [String, Number], required: true }, nombre: { type: String, default: '' } })
defineEmits(['close'])

const dias = ref(30)
const loading = ref(true)
const datos = ref(null)
const errorMapa = ref('')
const mapEl = ref(null)
let map = null, capa = null, L = null

async function cargar() {
  loading.value = true
  try { datos.value = await empleadosService.getUbicaciones(props.empleadoId, dias.value) }
  catch { datos.value = { servicios: [], puntos: [] } }
  loading.value = false
  await nextTick()
  dibujar()
}

async function dibujar() {
  try {
    L = await cargarLeaflet()
    if (!mapEl.value) return
    if (!map) {
      map = L.map(mapEl.value).setView([23.6345, -102.5528], 5)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map)
    }
    if (capa) capa.remove()
    capa = L.layerGroup().addTo(map)
    const bounds = []

    // Servicios (marcadores grandes)
    for (const s of datos.value?.servicios || []) {
      if (!s.lat || !s.lon || Number(s.lat) === 0) continue
      const ll = [Number(s.lat), Number(s.lon)]
      L.circleMarker(ll, { radius: 11, color: '#4f8ef7', fillColor: '#4f8ef7', fillOpacity: .35, weight: 2 })
        .bindPopup(`<b>${s.servicio}</b><br>${s.registros} registros · ${s.dias} días`).addTo(capa)
      bounds.push(ll)
    }
    // Puntos reales de cada registro (pequeños)
    for (const p of datos.value?.puntos || []) {
      const ll = [Number(p.lat), Number(p.lon)]
      L.circleMarker(ll, { radius: 4, color: p.id_status == 1 ? '#22c97a' : '#f05454', weight: 1, fillOpacity: .8 })
        .bindPopup(`${p.fecha} ${p.hora} · ${p.id_status == 1 ? 'Entrada' : 'Salida'}${p.servicio ? '<br>' + p.servicio : ''}`).addTo(capa)
      bounds.push(ll)
    }
    if (bounds.length) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 })
    setTimeout(() => map && map.invalidateSize(), 150)
  } catch (e) { errorMapa.value = e.message || 'No se pudo cargar el mapa' }
}

onMounted(cargar)
onBeforeUnmount(() => { if (map) { map.remove(); map = null } })
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 14px; width: 100%; max-width: 760px; max-height: 92vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
.modal-hdr { display: flex; justify-content: space-between; align-items: flex-start; padding: 18px 20px; border-bottom: 0.5px solid var(--bdr); gap: 10px; }
.modal-hdr h2 { font-size: 15px; font-weight: 600; color: var(--tx0); display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.modal-hdr h2 i { color: var(--acc); } .modal-hdr p { font-size: 12px; color: var(--tx2); }
.btn-close { width: 30px; height: 30px; border-radius: 8px; border: 0.5px solid var(--bdr2); background: var(--bg2); color: var(--tx1); cursor: pointer; }
.sel { background: var(--bg2); border: 0.5px solid var(--bdr2); border-radius: 8px; padding: 6px 8px; font-size: 12px; color: var(--tx0); font-family: inherit; }
.modal-body { padding: 16px 20px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
.aviso { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 8px; font-size: 13px; background: var(--amb-dim); color: var(--amb); border: 0.5px solid var(--amb); }
.map-box { position: relative; } .map { height: 320px; border-radius: 10px; background: var(--bg2); z-index: 0; }
.map-error { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--bg2); border-radius: 10px; color: var(--red); font-size: 13px; }
table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
th { text-align: left; padding: 8px 10px; font-size: 11px; color: var(--tx3); font-weight: 500; border-bottom: 0.5px solid var(--bdr); }
td { padding: 8px 10px; color: var(--tx1); border-bottom: 0.5px solid var(--bdr); } .strong { color: var(--tx0); font-weight: 500; }
.muted-txt { font-size: 12px; color: var(--tx3); }
</style>
